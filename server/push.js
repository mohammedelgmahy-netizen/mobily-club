/**
 * موبايلي - Mobily — إرسال إشعارات الموبايل (Web Push) من غير أي مكتبة خارجية.
 * التشفير حسب RFC 8291 (aes128gcm) والتوقيع حسب RFC 8292 (VAPID)، بـ WebCrypto الموجود في Deno و Node.
 */
const enc = new TextEncoder();
const subtle = () => globalThis.crypto.subtle;

export function b64u(buf) {
  const a = new Uint8Array(buf); let s = '';
  for (let i = 0; i < a.length; i++) s += String.fromCharCode(a[i]);
  return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}
export function ub64(s) {
  s = String(s || '').replace(/-/g, '+').replace(/_/g, '/');
  while (s.length % 4) s += '=';
  const b = atob(s); const out = new Uint8Array(b.length);
  for (let i = 0; i < b.length; i++) out[i] = b.charCodeAt(i);
  return out;
}
function concat(...parts) {
  const n = parts.reduce((s, p) => s + p.length, 0); const out = new Uint8Array(n); let o = 0;
  for (const p of parts) { out.set(p, o); o += p.length; }
  return out;
}
async function hkdf(salt, ikm, info, len) {
  const key = await subtle().importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  return new Uint8Array(await subtle().deriveBits({ name: 'HKDF', hash: 'SHA-256', salt, info }, key, len * 8));
}

/** مفاتيح VAPID جديدة: public = نقطة P-256 (65 بايت)، private = d */
export async function generateVapid() {
  const k = await subtle().generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
  const raw = new Uint8Array(await subtle().exportKey('raw', k.publicKey));
  const jwk = await subtle().exportKey('jwk', k.privateKey);
  return { publicKey: b64u(raw), privateKey: jwk.d };
}

async function vapidHeader(endpoint, vapid) {
  const pub = ub64(vapid.publicKey);
  const key = await subtle().importKey('jwk', { kty: 'EC', crv: 'P-256', x: b64u(pub.slice(1, 33)), y: b64u(pub.slice(33, 65)), d: vapid.privateKey, ext: true },
    { name: 'ECDSA', namedCurve: 'P-256' }, false, ['sign']);
  const h = b64u(enc.encode(JSON.stringify({ typ: 'JWT', alg: 'ES256' })));
  const p = b64u(enc.encode(JSON.stringify({ aud: new URL(endpoint).origin, exp: Math.floor(Date.now() / 1000) + 12 * 3600, sub: vapid.subject })));
  const sig = await subtle().sign({ name: 'ECDSA', hash: 'SHA-256' }, key, enc.encode(h + '.' + p));
  return 'vapid t=' + h + '.' + p + '.' + b64u(sig) + ', k=' + vapid.publicKey;
}

export async function encryptPayload(text, p256dh, auth) {
  const uaPub = ub64(p256dh), secret = ub64(auth);
  const as = await subtle().generateKey({ name: 'ECDH', namedCurve: 'P-256' }, true, ['deriveBits']);
  const asPub = new Uint8Array(await subtle().exportKey('raw', as.publicKey));
  const uaKey = await subtle().importKey('raw', uaPub, { name: 'ECDH', namedCurve: 'P-256' }, false, []);
  const shared = new Uint8Array(await subtle().deriveBits({ name: 'ECDH', public: uaKey }, as.privateKey, 256));
  const ikm = await hkdf(secret, shared, concat(enc.encode('WebPush: info\0'), uaPub, asPub), 32);
  const salt = globalThis.crypto.getRandomValues(new Uint8Array(16));
  const cek = await hkdf(salt, ikm, enc.encode('Content-Encoding: aes128gcm\0'), 16);
  const nonce = await hkdf(salt, ikm, enc.encode('Content-Encoding: nonce\0'), 12);
  const k = await subtle().importKey('raw', cek, 'AES-GCM', false, ['encrypt']);
  const ct = new Uint8Array(await subtle().encrypt({ name: 'AES-GCM', iv: nonce }, k, concat(enc.encode(text), new Uint8Array([2]))));
  return concat(salt, new Uint8Array([0, 0, 16, 0]), new Uint8Array([asPub.length]), asPub, ct);
}

/** يبعت إشعار لاشتراك واحد ويرجّع كود الرد (201 = اتبعت، 404/410 = الاشتراك انتهى) */
export async function sendPush(sub, message, vapid, fetchImpl) {
  const body = await encryptPayload(JSON.stringify(message), sub.p256dh, sub.auth);
  const ctl = typeof AbortController !== 'undefined' ? new AbortController() : null;
  const t = ctl ? setTimeout(() => ctl.abort(), 6000) : 0;
  try {
    const r = await (fetchImpl || fetch)(sub.endpoint, {
      method: 'POST', signal: ctl ? ctl.signal : undefined,
      headers: { TTL: '86400', Urgency: 'high', 'Content-Encoding': 'aes128gcm', 'Content-Type': 'application/octet-stream', Authorization: await vapidHeader(sub.endpoint, vapid) },
      body,
    });
    return r.status;
  } catch (e) { return 0; } finally { if (t) clearTimeout(t); }
}
