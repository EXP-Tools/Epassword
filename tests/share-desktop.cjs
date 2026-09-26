const {_electron:electron,expect}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const dir=path.resolve('test-results','share-'+Date.now());await fs.mkdir(dir,{recursive:true});
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({args:['.','--user-data-dir='+path.join(dir,'profile')],env});
 try{
 const page=await app.firstWindow();await page.locator('#master').waitFor();
 await page.evaluate(async file=>{
  const r=await epassword.call('unlock',{mode:'create',path:file,password:'Master8!'});state.path=file;state.items=r.items;
  state.items=await epassword.call('save',{id:'',title:'分享演示账号',category:'登录信息',username:'demo@example.com',password:'Fictional-only-123!',url:'https://example.com',notes:'虚构演示数据',tags:'',favorite:'false',archived:'false',deleted:'false',created:'',updated:'',fields:[{id:'demo-otp',type:'otp',label:'验证器',value:'JBSWY3DPEHPK3PXP'}]});render();
 },path.join(dir,'vault.xlsx'));
 await page.locator('#share-item').click();
 await page.locator('#share-password').fill('Sharing8');await page.locator('#share-confirm').fill('Sharing8');
 await page.locator('#share-form button').click();await expect(page.locator('#share-result')).toBeVisible();
 const hex=await page.locator('#share-hex').inputValue();assert.match(hex,/^[0-9a-f]+$/);
 await page.locator('#share-copy').click();
 assert.equal(await app.evaluate(({clipboard})=>clipboard.readText()),hex);
 await page.screenshot({path:path.join(dir,'share.png')});
 await page.locator('[data-close]').click();await page.locator('#import-excel').click();await page.locator('#switch-share').click();
 const header=await page.locator('.transfer-header').boundingBox(),toggle=await page.locator('#back-excel').boundingBox();assert(toggle.x>header.x+header.width/2);await page.locator('#import-hex').fill(hex);await page.locator('#import-share-password').fill('Incorrect-pass-123!');
 await page.locator('#share-import-form button').click();await expect(page.locator('#toast')).toContainText('分享密码错误');await expect(page.locator('#shared-import')).toBeDisabled();
 await page.locator('#import-share-password').fill('Sharing8');await page.locator('#share-import-form button').click();await expect(page.locator('#shared-preview')).toBeVisible();
 await page.screenshot({path:path.join(dir,'share-import.png')});
 await page.locator('#shared-import').click();await expect(page.locator('.item')).toHaveCount(2);
 const items=await page.evaluate(()=>state.items);
 assert.notEqual(items[0].id,items[1].id);assert.equal(items[0].password,items[1].password);assert.equal(items[0].fields[0].value,items[1].fields[0].value);
 console.log('PASS: Electron share, clipboard, wrong password, preview and imported password/OTP. '+dir);
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
