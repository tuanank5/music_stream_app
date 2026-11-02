# M0 — Chạy local với Firebase Emulator

App dùng Expo SDK 58. Local sử dụng duy nhất project giả `demo-music-stream`, Auth Emulator 9099, Firestore Emulator 8080 và backend Node 8787. Không cần service-account JSON, đăng nhập Firebase CLI, tạo project cloud hay đổi file `.env` đang có.

## Chuẩn bị

- Node hỗ trợ chạy TypeScript bằng type stripping (khuyến nghị Node 22.18+ hoặc 24 LTS), Java JDK theo yêu cầu Firebase CLI hiện tại.
- Dependencies app đã được cài. Với tools, cài đúng lockfile hiện có:

```powershell
npm.cmd ci --prefix tools --no-audit --no-fund
```

Không thêm dependency app hoặc đổi SDK trong M0. Máy thực hiện M0 dùng Node 26.13.0/Java 24.0.2; npm có cảnh báo engine của dependency công cụ (superstatic yêu cầu Node 20/22/24). Không tự upgrade các gói để xử lý cảnh báo này.

## Chạy trên máy tính

Terminal 1 — bật Auth và Firestore:

```powershell
npm.cmd run local:emulators
```

Lần đầu Firebase CLI cần mạng để tải Java emulator; các lần sau dùng cache `.local/emulators`. Emulator data hiện chỉ ở bộ nhớ; tắt/bật lại cần seed. Log `*-debug.log` và cache không commit vào git.

Trên Windows, wrapper CLI tự xác định `java.home` và ưu tiên JDK/bin để tránh Oracle javapath launcher để lại JVM khi đóng Emulator.

Terminal 2 — đưa fixture vào Emulator rồi chạy backend:

```powershell
npm.cmd run local:seed
npm.cmd run local:backend
```

Terminal 3 — khởi động Expo với cấu hình local:

```powershell
npm.cmd run start:local -- --clear
```

Muốn mở web có thể thêm `--web`. Không cần thay `.env`: lệnh này tắt dotenv của Expo, truyền trực tiếp project demo và endpoints, làm rỗng cấu hình Cloudinary. Không dùng lệnh start thông thường để giả định đang ở local.

## Android emulator và điện thoại thật

Android emulator truy cập máy chủ qua `10.0.2.2`:

```powershell
$env:LOCAL_APP_HOST = '10.0.2.2'
npm.cmd run start:local -- --clear
```

Điện thoại thật: thay host bằng IPv4 LAN của máy tính, cùng mạng Wi-Fi, ví dụ:

```powershell
$env:LOCAL_APP_HOST = '192.168.1.10'
npm.cmd run start:local -- --clear
```

`127.0.0.1` trên điện thoại là chính điện thoại. Auth/Firestore/backend bind `0.0.0.0` để thiết bị LAN truy cập; nếu firewall chặn thì cấu hình cho mạng thử nghiệm phù hợp. Không mở/forward các cổng Emulator ra internet. Không cần thay host server trong các lệnh seed/backend trên máy tính.

Đổi host cần khởi động lại Expo và reload app để bundle nhận env mới. Không đổi mode/endpoint bằng Fast Refresh khi SDK đã được khởi tạo.

## Tài khoản và fixture

Password chung chỉ dùng local: `LocalMusic123!`.

| Email | Vai trò |
| --- | --- |
| local-listener@example.test | Người nghe; có favorites, following, playlist, lịch sử |
| local-artist-01@example.test | Nghệ sĩ sở hữu bài public/private/unlisted/followers |
| local-artist-02@example.test … local-artist-24@example.test | Nghệ sĩ thử nghiệm |
| local-admin@example.test | Có custom claim admin trong Auth Emulator |

Fixture tạo 26 tài khoản, 120 bài public + 3 bài kiểm tra visibility, 12 album, 160 phiên history với 80 bài khác nhau, 25 favorites, playlist, quan hệ follow có counters tương ứng, post và comment. Có hơn 50 bài Pop để kiểm tra Top 50 về sau.

Audio dùng `demo1/demo2/demo3` đã bundle; cover/avatar rỗng để dùng fallback. Không dùng ảnh hoặc media internet trong fixture. Seed có thể chạy lại với cùng ID, không xóa collection; việc seed lại ghi đè các document fixture cùng ID, do đó chỉ dùng cho dữ liệu thử. Không thể dùng tool này seed project cloud.

Lưu ý baseline: `trimHistory` hiện tại vẫn xóa xuống 100 phiên sau khi tạo phiên nghe mới. Fixture cố ý có 160 phiên để phục vụ kiểm tra phân trang; việc chuyển retention 1.000 là M4, chưa làm trong M0.

## Backend Node M0

- `GET http://127.0.0.1:8787/health`: thông tin mode/project/milestone sau khi kiểm tra Emulator sẵn sàng lúc khởi động.
- `GET /session`: yêu cầu Bearer token do Auth Emulator cấp, đọc đúng profile UID của token từ Firestore; trả UID/displayName/admin, không trả email hoặc token.
- Endpoint khác trả 404; Search và retention sẽ được xây ở M3/M4. Backend này là nền local M0, chưa phải Cloud Function production.

