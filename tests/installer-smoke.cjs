const {spawnSync}=require('node:child_process');
const fs=require('node:fs/promises'),path=require('node:path'),os=require('node:os'),assert=require('node:assert/strict');
(async()=>{
 const root=path.resolve(__dirname,'..'),{version}=require('../package.json');
 const platform=process.platform,osName=platform==='win32'?'win':'mac';
 const zip=path.join(root,'release','Epassword-Setup-'+version+'-'+osName+'-'+process.arch+'.zip');
 const dir=await fs.mkdtemp(path.join(os.tmpdir(),'epassword-setup-smoke-'));
 const payload=path.join(dir,'payload'),target=path.join(dir,'installed app');
 await fs.mkdir(payload);
 function run(command,args,env=process.env,cwd=root) {
  const r=spawnSync(command,args,{env,cwd,stdio:'inherit',windowsHide:true,windowsVerbatimArguments:command.toLowerCase().endsWith('cmd.exe')});
  if(r.error)throw r.error;assert.equal(r.status,0,'Command failed: '+command);
 }
 // Leave the fixture install available for inspection in the OS temporary directory.
 if(platform==='win32')run('powershell.exe',['-NoProfile','-NonInteractive','-Command',
  'Expand-Archive -LiteralPath $env:EPASSWORD_SETUP_ARCHIVE -DestinationPath $env:EPASSWORD_SETUP_PAYLOAD'],
  {...process.env,EPASSWORD_SETUP_ARCHIVE:zip,EPASSWORD_SETUP_PAYLOAD:payload});
 else run('ditto',['-x','-k',zip,payload]);
 if(platform==='win32')run(process.env.ComSpec || 'cmd.exe',
  ['/d','/c','install.cmd --no-launch --no-shortcuts --install-dir "%EPASSWORD_TEST_INSTALL_DIR%"'],
  {...process.env,EPASSWORD_TEST_INSTALL_DIR:target},payload);
 else run('bash',[path.join(payload,'install.command'),'--install-dir',target,'--no-launch','--no-shortcuts']);
 const installedRuntime=path.join(target,'app',platform==='win32'?'Epassword.exe':'Epassword.app/Contents/MacOS/Epassword');
 assert.equal(JSON.parse(await fs.readFile(path.join(target,'chrome-extension/manifest.json'),'utf8')).version,version);
 const env={...process.env,EPASSWORD_TEST_RUNTIME:installedRuntime};delete env.ELECTRON_RUN_AS_NODE;
 run(process.execPath,[path.join(root,'tests/platform-smoke.cjs')],env);
 if(platform==='win32')run(process.execPath,[path.join(root,'tests/browser-desktop.cjs')],
  {...env,EPASSWORD_TEST_EXTENSION:path.join(target,'chrome-extension')});
 console.log('PASS: Setup ZIP installed both components using its bundled runtime; installed app launched. '+target);
})().catch(e=>{console.error(e);process.exitCode=1;});
