# music_stream_app — Hướng dẫn dự án

Cập nhật **2026-11-03**. Đây là tài liệu chính duy nhất về cài đặt, chạy, kiểm thử, kiến trúc và vận hành. Quy tắc dành cho coding agent được giữ riêng trong [AGENTS.md](AGENTS.md).

Ứng dụng nghe nhạc mobile dùng Expo SDK 58, React Native, TypeScript, Expo Router và Tamagui. Firebase Authentication quản lý tài khoản, Firestore lưu metadata/dữ liệu người dùng; backend Node cung cấp Search/Discovery/Charts và retention. Media dùng audio demo đóng gói hoặc HTTPS/Cloudinary. Không dùng Spring Boot hoặc Firebase Storage; SQLite chỉ phục vụ search index ở backend.

## Đặc tả và tiến độ triển khai

- [Yêu cầu backend và UI đã chốt](docs/BACKEND_AND_UI_REQUIREMENTS.md).
- [Báo cáo tiến độ, kiểm thử, giới hạn và bước tiếp theo](docs/IMPLEMENTATION_PROGRESS.md).

Backend đang chuyển sang Express 5; toàn bộ schema và nghiệp vụ mới chưa hoàn thành, chưa migration/deploy cloud. Từ đây checkpoint chi tiết cập nhật trong báo cáo tiến độ, không dồn vào README.

## Mục lục

