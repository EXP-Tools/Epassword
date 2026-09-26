const {test}=require('node:test');const assert=require('node:assert/strict');
const {platformInfo,screenPermissionMessage}=require('../electron/platform.cjs');
const {buildOptions}=require('../scripts/pack.cjs');
test('双平台快捷键、窗口生命周期与屏幕权限策略',()=>{
 assert.deepEqual(platformInfo('darwin'),{isMac:true,shortcut:'⌘',keepAlive:true});
 assert.deepEqual(platformInfo('win32'),{isMac:false,shortcut:'Ctrl',keepAlive:false});
 assert.match(screenPermissionMessage('denied','darwin'),/系统设置/);
 assert.match(screenPermissionMessage('restricted','darwin'),/导入二维码图片/);
 for(const status of ['granted','not-determined'])assert.equal(screenPermissionMessage(status,'darwin'),null);
 assert.equal(screenPermissionMessage('denied','win32'),null);
});
test('原生与跨架构打包不能混用本机 Electron',()=>{
 const win=buildOptions([],'win32','x64');assert.ok(win.config.electronDist);assert.equal(win.config.win.signAndEditExecutable,false);
 const mac=buildOptions(['--dist'],'darwin','arm64');assert.ok(mac.config.electronDist);assert.equal(mac.config.mac.identity,'-');assert.equal(mac.config.mac.notarize,false);
 assert.deepEqual([...mac.targets.values()][0].values().next().value,['dmg','zip']);
 const intel=buildOptions(['--dist','--arch=x64'],'darwin','arm64');assert.equal(intel.config.electronDist,undefined);
 const signed=buildOptions(['--dist','--signed'],'darwin','arm64');assert.equal(signed.config.mac.forceCodeSigning,true);assert.equal(signed.config.mac.notarize,true);assert.equal(signed.config.mac.hardenedRuntime,true);
 assert.throws(()=>buildOptions(['--platform=mac'],'win32','x64'),/对应系统/);
 assert.throws(()=>buildOptions([],'linux','x64'),/只支持/);
});
