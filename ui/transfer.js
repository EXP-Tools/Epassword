
function transferRows(items){
 return items.map(i=>'<label class="transfer-item"><input type="checkbox" name="transfer-id" value="'+esc(i.id)+'" checked><span><strong>'+esc(i.title)+'</strong><small>'+esc(i.username||i.category)+(i.deleted==='true'?' · 回收站':i.archived==='true'?' · 已归档':'')+'</small></span></label>').join('');
}
function bindTransferSelection(m){
 const all=m.querySelector('#transfer-all'),rows=[...m.querySelectorAll('[name=transfer-id]')];
 const update=()=>{const n=rows.filter(r=>r.checked).length;all.checked=rows.length>0&&n===rows.length;all.indeterminate=n>0&&n<rows.length;m.querySelector('#transfer-count').textContent='已选 '+n+' / '+rows.length+' 个项目';};
 all.onchange=()=>{rows.forEach(r=>r.checked=all.checked);update();};rows.forEach(r=>r.onchange=update);update();
}
function selectedTransferIds(m){return [...m.querySelectorAll('[name=transfer-id]:checked')].map(r=>r.value);}
function exportExcel(){
 const m=modal('<h2>导出 Excel</h2><p class="hint">选择需要导出的项目。包含项目的密码、自定义字段及 OTP 设置密钥；不会修改当前密码库。请选择新的文件名。</p><div class="transfer-select"><label><input type="checkbox" id="transfer-all"> 全选</label><small id="transfer-count"></small></div><div class="transfer-list">'+transferRows(state.items)+'</div><form id="export-form"><label class="transfer-option"><input type="checkbox" id="export-encrypted" checked> 导出为加密 Excel</label><div id="export-passwords"><label>导出文件主密码（12–255 个字符）</label><input id="export-password" type="password" minlength="12" maxlength="255" required autocomplete="new-password"><label>确认导出主密码</label><input id="export-confirm" type="password" required maxlength="255" autocomplete="new-password"><p class="hint">这是导出文件独立的 Excel 打开密码，不会更改当前密码库主密码。</p></div><p id="plain-warning" class="error" hidden>未加密文件中的账号、密码和 OTP 密钥可被直接读取。请妥善保管。</p><div class="actions"><button type="button" data-close>取消</button><button type="submit" class="primary">导出所选项目</button></div></form>');
 bindTransferSelection(m);
 m.querySelector('#export-encrypted').onchange=e=>{
  const enabled=e.target.checked;m.querySelector('#export-passwords').hidden=!enabled;m.querySelector('#plain-warning').hidden=enabled;
  for(const id of ['export-password','export-confirm']){const field=m.querySelector('#'+id);field.required=enabled;field.disabled=!enabled;if(!enabled)field.value='';}
 };
 m.querySelector('form').onsubmit=e=>{e.preventDefault();const encrypted=m.querySelector('#export-encrypted').checked,password=m.querySelector('#export-password').value;
  if(encrypted&&password!==m.querySelector('#export-confirm').value)return toast('两次导出主密码不一致');
  const ids=selectedTransferIds(m);if(!ids.length)return toast('请选择至少一个项目');
  void run(async()=>{const result=await call('transfer-export',{ids,encrypted,password:encrypted?password:''});if(!result.canceled){m.remove();toast('已导出 '+result.count+' 个项目');}});
 };
}
function importExcel(){
 const m=modal('<h2>导入 Excel</h2><button type="button" id="switch-share">导入分享密文</button><p class="hint">支持 Epassword 格式的普通或加密 Excel。先预览再选择项目，导入会追加为新项目，不覆盖现有账号；重复导入会产生副本。</p><label>来源文件主密码（未加密文件留空）</label><input id="import-password" type="password" maxlength="255" autocomplete="off"><button id="import-preview">选择文件并预览</button><div id="import-preview-area" hidden><div class="transfer-select"><label><input id="transfer-all" type="checkbox"> 全选</label><small id="transfer-count"></small></div><div class="transfer-list"></div><p class="hint">归档/回收站状态会保留。预览五分钟后失效。</p></div><div class="actions"><button type="button" data-close>取消</button><button type="button" id="import-confirm" class="primary" disabled>导入所选项目</button></div>');
 m.querySelector('#switch-share').onclick=()=>{void call('transfer-cancel');m.remove();importSharedItem();};
 let token=null;const cancel=()=>{void call('transfer-cancel').catch(()=>{});};
 m.querySelector('[data-close]').addEventListener('click',cancel);m.addEventListener('keydown',e=>{if(e.key==='Escape')cancel();});
 m.querySelector('#import-preview').onclick=()=>run(async()=>{
  token=null;m.querySelector('#import-confirm').disabled=true;m.querySelector('#import-preview-area').hidden=true;m.querySelector('.transfer-list').replaceChildren();
  const password=m.querySelector('#import-password').value;m.querySelector('#import-password').value='';
  const result=await call('transfer-preview',password);if(!m.isConnected){cancel();return;}if(result.canceled)return;
  token=result.token;m.querySelector('.transfer-list').innerHTML=transferRows(result.items);m.querySelector('#import-preview-area').hidden=false;bindTransferSelection(m);m.querySelector('#import-confirm').disabled=!result.items.length;
 });
 m.querySelector('#import-confirm').onclick=()=>run(async()=>{
  const ids=selectedTransferIds(m);if(!ids.length)return toast('请选择至少一个项目');
  const result=await call('transfer-import',{token,ids});if(!state.items)return;
  state.items=result.items;m.remove();render();toast('已导入 '+result.count+' 个项目');
 });
}

