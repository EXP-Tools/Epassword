const BASE = 'http://127.0.0.1:29743';
const ready = Promise.all([
  chrome.storage.session.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'}),
  chrome.storage.local.setAccessLevel({accessLevel:'TRUSTED_CONTEXTS'})
]);
function httpsOrigin(url) {
  const u = new URL(url);
  if (u.protocol !== 'https:' || u.username || u.password || u.hostname.endsWith('.')) throw Error('仅支持 HTTPS 网页 / HTTPS only');
  return u.origin;
}
async function request(path, body, supplied) {
  const token = supplied || (await chrome.storage.session.get('token')).token;
  if (!token) throw Error('请先配对桌面端 / Pair Epassword first');
  let r;
  try {
    r = await fetch(BASE + path, {method:'POST',headers:{'Content-Type':'application/json',
      'Authorization':'Bearer ' + token,'X-Epassword-Client':chrome.runtime.id},
      body:JSON.stringify(body),cache:'no-store',credentials:'omit',redirect:'error',
      signal:AbortSignal.timeout(path === '/save' ? 120000 : 5000)});
  } catch { throw Error('无法连接 Epassword，请启动桌面端并开启浏览器连接 / Desktop unavailable'); }
  const result = await r.json();
  if (!r.ok) throw Error(result.error || '连接失败');
  return result;
}
const pendingKey = id => 'pending:' + id;
async function pending(id) {
  const key = pendingKey(id), value = (await chrome.storage.session.get(key))[key];
  if (value && value.expires > Date.now()) return value;
  await discard(id); return null;
}
async function discard(id) {
  await chrome.storage.session.remove(pendingKey(id));
  await chrome.action.setBadgeText({tabId:id,text:''}).catch(() => {});
}
async function currentTab(id, expected) {
  const tab = await chrome.tabs.get(id);
  if (httpsOrigin(tab.url) !== expected) throw Error('网页已切换，请重试 / Page changed');
  return tab;
}
async function handle(message, sender) {
  await ready;
  if (!message || typeof message.type !== 'string') throw Error('非法请求');
  const fromPopup = sender.id === chrome.runtime.id && sender.url === chrome.runtime.getURL('popup.html');
  const fromPage = !fromPopup && sender.tab && sender.frameId === 0 && sender.id === chrome.runtime.id;
  if (fromPage) {
    const origin = httpsOrigin(sender.url);
    await currentTab(sender.tab.id, origin);
    if (message.type === 'auto') {
      const {autoSites = []} = await chrome.storage.local.get('autoSites');
      if (!autoSites.includes(origin)) return null;
      const {items} = await request('/matches', {url:origin});
      if (items.length !== 1) return null;
      const credentials = await request('/fill', {url:origin,id:items[0].id});
      await currentTab(sender.tab.id, origin);
      return credentials;
    }
    if (message.type === 'registration') {
      const draft = message.draft;
      if (!draft || typeof draft.username !== 'string' || draft.username.length > 1000 ||
          typeof draft.password !== 'string' || !draft.password || draft.password.length > 4000) throw Error('无效的注册信息');
      // Do not collect pending passwords before the user has paired the extension.
      if (!(await chrome.storage.session.get('token')).token) return null;
      const old = await pending(sender.tab.id);
      if (old && old.origin === origin && old.username === draft.username && old.password === draft.password) return {pending:true};
      const value = {id:crypto.randomUUID(),origin,username:draft.username,password:draft.password,expires:Date.now()+300000};
      await chrome.storage.session.set({[pendingKey(sender.tab.id)]:value});
      await chrome.action.setBadgeText({tabId:sender.tab.id,text:'!'});
      await chrome.action.setBadgeBackgroundColor({tabId:sender.tab.id,color:'#4263eb'});
      return {pending:true};
    }
    if (message.type === 'pending-notice') {
      const value = await pending(sender.tab.id);
      return {pending:!!value && value.origin === origin};
    }
    throw Error('网页不允许此操作');
  }
  if (!fromPopup) throw Error('非法来源');
  if (message.type === 'pair') {
    if (typeof message.token !== 'string' || !/^[A-Za-z0-9_-]{43}$/.test(message.token)) throw Error('请粘贴桌面端配对码');
    const result = await request('/pair', {}, message.token);
    await chrome.storage.session.set({token:message.token});
    return result;
  }
  if (message.type === 'disconnect') {
    await chrome.storage.session.clear();
    const tabs = await chrome.tabs.query({});
    await Promise.all(tabs.map(t => chrome.action.setBadgeText({tabId:t.id,text:''}).catch(() => {})));
    return {};
  }
  const tab = await chrome.tabs.get(message.tabId), origin = httpsOrigin(tab.url);
  if (message.type === 'status') {
    const {autoSites = []} = await chrome.storage.local.get('autoSites');
    const value = await pending(tab.id);
    let result = {items:[]}, error;
    try { result = await request('/matches', {url:origin}); } catch(e) { error=e.message; }
    return {origin,...result,error,auto:autoSites.includes(origin),
      pending:value ? {id:value.id,origin:value.origin,username:value.username} : null};
  }
  if (message.type === 'set-auto') {
    const {autoSites = []} = await chrome.storage.local.get('autoSites');
    await chrome.storage.local.set({autoSites:[...new Set([...autoSites.filter(s => s!==origin),...(message.enabled ? [origin] : [])])]});
    return {};
  }
  if (message.type === 'fill') {
    const credentials = await request('/fill',{url:origin,id:message.id});
    await currentTab(tab.id, origin);
    const result = await chrome.tabs.sendMessage(tab.id,{type:'fill',...credentials},{frameId:0});
    if (!result?.filled) throw Error(result?.error || '没有可填充的登录表单，请刷新网页 / No login form');
    return {};
  }
  if (message.type === 'discard') { await discard(tab.id); return {}; }
  if (message.type === 'save') {
    const value = await pending(tab.id);
    if (!value || value.id !== message.id) throw Error('待保存信息已过期，请重新提交注册表单');
    const {requestId} = await request('/save',{url:value.origin,username:value.username,password:value.password});
    let result;
    const deadline=Date.now()+125000;
    do {
      if(Date.now()>deadline)throw Error('等待确认超时，请返回桌面端检查保存结果');
      await new Promise(resolve=>setTimeout(resolve,500));
      result=await request('/save-result',{url:value.origin,requestId});
    } while(result.pending);
    if (result.saved) await discard(tab.id);
    return result;
  }
  throw Error('未知操作');
}
chrome.runtime.onMessage.addListener((message,sender,reply) => {
  handle(message,sender).then(value => reply({ok:true,value}),e => reply({ok:false,error:e.message}));
  return true;
});
chrome.tabs.onRemoved.addListener(id => { void discard(id); });
chrome.alarms.create('expire', {periodInMinutes:1});
chrome.alarms.onAlarm.addListener(async () => {
  const all = await chrome.storage.session.get(null);
  for (const [key,value] of Object.entries(all)) if (key.startsWith('pending:') && value.expires <= Date.now()) await discard(Number(key.slice(8)));
});
