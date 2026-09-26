# AI 与其他程序的本机 API

[English](API.md) | **简体中文**

只有在桌面端授权程序后才开启 API，仅监听 **http://127.0.0.1:29744**，与 Chrome 插件的 29743 端口分开。适用于本机脚本、桌面自动化及 AI 调用的本地工具；云端 AI 不能直接连接你的本机回环地址。

## 授权程序

解锁密码库，打开 **设置与恢复 → AI / 其他程序 → 管理程序 API 授权**。填写程序名、允许访问的 HTTPS 网站、有效期（5–480 分钟，默认 60 分钟），以及是否允许读取密码。网站按主机名和端口精确匹配，忽略路径，不支持通配符或子域名自动继承。

创建 Token 后，将其放入调用进程的 **EPASSWORD_API_TOKEN** 环境变量。Token 仅创建时显示，桌面端只在内存保存其哈希。不要把 Token 放入 AI 对话、源码、命令行参数、网页或日志。API Token 与 Chrome 插件配对码不能互换。

每个程序独立授权，可逐个撤销，或关闭整个 API。密码库锁定、修改主密码、退出应用时，所有 API Token 立即失效；重新解锁不会恢复旧授权。API 调用不延长五分钟自动锁定时间。最多同时保留 16 个有效授权。

勾选“允许读取账号密码用于填充”意味着调用程序能获取允许网站的密码明文；不勾选则只可查询账号列表。网站范围限制可读取的凭据，但服务端无法证明任意第三方程序最终把密码用到哪里，因此只授权受信任的本机程序。

## HTTP 接口

所有接口使用 POST、Authorization: Bearer TOKEN、Content-Type: application/json。请求必须使用准确的本机 Host。拒绝带浏览器 Origin / Sec-Fetch-Site 的请求，不开放 CORS 或远程监听。请求体最多 8 KB，每个 Token 每分钟最多 60 次调用。

| 接口 | 请求体 | 返回 / 权限 |
| --- | --- | --- |
| /v1/status | {} | 当前程序的网站范围、权限、有效期及最近使用时间，不含密码 |
| /v1/logins/search | {"url":"https://example.com/login"} | 匹配的 ID、标题、用户名；需要 logins:list |
| /v1/logins/credentials | {"url":"https://example.com/login","itemId":"ID"} | 单个账号的用户名、密码与规范化网站来源；需要 credentials:read |

匹配登录项目的网址及额外 URL 字段，排除归档/删除项目，严格匹配 HTTPS 主机名及非默认端口。读取凭据必须明确指定 itemId。API 不解锁密码库、不查询所有网站、不批量导出、不返回 OTP 设置密钥、不修改项目、不提交登录表单。

错误结构为 {"error":{"code":"origin_not_allowed","message":"..."}}。常见状态码：400 参数错误，401 Token 无效/过期/已撤销，403 来源/网站/权限拒绝，404 无匹配有效账号，429 超过频率限制。锁定后遇到 401，需要解锁并重新授权。[OpenAPI 3.1 定义](openapi.json) 可导入本地集成工具，不要将接口经代理暴露到公网。

## 从授权到填充

1. 在桌面应用中解锁密码库，为本机程序授权目标网站；需要填充时勾选读取密码权限。
2. 将创建时显示的 Token 提供给本机进程，先调用 /v1/status 检查权限与有效期。没有 HTTP 解锁、创建 Token 或刷新 Token 接口。
3. 调用 /v1/logins/search 查询目标网址，明确选择一个项目 ID；没有匹配时返回 200 和空 items 数组。
4. 使用下文的 client.fillPage(page, { url, itemId }) 填充。纯 HTTP 客户端可读取单个凭据，但需要自行实现浏览器控制。填充不会自动提交。

HTTP API 没有 /fill 接口；fillPage 是本机 SDK 方法。以上步骤同时适用于 Windows 和 macOS。

## 请求与响应示例

以下均为虚构数据，示例日期不代表实际授权有效期。每个请求均发送到本机基础地址，使用上述 Bearer 认证和 JSON 请求头；响应为 JSON，并带 Cache-Control: no-store。

