# Kế hoạch triển khai Search, Library, History, Discovery và Firebase

Ngày tạo: 2026-11-03.
Trạng thái: M0 và M1 đã hoàn thành local, kiểm tra tự động ngày 2026-11-03; M2–M6 chưa bắt đầu. Hướng dẫn chạy: [LOCAL_DEVELOPMENT.md](LOCAL_DEVELOPMENT.md).

Đây là tài liệu chính cho đợt triển khai tiếp theo. Khi khác với SEARCH_DISCOVERY_PLAN.md hoặc UI_IMPLEMENTATION_PLAN.md, dùng tài liệu này và yêu cầu mới nhất của người dùng. Những phần đã được đồng ý mà không bị sửa lại vẫn giữ hiệu lực.

## 1. Quy tắc làm việc và lưu tiến độ

- Chia thành các mốc có thể kiểm tra độc lập; cập nhật checklist sau mỗi mốc.
- Khi người dùng yêu cầu ngừng: ngừng bắt đầu công việc mới, kết thúc/hủy tác vụ đang chạy một cách phù hợp; ghi ngay việc đã làm, file đã sửa, kiểm tra đã chạy và kết quả, việc còn lại, lỗi chưa giải quyết, tác vụ terminal còn chạy và bước tiếp tục vào phần Bàn giao cuối tài liệu này. Sau đó báo đã dừng.
- Không ghi một việc là hoàn thành nếu mới thiết kế, viết stub hoặc chưa nối vào luồng sử dụng thực tế.
- Khi tiếp tục, đọc Bàn giao và kiểm tra git diff trước; không làm lại mốc đã hoàn thành, không reset thay đổi sẵn có.
- Ưu tiên Android/iOS; một audio engine xuyên suốt điều hướng. Route trong src/app chỉ chứa params, guard và screen; không đặt service/hook/component thường trong thư mục route.
- Trước khi viết mã Expo/React Native: đọc package.json và tài liệu đúng SDK theo AGENTS.md. Dùng package manager hiện tại; không tự nâng SDK/dependency.
- Được thêm field tùy chọn/collection mới, giữ tương thích dữ liệu cũ. Không tự reset database hoặc chạy seed/migration thật.
- Phát triển bằng 13.A (local/Emulator) trước; chuẩn bị triển khai Firebase cloud sau khi hoàn thiện. Không yêu cầu người dùng chọn lại phương án đã chốt. M0 chỉ chạy local, chưa deploy.
- Kiểm tra theo 14.A: lint, typecheck và tests tự động phù hợp. Rules Emulator là kiểm tra tự động; không tuyên bố đã xác nhận thiết bị thật từ unit test hoặc bundle.

## 2. Hành vi sản phẩm đã chốt

### 2.1. Search: lịch sử tìm kiếm local

- Khi ô tìm kiếm rỗng: chỉ hiện tối đa 20 mục đã mở từ Search, mới nhất trước; không tải/hiện toàn catalog làm màn mặc định.
- Lưu bằng AsyncStorage, phân theo UID và version. Không ghi lịch sử tìm kiếm vào Firebase. Không ghi chỉ vì người dùng gõ một từ khóa.
- Các loại row đã chốt: bài hát, album, nghệ sĩ/tác giả.
  - Bài hát: cover vuông, tên bài, dòng phụ “Bài hát · Tên nghệ sĩ”.
  - Album: cover vuông, tên album, dòng phụ “Album · Tên nghệ sĩ”.
  - Nghệ sĩ: avatar tròn, tên, dòng phụ “Nghệ sĩ”.
- Header “Tìm kiếm gần đây”, nút “Xóa tất cả” phía trên bên phải. Mỗi row có nút × ở bên phải; vùng chạm đủ lớn, có nhãn truy cập. Nhấn × không kích hoạt mở row.
- Khử trùng kind + id; mở lại đưa lên đầu. Có trạng thái rỗng, ẩn Xóa tất cả khi không có mục.
- Lưu metadata tối thiểu; không lưu email/token/URL media riêng tư. Kiểm tra quyền/tồn tại khi mở lại, không phát media bị thu hồi quyền từ cache.
- Chịu được JSON hỏng, lỗi storage, đổi tài khoản và thao tác liên tiếp. Serialize ghi; bỏ callback của session cũ. Lỗi lưu không chặn mở nội dung.

### 2.2. Search: có từ khóa

