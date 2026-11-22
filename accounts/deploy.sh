#!/bin/bash
# Deploys the Nautic Online accounts server to Cloudflare (Worker "nautic-accounts" + D1 "nautic-accounts").
# Run from a session whose Cloudflare API token is injected by the proxy (no auth header needed).
# First deploy (no worker yet): makes a new ticket key + pepper, stores them as worker secrets,
# and writes the public key and the worker URL into js/accounts.js. Later deploys keep the secrets.
set -e
A=4e87fbaf23097b03408b9a8f8937b5fc; API=https://api.cloudflare.com/client/v4/accounts/$A
D=$(cd "$(dirname "$0")" && pwd); T=$(mktemp -d)
cf() { curl -s "$@"; }
DBID=$(cf "$API/d1/database?name=nautic-accounts" | python3 -c "import sys,json;r=json.load(sys.stdin).get('result') or [];print(r[0]['uuid'] if r else '')")
[ -z "$DBID" ] && DBID=$(cf -X POST "$API/d1/database" -H 'Content-Type: application/json' -d '{"name":"nautic-accounts"}' | python3 -c "import sys,json;print(json.load(sys.stdin)['result']['uuid'])")
echo "database $DBID"
python3 -c "import json;print(json.dumps({'sql':open('$D/schema.sql').read()}))" | cf -X POST "$API/d1/database/$DBID/query" -H 'Content-Type: application/json' -d @- | python3 -c "import sys,json;print('schema ok' if json.load(sys.stdin).get('success') else 'schema FAILED')"
EXISTS=$(cf "$API/workers/scripts/nautic-accounts/settings" | python3 -c "import sys,json;print('1' if json.load(sys.stdin).get('success') else '')")
if [ -z "$EXISTS" ]; then
  node -e "
const fs=require('fs');crypto.subtle.generateKey({name:'ECDSA',namedCurve:'P-256'},true,['sign','verify']).then(kp=>crypto.subtle.exportKey('jwk',kp.privateKey)).then(j=>{
fs.writeFileSync('$T/key.json',JSON.stringify({d:j.d,x:j.x,y:j.y}));fs.writeFileSync('$T/pub.json',JSON.stringify({x:j.x,y:j.y}));fs.writeFileSync('$T/pepper',require('crypto').randomBytes(32).toString('base64url'));})"
  python3 - "$DBID" "$T" > "$T/meta.json" <<'PY'
import json,sys
db,t=sys.argv[1:3]
print(json.dumps({'main_module':'worker.js','compatibility_date':'2026-11-01','bindings':[{'type':'d1','name':'DB','id':db},
 {'type':'secret_text','name':'TICKET_KEY','text':open(t+'/key.json').read()},{'type':'secret_text','name':'PEPPER','text':open(t+'/pepper').read()}]}))
PY
else
  python3 -c "import json;print(json.dumps({'main_module':'worker.js','compatibility_date':'2026-11-01','bindings':[{'type':'d1','name':'DB','id':'$DBID'}],'keep_bindings':['secret_text']}))" > "$T/meta.json"
fi
cf -X PUT "$API/workers/scripts/nautic-accounts" -F "metadata=@$T/meta.json;type=application/json" -F "worker.js=@$D/worker.js;type=application/javascript+module" | python3 -c "import sys,json;r=json.load(sys.stdin);print('worker ok' if r.get('success') else r)"
cf -X POST "$API/workers/scripts/nautic-accounts/subdomain" -H 'Content-Type: application/json' -d '{"enabled":true,"previews_enabled":false}' >/dev/null
SUB=$(cf "$API/workers/subdomain" | python3 -c "import sys,json;print((json.load(sys.stdin).get('result') or {}).get('subdomain',''))")
if [ -z "$SUB" ]; then SUB=ultranautic; cf -X PUT "$API/workers/subdomain" -H 'Content-Type: application/json' -d "{\"subdomain\":\"$SUB\"}" >/dev/null; fi
echo "url https://nautic-accounts.$SUB.workers.dev"
python3 - "$D/../js/accounts.js" "$SUB" "$T" <<'PY'
import sys,json,re,os
p,sub,t=sys.argv[1:4]; s=open(p).read()
s=re.sub(r"https://nautic-accounts\.[^.']+\.workers\.dev","https://nautic-accounts."+sub+".workers.dev",s)
if os.path.exists(t+'/pub.json'):
  k=json.load(open(t+'/pub.json')); s=re.sub(r"x: '[^']+', y: '[^']+'","x: '%s', y: '%s'"%(k['x'],k['y']),s,count=1)
open(p,'w').write(s)
PY
rm -rf "$T"
