const {createHmac}=require('node:crypto');
function secretBytes(input){
 const secret=String(input).toUpperCase().replace(/\s/g,'').replace(/=+$/,'');
 if(!/^[A-Z2-7]{16,1024}$/.test(secret)||[1,3,6].includes(secret.length%8))throw Error('OTP 密钥必须是有效的 Base32 字符串（至少 16 位）');
 let bits=0,value=0;const bytes=[];
 for(const char of secret){value=(value<<5)|'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'.indexOf(char);bits+=5;if(bits>=8){bits-=8;bytes.push((value>>>bits)&255);value&=(1<<bits)-1;}}
 if(bits&&value!==0)throw Error('OTP 密钥 Base32 尾部无效');
 return {secret,bytes:Buffer.from(bytes)};
}
function parseOtp(input){
 if(typeof input!=='string'||input.length>4096)throw Error('请输入 OTP 密钥或 otpauth:// 链接');
 let secret=input.trim(),algorithm='SHA1',digits=6,period=30,label='',issuer='';
 if(secret.includes('://')){
  let uri;try{uri=new URL(secret);}catch{throw Error('OTP 链接无效');}
  if(uri.protocol!=='otpauth:'||uri.hostname!=='totp')throw Error('仅支持 otpauth://totp 时间型一次性密码，不支持 HOTP 或迁移二维码');
  for(const key of ['secret','algorithm','digits','period','issuer'])if(uri.searchParams.getAll(key).length>1)throw Error('OTP 链接存在重复参数');
  secret=uri.searchParams.get('secret')||'';algorithm=(uri.searchParams.get('algorithm')||'SHA1').toUpperCase();
  digits=Number(uri.searchParams.get('digits')||6);period=Number(uri.searchParams.get('period')||30);
  try{label=decodeURIComponent(uri.pathname.slice(1));}catch{throw Error('OTP 账户名称无效');}issuer=uri.searchParams.get('issuer')||'';
 }
 secret=secretBytes(secret).secret;
 if(!['SHA1','SHA256','SHA512'].includes(algorithm))throw Error('OTP 算法仅支持 SHA1、SHA256、SHA512');
 if(![6,8].includes(digits))throw Error('OTP 验证码仅支持 6 或 8 位');
 if(!Number.isInteger(period)||period<1||period>300)throw Error('OTP 周期必须为 1–300 秒');
 const params=new URLSearchParams({secret,algorithm,digits:String(digits),period:String(period)});if(issuer)params.set('issuer',issuer);
 return {secret,algorithm,digits,period,label,issuer,uri:`otpauth://totp/${encodeURIComponent(label||'Epassword')}?${params}`};
}
function totp(input,time=Date.now()){
 const config=parseOtp(input);if(!Number.isFinite(time)||time<0)throw Error('系统时间无效');
 const seconds=Math.floor(time/1000);const counter=Buffer.alloc(8);counter.writeBigUInt64BE(BigInt(Math.floor(seconds/config.period)));
 const key=secretBytes(config.secret).bytes;
 try{const digest=createHmac(config.algorithm.toLowerCase(),key).update(counter).digest();const offset=digest[digest.length-1]&15;const value=digest.readUInt32BE(offset)&0x7fffffff;return {code:String(value%10**config.digits).padStart(config.digits,'0'),remaining:config.period-seconds%config.period,period:config.period};}finally{key.fill(0);}
}
module.exports={parseOtp,totp};
