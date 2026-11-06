# Hướng dẫn triển khai Render, xuất APK và cài ứng dụng Android

Cập nhật: 06/11/2026. Áp dụng cho dự án Expo SDK 58 hiện tại.

## 1. Trạng thái và mô hình hoạt động

Đây là hướng dẫn chuẩn bị cho lần triển khai sau này. Dự án **chưa được xác nhận deploy Render thành công, chưa có APK được nghiệm thu trên thiết bị thật**. Backend đang chuyển đổi schema/nghiệp vụ; cần hoàn tất và kiểm thử theo [báo cáo tiến độ](IMPLEMENTATION_PROGRESS.md) trước khi phát hành.

Khi triển khai xong, hệ thống hoạt động như sau:

- APK cài trên điện thoại Android, gọi backend qua URL HTTPS của Render.
- Render chạy backend Node/Express bằng `tools/backend/main.cjs`.
- Firebase thật cung cấp Authentication và Firestore.
- Cloudinary phục vụ audio/ảnh cho chế độ cloud.

Render lưu backend; Expo EAS Build tạo APK. Khi dùng APK đã build đúng cấu hình cloud, người dùng không cần Expo Go, quét QR, mở Metro hoặc giữ máy tính chạy. Điện thoại vẫn cần Internet; ứng dụng chưa có chế độ tải nhạc nghe offline hoàn chỉnh.

## 2. Chuẩn bị trước khi deploy

Người quản trị cần có repository chứa phiên bản đã kiểm thử, tài khoản Render, Expo, Firebase và Cloudinary, cùng quyền truy cập các project tương ứng.

1. Dùng Node **24.12 trở lên trong nhánh 24**; backend cần `node:sqlite` và khả năng chạy TypeScript trực tiếp của Node.
2. Hoàn tất backup, audit/migration dữ liệu thật, Firestore Rules và indexes theo tài liệu dự án. Không chạy seed Emulator lên cloud hoặc tự mở toàn bộ quyền Firestore để xử lý lỗi.
3. Bật phương thức đăng nhập Email/Password trong Firebase Authentication; lấy cấu hình ứng dụng Firebase từ đúng project thật.
4. Chuẩn bị Cloudinary cloud name, preset phù hợp và thông tin API phía server. Xác minh luồng upload và quyền sở hữu media trên cloud trước khi phát hành.
5. Dữ liệu `.local/emulator-data`, tài khoản thử và `.local/uploads` không tự chuyển lên Firebase/Cloudinary. Các URL LAN, đường dẫn ổ đĩa và `/local-media/...` phải được thay bằng dữ liệu/media cloud hợp lệ qua quy trình chuyển dữ liệu riêng.

Chi tiết giới hạn upload hiện tại: [LOCAL_UPLOAD_STORAGE.md](LOCAL_UPLOAD_STORAGE.md). Chỉ deploy backend không tự giải quyết việc chuyển dữ liệu và media.

## 3. Triển khai backend lên Render

Trong Render Dashboard, chọn **New → Web Service**, kết nối repository và chọn đúng nhánh triển khai.

| Mục | Giá trị |
| --- | --- |
| Runtime | Node |
| Root Directory | Thư mục chứa `package.json` của ứng dụng; để trống nếu ứng dụng nằm ngay gốc repo |
| Build Command | `npm ci --prefix tools --no-audit --no-fund` |
| Start Command | `npm run backend:cloud` |
| Health Check Path | `/health` |
| Environment | `NODE_VERSION=24.12.0` hoặc bản vá Node 24 mới hơn đã kiểm thử |

Backend hiện bind `0.0.0.0` và đọc `PORT` do Render cấp; không cần gán cứng cổng. Dependencies backend nằm trong `tools/package.json`.

### Biến môi trường và Firebase credentials

Tham khảo `tools/backend/backend.env.example`, rồi đặt trong Render:

| Biến | Nội dung |
| --- | --- |
| `GOOGLE_CLOUD_PROJECT` | ID Firebase project thật, không bắt đầu bằng `demo-` |
| `CURSOR_SECRET` | Chuỗi ngẫu nhiên ít nhất 32 ký tự, giữ ổn định giữa các lần deploy |
| `GOOGLE_APPLICATION_CREDENTIALS` | `/etc/secrets/firebase-service-account.json` khi dùng Secret File bên dưới |
| `CLOUDINARY_CLOUD_NAME` | Cloud name của môi trường thật |
| `CLOUDINARY_API_KEY` | API key phía server |
| `CLOUDINARY_API_SECRET` | API secret phía server |
| `ALLOWED_ORIGINS` | Các origin web được phép, phân cách bằng dấu phẩy; chỉ cần nếu có client web |