- Chỉ hiện nút Bài hát/Album/Nghệ sĩ khi từ khóa sau trim không rỗng. Không có nút Tất cả, không có nút Lịch sử nghe ở Search.
- Không chọn filter = kết quả hỗn hợp. Nhấn filter để chọn; nhấn lại filter đang chọn để bỏ chọn. Xóa từ khóa thì bỏ filter, quay về lịch sử local.
- Vẫn hỗ trợ tìm người dùng thông thường theo lựa chọn 5.B; trình bày đúng là Người dùng trong kết quả hỗn hợp, không giả thành nghệ sĩ. Ba filter đã chốt không thêm nút Người dùng tự phát. Hồ sơ người dùng cần trang công khai phù hợp, không mở trang sửa profile của họ.
- Với kết quả người dùng thông thường, không tự thêm loại row vào lịch sử local ba loại đã chốt; nếu bổ sung sau phải cập nhật thiết kế rõ ràng.
- Mỗi truy vấn/loại: 20 kết quả ban đầu, cuộn tải thêm 10. Kết quả hỗn hợp có loại/nhãn rõ ràng; tránh chia trang theo cách làm mất một nhóm nội dung.
- Relevance: exact → prefix → khớp các từ → thông tin nghệ sĩ/album; popularity là tín hiệu phụ khi độ liên quan tương đương.
- Debounce khoảng 300 ms cho network, bỏ response cũ, cache theo query/filter/tài khoản, reset cursor khi đổi query/filter. Giữ scroll khi tải thêm.
- Có loading ban đầu, loading cuối danh sách, empty, error/retry, hasMore; không ghi số đã tải thành tổng số kết quả toàn hệ thống.
- Search công khai không rò private/unlisted/followers hoặc thông tin cá nhân. Library có tìm kiếm riêng theo quyền.

### 2.3. Library và màn lịch sử nghe

- Danh sách mặc định của /library chỉ gồm bài hát đã yêu thích và nghệ sĩ đang follow. Back từ Lịch sử cũng về danh sách này, không chèn playlist/album/history vào danh sách mặc định.
- Hai nút “Playlist của bạn” và “Lịch sử” nằm cùng hàng, mở hai màn riêng. Lịch sử không phải filter bật/tắt ngay trong Library.
- Bỏ nút “Yêu thích” dư thừa; giữ dữ liệu favorites và thao tác yêu thích trong menu bài hát.
- Không có chip Tất cả. Các filter loại còn phù hợp được bật/tắt bằng nhấn lại; không thêm chip Playlist trùng với nút điều hướng Playlist của bạn.
- Ô tìm kiếm Library chỉ tìm nội dung thư viện, không tìm lịch sử nghe. Album nếu giữ filter sẽ là album suy ra từ bài đã yêu thích, chỉ hiển thị khi chọn Album, không coi là saved albums độc lập.
- Giữ CRUD playlist và công cụ tài khoản/upload/admin. Mở một playlist vẫn có danh sách bài riêng.
- Màn Lịch sử có Back, không có ô tìm kiếm, không có dòng “Tối đa 100 bài gần đây”.
- Lịch sử hiển thị 10 bài đầu; cuộn tải thêm 10, tối đa 100 bài khác nhau. Row dùng component bài hát hiện có, metadata/tiến độ từ phiên gần nhất; bài không còn tồn tại hoặc mất quyền được bỏ qua/xử lý rõ ràng.
- Back dùng cơ chế hiện có, tránh double tap, giữ state/scroll của Library khi phù hợp; không replace khi còn màn trước trong stack.

### 2.4. History lưu trên Firebase

