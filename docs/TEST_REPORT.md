# Kết quả kiểm tra bàn giao

Ngày: 2026-10-28. Môi trường Linux, Node 24.22.1; dependencies cài từ lockfile. Không sử dụng credentials hoặc database Firebase thật của người dùng.

| Kiểm tra                                       | Kết quả                                               |
| ---------------------------------------------- | ----------------------------------------------------- |
| npm ci/install dependencies                    | Thành công ở môi trường tạo source                    |
| npm run typecheck                              | Đạt                                                   |
| npm run lint                                   | Đạt, 0 errors và 0 warnings                           |
| npm test                                       | 5/5 đạt                                               |
| Firestore emulator + npm run test:rules        | 13/13 đạt                                             |
| Expo export web                                | Thành công                                            |
| Expo export Android bundle                     | Thành công; không phải APK đã cài thiết bị            |
| Tương tác trình duyệt tự động                  | Chưa thực hiện: môi trường thiếu Chromium executable  |
| Firebase thật, thiết bị thật, email reset thật | Chưa kiểm thử; cần cấu hình và làm checklist bên dưới |

Rules tests kiểm tra: public catalog read; user không được sửa danh mục; admin sửa được; schema âm bị từ chối; artistId sai bị từ chối; B không đọc thư viện A; playlist thêm/gỡ bài; từ chối ID không tồn tại/không đúng kiểu; tên rỗng bị từ chối; không tự thêm role admin; favorite owner isolation; không giả owner post; comment owner create/update/delete. Các log PERMISSION_DENIED tại assertFails là kết quả mong đợi, không phải toàn bộ tests thất bại.

Lần chạy Rules đầu phát hiện một thao tác Set.toList không có trong Rules language; đã sửa sang List.removeAll và chạy lại toàn bộ 13 tests đạt. Chưa khẳng định những đường đi ngoài các ca này đã được kiểm thử.

## Checklist kiểm thử thủ công bắt buộc sau khi cài

- [ ] Đăng ký từ app, đối chiếu Auth Users và users/{uid} trong đúng Firebase project.
- [ ] Đăng nhập sai, email trùng, password ngắn, reset password nhận email.
- [ ] Đóng/mở native app vẫn giữ phiên; đăng xuất xóa dữ liệu phiên ở UI.
- [ ] Admin claim có tác dụng sau refresh; user thường không sửa được catalog.
- [ ] Seed demo đúng project, không ghi đè document sẵn có.
- [ ] Admin thêm/sửa/ẩn/khôi phục/xóa bài; thêm/sửa/ẩn nghệ sĩ.
- [ ] Ảnh và MP3 HTTPS thật tải được trên web và điện thoại.
- [ ] Phát/pause/seek/next/previous/repeat; MiniPlayer cùng trạng thái; lỗi URL có thông báo.
- [ ] Tạo/đổi tên/xóa playlist, thêm/gỡ bài, reload vẫn tồn tại.
- [ ] Favorite và following được lưu riêng theo UID.
- [ ] Hai tài khoản không đọc/sửa được thư viện của nhau.
- [ ] Tạo/sửa/ẩn post; comments tạo/sửa/xóa đúng owner; user khác không sửa được.
- [ ] Tên/ảnh hồ sơ cập nhật sau đăng nhập lại.
- [ ] Xóa bài không làm crash playlist; gỡ được ID bài không khả dụng.
- [ ] UI vừa màn hình điện thoại, bàn phím không che nút cần dùng.

Ghi tên thiết bị, phiên bản OS/Expo, tài khoản kiểm thử giả, kết quả thực tế và ảnh chụp vào báo cáo của bạn. Không tick thay khi chưa chạy. Chưa kiểm thử thanh toán, phát nền hoặc offline vì source chưa triển khai các chức năng đó.
