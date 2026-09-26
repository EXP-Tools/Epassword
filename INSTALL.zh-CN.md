# Epassword 安装指南

[English](INSTALL.en.md) | **简体中文**

[项目 Wiki](docs/wiki/Home-zh-CN.md)

本文分别提供人类用户与 AI 的操作流程。功能与恢复说明见 [README.md](README.md)。命令默认在项目根目录执行。npm / node 命令两平台通用；PowerShell 示例用于 Windows，bash 示例用于 Mac。

安装完成后的操作步骤见[图文用户使用手册](docs/USER-GUIDE.md)。

## 桌面应用 + Chrome 插件一体安装（推荐）

从 [Release 1.2](https://github.com/EXP-Tools/Epassword/releases/tag/v1.2.0) 下载 **Epassword-Setup-1.2.0-win-x64.zip**、**Epassword-Setup-1.2.0-mac-x64.zip** 或 **Epassword-Setup-1.2.0-mac-arm64.zip**。完整解压到下载/临时目录，关闭 Epassword，然后：

- Windows：双击 **install.cmd**。
- Mac：在解压目录运行 **bash install.command**，或双击具有执行权限的安装入口。

安装包自带运行时，**不需要 Node.js/npm**。一次运行会安装完整桌面程序和 Chrome 插件文件，创建 Windows 开始菜单快捷方式，并打开桌面程序、本地安装指引以及 Chrome 扩展管理页（已安装 Chrome 时）。

默认安装目录：Windows 为 **%LOCALAPPDATA%/Programs/Epassword**，Mac 为 **~/Applications/Epassword**。桌面程序在 app/，插件在固定的 chrome-extension/ 子目录。真实 Excel 密码库请保存在安装目录之外。升级前的桌面与插件文件会保留在 previous-* 目录，不直接删除。

**最后启用 Chrome 插件：** 打开 chrome://extensions，开启“开发者模式”，点击“加载已解压的扩展程序”，选择指引显示的 chrome-extension 固定目录。固定插件、解锁桌面密码库，在“设置与恢复 → 浏览器插件”生成配对码，并在 HTTPS 网页打开插件完成配对。升级后点击已有插件的“重新加载”。重启任一应用后重新配对。

Chrome 不允许普通安装脚本在 Windows/macOS 静默启用未上架插件，因此脚本安装两个组件并引导完成浏览器确认，不修改个人浏览器配置、企业策略或系统安全设置。[Chrome 官方分发规则](https://developer.chrome.com/docs/extensions/how-to/distribute)。

源码安装：先安装 Node.js 24，再运行 install.cmd / bash install.command。没有预构建载荷时，脚本会执行 npm ci 和桌面构建，再安装两个组件。开发用 npm start 仍只从源码启动，不执行安装。

### AI 与无人值守安装

添加 --no-launch --no-shortcuts，可完成安装而不打开应用、不创建开始菜单快捷方式。--install-dir 指定绝对路径，目标应为解压/源码目录之外的空目录或本安装器管理的旧安装目录。--skip-build 仅供开发时复用已有目录构建。

~~~powershell
.\install.cmd --no-launch --no-shortcuts --install-dir "C:\Users\YOUR_NAME\Apps\Epassword"
~~~

~~~bash
bash install.command --no-launch --no-shortcuts --install-dir "$HOME/Applications/Epassword"
~~~

不要替用户填写或生成密码库主密码。插件启用与配对仍由用户完成。自动化安装测试使用上述两个无人值守选项。构建一体安装包：npm ci、npm run pack、npm run pack:setup；实际安装包测试：npm run test:installer（Windows 插件测试还需要 Playwright Chromium）。

安装器不会递归删除旧安装。异常退出后，先确认没有安装进程，再移除残留 .install-lock 文件。残留 .staging-* / previous-* 可人工检查，先恢复其中的用户数据再删除。默认 Mac 开发包仍未公证，安装器不会绕过 Gatekeeper。


## 一、人类用户

### 方式 A：直接使用 Windows 程序

适合只想使用密码管理器的人，不需要 Node.js、npm 或 Excel。

1. 获取可信来源提供的完整 Windows 文件夹版。当前工作区的位置是 `release/win-unpacked/`。
2. 将整个文件夹放到固定位置，双击其中的 `Epassword.exe`。不要单独复制 EXE，旁边的资源和运行时文件也必须保留。
3. 选择“创建密码库”，指定新的 `.xlsx` 文件位置，设置并确认 12–255 个字符的主密码。
4. 已有 Epassword 密码库时，选择“打开密码库”并输入原主密码。普通 Excel 文件不能直接作为密码库导入。

文件夹版无需安装向导，可离线使用。程序尚未代码签名；遇到 Windows 来源提示时先核实来源，不要为运行程序关闭系统安全防护。

`release/` 不纳入版本控制，只下载源码时通常没有 EXE，需要按方式 B 构建。仓库地址为 https://github.com/EXP-Tools/Epassword；访问私有仓库需相应权限，构建产物以成功的 Actions 记录为准。

### Mac 用户：选择架构并安装

运行时要求 macOS 12 或更高版本（由当前 Electron 版本决定）。在“关于本机”查看芯片：Apple M 系列使用 arm64 包，Intel 使用 x64 包。Mac 尚待实机验收，当前 Windows 工作区未生成 DMG。

拿到对应架构的构建产物后：

1. 打开 `Epassword-版本-mac-arm64.dmg` 或 `Epassword-版本-mac-x64.dmg`。
2. 将 Epassword 拖入“应用程序”，从那里启动。ZIP 则解压完整的 `Epassword.app` 后移动到“应用程序”。
3. 创建新密码库，或选择从 Windows 复制来的同一份 `.xlsx`，使用同一个主密码。
4. 使用屏幕扫码时，在系统设置 → 隐私与安全性 → 屏幕录制（不同版本可能显示“屏幕与系统音频录制”）允许 Epassword，然后退出并重新启动。源码运行时授权项可能显示 Electron。

应用内 OTP 编辑区提供权限设置入口。只导入二维码图片不需要屏幕录制权限。

默认 Mac 构建只有 ad-hoc 签名，没有 Developer ID 签名或 Apple 公证，适合开发验证。下载后的测试包可能被 Gatekeeper 拦截，不能保证双击即开；不要禁用系统安全功能或清除隔离属性来伪装正式分发。面向普通用户分发应使用下文的签名、公证流程。

### 方式 B：从源码运行

#### 准备环境

| 条件 | 说明 |
| --- | --- |
| 系统 | Windows x64 已验证；macOS 12+ 的 x64 / arm64 已适配、待实机验证；源码构建还需满足 Node.js 24 自身的系统要求 |
| Node.js 和 npm | 当前开发验证使用 Node.js 24.14.0；使用 Node.js 24.x 环境并确保 npm 可用 |
| 网络 | 首次安装需访问 npm registry 和 Electron 二进制下载源；安装后应用可离线运行 |
| Git | 可选，已有源码文件夹则不需要 |
| Microsoft Excel 桌面版 | 可选，仅用于独立恢复和 Excel 实机兼容测试 |

Windows 在源码文件夹中打开 PowerShell，确认当前位置有 `package.json` 和 `package-lock.json`：

```powershell
node --version
npm --version
Test-Path package.json
Test-Path package-lock.json
npm ci
```

Mac 在终端进入源码根目录，执行：

```bash
node --version
npm --version
test -f package.json && test -f package-lock.json
npm ci
npm start
```

两平台都在当前系统安装依赖，不要从另一平台复制 `node_modules`。每一步成功后再执行下一步。`npm ci` 根据锁文件安装一致的依赖，会替换已有 `node_modules`；普通安装不需要修改依赖版本或锁文件。

安装完成后启动：

```powershell
npm start
```

也可双击根目录的 `start.cmd`。它使用已经安装的 Electron，并清除可能使 Electron 以 Node 模式运行的环境变量；它不会自动安装依赖。

Mac 也可执行 `bash start.command`；如需双击启动，先执行 `chmod +x start.command`。脚本会清除当前进程的 `ELECTRON_RUN_AS_NODE`。

出现“打开密码库 / 创建密码库”界面后即可使用。正式密码库应放在独立的数据目录，避免放入会重新生成的 `release/`、`node_modules/` 或 `test-results/`。

### 在对应系统构建程序

先保存并退出正在运行的 Epassword，再执行：

```powershell
npm test
npm run pack
```

构建结果按当前平台和 Node.js 架构区分：

| 构建环境 | 文件夹版启动入口 |
| --- | --- |
| Windows x64 | `release/win-unpacked/Epassword.exe` |
| Mac Apple Silicon / 原生 arm64 Node | `release/mac-arm64/Epassword.app` |
| Mac Intel / x64 Node | `release/mac/Epassword.app` |

打包复用 `node_modules/electron/dist/` 中的运行时，必须先成功安装依赖，不能跳过 Electron 安装脚本。

Windows 需要 portable 分发包时执行：

```powershell
npm run dist:win
```

产物在 `release/` 下。此步骤可能额外下载 Windows 打包工具；文件夹版构建成功不能证明 portable 构建也成功。Windows 当前未配置签名。Mac 分发包必须在 Mac 上构建：

```bash
# 选择需要的架构，或依次构建两者
npm run dist:mac:arm64
npm run dist:mac:x64
```

输出为 `release/Epassword-版本-mac-架构.dmg` 和对应 ZIP。跨 Mac 架构构建会下载目标架构的 Electron，不会混用本机运行时。

任一支持的平台执行 `npm run dist` 都会构建当前平台、当前架构。Windows 不能使用本项目脚本构建 Mac DMG；脚本会明确拒绝，避免生成错误平台的文件。

### Mac 正式签名与公证

公开分发需要 Apple Developer 的 Developer ID Application 证书及公证凭据。把证书与密码通过本机环境或 CI Secret 注入，不写入源码、命令历史或文档。

- 签名：使用 electron-builder 支持的 `CSC_LINK`、`CSC_KEY_PASSWORD`，或本机钥匙串中的签名身份。
- 公证：使用 `APPLE_ID`、`APPLE_APP_SPECIFIC_PASSWORD`、`APPLE_TEAM_ID`，或官方支持的 App Store Connect API 凭据。
- 配置好凭据后，在 Mac 执行：

```bash
npm run dist:mac:signed
# 指定另一架构时
npm run dist:mac:signed -- --arch=x64
```

此入口启用 hardened runtime、强制代码签名和公证。缺少有效凭据应报错，不会把测试包称为正式签名包。项目自带 JIT 权限文件 `build/entitlements.mac.plist`。具体凭据要求见 [electron-builder v26 macOS 文档](https://www.electron.build/v26/docs/mac/) 与 [Apple 公证工具说明](https://github.com/electron/notarize)。当前未提供证书，也未执行真实签名、公证。

### 升级与卸载

1. 升级前备份自己的 `.xlsx` 和需要保留的 `.bak`，记录文件位置，并退出应用。
2. 文件夹版使用新的完整程序目录；源码版更新源码后执行 `npm ci`，需要 EXE 时再执行 `npm run pack`。
3. 用原主密码打开原密码库。新增字段后，不要回退到不支持自定义字段的旧版程序。
4. 卸载文件夹版可移除程序目录；保留密码库仍可用 Excel 恢复。删除程序或源码目录前确认其中没有自己的数据。

## 二、AI / 自动化代理

目标：在用户指定目录安装当前锁定版本，验证可用性，按需交付启动入口或构建产物。不要为了安装改变用户密码库、凭据或依赖版本。

### 1. 检查上下文

遵守任务授权与适用的 `AGENTS.md`，确认工作目录。不要假定开发者机器上的绝对路径：

```powershell
Get-Location
Get-Item package.json, package-lock.json, README.en.md, INSTALL.en.md
Get-Content package.json
node --version
npm --version
```

缺少源码时使用用户提供或已确认的来源，不要编造仓库地址。默认使用现有环境，不强制升级系统 Node.js 或修改全局 npm 配置。

Mac 环境检查可使用 `pwd`、`ls package.json package-lock.json`、`cat package.json`、`node --version`、`npm --version`，不照搬 PowerShell 命令。

### 2. 安装并检查运行时

```powershell
npm ci
node -p "require('./node_modules/electron/package.json').version"
Test-Path node_modules/electron/dist/electron.exe
```

Mac 安装后检查：

```bash
node -p "require('./node_modules/electron/package.json').version"
test -x node_modules/electron/dist/Electron.app/Contents/MacOS/Electron
```

逐条检查退出码；Electron 版本应与锁文件一致，Windows 运行时检查应为 `True`，Mac 的 `test -x` 应退出 0。网络、缓存写入或 GUI 启动受沙箱限制时，使用所在环境的审批机制，不通过换工具绕过限制。

不要将 `npm ci --ignore-scripts` 视为安装完成，它会跳过 Electron 二进制安装。不要用缓存中的其他 Electron 版本冒充锁定版本。

### 3. 验证

基础测试不需要 Microsoft Excel：

```powershell
npm test
```

覆盖加密、备份、密码轮换、外部修改检测、密码生成、OTP 标准向量、二维码识别和自定义字段恢复。

需要桌面验证时，在有交互桌面的 Windows 或 Mac 会话中依次执行：

```powershell
npm run test:platform
npm run test:desktop
node tests/copy-generator.cjs
node tests/otp-desktop.cjs
```

- 基础桌面测试使用默认应用配置。若用户已打开应用，先让用户保存并退出，不要强制终止用户会话。
- 复制和 OTP 测试使用独立配置目录，但会操作系统剪贴板，不应并行运行。
- OTP 测试显示测试二维码窗口并实际捕获屏幕，需要可见桌面。Mac 还需要系统录屏授权，不能绕过 TCC；CI 中不自动运行真实屏幕扫码。无头、无权限或锁屏环境失败不等于算法失败。
- 结果写入 `test-results/`，使用脚本中的虚构凭据。基础测试会重建 `test-results/desktop-vault.xlsx`，该路径不得放置真实数据。
- 不将真实密码、OTP 密钥写入日志、命令行参数、截图或提交内容。用户自己的建库和主密码输入由用户完成。

### 4. 按需打包

用户需要 Windows EXE 时执行以下命令；Mac 同样执行 `npm run pack`，然后检查上表中的 `.app`：

```powershell
npm run pack
Test-Path release/win-unpacked/Epassword.exe
```

验证打包程序，而非源码运行时：

```powershell
$env:EPASSWORD_TEST_RUNTIME = (Resolve-Path release/win-unpacked/Epassword.exe).Path
node tests/copy-generator.cjs
node tests/otp-desktop.cjs
Remove-Item Env:EPASSWORD_TEST_RUNTIME -ErrorAction SilentlyContinue
```

Mac 验证打包后的应用可使用：

```bash
# Apple Silicon；Intel 将 mac-arm64 改成 mac
export EPASSWORD_TEST_RUNTIME="$PWD/release/mac-arm64/Epassword.app/Contents/MacOS/Epassword"
node tests/platform-smoke.cjs
node tests/copy-generator.cjs
# 已授权录屏、可见桌面时再运行
node tests/otp-desktop.cjs
unset EPASSWORD_TEST_RUNTIME
```

平台测试在 Mac 上还验证 Command 快捷键、原生菜单、关闭窗口锁定与 Dock 重新打开后的 IPC。逐条检查退出码，结束时清除本次设置的环境变量，包括失败时。不要因为源码测试成功就声称打包程序已验证；仅要求源码安装时不必额外构建 portable 包。

### 5. 可选：Microsoft Excel 实机验证

下列脚本仅适用于 Windows，需要已安装桌面 Excel、有交互用户会话且允许 COM 自动化。先完成对应桌面测试，生成测试文件：

```powershell
# 依赖 npm run test:desktop 生成 desktop-vault.xlsx
powershell -NoProfile -File tests/excel-compat.ps1

# 依赖 node tests/otp-desktop.cjs 生成最新 otp-* 测试目录
powershell -NoProfile -File tests/excel-otp.ps1
```

脚本后台启动 Excel，只读打开测试文件，验证后关闭自己创建的实例。不要对真实密码库执行测试。

执行策略或环境限制阻止运行时，按环境规则处理并报告未执行原因；不要关闭系统策略，也不要把库级测试称为 Excel 实测。

Mac 不支持这些 PowerShell COM 测试。可用临时测试库在 Excel for Mac 中手动验证打开密码、中文字段和 OTP 链接；未实际执行时，报告“未验证 Excel for Mac”，不要以 Windows Excel 测试替代。

### 6. CI 与交付

`.github/workflows/build.yml` 在 Windows x64、Mac Intel、Mac ARM runner 分别运行核心测试、原生打包和打包后的平台冒烟测试，再生成分发包并上传工作流产物。推送到 main / master、PR 或手动 workflow_dispatch 可触发；需要项目已上传到 GitHub 且 Actions 可用。

CI 不自动发布 Release，不使用生产密码库，也不包含 Apple 签名凭据；Mac 产物是 ad-hoc 测试包。真实扫码授权与 Excel for Mac 恢复仍需本机验收。构建状态请以仓库 Actions 记录为准。


报告安装目录、启动方法、实际 Node.js / Electron 版本、测试结果和未执行项。若打包，提供实际存在的 EXE 路径并说明应保留整个文件夹。

提醒用户自行创建或选择 `.xlsx`、输入主密码。不要把测试库当作正式库交付。仅修改文档时核对命令与路径即可，无需重装依赖或重跑全部测试。

## 三、安装排错

| 现象 | 处理 |
| --- | --- |
| 找不到 `node` / `npm` | 检查 Node.js 安装与 PATH，重新打开终端验证版本 |
| PowerShell 阻止 `npm.ps1` | 尝试 `npm.cmd ci` / `npm.cmd start`，无需改变全局执行策略 |
| npm 报找不到 `npm-cli.js` | 修复 npm 启动器，或按下文定位真实 CLI，不要照抄其他机器盘符 |
| Electron 下载停滞 | 检查网络、代理和下载源，恢复后重新执行 `npm ci` 或 `node node_modules/electron/install.js` |
| 需要镜像或离线运行时 | 使用可信且与锁文件版本、平台、架构一致的包，校验 SHA-256；不要为安装成功而降级 |
| Electron 以 Node 模式运行 | 用 `start.cmd`，或在当前终端清除 `ELECTRON_RUN_AS_NODE` |
| 启动后立即退出 | 检查是否已有 Epassword 实例；应用为单实例，第二次启动会转到已有窗口 |
| 打包出现占用 / 权限错误 | 保存并退出 Epassword，确认输出目录可写；不强制结束用户进程 |
| 没有 `release/` | 执行 `npm run pack` 生成；它不是源码自带目录 |
| 桌面测试无法启动 | 检查交互桌面、权限和已有实例；可先运行无需 GUI 的 `npm test` |
| Mac 扫码无权限 | 在系统隐私设置允许 Epassword / Electron 录屏后重启，或改用图片导入 |
| Mac 测试包被 Gatekeeper 拦截 | 核实来源，优先使用 Developer ID 签名且已公证的包，不禁用系统防护 |
| 在 Windows 构建 Mac 包时报错 | 在 Mac 或 Mac CI runner 运行对应打包命令 |
| 无法创建 Excel COM | 确认安装 Microsoft Excel 桌面版；不影响 Epassword 自身读写 |

### npm 启动器损坏时

以下方法仅适用于 Node.js 安装目录仍保留 npm 文件的情况：

```powershell
$nodeExecutable = (Get-Command node).Source
$nodeDirectory = Split-Path $nodeExecutable
$npmCli = Join-Path $nodeDirectory 'node_modules/npm/bin/npm-cli.js'
Test-Path $npmCli
```

只有结果为 `True` 才继续：

```powershell
& $nodeExecutable $npmCli --version
& $nodeExecutable $npmCli ci
& $nodeExecutable $npmCli test
```

文件不存在时修复 Node.js / npm 安装，不猜测路径。使用版本管理器时，实际位置可能不同。

### 清除当前终端的 Electron Node 模式

```powershell
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
npm start
```

只影响当前终端及后续子进程，不修改系统全局环境变量。

Mac 对应的当前终端环境变量清理：

```bash
unset ELECTRON_RUN_AS_NODE
npm start
```

平台依据：[Electron macOS 最低版本变更](https://github.com/electron/electron/blob/main/docs/breaking-changes.md)、[屏幕捕获权限](https://www.electronjs.org/docs/latest/api/desktop-capturer)。

## Chrome 插件：人类与 AI 安装

人类用户：启动更新后的桌面端，在 chrome://extensions 开启开发者模式并加载 extension 文件夹，通过桌面端「设置与恢复 → 浏览器插件」生成配对码，在 HTTPS 网页上打开插件完成配对。[完整步骤](docs/wiki/Browser-Extension-zh-CN.md)。Windows 与 Mac 步骤相同。

AI：npm ci 后运行 npm test，再用 npx playwright install chromium 安装独立测试浏览器，执行 npm run test:browser 和 npm run pack:extension。测试只用临时配置和模拟账号，勿修改用户真实 Chrome 配置或使用真实密码库。执行 npm run pack 更新桌面程序，插件和桌面端需要配套分发。

ZIP 是开发者模式使用的已解压扩展文件包，需先解压，不是 Chrome 商店发行版。Mac 原生集成仍待验证。

## 本机程序 API

一体安装包同时安装 integrations/ 下的 Node.js 客户端、OpenAPI 定义及双语指南。桌面设置中逐个授权本机程序访问明确的 HTTPS 网站，将 EPASSWORD_API_TOKEN 仅放在调用进程环境中，不使用主密码或 Chrome 配对码。[API 说明](docs/API.zh-CN.md)。
