# Yêu cầu chuyển backend và cập nhật ứng dụng

Cập nhật 2026-11-05. Tài liệu tổng hợp yêu cầu đã thống nhất và phương án đếm lượt nghe đề xuất mới nhất. Đây là đặc tả triển khai, **không phải báo cáo đã hoàn thành**. README mô tả trạng thái code hiện tại; các khác biệt dưới đây chỉ có hiệu lực sau khi triển khai, migration và kiểm thử. Không tự deploy/migration cloud hay bật dịch vụ trả phí.

## 1. Kiến trúc và quyền

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

## 2. Database mục tiêu

Document ID là ID chuẩn; không cần lặp ID trong document mới. Thời gian là Firestore Timestamp; DTO chuyển đổi nhất quán. Các field Cloudinary publicId là metadata quản lý tài sản, không phải API secret.

| Đường dẫn | Thuộc tính |
| --- | --- |
| Firebase Authentication | uid, email, credentials do Firebase quản lý, disabled; claims hiện có được giữ nguyên nhưng không cấp đặc quyền trong ứng dụng |
| users/{uid} | displayName:string, email:string, avatarUrl:string, avatarPublicId:string/null, biography:string, followerCount:integer, followingCount:integer, active:boolean, createdAt:Timestamp, updatedAt:Timestamp |
| songs/{id} | title:string, artistId:string, artistNames:string[], albumId:string/null, coverUrl:string, coverPublicId:string/null, audioUrl:string, audioPublicId:string/null, audioKey:string (tạm), durationSeconds:number, genre:string[], lyric:string, description:string, isPublic:boolean, active:boolean, playCount:integer, releaseDate:Timestamp, createdAt:Timestamp, updatedAt:Timestamp |
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

## 3. Genre và upload

Genre cho chọn nhiều: Pop, Rock, Indie, Acoustic, Ballad, R&B, Hip-hop/Rap, EDM, Jazz, Blues, Classical, Country, Folk, Latin, Reggae, Bolero, Nhạc dân gian, Nhạc không lời, Khác. **Không có Nhạc Trịnh.** Backend và UI dùng cùng danh sách; giới hạn 1–10 lựa chọn.

- `/upload`: tiêu đề Đăng tải bài hát, Việt hóa nội dung và nút lưu/thay file.
- Artist* (ngăn cách bằng dấu phẩy): mặc định tên mình, cho nhập nhiều tên tự do; không kiểm tra tên có tài khoản. artistId vẫn là chủ sở hữu, không cấp quyền cho tên đồng tác giả.
- Genre* ban đầu rỗng, bộ chọn nhiều xổ xuống; đóng khi bấm ngoài, tóm tắt A, B. Không có ghi chú dấu phẩy ở Genre.
- Album: chọn album của mình, không thuộc album, hoặc tạo mới thuận tiện; giữ dữ liệu form khi chuyển thao tác.
- Hạn mức miễn phí 180 phút = 10.800 giây, cộng durationSeconds các bài upload active bất kể công khai/riêng tư. Bài đã gỡ không chiếm hạn mức. Backend kiểm tra hạn mức, kể cả upload đồng thời.
- Premium là demo, không giả lập thanh toán hoặc cấp entitlement thực tế.

## 4. Uploads và quản lý album

- Đổi `/my-uploads` thành `/uploads`, cập nhật toàn bộ liên kết; tiêu đề Bài hát đã đăng tải. Hai mục Bài hát/Album.
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

## 5. Album yêu thích và Library

- favoriteAlbums độc lập favorites bài; yêu thích album không tự yêu thích từng bài.
- Trái tim bật/tắt ở See all album, danh sách album trang hồ sơ/người dùng và album chi tiết; đồng bộ giữa các màn, không kích hoạt mở album khi bấm tim.
- Library mặc định: bài yêu thích, album yêu thích, nghệ sĩ follow. Search tìm trong cả ba; filter Album chỉ album yêu thích.
- Xóa nhãn/hành vi Album có bài hát bạn đã yêu thích.
- Backend kiểm tra album khả dụng; album mất quyền/không còn khả dụng không xuất hiện trong kết quả.
- Thêm Bài hát đã đăng tải bên phải Lịch sử, dẫn `/uploads`.

