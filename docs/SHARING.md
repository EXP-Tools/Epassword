# Single-item sharing format (v1)

Sharing is local and offline. It does not upload a vault or store a sharing password.

The lowercase hexadecimal envelope encodes: 4 bytes ASCII EPS1, 16 random salt bytes, 12 random nonce bytes, 16 GCM authentication-tag bytes, then ciphertext. Uppercase input and whitespace are accepted within the input-size limit.

Derivation: scrypt(password UTF-8, salt, N=32768, r=8, p=1), 32-byte output, 64 MiB maximum memory. Encryption: AES-256-GCM, 128-bit tag; the first 32 envelope bytes (magic, salt, nonce) are authenticated as AAD.

The UTF-8 JSON plaintext is { "format": "Epassword item", "version": 1, "item": { ... } }. Only the documented vault columns and custom-field id/type/label/value are serialized. Unknown properties are discarded. Decrypted items use the existing vault validation; importing regenerates project and custom-field IDs and appends the result to the encrypted destination vault. OTP setup values are included, not just current codes.

Passwords require 8–255 characters. Plaintext is capped at 16 MiB. The importer verifies authentication before parsing JSON and exposes only title/account metadata for preview. Preview expires after five minutes; locking invalidates previews and generated shares retained in memory. This is not expiration of copies already sent.

Offline shares cannot be remotely revoked and do not expire. Send ciphertext and password separately. Recipient copies remain readable with the original sharing password even if the sender changes passwords later.

## 中文

单项配置序列化为 JSON 后，经 scrypt 派生密钥与 AES-256-GCM 加密，输出十六进制封装。包含自定义字段和 OTP 设置密钥。每次生成随机盐和 nonce；错误密码或密文篡改无法通过认证。导入预览不暴露密码，确认后追加新 ID 项目。

临时分享密码不会改变密码库主密码，也不代表自动过期。已发送的离线密文无法撤销；请将密文与分享密码分开传递。

Version 1.3 recipients assign fresh IDs and update the last-edited timestamp to receipt time. Password history is excluded from single-item shares; the receiving vault starts recording its own history from the received current value.
