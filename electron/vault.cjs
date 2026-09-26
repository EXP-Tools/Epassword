const fs = require('node:fs/promises');
const crypto = require('node:crypto');
const ExcelJS = require('exceljs');
const office = require('officecrypto-tool');
const {validateFields,types}=require('./fields.cjs');
const extraColumns=['项目ID','字段ID','字段类型','字段名称','字段内容'];
const columns = {id:'ID',title:'标题',category:'类型',username:'用户名',password:'密码',url:'网址',notes:'备注',tags:'标签',favorite:'收藏',archived:'归档',deleted:'已删除',created:'创建时间',updated:'更新时间'};
const hash = b => crypto.createHash('sha256').update(b).digest('hex');
function validate(items) {
 if (!Array.isArray(items) || items.length > 10000) throw Error('密码库最多支持 10000 条记录');
 const ids = new Set();
 for (const item of items) {
  if (!item.id || ids.has(item.id)) throw Error('记录 ID 缺失或重复'); ids.add(item.id);
  if (!item.title || !['登录信息','安全笔记','信用卡','身份信息'].includes(item.category)) throw Error('标题或类型无效');
  for (const key of Object.keys(columns)) if (typeof item[key] !== 'string' || item[key].length > 30000) throw Error('字段格式无效或内容过长');
  validateFields(item.fields);
 }
}
async function encode(items, password) {
 validate(items);
 if (typeof password !== 'string' || password.length < 12 || password.length > 255) throw Error('主密码需要 12–255 个字符');
 const book = new ExcelJS.Workbook();
 const sheet = book.addWorksheet('密码库', {views:[{state:'frozen',ySplit:1}]});
 sheet.columns = Object.entries(columns).map(([key,header]) => ({key,header,width:key==='notes'?55:28}));
 items.forEach(item=>sheet.addRow(item));
 sheet.getRow(1).font={bold:true,color:{argb:'FFFFFFFF'}};
 sheet.getRow(1).fill={type:'pattern',pattern:'solid',fgColor:{argb:'FF2254AD'}};
 sheet.autoFilter={from:'A1',to:'M1'};
 sheet.eachRow(row=>{row.alignment={vertical:'top',wrapText:true};});
 const extras=book.addWorksheet('自定义字段',{views:[{state:'frozen',ySplit:1}]});
 extras.columns=extraColumns.map((header,index)=>({header,width:index===4?100:28}));
 for(const item of items)for(const field of item.fields||[])extras.addRow([item.id,field.id,types[field.type],field.label,field.value]);
 extras.getRow(1).font={bold:true};extras.autoFilter='A1:E1';
 const readme=book.addWorksheet('使用说明');
 readme.getColumn(1).width=110;
 ['Epassword · 可独立恢复的本地密码库','使用 Microsoft Excel 打开本文件，输入 Epassword 主密码即可查看密码库。','主密码就是 Excel 文件打开密码，不是工作表保护密码。忘记密码无法恢复。','基本信息保存在「密码库」，更多信息及 OTP 密钥保存在「自定义字段」；没有额外应用密钥。','编辑后保留表头、ID、类型和所有列；收藏/归档/已删除使用 true 或 false。','类型：登录信息、安全笔记、信用卡、身份信息。其他信息可保存在备注或自定义字段。','不要同时在 Excel 和 Epassword 中编辑。恢复备份时先复制 .bak 为 .xlsx。','格式版本：2'].forEach(s=>readme.addRow([s]));
 readme.addRow(['自定义字段保存在「自定义字段」工作表，通过项目ID对应密码库。字段内容为可读文本。']);
 readme.addRow(['一次性密码字段存储的是 OTP 设置密钥 / otpauth:// 链接，不是会过期的验证码；可重新导入其他验证器恢复。']);
 const plain=Buffer.from(await book.xlsx.writeBuffer());
 try {return office.encrypt(plain,{password});} finally {plain.fill(0);}
}
async function decode(data,password) {
 if (!office.isEncrypted(data)) throw Error('只接受带文件打开密码的 Excel 密码库');
 let plain;
 try {plain=await office.decrypt(data,{password});} catch {throw Error('主密码错误，或文件已损坏');}
 try {
  const book=new ExcelJS.Workbook(); await book.xlsx.load(plain);
  const sheet=book.getWorksheet('密码库');
  if (!sheet) throw Error('不是 Epassword 密码库：缺少密码库工作表');
  const keys=Object.keys(columns);
  keys.forEach((k,i)=>{if(sheet.getRow(1).getCell(i+1).value!==columns[k]) throw Error('密码库表头不匹配');});
  const items=[];
  sheet.eachRow((row,n)=>{if(n===1)return; const item={}; keys.forEach((k,i)=>{const v=row.getCell(i+1).value; if(v && typeof v==='object') throw Error('密码库不支持公式或复杂单元格');item[k]=v==null?'':String(v);}); items.push(item);});
  const extras=book.getWorksheet('自定义字段');
  if(extras){
   extraColumns.forEach((label,i)=>{if(extras.getRow(1).getCell(i+1).value!==label)throw Error('自定义字段表头不匹配');});
   const byId=new Map(items.map(item=>[item.id,item]));
   extras.eachRow((row,n)=>{if(n===1)return;const values=extraColumns.map((_,i)=>{const v=row.getCell(i+1).value;if(v&&typeof v==='object')throw Error('自定义字段不支持公式或复杂单元格');return v==null?'':String(v);});const [itemId,id,typeName,label,value]=values;const item=byId.get(itemId);if(!item)throw Error('自定义字段引用了不存在的项目');const type=Object.keys(types).find(key=>types[key]===typeName);(item.fields??=[]).push({id,type,label,value});});
  }
  validate(items); return items;
 } finally {plain.fill(0);}
}
class Vault {
 constructor(){this.lock();this.queue=Promise.resolve();}
 lock(){this.password=null;this.items=null;this.path=null;this.digest=null;this.generation=(this.generation||0)+1;}
 async open(path,password){const generation=this.generation;const data=await fs.readFile(path);const items=await decode(data,password);if(generation!==this.generation)throw Error('密码库已锁定');Object.assign(this,{path,password,items,digest:hash(data)});return items;}
 async create(path,password){const generation=this.generation;const data=await encode([],password);if(generation!==this.generation)throw Error('密码库已锁定');await fs.writeFile(path,data,{flag:'wx',mode:0o600});if(generation!==this.generation)throw Error('密码库已锁定');return this.open(path,password);}
 save(items,password=this.password){const generation=this.generation;const job=this.queue.then(async()=>{
  if(!this.items||generation!==this.generation)throw Error('密码库已锁定');
  const file=this.path, data=await encode(items,password);
  const current=await fs.readFile(file);if(hash(current)!==this.digest)throw Error('Excel 文件已被外部修改，请锁定后重新打开，避免覆盖');
  const temp=file+'.'+crypto.randomUUID()+'.tmp';
  try {await fs.writeFile(temp,data,{flag:'wx',mode:0o600});await fs.copyFile(file,file+'.bak');if(generation!==this.generation)throw Error('密码库已锁定');await fs.rename(temp,file);if(generation===this.generation)Object.assign(this,{items,password,digest:hash(data)});}finally{await fs.rm(temp,{force:true});}
 });this.queue=job.catch(()=>{});return job;}
}
module.exports={Vault,encode,decode,columns};
