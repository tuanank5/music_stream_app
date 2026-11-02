# Giao diện Tamagui

Dự án dùng Tamagui 3.1.10 với preset `@tamagui/config/v6`. Token v3 viết không có `$`: `color="primary"`, `padding="4"`. Giá trị số truyền trực tiếp là kích thước cụ thể; chuỗi token như `"4"` được tra trong config. Với line-height cố định ngoài thang font, dùng chuỗi có đơn vị như `"29px"` để tránh bị hiểu thành tỷ lệ.

## Cấu trúc

- `tamagui.config.ts`: fonts, tokens, theme sáng và cấu hình media kế thừa preset. Màu theo vai trò như `primary`, `textMuted`, `surface`, `danger` nằm tại đây.
- `src/app/_layout.tsx`: mount một `TamaguiProvider`, bao phủ cả giao diện thiếu cấu hình Firebase.
- `src/components/UI.tsx`: cổng export công khai; không chứa style hay implementation.
- `src/components/ui/`: Page, ListPage, typography, Button, Field, Card, IconButton, feedback, Toggle, ảnh, icon và modal.
- `src/components/discovery/`: component nghệ sĩ/chart, tách theo chức năng. `DiscoveryCards.tsx` chỉ export. Gradient trang trí riêng của chart nằm trong `ChartCover.tsx`.

## Quy ước

```tsx
import { Button, Field, Page, AppText } from "../components/UI";

<Page title="Hồ sơ" contentWidth="form" keyboardAvoiding>
  <Field label="Tên" value={name} onChange={setName} />
  <AppText variant="muted">Mô tả</AppText>
  <Button title="Lưu" variant="primary" loading={busy} onPress={save} />
</Page>
```

`Page` quản lý cuộn và khoảng cách nội dung. `contentWidth` có `form` (480px), `reading` (820px), `full` (1000px); tự thu về chiều rộng màn hình trên mobile. `scroll={false}` dành cho màn tự quản lý nội dung. Safe area và mini player thuộc `AppFrame`.

Danh sách dài dùng `ListPage` với `data`, `renderItem`, `keyExtractor`, `header` và `footer`. Không bọc nó trong Page có cuộn. FlatList giữ vai trò virtualization của React Native; từng hàng và khung trang dùng Tamagui. Không đặt toàn bộ danh sách trong header/footer. Dải card ngang tiếp tục dùng ScrollView ngang.

Ưu tiên `XStack`/`YStack` cho bố cục đơn giản, `styled()`/variants cho kiểu lặp lại. `AppText` hỗ trợ `body`, `muted`, `caption`, `danger`; `Button` hỗ trợ `primary`, `secondary`, `danger` và `loading`. IconButton bảo đảm vùng bấm tối thiểu 44px. `Action` dành cho hàng/card bấm được, không lồng các nút bấm vào nhau.

`AppImage` chuyển React Native source sang src trên web, giữ xử lý lỗi ảnh ở component sử dụng. `AppIcon` dùng Lucide React Native, giải quyết màu theme thành màu thực và giữ các alias tên icon cũ đang được sử dụng. SafeAreaView, KeyboardAvoidingView và LinearGradient được bọc bằng styled; các API nền tảng tiếp tục dùng thư viện gốc.

## Nền UI và Home trên điện thoại

Đợt này chỉ triển khai Android/iOS: primary đen, accent cyan, nền trắng; focus dùng focusRing. Button/Action/IconButton có phản hồi pressed và disabled. Không thêm animation driver, dependency hay thay đổi backend.

`src/app/home.tsx` chỉ giữ Guard và HomeScreen. `components/HomeScreen.tsx` tổ chức trang cuộn dọc, header/logo/avatar, search shortcut, các section và đường dẫn quản trị cũ. `hooks/useHomeDiscovery.ts` suy ra nội dung từ DataContext qua các thuật toán sẵn có, không mở listener riêng. HomeDiscovery hiển thị các rail ngang với trạng thái loading/empty/error; Artwork nhận thêm height để dùng ảnh portrait và fallback cho avatar, giữ mặc định vuông cho các màn cũ.

Chuông Home được disable vì chưa có chức năng thông báo. Chỉ Charts có See all vì có route danh sách tương ứng; album và artist vẫn có thể cuộn để xem tất cả dữ liệu được cung cấp. Không thêm nút See all không có đích đến. Loading hiện dựa trên cờ DataContext sẵn có (hoàn tất theo truy vấn Songs), không phải cờ riêng cho Albums/Artists; các listener đó vẫn cập nhật khi nhận dữ liệu.

Safe area thuộc AppFrame với các màn thông thường; Welcome/Player tự bố trí nội dung trên nền tràn màn hình. Home không cộng thêm padding safe area. Tab bar dùng Lucide, không chuyển cấu trúc route. Các tab khác giữ router.replace; nút Home dùng router.navigate để quay về instance đã có, nhấn tab đang chọn không thực hiện navigation. PlayerContext giữ nguyên.

Home nằm trong native stack, có freezeOnBlur riêng cho route home. Mở bài/artist/chart/album dùng push; Back dùng router.back để pop về instance đang giữ ScrollView dọc và các rail ngang. Không thêm listener/refetch theo focus, scrollTo(0), key theo pathname hay cache offset toàn cục. Album và song có BackButton để quay lại trên iOS khi native header đang ẩn. replace fallback chỉ dùng khi không có lịch sử (ví dụ mở trực tiếp bằng deep link). Không đảm bảo lưu vị trí sau khi app bị hệ điều hành đóng, logout hoặc Home bị loại khỏi stack khi chuyển sang tab khác; đó không phải luồng mở chi tiết rồi Back.

