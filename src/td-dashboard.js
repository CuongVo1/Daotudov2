/* ĐẢO TỰ DO UI controller. Existing SCUM API and Leaflet remain the source of truth. */
(() => {
  const $ = id => document.getElementById(id);
  const $$ = selector => Array.from(document.querySelectorAll(selector));
  const invoke = window.__TAURI__?.core?.invoke;
  const feedback = message => { if ($('tdFeedback')) $('tdFeedback').textContent = message; };
  const read = (key, fallback) => { try { return JSON.parse(localStorage.getItem('td.'+key)) ?? fallback; } catch { return fallback; } };
  const save = (key,value) => { try { localStorage.setItem('td.'+key,JSON.stringify(value)); } catch {} };
  const call = async (command, args) => { if (!invoke) {feedback('Chỉ hoạt động trong Launcher Tauri');return false;} try { await invoke(command,args);return true; } catch(e){feedback(String(e));return false;} };
  const openMap = () => {document.body.classList.add('td-map-mode'); feedback('Bản đồ lớn đã mở');setTimeout(()=>window.dispatchEvent(new Event('resize')),100);};
  const openOverlay = async () => {if (await call('open_overlay')) {window.__tdOverlayOpen=true;await call('set_overlay_clickthrough',{clickthrough:!!$('tdClickThrough').checked}); await call('set_minimap_size',{size:Number($('tdSize').value)}); feedback('MiniMap đã mở');}};
  const setPage = page => {
    if(page==='map'){openMap();return;}
    document.body.classList.remove('td-map-mode');
    $$('[data-td-page]').forEach(b=>b.classList.toggle('active',b.dataset.tdPage===page));
    const minimap=page==='minimap';$('tdMinimapPage').hidden=!minimap;$('tdAltPage').hidden=minimap;
    const data={home:['Trang chủ','Từ đây bạn có thể mở MiniMap, xem bản đồ lớn và quản lý hành trình.'],server:['Thông tin server','Theo dõi kết nối SCUM tại thanh công cụ bản đồ lớn.'],waypoint:['Waypoint','Mở bản đồ lớn, nhấp chuột phải để tạo điểm đến hoặc sử dụng công cụ Waypoint hiện có.'],guide:['Cẩm nang SCUM','Cẩm nang đang được phát triển. Các chức năng bản đồ vẫn sẵn sàng.'],settings:['Cài đặt chung','Cài đặt nâng cao của Launcher vẫn có thể mở bằng nút bên dưới.']};
    $('tdPageTitle').textContent=minimap?'Cấu hình MiniMap':(data[page]?.[0]||'MiniMap');
    if(!minimap){$('tdAltHeading').textContent=data[page]?.[0]||'';$('tdAltDescription').textContent=data[page]?.[1]||'';}
  };
  $$('[data-td-page]').forEach(b=>b.addEventListener('click',()=>setPage(b.dataset.tdPage)));
  $$('[data-td-action="map"]').forEach(b=>b.addEventListener('click',openMap));
  $$('[data-td-tab]').forEach(b=>b.addEventListener('click',()=>{$$('[data-td-tab]').forEach(x=>x.classList.toggle('active',x===b));$$('[data-td-panel]').forEach(p=>p.hidden=p.dataset.tdPanel!==b.dataset.tdTab);}));
  $('tdLegacyToggle')?.addEventListener('click',()=>document.body.classList.toggle('td-legacy-open'));
  $('tdAsideOpen')?.addEventListener('click',openOverlay);
  $('tdAsideWaypoint')?.addEventListener('click',openMap);
  $('tdAsideSettings')?.addEventListener('click',()=>{$('settingsToggle')?.click();openMap();});
  $('tdOriginalSettings')?.addEventListener('click',()=>{$('settingsToggle')?.click();openMap();});
  $('tdResetOverlay')?.addEventListener('click',()=>call('reset_overlay_config'));
  $('tdUnlock')?.addEventListener('click',async()=>{if(await call('set_overlay_clickthrough',{clickthrough:false})){$('tdClickThrough').checked=false;feedback('Có thể kéo MiniMap bằng chuột');}});
  $('tdLock')?.addEventListener('click',async()=>{if(await call('set_overlay_clickthrough',{clickthrough:true})){$('tdClickThrough').checked=true;feedback('Chuột xuyên qua MiniMap');}});
  $('tdAsideLock')?.addEventListener('click',()=> $('tdLock')?.click());
  $('tdToggleOverlay')?.addEventListener('click',()=>{if($('tdEnabled').checked){$('tdEnabled').checked=false;$('tdEnabled').dispatchEvent(new Event('change'));}else{$('tdEnabled').checked=true;$('tdEnabled').dispatchEvent(new Event('change'));}});
  $('tdEnabled')?.addEventListener('change',e=>e.target.checked?openOverlay():call('close_overlay').then(()=>{window.__tdOverlayOpen=false;}));
  $('tdClickThrough')?.addEventListener('change',e=>call('set_overlay_clickthrough',{clickthrough:e.target.checked}));
  const settings=['Size','Opacity','Radius','Rotate','Grid','QuickInfo'];
  for(const name of settings){const input=$('td'+name);if(!input)continue;const value=read(name,input.type==='checkbox'?input.checked:Number(input.value));if(input.type==='checkbox')input.checked=!!value;else input.value=value;const update=async()=>{const val=input.type==='checkbox'?input.checked:Number(input.value);save(name,val);if(name==='Size'){$('tdSizeValue').textContent=val+' px';/* size is applied on next overlay open, or live if already open */ if(window.__tdOverlayOpen) await call('set_minimap_size',{size:val});}if(name==='Opacity'){$('tdOpacityValue').textContent=val+'%';localStorage.setItem('overlay.opacity',String(val));}if(name==='Radius')$('tdRadiusValue').textContent=val+' m';if(name==='Rotate')localStorage.setItem('td.map.rotate',String(val));if(name==='Grid')localStorage.setItem('td.map.grid',String(val));if(name==='QuickInfo')localStorage.setItem('td.map.info',String(val));};input.addEventListener(input.type==='checkbox'?'change':'input',update);if(name==='Size')$('tdSizeValue').textContent=input.value+' px';if(name==='Opacity')$('tdOpacityValue').textContent=input.value+'%';if(name==='Radius')$('tdRadiusValue').textContent=input.value+' m';}
  const shape=read('shape','circle');const selectShape=value=>{save('shape',value);$$('[data-td-shape]').forEach(b=>b.classList.toggle('active',b.dataset.tdShape===value));$('tdPreview').style.borderRadius=value==='circle'?'50%':value==='rounded'?'22px':'0';localStorage.setItem('td.map.shape',value);};$$('[data-td-shape]').forEach(b=>b.addEventListener('click',()=>selectShape(b.dataset.tdShape)));selectShape(shape);
  // Preview heading is informational. Game facing direction comes from position API yaw, not simulated data.
  window.addEventListener('storage',e=>{if(e.key==='td.player.yaw'){const yaw=Number(e.newValue);if(Number.isFinite(yaw))$('tdPreviewArrow').style.transform=`translate(-50%,-50%) rotate(${yaw-90}deg)`;}});
  if(window.__TAURI__?.event?.listen){window.__TAURI__.event.listen('coord-update',event=>{const yaw=Number(event.payload?.yaw);if(Number.isFinite(yaw)){$('tdPreviewArrow').style.transform=`translate(-50%,-50%) rotate(${yaw-90}deg)`;}}).catch(()=>{});}
  setPage('minimap');
})();
