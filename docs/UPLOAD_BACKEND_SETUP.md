# Thiết lập luồng đăng bài qua backend

Trạng thái 2026-11-05: code signed audio upload, xác minh metadata và quota đã có; đã kiểm thử bằng metadata giả lập và Firebase Emulator. **Chưa kiểm thử upload Cloudinary thật, chưa deploy/migration schema hoàn chỉnh.** Hướng dẫn này phục vụ cấu hình luồng upload hiện tại, chưa thay thế hướng dẫn import toàn bộ dữ liệu mẫu theo schema mục tiêu đang chờ bàn giao.

## Chọn file

- Audio: file âm thanh bạn có quyền sử dụng, tối đa 30 MB. Backend lấy thời lượng thực tế từ Cloudinary, không tin durationSeconds client gửi. Tổng bài active của tài khoản tối đa 180 phút, gồm cả public/private.
- Ảnh bài/album/avatar: ảnh bạn chọn, tối đa 5 MB. Có crop vuông và xem trước; chọn file trên điện thoại hoặc web, không nhập đường dẫn ổ đĩa vào Firestore.
- Bài chỉ chọn Công khai hoặc Riêng tư. Genre chọn trong danh sách; Artist cho nhiều tên phân cách dấu phẩy nhưng chủ sở hữu vẫn là UID đang đăng nhập.

## Backend cần cấu hình gì?

Trong môi trường chạy Node backend, cung cấp:

```dotenv
CLOUDINARY_CLOUD_NAME=<cloud-name>
CLOUDINARY_API_KEY=<api-key>
CLOUDINARY_API_SECRET=<api-secret>
```

Dùng cùng cloud cho upload audio và xác minh. API secret chỉ ở server/secret manager hoặc file `.local/backend.env` được gitignore. Script backend hiện không tự load file env này; shell/host phải đưa các biến vào process. Không đưa secret vào EXPO_PUBLIC hoặc commit file thật. Mẫu cấu hình nằm ở `tools/backend/backend.env.example`.

Client ảnh hiện vẫn cần CLOUDINARY cloud name và image upload preset dạng EXPO_PUBLIC như hướng dẫn README. Audio mới dùng cấu hình ký từ backend, không dùng unsigned audio preset nữa. Có thêm EXPO_PUBLIC_BACKEND_URL và Firebase mode/project đúng môi trường. Không trộn emulator với cloud.

## Luồng lưu bài

1. Client gọi GET `/audio-upload-config` có Firebase ID token.
2. Backend cấp chữ ký cho publicId riêng dạng `musicstream/{uid}/audio/{uuid}`.
3. Client tải audio lên Cloudinary bằng signature/api_key/timestamp/public_id; nhận publicId, URL và duration.
4. Client gửi POST `/songs` với requestId ổn định cho một lần đăng, title, artistNames, genre, lyric, description, albumId, coverUrl, isPublic và audioPublicId.
5. Backend gọi Cloudinary Admin API bằng credentials server, kiểm tra publicId đúng UID, file tồn tại, duration/bytes hợp lệ và không có video dimensions. URL/thời lượng lưu vào Firestore lấy từ response server, không từ client.
6. Transaction kiểm tra tài khoản/album, cộng duration các bài active và tạo bài nếu không vượt 10.800 giây. Cùng transaction cập nhật document user làm khóa tuần tự; hai upload đồng thời không cùng vượt quota. RequestId đã tạo cùng owner trả lại ID, không tạo thêm.
7. Client chuyển sang chi tiết bài. Khi lỗi quota, giữ asset đã upload trong cache form để thử lại; hiện chưa tự xóa asset Cloudinary bị bỏ dở.

Album chưa chọn gửi chuỗi rỗng theo lớp tương thích hiện tại. Backend hiện còn ghi visibility/isPublished/songId/albumTitle cùng isPublic để các consumer cũ hoạt động. **Không dùng payload trung gian này làm schema import cuối cùng** trước migration đã kiểm chứng.

## Kiểm chứng trước khi dùng dữ liệu thật

- Đăng một bài public và một bài private; đối chiếu thời lượng/URL/publicId của document với Cloudinary.
- Kiểm tra người khác không thấy bài private trong Search/Home/playlist public.
- Thử lại sau mất response: một requestId chỉ có một bài. Thử upload đồng thời gần 180 phút, phải từ chối yêu cầu vượt giới hạn.
- Thiếu credentials/metadata không hợp lệ phải báo lỗi, không ghi bài với thời lượng client tự khai.
- Local emulator vẫn chặn upload ngoài, dùng fixture demo. Chạy `npm run test:local:isolated` khi các cổng mặc định đang có server của bạn; runner chọn cổng riêng, dùng demo project và dọn instance test khi suite kết thúc.

Nguồn API Cloudinary: [Admin API resource details](https://cloudinary.com/documentation/admin_api), [Upload API](https://cloudinary.com/documentation/image_upload_api_reference).