- Giữ schema history theo phiên: users/{uid}/history/{historyId}. Một bài nghe lại nhiều lần có thể tạo nhiều phiên; giữ completed/startedAt/counted và cơ chế receipt hiện có.
- Tăng retention từ 100 lên tối đa 1.000 phiên mới nhất mỗi tài khoản; backend Node.js dọn bản cũ, giữ bản mới. Có thể tạm vượt trong lúc chờ dọn; không gọi đó là hard limit do rules áp đặt.
- Không tạo listeningHistory summary theo songId và không thêm everCompleted trong đợt này. Đây là thay đổi so với kế hoạch cũ.
- Query history mới nhất trước, cursor ổn định có tie-break ID. Đọc theo trang phiên, khử trùng songId xuyên suốt các trang; dừng khi đủ 100 bài khác nhau hoặc hết nguồn.
- Không limit query 100 phiên rồi coi đó là 100 bài khác nhau. Không tải cả 1.000 phiên ngay khi mở màn. Số phiên đọc có thể lớn hơn số bài hiển thị vì trùng/mất quyền.
- Giới hạn số request quét trong một đợt để tránh vòng đọc dài khi toàn bài trùng; cho tải tiếp rõ ràng nếu chưa hết nguồn, không tự báo hết sai. Chặn request trùng, khử trùng cả khi có cập nhật đồng thời.
- Giữ đầy đủ dữ liệu phiên cho đếm lượt nghe; chỉ khử trùng ở view đọc. Khi chơi bài từ History, queue là danh sách bài khác nhau đã tải theo đúng thứ tự hiển thị.
- Backend retention phải xử lý trigger giao lại/đồng thời, kiểm tra bản ghi vẫn thuộc phần cũ trước khi xóa, tránh xóa phiên đang được cập nhật; không trigger dọn trên mọi tick progress. Rà ảnh hưởng receipt/history bị xóa trước khi triển khai.
- Thay/bỏ trimHistory client đang giữ 100 phiên chỉ khi backend retention sẵn sàng, tránh hai cơ chế xung đột. Các phiên đã bị xóa trước đây không thể khôi phục.

### 2.5. Home và Discovery

- Suggestions for you: tối đa 20 bài, trộn quen/cùng gu/khám phá, không trùng bài, hạn chế lặp nghệ sĩ. Không thêm section Nghe gần đây trên Home.
- Dùng tín hiệu hiện có: lịch sử, thời lượng nghe/completed, favorites/following; không thêm onboarding chọn gu trong phạm vi này.
- Charts: mọi genre có bài công khai hợp lệ đều có chart. Mỗi chart chọn tối đa 50 bài có tổng lượt nghe cao nhất, tie-break ổn định; sau đó khử trùng và trộn bằng seed ổn định. Bài ngoài Top 50 không được lọt vào vì trộn.
- Chart detail lấy đủ tập tối đa 50 bài, dùng virtualization, không phân trang UI 20 + 10. Có thể chia request metadata nội bộ nếu cần. Queue đúng tập và thứ tự hiển thị; không đánh số thứ hạng giả theo thứ tự đã trộn.
- Popular artists: Home tối đa 20 người đang hoạt động, có bài active/public/published; loại chính người dùng hiện tại. Không loại người đã follow khỏi mục này.
- Thuật toán khởi đầu: xếp follower giảm dần → lấy pool tối đa 60 → chia ba nhóm theo thứ tự phổ biến → chọn 10/6/4 → bù từ nhóm còn lại nếu thiếu → khử trùng và trộn seed. Dưới 20 người hợp lệ thì hiện số thực tế. Không dùng artist không đủ điều kiện để bù.
- Trending albums: tối đa 20 trên Home. Tín hiệu chính tổng playCount bài hợp lệ theo đúng albumId; chọn đa dạng nghệ sĩ trong pool phổ biến. Không cộng nhầm theo tên album hoặc gọi số tích lũy là tăng trưởng theo tuần.
- Bài hát Home: trộn bài quen/cùng gu/khám phá, không lấy 10 document đầu Firestore một cách cố định.
- Seed theo tài khoản và phiên khám phá, giữ khi render/Back/follow/progress; chỉ đổi chủ động khi refresh hoặc phiên mới. Không Math.random trong render; mọi nhóm đều có bù trừ nếu dữ liệu ít.
- See all nghệ sĩ/album: 20 ban đầu, mỗi lần tải thêm 10. Màn danh sách đầy đủ có tiêu chí xếp hạng rõ ràng; đa dạng Home không làm sai tổng lượt nghe/follower.

### 2.6. Follow/Unfollow

- Chưa follow: Follow. Đã follow: Unfollow. Pending: chặn nhấn lặp; lỗi giữ trạng thái trước và cho thử lại.
- Lỗi source đã tìm: setFollow cập nhật followerCount target bằng increment(delta) hai lần, rules chỉ cho delta một lần. Sửa update trùng, không nới rules hoặc yêu cầu admin cho follow thông thường.
- Kiểm tra follow/unfollow/idempotent/self-follow/counter không âm, đồng bộ các màn. Chưa xác minh rules đang deploy giống rules local.

## 3. Kiến trúc triển khai

