# B?o c?o ki?m tra UI mobile ? 2026-11-02

| Ki?m tra | K?t qu? |
| --- | --- |
| npx.cmd expo lint | PASS, 0 l?i/0 c?nh b?o |
| npx.cmd tsc --noEmit | PASS |
| npm.cmd test | PASS, 16/16, kh?ng fail/skipped |
| Native export Android/iOS | PASS, exit 0 |

Output: tmp/mobile-ui-export. ??y l? bundle Hermes, kh?ng ph?i APK/IPA. L??t export ???c x?c nh?n l?i v? phi?n terminal tr??c kh?ng c?n tr? exit status.

Tests bao g?m chu?n h?a t?m ki?m, validation, th?i l??ng, semantics input/password/email/multiline, busy/error, ?nh v? alt, gi?i h?n form/virtualization, FilterBar ARIA, Player kh?ng c? raw text r?ng, Field disabled, Back kh?ng c? l?ch s?, double tap v? reset khi focus l?i. Test UI render qua adapter React Native Web; Player d?ng stub audio/platform dependencies. C?c test Back ki?m tra logic ?i?u ph?i, kh?ng ch?y navigator native.

Ch?a ki?m th? giao di?n tr?c quan, Portal runtime, keyboard ho?c audio th?t tr?n Android/iOS. Bundle/test th?nh c?ng kh?ng ch?ng minh b? c?c kh?p PDF hay l?i runtime ?? h?t tr?n m?i thi?t b?.

## Ki?m tra th? c?ng

- Kh?i ??ng l?i Metro ?? ?p d?ng resolver Portal; m? menu v? h?p ch?n playlist.
- M? tr?c ti?p m?n chi ti?t kh?ng c? history, nh?n Back; nh?n Back li?n ti?p khi c? history.
- Home cu?n d?c/ngang, m? song/artist/chart/album r?i Back: gi? v? tr? v? ph?t nh?c.
- Charts kh?ng ?? mini player; t?n d?i, ch? l?n v? Follow c?n gi?a.
- Form auth/profile/upload v? Comments v?i b?n ph?m; l?i API, loading/empty, g?i l?p.
- Favorite, playlist CRUD, quy?n admin, play/pause/seek/next/previous v?n ho?t ??ng.
