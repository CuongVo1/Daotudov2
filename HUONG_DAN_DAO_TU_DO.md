# ĐẢO TỰ DO — SCUM Universal MiniMap (API v2)

## Những thay đổi

- Màn hình xác minh trước khi mở bản đồ: SteamID64 → mã HUD 6 số → bản đồ.
- Kết nối server `https://taxi.nihao.id.vn` qua Rust/Tauri, không gọi API trực tiếp từ JavaScript.
- Tọa độ API được phát vào sự kiện Tauri `coord-update` và WebSocket `coord-update` hiện có; bản đồ/overlay dùng lại code gốc.
- Poll 1100 ms, backoff khi lỗi mạng, xử lý 401 và 429.
- Tắt cơ chế tự gửi Ctrl+C của live tracking cũ.
- Đổi thương hiệu sang ĐẢO TỰ DO, ghi công team Anh3.

## Cách chạy

1. Cài Rust toolchain, WebView2 và các yêu cầu Tauri 2 trên Windows.
2. Trong `src-tauri` chạy `cargo tauri dev` (nếu đã cài Tauri CLI) hoặc build bằng script Windows sẵn có.
3. Đăng nhập SCUM trên server Đảo Tự Do.
4. Nhập SteamID64 và **Developer Key** vào màn hình xác minh. Nhấn Lấy mã.
5. Đọc mã 6 số trên HUD SCUM, nhập trong 5 phút và xác minh.
6. Sau khi thành công, bản đồ hiện ra và marker tự cập nhật theo API.

## Bảo mật / giới hạn

- Developer Key không nằm trong source, không lưu localStorage, không ghi ra log; được giữ trong bộ nhớ Rust của tiến trình.
- Access token cũng chỉ lưu trong bộ nhớ; mở lại app phải ghép mã lại.
- **Không phân phối bản desktop với Developer Key nhúng trong EXE.** Để phát hành công khai cho nhiều người, cần backend proxy xác thực và bảo vệ Developer Key.
- Key đã từng được chia sẻ cần được admin thu hồi và cấp lại.
- Chưa kiểm thử thực tế với API server (không gửi yêu cầu ghép mã tới SteamID bất kỳ).
- Chưa xác nhận khả năng build Windows trong môi trường tạo bản vá này.
- Giao diện auth hiện không có hình nền; có thể thay CSS `dao-auth.css` sau.
