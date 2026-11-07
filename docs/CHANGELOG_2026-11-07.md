# Nhật ký thay đổi ngày 07/11/2026

## Cập nhật mới: tìm kiếm chồng nhau và index theo thay đổi Firestore

- Bỏ khóa chỉ cho một lượt semantic search trên toàn backend. Cho phép tối đa 16 lượt đang xử lý; “busy” chỉ dùng khi đạt ngưỡng này. Query mới của cùng UID thay thế query cũ; dừng sớm query cũ sau đọc vector và trước gọi embedding nếu đã bị thay thế. Request provider đã gửi không bị hủy hồi tố; giới hạn ngày vẫn giữ nguyên.
- Query cache đọc được cả Firestore Timestamp và Date; cùng UID/query dùng lại cache hợp lệ, không dùng cache query của UID khác.
- Sau khi server listen, index worker tiếp tục nhận thay đổi từ snapshot songs/users. Thêm bài công khai hoặc sửa tên/nghệ sĩ/genre sẽ được đưa vào hàng chờ có debounce, gộp theo ID và chỉ giữ phiên bản mới nhất chưa xử lý.
- Lượt nghe, ảnh bìa và follower count không đổi canonical input thì không gọi embedding lại. Input v1 vẫn chưa gồm Album/mô tả/lyric.
- Bài chuyển riêng tư, inactive, bị xóa hoặc chủ tài khoản không còn active được bỏ khỏi nguồn public và hàng chờ. Kết quả tìm kiếm vẫn hydrate/kiểm tra quyền trước khi trả về. Cache vector theo content hash cũ có thể còn trong Firestore, không tự xóa vì có thể dùng chung; đây không phải cleanup vật lý.
- Inference đã chạy khi bài đổi quyền có thể hoàn tất và lưu cache hash cũ; worker không đánh dấu bản mới là đã index. Hash cũ không thay thế vector của metadata mới.
- Lỗi provider/quota dừng lượt index hiện tại và có cooldown 60 giây; chỉ thử lại khi có thay đổi tiếp theo hoặc restart, không lặp gọi liên tục. AI tắt không khởi tạo worker. Giới hạn catalog demo 1.000 bài và quota ngày không tăng.
- Test regression bổ sung: tìm chồng nhau, hủy ý định query cũ trước inference, cache theo UID, thay đổi metadata lúc đang index, thu hồi pending work, và ngắt batch khi provider lỗi. Chưa nghiệm thu các thay đổi này trên Render; cần deploy bản mới để áp dụng. Chưa commit/push trong lượt này.
- Kết quả sau cập nhật: 123/123 unit test đạt; lint, typecheck, kiểm tra đóng gói backend source và diff check đạt. Không gọi provider thật trong bộ test.


Ghi nhận các thay đổi local trong đợt triển khai AI và bản sửa follow/unfollow ngay sau đó. Chưa commit/push hoặc deploy các thay đổi này. Các chỉnh sửa giao diện có từ trước vẫn nằm trong working tree, không được coi là phát sinh từ đợt này.

## 1. MVP tìm kiếm thông minh bằng embedding

### Đã thực hiện

- Thêm module backend `tools/backend/ai/search.cjs`: gọi Gemini embedding, kiểm tra số chiều/giá trị vector, chuẩn hóa và kết hợp thứ hạng vector với tìm kiếm FTS hiện có.
- Thêm chế độ `/search?mode=smart`; mặc định vẫn là keyword. Các trang tiếp theo dùng snapshot/cursor đã ký, không gọi lại embedding để xếp hạng từng trang.
- Thêm nút bật/tắt tìm thông minh trong Search và truyền mode qua `useSearch`.
- Vector nội dung được lưu bền trong Firestore theo model/dimension/content hash, không phụ thuộc filesystem Render. Input v1 gồm tên bài, nghệ sĩ và genre.
- Query cache phân theo UID, có hạn sử dụng 24 giờ. Cần cấu hình TTL Firestore riêng để dọn vật lý.
- Giới hạn request embedding/ngày được lưu nguyên tử trong `aiUsage`, dùng chung cho index và query. AI mặc định tắt; giới hạn mặc định 0 chặn gọi API.
- Thêm `npm run ai:index` để tạo index thủ công cho bài công khai của tài khoản nghệ sĩ còn hoạt động. MVP giới hạn 1.000 bài; chưa tự indexing khi upload hoặc sửa metadata.
- Khi AI tắt, chưa có vector, vượt giới hạn, đang bận hoặc provider lỗi, trả kết quả từ khóa. Không gọi model sinh văn bản trong luồng này.

