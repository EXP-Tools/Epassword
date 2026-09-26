# Chrome extension

**English** | [简体中文](Browser-Extension-zh-CN.md)

The Manifest V3 extension connects Chrome to the running Epassword desktop application on Windows or macOS. Passwords continue to live in the encrypted Excel vault. The extension does not need Excel installed, a cloud service or a native messaging host.


Recommended: use the combined Epassword-Setup ZIP. Run install.cmd on Windows or bash install.command on Mac to install the desktop and extension together, then follow setup.html for Chrome activation and pairing. [Installation guide](../../INSTALL.md).


## Install and pair

1. Install/build the updated desktop app and open your vault. An older desktop build does not contain the browser bridge.
2. Download the Chrome ZIP from build artifacts and extract it, or use the repository's **extension** folder. Keep this folder in a permanent location.
3. In Chrome, open **chrome://extensions**, enable **Developer mode**, choose **Load unpacked**, and select the folder containing manifest.json. Pin Epassword to the toolbar.
4. In Epassword, open **设置与恢复 → 浏览器插件 → 生成配对码**. Copy the selected code with Ctrl+C on Windows or Command+C on Mac.
5. Open an HTTPS website. Click the Epassword toolbar button, expand **连接桌面端 / Pair desktop**, paste the code and click **配对 / Pair**. Refresh tabs that were open before installation.

Only one extension installation can be paired per desktop session. Generating another code revokes the old connection. Codes are random connection credentials, not your master password. Restarting either the desktop application or Chrome requires pairing again. Locking and unlocking the same application session does not require re-pairing. **关闭浏览器连接** immediately revokes access and closes the listener.

## Fill logins

Save the website's full HTTPS URL in a login item's website field or an additional URL field. The extension matches the exact HTTPS hostname and port; paths do not matter. It does not match parent/sibling/subdomains automatically. Add another URL field for another legitimate login host.

Click an account in the popup to fill a visible username/password form. Enable **此网站单账号自动填充** to fill automatically on future page loads when exactly one account matches. Reload the page after enabling. Multiple matches require selection. Automatic fill leaves fields containing values untouched. The extension never submits a login form.

Registration/new-password forms, forms with multiple password inputs, HTTP pages, cross-origin form actions, embedded frames and browser-internal pages are not filled. Archived and deleted items are excluded. Complex shadow-DOM forms and multi-step username-first logins may require copying values from the desktop app.

## Save registration credentials

For standard HTML registration forms, a trusted submit/click with autocomplete=new-password or two matching password fields creates a temporary pending entry. A page banner asks you to open the toolbar extension; its badge shows **!**. Only paired browsers collect pending entries. The banner does not contain credentials.

After confirming the website accepted registration, open the extension and choose **保存到 Epassword / Save**. Epassword opens a native confirmation displaying the site and username. Choose **保存新项目** within two minutes to write a new encrypted Excel entry. The Chrome popup may close when the desktop app takes focus; reopen it after confirming if needed.

The extension does not determine whether registration succeeded. It never overwrites existing accounts. Identical active credentials are not duplicated. Cancel/dismiss leaves the vault unchanged. Pending registration data expires after five minutes and is removed on tab close, browser restart, extension reload or disconnect. Expired entries are cleaned within one alarm interval; they cannot be saved after expiry.

Nonstandard JavaScript registration widgets, forms without new-password hints or confirmation fields, and embedded registration frames may not trigger detection. Save these manually in Epassword.

## Connection and privacy

The desktop bridge is disabled until you generate a code. It binds only to **127.0.0.1:29743**, validates the host, browser extension identity and pairing token, and rejects ordinary website origins. Requests require the token and an unlocked vault. Password reads return only one selected exact-origin login; list responses contain no passwords. There is no remote server.

The extension needs HTTPS site access for local form detection, loopback access for the bridge, storage for settings/session state, active-tab access and an expiry alarm. The per-site auto-fill preference is stored locally. Tokens and pending registration passwords use Chrome's memory-only storage.session, restricted to extension contexts; they are not written to storage.local/sync. Website scripts can read values after they have been filled, as with other DOM-based password filling.

This does not protect against malware or a compromised logged-in OS account, browser, extension, or target website. The new bridge/extension has not received an independent security audit. Never expose the loopback port through a proxy or share pairing codes.

## Troubleshooting and development

- **Cannot connect:** start the updated desktop build, unlock, generate a code and pair. If port 29743 is occupied, close the other Epassword instance/application using it.
- **No matches:** check HTTPS, hostname, port, login category and archived/trash state.
- **No form:** refresh after installation; check iframe/multi-step/new-password restrictions.
- **Locked:** unlock in the desktop app. No passwords can be read while locked.
- **Save cancelled/timed out:** confirm registration success, reopen the popup and retry; inspect the desktop vault before retrying if the connection was interrupted.
- **Mac:** uses the same extension folder and pairing flow. Windows integration has been tested locally; native Mac testing remains pending.

~~~sh
npm run pack:extension
npx playwright install chromium
npm run test:browser
~~~

The ZIP is written to release/Epassword-Chrome-1.1.0.zip. Browser tests use isolated profiles and synthetic HTTPS pages, create their own encrypted vault, and never access your real Chrome profile. Set EPASSWORD_TEST_CHROME to an existing Chrome for Testing/Chromium executable if downloading is unavailable; standard branded Chrome may reject command-line extension loading. EPASSWORD_TEST_RUNTIME can point to a packaged desktop executable.

[Home](Home.md)
