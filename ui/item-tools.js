function passwordHistory(item,field='password'){
 const history=(item.history||[]).filter(h=>h.field===field).slice().reverse();
 const layer=document.createElement('div');layer.className='overlay history-overlay';
 layer.innerHTML='<section class="modal" role="dialog" aria-modal="true" aria-label="查看历史密码"><h2>查看历史密码</h2><p class="hint">'+esc(item.title)+' · 仅保存已成功写入 Excel 的版本。升级前的历史无法补回。</p><div class="history-list">'+(history.map((h,index)=>'<div class="field"><div class="field-data"><label>'+esc(new Date(h.at).toLocaleString('zh-CN'))+' · '+esc(h.label)+'</label><div class="value secret" data-history-value="'+index+'">••••••••••••</div></div><button data-history-show="'+index+'">显示</button><button data-history-copy="'+index+'">复制</button></div>').join('')||'<p>暂无已记录的密码历史，保存或修改项目后开始记录。</p>')+'</div><div class="actions"><button data-history-close>关闭</button></div></section>';
 const fields=new Map([['password','项目密码'],...(item.history||[]).map(h=>[h.field,h.label])]);
 const picker=document.createElement('select');picker.setAttribute('aria-label','密码历史字段');for(const [key,label] of fields){const option=document.createElement('option');option.value=key;option.textContent=label;option.selected=key===field;picker.append(option);}picker.onchange=()=>{layer.remove();passwordHistory(item,picker.value);};layer.querySelector('.history-list').before(picker);
 root.append(layer);const close=()=>layer.remove();layer.querySelector('[data-history-close]').onclick=close;
 layer.querySelectorAll('[data-history-show]').forEach(b=>b.onclick=()=>{const value=layer.querySelector('[data-history-value="'+b.dataset.historyShow+'"]'),shown=b.textContent==='隐藏';value.textContent=shown?'••••••••••••':history[Number(b.dataset.historyShow)].value||'（空密码）';b.textContent=shown?'显示':'隐藏';});
 layer.querySelectorAll('[data-history-copy]').forEach(b=>b.onclick=()=>run(async()=>{await call('copy',history[Number(b.dataset.historyCopy)].value);toast('历史密码已复制，30 秒后清除');}));
 layer.onkeydown=e=>{if(e.key==='Escape'){e.stopPropagation();close();}if(e.key==='Tab'){const nodes=[...layer.querySelectorAll('select,button')];if(e.shiftKey&&document.activeElement===nodes[0]){e.preventDefault();nodes.at(-1).focus();}else if(!e.shiftKey&&document.activeElement===nodes.at(-1)){e.preventDefault();nodes[0].focus();}}};layer.querySelector('button').focus();
}
function itemMenu(event,item){
 event.preventDefault();document.querySelector('.item-menu')?.remove();const menu=document.createElement('div');menu.className='item-menu';menu.setAttribute('role','menu');
 menu.innerHTML='<button role="menuitem" data-action="duplicate">复制项目</button><button role="menuitem" data-action="move">移动分类…</button><button role="menuitem" data-action="archive">'+(item.archived==='true'?'取消归档':'归档')+'</button><button role="menuitem" class="danger" data-action="delete">彻底删除…</button>';
 root.append(menu);const rect=event.currentTarget.getBoundingClientRect();menu.style.left=Math.min(event.clientX||rect.left,innerWidth-200)+'px';menu.style.top=Math.min(event.clientY||rect.bottom,innerHeight-menu.offsetHeight-8)+'px';
 const close=()=>{menu.remove();document.removeEventListener('pointerdown',outside);};const outside=e=>{if(!menu.contains(e.target))close();};document.addEventListener('pointerdown',outside);
 menu.onkeydown=e=>{const buttons=[...menu.querySelectorAll('button')],index=buttons.indexOf(document.activeElement);if(e.key==='Escape')close();if(['ArrowDown','ArrowUp'].includes(e.key)){e.preventDefault();buttons[(index+(e.key==='ArrowDown'?1:buttons.length-1))%buttons.length].focus();}};
 const perform=(action,category)=>run(async()=>{state.items=await call('item-action',{id:item.id,action,category});if(action==='duplicate')state.selected=state.items.at(-1)?.id;render();toast('项目操作已完成');});
 menu.querySelectorAll('button').forEach(b=>b.onclick=()=>{close();if(b.dataset.action==='move'){
  const m=modal('<h2>移动分类</h2><label>目标分类</label><select id="move-category">'+Object.keys(icons).map(c=>'<option '+(c===item.category?'selected':'')+'>'+esc(c)+'</option>').join('')+'</select><div class="actions"><button data-close>取消</button><button id="move-confirm" class="primary">移动</button></div>');m.querySelector('#move-confirm').onclick=()=>perform('move',m.querySelector('select').value);
 }else perform(b.dataset.action);});menu.querySelector('button').focus();
}
function bindItemTools(){
 root.querySelectorAll('[data-item]').forEach(b=>{const open=e=>itemMenu(e,state.items.find(i=>i.id===b.dataset.item));b.oncontextmenu=open;b.addEventListener('keydown',e=>{if(e.key==='ContextMenu'||(e.shiftKey&&e.key==='F10'))open(e);});});
 document.querySelector('#password-history')?.addEventListener('click',()=>passwordHistory(state.items.find(i=>i.id===state.selected)));
}
