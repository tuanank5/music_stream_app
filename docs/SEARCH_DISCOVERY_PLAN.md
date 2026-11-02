# Kế hoạch Search, Library, Discovery và Firebase

> Đã có cập nhật yêu cầu sau tài liệu này. Dùng [IMPLEMENTATION_ROADMAP.md](IMPLEMENTATION_ROADMAP.md) làm kế hoạch chính. Các mục Tất cả trong Search, Nghe gần đây trên Home, history summary theo songId và Library hỗn hợp playlist/album ở dưới đã được thay thế.

Ngày: 2026-11-03. Trạng thái: thiết kế theo lựa chọn người dùng, chưa triển khai source hoặc deploy.
Các quyết định trong tài liệu này cập nhật các đề xuất cũ tương ứng trong UI_IMPLEMENTATION_PLAN.md.

## 1. Phạm vi đã chọn

- Được thêm field tùy chọn và collection mới; bảo toàn dữ liệu/cấu trúc hiện có, không reset hoặc seed lại database thật.
- Ưu tiên Search và tối ưu context/listener.
- Lịch sử nghe hiển thị tối đa 100 bài khác nhau; nghe lại đưa bài lên đầu.
- Lịch sử tìm kiếm lưu cục bộ 20 mục thực sự được mở, không ghi Firestore.
- Search gồm Tất cả, Bài hát, Album, Nghệ sĩ; bổ sung kết quả người dùng thông thường có phân biệt loại hồ sơ.
- Library có tìm kiếm riêng; bỏ nút Yêu thích dư thừa và chip Tất cả. Chạm lại filter đang chọn sẽ bỏ chọn, hiển thị tất cả.
- Suggestions trộn quen/mới; thêm mục Nghe gần đây riêng.
- Charts theo tổng lượt nghe/thể loại; Popular artists ưu tiên follower, chỉ gồm người có bài công khai.
- Giữ tên Trending albums, tín hiệu chính là tổng lượt nghe các bài công khai của đúng album.
- Backend Node.js xử lý retention và tác vụ cần bảo vệ, mở rộng theo từng bước.
- Kiểm tra theo lựa chọn 14.A: lint, typecheck, tests tự động. Không coi đó là xác nhận trên thiết bị thật.
- Môi trường 13 chưa chốt; chuẩn bị local/Emulator, không tự deploy lên project hiện có.

## 2. Search: trải nghiệm và lịch sử trên thiết bị

Không nhập từ khóa: chỉ hiển thị tối đa 20 mục đã mở từ Search, mới nhất trước. Không trả toàn catalog và không tự ghi một từ khóa chỉ vì người dùng gõ nó.

Mỗi mục gồm version, kind (song/album/artist/user), id, title, subtitle, artwork và openedAt. Dùng AsyncStorage đã có trong dependencies; key theo phiên bản và UID để tài khoản trên cùng thiết bị không lẫn lịch sử. Chỉ lưu metadata công khai tối thiểu, không lưu email, token hay URL media riêng tư.

Khử trùng theo kind + id. Mở lại đưa lên đầu; giữ 20 mục. Có nút xóa từng mục và xóa tất cả. Đọc JSON phải kiểm tra dữ liệu, chịu được dữ liệu hỏng và lỗi storage. Serialize thao tác ghi để tránh mất mục khi nhấn liên tiếp; bỏ callback tải cũ sau khi đổi tài khoản. Lỗi lưu local không chặn mở nội dung.

Mở lịch sử cần kiểm tra lại tồn tại/quyền đọc bằng nguồn hiện tại; nội dung mất quyền hoặc bị xóa không tiếp tục phát từ metadata cache. Hiển thị lỗi có thể hiểu và cho xóa mục cũ. Không hứa đồng bộ giữa thiết bị; gỡ app/xóa dữ liệu thiết bị có thể làm mất lịch sử.

Khi có từ khóa:

- Giữ ô nhập phía trên, tab ngang Tất cả/Bài hát/Album/Nghệ sĩ. Người dùng thông thường nằm trong nhóm Người dùng của tab Tất cả; không giả là nghệ sĩ. Có thể thêm tab Người dùng nếu kết quả đủ nhiều.
- Kết quả chính xác trước, sau đó bắt đầu bằng từ khóa, khớp các từ, rồi tên nghệ sĩ/album liên quan. Popularity chỉ phân xử độ liên quan tương đương.
- Tab Tất cả: một kết quả nổi bật không lặp ở nhóm khác, preview từng loại và nút Xem tất cả chuyển tab/nhóm tương ứng. Nhóm Người dùng có danh sách mở rộng riêng trong cùng screen nếu chưa thêm tab.
- Tab/nhóm chuyên biệt: 20 kết quả một trang, tải thêm, có loading ban đầu/tải thêm/error/retry/empty/đã hết. Không dùng số kết quả trang hiện tại như tổng toàn hệ thống.
- Debounce truy vấn mạng khoảng 300 ms; thay query/tab thì reset trang. Bỏ response cũ, khử trùng ID giữa trang; giữ scroll khi tải thêm.
- Kết quả Search toàn cục chỉ là nội dung công khai. Tìm nội dung cá nhân trong Library theo quyền của tài khoản; không đưa private/unlisted/followers vào index công khai.
- Nhấn bài hát phát bài; nhấn album/nghệ sĩ/người dùng mở màn tương ứng rồi mới ghi lịch sử local. Với hồ sơ người dùng cần bổ sung màn công khai hoặc trạng thái người nghe trong màn hồ sơ công khai; không mở trang chỉnh sửa tài khoản của người khác.

## 3. Search phía server và Firebase

Tách SearchScreen → useSearch → searchService → endpoint Node.js; không phụ thuộc tải toàn bộ DataContext để tìm toàn catalog.

Hợp đồng request: query chuẩn hóa, loại kết quả, pageSize có giới hạn, cursor. Response: items, nextCursor, hasMore; total chỉ trả khi công cụ có số liệu đáng tin. Cursor gắn với query/loại/thứ tự/phiên bản index để không dùng nhầm giữa truy vấn.

Thiết kế chỉ mục riêng cho tên bài, nghệ sĩ, album, hồ sơ công khai; hỗ trợ tiếng Việt không dấu. Dùng generation/version để phân trang ổn định và cache ngắn hạn. Không xây endpoint đọc toàn collection Firestore trên mỗi lần gõ rồi lọc ở server; đó chỉ chuyển điểm nghẽn khỏi điện thoại.

Lựa chọn engine còn là quyết định kỹ thuật khi triển khai, sau khi xác minh edition Firebase: text search Enterprise cần text index và khả năng SDK tương thích; nếu database hiện tại không phù hợp thì adapter công cụ tìm kiếm riêng. Chưa chọn dịch vụ tính phí hoặc cài dependency trong bước kế hoạch này. Có thể chuẩn bị provider local với fixture/index cục bộ để chạy tests mà không chạm cloud.

Đồng bộ index khi create/update/delete; khi ẩn bài, bỏ khỏi index và kiểm tra lại trạng thái trước khi trả/phát. Index chỉ chứa public metadata. Endpoint Admin SDK phải xác thực và thực hiện kiểm tra quyền riêng vì Admin SDK không bị Security Rules giới hạn.

Hồ sơ công khai cần projection riêng (ví dụ publicProfiles/{uid}) không chứa email; users/{uid} tiếp tục lưu hồ sơ riêng. Có backfill và đổi client trước khi siết quyền users; không chặn users ngay khi watchArtists còn đọc collection đó. Profile nghệ sĩ được xác định bằng ít nhất một bài active/public/published; người nghe thông thường hiển thị đúng loại.

Không chỉ thêm limit vào watchSongs rồi tiếp tục tính Charts/album totals/Search từ tập bài bị cắt. Chuyển từng màn sang query/index/aggregate riêng trước khi bỏ listener catalog toàn cục.

