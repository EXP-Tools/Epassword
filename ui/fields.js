const extraTypes={question:'安全问题',text:'文本',url:'URL',email:'电子邮件',address:'地址',date:'日期',otp:'一次性密码',password:'密码',phone:'电话'};
function extraDetails(item){
 if(!item.fields?.length)return '';
 return `<div class="card extra-details">${item.fields.map(field=>{
  const secret=['password','question'].includes(field.type);
  return `<div class="field" data-extra-id="${esc(field.id)}"><div class="field-data extra-copy" role="button" tabindex="0" title="点击复制" aria-label="复制${esc(field.label)}"><label>${esc(field.label)} · ${extraTypes[field.type]}</label><div class="value ${secret?'secret':''} ${field.type==='otp'?'otp-code':''}">${field.type==='otp'?'------':secret?'••••••••••••':esc(field.value||'—')}</div>${field.type==='otp'?'<small class="otp-countdown">正在获取验证码…</small>':''}</div>${secret?'<button type="button" class="extra-reveal">显示</button>':''}<button type="button" class="extra-copy-button">复制</button>${field.type==='url'?'<button type="button" class="extra-open">打开 ↗</button>':''}</div>`;
 }).join('')}</div>`;
}
function bindExtraDetails(item){
 document.querySelectorAll('[data-extra-id]').forEach(row=>{
  const field=item.fields.find(f=>f.id===row.dataset.extraId);let revealed=false;
  const copy=()=>run(async()=>{if(field.type==='otp')await call('otp-copy',item.id,field.id);else await call('copy',field.value);toast(`${field.label}已复制`);});
  row.querySelector('.extra-copy').onclick=copy;row.querySelector('.extra-copy-button').onclick=copy;
  row.querySelector('.extra-copy').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();copy();}};
  const reveal=row.querySelector('.extra-reveal');if(reveal)reveal.onclick=()=>{revealed=!revealed;row.querySelector('.value').textContent=revealed?field.value:'••••••••••••';reveal.textContent=revealed?'隐藏':'显示';};
  const open=row.querySelector('.extra-open');if(open)open.onclick=()=>run(()=>call('website',field.value));
 });
 refreshOtp();
}
let otpRefreshing=false;
async function refreshOtp(){
 if(otpRefreshing||typeof state==='undefined'||!state.items||!document.querySelector('.otp-code'))return;
 const itemId=state.selected;const anchor=document.querySelector('.extra-details');otpRefreshing=true;
 try{const codes=await call('otp-codes',itemId);if(!anchor?.isConnected||!state.items||state.selected!==itemId)return;
  for(const code of codes){const row=[...anchor.querySelectorAll('[data-extra-id]')].find(el=>el.dataset.extraId===code.id);if(!row)continue;row.querySelector('.otp-code').textContent=code.code;row.querySelector('.otp-countdown').textContent=`${code.remaining} 秒后刷新 · 点击复制`;}
 }catch{if(anchor?.isConnected){anchor.querySelectorAll('.otp-code').forEach(el=>el.textContent='------');anchor.querySelectorAll('.otp-countdown').forEach(el=>el.textContent='暂时无法生成验证码');}}
 finally{otpRefreshing=false;}
}
setInterval(refreshOtp,1000);

