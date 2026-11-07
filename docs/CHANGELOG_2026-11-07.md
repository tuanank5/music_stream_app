# Nhật ký thay đổi ngày 07/11/2026

## Luồng lyric trực tiếp, không lưu draft vào Firebase

- Theo yêu cầu mới: bỏ service lyric-jobs, endpoint audio-lyric-job, draft/source document và bước kiểm tra tiến độ. Thay bằng POST `/audio-lyric`, chờ kết quả AI rồi trả `{text}` trực tiếp cho form upload.
- Text nháp chỉ tồn tại trong RAM request và state form; người dùng sửa và Lưu mới ghi `songs.lyric` qua POST songs hiện có. Không ghi lyricJobs/lyricUploadSources/songs khi chỉ tạo lời. Chưa tự xóa dữ liệu từ phiên bản job cũ nếu đã có trên cloud.
- Chỉ giữ transaction quota `aiUsage/lyrics_{day}` để hạn chế sử dụng demo. Dedupe request đang chạy dùng RAM, không cache text trong database. Request trùng cùng audio/UID đang chạy dùng một lần inference; request mới sau khi xong là lượt tạo mới và tính quota lại.
- Form không có nút kiểm tra tiến độ. Lưu tạm khóa khi đang tạo lời; timeout riêng cho POST audio-lyric là 6 phút. Không tự retry ASR khi lỗi/timeout; phần đang gõ và callback nguồn cũ vẫn được bảo vệ.
- Bổ sung log chẩn đoán stage/status/code whitelist cho lỗi model/upload/đọc kết quả. Không in key, provider body thô, URL riêng tư hoặc lyric. Bản cũ che nguyên nhân bằng thông báo chung; cần log sau deploy để xác định lỗi cloud thực tế, chưa thể kết luận là quota/model.
- Kiểm thử: 135/135 test đạt, backend source packaging và typecheck đạt; lint kiểm tra cùng đợt. Test khẳng định chỉ ghi user/quota, không tạo songs/draft/source; kiểm tra chống duplicate, lỗi quyền/quota, UI không ghi đè phần gõ, provider cleanup. Chưa gọi ASR thật, chưa commit/push/deploy trong lượt chỉnh này.

## Chỉnh chữ trong form tạo lyric

- Bỏ đoạn “Tùy chọn: gửi audio đã chọn tới Gemini…” khỏi form Đăng tải bài hát theo yêu cầu. Giữ nút tạo lời nháp và ô Lyric; không đổi luồng xử lý hay giới hạn backend.

## Điều chỉnh lyric AI: chỉ tạo trong lúc Đăng tải bài hát

- Thay luồng tạo lời sau đăng bằng `UploadLyricDraft` trong UploadSongScreen, ngay phía trên ô Lời bài hát. Chọn audio → tạo draft → kiểm tra/điền → sửa → Lưu bài.
- Upload audio một lần và dùng lại publicId/cache khi Lưu. Gỡ client guard đòi duration upload phải có ngay; backend vẫn xác minh duration từ Cloudinary/bytes khi lưu bài.
- Backend mới dùng `/audio-lyric-config` và GET/POST `/audio-lyric-job`; xác minh audioPublicId thuộc UID, nguồn upload riêng ở `lyricUploadSources`, không tạo document songs trước khi đăng. Quota/consent/idempotency/lease và kiểm tra account vẫn giữ.
- Gỡ LyricDraftEditor, endpoint `/songs/:id/lyric-job` và PATCH `/songs/:id/lyrics`. LyricsScreen vẫn fetch theo ID để mở trực tiếp được, nhưng chỉ đọc.
- Callback cũ không điền lyric sau khi đổi file/unmount; không ghi đè phần đang gõ nếu request trả về muộn. Có nút áp dụng draft chủ động. Chọn lại cùng URI cũng làm mất cache audio cũ để tránh dùng sai file.
- Kiểm thử cả trường hợp chưa có bất kỳ document songs, không cho UID khác đọc draft, thiếu consent/quota, tài khoản bị khóa giữa job, HTTP loại bỏ endpoint cũ, UI giữ text đang gõ và chặn late callback. Bộ AI hiện 23 test đạt; toàn bộ test 135/135 đạt. Chưa gọi Gemini thật hoặc deploy trong đợt chỉnh flow.
- Mục workflow lyric sau khi đăng trong các đoạn changelog cũ là lịch sử, không còn là implementation hiện hành. Cần TTL/retention cho cả lyricUploadSources và lyricJobs (expiresAt 7 ngày); hiện chưa tự cấu hình TTL ở cloud.

