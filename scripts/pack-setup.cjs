const fs=require('node:fs');
const path=require('node:path');
const archiver=require('archiver');
async function packSetup() {
 const args=process.argv.slice(2);
 const platform=process.platform,arch=args.find(a=>a.startsWith('--arch='))?.slice(7)||process.arch;
 if(!['win32','darwin'].includes(platform)||!['x64','arm64'].includes(arch)||(platform==='win32'&&arch!=='x64'))throw Error('Unsupported setup target');
 const root=path.resolve(__dirname,'..'),version=require('../package.json').version;
 const folder=platform==='win32'?'win-unpacked':arch==='arm64'?'mac-arm64':'mac';
 const app=path.join(root,'release',folder);
 const entry=platform==='win32'?'Epassword.exe':'Epassword.app/Contents/MacOS/Epassword';
 await fs.promises.access(path.join(app,entry));
 const target=path.join(root,'release','Epassword-Setup-'+version+'-'+(platform==='win32'?'win':'mac')+'-'+arch+'.zip');
 const output=fs.createWriteStream(target),archive=archiver('zip',{zlib:{level:6}});
 await new Promise((resolve,reject)=>{
  output.on('close',resolve);output.on('error',reject);archive.on('error',reject);archive.on('warning',reject);
  archive.pipe(output);
  if(platform==='win32')archive.directory(app,'desktop');
  else archive.directory(path.join(app,'Epassword.app'),'desktop/Epassword.app');
  archive.append(JSON.stringify({version,platform,arch},null,2),{name:'setup.json'});
  for(const file of ['scripts/install.cjs','INSTALL.md','INSTALL.zh-CN.md','README.md','README.zh-CN.md'])
   archive.file(path.join(root,file),{name:file});
  for(const file of fs.readdirSync(path.join(root,'docs/wiki')).filter(f=>f.endsWith('.md')))
   archive.file(path.join(root,'docs/wiki',file),{name:'docs/wiki/'+file});
  const launcher=platform==='win32'?'install.cmd':'install.command';
  archive.file(path.join(root,launcher),{name:launcher,mode:platform==='win32'?0o644:0o755});
  for(const file of ['manifest.json','background.js','content.js','popup.html','popup.js','popup.css'])
   archive.file(path.join(root,'extension',file),{name:'extension/'+file});
  archive.finalize().catch(reject);
 });
 console.log(target);
 return target;
}
if(require.main===module)packSetup().catch(e=>{console.error(e.message);process.exitCode=1;});
module.exports={packSetup};
