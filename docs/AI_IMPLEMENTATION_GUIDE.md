# AI IMPLEMENTATION GUIDE — Music Streaming

> **Dự án:** React Native Expo + Express 5 + Firebase Firestore + Google Cloud Run  
> **Phạm vi:** Hybrid Smart Search và Suggested for You  
> **Quy mô ban đầu:** dưới 100 bài hát  
> **Nguyên tắc:** bổ sung tính năng, không phá vỡ chức năng/API/dữ liệu hiện tại.

## 1. Quyết định kiến trúc

**Đề xuất:** dùng Google Gemini API (qua Google Gen AI SDK ở backend) cho việc phân tích truy vấn *khi thật sự cần* và một **Google embedding model** tương thích để tạo vector. Không bắt buộc gọi mô hình sinh văn bản cho mỗi lượt tìm kiếm hay đề xuất. Để dễ quản lý hạ tầng Google Cloud, có thể cân nhắc Vertex AI sau khi xác minh quyền truy cập, giá và model khả dụng trong region dự án.

- **Dữ liệu:** giữ Firestore; dùng khả năng lưu vector và truy vấn nearest-neighbor của Firestore, không thêm Pinecone/ChromaDB.
- **Backend:** Express 5 đang triển khai trên Cloud Run; mọi thao tác dùng khóa AI và Firebase Admin SDK chỉ ở backend.
- **Frontend:** React Native Expo gọi API hiện có và các API bổ sung.
- **Dưới 100 bài:** triển khai theo 2 tầng. Tầng 1: keyword + metadata + thuật toán gợi ý, chạy được ngay. Tầng 2: embedding + vector index + semantic retrieval, bật bằng feature flag sau khi backfill và kiểm thử. Tránh tạo hệ thống phức tạp không cần thiết.
- **Không suy diễn âm thanh:** embedding dựa trên metadata/mô tả, không tự nhận là hiểu âm thanh nếu chưa có mô hình phân tích audio.

### 1.1 Sơ đồ luồng

```text
React Native Expo
   | Firebase ID token (nếu endpoint cần tài khoản)
   v
Express 5 — Google Cloud Run
   |-- Auth middleware (verify Firebase ID token)
   |-- Search service
   |     |-- Keyword/metadata search (Firestore + lọc có giới hạn)
   |     |-- Query embedding (chỉ khi semantic cần thiết)
   |     `-- Firestore nearest-neighbor + hợp nhất/rerank
   |-- Recommendation service
   |     |-- History + Favorites + artist/genre affinity
   |     |-- Candidate generation + score + diversity
   |     `-- Optional vector similarity
   |-- Cache + rate limit + monitoring
   |-- Firebase Admin SDK -> Firestore
   `-- Google embedding / Gemini API
```

## 2. Kiểm tra dự án trước khi viết code

Codex **phải đọc repository** trước, không tự đoán đường dẫn hay schema:

1. Xác định Express entrypoint, router, controller, service, auth middleware, Firebase Admin initialization, TypeScript/JavaScript, validation, logger và test runner.
2. Kiểm tra schema `songs`, `artists`, `albums`, `users/{uid}/history`, Favorites, thể loại, `playReceipts`; xác định chính xác collection/path, các field và quyền đọc.
3. Xác định nguồn sự thật cho lượt nghe, định nghĩa một phiên nghe và dữ liệu nào đã được chuẩn hóa.
4. Xác định API tìm kiếm, Home/Suggested for You và giao diện đang dùng. **Giữ nguyên hợp đồng API cũ**, chỉ bổ sung/phiên bản hóa khi cần.
5. Xác định quy trình build/deploy Cloud Run, region, service account, secrets, Firestore indexes, CI/CD và môi trường test.
6. Báo cáo phát hiện, file dự kiến sửa và rủi ro trước khi triển khai; nếu thiếu dữ liệu quan trọng, hỏi thay vì tự chế schema.

## 3. Mô hình dữ liệu và embeddings

### 3.1 Dữ liệu đầu vào

Ví dụ nội dung văn bản để embedding một bài hát (chỉ dùng field **thực sự tồn tại**):

```text
Title: Acoustic Demo
Artist: Artist A
Genre: Acoustic
Mood: Calm, Relaxing
Description: Nhạc nhẹ nhàng phù hợp thư giãn
```

- Chuẩn hóa Unicode, khoảng trắng, danh sách thể loại; không thêm nhãn mood/instrument nếu không có bằng chứng.
- Dùng **cùng một model embedding và cấu hình chiều vector tương thích** cho document/query; nếu model hỗ trợ task type riêng cho document/query thì dùng đúng hướng dẫn của nhà cung cấp.
- Không gửi email, UID, nhật ký nghe riêng tư hoặc thông tin cá nhân vào văn bản embedding bài hát.
- Chỉ tạo lại embedding khi nội dung liên quan thay đổi hoặc nâng phiên bản model/chiến lược.

### 3.2 Nơi lưu vector

**Ưu tiên collection riêng** `songSearchIndex/{songId}` để không ảnh hưởng document `songs` và tránh trả vector lớn về app:

```text
songSearchIndex/{songId}
  songId: string
  searchText: string
  genreKeys: string[]
  artistId: string | null
  isSearchable: boolean
  embedding: Firestore VectorValue
  embeddingModel: string
  embeddingVersion: number
  sourceUpdatedAt: Timestamp
  indexedAt: Timestamp
