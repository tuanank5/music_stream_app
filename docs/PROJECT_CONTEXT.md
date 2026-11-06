# Ngữ cảnh tổng hợp dự án music_stream_app

Cập nhật 2026-11-06. Đây là tài liệu chính cho ChatGPT/coding agent, tổng hợp README, yêu cầu backend/UI, tiến độ và hướng dẫn upload. Các checkpoint đã bị thay thế được rút gọn; đặc tả còn hiệu lực được giữ để không mất yêu cầu sản phẩm.

## Thứ tự đọc và nguồn sự thật

1. [AGENTS.md](../AGENTS.md): quy tắc sửa code, Expo và kiểm thử.
2. Tài liệu này: kiến trúc, trạng thái, dữ liệu, vận hành và yêu cầu sản phẩm.
3. [PROJECT_REVIEW_2026-11-06.md](PROJECT_REVIEW_2026-11-06.md): báo cáo rà soát được giữ nguyên, lỗi có bằng chứng và định hướng APK/Render/AI.
4. Kiểm tra mã nguồn, git diff, package.json và dữ liệu thực trước khi tiếp tục. Đặc tả không có nghĩa đã nghiệm thu; checkpoint test cũ không chứng minh code hiện tại đạt. Yêu cầu mới nhất của người dùng điều chỉnh phạm vi công việc.

## Trạng thái và kiến trúc hiện tại

Ứng dụng nghe nhạc mobile-first: Expo ~58.0.20, React Native 0.88, React 19.3, Expo Router, Tamagui. Dùng npm/package-lock; Node 24.12+ và Java/JDK cho Emulator. Không tự nâng SDK/package manager. Không dùng Spring Boot hoặc Firebase Storage cho media.

| Thành phần | Đã có | Còn lại/giới hạn |
| --- | --- | --- |
| Auth/hồ sơ | Firebase Auth; Express /me, /me/ensure, cập nhật/deactivate; users là nguồn counters | Auth/Firestore không chung transaction, cần đối soát lỗi và nhiều thiết bị |
| Nghiệp vụ | Express 5 cho catalog/album/playlist/favorites/follow/feed/comments/upload/playback/history | Paging một số provider/UI, refresh giữa thiết bị, đo reads |
| Firestore | Admin SDK phía server, Rules repo deny toàn bộ client nghiệp vụ | Chưa xác nhận rollout cloud; backend tự kiểm tra quyền |
| Search/Discovery | SQLite FTS5 RAM; cursor, genre/history/popularity/follow graph | Chưa embedding/vector/LLM; chưa đo tải cloud |
| Local media | Upload audio/ảnh thật vào .local/uploads, metadata Emulator, URI tương đối | LAN tạm; biết URL đọc được file; chưa cleanup/ledger/quota đĩa |
| Cloud media | Signed audio/ảnh, xác minh metadata/owner server; publicId và imageAssets ledger; cleanup ảnh dry-run/apply có grace/retry | Chưa QA Cloudinary thật; ảnh/audio cũ chưa import ownership, chưa cleanup audio hoặc private-file delivery |
| Schema | Target isPublic, users counters, migration/restore/fixture local | Apply tối đa 400 source docs, chưa importer/migration cloud hoàn chỉnh |
| Player | Một engine, queue/repeat/seek, telemetry/counting/retention | Native/background QA, outbox/session bền qua restart |
| APK/AI | Có eas.json, Dockerfile.backend; lyric nhập tay; Docker build/run smoke đã đạt trên GitHub Actions | Chưa build/QA APK; AI mới là định hướng |

Luồng: Screen → hook/service → Express với Firebase Bearer token → Admin Firestore/index → DTO whitelist → UI. SQLite chỉ là index tái tạo được; Firestore là nguồn dữ liệu. Cloudinary là dịch vụ riêng, không thuộc Google Cloud.

Không có vai trò admin sản phẩm; Firebase Admin SDK vẫn cần ở backend. Premium là demo, chưa thanh toán/entitlement/offline/cast/notifications. Tên hàm watch có thể là API subscription/invalidation, không mặc định Firestore realtime client.

## Bản đồ mã nguồn

