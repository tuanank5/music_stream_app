# Kế hoạch UI và phát triển music_stream_app

Ngày: 2026-11-02. Trạng thái: đề xuất để duyệt, chưa triển khai source.

Nguồn thiết kế: music_stream_app.pdf, đọc đủ 13 trang; bản chép và mô tả: requirements.md. Nhận định hiện trạng dựa trên đọc source, chưa kiểm chứng giao diện chạy thật trên điện thoại. Các con số thiết kế/hiệu năng dưới đây là mục tiêu đề xuất, không phải thông số do PDF quy định.

## 1. Định hướng

Xây trải nghiệm nghe nhạc có nhận diện trắng/đen/cyan, ảnh bìa giàu màu và player toàn màn hình. Giữ bốn mục Home, Search, Feed, Library trong PDF. Ưu tiên một hành trình trọn vẹn: khám phá → nghe → lưu → quay lại nghe tiếp. Dùng Tamagui để chuẩn hóa giao diện, Expo Router quản lý điều hướng, Reanimated/Gesture Handler bổ sung tương tác sau khi bố cục và trạng thái ổn định.

Không nên thay toàn bộ app bằng giao diện tối hoặc nhiều gradient chỉ để tạo cảm giác mới: PDF chủ yếu nền sáng; gradient tập trung ở chart, welcome và premium. Điểm khác biệt sản phẩm nên đến từ khả năng khám phá nhạc và trải nghiệm nghe liên tục.

## 2. Ma trận đối chiếu yêu cầu và source

“Có nền tảng” nghĩa là đã thấy code, không có nghĩa đã nghiệm thu trên thiết bị.

| PDF | Hiện trạng đọc được | Đề xuất UI | Nghiệp vụ còn cần làm/kiểm chứng |
| --- | --- | --- | --- |
| 1 Welcome | Có route và background cover; safe area riêng | Logo, typography, overlay và hai nút theo mẫu; khung desktop hợp lý | Auth, lỗi, loading, keyboard; form auth không nằm trong PDF |
| 2 Home | HomeDiscovery đã gọi suggestSongs, charts, trendingAlbums, popularArtists | Card đề xuất dạng đứng thay ảnh vuông 145; các rail, header, avatar nhất quán | Cold start, chất lượng đề xuất, nguồn nội dung, toàn bộ See all |
| 3 Chart | Có ChartScreens và chart service | Header cover, hàng metadata, action bar, track list, mini player tối | Nguồn ranking và thời gian cập nhật; không gắn Canada/Global nếu dữ liệu chỉ xếp theo genre |
| 4 Player | Có player chung, seek, next/previous, repeat; UI nút chữ, cover 260 | Full bleed artwork/gradient, transport controls, thu gọn, queue và sheet thao tác | Chưa thấy shuffle trong public API PlayerContext; background/lockscreen cần kiểm chứng riêng; waveform thật cần dữ liệu |
| 5 Artist | Có ArtistProfileScreen, follow và catalog | Avatar lớn, Popular, Albums, About, Related | Quy tắc related artists, follower count và dữ liệu biography |
| 6–7 Search | Lọc cục bộ, normalizeSearch; chỉ tracks/artists | Search bar, typing state, gợi ý, All/Tracks/Albums/Artists, clear/focus | Albums/All thực sự, recent search, tìm kiếm khi catalog lớn |
| 8 Feed | CRUD post, gắn bài và chia sẻ text; hiển thị SongRow | Post card ảnh lớn, avatar, relative time, icon actions; composer tách khỏi đầu danh sách | Like/repost/counter, quyền nội dung, phân trang, moderation |
| 9 Comments | CRUD bình luận phẳng, route riêng | Sheet với composer cố định phía dưới, keyboard handling | Reply/mention/like, tải thêm reply; số tổng đếm phải có định nghĩa |
| 10 Library | Có library/favorites/following và playlist services | Chips lọc, hỗn hợp row bài/playlist/artist; trạng thái trống rõ ràng | Saved albums và New tag chưa có đặc tả rõ |
| 11 Playlists | Có CRUD và danh sách songIds | Playlist row, FAB thêm, form trong sheet/dialog | Công khai/cộng tác không mặc định trong đợt UI |
| 12–13 Premium | PremiumScreen tự ghi là giao diện giới thiệu, chưa có subscription/offline | Hai view intro/plans và carousel theo mẫu | Thanh toán, entitlement, restore, offline, chất lượng âm thanh là dự án chức năng riêng |

