const http = require('node:http');
const {randomBytes, timingSafeEqual} = require('node:crypto');

const PORT = 29743;
function siteOrigin(value) {
  try {
    const u = new URL(value);
    if (u.protocol !== 'https:' || u.username || u.password || u.hostname.endsWith('.')) return null;
    return u.origin;
  } catch { return null; }
}
function matches(item, origin) {
  if (item.category !== '登录信息' || item.deleted === 'true' || item.archived === 'true') return false;
  return [item.url, ...(item.fields || []).filter(f => f.type === 'url').map(f => f.value)]
    .some(url => siteOrigin(url) === origin);
}
class BrowserBridge {
  constructor({vault, save, confirm, changed, port = PORT}) {
    Object.assign(this, {vault, save, confirm, changed, port});
    this.server = null; this.token = null; this.client = null; this.pending = false; this.results = new Map();
  }
  async start() {
    if (!this.vault.items) throw Error('请先解锁密码库');
    if (!this.server) {
      const server = http.createServer((req, res) => this.handle(req, res));
      server.requestTimeout = 10000; server.headersTimeout = 10000;
      server.maxHeadersCount = 20;
      await new Promise((resolve, reject) => {
        server.once('error', reject);
        server.listen(this.port, '127.0.0.1', () => { server.removeListener('error', reject); resolve(); });
      });
      server.on('error', () => {});
      this.server = server;
    }
    // A new code revokes the previous browser session.
    this.token = randomBytes(32).toString('base64url'); this.client = null;
    return this.token;
  }
  stop() {
    this.token = null; this.client = null; this.results.clear();
    this.server?.closeAllConnections(); this.server?.close(); this.server = null;
  }
  status() { return {enabled:!!this.server, paired:!!this.client}; }
  async handle(req, res) {
    const reply = (status, data) => {
      if (!res.destroyed && !res.writableEnded) {
        res.writeHead(status, {'Content-Type':'application/json', 'Cache-Control':'no-store', 'X-Content-Type-Options':'nosniff'});
        res.end(JSON.stringify(data));
      }
    };
    try {
      const origin = req.headers.origin;
      const client = req.headers['x-epassword-client'];
      const validOrigin = typeof origin === 'string' && /^chrome-extension:\/\/[a-p]{32}$/.test(origin);
      if (req.headers.host !== '127.0.0.1:' + this.port || (origin && !validOrigin)) return reply(403, {error:'非法来源'});
      if (validOrigin) {
        res.setHeader('Access-Control-Allow-Origin', origin);
        res.setHeader('Vary', 'Origin');
      }
      if (req.method === 'OPTIONS' && validOrigin) {
        res.setHeader('Access-Control-Allow-Methods', 'POST');
        res.setHeader('Access-Control-Allow-Headers', 'content-type, authorization, x-epassword-client');
        return reply(204, {});
      }
      if (req.method !== 'POST' || !/^[a-p]{32}$/.test(client || '') ||
          (origin && origin !== 'chrome-extension://' + client) ||
          req.headers['content-type'] !== 'application/json') return reply(403, {error:'非法请求'});
      const supplied = Buffer.from((req.headers.authorization || '').replace(/^Bearer /, ''));
      const expected = Buffer.from(this.token || '');
      if (!expected.length || supplied.length !== expected.length || !timingSafeEqual(supplied, expected) ||
          (this.client && this.client !== client)) return reply(401, {error:'请重新配对 Epassword'});
      if (!this.vault.items) return reply(423, {error:'请先在 Epassword 解锁密码库'});
      const token = this.token, generation = this.vault.generation;
      let size = 0, chunks = [];
      for await (const chunk of req) {
        size += chunk.length;
        if (size > 48000) return reply(413, {error:'请求过大'});
        chunks.push(chunk);
      }
      const body = JSON.parse(Buffer.concat(chunks).toString('utf8'));
      chunks = [];
      if (!body || typeof body !== 'object' || Array.isArray(body)) throw Error('请求格式错误');
      const current = () => {
        if (!this.vault.items || generation !== this.vault.generation || token !== this.token) throw Error('连接或密码库已锁定，请重试');
      };
      current();
      if (req.url === '/pair') { this.client = client; return reply(200, {paired:true}); }
      if (this.client !== client) return reply(401, {error:'请先配对'});
      const site = siteOrigin(body.url);
      if (!site) return reply(400, {error:'仅支持 HTTPS 网站'});
      if (req.url === '/matches') {
        return reply(200, {items:this.vault.items.filter(i => matches(i, site)).map(i => ({id:i.id,title:i.title,username:i.username}))});
      }
      if (req.url === '/fill') {
        const item = this.vault.items.find(i => i.id === body.id && matches(i, site));
        if (!item) return reply(404, {error:'此网站没有对应账号'});
        return reply(200, {username:item.username,password:item.password,origin:site});
      }
      if (req.url === '/save-result') {
        const result = this.results.get(body.requestId);
        if (!result || result.token !== token) return reply(404, {error:'保存请求已过期'});
        return reply(result.error ? 400 : 200, result.error ? {error:result.error} : {pending:result.pending,saved:result.saved});
      }
      if (req.url === '/save') {
        if (this.pending) return reply(409, {error:'请先处理桌面端的保存确认'});
        if (typeof body.username !== 'string' || body.username.length > 1000 ||
            typeof body.password !== 'string' || !body.password || body.password.length > 4000) throw Error('账号或密码格式无效');
        this.pending = true;
        try {
          const draft = {url:site,username:body.username,password:body.password};
          const requestId = randomBytes(16).toString('hex'), deadline = Date.now() + 120000;
          for (const [id,result] of this.results) if (result.expires < Date.now()) this.results.delete(id);
          const result = {token,pending:true,saved:false,expires:Date.now()+300000};
          this.results.set(requestId,result);
          // Reply before native UI: Chrome limits the time to receive fetch response headers.
          reply(200, {requestId});
          void (async () => {
            try {
              const allowed = await this.confirm(draft);
              current();
              if (Date.now() > deadline) throw Error('保存确认已超时，请重新发起');
              if (allowed) { await this.save(draft, generation); current(); this.changed(); result.saved=true; }
            } catch(error) { result.error=error.message; }
            finally { result.pending=false; this.pending=false; }
          })();
          return;
        } catch(error) { this.pending=false; throw error; }
      }
      return reply(404, {error:'未知操作'});
    } catch (error) { reply(400, {error:error instanceof SyntaxError ? '请求格式错误' : error.message}); }
  }
}
module.exports = {BrowserBridge, siteOrigin, matches, PORT};
