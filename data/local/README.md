# Bộ dữ liệu có thể đọc và chỉnh sửa

Đây là dữ liệu mẫu hư cấu, chỉ dùng Firebase Emulator `demo-music-stream`. Các JSON là nguồn chỉnh sửa; không tự tạo lại từ fixtures khi bạn sửa chúng.

| File | Nội dung |
| --- | --- |
| users.json | 26 hồ sơ: tên, email demo, tiểu sử, trạng thái, counters |
| songs.json | 123 bài: tên, nghệ sĩ, album, thể loại, lời và quyền |
| albums.json | 12 album |
| playlists.json | Playlist có songIds theo thứ tự |
| following.json | Quan hệ theo dõi |
| favorites.json / favoriteAlbums.json | Yêu thích bài / album |
| history.json / playReceipts.json | Lịch sử nghe / biên nhận đếm lượt |
| posts.json / comments.json | Bài đăng / bình luận |

`id` là Document ID. `parentId` là UID chủ subcollection; riêng comments là ID bài đăng. Hai thuộc tính này dùng dựng đường dẫn, không bị lưu lặp vào document. Các ID tham chiếu phải tồn tại trong file tương ứng. Ngày dùng ISO UTC như `2026-11-01T12:00:00.000Z`, sẽ được đổi thành Firestore Timestamp.

Ví dụ: mở songs.json, tìm `local-song-000`, sửa title thành tên bạn muốn, sửa lyric/description hoặc genre trong danh sách được app hỗ trợ. Giữ artistId và albumId để liên kết không đứt; bài lẻ dùng albumId=null. isPublic=false là riêng tư. Đổi tên nghệ sĩ ở users.json; artistNames trong bài là tên biểu diễn/đồng tác giả tự do nên chỉnh riêng nếu muốn thay chúng. Không thêm visibility/isPublished, albumTitle/authorName/songCount hoặc ID lặp vào document.

## Kiểm tra và đưa vào app

Chạy tại thư mục gốc dự án:

```cmd
npm run data:check
```

Sau khi kiểm tra đạt, mở Emulator bằng `npm run local:emulators`. Dừng backend/app khi nạp; ở cửa sổ CMD khác:

```cmd
npm run data:apply
npm run local:backend
```

Sau đó chạy Expo theo README chính. Đăng nhập `local-listener@example.test` hoặc `local-artist-01@example.test`; mật khẩu tài khoản mới là `LocalMusic123!`. Tài khoản local đã có giữ mật khẩu hiện tại, email/tên/trạng thái được đồng bộ từ JSON. Không đọc credentials hoặc kết nối cloud; công cụ từ chối cấu hình project cloud/Emulator từ xa.

data:apply ghi đè toàn bộ field của document cùng ID và thêm document mới; **không xóa document hay Auth account khác**. Xóa một dòng JSON không tự xóa dữ liệu đã nạp: dùng active=false để ẩn bài/tài khoản, hoặc gỡ document qua Emulator UI rồi nạp lại. Nếu có following thừa ngoài dataset, lệnh dừng trước khi ghi để tránh counters sai. Khi sửa following, tính lại followerCount/followingCount trong users.json cho khớp; data:check sẽ chỉ ra UID/counter bị lệch.

Trước khi ghi, công cụ lưu backup document bị ghi đè trong `.local/editable-data-before-*.json`; backup có thể chứa dữ liệu riêng, không commit/chia sẻ công khai. Import đồng bộ Auth rồi Firestore theo batch, không phải một transaction chung; lỗi cần sửa rồi chạy lại. Backup này không phải backup Auth hoặc công cụ restore target migration.

Có thể sửa dữ liệu đã nạp bằng UI thật của app (playlist/yêu thích/Follow/hồ sơ), hoặc mở http://127.0.0.1:4000 trên máy tính → Firestore → chọn collection/document để đọc và chỉnh field. Emulator UI được bật trong firebase.json, chỉ bind loopback; lần đầu có thể cần tải thành phần UI. UI có quyền sửa trực tiếp nên phải giữ đúng kiểu field/liên kết và counters; dùng app cho Follow/playback để backend đảm bảo transaction. Các thay đổi đó không tự ghi ngược JSON; lần data:apply tiếp theo sẽ lấy JSON làm nguồn. Đừng chạy lại local:seed sau đó vì fixture cùng ID sẽ ghi đè dữ liệu vừa nạp. JSON tồn tại trên ổ đĩa qua các lần tắt Emulator; chỉ cần data:apply lại khi dùng phiên Emulator chưa có dữ liệu import/export.

## Media hiện tại

Audio mẫu vẫn là WAV tổng hợp 12/45 giây, không phải bản thu thương mại. Nay có thể upload audio/ảnh riêng bằng form trong app; backend lưu `.local/uploads`. Với ảnh trong JSON, có thể dùng đường dẫn tương đối trong workspace như `assets/images/Artist Profile/Image 63.png`; data:apply sẽ sao chép vào kho local và lưu URI dùng được trên điện thoại. Không đặt đường dẫn ổ đĩa trực tiếp vào audioUrl: chọn audio qua form để backend đọc duration thật. Xem [ghi chú storage tạm và việc sửa sau](../../docs/LOCAL_UPLOAD_STORAGE.md).

## Giữ dữ liệu sau khi tắt

Phiên `npm run local:emulators` được cấu hình import từ `.local/emulator-data` và export về đó khi dừng bình thường bằng Ctrl+C. Nhờ đó dữ liệu sửa trong app/Emulator UI có thể giữ qua lần chạy tiếp theo; lần đầu chưa có export thì nạp JSON. Tắt cưỡng bức hoặc mất điện có thể chưa kịp export. Nếu đã có dữ liệu sửa trực tiếp muốn giữ, không chạy lại data:apply/local:seed vì chúng ghi đè các ID trùng. Bộ export có cả tài khoản local, không commit thư mục `.local/`.

