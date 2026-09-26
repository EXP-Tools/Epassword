const {_electron:electron,expect}=require('@playwright/test');
const path=require('node:path'),fs=require('node:fs/promises');
(async()=>{
 const dir=path.resolve('test-results','transfer-'+Date.now());await fs.mkdir(dir,{recursive:true});
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({args:['.','--user-data-dir='+path.join(dir,'profile')],env});
 try{
 const page=await app.firstWindow();await page.locator('#master').waitFor();
 await page.evaluate(async file=>{
  const result=await epassword.call('unlock',{mode:'create',path:file,password:'Master8!'});state.path=file;state.items=result.items;
  for(const title of ['示例邮箱','示例网站'])state.items=await epassword.call('save',{id:'',title,category:'登录信息',username:'demo@example.com',password:'Fictional-only-123!',url:'https://example.com',notes:'',tags:'',favorite:'false',archived:'false',deleted:'false',created:'',updated:'',fields:[]});
  render();
 },path.join(dir,'vault.xlsx'));
 await app.evaluate(({dialog},file)=>{dialog.showSaveDialog=async()=>({canceled:false,filePath:file});dialog.showOpenDialog=async()=>({canceled:false,filePaths:[file]});},path.join(dir,'export.xlsx'));
 await page.locator('#export-excel').click();
 await expect(page.locator('#export-encrypted')).toBeChecked();
 await page.locator('#transfer-all').uncheck();await expect(page.locator('#transfer-count')).toHaveText('已选 0 / 2 个项目');
 await page.locator('[name=transfer-id]').first().check();
 await page.locator('#export-password').fill('Export8!');await page.locator('#export-confirm').fill('Export8!');
 await page.screenshot({path:path.join(dir,'export.png')});
 await page.locator('#export-form [type=submit]').click();await expect(page.locator('#toast')).toHaveText('已导出 1 个项目');
 await page.locator('#import-excel').click();await page.locator('#import-password').fill('Export8!');await page.locator('#import-preview').click();
 await expect(page.locator('#transfer-count')).toHaveText('已选 1 / 1 个项目');
 await page.screenshot({path:path.join(dir,'import.png')});
 await page.locator('#import-confirm').click();await expect(page.locator('#toast')).toHaveText('已导入 1 个项目');await expect(page.locator('.item')).toHaveCount(3);
 await page.locator('#export-excel').click();await page.locator('#export-encrypted').uncheck();await expect(page.locator('#plain-warning')).toBeVisible();await expect(page.locator('#export-password')).toBeDisabled();
 await page.locator('[data-close]').click();
 console.log('PASS: real Electron selection, encrypted export, preview/import and plaintext controls. '+dir);
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
