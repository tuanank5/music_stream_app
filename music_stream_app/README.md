# Music_Stream_App — Clean structure draft

Bản tách cấu trúc dựa trên UI pack hiện có và MASTER_PROMPT. Giữ `App.tsx`, không chuyển sang Expo Router.

## Tái sử dụng
- `components/Artwork.tsx`, `BottomNav.tsx`, `MiniPlayer.tsx`, `ScreenPrimitives.tsx`, `SongRow.tsx` được giữ lại.
- Các màn hình hiện có được chuyển thành file riêng trong `screens/`. `screens/AllScreens.tsx` chỉ là barrel tương thích, không chứa UI.
- `screens/shared.ts` giữ style/constants chung để tránh copy-paste.

## Cấu trúc chính
- `screens/`: mỗi màn hình một file.
- `components/`: UI tái sử dụng.
- `hooks/`: trạng thái có thể tái sử dụng. `usePlayer` hiện chỉ là state UI, chưa phát audio thật.
- `services/`: placeholder có ghi rõ chưa kết nối Firebase.
- `types/`: Song, User, Playlist.
- `docs/`: master prompt, progress, changelog, bugs.

## TODO phối hợp nhóm
Tìm `TODO (phối hợp ...)` trong code. Gợi ý chia nhánh:
1. **UI team:** `screens/*`, `components/*`, `constants/layout.ts`.
2. **Player/audio team:** `hooks/usePlayer.ts`, tích hợp `PlayerScreen` và `MiniPlayer`.
3. **Firebase/auth team:** `services/firebase/`, `services/authService.ts`, `types/User.ts`.
4. **Data/playlist team:** `songService.ts`, `playlistService.ts`, `types/Song.ts`, `types/Playlist.ts`.
5. **Favorites team:** `hooks/useFavorites.ts`, `FavoritesScreen.tsx`, sau đó nối Firestore.
6. **Integration owner:** `App.tsx`, navigation và docs; các nhóm cần thống nhất interface trước khi merge.

## Tích hợp an toàn
1. Tạo bản sao project trước.
2. Sao chép các thư mục/file từ ZIP vào project, giữ `package.json`, `app.json`, `tsconfig.json` và cấu hình hiện tại.
3. Chạy `npx expo start`.
4. Nếu có lỗi, gửi nguyên văn log. Gói này **chưa được xác minh build** trên project gốc.

## Giới hạn hiện tại
- Dữ liệu bài hát là mẫu.
- Login/Register và Premium là UI demo.
- Firebase chưa kết nối; services trả kết quả rỗng thay vì giả vờ backend hoạt động.
- Player chưa phát âm thanh thật.
- Các màn hình mới bổ sung như Profile/Favorites/Lyrics/SongDetail là khung UI cần hoàn thiện.
