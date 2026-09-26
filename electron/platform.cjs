function platformInfo(platform=process.platform){return {isMac:platform==='darwin',shortcut:platform==='darwin'?'⌘':'Ctrl',keepAlive:platform==='darwin'};}
function screenPermissionMessage(status,platform=process.platform){
 if(platform==='darwin'&&['denied','restricted'].includes(status))return 'macOS 尚未允许屏幕录制。请在系统设置 → 隐私与安全性 → 屏幕录制（或屏幕与系统音频录制）中允许 Epassword，退出并重新打开应用；也可以直接导入二维码图片。';
 return null;
}
module.exports={platformInfo,screenPermissionMessage};
