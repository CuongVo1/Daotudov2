// Đảo Tự Do authentication gate. No token or developer key is stored in browser storage.
(() => {
  const invoke = window.__TAURI__.core.invoke;
  const gate = document.getElementById('daoAuth');
  const requestForm = document.getElementById('daoRequestForm');
  const verifyForm = document.getElementById('daoVerifyForm');
  const message = document.getElementById('daoAuthMessage');
  const requestButton = document.getElementById('daoRequestBtn');
  const verifyButton = document.getElementById('daoVerifyBtn');
  let requestId = null;
  let requestedAt = 0;
  let authenticated = false;
  function notice(text) { message.textContent = text; }
  function errorText(err) {
    const raw = String(err);
    const messages = {
      invalid_api_key:'Developer Key không đúng hoặc đã bị thu hồi.',
      player_offline:'Nhân vật không online trên server.',
      invalid_code:'Mã xác minh không đúng.',
      pairing_expired:'Mã đã hết hạn. Hãy lấy mã mới.',
      invalid_access_token:'Phiên đã hết hạn. Vui lòng xác minh lại.',
      rate_limited:'Gửi quá nhanh. Vui lòng thử lại sau.',
      delivery_failed:'Server chưa gửi được mã lên HUD. Liên hệ admin kiểm tra Bridge.'
    };
    return Object.entries(messages).find(([key]) => raw.includes(key))?.[1] || raw;
  }
  requestForm.addEventListener('submit', async e => {
    e.preventDefault();
    const steamId = document.getElementById('daoSteamId').value.trim();
    if (!/^7656119\d{10}$/.test(steamId)) { notice('SteamID64 không hợp lệ.'); return; }
    requestButton.disabled = true;
    notice('Đang gửi yêu cầu tới server...');
    try {
      requestId = await invoke('api_request_code', { steamId });
      requestedAt = Date.now();
      requestForm.hidden = true;
      verifyForm.hidden = false;
      document.getElementById('daoCode').focus();
      notice('Đã gửi mã. Kiểm tra HUD trong game SCUM.');
    } catch (err) { notice(errorText(err)); }
    finally { requestButton.disabled = false; }
  });
  verifyForm.addEventListener('submit', async e => {
    e.preventDefault();
    const code = document.getElementById('daoCode').value.trim();
    if (!/^\d{6}$/.test(code)) { notice('Hãy nhập đúng 6 chữ số.'); return; }
    if (Date.now() - requestedAt > 5 * 60 * 1000) { notice('Mã đã hết hạn. Hãy lấy mã mới.'); return; }
    verifyButton.disabled = true;
    notice('Đang xác minh mã...');
    try {
      await invoke('api_verify_code', { requestId, code });
      authenticated = true;
      gate.hidden = true;
      notice('');
    } catch (err) { notice(errorText(err)); }
    finally { verifyButton.disabled = false; }
  });
  document.getElementById('daoBackBtn').addEventListener('click', () => {
    verifyForm.hidden = true;
    requestForm.hidden = false;
    requestId = null;
    notice('');
  });
  window.__TAURI__.event.listen('api-position-status', event => {
    const status = event.payload;
    if (status === 'invalid_access_token') {
      authenticated = false;
      gate.hidden = false;
      verifyForm.hidden = true;
      requestForm.hidden = false;
      document.getElementById('daoCode').value = '';
      notice('Phiên xác minh đã hết hạn. Vui lòng lấy mã mới.');
    } else if (authenticated && status !== 'online') {
      const el = document.getElementById('status');
      if (el) el.textContent = errorText(status);
    }
  });
  // Prevent legacy Ctrl+C tracking from being started by the old UI.
  const legacy = document.getElementById('toggleLiveTracking');
  if (legacy) { legacy.disabled = true; legacy.title = 'Đã chuyển sang Server Position API'; legacy.textContent = 'Tracking qua Server API'; }
  const oldStatus = document.getElementById('trackingPauseState');
  if (oldStatus) oldStatus.textContent = 'API tự động cập nhật mỗi ~1,1 giây';
  const sidebar = document.getElementById('sidebar');
  if (sidebar) sidebar.insertAdjacentHTML('beforeend','<div class="dao-footer">Được phát triển bởi <strong>team Anh3</strong></div>');
})();