Ngoài PDF: login/register/profile/upload/my-uploads/admin/lyrics/song detail đang có trong repo. Phải đưa vào hệ thống UI chung và kiểm thử hồi quy; không bỏ vì không xuất hiện trong mẫu.

Tài liệu ARCHITECTURE.md có dấu hiệu chậm cập nhật: nói chưa có collection albums trong khi domain.ts đã có Album/albumId và catalogService có truy vấn albums. Khi triển khai cần cập nhật tài liệu theo code/schema đã kiểm chứng.

## 3. Design system Tamagui

Mở rộng tamagui.config.ts hiện có, không tạo bộ màu thứ hai trong từng màn.

- Semantic colors: background, surface, elevatedSurface, textPrimary, textMuted, border, accent, onAccent, inverseSurface, onInverse, danger, success, scrim.
- Giữ cyan cho selected tab, follow/like active và focus. CTA chính theo PDF là đen; màu primary hiện tại thiên teal nên cần thống nhất ý nghĩa trước khi đổi toàn bộ.
- Typography: caption 12, body 14–16, section 20–22, title 28–32, hero 36–40 là điểm khởi đầu; kiểm tra tiếng Việt và font scaling.
- Spacing dùng thang 4/8/12/16/20/24/32; screen gutter 20. Không trộn số tùy ý khắp màn hình.
- Cover vuông, suggestion portrait, avatar tròn; định nghĩa aspect ratio và crop riêng từng loại. Có fallback khi ảnh hỏng.
- Touch target tối thiểu 44, ưu tiên 48 đơn vị. Icon 20/24; icon lớn hơn dành riêng transport player.
- Nền tối của player/mini player là theme cục bộ. Chuẩn bị token để thêm dark mode sau; chưa cần xây cả dark mode trong đợt đầu.
- Ngôn ngữ thống nhất: đề xuất tiếng Việt cho app hiện tại, giữ tên bài/nghệ sĩ; gom copy để sau này thêm đa ngôn ngữ. PDF dùng tiếng Anh là tham chiếu bố cục.

Component cơ sở nên có: AppText, AppButton, IconButton, AppIcon, SearchField, Chip, Divider, SurfaceCard, Artwork, Avatar, ScreenContainer, EmptyState, ErrorState, Skeleton, AppSheet và ConfirmDialog.

Component nghiệp vụ: TrackRow, ArtistRow, PlaylistRow, AlbumCard, SuggestionCard, ChartCard, FeedPostCard, SectionHeader, MiniPlayer, PlayerControls, TrackActionSheet. Tái sử dụng Row/Card theo variants có ý nghĩa; tránh một component khổng lồ có hàng chục boolean.

Mỗi component phải định nghĩa default/pressed/focused/disabled/loading/selected khi phù hợp. Mỗi màn phải có loading/empty/error/content; hành động ghi dữ liệu cần pending và cách khôi phục khi thất bại. Animation không thay thế phản hồi lỗi.

## 4. Kiến trúc code đề xuất

Từng bước chuyển màn, giữ route URL và hành vi đang dùng. Không cần viết lại toàn bộ hoặc đưa thêm state library trong đợt UI.

```text
src/
  app/                       # Chỉ route + layout Expo Router
    (auth)/                  # Welcome/login/register
    (tabs)/                  # Home/search/feed/library
    _layout.tsx              # Providers, root stack, modal routes
  components/
    ui/                      # Primitives Tamagui và wrappers
    media/                   # Artwork, TrackRow, AlbumCard, ArtistRow
    layout/                  # AppShell, header, bottom bar, WebPreviewFrame
    feedback/                # Skeleton, empty/error states
  features/
    discovery/               # Screen, sections, hooks/view models
    search/
    player/                  # UI player; không tạo audio instance thứ hai
    library/
    community/
    premium/
  theme/                     # Tokens, typography, motion presets
  contexts/                  # Giữ auth/data/player hiện có khi chuyển dần
  hooks/
  services/                  # Truy cập Firebase/media
  types/
  utils/
```