function mountExtraEditor(modal,item){
 const section=document.createElement('section');section.className='extra-editor';
 section.innerHTML='<h3>更多信息</h3><div class="extra-rows"></div><div class="row"><select class="extra-type" aria-label="新增字段类型">'+Object.entries(extraTypes).map(([key,value])=>`<option value="${key}">${value}</option>`).join('')+'</select><button type="button" class="add-extra">＋ 添加更多</button></div><p class="generator-hint">可添加多个字段和多个一次性密码。</p>';
 const form=modal.querySelector('form');form.insertBefore(section,form.querySelector('.actions'));
 section.querySelector('.add-extra').onclick=()=>addExtraRow(section,{type:section.querySelector('.extra-type').value});
 (item.fields||[]).forEach(field=>addExtraRow(section,field));
}
function addExtraRow(section,field){
 if(section.querySelectorAll('.extra-edit-row').length>=100){toast('最多添加 100 个字段');return;}
 const row=document.createElement('div');row.className='extra-edit-row';row.dataset.fieldId=field.id||crypto.randomUUID();row.dataset.fieldType=field.type;
 const sensitive=['password','question','otp'].includes(field.type);const multiline=['text','address'].includes(field.type);
 row.innerHTML=`<div class="row"><span class="extra-kind">${extraTypes[field.type]}</span><button type="button" class="remove-extra danger">移除</button></div><label>字段名称${field.type==='question'?' / 安全问题':''}</label><input class="extra-label" aria-label="字段名称" maxlength="200" required value="${esc(field.label||extraTypes[field.type])}"><label>${field.type==='otp'?'设置密钥或 otpauth://totp 链接':field.type==='question'?'答案':'内容'}</label><div class="row">${multiline?`<textarea class="extra-value" aria-label="字段内容" maxlength="30000">${esc(field.value||'')}</textarea>`:`<input class="extra-value" aria-label="字段内容" type="${sensitive?'password':field.type==='date'?'date':field.type==='email'?'email':field.type==='phone'?'tel':'text'}" autocomplete="off" maxlength="${field.type==='otp'?4096:30000}" ${field.type==='otp'?'required':''} value="${esc(field.value||'')}">`}${sensitive?'<button type="button" class="toggle-extra">显示</button>':''}</div>${field.type==='otp'?'<div class="actions otp-actions"><button type="button" class="scan-screen">▣ 扫描屏幕二维码</button><button type="button" class="scan-image">导入二维码图片</button><button type="button" class="check-otp">检查配置</button></div><p class="generator-hint">手动密钥默认 SHA1 / 6 位 / 30 秒；二维码链接保留算法、位数和周期。扫码时窗口会暂时隐藏，请先将二维码显示在屏幕上。</p><div class="scan-result" role="status"></div>':''}`;
 section.querySelector('.extra-rows').append(row);
 row.querySelector('.remove-extra').onclick=()=>row.remove();
 const toggle=row.querySelector('.toggle-extra');if(toggle)toggle.onclick=()=>{const input=row.querySelector('.extra-value');input.type=input.type==='password'?'text':'password';toggle.textContent=input.type==='password'?'显示':'隐藏';};
 if(field.type==='otp'){
  const status=row.querySelector('.scan-result');const value=row.querySelector('.extra-value');
  row.querySelector('.check-otp').onclick=()=>run(async()=>{const result=await call('otp-parse',value.value);if(row.isConnected)status.textContent=`有效配置：${result.issuer||result.label||'手动密钥'} · ${result.algorithm} / ${result.digits} 位 / ${result.period} 秒`;});
  const scan=mode=>run(async()=>{
   status.textContent=mode==='screen'?'正在扫描屏幕…':'请选择二维码图片…';
   let results;try{results=await call('otp-scan',mode);}catch(error){if(row.isConnected)status.textContent=error.message;return;}
   if(!row.isConnected)return;status.replaceChildren();if(!results.length){status.textContent='已取消导入';return;}
   const apply=result=>{value.value=result.uri;if(!field.label||row.querySelector('.extra-label').value==='一次性密码')row.querySelector('.extra-label').value=result.issuer||result.label||'一次性密码';status.textContent=`已识别 ${result.issuer||result.label||'OTP'}，保存项目后开始生成验证码。`;};
   if(results.length===1)apply(results[0]);else{const label=document.createElement('p');label.textContent='发现多个 OTP，请选择要添加的账户：';status.append(label);results.forEach(result=>{const button=document.createElement('button');button.type='button';button.textContent=result.label||result.issuer||'OTP';button.onclick=()=>apply(result);status.append(button);});}
  });
  if(api.platform==='darwin'){const button=document.createElement('button');button.type='button';button.textContent='屏幕录制权限设置';button.onclick=()=>run(()=>call('screen-settings'));row.querySelector('.otp-actions').append(button);}row.querySelector('.scan-screen').onclick=()=>scan('screen');row.querySelector('.scan-image').onclick=()=>scan('image');
 }
}
function readExtraEditor(modal){return [...modal.querySelectorAll('.extra-edit-row')].map(row=>({id:row.dataset.fieldId,type:row.dataset.fieldType,label:row.querySelector('.extra-label').value.trim(),value:row.querySelector('.extra-value').value}));}
