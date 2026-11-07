# Rà soát Screen, trạng thái giao diện và kế hoạch chỉnh sửa

Ngày: 07/11/2026. Đối tượng: working tree hiện tại, gồm những thay đổi local chưa commit. Đây là báo cáo và thiết kế đề xuất; đợt rà soát này không sửa implementation, stage, commit hoặc push. Giữ nguyên `PROJECT_REVIEW_2026-11-06.md`.

Tài liệu đi kèm: [Danh mục chữ hiển thị](APP_TEXT_CATALOG_2026-11-07.md), [Thiết kế AI](AI_DESIGN_2026-11-07.md).

## 1. Kết luận và phạm vi

Nên sửa cơ chế trạng thái dùng chung trước, rồi chỉnh từng Screen. Hiện có `Page`, `ListPage`, `MediaRow`, `Button`, `ModalPanel`, `LoadMore`, `useAction` và pager, nhưng các nơi gọi vẫn tự phối hợp loading, empty, lỗi và khóa nút. Vì vậy dùng cùng component chưa tạo ra hành vi đồng nhất.

Đã đối chiếu 31 file Screen, các route, component/hook/context/service liên quan, đường đọc catalog/profile và tìm kiếm backend, cấu hình triển khai và tài liệu. Kết luận dưới đây dựa trên phân tích tĩnh. Chưa chạy thao tác UI trên Android/Web trong đợt này; không coi các suy luận về kích thước trên thiết bị là lỗi đã tái hiện. Không phải kiểm toán bảo mật đầy đủ mọi endpoint.

Thứ tự đề nghị:

1. **P1 — tính đúng và khả năng thao tác:** giữ popup khi đổi quyền; refresh không xóa giao diện; trạng thái loading/error/empty rõ ràng; khóa thao tác xung đột; sửa nguồn dữ liệu hồ sơ và Album riêng tư.
2. **P2 — đồng nhất bố cục:** hàng media, header, section, modal, màn hình rộng và chữ lớn.
3. **P3 — hoàn thiện:** hiệu ứng nhẹ, biên tập chữ, tối ưu theo đo đạc. Không thêm memo hàng loạt trước khi sửa vòng đời dữ liệu.

## 2. Những phần đã có trong bản local — không làm lại từ đầu

| Phần            | Quan sát hiện tại                                                                                       | Còn cần nghiệm thu                                                                       |
| --------------- | ------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| ArtistProfile   | Một Loading phía trên tiêu đề Bài hát; footer `LoadMore` tắt spinner; tiêu đề nằm ngoài nhánh profile   | Refresh, lỗi, tải thêm và trường hợp chưa có bài                                         |
| Nút hồ sơ       | Hồ sơ bản thân ẩn Follow; nút Phát vẫn hiện nhưng disabled nếu chưa có bài; hai cột dùng flex bằng nhau | Tên dài, font lớn, lỗi Follow xuất hiện dưới nút                                         |
| Section rỗng    | `PublicPlaylistsSection`, `RelatedArtistsSection` trả null khi không có dữ liệu/lỗi                     | Khi dữ liệu đến muộn, section có thể xuất hiện làm thay đổi chiều cao                    |
| AlbumScreen     | Gộp loading metadata/danh sách trong một `LoadMore`                                                     | Retry metadata riêng, empty khi có lỗi vẫn cần sửa                                       |
| MyUploads       | Đã bỏ spinner danh sách trùng; thanh hạn mức có nền/viền ở 0%; nút vô hạn tải queue và bật repeatAll    | Spinner tải queue và tải thêm vẫn có thể cùng hiện; hạn mức là tác vụ riêng theo yêu cầu |
| Search          | Ảnh nghệ sĩ trong lịch sử 70px, radius 35                                                               | Khoảng cách hàng và nguồn ảnh lịch sử                                                    |
| Album yêu thích | Có `ready`, khóa theo ID, version bảo vệ kết quả refresh cũ; không khóa tất cả tim chỉ vì reload        | QA khi đổi tab, offline, nhấn nhanh                                                      |
| Feed/Comments   | Nút Làm mới không tự thêm spinner thứ hai; menu sửa nội dung ở trước Bình luận                          | Empty nháy và refresh xóa dữ liệu vẫn còn                                                |
| SongScreen      | Nền vùng Back và nội dung cùng token background                                                         | Header vẫn tổ chức khác các Screen còn lại                                               |

## 3. Lỗi/hành vi cần sửa, có căn cứ trong code

### P1-01 — Riêng tư/Công khai phải giữ popup đang mở

Nguồn: [PlaylistsScreen](../src/screens/PlaylistsScreen.tsx), nhánh `savePlaylist` ở menu actions; [MyAlbumsScreen](../src/screens/MyAlbumsScreen.tsx), nhánh PATCH `isPublic`. Cả hai gọi `setPanel(null)` sau thành công. Trong khi đó yêu thích/bỏ yêu thích ở [SongRow](../src/components/SongRow.tsx) giữ menu mở.

