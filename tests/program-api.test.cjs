const {test}=require('node:test');
const assert=require('node:assert/strict');
const http=require('node:http');
const {ProgramApi}=require('../electron/program-api.cjs');
const item={id:'fixture',title:'Fixture',category:'登录信息',url:'https://example.test/login',username:'fixture-user',password:'fixture-password',archived:'false',deleted:'false'};
test('program API enforces exact origin, read scope, token expiry/revocation and browser rejection',async()=>{
 let now=Date.now();const vault={items:[item],generation:1},api=new ProgramApi({vault,port:0,now:()=>now});
 const create=options=>api.createClient({name:'Test client',origins:['https://example.test'],scopes:['logins:list','credentials:read'],ttlMinutes:5,...options});
 await assert.rejects(create({origins:['https://*.example.test']}),/格式/);
 await assert.rejects(create({origins:['http://example.test']}),/HTTPS/);
 await assert.rejects(create({ttlMinutes:999}),/有效期/);
 await assert.rejects(create({scopes:['admin']}),/权限/);
 const client=await create();
 const request=async(endpoint,body={},token=client.token,headers={})=>{
  const response=await fetch(client.baseUrl+endpoint,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,...headers},body:JSON.stringify(body)});
  return {status:response.status,body:await response.json()};
 };
 try {
  assert.equal(api.server.address().address,'127.0.0.1');
  assert.equal((await request('/v1/status',{},'bad')).status,401);
  assert.equal((await request('/v1/status',{},client.token,{Origin:'https://example.test'})).status,403);
  assert.equal((await request('/v1/status',{},client.token,{'Sec-Fetch-Site':'none'})).status,403);
  const wrongHost=await new Promise((resolve,reject)=>{
   const req=http.request(client.baseUrl+'/v1/status',{method:'POST',headers:{Host:'evil.test','Content-Type':'application/json',Authorization:'Bearer '+client.token}},
    res=>{res.resume();res.on('end',()=>resolve(res.statusCode));});
   req.on('error',reject);req.end('{}');
  });assert.equal(wrongHost,403);
  assert.equal((await request('/v1/status',{unexpected:true})).status,400);
  assert.equal((await request('/v1/status',[])).status,400);
  assert.equal((await request('/v1/status',{huge:'x'.repeat(9000)})).status,413);
  const method=await fetch(client.baseUrl+'/v1/status',{headers:{Authorization:'Bearer '+client.token}});
  assert.equal(method.status,405);await method.text();
  const malformed=await fetch(client.baseUrl+'/v1/status',{method:'POST',headers:{Authorization:'Bearer '+client.token,'Content-Type':'application/json'},body:'{broken'});
  assert.equal(malformed.status,400);await malformed.text();
  const state=(await request('/v1/status')).body;
  assert.equal(state.client.name,'Test client');assert.ok(!JSON.stringify(state).includes(client.token));assert.ok(!('tokenHash' in state.client));
  const list=await request('/v1/logins/search',{url:item.url});assert.equal(list.body.items.length,1);assert.ok(!JSON.stringify(list).includes(item.password));
  for(const url of ['https://sub.example.test','https://example.test.evil.test','https://example.test:444'])
   assert.equal((await request('/v1/logins/credentials',{url,itemId:item.id})).status,403);
  assert.equal((await request('/v1/logins/credentials',{url:'http://example.test',itemId:item.id})).status,400);
  const credential=await request('/v1/logins/credentials',{url:item.url,itemId:item.id});
  assert.equal(credential.status,200);assert.equal(credential.body.password,item.password);
  assert.equal((await request('/v1/logins/credentials',{url:item.url})).status,400);
  assert.equal((await request('/v1/logins/credentials',{url:item.url,itemId:'unknown'})).status,404);
  vault.items=[{...item,deleted:'true'}];assert.equal((await request('/v1/logins/credentials',{url:item.url,itemId:item.id})).status,404);vault.items=[item];
  const readonly=await create({scopes:['logins:list']});
  assert.equal((await request('/v1/logins/credentials',{url:item.url,itemId:item.id},readonly.token)).status,403);
  api.revoke(readonly.id);assert.equal((await request('/v1/status',{},readonly.token)).status,401);
  now+=300001;assert.equal((await request('/v1/status')).status,401);
  const fresh=await create();vault.generation++;vault.items=null;
  assert.equal((await request('/v1/status',{},fresh.token)).status,401);
  vault.items=[item];assert.equal((await request('/v1/status',{},fresh.token)).status,401);
 }finally{api.stop();}
});
test('program API invalidates in-flight requests, rate limits and stops cleanly',async()=>{
 const vault={items:[item],generation:1},api=new ProgramApi({vault,port:0});
 const config={name:'Fixture',origins:['https://example.test'],scopes:['credentials:read']};
 const client=await api.createClient(config);
 try {
  const received=new Promise(resolve=>api.server.once('request',resolve));
  let finish;
  const result=new Promise((resolve,reject)=>{
   const req=http.request(client.baseUrl+'/v1/logins/credentials',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+client.token}},res=>{
    let text='';res.on('data',chunk=>text+=chunk);res.on('end',()=>resolve({status:res.statusCode,text}));
   });
   req.on('error',reject);req.write('{"url":');finish=()=>req.end(JSON.stringify(item.url)+',"itemId":"fixture"}');
  });
  await received;api.revokeAll();finish();
  const denied=await result;assert.equal(denied.status,401);assert.ok(!denied.text.includes(item.password));
  const next=await api.createClient(config);
  for(let n=0;n<60;n++){
   const r=await fetch(next.baseUrl+'/v1/status',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+next.token},body:'{}'});
   assert.equal(r.status,200);await r.text();
  }
  const limited=await fetch(next.baseUrl+'/v1/status',{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+next.token},body:'{}'});
  assert.equal(limited.status,429);await limited.text();
 }finally{api.stop();}
 assert.equal(api.status().enabled,false);assert.equal(api.status().clients.length,0);
});
