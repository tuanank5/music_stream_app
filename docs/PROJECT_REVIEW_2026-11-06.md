# Rà soát dự án và định hướng APK/backend/AI

Ngày rà soát: 2026-11-06. Nguồn chính là mã đang có trong workspace, không coi checkpoint cũ là trạng thái hiện hành. Đây là báo cáo phân tích, chưa triển khai cloud, chưa bật billing hoặc thay dữ liệu. Hai tài liệu AI/Render đang bị xóa trong working tree được giữ nguyên trạng thái.

## 1. Kiến trúc thực tế

- Expo ~58.0.20, React Native 0.88, React 19.3, Expo Router; npm/package-lock, không thấy bun.lock.
- Firebase Auth quản lý danh tính. Nghiệp vụ đi qua Express 5 trong tools/backend; Firestore Admin SDK giữ dữ liệu chuẩn. Rules trong repo deny toàn bộ SDK client; chưa xác nhận Rules đã deploy lên cloud.
- Đã có API hồ sơ, catalog, follow/favorite, album/playlist, feed/comments, upload, playback/history, search/discovery. Các tên hàm watch còn tồn tại không có nghĩa vẫn là Firestore realtime; catalog gọi backend và cơ chế subscription/invalidation của app.
- Search hiện là SQLite FTS5 trong RAM (`search-index.cjs`), chưa có embedding/vector search. Discovery dùng lịch sử, thể loại, độ phổ biến, diversity và follow graph; chưa gọi mô hình sinh văn bản.
- Backend preload/listen users, songs, albums, following. Cursor snapshots, playback sessions và rate limiter có trạng thái RAM; backend hiện phù hợp một process hơn là nhiều instance.
- Lyrics hiện nhập tay trong UploadSongScreen, lưu `lyric`, DTO ánh xạ thành `lyrics`; chưa có pipeline transcription, trạng thái job hoặc lời đồng bộ thời gian.
- Local đã nhận ảnh/audio thật qua multipart, kiểm tra nội dung, owner, dung lượng, duration và lưu `.local/uploads`. Endpoint chỉ mount ở emulator demo. Cloud audio dùng signed Cloudinary; ảnh còn unsigned preset.

## 2. Các phát hiện ưu tiên

| Mức | Phát hiện có bằng chứng | Việc cần làm |
| --- | --- | --- |
| P0 trước container | Dockerfile.backend copy recommendations.ts và runtime.ts nhưng thiếu genres.ts. http-app → song-upload-routes → song-create require genres.ts ở cấp module. Container sẽ thiếu dependency này khi load backend. | Copy dependency runtime còn thiếu; build và smoke-test container thực tế. Chưa chạy Docker trong lần rà soát này. |
| P0 cho nạp lại dataset | data/local/songs.json có 120 bài; 55 tham chiếu tới 48 file Guitar không có trên đĩa. Test dừng ở Guitar/g01.mp3. | Khôi phục đúng media hoặc sửa manifest có chủ đích; không thay âm thanh bằng Piano rồi giữ metadata Guitar. Test loader nên dùng fixture tự chứa, còn kiểm tra dataset thật là bước riêng. |
| P0 trước APK cloud | Runtime bắt buộc mode rõ ràng; backend URL cloud là HTTPS. EAS profile chưa quy định môi trường cloud. | Cấu hình EAS environment cloud và backend origin; kiểm tra bundle không chứa host LAN/emulator. `.env` hiện không phải bằng chứng APK đã sẵn sàng. |
| P1 Render cold start | backendService.ts abort cả GET/write sau 15 giây. Render Free có thể mất khoảng một phút để thức dậy. | Luồng khởi động/health có timeout thích hợp, thông báo và retry GET; retry mutation phải dùng idempotency phù hợp, không gửi lại mù. Xử lý response không phải JSON. |
| P1 restart | Cursor, sessions playback, limiter ở RAM; retention chạy timer 15 phút. | Cursor lỗi phải tải lại; thiết kế khôi phục phiên nghe, outbox và job durable. Không coi timer là scheduler bảo đảm khi server ngủ. |
| P1 media cloud | Signed audio đã có, ảnh chưa có signed ownership/publicId lifecycle hoàn chỉnh. | Signed upload ảnh, xác minh owner/asset, lưu publicId, cleanup asset bỏ dở/cũ theo grace period và tham chiếu. |
| P1 quyền media | GET file local được mount trước auth; biết URL thì đọc được. Cloud URL công khai cũng không được Rules bảo vệ. | Giữ local trong LAN thử nghiệm; nếu “riêng tư” phải bảo vệ cả bytes, dùng authenticated/signed delivery có hạn. Không quảng bá bảo mật file chỉ từ private metadata. |
| P1 dữ liệu cloud | Migration/restore target có giới hạn 400 source documents; cloud legacy chưa được kiểm chứng. | Backup, audit, migration theo lô có checkpoint/restore và kiểm chứng quan hệ; backend target từ chối schema legacy. Không deploy Rules mới riêng lẻ trước client/backend tương ứng. |
| P1 chi phí | Full listeners/preload và graph RAM; graph có giới hạn 250.000. Startup có thể đọc lại nhiều dữ liệu; retention quét users và đếm history. | Đo reads, RAM, thời gian ready; hạn chế dataset demo; giảm preload và lượt quét trước mở rộng. |
| P2 giao diện/dữ liệu | Provider còn tải nhiều trang để dựng danh sách, favoriteAlbums chưa paging riêng; đồng bộ nhiều thiết bị hạn chế. | Phân trang theo màn, refresh/version/invalidation phù hợp; đo tải mạng và render trên máy thật. |
| P2 tài khoản | Vô hiệu hóa Auth và Firestore không chung transaction. | Cơ chế retry/đối soát trạng thái dở dang; kiểm thử phiên trên thiết bị thứ hai. |
| P2 vệ sinh | PlayerContext import isLocalDemoAudio nhưng không dùng. | Xóa import khi sửa phần player; lint hiện báo warning. |

