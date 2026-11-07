# Đưa dữ liệu mẫu local lên Firebase và Cloudinary

Đã chuẩn bị importer `tools/import-local-cloud.cjs` cho project `musicstreamapp-5a527`. Công cụ không import module AI, không gọi Gemini, không tạo embedding hoặc lyric. Người dùng đã xác nhận tắt `AI_ENABLED` và deploy Render xong trước khi nạp. Giữ AI tắt trong và sau khi nạp nếu chưa muốn tạo vector; bật lại sẽ kích hoạt index các bài công khai còn thiếu vector.

## Dữ liệu và cách chuyển

- Bộ dữ liệu hiện tại: 394 document, 120 audio, khoảng 562 MiB. File `data/local/auth.json` không được đọc hoặc đưa lên cloud.
- Upload tuần tự audio thật từ `assets/audio/` lên Cloudinary bằng signed Upload API, resource type `video`. Với mỗi chủ sở hữu và nội dung file, ID media được tạo cố định theo hash; `overwrite=false`, không ghi đè media khác. Bộ nhớ không giữ toàn bộ 120 audio cùng lúc.
- Đọc URL và public ID Cloudinary trả về rồi thay `audioUrl`, `audioPublicId`, `durationSeconds` trong dữ liệu import. Không sửa các JSON nguồn. ID bài, UID nghệ sĩ và liên kết Playlist/Album/lịch sử/yêu thích giữ nguyên.
- Ảnh HTTPS hiện có được giữ nguyên; công cụ không tải lại ảnh bên ngoài. `coverPublicId`/`avatarPublicId` null vẫn giữ null khi chưa có asset Cloudinary tương ứng.
- Nhập hồ sơ nghệ sĩ/người nghe mẫu vào Firestore để hiển thị. **Không tạo tài khoản Firebase Authentication**, không nhập email/password local để đăng nhập. Không thay đổi tài khoản đang có; nếu UID Auth trùng với UID mẫu thì dừng trước khi upload. Tài khoản thật hiện có vẫn đăng nhập như cũ.
- Firestore ghi trong một transaction create-only (tối đa 450 document): document trùng ID và khác dữ liệu thì dừng, document giống hệt thì bỏ qua. Không xóa hoặc ghi đè nội dung có sẵn.

## Cấu hình trên máy

Đã tạo `.env.import` tại thư mục gốc từ mẫu [import-local-cloud.env.example](../tools/import-local-cloud.env.example). File riêng này được `.gitignore` loại trừ. Điền trực tiếp trên máy, không gửi khóa vào chat:

```dotenv
GOOGLE_CLOUD_PROJECT=musicstreamapp-5a527
GOOGLE_APPLICATION_CREDENTIALS=C:/duong-dan-ben-ngoai-du-an/firebase-service-account.json
CLOUDINARY_CLOUD_NAME=de8ldekt
CLOUDINARY_API_KEY=gia_tri_tren_Cloudinary
CLOUDINARY_API_SECRET=gia_tri_tren_Cloudinary
```

Firebase Admin dùng file service account JSON của đúng project; giá trị `GOOGLE_APPLICATION_CREDENTIALS` là đường dẫn file trên máy, không phải nội dung JSON và không phải `/etc/secrets/...` của Render. File khóa nên nằm ngoài repository. Không cần Gemini API key. Cloudinary key/secret dùng từ cùng product environment với cloud name.

## Chạy tự động

Kiểm tra offline, không cần khóa và không ghi cloud:

```powershell
npm run data:cloud:check
```

Sau khi điền cấu hình và chắc chắn `AI_ENABLED=false` trên Render đã có hiệu lực:

```powershell
npm run data:cloud:apply
```

Lệnh apply đã truyền `--ai-disabled` theo xác nhận của người vận hành; công cụ không đăng nhập Render để xác minh hoặc đổi môi trường thay bạn. Công cụ chỉ kết nối Cloudinary Upload API, Firebase Auth đọc UID và Firestore. Không chạy `ai:index` hoặc `ai:check --smoke` khi chỉ cần nạp mẫu.

Lưu tiến độ mỗi media vào `.local/cloud-import-<project>-<cloud>.json`. Mất mạng thì chạy lại đúng lệnh; file đã ghi tiến độ được bỏ qua. Nếu upload thành công nhưng chưa kịp ghi tiến độ, public ID cố định và overwrite=false tránh tạo bản trùng. Giữ nguyên dataset, file audio và file tiến độ khi tiếp tục.

Sau khi upload đủ và kiểm tra schema cloud, công cụ mới ghi Firestore. Nếu transaction thất bại thì Firestore không ghi một phần; audio đã upload vẫn ở Cloudinary và được tái dùng khi chạy lại. Các media này chiếm dung lượng Cloudinary ngay cả khi chưa ghi Firestore. Kết thúc thành công sẽ in `created`, `unchanged`, `aiCalls: 0`, `authAccountsCreated: 0`.

Không chạy hai importer đồng thời. Nếu máy tắt đột ngột để lại file `.lock`, xác nhận không còn tiến trình import rồi chỉ gỡ file `.lock` có tên tương ứng trong `.local/`; giữ file tiến độ `.json`.

Sau import, mở lại Home/Search/Album trong app để kiểm tra hiển thị và phát nhạc. Hồ sơ mẫu không phải tài khoản đăng nhập. Chưa hỗ trợ tự chuyển các mẫu sang UID của tài khoản thật; cần xử lý ánh xạ riêng nếu muốn sở hữu/chỉnh sửa mẫu bằng tài khoản thật.

## Tham chiếu

- [Cloudinary upload audio](https://cloudinary.com/documentation/upload_parameters).
- [Cloudinary Upload API](https://cloudinary.com/documentation/image_upload_api_reference).
- [Firebase Admin credentials](https://firebase.google.com/docs/admin/setup).
- [Firestore transactions](https://firebase.google.com/docs/firestore/manage-data/transactions).