```

Đây là schema **đề xuất**, không phải khẳng định schema dự án đang có. Firestore vector cần kiểu vector được SDK hỗ trợ (không lưu mảng số thông thường rồi mặc định cho rằng nearest-neighbor sẽ hoạt động). Dùng Firebase Admin/Google Cloud Firestore SDK ở server có hỗ trợ `FieldValue.vector(...)`/API vector tương đương theo phiên bản được cài đặt. Xác minh API và giới hạn chiều vector theo tài liệu chính thức tại thời điểm triển khai.

- Tạo **vector index** trên trường `embedding` bằng cấu hình index Firestore phù hợp (ví dụ qua `gcloud firestore indexes composite create` hoặc hướng dẫn index do Firestore cung cấp); kiểm tra đúng database, collection group, dimension và region.
- Chọn chiều embedding **không vượt giới hạn Firestore**; nếu model xuất nhiều chiều hơn, chọn model/cấu hình rút chiều được hỗ trợ, không tự cắt vector tùy tiện.
- Tạo script idempotent `backfillSongEmbeddings` có dry-run, batching, retry/backoff, giới hạn concurrency và checkpoint; không thực thi backfill tự động mỗi lần Cloud Run khởi động.
- Khi thêm/sửa/xóa bài hát: đồng bộ hoặc xếp hàng cập nhật/xóa index tương ứng. Khi không có vector, bài hát vẫn phải tìm được bằng keyword.
- Chặn client ghi trực tiếp vào `songSearchIndex` bằng Firestore Rules; chỉ backend có quyền phù hợp được cập nhật.

### 3.3 Tính điểm vector

Dùng nearest-neighbor distance do Firestore trả về; **distance nhỏ hơn thường nghĩa là gần hơn** tùy metric. Không giả định distance là phần trăm tương đồng. Chuẩn hóa điểm sau khi xác nhận metric, phạm vi và dữ liệu thực nghiệm. Có thể chọn cosine distance nếu SDK/index hỗ trợ và phù hợp embedding model.

## 4. Hybrid Smart Search

### 4.1 Hành vi mong muốn

- `Sơn Tùng`, tên bài, album: ưu tiên khớp chính xác/prefix/không dấu (keyword).
- `nhạc nhẹ nhàng để học`, `acoustic thư giãn`: kết hợp keyword và semantic retrieval.
- `nhạc buồn giọng nữ`: AI chỉ suy luận ý định; chỉ lọc giọng nữ nếu metadata có thông tin đáng tin cậy.
- Kết quả chỉ chứa bài hát/album/nghệ sĩ có thật và còn hiển thị được; không tạo dữ liệu giả.
- Không gọi AI trên mỗi ký tự khi người dùng đang gõ; debounce phía client khoảng 300–500 ms và chỉ semantic khi submit hoặc sau khi ngừng gõ theo thiết kế được kiểm thử.

### 4.2 Pipeline

1. Validate query (rỗng, chiều dài tối đa, Unicode), phân trang và giới hạn kết quả.
2. Chuẩn hóa dấu tiếng Việt cho **keyword matching**; giữ nguyên query gốc cho embedding.
3. Tìm keyword từ dữ liệu hiện có. Firestore không phải full-text engine; với dưới 100 bài có thể dùng danh sách metadata nhỏ được cache server-side, nhưng phải giới hạn kích thước, TTL và cập nhật khi dữ liệu thay đổi.
4. Chỉ gọi embedding khi query mang ý nghĩa mô tả hoặc người dùng bật Smart Search; cache embedding của truy vấn phổ biến có TTL.
5. Firestore vector nearest-neighbor trả top K candidate; lọc quyền hiển thị, trạng thái bài hát và hydrate từ `songs`.
6. Merge/deduplicate theo songId; rerank có trọng số keyword, semantic, popularity (nếu cần), không biến distance thành similarity sai cách.
7. Trả kết quả cùng `source`/`matchReason` ngắn gọn dựa trên metadata thật.
8. Nếu embedding API/index lỗi hoặc vượt quota: **fallback keyword**, không làm màn Search bị lỗi toàn bộ.

### 4.3 API gợi ý

```http
GET /api/search?q=<text>&limit=20
POST /api/search/semantic
Content-Type: application/json
Authorization: Bearer <Firebase ID token if required>

