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