Yêu cầu thống nhất:

- Đổi quyền thành công: giữ popup, cập nhật `selected.isPublic` từ kết quả server hoặc patch local đã xác nhận; cập nhật danh sách phía sau.
- Nút tiếp theo phải phản ánh giá trị mới. Không chỉ bỏ `setPanel(null)`, vì `selected` là snapshot cũ và lần nhấn sau có thể gửi lại cùng giá trị.
- Đang đổi quyền: spinner trên đúng nút, khóa sửa/xóa/đổi quyền của cùng đối tượng; cho phép thao tác độc lập theo chính sách ở mục 5.
- Lỗi: giữ popup và trạng thái quyền cũ, hiển thị một lỗi tại popup, cho thử lại.
- Nên hiển thị dòng “Hiện tại: Công khai/Riêng tư” và nhãn hành động “Chuyển sang Riêng tư/Công khai”, tránh nhầm nhãn nút với trạng thái hiện tại.
- Phân biệt toggle với tạo/sửa/xóa: lưu form hoặc xóa thành công vẫn có thể đóng popup. Không áp dụng giữ popup cho tất cả hành động.

Nghiệm thu: đổi hai chiều liên tiếp không cần mở lại; hai lần gửi payload trái nhau; lỗi mạng không đổi nhãn sai; không tạo hai PATCH khi chạm nhanh.

### P1-02 — Refresh tạo pager mới, làm nội dung biến mất

Nguồn: [useBackendResource](../src/hooks/useBackendResource.ts), [useCursorList](../src/hooks/useCursorList.ts), [useFeedPage](../src/hooks/useFeedPage.ts), [pager](../src/utils/pager.ts).

`revision`/params đổi làm `useMemo` tạo pager mới với `items=[]`. Điều này giải thích hiện tượng ảnh/tiêu đề phụ, hàng hoặc số lượng biến mất rồi hiện lại. `useMemo` ở đây cần thiết để quản lý instance; lỗi nằm ở hợp đồng refresh, không phải do thiếu memo.

- Tách initial loading, refreshing, loadingMore. Refresh cùng resource/UID giữ dữ liệu cũ trong lúc lấy snapshot mới.
- Thay query hoặc UID phải xử lý khác refresh: không giữ dữ liệu người dùng cũ; không gắn kết quả cũ với nhãn query mới. Có thể giữ kết quả cũ nhưng phải ghi rõ đang cập nhật và vô hiệu hóa lựa chọn không còn tương ứng.
- Giữ generation guard và chặn request trùng đã có. Nếu thêm AbortSignal, lưu ý `backendGet` đang chia sẻ promise giữa nhiều consumer; một màn unmount không được hủy request của màn khác.
- ArtistProfile nút Làm mới hiện chỉ gọi `profile.refresh`; bài hát, Album, Playlist và gợi ý không cùng được refresh. Định nghĩa refresh cả hồ sơ hoặc đổi nhãn thành “Làm mới thông tin”.
- `usePublicProfile` dùng `${followingIds.includes(id)}:${followingIds.length}`: theo dõi người khác cũng gây reload hồ sơ đang xem. Chỉ invalidate phần liên quan; giữ hero trong lúc cập nhật số follower.

### P1-03 — Loading, lỗi và empty chưa có một nơi quyết định

Nguồn: [LoadMore](../src/components/LoadMore.tsx) tự render cả lỗi và spinner; nhiều Screen cũng render cùng lỗi ở header.

| Trường hợp                                                       | Bằng chứng / hệ quả                                                                                      | Sửa                                                                                                                            |
| ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Feed, Comments                                                   | Empty kiểm tra `!loading` nhưng không yêu cầu `started`; pager ban đầu loading=false, started=false      | Empty chỉ sau khi tải xong thành công; trước đó initial loading                                                                |
| History, MyUploads, Feed, Comments, DiscoveryList, UserPlaylists | Có ErrorText của pager ở header và `LoadMore` ở footer                                                   | Một nơi hiển thị lỗi theo phase; tránh hai thông báo giống nhau                                                                |
| Search lịch sử                                                   | Loading khi `opening` ở header, `history.loading` ở footer                                               | Spinner mở nội dung đặt trên hàng đang nhấn; lịch sử có loading riêng nhưng không biểu diễn hai tác vụ như hai loader toàn màn |
| MyUploads                                                        | `action.busy` tải queue ở header và `uploads.loading` ở footer có thể đồng thời                          | Queue có chỉ báo tại nút Phát/Lặp; spinner danh sách giữ một nơi; quota tách riêng                                             |
| AlbumAddSongs                                                    | Đợi `info.value` mới bật danh sách; không render loading/retry cho info                                  | Chỉ báo tải thông tin Album, lỗi có retry; sau đó tải danh sách                                                                |
| AlbumScreen                                                      | Empty chỉ xét không loading/không songs, không loại trừ info/data.error; retry của LoadMore chỉ tải data | Không báo “Album chưa có bài” khi API lỗi; retry đúng metadata hoặc danh sách                                                  |
| ArtistProfile                                                    | Empty bài hát chưa loại trừ `state.error`                                                                | Không đồng thời “Chưa có bài hát” và lỗi tải                                                                                   |
| Library                                                          | Loading footer dựa `data.loading`, chưa bao gồm lần đầu `albumFavorites` chưa ready                      | Theo dõi nguồn dữ liệu cần cho tab hiện tại, không báo thư viện rỗng trong lúc Album yêu thích chưa về                         |
| Playlists, Favorites                                             | `useData().loading` gộp nhiều nguồn                                                                      | Một nguồn không liên quan chưa xong không nên khiến danh sách đã sẵn sàng cứ quay                                              |