### File liên quan

- `tools/backend/ai/search.cjs`
- `tools/backend/ai/index-public.cjs`
- `tools/backend/service.cjs`
- `tools/backend/backend.env.example`
- `src/hooks/useSearch.ts`
- `src/screens/SearchScreen.tsx`
- `tests/ai-search.test.cjs`
- `package.json`

## 2. Trạng thái fallback và kiểm tra cấu hình AI

### Đã thực hiện

- Search hiển thị rõ khi tìm thông minh chưa sẵn sàng, đang chuẩn bị nội dung, đang bận hoặc chuyển về tìm từ khóa.
- Bộ lọc Album/Nghệ sĩ thông báo hiện dùng tìm từ khóa; semantic search MVP hỗ trợ Bài hát.
- Pager giữ `fallbackReason` của trang đầu khi tải thêm, tránh hiện như AI đã hoạt động chỉ vì response trang sau không có lý do fallback.
- Scope cursor smart search gắn với query gốc và phiên bản embedding.
- Thêm `npm run ai:check`: chỉ kiểm tra cấu hình, không inference và không in key.
- Thêm `npm run ai:check -- --smoke`: chủ động gọi một embedding mẫu, xác minh response và dimension, không ghi Firestore. Lệnh này dùng quota provider và không đi qua ledger quota của ứng dụng; chỉ chạy thủ công sau khi có cấu hình/quyền phù hợp.
- Cập nhật `AI_DESIGN_2026-11-07.md` với tiến độ, hướng dẫn cấu hình key và các phần chưa triển khai.

### File liên quan

- `src/utils/pager.ts`
- `src/utils/searchStatus.ts`
- `src/screens/SearchScreen.tsx`
- `tools/backend/service.cjs`
- `tools/backend/ai/preflight.cjs`
- `tests/ai-search.test.cjs`
- `package.json`
- `docs/AI_DESIGN_2026-11-07.md`

### Điểm đang chờ

`ai:check` đã báo backend chưa đủ cấu hình AI. Cần Gemini API key riêng, khác Firebase API key, và xác minh model/quota thực tế trước khi gọi provider thật. Key chỉ đặt ở backend/Render, không gửi vào chat hoặc đưa vào biến public của Expo.

Chưa gọi inference thật, chưa tạo index trên project cloud, chưa xác minh quyền/model/region, chưa QA giao diện Android/Web và chưa deploy. LLM intent parser, vector recommendations, tự động indexing, lyric draft/job/editor/worker và Vertex vẫn là các phần thiết kế cần triển khai tiếp.

## 3. Sửa thông báo đỏ khi follow/unfollow

### Hiện tượng

Khi follow hoặc hủy follow, ứng dụng đôi lúc hiện thông báo dạng `Following songs:{artistId}: Không còn theo dõi nghệ sĩ.`. ID trong nguồn lỗi này là ID nghệ sĩ được theo dõi.

### Nguyên nhân tìm thấy

Sau khi thay đổi quan hệ follow, subscription tải lại bài hát của nghệ sĩ trong khi danh sách `/following` chưa cập nhật xong. Nếu quan hệ đã bị xóa trên backend, API trả HTTP 403 với thông báo `Không còn theo dõi nghệ sĩ.`.

Lỗi này trước đây được chuyển thành lỗi terminal của keyed subscription, làm xuất hiện thông báo kỹ thuật và có thể khiến subscription không nhận dữ liệu mới khi follow lại nhanh. Một request cũ bị lỗi dù đã có lượt refresh mới chờ cũng có thể gây tình trạng tương tự.

### Bản sửa

