/**
 * موبايلي - Mobily — كتالوج المكافآت: مستويات مكافآت بنقاط مختلفة لكل محل.
 *   fn 'rewards'      → العميل: قائمة المكافآت وتقدمه ناحية أقرب مكافأة
 *   fn 'rewardsAdmin' → الإدارة: إضافة/تعديل/إخفاء مكافأة، وتسليم مكافأة لعميل (بتخصم نقاطه)
 * الرد بنفس شكل باقي النظام: { result: { ok, data } } أو { result: { ok: false, error } }
 */

const T = (s) => String(s === undefined || s === null ? '' : s).trim();
const ok = (data) => ({ result: { ok: true, data } });
const bad = (error) => ({ result: { ok: false, error } });
const N = (v) => Math.round(Number(v) || 0);

async function listRewards(sql, onlyActive) {
  return sql.unsafe(
    `select reward_id::text as reward_id, title, description, points_cost, icon, active, sort
     from mobily.mc_rewards ${onlyActive ? 'where active' : ''} order by points_cost, sort, created_at`
  );
}

/** رصيد العميل من رقم الكارت (التوكن) */
async function customerByToken(sql, token) {
  const t = T(token);
  if (!/^[a-f0-9]{64}$/.test(t)) return null;
  const [c] = await sql.unsafe(
    `select customer_id, name, points_balance from mobily.mc_customers where access_token = $1 and status = 'active'`,
    [t]
  );
  return c || null;
}

export async function handleRewards(body, ctx) {
  const fn = body && body.fn;
  const args = Array.isArray(body && body.args) ? body.args : [];
  const { sql } = ctx;
  try {
    // ---------- العميل ----------
    if (fn === 'rewards') {
      const action = args[0];
      const p = args[1] && typeof args[1] === 'object' ? args[1] : {};
      if (action !== 'list') return bad('طلب غير معروف');
      const rows = await listRewards(sql, true);
      const c = await customerByToken(sql, p.token);
      const balance = c ? N(c.points_balance) : 0;
      const next = rows.filter((r) => N(r.points_cost) > balance)[0] || null;
      const claims = c
        ? await sql.unsafe(
            `select title, points_cost, created_at::text as created_at from mobily.mc_reward_claims
             where customer_id = $1 order by created_at desc limit 20`,
            [c.customer_id]
          )
        : [];
      return ok({
        rewards: rows.map((r) => ({
          reward_id: r.reward_id, title: r.title, description: r.description,
          points_cost: N(r.points_cost), icon: r.icon, ready: balance >= N(r.points_cost),
        })),
        balance,
        next: next ? { title: next.title, points_cost: N(next.points_cost), need: N(next.points_cost) - balance } : null,
        claims,
      });
    }

    // ---------- الإدارة ----------
    const [token, action] = [args[0], args[1]];
    const p = args[2] && typeof args[2] === 'object' ? args[2] : {};
    const user = await ctx.verifyAdmin(token);
    if (!user.ok) return { result: user.res };
    const perms = user.permissions || [];

    if (action === 'list') return ok({ rewards: await listRewards(sql, false) });

    if (action === 'save') {
      if (perms.indexOf('offers_manage') < 0) return bad('ليس لديك صلاحية: إدارة المكافآت');
      const title = T(p.title).slice(0, 80);
      const cost = N(p.points_cost);
      if (!title) return bad('اكتب اسم المكافأة');
      if (cost < 1) return bad('عدد النقاط لازم يكون أكبر من صفر');
      const vals = [title, T(p.description).slice(0, 300), cost, T(p.icon).slice(0, 8) || '🎁', p.active === false ? false : true, N(p.sort)];
      if (T(p.reward_id)) {
        const [r] = await sql.unsafe(
          `update mobily.mc_rewards set title = $1, description = $2, points_cost = $3, icon = $4, active = $5, sort = $6
           where reward_id = $7 returning reward_id::text as reward_id`,
          vals.concat([T(p.reward_id)])
        );
        if (!r) return bad('المكافأة مش موجودة');
        return ok({ reward_id: r.reward_id });
      }
      const [r] = await sql.unsafe(
        `insert into mobily.mc_rewards (title, description, points_cost, icon, active, sort)
         values ($1, $2, $3, $4, $5, $6) returning reward_id::text as reward_id`,
        vals
      );
      return ok({ reward_id: r.reward_id });
    }

    if (action === 'remove') {
      if (perms.indexOf('offers_manage') < 0) return bad('ليس لديك صلاحية: إدارة المكافآت');
      const [r] = await sql.unsafe(
        `update mobily.mc_rewards set active = false where reward_id = $1 returning reward_id::text as reward_id`,
        [T(p.reward_id)]
      );
      if (!r) return bad('المكافأة مش موجودة');
      return ok({ reward_id: r.reward_id });
    }

    // تسليم مكافأة لعميل: بتخصم النقاط من محفظته بنفس حركات النظام
    if (action === 'claim') {
      if (perms.indexOf('points_adjust') < 0) return bad('ليس لديك صلاحية: تسليم المكافآت');
      const [rw] = await sql.unsafe(
        `select reward_id::text as reward_id, title, points_cost from mobily.mc_rewards where reward_id = $1 and active`,
        [T(p.reward_id)]
      );
      if (!rw) return bad('المكافأة مش موجودة');
      const [c] = await sql.unsafe(
        `select customer_id, name, points_balance from mobily.mc_customers where customer_id = $1`,
        [T(p.customer_id)]
      );
      if (!c) return bad('العميل مش موجود');
      if (N(c.points_balance) < N(rw.points_cost)) return bad('نقاط العميل مش كفاية. رصيده ' + N(c.points_balance) + ' نقطة');
      const out = await ctx.core({
        fn: 'adminApi',
        args: [token, 'adjustPoints', {
          customer_id: c.customer_id, mode: 'sub', points: N(rw.points_cost), reason: 'مكافأة: ' + rw.title,
        }, 'reward-' + rw.reward_id + '-' + c.customer_id + '-' + Math.floor(Date.now() / 1000)],
      });
      const res = out && out.result;
      if (!res || !res.ok) return bad((res && res.error) || 'تعذر خصم النقاط');
      await sql.unsafe(
        `insert into mobily.mc_reward_claims (reward_id, customer_id, title, points_cost, employee_name)
         values ($1, $2, $3, $4, $5)`,
        [rw.reward_id, c.customer_id, rw.title, N(rw.points_cost), T(user.name)]
      );
      return ok({ title: rw.title, points_cost: N(rw.points_cost), balance: res.data && res.data.balance });
    }

    if (action === 'claims') {
      return ok({
        claims: await sql.unsafe(
          `select c.title, c.points_cost, c.employee_name, c.created_at::text as created_at,
                  u.name as customer_name, u.member_no
           from mobily.mc_reward_claims c left join mobily.mc_customers u on u.customer_id = c.customer_id
           order by c.created_at desc limit 200`
        ),
      });
    }

    return bad('طلب غير معروف');
  } catch (e) {
    return bad(e && e.message ? e.message : 'حصل خطأ، حاول تاني');
  }
}