Tên thư mục trên là đích đề xuất; không tạo trùng ngay với các component hiện có. Chuyển từng cụm sau khi call sites và tests đã theo kịp. Route file chỉ lấy params/guard và render screen; phần query/mutation nằm trong hook/service. UI nhận dữ liệu và callback; không tự truy vấn Firestore trong card.

AppFrame hiện gộp navigation, mini player, lỗi và safe area. Tách trách nhiệm này để dễ đổi giao diện và tránh safe area bị cộng hai lần. Root providers ổn định qua chuyển màn; giữ duy nhất một audio player. Tiến độ nhạc cập nhật thường xuyên chỉ nên làm các vùng progress/time cần thiết render lại.

AppFrame đang giả lập tabs bằng router.replace. Khi cho phép sửa navigation, chuyển sang Expo Router tabs để quản lý active tab/back/history; styling tab bar vẫn dùng Tamagui và Lucide. Kiểm tra bảo toàn query params/deep link và selected tab khi vào chart/artist từ Home hoặc Search.

## 5. Dùng đúng bốn thư viện đã cài

Đã thấy trong package.json: Reanimated 4.7.1, Gesture Handler ~3.3.0, SVG 15.16.0, Lucide ^1.66.0, Expo ~58.0.20, Tamagui ^3.1.10.

| Công cụ | Trách nhiệm | Giới hạn |
| --- | --- | --- |
| Tamagui | Theme, layout, variants, component states, sheet/dialog/slider | Không thay audio engine, navigation hoặc nghiệp vụ |
| Expo Router | Stack/tab/modal, back, deep link, chuyển màn | Không cần Reanimated để có mọi transition cơ bản |
| Reanimated | Animation progress/transform/opacity, kéo player, phản hồi icon | Không tự hoạt động chỉ vì package đã cài |
| Gesture Handler | Pan/drag/swipe phối hợp scroll | Chạm nút thường dùng onPress; không bọc mọi nút bằng gesture phức tạp |
| react-native-svg | Icon/vector/waveform đã có dữ liệu | Không tự trích waveform từ file audio |
| lucide-react-native | Bộ icon thống nhất | Gom qua AppIcon với theme/size/stroke, import icon cần dùng |

AppIcon hiện dùng Ionicons và AppFrame/player còn có ký tự Unicode. Đề xuất chuyển dần qua wrapper Lucide, không bắt các màn tự quyết màu/stroke. Không cần cài thêm bộ icon Tamagui nếu Lucide hiện tại đáp ứng.

Kiểm tra trước giai đoạn animation:

1. Expo SDK 58 hướng dẫn cài Reanimated cùng react-native-worklets. Package.json chưa khai báo worklets; npm ls ở depth=0 không có. Chưa kết luận thiếu toàn bộ cây dependency; cần kiểm tra và khai báo phiên bản tương thích trước khi dùng.
2. SDK 58 nói Babel plugin được babel-preset-expo cấu hình tự động. Không thêm cấu hình Babel từ tutorial cũ chỉ vì repo không có babel.config.js.
3. Nếu dùng Reanimated làm animation driver cho Tamagui, cần @tamagui/animations-reanimated tương thích với bộ Tamagui và cấu hình presets. Package này chưa là dependency trực tiếp. Chỉ thêm khi đã chọn driver; không cần cho mọi hiệu ứng Reanimated độc lập.
4. Kiểm tra setup root/gesture theo tài liệu Gesture Handler 3.x, portal/modal và web bằng bài thử nhỏ trước khi tích hợp toàn app.
5. Dùng expo install để chọn phiên bản; không tự đổi SDK hoặc upgrade toàn bộ dependency trong đợt thiết kế.

## 6. Responsive trên điện thoại và máy tính

Đợt đầu chọn chế độ preview mobile trên desktop để khớp PDF và giải quyết vấn đề background phóng ngang:

- Native/mobile web: root full width, ảnh welcome/player dùng cover, ảnh nền nằm ngoài padding safe area, nút/nội dung nằm trong safe area.
- Desktop web: khung preview khoảng 390–430 px, căn giữa, chiều cao theo viewport; nền ngoài khung tối/neutral. Áp dụng thống nhất với navigation/mini player và portal sheet, tránh chỉ bó phần content.
- Không dùng chiều cao cố định 844 cho mọi thiết bị; mockup là tỷ lệ tham chiếu. Ảnh cover được phép crop có chủ đích, cần kiểm tra focal point trên màn thấp và cao.
- Full player không bị lồng trong Page reading maxWidth 820 như hiện tại. ScreenContainer có chế độ edge-to-edge rõ ràng.
- Giai đoạn web sản phẩm sau: breakpoint khoảng 768/1200 là đề xuất; sidebar và grid, player dock dưới, comments thành panel/dialog. Đây là layout mới, không được mô tả trong PDF.
- Web preview hỗ trợ test bố cục, không thay được test keyboard, safe area, gesture, audio interruption trên thiết bị thật.

## 7. Hệ thống motion để bổ sung sau

Tập trung preset trong theme/motion, không rải duration khắp màn. Các giá trị dưới đây là định hướng tinh chỉnh sau đo thực tế.

| Tương tác | Hiệu ứng đề xuất | Khi làm |
| --- | --- | --- |
| Chạm button/card | Opacity hoặc scale nhẹ khoảng 0.98, 100–160 ms | Ngay sau primitives ổn định |
| Mở trang chi tiết | Transition stack theo nền tảng; back tự nhiên | Khi tổ chức route |
| Đổi tab | Không slide ngang toàn màn tùy tiện, giữ scroll/state tab | Khi tổ chức route |
| Mở full player | Modal đi lên; thu gọn về mini player | Sau player UI tĩnh |
| Comments/actions | Sheet đi lên + scrim, drag dismiss | Sau xử lý keyboard/back |
| Like/follow | Scale ngắn và đổi màu; pending/rollback lỗi | Khi mutation ổn định |
| Kéo progress | Thumb/progress theo ngón tay, commit seek khi thả | Đợt player tương tác |
| Mini player kéo đóng/mở | Gesture có threshold, velocity và cancel | Sau bài thử native/web |
| Skeleton | Nhẹ, giới hạn số lượng, dừng khi có dữ liệu | Khi trạng thái loading hoàn chỉnh |

Không animate layout lớn mỗi frame; ưu tiên transform/opacity. Không phát song song animation của Router và custom root transition cho cùng một chuyển màn. Tôn trọng Reduce Motion; luôn có nút thay thế cho gesture, focus bàn phím trên web và nhãn screen reader. Gesture kéo sheet không được chiếm thao tác cuộn danh sách hoặc tua nhạc.

Waveform: MVP có thể giữ progress bar thực. Để khớp mẫu bằng waveform thật, thêm bước tạo peaks khi ingest/upload audio rồi render SVG/canvas thích hợp; không tạo các cột ngẫu nhiên rồi gọi đó là biên độ audio. Haptic là tính năng tùy chọn sau, bốn thư viện hiện có không cung cấp rung phản hồi.

## 8. Các giai đoạn triển khai và điều kiện nghiệm thu

| Giai đoạn | Thay đổi chính | Điều kiện hoàn thành |
| --- | --- | --- |
| 0. Chốt phạm vi | Duyệt style PDF, ngôn ngữ, preview web, feature thực/demo; lập baseline screenshot | Có danh sách route/state và tiêu chí so sánh; không tự gán nghiệp vụ cho icon |
| 1. Nền UI | Tokens, Lucide wrapper, primitives, ScreenContainer, preview frame; kiểm tra dependency | Một trang component preview thể hiện states; lint/typecheck đạt; mobile 360/390/430 không overflow |
| 2. Lát cắt nghe nhạc | Home → chart/artist → player → mini player; SongRow/Card dùng chung | Khớp bố cục mẫu, nhạc không restart khi điều hướng, safe area chuẩn; có empty/error/loading |
| 3. Hoàn thiện các màn | Search, Library/playlist, Feed/comments, Premium intro; auth/profile/upload/admin theo cùng tokens | 13 trang PDF có mapping cụ thể; cả màn ngoài PDF đồng bộ; keyboard không che composer |
| 4. Motion | Press feedback, stack/modal transitions, sheets, player gestures | Reduced motion và back hoạt động; không giật/đụng scroll trên máy thật; có fallback web |
| 5. Chức năng và dữ liệu | Lấp gap Search/queue/social; pagination, counters, quyền dữ liệu | Hành trình E2E qua dữ liệu thật; không có nút chết hoặc số liệu giả trong UI sản phẩm |
| 6. Beta | Build kiểm thử, đo performance/crash/cost, người dùng thử | Không lỗi nghiêm trọng; báo cáo test và backlog ưu tiên theo dữ liệu |

