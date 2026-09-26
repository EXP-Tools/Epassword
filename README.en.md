# Epassword


[Interactive product preview](https://exp-tools.github.io/Epassword/) · Explore the vault, generator, export and sharing flows.
**English** | [简体中文](README.md)

A local-first desktop password manager built with Electron. Epassword stores passwords and OTP setup secrets in an encrypted Excel workbook. **Your master password is the Excel file-open password:** you can recover your data with Microsoft Excel even without Epassword.

The three-column interface is inspired by 1Password. Epassword is an independent project and is not affiliated with 1Password. The application interface is currently in Chinese; this repository provides English and Chinese documentation.

[Installation](INSTALL.en.md) · [安装指南](INSTALL.md) · [Project Wiki](docs/wiki/Home.md) · [中文 Wiki](docs/wiki/Home-zh-CN.md)

## Download 1.2

Current release: [Epassword 1.2](https://github.com/EXP-Tools/Epassword/releases/tag/v1.2.0). Combined installers include the desktop app and Chrome extension files.

| Platform | Download |
| --- | --- |
| Windows x64 | [Epassword-Setup-1.2.0-win-x64.zip](https://github.com/EXP-Tools/Epassword/releases/download/v1.2.0/Epassword-Setup-1.2.0-win-x64.zip) |
| Mac Intel | [Epassword-Setup-1.2.0-mac-x64.zip](https://github.com/EXP-Tools/Epassword/releases/download/v1.2.0/Epassword-Setup-1.2.0-mac-x64.zip) |
| Mac Apple Silicon | [Epassword-Setup-1.2.0-mac-arm64.zip](https://github.com/EXP-Tools/Epassword/releases/download/v1.2.0/Epassword-Setup-1.2.0-mac-arm64.zip) |

[Chrome extension](https://github.com/EXP-Tools/Epassword/releases/download/v1.2.0/Epassword-Chrome-1.2.0.zip) · [SHA256SUMS.txt](https://github.com/EXP-Tools/Epassword/releases/download/v1.2.0/SHA256SUMS.txt)

Extract the entire ZIP, then run install.cmd on Windows or bash install.command on Mac. Chrome activation and pairing remain manual. Mac packages are not Apple-notarized.


## Screenshots and user guide

[Illustrated user guide](docs/USER-GUIDE.en.md) · [中文用户手册](docs/USER-GUIDE.md)

Real application screenshots with fictional demo data. The guide includes step-by-step instructions, more screenshots and troubleshooting.

### Account management

![Epassword vault](docs/screenshots/vault.png)

### Password generation

![Item editor and password generator](docs/screenshots/editor.png)

### OTP and screen scanning

![OTP setup and scanning controls](docs/screenshots/otp-setup.png)


## Platform status

| Platform | Status |
| --- | --- |
| Windows x64 | Built and tested locally |
| macOS Intel / x64 | Built and smoke-tested on macOS CI; physical-device QR/Excel validation pending |
| macOS Apple Silicon / arm64 | Built and smoke-tested on macOS CI; physical-device QR/Excel validation pending |

macOS requires version 12 or later for the bundled Electron runtime. Source builds must also meet the requirements of the installed Node.js version. Linux is not a supported target.

Windows and Mac use the same workbook format and master password. Copy your workbook manually to move between devices; there is no automatic synchronization.

## Install desktop and Chrome extension together

Download the matching Epassword-Setup ZIP from [Releases](https://github.com/EXP-Tools/Epassword/releases/tag/v1.2.0), extract it, and run install.cmd (Windows) or bash install.command (Mac). The included runtime installs both components without Node.js. Follow the generated guide to enable the plugin in Chrome and pair it. [Combined installation](INSTALL.en.md#combined-desktop--chrome-installation-recommended).

## Quick start

Clone this repository using an account with access, then run:

~~~sh
git clone https://github.com/EXP-Tools/Epassword.git
cd Epassword
npm ci
npm start
~~~

The development environment uses Node.js 24.x. Install dependencies on each operating system; do not copy node_modules across platforms. See [INSTALL.en.md](INSTALL.en.md) for complete instructions for both human users and AI agents.

If you already have a Windows directory build, open release/win-unpacked/Epassword.exe and keep the entire directory together. Mac DMG/ZIP builds must be produced on a Mac or a Mac CI runner; choose the package matching your chip.

On first launch, choose “创建密码库” (Create vault), select a new .xlsx location, and set a 8–255 character master password. Choose “打开密码库” (Open vault) for an existing Epassword workbook.

Excel is not required to run the app. It is needed only for independent Excel recovery or native compatibility tests. Build output is not committed to this repository; see the [Actions workflow](.github/workflows/build.yml) for build artifacts when available.

## Features

| Area | Capabilities |
| --- | --- |
| Browser extension | Exact HTTPS origin matching, optional single-account auto-fill and confirmed registration saving |
| Items | Logins, secure notes, credit cards and identities; create, edit, search, favorites, tags, archive and trash recovery |
| Copy | Click usernames, masked passwords, custom fields or OTP codes; keyboard Enter/Space also works |
| Password generation | 8–64 characters; choose uppercase, lowercase, digits and symbols; every selected group is included |
| PIN generation | 4–32 digits, six by default; leading zeroes are preserved |
| Custom fields | Security questions, text, URLs, email, addresses, dates, OTP, passwords and phone numbers; up to 100 per item |
| TOTP | SHA1/SHA256/SHA512, six or eight digits, 1–300 second periods, live countdown and click-to-copy |
| OTP import | Base32 setup secrets, otpauth://totp links, screen QR scanning and QR image import |
| Local checks | Short and reused passwords; no online breach lookup |
| Locking | Manual lock, five-minute inactivity lock, system lock and sleep |
| File handling | Encrypted previous-save backup and detection of external file changes |

Credit-card and identity details use notes and custom fields. Search covers titles, usernames, URLs and tags, not custom-field values.

Ordinary copied values are cleared after 30 seconds if the clipboard still contains the application's copied value. OTP copies are cleared no later than the end of the current period or 30 seconds. Locking also clears matching clipboard content.

## AI and program API

Authorize local programs with independent, expiring tokens scoped to exact HTTPS sites. Query matching accounts or read one selected credential for filling. Vault lock revokes all API tokens. The included Playwright helper fills without returning the password to its caller. [API guide](docs/API.md) · [OpenAPI](docs/openapi.json).

## Chrome extension

Fill exact-site HTTPS logins and save detected registration credentials after confirmation in Epassword. Optional automatic fill works when a single account matches. Windows and Mac use the same extension; desktop must be running and unlocked.

Load the extension folder through Chrome Developer mode, generate a pairing code in desktop Settings, then paste it into the extension. Restarting either application requires re-pairing. See the [complete setup and limitations](docs/wiki/Browser-Extension.md). Build a ZIP with npm run pack:extension.

## Using custom fields and OTP

1. Create or edit an item.
2. In “更多信息” (More information), choose a field type and click “添加更多” (Add more).
3. For OTP, paste a setup secret/link, import a QR image, or display the site's authenticator QR code and click “扫描屏幕二维码” (Scan screen QR).
4. Check the account and configuration, then save the item. Generating a password or scanning a QR does not save it automatically.
5. Enter the displayed code on the website to finish enabling two-factor authentication there.

A manually entered secret defaults to SHA1, six digits and 30 seconds. Setup links preserve non-default parameters. Multiple OTP fields are supported. Keep the system clock accurate.

Screen capture runs only when requested. Images are decoded locally in memory, not saved or uploaded. macOS requires Screen Recording permission; the OTP editor includes a shortcut to its settings. Restart the app after granting permission. Image import does not require screen-recording access.

HOTP, SMS codes, ordinary website QR codes and Google Authenticator bulk migration QR codes are not supported.

## Shortcuts and window behavior

| Action | Windows | Mac |
| --- | --- | --- |
| Search | Ctrl+K | Command+K |
| Lock vault | Ctrl+L | Command+L |
| Copy a focused field | Enter / Space | Enter / Space |
| Close a dialog without saving | Esc | Esc |

On Mac, closing the window locks the vault and leaves the application in the Dock. Click the Dock icon to reopen the locked window; Command+Q quits. On Windows, closing the final window exits.

## Recover with Excel

The workbook uses Office ECMA-376 Agile file encryption, not worksheet protection. There is no additional application-specific recovery key.

| Worksheet | Contents |
| --- | --- |
| 密码库 | Core item data: title, category, username, password, URL, notes, tags, state and timestamps |
| 自定义字段 | Item ID, field ID, type, label and readable values, including OTP setup secrets/links |
| 使用说明 | Format and recovery instructions |

Open the .xlsx in Microsoft Excel and enter the same master password. Read core values from 密码库 and join custom fields by item ID. OTP entries contain setup material that can be imported into a compatible authenticator; Excel does not generate live OTP codes by itself.

Each save keeps the previous encrypted version as .xlsx.bak. Copy that backup to a new .xlsx filename to open it. After a master-password change, the previous backup still uses the previous password. Keep a separate backup outside the application directory.

Older vaults are upgraded with the custom-fields sheet on save. Do not rewrite upgraded vaults using older Epassword versions that do not understand custom fields.

Do not edit the same workbook simultaneously in Excel, Epassword or another device. Preserve headers and IDs when editing in Excel. Formula cells in data tables are unsupported; unrelated worksheets and custom formatting are not preserved when the app rewrites a workbook.

**A forgotten master password cannot be reset or recovered. A lost workbook still requires a backup.**

## Development and builds

~~~sh
npm test
npm run test:platform
npm run pack
~~~

| Command | Purpose |
| --- | --- |
| npm test | Storage, generator, OTP vectors, QR decoding, field recovery and platform configuration tests |
| npm run test:platform | Native launch, shortcuts and locking; Mac also checks menus and Dock reopening |
| npm run test:desktop | Basic desktop interactions |
| node tests/copy-generator.cjs | Clipboard, random password and PIN tests |
| node tests/otp-desktop.cjs | Custom fields, QR images, real screen scanning and OTP |
| npm run pack | Directory build for the current platform and architecture |
| npm run dist:win | Windows x64 portable EXE, built on Windows |
| npm run dist:mac:arm64 | Apple Silicon DMG and ZIP, built on Mac |
| npm run dist:mac:x64 | Intel DMG and ZIP, built on Mac |
| npm run dist:mac:signed | Developer ID signing and notarization, with configured credentials |

Desktop tests open windows and use the clipboard. Real screen-scanning tests require an interactive desktop and macOS permission. Excel COM tests are Windows-only and require fixtures generated by desktop tests. See [INSTALL.en.md](INSTALL.en.md) before running them.

The [CI workflow](.github/workflows/build.yml) builds Windows, Mac Intel and Mac ARM packages. It uploads workflow artifacts, not public releases. Default Mac builds are ad-hoc-signed development builds, not notarized public distributions.

Previously verified locally: Windows desktop flows, all 18 RFC 6238 vectors, and Microsoft Excel recovery of passwords, Chinese text and OTP setup links. These checks do not establish native Mac compatibility or constitute a security audit.

## Project layout

~~~text
electron/       Main process, IPC, Excel encryption, password generation, OTP and QR
ui/             Local interface, styles and custom fields
extension/      Chrome Manifest V3 extension
scripts/        Packaging
tests/          Automated and Excel compatibility tests
build/          Mac signing entitlements
docs/wiki/      English and Chinese project wiki
.github/        Cross-platform build workflow
start.cmd       Windows source launcher
start.command   Mac source launcher
~~~

## Limitations

No cloud sync, attachments, sharing, passkeys or online breach lookup. Epassword has not received an independent security audit and does not claim security parity with 1Password.

The renderer has Node integration disabled, context isolation and sandbox enabled, and does not load remote content. Unlocked credentials exist in process memory. The app does not write them to application logs or browser local storage, but JavaScript strings and OS clipboard history cannot be guaranteed to be physically erased. The optional extension holds pairing credentials and pending registrations in memory-only browser session storage. Opening a saved URL uses the system browser.

## References

- [1Password sidebar](https://support.1password.com/sidebar/)
- [Office encryption implementation](https://github.com/zurmokeeper/officecrypto-tool)
- [RFC 6238](https://www.rfc-editor.org/rfc/rfc6238)
- [OTP setup URI format](https://github.com/google/google-authenticator/wiki/Key-Uri-Format)
- [jsQR](https://github.com/cozmo/jsQR)

## Remember your vault

The desktop app remembers the last successfully opened or created vault path on this device. On restart, enter the master password to unlock it; the password is not saved. Click the file selector to choose another file if it has moved.

## Excel import and export

Version 1.1 supports selected/all-item export to plain Excel or encrypted Excel with a separate password. Preview and import selected Epassword-format items as new entries, including custom fields and OTP. See the [illustrated guide](docs/USER-GUIDE.en.md).

## Encrypted single-item sharing

Share an item as password-encrypted hexadecimal text. Import it with the sharing password, preview and append as a new item, including custom fields and OTP. Offline shares do not expire. See the [user guide](docs/USER-GUIDE.en.md).

## Support the author

If Epassword helps you, you can optionally support its development. Thank you! The desktop app and Chrome extension also include a support menu.

| Alipay | WeChat |
| :---: | :---: |
| <img src="extension/assets/sponsor-alipay.png" width="220" height="220" alt="Alipay donation QR code"> | <img src="extension/assets/sponsor-wechat.png" width="220" height="220" alt="WeChat donation code"> |
| Scan with Alipay | Scan with WeChat |