## 4. Library

- Mặc định tab nội bộ all nhưng không có chip Tất cả.
- Chip Playlist/Bài hát/Album/Nghệ sĩ: chạm chọn để lọc danh sách trong Library, chạm lại để bỏ lọc; chạm item playlist mới mở chi tiết playlist.
- Bỏ nút Yêu thích vì trùng nguồn với Bài hát; giữ chức năng favorite trong menu bài hát và dữ liệu favorites hiện có.
- Tất cả gồm playlist, bài đã lưu, album có bài đã lưu và nghệ sĩ đang follow, không lặp cùng item. Không tự coi album là đã lưu độc lập nếu schema chưa có saved albums.
- SearchField lọc trong tập cá nhân và filter đang chọn. Nội dung private không đi qua index toàn cục. Khi thư viện lớn, chuyển query cá nhân sang phân trang riêng.
- Giữ thao tác tạo/sửa/xóa playlist và mục công cụ tài khoản. Không trộn search history vào playback history.

## 5. History 100 bài khác nhau và completed

Không đổi ngay historyId phiên nghe thành songId: rules hiện khóa startedAt, không cho counted chuyển true về false; đổi trực tiếp sẽ gây xung đột lượt nghe và app cũ.

Thiết kế tương thích đề xuất:

- Giữ users/{uid}/history/{historyId} làm dữ liệu phiên phục vụ cơ chế receipt/playCount đang có trong giai đoạn chuyển tiếp.
- Backend tổng hợp vào collection mới, ví dụ users/{uid}/listeningHistory/{songId}, một document cho một bài. Giao diện Nghe gần đây/gợi ý chuyển sang nguồn này sau khi backfill.
- Document tổng hợp: songId, playedAt, progressSeconds, durationSeconds, listenedSeconds, completed (lần nghe gần nhất), lastSessionId; everCompleted là field tùy chọn nếu cần biết đã từng nghe hết. Không dùng completed để đại diện đồng thời cả hai ý nghĩa.
- Nghe lại bài từng completed=true nhưng chưa hết ở phiên mới: completed=false; everCompleted giữ true nếu được triển khai. Tiến độ dùng để tiếp tục nghe lần gần nhất, không lấy max progress của mọi phiên.
- Xử lý event trùng/out-of-order bằng thời gian nguồn và session ID; không cho event cũ ghi đè phiên mới. everCompleted kết hợp OR trong transaction nếu có field này.
- Backend dọn summary còn 100 songId mới nhất; transaction hoặc cơ chế tuần tự theo UID phải tránh xóa một bài vừa được nghe lại. Trigger chỉ phản ứng thay đổi cần thiết, tránh tự kích hoạt vòng lặp.
- Giới hạn là eventual sau khi backend dọn, không phải Security Rules tự đếm collection. App query 100 mục mới nhất.
- Retention phiên nội bộ phải có policy riêng, không lưu vô hạn. Giữ nguyên cơ chế hiện tại trong lúc chuyển; khi chuyển retention server cần loại bỏ trimHistory client và xác định thời gian giữ phiên để không làm hỏng receipt còn dùng.
- Backfill chạy dry-run trước; nhóm các phiên theo songId, chọn phiên mới nhất, giữ tối đa 100 bài. Các phiên đã bị xóa trước đây không thể phục hồi; không thể cam kết backfill đủ 100 bài khác nhau từ 100 phiên cũ.
- Rules collection summary chỉ cho owner đọc; không cho client tự ghi các field tổng hợp do server quản lý. Bổ sung quyền xóa qua endpoint nếu cần chức năng xóa lịch sử.

completed không thừa: dùng cho resume và mức quan tâm. Chi phí đáng chú ý là nhịp ghi document và lượt đọc listener, không phải riêng boolean; không tạo một lần ghi riêng chỉ để thêm boolean nếu có thể cập nhật cùng tiến độ.

## 6. Home: đa dạng nhưng có ý nghĩa

