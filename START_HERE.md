# music_stream_app — hướng dẫn A–Z

Đây là bộ source mới dành cho **music_stream_app**, dùng Expo + React Native + TypeScript + Expo Router, Firebase Authentication và Cloud Firestore. Không dùng Spring Boot, SQL, Firebase Storage hoặc thanh toán. Hãy đọc theo thứ tự; không chỉ chép vài màn hình vào project cũ vì entry/navigation đã được chuyển sang Expo Router.

## 1. Giữ bản cũ và mở đúng source

1. Đổi tên thư mục cũ thành `music_stream_app_backup`; không xóa dữ liệu Firebase cũ.
2. Giải nén ZIP, đổi tên thư mục source thành `music_stream_app` nếu muốn.
3. Mở thư mục có `package.json`, `src`, `firestore.rules` bằng Cursor/VS Code.
4. Mở Terminal → Command Prompt. Tất cả lệnh dưới đây chạy ở thư mục này, trừ khi có `cd tools`.

Bộ code dùng `main: expo-router/entry`, route ở `src/app`. Không tạo thêm `App.tsx` hoặc bọc thêm NavigationContainer. Các ảnh thiết kế cũ không có trong bộ này cần được chép bổ sung vào assets nếu bạn muốn tinh chỉnh giao diện sau.

## 2. Cài dependencies

Cài Node.js 24 LTS, đóng rồi mở lại Terminal. Kiểm tra:

```bat
node -v
npm -v
npm ci
```

Giữ `package-lock.json`. Không tự thay một phiên bản React Native riêng lẻ. Nếu Expo Go trên điện thoại không hỗ trợ SDK của source, dùng bản Expo Go tương thích hoặc development build theo tài liệu Expo; có thể kiểm tra web trước. Source đã kiểm tra với các phiên bản trong lockfile, không bảo đảm mọi bản Expo Go đều chạy được.

## 3. Nối đúng Firebase project

Firebase Console → chọn đúng project của bạn → Project settings → General → Your apps → Web app → SDK setup and configuration → Config. Nếu chưa có Web app, bấm biểu tượng `</>` để đăng ký app. React Native ở đây dùng Firebase JavaScript SDK; không cần google-services.json cho cách tích hợp này.

```bat
copy .env.example .env
```

Mở `.env` ngay cạnh `package.json`, điền 6 giá trị từ **cùng một Firebase project**:

```dotenv
EXPO_PUBLIC_FIREBASE_API_KEY=gia_tri_apiKey
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=gia_tri_authDomain
EXPO_PUBLIC_FIREBASE_PROJECT_ID=gia_tri_projectId
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=gia_tri_storageBucket
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=gia_tri_messagingSenderId
EXPO_PUBLIC_FIREBASE_APP_ID=gia_tri_appId
```

Tên file là `.env`, không phải `.env.firebase` hoặc `.env.txt`. Không dùng các chữ ví dụ ở trên làm giá trị thật. Việc điền `storageBucket` chỉ hoàn thiện cấu hình, không bật Storage và code không tải file lên bucket. Web Firebase config được đóng gói vào client; quyền dữ liệu được bảo vệ bằng Auth và Rules. Không đưa service-account/private key vào bất kỳ biến EXPO_PUBLIC nào.

Bạn có thể tiếp tục dùng Firebase project cũ nếu muốn; đổi tên thư mục ứng dụng không tự đổi Firebase project. Không cần tạo project mới chỉ vì tên app đổi.

## 4. Bật đăng nhập Email/Password

Firebase Console → Authentication → Get started nếu chưa kích hoạt → Sign-in method → Email/Password → bật **Email/Password** → Save. Không cần bật Email link.

Khi chạy web: Authentication → Settings → Authorized domains → thêm `localhost` nếu chưa có. Không cần nhập `http://`, port hoặc đường dẫn vào danh sách domain.

Sau khi đăng ký từ ứng dụng, vào Authentication → Users để xem email và UID. Tài khoản Firebase Auth và document `users/{uid}` là hai nơi khác nhau.