function shareItem(item){
 const m=modal('<h2>分享项目 · '+esc(item.title)+'</h2><p class="hint">分享包含此项目的账号、密码、备注、自定义字段及 OTP 设置密钥。请设置独立分享密码，与密文分开传递。离线密文不会自动过期，也无法远程撤销。</p><form id="share-form"><label>临时分享密码（12–255 个字符）</label><input id="share-password" type="password" minlength="12" maxlength="255" required autocomplete="new-password"><label>确认分享密码</label><input id="share-confirm" type="password" required maxlength="255" autocomplete="new-password"><button class="primary" type="submit">生成分享密文</button></form><div id="share-result" hidden><label>十六进制密文</label><textarea id="share-hex" readonly spellcheck="false" aria-label="分享密文"></textarea><button id="share-copy" type="button">复制密文</button><p class="hint">接收方：导入 → 分享密文，输入分享密码后恢复项目。不会更改你的密码库主密码。</p></div><div class="actions"><button data-close type="button">关闭</button></div>');
 const clear=()=>{void call('share-clear').catch(()=>{});};
 m.querySelector('[data-close]').addEventListener('click',clear);m.addEventListener('keydown',e=>{if(e.key==='Escape')clear();});
 m.querySelector('form').addEventListener('input',()=>{m.querySelector('#share-result').hidden=true;m.querySelector('#share-hex').value='';clear();});
 m.querySelector('form').onsubmit=e=>{e.preventDefault();const password=m.querySelector('#share-password').value;if(password!==m.querySelector('#share-confirm').value)return toast('两次分享密码不一致');
  void run(async()=>{m.querySelector('#share-result').hidden=true;m.querySelector('#share-hex').value='';
   const hex=await call('share-create',{id:item.id,password});
   if(!m.isConnected){clear();return;}
   m.querySelector('#share-password').value='';m.querySelector('#share-confirm').value='';
   m.querySelector('#share-hex').value=hex;m.querySelector('#share-result').hidden=false;
  });
 };
 m.querySelector('#share-copy').onclick=()=>run(async()=>{await call('share-copy');toast('分享密文已复制，30 秒后自动清除');});
}
function importSharedItem(){
 const m=modal('<h2>导入分享密文</h2><button type="button" id="back-excel">切换到 Excel 导入</button><p class="hint">粘贴 Epassword 的单项目十六进制密文，并输入发送者设置的分享密码。预览后追加新项目，不覆盖已有账号。</p><form id="share-import-form"><label>分享密文</label><textarea id="import-hex" required maxlength="33558624" spellcheck="false" autocomplete="off"></textarea><label>分享密码</label><input id="import-share-password" type="password" minlength="12" maxlength="255" required autocomplete="off"><button type="submit">解密并预览</button></form><div id="shared-preview" hidden><p id="shared-title"></p><p class="hint">包含此项目的全部自定义字段与 OTP。归档/回收站状态会保留；重复导入会产生副本。</p></div><div class="actions"><button data-close type="button">取消</button><button id="shared-import" class="primary" disabled>导入此项目</button></div>');
 let preview=null;
 const cancel=()=>{preview=null;void call('transfer-cancel').catch(()=>{});};
 m.querySelector('[data-close]').addEventListener('click',cancel);m.addEventListener('keydown',e=>{if(e.key==='Escape')cancel();});
 m.querySelector('#back-excel').onclick=()=>{cancel();m.remove();importExcel();};
 m.querySelector('form').addEventListener('input',()=>{cancel();m.querySelector('#shared-preview').hidden=true;m.querySelector('#shared-import').disabled=true;});
 m.querySelector('form').onsubmit=e=>{e.preventDefault();void run(async()=>{
  preview=null;m.querySelector('#shared-preview').hidden=true;m.querySelector('#shared-import').disabled=true;
  const password=m.querySelector('#import-share-password').value;m.querySelector('#import-share-password').value='';
  const result=await call('share-preview',{hex:m.querySelector('#import-hex').value,password});
  if(!m.isConnected){cancel();return;}preview=result;const item=result.items[0];
  m.querySelector('#shared-title').textContent=item.title+' · '+(item.username||item.category);
  m.querySelector('#shared-preview').hidden=false;m.querySelector('#shared-import').disabled=false;
 });};
 m.querySelector('#shared-import').onclick=()=>run(async()=>{
  if(!preview)return;const result=await call('transfer-import',{token:preview.token,ids:[preview.items[0].id]});
  if(!state.items)return;state.items=result.items;state.selected=result.items.at(-1)?.id;m.remove();render();toast('已导入分享项目');
 });
}