## 6. Hồ sơ, tài khoản, cài đặt

- `/profile`: bỏ UID, nhãn Người dùng, ô URL, nút Làm mới quyền; email có nhãn Địa chỉ email, follower/following, Tên hiển thị, Tiểu sử.
- Avatar có nút cây bút phù hợp mobile, chọn ảnh/upload Cloudinary/cập nhật hồ sơ Firebase qua backend; loading/error/chống bấm lặp.
- Tách `/account`: email, Đăng xuất, text Xóa tài khoản dẫn `/deleteaccount`.
- `/deleteaccount`: title cạnh Back, nút đỏ Xóa tài khoản, xác nhận title Xóa tài khoản. Nội dung đúng nghiệp vụ: Thao tác này sẽ vô hiệu hóa tài khoản của bạn. Bạn sẽ không thể đăng nhập lại.
- Vô hiệu hóa giữ dữ liệu; users.active=false, khóa Auth disabled=true, thu hồi/chặn phiên. Không cần field disabled riêng trong Firestore. Đăng nhập báo Tài khoản của bạn đã bị vô hiệu hóa.
- Bài/album của tài khoản inactive không xuất hiện ở Home/Search/Discovery và nguồn công khai. Không chỉ chặn UI; backend kiểm tra quyền và trạng thái.
- Menu Library đổi thành Cài đặt: Hồ sơ, Tài khoản, Cài đặt cơ bản, Đăng tải bài hát, Premium. Bỏ Tài khoản và công cụ, Quản lý nội dung và tài khoản của bạn, Bài hát tôi đã đăng, nút Đóng. Upload không dùng nút đen riêng.
- Cài đặt cơ bản: mặc định theme hệ thống; công tắc sáng/tối nằm ngang, lưu lựa chọn theo thiết bị.
- Mọi Dialog có nút Đóng chuyển sang X góc trên phải, có accessibility và Back phù hợp; không bỏ các nút Hủy có ý nghĩa xác nhận nghiệp vụ một cách máy móc.

## 7. Playlist và menu bài hát

- `/playlists`: tên, tên tác giả, Playlist · N bài hát. Menu bỏ số bài dưới tên.
- Chỉnh sửa playlist: bỏ mô tả hướng dẫn Đặt tên và mô tả cho bộ sưu tập của bạn.; công tắc Công khai; dùng X đóng. Form dấu + tương tự.
- Công khai/Riêng tư lưu thật, backend cấp quyền; playlist công khai có bài xuất hiện trên trang người dùng.
- Thêm bài dùng luồng Tìm bài để thêm.
- Xóa title Xóa playlist?; nội dung Thao tác này sẽ xóa vĩnh viễn playlist này. Bạn có chắc chắn muốn tiếp tục không?
- Chi tiết playlist: ảnh/phần giới thiệu Bộ sưu tập âm nhạc của bạn và số bài căn giữa; nút Thêm bài hát.
- Menu bài hát bỏ tác giả dưới title; thứ tự Yêu thích, Playlist, Chi tiết bài hát. Trong playlist có Gỡ khỏi playlist màu đỏ đầu tiên.
- Chọn playlist: chưa có thì thêm, đã có thì Gỡ khỏi Playlist; giữ đủ thông tin nhận diện playlist đích.

## 8. Discovery, người dùng và player

- Album hiển thị thêm · N bài hát, tính trên tập bài đúng quyền; owner quản lý được bài riêng tư, số liệu công khai chỉ bài public/active của tài khoản active.
- Chart Home và detail: Tuyển tập 50 bài {thể loại} được nghe nhiều nhất. Số bài/thời lượng thực tế, không giả đủ 50.
- `/albums`: Bắt nhịp xu hướng cùng những album nổi bật.
- `/artists`: Khám phá những nghệ sĩ đang được yêu thích.
- Artist: Follow/Unfollow và Phát bài hát đồng đều; Bài hát thay Bài hát công khai; album trình bày như See all Trending albums; thêm playlist công khai có bài.
- Người hâm mộ cũng thích nằm trên trang người dùng: đọc follow chung, loại self/inactive; thiếu tín hiệu bổ sung thể loại bài public, following, cuối cùng nghệ sĩ phổ biến. Nguồn không có tín hiệu fan đổi nhãn Có thể bạn thích/Khám phá nghệ sĩ. Chỉ đọc dữ liệu hiện có; giới hạn reads, không quét toàn bộ graph mỗi request, không ghi kết quả/counters/collection mới.
- Chi tiết bài đồng bộ UI chung, Thời lượng: thay Thời lượng dự kiến:.
- Bấm bài trong mọi danh sách chỉ phát audio, không push Player. Chỉ bấm MiniPlayer mới mở Player. Giữ queue, controls, repeat/seek đồng bộ một engine.

