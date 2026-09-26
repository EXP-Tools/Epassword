(() => {
  if (window.top !== window || location.protocol !== 'https:') return;
  const send = async message => {
    const r = await chrome.runtime.sendMessage(message);
    if (!r?.ok) throw Error(r?.error || '连接失败');
    return r.value;
  };
  const visible = input => !input.disabled && !input.readOnly && input.getClientRects().length > 0 &&
    getComputedStyle(input).visibility === 'visible' && getComputedStyle(input).display !== 'none';
  const inputs = scope => [...scope.querySelectorAll('input')].filter(visible);
  const secureForm = form => {
    try { return !form || (new URL(form.action || location.href, location.href).origin === location.origin && [...form.querySelectorAll('[formaction]')].every(b=>new URL(b.formAction,location.href).origin===location.origin)); }
    catch { return false; }
  };
  function fields(form) {
    const all = inputs(form || document);
    const passwords = all.filter(i => i.type === 'password');
    const username = all.find(i => i.autocomplete.split(' ').includes('username')) ||
      all.find(i => i.type === 'email') ||
      all.find(i => /user|login|email|account|phone|mobile/i.test(i.name + ' ' + i.id) && ['text','tel',''].includes(i.type)) ||
      all.filter(i => ['text','tel'].includes(i.type)).at(-1);
    return {passwords,username};
  }
  const newPassword = input => input.autocomplete.split(' ').includes('new-password');
  function fill(credentials, automatic = false) {
    if (credentials.origin !== location.origin || document.visibilityState !== 'visible') return {filled:false,error:'网页已切换或不可见'};
    const candidates = [...document.forms, null].filter(form => secureForm(form))
      .map(form => ({form,...fields(form)}))
      .filter(f => f.passwords.length === 1 && !newPassword(f.passwords[0]));
    // The document fallback is only used for inputs without a form.
    const choice = candidates.find(f => f.form || !f.passwords[0].form);
    if (!choice) return {filled:false,error:'未找到普通登录表单（不填充注册或修改密码表单）'};
    if (automatic && (choice.passwords[0].value || choice.username?.value)) return {filled:false};
    function set(input,value) {
      if (!input) return;
      Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(input,value);
      input.dispatchEvent(new Event('input',{bubbles:true}));
      input.dispatchEvent(new Event('change',{bubbles:true}));
    }
    set(choice.username,credentials.username); set(choice.passwords[0],credentials.password);
    return {filled:true};
  }
  chrome.runtime.onMessage.addListener((message,sender,reply) => {
    if (sender.id === chrome.runtime.id && message.type === 'fill') reply(fill(message));
  });
  let notice;
  function showNotice() {
    if (notice?.isConnected) return;
    notice = document.createElement('div');
    // No password or username is inserted into the page banner.
    const shadow = notice.attachShadow({mode:'closed'});
    const box = document.createElement('div');
    box.style.cssText='position:fixed;right:20px;top:20px;z-index:2147483647;background:#18213c;color:white;padding:18px;border-radius:12px;font:14px/1.6 system-ui;max-width:310px;box-shadow:0 5px 30px #0006';
    const text = document.createElement('span');
    text.textContent='Epassword：保存此网站的新密码？请点击浏览器工具栏中的 Epassword 插件确认。 Save password? Open Epassword in the toolbar.';
    const close = document.createElement('button');
    close.textContent='×'; close.setAttribute('aria-label','关闭 / Close');
    close.style.cssText='margin-left:10px;cursor:pointer';
    close.onclick=() => notice.remove();
    box.append(text,close); shadow.append(box); document.documentElement.append(notice);
    setTimeout(() => notice?.remove(),15000);
  }
  let lastAttempt = 0;
  async function capture(form) {
    if (!secureForm(form)) return;
    const {passwords,username} = fields(form);
    const fresh = passwords.find(newPassword);
    const confirmations = passwords.length === 2 && passwords[0].value && passwords[0].value === passwords[1].value;
    const password = fresh || (confirmations ? passwords[0] : null);
    if (!password?.value || (fresh && passwords.filter(newPassword).some(p => p.value !== fresh.value))) return;
    try {
      const result = await send({type:'registration',draft:{username:username?.value || '',password:password.value}});
      if (result?.pending) showNotice();
    } catch { /* The popup reports pairing and desktop errors. */ }
  }
  document.addEventListener('submit',event => {
    if (event.isTrusted) void capture(event.target);
  },true);
  document.addEventListener('click',event => {
    if (!event.isTrusted) return;
    const button = event.target.closest('button,input[type=submit]');
    if (button?.form && (button.type === 'submit')) void capture(button.form);
  },true);
  async function auto() {
    if (document.visibilityState !== 'visible' || Date.now()-lastAttempt < 2000 ||
        !inputs(document).some(i => i.type === 'password' && !newPassword(i))) return;
    lastAttempt = Date.now();
    try { const credentials = await send({type:'auto'}); if (credentials) fill(credentials,true); } catch {}
  }
  let timer;
  new MutationObserver(() => {clearTimeout(timer);timer=setTimeout(auto,400);})
    .observe(document.documentElement,{childList:true,subtree:true});
  document.addEventListener('visibilitychange',auto);
  void auto();
  send({type:'pending-notice'}).then(r => {if(r?.pending)showNotice();}).catch(() => {});
})();
