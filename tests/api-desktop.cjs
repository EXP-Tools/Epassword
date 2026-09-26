const {_electron:electron,chromium,expect}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {EpasswordClient}=require(process.env.EPASSWORD_TEST_API_CLIENT||'../integrations/epassword-client.cjs');
(async()=>{
 const dir=path.resolve('test-results','api-'+Date.now());await fs.mkdir(dir,{recursive:true});
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({args:['.','--user-data-dir='+path.join(dir,'desktop')],env,
  ...(process.env.EPASSWORD_TEST_RUNTIME?{executablePath:process.env.EPASSWORD_TEST_RUNTIME}:{})});
 let browser;
 try {
  const desktop=await app.firstWindow();await desktop.waitForSelector('#master');
  await desktop.evaluate(async file=>{
   const r=await epassword.call('unlock',{mode:'create',path:file,password:'API-fixture-master!'});
   state.items=r.items;state.path=file;
   state.items=await epassword.call('save',{id:'',title:'API Fixture',category:'登录信息',username:'api-fixture-user',password:'API-fixture-secret!',
    url:'https://api.example.test',notes:'',tags:'',favorite:'false',archived:'false',deleted:'false',created:'',updated:'',fields:[]});
   render();settings();
  },path.join(dir,'vault.xlsx'));
  await desktop.locator('#program-api').click();
  await desktop.locator('#api-create input[name=name]').fill('Local automation');
  await desktop.locator('#api-create textarea').fill('https://api.example.test');
  await desktop.locator('#api-create button').click();
  await expect(desktop.locator('#api-token')).toHaveValue(/^epw[.]/);
  const token=await desktop.locator('#api-token').inputValue();
  const client=new EpasswordClient({token});
  const state=await client.status();assert.equal(state.client.name,'Local automation');
  const {items}=await client.search('https://api.example.test/login');
  assert.equal(items.length,1);assert.equal('password' in items[0],false);
  assert.ok(!JSON.stringify(client).includes(token));
  browser=await chromium.launch({headless:true,...(process.env.EPASSWORD_TEST_CHROME?{executablePath:process.env.EPASSWORD_TEST_CHROME}:{})});
  const page=await browser.newPage();
  const login='<form><input name="username" autocomplete="username"><input type="password" autocomplete="current-password"><button>Log in</button></form>';
  await page.route('https://**/*',route=>route.fulfill({contentType:'text/html',body:
   route.request().url().includes('/register')?'<form><input name="username"><input type="password" autocomplete="new-password"></form>':
   route.request().url().includes('/cross')?'<form action="https://evil.example.test"><input name="username"><input type="password"></form>':login}));
  const options={url:'https://api.example.test',itemId:items[0].id};
  await page.goto(options.url+'/login');
  const filled=await client.fillPage(page,options);
  assert.equal(filled.filled,true);assert.ok(!JSON.stringify(filled).includes('API-fixture-secret'));
  await expect(page.locator('input[type=password]')).toHaveValue('API-fixture-secret!');
  assert.match(page.url(),/\/login$/);
  await page.goto(options.url+'/register');await assert.rejects(client.fillPage(page,options),/login password/);
  await expect(page.locator('input[type=password]')).toHaveValue('');
  await page.goto(options.url+'/cross');await assert.rejects(client.fillPage(page,options),/Cross-origin/);
  await page.goto('https://evil.example.test/login');await assert.rejects(client.fillPage(page,options),/intended origin/);
  await assert.rejects(client.credentials('https://evil.example.test',items[0].id),e=>e.status===403);
  // Recheck the actual page after an HTTP round-trip: navigation must not leak credentials.
  await page.goto(options.url+'/login');
  const credentials=client.credentials.bind(client);
  client.credentials=async(...args)=>{const r=await credentials(...args);await page.goto('https://evil.example.test/login');return r;};
  await assert.rejects(client.fillPage(page,options),/page changed/);
  await expect(page.locator('input[type=password]')).toHaveValue('');
  await desktop.locator('#api-clients button').click();
  await assert.rejects(client.status(),e=>e.status===401);
  await desktop.locator('#api-create button').click();await expect(desktop.locator('#api-token')).toHaveValue(/^epw[.]/);
  const second=new EpasswordClient({token:await desktop.locator('#api-token').inputValue()});
  await second.status();
  await desktop.evaluate(()=>epassword.call('change-password',{current:'API-fixture-master!',next:'API-fixture-new-master!'}));
  await assert.rejects(second.status(),e=>e.status===401);
  await desktop.locator('#api-create button').click();await expect(desktop.locator('#api-token')).toHaveValue(/^epw[.]/);
  const third=new EpasswordClient({token:await desktop.locator('#api-token').inputValue()});
  await third.status();await desktop.evaluate(()=>epassword.call('lock'));
  await assert.rejects(third.status(),e=>e.status===401);
  console.log('PASS: desktop API authorization, exact-origin Playwright fill, safe result, no submit, cross-origin/registration/navigation rejection, revoke, master-password rotation and lock');
 }finally{if(browser)await browser.close();await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