- SearchScreen → useSearch → searchService → Node endpoint → search index. Lịch sử local là service/hook riêng, không ghép vào DataContext hoặc Firebase history.
- Endpoint có xác thực, query chuẩn hóa, loại kết quả, pageSize bị giới hạn, cursor gắn query/filter/index version; trả items/nextCursor/hasMore. Không đọc toàn collection Firestore rồi lọc trên từng request.
- Index public được đồng bộ create/update/delete/ẩn nội dung; chỉ chứa metadata công khai tối thiểu. Admin SDK cần tự kiểm tra quyền; không dựa vào Security Rules để bảo vệ endpoint.
- Chọn engine search sau khi xác minh edition/SDK/khả năng tiếng Việt và chi phí, ưu tiên provider local để kiểm thử trước. Không tự nâng edition hoặc đăng ký dịch vụ trả phí. Stub/fixture không được coi là search production đã hoàn tất.
- Tách publicProfiles khỏi thông tin riêng trong users khi triển khai tìm người dùng; backfill/chuyển client trước khi siết quyền users. Không tiếp tục watch toàn users để làm artist catalog.
- DataContext: memo mergedSongs/provider value, lookup Map artist/album, ổn định references; tách nguồn catalog/library/history khi cần.
- Player: một audio engine; tách context actions/track/progress để SongRow/Home không render theo progress khi chỉ cần play.
- Listener linked IDs: diff thêm/bỏ theo ID; gộp request ensureSong cùng ID đang chạy, cache có invalidation/quyền; loading/error theo nguồn.
- Không thêm limit catalog trước rồi tính chart/album totals từ tập bị cắt. Chuẩn bị query/aggregate có dữ liệu đầy đủ cho từng màn rồi mới bỏ listener rộng.
- Dùng truy vấn có cursor thực tế; slice trên client không phải tối ưu lượt đọc. Đo số listener/read/write và render trước/sau, không thêm useMemo/useCallback hàng loạt thiếu mục đích.

## 4. Thứ tự công việc

### M0 — Baseline và môi trường local

- [x] Đọc source thực tế, package.json và versioned docs trước sửa API; giữ nguyên thay đổi người dùng.
- [x] Ghi baseline lint/typecheck/tests, hiện trạng Follow/Search/Library/history.
- [x] Cấu hình Auth/Firestore/Node local, fixture và project demo; thiếu cấu hình thì fail-closed, không rơi sang cloud thật.
- [x] Mock/tắt riêng Cloudinary/dịch vụ ngoài khi kiểm thử local: chặn upload trước fetch; fixture dùng audio bundled, artwork fallback, không URL ngoài.

### M1 — Follow và nền tối ưu React

- [x] Sửa cập nhật counter trùng; đổi trạng thái nút Follow/Unfollow. Bổ sung hàng đợi theo tài khoản và transaction đọc cả hai counter; guard field trong rules.
- [x] Tách player actions/state/progress nhưng giữ một engine và hành vi playback.
- [x] Memo/Map DataContext, tách catalog/library/history, diff listener theo ID và gộp request đang pending.
- [x] Tests cho counters/rules Emulator, logout, listener cleanup, quyền thu hồi, StrictMode và đo render bằng React thật.

### M2 — Search local history và Library

- [ ] AsyncStorage service/hook: tối đa 20 mục, dedupe, remove/clear, account isolation và lỗi storage.
- [ ] UI lịch sử Search theo ba loại row; Xóa tất cả trên phải và × từng hàng.
- [ ] Filter Search chỉ xuất hiện khi có từ khóa, bỏ Tất cả, nhấn lại bỏ lọc.
- [ ] Library mặc định favorites + followed artists; bỏ nút dư, đặt Playlist của bạn/Lịch sử cùng hàng.
- [ ] Route màn lịch sử nghe và Back đúng Library, không search trong history.

### M3 — Search phía server và phân trang

- [ ] Chọn/ghi rõ engine phù hợp, public profile/index schema và cơ chế đồng bộ.
- [ ] Node endpoint, auth/visibility, cursor, limits, index version và cache.
- [ ] useSearch với debounce/response cũ/query reset và pagination 20 + 10.
- [ ] Tìm người dùng thông thường, mở public profile đúng quyền; nối đầy đủ vào giao diện.
- [ ] Bổ sung khả năng tải thêm vào list primitives, giữ virtualization/scroll, retry cuối list.

### M4 — History và retention

- [ ] History query cursor + dedupe songId + metadata theo quyền, UI 10 + 10 đến tối đa 100 bài.
- [ ] Backend Node giữ 1.000 phiên mới nhất, xử lý đồng thời/retry và quan hệ với receipts.
- [ ] Ngừng cơ chế client trim 100 đúng thời điểm; không đổi schema phiên/counting tùy tiện.
- [ ] Kiểm tra nhiều phiên cùng bài, nguồn ít bài khác nhau, timestamp trùng, phiên bị xóa/mất quyền và tải thêm khi offline/lỗi.

