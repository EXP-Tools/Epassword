const {test}=require('node:test');
const assert=require('node:assert/strict');
const {BrowserBridge,siteOrigin,matches}=require('../electron/browser-bridge.cjs');
const client='a'.repeat(32), extension='chrome-extension://'+client;
const item={id:'1',title:'Account',category:'登录信息',url:'https://example.com/login',username:'u',password:'secret',deleted:'false',archived:'false'};
test('exact HTTPS origin: no sibling, suffix, HTTP, port or archived matches',()=>{
 assert.equal(siteOrigin('https://EXAMPLE.com:443/path'),'https://example.com');
 for(const url of ['http://example.com','https://user@example.com','https://example.com.','javascript:alert(1)'])assert.equal(siteOrigin(url),null);
 for(const url of ['https://sub.example.com','https://example.com.evil.test','https://example.com:444','http://example.com'])assert.equal(matches(item,url),false);
 assert.equal(matches(item,'https://example.com'),true);
 assert.equal(matches({...item,archived:'true'},'https://example.com'),false);
 assert.equal(matches({...item,deleted:'true'},'https://example.com'),false);
 assert.equal(matches({...item,fields:[{type:'url',value:'https://second.test/login'}]},'https://second.test'),true);
});
test('bridge pairing, source validation, lock, consent, revocation and interrupted save',async()=>{
 const vault={items:[item],generation:1};let saves=0,consents=0,allow=false,delayed;
 const bridge=new BrowserBridge({vault,port:29744,save:async()=>{saves++;},confirm:async()=>{consents++;return delayed?delayed:allow;},changed:()=>{}});
 let token=await bridge.start();
 const req=async(path,body={},headers={})=>{
  const response=await fetch('http://127.0.0.1:29744'+path,{method:'POST',headers:{'Content-Type':'application/json',Authorization:'Bearer '+token,'X-Epassword-Client':client,Origin:extension,...headers},body:JSON.stringify(body)});
  return {status:response.status,body:await response.json()};
 };
 try{
  assert.equal((await req('/pair',{}, {Origin:'https://evil.test'})).status,403);
  assert.equal((await req('/pair',{}, {Authorization:'Bearer wrong'})).status,401);
  assert.equal((await req('/matches',{url:item.url})).status,401);
  assert.equal((await req('/pair')).status,200);
  const list=await req('/matches',{url:item.url});assert.equal(list.body.items.length,1);assert.equal('password' in list.body.items[0],false);
  assert.equal((await req('/fill',{url:'https://evil.test',id:'1'})).status,404);
  assert.equal((await req('/fill',{url:item.url,id:'1'})).body.password,item.password);
  assert.equal((await req('/fill',{url:'http://example.com',id:'1'})).status,400);
  assert.equal((await req('/pair',{}, {'X-Epassword-Client':'b'.repeat(32),Origin:'chrome-extension://'+'b'.repeat(32)})).status,401);
  vault.items=null;assert.equal((await req('/fill',{url:item.url,id:'1'})).status,423);vault.items=[item];
  const draft={url:item.url,username:'new',password:'new-secret'};
  const saveResult=async r=>{let v;do{await new Promise(r=>setTimeout(r,5));v=await req('/save-result',{url:item.url,requestId:r.body.requestId});}while(v.body.pending);return v;};
  assert.equal((await saveResult(await req('/save',draft))).body.saved,false);assert.equal(saves,0);
  allow=true;assert.equal((await saveResult(await req('/save',draft))).body.saved,true);assert.equal(saves,1);
  let resolve;delayed=new Promise(r=>{resolve=r;});
  const saving=req('/save',draft);
  while(consents<3)await new Promise(r=>setTimeout(r,5));
  vault.generation++;resolve(true);assert.equal((await saveResult(await saving)).status,400);assert.equal(saves,1);
  const old=token;token=await bridge.start();
  assert.equal((await req('/pair',{}, {Authorization:'Bearer '+old})).status,401);
  assert.equal((await req('/pair')).status,200);
 }finally{bridge.stop();}
});
