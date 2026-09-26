# Recovery and security

[Wiki home](Home.md) | [简体中文](Recovery-and-Security-zh-CN.md)

## Recover without Epassword

Open your .xlsx with Microsoft Excel and enter the same master password. This is Office file encryption, not worksheet protection.

- 密码库 contains core credentials.
- 自定义字段 contains additional fields and OTP setup secrets/links, associated by item ID.
- 使用说明 describes the format.

An OTP setup secret can restore the credential in a compatible authenticator. Excel reads the setup material but does not calculate live codes automatically.

A forgotten password cannot be reset. If the workbook is lost, a backup is needed.

## Backups

Each save retains the previous encrypted file as .xlsx.bak. Copy it to a new .xlsx name to open it. After changing the master password, the previous backup still needs the old password.

This is a single previous version, not permanent history. Keep independent backups. Moving an item to trash does not erase it.

## Editing and conflicts

Do not edit the workbook in Excel and the app at the same time. If external changes are detected, lock and reopen to load them rather than overwriting.

Preserve worksheet names, headers and IDs. Formula cells in data tables are unsupported. The app does not retain unrelated worksheets or user-added formatting during rewriting.

Older apps may discard custom fields, so do not downgrade a vault after using new field features.

## Security boundaries

No cloud synchronization or additional application recovery key is used. Passwords and OTP setup secrets share the encrypted workbook. Anyone who obtains both the workbook and its master password can recover both.

Unlocked data exists in process memory. JavaScript strings and OS clipboard history are not guaranteed to be physically erased. The application is not independently security-audited and does not claim parity with 1Password.

Local checks identify short or repeated passwords, not online breaches. Attachment storage, sharing and passkeys are not supported. The optional [Chrome extension](Browser-Extension.md) adds paired, exact-origin filling and confirmed registration saving; tokens and pending registration credentials are kept in browser session memory.

Native Windows Excel recovery has been tested. Excel for Mac recovery remains unverified; report the platform actually tested.