- Trong `watchFollowedArtistSongs`, chỉ chuyển **đúng trường hợp HTTP 403 kèm thông báo “Không còn theo dõi nghệ sĩ.”** thành danh sách rỗng. Không biến nó thành lỗi terminal.
- Giữ subscription có thể tải lại khi follow trở lại.
- Trong `subscribePrivateList`, chỉ phát lỗi khi request còn hợp lệ và không có lượt refresh mới đang chờ (`!dirty`). Request cũ không làm hỏng subscription trước khi lượt refresh mới chạy.
- Lỗi quyền khác, tài khoản bị vô hiệu hóa và lỗi thật không bị ẩn bởi nhánh xử lý này.
- Không sửa quy tắc quyền backend để cho phép đọc nội dung trái quyền.

### File liên quan

- `src/services/catalogService.ts`
- `src/services/playlistSubscriptions.ts`
- `tests/follow-subscriptions.test.cjs`
- `package.json` — đưa test regression vào `npm test`.

### Kiểm thử regression

Đã kiểm tra chuỗi: nhận bài đang follow → unfollow trả lỗi đặc thù → danh sách rỗng, không phát lỗi → follow lại nhận bài; lỗi request cũ bị thay thế không làm subscription hỏng; lỗi 403 khác vẫn được báo; callback về sau unsubscribe không cập nhật dữ liệu.

## 4. Kết quả kiểm tra

| Mốc                           | Kết quả                                                                         |
| ----------------------------- | ------------------------------------------------------------------------------- |
| MVP embedding ban đầu         | 114/114 unit test đạt; lint/typecheck đạt; kiểm tra đóng gói backend source đạt |
| Thêm fallback UI và preflight | 116/116 unit test đạt; lint/typecheck đạt                                       |
| Sau sửa follow/unfollow       | 117/117 unit test đạt; lint/typecheck đạt; diff check các file liên quan đạt    |

Các kết quả trên là kiểm thử local với provider giả lập và regression theo code. Chưa thay thế thao tác xác nhận trên Android/Web hoặc kiểm thử Google/Render thật. Cần tải lại app và thử follow/unfollow liên tiếp trên thiết bị để nghiệm thu giao diện.

File nhật ký này chỉ ghi nhận công việc đã làm; không thay đổi trạng thái triển khai hoặc tự động commit/push.

## 5. Nạp cấu hình AI khi chạy lệnh trên local

- Sửa `ai:check` và `ai:index` để Node nạp file `.env.ai` nếu có. File này ở root, đã thuộc mẫu ignore `.env.*`; không đưa secret vào Git.
- Thêm mẫu `tools/backend/ai/demo.env.example`, cần copy về `.env.ai` và tự điền key cùng đường dẫn credentials trên máy local. Không sử dụng đường dẫn Secret File của Render trên Windows.
- Cải thiện thông báo thiếu cấu hình và lỗi HTTP model; không in API key hoặc phản hồi thô của provider.
- Các biến nhập trên Render không tự truyền về terminal local. Lệnh smoke chỉ cần cấu hình Gemini; index cần thêm project Firebase thật và Application Default Credentials.
- Kiểm tra: 7/7 test AI đạt; lint và typecheck đạt. Chưa gọi cloud, chưa commit/push.

## 6. Chạy index hoàn toàn trên Render

- Khi backend cloud đã listen HTTP và AI được cấu hình/bật, tự khởi chạy index công khai trong nền. Không cần `.env.ai` trên máy local hoặc Shell của Render Free.
- Dùng credentials và Environment hiện có của Render; chỉ xử lý tối đa 1.000 bài, lưu vector theo hash vào Firestore. Cache hiện có được dùng lại sau restart; request mới vẫn chịu hạn mức ngày.
- Lỗi model/quota chỉ báo log tổng quát, không làm health hoặc keyword search fail. Đóng server ngăn bắt đầu xử lý bài kế tiếp. Index đang chạy có thể bị gián đoạn khi service ngủ/restart; deploy lại sẽ dùng cache đã lưu.
- Lần này chỉ index khi server bắt đầu listen, chưa tự index từng bài upload mới; cần restart/deploy lại sau khi đổi catalog để tạo vector mới.
- Render log cần có `AI index: ready, ... public songs processed.`. Nếu báo unavailable, cần kiểm tra quota/model; không tự chuyển paid tier.
- Kiểm tra local: 118/118 test, lint/typecheck và backend source packaging đạt. Chưa xác nhận inference thật trên Render.
- Truy cập Dashboard tự động bị công cụ dừng vì không xác định được URL trình duyệt đủ chắc chắn; chưa bấm deploy qua UI.