{"query":"nhạc nhẹ nhàng để học", "limit":20}
```

**Không đổi endpoint search cũ** nếu đã có; có thể bổ sung `mode=hybrid` hoặc endpoint mới, giữ response cũ cho client hiện hành.

Response minh họa:

```json
{
  "items": [{"id":"song_001","title":"Acoustic Demo","artist":"Artist A","matchReason":"Acoustic, thư giãn"}],
  "mode":"hybrid",
  "fallback":false,
  "nextCursor":null
}
```

Các field phải được map theo model thực tế, không tự tạo song/artist trong Firestore.

## 5. Suggested for You

### 5.1 Nguồn tín hiệu

- History: ưu tiên nghe gần đây, số phiên hợp lệ, thời gian nghe nếu đáng tin; tránh đếm các phiên chưa đủ điều kiện.
- Favorites: tín hiệu tích cực mạnh.
- Nghệ sĩ/thể loại: suy ra từ bài hát đã nghe và yêu thích.
- Popularity/trending: chỉ dùng làm tín hiệu phụ để khám phá; tránh tất cả người dùng nhận cùng danh sách.
- Embedding: tìm bài hát tương tự các bài đã thích hoặc vector sở thích được tổng hợp; không dùng thông tin nhạy cảm.

### 5.2 Thuật toán MVP có thể giải thích

1. Lấy tối đa N sự kiện gần nhất và Favorites với truy vấn có giới hạn.
2. Tổng hợp trọng số theo nghệ sĩ/thể loại; áp dụng time decay cho lịch sử nghe.
3. Tạo candidate từ bài chưa nghe hoặc ít nghe, bài tương tự, bài thịnh hành.
4. Chấm điểm có trọng số cấu hình (ví dụ: `0.35 genre + 0.25 artist + 0.20 favoriteSimilarity + 0.10 popularity + 0.10 discovery`). **Đây là trọng số khởi đầu để A/B test**, không phải chuẩn công nghiệp.
5. Nếu vector có sẵn, đưa vector similarity vào `favoriteSimilarity`; nếu không, dùng metadata similarity.
6. Rerank đa dạng: hạn chế quá nhiều bài liên tiếp cùng nghệ sĩ, trộn một tỷ lệ khám phá, không đề xuất bài không có quyền phát.
7. Trả 10–20 bài cùng `reason` ngắn như “Vì bạn thích Acoustic” khi tín hiệu thực sự hỗ trợ.
8. Cold start: người mới chưa có History/Favorites nhận danh sách khám phá theo thể loại/trending, không yêu cầu AI.

**Lưu ý:** không bắt buộc gọi Gemini Chat API để tạo Suggested for You. Dùng thuật toán có kiểm soát và embedding là phù hợp hơn.

### 5.3 API gợi ý

```http
GET /api/recommendations/for-you?limit=20
Authorization: Bearer <Firebase ID token>
```

Không nhận `uid` tùy ý từ client để đọc history người khác; lấy UID từ token đã xác thực. Với endpoint cá nhân hóa, trả `Cache-Control: private` hoặc `no-store` tùy chiến lược; tuyệt đối không dùng shared cache theo URL chung cho nhiều tài khoản.

### 5.4 Cache

- Cache đề xuất theo UID + phiên bản thuật toán + dữ liệu đầu vào, TTL thử nghiệm 15–60 phút.
- Invalidate hoặc cập nhật khi Favorite/History thay đổi đáng kể; chấp nhận eventual consistency có giới hạn.
- **Cloud Run nhiều instance:** memory cache chỉ là tối ưu cục bộ, không phải cache nhất quán toàn hệ thống. Với quy mô đồ án, có thể dùng Firestore materialized recommendations có TTL logic; chưa cần Redis.
- Không lưu thông tin người dùng trong log; có thể lưu các ID bài hát đề xuất cùng thời điểm tính và phiên bản.

## 6. Cấu trúc code đề xuất (điều chỉnh theo repo thật)

```text
backend/src/
  routes/aiSearchRoutes.ts
  routes/recommendationRoutes.ts
  controllers/aiSearchController.ts
  controllers/recommendationController.ts
  services/embeddingService.ts
  services/hybridSearchService.ts
  services/recommendationService.ts
  repositories/songSearchIndexRepository.ts
  jobs/backfillSongEmbeddings.ts
  config/aiConfig.ts
  middleware/auth.ts              # tái sử dụng nếu đã có
  tests/...
