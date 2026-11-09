/** Minimal Node.js 20+ gateway. HTTPS termination is mandatory in production. */
import http from 'node:http';
import crypto from 'node:crypto';

const upstream = process.env.SCUM_UPSTREAM_URL || 'https://taxi.nihao.id.vn';
const key = process.env.SCUM_DEVELOPER_KEY;
const port = Number(process.env.PORT || 8787);
const host = process.env.HOST || '127.0.0.1';
if (!key || !key.startsWith('scum_dev_')) throw new Error('Set SCUM_DEVELOPER_KEY on the server');
if (!upstream.startsWith('https://')) throw new Error('Upstream must be HTTPS');
const sessions = new Map();
const attempts = new Map();
const now = () => Date.now();
const random = () => crypto.randomBytes(32).toString('base64url');
const fail = (res, status, error) => send(res, status, {error});
function send(res, status, data) {
  res.writeHead(status, {'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Referrer-Policy':'no-referrer'});
  res.end(JSON.stringify(data));
}
function limit(bucket, max, windowMs) {
  const t = now(), item = attempts.get(bucket);
  if (!item || item.until < t) {attempts.set(bucket,{count:1,until:t+windowMs});return false;}
  item.count++;
  return item.count > max;
}
function auth(req) {const m=/^Bearer ([A-Za-z0-9_-]{43})$/.exec(req.headers.authorization||''); return m ? [m[1],sessions.get(m[1])] : [null,null];}
async function body(req) {
  let raw=''; for await (const chunk of req) {raw += chunk; if (raw.length>2048) throw Error('body_too_large');}
  return JSON.parse(raw || '{}');
}
async function upstreamCall(path, method, payload, accessToken) {
  const controller=new AbortController(); const timer=setTimeout(()=>controller.abort(),8000);
  try {
    const response=await fetch(upstream+path,{method,headers:{'X-API-Key':key,...(payload?{'Content-Type':'application/json'}:{}),...(accessToken?{Authorization:`Bearer ${accessToken}`}:{})},...(payload?{body:JSON.stringify(payload)}:{}),signal:controller.signal});
    const data=await response.json().catch(()=>({error:'upstream_invalid_response'}));
    return {status:response.status,data};
  } finally {clearTimeout(timer);}
}
const server=http.createServer(async(req,res)=>{
  const path=(req.url||'').split('?')[0];
  if (path==='/health' && req.method==='GET') return send(res,200,{ok:true});
  if (!['/v1/minimap/request-code','/v1/minimap/verify','/v1/minimap/me'].includes(path)) return fail(res,404,'not_found');
  const ip=req.socket.remoteAddress||'unknown'; // reverse proxy MUST restrict direct access; no spoofable forwarded headers.
  if (limit(`global:${ip}`,90,60000)) return fail(res,429,'rate_limited');
  try {
    if (path==='/v1/minimap/request-code' && req.method==='POST') {
      const {steamId}=await body(req);
      if (typeof steamId!=='string' || !/^7656119\d{10}$/.test(steamId)) return fail(res,400,'invalid_steam_id');
      if (limit(`steam:${steamId}`,3,300000) || limit(`request:${ip}`,8,300000)) return fail(res,429,'rate_limited');
      const r=await upstreamCall(path,'POST',{steamId});
      if (r.status!==200) return send(res,r.status,r.data);
      if (typeof r.data.requestId!=='string') return fail(res,502,'upstream_invalid_response');
      const pairingToken=random();
      sessions.set(pairingToken,{phase:'pairing',steamId,requestId:r.data.requestId,expires:now()+300000,ip,tries:0});
      return send(res,200,{requestId:r.data.requestId,pairingToken});
    }
    const [sessionToken,session]=auth(req);
    if (!session || session.expires<now() || session.ip!==ip) {
      if (sessionToken) sessions.delete(sessionToken);
      return fail(res,401,'invalid_access_token');
    }
    if (path==='/v1/minimap/verify' && req.method==='POST') {
      if (session.phase!=='pairing') return fail(res,401,'invalid_access_token');
      const {requestId,code}=await body(req);
      if (requestId!==session.requestId || typeof code!=='string' || !/^\d{6}$/.test(code)) return fail(res,400,'invalid_pairing_data');
      if (++session.tries>5) {sessions.delete(sessionToken);return fail(res,429,'too_many_attempts');}
      const r=await upstreamCall(path,'POST',{requestId,code});
      if (r.status!==200) return send(res,r.status,r.data);
      if (typeof r.data.accessToken!=='string') return fail(res,502,'upstream_invalid_response');
      sessions.delete(sessionToken);
      const newToken=random();
      sessions.set(newToken,{phase:'active',steamId:session.steamId,upstreamToken:r.data.accessToken,expires:now()+12*3600000,ip,lastPoll:0});
      return send(res,200,{sessionToken:newToken,expiresIn:43200});
    }
    if (path==='/v1/minimap/me' && req.method==='GET') {
      if (session.phase!=='active') return fail(res,401,'invalid_access_token');
      if (now()-session.lastPoll<1000) return fail(res,429,'rate_limited');
      session.lastPoll=now();
      const r=await upstreamCall(path,'GET',null,session.upstreamToken);
      if (r.status===401) sessions.delete(sessionToken);
      if (r.status!==200) return send(res,r.status,r.data);
      const {online,position,sector,updatedAt}=r.data;
      return send(res,200,{online,position,sector,updatedAt});
    }
    return fail(res,405,'method_not_allowed');
  } catch(e) {return fail(res,e.message==='body_too_large'?413:e instanceof SyntaxError?400:502,'gateway_error');}
});
setInterval(()=>{for(const [k,v] of sessions) if(v.expires<now()) sessions.delete(k);for(const [k,v] of attempts) if(v.until<now()) attempts.delete(k);},60000).unref();
server.listen(port,host,()=>console.log(`Position gateway listening on ${host}:${port}`));