### POST /v1/status

请求：

~~~json
{}
~~~

200 响应：

~~~json
{
  "apiVersion": "1",
  "unlocked": true,
  "client": {
    "id": "11111111-1111-4111-8111-111111111111",
    "name": "Local automation",
    "origins": [
      "https://example.com"
    ],
    "scopes": [
      "logins:list",
      "credentials:read"
    ],
    "expiresAt": "2026-09-26T10:00:00.000Z",
    "lastUsedAt": "2026-09-26T09:01:00.000Z"
  }
}
~~~

### POST /v1/logins/search

请求：

~~~json
{
  "url": "https://example.com/login"
}
~~~

200 响应：

~~~json
{
  "origin": "https://example.com",
  "items": [
    {
      "id": "22222222-2222-4222-8222-222222222222",
      "title": "Example account",
      "username": "demo@example.com"
    }
  ]
}
~~~

### POST /v1/logins/credentials

请求：

~~~json
{
  "url": "https://example.com/login",
  "itemId": "22222222-2222-4222-8222-222222222222"
}
~~~

200 响应：

~~~json
{
  "itemId": "22222222-2222-4222-8222-222222222222",
  "origin": "https://example.com",
  "username": "demo@example.com",
  "password": "EXAMPLE_ONLY_NOT_A_REAL_PASSWORD"
}
~~~

status 中的 apiVersion 是接口版本，不是桌面应用版本。client 只描述当前 Token 的授权，时间使用 UTC ISO 8601；lastUsedAt 可为空，但状态请求本身会更新最近使用时间。凭据响应中的 password 是明文，仅应在受信任的本机程序内用于填充。

### 网站匹配规则

如果授权 https://example.com，则 https://example.com:443/login 和该站点其他路径匹配；https://www.example.com、https://example.com:8443 和 http://example.com 不匹配。路径不能用于限定授权到某个页面。只有“登录信息”类别中未归档、未删除的项目可匹配；主网址或额外 URL 字段必须匹配，同时 Token 也必须授权该来源。

请求只能包含文档列出的字段。接口路径严格匹配，不支持分页参数、查询字符串或末尾斜杠。

## 错误码与恢复

按 error.code 判断错误，不要依赖 message 的完整文字。

~~~json
{
  "error": {
    "code": "origin_not_allowed",
    "message": "This client is not authorized for this exact HTTPS origin."
  }
}
~~~

| HTTP | error.code | 处理方式 |
| --- | --- | --- |
| 400 | invalid_json | 发送有效 JSON。 |
| 400 | invalid_request | 使用 JSON 对象，且只包含接口规定的字段。 |
| 400 | invalid_url | 使用不超过 2048 字符的完整 HTTPS URL，不要在 URL 中嵌入账号密码。 |
| 400 | invalid_item_id | 传入查询结果中的明确 itemId，长度 1–200 字符。 |
| 401 | unauthorized | 在桌面端解锁并重新授权，替换旧 Token。 |
| 403 | source_forbidden | 使用本机原生客户端和 127.0.0.1:29744，不从网页调用或使用 localhost 别名。 |
| 403 | origin_not_allowed | 为目标网站的准确来源重新创建授权。 |
| 403 | scope_required | 在桌面端授予所需权限。 |
| 404 | not_found | 检查接口路径，不添加查询参数或末尾斜杠。 |
| 404 | login_not_found | 重新查询，检查项目网址以及归档、删除状态。 |
| 405 | method_not_allowed | 所有接口（包括状态查询）均使用 POST。 |
| 413 | body_too_large | UTF-8 请求体不能超过 8192 字节。 |
| 415 | unsupported_media_type | 使用 application/json，可附加 charset=utf-8。 |
| 423 | locked | 解锁并重新授权。正常桌面锁定会撤销 Token，因此通常返回 401。 |
| 429 | rate_limited | 等待下一个 60 秒窗口，不要立即循环重试。 |
| 500 | internal_error | 检查桌面应用，稍后重试，排查日志不要包含机密。 |

