const jsQR=require('jsqr');
const {parseOtp}=require('./otp.cjs');
function decodeQr(data,width,height){
 if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>40000000||data.length!==width*height*4)throw Error('二维码图片尺寸无效或过大');
 const pixels=new Uint8ClampedArray(data);const results=[];let invalid='';
 for(let i=0;i<12;i++){
  const code=jsQR(pixels,width,height,{inversionAttempts:'attemptBoth'});if(!code)break;
  try{if(!code.data.startsWith('otpauth://'))throw Error('识别到的二维码不是 OTP 设置二维码');const parsed=parseOtp(code.data);if(!results.some(r=>r.uri===parsed.uri))results.push(parsed);}catch(error){invalid=error.message;}
  const points=Object.values(code.location).filter(p=>p&&typeof p.x==='number');
  const left=Math.max(0,Math.floor(Math.min(...points.map(p=>p.x)))-4),right=Math.min(width,Math.ceil(Math.max(...points.map(p=>p.x)))+4);
  const top=Math.max(0,Math.floor(Math.min(...points.map(p=>p.y)))-4),bottom=Math.min(height,Math.ceil(Math.max(...points.map(p=>p.y)))+4);
  for(let y=top;y<bottom;y++)pixels.fill(255,(y*width+left)*4,(y*width+right)*4);
 }
 pixels.fill(0);
 if(!results.length)throw Error(invalid||'未识别到 OTP 二维码，请放大二维码或导入清晰图片');
 return results.map(({uri,label,issuer})=>({uri,label,issuer}));
}
module.exports={decodeQr};
