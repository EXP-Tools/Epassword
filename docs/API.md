# Local API for AI and programs

**English** | [简体中文](API.zh-CN.md)

The API is disabled until you authorize a program. It listens only on **http://127.0.0.1:29744**, separately from the Chrome extension bridge on port 29743. It works with local scripts, desktop automation and a local tool used by an AI agent. A remote/cloud agent cannot connect directly to your loopback address.

## Authorize a program

Unlock your vault, open **Settings → AI / 其他程序 → 管理程序 API 授权**, and enter a program name, allowed HTTPS websites, expiration (5–480 minutes; default 60), and whether it may read passwords. Each hostname and port must be listed explicitly; no wildcards or automatic subdomain inheritance. Paths are ignored.

Create the token and place it in the calling process's **EPASSWORD_API_TOKEN** environment variable. It is shown only at creation; Epassword retains a token hash in memory. Do not put the token in an AI conversation, source file, command-line argument, browser page or log. Browser pairing codes and API tokens are not interchangeable.

Each program has its own token. Revoke one token or stop the whole API from the same dialog. All tokens are revoked when the vault locks, the master password changes, or Epassword exits; unlocking does not restore old API tokens. API traffic does not reset the five-minute idle-lock timer. Up to 16 authorizations can be active at once.

Checking “允许读取账号密码用于填充” permits the calling program to obtain plaintext credentials for the allowed sites. Leave it unchecked for account-list access only. Site scoping limits which credentials a token may retrieve; the server cannot prove where arbitrary client software subsequently uses them. Authorize only trusted local programs.

## HTTP contract

All routes use POST, Authorization: Bearer TOKEN, and Content-Type: application/json. Requests must use the exact loopback Host. Browser Origin / Sec-Fetch-Site headers are rejected; there is no CORS access and no remote bind option. Bodies are limited to 8 KB; each token allows 60 requests per minute.

| Endpoint | Body | Result / permission |
| --- | --- | --- |
| /v1/status | {} | This client's scopes, origins, expiry and last-use time; no passwords |
| /v1/logins/search | {"url":"https://example.com/login"} | Matching id/title/username; logins:list |
| /v1/logins/credentials | {"url":"https://example.com/login","itemId":"ID"} | One username/password and canonical origin; credentials:read |

Matching uses the item's website and extra URL fields, excludes archived/deleted items, and requires exact HTTPS origin including non-default ports. Credentials always require an explicit itemId. The API does not unlock vaults, search every site, export an entire vault, return OTP setup secrets, modify entries or submit login forms.

Errors use {"error":{"code":"origin_not_allowed","message":"..."}}. Common status codes are 400 invalid input, 401 expired/revoked/invalid token, 403 source/domain/scope denied, 404 no active match, and 429 rate limited. Unlock and create a new token after lock-related 401 errors. [OpenAPI 3.1 contract](openapi.json) can be imported into local integration tools; never expose the local API through a public proxy.

## Node.js / Playwright

The dependency-free client uses Node.js 24's fetch and is included in the repository under integrations/ and the combined install directory under integrations/. Playwright is needed only by your automation program. The Chrome extension is not required for this API helper.

~~~js
const { EpasswordClient } = require('./integrations/epassword-client.cjs');

// The user supplies EPASSWORD_API_TOKEN to this process, outside the AI conversation.
async function fillLogin(page) {
  const client = new EpasswordClient();
  const target = 'https://example.com/login';
  const { items } = await client.search(target);
  // Select a specific account explicitly. Do not choose randomly if several match.
  const choices = items.filter(item => item.username === 'your-account');
  if (choices.length !== 1) throw new Error('Select one unambiguous existing account');
  const item = choices[0];

  // page is the existing Playwright Page controlled by this local program.
  await page.goto(target);
  const result = await client.fillPage(page, { url: target, itemId: item.id });
  return result;
}
// result contains filled/origin/usernameFilled, never the password.
// Submission is a separate action governed by your automation's instructions.
~~~

fillPage checks the current page before and after retrieving the credential, then checks again in the target document before setting inputs. It refuses iframes, cross-origin form actions, multiple visible password fields and autocomplete=new-password. It does not submit the form. Nonstandard forms and multi-step logins may require your own trusted adapter using client.credentials(url, itemId).

Passwords necessarily exist in the local client's memory and the target page. Disable automation traces, request logging and recordings that could capture evaluate arguments or filled form values; do not send page dumps containing secrets to a model. The helper itself does not log credentials and returns only fill status, but cannot control a caller's tracing or a website's scripts.

## Python and other clients

Use a native HTTP client, not a browser fetch. This account-list example uses only the Python standard library:

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
# Choose an explicit item ID. Keep credentials in local memory if reading them.
~~~

For an AI tool, expose a narrow operation such as fill_login(url, item_id) that calls the helper locally and returns only success/failure. Do not make a general read-password tool that sends raw responses to the model by default.

## Validation

npm test covers authorization, scope/domain boundaries, expiry, revocation, in-flight request invalidation and rate limits. npm run test:api tests the real desktop authorization UI and an isolated Chromium/Playwright page, including navigation during a credential request. Fixtures contain no real vault data.

[README](../README.md)
