const $=id=>document.getElementById(id);
const accounts=[
{id:'design',title:'设计协作',username:'alex@example.com',url:'https://design.example.com',password:'Demo-Design-2026!',icon:'F',tag:'工作',favorite:true,color:'#ece6f4'},
{id:'code',title:'代码托管',username:'alex.dev',url:'https://code.example.com',password:'Demo-Code-2026!',icon:'⌘',tag:'开发',favorite:true,color:'#e6eae4'},
{id:'mail',title:'个人邮箱',username:'hello@example.com',url:'https://mail.example.com',password:'Demo-Mail-2026!',icon:'@',tag:'个人',favorite:false,color:'#e5edf5'},
{id:'notes',title:'旅行计划',username:'travel@example.com',url:'https://travel.example.com',password:'Demo-Travel-2026!',icon:'↗',tag:'生活',favorite:false,color:'#f2eadb'}
];
let mode='vault',active='design',favoriteOnly=false,pin=false;
function toast(text){$('toast').textContent=text;$('toast').style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>$('toast').style.display='none',2500);}
async function copy(text){try{await navigator.clipboard.writeText(text);toast('已复制虚构演示数据');}catch{toast('浏览器未允许复制，请在详情中选择文本。');}}
function switchMode(next){mode=next;document.querySelectorAll('[data-mode]').forEach(b=>{const selected=b.dataset.mode===next;b.setAttribute('aria-selected',String(selected));b.tabIndex=selected?0:-1;});document.querySelectorAll('[role=tabpanel]').forEach(p=>p.hidden=p.id!=='demo-'+next);}
document.querySelectorAll('[data-mode]').forEach(b=>{b.onclick=()=>switchMode(b.dataset.mode);b.onkeydown=e=>{const tabs=[...document.querySelectorAll('[data-mode]')];let index=tabs.indexOf(b);if(e.key==='ArrowRight')index=(index+1)%tabs.length;else if(e.key==='ArrowLeft')index=(index+tabs.length-1)%tabs.length;else return;e.preventDefault();tabs[index].focus();switchMode(tabs[index].dataset.mode);};});
function showDetail(item){
 const node=$('detail');node.replaceChildren();
 if(!item){node.innerHTML='<p class="empty">没有匹配的演示账号，试试其他关键词。</p>';return;}
 node.innerHTML='<div class="demo-badge">虚构示例 · 无真实凭据</div><div class="detail-top"><span class="account-icon"></span><div><h3></h3><small>个人密码库 / 登录信息</small></div></div><div class="credential"></div><div class="detail-note">用于体验界面的演示账号。点击右侧按钮，试试复制与显示密码。</div><span class="tag"></span>';
 node.querySelector('.account-icon').textContent=item.icon;node.querySelector('.account-icon').style.background=item.color;node.querySelector('h3').textContent=item.title;node.querySelector('.tag').textContent=item.tag;
 for(const [label,value,secret]of [['用户名 / 账号',item.username,false],['密码',item.password,true],['网站',item.url,false]]){
 const row=document.createElement('div');row.className='field';row.innerHTML='<div><label></label><strong></strong></div><div class="field-buttons"></div>';
 row.querySelector('label').textContent=label;const output=row.querySelector('strong');output.textContent=secret?'••••••••••••••':value;
 if(secret){const reveal=document.createElement('button');reveal.textContent='显示';reveal.setAttribute('aria-label','显示演示密码');reveal.onclick=()=>{const visible=reveal.textContent==='隐藏';output.textContent=visible?'••••••••••••••':value;reveal.textContent=visible?'显示':'隐藏';};row.lastElementChild.append(reveal);}
 const button=document.createElement('button');button.textContent='复制';button.setAttribute('aria-label','复制演示'+label);button.onclick=()=>copy(value);row.lastElementChild.append(button);node.querySelector('.credential').append(row);
 }
}
function renderItems(){
 const q=$('search').value.toLowerCase(),items=accounts.filter(a=>(!favoriteOnly||a.favorite)&&[a.title,a.username,a.tag].some(s=>s.toLowerCase().includes(q)));
 if(!items.some(a=>a.id===active))active=items[0]?.id;
 $('items').replaceChildren();$('item-count').textContent=items.length+' 个项目';
 for(const item of items){const b=document.createElement('button');b.className='account-item'+(item.id===active?' active':'');b.setAttribute('aria-pressed',String(item.id===active));b.innerHTML='<span class="account-icon"></span><span><strong></strong><small></small></span>';b.querySelector('.account-icon').textContent=item.icon;b.querySelector('.account-icon').style.background=item.color;b.querySelector('strong').textContent=item.title;b.querySelector('small').textContent=item.username;b.onclick=()=>{active=item.id;renderItems();};$('items').append(b);}
 showDetail(items.find(a=>a.id===active));
}
$('search').oninput=renderItems;
for(const [id,flag]of [['all-items',false],['favorites',true]])$(id).onclick=()=>{favoriteOnly=flag;$('all-items').classList.toggle('side-active',!flag);$('favorites').classList.toggle('side-active',flag);switchMode('vault');renderItems();};
const sets={upper:'ABCDEFGHJKLMNPQRSTUVWXYZ',lower:'abcdefghjkmnpqrstuvwxyz',digit:'0123456789',symbol:'!@#$%&*?'};
function randomIndex(n){const a=new Uint32Array(1),limit=Math.floor(4294967296/n)*n;do{crypto.getRandomValues(a);}while(a[0]>=limit);return a[0]%n;}
function generate(){
 const length=Number($('length').value);$('length-value').textContent=length;
 const pools=pin?[sets.digit]:[...document.querySelectorAll('[data-set]:checked')].map(e=>sets[e.dataset.set]);
 if(!pools.length){$('generated').textContent='请至少选择一种字符';return;}
 const pool=pools.join(''),chars=pools.map(s=>s[randomIndex(s.length)]);
 while(chars.length<length)chars.push(pool[randomIndex(pool.length)]);
 for(let i=chars.length-1;i>0;i--){const j=randomIndex(i+1);[chars[i],chars[j]]=[chars[j],chars[i]];}
 $('generated').textContent=chars.join('');
}
function setPin(value){pin=value;$('pin-mode').classList.toggle('selected',pin);$('random-mode').classList.toggle('selected',!pin);$('characters').hidden=pin;$('length').min=pin?4:8;$('length').max=pin?32:40;$('length').value=pin?6:20;generate();}
$('pin-mode').onclick=()=>setPin(true);$('random-mode').onclick=()=>setPin(false);$('length').oninput=generate;$('regenerate').onclick=generate;document.querySelectorAll('[data-set]').forEach(e=>e.onchange=generate);
for(const item of accounts){const label=document.createElement('label');label.className='export-row';const input=document.createElement('input');input.type='checkbox';input.checked=true;input.value=item.id;input.onchange=updateSelection;const title=document.createElement('span');title.textContent=item.title;const subtitle=document.createElement('small');subtitle.textContent=item.username;label.append(input,title,subtitle);$('export-items').append(label);}
function updateSelection(){const rows=[...$('export-items').querySelectorAll('input')],n=rows.filter(r=>r.checked).length;$('select-all').checked=n===rows.length;$('select-all').indeterminate=n>0&&n<rows.length;$('selected-count').textContent='已选 '+n+' 项';$('export-preview').disabled=!n;$('export-result').hidden=true;}
$('select-all').onchange=()=>{$('export-items').querySelectorAll('input').forEach(i=>i.checked=$('select-all').checked);updateSelection();};
$('encrypted').onchange=()=>{$('export-warning').hidden=$('encrypted').checked;$('export-result').hidden=true;};
$('export-preview').onclick=()=>{const n=$('export-items').querySelectorAll('input:checked').length;$('export-result').textContent='演示预览：'+n+' 个项目 → '+($('encrypted').checked?'独立主密码加密的 Excel':'普通 Excel')+'。请在桌面应用中完成实际导出。';$('export-result').hidden=false;};
$('share-demo').onclick=()=>{$('share-result').hidden=!$('share-result').hidden;$('share-demo').textContent=$('share-result').hidden?'体验接收方流程 →':'收起接收方流程 ↑';};
switchMode('vault');renderItems();generate();updateSelection();

