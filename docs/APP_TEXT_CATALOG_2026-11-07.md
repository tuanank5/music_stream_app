# Danh mục chữ hiển thị và thông báo ứng dụng

Ngày rà soát: 07/11/2026. Nguồn: working tree hiện tại, gồm các thay đổi local chưa commit. File này trích nguyên văn để biên tập, chưa sửa chữ trong ứng dụng.

## Cách đọc

- `{song.title}`, `{form.name}`, `{error.message}`… là dữ liệu/biểu thức lúc chạy; không phải nội dung mẫu đã lấy từ Firebase. Những biểu thức có giá trị mặc định giữ nguyên fallback trong dấu `{}`.
- `⟪hoặc⟫` phân tách các nhãn theo điều kiện. Cùng một câu ở nhiều vị trí được giữ để biết tất cả nơi cần sửa.
- Gồm chữ JSX, props hiển thị, giá trị input, nhãn trợ năng, chuỗi cấu hình/validation/thông báo trong src và thông báo backend có khả năng truyền về client. Không phải mọi lỗi nội bộ backend đều thực sự được đưa ra UI; các dòng đó được ghi rõ là ứng viên.
- Nội dung người dùng nhập (tên, lời bài hát, bài đăng, bình luận), thông báo Firebase/Cloudinary/OS lúc chạy được đại diện bằng placeholder. Không đọc database hoặc credentials để liệt kê dữ liệu cá nhân.
- Các giá trị lựa chọn như thể loại có bảng nguồn riêng trong phần utils/genres. Các component chung có `{title}`/`{message}` được đối chiếu với nơi gọi trong Screens.
- Trích bằng TypeScript AST, ghép nội dung trong thẻ chữ, lấy nhãn/nhánh điều kiện và quét thêm chuỗi thông báo. Chuỗi nội bộ hỗ trợ tìm kiếm hoặc chẩn đoán có thể xuất hiện trong mục chuỗi/ứng viên; cần xác nhận đường gọi trước khi đổi thành bản dịch. Không bao gồm chữ nằm sẵn trong bitmap và thông báo do hệ điều hành tự dịch.

Đã quét 199 file mã nguồn và app.json; 125 file có mục trích xuất; 901 mục sau khử trùng tại cùng vị trí.

## Những nhóm chữ cần biên tập trước

- Thống nhất Album, Playlist; kiểm tra “Không thuộc album”, “Gỡ khỏi playlist” và các thông báo backend còn viết thường.
- Chọn chính sách tiếng Việt cho Follow/Unfollow, Follower/Following, Artist, Genre, Song, Chart/Charts, Music lover; giữ tên sản phẩm nếu có chủ đích.
- “Đang lưu...” hiện còn dùng cho cả lúc chọn file; tách chọn file/tải lên/lưu metadata.
- “Tận hưởng khả năng tải lên không giới hạn” dẫn sang Premium chưa hỗ trợ; đổi thành lời giới thiệu không hứa tính năng đã có.
- “Hàng triệu nghệ sĩ” và tên “MusicSteamApp” cần kiểm tra; không giữ số liệu quảng bá chưa có căn cứ.
- Thông báo lỗi kỹ thuật nên ánh xạ mã lỗi sang câu dễ hiểu; log chi tiết ở backend.

## Nội dung động và hộp thoại hệ thống

| Nguồn                                        | Mẫu nội dung lúc chạy                                                                                                                              |
| -------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------- |
| notify / Alert.alert / window.alert          | Thông báo — {message}                                                                                                                              |
| confirmDelete / Alert.alert / window.confirm | {title} — {message}; Hủy / Xóa                                                                                                                     |
| errorMessage và ErrorText                    | {messages[error.code]} hoặc {error.message}; mặc định “Thao tác thất bại.”                                                                         |
| Media / profile / feed / lyric từ backend    | {song.title}, {song.artist}, {song.lyrics}, {album.title}, {playlist.name}, {profile.name}, {profile.biography}, {post.content}, {comment.content} |
| Provider, picker, trình chia sẻ, trình duyệt | {systemMessage}; nội dung do SDK/hệ điều hành trả về, không có danh sách cố định trong repo                                                        |

Các dòng tổng hợp này giải thích luồng dữ liệu; không cộng vào số mục trích từ source ở trên.

## Mục lục theo nguồn

- [src/screens/AccountDeleteScreen.tsx](../src/screens/AccountDeleteScreen.tsx) — 8 mục
- [src/screens/AccountScreen.tsx](../src/screens/AccountScreen.tsx) — 6 mục
- [src/screens/AlbumAddSongsScreen.tsx](../src/screens/AlbumAddSongsScreen.tsx) — 9 mục
- [src/screens/AlbumScreen.tsx](../src/screens/AlbumScreen.tsx) — 9 mục
- [src/screens/ArtistProfileScreen.tsx](../src/screens/ArtistProfileScreen.tsx) — 13 mục
- [src/screens/AuthScreen.tsx](../src/screens/AuthScreen.tsx) — 14 mục
- [src/screens/BasicSettingsScreen.tsx](../src/screens/BasicSettingsScreen.tsx) — 6 mục
- [src/screens/ChartScreen.tsx](../src/screens/ChartScreen.tsx) — 14 mục
- [src/screens/ChartsScreen.tsx](../src/screens/ChartsScreen.tsx) — 4 mục
- [src/screens/CommentsScreen.tsx](../src/screens/CommentsScreen.tsx) — 22 mục
- [src/screens/DiscoveryListScreen.tsx](../src/screens/DiscoveryListScreen.tsx) — 9 mục
- [src/screens/FavoritesScreen.tsx](../src/screens/FavoritesScreen.tsx) — 2 mục
- [src/screens/FeedScreen.tsx](../src/screens/FeedScreen.tsx) — 40 mục
- [src/screens/HistoryScreen.tsx](../src/screens/HistoryScreen.tsx) — 3 mục
- [src/screens/HomeScreen.tsx](../src/screens/HomeScreen.tsx) — 12 mục
- [src/screens/LibraryScreen.tsx](../src/screens/LibraryScreen.tsx) — 22 mục
- [src/screens/LyricsScreen.tsx](../src/screens/LyricsScreen.tsx) — 3 mục
- [src/screens/MyAlbumsScreen.tsx](../src/screens/MyAlbumsScreen.tsx) — 31 mục
- [src/screens/MyUploadsScreen.tsx](../src/screens/MyUploadsScreen.tsx) — 19 mục
- [src/screens/NotFoundScreen.tsx](../src/screens/NotFoundScreen.tsx) — 3 mục
- [src/screens/PlayerScreen.tsx](../src/screens/PlayerScreen.tsx) — 26 mục
- [src/screens/PlaylistScreen.tsx](../src/screens/PlaylistScreen.tsx) — 6 mục
- [src/screens/PlaylistsScreen.tsx](../src/screens/PlaylistsScreen.tsx) — 22 mục
- [src/screens/PremiumScreen.tsx](../src/screens/PremiumScreen.tsx) — 3 mục
- [src/screens/ProfileScreen.tsx](../src/screens/ProfileScreen.tsx) — 11 mục
- [src/screens/PublicProfileScreen.tsx](../src/screens/PublicProfileScreen.tsx) — 7 mục
- [src/screens/SearchScreen.tsx](../src/screens/SearchScreen.tsx) — 25 mục
- [src/screens/SongScreen.tsx](../src/screens/SongScreen.tsx) — 9 mục
- [src/screens/UploadSongScreen.tsx](../src/screens/UploadSongScreen.tsx) — 41 mục
- [src/screens/UserPlaylistsScreen.tsx](../src/screens/UserPlaylistsScreen.tsx) — 3 mục
- [src/screens/WelcomeScreen.tsx](../src/screens/WelcomeScreen.tsx) — 4 mục
- [src/components/AlbumFavoriteButton.tsx](../src/components/AlbumFavoriteButton.tsx) — 1 mục
- [src/components/AppFrame.tsx](../src/components/AppFrame.tsx) — 7 mục
- [src/components/discovery/ArtistAvatar.tsx](../src/components/discovery/ArtistAvatar.tsx) — 1 mục
- [src/components/discovery/ArtistCard.tsx](../src/components/discovery/ArtistCard.tsx) — 2 mục
- [src/components/discovery/ChartCard.tsx](../src/components/discovery/ChartCard.tsx) — 2 mục
- [src/components/discovery/ChartCover.tsx](../src/components/discovery/ChartCover.tsx) — 2 mục
- [src/components/discovery/FollowButton.tsx](../src/components/discovery/FollowButton.tsx) — 5 mục
- [src/components/HomeDiscovery.tsx](../src/components/HomeDiscovery.tsx) — 16 mục
- [src/components/LoadMore.tsx](../src/components/LoadMore.tsx) — 2 mục
- [src/components/MediaCoverCard.tsx](../src/components/MediaCoverCard.tsx) — 3 mục
- [src/components/MediaRow.tsx](../src/components/MediaRow.tsx) — 3 mục
- [src/components/MiniPlayer.tsx](../src/components/MiniPlayer.tsx) — 6 mục
- [src/components/PlaylistRow.tsx](../src/components/PlaylistRow.tsx) — 2 mục
- [src/components/PlaylistsSection.tsx](../src/components/PlaylistsSection.tsx) — 3 mục
- [src/components/RelatedArtistsSection.tsx](../src/components/RelatedArtistsSection.tsx) — 4 mục
- [src/components/SongRow.tsx](../src/components/SongRow.tsx) — 27 mục
- [src/components/ui/BackButton.tsx](../src/components/ui/BackButton.tsx) — 1 mục
- [src/components/ui/Button.tsx](../src/components/ui/Button.tsx) — 2 mục
- [src/components/ui/Feedback.tsx](../src/components/ui/Feedback.tsx) — 4 mục
- [src/components/ui/Field.tsx](../src/components/ui/Field.tsx) — 1 mục
- [src/components/ui/FilterBar.tsx](../src/components/ui/FilterBar.tsx) — 2 mục
- [src/components/ui/Image.tsx](../src/components/ui/Image.tsx) — 1 mục
- [src/components/ui/ListPage.tsx](../src/components/ui/ListPage.tsx) — 1 mục
- [src/components/ui/ModalPanel.tsx](../src/components/ui/ModalPanel.tsx) — 3 mục
- [src/components/ui/Page.tsx](../src/components/ui/Page.tsx) — 1 mục
- [src/components/ui/ScreenHeader.tsx](../src/components/ui/ScreenHeader.tsx) — 1 mục
- [src/components/ui/SearchField.tsx](../src/components/ui/SearchField.tsx) — 5 mục
- [src/components/ui/SectionHeading.tsx](../src/components/ui/SectionHeading.tsx) — 3 mục
- [src/app/_layout.tsx](../src/app/_layout.tsx) — 2 mục
- [src/app/album-add.tsx](../src/app/album-add.tsx) — 2 mục
- [src/app/album.tsx](../src/app/album.tsx) — 2 mục
- [src/app/comments.tsx](../src/app/comments.tsx) — 2 mục
- [src/app/song.tsx](../src/app/song.tsx) — 2 mục
- [src/contexts/AlbumFavoritesContext.tsx](../src/contexts/AlbumFavoritesContext.tsx) — 1 mục
- [src/contexts/AuthContext.tsx](../src/contexts/AuthContext.tsx) — 1 mục
- [src/contexts/DataContext.tsx](../src/contexts/DataContext.tsx) — 10 mục
- [src/contexts/PlayerContext.tsx](../src/contexts/PlayerContext.tsx) — 5 mục
- [src/contexts/ThemeContext.tsx](../src/contexts/ThemeContext.tsx) — 3 mục
- [src/hooks/useAuthForm.ts](../src/hooks/useAuthForm.ts) — 2 mục
- [src/hooks/useBackendResource.ts](../src/hooks/useBackendResource.ts) — 1 mục
- [src/hooks/useCursorList.ts](../src/hooks/useCursorList.ts) — 1 mục
- [src/hooks/useProfileForm.ts](../src/hooks/useProfileForm.ts) — 5 mục
- [src/hooks/useUserPlaylists.ts](../src/hooks/useUserPlaylists.ts) — 1 mục
- [src/services/authService.ts](../src/services/authService.ts) — 4 mục
- [src/services/backendService.ts](../src/services/backendService.ts) — 10 mục
- [src/services/catalogService.ts](../src/services/catalogService.ts) — 2 mục
- [src/services/feedService.ts](../src/services/feedService.ts) — 5 mục
- [src/services/firebase/auth.native.ts](../src/services/firebase/auth.native.ts) — 1 mục
- [src/services/firebase/auth.ts](../src/services/firebase/auth.ts) — 1 mục
- [src/services/firebase/config.ts](../src/services/firebase/config.ts) — 2 mục
- [src/services/firebase/runtime.ts](../src/services/firebase/runtime.ts) — 8 mục
- [src/services/historyPageService.ts](../src/services/historyPageService.ts) — 3 mục
- [src/services/historyService.ts](../src/services/historyService.ts) — 1 mục
- [src/services/libraryService.ts](../src/services/libraryService.ts) — 4 mục
- [src/services/mediaUploadService.ts](../src/services/mediaUploadService.ts) — 12 mục
- [src/services/playlistSubscriptions.ts](../src/services/playlistSubscriptions.ts) — 1 mục
- [src/services/prepareImageUpload.ts](../src/services/prepareImageUpload.ts) — 4 mục
- [src/services/stageAudioUpload.ts](../src/services/stageAudioUpload.ts) — 3 mục
- [src/services/uploadsService.ts](../src/services/uploadsService.ts) — 3 mục
- [src/utils/feedback.ts](../src/utils/feedback.ts) — 15 mục
- [src/utils/genres.ts](../src/utils/genres.ts) — 20 mục
- [src/utils/pager.ts](../src/utils/pager.ts) — 1 mục
- [src/utils/recommendations.ts](../src/utils/recommendations.ts) — 2 mục
- [src/utils/searchHistory.ts](../src/utils/searchHistory.ts) — 3 mục
- [src/utils/subscriptions.ts](../src/utils/subscriptions.ts) — 1 mục
- [src/utils/validation.ts](../src/utils/validation.ts) — 7 mục
- [app.json](../app.json) — 2 mục
- [tools/backend/access-routes.cjs](../tools/backend/access-routes.cjs) — 3 mục
- [tools/backend/album-routes.cjs](../tools/backend/album-routes.cjs) — 23 mục
- [tools/backend/audio-assets.cjs](../tools/backend/audio-assets.cjs) — 6 mục
- [tools/backend/catalog-read.cjs](../tools/backend/catalog-read.cjs) — 4 mục
- [tools/backend/create-request.cjs](../tools/backend/create-request.cjs) — 1 mục
- [tools/backend/favorite-albums.cjs](../tools/backend/favorite-albums.cjs) — 4 mục
- [tools/backend/feed-routes.cjs](../tools/backend/feed-routes.cjs) — 18 mục
- [tools/backend/follow-graph.cjs](../tools/backend/follow-graph.cjs) — 3 mục
- [tools/backend/history-read.cjs](../tools/backend/history-read.cjs) — 1 mục
- [tools/backend/http-app.cjs](../tools/backend/http-app.cjs) — 28 mục
- [tools/backend/image-assets.cjs](../tools/backend/image-assets.cjs) — 15 mục
- [tools/backend/inspect-audio.cjs](../tools/backend/inspect-audio.cjs) — 9 mục
- [tools/backend/local-media.cjs](../tools/backend/local-media.cjs) — 16 mục
- [tools/backend/playback-policy.cjs](../tools/backend/playback-policy.cjs) — 2 mục
- [tools/backend/playback-routes.cjs](../tools/backend/playback-routes.cjs) — 11 mục
- [tools/backend/playlist-read.cjs](../tools/backend/playlist-read.cjs) — 6 mục
- [tools/backend/playlist-routes.cjs](../tools/backend/playlist-routes.cjs) — 8 mục
- [tools/backend/profile-api.cjs](../tools/backend/profile-api.cjs) — 9 mục
- [tools/backend/profiles.cjs](../tools/backend/profiles.cjs) — 2 mục
- [tools/backend/related-artists.cjs](../tools/backend/related-artists.cjs) — 5 mục
- [tools/backend/service.cjs](../tools/backend/service.cjs) — 11 mục
- [tools/backend/social-routes.cjs](../tools/backend/social-routes.cjs) — 11 mục
- [tools/backend/song-create.cjs](../tools/backend/song-create.cjs) — 13 mục
- [tools/backend/song-owner-routes.cjs](../tools/backend/song-owner-routes.cjs) — 7 mục
- [tools/backend/song-read.cjs](../tools/backend/song-read.cjs) — 4 mục
- [tools/backend/song-upload-routes.cjs](../tools/backend/song-upload-routes.cjs) — 3 mục
- [tools/backend/uploads-routes.cjs](../tools/backend/uploads-routes.cjs) — 6 mục

