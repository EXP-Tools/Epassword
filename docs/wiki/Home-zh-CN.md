# Epassword Wiki

[English](Home.md) | **简体中文**

Epassword 是使用加密 Excel 文件保存凭据的本地 Electron 密码管理器。主密码就是 Excel 文件打开密码。

## 使用指南

- [快速开始](Getting-Started-zh-CN.md)：安装、创建密码库和跨设备迁移。
- [日常使用与 OTP](Daily-Use-and-OTP-zh-CN.md)：复制、生成密码、自定义字段和二维码识别。
- [恢复与安全](Recovery-and-Security-zh-CN.md)：备份、Excel 独立恢复与安全边界。
- [开发与排错](Development-and-Troubleshooting-zh-CN.md)：架构、测试、打包和常见问题。

## 中英文文档

- [README — English](../../README.en.md) / [README — 中文](../../README.md)
- [Installation — English](../../INSTALL.en.md) / [安装指南 — 中文](../../INSTALL.md)

README 与安装指南默认使用中文，同时提供英文版本；应用界面目前为中文。

## 平台状态

Windows x64 已在本地测试。Mac Intel 和 Apple Silicon 已实现适配与构建流程，仍需 Mac 实机验收。默认 Mac 包为开发测试包，未经过 Apple 公证。

## Wiki 发布位置

Wiki 源文档维护在 docs/wiki，通过 scripts/render-wiki.cjs 转换后发布到独立的 GitHub Wiki，并包含安装与 API 指南。参见[发布说明](../WIKI-PUBLISHING.md)。

- [Chrome 浏览器插件](Browser-Extension-zh-CN.md)：安装、配对、填充与注册保存。

- [AI 与程序 API](../API.zh-CN.md)：限网站授权与本机自动化填充。

[图文用户使用手册](../USER-GUIDE.md)
