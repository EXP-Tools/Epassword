const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs/promises');
const path=require('node:path');
const os=require('node:os');
const {install,argumentsFor,inside}=require('../scripts/install.cjs');
test('installer rejects unknown flags and paths outside its managed root',()=>{
 assert.deepEqual(argumentsFor(['--no-launch','--no-shortcuts','--install-dir','a folder']),{noLaunch:true,noShortcuts:true,installDir:'a folder'});
 assert.throws(()=>argumentsFor(['--install-dir']),/requires/);
 assert.throws(()=>argumentsFor(['--unexpected']),/Unknown/);
 assert.throws(()=>inside(path.resolve('root'),path.resolve('outside')),/outside/);
 assert.throws(()=>inside(path.resolve('root'),path.resolve('root')),/outside/);
});
test('combined install, stable extension path, upgrade backup and unrelated-folder protection',async()=>{
 if(!['win32','darwin'].includes(process.platform))return;
 const tmp=await fs.mkdtemp(path.join(os.tmpdir(),'epassword-installer-')),source=path.join(tmp,'payload');
 const target=path.join(tmp,'installed with spaces'),unrelated=path.join(tmp,'unrelated');
 try {
  const executable=process.platform==='win32'?'Epassword.exe':'Epassword.app/Contents/MacOS/Epassword';
  await fs.mkdir(path.dirname(path.join(source,'desktop',executable)),{recursive:true});
  await fs.writeFile(path.join(source,'desktop',executable),'fixture v1');
  await fs.mkdir(path.join(source,'extension'));
  for(const name of ['background.js','content.js','popup.html','popup.js','popup.css'])await fs.writeFile(path.join(source,'extension',name),'fixture');
  await fs.writeFile(path.join(source,'extension/manifest.json'),JSON.stringify({manifest_version:3,version:'1.1.0'}));
  await fs.writeFile(path.join(source,'setup.json'),JSON.stringify({version:'1.1.0',platform:process.platform,arch:process.arch}));
  const options={sourceRoot:source,installDir:target,noLaunch:true,noShortcuts:true};
  const first=await install(options);
  assert.equal(await fs.readFile(path.join(target,'app',executable),'utf8'),'fixture v1');
  assert.equal(JSON.parse(await fs.readFile(path.join(first.extensionPath,'manifest.json'),'utf8')).version,'1.1.0');
  assert.match(await fs.readFile(first.guidePath,'utf8'),/chrome:\/\/extensions/);
  assert.equal(first.extensionActivationRequired,true);
  await fs.writeFile(path.join(target,'app','user-file.txt'),'must survive upgrade');
  await fs.mkdir(path.join(source,'extension/assets'));
  await fs.copyFile(path.join(__dirname,'../extension/assets/sponsor-wechat.png'),path.join(source,'extension/assets/sponsor-wechat.png'));
  await fs.writeFile(path.join(source,'desktop',executable),'fixture v2');
  const second=await install(options);assert.equal(first.extensionPath,second.extensionPath);
  assert.deepEqual(await fs.readFile(path.join(second.extensionPath,'assets/sponsor-wechat.png')),await fs.readFile(path.join(source,'extension/assets/sponsor-wechat.png')));
  assert.equal(await fs.readFile(path.join(target,'app',executable),'utf8'),'fixture v2');
  const previous=(await fs.readdir(target)).filter(name=>name.startsWith('previous-'));
  assert.equal(previous.length,1);
  assert.equal(await fs.readFile(path.join(target,previous[0],'app/user-file.txt'),'utf8'),'must survive upgrade');
  assert.equal((await fs.readdir(target)).includes('.install-lock'),false);
  const rename=fs.rename;
  fs.rename=async(from,to)=>{if(String(from).includes('.staging-')&&to===second.extensionPath)throw Error('simulated activation failure');return rename(from,to);};
  try{await assert.rejects(install(options),/simulated/);}finally{fs.rename=rename;}
  assert.equal(await fs.readFile(path.join(target,'app',executable),'utf8'),'fixture v2');
  assert.equal(JSON.parse(await fs.readFile(path.join(second.extensionPath,'manifest.json'),'utf8')).version,'1.1.0');
  await fs.mkdir(unrelated);await fs.writeFile(path.join(unrelated,'keep.txt'),'untouched');
  await assert.rejects(install({...options,installDir:unrelated}),/unrelated/);
  assert.equal(await fs.readFile(path.join(unrelated,'keep.txt'),'utf8'),'untouched');
  await assert.rejects(install({...options,installDir:path.join(source,'nested')}),/outside/);
  await fs.writeFile(path.join(source,'extension/manifest.json'),JSON.stringify({manifest_version:3,version:'0.0.1'}));
  await assert.rejects(install(options),/versions/);
  assert.equal(await fs.readFile(path.join(target,'app',executable),'utf8'),'fixture v2');
 }finally {
  // mkdtemp creates the explicitly owned test root; resolve and verify before recursive cleanup.
  const actual=await fs.realpath(tmp),tempRoot=await fs.realpath(os.tmpdir());
  if(path.dirname(actual)!==tempRoot || !path.basename(actual).startsWith('epassword-installer-'))throw Error('Unsafe fixture cleanup');
  await fs.rm(actual,{recursive:true,force:true});
 }
});
