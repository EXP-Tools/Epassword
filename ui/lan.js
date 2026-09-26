let lanWindow=null,lanState=null;
function lanSharing(){
 const m=modal('<div class="transfer-header"><h2>局域网分享</h2><button id="lan-stop" class="danger">关闭服务 / 断开</button></div><p class="hint">仅推送自己选择的项目，对方确认接收后才传输密码。双方不能浏览彼此的密码库。每次最多 100 项，不发送密码历史。</p><div id="lan-controls"><button id="lan-start">临时开启服务</button><button id="lan-search">搜索局域网服务</button><div id="lan-found"></div><label>直接连接 IP / 端口（由对方提供）</label><div class="row"><input id="lan-ip" placeholder="192.168.1.10" aria-label="局域网 IP"><input id="lan-port" type="number" min="1" max="65535" placeholder="端口" aria-label="服务端口"><button id="lan-connect">请求连接</button></div></div><div id="lan-status" role="status"></div><div id="lan-session"></div><div id="lan-push" hidden><h3>选择要推送的项目</h3><div class="transfer-select"><label><input id="transfer-all" type="checkbox"> 全选</label><small id="transfer-count"></small></div><div class="transfer-list">'+transferRows(state.items.filter(i=>i.deleted!=='true'))+'</div><button id="lan-offer" class="primary">申请推送所选项目</button></div><p class="hint">未建立连接或建立连接后 5 分钟没有推送动作，服务自动关闭。设备码需在 60 秒内核对。锁定密码库、休眠和退出也会断开。防火墙需允许局域网连接；搜索不可用时可填写 IP 和端口。</p><div class="actions"><button data-close>收起</button></div>');
 lanWindow=m;bindTransferSelection(m);m.querySelectorAll('[name=transfer-id]').forEach(c=>c.checked=false);m.querySelector('[name=transfer-id]')?.dispatchEvent(new Event('change'));
 const act=fn=>()=>run(fn);
 m.querySelector('#lan-start').onclick=act(async()=>{await call('lan-start');});
 m.querySelector('#lan-connect').onclick=act(async()=>{await call('lan-connect',{ip:m.querySelector('#lan-ip').value.trim(),port:Number(m.querySelector('#lan-port').value)});});
 m.querySelector('#lan-stop').onclick=act(async()=>{await call('lan-stop');});
 m.querySelector('#lan-offer').onclick=act(async()=>{await call('lan-offer',selectedTransferIds(m));});
 m.querySelector('#lan-search').onclick=act(async()=>{const found=await call('lan-discover');if(!m.isConnected)return;const box=m.querySelector('#lan-found');box.replaceChildren();if(!found.length)box.textContent='未找到服务，可直接填写对方 IP 与端口。';for(const service of found){const b=document.createElement('button');b.textContent=service.name+' · '+service.ip+':'+service.port;b.onclick=act(async()=>call('lan-connect',service));box.append(b);}});
 call('lan-status').then(updateLan).catch(e=>toast(e.message));
}
function updateLan(s){
 lanState=s;const nav=document.querySelector('#lan-sharing');if(nav)nav.textContent='⇄ 局域网分享'+((s.offer||(s.code&&!s.confirmed))?' · 待确认':s.active?' · 已开启':'');const m=lanWindow;if(!m?.isConnected)return;
 m.querySelector('#lan-status').textContent=(s.hosting?'服务地址：'+s.addresses.map(ip=>ip+':'+s.port).join(' / ')+'。 ':'')+(s.reason||'尚未开启服务')+(s.expires?' · 自动关闭时间 '+new Date(s.expires).toLocaleTimeString():'');
 m.querySelector('#lan-controls').hidden=s.active;m.querySelector('#lan-stop').disabled=!s.active;
 const session=m.querySelector('#lan-session');session.replaceChildren();
 if(s.code){const p=document.createElement('p');p.textContent='对方设备：'+s.peer;session.append(p);const code=document.createElement('strong');code.className='lan-code';code.textContent=s.code;session.append(code);const hint=document.createElement('p');hint.className='hint';hint.textContent='通过当面或可信通话核对两台电脑的6 位数字设备码。完全相同后，双方分别点击确认；不一致请关闭连接。';session.append(hint);
  const b=document.createElement('button');b.id='lan-confirm';b.textContent=s.confirmed?(s.paired?'双方已确认':'你已确认，等待对方'):'设备码相同，确认连接';b.disabled=s.confirmed;b.onclick=()=>run(async()=>call('lan-confirm',s.code));session.append(b);
 }
 if(s.offer){const box=document.createElement('div');box.className='lan-incoming';const heading=document.createElement('h3');heading.textContent='对方请求推送 '+s.offer.items.length+' 个项目';box.append(heading);const list=document.createElement('ul');for(const item of s.offer.items){const li=document.createElement('li');li.textContent=item.title+' · '+item.category;list.append(li);}box.append(list);
  for(const [label,accept] of [['确认接收',true],['拒绝',false]]){const b=document.createElement('button');b.textContent=s.offer.accepting?'正在接收…':label;b.disabled=s.offer.accepting;b.dataset.lanAccept=String(accept);b.onclick=()=>run(async()=>call('lan-accept',{id:s.offer.id,accept}));box.append(b);}session.append(box);
 }
 m.querySelector('#lan-push').hidden=!s.paired;m.querySelector('#lan-offer').disabled=!!s.outgoing;m.querySelector('#lan-offer').textContent=s.outgoing?'等待对方确认 / 保存':'申请推送所选项目';
}