- [Trạng thái và công việc còn lại](#status)
- [Cài đặt](#setup)
- [Chạy local bằng ba CMD](#local)
- [Điện thoại và lỗi kết nối](#phone)
- [Kiểm thử](#testing)
- [Hành vi chức năng](#features)
- [Kiến trúc và dữ liệu](#architecture)
- [Quy ước phát triển/UI](#development)
- [Hồ sơ và media](#profile-media)
- [Thiết kế tham khảo](#design)
- [Backend và triển khai Firebase thật](#backend)
- [Bàn giao](#handoff)

<a id="status"></a>

## Trạng thái và công việc còn lại

| Mốc                         | Trạng thái                                                                       |
| --------------------------- | -------------------------------------------------------------------------------- |
| M0 — môi trường local       | Đã có Auth/Firestore Emulator, backend, fixture và cấu hình không fallback cloud |
| M1 — Follow/tối ưu React    | Đã sửa counters, tách context, giữ một engine, đối soát listeners và callback cũ |
| M2 — Search history/Library | Đã có lịch sử local, filter bật/tắt, Library và History riêng                    |
| M3 — Search server          | Đã nối SQLite FTS5, cursor 20 + 10 và public profiles                            |
| M4 — History/retention      | Đã có paging/dedupe 100 bài và worker giữ 1.000 phiên trong local                |
| M5 — Discovery              | Đã có seed/diversity, Top 50 trước trộn, album totals và See all phân trang      |
| M6 — kiểm tra/cloud         | Tests/rules/cấu hình đã chuẩn bị; **chưa deploy cloud**                          |

Kết quả tự động gần nhất: lint sạch, TypeScript PASS, **47/47 tests ứng dụng và 18/18 integration/rules PASS**; export Android/iOS/web thành công. Bundle không phải APK/IPA hoặc bằng chứng test thiết bị thật.

Phần còn lại:

- [ ] Đăng nhập Firebase CLI/ADC, xác minh quyền project thật.
- [ ] Xác minh host Node 24 HTTPS chạy liên tục; build/test container, credentials, secrets và origins.
- [ ] Backup, dry-run cloud, đối chiếu counters/relations và rollout backend/projection/rules/client.
- [ ] Smoke test cloud, ghi project/URL/revision/kết quả; chỉ khi đó hoàn thành phần deploy M6.
- [ ] Test thực tế Android/iOS: network, audio, keyboard, Portal, Back, chữ lớn và màn hẹp.
- [ ] Đo tải/chi phí/read/write thực tế; xử lý shared cursor trước khi scale nhiều instance.

Firebase CLI lần kiểm tra gần nhất chưa đăng nhập hợp lệ. Project ID trong config là `musicstreamapp-5a527`, chưa xác minh quyền truy cập. Chưa migration/deploy/thay đổi dữ liệu cloud hoặc bật dịch vụ trả phí. Premium chỉ là demo; thanh toán, offline, cast, notifications và tương tác social chưa có backend không được coi là đã hoàn thành.

<a id="setup"></a>

## Cài đặt

Dùng Node **24.12+** và Java/JDK cho Firestore Emulator; đã kiểm tra Node 24.12.0. Backend dùng `node:sqlite`, có ExperimentalWarning ở runtime này, không cần thêm SQLite native module vào app.

Mở CMD tại thư mục `music_stream_app`; cài dependencies nếu chưa có:

```cmd
node -v
npm -v
java -version
npm ci
npm ci --prefix tools --no-audit --no-fund
```

Giữ lockfile; không tự nâng Expo/React Native hoặc chạy audit fix để né cảnh báo công cụ. Wrapper local tự tìm `java.home` để dùng đúng JDK trên Windows. Local không cần service-account JSON, Firebase CLI login hoặc chỉnh `.env`.

<a id="local"></a>

## Chạy local bằng ba CMD

Mở **ba cửa sổ CMD**, tất cả đứng trong thư mục dự án, giữ chạy suốt lúc test. Không mở thêm server tương ứng nếu đã chạy trên cùng cổng.

**CMD 1 — Firebase Emulator:**

```cmd
npm run local:emulators
```

Chờ Auth/Firestore sẵn sàng. Lần đầu cần tải Emulator; cache nằm trong `.local/emulators`.

**CMD 2 — dữ liệu thử và backend:**

```cmd
npm run local:seed
set LOCAL_BACKEND_HOST=0.0.0.0
npm run local:backend
```

Chờ `Local backend listening`. Biến bind `0.0.0.0` giúp điện thoại LAN truy cập; mặc định backend chỉ nghe `127.0.0.1` nếu không đặt biến này.

**CMD 3 — Expo trên điện thoại:**

Dùng `ipconfig` tìm IPv4 của Wi-Fi đang dùng, thay IP ví dụ dưới đây:

```cmd
set LOCAL_APP_HOST=192.168.1.15
npm run start:local -- --clear
```

Quét QR bằng Expo Go tương thích SDK hoặc development build phù hợp. Nếu chỉ thử web trên máy, CMD 3 dùng `npm run start:local -- --web`.

`start:local` bỏ qua dotenv và truyền config project giả `demo-music-stream`; không dùng `npm start` rồi mặc định rằng đang ở local. Khi đổi host cần đóng hẳn app/Expo Go, restart Expo và quét QR mới; Fast Refresh không thay endpoint Firebase đã khởi tạo.

### Tài khoản và fixture

Mật khẩu chung **chỉ dùng local**: `LocalMusic123!`.

| Email                                                           | Vai trò                                              |
| --------------------------------------------------------------- | ---------------------------------------------------- |
| `local-listener@example.test`                                   | Người nghe có favorites, following, playlist/history |
| `local-artist-01@example.test`                                  | Nghệ sĩ với bài public/private/unlisted/followers    |
| `local-artist-02@example.test` … `local-artist-24@example.test` | Nghệ sĩ thử nghiệm                                   |
| `local-member@example.test`                                     | Thành viên thông thường trong Auth Emulator          |

Fixture: 26 tài khoản, 120 bài public + 3 bài visibility, 12 album, 160 phiên/80 bài khác nhau, 25 favorites, playlist, follow, post/comment và publicProfiles. Audio `demo1`/`demo2`/`demo3`, ảnh placeholder; upload ngoài bị chặn trước file reads/fetch.

Emulator không được cấu hình lưu dữ liệu qua lần tắt/bật, nên cần seed lại khi khởi động mới. Seed ghi đè fixture cùng ID, không xóa collection và từ chối project cloud. Không dùng local fixture trên dữ liệu thật.

### Cổng và cách đặt biến

| Dịch vụ   | Cổng        | Truy cập                                    |
| --------- | ----------- | ------------------------------------------- |
| Auth      | 9099        | Emulator bind `0.0.0.0`                     |
| Firestore | 8080        | Emulator bind `0.0.0.0`                     |
| Backend   | 8787        | `LOCAL_BACKEND_HOST=0.0.0.0` cho điện thoại |
| Hub       | 4400        | Loopback, điện thoại không cần truy cập     |
| Metro     | Thường 8081 | Theo cổng Expo in ra                        |

Android emulator dùng `LOCAL_APP_HOST=10.0.2.2`; điện thoại thật dùng IP LAN của máy. Seed/backend trên máy vẫn dùng loopback tới Firebase Emulator.

Ví dụ trên là **CMD**. PowerShell đặt biến bằng `$env:LOCAL_BACKEND_HOST="0.0.0.0"` và `$env:LOCAL_APP_HOST="192.168.1.15"`. Đặt trong đúng cửa sổ chạy lệnh liên quan; biến CMD 2 không tự truyền sang CMD 3. Nhấn `Ctrl+C` trong mỗi cửa sổ để dừng.

<a id="phone"></a>

## Điện thoại và lỗi kết nối

### Firebase `auth/network-request-failed`

1. Máy và điện thoại cùng Wi-Fi/LAN; dùng IPv4 adapter đang hoạt động, không dùng IP mạng khách/adapter ảo.
2. CMD 1 phải còn Auth 9099/Firestore 8080; CMD 2 phải bind backend `0.0.0.0`.
3. CMD 3 đặt `LOCAL_APP_HOST` bằng IP LAN hiện tại. Log cần hiện Auth/Firestore/backend cùng IP đó, không phải `127.0.0.1`.
4. Restart Expo với `--clear`, đóng hẳn app rồi quét QR mới.

Mở trên trình duyệt **điện thoại**, thay IP theo máy:

```text
http://192.168.1.15:9099/emulator/v1/projects/demo-music-stream/config
http://192.168.1.15:8787/health
```

Cả hai phải hiện JSON; health có `mode: emulator`, `projectId: demo-music-stream`, `ready: true`. Quét được QR không chứng minh điện thoại truy cập được các cổng Auth/backend. `127.0.0.1` trên điện thoại là chính điện thoại.

Nếu không mở được, kiểm tra firewall cho Node/Java trên mạng Private, VPN và Wi-Fi/AP isolation. Không tắt toàn bộ firewall hoặc forward Emulator ra internet.

| Lỗi khác                       | Xử lý                                                                                        |
| ------------------------------ | -------------------------------------------------------------------------------------------- |
| Cổng đã dùng                   | Dừng server cũ tương ứng, không chạy hai phiên cùng cổng                                     |
| Không có tài khoản/dữ liệu mẫu | Seed sau khi Emulator bật; kiểm tra đang ở local                                             |
| Search/Home lỗi                | Backend còn chạy, host/URL đúng, health ready và token cùng môi trường                       |
| Cursor hết hạn/restart         | Dùng Thử lại để tải trang đầu mới                                                            |
| `permission-denied` trong app  | Kiểm tra owner/visibility/follow/claim và rules cùng phiên bản; không mở quyền toàn database |
| Portal/Dialog                  | Restart Metro cache sạch, giữ resolver `@tamagui/portal`                                     |
| Media không phát               | URL trả file HTTPS trực tiếp; kiểm tra định dạng/CORS, không dùng HTML/trang chia sẻ         |
| Thiếu Firebase mode            | Dùng `start:local` hoặc đặt rõ cloud mode, không trộn biến Emulator/cloud                    |

<a id="testing"></a>

## Kiểm thử

### Tự động

Dừng Emulator/backend thủ công trước integration để tránh trùng cổng:

```cmd
npm run lint
npm run typecheck
npm test
npm run test:local:integration
```

Integration tự bật/tắt Emulator. Suite app dùng `demo-music-stream`, suite Rules dùng `demo-music-rules` riêng. Không chạy `test:rules` riêng khi chưa có Emulator; không đổi project demo thành project thật. Negative tests có thể log `PERMISSION_DENIED`; xem tổng kết pass/fail.

Kiểm tra bundle khi thay native/UI:

```cmd
npx expo export --platform all --output-dir .local/export-check
```

Kết quả gần nhất ngày 2026-11-03: 47/47 tests ứng dụng, 18/18 integration/rules, lint/typecheck và export Android/iOS/web PASS. Các bundle tại `.local/m3-m6-export`; web chỉnh nhãn cuối tại `.local/m3-m6-web-final`. `git diff --check` PASS, chỉ thông báo line endings.

Tests có SQLite thật, hook React thật, Auth/Firestore/Node Emulator và rules repo. UI render dùng ReactDOM/happy-dom với adapter/stub platform; không phải navigator/audio native E2E. Bundle Hermes không phải APK/IPA, không thay thế test máy thật.

Đã kiểm tra: validation/accessibility, providers/lifecycle/StrictMode/cleanup, local history/account isolation; FTS/relevance; debounce và response cũ/query/UID; cursor giả/sai scope; sync thêm/đổi tên/xóa/ẩn; privacy/email/Follow; History 160 phiên/80 bài và nguồn 120 bài dừng đúng 100, timestamp trùng/offline/retry/coalesce; retention 1.105→1.000 đồng thời, giữ phiên vừa cập nhật/receipts; backfill dry-run không ghi và apply whitelist/counters.

### Checklist thủ công

| Luồng             | Kết quả cần thấy                                                                              |
| ----------------- | --------------------------------------------------------------------------------------------- |
| Auth/profile      | Login/register/lưu phiên/logout, đổi UID không lẫn dữ liệu; lỗi lưu profile khác lỗi tạo Auth |
| Search `duong ve` | Tìm tên có dấu, 20 đầu + 10 tiếp nếu đủ; filter bật/tắt, xóa query reset                      |
| Search history    | Mở mới lưu, xóa riêng/tất cả, tối đa 20, tách tài khoản                                       |
| Người dùng        | Nhãn Người dùng, mở public profile, không mở màn sửa profile hoặc thêm loại history thứ tư    |
| Library/playlist  | Mặc định favorites/followed artists; playlist/history mở riêng; CRUD/thêm/gỡ bài đúng         |
| History           | 10 + 10, không trùng, queue đúng, Back về Library, không có search                            |
| Follow            | Follow/Unfollow đồng bộ, chặn nhấn lặp, lỗi giữ trạng thái                   |
| Player/MiniPlayer | Một engine; play/pause/next/previous/repeat/seek và Back đồng bộ                              |
| Home/Charts       | Nhóm Home tối đa 20, scroll/Back đúng; chart tối đa 50 và queue theo hiển thị                 |
| Feed/comments     | CRUD theo owner, archive, composer tránh keyboard; không có counters giả                |
| Quyền             | Guest/khác owner không đọc dữ liệu riêng; private/followers thu hồi đúng                      |
| Mobile UI         | Màn hẹp/chữ lớn/tên dài/ảnh lỗi/loading/error, safe area, Portal/menu và Back double tap      |

History fixture chỉ có 80 bài khác nhau nên dừng ở 80 là đúng. Demo audio khoảng 12 giây có thể khác duration metadata cũ; dùng để thử điều khiển phát, chưa dùng nghiệm thu counting/completed. Cần thay nguồn audioKey demo và đối chiếu thời lượng thật ở bước đã ghi trong đặc tả. Email reset/upload cần test riêng trên cloud phù hợp.

<a id="features"></a>

## Hành vi chức năng

### Search, Library và History

- Search rỗng chỉ có tối đa 20 mục đã mở, lưu AsyncStorage theo UID/version, dedupe kind + id. Có xóa riêng/tất cả, tuần tự hóa ghi và xử lý JSON/storage lỗi. Chỉ lưu kind/id/title/subtitle, không email/token/media URL; mở lại xác minh server/quyền.
- Query không rỗng mới có Bài hát/Album/Nghệ sĩ; không Tất cả. Không chọn là hỗn hợp; nhấn lại bỏ lọc, xóa query reset. Người dùng thường có nhãn/route `/user`, không thêm loại thứ tư vào local history.
- Search server 20 + 10, debounce 300 ms, bỏ response cũ, cache pending theo account/query/filter/cursor. Số đã tải không phải tổng toàn hệ thống.
- Library mặc định favorites + followed artists; không có chip Tất cả/Playlist hoặc nút Yêu thích dư. Hai nút Playlist của bạn/Lịch sử mở màn riêng. Album filter là album từ favorites, không phải saved albums độc lập.
- Search Library không lọc History. History không có search, hiển thị phiên mới nhất mỗi bài, 10 + 10 tới 100 bài khác nhau, bỏ bài mất quyền và queue theo danh sách đã tải. Firestore vẫn lưu theo phiên.

### Discovery

- Suggestions tối đa 20, trộn quen/cùng gu/khám phá từ history/listenedSeconds/completed/favorites/following, dedupe/diversity/bù trừ.
- Popular artists active, có bài public/active/published, loại self nhưng giữ người đã follow; follower giảm dần → pool 60 → ba nhóm 20 → chọn 10/6/4 → bù → trộn seed.
- Trending albums tối đa 20 từ pool phổ biến, tổng playCount đúng albumId và bài hợp lệ, đa dạng nghệ sĩ. Tổng tích lũy không phải tăng trưởng tuần.
- Home songs trộn tối đa 20, không thêm Nghe gần đây. Seed theo UID/phiên, giữ khi render/Back/follow/progress, có refresh chủ động.
- Chart mỗi genre chọn Top 50 theo playCount/tie-break ID trước seed shuffle; detail virtualized toàn tập tối đa 50, queue đúng, không rank giả. See all artists/albums 20 + 10 có tiêu chí xếp hạng rõ.

<a id="architecture"></a>

## Kiến trúc và dữ liệu

| Đường dẫn                              | Vai trò                                                                                            |
| -------------------------------------- | -------------------------------------------------------------------------------------------------- |
| `src/app/`                             | Route mỏng: guard/params/screen; entry `expo-router/entry`                                         |
| `src/components/`, `ui/`, `discovery/` | Screens, primitives và cards                                                                       |
| `src/hooks/`, `contexts/`              | Forms, subscriptions, pagers, navigation, Auth/Data/Player                                         |
| `src/services/`, `utils/`              | Firebase/backend/auth/catalog/library/history/feed/media, validation/subscriptions/recommendations |
| `tools/local/`, `tools/backend/`       | Emulator/fixture/seed, index/server/projection/retention/cloud                                     |
| `tests/`, `assets/`                    | Tests và media demo/UI                                                                             |

Không thêm App.tsx/NavigationContainer riêng. Search đi Screen → useSearch/useCursorList → backendService → Node → FTS. Player tách actions/state/progress nhưng giữ một useAudioPlayer/session. Data tách catalog/library/history, memo/Map merge; linked/follower subscriptions diff ID, pending requests coalesce, callbacks cũ bị bỏ sau cleanup/logout/đổi quyền.

| Collection/path            | Dữ liệu/quyền                                                                                                               |
| -------------------------- | --------------------------------------------------------------------------------------------------------------------------- |
| `users/{uid}`              | Profile riêng có email, owner đọc                                                                                     |
| `publicProfiles/{uid}`     | userId/displayName/avatarUrl/biography/active/social counters; signed users đọc, metadata do backend project                |
| `songs/{id}`               | artistId/artistNames/albumId, media URLs/audioKey, duration/genre/lyric, visibility/publication/active/playCount/timestamps |
| `albums/{id}`              | title/artistId/artistName/coverUrl/isPublished/timestamps                                                                   |
| `users/{uid}/favorites`    | Owner đọc; backend thêm/gỡ, kiểm tra bài còn quyền nghe                                                                      |
| `users/{uid}/following`    | Owner đọc; backend ghi relation và hai counters nguyên tử                                                                  |
| `users/{uid}/playlists`    | Riêng, tối đa 50 songIds không trùng; thêm bài phải đọc được                                                                |
| `users/{uid}/history`      | Phiên nghe: songId/playedAt/startedAt/progress/duration/listened/completed/counted                                          |
| `users/{uid}/playReceipts` | Chống counting lặp, không prune cùng history                                                                                |
| `posts/{id}/comments`      | Backend CRUD theo owner/trạng thái post; client chỉ đọc khi bài đăng active                                            |

Visibility: public cần active/published; unlisted đọc theo ID/quyền; private cho owner; followers theo relation. Search công khai không trả private/unlisted/followers. Không thể bảo vệ email chỉ bằng bỏ field khi map UI.

Counting qua POST `/playback/:historyId` và transaction server history/song/receipt: bài từ 30 giây cần nghe hợp lệ 30 giây; bài ngắn hơn cần phủ ít nhất 80% nội dung và tới cuối. Cooldown cùng UID/song là 30 giây, mỗi phiên một lượt. Tua không tự cộng listenedSeconds; Rules chặn client ghi history/receipt hoặc tự tăng playCount. Coverage/sequence hiện ở RAM server, mất phiên trả 409 để client tạo phiên mới; chưa durable/sticky session đa instance. Retention không trừ playCount hoặc xóa receipt. Triển khai backend/client/Rules đồng bộ.

<a id="development"></a>

## Quy ước phát triển/UI

Theo [AGENTS.md](AGENTS.md): đọc major Expo/package.json và versioned docs trước sửa Expo/React Native API, dùng expo install cho package; không tự tạo/sửa ios/android trong CNG hoặc tự nâng SDK. Hiện dùng npm; nếu có Bun lockfile thì theo quy tắc bunx.

Routes chỉ giữ guard/params/screen. Back qua useBackNavigation/createBackAction: dismiss một màn nếu có stack, fallback nếu không, chặn double tap tới lần focus tiếp. Home freezeOnBlur; push chi tiết rồi Back giữ instance/scroll khi còn trong stack; không cam kết giữ sau logout/app bị đóng/route bị thay thế.

Tamagui 3.1.10, preset `@tamagui/config/v6`, tokens/theme tại `tamagui.config.ts`. Token không `$`: `color="primary"`, `padding="4"`; số trực tiếp là kích thước, line-height cố định có thể dùng `"29px"`. `UI.tsx` là cổng export, implementation ở `ui/`.

Page quản lý scroll/keyboard, widths form 480px/reading 820px/full 1000px thu theo mobile. ListPage/FlatList dùng data/renderItem/keyExtractor/header/footer/onEndReached; không bọc trong Page cuộn hoặc đặt toàn danh sách ở header/footer. Rail ngang dùng ScrollView ngang. Safe area/MiniPlayer thuộc AppFrame.

XStack/YStack và styled/variants cho bố cục lặp. AppText body/muted/caption/danger; Button primary/secondary/danger, loading/disabled. Action/IconButton touch target ≥44px, không lồng nút. MediaTitle/Subtitle tối đa hai dòng, detail headings không giới hạn như row; thumbnail không co, vùng chữ minWidth=0.

SongRow có một nút more, các thao tác favorite/detail/playlist trong ModalPanel, chỉ mount modal khi mở. Player dùng theme tối cục bộ/một engine, kéo progress cục bộ rồi seek cuối thao tác; không dựng waveform hoặc counters social giả.

Giữ Metro resolver dùng chung bản `@tamagui/portal` cho Dialog/Provider, không thêm provider trùng/import file nội bộ node_modules. Restart Metro sau đổi config. Chưa bật compiler/static extraction; cần phép đo trước khi thêm. useMemo/useCallback không tự giảm Firestore reads; không limit nguồn đang tính tổng/rank khi chưa có nguồn đầy đủ thay thế. Giữ cleanup/account guards và quyền server.

<a id="profile-media"></a>

## Hồ sơ và media

Nghệ sĩ là tài khoản/profile. Bài cần schema v2 đầy đủ, đúng artistId/albumId; ưu tiên form/service hiện tại để validation. Console/Admin SDK bỏ qua Rules nên vẫn có thể tạo dữ liệu lỗi; không dùng JSON schema cũ tối giản để tạo document mới.

UI tĩnh ở assets/images, demo ở assets/audio/audioKey demo1..3. Media thật là URL HTTPS trực tiếp, Firestore chỉ lưu metadata. Upload Cloudinary cloud cần EXPO_PUBLIC_CLOUDINARY_CLOUD_NAME/IMAGE_PRESET/AUDIO_PRESET, không API secret; validation hiện tại ảnh ≤5 MB, nhạc ≤30 MB. Local chặn upload ngoài.

Không dùng đường dẫn ổ đĩa hoặc trang YouTube/Spotify/trang chia sẻ đăng nhập làm audioUrl. Test file trên điện thoại/ẩn danh; web cần CORS/định dạng phù hợp. Firestore Rules không bảo vệ file trên host ngoài. Thêm bundled audioKey phải sửa mapping require tĩnh/validation/Rules đồng bộ, không require đường dẫn tùy ý từ Firestore.

<a id="design"></a>

## Thiết kế tham khảo

Nguồn giữ nguyên: [music_stream_app.pdf](docs/music_stream_app.pdf), 13 trang mockup ảnh, không có text trích xuất trong lần đọc trước. Tên/số liệu/giá/placeholder là minh họa, không phải dữ liệu thật hoặc cam kết tính năng. Không vẽ lại status bar/bàn phím hệ điều hành. Hành vi hiện tại phía trên thay thế quyết định cũ trong mockup.

| Trang                | Nội dung tái sử dụng                                                                      |
| -------------------- | ----------------------------------------------------------------------------------------- |
| 1 — Welcome          | Background tràn màn hình, logo/heading trắng, hai CTA auth trong safe area                |
| 2 — Home             | Greeting/avatar/search, rails suggestions/charts/albums/artists, nền sáng và bốn tabs     |
| 3 — Chart detail     | Cover/tên/mô tả, play/shuffle, song rows/MiniPlayer; không lấy stats mẫu làm số thật      |
| 4 — Player           | Artwork/overlay tối, collapse/timeline/controls; ảnh không chứng minh video/waveform thật |
| 5 — Artist           | Avatar tròn, Follow/followers, bài/album/bio; tên mẫu không xác định schema               |
| 6 — Search nhập      | Focus cyan/clear/bàn phím native; history theo yêu cầu đã chốt                            |
| 7 — Search results   | Media rows; bản hiện tại bỏ All, phân trang server và phân biệt Người dùng                |
| 8 — Feed             | Author/time/artwork/bài liên kết; không thêm verified/like/repost/counters giả            |
| 9 — Comments         | Sheet/scrim/composer tránh keyboard; reply/like trong ảnh chưa là backend đã triển khai   |
| 10 — Library         | Search/filter/rows; bản hiện tại favorites/followed artists, playlist/history riêng       |
| 11 — Playlists       | Tạo/danh sách/chi tiết; không suy ra playlist cộng tác/công khai từ tên mẫu               |
| 12 — Premium welcome | Background/branding/CTA giới thiệu demo                                                   |
| 13 — Premium plans   | Cards giá/trial/quyền lợi minh họa, chưa có payment/offline/bitrate/entitlement           |

PDF không quy định auth/schema/quyền/thuật toán/counting/backend. Nghiệm thu cần ảnh app và kết quả test thực tế, không lấy mockup làm bằng chứng triển khai.

<a id="backend"></a>

## Backend và triển khai Firebase thật

### Search và API

Engine là SQLite FTS5, index ở RAM trong process Node; Firestore vẫn là nguồn dữ liệu chuẩn. Snapshot listeners đồng bộ create/update/delete/ẩn bài/album và thay đổi public profile. Index chỉ chứa kind/id/title/metadata tìm kiếm/popularity, không chứa email/token/audio URL. Khi khởi động, backend dựng index từ Firestore rồi mới nhận request. Không quét collection Firestore trong từng request Search.

Chuẩn hóa NFD, bỏ dấu, đ→d, chữ thường; FTS token prefix, relevance tên exact → prefix → đủ từ trong tên → metadata; popularity dùng sau relevance. Kết quả có relevance bằng nhau được xen kẽ loại. Nghệ sĩ được xác định từ public profile có bài active/public/published; tài khoản khác hiện là Người dùng và mở `/user`, không mở màn sửa profile.

Các endpoint GET ngoài `/health` yêu cầu Firebase ID token dạng Bearer. Cloud kiểm tra token revoked; mỗi UID tối đa 120 request/phút. DTO trả theo whitelist. Admin SDK kiểm tra lại public/active/published và tồn tại bằng đọc server trước khi trả từng trang; không dựa vào Rules của client.

| Endpoint      | Tham số/chức năng                                                        |
| ------------- | ------------------------------------------------------------------------ |
| `/health`     | ready/mode/projectId, không có dữ liệu cá nhân                           |
| `/session`    | UID và tên hiển thị của chính người đăng nhập                            |
| `/search`     | q tối đa 150 ký tự; kind rỗng/song/album/artist; pageSize 1–20; cursor   |
| `/browse`     | kind artists/albums; xếp follower hoặc tổng lượt nghe tích lũy; cursor   |
| `/discovery`  | seed; Home songs/suggestions/artists/albums, mỗi nhóm tối đa 20          |
| `/charts`     | seed; chọn Top 50 mỗi genre trước khi trộn                               |
| `/collection` | artistId hoặc albumId: phân trang; chartId + seed: toàn tập tối đa 50    |
| `/album-info` | id; metadata public và tổng lượt nghe từ toàn bộ bài hợp lệ theo albumId |

Cursor có HMAC, UID/query/filter/scope/index version/epoch và offset trong snapshot kết quả. Snapshot chỉ giữ ID, sống 120 giây; tối đa 256 snapshot và tổng 250.000 ID, có eviction. Truy vấn quá rộng hơn 250.000 kết quả trả lỗi yêu cầu thu hẹp, không báo hết trang giả. Tạo cursor mới khi query/filter/UID đổi; restart backend, eviction hoặc hết hạn trả 400, client cho tải lại từ đầu. Snapshot giữ thứ tự qua các trang; mỗi trang vẫn kiểm tra quyền/tồn tại mới nhất, nên bài bị thu hồi không được trả từ cache. Tập mới thêm cần tìm lại/refresh để có trong snapshot mới.

Client debounce 300 ms, 20 đầu + 10 tiếp, gộp request pending theo project/UID/query/filter/cursor, bỏ response cũ và dọn timer. Không cache lâu URL media/quyền đọc. FlatList giữ virtualization, chặn request trùng, retry ở cuối và có nút tải thêm khi quét phải bỏ nhiều kết quả mất quyền.

### Public profile và Follow

`users/{uid}` chỉ owner đọc được; email ở đây. `publicProfiles/{uid}` chỉ chứa userId/displayName/avatarUrl/biography/active/followerCount/followingCount/lastFollowingId tùy chọn. Backend project metadata bằng transaction đọc source mới nhất; whitelist loại field lạ và giữ counters công khai hiện tại. Dữ liệu cũ khởi tạo counters từ users một lần, từ chối counter không phải số nguyên không âm.

**Counters chuẩn hiện nằm ở publicProfiles.** Express xử lý `PUT/DELETE /following/:targetUid`: UID nguồn lấy từ token, đọc trạng thái tài khoản và relation/hai public profiles trong transaction; cập nhật hai counters cùng relation nguyên tử, gửi lặp không tăng/giảm thêm. Không theo dõi chính mình hoặc tài khoản inactive; vẫn cho bỏ theo dõi tài khoản đã inactive. `PUT/DELETE /favorites/:songId` kiểm tra quyền nghe khi thêm, giữ timestamp nếu gửi lại, cho gỡ bài đã mất quyền. Rules chặn mọi client ghi favorites/following/publicProfiles; listeners đọc hiện vẫn dùng Firestore. Counter cũ trong users giữ nguyên. Cần triển khai backend/client và Rules cùng đợt; client cũ ghi trực tiếp sẽ bị từ chối.

Feed ghi qua `POST /posts`, `PATCH/DELETE /posts/:id` và `POST /posts/:id/comments`, `PATCH/DELETE /posts/:id/comments/:commentId`. Tạo/sửa gửi content; tạo post thêm songId (rỗng nếu không kèm nhạc). Backend lấy owner/tên từ token và hồ sơ, chỉ cho owner sửa/gỡ, chỉ chia sẻ nhạc công khai khả dụng. Gỡ post giữ bình luận; chặn tạo/sửa bình luận khi post đã gỡ nhưng cho người viết xóa bình luận của mình. Rules chặn mọi client ghi Feed. Đọc vẫn listeners Firestore; POST tạo mới chưa hỗ trợ retry theo idempotency key.

Backfill mặc định chỉ dry-run, không xóa/reset users. Ví dụ local khi Emulator đang chạy:

```cmd
node tools/backend/backfill.cjs --local
```

Cloud cần ADC có quyền phù hợp, project xác minh rõ; chỉ khi rollout đã sẵn sàng mới dùng `--apply`:

```cmd
node tools/backend/backfill.cjs --project musicstreamapp-5a527
```

Lệnh trên vẫn dry-run. Chưa chạy dry-run cloud trong phiên này vì thiếu đăng nhập/credentials. Backend chạy sẽ tự project các hồ sơ hiện có và đồng bộ metadata tiếp theo; chỉ khởi động cloud backend khi đã sẵn sàng cho bước ghi projection này.

### History và retention

View History đọc Firestore server theo playedAt giảm dần + document ID giảm dần, query 20 phiên/lần. Khử trùng songId xuyên trang, metadata phiên gần nhất; đọc bài theo quyền, bỏ missing/permission-denied, lỗi mạng giữ cursor để retry. Mỗi lần tải quét tối đa ba trang phiên; nếu còn nguồn thì giữ continuation/nút tải thêm, kể cả chưa tìm được bài mới. UI 10 + 10, dừng 100 bài khác nhau hoặc hết nguồn, queue đúng danh sách đã tải. Request cùng cursor được gộp để StrictMode không làm mất 10 bài đầu. Không tải sẵn 1.000 phiên khi mở màn.

Backend retention chạy theo lịch 15 phút trong process sống liên tục, không gọi theo tick progress. Mỗi lượt xét users theo trang 50; dùng count trước, tài khoản ≤1.000 không đọc lại 1.000 phiên. Với tài khoản vượt giới hạn, transaction đọc boundary 1.000 mới nhất và tối đa 100 ứng viên cũ, loại ứng viên vừa hoạt động trong hai phút. Query/delete chung transaction nên concurrent progress gây retry với boundary mới. Mỗi UID xử lý tối đa 10 batch/lượt, backlog lớn tiếp tục ở lượt sau. Vì vậy có thể tạm vượt 1.000 trong grace period/backlog; không phải hard limit của Rules.

Lịch tính từ lúc backend khởi động, lần đầu sau 15 phút: ví dụ khởi động 08:07 thì chạy 08:22, 08:37, 08:52; không phải cron cố định :00/:15. Backend dừng thì không dọn; khởi động lại bắt đầu lịch mới, không bù các tick đã bỏ lỡ. Worker không chạy chồng nếu lượt trước chưa xong. Cần host backend liên tục.

Giới hạn là **1.000 phiên**, không phải 1.000 bài khác nhau. Sắp xếp playedAt giảm dần rồi document ID giảm dần; giữ 1.000 đầu, xét xóa phía sau. Trong mỗi batch chỉ xóa phiên có playedAt cũ hơn hai phút; query và xóa trong cùng transaction giúp xét lại khi phiên được cập nhật đồng thời. Dừng sớm khi batch xóa dưới 100, hoặc đạt 10 batch/UID; phần dư được xét ở lượt sau. Ví dụ 1.105 phiên đều đủ cũ thì xóa 100 + 5, còn 1.000. Nếu gặp phiên trong khoảng bảo vệ, backlog hoặc lỗi, tổng có thể tạm lớn hơn 1.000. Lỗi được ghi log và thử lại lượt sau. Chỉ xóa document history; không xóa bài, favorites, playlist hay receipts, không giảm playCount. UI History vẫn chỉ hiển thị tối đa 100 bài khác nhau, tải 10 + 10.

Giữ nguyên schema phiên/startedAt/completed/counted và playReceipts. Không xóa receipts khi prune history, không trừ playCount, không chuyển sang summary theo songId. Client trim 100 đã bỏ. Backend retention phải hoạt động trước khi phát hành client mới trên cloud; các phiên đã bị client cũ xóa không phục hồi được.

### Triển khai cloud

#### Chuẩn bị Firebase và cấu hình client cloud

Trước rollout, xác minh project, backup dữ liệu/Rules và bật Authentication Email/Password; tạo Firestore database (default) nếu chưa có. Web cần Authorized domains phù hợp. Firebase CLI login phục vụ CLI, không tự thay thế ADC cho backend/backfill. Trên máy đã cài Google Cloud CLI có thể thiết lập ADC bằng:

```cmd
gcloud auth application-default login
```

Chỉ lúc chuyển cloud mới tạo/chỉnh .env với Web config của cùng một project; giữ giá trị thật hiện có và không commit credentials:

```dotenv
EXPO_PUBLIC_FIREBASE_MODE=cloud
EXPO_PUBLIC_FIREBASE_API_KEY=<apiKey>
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=<authDomain>
EXPO_PUBLIC_FIREBASE_PROJECT_ID=musicstreamapp-5a527
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=<storageBucket>
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=<messagingSenderId>
EXPO_PUBLIC_FIREBASE_APP_ID=<appId>
EXPO_PUBLIC_BACKEND_URL=https://<backend-origin>
```

Web config được đóng gói trong app; quyền dữ liệu do Auth/Rules bảo vệ. Điền storageBucket không có nghĩa app dùng Firebase Storage. Không có biến Emulator trong cloud mode. Chạy lại app bằng npm run start -- --clear sau khi cấu hình; tài khoản demo local không tự chuyển lên cloud. Script backend:cloud không tự load backend.env, host/shell phải truyền biến cho process.

Đây là backend Node sống liên tục, không phải handler Functions tắt CPU giữa các request. Cần host/container Node 24, HTTPS, ADC/workload identity và quyền Firestore/Auth phù hợp. Một instance cho index/cursor hiện tại; nếu nhiều instance cần routing về cùng instance hoặc đưa snapshot cursor ra shared storage trước. Không tự bật billing hoặc đăng ký host trả phí trong phiên này.

`Dockerfile.backend` cung cấp image build; không COPY `.env` hay service account. Cấu hình mẫu ở `tools/backend/backend.env.example`; đặt cấu hình thật trong `.local/backend.env` bị gitignore hoặc secret manager của host:

- GOOGLE_CLOUD_PROJECT đã xác minh.
- CURSOR_SECRET ngẫu nhiên từ 32 ký tự, chỉ ở server.
- ALLOWED_ORIGINS chính xác cho web app, không wildcard cloud.
- PORT theo host. Không có FIRESTORE_EMULATOR_HOST/FIREBASE_AUTH_EMULATOR_HOST.
- Client: EXPO_PUBLIC_FIREBASE_MODE=cloud và EXPO_PUBLIC_BACKEND_URL là HTTPS origin. Không đưa secret/ADC vào EXPO_PUBLIC.

```cmd
docker build -f Dockerfile.backend -t music-stream-backend .
```

Chưa build image Docker hoặc xác minh host cloud; bundle Expo không thay thế việc này.

Thứ tự rollout: xác minh project/quyền/backup → dry-run projection và đối chiếu counters/relations → bảo trì luồng Follow của client cũ → apply projection/khởi động backend → kiểm tra health/search/privacy/retention với tài khoản kiểm thử → deploy firestore.rules/indexes → phát hành client với backend URL → kiểm tra Follow, History, private/followers và theo dõi log/read/write. Không seed fixture lên project thật.

Lệnh CLI cần sau khi đăng nhập và hoàn tất các bước trên:

```cmd
node tools/node_modules/firebase-tools/lib/bin/firebase.js login
node tools/node_modules/firebase-tools/lib/bin/firebase.js projects:list
node tools/node_modules/firebase-tools/lib/bin/firebase.js deploy --only firestore --project musicstreamapp-5a527
```

Hiện các query equality và playedAt + documentId dùng indexes trong repo và index đơn trường; không thêm composite không cần thiết. Nếu cloud báo cần index cho query cụ thể, bổ sung đúng query rồi deploy indexes, không cắt dữ liệu để tránh lỗi.

Rollback: đưa app/backend về revision trước có kiểm soát, tạm ngưng Follow trong lúc chuyển. **Trước khi dùng lại rules/client M2**, phải đồng bộ followerCount/followingCount chuẩn từ publicProfiles về users bằng Admin transaction hoặc tính lại từ relations sau khi đã dừng writers; không chỉ restore rules vì counters users đã cũ. Giữ publicProfiles/receipts/history và backup, không xóa collection để rollback. Worker retention dừng cùng backend; không thể khôi phục phiên đã prune chỉ bằng rollback source.

### Bằng chứng và giới hạn

Tests gồm SQLite thật, hook React thật, Firebase Auth/Firestore Emulator và Rules. Suite rules dùng project demo-music-rules riêng để không làm bẩn fixture demo-music-stream. Negative tests có log PERMISSION_DENIED mong đợi.

Phép đo Search local: trang 20 + 10 dùng đúng 30 document hydration reads, 0 lời gọi collection scan trong request, thay vì cần toàn catalog 120 bài để lọc tại client. Đây là đo ở transport Emulator, không phải số hóa đơn cloud. Catalog public client giới hạn 20 sau khi Home/Charts/album totals đã chuyển sang backend đầy đủ; own/library/linked subscriptions vẫn phục vụ nghiệp vụ tương ứng. PublicProfiles/albums metadata listeners còn dùng cho Library/labels, không dùng để tính relevance hoặc totals Search/Discovery.

Chưa kiểm thử thiết bị thật, FPS/keyboard/audio, workload lớn, container/host cloud hay hóa đơn. Kiểm tra kết quả cuối ở [mục Kiểm thử](#testing); không coi bundle Android/iOS là APK/IPA hoặc native E2E.

<a id="handoff"></a>

## Bàn giao và cách cập nhật tài liệu

Tài liệu này thay thế hướng dẫn START_HERE cùng các kế hoạch/báo cáo Markdown cũ trong docs. Không làm lại M0–M5 vì checkpoint cũ đã được gom. AGENTS.md vẫn là quy tắc riêng, PDF/ảnh/source/assets được giữ.

Khi hoàn thành một mốc hoặc ngừng giữa chừng, cập nhật ngay docs/IMPLEMENTATION_PROGRESS.md: việc đã làm/files/hành vi, việc đang dở, checks/kết quả, lỗi chưa xử lý, process/ports còn chạy, trạng thái local/cloud/deploy và bước tiếp tục cụ thể. Không ghi stub/kế hoạch/bundle là chức năng hoặc kiểm thử thiết bị thật đã hoàn thành.

Tại checkpoint kiểm thử tự động cuối 2026-11-03, các process test đã đóng và không còn listener kiểm thử 8080/9099/8787/4400/9150. Các cửa sổ chạy thủ công sau đó do người dùng quản lý. Chưa chỉnh .env hoặc dữ liệu cloud. Giữ nguyên các thay đổi source/package-lock đã có, không reset khi gom tài liệu.

Lượt làm mới tài liệu: gom hướng dẫn/thiết kế/quy ước còn dùng được vào README, xóa 11 Markdown cũ đã được thay thế, cập nhật đường dẫn trong thông báo cấu hình Firebase. Đã kiểm tra mục lục/liên kết, giữ PDF và AGENTS; lint/typecheck và 6/6 test cấu hình local PASS. Không chạy lại toàn bộ suite hoặc khởi động/dừng các server test thủ công của người dùng cho thay đổi tài liệu này.
