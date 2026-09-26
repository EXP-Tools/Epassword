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

## From authorization to filling

1. Unlock the vault in the desktop app and authorize the target site for your local program. Enable password reading if it needs to fill a form.
2. Supply the newly issued token to the local process. Call /v1/status to check its scopes and expiry. There are no HTTP unlock, token creation or token refresh endpoints.
3. Call /v1/logins/search for the target URL and explicitly choose one item ID. No matches returns 200 with an empty items array.
4. Use client.fillPage(page, { url, itemId }) below. A plain HTTP client can retrieve one credential but must implement browser control itself. Filling does not submit the form.

There is no HTTP /fill endpoint: fillPage is a local SDK method. These steps apply to both Windows and macOS.

## Request and response examples

All values below are fictional; example dates do not indicate a real authorization lifetime. Send each request to the local base URL with the Bearer and JSON headers described above. Responses are JSON with Cache-Control: no-store.

### POST /v1/status

Request:

~~~json
{}
~~~

200 response:

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

Request:

~~~json
{
  "url": "https://example.com/login"
}
~~~

200 response:

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

Request:

~~~json
{
  "url": "https://example.com/login",
  "itemId": "22222222-2222-4222-8222-222222222222"
}
~~~

200 response:

~~~json
{
  "itemId": "22222222-2222-4222-8222-222222222222",
  "origin": "https://example.com",
  "username": "demo@example.com",
  "password": "EXAMPLE_ONLY_NOT_A_REAL_PASSWORD"
}
~~~

apiVersion in status is the API version, not the desktop app version. client describes only the current token; timestamps use UTC ISO 8601. lastUsedAt is nullable, but the status request itself updates it. The credential response contains a plaintext password; keep it inside the trusted local filling program.

### Website matching

If https://example.com is authorized, https://example.com:443/login and other paths on that site match. https://www.example.com, https://example.com:8443 and http://example.com do not. Paths cannot restrict authorization to a single page. Only active login-category items match: the primary website or an extra URL field must match, and the token must authorize that origin too.

Requests accept only documented fields. Paths match exactly; pagination parameters, query strings and trailing slashes are unsupported.

## Errors and recovery

Branch on error.code rather than exact message text.

~~~json
{
  "error": {
    "code": "origin_not_allowed",
    "message": "This client is not authorized for this exact HTTPS origin."
  }
}
~~~

| HTTP | error.code | Recovery |
| --- | --- | --- |
| 400 | invalid_json | Send valid JSON. |
| 400 | invalid_request | Send an object with only the documented fields. |
| 400 | invalid_url | Use a complete HTTPS URL of at most 2048 characters, without embedded credentials. |
| 400 | invalid_item_id | Pass an explicit itemId of 1–200 characters from search. |
| 401 | unauthorized | Unlock and authorize again in the desktop app; replace the old token. |
| 403 | source_forbidden | Use a native local client and 127.0.0.1:29744, not a browser request or localhost alias. |
| 403 | origin_not_allowed | Create authorization for the exact intended origin. |
| 403 | scope_required | Authorize the required scope in the desktop app. |
| 404 | not_found | Check the exact path; omit query strings and trailing slashes. |
| 404 | login_not_found | Search again; check the account website, archive and trash state. |
| 405 | method_not_allowed | Use POST for every route, including status. |
| 413 | body_too_large | Keep the UTF-8 request body within 8192 bytes. |
| 415 | unsupported_media_type | Use application/json, optionally with charset=utf-8. |
| 423 | locked | Unlock and authorize again. Normal desktop locking usually returns 401 because it revokes tokens. |
| 429 | rate_limited | Wait for the next 60-second window; do not retry in a tight loop. |
| 500 | internal_error | Check the desktop app and retry later without logging secrets. |

Rate limiting uses a fixed 60-second window per token; requests that fail after authentication can still count. There is no Retry-After header; waiting 60 seconds before retrying a 429 is sufficient. A 401 requires renewed desktop authorization rather than repeatedly retrying the old token.

For connection refused or SDK API unavailable errors, check that the desktop app is running, a program has been authorized, the API has not been stopped, and port 29744 is available. The extension port 29743 does not serve these routes.

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

### SDK methods

| Method | Returns |
| --- | --- |
| client.status() | Current authorization status |
| client.search(url) | { origin, items }, without passwords |
| client.credentials(url, itemId) | { itemId, origin, username, password }, including the plaintext password |
| client.fillPage(page, { url, itemId }) | { filled: true, origin, usernameFilled }, without the password |

All methods are asynchronous. HTTP failures throw an Error with code and status; connection or local filling validation failures may omit those fields. Requests time out after five seconds. The constructor also accepts { token, baseUrl }, but baseUrl must be an HTTP address on 127.0.0.1.

## Python and other clients

Use a native HTTP client, not a browser fetch. This account-list example uses only the Python standard library:

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
# Choose an explicit item ID. Keep credentials in local memory if reading them.
~~~

For an AI tool, expose a narrow operation such as fill_login(url, item_id) that calls the helper locally and returns only success/failure. Do not make a general read-password tool that sends raw responses to the model by default.

## Validation

npm test covers authorization, scope/domain boundaries, expiry, revocation, in-flight request invalidation and rate limits. npm run test:api tests the real desktop authorization UI and an isolated Chromium/Playwright page, including navigation during a credential request. Fixtures contain no real vault data.

[README](https://github.com/EXP-Tools/Epassword/blob/master/README.md)
