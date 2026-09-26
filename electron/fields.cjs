const {parseOtp}=require('./otp.cjs');
const types={question:'安全问题',text:'文本',url:'URL',email:'电子邮件',address:'地址',date:'日期',otp:'一次性密码',password:'密码',phone:'电话'};
function validateFields(fields){
 if(fields===undefined)return;
 if(!Array.isArray(fields)||fields.length>100)throw Error('每个项目最多添加 100 个字段');
 const ids=new Set();
 for(const field of fields){
  if(!field||typeof field.id!=='string'||!field.id||field.id.length>100||ids.has(field.id))throw Error('自定义字段 ID 无效或重复');ids.add(field.id);
  if(!Object.hasOwn(types,field.type)||typeof field.label!=='string'||!field.label.trim()||field.label.length>200||typeof field.value!=='string'||field.value.length>30000)throw Error('请填写有效的自定义字段名称与内容');
  if(field.type==='otp')parseOtp(field.value);
 }
}
module.exports={types,validateFields};
