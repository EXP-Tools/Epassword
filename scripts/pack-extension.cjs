const fs=require('node:fs');
const path=require('node:path');
const archiver=require('archiver');
(async()=>{
 const manifest=require('../extension/manifest.json');
 const target=path.resolve('release','Epassword-Chrome-'+manifest.version+'.zip');
 await fs.promises.mkdir(path.dirname(target),{recursive:true});
 const output=fs.createWriteStream(target),archive=archiver('zip',{zlib:{level:9}});
 await new Promise((resolve,reject)=>{
  output.on('close',resolve);output.on('error',reject);archive.on('error',reject);archive.on('warning',reject);
  archive.pipe(output);
  for(const name of ['manifest.json','background.js','content.js','popup.html','popup.js','popup.css'])
   archive.file(path.resolve('extension',name),{name});
  archive.directory(path.resolve('extension/assets'),'assets');
  archive.finalize().catch(reject);
 });
 console.log(target);
})().catch(e=>{console.error(e.message);process.exitCode=1;});
