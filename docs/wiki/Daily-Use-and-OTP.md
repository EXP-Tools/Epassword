# Daily use and OTP

[Wiki home](Home.md) | [简体中文](Daily-Use-and-OTP-zh-CN.md)

## Copy and generate

Click the username or password to copy it, even while the password is masked. “显示” only reveals a password. Enter/Space copies a focused field.

In the item editor, choose random passwords or numeric PINs. Random passwords support 8–64 characters and selectable uppercase/lowercase/digit/symbol groups. Each selected group appears at least once. PINs support 4–32 digits, with leading zeroes preserved.

Click “保存项目” to persist edits. Generating a value alone does not save it.

## Add more fields

In “更多信息”, select a type and click “添加更多”. Up to 100 fields per item are supported: security question, text, URL, email, address, date, OTP, password and phone.

Sensitive password/security-question fields are masked in details. Custom fields are stored as readable values inside the encrypted workbook.

## Set up an authenticator

1. On the website, begin authenticator-based two-factor setup.
2. In Epassword, add an “一次性密码” field.
3. Paste its Base32 setup secret or otpauth://totp link, import its QR image, or click “扫描屏幕二维码”.
4. Screen scanning temporarily hides Epassword. Display a clear, enlarged QR code beforehand.
5. Review the account/configuration and save the item.
6. Use the displayed code to complete the website's setup.

Scanning only imports setup material. It does not enable two-factor authentication on the website for you.

Manually entered secrets default to SHA1, six digits and 30 seconds. Links can specify SHA256/SHA512, eight digits or a different supported period. The app supports time-based OTP, not HOTP, SMS or Google Authenticator bulk-migration QR codes.

## Countdown, copying and permissions

The current code refreshes automatically. Clicking it recomputes the code before copying; the clipboard is cleared by the period end or 30 seconds, provided it still contains that copied value.

Keep system time accurate. On Mac, grant Screen Recording permission and restart. QR image import is the fallback if screen capture is unavailable. Screen images are processed locally and are not saved or uploaded.

## Organize and lock

Search covers title, username, URL and tags. Use favorites, comma-separated tags, archive and trash recovery. Trash retains data in the workbook.

Ctrl+L on Windows or Command+L on Mac locks the vault. Inactivity, system lock and sleep also lock it.