## AI: tạo lyric nháp, sửa và duyệt

- Thêm `lyric-jobs.cjs`, `lyric-routes.cjs`, `transcribe.cjs` và `LyricDraftEditor.tsx`. LyricsScreen tải bài theo ID qua backend nên mở trực tiếp không còn phụ thuộc bài đã có trong catalog cache.
- Chủ bài có thể nhập/sửa/lưu lyric thủ công dù AI tắt. PATCH `/songs/:id/lyrics` kiểm tra owner/account active và `expectedLyrics`, trả 409 nếu lyric đã đổi ở thiết bị khác. Lưu vào field `songs.lyric`, DTO vẫn dùng `lyrics`.
- POST `/songs/:id/lyric-job` yêu cầu consent gửi audio tới Gemini; GET cùng đường dẫn chỉ trả trạng thái/draft cho owner. Tối đa một job chạy trong mỗi process, chặn gửi trùng; job lưu bền ở `lyricJobs`, keyed theo UID/song, có ID phiên riêng và hash nguồn audio.
- Quota audio/ngày dùng transaction trong `aiUsage/lyrics_{day}`; reserve số giây trước xử lý, không hoàn quota tự động khi lỗi. Tối đa 5 phút/bài và 30 MiB. Mặc định AI lyric tắt và quota 0, không tự dùng quota embedding hay bật trả phí.
- Backend xác minh audio sở hữu qua Cloudinary, tải bytes có giới hạn, upload qua Gemini Files API, gọi `gemini-3.5-transcribe` ở mode verbatim để giữ câu lặp. Không nhận URL do client đưa vào. Xóa file provider best-effort sau tác vụ; Files API có retention riêng nếu cleanup thất bại.
- Kết quả chỉ là draft, không tự ghi lyric công khai. Người dùng bấm đưa draft vào ô sửa, kiểm tra rồi Lưu. Recheck owner/account/source khi hoàn tất và khi duyệt; audio đổi hoặc account bị khóa không được ghi kết quả cũ.
- Job có lease 10 phút; restart Render có thể ngắt công việc. Hết lease hiển thị interrupted và cho yêu cầu lại, không tự retry inference/mất kiểm soát quota. MVP dùng nút “Kiểm tra tiến độ / tải lại bản nháp”, chưa tự polling và chưa có worker/queue luôn hoạt động. Draft có expiresAt 7 ngày; cần cấu hình Firestore TTL để dọn vật lý, không tự cài TTL trong đợt này.
- Biến backend mới (chỉ bật sau khi kiểm tra Free Tier/quyền model): `AI_LYRICS_ENABLED=true`, `AI_TRANSCRIBE_MODEL=gemini-3.5-transcribe`, `AI_DAILY_AUDIO_SECONDS=600` cho demo 10 phút/ngày. Dùng cùng GEMINI_API_KEY; AI_ENABLED vẫn phải true. Bảng giá công khai có Free Tier cho model nhưng chưa xác minh inference/region/quota của project cho ASR, chưa bật hoặc gọi model thật trong đợt này.
- Canonical embedding v1 chưa gồm lyric, nên duyệt lyric không tự tạo lại vector metadata. Chưa tạo audio embedding hoặc lời đồng bộ timestamp.
- Kiểm tra: 134/134 unit test đạt; typecheck/backend source packaging đạt; lint kiểm tra cùng đợt. Test gồm chống duplicate, ownership, quota, publish có duyệt, xung đột lyric, thay audio/khóa tài khoản giữa job, upload/cleanup provider giả lập và HTTP auth/manual edit. Chưa QA Android/Web, chưa gọi ASR thật, chưa commit/push/deploy.
- Nguồn API đối chiếu: [Transcription](https://ai.google.dev/gemini-api/docs/transcribe), [Files API](https://ai.google.dev/api/files), [Interactions migration](https://ai.google.dev/gemini-api/docs/interactions-breaking-changes-may-2026), [Pricing](https://ai.google.dev/gemini-api/docs/pricing).

## AI: gợi ý vector trong Suggestions for you và chi tiết bài hát

- `/discovery` tiếp tục dùng `suggestSongs` cũ làm baseline từ lịch sử nghe, favorite, genre và following. Thêm lớp vector cá nhân hóa vào chính danh sách `suggestions` mà Home đang hiển thị trong “Suggestions for you”; không tạo một rail Home thứ hai.
- Preference vector được tính trong bộ nhớ mỗi request từ vector công khai đã lưu: favorite có trọng số 3; nghe hết 3, nghe một phần theo tỷ lệ với trần 2, giảm dần theo độ cũ trong lịch sử. Seed riêng tư/inactive không được dùng; không lưu vector sở thích người dùng vào collection public hoặc cache chung.
- Trộn thứ hạng metadata và cosine bằng RRF, tăng nhẹ điểm cho nghệ sĩ đang follow. Phân bổ mục tiêu tối đa 6 bài quen/yêu thích, 8 bài liên quan chưa nghe, 6 khám phá; loại trùng, bù khi thiếu dữ liệu và hạn chế lặp nghệ sĩ. Đây là phân bổ mềm, không cam kết chính xác 6/8/6 với catalog ít bài.
- Khi không có history/favorite, AI tắt, vượt giới hạn, thiếu vector hoặc lỗi đọc kho vector, giữ nguyên kết quả baseline đã có. Không bịa sở thích khi chưa có dữ liệu.
- Thêm `/similar-songs?id=...` và `SimilarSongsSection` dưới SongScreen cho bài công khai: tối đa 8 bài khác, phối hợp metadata/vector và đa dạng nghệ sĩ; kiểm tra nguồn/đích lại qua hydrate trước response, không trả vector/score hoặc thông tin riêng tư về client.
- Các luồng gợi ý chỉ đọc vector đã lưu; không gọi embedding API hoặc LLM khi mở/refresh gợi ý. Có đọc Firestore, vẫn cần theo dõi hạn mức Firestore. Tương tự ở đây dựa trên tên/nghệ sĩ/genre, chưa phân tích giai điệu/audio.
- Kiểm thử: 129/129 unit test đạt (bao gồm test M4A đang ở working tree), typecheck và backend source packaging đạt; lint được kiểm tra cùng đợt. Chưa QA Android/Web hoặc deploy phần gợi ý; chưa commit/push.
- File mới: `tools/backend/ai/similar.cjs`, `src/components/SimilarSongsSection.tsx`. File thay đổi: `tools/backend/ai/search.cjs`, `tools/backend/service.cjs`, `src/screens/SongScreen.tsx`, `tests/ai-search.test.cjs`, tài liệu AI/changelog. Giữ các thay đổi M4A độc lập về code.

## Sửa Lưu M4A bị từ chối ở bước xác minh backend

- Người dùng báo M4A khoảng 20 MB/3 phút upload được nhưng nhấn Lưu nhận lỗi “Không đọc được audio hợp lệ hoặc file chứa video…”.
- Phát hiện bộ kiểm tra chỉ cho ext m4a, trong khi file-type nhận ISO BMFF major brand isom/mp42 thành mp4/video MIME, kể cả khi chỉ có audio. Bộ kiểm tra chặn trước bước đọc track thực tế.
- `tools/backend/inspect-audio.cjs` cho container mp4 đi tiếp qua music-metadata; vẫn từ chối hasVideo/track video, hasAudio=false, thiếu sample rate/channels, duration không hợp lệ, quá 180 phút hoặc quá 30 MiB. Không tin phần mở rộng tên file để kết luận có video.
- Thêm fixture ISO BMFF tổng hợp trong `tests/helpers/mp4-audio.cjs` (metadata kiểm thử, không phải bản nhạc phát được). Test container 20 MiB/180 giây đã thất bại với đúng thông báo trước bản sửa và đạt sau bản sửa. Có test audio M4A brand truyền thống, container có video dù mang brand M4A, thời lượng 0 và vượt giới hạn.
- 125/125 unit test đạt; lint/typecheck và backend source packaging đạt. Chưa thử trực tiếp bytes file của người dùng, chưa gọi Cloudinary thật; chưa commit/push/deploy bản sửa này. Cần deploy backend mới để thử lại thao tác Lưu trên Render.

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