## 5. Tạo Cloud Firestore và Publish Rules

1. Mở Firestore Database → Create database nếu chưa có → chọn database **(default)** và khu vực phù hợp. Nếu đã có thì giữ database đó.
2. Mở tab **Rules**. Sao lưu Rules đang dùng, rồi thay nội dung bằng toàn bộ file `firestore.rules` của source này.
3. Bấm **Publish**. Chỉ sửa file trên máy không cập nhật Rules trên Firebase.
4. Không dùng `allow read, write: if true` để bỏ qua lỗi quyền.

Source hiện dùng query một trường nên file `firestore.indexes.json` chưa có composite index. Nếu sau này sửa query và Firebase trả về yêu cầu index, đọc query rồi tạo index đúng theo link trong thông báo.

Cách deploy bằng CLI là tùy chọn, không bắt buộc khi đã Publish Rules trong Console:

```bat
cd tools
npm ci
npx firebase login
cd ..
tools\node_modules\.bin\firebase.cmd deploy --only firestore --project FIREBASE_PROJECT_ID_CUA_BAN
```

Không dùng `demo-music-stream` khi deploy thật: đó là ID dành riêng cho tests.

## 6. Chạy app và đăng ký tài khoản

```bat
npx expo start -c
```

Bấm `w` để thử web hoặc quét QR bằng môi trường Expo tương thích. Máy và điện thoại cần kết nối được với nhau. Dùng Create an account → nhập tên, email, mật khẩu ít nhất 8 ký tự và xác nhận → đăng ký.

Kiểm tra:

- Authentication → Users: có tài khoản vừa tạo.
- Firestore → Data → `users` → document có ID bằng UID, có displayName/email/photoURL/createdAt.
- Đăng xuất rồi đăng nhập lại; đóng/mở app để kiểm tra lưu phiên.
- Quên mật khẩu: điền email tại trang đăng nhập rồi bấm nút đặt lại; kiểm tra email/spam.

Đăng ký Auth có thể thành công nhưng lưu profile thất bại do Rules/mạng. App báo rõ trường hợp này. Sửa Rules rồi vào Hồ sơ lưu lại; không đăng ký lại cùng email để chữa lỗi profile.

## 7. Cấp quyền admin một lần trên máy quản trị

Admin được xác định bằng **custom claim `admin: true`**, không dùng trường role tự sửa trong Firestore. Người dùng thường không được quyền sửa danh mục bài hát/nghệ sĩ.

1. Firebase Console → Authentication → Users → chọn tài khoản bạn vừa đăng ký → copy UID.
2. Project settings → Service accounts → Firebase Admin SDK → Generate new private key. Chỉ chủ project thực hiện. Lưu file JSON **ngoài thư mục source**, ví dụ `D:\firebase-private\music-stream-admin.json`.
3. Không gửi file này cho ai, không chép vào assets, .env, Git hoặc ZIP nộp báo cáo.
4. Trong Command Prompt:

```bat
cd tools
npm ci
set GOOGLE_APPLICATION_CREDENTIALS=D:\firebase-private\music-stream-admin.json
set GOOGLE_CLOUD_PROJECT=FIREBASE_PROJECT_ID_CUA_BAN
node set-admin.cjs UID_CUA_TAI_KHOAN
```

Thay project ID/UID bằng giá trị thật, không giữ chữ mẫu. Script chỉ cấp quyền cho tài khoản đã tồn tại, giữ các claim khác. Muốn thu hồi: `node set-admin.cjs UID_CUA_TAI_KHOAN --revoke`.

5. Trở lại app → Hồ sơ → làm mới quyền; nếu chưa thấy, đăng xuất/đăng nhập. Home sẽ có nút Quản trị. Không cần deploy Cloud Functions.
6. Có thể xóa biến môi trường của phiên CMD sau khi dùng:

```bat
set GOOGLE_APPLICATION_CREDENTIALS=
set GOOGLE_CLOUD_PROJECT=
```