mobile/src/
  services/aiSearchApi.ts
  services/recommendationApi.ts
  ...                              # dùng lại Search/Home hiện tại
```

Không tạo lại lớp/module đã tồn tại chỉ vì tên khác. Tôn trọng pattern codebase, test runner, validation, DTO và UI design system.

## 7. Cloud Run, bảo mật và chi phí

### 7.1 Secret và quyền

- Lưu Gemini API key trong **Google Secret Manager**, mount/inject vào Cloud Run; không commit `.env` thật, không đặt key trong `EXPO_PUBLIC_*`.
- Nếu dùng Vertex AI với service account, ưu tiên IAM/ADC thay cho API key theo hướng dẫn nhà cung cấp.
- Cloud Run service account chỉ được cấp quyền Firestore/Secret Manager tối thiểu cần thiết.
- Xác thực Firebase ID token trên các endpoint cá nhân hóa; kiểm tra authorization, giới hạn request, input validation và timeout.
- Rate limit theo UID/IP; quota cho embedding API; xử lý 429/5xx với exponential backoff có jitter, không retry vô hạn.
- Firestore Rules ngăn app sửa vector index; Firebase Admin SDK bỏ qua Security Rules nên backend phải tự enforce quyền.
- Không gửi lịch sử nghe cá nhân cho mô hình AI nếu không cần thiết. Embedding query là nội dung người dùng nhập; công bố chính sách dữ liệu phù hợp.

### 7.2 Cấu hình môi trường (tên minh họa)

```dotenv
AI_ENABLED=false
SEMANTIC_SEARCH_ENABLED=false
AI_PROVIDER=google
AI_EMBEDDING_MODEL=<verified-model-id>
AI_EMBEDDING_DIMENSION=<verified-supported-dimension>
AI_SEARCH_TOP_K=20
AI_SEARCH_TIMEOUT_MS=3000
AI_RECOMMENDATION_CACHE_TTL_SECONDS=1800
```

Không copy placeholder thành giá trị chạy thật. Chọn model/SDK/dimension theo tài liệu Google và Firestore cập nhật, sau đó ghi cố định vào config và kiểm thử. Đừng thay model mà không backfill lại embeddings.

### 7.3 Triển khai Cloud Run

1. Kiểm tra region của Cloud Run/Firestore và giới hạn API model.
2. Tạo/kiểm tra secret và IAM; đảm bảo không lộ khóa trong build logs.
3. Triển khai backend với `AI_ENABLED=false` để kiểm thử không ảnh hưởng hệ thống cũ.
4. Chạy migration tạo collection/index; đợi index ở trạng thái sẵn sàng.
5. Chạy backfill một lần bằng **Cloud Run Job** hoặc script quản trị có xác thực, không chạy tự động trong request startup.
6. Bật semantic search cho nhóm test, kiểm tra latency/cost/fallback; sau đó bật rộng hơn.
7. Bật recommendations theo từng giai đoạn; giữ feature flag để rollback ngay.
8. Kiểm thử trên Expo Go/APK với Cloud Run URL hiện có, HTTPS và Firebase Auth token.

**Không hardcode lệnh deploy** khi chưa biết project ID, service name, region, build strategy và môi trường hiện có. Codex phải tái sử dụng pipeline deploy sẵn có và cung cấp lệnh chính xác sau khi kiểm tra.

### 7.4 Chi phí và hiệu năng

- Chi phí phát sinh từ: token embedding/generative AI, Firestore reads/writes/vector queries/index storage, Cloud Run CPU/memory/requests, Secret Manager và log.
- Dưới 100 bài: backfill ban đầu nhỏ; ưu tiên embedding một lần mỗi bài và chỉ tạo query embedding khi cần.
- Không công bố mức phí hoặc quota miễn phí cố định nếu chưa kiểm tra bảng giá và hạn mức chính thức theo thời điểm, region và model.
- Đặt ngân sách/cảnh báo Google Cloud Billing, hạn mức request, max instances phù hợp và theo dõi p50/p95 latency, cache hit, fallback rate, số lần gọi AI.
- Lưu ý **budget alert không phải hard spending cap**; cần quota và giới hạn vận hành để kiểm soát rủi ro.

## 8. Kiểm thử và tiêu chí nghiệm thu

### 8.1 Backend

- Unit test: chuẩn hóa tiếng Việt, keyword ranking, score recommendations, cold start, dedup, diversity, fallback.
- Integration test: Firebase Auth, Firestore vector index/query, pagination/limit, bài hát bị ẩn/xóa, stale embeddings.
- Fault test: API key thiếu, AI 429/500, timeout, Firestore index chưa sẵn sàng, Cloud Run restart.
- Security test: UID giả mạo, truy cập lịch sử người khác, prompt injection trong metadata/query, rate limit, secret không lộ trong response/log.

### 8.2 Frontend

- Search cũ hoạt động như trước; có loading, empty, error, retry và fallback rõ ràng.
- Debounce, hủy/ignore request cũ khi query đổi; không hiển thị kết quả lỗi thời.
- Suggested for You không làm chậm Home; có skeleton hoặc fallback; bấm bài hát vẫn phát theo luồng player cũ.
- Test trên Expo Go và bản build APK; kiểm tra mạng yếu, offline và người dùng mới.

### 8.3 Nghiệm thu

- [ ] Không đổi dữ liệu/endpoint hiện có ngoài phạm vi được chấp thuận.
- [ ] Keyword search vẫn dùng được khi AI bị tắt.
- [ ] Semantic search tìm được bài liên quan theo metadata, không bịa bài hát.
- [ ] Vector index hoạt động với model/dimension đã chọn.
- [ ] Suggested for You khác nhau hợp lý giữa các tài khoản có sở thích khác nhau.
- [ ] Cold start có kết quả phù hợp và không lỗi.
- [ ] Firebase ID token được kiểm tra; không lộ secret hoặc history người khác.
- [ ] Cache không rò dữ liệu giữa người dùng.
- [ ] Có test tự động, hướng dẫn backfill, rollback và deploy.
- [ ] Có báo cáo latency, số API calls và chi phí ước tính theo số lượt dùng giả định.

## 9. Kế hoạch triển khai theo giai đoạn

| Giai đoạn | Công việc | Điều kiện hoàn thành |
|---|---|---|
| 0. Audit | Đọc repo, xác minh schema, API, Cloud Run | Báo cáo và danh sách file sửa |
| 1. Baseline | Keyword/metadata search + recommendations thuần thuật toán | Chạy khi AI tắt |
| 2. Embeddings | Chọn model, tạo index, backfill dưới 100 bài | Query vector test thành công |
| 3. Hybrid Search | Merge/rerank, cache, fallback, UI | Search cũ không regress |
| 4. For You | History/Favorites + vector affinity + diversity | Cá nhân hóa có kiểm thử |
| 5. Hardening | Auth, rate limit, monitoring, CI tests | Test pass và rollback sẵn |
| 6. Cloud Run | Secret/IAM, deploy, smoke test Expo Go/APK | Chạy ổn định với flag bật |

## 10. Prompt triển khai cho Codex CLI

> Sao chép toàn bộ prompt bên dưới vào Codex CLI trong thư mục gốc repository. Nếu backend và frontend ở hai repo khác nhau, cung cấp cả hai hoặc yêu cầu Codex chỉ triển khai phần repo đang mở; không giả định có quyền truy cập repo còn lại.

```text
Bạn là senior full-stack engineer phụ trách mở rộng ứng dụng Music Streaming.