Hai spinner của hai tác vụ độc lập không tự động là lỗi. Mục tiêu là người dùng hiểu từng tác vụ và mỗi vùng dữ liệu chỉ có một chỉ báo; không gom cả ứng dụng vào một `busy`.

### P1-04 — Khóa nút không nhất quán và có thể làm mất bản nháp

Nguồn: [useAction](../src/hooks/useAction.ts) chặn nhấn trùng trong **một instance**, không điều phối mọi action trên màn. Các điểm cần chỉnh:

- **Feed:** Field nội dung, chọn/bỏ bài đính kèm và tìm kiếm còn sửa được khi submit. Request dùng dữ liệu đã chụp tại thời điểm gọi; sau thành công `setText("")` xóa cả phần vừa gõ thêm. Khóa form đang submit hoặc quản lý phiên bản draft rõ ràng.
- **Comments:** tương tự; Hủy sửa, mở menu và Sửa bình luận chưa cùng tuân theo busy. Đóng sheet lúc gửi còn được phép. Chọn một hành vi rõ: khóa form/ngăn thoát trong request ngắn, hoặc cho thoát nhưng lưu draft và quản lý tác vụ ngoài màn.
- **SongRow:** favorite có lock riêng, cover/delete có `action.busy`; Playlist, Chi tiết và `onRemove` không cùng sử dụng lock. Khi đổi cover vẫn có thể chuyển panel. Truyền trạng thái mutation từ parent cho gỡ khỏi Album/Playlist, thay vì đóng panel rồi gọi callback kiểu `() => void` không biết kết quả.
- **MyUploads:** khi tải queue, chuyển sang tab Album không unmount component cha nên `live.current` vẫn true; queue có thể phát sau khi người dùng đổi tab. Quy định giữ/hủy ý định phát, dùng operation token hoặc guard theo tab/focus.
- **Home, MyAlbums:** Làm mới chưa disabled khi đang tải, có thể tạo nhiều revision. `backendGet` chỉ dedup cùng key; params `refresh` khác tạo request khác. Đo network trước khi kết luận số lần fetch, vì Home có thể được dedup.
- **ChartScreen:** chia sẻ dùng `action.run` nên có chặn duplicate logic, nhưng nút không thể hiện disabled/busy. UI cần phản hồi đúng thao tác.
- **Profile:** `form.busy = action.busy || profile.loading`; nút Lưu quay cả khi đang lấy profile, chọn/lưu ảnh hoặc đăng xuất. **UploadSong:** lúc chọn file cũng đổi nhãn thành “Đang lưu...”. Cần `pendingAction` riêng.
- **ModalPanel:** close/overlay/back gọi `onClose`; việc chặn đang do caller tự viết. Dù callback chặn, nút Đóng vẫn trông bấm được. Thêm hợp đồng `dismissible`/busy và trạng thái trợ năng, xử lý cả nút, overlay, Android Back, keyboard escape theo platform.

### P1-05 — Một số UI sai do nguồn dữ liệu, không phải CSS

