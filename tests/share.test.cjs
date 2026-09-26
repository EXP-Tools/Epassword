const {test}=require('node:test'),assert=require('node:assert/strict');
const {encryptItem,decryptItem}=require('../electron/share.cjs');
const {transferHandlers}=require('../electron/transfer.cjs');
const item={id:'share-one',title:'中文分享',category:'登录信息',username:'00123',password:'fictional-password',url:'https://example.com',notes:'多行\n备注',tags:'个人',favorite:'true',archived:'false',deleted:'false',created:'2026-01-01',updated:'2026-01-01',fields:[{id:'otp',type:'otp',label:'验证码',value:'JBSWY3DPEHPK3PXP'}]};
test('share: authenticated hex JSON roundtrip, randomness, wrong passwords and tampering',async()=>{
 const password='Temporary-share-123!';
 const a=await encryptItem({...item,extra:'not included'},password),b=await encryptItem(item,password);
 assert.match(a,/^[0-9a-f]+$/);assert.notEqual(a,b);assert(!a.includes(item.password));
 assert.deepEqual(await decryptItem(a.toUpperCase().replace(/(.{80})/g,'$1\n'),password),item);
 await assert.rejects(decryptItem(a,'Wrong-password-123!'),/密码错误/);
 for(const offset of [10,42,68,a.length-4]){
  const changed=a.slice(0,offset)+(a[offset]==='0'?'1':'0')+a.slice(offset+1);
  await assert.rejects(decryptItem(changed,password));
 }
 for(const value of ['',a.slice(1),'zz'+a,a.slice(0,-2),'00'.repeat(49)] )await assert.rejects(decryptItem(value,password));
 await assert.rejects(encryptItem(item,'short'));
});
test('share handlers: metadata preview, fresh IDs, copy and locked state',async()=>{
 let copied='';const vault={generation:1,items:[item],save:async items=>{vault.items=items;}};
 const handlers=transferHandlers({vault,dialog:{},getWindow:()=>null,requireUnlocked:()=>{if(!vault.items)throw Error('locked');},touch:()=>{},mutate:fn=>fn(),putClipboard:value=>{copied=value;}});
 const c=handlers.channels,password='Temporary-share-123!';
 const hex=await c['share-create'](null,{id:item.id,password});c['share-copy']();assert.equal(copied,hex);
 const preview=await c['share-preview'](null,{hex,password});assert(!JSON.stringify(preview).includes(item.password));
 const result=await c['transfer-import'](null,{token:preview.token,ids:[item.id]});assert.equal(result.count,1);assert.notEqual(result.items[1].id,item.id);assert.equal(result.items[1].fields[0].value,item.fields[0].value);
 const pending=c['share-create'](null,{id:item.id,password});vault.items=null;vault.generation++;handlers.clear();
 await assert.rejects(pending,/locked/);assert.throws(()=>c['share-copy'](),/locked/);
});
