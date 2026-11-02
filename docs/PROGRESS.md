# Tiến độ và bàn giao

## K?t qu? m?i nh?t ? 2026-11-02

?? ho?n th?nh ??t chu?n h?a UI/code v? s?a Back. BackButton/Player/Comments d?ng useBackNavigation: dismiss(1) khi c? stack, fallback khi kh?ng c? l?ch s?, kh?a nh?n l?p ??n l?n focus ti?p theo. Home gi? instance/scroll khi m? chi ti?t r?i Back; kh?ng thay PlayerContext.

?? d?ng chung AuthScreen/useAuthForm, ProfileScreen/useProfileForm, useFavoriteSong, useRealtimeList v? useSongDetail. T?ch Admin/Album/MyUploads/Song/Welcome kh?i route; chu?n h?a Field disabled, Page/ListPage v? loading/empty; x?a implementation Artist/Charts kh?ng c?n d?ng. useAction ch?n mutation tr?ng.

Ki?m tra cu?i: lint PASS, 0 l?i/0 c?nh b?o; TypeScript PASS; 16/16 tests PASS; native export Android/iOS PASS, exit 0. Output tmp/mobile-ui-export l? bundle ki?m tra, kh?ng ph?i APK/IPA. Ch?a ki?m tra UI, keyboard, Portal v? thao t?c Back tr?n thi?t b? th?t. Kh?ng ??i dependencies, SDK, schema ho?c th?m store ph?t nh?c. C?c m?c d??i l? l?ch s? checkpoint.

## Đã có trước đợt này

- `docs/requirements.md`: nội dung và mô tả 13 trang PDF (PDF chỉ có ảnh).
- `docs/UI_IMPLEMENTATION_PLAN.md`: phân tích ban đầu; yêu cầu mới nhất trong hội thoại ghi đè các mục desktop/test trước đây.
- Theme Tamagui sáng, Lucide, primitives, HomeScreen/useHomeDiscovery và các rail.
- MediaTitle/MediaSubtitle dùng hai dòng; heading chi tiết không giới hạn dòng.
- SongRow dùng một nút more, các thao tác favorite/detail/playlist trong ModalPanel.
- Home vẫn nằm trong stack, freezeOnBlur; push chi tiết, back quay lại giữ state/scroll.
- PlayerScreen và MiniPlayer giao diện tối, dùng duy nhất PlayerContext sẵn có.
- Metro resolver ép Dialog và TamaguiProvider dùng chung bản @tamagui/portal; trước đó có hai bản nested 3.1.10 tạo lỗi PortalDispatchContext=null. Cần khởi động lại Metro để áp dụng; chưa xác nhận trên máy thật.

## Phạm vi đã triển khai trong đợt này

1. Chuẩn hóa thêm SearchField, filter tabs và các hàng album/artist/playlist dùng chung.
2. Hoàn thiện Search All/Tracks/Albums/Artists bằng dữ liệu thật hiện có.
3. Library/Playlists/Playlist detail theo ngôn ngữ thiết kế chung, giữ CRUD và các công cụ upload/profile.
4. Feed có artwork lớn, composer gọn; Comments bố cục sheet và composer tránh keyboard, giữ CRUD/phân quyền cũ. Không tạo like/reply/repost backend giả.
5. Rà soát các màn hỗ trợ, điều hướng, tên dài, trạng thái loading/empty/error.
6. Chạy lint, typecheck, tests có sẵn; sửa lỗi có bằng chứng rồi ghi kết quả.

## Kiểm thử

Đã chạy: TypeScript PASS, 9/9 tests PASS. Lint lần đầu có 21 cảnh báo BOM; bỏ BOM rồi kiểm lại riêng lint: PASS, 0 lỗi/0 cảnh báo. Native export Android/iOS PASS, exit 0, iOS 4080 modules / Android 4074 modules. Output: tmp/mobile-ui-export (bundle Hermes, không phải APK/IPA). Xem `docs/UI_TEST_REPORT.md` để biết giới hạn bằng chứng và checklist máy thật.

## Checkpoint sau Search / Library / Community

