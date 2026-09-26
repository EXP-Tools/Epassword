# Installing Epassword

**English** | [简体中文](INSTALL.md)

This guide has separate paths for human users and AI agents. Read [README.en.md](README.en.md) for features and [the wiki](docs/wiki/Home.md) for workflows and recovery. Commands run from the project root unless stated otherwise.

After installation, follow the [illustrated user guide](docs/USER-GUIDE.en.md).

## Combined desktop + Chrome installation (recommended)

Download **Epassword-Setup-1.2.0-win-x64.zip**, **Epassword-Setup-1.2.0-mac-x64.zip**, or **Epassword-Setup-1.2.0-mac-arm64.zip** from [Release 1.2](https://github.com/EXP-Tools/Epassword/releases/tag/v1.2.0). Extract the entire ZIP into a temporary/download folder, close Epassword, then:

- Windows: double-click **install.cmd**.
- Mac: run **bash install.command** in the extracted directory (or double-click the executable launcher).

The Setup ZIP includes its runtime: **Node.js/npm are not required**. The script installs both the complete desktop app and Chrome extension files in one run, creates a Windows Start-menu shortcut, and opens the desktop app, a local setup guide and Chrome's extension manager when Chrome is installed.

Default installation roots are **%LOCALAPPDATA%/Programs/Epassword** on Windows and **~/Applications/Epassword** on Mac. The app lives in app/ and the extension in the stable chrome-extension/ subdirectory. Keep real Excel vaults outside this directory. Upgrades retain the previous app and plugin files in previous-* directories rather than deleting them.

**Finish Chrome activation:** open chrome://extensions, enable Developer mode, choose Load unpacked, and select the installed chrome-extension folder shown by the guide. Pin the extension, unlock Epassword, generate a pairing code in desktop Settings → 浏览器插件, and paste it into the extension on an HTTPS page. After an upgrade, click Reload for the existing extension. Restarting either application requires re-pairing.

Chrome does not allow an ordinary installer to silently enable an unpublished extension on Windows/macOS. This installation prepares both components and explicitly guides the required browser activation; it does not modify browser profiles, enterprise policies or system security settings. [Chrome distribution rules](https://developer.chrome.com/docs/extensions/how-to/distribute).

Source checkout alternative: run install.cmd / bash install.command after installing Node.js 24. With no bundled payload, the script runs npm ci and builds the desktop app before installing both components. Development-only npm start still launches from source without installing.

### For AI and unattended setup

Use --no-launch --no-shortcuts to install without opening apps or modifying Start-menu shortcuts. --install-dir accepts an absolute destination path; select an empty folder outside the extracted/source folder, or a folder previously managed by this installer. --skip-build reuses an existing source directory build and is intended for development.

~~~powershell
.\install.cmd --no-launch --no-shortcuts --install-dir "C:\Users\YOUR_NAME\Apps\Epassword"
~~~

~~~bash
bash install.command --no-launch --no-shortcuts --install-dir "$HOME/Applications/Epassword"
~~~

Do not invent or enter the user's vault master password. Browser activation and pairing remain user steps. Both --no-launch and --no-shortcuts are used by automated installer tests. To build the combined package: npm ci, npm run pack, npm run pack:setup. Test the actual ZIP with npm run test:installer (Windows also needs the Playwright Chromium runtime for extension testing).

The installer never recursively deletes old installations. If installation is interrupted, close any installer process before removing a stale .install-lock file. Retained .staging-* / previous-* folders can be reviewed manually; recover any user data before deleting them. Default Mac development builds remain non-notarized; the installer does not bypass Gatekeeper.

## 1. For human users

### Requirements

| Requirement | Details |
| --- | --- |
| Windows | x64; locally tested |
| Mac | Intel/x64 or Apple Silicon/arm64; runtime requires macOS 12+; native validation is pending |
| Node.js and npm | Needed only for source installation/builds; development uses Node.js 24.x |
| Network | Needed to obtain source, dependencies and Electron; the installed app runs offline |
| Microsoft Excel desktop | Optional; needed for independent Excel recovery or native Excel tests |

Source builds must also satisfy the operating-system requirements of Node.js itself. Excel for Mac recovery has not been verified.

### Use a Windows build

1. Obtain a complete build from a trusted source. Workflow artifacts, when successfully built, are available from this repository's Actions runs.
2. For a directory build, keep the whole win-unpacked directory and launch Epassword.exe. The EXE alone is not enough.
3. Choose “创建密码库” to create a new .xlsx vault, or “打开密码库” to open an existing Epassword vault.
4. Enter the master password yourself. New vault passwords must contain 12–255 characters.

The directory build needs no installer. Current Windows builds are not code-signed. Check the source of a downloaded binary rather than disabling operating-system protections.

Build output is ignored by Git: downloading the source repository does not include a prebuilt EXE.

### Use a Mac build

Check “About This Mac”: Apple M-series chips use arm64; Intel uses x64.

1. Open the matching Epassword-version-mac-architecture.dmg and drag Epassword to Applications. For a ZIP, extract the complete Epassword.app bundle and move it to Applications.
2. Launch the app and create or open an encrypted workbook. The same workbook and master password can be moved between Windows and Mac.
3. To scan screen QR codes, grant Epassword permission under System Settings → Privacy & Security → Screen Recording (the label varies by macOS version), then quit and reopen it. A source-launched app may be listed as Electron.
4. The OTP editor includes a screen-permission settings button. QR image import works without screen capture permission.

Default Mac packages use ad-hoc signing only: they have neither Developer ID signing nor Apple notarization. Downloaded development packages may be blocked by Gatekeeper. Use properly signed/notarized builds for ordinary distribution; do not disable system protections to treat a test build as a signed release.

Mac build configuration is provided, but this Windows development session has not produced or tested a Mac package.

### Run from source

Clone with an account that has access:

~~~sh
git clone https://github.com/EXP-Tools/Epassword.git
cd Epassword
node --version
npm --version
npm ci
npm start
~~~

Check each command's exit status before proceeding. npm ci installs from package-lock.json and replaces an existing node_modules directory. Do not change dependency versions just to install the project.

Install dependencies separately on each operating system. Do not copy node_modules between Windows and Mac.

Alternative launchers, after installation:

- Windows: double-click start.cmd.
- Mac: run bash start.command. To double-click it, first run chmod +x start.command.

These scripts clear ELECTRON_RUN_AS_NODE for the process. They do not install missing dependencies.

Store real vaults in a separate data directory, not release/, node_modules/ or test-results/, which may be regenerated.

### Build on the target operating system

Save your work and close Epassword before replacing build output.

~~~sh
npm test
npm run pack
~~~

| Build host | Directory-build entry point |
| --- | --- |
| Windows x64 | release/win-unpacked/Epassword.exe |
| Mac with arm64 Node.js | release/mac-arm64/Epassword.app |
| Mac with x64 Node.js | release/mac/Epassword.app |

Directory builds reuse node_modules/electron/dist, so Electron installation must finish first.

For distribution:

~~~sh
# On Windows
npm run dist:win

# On Mac, select either or both
npm run dist:mac:arm64
npm run dist:mac:x64
~~~

Outputs are placed in release/. Mac outputs are DMG and ZIP; Windows outputs a portable EXE. Packaging may download additional tools. Successful directory packaging does not prove distribution packaging has succeeded.

npm run dist selects the current platform and architecture. Cross-architecture Mac builds download the target Electron runtime. This project's script rejects building Mac packages on Windows or Windows packages on Mac.

### Sign and notarize Mac distributions

Public distribution requires a Developer ID Application certificate and Apple notarization credentials. Supply credentials through a local secure environment or CI secrets, never source files, logs or committed configuration.

- Signing: electron-builder supports CSC_LINK and CSC_KEY_PASSWORD, or an available signing identity in the Mac keychain.
- Notarization: configure APPLE_ID, APPLE_APP_SPECIFIC_PASSWORD and APPLE_TEAM_ID, or supported App Store Connect API credentials.
- Then, on a Mac:

~~~sh
npm run dist:mac:signed
# Optional architecture override
npm run dist:mac:signed -- --arch=x64
~~~

This entry enables hardened runtime, requires code signing and enables notarization. Missing valid credentials should fail instead of silently claiming a signed release. The JIT entitlement is in build/entitlements.mac.plist.

No signing credentials are included. Developer ID signing and notarization have not been performed during local Windows validation. Consult [electron-builder v26](https://www.electron.build/v26/docs/mac/) and [electron/notarize](https://github.com/electron/notarize).

### Update or uninstall

1. Back up your .xlsx vault and any .bak version you want to keep, and close Epassword.
2. Replace the complete application directory/bundle, or update source and run npm ci again.
3. Open your existing vault with its existing password.
4. Do not downgrade a vault containing custom fields to an older app that does not preserve them.
5. To uninstall a directory build, remove the application directory, but keep your vault. Before deleting any source/build directory, check that it contains no real vaults.

## 2. For AI agents and automation

Install the locked project in the user's chosen directory, verify what is actually runnable, and deliver an accurate entry point. Do not alter real credentials or vault data.

### Inspect the environment

Follow the user's authorization and any applicable AGENTS.md. Do not assume a developer-specific drive path.

~~~sh
node --version
npm --version
~~~

Inspect package.json, package-lock.json, README.en.md and this file. On Windows use Get-Location/Get-Content; on Mac use pwd/cat. Obtain source from the repository above using an authorized account.

Do not force a system Node upgrade or change global npm settings as part of routine installation.

### Install from the lockfile

~~~sh
npm ci
node -p "require('./node_modules/electron/package.json').version"
~~~

Verify the platform runtime:

~~~powershell
# Windows
Test-Path node_modules/electron/dist/electron.exe
~~~

~~~bash
# Mac
test -x node_modules/electron/dist/Electron.app/Contents/MacOS/Electron
~~~

Check exit codes and ensure Electron matches the lockfile. npm ci --ignore-scripts is not a complete install: it skips Electron's binary installer. Never substitute an older cached runtime for the declared version.

Follow the execution environment's approval mechanism for restricted network access, cache writes or GUI launches. Do not work around denied permissions through other tools.

### Validate

~~~sh
npm test
~~~

For desktop validation, run sequentially in an interactive desktop session:

~~~sh
npm run test:platform
npm run test:desktop
node tests/copy-generator.cjs
node tests/otp-desktop.cjs
~~~

Important operational details:

- Basic desktop tests use the default application profile. Ask the user to save and close an existing app session rather than forcibly terminating it.
- Copy and OTP tests use separate profiles, but share the system clipboard. Do not run them concurrently.
- OTP desktop tests display a synthetic QR window and capture the screen. Mac requires Screen Recording permission. Do not bypass TCC. Headless, locked or permission-denied sessions do not establish an algorithm failure.
- Tests use synthetic credentials under test-results/. The basic desktop test recreates test-results/desktop-vault.xlsx; never place real data there.
- Never log, screenshot, commit or pass real vault passwords or OTP secrets on the command line. The user creates their real vault and enters their master password.

### Package when requested

~~~sh
npm run pack
~~~

Verify the actual EXE/app bundle against the platform table above.

To test a Windows packaged application:

~~~powershell
$env:EPASSWORD_TEST_RUNTIME = (Resolve-Path release/win-unpacked/Epassword.exe).Path
node tests/platform-smoke.cjs
node tests/copy-generator.cjs
node tests/otp-desktop.cjs
Remove-Item Env:EPASSWORD_TEST_RUNTIME -ErrorAction SilentlyContinue
~~~

On Apple Silicon Mac (replace mac-arm64 with mac for Intel):

~~~bash
export EPASSWORD_TEST_RUNTIME="$PWD/release/mac-arm64/Epassword.app/Contents/MacOS/Epassword"
node tests/platform-smoke.cjs
node tests/copy-generator.cjs
# Only with an interactive desktop and screen permission:
node tests/otp-desktop.cjs
unset EPASSWORD_TEST_RUNTIME
~~~

Check every exit status; clear temporary environment variables even after failure. Do not claim a packaged app was tested when only source execution was tested. Mac platform smoke tests also check native menus, Command shortcuts and a locked window reopened via the Dock lifecycle.

### Optional native Excel checks

The COM scripts below are Windows-only and require installed desktop Excel and an interactive user session:

~~~powershell
# First run npm run test:desktop to create its fixture
powershell -NoProfile -File tests/excel-compat.ps1

# First run node tests/otp-desktop.cjs to create its fixture
powershell -NoProfile -File tests/excel-otp.ps1
~~~

They open synthetic test workbooks read-only and close the Excel instance they created. Never substitute a real vault. Respect execution policies; report a blocked native test rather than disabling policies or calling library tests “Excel verification”.

On Mac, manually verify a temporary workbook with Excel for Mac. Do not claim Mac Excel compatibility from a Windows COM result.

### CI and handoff

The [build workflow](.github/workflows/build.yml) runs on Windows x64, Mac Intel and Mac ARM. It runs core tests, builds a directory package, smoke-tests that package, then uploads distribution artifacts. It does not automatically publish a Release.

Default Mac CI packages are ad-hoc test builds, with no Apple credentials. Screen permission and Excel for Mac recovery still require native validation.

Report the installation location, actual Node/Electron versions, verified startup path, completed tests and anything not run. Keep the entire Windows application folder or Mac app bundle. Do not hand off test vaults as production data.

Documentation-only changes require command/path checks, not dependency reinstallations or a full test run.

## 3. Troubleshooting

| Symptom | Action |
| --- | --- |
| node/npm not found | Check installation and PATH; reopen the terminal |
| PowerShell blocks npm.ps1 | Try npm.cmd ci or npm.cmd start without changing global execution policy |
| npm-cli.js cannot be found | Repair npm or locate its real CLI as shown below |
| Electron download stalls | Check connectivity/proxy/source; retry npm ci or node node_modules/electron/install.js |
| Offline runtime or mirror needed | Use a trusted package matching version, platform and architecture; verify SHA-256 |
| Electron runs as Node | Use a supplied launcher or clear ELECTRON_RUN_AS_NODE in the current shell |
| App immediately exits | Check for an already-running instance; Epassword is single-instance |
| Build reports file in use | Save and close the app; do not kill the user's processes |
| No release directory | Run npm run pack; build output is not included in source |
| Desktop tests cannot launch | Check the interactive session and permissions; core npm test needs no GUI |
| Mac screen scan denied | Grant Screen Recording permission and restart, or import an image |
| Gatekeeper blocks a test build | Verify its source; prefer a signed/notarized distribution |
| Mac packaging requested on Windows | Use a Mac or Mac CI runner |
| Excel COM unavailable | Install desktop Excel for that optional test; app storage does not require it |

### A broken Windows npm launcher

Only if npm still exists beside node.exe:

~~~powershell
$nodeExecutable = (Get-Command node).Source
$nodeDirectory = Split-Path $nodeExecutable
$npmCli = Join-Path $nodeDirectory 'node_modules/npm/bin/npm-cli.js'
Test-Path $npmCli
~~~

Continue only if the result is True:

~~~powershell
& $nodeExecutable $npmCli --version
& $nodeExecutable $npmCli ci
& $nodeExecutable $npmCli test
~~~

If it is absent, repair Node/npm. Do not guess a machine-specific path; version managers may use a different layout.

### Clear Electron Node mode in the current shell

~~~powershell
# Windows
Remove-Item Env:ELECTRON_RUN_AS_NODE -ErrorAction SilentlyContinue
npm start
~~~

~~~bash
# Mac
unset ELECTRON_RUN_AS_NODE
npm start
~~~

These commands do not change global system environment variables.

## Chrome extension — humans and AI agents

Human users: start the updated desktop build, load the extension folder at chrome://extensions with Developer mode enabled, and pair using the code from desktop Settings → 浏览器插件. Open an HTTPS page before pairing. [Detailed steps](docs/wiki/Browser-Extension.md). The same procedure applies to Windows and Mac.

AI agents: after npm ci, run npm test, install the isolated test browser with npx playwright install chromium, then run npm run test:browser and npm run pack:extension. Use temporary profiles and fixture credentials. Do not change the user's real Chrome profile or use their vault for testing. Rebuild the desktop app with npm run pack so its bridge matches the extension. Both artifacts must be distributed; the extension is not a standalone vault.

The ZIP is an unpacked-development extension archive, not a Chrome Web Store release. Unzip it before loading. Native Mac integration remains unverified locally.

## Local program API

Combined installs also place the Node.js client, OpenAPI contract and bilingual API guide under integrations/. In desktop Settings, authorize each local program for explicit HTTPS sites. Set EPASSWORD_API_TOKEN only in the caller's environment; do not use your master password or Chrome pairing code. [API instructions](docs/API.md).
