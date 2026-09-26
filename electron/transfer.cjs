const fs=require('node:fs/promises');
const {randomUUID}=require('node:crypto');
const {encode,decode}=require('./vault.cjs');
const {encryptItem,decryptItem}=require('./share.cjs');
function transferHandlers({vault,dialog,getWindow,requireUnlocked,touch,mutate,putClipboard}){
 let pending=null,shared=null;
 const clear=()=>{pending=null;shared=null;};
 const check=generation=>{requireUnlocked();if(generation!==vault.generation)throw Error('密码库已锁定或切换，请重新操作');};
 return {clear,channels:{
  'share-create':async(_,options)=>{
   requireUnlocked();touch();shared=null;const generation=vault.generation;
   const item=vault.items.find(i=>i.id===options?.id);if(!item)throw Error('项目不存在');
   const hex=await encryptItem(item,options.password);check(generation);shared=hex;return hex;
  },
  'share-copy':()=>{requireUnlocked();if(!shared)throw Error('请先生成分享密文');putClipboard(shared);},
  'share-clear':()=>{shared=null;},
  'share-preview':async(_,options)=>{
   requireUnlocked();touch();pending=null;const generation=vault.generation;
   const item=await decryptItem(options?.hex,options?.password);check(generation);
   const token=randomUUID();pending={token,generation,items:[item],expires:Date.now()+5*60*1000};
   const {id,title,username,category,archived,deleted}=item;
   return {token,items:[{id,title,username,category,archived,deleted}]};
  },

  'transfer-export':async(_,options)=>{
   requireUnlocked();touch();const generation=vault.generation;
   if(!options||!Array.isArray(options.ids)||!options.ids.length||typeof options.encrypted!=='boolean')throw Error('请选择要导出的项目');
   const ids=new Set(options.ids);const items=vault.items.filter(i=>ids.has(i.id));
   if(items.length!==ids.size)throw Error('项目已变化，请重新选择');
   if(options.encrypted&&(typeof options.password!=='string'||options.password.length<8||options.password.length>255))throw Error('导出主密码需要 8–255 个字符');
   const result=await dialog.showSaveDialog(getWindow(),{title:'导出 Excel（请选择新文件名）',defaultPath:'Epassword-export.xlsx',filters:[{name:'Excel',extensions:['xlsx']}]});
   check(generation);if(result.canceled)return {canceled:true};
   const data=await encode(items,options.password,{encrypted:options.encrypted});
   try{check(generation);await fs.writeFile(result.filePath,data,{flag:'wx',mode:0o600});return {count:items.length};}
   catch(e){if(e.code==='EEXIST')throw Error('文件已存在，请选择新文件名，避免覆盖密码库或其他文件');throw e;}
   finally{data.fill(0);}
  },
  'transfer-preview':async(_,password)=>{
   requireUnlocked();touch();pending=null;const generation=vault.generation;
   const result=await dialog.showOpenDialog(getWindow(),{title:'导入 Epassword Excel',properties:['openFile'],filters:[{name:'Excel',extensions:['xlsx']}]});
   check(generation);if(result.canceled)return {canceled:true};
   if((await fs.stat(result.filePaths[0])).size>20*1024*1024)throw Error('导入文件不能超过 20 MB');
   const data=await fs.readFile(result.filePaths[0]);
   let items;
   try{items=await decode(data,password,{allowPlain:true});}finally{data.fill(0);}
   check(generation);const token=randomUUID();pending={token,generation,items,expires:Date.now()+5*60*1000};
   return {token,items:items.map(({id,title,username,category,archived,deleted})=>({id,title,username,category,archived,deleted}))};
  },
  'transfer-cancel':()=>clear(),
  'transfer-import':(_,options)=>mutate(async()=>{
   if(!pending||options?.token!==pending.token||pending.generation!==vault.generation||Date.now()>pending.expires)throw Error('导入预览已失效，请重新选择文件');
   if(!Array.isArray(options.ids)||!options.ids.length)throw Error('请选择要导入的项目');
   const ids=new Set(options.ids),selected=pending.items.filter(i=>ids.has(i.id));
   if(selected.length!==ids.size)throw Error('选择的项目无效');
   // Append as new records; never replace existing IDs/accounts.
   const imported=selected.map(i=>({...i,id:randomUUID(),fields:(i.fields||[]).map(f=>({...f,id:randomUUID()}))}));
   await vault.save([...vault.items,...imported]);pending=null;touch();
   return {items:vault.items,count:imported.length};
  })
 }};
}
module.exports={transferHandlers};
