# ĐẢO TỰ DO MiniMap 2.0 — Source upgrade

- UI tactical đen-đỏ; giữ nguyên các thành phần Leaflet, route, POI, HUD pairing.
- Bundled tile pyramid từ **ảnh được cung cấp thực tế 2048×2048**, zoom native 0–3. Zoom 4–6 chỉ upscale, không phải bản 14K/24K thật.
- Cập nhật yaw từ API v2, 1 request / 1.1 giây. API key **không** nhúng trong source; cần cấu hình `SCUM_DEV_API_KEY` tại môi trường chạy, hoặc chuyển sang Gateway.
- Click-through bật khi mở overlay; để kéo overlay cần unlock thủ công qua nút khóa ở Launcher.
- Drag/zoom thủ công tắt follow; bật lại bằng nút Follow.
- **Chưa có tín hiệu đáng tin cậy từ SCUM về inventory Tab**: không cam kết tự ẩn khi mở kho đồ. Cần cơ chế phát hiện UI hợp lệ hoặc hotkey thủ công.
- Tọa độ SCUM sử dụng bounds cũ của dự án; cần hiệu chỉnh bằng mốc thực tế nếu ảnh mới không trùng ảnh cũ.
- Đã giữ `reqwest` với features `blocking`, `json`; không sử dụng `include_str!` file local.
- Chưa kiểm thử trên Windows/game thực tế.
