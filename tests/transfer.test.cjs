const {test}=require('node:test'),assert=require('node:assert/strict');
const fs=require('node:fs/promises'),os=require('node:os'),path=require('node:path');
const {Vault,decode}=require('../electron/vault.cjs');
const {transferHandlers}=require('../electron/transfer.cjs');
test('Excel transfer: selected/encrypted/plain round trips, append IDs, cancellation and lock guards',async()=>{
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'epassword-transfer-'));
 try{
 const vault=new Vault();await vault.create(path.join(root,'vault.xlsx'),'Original-master-123!');
 const item={id:'one',title:'示例账号',category:'登录信息',username:'00123',password:'=not-a-formula',url:'https://example.com',notes:'多行\n备注',tags:'工作',favorite:'true',archived:'false',deleted:'false',created:'2026-01-01',updated:'2026-01-01',fields:[{id:'otp-one',type:'otp',label:'OTP',value:'JBSWY3DPEHPK3PXP'}]};
 await vault.save([item,{...item,id:'two',title:'第二项',fields:[]}]);
 let output=path.join(root,'export.xlsx'),input;
 const dialog={showSaveDialog:async()=>({canceled:false,filePath:output}),showOpenDialog:async()=>({canceled:false,filePaths:[input]})};
 const transfer=transferHandlers({vault,dialog,getWindow:()=>null,requireUnlocked:()=>{if(!vault.items)throw Error('locked');},touch:()=>{},mutate:fn=>fn()});
 const api=transfer.channels;
 assert.deepEqual(await api['transfer-export'](null,{ids:['one'],encrypted:true,password:'Export-master-123!'}),{count:1});
 const encrypted=await fs.readFile(output);
 await assert.rejects(decode(encrypted,'Original-master-123!'));
 const decoded=await decode(encrypted,'Export-master-123!');assert.equal(decoded.length,1);assert.equal(decoded[0].fields[0].value,item.fields[0].value);
 await assert.rejects(api['transfer-export'](null,{ids:['one'],encrypted:true,password:'Export-master-123!'}),/文件已存在/);
 output=path.join(root,'plain.xlsx');await api['transfer-export'](null,{ids:['one','two'],encrypted:false});
 const plain=await fs.readFile(output);await assert.rejects(decode(plain,''),/只接受/);
 assert.equal((await decode(plain,'',{allowPlain:true})).length,2);
 input=output;const preview=await api['transfer-preview'](null,'');assert.equal(preview.items.length,2);assert(!JSON.stringify(preview).includes(item.password));assert(!JSON.stringify(preview).includes(item.fields[0].value));
 const imported=await api['transfer-import'](null,{token:preview.token,ids:['one']});
 assert.equal(imported.count,1);assert.equal(vault.items.length,3);assert.notEqual(vault.items[2].id,'one');assert.notEqual(vault.items[2].fields[0].id,'otp-one');assert.equal(vault.password,'Original-master-123!');
 await assert.rejects(api['transfer-import'](null,{token:preview.token,ids:['one']}),/失效/);
 input=path.join(root,'export.xlsx');await assert.rejects(api['transfer-preview'](null,'wrong'),/主密码/);
 const p=await api['transfer-preview'](null,'Export-master-123!');api['transfer-cancel']();await assert.rejects(api['transfer-import'](null,{token:p.token,ids:['one']}),/失效/);
 output=path.join(root,'must-not-export.xlsx');dialog.showSaveDialog=async()=>{vault.lock();transfer.clear();return {canceled:false,filePath:output};};
 await assert.rejects(api['transfer-export'](null,{ids:[vault.items[0].id],encrypted:false}),/locked/);
 await assert.rejects(fs.access(output));
 }finally{
 const actual=await fs.realpath(root),temp=await fs.realpath(os.tmpdir());
 if(path.dirname(actual)!==temp||!path.basename(actual).startsWith('epassword-transfer-'))throw Error('Unsafe cleanup');
 await fs.rm(actual,{recursive:true,force:true});
 }
});