## 9. History và lượt nghe

### Thuộc tính và màn hình

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

### Quy tắc lượt nghe đề xuất 2026-11-05

Nguồn tham khảo chính thức: [Spotify — How your streams are counted](https://support.spotify.com/tj-en/artists/article/how-your-streams-are-counted/): công bố nghe ít nhất 30 giây để tính stream. Trang này không công bố cooldown cố định hoặc ngoại lệ cho bài dưới 30 giây. Không gán các quyết định riêng dưới đây cho Spotify.

- Bài dài từ 30 giây: listenedSeconds >= 30 giây hợp lệ trong cùng phiên.
- Bài ngắn hơn 30 giây: nghe ít nhất 80% nội dung và đạt cuối bài; dùng completed=true để đủ điều kiện. Đây là ngoại lệ sản phẩm của app để bài ngắn/demo không bị loại vĩnh viễn.
- Khoảng cách tối thiểu hai lượt countedAt cùng UID/song: **30 giây**, thay đề xuất 60 giây trước. Đây là quyết định đề xuất của app, không phải thông số xác nhận của Spotify. Bài ngắn lặp nhanh có thể hoàn thành nhưng không phải vòng nào cũng cộng lượt.
- Mỗi phiên chỉ một lượt, phiên mới không kế thừa listenedSeconds. Server dùng idempotency/session, timestamp và transaction history/song/receipt; chống gửi lặp, nhiều thiết bị, nghe đồng thời vượt thời gian thực. Client báo telemetry không phải bằng chứng chống gian lận tuyệt đối.
- completed và counted là hai khái niệm khác nhau: bài dài có thể counted trước khi completed. completed không yêu cầu mọi bài phải nghe hết 100%.
- Ngưỡng completed 80% đã được người dùng chốt; ngoại lệ bài ngắn/cooldown 30 giây là phương án mới cần được phân biệt với hành vi code hiện tại (60 giây).

### Retention đã chốt

- Giữ 1.000 phiên mới nhất/tài khoản theo playedAt desc, ID desc, không phải 1.000 bài khác nhau. Trang History vẫn tối đa 100 bài khác nhau.
- Worker chạy mỗi 15 phút từ lúc backend khởi động; lần đầu sau 15 phút. Ví dụ 08:07 khởi động thì 08:22, 08:37, 08:52. Không phụ thuộc tick player, không phải cron theo mốc :00/:15.
- Backend dừng thì worker dừng, không bù các tick đã bỏ lỡ; khởi động lại bắt đầu lịch mới. Cần host liên tục. Một lượt đang chạy thì không chồng lượt tiếp theo.
- Mỗi lượt đọc users theo trang 50, count history trước; <=1.000 thì bỏ qua mà không đọc lại 1.000 document.
- Tài khoản vượt giới hạn: transaction xác định boundary 1.000 mới nhất, lấy tối đa 100 phiên phía sau; chỉ xóa phiên có playedAt cũ hơn hai phút so với lúc xét batch. Query và delete cùng transaction, cập nhật đồng thời gây retry với boundary mới.
- Tối đa 10 batch/UID/lượt; dừng sớm khi batch xóa dưới 100, phần chưa dọn xét tiếp lượt sau. Dữ liệu lớn có backlog; đây là giới hạn mềm, có thể tạm >1.000 do grace period/backlog/lỗi worker.
- Ví dụ 1.105 phiên cũ đủ điều kiện: xóa 100 + 5, còn 1.000. Phiên còn trong khoảng bảo vệ chưa xóa.
- Chỉ xóa history. Không xóa song/receipt/favorite/playlist, không trừ playCount. Lỗi ghi log và thử ở lượt sau; không báo đã dọn thành công khi thất bại.

## 10. Trình tự thực hiện và kiểm chứng

### Bổ sung: chủ bài quản lý bài đã đăng

Người dùng có Đổi ảnh bìa và Xóa bài hát trong menu bài của mình. Đổi ảnh dùng chọn/crop ảnh, upload Cloudinary và API kiểm tra owner để lưu coverUrl, không đổi audio hoặc metadata khác. Xóa có xác nhận; triển khai hiện dùng gỡ mềm active=false/isPublished=false, giữ lịch sử/thống kê/file và references, bỏ bài khỏi nguồn active và queue thiết bị đang thao tác. Cần ghi rõ hành vi giữ dữ liệu trên UI, không gọi đây là xóa file vĩnh viễn. Chỉ chủ sở hữu được dùng API owner. Album của mình tiếp tục đổi ảnh ở form Chỉnh sửa album.

### Bàn giao dữ liệu Firebase và media (yêu cầu bổ sung)

Khi backend/schema đã sẵn sàng để đưa dữ liệu thật, phải cung cấp hướng dẫn từng bước cho người dùng: tạo tài khoản/nghệ sĩ, chọn ảnh và âm thanh của họ, upload Cloudinary, lấy URL HTTPS và publicId, rồi tạo dữ liệu đúng collection/thuộc tính mục tiêu qua backend hoặc công cụ import đã kiểm thử. Chuẩn bị bộ dữ liệu mẫu có liên kết UID/albumId/songIds đúng, manifest media để người dùng thay ảnh/audio theo ý muốn, ví dụ public/private/album/playlist/favoriteAlbums và cách kiểm chứng trong app. Thời lượng audio lấy từ metadata thực tế; không dùng thời lượng giả. Phân biệt seed local với import cloud; có dry-run, validation và hướng dẫn backup trước apply. Không hướng dẫn nhập schema cũ rồi coi là dữ liệu mục tiêu. Chỉ ghi hoàn thành phần này khi có backend/import sẵn sàng và mẫu đã kiểm chứng; hiện chưa sẵn sàng.

- [ ] Chốt hợp đồng API/DTO, phân trang, validation, quyền owner/active/public; cập nhật fixture và migration dry-run có báo cáo đối chiếu.
- [ ] Triển khai backend cho hồ sơ, tài khoản, catalog/album, favorites/favoriteAlbums, playlist, follow, feed/comments, upload, playback/history; thay toàn bộ client Firestore nghiệp vụ bằng API.
- [ ] Chuyển metadata/counters từ publicProfiles an toàn; chuyển visibility sang isPublic có mapping rõ. Không tự công khai dữ liệu private/unlisted/followers cũ.
- [ ] Đảm bảo API upload/quota/album thay đổi đồng thời an toàn; assets không bị mất khi retry. Cloudinary secret chỉ server.
- [ ] Cập nhật UI và routes theo các mục trên; giữ mobile-first, virtualization, accessibility, Back, safe area và trạng thái lỗi/loading/rỗng.
- [ ] Tests có ý nghĩa cho quyền DTO/email, inactive, counting 80%/30 giây/bài ngắn/seek/retry/concurrency, retention, public playlist/album, favoriteAlbums và quota.
- [ ] Chạy lint/typecheck cùng test phù hợp; bundle/native/device kiểm chứng theo phạm vi thay đổi, không coi export là APK/IPA hay test thiết bị thật.
- [ ] Cập nhật docs/IMPLEMENTATION_PROGRESS.md với trạng thái thực tế, checks, giới hạn, ports/process và bước tiếp theo; README chỉ giữ hướng dẫn vận hành và liên kết. Không ghi đặc tả là chức năng đã hoàn thành.
- [ ] **Bước tiếp theo sau đợt này: xóa audioKey và thay nguồn audio demo tương ứng, cập nhật mapping/fixture/player/validation/tests đồng bộ.**