### M5 — Home/Discovery

- [ ] Suggestions 20, seed ổn định, diversity và bù trừ; không thêm Nghe gần đây trên Home.
- [ ] Charts mọi genre, chọn Top 50 trước trộn, detail virtualized và queue nhất quán.
- [ ] Popular artists pool/nhóm 10-6-4/bù trừ, Follow/Unfollow đồng bộ.
- [ ] Trending albums 20, đúng albumId và aggregate; Bài hát Home đa dạng.
- [ ] See all 20 + 10; không tính totals/rank từ catalog thiếu trang.

### M6 — Kiểm tra và chuẩn bị Firebase thật

- [ ] Cập nhật bộ tests rules đang lỗi thời theo schema thực tế; chạy Emulator cho các quyền liên quan.
- [ ] Tests tự động cho history/search pagination, cursor, local history, seed, Top 50/album tổng, retention và public/private.
- [ ] Lint và typecheck sạch; tests pass. Ghi rõ checks chưa chạy hoặc hạn chế, không tuyên bố UI/audio native đã đạt.
- [ ] Chuẩn bị rules/indexes/backend config, backfill dry-run nếu cần, kế hoạch rollout/rollback và hướng dẫn vận hành.
- [ ] Sau khi hoàn thiện local: triển khai Firebase theo phạm vi đã chốt, không reset dữ liệu; ghi project đích và kết quả thực tế vào checkpoint. Bước này chưa được thực hiện trong phiên lập kế hoạch.

## 5. Điều kiện nghiệm thu

- Search rỗng không hiện catalog; có 20 mục mở gần nhất, xóa riêng/xóa tất cả đúng, không lẫn tài khoản.
- Search có query mới hiện filter, không có Tất cả; phân trang thực sự 20 + 10, không ghi đè bởi response cũ.
- Library mặc định chỉ favorites/followed artists; Lịch sử là màn riêng, Back trả đúng mặc định, không bị ô search Library lọc.
- History giữ dữ liệu phiên, view không lặp bài; 10 + 10 đến tối đa 100, không có copy giới hạn người dùng đã bỏ.
- Retention server giữ tối đa 1.000 sau khi dọn; không còn client xóa xuống 100, không phá playCount/receipts.
- Home giới hạn 20 suggestions/artists/albums; Charts đúng Top 50 theo genre trước trộn, queue đúng và seed ổn định.
- Follow/Unfollow không cần admin, counters đúng, lỗi không làm UI hiển thị trạng thái sai.
- Không còn dùng listener toàn catalog/users làm nền tìm kiếm production; dữ liệu công khai không lộ email hoặc nội dung riêng.
- Lint/typecheck/tests cần thiết đạt; kết quả đo tối ưu, giới hạn môi trường và trạng thái deploy được ghi đúng bằng chứng.

## 6. Bàn giao và điểm tiếp tục

### Checkpoint 2026-11-03 — Hoàn thành M1

**Đã làm:**

