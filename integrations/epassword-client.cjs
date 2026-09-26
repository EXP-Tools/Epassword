const DEFAULT_BASE='http://127.0.0.1:29744';
function originOf(value) {
 const url=new URL(value);
 if(url.protocol!=='https:'||url.username||url.password||url.hostname.endsWith('.'))throw Error('An exact HTTPS origin is required.');
 return url.origin;
}
class EpasswordClient {
 constructor({token=process.env.EPASSWORD_API_TOKEN,baseUrl=DEFAULT_BASE}={}) {
  const base=new URL(baseUrl);
  if(base.protocol!=='http:'||base.hostname!=='127.0.0.1'||base.username||base.password||base.pathname!=='/'||base.search||base.hash)throw Error('API must use an explicit loopback HTTP address.');
  if(typeof token!=='string'||!/^epw\.[0-9a-f-]{36}\.[A-Za-z0-9_-]{43}$/.test(token))throw Error('Set EPASSWORD_API_TOKEN in this local process.');
  // Keep tokens out of ordinary object inspection and JSON serialization.
  Object.defineProperty(this,'token',{value:token,enumerable:false});
  this.baseUrl=base.origin;
 }
 async request(endpoint,body) {
  let response;
  try{response=await fetch(this.baseUrl+endpoint,{method:'POST',headers:{Authorization:'Bearer '+this.token,'Content-Type':'application/json'},
   body:JSON.stringify(body),redirect:'error',cache:'no-store',signal:AbortSignal.timeout(5000)});}
  catch{throw Error('Epassword API unavailable. Open the desktop app and authorize this program.');}
  const result=await response.json();
  if(!response.ok){const e=new Error(result.error?.message||'Epassword request failed');e.code=result.error?.code;e.status=response.status;throw e;}
  return result;
 }
 status(){return this.request('/v1/status',{});}
 search(url){return this.request('/v1/logins/search',{url});}
 credentials(url,itemId){return this.request('/v1/logins/credentials',{url,itemId});}
 async fillPage(page,{url,itemId}={}) {
  if(!url||!itemId)throw Error('Specify an intended HTTPS URL and an explicit itemId.');
  const origin=originOf(url);
  if(originOf(page.url())!==origin)throw Error('The active page does not match the intended origin.');
  let credential=await this.credentials(url,itemId);
  try {
   if(credential.origin!==origin||originOf(page.url())!==origin)throw Error('The page changed before filling.');
   // Perform the final origin/form check and both assignments within one document evaluation.
   const result=await page.evaluate(({credential,origin})=>{
    if(window.top!==window||location.origin!==origin)return {filled:false,error:'Page origin changed.'};
    const visible=i=>!i.disabled&&!i.readOnly&&i.getClientRects().length>0&&getComputedStyle(i).visibility==='visible'&&getComputedStyle(i).display!=='none';
    const passwords=[...document.querySelectorAll('input[type=password]')].filter(visible);
    if(passwords.length!==1||passwords[0].autocomplete.split(' ').includes('new-password'))return {filled:false,error:'Expected one visible login password field.'};
    const password=passwords[0],form=password.form;
    const safeAction=()=>!form||(new URL(form.action||location.href,location.href).origin===origin&&
     [...form.querySelectorAll('[formaction]')].every(b=>new URL(b.formAction,location.href).origin===origin));
    if(!safeAction())return {filled:false,error:'Cross-origin form action refused.'};
    const inputs=[...document.querySelectorAll('input')].filter(i=>visible(i)&&i.form===form);
    const username=inputs.find(i=>i.autocomplete.split(' ').includes('username')&&['text','email','tel'].includes(i.type))||
     inputs.find(i=>i.type==='email')||inputs.find(i=>['text','tel'].includes(i.type)&&/user|login|email|account|phone|mobile/i.test(i.name+' '+i.id));
    const set=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set;
    // Set both values before firing page handlers; never submit the form.
    if(username)set.call(username,credential.username);
    set.call(password,credential.password);
    for(const input of [username,password].filter(Boolean)){
     input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
    }
    return {filled:true,origin,usernameFilled:!!username};
   },{credential,origin});
   if(!result.filled)throw Error(result.error||'No supported login form.');
   return result;
  }catch(e) {
   // Playwright errors can contain call arguments: never propagate those to an AI/log.
   if(['The page changed before filling.','Expected one visible login password field.','Cross-origin form action refused.','Page origin changed.','No supported login form.'].includes(e.message))throw Error(e.message);
   throw Error('Page filling failed; inspect the page without logging credentials.');
  }finally{credential=null;}
 }
}
module.exports={EpasswordClient};
