// Capture real Electron UI with an isolated profile and fictional vault only.
const {_electron:electron}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path');
(async()=>{
 const output=path.resolve('docs/screenshots');await fs.mkdir(output,{recursive:true});
 const fixture=path.resolve('test-results','screenshots-'+Date.now());await fs.mkdir(fixture,{recursive:true});
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({args:['.','--user-data-dir='+path.join(fixture,'profile')],env});
 try{
  const page=await app.firstWindow();await page.locator('#master').waitFor();
  await app.evaluate(({BrowserWindow})=>BrowserWindow.getAllWindows()[0].setContentSize(1320,920));
  await page.screenshot({path:path.join(output,'unlock.png')});
  await page.evaluate(async file=>{
   const result=await epassword.call('unlock',{mode:'create',path:file,password:'Fictional-Screenshot-Vault-123!'});
   state.path=file;state.items=result.items;
   for(const [title,username,url,tags] of [
    ['GitHub · 开发账号','alex@example.com','https://github.com','工作'],
    ['个人邮箱','alex@example.com','https://mail.example.com','个人'],
    ['团队协作平台','alex.chen','https://team.example.com','工作'],
    ['家庭网络','home-admin','https://router.example.com','个人'],
    ['设计资源库','alex.design','https://design.example.com','工作'],
   ]){
    state.items=await epassword.call('save',{id:'',title,username,url,tags,category:'登录信息',password:'Demo-Password-Only-123!',notes:'演示账号，仅用于展示界面。所有信息均为虚构数据。',favorite:title.startsWith('GitHub')?'true':'false',archived:'false',deleted:'false',created:'',updated:'',fields:title.startsWith('GitHub')?[{id:'demo-email',type:'email',label:'恢复邮箱',value:'recovery@example.com'}]:[]});
   }
   state.selected=state.items[0].id;render();
  },path.join(fixture,'demo.xlsx'));
  await page.locator('#edit').waitFor();await page.screenshot({path:path.join(output,'vault.png')});
  await page.locator('#new').click();
  await page.locator('[name=title]').fill('新建登录信息');
  await page.locator('[name=username]').fill('alex@example.com');
  await page.screenshot({path:path.join(output,'editor.png')});
  await page.locator('.extra-type').selectOption('otp');
  await page.locator('.add-extra').click();
  await page.locator('.extra-label').fill('工作账号验证器');
  await page.locator('.extra-value').fill('JBSWY3DPEHPK3PXP');
  await page.locator('.check-otp').click();
  await page.locator('.scan-result').filter({hasText:'有效配置'}).waitFor();
  await page.locator('.extra-editor').scrollIntoViewIfNeeded();
  await page.screenshot({path:path.join(output,'otp-setup.png')});
  await page.locator('[data-close]').click();
  await page.locator('#settings').click();
  await page.locator('#program-api').click();
  await page.screenshot({path:path.join(output,'program-api.png')});
  await page.locator('[data-close]').click();
  await page.locator('#sponsor').click();
  await page.locator('.sponsor-codes img').evaluateAll(images=>Promise.all(images.map(image=>image.decode())));
  await page.screenshot({path:path.join(output,'sponsor.png')});
  console.log('Saved 6 Electron screenshots with fictional data to '+output);
 }finally{await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
