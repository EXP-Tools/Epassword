const net=require('node:net');
const dgram=require('node:dgram');
const os=require('node:os');
const crypto=require('node:crypto');
const {validate,columns}=require('./vault.cjs');
const DISCOVERY_PORT=29745, IDLE_MS=5*60*1000, MAX=16*1024*1024;
const hash=value=>crypto.createHash('sha256').update(value).digest('hex');
function localIP(ip){return net.isIPv4(ip)&&(/^(10\.|192\.168\.|127\.|169\.254\.)/.test(ip)||(/^172\./.test(ip)&&Number(ip.split('.')[1])>=16&&Number(ip.split('.')[1])<=31));}
function addresses(){return Object.values(os.networkInterfaces()).flat().filter(i=>i.family==='IPv4'&&!i.internal&&localIP(i.address)).map(i=>i.address);}
function currentOnly(item){const clean=Object.fromEntries(Object.keys(columns).map(k=>[k,item[k]]));clean.fields=(item.fields||[]).map(f=>({id:f.id,type:f.type,label:f.label,value:f.value}));return clean;}
function manifest(items){return items.map(i=>({id:i.id,title:i.title,category:i.category}));}
class LanShare {
 constructor({receive,changed=()=>{},name=os.hostname(),idleMs=IDLE_MS,discoveryPort=DISCOVERY_PORT}={}){
  this.receive=receive;this.changed=changed;this.name=name.slice(0,80);this.idleMs=idleMs;this.discoveryPort=discoveryPort;this.reason='';this.epoch=0;
 }
 status(){return {active:!!(this.server||this.socket),hosting:!!this.server,port:this.port,addresses:addresses(),name:this.name,peer:this.peer?.name,code:this.code,confirmed:!!this.confirmed,peerConfirmed:!!this.peerConfirmed,paired:!!this.paired,expires:this.expires||null,offer:this.incoming?{id:this.incoming.id,items:this.incoming.items,accepting:!!this.incoming.accepted}:null,outgoing:this.outgoing?{count:this.outgoing.items.length}:null,reason:this.reason,discovery:!!this.discovery};}
 notify(){this.changed(this.status());}
 arm(){clearTimeout(this.timer);this.expires=Date.now()+this.idleMs;this.timer=setTimeout(()=>this.stop('5 分钟没有连接或推送，连接已关闭'),this.idleMs);this.timer.unref?.();}
 stop(reason='已关闭局域网分享'){
  this.epoch++;clearTimeout(this.timer);clearTimeout(this.handshakeTimer);this.expires=null;
  const socket=this.socket;this.socket=null;socket?.destroy();
  this.server?.close();this.server=null;try{this.discovery?.close();}catch{}this.discovery=null;
  this.sendKey?.fill(0);this.recvKey?.fill(0);this.sendKey=this.recvKey=null;this.keys=null;this.buffer=null;
  this.peer=null;this.code=null;this.paired=false;this.confirmed=false;this.peerConfirmed=false;this.incoming=null;this.outgoing=null;this.port=null;this.reason=reason;this.notify();
 }
 async start(){
  this.stop('');const epoch=this.epoch;
  const server=net.createServer(socket=>{if(this.socket||!localIP(socket.remoteAddress?.replace('::ffff:',''))){socket.destroy();return;}this.attach(socket,'host');});
  this.server=server;this.arm();
  try{await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'0.0.0.0',resolve);});}
  catch(e){this.stop('启动失败');throw e;}
  if(epoch!==this.epoch){server.close();throw Error('服务已关闭');}
  server.on('error',()=>this.stop('局域网服务异常，已关闭'));this.port=server.address().port;
  const udp=dgram.createSocket('udp4');this.discovery=udp;
  udp.on('error',()=>{try{udp.close();}catch{}if(this.discovery===udp)this.discovery=null;this.notify();});
  udp.on('message',(data,remote)=>{
   if(data.length>512||!localIP(remote.address)||this.socket)return;
   try{const q=JSON.parse(data);if(q.type!=='epassword-discover-v1'||typeof q.nonce!=='string'||!/^[a-f0-9]{32}$/.test(q.nonce))return;
    udp.send(Buffer.from(JSON.stringify({type:'epassword-service-v1',nonce:q.nonce,name:this.name,port:this.port})),remote.port,remote.address,()=>{});
   }catch{}
  });
  udp.bind(this.discoveryPort,'0.0.0.0');this.notify();return this.status();
 }
 async connect(ip,port){
  if(!localIP(ip)||!Number.isInteger(port)||port<1||port>65535)throw Error('请输入局域网 IPv4 地址和服务端显示的端口');
  this.stop('');this.arm();const socket=net.createConnection({host:ip,port});this.attach(socket,'client');
  return this.status();
 }
 attach(socket,role){
  this.socket=socket;this.role=role;this.peerCommit=null;this.buffer=Buffer.alloc(0);this.sendSeq=0;this.recvSeq=0;this.reason='正在建立连接';
  this.keys=crypto.generateKeyPairSync('x25519');this.hello={type:'hello',version:1,name:this.name,nonce:crypto.randomBytes(32).toString('hex'),key:this.keys.publicKey.export({format:'der',type:'spki'}).toString('base64')};
  socket.setNoDelay(true);socket.on('error',()=>{if(this.socket===socket)this.stop('无法连接或连接已中断');});socket.on('close',()=>{if(this.socket===socket)this.stop('对方已断开连接');});
  this.handshakeTimer=setTimeout(()=>{if(this.socket===socket&&!this.paired)this.stop('设备互认超时');},60000);
  socket.on('data',data=>{if(this.socket!==socket)return;try{
   this.buffer=Buffer.concat([this.buffer,data]);if(this.buffer.length>(this.peer?MAX*1.5+2048:4096))throw Error('frame too large');
   let index;while((index=this.buffer.indexOf(10))>=0){const frame=this.buffer.subarray(0,index);this.buffer=this.buffer.subarray(index+1);if(!this.peer&&frame.length>2048)throw Error('hello too large');this.message(JSON.parse(frame.toString('utf8')));if(this.socket!==socket)break;}
  }catch{if(this.socket===socket)this.stop('协议或密文验证失败，连接已关闭');}});
  // Commit before revealing keys/nonces: prevents offline grinding of the six-digit code.
  socket.write(JSON.stringify({type:'commit',commit:hash(JSON.stringify(this.hello))})+'\n');this.notify();
 }
 message(frame){
  if(!this.peer){
   if(!this.peerCommit){if(frame.type!=='commit'||typeof frame.commit!=='string'||!/^[a-f0-9]{64}$/.test(frame.commit))throw Error('invalid commitment');this.peerCommit=frame.commit;this.socket.write(JSON.stringify(this.hello)+'\n');return;}
   if(frame.type!=='hello'||frame.version!==1||typeof frame.name!=='string'||frame.name.length>80||typeof frame.key!=='string'||frame.key.length>128||!/^[a-f0-9]{64}$/.test(frame.nonce))throw Error('invalid hello');
   const hello={type:'hello',version:1,name:frame.name,nonce:frame.nonce,key:frame.key};
   if(hash(JSON.stringify(hello))!==this.peerCommit)throw Error('handshake commitment changed');
   const publicKey=crypto.createPublicKey({key:Buffer.from(hello.key,'base64'),format:'der',type:'spki'});if(publicKey.asymmetricKeyType!=='x25519')throw Error('invalid key');
   const shared=crypto.diffieHellman({privateKey:this.keys.privateKey,publicKey});
   const transcript=Buffer.from(JSON.stringify(this.role==='host'?[this.hello,hello]:[hello,this.hello]));
   const salt=crypto.createHash('sha256').update(transcript).digest();
   const material=Buffer.from(crypto.hkdfSync('sha256',shared,salt,'Epassword LAN v1',64));shared.fill(0);this.keys=null;
   this.sendKey=Buffer.from(material.subarray(this.role==='host'?0:32,this.role==='host'?32:64));this.recvKey=Buffer.from(material.subarray(this.role==='host'?32:0,this.role==='host'?64:32));material.fill(0);
   this.code=String(salt.readUInt32BE(0)%1000000).padStart(6,'0');this.peer=hello;this.reason='请双方核对完整设备码，并分别确认';this.notify();return;
  }
  if(!Number.isSafeInteger(frame.seq)||frame.seq!==this.recvSeq||typeof frame.data!=='string'||typeof frame.tag!=='string')throw Error('invalid sequence');
  const iv=Buffer.alloc(12);iv.writeBigUInt64BE(BigInt(this.recvSeq),4);const dec=crypto.createDecipheriv('aes-256-gcm',this.recvKey,iv);dec.setAAD(Buffer.from('Epassword LAN v1'));dec.setAuthTag(Buffer.from(frame.tag,'base64'));
  const plain=Buffer.concat([dec.update(Buffer.from(frame.data,'base64')),dec.final()]);let msg;try{msg=JSON.parse(plain.toString('utf8'));}finally{plain.fill(0);}this.recvSeq++;
  if(msg.type==='confirm'){if(this.peerConfirmed)throw Error('duplicate confirm');this.peerConfirmed=true;this.ready();return;}
  if(!this.paired)throw Error('not paired');
  if(msg.type==='offer'){
   if(this.incoming||typeof msg.id!=='string'||msg.id.length>100||!Array.isArray(msg.items)||!msg.items.length||msg.items.length>100||!/^[a-f0-9]{64}$/.test(msg.digest))throw Error('invalid offer');
   const ids=new Set();for(const i of msg.items){if(!i||typeof i.id!=='string'||i.id.length>200||ids.has(i.id)||typeof i.title!=='string'||i.title.length>30000||typeof i.category!=='string'||i.category.length>100)throw Error('invalid manifest');ids.add(i.id);}
   this.incoming={id:msg.id,items:msg.items.map(({id,title,category})=>({id,title,category})),digest:msg.digest};this.arm();this.notify();return;
  }
  if(msg.type==='accept'){
   if(!this.outgoing||msg.id!==this.outgoing.id||this.outgoing.sent)throw Error('unexpected accept');
   this.outgoing.sent=true;this.send({type:'items',id:msg.id,items:this.outgoing.items});this.notify();return;
  }
  if(msg.type==='reject'||msg.type==='received'){
   if(!this.outgoing||msg.id!==this.outgoing.id||(msg.type==='received'&&!this.outgoing.sent))throw Error('unexpected result');
   this.outgoing=null;this.reason=msg.type==='received'?'对方已接收并保存项目':'对方拒绝了推送';if(msg.type==='received')this.arm();this.notify();return;
  }
  if(msg.type==='items'){
   const incoming=this.incoming;if(!incoming?.accepted||incoming.receiving||msg.id!==incoming.id||!Array.isArray(msg.items)||msg.items.length!==incoming.items.length)throw Error('unsolicited items');
   validate(msg.items);const clean=msg.items.map(currentOnly);
   if(hash(JSON.stringify(clean))!==incoming.digest||JSON.stringify(manifest(clean))!==JSON.stringify(incoming.items))throw Error('changed offer');
   incoming.receiving=true;const epoch=this.epoch;
   Promise.resolve().then(()=>{if(epoch!==this.epoch)throw Error('closed');return this.receive(clean,()=>epoch===this.epoch);}).then(()=>{
    if(epoch!==this.epoch)return;this.send({type:'received',id:incoming.id});this.incoming=null;this.reason='项目已保存到当前密码库';this.arm();this.notify();
   }).catch(()=>{if(epoch===this.epoch)this.stop('接收保存失败，连接已关闭');});return;
  }
  throw Error('unsupported message');
 }
 send(message){
  if(!this.socket||!this.sendKey)throw Error('连接已关闭');const plain=Buffer.from(JSON.stringify(message));if(plain.length>MAX)throw Error('推送内容不能超过 16 MB');
  try{const iv=Buffer.alloc(12);iv.writeBigUInt64BE(BigInt(this.sendSeq),4);const enc=crypto.createCipheriv('aes-256-gcm',this.sendKey,iv);enc.setAAD(Buffer.from('Epassword LAN v1'));
   const data=Buffer.concat([enc.update(plain),enc.final()]);this.socket.write(JSON.stringify({seq:this.sendSeq++,data:data.toString('base64'),tag:enc.getAuthTag().toString('base64')})+'\n');
  }finally{plain.fill(0);}
 }
 confirm(code){if(!this.peer||this.confirmed||code!==this.code)throw Error('设备码已失效，请重新核对');this.confirmed=true;this.send({type:'confirm'});this.ready();}
 ready(){if(this.confirmed&&this.peerConfirmed){this.paired=true;clearTimeout(this.handshakeTimer);this.reason='双方已互认，可以申请推送';this.arm();}this.notify();}
 offer(items){
  if(!this.paired||this.outgoing)throw Error('请先完成设备互认，或等待上次推送完成');
  if(!Array.isArray(items)||!items.length||items.length>100)throw Error('每次请选择 1–100 个项目');validate(items);
  const clean=items.map(currentOnly);if(Buffer.byteLength(JSON.stringify(clean))>MAX-1024)throw Error('推送内容不能超过 16 MB');
  const outgoing={id:crypto.randomUUID(),items:clean};this.send({type:'offer',id:outgoing.id,items:manifest(clean),digest:hash(JSON.stringify(clean))});this.outgoing=outgoing;this.arm();this.notify();
 }
 accept(id,accept){if(!this.paired||!this.incoming||this.incoming.id!==id||this.incoming.accepted)throw Error('推送申请已失效');if(accept){this.incoming.accepted=true;this.send({type:'accept',id});}else{this.incoming=null;this.send({type:'reject',id});}this.notify();}
}
async function discover({port=DISCOVERY_PORT,timeout=1500}={}){
 const udp=dgram.createSocket('udp4'),nonce=crypto.randomBytes(16).toString('hex'),found=new Map();
 return new Promise(resolve=>{let done=false;const finish=()=>{if(done)return;done=true;clearTimeout(timer);try{udp.close();}catch{}resolve([...found.values()]);};const timer=setTimeout(finish,timeout);
 udp.on('error',finish);udp.on('message',(data,remote)=>{if(data.length>1024||!localIP(remote.address)||found.size>=50)return;try{const r=JSON.parse(data);if(r.type==='epassword-service-v1'&&r.nonce===nonce&&typeof r.name==='string'&&r.name.length<=80&&Number.isInteger(r.port)&&r.port>0&&r.port<=65535)found.set(remote.address+':'+r.port,{ip:remote.address,port:r.port,name:r.name});}catch{}});
 udp.bind(0,'0.0.0.0',()=>{udp.setBroadcast(true);const packet=Buffer.from(JSON.stringify({type:'epassword-discover-v1',nonce}));const targets=new Set(['255.255.255.255']);
 for(const i of Object.values(os.networkInterfaces()).flat().filter(i=>i.family==='IPv4'&&!i.internal&&localIP(i.address))){const a=i.address.split('.').map(Number),m=i.netmask.split('.').map(Number);targets.add(a.map((n,j)=>n|(~m[j]&255)).join('.'));}
 for(const target of targets)udp.send(packet,port,target,()=>{});
 });
 });
}
module.exports={LanShare,discover,localIP,currentOnly};