## 3. Tài liệu cần đồng bộ

- README nói backend “đang chuyển sang Express”, còn những đoạn mô tả nguồn client Firestore và publicProfiles cũ. Runtime đã tiến xa hơn.
- Một số checkpoint nói local chỉ có WAV tổng hợp/chặn upload: đã lỗi thời so với local-media.cjs và tài liệu LOCAL_UPLOAD_STORAGE.md ngày 06/11.
- IMPLEMENTATION_PROGRESS chứa lịch sử nối dài: các đoạn “chưa có” playlist public/album/favorites/API không thể đọc độc lập như backlog hiện tại.
- Cần một bảng trạng thái hiện tại và chuyển checkpoint cũ sang lịch sử. Không ghi “toàn bộ tests PASS” khi dataset hiện tại thiếu file.
- Giữ hướng dẫn sao lưu đồng thời `.local/uploads` và `.local/emulator-data`; chỉ backup một bên sẽ mất liên kết hoặc mất media.

## 4. Backend miễn phí cho APK

APK là client; backend vẫn phải được host và truy cập được qua HTTPS khi máy phát triển tắt.

| Phương án | Phù hợp mã hiện tại | Giới hạn quyết định |
| --- | --- | --- |
| Render Free Web Service | Phù hợp nhất để demo Express hiện tại sau sửa Docker/runtime | Ngủ sau 15 phút, thức khoảng một phút, filesystem tạm, 750 giờ/workspace/tháng; không bảo đảm job nền |
| Google Cloud Run | Chạy container Express, thuận tiện IAM và dịch vụ Google | Có free allowance nhưng cần billing, có thể phát sinh chi phí; scale-to-zero và CPU/lifecycle cần thiết kế lại cho listeners/timers |
| Cloudflare Workers Free | Có thể làm proxy nhỏ sau thiết kế riêng | Không coi backend hiện tại là deploy nguyên trạng: node:sqlite, listeners và timer dài hạn cần thay đổi/kiểm chứng runtime |

Khuyến nghị demo: APK → Render Express → Firebase Auth/Firestore; audio/ảnh đi trực tiếp Cloudinary. Không đưa toàn bộ luồng stream nhạc qua Express. Không dùng Render Postgres Free làm kho lâu dài vì hết hạn sau 30 ngày. SQLite hiện ở RAM nên dùng như index tái tạo được là hợp lý, không phải database nguồn.

Render có thể chạy cả API nghiệp vụ lẫn proxy AI trong cùng Express. Dùng Dockerfile.backend ở root sau sửa, PORT do nền tảng cấp, bind 0.0.0.0 (main.cjs đã làm), health `/health`. ADC trên Render không tự có: cần credential server hợp lệ, ví dụ secret file và GOOGLE_APPLICATION_CREDENTIALS; CURSOR_SECRET ổn định; secret AI/Cloudinary không đưa vào EXPO_PUBLIC. Không nhúng credentials vào image hoặc APK.

Cloudinary là dịch vụ riêng, không phải một sản phẩm Google Cloud. Dùng Vertex không gộp quản lý/billing Cloudinary. Cloudinary Free có 25 credits dùng chung cho storage/bandwidth/transformations; 180 phút upload của app là chính sách ứng dụng, không phải quota nhà cung cấp.

