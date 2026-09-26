// Copy app.asar as an ordinary file when using the bundled Electron Node runtime.
if (process.versions.electron) process.noAsar = true;
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const {randomUUID} = require('node:crypto');
const {spawnSync, spawn} = require('node:child_process');

const MARKER = '.epassword-installation.json';
const PRODUCT = 'Epassword combined installer';
const extensionFiles = ['manifest.json','background.js','content.js','popup.html','popup.js','popup.css'];
const exists = async p => {try {await fs.access(p); return true;} catch {return false;}};
function inside(root, target) {
  const relative = path.relative(root, path.resolve(target));
  if (!relative || relative.startsWith('..' + path.sep) || relative === '..' || path.isAbsolute(relative))
    throw Error('Refusing to change a path outside the installation directory.');
  return target;
}
async function rejectLink(target) {
  try {if ((await fs.lstat(target)).isSymbolicLink()) throw Error('Installation path must not be a symbolic link: ' + target);}
  catch(e) {if(e.code !== 'ENOENT')throw e;}
}
function run(command, args, cwd) {
  const result = spawnSync(command,args,{cwd,stdio:'inherit',env:{...process.env,ELECTRON_RUN_AS_NODE:undefined}});
  if (result.error || result.status !== 0) throw Error('Command failed: ' + command + ' ' + args.join(' '));
}
async function buildSource(sourceRoot) {
  if(process.versions.electron)throw Error('Incomplete Setup ZIP. Extract the complete archive first.');
  const bundledNpm=path.join(path.dirname(process.execPath),'node_modules/npm/bin/npm-cli.js');
  if(await exists(bundledNpm))run(process.execPath,[bundledNpm,'ci'],sourceRoot);
  else if(process.platform==='win32')run(process.env.ComSpec || 'cmd.exe',['/d','/s','/c','npm ci'],sourceRoot);
  else run('npm',['ci'],sourceRoot);
  run(process.execPath,[path.join(sourceRoot,'scripts/pack.cjs')],sourceRoot);
}
function html(value) {return String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function guide(extensionPath, appPath) {
 return '<!doctype html><html lang="en"><meta charset="utf-8"><meta name="viewport" content="width=device-width">'+
 '<title>Epassword setup</title><style>body{max-width:780px;margin:50px auto;padding:20px;font:16px/1.7 system-ui;color:#203050}code{display:block;padding:16px;background:#eef2fa;overflow-wrap:anywhere;border-radius:8px}h1{color:#365cd6}</style>'+
 '<h1>Epassword installed / 安装完成</h1><p>The desktop app and Chrome extension files are installed together. Chrome activation is still required.<br>桌面应用与插件文件已安装，接下来在 Chrome 中启用插件。</p>'+
 '<ol><li>Open Chrome and enter <b>chrome://extensions</b>.<br>打开 Chrome，输入上述地址。</li>'+
 '<li>Enable <b>Developer mode</b>, choose <b>Load unpacked</b>, and select this permanent folder:<br>开启“开发者模式”，点击“加载已解压的扩展程序”，选择固定目录：<code>'+html(extensionPath)+'</code></li>'+
 '<li>Pin Epassword to the toolbar. After an upgrade, click the extension’s Reload button.<br>将插件固定到工具栏；升级后点击插件的“重新加载”。</li>'+
 '<li>Open the desktop app, unlock your vault, then go to <b>设置与恢复 → 浏览器插件 → 生成配对码</b>. Paste the code in the extension on an HTTPS page.<br>解锁桌面密码库后生成配对码，在 HTTPS 网页上打开插件并粘贴完成配对。</li></ol>'+
 '<p>Desktop application / 桌面程序：</p><code>'+html(appPath)+'</code>'+
 '<p>Re-pair after restarting either app. Store your Excel vault outside the installation folder. Older installed files are kept in previous-* folders for rollback.<br>重启任一应用后重新配对。Excel 密码库请保存在安装目录之外。升级前的文件保留在 previous-* 文件夹中。</p></html>';
}
function detached(command,args,extraEnv={}) {
 const env={...process.env,...extraEnv};delete env.ELECTRON_RUN_AS_NODE;
 const child=spawn(command,args,{detached:true,stdio:'ignore',windowsHide:true,env});
 child.on('error',e=>console.warn('Could not open setup UI: '+e.message));child.unref();
}
async function shortcuts(appPath, root) {
 if(process.platform!=='win32')return;
 const script = '$ErrorActionPreference="Stop"; $ws=New-Object -ComObject WScript.Shell; '+
  '$link=$ws.CreateShortcut((Join-Path ([Environment]::GetFolderPath("Programs")) "Epassword.lnk")); '+
  '$link.TargetPath=$env:EPASSWORD_INSTALL_EXE; $link.WorkingDirectory=$env:EPASSWORD_INSTALL_WORKDIR; $link.Save()';
 const result=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],
  {windowsHide:true,encoding:'utf8',env:{...process.env,EPASSWORD_INSTALL_EXE:appPath,EPASSWORD_INSTALL_WORKDIR:path.join(root,'app')}});
 if(result.error || result.status!==0)console.warn('Start-menu shortcut was not created. Launch the installed application directly.');
}
async function launch(result) {
 if(process.platform==='win32') {
  detached(result.appPath,[]);
  const script='Start-Process -FilePath $env:EPASSWORD_INSTALL_GUIDE';
  detached('powershell.exe',['-NoProfile','-NonInteractive','-Command',script],{EPASSWORD_INSTALL_GUIDE:result.guidePath});
  const chromeCandidates=[
   path.join(process.env.PROGRAMFILES || 'C:/Program Files','Google/Chrome/Application/chrome.exe'),
   path.join(process.env['PROGRAMFILES(X86)'] || 'C:/Program Files (x86)','Google/Chrome/Application/chrome.exe'),
   path.join(process.env.LOCALAPPDATA || os.homedir(),'Google/Chrome/Application/chrome.exe')];
  for(const chrome of chromeCandidates)if(await exists(chrome)){detached(chrome,['chrome://extensions/']);break;}
 } else {
  detached('open',[result.appPath]);detached('open',[result.guidePath]);
  for(const chrome of ['/Applications/Google Chrome.app',path.join(os.homedir(),'Applications/Google Chrome.app')])
   if(await exists(chrome)){detached('open',['-a',chrome,'chrome://extensions/']);break;}
 }
}
async function install(options={}) {
 const platform=process.platform;
 if(!['win32','darwin'].includes(platform))throw Error('This installer supports Windows and macOS only.');
 const sourceRoot=path.resolve(options.sourceRoot || path.join(__dirname,'..'));
 let metadata, sourceApp;
 if(await exists(path.join(sourceRoot,'setup.json'))) {
  metadata=JSON.parse(await fs.readFile(path.join(sourceRoot,'setup.json'),'utf8'));
  if(metadata.platform!==platform || metadata.arch!==process.arch)throw Error('This Setup ZIP does not match this operating system / CPU architecture.');
  sourceApp=path.join(sourceRoot,'desktop');
 } else {
  if(!options.skipBuild)await buildSource(sourceRoot);
  metadata=JSON.parse(await fs.readFile(path.join(sourceRoot,'package.json'),'utf8'));
  sourceApp=path.join(sourceRoot,'release',platform==='win32'?'win-unpacked':process.arch==='arm64'?'mac-arm64':'mac');
 }
 const executable=platform==='win32'?'Epassword.exe':'Epassword.app/Contents/MacOS/Epassword';
 if(!await exists(path.join(sourceApp,executable)))throw Error('Desktop payload missing. Build first or extract the full Setup ZIP.');
 const sourceExtension=path.join(sourceRoot,'extension');
 for(const file of extensionFiles)if(!await exists(path.join(sourceExtension,file)))throw Error('Extension payload missing: '+file);
 const manifest=JSON.parse(await fs.readFile(path.join(sourceExtension,'manifest.json'),'utf8'));
 if(manifest.manifest_version!==3 || manifest.version!==metadata.version)throw Error('Desktop and extension versions do not match.');
 const requestedRoot=path.resolve(options.installDir || (platform==='win32'
  ?path.join(process.env.LOCALAPPDATA || path.join(os.homedir(),'AppData/Local'),'Programs/Epassword')
  :path.join(os.homedir(),'Applications/Epassword')));
 for(const source of [sourceRoot,sourceApp,sourceExtension]) {
  const relative=path.relative(source,requestedRoot);
  if(!relative || (!relative.startsWith('..'+path.sep) && relative!=='..' && !path.isAbsolute(relative)))
   throw Error('Install outside the source / extracted Setup folder.');
 }
 await rejectLink(requestedRoot);
 if(await exists(requestedRoot)) {
  const entries=await fs.readdir(requestedRoot);
  if(entries.length) {
   let marker;try {marker=JSON.parse(await fs.readFile(path.join(requestedRoot,MARKER),'utf8'));}catch{}
   if(marker?.product!==PRODUCT)throw Error('Destination contains unrelated files. Choose an empty folder.');
  }
 }
 await fs.mkdir(requestedRoot,{recursive:true});
 const root=await fs.realpath(requestedRoot);
 for(const source of [sourceRoot,sourceApp,sourceExtension]) {
  const relative=path.relative(await fs.realpath(source),root);
  if(!relative || (!relative.startsWith('..'+path.sep)&&relative!=='..'&&!path.isAbsolute(relative)))throw Error('Install outside the source / extracted Setup folder.');
 }
 for(const name of ['app','chrome-extension',MARKER,'setup.html'])await rejectLink(inside(root,path.join(root,name)));
 const lockPath=inside(root,path.join(root,'.install-lock'));
 let lock;try{lock=await fs.open(lockPath,'wx');}catch(e){if(e.code==='EEXIST')throw Error('Another installation is running. If a previous installer crashed, remove .install-lock after checking no installer is active.');throw e;}
 const id=randomUUID(), stage=inside(root,path.join(root,'.staging-'+id)), backup=inside(root,path.join(root,'previous-'+id));
 const moved=[],activated=[];
 let success=false,previousMarker;
 try {
  previousMarker=await fs.readFile(path.join(root,MARKER)).catch(()=>null);
  if(!previousMarker)await fs.writeFile(path.join(root,MARKER),JSON.stringify({product:PRODUCT,status:'incomplete'}));
  await fs.mkdir(stage);await fs.mkdir(backup);
  await fs.cp(sourceApp,path.join(stage,'app'),{recursive:true,verbatimSymlinks:true});
  await fs.mkdir(path.join(stage,'chrome-extension'));
  for(const name of extensionFiles)await fs.copyFile(path.join(sourceExtension,name),path.join(stage,'chrome-extension',name));
  const appPath=path.join(root,'app',platform==='win32'?'Epassword.exe':'Epassword.app');
  const result={root,appPath,extensionPath:path.join(root,'chrome-extension'),guidePath:path.join(root,'setup.html'),extensionActivationRequired:true};
  await fs.writeFile(path.join(stage,'setup.html'),guide(result.extensionPath,appPath),'utf8');
  // Only owned component directories are moved; previous files (including unexpected user data) are retained.
  for(const name of ['app','chrome-extension','setup.html']) {
   const destination=inside(root,path.join(root,name));
   if(await exists(destination)){await fs.rename(destination,inside(root,path.join(backup,name)));moved.push(name);}
   await fs.rename(inside(root,path.join(stage,name)),destination);activated.push(name);
  }
  await fs.writeFile(path.join(root,MARKER),JSON.stringify({product:PRODUCT,version:metadata.version,...result},null,2)+'\n');
  success=true;
  if(!options.noShortcuts)await shortcuts(appPath,root);
  console.log('Desktop installed: '+appPath+'\nChrome extension files installed: '+result.extensionPath+
   '\nNEXT: chrome://extensions → Developer mode → Load unpacked.\nGuide: '+result.guidePath);
  if(!options.noLaunch)await launch(result);
  return result;
 } catch(error) {
  if(!success) {
   for(const name of activated.reverse())await fs.rename(inside(root,path.join(root,name)),inside(root,path.join(stage,name)));
   for(const name of moved.reverse())await fs.rename(inside(root,path.join(backup,name)),inside(root,path.join(root,name)));
   if(previousMarker)await fs.writeFile(path.join(root,MARKER),previousMarker);
  }
  throw error;
 } finally {
  await lock.close();await fs.unlink(lockPath);
  // rmdir only removes empty directories; no recursive deletion or loss of backup data.
  await fs.rmdir(stage).catch(()=>{});await fs.rmdir(backup).catch(()=>{});
 }
}
function argumentsFor(args) {
 const options={};
 for(let i=0;i<args.length;i++) {
  if(args[i]==='--install-dir'){if(!args[i+1]||args[i+1].startsWith('--'))throw Error('--install-dir requires a path');options.installDir=args[++i];}
  else if(args[i]==='--no-launch')options.noLaunch=true;
  else if(args[i]==='--no-shortcuts')options.noShortcuts=true;
  else if(args[i]==='--skip-build')options.skipBuild=true;
  else if(args[i]==='--help')options.help=true;
  else throw Error('Unknown argument: '+args[i]);
 }
 return options;
}
if(require.main===module) {
 try {
  const options=argumentsFor(process.argv.slice(2));
  if(options.help)console.log('install [--install-dir PATH] [--no-launch] [--no-shortcuts] [--skip-build]\nInstalls both desktop and extension files. Chrome activation and pairing remain interactive.');
  else install(options).catch(e=>{console.error('Installation failed: '+e.message);process.exitCode=1;});
 }catch(e){console.error(e.message);process.exitCode=1;}
}
module.exports={install,argumentsFor,inside};
