# Nội dung PDF music_stream_app

Nguồn: docs/music_stream_app.pdf, 13 trang. Đọc ngày 2026-11-02.

## Phương pháp và giới hạn

PyMuPDF 1.26.7 mở và render đủ 13 trang. Trích xuất bằng get_text(sort=True) trả về 0 ký tự trên tất cả các trang vì PDF chỉ chứa ảnh mockup. Bản Markdown này chép lại nội dung nhìn thấy từ ảnh render, kèm mô tả bố cục và biểu tượng; không phải OCR tự động. Phần bị cắt ở mép ảnh được đánh dấu, không tự bổ sung. Tên, số liệu, giá và placeholder trong mockup không phải dữ liệu thực đã xác minh.

Mọi trang đều có thanh trạng thái mô phỏng 9:41, sóng, Wi-Fi, pin. Khi triển khai, đây là UI của hệ điều hành, không vẽ lại. Trang dài biểu diễn nội dung cuộn dọc, không phải yêu cầu thu nhỏ để vừa màn hình.

## Trang 1 - Welcome

Chữ: Your music / Your / artists. Create an account. I already have an account.

Logo sóng âm trắng phía trên. Ảnh người đeo tai nghe, khói hồng tím và các khối cầu màu phủ toàn nền. Tiêu đề trắng đậm phía dưới. Hai nút viên thuốc: nền đen và nền xanh nhạt, chữ cyan. Nền tràn màn hình; nút cần nằm trong safe area.

## Trang 2 - Home

Logo màu, chuông thông báo, avatar. Good morning, / Ashley Scott. Search: What you want to listen to.

- Suggestions for you: Reflection / Christina Aguilera; In The Stars / Benson Boone. Card ảnh đứng, chữ trên overlay ở đáy.
- Charts / See all: Top 50 / Canada; Top 50 / Global; card thứ ba chỉ thấy To… / Tre… bị cắt. Chú thích Daily chart-toppers update.
- Trending albums / See all: ME / Jessica Gonzalez; Magna nost / Brian Thomas; card thứ ba Magna n… / Christop… bị cắt.
- Popular artists / See all: Jennifer Wilson; Elizabeth Hall; Antho… bị cắt. Avatar tròn và nút Follow.
- Bottom tabs: Home, Search, Feed, Library; Home cyan.

Nền trắng, chữ đen/xám, các section cuộn ngang trong trang cuộn dọc.

## Trang 3 - Chart detail

Back, cast. Cover Top 50 / Canada. Top 50 - Canada. Tim 1,234; 05:10:18. Daily chart-toppers update. Thanh hành động tim, more, shuffle, play tròn đen.

| Bài | Nghệ sĩ | Lượt nghe | Thời lượng |
| --- | --- | --- | --- |
| FLOWER | Jessica Gonzalez | 2,1M | 3:36 |
| Shape of You | Anthony Taylor | 68M | 03:35 |
| Blinding Lights | Brian Bailey | 93M | 03:39 |
| Levitating | Anthony Taylor | 9M | 07:48 |
| Astronaut in the Ocean | Pedro Moreno | 23M | 03:36 |
| Dynamite | Elena Jimenez | 10M | 06:22 |

Mỗi hàng có ảnh vuông, play nhỏ và more. Mini player nền đen: ảnh nhỏ, FLOWER, Me • Jessica Gonzalez, tim và play. Bottom tabs Home/Search/Feed/Library, Home được chọn.

## Trang 4 - Full player

Ảnh sân khấu toàn màn hình, overlay tối ở header và vùng điều khiển. Play, chevron xuống. FLOWER / Jessica Gonzalez. Waveform cột cao thấp: phần đã chạy trắng, còn lại xám. 0:06 và 3:08. Shuffle, previous, play lớn tròn trắng, next, more. Tim 12K, comment 450, share. Không có bottom tabs.

