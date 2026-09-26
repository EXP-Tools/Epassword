const {_electron:electron,expect}=require('@playwright/test');
const fs=require('node:fs/promises');const path=require('node:path');const assert=require('node:assert/strict');const QRCode=require('qrcode');
(async()=>{
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const dir=path.resolve('test-results',`otp-${Date.now()}`);await fs.mkdir(dir,{recursive:true});
 const uri='otpauth://totp/ScreenTest:alice?secret=JBSWY3DPEHPK3PXP&issuer=ScreenTest';
 const png=await QRCode.toBuffer(uri,{width:600,margin:4});const imageFile=path.join(dir,'fixture.png');await fs.writeFile(imageFile,png);
 const app=await electron.launch({args:['.',`--user-data-dir=${path.join(dir,'profile')}`],env,...(process.env.EPASSWORD_TEST_RUNTIME?{executablePath:process.env.EPASSWORD_TEST_RUNTIME}:{})});
 try{
  const page=await app.firstWindow();await page.waitForSelector('#master');
  const file=path.join(dir,'vault.xlsx');
  await page.evaluate(async file=>{const result=await window.epassword.call('unlock',{mode:'create',path:file,password:'Otp-test-password-123!'});state.items=result.items;state.path=file;render();},file);
  await page.locator('#new').click();await page.locator('[name=title]').fill('OTP 测试');
  for(const [type,value] of [['question','答案'],['text','普通文本'],['url','https://example.com'],['email','a@example.com'],['address','上海'],['date','2026-09-26'],['password','extra-secret'],['phone','001234']]){
   await page.locator('.extra-type').selectOption(type);await page.locator('.add-extra').click();await page.locator('.extra-edit-row').last().locator('.extra-value').fill(value);
  }
  await page.locator('.extra-type').selectOption('otp');await page.locator('.add-extra').click();
  await app.evaluate(({dialog},imageFile)=>{global.originalOpenDialog=dialog.showOpenDialog;dialog.showOpenDialog=async()=>({canceled:false,filePaths:[imageFile]});},imageFile);
  await page.locator('.scan-image').click();await expect(page.locator('.scan-result')).toContainText('已识别 ScreenTest');
  await app.evaluate(({dialog})=>{dialog.showOpenDialog=global.originalOpenDialog;});
  await page.locator('.check-otp').click();await expect(page.locator('.scan-result')).toContainText('SHA1 / 6 位 / 30 秒');
  // Real desktop capture of a synthetic QR window. No captured screen is written to disk.
  await app.evaluate(async({BrowserWindow,screen},data)=>{
   const display=screen.getPrimaryDisplay();global.qrTestWindow=new BrowserWindow({x:display.bounds.x,y:display.bounds.y,width:display.bounds.width,height:display.bounds.height,frame:false,alwaysOnTop:true,webPreferences:{nodeIntegration:false,contextIsolation:true}});
   await global.qrTestWindow.loadURL('data:text/html;charset=utf-8,'+encodeURIComponent(`<body style="margin:0;background:white;display:grid;place-items:center;height:100vh"><img src="data:image/png;base64,${data}" width="600" height="600"></body>`));
  },png.toString('base64'));
  const screenResults=await page.evaluate(()=>window.epassword.call('otp-scan','screen'));
  assert.ok(screenResults.some(result=>result.issuer==='ScreenTest'));
  await app.evaluate(()=>{global.qrTestWindow.close();global.qrTestWindow=null;});
  await page.locator('#editor [type=submit]').click();await page.locator('h1').filter({hasText:'OTP 测试'}).waitFor();
  await expect(page.locator('.otp-code')).toHaveText(/^\d{6}$/);await expect(page.locator('.otp-countdown')).toContainText('秒后刷新');
  const remaining=await page.locator('.otp-countdown').textContent();await expect.poll(()=>page.locator('.otp-countdown').textContent()).not.toBe(remaining);
  await page.locator('.otp-code').click();const copied=await app.evaluate(({clipboard})=>clipboard.readText());assert.match(copied,/^\d{6}$/);
  await page.screenshot({path:'test-results/otp-detail.png'});
  await page.locator('#edit').click();assert.equal(await page.locator('.extra-edit-row').count(),9);
  await page.locator('.extra-edit-row').first().locator('.remove-extra').click();await page.locator('#editor [type=submit]').click();await page.locator('.otp-code').waitFor();
  await page.locator('#lock').click();await page.waitForSelector('#master');
  const rejected=await page.evaluate(async()=>{try{await window.epassword.call('otp-scan','screen');return false;}catch{return true;}});assert.ok(rejected);
  await page.locator('#master').fill('Otp-test-password-123!');await page.locator('#unlock button').click();await expect(page.locator('.otp-code')).toHaveText(/^\d{6}$/);
  const {decode}=require('../electron/vault.cjs');const saved=await decode(await fs.readFile(file),'Otp-test-password-123!');assert.equal(saved[0].fields.length,8);assert.ok(saved[0].fields.find(f=>f.type==='otp').value.startsWith('otpauth://'));
  console.log('PASS: all field types, image QR import, real screen QR capture, live OTP countdown/copy, remove/edit, lock restriction, encrypted persistence/reopen');
 }finally{await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
