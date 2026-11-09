# Đảo Tự Do — bảo vệ Developer Key

## Kiến trúc

Launcher (Rust/Tauri) -> **HTTPS Gateway do team Anh3 vận hành** -> `https://taxi.nihao.id.vn/v1/minimap/*`.

- **Không có Developer Key trong source hoặc EXE.** Key chỉ nằm trong biến môi trường của máy chủ Gateway.
- Upstream `accessToken` chỉ được giữ trong bộ nhớ Gateway. Launcher chỉ giữ `pairingToken` và `sessionToken` ngẫu nhiên do Gateway cấp; cả hai đều là bearer secrets, vẫn phải bảo vệ.
- `request-code` được giới hạn theo SteamID và IP. `verify` buộc đúng requestId, cùng phiên và tối đa 5 lần. `me` giới hạn 1 lần/giây/phiên.
- Session mất khi Gateway restart (cần xác minh lại). Chạy **một instance** cho bản demo; khi scale nhiều instance cần Redis/session store và rate limiter dùng chung.

## Triển khai Gateway (Node.js >= 20)

1. **Thu hồi Developer Key đã từng chia sẻ** với người khác và cấp key mới. Không tái sử dụng key cũ.
2. Trên VPS do bạn quản lý: `cd position-gateway && SCUM_DEVELOPER_KEY='KEY_MOI' node server.mjs` (hoặc đặt biến môi trường trong systemd/hosting secret manager; không lưu key trong shell history).
3. Dùng Caddy/Nginx/Cloudflare Tunnel để cung cấp domain HTTPS của riêng bạn, reverse proxy đến `127.0.0.1:8787`. Không mở port 8787 ra Internet. Cấu hình reverse proxy để giới hạn IP và request-rate; vì gateway chỉ nhìn thấy IP của proxy, cần bổ sung kiểm soát IP tại proxy (không tin X-Forwarded-For từ client).
4. Sửa `DEFAULT_GATEWAY` trong `src-tauri/src/position_api.rs` thành **URL HTTPS gateway của bạn** trước khi build bản phát hành. Hoặc dùng `SCUM_POSITION_GATEWAY_URL` trên máy dev.
5. Build lại Tauri; người dùng **không cần nhập Developer Key**. Vẫn phải nhập SteamID và mã HUD 6 số.

### Kiểm tra local (không gọi upstream thật nếu chưa có key mới)

`node --check position-gateway/server.mjs`

## Giới hạn bảo mật

- Bất kỳ ai có EXE vẫn có thể phân tích để biết **địa chỉ Gateway** và giao thức request. Đó không phải bí mật. Họ **không thể lấy Developer Key từ EXE**, vì key không tồn tại trong đó.
- Người khác vẫn có thể gọi Gateway; hạn chế bằng WAF/rate-limit, chống spam mã HUD, quota, giám sát và chính sách cấp quyền. SteamID đơn thuần không xác thực danh tính; **mã HUD** mới chứng minh người dùng kiểm soát phiên nhân vật online.
- Token phiên của Gateway có thể bị đánh cắp trên máy người dùng bị xâm nhập. Dùng HTTPS, không ghi token vào log, không lưu token trên disk, và thu hồi key/token khi có sự cố.
- Phiên trong demo gắn với IP kết nối; nếu IP thay đổi, người dùng phải xác minh lại. Khi chạy sau reverse proxy, IP này là IP proxy, không phải IP thực của từng người dùng. Hãy dùng rate limit/WAF tại proxy và cân nhắc thiết kế phiên nâng cao khi triển khai production.
- Mã nguồn Gateway ở đây là **bản mẫu có bảo vệ cơ bản**, chưa được kiểm thử bảo mật/kiểm thử với server thật. Để phát hành rộng rãi, nên có kiểm thử tải, logging an toàn, monitoring, rate limit phân tán và giới hạn số phiên.