## src/screens/AccountDeleteScreen.tsx

Nguồn: [mở file](../src/screens/AccountDeleteScreen.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại        | Nội dung / mẫu hiển thị                                                        |
| ---- | ----------- | ------------------------------------------------------------------------------ |
| 21   | title       | Xóa tài khoản                                                                  |
| 27   | Nội dung    | Thao tác này sẽ vô hiệu hóa tài khoản của bạn. Bạn sẽ không thể đăng nhập lại. |
| 32   | title       | Xóa tài khoản                                                                  |
| 37   | message     | {action.error}                                                                 |
| 41   | title       | Xóa tài khoản                                                                  |
| 42   | description | Thao tác này sẽ vô hiệu hóa tài khoản của bạn.                                 |
| 47   | message     | {action.error}                                                                 |
| 49   | title       | Xóa tài khoản                                                                  |

## src/screens/AccountScreen.tsx

Nguồn: [mở file](../src/screens/AccountScreen.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại       | Nội dung / mẫu hiển thị           |
| ---- | ---------- | --------------------------------- |
| 18   | title      | Tài khoản                         |
| 24   | Nội dung   | Địa chỉ email: {auth.user?.email} |
| 25   | message    | {action.error}                    |
| 27   | title      | Đăng xuất                         |
| 41   | aria-label | Xóa tài khoản                     |
| 43   | Nội dung   | Xóa tài khoản                     |

## src/screens/AlbumAddSongsScreen.tsx

Nguồn: [mở file](../src/screens/AlbumAddSongsScreen.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại        | Nội dung / mẫu hiển thị                        |
| ---- | ----------- | ---------------------------------------------- |
| 40   | title       | Thêm bài hát                                   |
| 52   | value       | {query}                                        |
| 54   | placeholder | Tìm bài hát chưa thuộc Album                   |
| 56   | Nội dung    | {info.value?.album.title &#124;&#124; "Album"} |
| 57   | message     | {info.error &#124;&#124; action.error}         |
| 62   | title       | {song.title}                                   |
| 63   | subtitle    | {song.artist}                                  |
| 68   | aria-label  | Thêm {song.title} vào Album                    |
| 92   | message     | Không có bài hát chưa thuộc Album nào.         |

## src/screens/AlbumScreen.tsx

Nguồn: [mở file](../src/screens/AlbumScreen.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại        | Nội dung / mẫu hiển thị                                                          |
| ---- | ----------- | -------------------------------------------------------------------------------- |
| 55   | title       | {album?.title &#124;&#124; "Album"}                                              |
| 67   | removeLabel | Gỡ khỏi Album                                                                    |
| 85   | message     | {action.error &#124;&#124; info.error}                                           |
| 86   | message     | {albumFavorites.error}                                                           |
| 93   | Nội dung    | {album?.artistName &#124;&#124; ""}                                              |
| 97   | Nội dung    | {info.value?.totalPlayCount ?? 0} lượt nghe                                      |
| 102  | title       | Phát Album                                                                       |
| 117  | message     | Album chưa có bài hát khả dụng. ⟪hoặc⟫ Album chưa có bài hát công khai khả dụng. |
| 126  | title       | Thêm bài hát                                                                     |

## src/screens/ArtistProfileScreen.tsx

Nguồn: [mở file](../src/screens/ArtistProfileScreen.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại     | Nội dung / mẫu hiển thị                                        |
| ---- | -------- | -------------------------------------------------------------- |
| 43   | title    | Hồ sơ người dùng                                               |
| 53   | message  | {profile.error}                                                |
| 55   | title    | Làm mới hồ sơ                                                  |
| 64   | Nội dung | {profile.profile.name}                                         |
| 65   | Nội dung | {profile.profile.followerCount ?? 0} người theo dõi            |
| 77   | title    | Phát bài hát                                                   |
| 85   | Nội dung | {profile.profile.biography &#124;&#124; "Chưa có giới thiệu."} |
| 90   | message  | Hồ sơ không còn khả dụng.                                      |
| 97   | Nội dung | Bài hát                                                        |
| 110  | message  | Chưa có bài hát công khai.                                     |
| 114  | Nội dung | Album                                                          |
| 118  | title    | {album.title &#124;&#124; "Album"}                             |
| 119  | subtitle | {album.artistName}                                             |

## src/screens/AuthScreen.tsx

Nguồn: [mở file](../src/screens/AuthScreen.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại     | Nội dung / mẫu hiển thị                                                                                                |
| ---- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| 18   | title    | Tạo tài khoản ⟪hoặc⟫ Chào mừng bạn quay trở lại                                                                        |
| 23   | Nội dung | Lưu những bài hát yêu thích và tạo không gian âm nhạc của riêng bạn. ⟪hoặc⟫ Đăng nhập để tiếp tục với âm nhạc của bạn. |
| 30   | label    | Tên hiển thị                                                                                                           |
| 31   | value    | {form.name}                                                                                                            |
| 39   | label    | Email                                                                                                                  |
| 40   | value    | {form.email}                                                                                                           |
| 47   | label    | Mật khẩu (ít nhất 8 ký tự) ⟪hoặc⟫ Mật khẩu                                                                             |
| 48   | value    | {form.password}                                                                                                        |
| 56   | label    | Xác nhận mật khẩu                                                                                                      |
| 57   | value    | {form.confirm}                                                                                                         |
| 64   | message  | {form.error}                                                                                                           |
| 66   | title    | Đăng ký ⟪hoặc⟫ Đăng nhập                                                                                               |
| 76   | title    | Quên mật khẩu                                                                                                          |
| 90   | Nội dung | Đã có tài khoản? Đăng nhập ⟪hoặc⟫ Chưa có tài khoản? Đăng ký                                                           |

## src/screens/BasicSettingsScreen.tsx

Nguồn: [mở file](../src/screens/BasicSettingsScreen.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại               | Nội dung / mẫu hiển thị                                          |
| ---- | ------------------ | ---------------------------------------------------------------- |
| 10   | title              | Cài đặt cơ bản                                                   |
| 15   | Nội dung           | Giao diện tối                                                    |
| 17   | accessibilityLabel | Giao diện tối                                                    |
| 22   | Nội dung           | Đang theo giao diện hệ thống. ⟪hoặc⟫ Đang dùng lựa chọn của bạn. |
| 28   | title              | Dùng giao diện hệ thống                                          |
| 32   | message            | {error}                                                          |

## src/screens/ChartScreen.tsx

Nguồn: [mở file](../src/screens/ChartScreen.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị                                                                                              |
| ---- | ----------------- | -------------------------------------------------------------------------------------------------------------------- |
| 33   | Chuỗi / thông báo | {h} giờ {m} phút                                                                                                     |
| 34   | Chuỗi / thông báo | {m} phút {Math.floor(seconds % 60)} giây                                                                             |
| 53   | title             | Chart                                                                                                                |
| 55   | message           | {state.error &#124;&#124; detail.error}                                                                              |
| 59   | Nội dung          | Chart không tồn tại hoặc đã bị ẩn.                                                                                   |
| 91   | Nội dung          | {chart.title} – {chart.subtitle} ⟪hoặc⟫                                                                              |
| 106  | Nội dung          | {songs.length} bài · {totalTime(duration)}                                                                           |
| 110  | Nội dung          | {chart.description &#124;&#124; "Danh sách nhạc được tuyển chọn."}                                                   |
| 123  | aria-label        | Chia sẻ thông tin chart                                                                                              |
| 127  | Nhãn cấu hình     | {chart?.title} {chart?.subtitle} {songs .slice(0, 5) .map((s) =&gt; &#96;${s.title} — ${s.artist}&#96;) .join("\n")} |
| 141  | aria-label        | Phát ngẫu nhiên chart                                                                                                |
| 152  | aria-label        | Phát tất cả bài trong chart                                                                                          |
| 167  | message           | {action.error &#124;&#124; detail.error}                                                                             |
| 170  | Nội dung          | {unavailable} bài không còn khả dụng.                                                                                |

## src/screens/ChartsScreen.tsx

Nguồn: [mở file](../src/screens/ChartsScreen.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại     | Nội dung / mẫu hiển thị                                                          |
| ---- | -------- | -------------------------------------------------------------------------------- |
| 15   | title    | Charts                                                                           |
| 16   | Nội dung | Tuyển Top 50 theo lượt nghe tích lũy trong từng genre, rồi trộn thứ tự khám phá. |
| 20   | message  | {state.error}                                                                    |
| 36   | Nội dung | Chưa có bài hát công khai để tạo bảng xếp hạng theo genre.                       |

## src/screens/CommentsScreen.tsx

Nguồn: [mở file](../src/screens/CommentsScreen.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị                                                         |
| ---- | ----------------- | ------------------------------------------------------------------------------- |
| 45   | aria-label        | Đóng bình luận                                                                  |
| 67   | Nội dung          | {comments.length} bình luận                                                     |
| 70   | aria-label        | Đóng bình luận                                                                  |
| 74   | message           | {error}                                                                         |
| 80   | title             | Làm mới                                                                         |
| 104  | Nội dung          | {comment.authorName.trim().charAt(0).toUpperCase() &#124;&#124; "?"}            |
| 109  | Nội dung          | {comment.authorName}                                                            |
| 110  | Nội dung          | {comment.content}                                                               |
| 111  | Nội dung          | {new Date(comment.createdAt).toLocaleString()} ⟪hoặc⟫ Đang gửi...               |
| 119  | aria-label        | Sửa hoặc xóa bình luận                                                          |
| 133  | message           | Chưa tải được bình luận. ⟪hoặc⟫ Chưa có bình luận. Hãy bắt đầu cuộc trò chuyện. |
| 148  | message           | {action.error} ⟪hoặc⟫                                                           |
| 150  | label             | Sửa bình luận ⟪hoặc⟫ Viết bình luận                                             |
| 151  | value             | {text}                                                                          |
| 159  | title             | Lưu thay đổi ⟪hoặc⟫ Gửi bình luận                                               |
| 184  | title             | Hủy sửa                                                                         |
| 202  | title             | Bình luận                                                                       |
| 203  | description       | {selected.content}                                                              |
| 205  | message           | {action.error}                                                                  |
| 208  | title             | Sửa bình luận                                                                   |
| 218  | title             | Xóa bình luận                                                                   |
| 223  | Chuỗi / thông báo | Xóa bình luận?                                                                  |

## src/screens/DiscoveryListScreen.tsx

Nguồn: [mở file](../src/screens/DiscoveryListScreen.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại     | Nội dung / mẫu hiển thị                                                                        |
| ---- | -------- | ---------------------------------------------------------------------------------------------- |
| 40   | title    | Album thịnh hành ⟪hoặc⟫ Nghệ sĩ phổ biến                                                       |
| 51   | Nội dung | Bắt nhịp xu hướng cùng những album nổi bật. ⟪hoặc⟫ Khám phá những nghệ sĩ đang được yêu thích. |
| 56   | message  | {errors.join("\n")}                                                                            |
| 58   | message  | {albumFavorites.error}                                                                         |
| 67   | title    | {album.title}                                                                                  |
| 69   | subtitle | {album.artistName}                                                                             |
| 80   | title    | {artist.name}                                                                                  |
| 81   | subtitle | {artist.followerCount ?? 0} người theo dõi                                                     |
| 97   | message  | Chưa có nội dung để hiển thị.                                                                  |

## src/screens/FavoritesScreen.tsx

Nguồn: [mở file](../src/screens/FavoritesScreen.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại    | Nội dung / mẫu hiển thị                            |
| ---- | ------- | -------------------------------------------------- |
| 16   | title   | Bài hát yêu thích                                  |
| 25   | message | Mở menu … của bài hát rồi chọn Thêm vào yêu thích. |

## src/screens/FeedScreen.tsx

Nguồn: [mở file](../src/screens/FeedScreen.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị                                                                     |
| ---- | ----------------- | ------------------------------------------------------------------------------------------- |
| 63   | title             | Bảng tin                                                                                    |
| 66   | aria-label        | Đăng bài mới                                                                                |
| 77   | Nội dung          | Âm nhạc và những câu chuyện được chia sẻ.                                                   |
| 81   | message           | {error &#124;&#124; (!composer &amp;&amp; !menu ? action.error : "")}                       |
| 106  | Nội dung          | {post.authorName.trim().charAt(0).toUpperCase() &#124;&#124; "♪"}                           |
| 111  | Nội dung          | {post.authorName}                                                                           |
| 112  | Nội dung          | {new Date(post.createdAt).toLocaleString()} ⟪hoặc⟫ Đang gửi...                              |
| 119  | aria-label        | Thao tác bài đăng                                                                           |
| 128  | Nội dung          | {post.content}                                                                              |
| 133  | title             | {song.title}                                                                                |
| 134  | subtitle          | {song.artist}                                                                               |
| 140  | Nội dung          | Bài hát đính kèm không còn khả dụng.                                                        |
| 155  | aria-label        | Đọc và viết bình luận                                                                       |
| 158  | Nội dung          | Bình luận                                                                                   |
| 169  | aria-label        | Chia sẻ bài đăng                                                                            |
| 172  | Nội dung          | Chia sẻ                                                                                     |
| 181  | title             | Làm mới                                                                                     |
| 189  | message           | Chưa tải được bảng tin. ⟪hoặc⟫ Chưa có bài đăng. Hãy chia sẻ cảm nhận đầu tiên của bạn.     |
| 205  | title             | Sửa bài đăng ⟪hoặc⟫ Chia sẻ âm nhạc                                                         |
| 206  | description       | Viết một cảm nhận và đính kèm bài hát nếu muốn.                                             |
| 209  | label             | Nội dung                                                                                    |
| 210  | value             | {text}                                                                                      |
| 217  | Nội dung          | Đính kèm: {data.songs.find((song) =&gt; song.id === songId)?.title &#124;&#124; "Không có"} |
| 223  | title             | Không đính kèm bài hát                                                                      |
| 228  | value             | {keyword}                                                                                   |
| 230  | placeholder       | Chọn bài hát đính kèm                                                                       |
| 244  | title             | {song.title}                                                                                |
| 245  | subtitle          | {song.artist}                                                                               |
| 255  | Nội dung          | Hiển thị tối đa 20 kết quả. Nhập từ khóa để tìm bài khác.                                   |
| 260  | message           | {action.error}                                                                              |
| 262  | title             | Lưu nội dung ⟪hoặc⟫ Đăng bài                                                                |
| 285  | title             | Hủy                                                                                         |
| 298  | title             | Bài đăng                                                                                    |
| 299  | description       | {menu.authorName}                                                                           |
| 301  | message           | {action.error}                                                                              |
| 304  | title             | Sửa nội dung                                                                                |
| 311  | title             | Bình luận                                                                                   |
| 321  | title             | Chia sẻ nội dung                                                                            |
| 330  | title             | Ẩn bài đăng                                                                                 |
| 335  | Chuỗi / thông báo | Ẩn bài đăng? Bình luận được giữ nhưng không còn hiển thị.                                   |

## src/screens/HistoryScreen.tsx

Nguồn: [mở file](../src/screens/HistoryScreen.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại    | Nội dung / mẫu hiển thị                      |
| ---- | ------- | -------------------------------------------- |
| 14   | title   | Lịch sử                                      |
| 21   | message | {history.error}                              |
| 29   | message | Chưa có bài hát khả dụng trong lịch sử nghe. |

## src/screens/HomeScreen.tsx

Nguồn: [mở file](../src/screens/HomeScreen.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại               | Nội dung / mẫu hiển thị                                |
| ---- | ------------------ | ------------------------------------------------------ |
| 30   | Chuỗi / thông báo  | Chào buổi sáng,                                        |
| 32   | Chuỗi / thông báo  | Chào buổi chiều,                                       |
| 33   | Chuỗi / thông báo  | Chào buổi tối,                                         |
| 54   | accessibilityLabel | Music                                                  |
| 58   | aria-label         | Bật thông báo ⟪hoặc⟫ Tắt thông báo                     |
| 66   | aria-label         | Mở hồ sơ cá nhân                                       |
| 77   | Nội dung           | {greeting}                                             |
| 80   | Nội dung           | {user?.displayName?.trim() &#124;&#124; "Music lover"} |
| 93   | aria-label         | Tìm bài hát, nghệ sĩ hoặc Album                        |
| 104  | Nội dung           | Bạn muốn nghe gì?                                      |
| 112  | title              | Làm mới khám phá                                       |
| 122  | title              | Bài hát                                                |

## src/screens/LibraryScreen.tsx

Nguồn: [mở file](../src/screens/LibraryScreen.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại          | Nội dung / mẫu hiển thị                                                                                       |
| ---- | ------------- | ------------------------------------------------------------------------------------------------------------- |
| 32   | Nhãn cấu hình | Bài hát                                                                                                       |
| 33   | Nhãn cấu hình | Album                                                                                                         |
| 34   | Nhãn cấu hình | Nghệ sĩ                                                                                                       |
| 96   | title         | Thư viện                                                                                                      |
| 98   | aria-label    | Cài đặt                                                                                                       |
| 107  | value         | {keyword}                                                                                                     |
| 109  | placeholder   | Tìm trong thư viện                                                                                            |
| 118  | title         | Playlist của bạn                                                                                              |
| 123  | title         | Lịch sử                                                                                                       |
| 128  | title         | Bài hát đã đăng tải                                                                                           |
| 133  | message       | {albumFavorites.error}                                                                                        |
| 136  | title         | Thử tải lại Album yêu thích                                                                                   |
| 149  | title         | {result.item.name}                                                                                            |
| 162  | title         | {result.item.title}                                                                                           |
| 164  | subtitle      | {result.item.artistName}                                                                                      |
| 187  | message       | Không có kết quả trong thư viện. ⟪hoặc⟫ Yêu thích bài hát hoặc theo dõi nghệ sĩ để xây dựng thư viện của bạn. |
| 200  | title         | Cài đặt                                                                                                       |
| 204  | title         | Hồ sơ                                                                                                         |
| 209  | title         | Tài khoản                                                                                                     |
| 214  | title         | Cài đặt cơ bản                                                                                                |
| 219  | title         | Đăng tải bài hát                                                                                              |
| 224  | title         | Premium                                                                                                       |

## src/screens/LyricsScreen.tsx

Nguồn: [mở file](../src/screens/LyricsScreen.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại     | Nội dung / mẫu hiển thị                                        |
| ---- | -------- | -------------------------------------------------------------- |
| 16   | title    | Lời bài hát                                                    |
| 20   | Nội dung | {song?.title ?? "Không tìm thấy bài hát"}                      |
| 21   | Nội dung | {song?.lyrics &#124;&#124; "Chưa có lời bài hát cho bài này."} |

## src/screens/MyAlbumsScreen.tsx

Nguồn: [mở file](../src/screens/MyAlbumsScreen.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại               | Nội dung / mẫu hiển thị                                                                                             |
| ---- | ------------------ | ------------------------------------------------------------------------------------------------------------------- |
| 75   | title              | Bài hát đã đăng tải                                                                                                 |
| 85   | title              | Bài hát                                                                                                             |
| 86   | title              | Album                                                                                                               |
| 89   | title              | Tạo Album                                                                                                           |
| 94   | value              | {query}                                                                                                             |
| 96   | placeholder        | Tìm Album của bạn                                                                                                   |
| 98   | message            | {action.error} ⟪hoặc⟫                                                                                               |
| 103  | title              | {album.title}                                                                                                       |
| 104  | subtitle           | {album.artistName} · {album.songCount ?? 0} bài hát                                                                 |
| 114  | aria-label         | Thao tác với {album.title}                                                                                          |
| 133  | message            | Chưa có Album phù hợp.                                                                                              |
| 136  | title              | Làm mới Album                                                                                                       |
| 146  | title              | Xóa album? ⟪hoặc⟫ Chỉnh sửa album ⟪hoặc⟫ Tạo album ⟪hoặc⟫ {selected?.title &#124;&#124; "Album"}                    |
| 155  | description        | Thao tác này sẽ xóa vĩnh viễn album này. Các bài hát vẫn được giữ lại. Bạn có chắc chắn muốn tiếp tục không? ⟪hoặc⟫ |
| 164  | message            | {action.error}                                                                                                      |
| 167  | title              | Xóa Album                                                                                                           |
| 184  | title              | Chọn ảnh bìa                                                                                                        |
| 198  | Chuỗi / thông báo  | Phiên đăng nhập đã thay đổi.                                                                                        |
| 211  | Chuỗi / thông báo  | Phiên đăng nhập đã thay đổi.                                                                                        |
| 217  | label              | Tên Album                                                                                                           |
| 218  | value              | {title}                                                                                                             |
| 223  | label              | Mô tả                                                                                                               |
| 224  | value              | {description}                                                                                                       |
| 230  | Nội dung           | Công khai                                                                                                           |
| 232  | accessibilityLabel | Công khai album                                                                                                     |
| 239  | title              | Lưu Album                                                                                                           |
| 256  | Chuỗi / thông báo  | Cần đăng nhập.                                                                                                      |
| 272  | title              | Chỉnh sửa Album                                                                                                     |
| 278  | title              | Riêng tư ⟪hoặc⟫ Công khai                                                                                           |
| 298  | title              | Thêm bài hát                                                                                                        |
| 308  | title              | Xóa Album                                                                                                           |

## src/screens/MyUploadsScreen.tsx

Nguồn: [mở file](../src/screens/MyUploadsScreen.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại        | Nội dung / mẫu hiển thị                                                            |
| ---- | ----------- | ---------------------------------------------------------------------------------- |
| 56   | title       | Bài hát đã đăng tải                                                                |
| 73   | title       | Bài hát                                                                            |
| 75   | title       | Album                                                                              |
| 85   | Nội dung    | {Math.round(quota.value.percentUsed)}% số lượt tải lên của bạn đã được sử dụng     |
| 91   | aria-label  | Hạn mức tải lên                                                                    |
| 110  | message     | {quota.error}                                                                      |
| 113  | title       | Thử lại                                                                            |
| 119  | title       | Tận hưởng khả năng tải lên không giới hạn                                          |
| 130  | aria-label  | Tải lên một bài hát                                                                |
| 137  | aria-label  | Tắt lặp lại danh sách ⟪hoặc⟫ Phát lặp lại danh sách                                |
| 164  | aria-label  | Phát bài hát đã đăng tải                                                           |
| 180  | message     | {action.error}                                                                     |
| 181  | message     | {uploads.error}                                                                    |
| 184  | value       | {keyword}                                                                          |
| 186  | placeholder | Tìm kiếm bài hát đã đăng tải                                                       |
| 199  | Nội dung    | Chỉ cần tải lên một file.                                                          |
| 202  | Nội dung    | Tham gia cùng hàng triệu nghệ sĩ sử dụng MusicSteamApp để được mọi người biết đến. |
| 207  | title       | Tải lên một bài hát                                                                |
| 216  | message     | Không có bài hát đã đăng tải phù hợp.                                              |

## src/screens/NotFoundScreen.tsx

Nguồn: [mở file](../src/screens/NotFoundScreen.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại     | Nội dung / mẫu hiển thị                                              |
| ---- | -------- | -------------------------------------------------------------------- |
| 8    | title    | Không tìm thấy trang                                                 |
| 9    | Nội dung | Đường dẫn không tồn tại hoặc trang đã được chuyển sang địa chỉ khác. |
| 13   | title    | Về trang chủ ⟪hoặc⟫ Về trang bắt đầu                                 |

## src/screens/PlayerScreen.tsx

Nguồn: [mở file](../src/screens/PlayerScreen.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại          | Nội dung / mẫu hiển thị                                                     |
| ---- | ------------- | --------------------------------------------------------------------------- |
| 57   | aria-label    | Tua nhạc                                                                    |
| 74   | aria-label    | Vị trí phát                                                                 |
| 82   | Nội dung      | {formatDuration(position)}                                                  |
| 85   | Nội dung      | {formatDuration(duration)}                                                  |
| 149  | Nội dung      | ĐANG PHÁT                                                                   |
| 152  | aria-label    | Thu gọn trình phát                                                          |
| 160  | Nội dung      | {song.title}                                                                |
| 163  | Nội dung      | {song.artist}                                                               |
| 168  | message       | {player.error &#124;&#124; favorites.error &#124;&#124; action.error}       |
| 178  | Nội dung      | Thử tải lại bài hát                                                         |
| 184  | aria-label    | Tắt lặp một bài ⟪hoặc⟫ Lặp một bài                                          |
| 193  | aria-label    | Bài trước                                                                   |
| 197  | aria-label    | Đang tải nhạc ⟪hoặc⟫ Tạm dừng ⟪hoặc⟫ Phát nhạc                              |
| 221  | aria-label    | Bài tiếp theo                                                               |
| 225  | aria-label    | Bỏ yêu thích ⟪hoặc⟫ Yêu thích bài hát                                       |
| 248  | aria-label    | Xem lời bài hát                                                             |
| 251  | Nội dung      | Lời bài hát                                                                 |
| 263  | aria-label    | Chi tiết bài hát                                                            |
| 266  | Nội dung      | Chi tiết                                                                    |
| 279  | Nhãn cấu hình | {song.title} — {song.artist}                                                |
| 283  | aria-label    | Chia sẻ bài hát                                                             |
| 286  | Nội dung      | Chia sẻ                                                                     |
| 292  | Nội dung      | Âm thanh tổng hợp demo do ứng dụng cung cấp, không phải bản thu thương mại. |
| 300  | Nội dung      | Chưa có bài đang phát                                                       |
| 303  | Nội dung      | Chọn một bài hát để bắt đầu nghe nhạc.                                      |
| 312  | Nội dung      | Quay lại chọn bài                                                           |

## src/screens/PlaylistScreen.tsx

Nguồn: [mở file](../src/screens/PlaylistScreen.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại     | Nội dung / mẫu hiển thị                                                      |
| ---- | -------- | ---------------------------------------------------------------------------- |
| 46   | title    | {state.value?.playlist.name &#124;&#124; "Playlist"}                         |
| 69   | message  | {state.error &#124;&#124; action.error}                                      |
| 78   | Nội dung | {state.value.playlist.description &#124;&#124; "Bộ sưu tập âm nhạc của bạn"} |
| 82   | Nội dung | {songs.length} bài hát khả dụng                                              |
| 91   | title    | Thêm bài hát                                                                 |
| 97   | title    | Thử lại                                                                      |

## src/screens/PlaylistsScreen.tsx

Nguồn: [mở file](../src/screens/PlaylistsScreen.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại               | Nội dung / mẫu hiển thị                                                                      |
| ---- | ------------------ | -------------------------------------------------------------------------------------------- |
| 47   | title              | {playlist.name}                                                                              |
| 48   | subtitle           | {user?.displayName &#124;&#124; "Người dùng"} · Playlist · {playlist.songIds.length} bài hát |
| 57   | aria-label         | Thao tác với {playlist.name}                                                                 |
| 88   | title              | Playlist của bạn                                                                             |
| 93   | aria-label         | Tạo Playlist                                                                                 |
| 113  | message            | {action.error} ⟪hoặc⟫                                                                        |
| 117  | message            | Tạo Playlist đầu tiên để lưu những bài hát bạn muốn nghe cùng nhau.                          |
| 128  | title              | Chỉnh sửa Playlist ⟪hoặc⟫ Playlist mới ⟪hoặc⟫ {selected?.name &#124;&#124; "Playlist"}       |
| 137  | message            | {action.error}                                                                               |
| 141  | label              | Tên Playlist                                                                                 |
| 142  | value              | {name}                                                                                       |
| 148  | label              | Mô tả                                                                                        |
| 149  | value              | {description}                                                                                |
| 159  | Nội dung           | Công khai                                                                                    |
| 161  | accessibilityLabel | Công khai Playlist                                                                           |
| 168  | title              | Lưu thay đổi ⟪hoặc⟫ Tạo Playlist                                                             |
| 194  | title              | Chỉnh sửa Playlist                                                                           |
| 200  | title              | Riêng tư ⟪hoặc⟫ Công khai                                                                    |
| 218  | title              | Thêm bài hát                                                                                 |
| 227  | title              | Xóa Playlist                                                                                 |
| 232  | Chuỗi / thông báo  | Thao tác này sẽ xóa vĩnh viễn Playlist này. Bạn có chắc chắn muốn tiếp tục không?            |
| 239  | Chuỗi / thông báo  | Xóa Playlist?                                                                                |

## src/screens/PremiumScreen.tsx

Nguồn: [mở file](../src/screens/PremiumScreen.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại     | Nội dung / mẫu hiển thị                                                                                                                                                         |
| ---- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 7    | title    | Premium                                                                                                                                                                         |
| 8    | Nội dung | Premium là tính năng dự kiến phát triển trong tương lai và chưa được hỗ trợ trong phiên bản hiện tại. Bạn vẫn có thể trải nghiệm các chức năng của ứng dụng hoàn toàn miễn phí. |
| 12   | title    | Tiếp tục nghe nhạc                                                                                                                                                              |

## src/screens/ProfileScreen.tsx

Nguồn: [mở file](../src/screens/ProfileScreen.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại       | Nội dung / mẫu hiển thị                                           |
| ---- | ---------- | ----------------------------------------------------------------- |
| 19   | title      | Hồ sơ                                                             |
| 29   | aria-label | Đổi ảnh đại diện                                                  |
| 41   | Nội dung   | Địa chỉ email: {form.user?.email}                                 |
| 42   | Nội dung   | Follower: {form.followerCount} · Following: {form.followingCount} |
| 47   | label      | Tên hiển thị                                                      |
| 48   | value      | {form.name}                                                       |
| 54   | label      | Tiểu sử                                                           |
| 55   | value      | {form.biography}                                                  |
| 60   | message    | {form.error}                                                      |
| 62   | title      | Lưu hồ sơ                                                         |
| 67   | title      | Đăng xuất                                                         |

## src/screens/PublicProfileScreen.tsx

Nguồn: [mở file](../src/screens/PublicProfileScreen.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại     | Nội dung / mẫu hiển thị                                      |
| ---- | -------- | ------------------------------------------------------------ |
| 21   | title    | Hồ sơ người dùng                                             |
| 22   | message  | {state.error}                                                |
| 24   | title    | Làm mới hồ sơ                                                |
| 34   | Nội dung | {state.profile.name}                                         |
| 35   | Nội dung | Người dùng · {state.profile.followerCount} người theo dõi    |
| 38   | Nội dung | {state.profile.biography &#124;&#124; "Chưa có giới thiệu."} |
| 44   | message  | Hồ sơ không còn khả dụng.                                    |

## src/screens/SearchScreen.tsx

Nguồn: [mở file](../src/screens/SearchScreen.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị                                                                   |
| ---- | ----------------- | ----------------------------------------------------------------------------------------- |
| 31   | Nhãn cấu hình     | Bài hát                                                                                   |
| 32   | Nhãn cấu hình     | Album                                                                                     |
| 33   | Nhãn cấu hình     | Nghệ sĩ                                                                                   |
| 119  | Chuỗi / thông báo | Nội dung không còn khả dụng.                                                              |
| 135  | Chuỗi / thông báo | Không thể mở nội dung. Kiểm tra kết nối hoặc quyền truy cập rồi thử lại.                  |
| 146  | title             | Tìm kiếm                                                                                  |
| 152  | value             | {keyword}                                                                                 |
| 162  | Nội dung          | Tìm kiếm gần đây                                                                          |
| 165  | title             | Xóa tất cả                                                                                |
| 173  | message           | {history.error &#124;&#124; openError}                                                    |
| 176  | title             | Thử lại                                                                                   |
| 188  | title             | {item.title}                                                                              |
| 189  | subtitle          | Bài hát · {item.subtitle} ⟪hoặc⟫ Album · {item.subtitle} ⟪hoặc⟫ Nghệ sĩ                   |
| 208  | aria-label        | Xóa {item.title} khỏi tìm kiếm gần đây                                                    |
| 222  | message           | Chưa có tìm kiếm gần đây. Tìm và mở Bài hát, Album hoặc Nghệ sĩ để lưu lại.               |
| 230  | title             | Tìm kiếm                                                                                  |
| 239  | value             | {keyword}                                                                                 |
| 251  | message           | {history.error}                                                                           |
| 252  | Nội dung          | Đã tải {results.length} kết quả cho “{keyword}” ⟪hoặc⟫ Khám phá Bài hát, Album và Nghệ sĩ |
| 263  | Nội dung          | Bài hát                                                                                   |
| 275  | title             | {artist.name}                                                                             |
| 276  | subtitle          | Người dùng ⟪hoặc⟫ Nghệ sĩ · {artist.followerCount ?? 0} người theo dõi                    |
| 296  | title             | {album.title}                                                                             |
| 297  | subtitle          | Album · {album.artistName}                                                                |
| 312  | message           | Không có kết quả phù hợp. Hãy thử từ khóa khác hoặc ngắn hơn.                             |

## src/screens/SongScreen.tsx

Nguồn: [mở file](../src/screens/SongScreen.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại     | Nội dung / mẫu hiển thị                                                                       |
| ---- | -------- | --------------------------------------------------------------------------------------------- |
| 30   | message  | {error}                                                                                       |
| 44   | title    | Song                                                                                          |
| 45   | Nội dung | Bài hát không còn khả dụng hoặc đang tải.                                                     |
| 49   | title    | {song.title}                                                                                  |
| 52   | Nội dung | {song.artist}                                                                                 |
| 54   | Nội dung | Album: {song.album &#124;&#124; "Chưa có"} Thời lượng: {formatDuration(song.durationSeconds)} |
| 59   | title    | Phát bài hát                                                                                  |
| 69   | title    | Xem nghệ sĩ                                                                                   |
| 80   | title    | Lời bài hát                                                                                   |

## src/screens/UploadSongScreen.tsx

Nguồn: [mở file](../src/screens/UploadSongScreen.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị                                |
| ---- | ----------------- | ------------------------------------------------------ |
| 38   | Nhãn cấu hình     | Công khai                                              |
| 39   | Nhãn cấu hình     | Hiển thị trong tìm kiếm, Charts và đề xuất.            |
| 43   | Nhãn cấu hình     | Riêng tư                                               |
| 44   | Nhãn cấu hình     | Chỉ bạn được xem trong ứng dụng.                       |
| 59   | Chuỗi / thông báo | Music lover                                            |
| 126  | Chuỗi / thông báo | Phiên đăng nhập đã thay đổi.                           |
| 130  | Chuỗi / thông báo | Đăng nhập và chọn file âm thanh trước.                 |
| 133  | Chuỗi / thông báo | Nhập tên bài hát.                                      |
| 144  | Chuỗi / thông báo | Nhập từ 1 đến 10 tên nghệ sĩ, mỗi tên tối đa 80 ký tự. |
| 155  | Chuỗi / thông báo | Đang tải file...                                       |
| 170  | Chuỗi / thông báo | Máy chủ chưa trả về thời lượng âm thanh hợp lệ.        |
| 190  | Chuỗi / thông báo | Đang lưu bài hát...                                    |
| 207  | Chuỗi / thông báo | Đã đăng tải bài hát.                                   |
| 215  | title             | Đăng tải bài hát                                       |
| 224  | title             | Thay file: {audio.name} ⟪hoặc⟫ Chọn file âm thanh      |
| 240  | title             | Chọn ảnh bìa từ Album ảnh                              |
| 248  | label             | Tên bài hát *                                          |
| 249  | value             | {title}                                                |
| 255  | label             | Artist * (ngăn cách bằng dấu phẩy)                     |
| 256  | value             | {artists}                                              |
| 261  | Nội dung          | Genre *                                                |
| 263  | title             | {genres.join(", ")} ⟪hoặc⟫ Chọn thể loại               |
| 272  | title             | Chọn thể loại                                          |
| 273  | description       | {genres.length}/10 thể loại đã chọn                    |
| 298  | Nội dung          | {value}                                                |
| 306  | Nội dung          | Album                                                  |
| 308  | aria-label        | Đóng tạo Album mới ⟪hoặc⟫ Tạo Album mới                |
| 338  | Nội dung          | Không thuộc album                                      |
| 372  | Nội dung          | {album.title}                                          |
| 384  | label             | Tên Album mới                                          |
| 385  | value             | {newAlbum}                                             |
| 393  | label             | Mô tả                                                  |
| 394  | value             | {description}                                          |
| 401  | label             | Lời bài hát                                            |
| 402  | value             | {lyric}                                                |
| 408  | Nội dung          | Quyền riêng tư                                         |
| 426  | Nội dung          | {option.title}                                         |
| 430  | Nội dung          | {option.note}                                          |
| 441  | message           | {action.error}                                         |
| 443  | Nội dung          | {message}                                              |
| 446  | title             | Đang lưu... ⟪hoặc⟫ Lưu                                 |

## src/screens/UserPlaylistsScreen.tsx

Nguồn: [mở file](../src/screens/UserPlaylistsScreen.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại    | Nội dung / mẫu hiển thị              |
| ---- | ------- | ------------------------------------ |
| 11   | title   | Playlist công khai                   |
| 18   | message | {state.error}                        |
| 27   | message | Chưa có Playlist công khai khả dụng. |

## src/screens/WelcomeScreen.tsx

Nguồn: [mở file](../src/screens/WelcomeScreen.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại     | Nội dung / mẫu hiển thị |
| ---- | -------- | ----------------------- |
| 39   | Nội dung | Your music Your artists |
| 49   | message  | {error}                 |
| 51   | title    | Tạo tài khoản           |
| 55   | title    | Tôi đã có tài khoản     |

## src/components/AlbumFavoriteButton.tsx

Nguồn: [mở file](../src/components/AlbumFavoriteButton.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại       | Nội dung / mẫu hiển thị                   |
| ---- | ---------- | ----------------------------------------- |
| 8    | aria-label | Bỏ yêu thích Album ⟪hoặc⟫ Yêu thích Album |

## src/components/AppFrame.tsx

Nguồn: [mở file](../src/components/AppFrame.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị  |
| ---- | ----------------- | ------------------------ |
| 47   | message           | {data.errors.join("\n")} |
| 60   | Chuỗi / thông báo | Home                     |
| 61   | Chuỗi / thông báo | Search                   |
| 62   | Chuỗi / thông báo | Feed                     |
| 63   | Chuỗi / thông báo | Library                  |
| 79   | aria-label        | {label}                  |
| 87   | Nội dung          | {label}                  |

## src/components/discovery/ArtistAvatar.tsx

Nguồn: [mở file](../src/components/discovery/ArtistAvatar.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại     | Nội dung / mẫu hiển thị |
| ---- | -------- | ----------------------- |
| 44   | Nội dung | {initials}              |

## src/components/discovery/ArtistCard.tsx

Nguồn: [mở file](../src/components/discovery/ArtistCard.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại       | Nội dung / mẫu hiển thị   |
| ---- | ---------- | ------------------------- |
| 27   | aria-label | Xem nghệ sĩ {artist.name} |
| 45   | Nội dung   | {artist.name}             |

## src/components/discovery/ChartCard.tsx

Nguồn: [mở file](../src/components/discovery/ChartCard.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại       | Nội dung / mẫu hiển thị                                      |
| ---- | ---------- | ------------------------------------------------------------ |
| 18   | aria-label | Mở chart {chart.title} {chart.subtitle}                      |
| 30   | Nội dung   | {chart.description &#124;&#124; "Danh sách được tuyển chọn"} |

## src/components/discovery/ChartCover.tsx

Nguồn: [mở file](../src/components/discovery/ChartCover.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại     | Nội dung / mẫu hiển thị |
| ---- | -------- | ----------------------- |
| 50   | Nội dung | {chart.title}           |
| 63   | Nội dung | {chart.subtitle}        |

## src/components/discovery/FollowButton.tsx

Nguồn: [mở file](../src/components/discovery/FollowButton.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại       | Nội dung / mẫu hiển thị                     |
| ---- | ---------- | ------------------------------------------- |
| 25   | title      | Unfollow ⟪hoặc⟫ Follow                      |
| 34   | message    | {action.error}                              |
| 41   | aria-label | Bỏ theo dõi nghệ sĩ ⟪hoặc⟫ Theo dõi nghệ sĩ |
| 61   | Nội dung   | Unfollow ⟪hoặc⟫ Follow                      |
| 72   | message    | {action.error}                              |

## src/components/HomeDiscovery.tsx

Nguồn: [mở file](../src/components/HomeDiscovery.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại       | Nội dung / mẫu hiển thị                                                                 |
| ---- | ---------- | --------------------------------------------------------------------------------------- |
| 35   | title      | {title}                                                                                 |
| 71   | message    | {message}                                                                               |
| 98   | message    | {error}                                                                                 |
| 101  | title      | Suggestions for you                                                                     |
| 105  | message    | Chưa thể tải gợi ý. Vui lòng kiểm tra kết nối. ⟪hoặc⟫ Chưa có bài hát để gợi ý cho bạn. |
| 116  | title      | {song.title}                                                                            |
| 117  | subtitle   | {song.artist}                                                                           |
| 129  | title      | Charts                                                                                  |
| 133  | message    | Chưa thể tải bảng xếp hạng. ⟪hoặc⟫ Chưa có bài hát công khai để tạo bảng xếp hạng.      |
| 152  | title      | Album thịnh hành                                                                        |
| 156  | message    | Chưa thể tải Album. ⟪hoặc⟫ Chưa có Album được phát hành.                                |
| 164  | aria-label | Mở Album {album.title}, {album.artistName}                                              |
| 171  | Nội dung   | {album.title}                                                                           |
| 172  | Nội dung   | {album.artistName}                                                                      |
| 179  | title      | Popular artists                                                                         |
| 183  | message    | Chưa thể tải nghệ sĩ. ⟪hoặc⟫ Chưa có nghệ sĩ có bài hát công khai.                      |

## src/components/LoadMore.tsx

Nguồn: [mở file](../src/components/LoadMore.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại    | Nội dung / mẫu hiển thị |
| ---- | ------- | ----------------------- |
| 19   | message | {error}                 |
| 26   | title   | Thử lại ⟪hoặc⟫ Tải thêm |

## src/components/MediaCoverCard.tsx

Nguồn: [mở file](../src/components/MediaCoverCard.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại       | Nội dung / mẫu hiển thị  |
| ---- | ---------- | ------------------------ |
| 27   | aria-label | Phát {title}, {subtitle} |
| 38   | Nội dung   | {title}                  |
| 41   | Nội dung   | {subtitle}               |

## src/components/MediaRow.tsx

Nguồn: [mở file](../src/components/MediaRow.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại       | Nội dung / mẫu hiển thị |
| ---- | ---------- | ----------------------- |
| 23   | aria-label | {title}                 |
| 33   | Nội dung   | {title}                 |
| 34   | Nội dung   | {subtitle}              |

## src/components/MiniPlayer.tsx

Nguồn: [mở file](../src/components/MiniPlayer.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại       | Nội dung / mẫu hiển thị                        |
| ---- | ---------- | ---------------------------------------------- |
| 38   | aria-label | Mở trình phát: {song.title}, {song.artist}     |
| 48   | Nội dung   | {song.title}                                   |
| 49   | Nội dung   | {song.artist}                                  |
| 53   | aria-label | Bỏ yêu thích ⟪hoặc⟫ Yêu thích bài hát          |
| 65   | aria-label | Đang tải nhạc ⟪hoặc⟫ Tạm dừng ⟪hoặc⟫ Phát nhạc |
| 86   | message    | {favorites.error}                              |

## src/components/PlaylistRow.tsx

Nguồn: [mở file](../src/components/PlaylistRow.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại     | Nội dung / mẫu hiển thị                                |
| ---- | -------- | ------------------------------------------------------ |
| 10   | title    | {item.name}                                            |
| 11   | subtitle | {item.ownerName} · Playlist · {item.songCount} bài hát |

## src/components/PlaylistsSection.tsx

Nguồn: [mở file](../src/components/PlaylistsSection.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại     | Nội dung / mẫu hiển thị |
| ---- | -------- | ----------------------- |
| 13   | message  | {state.error}           |
| 16   | Nội dung | Playlist                |
| 28   | title    | Xem tất cả Playlist     |

## src/components/RelatedArtistsSection.tsx

Nguồn: [mở file](../src/components/RelatedArtistsSection.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại       | Nội dung / mẫu hiển thị   |
| ---- | ---------- | ------------------------- |
| 16   | message    | {state.error}             |
| 19   | Nội dung   | {state.value.title}       |
| 38   | aria-label | Xem nghệ sĩ {artist.name} |
| 41   | Nội dung   | {artist.name}             |

## src/components/SongRow.tsx

Nguồn: [mở file](../src/components/SongRow.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị                                                                                                                 |
| ---- | ----------------- | --------------------------------------------------------------------------------------------------------------------------------------- |
| 34   | Chuỗi / thông báo | Gỡ khỏi playlist                                                                                                                        |
| 81   | aria-label        | Phát {song.title}, {song.artist}                                                                                                        |
| 92   | Nội dung          | {song.title}                                                                                                                            |
| 95   | Nội dung          | {song.artist}                                                                                                                           |
| 98   | Nội dung          | {formatDuration(song.durationSeconds)}                                                                                                  |
| 108  | aria-label        | Thao tác với {song.title}                                                                                                               |
| 114  | message           | {error} ⟪hoặc⟫                                                                                                                          |
| 121  | title             | Xóa bài hát? ⟪hoặc⟫ Thêm vào Playlist ⟪hoặc⟫ {song.title}                                                                               |
| 128  | description       | Bài hát sẽ được gỡ khỏi ứng dụng. Lịch sử và số liệu vẫn được giữ lại. Bạn có chắc chắn muốn tiếp tục không? ⟪hoặc⟫ {song.title} ⟪hoặc⟫ |
| 136  | message           | {error}                                                                                                                                 |
| 139  | title             | Xóa bài hát                                                                                                                             |
| 156  | title             | {removeLabel}                                                                                                                           |
| 165  | title             | Bỏ yêu thích ⟪hoặc⟫ Yêu thích                                                                                                           |
| 172  | title             | Playlist                                                                                                                                |
| 181  | title             | Chi tiết bài hát                                                                                                                        |
| 192  | title             | Đổi ảnh bìa                                                                                                                             |
| 207  | Chuỗi / thông báo | Phiên đăng nhập đã thay đổi.                                                                                                            |
| 220  | Chuỗi / thông báo | Phiên đăng nhập đã thay đổi.                                                                                                            |
| 232  | title             | Xóa bài hát                                                                                                                             |
| 243  | value             | {playlistQuery}                                                                                                                         |
| 248  | placeholder       | Tìm Playlist của bạn                                                                                                                    |
| 255  | title             | {playlist.name} · Gỡ khỏi Playlist ⟪hoặc⟫ {playlist.name} · {playlist.songIds.length} bài hát                                           |
| 277  | title             | Tạo Playlist trước                                                                                                                      |
| 285  | Nội dung          | Không tìm thấy Playlist.                                                                                                                |
| 290  | title             | Trang trước                                                                                                                             |
| 296  | title             | Trang tiếp                                                                                                                              |
| 307  | title             | Quay lại thao tác                                                                                                                       |

## src/components/ui/BackButton.tsx

Nguồn: [mở file](../src/components/ui/BackButton.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại       | Nội dung / mẫu hiển thị |
| ---- | ---------- | ----------------------- |
| 19   | aria-label | Quay lại                |

## src/components/ui/Button.tsx

Nguồn: [mở file](../src/components/ui/Button.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại       | Nội dung / mẫu hiển thị |
| ---- | ---------- | ----------------------- |
| 41   | aria-label | {title}                 |
| 56   | Nội dung   | {title}                 |

## src/components/ui/Feedback.tsx

Nguồn: [mở file](../src/components/ui/Feedback.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại       | Nội dung / mẫu hiển thị |
| ---- | ---------- | ----------------------- |
| 5    | Nội dung   | {message}               |
| 21   | aria-label | Đang tải                |
| 22   | Nội dung   | Đang tải...             |
| 29   | Nội dung   | {message}               |

## src/components/ui/Field.tsx

Nguồn: [mở file](../src/components/ui/Field.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại       | Nội dung / mẫu hiển thị |
| ---- | ---------- | ----------------------- |
| 36   | aria-label | {label}                 |

## src/components/ui/FilterBar.tsx

Nguồn: [mở file](../src/components/ui/FilterBar.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại       | Nội dung / mẫu hiển thị |
| ---- | ---------- | ----------------------- |
| 25   | aria-label | {option.label}          |
| 33   | Nội dung   | {option.label}          |

## src/components/ui/Image.tsx

Nguồn: [mở file](../src/components/ui/Image.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại               | Nội dung / mẫu hiển thị |
| ---- | ------------------ | ----------------------- |
| 31   | accessibilityLabel | {accessibilityLabel}    |

## src/components/ui/ListPage.tsx

Nguồn: [mở file](../src/components/ui/ListPage.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại  | Nội dung / mẫu hiển thị |
| ---- | ----- | ----------------------- |
| 68   | title | {title}                 |

## src/components/ui/ModalPanel.tsx

Nguồn: [mở file](../src/components/ui/ModalPanel.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại       | Nội dung / mẫu hiển thị |
| ---- | ---------- | ----------------------- |
| 59   | Nội dung   | {title}                 |
| 68   | aria-label | Đóng                    |
| 72   | Nội dung   | {description}           |

## src/components/ui/Page.tsx

Nguồn: [mở file](../src/components/ui/Page.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại  | Nội dung / mẫu hiển thị |
| ---- | ----- | ----------------------- |
| 45   | title | {title}                 |

## src/components/ui/ScreenHeader.tsx

Nguồn: [mở file](../src/components/ui/ScreenHeader.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại     | Nội dung / mẫu hiển thị |
| ---- | -------- | ----------------------- |
| 17   | Nội dung | {title}                 |

## src/components/ui/SearchField.tsx

Nguồn: [mở file](../src/components/ui/SearchField.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị     |
| ---- | ----------------- | --------------------------- |
| 10   | Chuỗi / thông báo | Tìm bài hát, nghệ sĩ, Album |
| 38   | value             | {value}                     |
| 40   | placeholder       | {placeholder}               |
| 41   | aria-label        | {placeholder}               |
| 50   | aria-label        | Xóa từ khóa                 |

## src/components/ui/SectionHeading.tsx

Nguồn: [mở file](../src/components/ui/SectionHeading.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại       | Nội dung / mẫu hiển thị |
| ---- | ---------- | ----------------------- |
| 19   | Nội dung   | {title}                 |
| 26   | aria-label | Xem tất cả {title}      |
| 28   | Nội dung   | See all                 |

## src/app/_layout.tsx

Nguồn: [mở file](../src/app/_layout.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại     | Nội dung / mẫu hiển thị   |
| ---- | -------- | ------------------------- |
| 33   | title    | Thiết lập Firebase        |
| 34   | Nội dung | {getFirebaseSetupError()} |

## src/app/album-add.tsx

Nguồn: [mở file](../src/app/album-add.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại    | Nội dung / mẫu hiển thị |
| ---- | ------- | ----------------------- |
| 12   | title   | Thêm bài hát            |
| 13   | message | Thiếu ID album.         |

## src/app/album.tsx

Nguồn: [mở file](../src/app/album.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại    | Nội dung / mẫu hiển thị |
| ---- | ------- | ----------------------- |
| 17   | title   | Album                   |
| 18   | message | Thiếu ID album.         |

## src/app/comments.tsx

Nguồn: [mở file](../src/app/comments.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại    | Nội dung / mẫu hiển thị |
| ---- | ------- | ----------------------- |
| 15   | title   | Bình luận               |
| 18   | message | Thiếu ID bài đăng.      |

## src/app/song.tsx

Nguồn: [mở file](../src/app/song.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại    | Nội dung / mẫu hiển thị |
| ---- | ------- | ----------------------- |
| 14   | title   | Bài hát                 |
| 15   | message | Thiếu ID bài hát.       |

## src/contexts/AlbumFavoritesContext.tsx

Nguồn: [mở file](../src/contexts/AlbumFavoritesContext.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị      |
| ---- | ----------------- | ---------------------------- |
| 146  | Chuỗi / thông báo | Thiếu AlbumFavoritesProvider |

## src/contexts/AuthContext.tsx

Nguồn: [mở file](../src/contexts/AuthContext.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị |
| ---- | ----------------- | ----------------------- |
| 74   | Chuỗi / thông báo | Thiếu AuthProvider      |

## src/contexts/DataContext.tsx

Nguồn: [mở file](../src/contexts/DataContext.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị |
| ---- | ----------------- | ----------------------- |
| 123  | Chuỗi / thông báo | Following songs:{id}    |
| 124  | Chuỗi / thông báo | Following songs:{id}    |
| 137  | Chuỗi / thông báo | Song:{id}               |
| 147  | Chuỗi / thông báo | Cần đăng nhập.          |
| 148  | Chuỗi / thông báo | Thiếu ID bài hát.       |
| 156  | Chuỗi / thông báo | Bài hát không tồn tại.  |
| 286  | Chuỗi / thông báo | Following songs:        |
| 288  | Chuỗi / thông báo | Following songs:{id}:   |
| 349  | Chuỗi / thông báo | Thiếu DataProvider      |
| 354  | Chuỗi / thông báo | Thiếu DataProvider      |

## src/contexts/PlayerContext.tsx

Nguồn: [mở file](../src/contexts/PlayerContext.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị                                                    |
| ---- | ----------------- | -------------------------------------------------------------------------- |
| 82   | Chuỗi / thông báo | Bài hát chưa có URL âm thanh hợp lệ.                                       |
| 134  | Chuỗi / thông báo | Âm thanh chưa tải được sau 15 giây. Kiểm tra URL, mạng hoặc CORS trên web. |
| 245  | Chuỗi / thông báo | Thiếu PlayerProvider                                                       |
| 250  | Chuỗi / thông báo | Thiếu PlayerProvider                                                       |
| 255  | Chuỗi / thông báo | Thiếu PlayerProvider                                                       |

## src/contexts/ThemeContext.tsx

Nguồn: [mở file](../src/contexts/ThemeContext.tsx). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị                             |
| ---- | ----------------- | --------------------------------------------------- |
| 31   | Chuỗi / thông báo | Không đọc được cài đặt giao diện.                   |
| 44   | Chuỗi / thông báo | Không lưu được cài đặt giao diện. Vui lòng thử lại. |
| 63   | Chuỗi / thông báo | Thiếu AppThemeProvider                              |

## src/hooks/useAuthForm.ts

Nguồn: [mở file](../src/hooks/useAuthForm.ts). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị                                                 |
| ---- | ----------------- | ----------------------------------------------------------------------- |
| 34   | Chuỗi / thông báo | Tài khoản đã tạo, nhưng hồ sơ chưa lưu. Bạn có thể lưu lại trong Hồ sơ. |
| 41   | Chuỗi / thông báo | Nếu email phù hợp, hướng dẫn đặt lại mật khẩu sẽ được gửi.              |

## src/hooks/useBackendResource.ts

Nguồn: [mở file](../src/hooks/useBackendResource.ts). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị |
| ---- | ----------------- | ----------------------- |
| 29   | Chuỗi / thông báo | Cần đăng nhập.          |

## src/hooks/useCursorList.ts

Nguồn: [mở file](../src/hooks/useCursorList.ts). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị |
| ---- | ----------------- | ----------------------- |
| 19   | Chuỗi / thông báo | Cần đăng nhập.          |

## src/hooks/useProfileForm.ts

Nguồn: [mở file](../src/hooks/useProfileForm.ts). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị      |
| ---- | ----------------- | ---------------------------- |
| 57   | Chuỗi / thông báo | Đã lưu hồ sơ.                |
| 62   | Chuỗi / thông báo | Cần đăng nhập.               |
| 71   | Chuỗi / thông báo | Phiên đăng nhập đã thay đổi. |
| 84   | Chuỗi / thông báo | Phiên đăng nhập đã thay đổi. |
| 91   | Chuỗi / thông báo | Đã lưu ảnh đại diện.         |

## src/hooks/useUserPlaylists.ts

Nguồn: [mở file](../src/hooks/useUserPlaylists.ts). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị |
| ---- | ----------------- | ----------------------- |
| 19   | Chuỗi / thông báo | Cần đăng nhập.          |

## src/services/authService.ts

Nguồn: [mở file](../src/services/authService.ts). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị |
| ---- | ----------------- | ----------------------- |
| 55   | Chuỗi / thông báo | Nhập email trước.       |
| 63   | Chuỗi / thông báo | Cần đăng nhập.          |
| 65   | Chuỗi / thông báo | tên hiển thị            |
| 66   | Chuỗi / thông báo | ảnh đại diện            |

## src/services/backendService.ts

Nguồn: [mở file](../src/services/backendService.ts). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị                |
| ---- | ----------------- | -------------------------------------- |
| 28   | Chuỗi / thông báo | Cần đăng nhập.                         |
| 31   | Chuỗi / thông báo | Chưa cấu hình EXPO_PUBLIC_BACKEND_URL. |
| 34   | Chuỗi / thông báo | Phiên đăng nhập đã thay đổi.           |
| 56   | Chuỗi / thông báo | Backend: {response.status}             |
| 60   | Chuỗi / thông báo | Phiên đăng nhập đã thay đổi.           |
| 72   | Chuỗi / thông báo | Cần đăng nhập.                         |
| 75   | Chuỗi / thông báo | Chưa cấu hình EXPO_PUBLIC_BACKEND_URL. |
| 83   | Chuỗi / thông báo | Phiên đăng nhập đã thay đổi.           |
| 94   | Chuỗi / thông báo | Backend: {response.status}             |
| 98   | Chuỗi / thông báo | Phiên đăng nhập đã thay đổi.           |

## src/services/catalogService.ts

Nguồn: [mở file](../src/services/catalogService.ts). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị |
| ---- | ----------------- | ----------------------- |
| 95   | Chuỗi / thông báo | ảnh                     |
| 126  | Chuỗi / thông báo | Cần đăng nhập.          |

## src/services/feedService.ts

Nguồn: [mở file](../src/services/feedService.ts). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị      |
| ---- | ----------------- | ---------------------------- |
| 10   | Chuỗi / thông báo | Phiên đăng nhập đã thay đổi. |
| 22   | Chuỗi / thông báo | nội dung                     |
| 30   | Chuỗi / thông báo | nội dung                     |
| 46   | Chuỗi / thông báo | bình luận                    |
| 55   | Chuỗi / thông báo | bình luận                    |

## src/services/firebase/auth.native.ts

Nguồn: [mở file](../src/services/firebase/auth.native.ts). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị                                              |
| ---- | ----------------- | -------------------------------------------------------------------- |
| 17   | Chuỗi / thông báo | Firebase Auth requires EXPO_PUBLIC_FIREBASE_* environment variables. |

## src/services/firebase/auth.ts

Nguồn: [mở file](../src/services/firebase/auth.ts). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị                                              |
| ---- | ----------------- | -------------------------------------------------------------------- |
| 10   | Chuỗi / thông báo | Firebase Auth requires EXPO_PUBLIC_FIREBASE_* environment variables. |

## src/services/firebase/config.ts

Nguồn: [mở file](../src/services/firebase/config.ts). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị                                                  |
| ---- | ----------------- | ------------------------------------------------------------------------ |
| 33   | Chuỗi / thông báo | Cấu hình Firebase không hợp lệ.                                          |
| 50   | Chuỗi / thông báo | Firebase project đã thay đổi. Khởi động lại app để tránh lẫn môi trường. |

## src/services/firebase/runtime.ts

Nguồn: [mở file](../src/services/firebase/runtime.ts). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị                                                                                               |
| ---- | ----------------- | --------------------------------------------------------------------------------------------------------------------- |
| 38   | Chuỗi / thông báo | Thiếu hoặc sai {name}. Xem README.md (mục Chạy local).                                                                |
| 49   | Chuỗi / thông báo | Chọn Firebase mode rõ ràng: npm run start:local hoặc EXPO_PUBLIC_FIREBASE_MODE=cloud. Xem README.md (mục Chạy local). |
| 59   | Chuỗi / thông báo | Local chỉ dùng demo-music-stream và host loopback/LAN hợp lệ; không kết nối cloud.                                    |
| 82   | Chuỗi / thông báo | Backend local phải là http://&lt;EMULATOR_HOST&gt;:&lt;port&gt;, không có path hoặc credentials.                      |
| 105  | Chuỗi / thông báo | Cloud mode không được chứa cấu hình Emulator.                                                                         |
| 119  | Chuỗi / thông báo | Cloud mode cần đầy đủ Firebase Web config của project thật.                                                           |
| 132  | Chuỗi / thông báo | Backend cloud cần HTTPS origin hợp lệ.                                                                                |
| 144  | Chuỗi / thông báo | Upload Cloudinary đã tắt trong local. Dùng audio demo và artwork fallback của fixture.                                |

## src/services/historyPageService.ts

Nguồn: [mở file](../src/services/historyPageService.ts). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị      |
| ---- | ----------------- | ---------------------------- |
| 22   | Chuỗi / thông báo | Phiên đăng nhập đã thay đổi. |
| 45   | Chuỗi / thông báo | Phiên đăng nhập đã thay đổi. |
| 67   | Chuỗi / thông báo | Phiên đăng nhập đã thay đổi. |

## src/services/historyService.ts

Nguồn: [mở file](../src/services/historyService.ts). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị  |
| ---- | ----------------- | ------------------------ |
| 13   | Chuỗi / thông báo | Playback account changed |

## src/services/libraryService.ts

Nguồn: [mở file](../src/services/libraryService.ts). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị       |
| ---- | ----------------- | ----------------------------- |
| 53   | Chuỗi / thông báo | Phiên đăng nhập đã thay đổi.  |
| 101  | Chuỗi / thông báo | Không thể tự theo dõi.        |
| 106  | Chuỗi / thông báo | Cần đăng nhập đúng tài khoản. |
| 115  | Chuỗi / thông báo | Phiên đăng nhập đã thay đổi.  |

## src/services/mediaUploadService.ts

Nguồn: [mở file](../src/services/mediaUploadService.ts). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị                                          |
| ---- | ----------------- | ---------------------------------------------------------------- |
| 23   | Chuỗi / thông báo | File local phải được chọn từ thiết bị, không phải URL bên ngoài. |
| 27   | Chuỗi / thông báo | Cần đăng nhập và cấu hình backend.                               |
| 30   | Chuỗi / thông báo | Phiên đăng nhập đã thay đổi.                                     |
| 48   | Chuỗi / thông báo | image                                                            |
| 48   | Chuỗi / thông báo | Ảnh tối đa 5 MB.                                                 |
| 48   | Chuỗi / thông báo | Nhạc tối đa 30 MB.                                               |
| 54   | Chuỗi / thông báo | Phiên đăng nhập đã thay đổi.                                     |
| 63   | Chuỗi / thông báo | File vượt giới hạn dung lượng.                                   |
| 76   | Chuỗi / thông báo | File vượt giới hạn dung lượng.                                   |
| 96   | Chuỗi / thông báo | Phiên đăng nhập đã thay đổi.                                     |
| 115  | Chuỗi / thông báo | Không tải được file.                                             |
| 120  | Chuỗi / thông báo | Phiên đăng nhập đã thay đổi.                                     |

## src/services/playlistSubscriptions.ts

Nguồn: [mở file](../src/services/playlistSubscriptions.ts). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị |
| ---- | ----------------- | ----------------------- |
| 51   | Chuỗi / thông báo | Cursor playlist bị lặp. |

## src/services/prepareImageUpload.ts

Nguồn: [mở file](../src/services/prepareImageUpload.ts). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị                                                                       |
| ---- | ----------------- | --------------------------------------------------------------------------------------------- |
| 28   | Chuỗi / thông báo | Missing encoded image                                                                         |
| 36   | Chuỗi / thông báo | Ảnh sau chuyển đổi vượt 5 MB. Hãy chọn ảnh nhỏ hơn.                                           |
| 48   | Chuỗi / thông báo | vượt 5 MB                                                                                     |
| 51   | Chuỗi / thông báo | Không đọc hoặc chuyển đổi được ảnh này trên thiết bị. Hãy xuất ảnh sang JPG/PNG rồi chọn lại. |

## src/services/stageAudioUpload.ts

Nguồn: [mở file](../src/services/stageAudioUpload.ts). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị                                                                       |
| ---- | ----------------- | --------------------------------------------------------------------------------------------- |
| 22   | Chuỗi / thông báo | File vượt giới hạn dung lượng.                                                                |
| 26   | Chuỗi / thông báo | vượt giới hạn                                                                                 |
| 29   | Chuỗi / thông báo | Không đọc được file âm thanh đã chọn. Hãy chọn lại file từ trình chọn tài liệu trên thiết bị. |

## src/services/uploadsService.ts

Nguồn: [mở file](../src/services/uploadsService.ts). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị                          |
| ---- | ----------------- | ------------------------------------------------ |
| 12   | Chuỗi / thông báo | Cần đăng nhập.                                   |
| 15   | Chuỗi / thông báo | Phiên tải danh sách đã kết thúc.                 |
| 32   | Chuỗi / thông báo | Không thể tải đủ danh sách bài hát. Hãy thử lại. |

## src/utils/feedback.ts

Nguồn: [mở file](../src/utils/feedback.ts). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị                                              |
| ---- | ----------------- | -------------------------------------------------------------------- |
| 3    | Chuỗi / thông báo | Tài khoản của bạn đã bị vô hiệu hóa.                                 |
| 4    | Chuỗi / thông báo | Email hoặc mật khẩu không đúng.                                      |
| 5    | Chuỗi / thông báo | Email đã được đăng ký.                                               |
| 6    | Chuỗi / thông báo | Email không hợp lệ.                                                  |
| 7    | Chuỗi / thông báo | Mật khẩu chưa đủ mạnh.                                               |
| 8    | Chuỗi / thông báo | Bật Email/Password trên Firebase Console.                            |
| 10   | Chuỗi / thông báo | Chưa khởi tạo Authentication hoặc config sai project.                |
| 11   | Chuỗi / thông báo | Quá nhiều yêu cầu. Vui lòng thử lại sau.                             |
| 13   | Chuỗi / thông báo | Không đủ quyền. Kiểm tra đăng nhập, custom claim và Firestore Rules. |
| 14   | Chuỗi / thông báo | Không thể kết nối Firebase. Hãy kiểm tra mạng.                       |
| 18   | Chuỗi / thông báo | Thao tác thất bại.                                                   |
| 22   | Chuỗi / thông báo | Thông báo                                                            |
| 27   | Chuỗi / thông báo | Xác nhận                                                             |
| 33   | Nhãn cấu hình     | Hủy                                                                  |
| 34   | Nhãn cấu hình     | Xóa                                                                  |

## src/utils/genres.ts

Nguồn: [mở file](../src/utils/genres.ts). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị                    |
| ---- | ----------------- | ------------------------------------------ |
| 2    | Chuỗi / thông báo | Pop                                        |
| 3    | Chuỗi / thông báo | Rock                                       |
| 4    | Chuỗi / thông báo | Indie                                      |
| 5    | Chuỗi / thông báo | Acoustic                                   |
| 6    | Chuỗi / thông báo | Ballad                                     |
| 7    | Chuỗi / thông báo | R&amp;B                                    |
| 8    | Chuỗi / thông báo | Hip-hop/Rap                                |
| 9    | Chuỗi / thông báo | EDM                                        |
| 10   | Chuỗi / thông báo | Jazz                                       |
| 11   | Chuỗi / thông báo | Blues                                      |
| 12   | Chuỗi / thông báo | Classical                                  |
| 13   | Chuỗi / thông báo | Country                                    |
| 14   | Chuỗi / thông báo | Folk                                       |
| 15   | Chuỗi / thông báo | Latin                                      |
| 16   | Chuỗi / thông báo | Reggae                                     |
| 17   | Chuỗi / thông báo | Bolero                                     |
| 18   | Chuỗi / thông báo | Nhạc dân gian                              |
| 19   | Chuỗi / thông báo | Nhạc không lời                             |
| 20   | Chuỗi / thông báo | Khác                                       |
| 30   | Chuỗi / thông báo | Chọn từ 1 đến 10 thể loại trong danh sách. |

## src/utils/pager.ts

Nguồn: [mở file](../src/utils/pager.ts). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị |
| ---- | ----------------- | ----------------------- |
| 54   | Chuỗi / thông báo | Không thể tải dữ liệu.  |

## src/utils/recommendations.ts

Nguồn: [mở file](../src/utils/recommendations.ts). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại          | Nội dung / mẫu hiển thị                        |
| ---- | ------------- | ---------------------------------------------- |
| 55   | Nhãn cấu hình | Top 50                                         |
| 57   | Nhãn cấu hình | Tuyển tập 50 bài {genre} được nghe nhiều nhất. |

## src/utils/searchHistory.ts

Nguồn: [mở file](../src/utils/searchHistory.ts). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị                          |
| ---- | ----------------- | ------------------------------------------------ |
| 16   | Chuỗi / thông báo | Invalid history                                  |
| 85   | Chuỗi / thông báo | Invalid history                                  |
| 104  | Chuỗi / thông báo | Không thể đọc/lưu tìm kiếm gần đây. Hãy thử lại. |

## src/utils/subscriptions.ts

Nguồn: [mở file](../src/utils/subscriptions.ts). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị                        |
| ---- | ----------------- | ---------------------------------------------- |
| 114  | Chuỗi / thông báo | Phiên dữ liệu hoặc quyền truy cập đã thay đổi. |

## src/utils/validation.ts

Nguồn: [mở file](../src/utils/validation.ts). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại              | Nội dung / mẫu hiển thị                                       |
| ---- | ----------------- | ------------------------------------------------------------- |
| 8    | Chuỗi / thông báo | Vui lòng nhập {label}.                                        |
| 10   | Chuỗi / thông báo | {label} không được vượt quá {max} ký tự.                      |
| 25   | Chuỗi / thông báo | {label} phải là URL HTTPS hợp lệ, không phải đường dẫn D:\... |
| 49   | Chuỗi / thông báo | tên hiển thị                                                  |
| 51   | Chuỗi / thông báo | Email chưa hợp lệ.                                            |
| 52   | Chuỗi / thông báo | Mật khẩu phải có ít nhất 8 ký tự.                             |
| 53   | Chuỗi / thông báo | Hai mật khẩu không khớp.                                      |

## app.json

Nguồn: [mở file](../app.json). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại             | Nội dung / mẫu hiển thị        |
| ---- | ---------------- | ------------------------------ |
| 3    | Tên ứng dụng     | music_stream_app               |
| 21   | photosPermission | Cho phép chọn ảnh bìa bài hát. |

## tools/backend/access-routes.cjs

Nguồn: [mở file](../tools/backend/access-routes.cjs). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại                         | Nội dung / mẫu hiển thị     |
| ---- | ---------------------------- | --------------------------- |
| 5    | Thông báo backend / ứng viên | ID không hợp lệ.            |
| 14   | Thông báo backend / ứng viên | Hồ sơ không còn khả dụng.   |
| 30   | Thông báo backend / ứng viên | Loại nội dung không hợp lệ. |

## tools/backend/album-routes.cjs

Nguồn: [mở file](../tools/backend/album-routes.cjs). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại                         | Nội dung / mẫu hiển thị                                        |
| ---- | ---------------------------- | -------------------------------------------------------------- |
| 16   | Thông báo backend / ứng viên | Thuộc tính album không hợp lệ.                                 |
| 28   | Thông báo backend / ứng viên | Tên, mô tả, ảnh hoặc trạng thái album không hợp lệ.            |
| 36   | Thông báo backend / ứng viên | Ảnh album phải là URL HTTPS.                                   |
| 53   | Thông báo backend / ứng viên | ID album không hợp lệ.                                         |
| 71   | Thông báo backend / ứng viên | Tài khoản không hoạt động.                                     |
| 83   | Thông báo backend / ứng viên | Yêu cầu đã được sử dụng cho album khác hoặc album đã thay đổi. |
| 97   | Thông báo backend / ứng viên | Không tìm thấy album.                                          |
| 99   | Thông báo backend / ứng viên | Bạn không sở hữu album này.                                    |
| 100  | Thông báo backend / ứng viên | Album đang được xóa.                                           |
| 146  | Thông báo backend / ứng viên | ID album hoặc bài hát không hợp lệ.                            |
| 156  | Thông báo backend / ứng viên | Tài khoản không hoạt động.                                     |
| 158  | Thông báo backend / ứng viên | Album hoặc bài hát không tồn tại.                              |
| 163  | Thông báo backend / ứng viên | Bạn không sở hữu album hoặc bài hát này.                       |
| 166  | Thông báo backend / ứng viên | Album đang được xóa.                                           |
| 168  | Thông báo backend / ứng viên | Bài hát không còn hoạt động.                                   |
| 170  | Thông báo backend / ứng viên | Bài hát đã thuộc album khác.                                   |
| 185  | Thông báo backend / ứng viên | ID album không hợp lệ.                                         |
| 194  | Thông báo backend / ứng viên | Tài khoản không hoạt động.                                     |
| 197  | Thông báo backend / ứng viên | Bạn không sở hữu album này.                                    |
| 211  | Thông báo backend / ứng viên | Tài khoản không hoạt động.                                     |
| 214  | Thông báo backend / ứng viên | Bạn không sở hữu album này.                                    |
| 221  | Thông báo backend / ứng viên | Album có liên kết dữ liệu không hợp lệ. Vui lòng thử lại sau.  |
| 248  | Thông báo backend / ứng viên | Album có nhiều bài. Vui lòng thử xóa lại để tiếp tục.          |

## tools/backend/audio-assets.cjs

Nguồn: [mở file](../tools/backend/audio-assets.cjs). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại                         | Nội dung / mẫu hiển thị                             |
| ---- | ---------------------------- | --------------------------------------------------- |
| 9    | Thông báo backend / ứng viên | Backend chưa cấu hình Cloudinary để xác minh audio. |
| 27   | Thông báo backend / ứng viên | Audio không thuộc vùng tải lên của bạn.             |
| 41   | Thông báo backend / ứng viên | Không xác minh được audio. Hãy thử lại.             |
| 46   | Thông báo backend / ứng viên | Không xác minh được audio trên Cloudinary.          |
| 57   | Thông báo backend / ứng viên | File audio hoặc metadata không hợp lệ.              |
| 77   | Thông báo backend / ứng viên | Đường dẫn audio Cloudinary không hợp lệ.            |

## tools/backend/catalog-read.cjs

Nguồn: [mở file](../tools/backend/catalog-read.cjs). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại                         | Nội dung / mẫu hiển thị     |
| ---- | ---------------------------- | --------------------------- |
| 20   | Thông báo backend / ứng viên | Nguồn catalog không hợp lệ. |
| 23   | Thông báo backend / ứng viên | pageSize phải từ 1 đến 50.  |
| 26   | Thông báo backend / ứng viên | ID không hợp lệ.            |
| 42   | Thông báo backend / ứng viên | Không còn theo dõi nghệ sĩ. |

## tools/backend/create-request.cjs

Nguồn: [mở file](../tools/backend/create-request.cjs). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại                         | Nội dung / mẫu hiển thị       |
| ---- | ---------------------------- | ----------------------------- |
| 6    | Thông báo backend / ứng viên | Idempotency key không hợp lệ. |

## tools/backend/favorite-albums.cjs

Nguồn: [mở file](../tools/backend/favorite-albums.cjs). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại                         | Nội dung / mẫu hiển thị    |
| ---- | ---------------------------- | -------------------------- |
| 59   | Thông báo backend / ứng viên | ID album không hợp lệ.     |
| 64   | Thông báo backend / ứng viên | Tài khoản không hoạt động. |
| 70   | Thông báo backend / ứng viên | Album không còn khả dụng.  |
| 74   | Thông báo backend / ứng viên | Không có quyền xem album.  |

## tools/backend/feed-routes.cjs

Nguồn: [mở file](../tools/backend/feed-routes.cjs). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại                         | Nội dung / mẫu hiển thị                     |
| ---- | ---------------------------- | ------------------------------------------- |
| 7    | Thông báo backend / ứng viên | ID không hợp lệ.                            |
| 22   | Thông báo backend / ứng viên | Nội dung không hợp lệ.                      |
| 26   | Thông báo backend / ứng viên | Bài hát không hợp lệ.                       |
| 38   | Thông báo backend / ứng viên | Kích thước trang không hợp lệ.              |
| 43   | Thông báo backend / ứng viên | Bài đăng không còn khả dụng.                |
| 46   | Thông báo backend / ứng viên | Bài đăng không còn khả dụng.                |
| 55   | Thông báo backend / ứng viên | Cursor không còn khả dụng. Hãy tải lại.     |
| 93   | Thông báo backend / ứng viên | Người dùng                                  |
| 116  | Thông báo backend / ứng viên | Idempotency key không hợp lệ.               |
| 139  | Thông báo backend / ứng viên | Tài khoản không hoạt động.                  |
| 148  | Thông báo backend / ứng viên | Yêu cầu đã được sử dụng cho nội dung khác.  |
| 155  | Thông báo backend / ứng viên | Bài đăng không còn khả dụng.                |
| 164  | Thông báo backend / ứng viên | Bài đăng không còn khả dụng.                |
| 170  | Thông báo backend / ứng viên | Nội dung không còn khả dụng.                |
| 173  | Thông báo backend / ứng viên | Chỉ chủ sở hữu được thay đổi nội dung.      |
| 175  | Thông báo backend / ứng viên | Bài đăng đã được gỡ.                        |
| 179  | Thông báo backend / ứng viên | Bài hát không còn khả dụng.                 |
| 188  | Thông báo backend / ứng viên | Chỉ chia sẻ bài hát công khai còn khả dụng. |

## tools/backend/follow-graph.cjs

Nguồn: [mở file](../tools/backend/follow-graph.cjs). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại                         | Nội dung / mẫu hiển thị                                           |
| ---- | ---------------------------- | ----------------------------------------------------------------- |
| 5    | Thông báo backend / ứng viên | Invalid follow graph limit.                                       |
| 20   | Thông báo backend / ứng viên | Follow graph capacity exceeded; refusing partial recommendations. |
| 39   | Thông báo backend / ứng viên | Follow graph sample must be between 1 and 50.                     |

## tools/backend/history-read.cjs

Nguồn: [mở file](../tools/backend/history-read.cjs). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại                         | Nội dung / mẫu hiển thị      |
| ---- | ---------------------------- | ---------------------------- |
| 55   | Thông báo backend / ứng viên | Cursor lịch sử không hợp lệ. |

## tools/backend/http-app.cjs

Nguồn: [mở file](../tools/backend/http-app.cjs). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại                         | Nội dung / mẫu hiển thị               |
| ---- | ---------------------------- | ------------------------------------- |
| 39   | Thông báo backend / ứng viên | case sensitive routing                |
| 40   | Thông báo backend / ứng viên | strict routing                        |
| 49   | Thông báo backend / ứng viên | Origin không được phép.               |
| 59   | Thông báo backend / ứng viên | Origin không được phép.               |
| 98   | Thông báo backend / ứng viên | PATCH                                 |
| 98   | Thông báo backend / ứng viên | DELETE                                |
| 102  | Thông báo backend / ứng viên | PUT                                   |
| 102  | Thông báo backend / ứng viên | DELETE                                |
| 109  | Thông báo backend / ứng viên | PATCH                                 |
| 109  | Thông báo backend / ứng viên | DELETE                                |
| 113  | Thông báo backend / ứng viên | PUT                                   |
| 113  | Thông báo backend / ứng viên | DELETE                                |
| 124  | Thông báo backend / ứng viên | PUT                                   |
| 124  | Thông báo backend / ứng viên | DELETE                                |
| 128  | Thông báo backend / ứng viên | PUT                                   |
| 128  | Thông báo backend / ứng viên | DELETE                                |
| 132  | Thông báo backend / ứng viên | Method not allowed                    |
| 162  | Thông báo backend / ứng viên | Authentication required               |
| 166  | Thông báo backend / ứng viên | Invalid token                         |
| 171  | Thông báo backend / ứng viên | Index chưa sẵn sàng. Hãy thử lại.     |
| 175  | Thông báo backend / ứng viên | Quá nhiều yêu cầu.                    |
| 190  | Thông báo backend / ứng viên | Tài khoản của bạn đã bị vô hiệu hóa.  |
| 201  | Thông báo backend / ứng viên | Tài khoản của bạn đã bị vô hiệu hóa.  |
| 208  | Thông báo backend / ứng viên | Tài khoản của bạn đã bị vô hiệu hóa.  |
| 215  | Thông báo backend / ứng viên | Music lover                           |
| 248  | Thông báo backend / ứng viên | Method not allowed                    |
| 267  | Thông báo backend / ứng viên | Not found                             |
| 278  | Thông báo backend / ứng viên | Không thể xử lý yêu cầu. Hãy thử lại. |

## tools/backend/image-assets.cjs

Nguồn: [mở file](../tools/backend/image-assets.cjs). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại                         | Nội dung / mẫu hiển thị                                          |
| ---- | ---------------------------- | ---------------------------------------------------------------- |
| 10   | Thông báo backend / ứng viên | Backend chưa cấu hình Cloudinary cho ảnh.                        |
| 70   | Thông báo backend / ứng viên | URL ảnh không hợp lệ.                                            |
| 81   | Thông báo backend / ứng viên | Ảnh mới phải được tải lên bằng backend.                          |
| 86   | Thông báo backend / ứng viên | Ảnh không thuộc vùng tải lên của bạn.                            |
| 106  | Thông báo backend / ứng viên | Không xác minh được ảnh. Hãy thử lại.                            |
| 111  | Thông báo backend / ứng viên | Không xác minh được ảnh trên Cloudinary.                         |
| 130  | Thông báo backend / ứng viên | Ảnh hoặc metadata không hợp lệ (tối đa 5 MB, ảnh tĩnh).          |
| 144  | Thông báo backend / ứng viên | Ảnh đã thay đổi, hãy tải lại.                                    |
| 169  | Thông báo backend / ứng viên | Ảnh hết hạn hoặc không có phiên tải lên hợp lệ. Hãy tải ảnh lại. |
| 172  | Thông báo backend / ứng viên | Ảnh có quá nhiều liên kết.                                       |
| 221  | Thông báo backend / ứng viên | Cloudinary chưa xóa được ảnh.                                    |
| 223  | Thông báo backend / ứng viên | not found                                                        |
| 224  | Thông báo backend / ứng viên | Cloudinary chưa xác nhận xóa ảnh.                                |
| 259  | Thông báo backend / ứng viên | Không kiểm tra được ảnh trước khi dọn.                           |
| 266  | Thông báo backend / ứng viên | Metadata ảnh không khớp khi dọn.                                 |

## tools/backend/inspect-audio.cjs

Nguồn: [mở file](../tools/backend/inspect-audio.cjs). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại                         | Nội dung / mẫu hiển thị                                                                   |
| ---- | ---------------------------- | ----------------------------------------------------------------------------------------- |
| 7    | Thông báo backend / ứng viên | Đang xác minh audio khác. Hãy thử lại.                                                    |
| 17   | Thông báo backend / ứng viên | Không đọc được audio trên Cloudinary. Hãy thử lại.                                        |
| 23   | Thông báo backend / ứng viên | Audio tối đa 30 MB.                                                                       |
| 28   | Thông báo backend / ứng viên | Audio tối đa 30 MB.                                                                       |
| 32   | Thông báo backend / ứng viên | File audio đã thay đổi. Hãy thử lưu lại.                                                  |
| 39   | Thông báo backend / ứng viên | Không đọc được audio trên Cloudinary. Hãy thử lại.                                        |
| 48   | Thông báo backend / ứng viên | Unsupported audio format                                                                  |
| 64   | Thông báo backend / ứng viên | Not an audio-only file                                                                    |
| 69   | Thông báo backend / ứng viên | Không đọc được audio hợp lệ hoặc file chứa video (MP3/WAV/FLAC/OGG/M4A, tối đa 180 phút). |

## tools/backend/local-media.cjs

Nguồn: [mở file](../tools/backend/local-media.cjs). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại                         | Nội dung / mẫu hiển thị                                                |
| ---- | ---------------------------- | ---------------------------------------------------------------------- |
| 19   | Thông báo backend / ứng viên | Đường dẫn media local không hợp lệ.                                    |
| 26   | Thông báo backend / ứng viên | File local không còn tồn tại.                                          |
| 29   | Thông báo backend / ứng viên | File không thuộc tài khoản hoặc loại media này.                        |
| 31   | Thông báo backend / ứng viên | File local không còn tồn tại.                                          |
| 36   | Thông báo backend / ứng viên | Cloud không nhận file local.                                           |
| 50   | Thông báo backend / ứng viên | File local không còn tồn tại.                                          |
| 65   | Thông báo backend / ứng viên | Loại upload không hợp lệ.                                              |
| 66   | Thông báo backend / ứng viên | Đang xử lý upload khác. Hãy thử lại.                                   |
| 69   | Thông báo backend / ứng viên | Tài khoản không hoạt động.                                             |
| 70   | Thông báo backend / ứng viên | Đang xử lý upload khác. Hãy thử lại.                                   |
| 85   | Thông báo backend / ứng viên | File quá lớn hoặc multipart không hợp lệ.                              |
| 89   | Thông báo backend / ứng viên | Chưa chọn file.                                                        |
| 99   | Thông báo backend / ứng viên | Định dạng chưa hỗ trợ. Audio: MP3/WAV/FLAC/OGG/M4A; ảnh: JPG/PNG/WebP. |
| 120  | Thông báo backend / ứng viên | Không đọc được metadata audio hoặc file chứa video.                    |
| 124  | Thông báo backend / ứng viên | Thời lượng audio không hợp lệ hoặc vượt 180 phút.                      |
| 128  | Thông báo backend / ứng viên | Tài khoản không hoạt động.                                             |

## tools/backend/playback-policy.cjs

Nguồn: [mở file](../tools/backend/playback-policy.cjs). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại                         | Nội dung / mẫu hiển thị                      |
| ---- | ---------------------------- | -------------------------------------------- |
| 2    | Thông báo backend / ứng viên | Telemetry phát nhạc không hợp lệ.            |
| 60   | Thông báo backend / ứng viên | Telemetry sai thứ tự. Hãy gửi lại gói trước. |

## tools/backend/playback-routes.cjs

Nguồn: [mở file](../tools/backend/playback-routes.cjs). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại                         | Nội dung / mẫu hiển thị                          |
| ---- | ---------------------------- | ------------------------------------------------ |
| 29   | Thông báo backend / ứng viên | Phiên playback không hợp lệ.                     |
| 40   | Thông báo backend / ứng viên | Phiên đã thuộc bài khác.                         |
| 42   | Thông báo backend / ứng viên | Phiên đã hết hạn. Hãy bắt đầu phiên mới.         |
| 44   | Thông báo backend / ứng viên | Máy chủ playback đang bận.                       |
| 64   | Thông báo backend / ứng viên | Tài khoản không hoạt động.                       |
| 66   | Thông báo backend / ứng viên | Bài hát không còn khả dụng.                      |
| 71   | Thông báo backend / ứng viên | Không có quyền nghe bài hát.                     |
| 74   | Thông báo backend / ứng viên | Thời lượng bài hát không hợp lệ.                 |
| 79   | Thông báo backend / ứng viên | Không thể khôi phục phiên cũ. Hãy tạo phiên mới. |
| 86   | Thông báo backend / ứng viên | Phiên mới phải bắt đầu với telemetry rỗng.       |
| 120  | Thông báo backend / ứng viên | Phiên playback không còn hợp lệ.                 |

## tools/backend/playlist-read.cjs

Nguồn: [mở file](../tools/backend/playlist-read.cjs). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại                         | Nội dung / mẫu hiển thị      |
| ---- | ---------------------------- | ---------------------------- |
| 10   | Thông báo backend / ứng viên | Playlist không còn khả dụng. |
| 14   | Thông báo backend / ứng viên | Playlist không còn khả dụng. |
| 80   | Thông báo backend / ứng viên | ID không hợp lệ.             |
| 86   | Thông báo backend / ứng viên | pageSize phải từ 1 đến 50.   |
| 116  | Thông báo backend / ứng viên | pageSize phải từ 1 đến 20.   |
| 119  | Thông báo backend / ứng viên | Hồ sơ không còn khả dụng.    |

## tools/backend/playlist-routes.cjs

Nguồn: [mở file](../tools/backend/playlist-routes.cjs). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại                         | Nội dung / mẫu hiển thị                                              |
| ---- | ---------------------------- | -------------------------------------------------------------------- |
| 12   | Thông báo backend / ứng viên | ID không hợp lệ.                                                     |
| 35   | Thông báo backend / ứng viên | Tên, mô tả hoặc trạng thái playlist không hợp lệ.                    |
| 56   | Thông báo backend / ứng viên | Tài khoản không hoạt động.                                           |
| 62   | Thông báo backend / ứng viên | Yêu cầu đã được sử dụng cho playlist khác hoặc playlist đã thay đổi. |
| 68   | Thông báo backend / ứng viên | Không tìm thấy playlist của bạn.                                     |
| 91   | Thông báo backend / ứng viên | Bài hát không còn khả dụng.                                          |
| 101  | Thông báo backend / ứng viên | Không có quyền thêm bài hát này.                                     |
| 104  | Thông báo backend / ứng viên | Playlist tối đa 50 bài.                                              |

## tools/backend/profile-api.cjs

Nguồn: [mở file](../tools/backend/profile-api.cjs). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại                         | Nội dung / mẫu hiển thị              |
| ---- | ---------------------------- | ------------------------------------ |
| 11   | Thông báo backend / ứng viên | Yêu cầu dữ liệu JSON.                |
| 16   | Thông báo backend / ứng viên | Dữ liệu quá lớn.                     |
| 23   | Thông báo backend / ứng viên | JSON không hợp lệ.                   |
| 33   | Thông báo backend / ứng viên | Thuộc tính hồ sơ không hợp lệ.       |
| 44   | Thông báo backend / ứng viên | Tên, ảnh hoặc tiểu sử không hợp lệ.  |
| 52   | Thông báo backend / ứng viên | Ảnh đại diện phải là URL HTTPS.      |
| 73   | Thông báo backend / ứng viên | Không tìm thấy hồ sơ.                |
| 76   | Thông báo backend / ứng viên | Tài khoản của bạn đã bị vô hiệu hóa. |
| 104  | Thông báo backend / ứng viên | Không tìm thấy hồ sơ.                |

## tools/backend/profiles.cjs

Nguồn: [mở file](../tools/backend/profiles.cjs). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại                         | Nội dung / mẫu hiển thị                                                                                        |
| ---- | ---------------------------- | -------------------------------------------------------------------------------------------------------------- |
| 15   | Thông báo backend / ứng viên | Profile migration is not completed; inspect the migration marker before starting.                              |
| 20   | Thông báo backend / ứng viên | Legacy publicProfiles found. Stop writers, back up and migrate counters to users before starting this backend. |

## tools/backend/related-artists.cjs

Nguồn: [mở file](../tools/backend/related-artists.cjs). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại                         | Nội dung / mẫu hiển thị   |
| ---- | ---------------------------- | ------------------------- |
| 20   | Thông báo backend / ứng viên | Người hâm mộ cũng thích   |
| 34   | Thông báo backend / ứng viên | Có thể bạn thích          |
| 34   | Thông báo backend / ứng viên | Khám phá nghệ sĩ          |
| 49   | Thông báo backend / ứng viên | ID không hợp lệ.          |
| 52   | Thông báo backend / ứng viên | Hồ sơ không còn khả dụng. |

## tools/backend/service.cjs

Nguồn: [mở file](../tools/backend/service.cjs). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại                         | Nội dung / mẫu hiển thị                                                              |
| ---- | ---------------------------- | ------------------------------------------------------------------------------------ |
| 139  | Thông báo backend / ứng viên | Follow graph capacity exceeded; refusing partial recommendations.                    |
| 151  | Thông báo backend / ứng viên | Legacy album schema found; run target schema migration before starting this backend. |
| 168  | Thông báo backend / ứng viên | Legacy song schema found; run target schema migration before starting this backend.  |
| 235  | Thông báo backend / ứng viên | Cursor không hợp lệ hoặc đã hết hạn. Hãy tải lại.                                    |
| 275  | Thông báo backend / ứng viên | pageSize phải từ 1 đến 20.                                                           |
| 283  | Thông báo backend / ứng viên | Quá nhiều kết quả. Hãy thêm từ khóa cụ thể hơn.                                      |
| 396  | Thông báo backend / ứng viên | Truy vấn/filter không hợp lệ.                                                        |
| 413  | Thông báo backend / ứng viên | Album không còn khả dụng.                                                            |
| 424  | Thông báo backend / ứng viên | Loại danh sách không hợp lệ.                                                         |
| 454  | Thông báo backend / ứng viên | Thiếu collection.                                                                    |
| 560  | Thông báo backend / ứng viên | Not found                                                                            |

## tools/backend/social-routes.cjs

Nguồn: [mở file](../tools/backend/social-routes.cjs). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại                         | Nội dung / mẫu hiển thị                              |
| ---- | ---------------------------- | ---------------------------------------------------- |
| 6    | Thông báo backend / ứng viên | ID không hợp lệ.                                     |
| 12   | Thông báo backend / ứng viên | Tài khoản không hoạt động.                           |
| 20   | Thông báo backend / ứng viên | pageSize phải từ 1 đến 50.                           |
| 45   | Thông báo backend / ứng viên | Bài hát không còn khả dụng.                          |
| 55   | Thông báo backend / ứng viên | Không có quyền nghe bài hát.                         |
| 68   | Thông báo backend / ứng viên | Không thể tự theo dõi.                               |
| 88   | Thông báo backend / ứng viên | Tài khoản không hoạt động.                           |
| 89   | Thông báo backend / ứng viên | Không tìm thấy nghệ sĩ.                              |
| 91   | Thông báo backend / ứng viên | Tài khoản này không còn hoạt động.                   |
| 93   | Thông báo backend / ứng viên | Hồ sơ chưa sẵn sàng. Hãy tải lại.                    |
| 102  | Thông báo backend / ứng viên | Số lượt theo dõi không nhất quán. Hãy tải lại hồ sơ. |

## tools/backend/song-create.cjs

Nguồn: [mở file](../tools/backend/song-create.cjs). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại                         | Nội dung / mẫu hiển thị                                     |
| ---- | ---------------------------- | ----------------------------------------------------------- |
| 27   | Thông báo backend / ứng viên | Thuộc tính bài hát không hợp lệ.                            |
| 34   | Thông báo backend / ứng viên | Thông tin {key} không hợp lệ.                               |
| 43   | Thông báo backend / ứng viên | ID không hợp lệ.                                            |
| 52   | Thông báo backend / ứng viên | Tên nghệ sĩ không hợp lệ.                                   |
| 54   | Thông báo backend / ứng viên | Quyền hoặc thể loại không hợp lệ.                           |
| 59   | Thông báo backend / ứng viên | Chọn 1–10 thể loại hợp lệ.                                  |
| 69   | Thông báo backend / ứng viên | Ảnh bìa phải là HTTPS.                                      |
| 97   | Thông báo backend / ứng viên | Metadata audio không hợp lệ.                                |
| 108  | Thông báo backend / ứng viên | Tài khoản không hoạt động.                                  |
| 118  | Thông báo backend / ứng viên | ID yêu cầu đã được sử dụng.                                 |
| 128  | Thông báo backend / ứng viên | Album không khả dụng hoặc không thuộc bạn.                  |
| 141  | Thông báo backend / ứng viên | Dữ liệu thời lượng cũ cần được kiểm tra trước khi tải thêm. |
| 146  | Thông báo backend / ứng viên | Bạn đã dùng hết hạn mức tải lên 180 phút.                   |

## tools/backend/song-owner-routes.cjs

Nguồn: [mở file](../tools/backend/song-owner-routes.cjs). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại                         | Nội dung / mẫu hiển thị       |
| ---- | ---------------------------- | ----------------------------- |
| 11   | Thông báo backend / ứng viên | ID bài hát không hợp lệ.      |
| 22   | Thông báo backend / ứng viên | Ảnh bìa không hợp lệ.         |
| 32   | Thông báo backend / ứng viên | Ảnh bìa phải là URL HTTPS.    |
| 50   | Thông báo backend / ứng viên | Tài khoản không hoạt động.    |
| 51   | Thông báo backend / ứng viên | Không tìm thấy bài hát.       |
| 53   | Thông báo backend / ứng viên | Bạn không sở hữu bài hát này. |
| 55   | Thông báo backend / ứng viên | Bài hát đã được gỡ.           |

## tools/backend/song-read.cjs

Nguồn: [mở file](../tools/backend/song-read.cjs). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại                         | Nội dung / mẫu hiển thị      |
| ---- | ---------------------------- | ---------------------------- |
| 6    | Thông báo backend / ứng viên | ID bài hát không hợp lệ.     |
| 9    | Thông báo backend / ứng viên | Bài hát không còn khả dụng.  |
| 13   | Thông báo backend / ứng viên | Bài hát không còn khả dụng.  |
| 15   | Thông báo backend / ứng viên | Không có quyền nghe bài hát. |

## tools/backend/song-upload-routes.cjs

Nguồn: [mở file](../tools/backend/song-upload-routes.cjs). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại                         | Nội dung / mẫu hiển thị             |
| ---- | ---------------------------- | ----------------------------------- |
| 12   | Thông báo backend / ứng viên | Local không tải ảnh ra Cloudinary.  |
| 15   | Thông báo backend / ứng viên | Tài khoản không hoạt động.          |
| 22   | Thông báo backend / ứng viên | Local không tải file ra Cloudinary. |

## tools/backend/uploads-routes.cjs

Nguồn: [mở file](../tools/backend/uploads-routes.cjs). Số dòng tham chiếu tại thời điểm trích xuất.

| Dòng | Loại                         | Nội dung / mẫu hiển thị              |
| ---- | ---------------------------- | ------------------------------------ |
| 22   | Thông báo backend / ứng viên | Tài khoản của bạn đã bị vô hiệu hóa. |
| 25   | Thông báo backend / ứng viên | ID album không hợp lệ.               |
| 28   | Thông báo backend / ứng viên | Không tìm thấy album của bạn.        |
| 61   | Thông báo backend / ứng viên | Từ khóa tối đa 150 ký tự.            |
| 93   | Thông báo backend / ứng viên | Bộ lọc album không hợp lệ.           |
| 96   | Thông báo backend / ứng viên | Từ khóa tối đa 150 ký tự.            |
