const http=require('node:http');
const {randomUUID,randomBytes,createHash,timingSafeEqual}=require('node:crypto');
const {siteOrigin,matches}=require('./browser-bridge.cjs');
const PORT=29744;
const hash=value=>createHash('sha256').update(value).digest();
const error=(status,code,message)=>Object.assign(new Error(message),{status,code});
class ProgramApi {
 constructor({vault,port=PORT,now=Date.now}) {
  Object.assign(this,{vault,port,now});this.clients=new Map();this.server=null;this.starting=null;this.epoch=0;
 }
 prune() {
  for(const [id,c]of this.clients)if(c.expiresAt<=this.now() || c.generation!==this.vault.generation)this.clients.delete(id);
 }
 metadata(c) {return {id:c.id,name:c.name,origins:[...c.origins],scopes:[...c.scopes],expiresAt:new Date(c.expiresAt).toISOString(),lastUsedAt:c.lastUsedAt};}
 status(){this.prune();return {enabled:!!this.server,baseUrl:'http://127.0.0.1:'+this.port,clients:[...this.clients.values()].map(c=>this.metadata(c))};}
 revoke(id){this.clients.delete(id);}
 revokeAll(){this.clients.clear();}
 stop(){this.epoch++;this.revokeAll();this.server?.closeAllConnections();this.server?.close();this.server=null;}
 async listen() {
  if(this.server)return;
  if(this.starting)return this.starting;
  const epoch=this.epoch;
  this.starting=(async()=>{
   const server=http.createServer((req,res)=>{void this.handle(req,res);});
   server.requestTimeout=10000;server.headersTimeout=10000;server.maxHeadersCount=20;
   await new Promise((resolve,reject)=>{
    server.once('error',reject);server.listen(this.port,'127.0.0.1',()=>{server.removeListener('error',reject);resolve();});
   });
   if(epoch!==this.epoch){server.close();throw Error('API 启动已取消');}
   this.port=server.address().port;server.on('error',()=>{});this.server=server;
  })();
  try{await this.starting;}finally{this.starting=null;}
 }
 async createClient(options) {
  if(!this.vault.items)throw Error('请先解锁密码库');
  const generation=this.vault.generation,epoch=this.epoch;
  if(!options||typeof options.name!=='string'||!options.name.trim()||options.name.length>80||/[\x00-\x1f\x7f]/.test(options.name))throw Error('程序名称需要 1–80 个可见字符');
  if(!Array.isArray(options.origins)||!options.origins.length||options.origins.length>32)throw Error('请指定 1–32 个 HTTPS 网站，不支持通配符');
  const origins=[...new Set(options.origins.map(url=>{
   if(typeof url!=='string'||url.length>2048||url.includes('*'))throw Error('网站格式无效');
   const origin=siteOrigin(url);if(!origin)throw Error('请填写完整 HTTPS 网站地址');return origin;
  }))];
  if(!Array.isArray(options.scopes)||!options.scopes.length||options.scopes.some(s=>!['logins:list','credentials:read'].includes(s)))throw Error('无效的 API 权限');
  const ttl=options.ttlMinutes??60;
  if(!Number.isInteger(ttl)||ttl<5||ttl>480)throw Error('Token 有效期需要 5–480 分钟');
  this.prune();if(this.clients.size>=16)throw Error('最多同时授权 16 个程序');
  await this.listen();
  if(!this.vault.items||generation!==this.vault.generation||epoch!==this.epoch)throw Error('密码库或 API 状态已变化，请重试');
  if(this.clients.size>=16)throw Error('最多同时授权 16 个程序');
  const id=randomUUID(),token='epw.'+id+'.'+randomBytes(32).toString('base64url');
  const client={id,name:options.name.trim(),origins,scopes:[...new Set(options.scopes)],generation,
   tokenHash:hash(token),expiresAt:this.now()+ttl*60000,lastUsedAt:null,windowAt:this.now(),count:0};
  this.clients.set(id,client);return {...this.metadata(client),token,baseUrl:'http://127.0.0.1:'+this.port};
 }
 authenticate(req) {
  this.prune();
  const match=/^Bearer (epw\.([0-9a-f-]{36})\.[A-Za-z0-9_-]{43})$/.exec(req.headers.authorization||'');
  const client=match&&this.clients.get(match[2]);
  if(!client || !timingSafeEqual(hash(match[1]),client.tokenHash))throw error(401,'unauthorized','Token invalid, expired or revoked; authorize in Epassword again.');
  if(!this.vault.items || client.generation!==this.vault.generation)throw error(423,'locked','Unlock the vault in Epassword.');
  if(this.now()-client.windowAt>=60000){client.windowAt=this.now();client.count=0;}
  if(++client.count>60)throw error(429,'rate_limited','Limit: 60 requests per minute per client.');
  return client;
 }
 async handle(req,res) {
  const reply=(status,value)=>{
   if(res.destroyed||res.writableEnded)return;
   res.writeHead(status,{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store','X-Content-Type-Options':'nosniff'});
   res.end(JSON.stringify(value));
  };
  try {
   if(req.headers.host!=='127.0.0.1:'+this.port || 'origin' in req.headers || 'sec-fetch-site' in req.headers)
    throw error(403,'source_forbidden','Use a local native HTTP client; browser origins are not accepted.');
   if(req.method!=='POST')throw error(405,'method_not_allowed','Use POST with a JSON body.');
   if(!/^application\/json(?:;\s*charset=utf-8)?$/i.test(req.headers['content-type']||''))throw error(415,'unsupported_media_type','Use application/json.');
   const client=this.authenticate(req),generation=this.vault.generation;
   if(Number(req.headers['content-length']||0)>8192){req.resume();throw error(413,'body_too_large','Request body exceeds 8 KB.');}
   let size=0,chunks=[];
   for await(const chunk of req){
    size+=chunk.length;if(size>8192)throw error(413,'body_too_large','Request body exceeds 8 KB.');
    chunks.push(chunk);
   }
   let body;try{body=JSON.parse(Buffer.concat(chunks).toString('utf8'));}catch{throw error(400,'invalid_json','Invalid JSON body.');}
   chunks=[];
   if(!body||typeof body!=='object'||Array.isArray(body))throw error(400,'invalid_request','Expected a JSON object.');
   if(!this.vault.items||generation!==this.vault.generation||this.clients.get(client.id)!==client||client.expiresAt<=this.now())
    throw error(401,'unauthorized','Authorization changed during request.');
   const allowedKeys=req.url==='/v1/status'?[]:req.url==='/v1/logins/search'?['url']:req.url==='/v1/logins/credentials'?['url','itemId']:null;
   if(!allowedKeys)throw error(404,'not_found','Unknown API endpoint.');
   if(Object.keys(body).some(k=>!allowedKeys.includes(k)))throw error(400,'invalid_request','Unexpected request field.');
   client.lastUsedAt=new Date(this.now()).toISOString();
   if(req.url==='/v1/status')return reply(200,{apiVersion:'1',unlocked:true,client:this.metadata(client)});
   if(typeof body.url!=='string'||body.url.length>2048)throw error(400,'invalid_url','A full HTTPS URL is required.');
   const origin=siteOrigin(body.url);
   if(!origin)throw error(400,'invalid_url','A full HTTPS URL is required.');
   if(!client.origins.includes(origin))throw error(403,'origin_not_allowed','This client is not authorized for this exact HTTPS origin.');
   const scope=req.url==='/v1/logins/search'?'logins:list':'credentials:read';
   if(!client.scopes.includes(scope))throw error(403,'scope_required','Missing scope: '+scope);
   if(scope==='logins:list')return reply(200,{origin,items:this.vault.items.filter(i=>matches(i,origin)).map(i=>({id:i.id,title:i.title,username:i.username}))});
   if(typeof body.itemId!=='string'||!body.itemId||body.itemId.length>200)throw error(400,'invalid_item_id','An explicit itemId is required.');
   const item=this.vault.items.find(i=>i.id===body.itemId&&matches(i,origin));
   if(!item)throw error(404,'login_not_found','No active matching login.');
   return reply(200,{itemId:item.id,origin,username:item.username,password:item.password});
  }catch(e){reply(e.status||500,{error:{code:e.code||'internal_error',message:e.status?e.message:'API request failed.'}});}
 }
}
module.exports={ProgramApi,PORT};
