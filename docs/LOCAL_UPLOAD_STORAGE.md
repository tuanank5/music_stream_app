# Lưu upload local tạm thời — cần chỉnh lại khi chuyển production

Cập nhật 2026-11-06. Đây là triển khai để thử trên máy tính/điện thoại cùng LAN; không dùng Cloudinary hoặc Firebase Storage trong local.

## Dữ liệu lưu ở đâu

- Audio/ảnh thật: `.local/uploads/<uuid>.<ext>` trên máy chạy backend.
- Metadata nội bộ của file: file `.json` cạnh file media, có ownerId/kind/duration/bytes; không phục vụ qua HTTP.
- Metadata bài hát: Firestore Emulator `songs/{id}`; album: `albums/{id}`. Liên kết bài trong album vẫn là songs.albumId.
- Firestore/Auth được lưu qua `.local/emulator-data` khi dừng Emulator bình thường bằng Ctrl+C. Kho file uploads tồn tại trên ổ đĩa qua restart backend, không phụ thuộc export của Emulator.

Phải giữ **cả `.local/uploads` và `.local/emulator-data`** khi sao lưu dữ liệu local. Không commit file người dùng hoặc export Auth. Tắt cưỡng bức Emulator có thể chưa kịp lưu metadata mới; file media vẫn có thể còn nhưng không có bản ghi tương ứng.

## Cách sử dụng

1. `npm run local:emulators`.
2. Lần đầu nạp dữ liệu bằng `npm run data:apply`; các lần sau có export rồi thì không nạp đè nếu muốn giữ chỉnh sửa/upload của mình.
3. CMD khác: `set LOCAL_BACKEND_HOST=0.0.0.0`, rồi `npm run local:backend`.
4. CMD Expo: `set LOCAL_APP_HOST=IP_WIFI_MAY_TINH`, rồi `npm run start:local -- --clear`.
5. Đăng nhập → Đăng tải bài hát → chọn audio/ảnh → nhập tên/nghệ sĩ/genre → chọn album hoặc nhập tên album mới → lưu.
6. `/uploads` → Album → Tạo album có thể upload ảnh bìa rồi lưu, thêm bài sau. Album chỉ lưu metadata và liên kết bài, không có file audio album riêng.

Nếu đang mở backend/Expo từ trước, restart để dùng code mới. Không cần Cloudinary preset/key cho chế độ local. Cloud mode giữ luồng cũ; không mount kho file local.

## Luồng kỹ thuật

- Client gửi multipart `file` tới POST `/local-media/upload/audio` hoặc `/local-media/upload/image`, kèm ID token.
- Backend kiểm tra tài khoản active, giới hạn 2 upload đang xử lý, audio ≤30MB, ảnh ≤5MB; nhận dạng file bằng nội dung, không tin tên/MIME client.
- Audio MP3/WAV/FLAC/OGG/M4A được hỗ trợ khi parser nhận dạng; duration do music-metadata đọc từ file, không lấy số giây client tự khai. Bài >180 phút bị từ chối; tổng quota bài active vẫn được kiểm tra trong transaction tạo Song.
- Ảnh nhận JPG/PNG/WebP; không nhận SVG/HTML. Kiểm tra hiện chủ yếu là định dạng/size, chưa phải pipeline decode/re-encode ảnh đầy đủ.
- File nhận tên UUID ngẫu nhiên, không dùng tên file gốc để tạo đường dẫn. Sidecar ghi owner; API lưu Song/Album/avatar/cover kiểm tra file local tồn tại và thuộc UID token.
- POST `/songs` ở Emulator đọc metadata file đã lưu, rồi tạo bài bằng transaction hiện có, cùng cơ chế retry requestId/quota/owner album.
- URI lưu trong Firestore là `/local-media/...`, không gắn cứng IP. Audio engine và AppImage ghép URI với backend URL đang cấu hình, dùng được sau đổi IP/cổng và restart Expo. Cloud từ chối URI local.
- GET/HEAD file hỗ trợ Range để phát/tua audio. Không phục vụ sidecar JSON, directory listing hoặc path tùy ý.

## Ảnh trong file JSON chỉnh sửa

`users.json`/`albums.json`/`songs.json` có thể dùng đường dẫn ảnh **trong workspace**, ví dụ `assets/images/Artist Profile/Image 63.png`. data:check đọc/kiểm tra ảnh, data:apply sao chép vào kho uploads và lưu URI tương đối vào Emulator; JSON gốc giữ đường dẫn nguồn để bạn tiếp tục chỉnh. Chỉ nhận ảnh JPG/PNG/WebP ≤5MB, từ chối path ra ngoài dự án. Đường dẫn Windows trong JSON cần escape dấu `\\`, nên ưu tiên đường dẫn tương đối dùng `/`.

Đã sửa avatar bạn chọn ở users.json về đường dẫn tương đối tương ứng, giữ nguyên lựa chọn ảnh. Chức năng này không tự import file audio từ đường dẫn ổ đĩa trong JSON; audio riêng nên chọn qua form upload để server đo duration.

## Giới hạn phải giữ rõ

- **URL file local ai biết URL và truy cập được backend LAN đều đọc được.** isPublic/owner bảo vệ API metadata, không phải cơ chế private-file delivery. Không đưa bản local này lên Internet hay coi đây là signed/private media production.
- File được lưu trước khi tạo Song/Album; hủy form, quota thất bại hoặc mất phản hồi upload có thể để lại file mồ côi. Chưa dọn tự động, chưa thu hồi file cũ khi đổi ảnh/xóa bài/album; giữ lại để tránh xóa nhầm file đang dùng chung.
- Upload dùng buffer trong RAM, không phải streaming disk; giới hạn 2 request đang xử lý trong một process. Chưa quota tổng dung lượng ổ đĩa, antivirus hoặc chống upload lặp hoàn chỉnh.
- Metadata sidecar do backend tạo trong thư mục máy tính tin cậy; chưa kiểm chứng hash file mỗi lần dùng và chưa có asset ledger/refcount bền vững.
- Không tự ghi ngược bài/album mới vào `data/local/*.json`. Emulator export là nguồn giữ thay đổi runtime; data:apply/local:seed có thể ghi đè ID trùng từ bộ mẫu.
- HTTP/API test đã chứng minh WAV/PNG và restart; MP3/M4A/OGG/FLAC, native picker/crop/background/audio trên Android/iOS thật vẫn cần QA.

## Việc sửa sau

- [ ] Tách storage adapter local/cloud; signed upload ảnh và xác minh ownership/publicId phía server cho cloud.
- [ ] Bảo vệ delivery file riêng tư bằng token/signed URL; không dựa vào URL khó đoán.
- [ ] Ghi asset ledger/refcount, cleanup file bỏ dở/ảnh cũ có grace period và retry an toàn.
- [ ] Upload streaming, quota dung lượng ổ đĩa, kiểm tra toàn bộ định dạng, decode/re-encode ảnh và checksum.
- [ ] Quy trình backup/restore đồng bộ file + Firestore; kiểm thử mất điện/partial upload/multiple backend instances.
- [ ] Test native thực tế và giữ nguyên hợp đồng API khi thay storage production.
