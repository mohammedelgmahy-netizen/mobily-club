#!/bin/sh
# Cloudflare Pages build: copies the static site into dist/ and injects settings
# from Cloudflare environment variables (Settings > Variables and Secrets):
#   SUPABASE_FUNCTION_URL  full URL of the Supabase edge function this site talks to
#   SITE_URL               public URL of this site, e.g. https://example.pages.dev/
# If a variable is empty, the value already in the files is kept.
set -e
OUT=dist
rm -rf "$OUT" && mkdir -p "$OUT"
for f in *; do
  case "$f" in "$OUT"|node_modules|server|tools|database|*.md|*.sql|*.txt|cloudflare-build.sh|protect.mjs|wrangler.toml|package.json|package-lock.json) continue ;; esac
  cp -R "$f" "$OUT/"
done
FILES=$(find "$OUT" -name '*.html')
if [ -n "$SUPABASE_FUNCTION_URL" ]; then
  sed -i -E "s#https://[a-z0-9]+\.supabase\.co/functions/v1/[^\"' ]+#${SUPABASE_FUNCTION_URL}#g" $FILES
  echo "Supabase function: $SUPABASE_FUNCTION_URL"
fi
if [ -n "$SITE_URL" ]; then
  case "$SITE_URL" in */) ;; *) SITE_URL="$SITE_URL/" ;; esac
  sed -i -E "s#https://[a-z0-9-]+\.github\.io/[a-z0-9-]+/#${SITE_URL}#g" $FILES
  echo "Site URL: $SITE_URL"
fi
grep -ho 'https://[a-z0-9]*\.supabase\.co/functions/v1/[^"]*' "$OUT/index.html" | head -1

# Scramble the JavaScript in dist/ so visitors never get the readable source.
OBF_VERSION=4.1.1
if [ ! -d node_modules/javascript-obfuscator ]; then
  npm install --no-save --no-audit --no-fund --loglevel=error javascript-obfuscator@$OBF_VERSION
fi
node protect.mjs "$OUT"