Không Math.random trong render hoặc mỗi lần progress cập nhật. Dùng seed ổn định theo UID + phiên khám phá, đổi khi người dùng chủ động làm mới hoặc bắt đầu phiên mới. Seed không phải biện pháp bảo mật.

- Suggestions for you: 12 mục, đề xuất 4 bài quen + 6 bài cùng gu chưa nghe gần đây + 2 bài khám phá; thiếu nhóm nào thì bù từ nhóm còn lại. Không trùng bài; tối đa 2 bài cùng nghệ sĩ nếu catalog đủ. Tín hiệu mặc định đề xuất: thời lượng nghe/completed, lịch sử, favorites, following; câu 8 chưa được chọn riêng nên không thêm onboarding chọn gu.
- Nghe gần đây: 10 bài khác nhau theo thời gian nghe mới nhất, mở danh sách đầy đủ tối đa 100. Không trộn ngẫu nhiên mục này. Tải metadata của bài lịch sử còn quyền đọc theo ID vì catalog public có thể không chứa tất cả.
- Charts: Top 50 theo genre và tổng playCount. Giữ đúng thứ hạng trong chart; có thể đổi thứ tự genre trên Home theo gu/seed. Không giả chart ngày/tuần hoặc quốc gia.
- Popular artists: follower là tiêu chí chính; chỉ profile có bài công khai. Home luân phiên một số nghệ sĩ trong các nhóm mức phổ biến để tránh luôn cùng khuôn, ghi rõ đây là giới thiệu từ nhóm phổ biến; See all giữ follower giảm dần. Bỏ chính tài khoản hiện tại; chỉ loại người đã follow trong mục gợi ý follow riêng, không loại khỏi bảng phổ biến chung.
- Trending albums: giữ tên theo yêu cầu; tổng playCount thuộc đúng albumId, chỉ tính bài công khai còn hoạt động. Không mô tả tăng trưởng ngày/tuần. Home chọn đa dạng nghệ sĩ trong nhóm album phổ biến, See all xếp tổng lượt nghe giảm dần.
- Bài hát Home: trộn bài quen, cùng gu và khám phá với seed ổn định, không lấy 10 document đầu theo thứ tự Firestore. Queue là thứ tự người dùng nhìn thấy.
- Các thông số 4/6/2, 12/10, tối đa 2 bài/nghệ sĩ là thiết kế khởi đầu, sẽ kiểm tra bằng fixture ít bài/nhiều bài và điều chỉnh.

Không cộng tổng album hay xếp chart từ vài trang bài được tải ở client. Khi giảm catalog listener, backend phải cung cấp aggregate/danh sách xếp hạng nhất quán. Chưa cần ML; dùng scoring có giải thích và diversity trước.

## 7. Tối ưu React và listener

- DataContext: useMemo cho mergedSongs; Map artist/album theo ID; ổn định provider value. Tách dữ liệu catalog khỏi thay đổi history/library để cập nhật lịch sử không làm Search tính lại catalog.
- Player: giữ một audio engine, tách context actions/track/progress. SongRow và HomeDiscovery chỉ cần actions, không subscribe progress.
- Search: normalize dữ liệu khi index thay đổi, không normalize mọi bài trên mỗi ký tự; useCallback cho boundary cần reference ổn định, không bọc mọi hàm.
- Listener theo ID: diff thêm/bỏ, tránh unsubscribe/re-subscribe ID không đổi; gộp ensureSong đang pending. Có invalidation/quyền đọc, không dùng cache vô hạn.
- Loading/error theo nguồn; không dùng riêng Songs loading để kết luận Artists/Albums đã tải xong.
- Home giới hạn card; màn danh sách dài dùng virtualization. Pagination phải giảm query/read, không chỉ slice sau khi đã tải toàn bộ.
- Đo riêng số lần render, thời gian nhập/tìm, read/write, số listener. Không tuyên bố tối ưu hết chỉ vì đã thêm hook.