限流按每个 Token 的固定 60 秒窗口统计，通过认证后失败的请求也可能计数。响应不提供 Retry-After；遇到 429 可等待 60 秒后再试。401 需要人工重新授权，不应无限重试旧 Token。

连接被拒绝或 SDK 提示 API unavailable 时，检查桌面应用是否运行且已创建程序授权、API 是否已停止，以及 29744 端口是否被其他进程占用。使用 29743 插件端口不能调用这些接口。

## Node.js / Playwright 调用

零依赖客户端使用 Node.js 24 的 fetch，位于仓库及一体安装目录的 integrations/ 下。只有调用程序使用 Playwright 时才需要自行安装该库。此 API 填充助手不依赖 Chrome 插件。

~~~js
const { EpasswordClient } = require('./integrations/epassword-client.cjs');

// Token 由用户在进程环境中提供，不进入 AI 对话。
async function fillLogin(page) {
  const client = new EpasswordClient();
  const target = 'https://example.com/login';
  const { items } = await client.search(target);
  const choices = items.filter(item => item.username === 'your-account');
  if (choices.length !== 1) throw new Error('请明确选择唯一的匹配账号');
  const item = choices[0];

  // page 是调用程序已经控制的 Playwright Page。
  await page.goto(target);
  const result = await client.fillPage(page, { url: target, itemId: item.id });
  return result;
}
// 只返回 filled/origin/usernameFilled，不返回密码，也不提交表单。
~~~

fillPage 在读取凭据前后检查网页地址，并在实际页面内再次检查来源后设置字段。拒绝 iframe、跨域提交表单、多个可见密码框及 autocomplete=new-password。复杂控件或分步登录可以由受信任的程序使用 client.credentials(url, itemId) 自行适配。

密码会经过本机调用进程内存并填入网页。应关闭可能记录 evaluate 参数、请求或已填表单的自动化追踪/录像，不要把含凭据的网页转储发给模型。助手自身不打印密码且只返回填充状态，但无法控制调用方追踪或网站脚本。

### SDK 方法

| 方法 | 返回 |
| --- | --- |
| client.status() | 当前授权状态 |
| client.search(url) | { origin, items }，不含密码 |
| client.credentials(url, itemId) | { itemId, origin, username, password }，包含明文密码 |
| client.fillPage(page, { url, itemId }) | { filled: true, origin, usernameFilled }，不含密码 |

所有方法均异步。HTTP 错误会抛出带 code、status 的 Error；连接失败或本机填充校验失败可能没有这两个字段。默认请求超时为 5 秒。构造函数可显式传入 { token, baseUrl }，但 baseUrl 只接受本机 127.0.0.1 的 HTTP 地址。

## Python 与其他程序

使用原生 HTTP 客户端，不从网页 fetch 调用。例如 Python 标准库查询账号：

~~~python
import getpass, json, os, urllib.request
token = os.environ.get("EPASSWORD_API_TOKEN") or getpass.getpass("Epassword API token: ")
request = urllib.request.Request(
    "http://127.0.0.1:29744/v1/logins/search",
    data=json.dumps({"url": "https://example.com/login"}).encode(),
    headers={"Authorization": "Bearer " + token,
             "Content-Type": "application/json"},
    method="POST",
)
with urllib.request.urlopen(request, timeout=5) as response:
    items = json.load(response)["items"]
# 明确选择项目 ID；如果读取密码，仅保留在本机内存中用于填充。
~~~

给 AI 提供本地 fill_login(url, item_id) 这样的窄接口，由程序内部调用填充助手，只向模型返回成功/失败，不默认把原始密码响应送进模型。

## 验证

npm test 覆盖授权、网站/权限边界、过期、撤销、请求处理中撤销及限流。npm run test:api 使用真实桌面授权界面和隔离 Chromium 页面，包含请求期间跳转网页的拒绝测试。测试仅使用模拟数据。

[README](https://github.com/EXP-Tools/Epassword/blob/master/README.zh-CN.md)
