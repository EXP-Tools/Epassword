const {randomUUID}=require('node:crypto');
const secretTypes=new Set(['password']);
function secrets(item){return [{field:'password',label:'密码',value:item.password},...(item.fields||[]).filter(f=>secretTypes.has(f.type)).map(f=>({field:'field:'+f.id,label:f.label,value:f.value}))];}
function validateHistory(history){
 if(history===undefined)return;
 if(!Array.isArray(history)||history.length>10000)throw Error('单个项目的密码历史最多 10000 条');
 for(const h of history)if(!h||typeof h.field!=='string'||h.field.length>200||typeof h.label!=='string'||h.label.length>200||typeof h.value!=='string'||h.value.length>30000||typeof h.at!=='string'||!Number.isFinite(Date.parse(h.at)))throw Error('密码历史格式无效');
}
function recordHistory(old,item,now=new Date().toISOString()){
 const history=structuredClone(old?.history||[]);
 // Migrate old workbooks lazily, preserving the last known edit time.
 for(const f of secrets(old||item))if(f.value&&!history.some(h=>h.field===f.field))history.push({...f,at:old&&Number.isFinite(Date.parse(old.updated))?old.updated:now});
 if(old){const before=new Map(secrets(old).map(f=>[f.field,f.value]));
 for(const f of secrets(item))if(before.get(f.field)!==f.value)history.push({...f,at:now});}
 validateHistory(history);return {...item,history};
}
function receivedItem(item,now=new Date().toISOString(),{history=false}={}){
 const ids=new Map((item.fields||[]).map(f=>[f.id,randomUUID()]));
 const result={...item,id:randomUUID(),updated:now,fields:(item.fields||[]).map(f=>({...f,id:ids.get(f.id)}))};
 delete result.history;
 if(history&&item.history)result.history=item.history.map(h=>({...h,field:h.field.startsWith('field:')?'field:'+(ids.get(h.field.slice(6))||h.field.slice(6)):h.field}));
 return result;
}
module.exports={recordHistory,validateHistory,receivedItem};