- Đã thêm ScreenHeader, SearchField, FilterBar, MediaRow, MediaCoverCard; Page/ListPage dùng chung header.
- SearchScreen có All/Tracks/Albums/Artists, lọc dữ liệu hiện có, route mỏng.
- LibraryScreen có search/filter và các hàng playlist/favorite/followed artist; Albums là album từ bài đã lưu, không giả là có backend saved albums.
- PlaylistsScreen chuyển CRUD form vào ModalPanel; giữ xóa, sửa, tạo và dọn liên kết bài thiếu trong detail.
- FeedScreen dùng artwork lớn, composer chọn bài thật, giữ create/update/archive/share. CommentsScreen dạng sheet có keyboard handling, giữ CRUD/owner/admin; không thêm reply/like/repost giả.
- Home dùng lại MediaCoverCard. Comments route là transparentModal trong Expo Router. Menu Dialog có KeyboardAvoidingView.
- Đã rà các màn hỗ trợ: auth/profile/admin/upload/my-uploads/album có header Back nhất quán; sửa line-height của chữ lớn để tránh cắt chữ; album có artwork và phát toàn album. Không sửa nghiệp vụ form.
- Đã format code và bỏ UTF-8 BOM khỏi 21 file nguồn. Chưa tự chạy giao diện trên điện thoại.
- Native export Android/iOS đã hoàn tất thành công. Không có tác vụ terminal đang chờ.
- Bước tiếp theo: người dùng kiểm tra trên máy thật theo UI_TEST_REPORT.md. Ưu tiên xác nhận Portal/menu sau restart Metro, keyboard/comments, text dài/font lớn, Home scroll/Back và audio. Không coi native bundle hoặc tests qua adapter web là bằng chứng UI đúng trên thiết bị.

## Lưu ý cho lần tiếp tục

- Checkpoint sửa lỗi console tiếp theo: bỏ accessibilityState tại AppFrame/HomeScreen/FollowButton/FilterBar, dùng ARIA; clip viewport của navigator và cố định lớp mini player để card/gradient không vẽ tràn; Player dùng ternary trả null thay vì để error/audioKey rỗng thành text node. Lint PASS, TypeScript PASS, 12/12 tests PASS. Có regression tests render FilterBar và Player thật với audio/platform dependencies được stub. Chưa xác nhận trực quan lỗi chồng Charts trên thiết bị/browser; chưa chạy lại native export sau bản sửa này.

- Sửa thêm cảnh báo DOM accessibilityLabel của AppImage: web chuyển sang alt, ưu tiên alt được truyền rõ; native vẫn giữ accessibilityLabel. Đã thêm regression test: tổng 10/10 tests PASS, TypeScript PASS; lint đã chạy lại. Native export ở trên thuộc checkpoint trước bản sửa label nhỏ này, chưa chạy lại export.

- Đọc AGENTS.md, package.json (Expo ~58.0.20, Tamagui 3.1.10) và source thực tế trước khi sửa.
- Workspace đã có rất nhiều thay đổi từ trước; không reset/restore hoặc xóa file không thuộc thay đổi của mình. docs/ARCHITECTURE.md và docs/TEST_REPORT.md đang bị xóa từ trước đợt này.
- Không thêm state/audio provider hay mở listener trùng cho card.
- PowerShell chặn npx.ps1; dùng npx.cmd/npm.cmd.
- Cập nhật file này sau mỗi mốc; nếu phiên dừng, tiếp tục từ phần đang thực hiện, không viết lại từ đầu.
- Không thể đảm bảo nhận được cảnh báo trước giới hạn tài khoản 5 giờ; checkpoint này phải luôn nằm trên đĩa.

## Card v? See all ? c?p nh?t theo y?u c?u

MediaTitle m?c ??nh 14px/20px, m?t d?ng; MediaSubtitle 12px/18px, m?t d?ng, tail ellipsis. ChartCard m? t? hai d?ng; ChartCover title/subtitle t?i ?a hai d?ng. MediaCoverCard b? c? ch? 18px ?? d?ng typography chung; cover v?n l? URL ?nh, title/subtitle m?i l? ch? r?t g?n. ArtistCard gi? c?n gi?a, v?ng ch? r?ng h?n avatar 24px v? d?nh m?t d?ng tr??c Follow. SongRow gi?m gap v? ch? duration ?? kh?i ch? g?n h?n ?nh 60px; Search/Library nh?n c?ng component.

Th?m /albums v? /artists, d?ng chung DiscoveryListScreen v?i d? li?u/s?p x?p c?a Home; See all ho?t ??ng ? c? ba section. Charts chuy?n sang Page header c? Back inline; c?c trang danh s?ch m?i d?ng c?ng ScreenHeader. TypeScript PASS, 16/16 tests PASS. Ch?a x?c nh?n tr?c quan tr?n native.
