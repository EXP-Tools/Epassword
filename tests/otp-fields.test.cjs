const {test}=require('node:test');const assert=require('node:assert/strict');
const {parseOtp,totp}=require('../electron/otp.cjs');const {decodeQr}=require('../electron/qr.cjs');
const {encode,decode}=require('../electron/vault.cjs');const {PNG}=require('pngjs');const QRCode=require('qrcode');
function base32(text){let bits=0,value=0,result='';for(const byte of Buffer.from(text)){value=(value<<8)|byte;bits+=8;while(bits>=5){bits-=5;result+='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[(value>>>bits)&31];}value&=(1<<bits)-1;}if(bits)result+='ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'[(value<<(5-bits))&31];return result;}
const uri='otpauth://totp/Example:test?secret=JBSWY3DPEHPK3PXP&issuer=Example';
test('RFC 6238 SHA1/SHA256/SHA512 官方测试向量',()=>{
 const keys=['12345678901234567890','12345678901234567890123456789012','1234567890123456789012345678901234567890123456789012345678901234'];
 const vectors=[[59,'94287082','46119246','90693936'],[1111111109,'07081804','68084774','25091201'],[1111111111,'14050471','67062674','99943326'],[1234567890,'89005924','91819424','93441116'],[2000000000,'69279037','90698825','38618901'],[20000000000,'65353130','77737706','47863826']];
 for(const [time,...expected] of vectors)['SHA1','SHA256','SHA512'].forEach((algorithm,index)=>{const otp=totp(`otpauth://totp/test?secret=${base32(keys[index])}&algorithm=${algorithm}&digits=8`,time*1000);assert.equal(otp.code,expected[index]);});
 assert.equal(totp(uri,30000).remaining,30);assert.equal(totp(uri,59000).remaining,1);
});
test('配置规范化及错误参数',()=>{
 assert.equal(parseOtp('jbsw y3dp ehpk 3pxp').secret,'JBSWY3DPEHPK3PXP');
 assert.equal(parseOtp(uri).issuer,'Example');assert.equal(parseOtp(uri).period,30);
 for(const input of ['abc','otpauth://hotp/test?secret=JBSWY3DPEHPK3PXP',uri+'&digits=7',uri+'&period=0',uri+'&algorithm=MD5',uri+'&secret=JBSWY3DPEHPK3PXP','https://example.com'])assert.throws(()=>parseOtp(input));
});
test('真实二维码像素识别，拒绝普通网址二维码',async()=>{
 const png=PNG.sync.read(await QRCode.toBuffer(uri,{width:500}));assert.equal(decodeQr(png.data,png.width,png.height)[0].uri,parseOtp(uri).uri);
 const nonOtp=PNG.sync.read(await QRCode.toBuffer('https://example.com',{width:400}));assert.throws(()=>decodeQr(nonOtp.data,nonOtp.width,nonOtp.height),/不是 OTP/);
});
test('自定义字段和 OTP 明文可读工作表经 Office 加密无损恢复',async()=>{
 const item={id:'fields',title:'测试',category:'登录信息',username:'a',password:'b',url:'',notes:'',tags:'',favorite:'false',archived:'false',deleted:'false',created:'',updated:'',fields:[{id:'otp1',type:'otp',label:'验证器',value:uri},{id:'q1',type:'question',label:'小学名称',value:'独立答案'},{id:'p1',type:'phone',label:'电话',value:'00123456'}]};
 const encrypted=await encode([item],'Test-password-123!');assert.deepEqual(await decode(encrypted,'Test-password-123!'),[item]);
 const office=require('officecrypto-tool');const ExcelJS=require('exceljs');const book=new ExcelJS.Workbook();await book.xlsx.load(await office.decrypt(encrypted,{password:'Test-password-123!'}));assert.equal(book.getWorksheet('自定义字段').getCell('E2').value,uri);
 await assert.rejects(encode([{...item,fields:[{...item.fields[0],value:'invalid'}]}],'Test-password-123!'));
});