- Follow: bỏ cập nhật followerCount trùng; mỗi transaction đọc relation + hồ sơ người thực hiện + hồ sơ target, kiểm tra counters nguyên/không âm, ghi mỗi counter đúng một lần. Không sửa dữ liệu hoặc counters cloud.
- Tuần tự hóa các thao tác Follow theo Firebase app + UID. Kết quả thử ban đầu cho thấy hai yêu cầu cùng relation có thể dùng cùng trạng thái trước commit và bị rules từ chối; hàng đợi giữ thứ tự follow/unfollow và tính idempotent. Chặn thao tác của tài khoản cũ khi auth đã đổi.
- Rules: nhánh followingChange kiểm tra owner/field lastFollowingId trước khi truy cập và đánh giá relation; giữ yêu cầu counter delta khớp thay đổi relation trong thao tác nguyên tử. Không mở quyền sửa counter trực tiếp, không cần admin để follow. Chỉ sửa rules trên đĩa, chưa deploy.
- FollowButton dùng riêng library context, hiện Unfollow khi đang theo dõi, chặn nhấn lặp bằng useAction; lỗi không tự đổi trạng thái đang follow.
- PlayerContext có ba context Actions/State/Progress; vẫn chỉ một useAudioPlayer trong PlayerSession. Actions giữ reference ổn định, đọc status mới nhất khi toggle/seek; ngăn async completion/handler cũ thao tác engine sau logout hoặc đổi track.
- SongRow/HomeDiscovery/Album/Artist/Chart/Feed/Detail chỉ subscribe player actions; MiniPlayer và PlayerScreen dùng actions + state; riêng PlaybackProgress subscribe progress. usePlayer còn facade tương thích, source UI hiện dùng các hook hẹp. Tiếp tục dùng audio hook tự giải phóng theo SDK 58, không tạo audio engine/store bên ngoài.
- DataContext tách catalog/library/history và memo provider values; merge songs bằng Map, lookup artist/album O(1) cho mỗi bài, giữ object gốc khi metadata không cần đổi. useData facade chỉ kết hợp catalog/library; useHomeDiscovery opt-in history riêng.
- Search/Charts/Admin/Album/Artist/MyUploads/Upload/Detail dùng catalog context; FollowButton/useFavoriteSong/SongRow dùng library context. AppFrame không subscribe history/library khi chỉ cần errors.
- Loading theo từng nguồn catalog, library và history; Charts chỉ đợi Songs. Lỗi subscription bỏ khỏi phần hiển thị khi ID không còn trong tập theo dõi, không setState phụ trong effect để dọn lỗi.
- Listener bài liên kết và follower-only đối soát từng ID bằng createKeyedSubscriptions. ID không đổi giữ listener; thêm/bỏ đúng phần chênh lệch, không mở doc listener cho bài đã có query chung. Admin bỏ query own trùng với query all.
- ensureSong dùng dữ liệu từ query chung còn hoạt động; các yêu cầu chi tiết ngoài query coalesce khi pending và xác minh bằng getDocFromServer, không cache quyền đọc lâu dài. Listener mất quyền/xóa bài loại dữ liệu; request/callback cũ không được ghi lại sau cleanup, retry, logout hoặc StrictMode restart. Retry chỉ restart listener lỗi của ID được yêu cầu.
- Giữ metadata chi tiết đã tải trong lúc chờ snapshot đầu của chính ID đó; snapshot của bài khác không làm nó mất khỏi UI. Snapshot null hoặc permission error vẫn loại bỏ ngay bài tương ứng.
- Thêm happy-dom 21.0.4 làm devDependency qua expo install để kiểm tra lifecycle/render bằng ReactDOM; không thêm runtime dependency cho app, không nâng SDK hoặc thêm state library. Không chạy npm audit fix tự động.

**Bằng chứng render/lifecycle:**

| Tình huống trong harness React thật | Kết quả |
| --- | --- |
| 50 lần cập nhật progress | Consumer progress render thêm 50; actions/state render thêm 0; giữ cùng actions object và một engine stub |
| 10 lần cập nhật history | Consumer catalog render thêm 0; cùng reference mảng songs |
| Thêm/bỏ một linked/followed ID | Listener của ID không đổi được giữ; listener bỏ đi stop một lần, late callback bị bỏ qua |
| Logout/đổi tài khoản/StrictMode | Cleanup nguồn cũ; dữ liệu/request cũ không xuất hiện trong phiên mới |

Các phép đo trên là harness ReactDOM với Firebase transport và expo-audio được stub để điều khiển event, không phải đo FPS/âm thanh trên thiết bị. Kiểm tra Follow bổ sung dùng Auth/Firestore Emulator và rules thật của repo.

**Files chính:** src/contexts/DataContext.tsx, PlayerContext.tsx; src/utils/catalog.ts, subscriptions.ts; src/services/libraryService.ts, catalogService.ts; firestore.rules; FollowButton/MiniPlayer/PlayerScreen và các screen/hook đổi sang subscription hẹp; tests/providers.test.cjs, local-integration.test.cjs, ui.test.cjs, helpers/register-local.cjs; package.json/package-lock.json thêm devDependency và test command; roadmap/PROGRESS/LOCAL_DEVELOPMENT.

**Kiểm tra cuối:**

- npm.cmd run lint: PASS, exit 0, không lỗi/cảnh báo lint.
- npm.cmd run typecheck: PASS, exit 0.
- npm.cmd test: PASS 35/35 (22 tests trước M1 + 13 tests provider/lifecycle).
- npm.cmd run test:local:integration: PASS 4/4, exit 0. Bao gồm counters follow/unfollow, yêu cầu lặp/đồng thời/follow rồi unfollow, không cần admin, chống self-follow/sai UID, private/followers sau thu hồi và từ chối sửa counter trực tiếp. Dòng PERMISSION_DENIED của ca sửa counter trái phép là kết quả negative test mong đợi.
- git diff --check: PASS; chỉ thông báo line endings của Git.
- Kiểm tra netstat sau lượt cuối: không còn server của lượt kiểm tra listen ở 8080/9099/8787/4400.