Thứ tự UI ưu tiên: primitives + shell → Home/TrackRow → mini/full player → chart/artist → Search → Library → Feed/comments → Premium/auth/các màn quản trị. Nghiệm thu từng cụm trước khi mở rộng, không đổi hàng loạt tất cả màn cùng lúc.

Khu vực source dự kiến tác động: tamagui.config.ts; components/ui; Artwork/SongRow/discovery; AppFrame; app/_layout; các screen trong app và components. Services/domain chỉ thay trong giai đoạn chức năng riêng khi được phép, ngoại trừ adapter dữ liệu phục vụ UI đã thống nhất.

## 9. Sau khi UI đồng bộ, làm gì để app nổi bật?

Ưu tiên chất lượng nghe và khám phá, sau đó mới tăng số tính năng.

### 9.1. Đóng vòng trải nghiệm cốt lõi

- Hoàn thiện queue có thể xem/chỉnh, shuffle với quy tắc rõ, next/previous/repeat và resume history.
- Player hiện seek ngay trên onValueChange: xem xét local dragging state và commit khi thả để tránh gọi seek liên tục.
- Test audio khi khóa màn hình, chuyển app, mất mạng, nhận cuộc gọi, đổi tai nghe; kiểm tra khả năng background/lockscreen theo expo-audio SDK 58 trước khi triển khai.
- URL hỏng/cấm truy cập phải có retry hoặc skip rõ ràng; playback và history không lẫn khi logout/đổi tài khoản.

### 9.2. Tạo một điểm khác biệt có thể đo được

Đề xuất chọn “khám phá nhạc theo gu, giải thích được” làm điểm khác biệt đầu tiên. Repo đã có suggestSongs dựa trên genre/history, nên mở rộng từ nền này thay vì lập tức xây AI phức tạp.

- Onboarding chọn một vài thể loại/nghệ sĩ (tùy chọn, có bỏ qua).
- Home có Continue listening, Vì bạn nghe…, Khám phá mới; người mới có nội dung biên tập tốt.
- Feedback Không phù hợp/Ít đề xuất bài này; giảm lặp và thêm đa dạng nghệ sĩ.
- Một hành động bắt đầu mix từ bài/nghệ sĩ, giữ queue ổn định trong phiên.
- Đo tỷ lệ mở app → phát nhạc, thời gian tới lần phát đầu, skip sớm, save/follow sau gợi ý, quay lại 7 ngày. Thiết lập baseline trước rồi mới đặt mục tiêu cải thiện.

Đây là đề xuất mở rộng, không phải yêu cầu đã có trong PDF. Hướng thứ hai sau đó: Feed tập trung người/nghệ sĩ đang follow, chia sẻ bài kèm cảm xúc và reply, tạo lý do quay lại ngoài nghe nhạc.

### 9.3. Nâng chất lượng dữ liệu và backend

- Metadata và artwork nhất quán; thời lượng lấy từ audio thực; bỏ số follower/play giả. Chart có kỳ tính/range/updatedAt rõ ràng.
- Thêm pagination cho catalog/feed/library phù hợp; tránh tải toàn bộ rồi lọc khi dữ liệu lớn. Search lớn cần backend/index tìm kiếm riêng được chọn theo nhu cầu.
- Mô hình comment replies/likes/reposts có owner, unique reaction, pagination, aggregate count; dùng server đáng tin cậy cho phần tổng hợp cần bảo vệ.
- Kiểm tra Rules và index cho public/private/followers; không coi việc ẩn nút trên UI là phân quyền.
- PlayCount hiện cập nhật từ client transaction và có receipt/time gate; cần audit Rules và mô hình chống lạm dụng trước khi dùng cho ranking/quyền lợi. Có receipt không tự chứng minh lượt nghe thật.
- Nếu URL audio phải giới hạn quyền, bảo vệ truy cập media riêng; chỉ bảo vệ document Firestore chưa đủ.
- Upload cần progress/retry, kiểm tra file, trạng thái xử lý và cleanup file mồ côi; kế hoạch ingest/transcode/peaks nếu cần waveform thật.

