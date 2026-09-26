const {app,BrowserWindow,ipcMain,dialog,clipboard,powerMonitor,shell,session,desktopCapturer,screen,nativeImage,systemPreferences,Menu}=require('electron');
const {platformInfo,screenPermissionMessage}=require('./platform.cjs');
const platform=platformInfo();
const fs=require('node:fs/promises');
const {PNG}=require('pngjs');
const {parseOtp,totp}=require('./otp.cjs');
const {decodeQr}=require('./qr.cjs');
const path=require('node:path');
const {randomUUID}=require('node:crypto');
const {generatePassword}=require('./generator.cjs');
const {Vault}=require('./vault.cjs');
const vault=new Vault();let win,idle,clipTimer,copied;
function clearClip(){clearTimeout(clipTimer);if(copied&&clipboard.readText()===copied)clipboard.clear();copied=null;}
function lock(){clearTimeout(idle);vault.lock();clearClip();if(win&&!win.isDestroyed())win.webContents.send('locked');}
function touch(){clearTimeout(idle);if(vault.items)idle=setTimeout(lock,5*60*1000);}
function requireUnlocked(){if(!vault.items)throw Error('请先解锁密码库');}
function putClipboard(text,timeout=30000){clearClip();clipboard.writeText(text);copied=text;clipTimer=setTimeout(clearClip,timeout);touch();}
function readImage(image){if(image.isEmpty())throw Error('图片为空或不受支持');const size=image.getSize();if(size.width*size.height>40000000)throw Error('图片过大，请裁剪二维码后导入');const png=PNG.sync.read(image.toPNG());try{return decodeQr(png.data,png.width,png.height);}finally{png.data.fill(0);}}
let scanning=false;
async function scanOtp(mode){
 requireUnlocked();if(scanning)throw Error('正在识别二维码，请稍候');scanning=true;const generation=vault.generation;let hidden=false;
 try{
  touch();let results=[];
  if(mode==='image'){
   const selection=await dialog.showOpenDialog(win,{title:'导入 OTP 二维码图片',properties:['openFile'],filters:[{name:'图片',extensions:['png','jpg','jpeg','webp','bmp']}]});if(selection.canceled)return [];
   if((await fs.stat(selection.filePaths[0])).size>20*1024*1024)throw Error('图片不能超过 20 MB');
   results=readImage(nativeImage.createFromPath(selection.filePaths[0]));
  }else if(mode==='screen'){
   const permissionError=screenPermissionMessage(platform.isMac?systemPreferences.getMediaAccessStatus('screen'):'granted');if(permissionError)throw Error(permissionError);
   win.hide();hidden=true;await new Promise(resolve=>setTimeout(resolve,500));
   const displays=screen.getAllDisplays();const width=Math.min(7680,Math.max(...displays.map(d=>Math.ceil(d.size.width*d.scaleFactor))));const height=Math.min(4320,Math.max(...displays.map(d=>Math.ceil(d.size.height*d.scaleFactor))));
   let sources;try{sources=await desktopCapturer.getSources({types:['screen'],thumbnailSize:{width,height}});}catch(error){throw Error(screenPermissionMessage(platform.isMac?systemPreferences.getMediaAccessStatus('screen'):'granted')||error.message);}
   const denied=screenPermissionMessage(platform.isMac?systemPreferences.getMediaAccessStatus('screen'):'granted');if(denied)throw Error(denied);
   let message='未识别到 OTP 二维码，请将网站的验证器设置二维码放大后重试';
   for(const source of sources){try{results.push(...readImage(source.thumbnail));}catch(error){message=error.message;}}
   if(!results.length)throw Error(message);
  }else throw Error('无效的扫码来源');
  if(generation!==vault.generation)throw Error('密码库已锁定');
  return results.filter((value,index,array)=>array.findIndex(other=>other.uri===value.uri)===index);
 }finally{scanning=false;if(hidden&&win&&!win.isDestroyed()){win.show();win.focus();}}
}
const channels={
 'choose':async(_,mode)=>{if(mode==='create'){const r=await dialog.showSaveDialog(win,{title:'创建 Excel 密码库',defaultPath:'Epassword.xlsx',filters:[{name:'Excel 密码库',extensions:['xlsx']}]});return r.canceled?null:r.filePath;}const r=await dialog.showOpenDialog(win,{filters:[{name:'Excel 密码库',extensions:['xlsx']}],properties:['openFile']});return r.canceled?null:r.filePaths[0];},
 'unlock':async(_,p)=>{if(vault.items)throw Error('请先锁定当前密码库'); const items=await vault[p.mode==='create'?'create':'open'](p.path,p.password);touch();return {items,path:vault.path};},
 'save':async(_,item)=>{if(!vault.items)throw Error('请先解锁'); const now=new Date().toISOString();const old=vault.items.find(i=>i.id===item.id);const value={...item,id:old?.id||randomUUID(),created:old?.created||now,updated:now};const items=old?vault.items.map(i=>i.id===old.id?value:i):[...vault.items,value];await vault.save(items);touch();return items;},
 'lock':()=>lock(), 'activity':()=>touch(),
 'generate':(_,options)=>generatePassword(options),
 'otp-parse':(_,input)=>{requireUnlocked();return parseOtp(input);},
 'otp-codes':(_,id)=>{requireUnlocked();const item=vault.items.find(i=>i.id===id);if(!item)throw Error('项目不存在');return (item.fields||[]).filter(f=>f.type==='otp').map(f=>({id:f.id,...totp(f.value)}));},
 'otp-copy':(_,itemId,fieldId)=>{requireUnlocked();const field=vault.items.find(i=>i.id===itemId)?.fields?.find(f=>f.id===fieldId&&f.type==='otp');if(!field)throw Error('OTP 字段不存在');const result=totp(field.value);putClipboard(result.code,Math.min(30000,result.remaining*1000));},
 'otp-scan':(_,mode)=>scanOtp(mode),
 'screen-settings':async()=>{requireUnlocked();if(platform.isMac)await shell.openExternal('x-apple.systempreferences:com.apple.preference.security?Privacy_ScreenCapture');},
 'copy':(_,text)=>{if(!vault.items||typeof text!=='string'||text.length>30000)throw Error('无法复制');clearClip();clipboard.writeText(text);copied=text;clipTimer=setTimeout(clearClip,30000);touch();},
 'change-password':async(_,p)=>{if(!vault.items||p.current!==vault.password)throw Error('当前主密码错误');await vault.save(vault.items,p.next);touch();},
 'reveal':()=>{if(vault.path)shell.showItemInFolder(vault.path);},
 'website':async(_,url)=>{if(!vault.items)throw Error('请先解锁');const u=new URL(url);if(!['https:','http:'].includes(u.protocol))throw Error('只允许 HTTP / HTTPS 链接');await shell.openExternal(u.href);}
};
function createWindow(){
  win=new BrowserWindow({width:1320,height:860,minWidth:1000,minHeight:680,backgroundColor:'#f7f8fc',title:'Epassword',autoHideMenuBar:true,webPreferences:{preload:path.join(__dirname,'preload.cjs'),contextIsolation:true,nodeIntegration:false,sandbox:true}});
  win.webContents.setWindowOpenHandler(()=>({action:'deny'}));win.webContents.on('will-navigate',e=>e.preventDefault());
  win.loadFile(path.join(__dirname,'../ui/index.html'));
  win.on('closed',()=>{lock();win=null;});
}
function showWindow(){if(!win||win.isDestroyed())createWindow();else{if(win.isMinimized())win.restore();win.show();win.focus();}}
if(!app.requestSingleInstanceLock())app.quit();else{
 app.whenReady().then(()=>{
  session.defaultSession.setPermissionRequestHandler((_,__,callback)=>callback(false));
  session.defaultSession.webRequest.onBeforeRequest({urls:['http://*/*','https://*/*']},(_,cb)=>cb({cancel:true}));
  for(const [name,handler] of Object.entries(channels))ipcMain.handle(name,async(event,...args)=>{if(!win||win.isDestroyed()||event.sender!==win.webContents||event.senderFrame!==win.webContents.mainFrame)throw Error('非法请求');try{return {ok:true,value:await handler(event,...args)};}catch(e){return {ok:false,error:e.message};}});
  if(platform.isMac)Menu.setApplicationMenu(Menu.buildFromTemplate([{role:'appMenu'},{label:'密码库',submenu:[{label:'锁定密码库',accelerator:'Command+L',click:lock}]},{role:'editMenu'},{role:'viewMenu'},{role:'windowMenu'}]));
  createWindow();powerMonitor.on('suspend',lock);powerMonitor.on('lock-screen',lock);
  app.on('activate',showWindow);
 });app.on('window-all-closed',()=>{lock();if(!platform.keepAlive)app.quit();});app.on('before-quit',lock);app.on('second-instance',()=>{if(app.isReady())showWindow();});
}