Nếu dùng PowerShell, cú pháp tương ứng là `$env:GOOGLE_APPLICATION_CREDENTIALS='D:\firebase-private\music-stream-admin.json'` và `$env:GOOGLE_CLOUD_PROJECT='project-id'`. Các lệnh `set` ở trên dành cho CMD.

## 8. Nhập dữ liệu để app có bài hát

### Cách nhanh: tạo dữ liệu demo

Trong chính terminal `tools` đã đặt biến credentials/project ở bước 7:

```bat
node seed.cjs --confirm
cd ..
```

Script tạo 2 nghệ sĩ và 3 bài demo, **không ghi đè document đã có**. ID bắt đầu `demo-`. Nhạc demo là giai điệu tổng hợp 12 giây đi kèm source để kiểm tra Player, không phải bản thu thương mại. Ảnh trống hiển thị placeholder.

Kiểm tra Console → Firestore → Data thấy `artists` và `songs`; Home sẽ cập nhật qua realtime listener. Nếu đã xóa biến môi trường, đặt lại trước khi chạy seed.

### Cách sử dụng thực tế: quản trị trong app

1. Đăng nhập admin → Home → Quản trị.
2. Tạo nghệ sĩ: tên, URL ảnh HTTPS nếu có, tiểu sử, trạng thái hoạt động → Lưu.
3. Tạo bài hát: tên, chọn nghệ sĩ, album, URL ảnh HTTPS, URL nhạc HTTPS, thời lượng giây, lời bài hát → Lưu.
4. Không có URL nhạc thì chọn `audioKey` là `demo1`, `demo2` hoặc `demo3`; URL nhạc để trống. Audio URL nếu có sẽ được ưu tiên.
5. Bấm Sửa để cập nhật; Ẩn để ngừng hiển thị. Xóa vĩnh viễn bài hát cần xác nhận, các playlist cũ có thể còn ID tham chiếu và app sẽ bỏ qua bài không còn tồn tại.

Nếu nhập thủ công trong Console, document bài hát cần đủ cấu trúc này. Đây là ví dụ kiểu JSON để đọc, Console cần thêm từng field với đúng kiểu:

```json
{
  "title": "Bài thử nghiệm",
  "artist": "Music Stream Studio",
  "artistId": "demo-artist-1",
  "album": "Demo",
  "coverUrl": "",
  "audioUrl": "",
  "audioKey": "demo1",
  "durationSeconds": 12,
  "lyrics": "Nhạc không lời",
  "active": true
}
```

`durationSeconds` là number, `active` là boolean, các field còn lại string. `artistId` phải là ID document nghệ sĩ đã tồn tại, hoặc chuỗi rỗng. Không đưa `id` vào document vì code lấy ID từ Firestore. Document nghệ sĩ cần name/imageUrl/biography/active. Console Admin có thể bỏ qua Security Rules: nhập sai trong Console vẫn làm app đọc sai.

Dữ liệu cũ chỉ có title/artist/audioUrl/coverUrl có thể được đọc với giá trị mặc định. Khi sửa bằng admin form, source ghi lại đầy đủ schema mới. Hãy kiểm tra từng bài, đặc biệt active, durationSeconds và artistId. Không xóa cả database để sửa schema.

## 9. Không sử dụng Storage: ảnh và nhạc để ở đâu?

- Ảnh giao diện tĩnh: `assets/images`, dùng `require(...)` trong code.
- Nhạc demo trong ứng dụng: `assets/audio`, ánh xạ `demo1..3` ở PlayerContext.
- Ảnh bìa và nhạc thật: dùng URL **HTTPS trực tiếp** từ nơi bạn có quyền lưu/phát file; lưu chuỗi đó vào coverUrl/audioUrl trong Firestore. Firestore chỉ lưu metadata, không lưu file MP3.
- Không dùng `D:\...`, `file:///...`, link trang YouTube/Spotify hoặc link trang chia sẻ cần đăng nhập làm audioUrl. Điện thoại không truy cập được ổ D của máy tính.
- Thử mở URL trên trình duyệt ẩn danh và điện thoại; URL phải trả ảnh hoặc dữ liệu âm thanh, không phải một trang HTML. Web cần máy chủ file cho phép truy cập phù hợp (CORS), HTTPS và hỗ trợ định dạng/bộ giải mã.
- URL công khai có thể được truy cập ngoài app. Rules Firestore không bảo vệ file đặt ở máy chủ khác. Kiểm tra điều kiện và hạn mức của nơi host file; bộ source này không bật gói trả phí hoặc tích hợp upload.

