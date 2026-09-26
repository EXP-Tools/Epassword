const {_electron:electron,expect}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
(async()=>{
 const dir=path.resolve('test-results','search-'+Date.now());await fs.mkdir(dir,{recursive:true});
 const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({args:['.','--user-data-dir='+path.join(dir,'profile')],env});
 try{
 const page=await app.firstWindow();await page.locator('#master').waitFor();
 await page.evaluate(()=>{
  const base={id:'1',title:'中文邮箱',username:'demo@example.com',password:'fictional',category:'登录信息',url:'https://example.com',notes:'',tags:'工作',favorite:'false',archived:'false',deleted:'false',created:'2026-01-01',updated:'2026-01-01',fields:[]};
  state.items=[base,{...base,id:'2',title:'English account'}];render();
 });
 const search=page.locator('#search');await search.focus();
 await search.evaluate(el=>window.originalSearch=el);
 const cdp=await page.context().newCDPSession(page);
 await cdp.send('Input.imeSetComposition',{text:'zhongwen',selectionStart:8,selectionEnd:8});
 assert(await search.evaluate(el=>el===window.originalSearch),'composition must retain input node');
 await expect(page.locator('.item')).toHaveCount(2);
 await page.evaluate(()=>render());
 assert(await search.evaluate(el=>el===window.originalSearch),'background rendering must not interrupt IME');
 await cdp.send('Input.insertText',{text:'中文'});
 await expect(search).toHaveValue('中文');await expect(page.locator('.item')).toHaveCount(1);
 await expect(page.locator('.item')).toContainText('中文邮箱');
 await search.fill('English');await expect(page.locator('.item')).toHaveCount(1);await expect(page.locator('.item')).toContainText('English account');
 await search.fill('');await expect(page.locator('.item')).toHaveCount(2);
 await search.fill('邮箱');await search.evaluate(el=>el.setSelectionRange(0,0));
 await cdp.send('Input.imeSetComposition',{text:'zhongwen',selectionStart:8,selectionEnd:8});
 await cdp.send('Input.insertText',{text:'中文'});
 await expect(search).toHaveValue('中文邮箱');assert.equal(await search.evaluate(el=>el.selectionStart),2);
 console.log('PASS: Electron IME composition, committed Chinese search, English/clear, cursor insertion and background render guard.');
 }finally{await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