BỐI CẢNH:
- Frontend: React Native + Expo.
- Backend: Express 5 đã deploy và chạy trên Google Cloud Run.
- Database: Firebase Firestore (NoSQL); Firebase Auth nếu dự án đang dùng.
- Kho nhạc hiện dưới 100 bài.
- Mục tiêu: triển khai hoàn chỉnh (backend + frontend + vector index + cache + tests) hai chức năng:
  (1) Hybrid Smart Search: keyword search + semantic vector search.
  (2) Suggested for You: History + Favorites + artist + genre + vector similarity.
- Không thêm database khác. Ưu tiên Google embedding model tương thích Firestore Vector Search; Gemini chỉ cho tác vụ sinh/phân tích ngôn ngữ khi thực sự cần.
- Cloud Run đang hoạt động: tuyệt đối không phá vỡ API, chức năng, cấu hình deploy, dữ liệu hay UI hiện tại.

QUY TẮC BẮT BUỘC:
1. Đọc kỹ AI_IMPLEMENTATION_GUIDE.md và toàn bộ module liên quan trong repository trước khi sửa.
2. Audit cấu trúc, schema Firestore thực tế, auth, search, home, history, favorites, player, Cloud Run, tests và pipeline deploy.
3. Trước khi code, xuất kế hoạch file cần thêm/sửa, schema migration, index, IAM/secrets, test và rollback. Nêu rõ giả định chưa xác minh; hỏi tôi nếu có quyết định ảnh hưởng dữ liệu/sản xuất.
4. Không tự ý đổi tên collection, field, route, DTO hoặc refactor lớn. Không xóa dữ liệu; không thay đổi semantics lượt nghe/history.
5. Bổ sung feature flags; tất cả tính năng cũ phải chạy khi AI_ENABLED=false.
6. Giữ API key/credentials hoàn toàn phía server; dùng Secret Manager hoặc service account phù hợp. Không đưa secret vào Expo, git, logs hay response.
7. Không bịa metadata, bài hát, nghệ sĩ, album; AI chỉ truy xuất/rerank dữ liệu thực từ Firestore.
8. Sử dụng Firestore VectorValue và vector index theo SDK/API hiện hành. Xác minh model embedding, dimension, giới hạn Firestore, index config và giá trước khi cố định lựa chọn.
9. Viết script backfill idempotent có dry-run và retry; KHÔNG chạy migration/backfill tự động lúc Cloud Run startup.
10. Dùng fallback keyword khi AI/vector lỗi. Suggested for You có fallback cold start/trending. Không để AI làm hỏng Search/Home/Player.
11. Tối ưu cho dưới 100 bài; tránh gọi AI trên từng phím gõ, cache có TTL và phân tách theo UID khi cá nhân hóa.
12. Tạo unit/integration tests, kiểm thử quyền riêng tư, timeout, rate limit, rollback. Không tuyên bố test pass nếu chưa chạy.
13. Không tự deploy lên production, không chạy migration ghi dữ liệu production, không tạo secret/bật API tính phí nếu chưa được tôi chấp thuận rõ ràng.

