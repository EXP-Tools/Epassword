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

## Python 与其他程序

使用原生 HTTP 客户端，不从网页 fetch 调用。例如 Python 标准库查询账号：

~~~python
import json, os, urllib.request
request = urllib.request.Request(
    "http://127.0.0.1:29744/v1/logins/search",
    data=json.dumps({"url": "https://example.com/login"}).encode(),
    headers={"Authorization": "Bearer " + os.environ["EPASSWORD_API_TOKEN"],
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

[README](../README.zh-CN.md)
