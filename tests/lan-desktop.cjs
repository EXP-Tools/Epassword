const {_electron:electron,expect}=require('@playwright/test');
const fs=require('node:fs/promises'),path=require('node:path'),assert=require('node:assert/strict');
const {LanShare}=require('../electron/lan.cjs');
const wait=async p=>{for(let i=0;i<200;i++){if(p())return;await new Promise(r=>setTimeout(r,25));}throw Error('timeout');};
(async()=>{
 const dir=path.resolve('test-results','lan-desktop-'+Date.now());await fs.mkdir(dir,{recursive:true});const env={...process.env};delete env.ELECTRON_RUN_AS_NODE;
 const app=await electron.launch({args:['.','--user-data-dir='+path.join(dir,'profile')],env});let peer;
 try{const page=await app.firstWindow();const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.locator('#master').waitFor();
 await page.evaluate(async file=>{const r=await epassword.call('unlock',{mode:'create',path:file,password:'Master8!'});state.path=file;state.items=r.items;
 state.items=await epassword.call('save',{id:'',title:'局域网测试账号',category:'登录信息',username:'demo@example.com',password:'First-secret',url:'https://example.com',notes:'虚构测试数据',tags:'',favorite:'false',archived:'false',deleted:'false',created:'',updated:'',fields:[{id:'extra',type:'password',label:'备用密码',value:'First-extra'}]});render();},path.join(dir,'vault.xlsx'));
 await page.locator('#edit').click();await page.locator('[name=password]').fill('Second-secret');await page.locator('.extra-value').fill('Second-extra');await page.locator('#editor [type=submit]').click();await expect(page.locator('.overlay')).toHaveCount(0);
 await page.locator('#password-history').click();await expect(page.locator('[data-history-show]')).toHaveCount(2);await page.locator('[data-history-show="1"]').click();await expect(page.locator('[data-history-value="1"]')).toHaveText('First-secret');await page.screenshot({path:path.join(dir,'history.png')});await page.locator('[data-history-close]').click();
 await page.locator('.extra-history').click();await expect(page.locator('[data-history-show]')).toHaveCount(2);await page.locator('[data-history-close]').click();
 await page.locator('.item').click({button:'right'});await page.locator('[data-action=duplicate]').click();await expect(page.locator('.item')).toHaveCount(2);
 await page.locator('.item').first().click({button:'right'});await page.locator('[data-action=move]').click();await page.locator('#move-category').selectOption('安全笔记');await page.locator('#move-confirm').click();await expect(page.locator('.overlay')).toHaveCount(0);
 await page.locator('.item').first().click({button:'right'});await page.locator('[data-action=archive]').click();await expect(page.locator('.item')).toHaveCount(1);
 await page.locator('[data-view="归档"]').click();await expect(page.locator('.item')).toHaveCount(1);
 // Cancel first, then confirm native permanent deletion using Electron's dialog stub.
 await app.evaluate(({dialog})=>{dialog.showMessageBox=async()=>({response:0});});await page.locator('.item').click({button:'right'});await page.locator('[data-action=delete]').click();await expect(page.locator('.item')).toHaveCount(1);
 await app.evaluate(({dialog})=>{dialog.showMessageBox=async()=>({response:1});});await page.locator('.item').click({button:'right'});await page.locator('[data-action=delete]').click();await expect(page.locator('.item')).toHaveCount(0);
 await page.locator('[data-view="全部项目"]').click();await page.locator('#lan-sharing').click();await page.locator('#lan-start').click();const service=await page.evaluate(()=>epassword.call('lan-status'));assert(service.hosting);
 const received=[];peer=new LanShare({name:'测试电脑 B',receive:async items=>received.push(items)});await peer.connect('127.0.0.1',service.port);await wait(()=>peer.code);await expect(page.locator('#lan-confirm')).toBeVisible();assert.equal(await page.locator('.lan-code').innerText(),peer.code);
 await page.locator('#lan-confirm').click();assert(!peer.paired);peer.confirm(peer.code);await wait(()=>peer.paired);await expect(page.locator('#lan-push')).toBeVisible();
 await page.locator('#transfer-all').check();await page.locator('#lan-offer').click();await wait(()=>peer.incoming);assert.equal(received.length,0);peer.accept(peer.incoming.id,true);await wait(()=>received.length===1);
 const outgoing={...received[0][0],id:'remote',title:'来自电脑 B',updated:'2020-01-01',history:[]};peer.offer([outgoing]);await expect(page.locator('[data-lan-accept=true]')).toBeVisible();assert.equal(await page.evaluate(()=>state.items.length),1);await page.screenshot({path:path.join(dir,'lan.png')});
 await page.locator('[data-lan-accept=true]').click();await wait(()=>!peer.outgoing);const items=await page.evaluate(()=>state.items);assert.equal(items.length,2);assert.equal(items[1].password,outgoing.password);assert.notEqual(items[1].id,'remote');assert(Date.parse(items[1].updated)>Date.now()-15000);
 await page.locator('#lan-stop').click();await wait(()=>!peer.status().active);await page.locator('[data-close]').click();
 assert.deepEqual(errors,[]);console.log('PASS: Electron history, item menu, native deletion confirmation, pairing, bidirectional consent, timestamps. '+dir);
 }finally{peer?.stop();await app.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
