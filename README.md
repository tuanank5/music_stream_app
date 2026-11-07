# music_stream_app

Ứng dụng nghe nhạc Expo/React Native, Expo Router, Tamagui; Firebase Auth, Firestore và Express 5. Local đã upload ảnh/audio thật; cloud dùng luồng Cloudinary. Chưa nghiệm thu APK/cloud/AI.

## Tài liệu tổng hợp cho ChatGPT

- **[PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md)** — tài liệu chính: trạng thái, bản đồ code, schema, yêu cầu UI/nghiệp vụ, vận hành, kiểm thử và backlog. Thay thế các tài liệu yêu cầu/tiến độ/upload cũ trong docs.
- **[PROJECT_REVIEW_2026-11-06.md](docs/PROJECT_REVIEW_2026-11-06.md)** — giữ nguyên báo cáo rà soát và định hướng APK/Render/AI.
- [AGENTS.md](AGENTS.md) — quy tắc sửa code và tra Expo đúng phiên bản.
- [Dữ liệu local](data/local/README.md) — sửa JSON, nạp và giữ dữ liệu.
- [Mockup PDF](docs/music_stream_app.pdf) — tham khảo giao diện, không phải bằng chứng triển khai.

Khi tiếp tục với ChatGPT, yêu cầu đọc AGENTS.md và hai tài liệu chính trên, kiểm tra mã/diff trước khi sửa. Cập nhật trạng thái mới vào PROJECT_CONTEXT.md, không nối checkpoint mâu thuẫn vào README hoặc sửa báo cáo lịch sử.

## Cài đặt

Node 24.12.0 và npm 10.9.9; Java/JDK cho Emulator. Chạy lệnh tại gốc chứa `package.json`, `package-lock.json`, `eas.json`; `tools/` là bộ dependency backend riêng, không phải gốc Expo.

```cmd
npx --yes npm@10.9.9 ci --include=dev
npm ci --prefix tools --no-audit --no-fund
```

Khi cần đồng bộ lockfile sau khi đổi dependency, dùng `npx --yes npm@10.9.9 install` rồi kiểm tra lại `npx --yes npm@10.9.9 ci --include=dev`. npm 11.6.2 trên Windows đã tái hiện việc loại optional peer `@emnapi/core`/`@emnapi/runtime` khỏi lockfile, khiến npm 10 trên EAS Linux báo EUSAGE. Không dùng `--legacy-peer-deps`, không sửa tay dependency và không bỏ kiểm tra lockfile. `packageManager` ghi phiên bản thống nhất nhưng không tự thay phiên bản lệnh `npm` đã cài toàn hệ thống. Commit lockfile cùng thay đổi dependency khi được yêu cầu.

## Chạy local

Mở ba CMD tại root.

**CMD 1 — Emulator:**

```cmd
npm run local:emulators
```

**CMD 2 — backend:**

```cmd
set LOCAL_BACKEND_HOST=0.0.0.0
npm run local:backend
```

**CMD 3 — Expo:**

```cmd
set LOCAL_APP_HOST=192.168.1.15
npm run start:local -- --clear
```

Thay IP bằng IPv4 Wi-Fi của máy, điện thoại cùng LAN. PowerShell dùng `$env:LOCAL_APP_HOST="192.168.1.15"` và `$env:LOCAL_BACKEND_HOST="0.0.0.0"` trong đúng cửa sổ. Android Emulator dùng 10.0.2.2; web trên máy dùng `npm run start:local -- --web`.

Nếu Emulator mới chưa có dữ liệu, trước khi bật backend/app chọn một nguồn:

- JSON: `npm run data:check`, rồi `npm run data:apply` chỉ khi đạt. Guitar đã đủ g01.mp3–g48.mp3; check hiện 0 lỗi, 158 cảnh báo ownership ảnh HTTPS chưa xác minh (chi tiết trong PROJECT_CONTEXT.md).
- Fixture kiểm thử riêng: `npm run local:seed`, dùng audio tổng hợp, không phải dataset người dùng sửa.

**Không seed/apply lại khi cần giữ chỉnh sửa:** chúng ghi đè ID trùng. Tài khoản demo `local-listener@example.test`, mật khẩu demo mới `LocalMusic123!`; tài khoản đã có có thể giữ mật khẩu đã đổi.