Không thể xác định từ hình liệu nền là video hay ảnh tĩnh, waveform thật hay trang trí.

## Trang 5 - Artist detail

Back. Avatar lớn tròn. Ryan Young. 65.1K Followers. Follow, more, shuffle, play.

Popular:

| Bài | Nghệ sĩ | Lượt nghe | Thời lượng |
| --- | --- | --- | --- |
| Let you free | Ryan Young | 68M | 03:35 |
| Blinding Lights | Ryan Young | 93M | 03:39 |
| Levitating | Ryan Young | 9M | 07:48 |
| Astronaut in the Ocean | Ryan Young | 23M | 03:36 |
| Dynamite | Ryan Young | 10M | 06:22 |

Albums: ME / Jessica Gonzalez; Magna nost / Jessica Gonzalez; Proident / Jessica Gonz… (mép phải bị cắt).

About: ảnh nghệ sĩ, đoạn placeholder: Do in cupidatat aute et in officia aute laboris est Lorem est nisi dolor consequat voluptate duis irure. Veniam quis amet irure cillum elit aliquip sunt cillum cillum do aliqua voluptate ad non magna elit. Do ea n (kết thúc bị cụt). View more.

Fans also like: Magna nost / Jessica Gonzalez; Exercitatio / Brian Harris; Tempor n… / Tyler And… (bị cắt). Bottom tabs Home/Search/Feed/Library, Home được chọn.

Các tên album/nghệ sĩ trong ảnh chưa nhất quán; không suy ra schema từ dữ liệu mẫu.

## Trang 6 - Search đang nhập

Ô nhập me, viền focus cyan và nút xóa x. Gợi ý:

- Me
- me illum id aliquip
- me lorem
- Me Gonzalez
- Me irure esse
- Me Exercitation
- Me Sint aliquip duis deseru

Bàn phím iOS qwerty chữ thường, shift, backspace, 123, emoji, space, done, microphone và home indicator. Không thấy bottom tabs. Bàn phím là thành phần hệ điều hành.

## Trang 7 - Search results

Search me và x. Tabs All / Tracks / Albums / Artists, All cyan có gạch chân. Mer Watson, 1.234K Followers, Follow.

| Bài | Nghệ sĩ | Lượt nghe | Thời lượng |
| --- | --- | --- | --- |
| Me | Jessica Gonzalez | 2,1M | 3:36 |
| Me Inc | Anthony Taylor | 68M | 03:35 |
| Dozz me | Brian Bailey | 93M | 03:39 |
| Eastss me | Anthony Taylor | 9M | 07:48 |
| Me Ali | Pedro Moreno | 23M | 03:36 |
| Me quis a | Elena Jimenez | 10M | 06:22 |
| Me light | John Smith | 81M | 05:15 |

Hàng có artwork và more. Bottom tabs Home/Search/Feed/Library; Search được chọn.

## Trang 8 - Feed

Feed, cast. Mỗi post có avatar, chấm xanh, verified, thời gian, ảnh bìa lớn và overlay thông tin.

- Jessica Gonzalez; Posted a track • 3d; FLOWER / Jessica Gonzalez; play 125; 05:15. Tim 20, comment 3, repost 1, more.
- William King; Posted a track • 5d; Me / William King; play 245; 05:15. Tim 45, comment 9, repost 2, more.

Bottom tabs Home/Search/Feed/Library; Feed được chọn. Ý nghĩa chấm xanh không được định nghĩa trong tài liệu.

## Trang 9 - Comments sheet

Feed phía sau có scrim xám, vẫn thấy header/cast và phần đầu bài Jessica Gonzalez. Sheet trắng từ dưới lên: 3 comments, chevron xuống.

