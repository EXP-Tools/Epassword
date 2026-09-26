const {_electron:electron,chromium,expect}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {decode}=require('../electron/vault.cjs');
(async()=>{
 const dir=path.resolve('test-results','browser-'+Date.now());await fs.mkdir(dir,{recursive:true});
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({args:['.', '--user-data-dir='+path.join(dir,'desktop')],env,
  ...(process.env.EPASSWORD_TEST_RUNTIME?{executablePath:process.env.EPASSWORD_TEST_RUNTIME}:{})});
 let browser;
 try{
  const desktop=await app.firstWindow();await desktop.waitForSelector('#master');
  const file=path.join(dir,'vault.xlsx'),master='Browser-test-123!';
  await desktop.evaluate(async({file,master})=>{
   const result=await epassword.call('unlock',{mode:'create',path:file,password:master});
   state.items=result.items;state.path=file;
   state.items=await epassword.call('save',{id:'',title:'Example',category:'登录信息',username:'fixture-user',password:'fixture-secret',
    url:'https://vault.example.test',notes:'',tags:'',favorite:'false',archived:'false',deleted:'false',created:'',updated:'',fields:[]});
   render();settings();
  },{file,master});
  await desktop.locator('#browser-pair').click();await expect(desktop.locator('#browser-token')).toHaveValue(/[A-Za-z0-9_-]{43}/);
  const token=await desktop.locator('#browser-token').inputValue();
  const extensionPath=path.resolve(process.env.EPASSWORD_TEST_EXTENSION || 'extension');
  browser=await chromium.launchPersistentContext(path.join(dir,'chrome'),{headless:false,...(process.env.EPASSWORD_TEST_CHROME?{executablePath:process.env.EPASSWORD_TEST_CHROME}:{}),args:[
   '--disable-extensions-except='+extensionPath,'--load-extension='+extensionPath
  ]});
  const worker=browser.serviceWorkers()[0]||await browser.waitForEvent('serviceworker');
  const id=new URL(worker.url()).host;
  const login='<form><input autocomplete="username" name="username"><input type="password" autocomplete="current-password"><button>Login</button></form>';
  await browser.route('https://**/*',route=>route.fulfill({contentType:'text/html',body:
   route.request().url().includes('/register')?'<form action="/welcome"><input name="email" type="email" autocomplete="username"><input name="password" type="password" autocomplete="new-password"><input type="password" autocomplete="new-password"><button>Register</button></form>':
   route.request().url().includes('/cross-action')?'<form action="https://evil.example.test"><input name="username"><input type="password"></form>':login}));
  const website=await browser.newPage();await website.goto('https://vault.example.test/login');
  const websiteId=await worker.evaluate(async()=> (await chrome.tabs.query({url:'https://vault.example.test/*'}))[0].id);
  const popup=await browser.newPage();await popup.goto('chrome-extension://'+id+'/popup.html');
  await popup.evaluate(id=>{tabId=id;},websiteId);
  await popup.locator('#pairing').evaluate(e=>e.open=true);
  await popup.locator('#token').fill(token);await popup.locator('#pair button').click();
  await expect(popup.locator('#status')).toHaveText('已连接 / Connected');
  await expect(popup.locator('#accounts button')).toHaveCount(1);
  // A genuine popup does not hide the active tab. Bring the fixture back to the foreground for filling.
  await website.bringToFront();
  await popup.locator('#accounts button').evaluate(e=>e.click());
  await expect(website.locator('input[type=password]')).toHaveValue('fixture-secret');
  await popup.locator('#auto').evaluate(e=>{e.checked=true;e.dispatchEvent(new Event('change'));});
  await expect(popup.locator('#status')).toHaveText('已连接 / Connected');
  await website.reload();await expect(website.locator('input[type=password]')).toHaveValue('fixture-secret');
  await desktop.evaluate(async()=>{
   const original=state.items[0];
   state.items=await epassword.call('save',{...original,id:'',title:'Second account',username:'second-user',password:'second-fixture'});
  });
  await website.reload();await website.waitForTimeout(800);
  await expect(website.locator('input[type=password]')).toHaveValue('');
  await popup.evaluate(()=>refresh());await expect(popup.locator('#accounts button')).toHaveCount(2);
  await website.goto('https://sub.vault.example.test/login');await website.waitForTimeout(800);
  await expect(website.locator('input[type=password]')).toHaveValue('');
  await website.goto('https://vault.example.test/cross-action');await website.waitForTimeout(800);
  await expect(website.locator('input[type=password]')).toHaveValue('');
  await website.goto('https://vault.example.test/register');await website.waitForTimeout(800);
  await expect(website.locator('input[type=password]').first()).toHaveValue('');
  await website.locator('input[type=email]').fill('new@example.test');
  await website.locator('input[type=password]').nth(0).fill('New-fixture-567!');
  await website.locator('input[type=password]').nth(1).fill('New-fixture-567!');
  await website.locator('button').click();
  await expect.poll(()=>worker.evaluate(async()=> (await chrome.storage.session.get(null)))).toMatchObject({
   ['pending:'+websiteId]:{username:'new@example.test',origin:'https://vault.example.test'}
  });
  await popup.evaluate(()=>refresh());await expect(popup.locator('#pending')).toBeVisible();
  // The extension never writes without the native desktop consent dialog.
  assert.equal((await decode(await fs.readFile(file),master)).length,2);
  await app.evaluate(({dialog})=>{dialog.showMessageBox=async()=>({response:0});});
  await popup.locator('#save').click();await expect(popup.locator('#status')).toHaveText('已取消 / Cancelled');
  assert.equal((await decode(await fs.readFile(file),master)).length,2);
  await app.evaluate(({dialog})=>{dialog.showMessageBox=async()=>({response:1});});
  await popup.locator('#save').click();await expect(popup.locator('#status')).toHaveText('已保存到 Excel 密码库 / Saved to Excel vault');
  const recovered=await decode(await fs.readFile(file),master);
  assert.equal(recovered.length,3);assert.equal(recovered[2].password,'New-fixture-567!');
  const local=await worker.evaluate(()=>chrome.storage.local.get(null));
  assert.equal(JSON.stringify(local).includes('fixture-secret'),false);
  assert.equal(JSON.stringify(local).includes('New-fixture'),false);
  await desktop.evaluate(()=>epassword.call('lock'));
  await popup.evaluate(()=>refresh());await expect(popup.locator('#status')).toContainText('解锁');
  // Chromium can restore previously typed form values independently of this extension.
  // Check a fresh secret request, rather than treating browser form restoration as an unlock.
  const lockedReadDenied=await worker.evaluate(async id=>{
   try{await request('/fill',{url:'https://vault.example.test',id});return false;}
   catch(e){return /解锁/.test(e.message);}
  },recovered[0].id);
  assert.equal(lockedReadDenied,true);
  console.log('PASS: real Chromium extension pairing, manual/automatic fill, multiple-account selection, domain boundary, cross-action refusal, registration detection, cancelled/confirmed Excel save, locked vault');
 }finally{if(browser)await browser.close();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