| Vị trí                         | Quan sát                                                                                                                                | Hướng chỉnh                                                                                                                                      |
| ------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| Home, UploadSong, PlaylistItem | Dùng Firebase Auth `displayName`; Profile lưu qua `/me` vào users. `ownProfile` không cập nhật Auth displayName                         | Dùng nguồn profile nghiệp vụ chung, invalidate sau save; tránh tên mới ở Profile nhưng tên cũ ở Home                                             |
| UploadSong                     | Lựa chọn Album từ `data.albums`; `/catalog/albums` chỉ trả Album công khai                                                              | Dùng `/my-albums` để chọn cả Album riêng tư của chủ sở hữu, có phân trang/tìm kiếm                                                               |
| ArtistProfile                  | Album đọc từ catalog context riêng, bài hát từ cursor; không cùng readiness/refresh                                                     | Quản lý trạng thái section, không kết luận không có Album khi catalog chưa tải xong                                                              |
| `/artist` và `/user`           | ArtistProfile có Bài hát/Album/Phát; PublicProfile không có các phần này                                                                | Chia sẻ cấu trúc ProfileHeader/ProfileSections; định nghĩa hiển thị theo nội dung/quyền, tránh cùng một người nhưng giao diện khác tùy đường vào |
| LyricsScreen                   | Chỉ `data.songs.find`, không gọi `useSongDetail(id)`                                                                                    | Deep link/reload trực tiếp có thể báo không tìm thấy khi bài chưa có trong catalog; tải theo ID và phân biệt loading/403/404/không có lyric      |
| Feed                           | Bài đính kèm tra `data.songs.find`, trong khi public seed backend giới hạn 20 và post songIds không nằm trong linkedKey của DataContext | Resolve metadata bài đính kèm theo ID/DTO từ feed; thiếu cache không đồng nghĩa đã bị xóa                                                        |
| Search history                 | Ảnh tra Map catalog, history chỉ giữ tên/phụ đề/ID                                                                                      | Ngoài catalog hiện có có thể hiện ảnh fallback dù media còn tồn tại; resolve preview theo ID, vẫn kiểm tra quyền khi mở                          |
| Comments                       | `{comments.length} bình luận` là số đã tải, có phân trang                                                                               | Ghi “Đã tải {count} bình luận” hoặc lấy total từ backend; refresh không đổi về 0 giả                                                             |

Nguồn backend: [catalog-read.cjs](../tools/backend/catalog-read.cjs), [profile-api.cjs](../tools/backend/profile-api.cjs). Không mặc định tất cả catalog đều chỉ có 20: giới hạn seed đó áp dụng public-songs; Album và nghệ sĩ có đường phân trang riêng.

### P1-06 — Cold start và thông báo mạng khiến loading trông bất thường

[backendService](../src/services/backendService.ts) timeout GET và phần lớn write là 15 giây; POST `/songs` cloud là 60 giây. Nó parse `response.json()` trước khi phân loại response, nên HTML hoặc body rỗng có thể biến thành lỗi parse khó hiểu.