Muốn thêm nhạc đóng gói: chép MP3 vào assets/audio, thêm khóa mới và require tĩnh trong PlayerContext, đồng thời cập nhật enum audioKey trong catalogService và firestore.rules. Metro không hỗ trợ tùy ý require chuỗi đường dẫn lấy từ Firestore.

## 10. Thử đầy đủ các chức năng

Tạo hai tài khoản A (admin) và B (người dùng), dùng hai trình duyệt hoặc đăng xuất/đăng nhập luân phiên:

| Việc thử                                  | Kết quả cần thấy                                                         |
| ----------------------------------------- | ------------------------------------------------------------------------ |
| Admin thêm/sửa bài                        | Home và Search cập nhật; refresh vẫn có dữ liệu                          |
| Tìm tên tiếng Việt không dấu              | Tìm thấy bài/nghệ sĩ tương ứng                                           |
| Phát bài, dừng, tiếp, trước, seek, repeat | Player và MiniPlayer cùng trạng thái; demo phát đủ 12 giây               |
| Bấm tim rồi bỏ tim                        | `users/UID/favorites/SONG_ID` được tạo/xóa                               |
| Tạo/đổi tên/xóa playlist                  | Dữ liệu ở `users/UID/playlists/PLAYLIST_ID`                              |
| Thêm/xóa bài khỏi playlist                | Mảng songIds đổi; thứ tự theo danh sách đã lưu                           |
| Theo dõi/bỏ theo dõi nghệ sĩ              | `users/UID/following/ARTIST_ID` đổi                                      |
| Hồ sơ sửa tên/ảnh                         | Auth profile và Firestore user được lưu                                  |
| Tạo/sửa/ẩn bài Feed                       | Chỉ chủ bài hoặc admin sửa/ẩn; người khác không có nút sửa               |
| Tạo/sửa/xóa bình luận                     | Chủ bình luận sửa/xóa; admin có thể xóa                                  |
| Đăng nhập B                               | Không thấy playlist/yêu thích/hồ sơ riêng của A, không có quyền quản trị |
| Ẩn hoặc xóa bài bằng admin                | Không còn bài trong danh sách hoạt động; thư viện không crash            |

Không chỉ kiểm tra nút bị ẩn: chạy rules tests ở bước sau để kiểm tra quyền tại server. Trên Firebase thật, phải Publish cùng file Rules mới có quyền tương ứng.

## 11. Chạy kiểm tra mã nguồn và quyền

Ở root:

```bat
npm run typecheck
npm run lint
npm test
npx expo export --platform web
```

`npm test` dùng khả năng chạy TypeScript của Node 24. Rules tests cần Java/JDK cài sẵn (ưu tiên JDK 21) và tools dependencies từ bước 7:

```bat
tools\node_modules\.bin\firebase.cmd emulators:exec --only firestore --project demo-music-stream "npm run test:rules"
```

Tests dùng project demo và Firestore emulator localhost:8080, không dùng database thật. Không đổi ID demo thành project thật trong lệnh tests. Đừng chạy `npm run test:rules` riêng khi chưa có emulator.

Kết quả đã kiểm tra tại thời điểm bàn giao xem `docs/TEST_REPORT.md`. Android bundle xuất thành công không thay thế kiểm tra thực tế trên điện thoại; đặc biệt kiểm tra âm thanh, lưu phiên và mạng.

## 12. Các lỗi thường gặp