| Đường dẫn | Trách nhiệm |
| --- | --- |
| src/app/ | Routes mỏng: guard/params/screen; entry expo-router/entry |
| src/screens/ | Screen implementations; mỗi screen một file, routes trong src/app chỉ nối params/guard |
| src/components/, ui/, discovery/ | UI dùng chung, layout/cards/sections; dùng trực tiếp components/ui/index hoặc implementation cụ thể |
| src/contexts/, src/hooks/ | Auth/Data/Player/Theme, forms, pager, lifecycle |
| src/services/backendService.ts | Token, API, pending dedupe, timeout 15 giây hiện tại |
| src/services/firebase/ | Config/runtime cloud/emulator, Auth persistence |
| src/services/mediaUploadService.ts | Multipart local; ảnh/audio cloud lấy signed config từ backend, không dùng unsigned preset |
| tools/backend/main.cjs, http-app.cjs | Entry cloud, middleware, mount Express routers |
| tools/backend/service.cjs, search-index.cjs | Listeners/cache, FTS, cursor/search/discovery |
| tools/backend/*-routes.cjs | Quyền và nghiệp vụ theo nhóm API |
| tools/backend/playback-policy.cjs, retention.cjs | Telemetry/counting, dọn history |
| tools/backend/local-media.cjs, audio-assets.cjs | Kho file local, Cloudinary verification |
| tools/local/ | Emulator, fixture/seed, editable-data và isolated tests |
| data/local/ | JSON người dùng sửa; không đồng nhất fixture hardcoded |
| tests/ | Unit/hook/UI adapter, Emulator/Rules integration |

## Chạy local và quản lý dữ liệu

Cài dependencies bằng `npm ci` và `npm ci --prefix tools --no-audit --no-fund`. Local không cần Firebase CLI login, service-account JSON hoặc Cloudinary key.

Mở ba CMD tại root, giữ chạy khi test:

```cmd
npm run local:emulators
```

```cmd
set LOCAL_BACKEND_HOST=0.0.0.0
npm run local:backend
```

```cmd
set LOCAL_APP_HOST=192.168.1.15
npm run start:local -- --clear
```

Thay IP bằng Wi-Fi IPv4 của máy. PowerShell dùng `$env:LOCAL_APP_HOST="192.168.1.15"` và `$env:LOCAL_BACKEND_HOST="0.0.0.0"` trong đúng cửa sổ. Android Emulator dùng 10.0.2.2; web trên máy dùng `npm run start:local -- --web`. start:local bỏ dotenv, dùng demo-music-stream, không fallback cloud. Đổi endpoint phải restart Expo và đóng hẳn app.

Nếu Emulator mới chưa có dữ liệu, trước khi bật backend/app chọn một nguồn:

- JSON đang chỉnh: `npm run data:check`, chỉ khi đạt mới `npm run data:apply`. Guitar đã đủ g01.mp3–g48.mp3; check hiện 394 documents, 120 audio, 0 lỗi và 158 cảnh báo ảnh. Không apply vào Emulator người dùng khi chỉ muốn kiểm tra.
- Fixture kiểm thử riêng: `npm run local:seed`, WAV tổng hợp 12/45 giây; checkpoint fixture 26 tài khoản/397 document. Không seed thay dữ liệu người dùng hoặc lên cloud.

Nếu đã có dữ liệu sửa/upload cần giữ, không chạy lại seed/apply: chúng ghi đè ID trùng. Tài khoản demo: local-listener@example.test, local-artist-01@example.test … local-artist-24@example.test, local-member@example.test. Mật khẩu demo mới LocalMusic123!; tài khoản đã có có thể giữ mật khẩu đã đổi.

Auth 9099, Firestore 8080, backend 8787, Emulator UI http://127.0.0.1:4000, Hub 4400, Metro thường 8081. Trên điện thoại cùng LAN phải mở được `http://<IP>:8787/health` (ready=true, emulator/demo-music-stream) và `http://<IP>:9099/emulator/v1/projects/demo-music-stream/config`. QR Metro không chứng minh Auth/backend thông. Kiểm tra firewall Private/VPN/AP isolation; không mở Emulator ra Internet.

JSON dùng id/parentId dựng path, không lưu lặp; ISO UTC chuyển Timestamp. data:apply backup document sắp ghi đè, không xóa doc/Auth khác, ghi đè ID trùng; Auth/Firestore không chung transaction. Following dư/counters lệch có thể chặn import. App/UI không ghi ngược JSON. Xem [dataset README](../data/local/README.md).

## Lưu trữ media local

### Dữ liệu lưu ở đâu

- Audio/ảnh thật: `.local/uploads/<uuid>.<ext>` trên máy chạy backend.
- Metadata nội bộ của file: file `.json` cạnh file media, có ownerId/kind/duration/bytes; không phục vụ qua HTTP.
- Metadata bài hát: Firestore Emulator `songs/{id}`; album: `albums/{id}`. Liên kết bài trong album vẫn là songs.albumId.
- Firestore/Auth được lưu qua `.local/emulator-data` khi dừng Emulator bình thường bằng Ctrl+C. Kho file uploads tồn tại trên ổ đĩa qua restart backend, không phụ thuộc export của Emulator.

Phải giữ **cả `.local/uploads` và `.local/emulator-data`** khi sao lưu dữ liệu local. Không commit file người dùng hoặc export Auth. Tắt cưỡng bức Emulator có thể chưa kịp lưu metadata mới; file media vẫn có thể còn nhưng không có bản ghi tương ứng.

### Luồng kỹ thuật

- Client gửi multipart `file` tới POST `/local-media/upload/audio` hoặc `/local-media/upload/image`, kèm ID token.
- Backend kiểm tra tài khoản active, giới hạn 2 upload đang xử lý, audio ≤30MB, ảnh ≤5MB; nhận dạng file bằng nội dung, không tin tên/MIME client.
- Audio MP3/WAV/FLAC/OGG/M4A được hỗ trợ khi parser nhận dạng; duration do music-metadata đọc từ file, không lấy số giây client tự khai. Bài >180 phút bị từ chối; tổng quota bài active vẫn được kiểm tra trong transaction tạo Song.
- Ảnh nhận JPG/PNG/WebP; không nhận SVG/HTML. Kiểm tra hiện chủ yếu là định dạng/size, chưa phải pipeline decode/re-encode ảnh đầy đủ.
- File nhận tên UUID ngẫu nhiên, không dùng tên file gốc để tạo đường dẫn. Sidecar ghi owner; API lưu Song/Album/avatar/cover kiểm tra file local tồn tại và thuộc UID token.
- POST `/songs` ở Emulator đọc metadata file đã lưu, rồi tạo bài bằng transaction hiện có, cùng cơ chế retry requestId/quota/owner album.
- URI lưu trong Firestore là `/local-media/...`, không gắn cứng IP. Audio engine và AppImage ghép URI với backend URL đang cấu hình, dùng được sau đổi IP/cổng và restart Expo. Cloud từ chối URI local.
- GET/HEAD file hỗ trợ Range để phát/tua audio. Không phục vụ sidecar JSON, directory listing hoặc path tùy ý.

### Ảnh trong file JSON chỉnh sửa

`users.json`/`albums.json`/`songs.json` có thể dùng đường dẫn ảnh **trong workspace**, ví dụ `assets/images/Artist Profile/Image 63.png`. data:check đọc/kiểm tra ảnh, data:apply sao chép vào kho uploads và lưu URI tương đối vào Emulator; JSON gốc giữ đường dẫn nguồn để bạn tiếp tục chỉnh. Chỉ nhận ảnh JPG/PNG/WebP ≤5MB, từ chối path ra ngoài dự án. Đường dẫn Windows trong JSON cần escape dấu `\\`, nên ưu tiên đường dẫn tương đối dùng `/`.

Loader hiện cũng đọc audioUrl nguồn trong workspace, gồm /audio/... ánh xạ assets/audio/..., kiểm tra định dạng/size và đo duration thật rồi lên kế hoạch URI local. File nguồn phải tồn tại; không nhập duration giả. Đây là thay đổi mới hơn mô tả loader chỉ nhận ảnh trước đây.

### Giới hạn phải giữ rõ

- **URL file local ai biết URL và truy cập được backend LAN đều đọc được.** isPublic/owner bảo vệ API metadata, không phải cơ chế private-file delivery. Không đưa bản local này lên Internet hay coi đây là signed/private media production.
- File được lưu trước khi tạo Song/Album; hủy form, quota thất bại hoặc mất phản hồi upload có thể để lại file mồ côi. Chưa dọn tự động, chưa thu hồi file cũ khi đổi ảnh/xóa bài/album; giữ lại để tránh xóa nhầm file đang dùng chung.
- Upload dùng buffer trong RAM, không phải streaming disk; giới hạn 2 request đang xử lý trong một process. Chưa quota tổng dung lượng ổ đĩa, antivirus hoặc chống upload lặp hoàn chỉnh.
- Metadata sidecar do backend tạo trong thư mục máy tính tin cậy; chưa kiểm chứng hash file mỗi lần dùng và chưa có asset ledger/refcount bền vững.
- Không tự ghi ngược bài/album mới vào `data/local/*.json`. Emulator export là nguồn giữ thay đổi runtime; data:apply/local:seed có thể ghi đè ID trùng từ bộ mẫu.
- HTTP/API test đã chứng minh WAV/PNG và restart; MP3/M4A/OGG/FLAC, native picker/crop/background/audio trên Android/iOS thật vẫn cần QA.

### Việc sửa sau

- [ ] Tách storage adapter local/cloud; signed upload ảnh và xác minh ownership/publicId cloud đã có code/tests ở phần Upload cloud bên dưới, không làm lại.
- [ ] Bảo vệ delivery file riêng tư bằng token/signed URL; không dựa vào URL khó đoán.
- [ ] Ghi asset ledger/refcount, cleanup file bỏ dở/ảnh cũ có grace period và retry an toàn.
- [ ] Upload streaming, quota dung lượng ổ đĩa, kiểm tra toàn bộ định dạng, decode/re-encode ảnh và checksum.
- [ ] Quy trình backup/restore đồng bộ file + Firestore; kiểm thử mất điện/partial upload/multiple backend instances.
- [ ] Test native thực tế và giữ nguyên hợp đồng API khi thay storage production.

## Hợp đồng sản phẩm và schema

Đây là yêu cầu/tiêu chí nghiệm thu; không xác nhận mọi mục đã QA. Trạng thái và backlog nằm ở đầu/cuối tài liệu.

### 1. Kiến trúc và quyền

- Chốt bổ sung: xóa toàn bộ vai trò admin khỏi ứng dụng: màn hình, route, menu, claims trong client/DTO, nhánh đặc quyền API/Rules, script cấp/thu hồi quyền và fixture đặc quyền. Sửa/xóa chỉ theo chủ sở hữu. Giữ Firebase Admin SDK cho backend và công cụ dữ liệu; không sửa/xóa tài khoản Authentication hoặc claims đã có. Trong đợt gỡ admin này không thay collection, thuộc tính hay dữ liệu đã lưu.

- Đã chốt bổ sung Express 5 cho tầng HTTP; dùng middleware chung cho CORS/token/rate limit/active/errors và Router theo nghiệp vụ. Giữ nguyên API/DTO khi chuyển, tái sử dụng FTS/cursor/retention và kiểm thử tương thích. Không coi chuyển Express là đã hoàn tất việc chuyển toàn bộ nghiệp vụ client Firestore sang backend.

- Chuyển toàn bộ đọc/ghi dữ liệu nghiệp vụ từ client Firestore sang backend API có Firebase ID token. Backend Admin SDK phải kiểm tra quyền từng endpoint, không dựa vào Rules client.
- Firebase Authentication giữ đăng ký/đăng nhập/token; Firestore `users` là nguồn hồ sơ nghiệp vụ. App không trực tiếp đọc hồ sơ riêng của người khác.
- Gộp hồ sơ và counters chuẩn về `users`; chuyển dữ liệu từ `publicProfiles` có đối chiếu trước khi bỏ collection cũ. Không lấy counters cũ trong users ghi đè counters chuẩn.
- DTO riêng cho tài khoản của mình và hồ sơ công khai. DTO công khai không có email, token, thông tin quản trị hoặc định danh tài sản Cloudinary nội bộ.
- Local search history, theme, giao diện và audio engine vẫn ở thiết bị. Một audio engine; giữ cleanup/account isolation và bỏ response cũ.
- Song chỉ Công khai/Riêng tư bằng `isPublic`; bỏ `visibility` và `isPublished`. Album/playlist cũng dùng `isPublic`. Nội dung công khai vẫn yêu cầu đăng nhập, tài khoản còn active.
- Bỏ Tags khỏi form, type/input và luồng ghi mới. Migration xử lý field cũ có kiểm soát.
- Album ẩn không làm ẩn bài hát. Album/playlist công khai không mở quyền cho bài riêng tư bên trong. DTO công khai chỉ trả bài người xem được phép truy cập, không lộ metadata bài riêng.
- Giữ Search/Discovery/Charts server, FTS5, cursor, phân trang, kiểm tra quyền mới nhất; không giới hạn nguồn trước khi tính tổng/top rank.

### 2. Database mục tiêu

Document ID là ID chuẩn; không cần lặp ID trong document mới. Thời gian là Firestore Timestamp; DTO chuyển đổi nhất quán. Các field Cloudinary publicId là metadata quản lý tài sản, không phải API secret.

| Đường dẫn | Thuộc tính |
| --- | --- |
| Firebase Authentication | uid, email, credentials do Firebase quản lý, disabled; claims hiện có được giữ nguyên nhưng không cấp đặc quyền trong ứng dụng |
| users/{uid} | displayName:string, email:string, avatarUrl:string, avatarPublicId:string/null, biography:string, followerCount:integer, followingCount:integer, active:boolean, createdAt:Timestamp, updatedAt:Timestamp |
| songs/{id} | title:string, artistId:string, artistNames:string[], albumId:string/null, coverUrl:string, coverPublicId:string/null, audioUrl:string, audioPublicId:string/null, durationSeconds:number, genre:string[], lyric:string, description:string, isPublic:boolean, active:boolean, playCount:integer, releaseDate:Timestamp, createdAt:Timestamp, updatedAt:Timestamp |
| albums/{id} | title:string, artistId:string, description:string, coverUrl:string, coverPublicId:string/null, isPublic:boolean, releaseDate:Timestamp, createdAt:Timestamp, updatedAt:Timestamp |
| users/{uid}/playlists/{id} | name:string, description:string, isPublic:boolean, songIds:string[] (có thứ tự, không trùng, giữ giới hạn 50), createdAt:Timestamp, updatedAt:Timestamp |
| users/{uid}/favorites/{songId} | favoritedAt:Timestamp |
| users/{uid}/favoriteAlbums/{albumId} | favoritedAt:Timestamp |
| users/{uid}/following/{targetUid} | followedAt:Timestamp |
| users/{uid}/history/{id} | songId:string, playedAt:Timestamp, startedAt:Timestamp, progressSeconds:number, durationSeconds:number, listenedSeconds:number, completed:boolean, counted:boolean |
| users/{uid}/playReceipts/{songId} | historyId:string, countedAt:Timestamp |
| posts/{id} | ownerId:string, content:string, songId:string/null, active:boolean, createdAt:Timestamp, updatedAt:Timestamp |
| posts/{id}/comments/{id} | ownerId:string, content:string, createdAt:Timestamp, updatedAt:Timestamp |

- Không lưu lặp albumTitle/artistName/authorName; backend ghép từ nguồn hiện tại. Không lưu songCount lặp trong playlist; DTO tính từ danh sách phù hợp quyền.
- Album có bài thông qua songs.albumId, không lưu thêm songIds. Số bài/thời lượng/tổng lượt nghe do backend tính trên nguồn đầy đủ phù hợp quyền.
- Follow và hai counters cập nhật transaction. Counting cũng transaction; bỏ các field đối soát dành riêng cho client Rules khi không còn cần.
- Không thêm collection hay ghi dữ liệu cho gợi ý người hâm mộ.
- Không dùng collection artists/charts cũ làm nguồn mới.

### 3. Genre và upload

Genre cho chọn nhiều: Pop, Rock, Indie, Acoustic, Ballad, R&B, Hip-hop/Rap, EDM, Jazz, Blues, Classical, Country, Folk, Latin, Reggae, Bolero, Nhạc dân gian, Nhạc không lời, Khác. **Không có Nhạc Trịnh.** Backend và UI dùng cùng danh sách; giới hạn 1–10 lựa chọn.

- `/upload`: tiêu đề Đăng tải bài hát, Việt hóa nội dung và nút lưu/thay file.
- Artist* (ngăn cách bằng dấu phẩy): mặc định tên mình, cho nhập nhiều tên tự do; không kiểm tra tên có tài khoản. artistId vẫn là chủ sở hữu, không cấp quyền cho tên đồng tác giả.
- Genre* ban đầu rỗng, bộ chọn nhiều xổ xuống; đóng khi bấm ngoài, tóm tắt A, B. Không có ghi chú dấu phẩy ở Genre.
- Album: chọn album của mình, không thuộc album, hoặc tạo mới thuận tiện; giữ dữ liệu form khi chuyển thao tác.
- Hạn mức miễn phí 180 phút = 10.800 giây, cộng durationSeconds các bài upload active bất kể công khai/riêng tư. Bài đã gỡ không chiếm hạn mức. Backend kiểm tra hạn mức, kể cả upload đồng thời.
- Premium là demo, không giả lập thanh toán hoặc cấp entitlement thực tế.

### 4. Uploads và quản lý album

- Route quản lý upload là `/my-uploads`; đã xóa route `/uploads` theo yêu cầu mới nhất. Tiêu đề Bài hát đã đăng tải, hai mục Bài hát/Album. API backend `/uploads` và `/uploads-info` độc lập với route UI, tiếp tục theo contract hiện tại.
- Khối nền khác màu chứa `{phần trăm}% số lượt tải lên của bạn đã được sử dụng`, Linear Progress Bar và nút Tận hưởng khả năng tải lên không giới hạn dẫn `/premium`. Phần trăm tính theo phút, không theo số file.
- Rỗng: căn giữa `Chỉ cần tải lên một file.`, `Tham gia cùng hàng triệu nghệ sĩ sử dụng MusicSteamApp để được mọi người biết đến.`, nút Tải lên một bài hát.
- Có bài: tìm kiếm Tìm kiếm bài hát đã đăng tải, chỉ tìm trong uploads; nút upload vòng tròn mũi tên lên thay vị trí Share, lặp toàn bộ uploads, nút phát và danh sách SongRow. Không đưa nội dung riêng của chart vào.
- Mục Album hiển thị thẻ album thông thường có menu ba chấm, nút Tạo album.
- Menu: Chỉnh sửa, Công khai/Riêng tư, Thêm bài hát, Xóa; thứ tự/kiểu tương tự playlist.
- Form tạo/chỉnh sửa album: tên, ảnh bìa, mô tả, công tắc Công khai, X đóng. Thao tác sửa đặt ở menu ngoài, không có nút sửa trên trang album chi tiết.
- Thêm bài vào album chỉ chọn bài của mình chưa thuộc album nào. Kiểm tra lại ở backend khi lưu để tránh thêm đồng thời sai album.
- Trang album có ảnh, tên, mô tả, số bài, thời lượng, trái tim, danh sách bài; chủ sở hữu có thao tác thêm bài.
- Menu bài trong album: Gỡ khỏi album màu đỏ đầu tiên, sau đó Yêu thích, Playlist, Chi tiết bài hát. Gỡ xóa albumId; giữ nguyên bài.
- Xóa album có xác nhận tương tự playlist; gỡ liên kết bài và giữ bài, không để liên kết mồ côi.

### 5. Album yêu thích và Library

- favoriteAlbums độc lập favorites bài; yêu thích album không tự yêu thích từng bài.
- Trái tim bật/tắt ở See all album, danh sách album trang hồ sơ/người dùng và album chi tiết; đồng bộ giữa các màn, không kích hoạt mở album khi bấm tim.
- Library mặc định: bài yêu thích, album yêu thích, nghệ sĩ follow. Search tìm trong cả ba; filter Album chỉ album yêu thích.
- Xóa nhãn/hành vi Album có bài hát bạn đã yêu thích.
- Backend kiểm tra album khả dụng; album mất quyền/không còn khả dụng không xuất hiện trong kết quả.
- Thêm Bài hát đã đăng tải bên phải Lịch sử, dẫn `/my-uploads`.

### 6. Hồ sơ, tài khoản, cài đặt

- `/profile`: bỏ UID, nhãn Người dùng, ô URL, nút Làm mới quyền; email có nhãn Địa chỉ email, follower/following, Tên hiển thị, Tiểu sử.
- Avatar có nút cây bút phù hợp mobile, chọn ảnh/upload Cloudinary/cập nhật hồ sơ Firebase qua backend; loading/error/chống bấm lặp.
- `/account`: email, Đăng xuất, text Xóa tài khoản dẫn `/account-delete`.
- `/account-delete` dùng AccountDeleteScreen: title cạnh Back, nút đỏ Xóa tài khoản, xác nhận title Xóa tài khoản. Nội dung đúng nghiệp vụ: Thao tác này sẽ vô hiệu hóa tài khoản của bạn. Bạn sẽ không thể đăng nhập lại.
- Vô hiệu hóa giữ dữ liệu; users.active=false, khóa Auth disabled=true, thu hồi/chặn phiên. Không cần field disabled riêng trong Firestore. Đăng nhập báo Tài khoản của bạn đã bị vô hiệu hóa.
- Bài/album của tài khoản inactive không xuất hiện ở Home/Search/Discovery và nguồn công khai. Không chỉ chặn UI; backend kiểm tra quyền và trạng thái.
- Menu Library đổi thành Cài đặt: Hồ sơ, Tài khoản, Cài đặt cơ bản, Đăng tải bài hát, Premium. Bỏ Tài khoản và công cụ, Quản lý nội dung và tài khoản của bạn, Bài hát tôi đã đăng, nút Đóng. Upload không dùng nút đen riêng.
- Cài đặt cơ bản: mặc định theme hệ thống; công tắc sáng/tối nằm ngang, lưu lựa chọn theo thiết bị.
- Mọi Dialog có nút Đóng chuyển sang X góc trên phải, có accessibility và Back phù hợp; không bỏ các nút Hủy có ý nghĩa xác nhận nghiệp vụ một cách máy móc.

### 7. Playlist và menu bài hát

- `/playlists`: tên, tên tác giả, Playlist · N bài hát. Menu bỏ số bài dưới tên.
- Chỉnh sửa playlist: bỏ mô tả hướng dẫn Đặt tên và mô tả cho bộ sưu tập của bạn.; công tắc Công khai; dùng X đóng. Form dấu + tương tự.
- Công khai/Riêng tư lưu thật, backend cấp quyền; playlist công khai có bài xuất hiện trên trang người dùng.
- Thêm bài dùng luồng Tìm bài để thêm.
- Xóa title Xóa playlist?; nội dung Thao tác này sẽ xóa vĩnh viễn playlist này. Bạn có chắc chắn muốn tiếp tục không?
- Chi tiết playlist: ảnh/phần giới thiệu Bộ sưu tập âm nhạc của bạn và số bài căn giữa; nút Thêm bài hát.
- Menu bài hát bỏ tác giả dưới title; thứ tự Yêu thích, Playlist, Chi tiết bài hát. Trong playlist có Gỡ khỏi playlist màu đỏ đầu tiên.
- Chọn playlist: chưa có thì thêm, đã có thì Gỡ khỏi Playlist; giữ đủ thông tin nhận diện playlist đích.

### 8. Discovery, người dùng và player

- Album hiển thị thêm · N bài hát, tính trên tập bài đúng quyền; owner quản lý được bài riêng tư, số liệu công khai chỉ bài public/active của tài khoản active.
- Chart Home và detail: Tuyển tập 50 bài {thể loại} được nghe nhiều nhất. Số bài/thời lượng thực tế, không giả đủ 50.
- `/albums`: Bắt nhịp xu hướng cùng những album nổi bật.
- `/artists`: Khám phá những nghệ sĩ đang được yêu thích.
- Artist: Follow/Unfollow và Phát bài hát đồng đều; Bài hát thay Bài hát công khai; album trình bày như See all Trending albums; thêm playlist công khai có bài.
- Người hâm mộ cũng thích nằm trên trang người dùng: đọc follow chung, loại self/inactive; thiếu tín hiệu bổ sung thể loại bài public, following, cuối cùng nghệ sĩ phổ biến. Nguồn không có tín hiệu fan đổi nhãn Có thể bạn thích/Khám phá nghệ sĩ. Chỉ đọc dữ liệu hiện có; giới hạn reads, không quét toàn bộ graph mỗi request, không ghi kết quả/counters/collection mới.
- Chi tiết bài đồng bộ UI chung, Thời lượng: thay Thời lượng dự kiến:.
- Bấm bài trong mọi danh sách chỉ phát audio, không push Player. Chỉ bấm MiniPlayer mới mở Player. Giữ queue, controls, repeat/seek đồng bộ một engine.

### 9. History và lượt nghe

#### Thuộc tính và màn hình

- startedAt: thời điểm bắt đầu phiên do server xác lập, không thay đổi.
- playedAt: thời điểm cập nhật hoạt động phiên gần nhất do server xác lập, dùng sắp xếp/retention.
- progressSeconds: vị trí phát; tua có thể thay đổi vị trí nhưng không tự cộng thời gian nghe.
- durationSeconds: thời lượng hợp lệ, backend kiểm chứng theo metadata audio.
- listenedSeconds: thời gian phát thực tế hợp lệ trong phiên; bỏ pause/buffering/seek jump, không tin số tăng tùy ý do client gửi.
- completed: cờ đạt cuối bài và nghe ít nhất 80% thời lượng. Cờ đã đạt giữ nguyên trong phiên. Với tua lặp, cần xét độ phủ đoạn đã nghe để không dùng nghe lặp một đoạn thay cho 80% nội dung; thiết kế telemetry phải hỗ trợ hợp nhất các khoảng nghe hợp lệ.
- counted: phiên đã cộng lượt nghe hay chưa; tối đa một lần mỗi phiên.
- playReceipts/{songId}.historyId: phiên gần nhất được tính của người dùng/bài; countedAt: thời điểm server tính lượt đó. Không dùng receipts dựng History.
- History UI đọc server theo playedAt desc + ID desc, truy vấn 20 phiên, dedupe songId xuyên trang, giữ phiên mới nhất, kiểm tra quyền mới nhất; UI 10 + 10, tối đa 100 bài khác nhau/hết nguồn. Mỗi lượt quét tối đa ba trang và giữ continuation khi còn nguồn. Retry không mất cursor; queue là danh sách đã tải.
- **Chỉ bỏ text Đã nghe … / … và Đã nghe hết trong /history. Không xóa các field tương ứng hoặc nghiệp vụ tracking.**

#### Quy tắc lượt nghe hiện tại

Nguồn tham khảo chính thức: [Spotify — How your streams are counted](https://support.spotify.com/tj-en/artists/article/how-your-streams-are-counted/): công bố nghe ít nhất 30 giây để tính stream. Trang này không công bố cooldown cố định hoặc ngoại lệ cho bài dưới 30 giây. Không gán các quyết định riêng dưới đây cho Spotify.

- Bài dài từ 30 giây: listenedSeconds >= 30 giây hợp lệ trong cùng phiên.
- Bài ngắn hơn 30 giây: nghe ít nhất 80% nội dung và đạt cuối bài; dùng completed=true để đủ điều kiện. Đây là ngoại lệ sản phẩm của app để bài ngắn/demo không bị loại vĩnh viễn.
- Khoảng cách tối thiểu hai lượt countedAt cùng UID/song: **30 giây**, thay đề xuất 60 giây trước. Đây là quyết định của app, không phải thông số xác nhận của Spotify. Bài ngắn lặp nhanh có thể hoàn thành nhưng không phải vòng nào cũng cộng lượt.
- Mỗi phiên chỉ một lượt, phiên mới không kế thừa listenedSeconds. Server dùng idempotency/session, timestamp và transaction history/song/receipt; chống gửi lặp, nhiều thiết bị, nghe đồng thời vượt thời gian thực. Client báo telemetry không phải bằng chứng chống gian lận tuyệt đối.
- completed và counted là hai khái niệm khác nhau: bài dài có thể counted trước khi completed. completed không yêu cầu mọi bài phải nghe hết 100%.
- playback-policy.cjs hiện dùng cooldown 30.000 ms; mô tả code còn 60 giây đã lỗi thời. completed vẫn cần độ phủ 80% và tới cuối bài.

#### Retention đã chốt

- Giữ 1.000 phiên mới nhất/tài khoản theo playedAt desc, ID desc, không phải 1.000 bài khác nhau. Trang History vẫn tối đa 100 bài khác nhau.
- Worker chạy mỗi 15 phút từ lúc backend khởi động; lần đầu sau 15 phút. Ví dụ 08:07 khởi động thì 08:22, 08:37, 08:52. Không phụ thuộc tick player, không phải cron theo mốc :00/:15.
- Backend dừng thì worker dừng, không bù các tick đã bỏ lỡ; khởi động lại bắt đầu lịch mới. Cần host liên tục. Một lượt đang chạy thì không chồng lượt tiếp theo.
- Mỗi lượt đọc users theo trang 50, count history trước; <=1.000 thì bỏ qua mà không đọc lại 1.000 document.
- Tài khoản vượt giới hạn: transaction xác định boundary 1.000 mới nhất, lấy tối đa 100 phiên phía sau; chỉ xóa phiên có playedAt cũ hơn hai phút so với lúc xét batch. Query và delete cùng transaction, cập nhật đồng thời gây retry với boundary mới.
- Tối đa 10 batch/UID/lượt; dừng sớm khi batch xóa dưới 100, phần chưa dọn xét tiếp lượt sau. Dữ liệu lớn có backlog; đây là giới hạn mềm, có thể tạm >1.000 do grace period/backlog/lỗi worker.
- Ví dụ 1.105 phiên cũ đủ điều kiện: xóa 100 + 5, còn 1.000. Phiên còn trong khoảng bảo vệ chưa xóa.
- Chỉ xóa history. Không xóa song/receipt/favorite/playlist, không trừ playCount. Lỗi ghi log và thử ở lượt sau; không báo đã dọn thành công khi thất bại.


## Quy ước code và UI

Theo [AGENTS.md](../AGENTS.md): đọc major Expo/package.json và versioned docs trước sửa Expo/React Native API, dùng expo install cho package; không tự tạo/sửa ios/android trong CNG hoặc tự nâng SDK. Hiện dùng npm; nếu có Bun lockfile thì theo quy tắc bunx.

Routes chỉ giữ guard/params/screen. Back qua useBackNavigation/createBackAction: dismiss một màn nếu có stack, fallback nếu không, chặn double tap tới lần focus tiếp. Home freezeOnBlur; push chi tiết rồi Back giữ instance/scroll khi còn trong stack; không cam kết giữ sau logout/app bị đóng/route bị thay thế.

Tamagui 3.1.10, preset `@tamagui/config/v6`, tokens/theme tại `tamagui.config.ts`. Token không `$`: `color="primary"`, `padding="4"`; số trực tiếp là kích thước, line-height cố định có thể dùng `"29px"`. Import UI trực tiếp từ components/ui/index hoặc component cụ thể; không tạo lại UI.tsx hay các file chuyển tiếp BackButton/SectionHeading ở discovery.

Page quản lý scroll/keyboard, widths form 480px/reading 820px/full 1000px thu theo mobile. ListPage/FlatList dùng data/renderItem/keyExtractor/header/footer/onEndReached; không bọc trong Page cuộn hoặc đặt toàn danh sách ở header/footer. Rail ngang dùng ScrollView ngang. Safe area/MiniPlayer thuộc AppFrame.

XStack/YStack và styled/variants cho bố cục lặp. AppText body/muted/caption/danger; Button primary/secondary/danger, loading/disabled. Action/IconButton touch target ≥44px, không lồng nút. MediaTitle/Subtitle tối đa hai dòng, detail headings không giới hạn như row; thumbnail không co, vùng chữ minWidth=0.

SongRow có một nút more, các thao tác favorite/detail/playlist trong ModalPanel, chỉ mount modal khi mở. Player dùng theme tối cục bộ/một engine, kéo progress cục bộ rồi seek cuối thao tác; không dựng waveform hoặc counters social giả.

Giữ Metro resolver dùng chung bản `@tamagui/portal` cho Dialog/Provider, không thêm provider trùng/import file nội bộ node_modules. Restart Metro sau đổi config. Chưa bật compiler/static extraction; cần phép đo trước khi thêm. useMemo/useCallback không tự giảm Firestore reads; không limit nguồn đang tính tổng/rank khi chưa có nguồn đầy đủ thay thế. Giữ cleanup/account guards và quyền server.

Thiết kế tham khảo: [music_stream_app.pdf](music_stream_app.pdf). Mockup Welcome/Home/Chart/Player/Artist/Search/Feed/Comments/Library/Playlists/Premium chỉ minh họa. Không suy ra payment/verified/social counters thật từ hình; không vẽ lại bàn phím/status bar hệ điều hành. Yêu cầu hiện hành ưu tiên hơn mockup.

## Upload cloud

Ảnh chọn trong app (avatar, cover bài/album) hiện đi qua prepareImageUpload trước upload local/cloud: expo-image-manipulator ~58.0.16 giải mã và xuất PNG, giữ transparency, thu cạnh dài về tối đa 1600px, kiểm tra dung lượng kết quả ≤5MB. File/MIME cũ không được gửi thay cho ảnh đã chuyển đổi. Chỉ hỗ trợ đầu vào mà codec thiết bị/trình duyệt giải mã được; không cam kết mọi HEIC/AVIF/đuôi lạ, GIF động có thể thành ảnh tĩnh. File lỗi báo yêu cầu xuất JPG/PNG. Backend tiếp tục nhận dạng bytes JPG/PNG/WebP, không tin extension. Luồng import ảnh JSON và ảnh HTTPS có sẵn không được tự động chuyển đổi bởi bước client này.

Đã thêm dependency bằng expo install đúng SDK 58. Restart Expo; nếu dùng development build/APK cũ phải build lại để có native module. Cần QA trên thiết bị với ảnh người dùng từng bị lỗi, nhất là HEIC/AVIF; test adapter không chứng minh native decoder hoạt động.

Chưa QA Cloudinary thật. AlbumId không có album lưu null; không ghi visibility/isPublished/songId/albumTitle legacy. Local dùng kho riêng ở trên.

### Backend cần cấu hình gì?

Trong môi trường chạy Node backend, cung cấp:

```dotenv
CLOUDINARY_CLOUD_NAME=<cloud-name>
CLOUDINARY_API_KEY=<api-key>
CLOUDINARY_API_SECRET=<api-secret>
```

Dùng cùng cloud cho upload audio và xác minh. API secret chỉ ở server/secret manager hoặc file `.local/backend.env` được gitignore. Script backend hiện không tự load file env này; shell/host phải đưa các biến vào process. Không đưa secret vào EXPO_PUBLIC hoặc commit file thật. Mẫu cấu hình nằm ở `tools/backend/backend.env.example`.

Ảnh và audio cloud đều lấy cloud name/API key/signature từ backend. Client không cần unsigned image/audio preset; cấu hình cũ trong .env không còn được uploadMedia sử dụng. Cần EXPO_PUBLIC_BACKEND_URL và Firebase mode/project đúng môi trường. Secret chỉ ở backend. Không trộn emulator với cloud.

### Signed ảnh, publicId và cleanup

- GET /image-upload-config yêu cầu token/account active, chỉ cloud. Backend tạo ticket bền trước khi trả chữ ký cho musicstream/{uid}/image/{uuid}, ký cả overwrite=false và allowed_formats=png,jpg,webp; client phải gửi đúng các tham số này. Cloudinary kiểm tra signature; endpoint metadata kiểm chứng lại size ≤5MB, ảnh tĩnh JPG/PNG/WebP, dimensions 1–4096px.
- Payload lưu ảnh vẫn là avatarUrl/coverUrl. Backend phân tích đúng URL Cloudinary của cloud cấu hình và vùng UID, đọc Admin API, yêu cầu secure_url khớp, rồi lưu publicId và liên kết ledger trong cùng transaction với hồ sơ/album/bài. Client không được tự ghi avatarPublicId/coverPublicId. DTO công khai và own profile không lộ ledger/publicId.
- URL ảnh cũ giữ nguyên trên cùng document được giữ, gồm ảnh HTTPS ngoài Cloudinary; đổi sang ảnh mới phải qua signed upload. 158 cảnh báo dataset cũ không tự biến mất. Không tự copy/thay ảnh người dùng hoặc dựng publicId giả.
- Collection vận hành imageAssets/{sha256(publicId)} chứa ownerId/publicId/cloud/state/refs/createdAt, url và updatedAt khi có, deleteAfter khi chờ dọn. State pending → attached → pending khi bỏ liên kết cuối → deleting → deleted. Tối đa 200 document refs/ảnh; ảnh dùng chung vẫn có refs riêng. Gỡ mềm bài/vô hiệu hóa tài khoản giữ ảnh; xóa album hẳn mới gỡ ref album.
- imageAssets chỉ backend sử dụng, Rules deny client như mọi business data. Bộ schema:audit/migration/restore hiện quét business roots nên KHÔNG backup/restore ledger này; phải đưa imageAssets vào backup/restore cloud riêng. Không restore metadata business mà bỏ qua ledger khi đã vận hành cloud.
- Ticket chưa dùng và ảnh bỏ liên kết cuối đợi 24 giờ. Cleanup kiểm tra lại Cloudinary canonical URL và tham chiếu ở users/songs/albums theo cả publicId và URL để bảo vệ nguồn legacy. Claim deleting và thao tác gắn ảnh cùng khóa ledger transaction; ảnh đang deleting/deleted không thể gắn lại. Xóa Cloudinary lỗi giữ tombstone để retry; giữ tombstone deleted, không tái sử dụng publicId.
- Chưa bật lịch xóa tự động. Lệnh dưới đây chỉ chạy khi đã có project/ADC/credentials cloud đúng; lượt triển khai này chỉ kiểm thử bằng metadata Cloudinary giả trên Emulator, chưa đọc/xóa Cloudinary thật. Dry-run có đọc Firestore/Admin API và có quota/cost tương ứng. Mỗi lượt xét tối đa 50 ticket đến hạn; nếu backlog còn thì chạy lại. Trước apply: xem dry-run, backup và tạm dừng importer/Admin writer ngoài các endpoint có ledger.

```cmd
npm run images:cleanup
npm run images:cleanup -- --apply --maintenance
```

CLI từ chối Emulator/demo project; library cleanup chỉ dùng Emulator trong tests với HTTP fake. Đây là cleanup ảnh managed mới, không quét/xóa audio hay asset legacy không có ticket. CDN invalidation không bảo đảm thu hồi tức thì mọi bản cache; signed upload không thay private delivery.

Nguồn kỹ thuật: [Cloudinary signed upload](https://cloudinary.com/documentation/upload_images), [Admin resource API](https://cloudinary.com/documentation/admin_api), [destroy/invalidate](https://cloudinary.com/documentation/image_upload_api_reference#destroy_method).

### Kiểm tra container

```cmd
npm run backend:check-package
npm run backend:docker:smoke
```

Lệnh đầu dựng cây source theo Docker COPY, dùng tools/node_modules trên máy, kiểm tra import backend, SQLite FTS5, HTTP health và denial khi thiếu token. Lệnh sau cần Docker Desktop/daemon Linux đã chạy: docker build production dependencies, docker run non-root/read-only/network none, kiểm tra module/FTS/health/401 bên trong image rồi tự xóa container. Không cần secret, không kết nối Firebase/Cloudinary; chưa thay smoke thật với project cloud, ADC và dữ liệu đã migrate. Tag image local music-stream-backend:smoke được giữ lại.

Máy hiện không có Docker CLI/Desktop hoặc daemon; không cài thêm công cụ hệ thống/WSL. Docker image đã build và chạy smoke thành công trên GitHub Actions; backend:check-package cũng đạt ở workspace. Chưa deploy backend lên Render.

Đã thêm .github/workflows/backend-container.yml trên Ubuntu GitHub Actions, Node 24.12.0; hỗ trợ workflow_dispatch và workflow_call. .github/workflows/ci.yml (Project checks) gọi workflow này, đồng thời chạy lint/typecheck/unit/source smoke, integration Firebase Emulator với Temurin Java 21 và matrix export Web/Android. CI chạy khi push vào main/ci/**, PR vào main và chạy thủ công. Quyền contents:read, checkout không giữ credential; không cần secret Firebase/Cloudinary, không push image hoặc deploy. Docker build vẫn tải dependencies/base image qua mạng; container smoke chạy network none, non-root/read-only.

scripts/check-auth-bundle.cjs đọc sourcemap cả flat/indexed, yêu cầu Web dùng auth.ts + SDK esm, Android dùng auth.native.ts + SDK rn, chặn implementation sai nền tảng và xuất auth-resolution.json vào thư mục bundle. Job bundles dùng cấu hình demo emulator và bỏ dotenv, không gọi dịch vụ cloud. Artifacts bundle/report và integration.log giữ 7 ngày; không upload Auth export/media/credentials. Đây là kiểm tra SDK và JS/Hermes export, chưa phải APK hoặc native UI E2E/force-stop. Backend container smoke vẫn có thể chạy riêng. Tham khảo [GitHub manual workflow](https://docs.github.com/en/actions/how-tos/manage-workflow-runs/manually-run-a-workflow); action versions theo [checkout](https://github.com/actions/checkout) và [setup-node](https://github.com/actions/setup-node).

Đã push nhánh ci/project-checks-20261106, chưa merge main. [Lượt đầu 42252151087](https://github.com/tuanank5/music_stream_app/actions/runs/42252151087): Docker và Web/Android bundle + Auth resolution đạt; quality 96/97 và integration 40/41 vì tests/editable-data phụ thuộc assets/audio/Guitar/g01.mp3 chưa được commit. Đã sửa hai test dùng tests/helpers/editable-fixture.cjs: JSON fixture độc lập từ buildFixtures và WAV tổng hợp thật trong thư mục .local tạm, có cleanup; không bỏ test hoặc giả duration. main của importer nhận directory khi gọi từ module để test cùng luồng apply/backup/Auth, CLI mặc định vẫn đọc data/local. npm run data:check vẫn xác minh dataset/media người dùng thật. Xem [trạng thái CI mới nhất trên nhánh](https://github.com/tuanank5/music_stream_app/actions?query=branch%3Aci%2Fproject-checks-20261106) trước khi kết luận toàn bộ pipeline đạt.

### Tạo service Render lần đầu

render.yaml ở root khai báo Docker Web Service, plan free, region singapore, Dockerfile.backend, context repo root, healthCheckPath /health và autoDeployTrigger off. Không tạo database Render hoặc persistent disk: Firestore giữ dữ liệu, Cloudinary giữ media, SQLite FTS chỉ là index RAM có thể dựng lại. Region Singapore là lựa chọn khởi đầu; cân nhắc vị trí Firestore trước khi tạo vì Render không đổi region tại chỗ.

Endpoint GET /health đã có trong tools/backend/http-app.cjs và đã được kiểm tra trong Docker smoke; không cần thêm route trong Expo. Trả HTTP 200 khi ready=true, HTTP 503 khi backend ghi nhận lỗi đồng bộ. Health không thay kiểm thử Auth, Cloudinary hoặc toàn bộ endpoint.

Tạo thủ công trên Render Dashboard → New → Web Service → kết nối repo tuanank5/music_stream_app:

| Mục | Giá trị |
| --- | --- |
| Branch | ci/project-checks-20261106 (code đã qua CI; main chưa merge) |
| Name | music-stream-backend hoặc tên còn trống |
| Language/Runtime | Docker |
| Region | Singapore nếu phù hợp vị trí Firestore/người dùng |
| Root Directory | Để trống |
| Dockerfile Path | ./Dockerfile.backend |
| Docker Build Context | . |
| Instance Type | Free |
| Health Check Path | /health |
| Auto Deploy | Off trong giai đoạn thiết lập |

Nhập Environment trước khi deploy:

| Biến | Giá trị |
| --- | --- |
| NODE_ENV | production |
| PORT | 10000 |
| GOOGLE_CLOUD_PROJECT | musicstreamapp-5a527 |
| GOOGLE_APPLICATION_CREDENTIALS | /etc/secrets/firebase-admin-key.json |
| CURSOR_SECRET | Chuỗi ngẫu nhiên ít nhất 32 ký tự, giữ nguyên qua redeploy |
| CLOUDINARY_CLOUD_NAME | Cloud name thực tế |
| CLOUDINARY_API_KEY | API key của cloud tương ứng |
| CLOUDINARY_API_SECRET | API secret, chỉ nhập ở Render |
| ALLOWED_ORIGINS | Để trống nếu chỉ dùng APK; nếu thử Web thì nhập origin chính xác, ví dụ http://localhost:8081, phân cách nhiều origin bằng dấu phẩy |

Tạo CURSOR_SECRET tại máy người dùng bằng `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`, dán kết quả vào Render, không ghi vào repo/chat. Trong Environment → Secret Files, thêm filename firebase-admin-key.json, nội dung là JSON Firebase service account đúng project. Runtime Docker đọc tại /etc/secrets/firebase-admin-key.json. USER node trong image chính thức thuộc group 1000; không đổi sang root để đọc secret. Không đặt biến emulator hoặc đưa credentials vào EXPO_PUBLIC_*. Firebase CLI login không thay cho backend credentials.

Nếu dùng New → Blueprint với render.yaml thay vì tạo thủ công, chọn đúng nhánh CI, điền ba giá trị Cloudinary khi được hỏi. CURSOR_SECRET được Blueprint sinh tự động. Secret File vẫn phải thêm riêng trong Dashboard; lần deploy thiếu file sẽ lỗi credentials, cần thêm file rồi Manual Deploy lại. Blueprint không chứa nội dung khóa Firebase.

Sau deploy, mở https://<service-name>.onrender.com/health: phải HTTP 200, mode=cloud, projectId=musicstreamapp-5a527, ready=true. Có thể kiểm tra bằng `Invoke-RestMethod "https://<service-name>.onrender.com/health"`. Tiếp theo test /me khi không có token trả 401, đăng ký tài khoản mới và kiểm tra users/{uid}, upload ảnh/audio và phát nhạc. Chỉ sau đó cấu hình client cloud với EXPO_PUBLIC_BACKEND_URL là origin HTTPS của service (không thêm /health), restart Expo/build lại khi đổi biến public. Không dùng npm run start:local để test Render vì lệnh đó ép Emulator. Không tự tạo collection/marker migration cho database trống.

Render Free có thể ngủ sau 15 phút không có traffic và filesystem không bền qua restart; cold start có thể vượt timeout client hiện tại (15 giây). Đánh thức bằng /health rồi thử lại trong QA; chưa coi đây là nghiệm thu cold-start. render.yaml là cấu hình triển khai, chưa chứng minh service đã được tạo hoặc chạy trên Render.

Nguồn: [Render Blueprint](https://render.com/docs/blueprint-spec), [Docker secrets](https://render.com/docs/docker-secrets), [Health checks](https://render.com/docs/health-checks), [Free limits](https://render.com/docs/free).

### Sửa lỗi Render: giới hạn truy vấn follow

Log cloud mới nhất đã qua bước đọc credentials, nhưng listener collectionGroup following dùng limit(250001) bị Firestore từ chối với maximum value of 10000. Đây là giới hạn tham số truy vấn, không phải bằng chứng database có hơn 10.000 document; xóa dữ liệu không sửa được query này.

Backend hiện giới hạn graph đầy đủ ở 9.999 quan hệ follow. Watch dùng limit(10000), dành một bản ghi để phát hiện overflow: snapshot >=10.000 làm startup thất bại hoặc health chuyển 503 khi đang chạy; không trả gợi ý dựa trên graph bị cắt. FollowGraph được khởi tạo với cùng capacity 9999. Muốn hỗ trợ lớn hơn phải thiết kế lại phân vùng/listener hoặc cách tính fan signals; không tăng limit vượt mức cloud hoặc bỏ kiểm tra overflow. Các giới hạn 250.000 của audit/cursor snapshot độc lập, không thay trong bản sửa này.

Test regression kiểm tra database trống, 9.999 quan hệ và từ chối snapshot 10.000, đồng thời mock từ chối query limit >10.000; kiểm tra cleanup cả bốn listeners. Bản sửa cần commit/push tới nhánh Render đang theo dõi (hiện log là main) rồi deploy commit mới. Không cần dọn Firestore hay thay Firebase Secret File cho lỗi limit này. Đối chiếu /health sau deploy; chưa tự xác nhận endpoint Render thật khi chưa có URL service.

### Upload native SDK 58 và Metro Windows

Lỗi Unsupported FormDataPart implementation xảy ra ở client native: global fetch của Expo SDK 58 dùng WinterCG, serializer từ chối object file kiểu React Native cũ {uri,name,type}. mediaUploadService nay tạo File từ expo-file-system trên native rồi append vào FormData; đọc size thật để kiểm tra giới hạn. Ảnh vẫn đi qua chuyển đổi PNG trước khi tạo File; audio được stage vào Paths.cache riêng trước khi encoder đọc. Web giữ Blob/File trình duyệt. expo-file-system được khai báo dependency trực tiếp, cài bằng expo install theo SDK. Không tự đặt Content-Type multipart vì fetch phải sinh boundary.

tests/media-upload.test.cjs chạy source encoder convertFormDataAsync và FormData patch thật từ Expo đang cài, tái hiện object URI cũ bị từ chối, xác nhận bytes ảnh PNG/audio native đi qua encoder và nhánh Web/local vẫn giữ nội dung/signature/auth header. Đây không thay test upload trên điện thoại thật hoặc Cloudinary thật. Cần restart Metro sau npm install; development APK thiếu native module phải build lại, Expo Go phải tương thích SDK.

Lỗi EMFILE tại Temp/metro-cache là cạn file handles trong quá trình Metro đọc cache song song, không phải Firebase/Cloudinary. Trên Windows metro.config.js giới hạn maxWorkers=2 và giữ store mặc định của Expo nhưng bọc get/set bằng tools/metro-cache.cjs để giới hạn tổng 32 cache operations đang chạy trong một process. Chỉ giảm maxWorkers chưa chặn được cached-module traversal song song. Resolver chọn auth/native và Portal không đổi. Không patch node_modules hoặc tắt cache. Test kiểm tra giới hạn concurrency, lỗi một operation không khóa queue và private state/clear vẫn hoạt động.

Sau thay đổi: Ctrl+C ở terminal Metro cũ, đóng các Expo/Metro thừa của dự án, rồi chạy `npm run start -- --clear --max-workers 2` cho cloud hoặc `npm run start:local -- --clear --max-workers 2` cho Emulator. Không xóa dữ liệu .local/uploads hoặc .local/emulator-data. Cache concurrency là theo process; chạy nhiều Metro cùng lúc vẫn tăng tổng số handles. Để kiểm tra Web thêm --web vào lệnh start.

Nguồn: [Expo SDK 58 fetch](https://docs.expo.dev/versions/v58.0.0/sdk/expo/), [File upload FormData](https://docs.expo.dev/versions/v58.0.0/sdk/filesystem/), [Metro cache configuration](https://metrobundler.dev/docs/configuration/).

Kiểm chứng đợt upload/EMFILE: lint/typecheck đạt, unit 101/101 (.local/upload-metro-unit.log). Android export .local/upload-fix-android đạt; Web lần đầu fallback full crawl vì file-map cache cũ không deserialize được, lần export lại .local/upload-fix-web-repeat.log exit 0 và không EMFILE. Script check-auth-bundle tiếp tục xác nhận native Auth/SDK rn trong bundle Android. Chưa thay kiểm thử upload Cloudinary trên thiết bị người dùng.

Người dùng xác nhận ảnh Android đã upload được, audio còn lỗi FileSystemFile.bytes Missing READ permission. Đối chiếu source SDK: DocumentPicker Android copyToCacheDirectory dùng context.cacheDir, FileSystem.Paths.cache dùng appContext.cacheDirectory; hai đường dẫn có thể khác phạm vi trong Expo Go. Android nay đặt copyToCacheDirectory=false để lấy content URI do system picker cấp quyền. stageAudioUpload sao chép URI này sang File mới trong Paths.cache, kiểm tra size thật, gửi bản sao và dọn file tạm trong finally cả khi lỗi mạng/session. iOS giữ picker copyToCacheDirectory=true, vẫn stage bản sao riêng; Web giữ File trình duyệt. Không xin quyền quản lý toàn bộ bộ nhớ hoặc bỏ sandbox checks. Cần chọn lại audio sau reload; URI cache cũ có thể vẫn thiếu quyền. Nếu provider thu hồi quyền, báo chọn lại file; không giả vờ upload thành công.

Kiểm chứng bổ sung: unit 102/102 (.local/audio-read-unit.log), lint/typecheck đạt. Tests dùng encoder Expo thật cùng filesystem giả chỉ cho đọc bản sao trong sandbox, kiểm tra cleanup thành công/lỗi mạng/partial copy và quá 30 MB. Chưa xác nhận audio thành công trên Android thật; tiếp tục QA trên thiết bị sau restart/chọn lại file.

### Xác minh audio khi Lưu bài trên cloud

Người dùng đã upload được cả ảnh/audio, nhưng POST /songs báo File audio hoặc metadata không hợp lệ. Kiểm tra file MP3 thật do người dùng cung cấp: 7.191.372 bytes, duration đo được 204.69551020408164 giây, có audio stereo 44.1 kHz, không có video stream, có ảnh bìa PNG nhúng. Bản sao chỉ lưu .local/audio-cloud-debug.mp3, không commit. Thông báo trên là validator của ứng dụng, không phải thông báo bản quyền của Cloudinary; không suy ra quyền sử dụng nhạc từ việc tải được file.

audio-assets.cjs không còn mặc định coi width/height >0 là video và không dựa vào duration từ client. Vẫn gọi Admin API để kiểm tra publicId thuộc UID, resource_type video (bao gồm audio), dung lượng dương <=30 MB và URL chính xác của asset trong cloud cấu hình. URL phải là HTTPS res.cloudinary.com, đúng cloud/video/upload/publicId, không query/userinfo hoặc host khác. Metadata đầy đủ, không có dấu hiệu video thì dùng fast path.

Nếu duration thiếu/không hợp lệ hoặc metadata có kích thước/codec video mơ hồ, inspect-audio.cjs đọc bytes từ URL đã xác minh: không gửi Admin Authorization sang CDN, không theo redirect, timeout 30 giây, giới hạn stream 30 MB và đối chiếu bytes thực với Admin metadata. Tối đa hai phép inspection đồng thời. file-type nhận diện MP3/WAV/FLAC/OGG/M4A; music-metadata đo duration <=180 phút, yêu cầu sampleRate/channels hợp lệ và từ chối video stream. Ảnh bìa nhúng không bị coi là video. File lỗi/network/metadata drift trả lỗi, không đoán duration. Chỉ đọc bytes khi metadata mơ hồ để tránh tải lại mọi audio. Có thêm băng thông/latency ở nhánh này.

Client dành timeout 60 giây riêng POST /songs ở cloud để đủ thời gian xác minh; endpoint khác và Emulator giữ 15 giây. Cache requestId giữ retry idempotent như trước. Audio URL/publicId và file Cloudinary cũ không cần đổi hoặc upload lại chỉ để vượt validator; backend mới phải được deploy trước khi thử Lưu lại.

Kiểm chứng: bộ verifier mới chạy trên bytes MP3 thật, cả fixture Admin thiếu duration và có ảnh bìa đều trả đúng 204.69551020408164 giây; không có credentials Admin Cloudinary ở workspace để đọc JSON Admin thật nên chưa xác nhận chính xác field nào của phản hồi cloud cũ gây lỗi. Unit và isolated integration kiểm tra metadata mơ hồ, CDN URL ownership, lỗi network/size, POST /songs trả 201 và lưu duration/URL đúng, retry trả 200. Log .local/audio-metadata-unit.log và .local/audio-metadata-integration.log. Cần QA thao tác Lưu trên Render sau deploy; test Emulator không phải kết quả lưu bài thật trên cloud.

Nguồn: [Cloudinary Admin resource metadata](https://cloudinary.com/documentation/admin_api), [Audio resource type](https://cloudinary.com/documentation/audio_transformations).

### CI: Follow/Unfollow đồng thời

Lượt GitHub Actions 42276359516 của commit 1a0ba6b: integration 40/41, thất bại tại assert removals.every(status===200) của test follow API serializes concurrent clients. Quality, hai bundles và Docker đạt; test cloud image/song save mới cũng đạt. Log cũ chưa ghi response body/mã lỗi transaction ở lần thất bại nên không kết luận chính xác gRPC code chỉ từ assertion.

social-routes.cjs nay đọc relation, hồ sơ người theo dõi và target trong một tx.getAll, với refs được sắp theo path nhất quán; không còn ba tx.get chạy song song trong transaction follow. Tất cả kiểm tra active/counters và ghi relation/hai counters vẫn cùng transaction. Test unit bắt buộc batch read trước writes, kiểm tra PUT/DELETE lặp không đổi counters thêm lần nữa. Integration vẫn gửi 5 PUT và 4 DELETE song song, vẫn yêu cầu tất cả trả 200 và counters cuối đúng; đọc response JSON để assertion sau này có chẩn đoán. Không bỏ test, giảm concurrency hay đổi lỗi thành thành công.

HTTP error handler ghi code/message của lỗi nội bộ vào log server cùng method/path (không log token/body), response client vẫn dùng thông báo chung.

Lượt local đầu sau batch-read Follow đã qua test Follow nhưng tái hiện quota cũ với code 3, Transaction is invalid or closed. SDK Firestore 7.11.6 chỉ retry code 3 nếu message chứa transaction has expired, nên trường hợp này thoát thẳng. transaction.cjs bổ sung tối đa ba lần gọi runTransaction mới, backoff 50/100 ms, CHỈ khi code===3 và đúng message invalid or closed. Áp dụng cho follow và createOwnedSong; SDK tiếp tục xử lý retry contention thông thường. Không retry lỗi nghiệp vụ 409, permission hoặc INVALID_ARGUMENT khác; hết lượt vẫn ném lỗi gốc. Callback chỉ chứa đọc/ghi transaction, không gọi external API. createOwnedSong cũng đọc user/song cùng tx.getAll; quota và trạng thái idempotency được đọc lại trên mỗi transaction mới, không dùng kết quả lần thất bại.

Test deterministic mô phỏng writer khác dùng hết quota trong lúc transaction đầu bị đóng: lần retry phải đọc lại và trả 409, không trả thành công từ kết quả cũ. Có kiểm tra giới hạn ba lần và không retry lỗi validation/permission. Không khẳng định mọi transaction khác trong hệ thống đã được xử lý; tiếp tục theo dõi log nếu phát sinh trường hợp ngoài hai luồng này.

Kiểm chứng local sau bản sửa: unit 108/108, isolated integration 41/41 (.local/follow-ci-unit.log, .local/follow-ci-integration.log), lint/typecheck và source packaging smoke đạt. Kết quả GitHub phải xem [lượt mới nhất trên main](https://github.com/tuanank5/music_stream_app/actions?query=branch%3Amain), không dùng kết quả local để kết luận CI đã đạt.

### Luồng lưu bài

1. Client gọi GET `/audio-upload-config` có Firebase ID token.
2. Backend cấp chữ ký cho publicId riêng dạng `musicstream/{uid}/audio/{uuid}`.
3. Client tải audio lên Cloudinary bằng signature/api_key/timestamp/public_id; nhận publicId, URL và duration.
4. Client gửi POST `/songs` với requestId ổn định cho một lần đăng, title, artistNames, genre, lyric, description, albumId, coverUrl, isPublic và audioPublicId.
5. Backend gọi Cloudinary Admin API bằng credentials server, kiểm tra publicId đúng UID, file tồn tại, duration/bytes hợp lệ và không có video dimensions. URL/thời lượng lưu vào Firestore lấy từ response server, không từ client.
6. Transaction kiểm tra tài khoản/album, cộng duration các bài active và tạo bài nếu không vượt 10.800 giây. Cùng transaction cập nhật document user làm khóa tuần tự; hai upload đồng thời không cùng vượt quota. RequestId đã tạo cùng owner trả lại ID, không tạo thêm.
7. Client chuyển sang chi tiết bài. Khi lỗi quota, giữ asset đã upload trong cache form để thử lại; hiện chưa tự xóa asset Cloudinary bị bỏ dở.


## Search, discovery và các hợp đồng API cần nhớ

### Trạng thái audioKey

Đã kiểm tra lại: src/, data/local/, tools/local/ và dataset100 không còn audioKey. Song type, mapper client/backend, upload và Player chỉ dùng audioUrl; không phát file demo theo key. POST /songs từ chối audioKey trong payload. Tên field chỉ còn trong danh sách legacy của schema-audit và test chống hồi quy; không xóa các chỗ này vì cần phát hiện/xóa field cũ đúng cách khi migration.

planTargetMigration loại audioKey bằng whitelist target; nếu bài cũ thiếu audioUrl thì báo lỗi, không tự bịa URL hoặc gán nhạc demo. Chưa đọc hoặc sửa dữ liệu cloud, nên không khẳng định mọi document cloud cũ đã bỏ field. Các test liên quan audioKey/provider/audit/migration vừa chạy lại 39/39 đạt, log .local/audiokey-verification.log (khác suite integration 39/39). Docker local được kiểm tra thêm: WSL cũng chưa cài, nên không chỉ là lỗi PATH của Docker.

- CORS allowlist cloud, token/revocation, active account, 120 request/phút/UID, whitelist payload/DTO, lỗi không lộ nội bộ. Health không cần auth; local demo/media có ngoại lệ riêng, không mount cloud.
- FTS NFD/bỏ dấu/đ→d, prefix; tên exact/prefix/đủ từ ưu tiên trước metadata, popularity sau relevance. Search debounce 300 ms, 20 đầu + 10 tiếp. Không collection scan mỗi request, nhưng startup vẫn preload/listen.
- History tìm kiếm AsyncStorage theo UID/version, tối đa 20 mục đã mở: kind/id/title/subtitle, không email/token/media URL. Mở lại revalidate quyền; query rỗng hiện history, filter bấm lại bỏ chọn.
- Cursor search HMAC theo UID/query/filter/scope/version/epoch; snapshot RAM 120 giây, tối đa 256 snapshot/tổng 250.000 ID. Restart/eviction/hết hạn tải lại đầu. Endpoint dùng document cursor không tự có cùng cơ chế HMAC.
- Home tối đa 20 mỗi nhóm; suggestions history/favorites/following + diversity/dedupe; seed ổn định trong phiên. Top 50 thể loại chọn trước shuffle, album totals lấy toàn nguồn đúng quyền. Không giả tăng trưởng tuần từ playCount tích lũy.
- Follow graph từ document path, backend cap 9.999 quan hệ (watch 10.000 để phát hiện overflow), mẫu 50 fan × 50 following, cache 30 giây/256 target và revalidate quyền. Vượt cap/lỗi sync trả unhealthy, không coi graph cắt là đầy đủ.
- POST album/playlist/feed/comments có Idempotency-Key, song có requestId. Retry key theo account/payload trong phiên form, chưa outbox/tombstone bền qua restart/xóa tài nguyên.
- Chủ bài đổi cover hoặc soft-delete active=false: giữ file/lịch sử/lượt nghe/refs, loại khỏi queue thiết bị thao tác. Không ghi isPublished legacy hoặc gọi đây là xóa file vĩnh viễn.

## Migration, cloud và bàn giao

Backend target từ chối dữ liệu legacy thiếu isPublic/checkpoint hồ sơ cần thiết; không giả marker để bỏ qua. users là nguồn counters sau migration, không ghi publicProfiles cũ ngược về users.

schema:audit chỉ đọc, fixture/local/cloud tường minh, tối đa 250.000 docs; nhiều query không nguyên tử khi còn writer. schema:migrate/restore apply chỉ demo Emulator, ≤400 source docs, maintenance và backup mới; re-read/updateTime chống drift. Restore chỉ khi target còn khớp, không đè dữ liệu mới. Giữ publicProfiles đối chiếu, chưa tự cleanup cloud.

```cmd
npm run schema:migrate -- --local
npm run schema:migrate -- --local --apply --maintenance --backup .local/target-before-migration.json
node tools/restore-target-schema.cjs --local --backup .local/target-before-migration.json
node tools/restore-target-schema.cjs --local --apply --maintenance --backup .local/target-before-migration.json
```

Apply là bảo trì, không phải chạy app hằng ngày: dừng backend/writers, giữ Emulator, dry-run trước. Backfill hồ sơ riêng ở tools/backend/backfill.cjs; target migration bao quát toàn schema. Dataset100/script legacy bị chặn ghi không phải importer target. Backup có dữ liệu riêng, không commit.

Cloud client: EXPO_PUBLIC_FIREBASE_MODE=cloud, đủ Firebase Web config cùng project, EXPO_PUBLIC_BACKEND_URL HTTPS origin; không biến Emulator. Backend: GOOGLE_CLOUD_PROJECT, ADC/credential hợp lệ, CURSOR_SECRET ≥32 ký tự, ALLOWED_ORIGINS, PORT. Firebase CLI login khác ADC; backend:cloud không tự load backend.env. Không secret trong EXPO_PUBLIC/image/APK.

Chưa rollout cloud kiểm chứng. Trình tự: xác minh project/quyền → backup/audit → migration/import kiểm chứng → backend/health/privacy → phối hợp Rules/indexes/client → smoke test. Không deploy deny-all Rules riêng trước client/backend tương ứng. Rollback xét counters nguồn mới, không chỉ checkout code cũ.

Bàn giao dữ liệu thật phải có manifest UID/album/song/media, public/private/favoriteAlbums, duration thực, hướng dẫn chọn ảnh/audio, dry-run/backup/import/kiểm chứng. Chưa hoàn thành importer/cloud này; giữ nguyên media người dùng chọn.

Định hướng APK/Render/AI nằm trong [báo cáo rà soát](PROJECT_REVIEW_2026-11-06.md): Express proxy trên Render, media bền ở Cloudinary; FTS trước, embedding khi cần, LLM chỉ cho query phức tạp, transcription tạo lyric nháp có duyệt. Chưa AI implementation. Vertex IAM/billing/model/region chưa xác minh, không hứa miễn phí hoặc tương thích từ tên model.

## Kiểm thử và backlog hiện tại

Bằng chứng cập nhật 06/11 sau khi bổ sung Guitar và sửa Dockerfile:

| Kiểm tra | Kết quả |
| --- | --- |
| Typecheck | PASS |
| Lint --no-cache | PASS, 0 errors và 0 warnings sau dọn import thừa |
| npm test | Lượt chuyển screens/Auth: 97/97, gồm Metro delegation, NotFoundScreen và RequireAuth |
| Integration/Rules isolated | 41/41 PASS, thêm hai test Firebase SDK Web/RN đăng nhập/khôi phục phiên/đăng xuất. Emulator test đã tự tắt; lỗi quota chập chờn từng gặp ở checkpoint trước vẫn cần theo dõi |
| Local upload/restart | WAV/PNG và persistence qua backend restart PASS |
| Docker source packaging | backend:check-package PASS: module load, SQLite FTS5, health, HTTP 401; dependencies dùng tools/node_modules hiện có |
| Docker image | GitHub Actions đã build/run smoke đạt; chưa deploy Render |
| APK/native/cloud/AI | Chưa nghiệm thu; bundle và SDK tests không thay native UI E2E |

data:check: 394 document, 120 localAudio, 0 lỗi, 158 cảnh báo; toàn bộ là media_ownership_unverified cho 26 users.avatarPublicId, 120 songs.coverPublicId, 12 albums.coverPublicId. Các ảnh HTTPS đang có publicId=null: giữ lựa chọn ảnh và cảnh báo, không bịa publicId hoặc tắt validator. Chấp nhận cho demo local; cloud cần managed assets/ownership thực tế. Check này không tải URL ảnh để xác minh HTTP availability. Report local: .local/data-review-audit.json; không commit report dữ liệu riêng.

```cmd
npm run lint -- --no-cache
npm run typecheck
npm test
npm run test:local:isolated
```

Isolated runner chọn cổng riêng/dọn Emulator test, không dừng server người dùng. PERMISSION_DENIED có thể là negative test đúng; xem tổng kết. UI happy-dom/adapter không phải native E2E. Export không phải APK/IPA.

Thứ tự tiếp tục:

1. Đã đủ 48 Guitar và Dockerfile đã copy genres.ts; .dockerignore chỉ gửi inputs backend. Còn build/run image bằng Docker thật, xác minh dependencies production và health với môi trường phù hợp; source smoke hiện chưa kiểm tra lớp npm ci trong image.
2. Signed ảnh/publicId/ledger và cleanup ảnh cloud đã có code/tests; còn QA Cloudinary thật, lịch vận hành cleanup, import ownership ảnh/audio cũ, cleanup audio và private-file delivery nếu cần. Local còn buffer RAM/tối đa hai uploads, chưa quota đĩa/ledger/checksum đầy đủ.
3. Cloud env, timeout/cold start (client 15 giây), playback/cursor/outbox qua restart và retention khi host ngủ; migration/import lớn; đối soát deactivate.
4. Paging Library/playlist/favoriteAlbums, giảm preload/reads; đo RAM/startup/latency/cost. Chưa scale nhiều instance khi state process-local.
5. QA Android/iOS: picker/crop/background/lock screen/seek/auto-next, network/retry/đổi UID, Back/keyboard/Portal/theme/accessibility. APK dùng mạng khác khi máy dev tắt.
6. AI feature flag/cache/quota/fallback và tập đánh giá tiếng Việt; lyric draft job bền vững. Xác minh provider/model/location trước tích hợp.

## Duy trì tài liệu và bàn giao ChatGPT

### Cấu trúc screens, routes và Auth

Tất cả screen nằm ở src/screens, gồm NotFoundScreen. src/components giữ RequireAuth, AppFrame, UI primitives, cards/rows/sections. Guard đổi thành RequireAuth; BackendPlaylistScreen thành PlaylistScreen; DeleteAccountScreen thành AccountDeleteScreen. Không còn các file gộp DetailScreens/ChartScreens/LibraryScreens: SongScreen gộp tải dữ liệu/chi tiết, LyricsScreen, PremiumScreen; ChartsScreen/ChartScreen; LibraryScreen/PlaylistsScreen/FavoritesScreen.

UserPlaylistsScreen nằm ở screens; PublicPlaylistsSection (file PlaylistsSection.tsx) và PlaylistRow dùng chung ở components. Xóa UI.tsx và DiscoveryCards.tsx cùng các file re-export discovery/BackButton và discovery/SectionHeading; import từ ui/index hoặc implementation thực. ui/index và firebase/index là entry index có chủ đích, không tạo thêm file cầu nối.

Route /my-uploads render MyUploadsScreen trực tiếp qua RequireAuth; route /uploads đã xóa. Route /account-delete thay /deleteaccount. app/+not-found.tsx chỉ render NotFoundScreen, không Guard; screen có nút về /home cho user hoặc / cho guest. Nút chờ auth restore xong mới bật. Đã sửa navigation và fallback tương ứng; API backend /uploads không đổi tên.

Auth Web/default được triển khai trực tiếp trong services/firebase/auth.ts; đã xóa auth.web.ts và chuyển toàn bộ import trực tiếp (kể cả integration) sang auth. auth.native.ts tiếp tục dùng getReactNativePersistence(AsyncStorage). Không xóa file native hoặc gộp persistence thành in-memory. Metro có custom resolver CHỈ cho @tamagui/portal để giữ chung React context; nhánh còn lại chuyển nguyên context/moduleName/platform cho resolver mặc định. Không alias auth hay ép platform.

Đã export Web và Android/Hermes với sourcemaps, kiểm tra module thực trong bundle: Web → src/services/firebase/auth.ts và @firebase/auth/dist/esm; Android → auth.native.ts và @firebase/auth/dist/rn. Report .local/screens-auth-resolution.json; output/log .local/screens-web-export và .local/screens-android-export. Export không phải APK hay chạy UI thiết bị.

Hai test Auth Emulator mới dùng source implementation của app cùng Firebase SDK browser/RN thực: tạo account synthetic, sign-in, xác minh storage đã ghi, delete/recreate Firebase app và source singleton để khôi phục UID, sign-out rồi recreate vẫn null. Web dùng happy-dom/localStorage; RN dùng adapter AsyncStorage mô phỏng có backing store giữ qua app recreation. Đây là kiểm thử persistence contract, KHÔNG phải force-stop/reopen Android APK hoặc đóng/mở trình duyệt thật. Máy chưa có adb/Android SDK, nên phần nghiệm thu thiết bị vẫn còn. Workers xóa account synthetic và Emulator cô lập tự tắt; không động phiên/server người dùng hoặc cloud.

Kiểm chứng: unit .local/screens-unit.log, integration .local/review-integration.log (41/41), lint/typecheck, source smoke và hai bundle như trên. Thay đổi dựa trên [Expo platform modules](https://docs.expo.dev/router/advanced/platform-specific-modules/) và [NotFound routing](https://docs.expo.dev/router/error-handling/). Không sửa báo cáo PROJECT_REVIEW_2026-11-06.md.

### Rà soát và dọn code dư

Đã bỏ khối type/schema cũ bị comment trong domain.ts và implementation popularArtists bị comment; bỏ 4 helper discovery client không có consumer (artistSongs/popularArtists/chartSongs/artistAlbums), giữ shuffleSongs đang dùng. Thuật toán discovery thật nằm ở backend/recommendations, không bị xóa.

Đã bỏ PlaylistDetailScreen cũ (route /playlist đang dùng PlaylistScreen), usePlayer facade không consumer, useRealtimeList, Toggle/barrel export không consumer, mapper mapSong phía client không còn dùng (giữ DTO backend), FirebaseClientConfig/getFirebaseRuntimePlatform, các type props alias không dùng, 9 import React thừa và import isLocalDemoAudio thừa. Bỏ comment ngày cập nhật cố định ở authService/catalogService; giữ comment về quyền/transaction/lifecycle/Metro/local safety vì giải thích ràng buộc thật.

DataProvider không còn HistoryContext/useHistoryData và lượt subscribe /recent-history không được màn hình nào dùng. HistoryScreen tiếp tục qua useHistoryPage → /history có phân trang; tracking/counting/retention không đổi. Bỏ wrapper watchHistory dư, integration vẫn kiểm tra endpoint recent-history qua subscribePrivateList trực tiếp. Test provider xác nhận không preload history và playlist cập nhật không làm catalog render lại. tsconfig bật noUnusedLocals/noUnusedParameters để phát hiện import/biến/parameter thừa trong lần sửa sau.

Đã sửa header scripts/create-local-auth.cjs về đúng đường dẫn chạy và chỉ rõ npm run data:auth. Script này vẫn có tác dụng tạo input cho importer nên được giữ. Đã thêm data/local/auth.json vào .gitignore; file HIỆN ĐANG ĐƯỢC GIT TRACK nên ignore không tự bỏ file khỏi index/history. Không sửa nội dung hoặc xóa file credential local của người dùng. Cần tách khỏi Git tracking ở bước quản lý dữ liệu/repository phù hợp, giữ bản local cần dùng.

Các điểm cần xử lý tiếp sau cleanup:

1. Quota concurrent test vẫn gặp lỗi Firestore Emulator code 3 "Transaction is invalid or closed" thay 409. Cần điều tra retry/transaction và bảo đảm đọc lại quota trên transaction mới khi xử lý lỗi tranh chấp; không đổi mọi lỗi thành 409 hoặc giảm assertion để lấy PASS. Cùng lỗi đã có ở lượt signed-image đầu trước cleanup. Chưa xác định gốc lỗi SDK/Emulator hay contention ứng dụng.
2. tools/Switch-Users-Only.cjs và tools/Restore-Schema.cjs là CLI legacy có đường ghi/restore ngoài workflow target; Switch còn tạo userId legacy. Không thể kết luận CLI không dùng chỉ vì không được import. Cần đối chiếu nhu cầu rollback/backup rồi retire hoặc giới hạn chúng; tools/Migrate-Schema.cjs đã chặn apply nhưng thông báo cũ còn hướng dẫn apply, cần đồng bộ hướng dẫn khi retire nhóm công cụ.
3. Profile còn hai nguồn tên/ảnh Auth và users; saveProfile khi đăng ký vẫn update Auth và backend qua nhiều bước. Cần chốt nguồn hiển thị chuẩn và cơ chế đối soát khi lỗi giữa các bước, không xóa luồng bootstrap đang được dùng.
4. http-app.cjs còn allowlist method/path lớn song song với các Router; dễ sót route mới. Cần refactor riêng kèm test 401/403/405/CORS/error, giữ quyền kiểm tra trước mọi mutation.
5. Các provider còn tải đầy đủ playlist/favorites/following qua subscribePrivateList; việc bỏ history dư mới giảm một nguồn, chưa giải quyết paging/reads toàn bộ Library.

Kiểm chứng cleanup: typecheck (bao gồm noUnused) PASS, lint 0 warnings, unit 94/94 (.local/code-cleanup-unit.log), source packaging smoke PASS, export web .local/code-cleanup-web-export PASS. Integration .local/review-integration.log 38/39 với đúng lỗi quota cũ nêu trên; các test History/API/signed ảnh còn lại đạt. Không chạy hoặc dừng server thủ công của người dùng; không ghi cloud. Báo cáo PROJECT_REVIEW_2026-11-06.md giữ nguyên.

Checkpoint trước cleanup: signed image/ledger/cleanup từng đạt unit 94/94 và integration 39/39 sau một lần lỗi quota; log lần lỗi đầu còn ở .local/signed-images-integration-first.log. Log .local/review-integration.log hiện là lần cleanup mới 38/39, không dùng nó làm bằng chứng lần đạt cũ. Warning isLocalDemoAudio của checkpoint trước đã được loại bỏ trong cleanup. Mọi Cloudinary response trong integration là fake; chưa QA native/Cloudinary thật. Docker image vẫn chưa build vì máy thiếu môi trường Docker/WSL; source smoke đã đạt.

PROJECT_CONTEXT.md là trạng thái sống: cập nhật hành vi/files/checks vừa chạy/giới hạn/process-ports/bước tiếp tục; thay mô tả cũ, không nối hàng loạt checkpoint mâu thuẫn. README chỉ giữ cách bắt đầu/liên kết. PROJECT_REVIEW_2026-11-06.md giữ nguyên báo cáo lịch sử theo yêu cầu; PDF vẫn giữ.

Prompt tiếp tục: “Đọc AGENTS.md, docs/PROJECT_CONTEXT.md và docs/PROJECT_REVIEW_2026-11-06.md; kiểm tra code/diff trước khi sửa. Giữ dữ liệu local/media của tôi. Làm mục [chỉ định], phân biệt chức năng đã có với kế hoạch, báo đúng checks và giới hạn.”
