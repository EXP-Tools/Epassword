const {_electron:electron,expect}=require('@playwright/test');
const path=require('node:path');const fs=require('node:fs/promises');const assert=require('node:assert/strict');
(async()=>{
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const dir=path.resolve('test-results',`platform-${Date.now()}`);await fs.mkdir(dir,{recursive:true});
 const app=await electron.launch({args:['.',`--user-data-dir=${path.join(dir,'profile')}`],env,...(process.env.EPASSWORD_TEST_RUNTIME?{executablePath:process.env.EPASSWORD_TEST_RUNTIME}:{})});
 try{
  let page=await app.firstWindow();await page.waitForSelector('#master');
  const nativePlatform=await page.evaluate(()=>window.epassword.platform);assert.equal(nativePlatform,process.platform);
  await page.evaluate(async file=>{const result=await window.epassword.call('unlock',{mode:'create',path:file,password:'Platform-test-123!'});state.items=result.items;state.path=file;render();},path.join(dir,'vault.xlsx'));
  await expect(page.locator('#lock')).toContainText(process.platform==='darwin'?'⌘ L':'Ctrl L');
  await page.keyboard.press(process.platform==='darwin'?'Meta+k':'Control+k');await expect(page.locator('#search')).toBeFocused();
  await page.keyboard.press(process.platform==='darwin'?'Meta+l':'Control+l');await page.waitForSelector('#master');
  if(process.platform==='darwin'){
   // Subscribe before closing and reactivate in the main process after all closed handlers.
   // Keeping this in one evaluation also avoids a second command during target teardown.
   const [reopened,closedCount]=await Promise.all([
    app.waitForEvent('window',{timeout:15000}),
    app.evaluate(({app,BrowserWindow})=>new Promise(resolve=>{
     const window=BrowserWindow.getAllWindows()[0];
     window.once('closed',()=>setImmediate(()=>{
      const count=BrowserWindow.getAllWindows().length;
      app.emit('activate');resolve(count);
     }));
     window.close();
    }))
   ]);
   assert.equal(closedCount,0);page=reopened;
   await page.waitForSelector('#master');
   // A reopened window must have working IPC, without duplicate registrations.
   const generated=await page.evaluate(()=>window.epassword.call('generate',{type:'pin',length:6}));assert.match(generated,/^\d{6}$/);
   const menu=await app.evaluate(({Menu})=>Menu.getApplicationMenu().items.length);assert.ok(menu>=4);
  }
  console.log(`PASS: ${process.platform} launch, platform bridge, shortcuts, lock${process.platform==='darwin'?', Dock re-open and native menu':''}`);
 }finally{await app.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