Render Free có thể ngủ sau 15 phút không có traffic và mất khoảng một phút để khởi động lại. Điều đó dài hơn timeout GET hiện tại. [Nguồn Render](https://render.com/docs/free).

Thiết kế: trạng thái kết nối backend dùng chung, câu “Máy chủ đang khởi động, vui lòng thử lại”, retry GET có giới hạn/backoff, phân biệt timeout/offline/HTTP/JSON không hợp lệ. Không tự retry mutation có thể tạo dữ liệu trùng khi chưa có idempotency. Không cho mỗi Screen tự gọi health liên tục. Có thể cho tác vụ vượt ngưỡng hiển thị lời giải thích thay vì hai spinner; đo cold start thực tế để chọn ngưỡng.

## 4. Bố cục và thiết kế cần thống nhất

### P2-01 — Cùng kích thước ảnh chưa có nghĩa cùng kích thước hàng

Nguồn: [MediaRow](../src/components/MediaRow.tsx), [SongRow](../src/components/SongRow.tsx), [FollowButton](../src/components/discovery/FollowButton.tsx), [SearchScreen](../src/screens/SearchScreen.tsx).

- MediaRow marginVertical `2`; SongRow `1.5`. SongRow có ba dòng (tên, nghệ sĩ, thời lượng), MediaRow một/hai dòng. Trong Search, riêng Song còn thêm chữ “Bài hát” **bên ngoài** hàng; Album/nghệ sĩ đặt loại trong subtitle. Đây là nguyên nhân rõ của nhịp hàng không đều dù ảnh đều 70px.
- FollowButton compact có marginTop khi không truyền `inline`; các nơi trailing trong Search/Library/Discovery chưa truyền inline. Nút bên phải có thể lệch xuống. ErrorText trong wrapper cũng thay chiều cao nếu lỗi.
- Đề xuất một contract list row: ảnh 70×70; nghệ sĩ tròn, Album/Playlist/Song vuông bo góc; cùng padding dọc và gap ảnh–chữ, cùng baseline tiêu đề. Đặt loại nội dung trong subtitle hoặc cùng một vùng cố định cho mọi loại. Không ép card khám phá và ảnh hero về 70px.
- Vùng trailing tối thiểu đủ chạm 44–48px; canh tâm với ảnh, không thêm margin riêng. Lỗi của hàng đặt dưới toàn hàng, không đẩy lệch nút trong cột hẹp.
- Dùng minHeight thay height cứng, title tối đa hai dòng; QA font hệ thống lớn. Tránh chèn dòng trắng chỉ để bù chiều cao.

### P2-02 — Khoảng cách section, header và popup

- Chọn thang spacing quy đổi rõ sang px, ví dụ gap trong nhóm 8–12px, giữa các section 20–24px, gutter 20px. Tamagui token hiện tại phải được kiểm tra trước khi đổi; không giả định token `4` nghĩa 4px.
- Mỗi section tự quản nội dung; container cha quản khoảng cách giữa các section đang hiện. Không vừa marginBottom ở con vừa gap ở cha. Chỉ mount khối có nội dung, loading có chủ đích hoặc lỗi có retry.
- ArtistProfile giữ tiêu đề Bài hát và spinner phía trên theo yêu cầu; khi append có thể đổi nhãn spinner thành “Đang tải thêm bài hát”, không thêm một spinner footer nữa.
- `ModalPanel` render `Dialog.Description` ngay cả `description=""`: có nguy cơ giữ khoảng trống do gap. Chỉ render mô tả khi có; bọc children bằng stack có gap thay vì dựa margin của từng Button/Field.
- SongScreen/ChartScreen đặt Back khác mẫu `titleLeading`; chuẩn hóa ScreenHeader nhưng giữ Player/Comments là trải nghiệm đặc thù.
- Profile đổi avatar dùng position absolute + marginLeft 76: cần QA chữ lớn/ảnh, có thể neo badge vào wrapper vuông của avatar thay vì vào cả vùng rộng.

### P2-03 — Kích thước dựa window thay vì vùng nội dung

- ChartsScreen `cardSize=(width-60)/2` nhưng Page giới hạn maxWidth 1000; ChartScreen cover `width*0.35` trong ListPage reading maxWidth 820; Feed card `width-40` trong ListPage maxWidth 1000. Màn hình rộng có thể tràn/không còn hai cột theo vùng chứa.
- Đo container hoặc clamp theo contentWidth; thay số cột tại breakpoint. Không lấy window width làm chiều rộng nội dung sau khi đã áp maxWidth/gutter/safe-area.
- Public Playlist rail width 280 và nghệ sĩ liên quan width 136 là kiểu card riêng; giữ chủ đích nhưng kiểm tra 320px, chữ dài và vùng trailing. Không coi mọi kích thước khác nhau là lỗi.

### P2-04 — Màu, chữ và khả năng tiếp cận

- Follow đã dùng primary/onPrimary và surface/color ở bản hiện tại; không kết luận vẫn đen chìm nếu chưa QA. Kiểm tra cả compact/fullWidth, selected/disabled/focus trong theme sáng/tối.
- Tim chọn dùng token danger, chưa chọn dùng màu muted; vẫn có aria-pressed/nhãn để không chỉ dựa vào màu.
- Thống nhất Album, Playlist; cân nhắc Việt hóa Follow/Unfollow, Follower/Following, Artist, Genre, Song. Xem danh mục chữ riêng trước khi thay hàng loạt.
- MyUploads dẫn tới Premium bằng lời hứa “không giới hạn” trong khi Premium chưa hỗ trợ; đổi copy cho đúng. “Hàng triệu nghệ sĩ” chưa có căn cứ trong dự án.
- Tên ứng dụng trong app.json là `music_stream_app`; xem lại tên hiển thị và permission ảnh đang chỉ nhắc ảnh bìa dù dùng cả avatar.
- Kiểm tra TalkBack/keyboard focus, touch target, font 1.5–2x, contrast lỗi đỏ. Nút bị khóa phải có phản hồi thị giác và trợ năng.

## 5. Hợp đồng trạng thái đề xuất

### Dữ liệu

| Phase                | Giữ dữ liệu?             | Chỉ báo                                   | Nút vẫn được dùng                               |
| -------------------- | ------------------------ | ----------------------------------------- | ----------------------------------------------- |
| initialLoading       | Chưa có dữ liệu          | Một placeholder hoặc spinner của vùng     | Back, điều hướng độc lập                        |
| ready                | Có                       | Không                                     | Các thao tác hợp lệ                             |
| refreshing           | Có, cùng UID/resource    | Một chỉ báo tại refresh/header            | Đọc/phát dữ liệu còn hợp lệ; khóa refresh trùng |
| loadingMore          | Có                       | Footer hoặc vị trí đã quy định của Screen | Hàng đã có; khóa tải thêm trùng                 |
| empty                | Đã tải thành công, 0 mục | Empty với CTA thích hợp                   | Tạo mới/tìm lại                                 |
| error initial        | Không có snapshot hợp lệ | Một lỗi + retry                           | Back, retry                                     |
| error refresh/append | Giữ snapshot             | Lỗi nhỏ đúng vùng + retry                 | Nội dung cũ còn hợp lệ                          |

`hasMore` không thay thế `started`/success. Cần trạng thái riêng cho metadata và list nhưng một lớp giao diện quyết định vị trí hiển thị. Khi logout/đổi UID, luôn xóa cache riêng tư ngay.

### Thao tác

Đề xuất `pendingAction` và khóa theo resource/operation; giữ ref chống duplicate của useAction. Không nhất thiết tạo framework lớn.

| Thao tác đang chạy                | Khóa                                             | Có thể tiếp tục                                              |
| --------------------------------- | ------------------------------------------------ | ------------------------------------------------------------ |
| Lưu form/đăng bài                 | Các input và submit/cancel xung đột của form     | Player nếu độc lập; thoát theo chính sách draft rõ ràng      |
| Đổi quyền/xóa Album hoặc Playlist | Sửa/xóa/đổi quyền/thêm bài cùng resource         | Nội dung khác nếu không cùng transaction                     |
| Tim/follow                        | Cùng ID và thao tác xung đột                     | Cuộn, tìm kiếm, phát bài khác                                |
| Tải thêm                          | Trigger tải thêm của list đó                     | Các hàng đã tải                                              |
| Tải audio/ảnh                     | Picker/form liên quan; chỉ một tiến trình upload | Tiến độ và hủy nếu thực sự hỗ trợ hủy                        |
| Đăng xuất/vô hiệu hóa tài khoản   | Mutation liên quan phiên hiện tại                | Hiển thị trạng thái rõ, không để request cũ cập nhật UID mới |

Nút đang thực thi mới có spinner; các nút bị khóa do xung đột chỉ dim, không cùng quay. Retry phải giữ nguyên intent/requestId phù hợp, không biến thành một thao tác tạo mới.

## 6. useCallback/useMemo: giữ gì, chỉnh gì

| Nơi                                                   | Đánh giá                                                                             | Đề nghị                                                                                                                                    |
| ----------------------------------------------------- | ------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------ |
| PlayerContext                                         | Tách actions/state/progress và memo các value là hợp lý; PlaybackProgress tách riêng | Giữ; đo rerender trước khi đổi. Không phát tán clock tới mọi SongRow                                                                       |
| DataContext                                           | Memo merge songs, index và value theo từng context hữu ích                           | Giữ; ưu tiên hook context hẹp khi Screen chỉ cần catalog hoặc library                                                                      |
| useAction.run                                         | useCallback rỗng dùng ref/setter, không thấy dependency bắt buộc bị bỏ               | Giữ; thêm semantics operation/lifecycle khi cần, không dùng memo để che race                                                               |
| Pager hooks                                           | useMemo ổn định instance theo UID/path/params cần thiết                              | Giữ; sửa cơ chế refresh giữ snapshot. JSON.stringify params đang tránh churn do object literal, chỉ chuẩn hóa key nếu có thứ tự key bất ổn |
| useFocusEffect ở Home/Album/MyAlbums/Playlist/Library | Callback đã bọc useCallback                                                          | Vấn đề là refresh ngay cả focus đầu/không stale; thêm invalidation hoặc TTL hợp lý. Kiểm tra GET dedup và params refresh trước khi tối ưu  |
| Search covers Map                                     | useMemo đúng theo songs/albums/artists                                               | Giữ; memo không giải quyết thiếu ảnh ngoài cache                                                                                           |
| History queue                                         | map rows được memo rồi truyền nhiều hàng                                             | Giữ                                                                                                                                        |
| PlaylistItem                                          | Mỗi hàng useData; cover dùng songIds.map + songs.find                                | Tạo songById Map chung, chỉ subscribe dữ liệu cần; giảm tìm kiếm lồng nhau khi list lớn                                                    |
| Feed renderItem                                       | Mỗi post tìm song bằng find; query đính kèm normalize lặp                            | Resolve đúng dữ liệu trước; sau đó dùng Map và normalize keyword một lần                                                                   |
| Library/Search/ArtistProfile                          | filter/flatMap tạo mảng mỗi render                                                   | Chỉ memo khi list lớn hoặc cần prop identity ổn định; dùng Set cho membership nhiều lần, dependencies đầy đủ                               |
| Inline onPress/renderItem                             | Không tự động là lỗi tối ưu                                                          | useCallback chỉ có lợi khi consumer memo/effect cần identity ổn định; không bọc mọi handler                                                |
| ModalPanel effect BackHandler                         | `onClose` inline thay đổi làm remove/add listener                                    | Không có bằng chứng leak vì cleanup có; ổn định callback nếu đo thấy churn đáng kể, đừng bỏ dependency                                     |

Đo trên bản release/dev build phù hợp, không suy kết hiệu năng production từ StrictMode. Kịch bản: 200–500 hàng, gõ search nhanh, refresh, đổi favorite/follow và playback progress. Ghi số commit render, số request, JS frame time và memory trước/sau. Mục tiêu là giảm request/reset không cần thiết trước khi tăng số hook memo.

## 7. Hiệu ứng đơn giản đề xuất

Hiện `_layout.tsx` đã có slide-from-bottom cho Player và Comments; Comments là transparentModal. Không cần thay toàn bộ navigation.

| Vị trí                   | Hiệu ứng đề xuất                                                   | Ràng buộc                                                                |
| ------------------------ | ------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| Tab chính                | Không animation hoặc fade rất nhẹ 100–150ms                        | Giữ scroll/tab state; xác định rõ navigate/replace và Back stack         |
| Chi tiết bài/Album/hồ sơ | Slide ngang native mặc định, khoảng 180–240ms nếu navigator hỗ trợ | Không tạo thêm JS animation trùng transition của navigator               |
| Popup                    | Fade overlay + translateY nhẹ 12–20px, 140–180ms                   | Giữ focus, không animate lại khi toggle quyền/tim                        |
| Tim/follow               | Đổi màu + scale nhỏ 1→1.08→1 trong 100–140ms                       | Cập nhật optimistic chỉ khi có rollback; không chặn chạm lâu hơn request |
| Section tải xong         | Fade-in 120–160ms khi xuất hiện lần đầu                            | Không phát lại toàn danh sách mỗi lần render/refresh                     |
| Thanh hạn mức            | Nội suy width ngắn                                                 | 0% vẫn có track; đây là hạn mức, không phải progress upload              |
| Refresh                  | Giữ content, một indicator nhỏ                                     | Không chớp trắng/crossfade toàn trang                                    |

Tôn trọng Reduce Motion; tránh shimmer/animation vô hạn trên nhiều hàng, parallax và shared-element ở giai đoạn này. `react-native-reanimated` đã có dependency, nhưng chưa cần thêm thư viện. Khi triển khai phải đối chiếu Expo **58** đúng package.json và tài liệu versioned trước khi dùng API: [Expo 58](https://docs.expo.dev/versions/v58.0.0/), [Expo docs index](https://docs.expo.dev/llms.txt). Các thời lượng trên là thiết kế đề xuất, chưa phải cấu hình đã kiểm chứng cho mọi platform.

## 8. Danh sách kiểm tra đủ 31 Screen

| Screen              | Việc tiếp theo                                                                                                          |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------- |
| AccountDeleteScreen | Đồng nhất dismiss khi busy; copy đúng vô hiệu hóa thay vì ngụ ý xóa vĩnh viễn; kiểm tra lỗi logout sau deactivate       |
| AccountScreen       | Giữ khóa đăng xuất/đi xóa tài khoản nhất quán; trạng thái back khi busy                                                 |
| AlbumAddSongsScreen | Loading/retry metadata; bỏ row giả bấm được với `onPress={() => {}}` hoặc cho cả hàng thêm bài; busy theo dòng          |
| AlbumScreen         | Retry/empty đúng nguồn, refresh giữ hero; phối hợp remove và nút khác                                                   |
| ArtistProfileScreen | Refresh các section, trạng thái Album, layout header/action ổn định, lỗi không đi cùng empty                            |
| AuthScreen          | Busy form đã có; QA keyboard, font lớn, lỗi và chuyển đăng ký/đăng nhập                                                 |
| BasicSettingsScreen | QA theme trên tất cả biến thể nút; xử lý lỗi lưu preference có phản hồi                                                 |
| ChartScreen         | Clamp cover theo container, busy share, chuẩn hóa header                                                                |
| ChartsScreen        | Grid theo container và breakpoint; copy genre/Charts thống nhất                                                         |
| CommentsScreen      | Không mất draft khi gửi; busy edit/cancel/close; total vs loaded count; empty và lỗi                                    |
| DiscoveryListScreen | Follow inline, thống nhất row; bỏ ErrorText trùng LoadMore                                                              |
| FavoritesScreen     | Readiness đúng nguồn; empty hướng dẫn đúng tên menu “Yêu thích”                                                         |
| FeedScreen          | Draft/busy, resolve bài đính kèm không dựa cache thiếu, card width, refresh giữ list                                    |
| HistoryScreen       | Một lỗi/một loader; giữ queue memo; kiểm tra phân trang không nhảy vị trí                                               |
| HomeScreen          | Profile nguồn chung, refresh busy/stale policy; giữ chuông là toggle hiển thị theo yêu cầu cũ                           |
| LibraryScreen       | Initial Album favorites, Follow inline, không khóa tim khi refresh nền; query/tab rỗng                                  |
| LyricsScreen        | Fetch theo ID, loading/error/retry; sau này thêm lyric draft/review riêng cho chủ sở hữu                                |
| MyAlbumsScreen      | Privacy giữ popup, selected mới, khóa refresh, copy Album và spacing form                                               |
| MyUploadsScreen     | Queue indicator tại nút; quyết định hủy khi đổi tab; quota riêng; copy Premium                                          |
| NotFoundScreen      | Đã có Screen riêng; QA đường lạ và CTA theo auth, không đổi cấu trúc route tùy tiện                                     |
| PlayerScreen        | Giữ progress tách riêng; QA seek/loading/next liên tiếp, chữ dài và safe-area; không khóa toàn player vì favorite       |
| PlaylistScreen      | Refresh giữ snapshot; remove await/busy; hiển thị empty sau tải thành công                                              |
| PlaylistsScreen     | Privacy giữ popup, tránh selected cũ; lookup cover bằng Map và nguồn profile đúng                                       |
| PremiumScreen       | Giữ thông báo chưa hỗ trợ; CTA từ nơi khác không hứa quyền lợi đã có                                                    |
| ProfileScreen       | pendingAction chính xác, đồng bộ dữ liệu sau lưu; badge avatar và text spacing                                          |
| PublicProfileScreen | Dùng chung khung với ArtistProfile; refresh không unmount sections; trạng thái bản thân                                 |
| SearchScreen        | Row cùng nhịp, ảnh lịch sử resolve đúng; mở history có indicator trên hàng; phân biệt query đang chờ                    |
| SongScreen          | Header theo mẫu chung; lỗi có retry; không gộp không tồn tại và đang tải thành một câu                                  |
| UploadSongScreen    | Album riêng tư, nhãn picker/upload/save chính xác; tránh tạo Album mồ côi nếu lưu Song lỗi; giữ retry/idempotency đã có |
| UserPlaylistsScreen | Một nguồn error/loading; empty và pagination; rail/detail cùng nhãn                                                     |
| WelcomeScreen       | QA ảnh nền/chữ với màn nhỏ, safe-area; chọn ngôn ngữ tagline có chủ đích                                                |

## 9. Rủi ro nền tảng và tài liệu cần theo dõi

- `PROJECT_CONTEXT.md` vẫn có đoạn “chưa deploy Render”; lịch sử người dùng đã cung cấp URL service. Không dùng câu này làm hiện trạng cloud. Đợt này không gọi endpoint live nên cũng không xác nhận deployment đang khỏe. Khi cập nhật context sau này ghi rõ thời điểm và bằng chứng.
- SQLite FTS là index tái tạo, Firestore là nguồn chuẩn; không chuyển dữ liệu bền vào filesystem Render Free. Xem thiết kế AI cho index/vector/job.
- Ảnh có ledger `imageAssets`; audio có module xác minh `audio-assets.cjs` và `audioPublicId`, không đồng nghĩa đã có collection ledger audio với đầy đủ cleanup lifecycle. Cần audit vòng đời upload thất bại, gỡ mềm và orphan trước khi tự động xóa media; không xóa chỉ vì khác tên collection.
- Riêng tư ở lớp ứng dụng không tự làm URL Cloudinary public trở thành private. Đây là yêu cầu kiến trúc cần xác định riêng nếu muốn ngăn truy cập trực tiếp file; không quảng bá bảo mật URL vượt quá implementation.
- Giữ các comment giải thích generation guard, Android staging, idempotency, playback progress. Không xóa comment chỉ vì bắt đầu bằng `//`; chỉ bỏ câu lặp tên hàm hoặc mô tả sai sau khi kiểm chứng.

## 10. Thứ tự triển khai và tiêu chí hoàn tất

1. Chốt hợp đồng loading/action/modal và làm trước trên Album, Playlist, hồ sơ. Nghiệm thu privacy giữ popup và refresh không mất content.
2. Sửa Feed/Comments draft/busy, Lyrics deep link, Album selector và nguồn profile. Regression test hành vi/race cần thiết, không chỉ assert text có trong source.
3. Áp dụng row/header/section spacing và breakpoint. Sau đó cập nhật copy từ danh mục riêng.
4. Thêm hiệu ứng nhẹ, đo render/network; triển khai AI sau khi UI trạng thái ổn định.

Ma trận QA cần chạy: Android và Web; sáng/tối; 320/360/390px và desktop rộng; tên rất dài/font lớn; chưa có bài/Album/Playlist; dữ liệu >1 trang; offline/timeout/403/404; quay lại màn; đổi account; nhấn liên tiếp; refresh khi đang mutation; Render vừa ngủ; bàn phím và Android Back trong popup.

Điều kiện đạt: mỗi vùng có một loader đúng phase; không có empty giả; error xuất hiện một nơi; mutation không mất draft hoặc gửi trùng; favorite/follow không khóa các tác vụ độc lập; không tràn ngang; popup quyền riêng tư giữ nguyên; hồ sơ bản thân không lệch khi chưa có bài.

Kiểm tra trong đợt lập tài liệu: `npm run lint` PASS; `npm run typecheck` PASS. Không sửa code runtime và không thêm test chỉ để kiểm tra ba tài liệu. Những kết quả này không thay thế QA giao diện thực tế nêu trên.
