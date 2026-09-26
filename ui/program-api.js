function programApiSettings() {
 const m=modal('<h2>AI / 程序 API</h2><p class="hint">仅监听本机 127.0.0.1:29744。为每个程序指定允许访问的网站。锁定密码库、过期或退出应用后 Token 失效。API 调用不会延长自动锁定时间。</p>'+
 '<form id="api-create"><label>程序名称</label><input name="name" required maxlength="80" placeholder="例如：我的登录助手">'+
 '<label>允许的网站（每行一个 HTTPS 地址，精确匹配主机名和端口）</label><textarea name="origins" required placeholder="https://example.com"></textarea>'+
 '<label>有效期（分钟）</label><input name="ttl" type="number" min="5" max="480" value="60" required>'+
 '<label><input name="read" type="checkbox" checked>允许读取账号密码用于填充（取消勾选则仅查询账号列表）</label>'+
 '<p class="hint">授权的程序可获取这些网站的密码明文；只把 Token 交给你信任的本机程序，不要粘贴到网页或 AI 对话中。</p>'+
 '<button class="primary" type="submit">创建程序 Token</button></form>'+
 '<p id="api-token-hint" class="hint"></p><input id="api-token" type="password" readonly hidden aria-label="程序 API Token">'+
 '<h3>已授权程序</h3><div id="api-clients"></div><div class="actions"><button id="api-stop">关闭 API 并撤销全部授权</button><button data-close>关闭窗口</button></div>');
 async function refresh() {
  const result=await call('api-status');if(!m.isConnected)return;
  const list=m.querySelector('#api-clients');list.replaceChildren();
  if(!result.clients.length){list.textContent=result.enabled?'没有有效授权':'API 未开启';return;}
  for(const client of result.clients) {
   const row=document.createElement('div');row.className='card';
   const text=document.createElement('p');text.textContent=client.name+' · '+(client.scopes.includes('credentials:read')?'账号和密码':'仅账号列表')+' · 到期 '+new Date(client.expiresAt).toLocaleString()+'\n'+client.origins.join(', ');
   const revoke=document.createElement('button');revoke.textContent='撤销';
   revoke.onclick=()=>run(async()=>{await call('api-revoke',client.id);m.querySelector('#api-token').value='';m.querySelector('#api-token').hidden=true;await refresh();});
   row.append(text,revoke);list.append(row);
  }
 }
 m.querySelector('#api-create').onsubmit=e=>{
  e.preventDefault();const form=e.target;
  run(async()=>{
   m.querySelector('#api-token').value='';m.querySelector('#api-token').hidden=true;m.querySelector('#api-token-hint').textContent='';
   const result=await call('api-create',{name:form.elements.name.value,
    origins:form.elements.origins.value.split(/\r?\n/).map(v=>v.trim()).filter(Boolean),
    scopes:['logins:list',...(form.elements.read.checked?['credentials:read']:[])],ttlMinutes:Number(form.elements.ttl.value)});
   if(!m.isConnected)return;
   const token=m.querySelector('#api-token');token.hidden=false;token.value=result.token;token.focus();token.select();
   m.querySelector('#api-token-hint').textContent='Token 仅此处显示一次，请复制到程序的环境变量 EPASSWORD_API_TOKEN。接口：'+result.baseUrl;
   await refresh();
  });
 };
 m.querySelector('#api-stop').onclick=()=>run(async()=>{await call('api-stop');m.querySelector('#api-token').value='';m.querySelector('#api-token').hidden=true;m.querySelector('#api-token-hint').textContent='全部程序授权已撤销';await refresh();});
 void refresh().catch(e=>toast(e.message));
}
