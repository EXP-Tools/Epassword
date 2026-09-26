const {test}=require('node:test'),assert=require('node:assert/strict');
const net=require('node:net'),dgram=require('node:dgram');
const {LanShare,localIP}=require('../electron/lan.cjs');
const item={id:'one',title:'Demo',category:'登录信息',username:'tester',password:'private-current-secret',url:'https://example.com',notes:'',tags:'',favorite:'false',archived:'false',deleted:'false',created:'2020-01-01',updated:'2020-01-01',fields:[{id:'custom',type:'password',label:'备用密码',value:'private-custom'}],history:[{field:'password',label:'密码',at:'2020-01-01',value:'old-secret'}]};
const wait=async predicate=>{for(let n=0;n<200;n++){if(predicate())return;await new Promise(r=>setTimeout(r,10));}throw Error('timed out');};
async function pair(t,options={}){const a=new LanShare({name:'A',discoveryPort:0,...options}),b=new LanShare({name:'B',discoveryPort:0,...options});t.after(()=>{a.stop();b.stop();});await a.start();await b.connect('127.0.0.1',a.port);await wait(()=>a.code&&b.code);assert.equal(a.code,b.code);assert.match(a.code,/^\d{6}$/);assert.equal(a.paired,false);a.confirm(a.code);await wait(()=>b.peerConfirmed);assert.equal(b.paired,false);b.confirm(b.code);await wait(()=>a.paired&&b.paired);return {a,b};}
test('LAN push is bidirectional, consent-gated and excludes history',async t=>{
 const received=[];const {a,b}=await pair(t,{receive:async items=>received.push(items)});
 a.offer([item,{...item,id:'two'}]);await wait(()=>b.incoming);assert.equal(received.length,0);assert(!JSON.stringify(b.status()).includes(item.password));assert(!JSON.stringify(b.status()).includes('old-secret'));
 b.accept(b.incoming.id,false);await wait(()=>!a.outgoing);assert.equal(received.length,0);
 a.offer([item]);await wait(()=>b.incoming);b.accept(b.incoming.id,true);await wait(()=>!a.outgoing);assert.equal(received.length,1);assert.equal(received[0][0].password,item.password);assert(!received[0][0].history);
 b.offer([item]);await wait(()=>a.incoming);a.accept(a.incoming.id,true);await wait(()=>!b.outgoing);assert.equal(received.length,2);
 a.stop();await wait(()=>!b.status().active);assert(!b.sendKey);assert(!a.outgoing);
});
test('LAN refuses unapproved payloads and arbitrary vault reads',async t=>{
 const {a,b}=await pair(t,{receive:()=>assert.fail('must not save')});
 a.send({type:'items',id:'unsolicited',items:[item]});await wait(()=>!b.status().active);
 const other=await pair(t,{receive:()=>assert.fail('must not save')});other.a.send({type:'get',id:'one'});await wait(()=>!other.b.status().active);
});
test('LAN rejects altered accepted data and replayed encrypted frames',async t=>{
 const {a,b}=await pair(t,{receive:()=>assert.fail('must not save')});a.offer([item]);await wait(()=>b.incoming);a.outgoing.items[0].password='changed-after-offer';b.accept(b.incoming.id,true);await wait(()=>!b.status().active);
 const p=await pair(t,{receive:()=>{}});let captured;const write=p.a.socket.write.bind(p.a.socket);p.a.socket.write=(data,...args)=>{captured=data;return write(data,...args);};p.a.offer([item]);await wait(()=>p.b.incoming);assert(!captured.includes(item.password));write(captured);await wait(()=>!p.b.status().active);
});
test('LAN times out before and after pairing and public addresses are refused',async t=>{
 const a=new LanShare({discoveryPort:0,idleMs:150});t.after(()=>a.stop());await a.start();await wait(()=>!a.status().active);
 const p=await pair(t,{idleMs:200});await wait(()=>!p.a.status().active&&!p.b.status().active);
 assert(localIP('192.168.0.2'));assert(localIP('172.16.2.3'));assert(!localIP('8.8.8.8'));await assert.rejects(a.connect('example.com',1234));await assert.rejects(a.connect('8.8.8.8',1234));
});
test('LAN discovery returns only service metadata and does not extend timeout',async t=>{
 const a=new LanShare({discoveryPort:0,idleMs:3000});t.after(()=>a.stop());await a.start();await new Promise(resolve=>a.discovery.once('listening',resolve));const expires=a.expires;
 const udp=dgram.createSocket('udp4');t.after(()=>udp.close());const response=new Promise(resolve=>udp.once('message',d=>resolve(JSON.parse(d))));
 udp.send(Buffer.from(JSON.stringify({type:'epassword-discover-v1',nonce:'a'.repeat(32)})),a.discovery.address().port,'127.0.0.1');
 const result=await response;assert.equal(result.port,a.port);assert.equal(result.nonce,'a'.repeat(32));assert.equal(a.expires,expires);assert.deepEqual(Object.keys(result).sort(),['name','nonce','port','type']);
});

test('LAN requires both confirmations and rejects a mismatched device code',async t=>{
 const a=new LanShare({discoveryPort:0}),b=new LanShare();t.after(()=>{a.stop();b.stop();});await a.start();await b.connect('127.0.0.1',a.port);await wait(()=>a.code&&b.code);
 assert.throws(()=>a.confirm('wrong-code'));assert.throws(()=>a.offer([item]));a.confirm(a.code);await wait(()=>b.peerConfirmed);assert.throws(()=>a.offer([item]));assert.equal(a.paired,false);b.stop();await wait(()=>!a.status().active);
});

test('LAN detects a changed key commitment before showing a device code',async t=>{
 const a=new LanShare({discoveryPort:0}),b=new LanShare();t.after(()=>{a.stop();b.stop();});await a.start();await b.connect('127.0.0.1',a.port);b.hello.name='changed-after-commit';await wait(()=>!a.status().active);assert.equal(a.code,null);
});
