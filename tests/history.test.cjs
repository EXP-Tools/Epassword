const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {Vault,encode,decode}=require('../electron/vault.cjs');
const {recordHistory,receivedItem}=require('../electron/history.cjs');
const item={id:'one',title:'History',category:'登录信息',username:'tester',password:'initial',url:'',notes:'',tags:'',favorite:'false',archived:'false',deleted:'false',created:'2020-01-01',updated:'2020-01-01',fields:[{id:'extra',type:'password',label:'自定义密码',value:'first'},{id:'text',type:'text',label:'文本',value:'unchanged'}]};
test('history records changed passwords and never trusts renderer edits to existing history',async()=>{
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'epw-history-'));try{const v=new Vault();await v.create(path.join(dir,'vault.xlsx'),'Master8!');await v.save([item]);const first=structuredClone(v.items[0]);assert.equal(first.history.length,2);
 await v.save([{...first,title:'Renamed'}]);assert.equal(v.items[0].history.length,2);
 await v.save([{...v.items[0],password:'second',fields:item.fields.map(f=>f.id==='extra'?{...f,value:'changed'}:f),history:[]}]);assert.equal(v.items[0].history.length,4);
 const final=structuredClone(v.items);v.lock();assert.deepEqual(await v.open(path.join(dir,'vault.xlsx'),'Master8!'),final);assert(final[0].history.every(h=>Number.isFinite(Date.parse(h.at))));
 await v.save([{...v.items[0],password:''}]);assert.equal(v.items[0].history.at(-1).value,'');
 }finally{await fs.rm(dir,{recursive:true,force:true});}
});
test('history workbook recovers with Excel and old workbooks remain readable',async()=>{
 const i=recordHistory(null,item);assert.deepEqual(await decode(await encode([i],'Master8!'),'Master8!'),[i]);assert.deepEqual(await decode(await encode([item],'Master8!'),'Master8!'),[item]);
 const received=receivedItem(i,'2026-09-27T01:00:00.000Z');assert.equal(received.updated,'2026-09-27T01:00:00.000Z');assert.notEqual(received.id,i.id);assert(!received.history);
 const imported=receivedItem(i,'2026-09-27T01:00:00.000Z',{history:true});assert.equal(imported.history.find(h=>h.label==='自定义密码').field,'field:'+imported.fields[0].id);
});