Backend/seed từ chối project thật và host emulator không thuộc loopback/LAN. Emulator chưa bật thì khởi động backend/seed thất bại thay vì dùng cloud. Token local không được chấp nhận ở Firebase production.

## Chặn dịch vụ ngoài và mode cloud

- `uploadMedia` kiểm tra mode trước đọc file/tạo FormData/fetch; local báo upload bị tắt, không tạo upload Cloudinary và không trả URL giả.
- Fixture chỉ dùng media bundled/fallback. Đây không phải firewall chặn toàn bộ internet; không nhập URL media bên ngoài khi kiểm thử local. Các dịch vụ mới ở mốc sau phải có mock/local adapter riêng.
- Không có Firebase mode hoặc local config không đầy đủ: app hiện thông báo thiết lập, không mount Auth/Data/Player và không tự suy đoán từ các biến cloud sẵn có trong `.env`.
- Giữ nguyên `.env` của người dùng. Muốn chạy cloud về sau cần chủ động thêm `EXPO_PUBLIC_FIREBASE_MODE=cloud` và đủ 6 biến Firebase Web config; không trộn các biến endpoint Emulator trong mode cloud. M0 không thực hiện bước này hoặc deploy.
- App local và cloud dùng tên Firebase app khác nhau để tách Auth persistence. Không chuyển mode khi app đang chạy.

## Kiểm tra tự động

```powershell
npm.cmd run lint
npm.cmd run typecheck
npm.cmd test
npm.cmd run test:local:integration
```

`npm test` gồm bộ core/UI và các kiểm tra fail-closed/upload/fixture. Có thể chạy riêng kiểm tra mới bằng `npm.cmd run test:local`.

`test:local:integration` tự khởi động Auth/Firestore với rules repo, seed fixture, chạy client SDK thực qua các getter của app, đăng nhập, kiểm tra visibility/history, kiểm tra token ở backend Node và seed lại. Tự đóng backend trong test và yêu cầu CLI đóng Emulator sau khi xong. Không chạy cùng `local:emulators` đang chiếm cổng; không tự dừng chương trình khác giữ cổng.

Đây chưa phải toàn bộ suite `test:rules` cũ: fixture/expectations của suite cũ đang không khớp schema, thuộc M6. Không coi smoke test M0 là audit toàn bộ phân quyền hoặc xác nhận giao diện/audio native.

## Baseline trước M0

| Kiểm tra | Kết quả |
| --- | --- |
| npm.cmd run lint | PASS, exit 0 |
| npm.cmd run typecheck | PASS, exit 0 |
| npm.cmd test | PASS 16/16 trước khi bổ sung test M0 |

Tại baseline trước M1: Search rỗng lọc `includes('')` nên hiển thị catalog; Library còn các nút/filter cũ; setFollow tăng followerCount target hai lần; history watch 100 phiên và trim client giữ 100; Home tính discovery từ DataContext. Xem checkpoint mới nhất trong IMPLEMENTATION_ROADMAP.md để biết phần nào đã được sửa.

Kết quả sau M0 ngày 2026-11-03: lint/typecheck PASS, npm test 22/22 PASS, integration Auth/Firestore/Node thực 3/3 PASS, wrapper start:local --help PASS. Sau lượt test cuối không còn listener của các services trên 8080/9099/8787/4400. Chưa kiểm tra giao diện trên Android/iOS và chưa deploy cloud.

## Cập nhật M1 — 2026-11-03

M1 đã sửa Follow/Unfollow và rules liên quan ở local; counter updates được giữ trong transaction, có hàng đợi theo UID để tránh thao tác cạnh tranh từ nhiều nút. Không cần admin để follow, sửa counter trực tiếp vẫn bị từ chối. Chưa deploy rules/backend lên Firebase thật.

`npm test` hiện gồm 35 tests, trong đó 13 tests kiểm tra provider/lifecycle/render với ReactDOM + happy-dom (devDependency). Firebase transport và audio được stub trong harness; không đại diện audio/UI native. `test:local:integration` hiện có 4 tests dùng Auth/Firestore/rules thật trên Emulator. Log PERMISSION_DENIED ở ca cố sửa counter trái phép là kết quả mong đợi, không phải test fail.

Player chia actions/state/progress nhưng vẫn dùng một engine; data chia catalog/library/history. Source đang giữ nguyên nghiệp vụ Search/Library/history retention để làm tiếp M2–M5. Phiên kiểm tra cuối: lint/typecheck PASS, 35/35 + 4/4 tests PASS; không còn listener server do test để lại.

## Tài liệu đối chiếu trước triển khai

- https://docs.expo.dev/versions/v58.0.0/
- https://docs.expo.dev/guides/environment-variables/
- https://firebase.google.com/docs/emulator-suite/connect_auth
- https://firebase.google.com/docs/emulator-suite/connect_firestore
- https://firebase.google.com/docs/emulator-suite/install_and_configure