### 9.4. Premium sau cùng

Chỉ mở bán khi có giá trị thật: entitlement, xác nhận giao dịch phía server, restore, quản lý hết hạn/hủy và các quyền lợi được thực hiện. Offline cần cache, dung lượng, quyền truy cập và xử lý hết hạn; high quality cần nguồn audio tương ứng. Giá $12.99 và trial một tháng trong PDF chỉ là mẫu. Khi bắt đầu giai đoạn này phải tra chính sách store/nhà cung cấp hiện hành; kế hoạch hiện tại chưa lựa chọn giải pháp thanh toán.

Cast, notifications, verified badge và online presence là backlog riêng, ưu tiên thấp hơn đường nghe chính trừ khi người dùng xác định đó là mục tiêu sản phẩm.

## 10. Kiểm thử và tiêu chuẩn nghiệm thu

- Chụp cùng dữ liệu tại viewport 390 để đối chiếu từng trang PDF; kiểm thêm 360/430, tablet và web 1366/1440.
- Android và iOS: notch/home indicator, font lớn, keyboard, back/swipe back, mất mạng, nền/foreground. Web: resize, focus, mouse/keyboard, audio autoplay restrictions và reload/deep link.
- E2E: login → tìm bài → phát → đổi tab → lưu → tạo playlist → thêm bài → nghe lại; Feed → comment/reply; logout → tài khoản khác không còn dữ liệu phiên cũ.
- Performance: profiling release build, số lần render theo progress, scrolling list, thời gian audio startup và chi phí reads. Mục tiêu ban đầu 60 fps cho gesture trên thiết bị đích, không tuyên bố đạt nếu chưa đo.
- Accessibility: touch target, contrast, labels, selected state, reduced motion và focus của dialog.
- Chạy lint/typecheck mỗi cụm; tests hành vi và Rules cho thay đổi nghiệp vụ. Không thêm test chỉ so sánh nguyên văn JSX hay token.
- Definition of done: UI đúng states, không overflow, thao tác đúng, dữ liệu thật hoặc ghi rõ demo, kiểm chứng thiết bị, không regression các tính năng đang có.

## 11. Các quyết định còn mở

Có thể triển khai UI nền theo đề xuất mà chưa cần giải quyết toàn bộ backlog. Trước mỗi tính năng liên quan cần chốt: New tag là gì; cast thực hay để sau; comment thuộc bài nhạc hay post; playlist có public/collaboration hay chỉ cá nhân; chart theo quốc gia/thể loại; waveform thực hay progress bar; Premium là giới thiệu hay mục tiêu thương mại. Đề xuất đợt đầu: private playlists, comments theo post như hiện tại, chart mô tả đúng dữ liệu, Premium giới thiệu và không có nút thu tiền giả.

## 12. Tài liệu kỹ thuật đã đối chiếu

- Expo SDK 58: https://docs.expo.dev/versions/v58.0.0/
- Expo Reanimated/worklets và Babel: https://docs.expo.dev/versions/v58.0.0/sdk/reanimated/
- Expo Gesture Handler: https://docs.expo.dev/versions/v58.0.0/sdk/gesture-handler/
- Expo Router Stack: https://docs.expo.dev/router/advanced/stack/
- Tamagui Reanimated driver: https://tamagui.dev/docs/core/animations-reanimated
- Lucide React Native: https://lucide.dev/guide/react-native

Tài liệu API cần đối chiếu lại theo phiên bản khóa trong dự án khi triển khai. Giai đoạn này chỉ lập kế hoạch, không cài thêm dependency app hay sửa source.
