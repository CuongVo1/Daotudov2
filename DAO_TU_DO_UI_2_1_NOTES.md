# ĐẢO TỰ DO MiniMap — Tactical Dashboard UI 2.1

## Đã sửa
- Dashboard mới sau xác minh HUD, sidebar điều hướng, 4 tab, preview bản đồ, cấu hình kích thước/độ trong suốt/hình dạng, nút mở bản đồ lớn và overlay.
- Không xóa Leaflet, routing, POI, HTTP server hay xác thực SCUM API đang có.
- Overlay dùng click-through qua lệnh Tauri hiện có. Chế độ cho phép kéo / khóa chuột được tách riêng.
- Rust thêm lệnh `set_minimap_size` để resize overlay (200–600 px); opacity và shape được chuyển qua localStorage giữa cửa sổ.
- API `yaw` từ `position_api.rs` giữ nguyên, cập nhật mũi tên Leaflet/livemap; preview cũng nghe sự kiện `coord-update`.
- `reqwest` giữ cả `blocking` và `json`.
- Giữ tile pyramid đã được tạo từ ảnh SCUM 2048×2048 trong bản 2.0 trước đó; không tự nhận ảnh gốc là 14K/24K.

## Chưa thể đảm bảo
- Chưa build trên Windows, chưa thử trong SCUM.
- Tự động ẩn khi mở inventory (Tab) chưa khả dụng nếu không có tín hiệu trạng thái game đáng tin cậy, công tắc bị vô hiệu hóa.
- Các lựa chọn xoay bản đồ, lưới sector, thông tin nhanh hiện lưu sở thích nhưng chưa được đồng bộ đầy đủ với renderer livemap; cần hoàn thiện kết nối trong bản kế tiếp.
- Chưa hiệu chỉnh mốc tọa độ thế giới với ảnh mới bằng vị trí thực địa; không thể bảo đảm sai số tuyệt đối bằng 0.
- API key được lấy từ biến môi trường `SCUM_DEV_API_KEY` trong Rust; Windows build cần được cấu hình key khi chạy, hoặc dùng gateway. Không có developer key trong source.
- Giao diện đã bám bố cục thiết kế, không thể xác nhận giống 100% pixel trước khi chạy chụp ảnh so sánh.

## Build
1. Giải nén, mở GitHub repo, upload các file giữ nguyên cấu trúc.
2. GitHub Actions `Build Windows Installer` → Run workflow.
3. Tải artifact EXE sau khi Actions báo thành công.
4. Trên máy chạy ứng dụng, cấu hình `SCUM_DEV_API_KEY` trong môi trường chạy (hoặc chuyển sang gateway). Không commit key lên GitHub.