let registrationDemo=false;
function resetBrowserDemo(register){
 registrationDemo=register;
 $('browser-login').classList.toggle('selected',!register);$('browser-register').classList.toggle('selected',register);
 $('browser-form-title').textContent=register?'创建演示账号':'登录演示网站';
 $('browser-username').value=register?'new.alex@example.com':'';
 $('browser-password').value=register?'Demo-New-Account-2026!':'';
 $('browser-action').textContent=register?'模拟注册提交 →':'模拟访问登录页 →';
 $('browser-result').hidden=true;$('browser-confirm').hidden=true;$('browser-confirm').disabled=false;
}
$('browser-login').onclick=()=>resetBrowserDemo(false);$('browser-register').onclick=()=>resetBrowserDemo(true);
$('browser-action').onclick=()=>{
 $('browser-result').hidden=false;
 if(registrationDemo){$('browser-result').textContent='检测到注册信息 → 插件提示「保存到 Epassword」。请先确认网站注册成功，再在桌面端确认。';$('browser-confirm').hidden=false;}
 else{$('browser-username').value='alex@example.com';$('browser-password').value='Demo-Design-2026!';$('browser-result').textContent='✓ 精确匹配域名，已自动填写演示账号。登录表单未提交。';}
};
$('browser-confirm').onclick=()=>{$('browser-result').textContent='✓ 演示：经桌面端确认，追加为新的登录项目；保留已有账号。';$('browser-confirm').disabled=true;};
const apiSamples={
  "sdk": "// 业务密码保存在 Epassword，不写入源码\n// accessToken 由受信任的本机授权流程提供\nconst client = new EpasswordClient({ token: accessToken });\nconst url = 'https://design.example.com/login';\nconst { items } = await client.search(url);\n// 由用户明确选择一个账号\nconst chosen = items.find(i => i.id === selectedItemId);\nif (!chosen) throw new Error('请选择匹配的账号');\nconst credential = await client.credentials(url, chosen.id);\n// 在内存中用于登录，不写入文件或日志\nawait localLogin(credential.username, credential.password);",
  "http": "POST http://127.0.0.1:29744/v1/logins/credentials\nAuthorization: Bearer <本机程序的授权 Token>\nContent-Type: application/json\n\n{\n  \"url\": \"https://design.example.com/login\",\n  \"itemId\": \"demo-01\"\n}",
  "env": "业务密码：\n  在 Epassword UI 中保存和更新\n  程序运行时通过 API 读取，不必逐项设置环境变量\n\nAPI Token（访问密码库的授权凭据）：\n  在桌面端按程序、网站、有效期授权\n  仍须安全提供给本机程序，不应提交代码仓库\n  SDK 可直接接收 Token；环境变量也是可选方式\n\n密码库锁定或 Token 过期后，需要重新授权。"
};
function selectApi(method){$('api-code').textContent=apiSamples[method];document.querySelectorAll('[data-api]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.api===method)));$('api-result').hidden=true;}
document.querySelectorAll('[data-api]').forEach(b=>b.onclick=()=>selectApi(b.dataset.api));
$('api-run').onclick=()=>{$('api-result').hidden=false;};selectApi('sdk');
