const $ = id => document.getElementById(id);
let tabId, draft;
async function send(type, values = {}) {
  const r = await chrome.runtime.sendMessage({type,tabId,...values});
  if (!r?.ok) throw Error(r?.error || '操作失败');
  return r.value;
}
async function run(fn) {
  const buttons = [...document.querySelectorAll('button')];buttons.forEach(b => b.disabled=true);
  try {await fn();} catch(e) {$('status').textContent=e.message;}
  finally {buttons.forEach(b => b.disabled=false);}
}
async function refresh() {
  const result = await send('status');
  $('site').textContent=result.origin;
  $('status').textContent=result.error || '已连接 / Connected';
  $('pairing').open=!!result.error;
  $('auto').checked=result.auto;
  $('accounts').replaceChildren();
  if (!result.items.length) $('accounts').textContent='没有匹配的账号 / No matching logins';
  for (const item of result.items) {
    const button=document.createElement('button');button.className='secondary';
    button.textContent=item.title+'\n'+item.username;
    button.onclick=() => run(async () => {await send('fill',{id:item.id});$('status').textContent='已填充 / Filled';});
    $('accounts').append(button);
  }
  draft=result.pending;$('pending').hidden=!draft;
  if(draft)$('draft').textContent=draft.origin+'\n'+draft.username;
}
$('pair').onsubmit=e => {e.preventDefault();void run(async () => {
  const token=$('token').value.trim();$('token').value='';
  await send('pair',{token});await refresh();
});};
$('disconnect').onclick=() => run(async () => {await send('disconnect');await refresh();});
$('auto').onchange=() => run(async () => {await send('set-auto',{enabled:$('auto').checked});await refresh();});
$('save').onclick=() => run(async () => {
  $('status').textContent='请在 Epassword 桌面端确认保存 / Confirm in Epassword';
  const result=await send('save',{id:draft.id});await refresh();
  $('status').textContent=result.saved?'已保存到 Excel 密码库 / Saved to Excel vault':'已取消 / Cancelled';
});
$('discard').onclick=() => run(async () => {await send('discard');await refresh();});
void run(async () => {
  const [tab]=await chrome.tabs.query({active:true,currentWindow:true});
  tabId=tab?.id;await refresh();
});

$('sponsor-open').onclick=()=>{$('sponsor-dialog').showModal();};
$('sponsor-close').onclick=()=>{$('sponsor-dialog').close();};
for(const method of ['alipay','wechat']){
 $('sponsor-'+method).onclick=()=>{
  const name=method==='alipay'?'支付宝':'微信';
  $('sponsor-code').src='assets/sponsor-'+method+'.png';
  $('sponsor-code').alt=method==='alipay'?'支付宝收款二维码':'微信赞赏码';
  $('sponsor-instruction').textContent='使用'+name+'扫一扫';
  for(const other of ['alipay','wechat']){
   $('sponsor-'+other).setAttribute('aria-pressed',String(other===method));
   $('sponsor-'+other).classList.toggle('secondary',other!==method);
  }
 };
}
