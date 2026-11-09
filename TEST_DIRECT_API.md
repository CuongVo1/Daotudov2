# Test nội bộ — Developer Key đã được cấu hình

Source này chứa Developer Key trong `src-tauri/src/dev_test_key.local`, được Rust nhúng vào EXE khi build. KHÔNG đẩy file này lên GitHub, không chia sẻ ZIP/EXE, không phát hành công khai. Người khác có thể trích xuất key từ EXE.

## Chạy trên Windows

Mở PowerShell trong thư mục `src-tauri` và chạy:

```powershell
cargo run
```

Để build EXE nội bộ:

```powershell
cargo build --release
```

Nếu cần thay key, sửa `src-tauri/src/dev_test_key.local` và build lại. Biến môi trường `SCUM_DEVELOPER_KEY` vẫn được ưu tiên nếu được thiết lập.

## Kiểm tra

1. Vào SCUM server, mở launcher và nhập SteamID64.
2. Bấm Lấy mã; nhập mã 6 số trên HUD trong 5 phút.
3. Bấm Xác minh; xem tọa độ trên minimap.
4. Kiểm tra các mã lỗi 401, 404, 429, 503 nếu gặp sự cố.

**Chưa xác minh API thực tế và chưa build EXE Windows trong môi trường này.** Sau khi test, thu hồi key này và chuyển sang Gateway trước khi phát hành.