Backend dùng Firebase Admin Application Default Credentials. Một cách cấu hình trên Render là thêm **Secret File** tên `firebase-service-account.json`, chứa JSON của service account được cấp quyền Auth/Firestore cần thiết; đặt biến đường dẫn như bảng trên. Bảo quản và xoay khóa theo quy trình của người quản trị. Không đưa file này vào Git hoặc APK.

Không đặt `FIRESTORE_EMULATOR_HOST` hoặc `FIREBASE_AUTH_EMULATOR_HOST` trên Render: entry point cloud sẽ từ chối chạy khi có chúng. Không dùng lệnh `local:backend` hoặc `local:emulators` làm Start Command.

### Kiểm tra sau deploy

1. Đợi deploy thành công, kiểm tra Logs không có lỗi credentials, schema hoặc Firestore indexes.
2. Mở `https://TEN-DICH-VU.onrender.com/health`, thay bằng URL thật. Kiểm tra HTTP thành công, chế độ cloud, project đúng và trạng thái sẵn sàng.
3. Thử đăng nhập, tải danh sách, tìm kiếm, nghe nhạc và upload bằng client cloud trước khi phát APK.

Tên miền trên chỉ là ví dụ. Ghi lại URL thật để dùng ở bước build APK.

Render Free có thể ngủ khi không có request; request đầu có thể chậm, và worker retention trong process không chạy khi service dừng. Muốn vận hành liên tục cần chọn cấu hình phù hợp. Filesystem mặc định của Render không bền qua restart/deploy; không dùng nó làm kho media người dùng. Search index hiện nằm trong RAM và được dựng lại; ban đầu nên chạy một instance vì cursor/trạng thái phân trang chưa dùng kho chia sẻ.

## 4. Chuẩn bị cấu hình APK

Các lệnh dưới đây chạy tại thư mục dự án, dùng npm/npx vì hiện không có `bun.lock`:

```cmd
npm ci
npm run lint
npm run typecheck
npx expo-doctor
npx eas-cli@latest login
npx eas-cli@latest build:configure
```

Đăng nhập đúng tài khoản Expo, liên kết/tạo project khi CLI hỏi. Lệnh cấu hình có thể cập nhật `app.json` và tạo `eas.json`; giữ project ID do Expo cấp.

Trong `app.json`, bổ sung `android` bên trong đối tượng `expo`, giữ các thuộc tính đang có:

```json
"android": {
  "package": "com.yourcompany.musicstream",
  "versionCode": 1
}
```

Thay package ví dụ bằng định danh riêng trước bản đầu tiên và giữ ổn định khi cập nhật. Không tự tạo/sửa thư mục native `android/` hoặc `ios/`.

### Biến môi trường của ứng dụng

Trong Expo Dashboard của đúng project, tạo các biến sau ở environment **preview**. Thay tất cả giá trị ví dụ bằng thông tin thật:

```dotenv
EXPO_PUBLIC_FIREBASE_MODE=cloud
EXPO_PUBLIC_BACKEND_URL=https://TEN-DICH-VU.onrender.com
EXPO_PUBLIC_FIREBASE_API_KEY=YOUR_FIREBASE_WEB_API_KEY
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=YOUR_PROJECT.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=YOUR_PROJECT
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=YOUR_FIREBASE_STORAGE_BUCKET
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=YOUR_SENDER_ID
EXPO_PUBLIC_FIREBASE_APP_ID=YOUR_FIREBASE_APP_ID
EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME=YOUR_CLOUD_NAME
EXPO_PUBLIC_CLOUDINARY_IMAGE_PRESET=YOUR_IMAGE_PRESET
EXPO_PUBLIC_CLOUDINARY_AUDIO_PRESET=YOUR_AUDIO_PRESET
```

Lấy nguyên cấu hình Firebase của project, không đoán bucket/app ID. Biến storage bucket thuộc cấu hình Firebase hiện có, không đồng nghĩa ứng dụng dùng Firebase Storage để upload.

Không đặt các biến `EXPO_PUBLIC_EMULATOR_HOST`, `EXPO_PUBLIC_AUTH_EMULATOR_PORT`, `EXPO_PUBLIC_FIRESTORE_EMULATOR_PORT` trong bản cloud; kiểm tra cả file `.env*` tại máy build. Không dùng URL `localhost`, `127.0.0.1`, `10.0.2.2` hoặc IP Wi-Fi cho bản phát hành.

Các biến `EXPO_PUBLIC_*` được đóng gói vào ứng dụng và có thể đọc được. Chọn visibility phù hợp cho cấu hình công khai trên Expo; tuyệt đối không đặt service-account JSON, `CURSOR_SECRET`, `CLOUDINARY_API_SECRET` hoặc mật khẩu quản trị vào đó. Chỉ chỉnh `.env` trên máy không bảo đảm remote build có cùng biến; cần cấu hình đúng environment trên Expo.

## 5. Xuất file APK

Thêm profile sau vào đối tượng `build` trong `eas.json`; giữ các profile/cấu hình khác nếu đã có:

