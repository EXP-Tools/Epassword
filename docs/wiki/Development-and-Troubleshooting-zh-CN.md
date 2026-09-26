# 开发与排错

[Wiki 首页](Home-zh-CN.md) | [English](Development-and-Troubleshooting.md)

## 架构

Electron 主进程负责文件对话框、Excel 加密、密码生成、TOTP、剪贴板和二维码捕获。渲染器通过受限 preload IPC 调用，关闭 Node 集成，启用上下文隔离与 sandbox。

- electron/vault.cjs：工作簿读写、加密、备份和冲突检查。
- electron/generator.cjs：随机密码和 PIN。
- electron/otp.cjs：设置链接验证及 RFC 6238 TOTP。
- electron/qr.cjs：本地二维码识别。
- ui/：项目编辑、自定义字段和实时验证码。
- scripts/pack.cjs：平台相关打包。
- .github/workflows/build.yml：Windows x64、Mac x64/arm64 构建。

## 验证与构建

~~~sh
npm ci
npm test
npm run test:platform
npm run pack
~~~

GUI、屏幕扫码、Excel 测试的前置条件见[安装文档](../../INSTALL.md)。只使用虚构数据，不操作真实密码库。

在目标系统构建。Mac 跨架构打包会下载目标运行时。Windows 已在本地测试，Mac 实机验证和 Apple 公证仍待完成。

默认 CI 上传构建产物，不发布公开 Release。Mac 默认 ad-hoc 签名；正式签名入口需要另外提供 Apple 凭据。

## 排错

| 问题 | 检查项 |
| --- | --- |
| npm 启动器损坏 | 定位真实 CLI 或修复 Node，不复制其他机器的绝对路径 |
| Electron 下载失败 | 网络、代理与锁定版本 |
| 没有新窗口 | 应用可能已有单实例在运行 |
| 保存冲突 | 外部修改后锁定、重新打开，不直接覆盖 |
| 网站拒绝 OTP | 系统时间、账户、算法、位数和周期 |
| 二维码未识别 | 放大验证器设置二维码，或导入清晰图片 |
| Mac 无录屏权限 | 授权后重启，或改用图片导入 |
| Mac 包被拦截 | 区分开发测试包与已签名、公证的分发包 |
| CI 桌面测试失败 | 检查 GUI；真实扫码还需要系统权限 |
| Mac 无法运行 Excel COM | COM 脚本仅适用于 Windows，Mac 需手动验证 |

## 维护文档

README.md 和 INSTALL.md 默认中文，英文版本使用 .en.md 后缀，.zh-CN.md 文件保留为兼容副本。Wiki 中英文页面互相链接，功能和限制要保持一致。

不要提交密码库、测试截图、node_modules、签名证书或凭据。保留锁文件，核对文档引用的脚本。
