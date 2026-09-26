# Getting started

[Wiki home](Home.md) | [简体中文](Getting-Started-zh-CN.md)

## Install

Follow [INSTALL.md](../../INSTALL.md) for human-user and AI-agent instructions. Source installation:

~~~sh
git clone https://github.com/EXP-Tools/Epassword.git
cd Epassword
npm ci
npm start
~~~

Use Node.js 24.x. Repository access is required. Prebuilt apps need neither Node.js nor Excel. Build artifacts may be available from successful Actions runs; source downloads do not include application binaries.

## Create your vault

1. Select “创建密码库”.
2. Choose a new .xlsx file in a data directory you control.
3. Set and confirm a 12–255 character master password.
4. Create an item and save it.

Keep the file outside directories that get regenerated during development. The app does not offer password reset or cloud recovery.

## Open an existing vault

Choose “打开密码库”, select an Epassword workbook and enter its file-open password. An arbitrary Excel workbook is not an import format.

## Move between Windows and Mac

Close the vault on the source device, copy the .xlsx to the other device, and open it with the same password. Do not edit both copies and expect automatic merging. There is no cloud sync.

Windows builds use x64. Mac users select x64 for Intel or arm64 for Apple Silicon. See installation instructions for Mac screen-recording permission and signing limitations.

## Update safely

Back up the workbook and any .bak you need, close the app, and replace the complete application folder/bundle. New custom-field vaults must not be rewritten with old app versions that discard those fields.