Nguồn: [Render Free](https://render.com/docs/free), [Cloud Run pricing](https://cloud.google.com/run/pricing), [Workers limits](https://developers.cloudflare.com/workers/platform/limits/), [Cloudinary billing](https://cloudinary.com/documentation/billing_and_plans), [Firestore quota](https://firebase.google.com/docs/firestore/quotas).

## 5. Thiết kế AI gọi khi cần

Luồng đề xuất:

1. Chuẩn hóa Unicode, query và filter; tìm tên bài/nghệ sĩ/album bằng FTS trước. Query rỗng, duyệt thể loại, tên khớp tốt không cần gọi LLM.
2. Query ngữ nghĩa (ví dụ “nhạc nhẹ để học, ít lời”), kết quả lexical yếu hoặc người dùng chọn tìm thông minh: lấy query embedding; dùng cache theo query/model/dimension/version. Không gọi mỗi phím gõ.
3. Chỉ gọi mô hình phân tích truy vấn khi câu có ràng buộc/phủ định/ý định phức tạp mà luật đơn giản không xử lý được. Output JSON có schema, allowlist genre/filter, giới hạn độ dài; tuyệt đối không chạy code/query do mô hình tự sinh.
4. Trộn FTS + vector bằng rank fusion hoặc công thức đã hiệu chỉnh; giữ exact-name boost. Kiểm tra active/isPublic/owner ở backend trước khi trả kết quả, kể cả sau cache/vector retrieval.
5. Timeout/429/hết quota: trả FTS/discovery thông thường. Chức năng nghe và tìm cơ bản không phụ thuộc AI.

Embedding ứng viên: `gemini-embedding-001` qua Gemini Developer API, đa ngôn ngữ, có free tier theo bảng giá. Với danh mục nhỏ chọn 768 chiều và chuẩn hóa L2; dùng RETRIEVAL_DOCUMENT cho bài, RETRIEVAL_QUERY cho câu tìm. Đây là cấu hình đề xuất cần smoke-test quyền truy cập, không phải đã hoạt động trên project. Có thể đánh giá embedding-2 sau, nhưng không trộn vector hai model.

Văn bản bài gồm title, artistNames, genre, description và lyric đã duyệt. Cắt/chunk lyric dài theo token limit; không tự suy ra mood/BPM chính xác từ tên bài. Lưu vector cùng model, dimensions, contentHash, version, updatedAt; re-embed khi nội dung đổi, không khi playCount đổi. Query và tài liệu phải cùng không gian embedding; đổi model cần reindex.

Với 120 bài, cosine trong backend đủ để thử, chưa cần vector database riêng. Vector gốc phải lưu bền ngoài filesystem Render; RAM chỉ là cache. Nếu thêm collection hoặc field vector phải mở rộng schema/audit/migration hiện có. Nếu dùng Firestore vector search về sau phải kiểm tra index, dimension và chi phí riêng, không mặc định 3072 chiều tương thích.

Gợi ý không cần LLM mỗi lượt: dựng vector sở thích từ bài đã nghe/yêu thích, kết hợp thể loại/follow, diversity, loại bài mất quyền; cache có phiên bản và fallback hiện tại. Cần tách mục đích retrieval và item similarity khi đánh giá chất lượng.

Đo Recall@k/nDCG bằng tập query tiếng Việt, có dấu/không dấu, tên riêng, phủ định; đo p95 latency và số API calls. Không coi embedding là thay thế mọi filter hoặc bảo đảm chất lượng gợi ý.

Nguồn: [Embedding API](https://ai.google.dev/gemini-api/docs/embeddings), [Gemini pricing](https://ai.google.dev/gemini-api/docs/pricing). Free tier có quota; chính sách dữ liệu Free khác Paid, cần xét khi gửi nội dung riêng tư.

## 6. Audio thành lyric

Embedding không chép lời. Cần ASR/audio-understanding riêng; kết quả là bản nháp để chủ bài duyệt, đặc biệt với tiếng hát, nhạc nền, bè, tên riêng. Không tự coi timestamp mô hình trả về là lyric karaoke chính xác.

- Phương án cloud demo: model Gemini hỗ trợ audio và có Free tier trong tài khoản; chọn ID qua catalog/quota thực tế, cấu hình riêng model transcription và model phân tích query. Không chốt model chỉ vì tên xuất hiện trong docs.
- Phương án không trả phí API: ASR mã nguồn mở chạy trên máy local/worker do mình quản lý, sau đó nhập lyric. Vẫn tốn tài nguyên máy; chưa đánh giá chất lượng/hiệu năng tại đây. Không đặt model nặng ngay trong Render Free cùng Express.
- Cloud Speech-to-Text/Vertex không được mặc định miễn phí lâu dài; phải kiểm tra giá SKU/model/location cụ thể.
- API nhận songId, xác minh owner và lấy asset đã đăng ký; không cho client gửi URL bất kỳ để backend tải. Job durable có trạng thái pending/running/review/failed, lease/retry/idempotency; không dựa vào setTimeout sau response trên Render Free.
- Lưu draft lyric + segments + provider/model/source hash. Chủ bài sửa/duyệt rồi ghi lyric chính thức và lập lịch embedding lại. Giới hạn phút/ngày/user, concurrency và tổng ngân sách; hủy/bỏ kết quả nếu bài bị xóa hoặc đổi quyền.
- Kiểm thử bài tiếng Việt có hát, nhạc không lời, im lặng, nhiều bè, audio dài và lỗi mạng. Không tạo lời giả khi không nhận được tiếng hát.

Nguồn: [Gemini audio](https://ai.google.dev/gemini-api/docs/audio), [transcription](https://ai.google.dev/gemini-api/docs/transcribe), [Speech-to-Text pricing](https://cloud.google.com/speech-to-text/pricing).

## 7. Vertex AI, quyền và region: chưa xác nhận

Không tìm thấy cấu hình Vertex location/model hoặc gcloud sẵn trong PATH ở lần kiểm tra. Firebase config/EAS project ID không chứng minh region Firestore, billing, Vertex API hoặc IAM. Project Google Cloud không có một region duy nhất áp cho mọi dịch vụ.

Trước khi chọn Vertex cần đọc location database thật; kiểm tra billing/API aiplatform.googleapis.com; IAM principal thực thi backend, quota và model lifecycle; đối chiếu bảng location theo đúng model; chạy probe nhỏ embedding/audio tại location dự định và kiểm tra vector dimension/status. Request tính phí chỉ thực hiện khi đã thống nhất phạm vi chi phí. 403 có thể là IAM/API/billing, 404 có thể là model/location, 429 có thể quota; không tự kết luận model không tồn tại từ một lỗi.

Gemini Developer API và Vertex là hai lựa chọn provider riêng. Free tier Developer API không chuyển nguyên sang Vertex; chương trình Express thử miễn phí cho người đủ điều kiện có thời hạn, không phải hosting/AI miễn phí vĩnh viễn. Không tự chọn Singapore/us-central1 rồi tuyên bố tương thích project.

Nguồn: [Locations](https://docs.cloud.google.com/gemini-enterprise-agent-platform/resources/locations), [Vertex pricing](https://cloud.google.com/vertex-ai/generative-ai/pricing), [Express mode](https://docs.cloud.google.com/gemini-enterprise-agent-platform/models/start/express-mode/overview).

## 8. Thứ tự thực hiện

1. Sửa đóng gói Docker, dataset media và cập nhật trạng thái tài liệu; giữ nguyên dữ liệu local người dùng. Chạy lại lint/typecheck/unit/integration.
2. Hoàn thiện media cloud, migration/import và backup; smoke-test backend với dữ liệu nhỏ, quyền đúng; đo cold start/restart/reads.
3. APK preview: profile preview đã distribution=internal; theo EAS có thể tạo APK. Xác minh environment cloud, signing và build thực; production mặc định hướng AAB cho Play Store. Test APK khi tắt máy phát triển và dùng mạng di động.
4. Nghiệm thu thiết bị: picker/upload, background audio, lock screen, seek/auto-next, logout, network loss, restart backend, Android Back/keyboard/theme. Chưa có bằng chứng nghiệm thu này từ kiểm tra mã.
5. Thêm embedding/search hybrid có feature flag và quota/fallback; đo chất lượng trước mở rộng.
6. Thêm lyric draft jobs rồi mới tối ưu truy vấn bằng LLM và personalization. Vertex chỉ chốt sau kiểm tra quyền/location.

Nguồn APK: [EAS APK](https://docs.expo.dev/build-reference/apk/). Chưa tạo APK hoặc sửa cấu hình Expo trong lượt rà soát.

## 9. Kiểm tra thực hiện

- `npm run typecheck`: PASS.
- `npm run lint -- --no-cache`: 0 errors, 1 warning import isLocalDemoAudio tại PlayerContext.tsx:20.
- `npm test`: 90/91 PASS; editable-data.test.cjs lỗi ENOENT Guitar/g01.mp3. Log: `.local/review-tests.log`.
- Integration/Rules cô lập: 37/38 PASS; editable-data.integration.test.cjs thất bại cùng nguyên nhân thiếu Guitar/g01.mp3. Test upload ảnh/audio và giữ dữ liệu qua backend restart PASS. Emulator test đã tự tắt. Log `.local/review-integration.log`. Lần đầu bị sandbox chặn đọc config Firebase CLI, đã chạy lại với quyền được cấp.
- Chưa build Docker/APK, chưa UI native QA, chưa probe model/project cloud. Những phần này là việc cần làm, không phải kết quả PASS.
