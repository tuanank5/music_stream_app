# music_stream_app

Mở **START_HERE.md** để làm theo hướng dẫn A–Z bằng tiếng Việt.

Source: Expo Router + React Native TypeScript, Firebase Auth/Firestore, quản trị bài hát/nghệ sĩ, thư viện cá nhân, Player, Feed và comments. Không dùng Spring Boot/SQL/Storage. Metadata ở Firestore, media dùng HTTPS hoặc demo bundled.

```sh
npm ci
# copy .env.example to .env and enter Firebase Web config
npx expo start -c
```

Firebase Console cần bật Email/Password, tạo Firestore và Publish firestore.rules. Admin/seed hướng dẫn riêng trong START_HERE.md; không bao giờ đưa service-account JSON vào app.

- `docs/ARCHITECTURE.md`: yêu cầu, thiết kế, schema, ERD logic, quyền.
- `docs/TEST_REPORT.md`: kiểm tra đã thực hiện và checklist Firebase/thiết bị thật.
- `tools`: scripts quản trị chạy riêng; `tests`: validation và Rules tests.

Đây là MVP chức năng cho project học tập. Premium/thanh toán/offline chưa triển khai. UI chưa phải bản sao từng pixel của toàn bộ hình tham khảo.