CÁCH LÀM:
Giai đoạn A: Audit và báo cáo phát hiện.
Giai đoạn B: Thiết kế cụ thể API, index, scoring, caching, fallback và kế hoạch triển khai.
Giai đoạn C: Triển khai từng phần nhỏ với tests và review diff.
Giai đoạn D: Chuẩn bị lệnh backfill/index/deploy Cloud Run chính xác theo project hiện có, nhưng chỉ thực thi khi được phép.
Giai đoạn E: Smoke test React Native Expo, Search, Suggested for You, phát nhạc và regression.

BẮT ĐẦU NGAY BẰNG GIAI ĐOẠN A. CHƯA SỬA CODE CHO ĐẾN KHI ĐÃ TRÌNH BÀY KẾ HOẠCH VÀ TÔI XÁC NHẬN.
```

## 11. Tài liệu chính thức cần đối chiếu khi thực hiện

- Firestore vector search: https://firebase.google.com/docs/firestore/vector-search
- Firestore vector search (Google Cloud): https://cloud.google.com/firestore/native/docs/vector-search
- Google Gen AI SDK: https://ai.google.dev/gemini-api/docs/libraries
- Gemini embeddings: https://ai.google.dev/gemini-api/docs/embeddings
- Cloud Run secrets: https://cloud.google.com/run/docs/configuring/services/secrets
- Cloud Run Jobs: https://cloud.google.com/run/docs/create-jobs
- Cloud Billing budgets: https://cloud.google.com/billing/docs/how-to/budgets

**Lưu ý:** Các trang chính thức có thể thay đổi model, SDK, quota, cú pháp index và giá. Codex phải kiểm tra phiên bản hiện hành trước khi đưa lệnh chạy trên môi trường thật.