- Sally Rooney: Do duis cul 😍; 17h; 1 like; Reply; icon like.
- Jason: Minim magna exc 😍; 48m; 4 like; Reply; icon like.
- Reply thụt vào: Michael Key: @Jason Smitth Deserunt officia consectetur adipi; 40m; 2 like; Reply; icon like.
- Liam Pham: Commodo 🔥; 12m; 1 like; Reply; icon like.
- Reply thụt vào: Kiran Glaucus: Esse consequat cillum; 5m; Reply; icon like.
- View 10 more replies.
- Composer: avatar A; Write a comment...; emoji picker.

Tên, placeholder và emoji được đọc từ ảnh; chính tả mang tính minh họa. 3 comments có thể chỉ tính bình luận gốc, chưa có quy tắc nghiệp vụ xác nhận.

## Trang 10 - Library

Your Library, search. Chips Playlists / New tag / Songs / Albums / Artists (chip cuối chạm mép). Mer Watson, 1.234K Followers, Follow.

| Mục | Metadata | Hành động |
| --- | --- | --- |
| FLOWER | Jessica Gonzalez; 2,1M; 3:36 | Tim cyan |
| Shape of You | Anthony Taylor; 68M; 03:35 | Tim cyan |
| Blinding Lights | Ashley Scott; 4 songs | Chevron, dạng playlist |
| Levitating | Anthony Taylor; 9M; 07:48 | Tim cyan |
| Astronaut in the Ocean | Pedro Moreno; 23M; 03:36 | Tim cyan |
| Dynamite | Elena Jimenez; 10M; 06:22 | Tim cyan |

Bottom tabs Home/Search/Feed/Library, Library được chọn. New tag chưa đủ rõ để xác định là filter hay tạo nhãn.

## Trang 11 - Playlists

Back, Playlists, cast. Your playlists.

- Ipsum sit nulla; Ashley Scott; 12 songs; ảnh vuông; chevron.
- Occaecat aliq; Jose Garcia; 4 songs; ảnh vuông; chevron.

Nút dấu cộng tròn đen ở góc dưới phải. Bottom tabs Home/Search/Feed/Library, Library được chọn. Nhiều chủ sở hữu trong ảnh chưa đủ để kết luận có playlist cộng tác/công khai.

## Trang 12 - Premium welcome

Ảnh người đeo tai nghe, ánh sáng xanh tím toàn màn hình. Logo sóng âm trắng. Welcome to Premium. Ba chấm phân trang. Start listening. Không có bottom tabs.

## Trang 13 - Premium plans

Nền gradient tím/hồng/xanh, vàng nhạt phía trên. Unlimited music selections.

Card trắng:

- Premium
- Free for 1 month
- $12.99/ month
- Ad-free listening
- Download to listen offline
- Access full catalog Premium
- High sound quality
- Cancel anytime
- Subscribe now

Mỗi quyền lợi có check tím. Card tiếp theo chỉ lộ dải bên phải, không đọc được đầy đủ tên/giá/quyền lợi. Ba chấm phân trang. Back home.

Không có đặc tả thanh toán, bitrate, tải offline, trial hay backend kiểm tra quyền lợi. Không mặc định các dòng quảng bá là chức năng đã có.

## Luồng suy ra và điểm cần xác nhận

1. Welcome → auth → Home; form auth không được vẽ trong PDF.
2. Home → chart/artist/album → chọn bài → mini player → full player.
3. Search nhập → gợi ý → All/Tracks/Albums/Artists → nghe hoặc follow.
4. Feed → nhạc → phản ứng, comments/reply, share/repost.
5. Library → bộ lọc → playlist → thêm/chọn playlist.
6. Premium welcome → plans → đăng ký là thứ tự đề xuất, không có sơ đồ điều hướng trong PDF.

PDF không quy định schema, phân quyền, upload/admin, thuật toán đề xuất, nguồn chart, notifications, cast, quy tắc đếm tương tác, hiệu năng hay kiểm thử. Xem UI_IMPLEMENTATION_PLAN.md để đọc phần phân tích riêng, không nhầm với nội dung gốc.