```json
{
  "build": {
    "preview": {
      "distribution": "internal",
      "environment": "preview",
      "android": {
        "buildType": "apk"
      }
    }
  }
}
```

Build trên cloud:

```cmd
npx eas-cli@latest build --platform android --profile preview
```

Nếu được hỏi về Android keystore cho lần đầu, có thể chọn để EAS tạo và quản lý. Giữ cùng khóa ký cho các bản cập nhật; lưu thông tin project và quyền truy cập tài khoản.

Đợi build thành công rồi mở liên kết build do CLI cung cấp để tải `.apk`. Profile này tạo bản cài độc lập, không cần Metro. File `.aab` dùng cho phân phối qua Google Play, không mở cài trực tiếp như APK. `expo export` chỉ xuất bundle/assets, không tạo APK.

## 6. Hướng dẫn người dùng cài APK trên Android

1. Nhận link tải APK chính thức từ người quản trị và tải bằng trình duyệt trên điện thoại.
2. Mở file `.apk` trong mục Tải xuống/Downloads.
3. Nếu Android hỏi, vào cài đặt **Cài đặt ứng dụng không rõ nguồn gốc/Install unknown apps** và cho phép đúng trình duyệt hoặc ứng dụng quản lý file vừa dùng. Tên menu tùy hãng máy.
4. Quay lại file APK, chọn **Cài đặt → Mở**. Có thể tắt lại quyền cài từ nguồn đó sau khi hoàn tất.
5. Kết nối Internet, đăng ký hoặc đăng nhập tài khoản thật trong ứng dụng.
6. Thử mở danh sách, phát một bài, tua, tìm kiếm và mở lại app để xác minh phiên đăng nhập.

Không yêu cầu người dùng cài Expo Go hoặc chạy lệnh trên máy tính. Tài khoản Emulator không đăng nhập được Firebase thật trừ khi đã có quy trình chuyển tài khoản phù hợp. APK chỉ cài trên Android, không cài trên iPhone.

## 7. Cập nhật và xử lý lỗi

Khi phát bản mới, tăng `expo.version` và `android.versionCode` (hoặc áp dụng cơ chế quản lý version của EAS đã thống nhất), giữ package và khóa ký. Tải APK mới rồi cài đè để giữ dữ liệu cục bộ; gỡ app có thể làm mất phiên đăng nhập và dữ liệu chỉ lưu trên máy.

| Hiện tượng | Kiểm tra |
| --- | --- |
| Không cài được APK | Tải lại file đầy đủ, kiểm tra bộ nhớ, phiên bản Android được build hỗ trợ và thông báo cụ thể của hệ thống |
| Báo xung đột/chữ ký khác | Kiểm tra package và keystore; ưu tiên build lại bằng khóa cũ trước khi cân nhắc gỡ app |
| Mở app lỗi cấu hình | Kiểm tra environment preview và `EXPO_PUBLIC_FIREBASE_MODE=cloud`, sau đó build lại |
| Không tải được dữ liệu | Thử `/health`, kiểm tra Render Logs, HTTPS, project Firebase, Auth, Rules/indexes và migration |
| Lần mở đầu chậm | Kiểm tra service Render có đang khởi động lại sau khi ngủ không |
| Danh sách có bài nhưng không phát | Kiểm tra URL audio HTTPS trực tiếp, file còn tồn tại và quyền truy cập media |
| Upload thất bại | Kiểm tra Cloudinary preset, credentials server và giới hạn file; không chuyển sang kho upload LAN |
| Đổi URL backend nhưng APK vẫn dùng URL cũ | Build và phát APK mới với biến mới; sửa biến trên Render không sửa cấu hình đã đóng gói trong APK |

Trước khi gửi APK cho người dùng, thử trên điện thoại Android thật bằng cả Wi-Fi và 4G/5G; tắt Metro và máy local để xác nhận bản cài hoạt động độc lập. Kiểm tra đăng nhập/đăng xuất, tìm kiếm, phát/tua/chuyển bài, upload, playlist và lưu phiên sau khi đóng mở app.

## 8. Tài liệu chính thức

- [Expo SDK 58](https://docs.expo.dev/versions/v58.0.0/)
- [Cấu hình build APK và cài lên thiết bị](https://docs.expo.dev/build-reference/apk/)
- [Biến môi trường EAS](https://docs.expo.dev/eas/environment-variables/)
- [Triển khai Node/Express trên Render](https://render.com/docs/deploy-node-express-app)
- [Giới hạn Render Free](https://render.com/docs/free)
- [Lưu trữ bền vững trên Render](https://render.com/docs/disks)

Khi bắt đầu triển khai thật, đối chiếu lại tài liệu chính thức vì Expo/Render có thể thay đổi. Ghi nhận URL backend, phiên bản APK, ngày build và kết quả test thiết bị trong biên bản bàn giao.
