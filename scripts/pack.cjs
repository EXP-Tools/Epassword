const {build,Platform,Arch}=require('electron-builder');
const path=require('node:path');
function buildOptions(args=process.argv.slice(2),host=process.platform,nativeArch=process.arch){
 const requested=args.find(a=>a.startsWith('--platform='))?.split('=')[1];
 const platform=requested||({win32:'win',darwin:'mac'}[host]);
 if(!['win','mac'].includes(platform))throw Error('当前只支持 Windows 和 macOS 构建');
 if((platform==='mac'&&host!=='darwin')||(platform==='win'&&host!=='win32'))throw Error('请在对应系统构建：Windows 构建 Windows，Mac 构建 macOS');
 const arch=args.find(a=>a.startsWith('--arch='))?.split('=')[1]||nativeArch;
 if(!['x64','arm64'].includes(arch)||(platform==='win'&&arch!=='x64'))throw Error('Windows 支持 x64；Mac 支持 x64 / arm64');
 const dist=args.includes('--dist'),signed=args.includes('--signed');
 const target=platform==='mac'?Platform.MAC:Platform.WINDOWS;
 const config={};
 if(arch===nativeArch)config.electronDist=path.resolve('node_modules/electron/dist');
 if(platform==='win')config.win={signAndEditExecutable:false};
 else config.mac=signed?{hardenedRuntime:true,notarize:true,forceCodeSigning:true}:{identity:'-',hardenedRuntime:false,notarize:false};
 return {targets:target.createTarget(dist?(platform==='mac'?['dmg','zip']:['portable']):['dir'],Arch[arch]),config,publish:'never'};
}
if(require.main===module){try{build(buildOptions()).catch(error=>{console.error(error.message);process.exitCode=1;});}catch(error){console.error(error.message);process.exitCode=1;}}
module.exports={buildOptions};
