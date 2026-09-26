# Development and troubleshooting

[Wiki home](Home.md) | [简体中文](Development-and-Troubleshooting-zh-CN.md)

## Architecture

The Electron main process owns file dialogs, Excel encryption, random generation, TOTP, clipboard access and QR capture. The renderer uses a restricted preload IPC bridge, with Node integration off, context isolation on and sandbox enabled.

- electron/vault.cjs: workbook serialization, encryption, backups and conflict checks.
- electron/generator.cjs: random passwords and PINs.
- electron/otp.cjs: setup-link validation and RFC 6238 TOTP.
- electron/qr.cjs: local QR decoding.
- ui/: item editing, custom fields and live code display.
- scripts/pack.cjs: platform-aware packaging.
- .github/workflows/build.yml: Windows x64 and Mac x64/arm64 CI.

## Validate and build

~~~sh
npm ci
npm test
npm run test:platform
npm run pack
~~~

See [the installation guide](../../INSTALL.md) for GUI, OTP-screen and native Excel test prerequisites. Tests must use synthetic data, not real vaults.

Build on the matching OS. Mac cross-architecture builds download the target runtime. Windows is locally tested; native Mac verification and Apple notarization remain pending.

Default CI uploads build artifacts, not public releases. Default Mac builds are ad-hoc signed. The signed build entry requires separately supplied Apple credentials.

## Troubleshooting

| Problem | Check |
| --- | --- |
| npm launcher broken | Locate the actual npm CLI or repair Node; do not copy another machine's absolute path |
| Electron download fails | Verify network/proxy and the exact locked version |
| App opens no new window | An existing single-instance app may already be running |
| Vault save conflicts | Lock/reopen after external edits; do not overwrite blindly |
| OTP rejected by website | Check clock, account, algorithm, digits and period |
| QR not recognized | Enlarge the authenticator setup QR or import a clear image |
| Mac scan denied | Grant Screen Recording permission, restart, or import an image |
| Mac package blocked | Distinguish a development package from Developer ID-signed/notarized distribution |
| Desktop tests fail in CI | Check GUI availability; real screen scanning additionally needs permission |
| Excel COM test fails on Mac | COM scripts are Windows-only; test Excel for Mac manually |

## Contributing documentation

English defaults are README.md and INSTALL.md. Chinese versions use the .zh-CN.md suffix. Wiki language pairs link to each other. Keep behavior and limitations consistent across languages.

Do not commit vaults, test screenshots, node_modules, signing certificates or credentials. Preserve the package lockfile and verify scripts referenced in documentation.