**Lỗi đã xử lý khi thực hiện:** hook lint refs/set-state-in-effect được giải bằng callback được guard và errors suy ra; test StrictMode phải bao root thay vì chỉ subtree theo hành vi React; trace Emulator giúp tách lỗi counter trùng, guard field và cạnh tranh yêu cầu Follow. Trace lỗi thử nghiệm nằm trong .local/ bị ignore, không phải báo cáo kết quả hiện tại.

**Còn lại/giới hạn:** M2–M6 chưa bắt đầu. Search vẫn chưa có local history UI hoặc phân trang; Library chưa đổi bố cục/history route; retention vẫn 100 phiên ở client tới M4; Discovery chưa đổi thuật toán tới M5; public profiles/email và suite rules cũ còn trong M3/M6. Chưa chạy Android/iOS thật, chưa audit toàn bộ rules và chưa deploy Firebase. Requests chi tiết ngoài query chung cần kết nối server để xác minh quyền, không tuyên bố hỗ trợ offline mới.

**Tác vụ còn chạy:** không có process/server/Emulator do lượt M1 để lại sau checks cuối.

**Điểm tiếp tục:** M2 — AsyncStorage history 20 mục đã mở, xóa riêng/xóa tất cả, Search filter chỉ khi nhập, Library favorites + followed artists và hai nút Playlist của bạn/Lịch sử, tạo màn history riêng/Back đúng. Không làm lại M0/M1 và không tự sửa phần retention/Discovery của các mốc sau.

### Checkpoint 2026-11-03 — Hoàn thành M0

**Đã làm:**

- Baseline trước sửa: lint PASS, typecheck PASS, core/UI 16/16 PASS. Ghi hiện trạng nghiệp vụ chưa sửa trong LOCAL_DEVELOPMENT.md.
- Runtime mode rõ ràng emulator/cloud; thiếu mode/cấu hình local sai thì app hiện lỗi thiết lập, không mount providers và không fallback cloud. Local chỉ dùng demo-music-stream, loopback/LAN, config tổng hợp; Firebase app name tách persistence local/cloud.
- Auth web/native và Firestore kết nối Emulator trước thao tác SDK, tránh connect lặp trên cùng instance.
- Thêm Auth 9099/Firestore 8080/hub 4400 trong firebase.json. Lệnh start:local truyền env local, không đọc .env cloud; hỗ trợ LOCAL_APP_HOST cho Android emulator/điện thoại LAN.
- Backend Node local có /health và /session xác thực token local, đọc profile theo UID; chưa có Search/retention production. Seed được chặn project/host cloud trước ghi dữ liệu, dùng 26 tài khoản + 397 document fixture; seed lại cùng ID không nhân đôi dữ liệu.
- Fixture gồm 120 bài public + 3 visibility, 12 album, 160 phiên/80 bài khác nhau, 25 favorites, playlist/follow/post/comment; không media URL ngoài. Upload Cloudinary bị chặn trước file reads/FormData/fetch trong local.
- Cài dependencies tools đúng lockfile hiện có, không thêm dependency app hoặc đổi SDK. Cache emulator ở .local/ được ignore.
- Xử lý JVM còn sót trên Windows do Oracle javapath launcher: CLI local xác định java.home, ưu tiên JDK/bin trong PATH. Lần kiểm tra cuối đóng sạch Auth/Firestore/backend/hub, không còn listener 8080/9099/8787/4400.
- Viết LOCAL_DEVELOPMENT.md: commands, tài khoản thử, LAN host, cloud mode rõ ràng, baseline và giới hạn kiểm chứng.

**Files source/config mới hoặc sửa:** package.json, firebase.json, .gitignore; src/services/firebase/{runtime,config,emulators,firestore,auth.web,auth.native}; src/services/mediaUploadService.ts; src/app/_layout.tsx; scripts/start-local.cjs; tools/local/{environment,fixtures,seed,backend,cli}.cjs; tests/helpers/register-local.cjs; tests/local-environment.test.cjs; tests/local-integration.test.cjs. Docs: LOCAL_DEVELOPMENT.md, roadmap và PROGRESS.md.

**Kiểm tra sau sửa:**

