const {randomBytes,scrypt,createCipheriv,createDecipheriv}=require('node:crypto');
const {promisify}=require('node:util');
const {validate,columns}=require('./vault.cjs');
const derive=promisify(scrypt),MAGIC=Buffer.from('EPS1'),MAX=16*1024*1024;
function passwordCheck(password){if(typeof password!=='string'||password.length<8||password.length>255)throw Error('分享密码需要 8–255 个字符');}
function cleanItem(item){
 if(!item||typeof item!=='object'||Array.isArray(item))throw Error('分享项目格式无效');
 const value=Object.fromEntries(Object.keys(columns).map(k=>[k,item[k]]));
 value.fields=(item.fields||[]).map(f=>({id:f.id,type:f.type,label:f.label,value:f.value}));
 validate([value]);return value;
}
async function keyFor(password,salt){return derive(password,salt,32,{N:32768,r:8,p:1,maxmem:64*1024*1024});}
async function encryptItem(item,password){
 passwordCheck(password);
 const plain=Buffer.from(JSON.stringify({format:'Epassword item',version:1,item:cleanItem(item)}),'utf8');
 let key;
 try{
  if(plain.length>MAX)throw Error('分享项目过大');
  const salt=randomBytes(16),iv=randomBytes(12),header=Buffer.concat([MAGIC,salt,iv]);
  key=await keyFor(password,salt);
  const cipher=createCipheriv('aes-256-gcm',key,iv);cipher.setAAD(header);
  const encrypted=Buffer.concat([cipher.update(plain),cipher.final()]);
  return Buffer.concat([header,cipher.getAuthTag(),encrypted]).toString('hex');
 }finally{plain.fill(0);key?.fill(0);}
}
async function decryptItem(hex,password){
 passwordCheck(password);
 if(typeof hex!=='string'||hex.length>(MAX+48)*2+4096)throw Error('分享密文过大或格式无效');
 hex=hex.replace(/\s/g,'');
 if(hex.length<98||hex.length>(MAX+48)*2||hex.length%2||!/^[a-f0-9]+$/i.test(hex))throw Error('请输入完整的十六进制分享密文');
 const data=Buffer.from(hex,'hex');
 if(!data.subarray(0,4).equals(MAGIC))throw Error('不支持的分享格式或版本');
 let key,plain,first;
 try{
  key=await keyFor(password,data.subarray(4,20));
  const decipher=createDecipheriv('aes-256-gcm',key,data.subarray(20,32));
  decipher.setAAD(data.subarray(0,32));decipher.setAuthTag(data.subarray(32,48));
  first=decipher.update(data.subarray(48));plain=Buffer.concat([first,decipher.final()]);
  const payload=JSON.parse(plain.toString('utf8'));
  if(payload.format!=='Epassword item'||payload.version!==1)throw Error('format');
  return cleanItem(payload.item);
 }catch{throw Error('分享密码错误，或密文已损坏 / 格式无效');}
 finally{key?.fill(0);first?.fill(0);plain?.fill(0);data.fill(0);}
}
module.exports={encryptItem,decryptItem};