| Thông báo/hiện tượng                  | Cách xử lý                                                                            |
| ------------------------------------- | ------------------------------------------------------------------------------------- |
| npx/npm không nhận diện               | Cài Node rồi mở Terminal mới; `where node`, `where npm`                               |
| Màn hình Thiết lập Firebase           | .env nằm sai chỗ, thiếu một trong 6 biến hoặc chưa restart Expo `-c`                  |
| auth/configuration-not-found          | Kiểm tra đúng project trong .env và đã kích hoạt Authentication/Email Password        |
| invalid-api-key/project-not-found     | Copy lại đúng Web config; không trộn các project                                      |
| invalid-credential                    | Kiểm tra email/password, Authentication → Users; dùng quên mật khẩu nếu cần           |
| permission-denied                     | Publish Rules; kiểm tra UID/chủ dữ liệu; admin phải có claim mới, schema phải đầy đủ  |
| Đăng ký được nhưng không có users doc | Sửa Rules, vào Hồ sơ lưu lại; tài khoản vẫn nằm trong Auth                            |
| Không thấy Quản trị                   | set-admin đúng project và UID; làm mới quyền hoặc đăng nhập lại                       |
| Home trống                            | Seed hoặc thêm songs/artists; active phải true; kiểm tra lỗi listener và đúng project |
| Ảnh/nhạc không tải                    | HTTPS trực tiếp, không cần login, URL chưa hết hạn; CORS/codec/thiết bị mạng          |
| Playlist không thêm được bài          | Bài phải còn tồn tại, active=true, mảng tối đa500, mỗi thao tác thêm một ID hợp lệ    |
| Dữ liệu không đổi khi sửa file rules  | File chưa được Publish/deploy; source không tự upload Rules                           |
| Java không chạy emulator              | Cài JDK21, kiểm tra `java -version`, mở terminal mới                                  |

## 13. Phạm vi đã làm và các phần chưa phải sản phẩm thương mại

Source không tự nâng cấp gói Firebase hoặc bật billing. Firestore/Auth vẫn có hạn mức của nhà cung cấp; hãy theo dõi Usage trong Console, không xem việc bỏ Storage là dữ liệu không giới hạn.

Có: Auth email/password, reset password, profile, claim admin; danh mục bài hát/nghệ sĩ; CRUD playlist/yêu thích/theo dõi; tìm kiếm; một player dùng chung; Feed và comments; rules và tests; seed và tài liệu ERD.

Giới hạn có chủ ý: tải tối đa200 bài/100 nghệ sĩ,100 playlist,500 yêu thích/theo dõi; menu thêm bài hiển thị10 playlist đầu; Feed50 bài/bình luận100; chưa phân trang. Cần pagination trước khi mở rộng dữ liệu lớn. Favorites/following là toggle create/read/delete; không có ý nghĩa sửa riêng một favorite.

Premium là trang giới thiệu, chưa thu tiền/mua gói/tải offline. Trang danh mục không phải bảng xếp hạng theo lượt nghe. Chưa có shuffle, like Feed, thông báo đẩy, upload, đồng bộ đa thiết bị tiến độ phát hay cam kết phát nền/lockscreen. Album là chuỗi trong song, chưa có collection album riêng. UI là bản triển khai chức năng có dùng một số ảnh đã cung cấp, chưa sao chép từng pixel của toàn bộ ảnh thiết kế.

Ẩn bài/post là soft delete để giữ tham chiếu; dữ liệu ẩn không phải dữ liệu bí mật. Songs/artists được đọc công khai; posts (kể cả archived) đọc bởi người đã đăng nhập. Cần thiết kế lại quyền/query nếu muốn nội dung riêng tư hoặc moderation nghiêm ngặt.

Để nộp báo cáo: xem `docs/ARCHITECTURE.md` và `docs/TEST_REPORT.md`; tự thêm ảnh chụp ứng dụng/Firebase thật và kết quả kiểm thử trên máy của bạn. Không ghi trong báo cáo rằng một chức năng đã kiểm thử thật nếu mới có code.