Ở các đợt đầu, người dùng tự kiểm thử. Yêu cầu mới nhất đã cho phép chạy kiểm tra tự động cuối đợt: lint sạch, TypeScript đạt, 16/16 tests và native export Android/iOS thành công. Xem UI_TEST_REPORT.md và PROGRESS.md để biết phạm vi và các phần chưa xác nhận trên điện thoại.

ModalPanel dùng Tamagui Dialog, hỗ trợ focus trên web và đóng bằng nút Back trên Android. Chỉ mount hộp chọn playlist khi mở để tránh tạo Dialog cho từng hàng đang đóng. Player dùng Tamagui Slider và giữ PlayerContext hiện tại.

## Portal và Player

Bản cài hiện tại có hai bản @tamagui/portal 3.1.10 ở hai nhánh tamagui và dialog. TamaguiProvider của gói tamagui đã bọc PortalProvider, nhưng Dialog dùng context của bản portal khác nên phát sinh PortalDispatchContext=null. metro.config.js kế thừa expo/metro-config và buộc import @tamagui/portal resolve từ gói tamagui (nơi cung cấp provider). Giữ nguyên lựa chọn entry native của Metro; không import trực tiếp file trong node_modules, không thêm provider trùng, không thay lockfile/dependencies. Cần khởi động lại Metro sau khi thay cấu hình.

Player route chỉ còn Guard + PlayerScreen. PlayerScreen dùng artwork nền toàn màn hình và gradient tối; nội dung chừa safe area, có thể cuộn trên điện thoại thấp/chữ lớn. Các chức năng existing gồm play/pause, previous/next, repeat-one, seek, lời bài hát và chi tiết. Yêu thích và chia sẻ dùng service/API sẵn có. Progress giữ giá trị kéo cục bộ và gọi seek khi onSlideEnd, không tạo bộ phát mới. Không dựng waveform hay số tương tác giả, không thêm shuffle/queue engine trong đợt UI.

MiniPlayer tách khỏi AppFrame, có artwork, tên hai dòng, artist, favorite và play/pause/loading. AppFrame không còn subscribe PlayerContext để cập nhật tiến độ cho cả thanh điều hướng. Mở Player dùng push; transition slide_from_bottom của native stack; thu gọn dùng back. Không thêm thư viện hoặc gesture engine mới. PlayerBackground/playerMuted/playerTrack là token cục bộ cho UI tối, không bật dark mode toàn ứng dụng.

## Runtime và kiểm tra

### Quy tắc bố cục chữ và card

`Action` và `IconButton` dùng YStack có role/onPress, không kế thừa skin Button (theme level2, sizing và cơ chế bọc text của control). AppButton vẫn dùng Button cho CTA. Rail Home lấy padding từ cùng uiSpacing.gutter với header; các card không tự thêm padding/margin trái.

`AppText` chỉ chuẩn hóa nền typography, không quyết định mọi bố cục. `MediaTitle` và `MediaSubtitle` là quy tắc chung cho chữ trong card/hàng: tối đa hai dòng, ellipsis ở cuối sau hai dòng. Heading và nội dung màn chi tiết không bị giới hạn dòng. Thumbnail không co, vùng chữ có minWidth=0 và phần chiều rộng còn lại. Card nghệ sĩ dành chỗ cho hai dòng theo fontScale để các nút Follow cùng hàng; Follow căn giữa cả hai trục, dùng font caption và loại bỏ font padding Android.

SongRow chỉ có artwork, tên/nghệ sĩ/thời lượng và một nút more 44px. Yêu thích, chi tiết, thêm playlist và gỡ khỏi playlist chuyển vào menu ModalPanel; tầng services và player không đổi. Artist/chart/album dùng SongRow nhận cùng sửa bố cục này. Không giảm touch target để cố nhét ba hoặc bốn nút cạnh tên bài.

Hiện dùng runtime Tamagui và CSS tự chèn cho web; chưa bật compiler/static extraction. Chỉ thêm tích hợp Metro/Babel khi có phép đo bundle/render chứng minh cần thiết, rồi kiểm tra lại cả web và native. Không cần dependency mới cho đợt chuyển đổi này.

- `npm run lint`
- `npm run typecheck`
- `npm test`: validation và kiểm tra render UI, mật khẩu/email, ảnh, trạng thái busy/error, giới hạn form và virtualization ban đầu.
- `npx expo export --platform all --output-dir dist/tamagui-check`: kiểm tra bundle web/Android/iOS.

Kiểm tra render bằng Node và bundle không thay thế kiểm thử trực quan trên thiết bị. Khi nghiệm thu, kiểm tra màn 320px, bàn phím, chữ lớn/chữ dài, ảnh lỗi, follow/favorite, playlist dialog (Back/Escape), Slider, upload, admin và điều hướng. Các service/Auth/Data/Player context không đổi trong đợt chuyển UI.

## Chu?n h?a code v? Back ? 2026-11-02

Route ch? gi? params, guard v? render. Auth/Profile d?ng screen v? form hook ri?ng; Admin/Album/MyUploads/Song/Welcome n?m ngo?i src/app. useSongDetail qu?n l? t?i chi ti?t, useFavoriteSong t?i s? d?ng service hi?n c?; useRealtimeList d?n listener v? b? qua callback sau unmount. Kh?ng th?m store/API m?i.

BackButton chu?n n?m ? ui, discovery re-export t??ng th?ch. useBackNavigation d?ng createBackAction ?? ki?m tra stack, pop m?t m?n ho?c fallback khi kh?ng c? l?ch s?, ch?ng double tap ??n l?n focus ti?p theo. Player/Comments d?ng c?ng hook. Kh?ng replace Home khi stack c?n Home, kh?ng refetch theo focus. useAction ch?n mutation tr?ng tr??c khi busy k?p render.