## 8. Lỗi Follow đã tìm thấy trong source

setFollow trong src/services/libraryService.ts có hai transaction.update liên tiếp cùng tăng followerCount của target bằng increment(delta). Rules followerChange/counters yêu cầu thay đổi đúng delta một lần. Đây là nguyên nhân source phù hợp lỗi permission-denied đã báo; chưa kiểm tra rules thực tế trên cloud.

Sửa dự kiến: bỏ update trùng, vẫn giữ transaction relation + followingCount của chủ tài khoản + followerCount target. Kiểm tra follow/unfollow/idempotent/self-follow và counter không âm; không nới rules để chấp nhận tăng hai lần và không yêu cầu custom claim admin cho thao tác follow bình thường.

## 9. Môi trường A và C

13.A: Auth/Firestore/Node endpoint chạy local qua Emulator với fixture. Không thao tác Firebase cloud nếu mọi kết nối đã trỏ đúng emulator; Cloudinary và dịch vụ bên ngoài vẫn cần mock/tắt riêng. Điện thoại thật cần host LAN phù hợp thay vì localhost của điện thoại. Dùng project demo để tránh rơi sang dịch vụ thật; cấu hình fail-closed khi thiếu emulator.

13.C: app kết nối project Firebase cloud đang có, thay đổi dữ liệu/rules/indexes thật và có thể phát sinh usage. Phù hợp thử tích hợp cuối nếu dữ liệu thử có thể thay đổi; không tương đương Emulator. Không tự seed, migration hoặc deploy theo lựa chọn chưa chốt.

Hai cách có thể dùng lần lượt A → C. Hiện chỉ chuẩn bị A; cần lựa chọn môi trường trước bước kết nối/triển khai thay đổi cloud.

## 10. Thứ tự triển khai và kiểm chứng

1. Sửa transaction Follow trùng; unit test xác nhận mỗi counter chỉ tăng/giảm một lần. Cập nhật tests rules cũ theo schema hiện hành, không coi bộ UI/core là bằng chứng rules.
2. Tách actions player, memo/Map DataContext và quản lý listener theo ID; kiểm tra không đổi hành vi audio/logout/quyền.
3. Local search history 20 mục, các states và Library toggle filters, bỏ nút dư. Tests khử trùng, giới hạn, đổi tài khoản, JSON hỏng và lỗi lưu.
4. Node search adapter + index local + phân trang UI. Tests tiếng Việt, relevance, cursor, response cũ, quyền/public metadata, hồ sơ người dùng và nghệ sĩ.
5. Diversity Home + Nghe gần đây; tests không trùng, ổn định seed, đúng albumId/chart rank, catalog ít bài và cold start.
6. Summary history theo songId + retention Node.js + migration dry-run. Tests phiên mới/cũ, completed/everCompleted, replay, trùng event, retention và tài khoản khác.
7. Lint/typecheck/tests tự động; báo đúng checks đã chạy. Rules Emulator là kiểm tra tự động, có thể nằm trong 14.A; nếu môi trường thiếu runtime phải ghi rõ chưa chạy, không khẳng định quyền đã được xác nhận.

Không tự deploy, cài dịch vụ tính phí, reset database hay chạy migration thật trong bước lập kế hoạch. Không thêm audio provider thứ hai.

## Nguồn kỹ thuật đã tra

- Expo SDK 58: https://docs.expo.dev/versions/v58.0.0/
- AsyncStorage SDK 58: https://docs.expo.dev/versions/v58.0.0/sdk/async-storage/
- Expo Router: https://docs.expo.dev/router/introduction/
- Firestore transactions: https://firebase.google.com/docs/firestore/manage-data/transactions
- Firestore text search/edition: https://firebase.google.com/docs/firestore/enterprise/text-search
- Emulator: https://firebase.google.com/docs/emulator-suite
- Billing: https://firebase.google.com/docs/firestore/pricing
- Environments: https://firebase.google.com/docs/projects/dev-workflows/overview-environments