Emulator UI http://127.0.0.1:4000; Auth 9099, Firestore 8080, backend 8787. Trên điện thoại kiểm tra `http://<IP>:8787/health`. Đổi host phải restart Expo/đóng hẳn app. start:local bỏ dotenv, không fallback cloud.

Backup **cả `.local/uploads` và `.local/emulator-data`**. Ctrl+C để Emulator export; mất điện/tắt cưỡng bức chưa bảo đảm metadata. Không commit media/export Auth.

## Kiểm thử

```cmd
npm run lint -- --no-cache
npm run typecheck
npm test
npm run test:local:isolated
```

Isolated runner chọn cổng riêng, không cần dừng server người dùng. Lượt chuyển screens/Auth: tests 97/97, integration 41/41, lint/typecheck sạch; Web và Android export chọn đúng implementation Auth. Test SDK xác nhận sign-in, khôi phục phiên qua app recreation và sign-out; chưa force-stop/reopen APK thật vì máy chưa có Android SDK/adb. Lỗi quota concurrency chập chờn của checkpoint trước tiếp tục theo dõi. Chi tiết trong PROJECT_CONTEXT.md.

Screen implementations nằm ở `src/screens/`; UI dùng chung ở `src/components/`. Route quản lý upload là `/my-uploads`, xóa tài khoản là `/account-delete`; `app/+not-found.tsx` render `NotFoundScreen`. `RequireAuth` thay `Guard`. UI import từ `components/ui/index`, không qua `UI.tsx` hoặc các file cầu nối discovery.

## Tiếp tục

Ảnh cloud đã có signed upload, xác minh ownership/publicId và ledger/cleanup có dry-run; cần QA Cloudinary thật. Dùng `npm run backend:check-package` để kiểm tra source đóng gói; `npm run backend:docker:smoke` để build/chạy image khi Docker Desktop Linux đã hoạt động. Docker build/run đã đạt trên GitHub Actions; máy local chưa có Docker CLI.

Có workflow [Project checks](.github/workflows/ci.yml) chạy khi push vào `main`/`ci/**`, PR vào `main` hoặc chọn Actions → Project checks → Run workflow. Workflow kiểm tra lint/typecheck/unit, Firebase Emulator integration (gồm Auth Web/RN), export Web/Android và kiểm tra module Auth trong sourcemap; gọi thêm [Backend container smoke](.github/workflows/backend-container.yml) để build/chạy Docker trên GitHub. Không cần cài Docker/Android SDK trên máy local để chạy các job này, không cần secret cloud. Artifact bundle và log integration giữ 7 ngày; bundle Android là JS/Hermes, chưa phải APK hoặc kiểm thử UI đóng/mở ứng dụng.

Đã push nhánh `ci/project-checks-20261106`; xem [các lượt chạy CI](https://github.com/tuanank5/music_stream_app/actions?query=branch%3Aci%2Fproject-checks-20261106). Lượt đầu Docker và hai bundle đạt; hai job test phát hiện phụ thuộc MP3 Guitar chỉ có local. Test importer đã chuyển sang fixture WAV tổng hợp riêng, không cần upload bộ nhạc cá nhân. `npm run data:check` vẫn kiểm tra bộ dữ liệu/media thật trên máy. `main` chưa merge, chưa deploy Render.

Đã thêm [render.yaml](render.yaml): Docker Free, health check `/health`, tự deploy tắt trong giai đoạn thiết lập. `/health` đã có sẵn trong backend. Xem mục **Tạo service Render lần đầu** trong [PROJECT_CONTEXT.md](docs/PROJECT_CONTEXT.md) để nhập Environment và Secret File Firebase; không đưa file khóa lên GitHub. Người dùng chưa tạo service, chưa có URL Render để xác nhận health thật.

`audioKey` đã bỏ khỏi runtime/dataset, chỉ còn trong bộ nhận diện legacy và test chống hồi quy; dữ liệu cloud cũ chưa được kiểm tra/xóa field.

Tiếp tục QA media/cloud/migration → APK thật → embedding/search hybrid → lyric jobs và AI theo nhu cầu. Hướng dẫn cleanup, backup ledger và giới hạn trong PROJECT_CONTEXT.md. Bundle export không phải APK/native E2E; có cấu hình cloud không có nghĩa đã deploy.
