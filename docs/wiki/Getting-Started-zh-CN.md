# 快速开始

[Wiki 首页](Home-zh-CN.md) | [English](Getting-Started.md)

## 安装

[INSTALL.md](../../INSTALL.md) 分别说明人类用户与 AI 的安装流程。源码启动：

~~~sh
git clone https://github.com/EXP-Tools/Epassword.git
cd Epassword
npm ci
npm start
~~~

使用 Node.js 24.x，需要仓库访问权限。已打包程序不依赖 Node.js 或 Excel。成功的 Actions 运行可能提供构建产物，下载源码本身不包含二进制程序。

## 创建密码库

1. 选择“创建密码库”。
2. 在自己的数据目录选择新的 .xlsx 文件。
3. 设置并确认 8–255 个字符的主密码。
4. 新建项目并保存。

不要将真实密码库保存在会被重建的开发目录。没有主密码重置或云端恢复功能。

## 打开已有密码库

选择“打开密码库”，指定 Epassword 工作簿，输入文件打开密码。普通 Excel 表格不是直接导入格式。

## Windows 与 Mac 之间迁移

先在原设备关闭密码库，复制 .xlsx 到新设备，使用同一主密码打开。不同设备的修改不会自动合并，也没有云同步。

Windows 版为 x64。Mac Intel 选择 x64，Apple Silicon 选择 arm64。录屏权限和 Mac 签名限制见安装文档。

## 安全更新

先备份工作簿和需要保留的 .bak，退出应用，再替换完整程序目录或应用包。新增自定义字段后，不要使用不支持这些字段的旧版重写文件。