- npm.cmd run lint: PASS, exit 0.
- npm.cmd run typecheck: PASS, exit 0.
- npm.cmd test: PASS 22/22 (16 core/UI + 6 môi trường/upload/fixture).
- npm.cmd run test:local:integration: PASS 3/3, exit 0, Auth/Firestore Emulator thực với rules hiện có; guest deny, login/catalog/history, private/followers/owner, backend token, admin claim và seed lại.
- npm.cmd run start:local -- --help: PASS, wrapper inject đúng endpoints và gọi được Expo CLI; chưa chạy giao diện native.
- git diff --check: PASS; chỉ có thông báo line endings của Git, không lỗi whitespace.

**Lỗi gặp và đã xử lý:** download npm/JAR cần quyền mạng ngoài sandbox; health check Firestore ban đầu dùng sai path đã đổi sang root readiness; test cleanup dùng createRequire để resolve Admin SDK ở tools; Oracle Java launcher để lại JVM đã sửa bằng JDK PATH trực tiếp. Các lỗi đầu không còn ở lượt test cuối.

**Giới hạn/còn lại:** M1–M6 chưa làm. Chưa chạy suite test:rules cũ vì fixture/expectations lỗi thời (M6); smoke M0 không đại diện audit đầy đủ. Chưa kiểm thử Android/iOS thực tế, chưa sửa Follow/Search/Library/history retention, chưa deploy/migrate Firebase thật. Node 26 có cảnh báo engine/deprecation của tools; khuyến nghị Node 22.18+/24 LTS, không đổi dependencies để né cảnh báo.

**Thay đổi người dùng giữ nguyên:** .env/.env.example, package-lock.json có sửa từ trước; docs/image_Loi.png đã bị xóa từ trước. Không reset/restore chúng.

**Tác vụ còn chạy:** không có server/Emulator do lượt kiểm tra này còn chạy; đã kiểm tra các cổng listen local sau test cuối.

**Điểm tiếp tục:** M1 — đọc lại setFollow/rules thực tế, sửa update followerCount trùng và nút Unfollow, thêm kiểm tra hành vi rồi tối ưu context/listener. Không làm lại M0; dùng hướng dẫn LOCAL_DEVELOPMENT.md để bật/seed môi trường khi cần.

### Checkpoint 2026-11-03 — Lập kế hoạch

**Đã làm:**

- Đọc lại AGENTS.md, kế hoạch cũ, PROGRESS và git status.
- Tổng hợp các chỉnh sửa mới nhất vào tài liệu này: history 1.000 phiên/dedupe 100 bài, Library mặc định favorites + follow, màn History riêng, Search local 20/remove/clear, pagination, Discovery và môi trường A trước.
- Đánh dấu kế hoạch cũ là tài liệu tham khảo, không dùng các quyết định đã bị thay thế.

**Chưa làm:** toàn bộ M0–M6 về triển khai source/backend/rules/deploy. Các dấu checkbox chưa đánh đều còn lại; chưa có code mới trong lượt lập kế hoạch này.

**File tài liệu thay đổi:** docs/IMPLEMENTATION_ROADMAP.md (mới), docs/SEARCH_DISCOVERY_PLAN.md (thêm liên kết thay thế), docs/PROGRESS.md (checkpoint mới).

**Kiểm tra:** `npm.cmd run lint` PASS (exit 0); `npm.cmd run typecheck` PASS (exit 0) trong lượt lập kế hoạch này. Chưa chạy Emulator/test nghiệp vụ mới, chưa kiểm tra thiết bị thật, chưa deploy.

**Thay đổi có sẵn trước lượt này:** .env.example, package-lock.json, docs/image_Loi.png bị xóa và các tài liệu từ phiên trước. Không reset/restore các thay đổi đó.

**Điểm tiếp tục:** M0 baseline và môi trường local, sau đó M1 sửa Follow. Xác minh lại source trước khi sửa; chưa coi các phân tích ở tài liệu cũ là lỗi đã được sửa.

**Tác vụ terminal còn chạy:** không có tại lúc tạo checkpoint; cập nhật lại nếu phát sinh.

### Mẫu ghi khi người dùng yêu cầu ngừng

- Thời gian và mốc đang làm:
- Đã hoàn thành (kèm file/hành vi):
- Đang dở (chưa được coi là hoàn thành):
- Kiểm tra đã chạy/kết quả/kiểm tra chưa chạy:
- Lỗi, rủi ro hoặc lựa chọn kỹ thuật chưa giải quyết:
- Công việc còn lại theo mã M0–M6:
- Tác vụ/process còn chạy và cách tiếp tục/dừng:
- Trạng thái Firebase (local/cloud, có deploy/migration hay chưa):
- Bước cụ thể để tiếp tục:
