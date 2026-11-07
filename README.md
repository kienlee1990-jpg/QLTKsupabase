# Quản lý tài khoản — Vue + Supabase

Ứng dụng tiếng Việt gồm đăng nhập bằng email/mật khẩu, đăng xuất, hồ sơ cá nhân, đổi mật khẩu và phân quyền `admin` / `user`.

**Kiến trúc:** Vue 3 + TypeScript + Vite → Supabase Auth / REST API / PostgreSQL RPC. Supabase cung cấp backend API, không cần dựng thêm Express. Các lời gọi API được tập trung trong `src/services` và `src/stores/auth.ts`.

## 1. Cài đặt

Yêu cầu Node.js 22.12+ hoặc 24 và một dự án Supabase.

```sh
npm install
cp .env.example .env
```

Điền URL dự án và **publishable key** trong `.env`:

```dotenv
VITE_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
```

Cũng hỗ trợ `VITE_SUPABASE_ANON_KEY` cho dự án dùng key legacy. Không đưa secret key hoặc `service_role` vào frontend. Các biến có tiền tố `VITE_` đều công khai trong bản build.

## 2. Thiết lập database

Mở Supabase Dashboard → SQL Editor và chạy toàn bộ tệp:

[`supabase/migrations/202611080001_accounts.sql`](supabase/migrations/202611080001_accounts.sql)

Migration tạo bảng `profiles`, tự tạo hồ sơ cho tài khoản Auth mới, bổ sung hồ sơ cho tài khoản có sẵn và bật Row Level Security. Chỉ chạy migration này một lần trên database mới.

Nếu dùng Supabase CLI đã cài đặt:

```sh
supabase login
supabase link --project-ref YOUR_PROJECT_REF
supabase db push
```

## 3. Tạo tài khoản và quản trị viên đầu tiên

1. Vào Authentication → Users → Add user → Create new user.
2. Nhập email và mật khẩu gồm ít nhất 8 ký tự, có chữ và số. Với tài khoản tạo thủ công, xác nhận email hoặc bật Auto Confirm User khi tạo.
3. Tạo thêm một tài khoản để kiểm tra vai trò người dùng.
4. Chạy SQL sau trong SQL Editor, thay email bằng email admin vừa tạo:

```sql
update public.profiles
set role = 'admin', full_name = 'Quản trị viên'
where email = 'admin@example.com';
```

Các tài khoản mới mặc định là `user`. Không có mật khẩu hay tài khoản admin mặc định trong mã nguồn.

Trong Authentication → cấu hình email/password:

- Tắt **Allow new users to sign up** nếu chỉ cấp tài khoản qua quản trị viên. Ứng dụng không có màn hình đăng ký, nhưng cần tắt đăng ký tại Supabase để chặn gọi API trực tiếp.
- Đặt độ dài mật khẩu tối thiểu 8, yêu cầu chữ và số. Kiểm tra frontend hỗ trợ trải nghiệm nhập liệu; chính sách Supabase mới là phần thực thi trên server.
- Đặt Site URL theo địa chỉ ứng dụng, ví dụ `http://127.0.0.1:5173` khi phát triển.

`supabase/config.toml` đã thiết lập các chính sách cơ bản cho môi trường local. Cấu hình này không tự thay đổi cài đặt của dự án hosted; hãy đặt tương ứng trên Dashboard.

## 4. Chạy

```sh
npm run dev
```

Mở địa chỉ Vite in ra trong terminal (thường là `http://127.0.0.1:5173`). Khởi động lại Vite sau khi sửa `.env`.

Khi chưa có `.env`, màn hình đăng nhập hiện hướng dẫn cấu hình và vô hiệu hóa nút đăng nhập. Không có tài khoản giả hoặc chế độ đăng nhập bỏ qua xác thực.

## Phạm vi quyền

| Chức năng | Người dùng | Quản trị viên |
| --- | --- | --- |
| Đăng nhập / đăng xuất | Có | Có |
| Xem hồ sơ, sửa tên của mình | Có | Có |
| Đổi mật khẩu của mình | Có | Có |
| Xem danh sách người dùng | Không | Có |
| Thay đổi vai trò người khác | Không | Có |
| Tự thay đổi vai trò | Không | Không |

Không thể sửa trực tiếp email, ID, ngày tạo hoặc vai trò qua bảng `profiles`. Chỉ cột `full_name` có quyền UPDATE cho client. RPC `set_user_role` kiểm tra vai trò từ database mỗi lần gọi, không tin dữ liệu vai trò trong `user_metadata`. Admin không thể tự hạ quyền, tránh mất admin cuối cùng qua giao diện/API này. Việc thay đổi vai trò qua SQL Editor vẫn thuộc quyền quản trị database.

Đổi mật khẩu xác minh mật khẩu hiện tại bằng Supabase Auth, rồi gọi `updateUser`. Xác minh mật khẩu hiện tại ở giao diện không thay thế chính sách bảo mật server: có thể bật Secure password change và chính sách xác thực bổ sung trong Supabase khi cần; luồng reauthentication qua email chưa nằm trong phạm vi dự án này.

Quản lý tạo/xóa tài khoản, khôi phục mật khẩu, mời người dùng và MFA không nằm trong phạm vi hiện tại; thực hiện tạo tài khoản và hỗ trợ khôi phục qua Supabase Dashboard. Đăng xuất dùng phạm vi `local` cho phiên hiện tại.

## API

API được Supabase cung cấp sẵn, SDK tự gửi JWT của phiên đăng nhập.

| Thao tác | API / SDK |
| --- | --- |
| Đăng nhập | `supabase.auth.signInWithPassword({ email, password })` |
| Khôi phục phiên | `supabase.auth.getSession()` |
| Đăng xuất | `supabase.auth.signOut({ scope: 'local' })` |
| Đổi mật khẩu | `supabase.auth.updateUser({ password })` |
| Hồ sơ của mình | `GET /rest/v1/profiles?id=eq.<user_id>&select=*` |
| Đổi tên | `PATCH /rest/v1/profiles?id=eq.<user_id>` với `{ "full_name": "Tên mới" }` |
| Danh sách người dùng | `GET /rest/v1/profiles?select=*&order=created_at.desc,id.asc` (admin; có phân trang Range) |
| Phân quyền | `POST /rest/v1/rpc/set_user_role` với `{ "target_user_id": "uuid", "new_role": "admin" }` |

Ví dụ gọi trực tiếp API phân quyền bằng token **của admin**:

```sh
curl "$SUPABASE_URL/rest/v1/rpc/set_user_role" \
  -H "apikey: $SUPABASE_PUBLISHABLE_KEY" \
  -H "Authorization: Bearer $ADMIN_ACCESS_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"target_user_id":"UUID_NGUOI_DUNG","new_role":"user"}'
```

## Kiểm tra

```sh
npm test
npm run build
```

`npm test` bao gồm kiểm tra mật khẩu và 12 trường hợp phân quyền chạy migration thật trên PostgreSQL nhúng (PGlite), không cần Supabase key hoặc Docker. Môi trường test mô phỏng phần schema Auth; chưa thay thế kiểm tra tích hợp với Supabase Auth thật.

Test bảo mật database cần Supabase CLI + Docker:

```sh
supabase start
supabase test db
```

Test SQL chạy trong transaction rồi rollback; kiểm tra user chỉ thấy hồ sơ của mình, không thể tự nâng quyền bằng metadata / UPDATE / RPC, không thể sửa người khác và admin có thể phân quyền. Chỉ chạy test trên database local dành cho phát triển.

Kiểm tra tích hợp thủ công sau khi kết nối Supabase:

1. Đăng nhập user: chỉ có hồ sơ/bảo mật; mở `/users` bị chuyển về `/account`.
2. Sửa tên, tải lại trang: dữ liệu vẫn được giữ.
3. Đổi mật khẩu: mật khẩu hiện tại sai bị từ chối; đổi đúng rồi đăng xuất và đăng nhập bằng mật khẩu mới.
4. Đăng nhập admin: xem danh sách, tìm kiếm/lọc và đổi vai trò tài khoản khác.
5. Đăng nhập lại tài khoản được cấp quyền để kiểm tra menu tương ứng. Mở trang `/users` luôn tải lại quyền; RLS/RPC thực thi quyền hiện tại kể cả khi giao diện của phiên cũ chưa cập nhật.

## Build và triển khai

```sh
npm run build
npm run preview
```

Triển khai thư mục `dist/` lên hosting static, cung cấp hai biến môi trường Supabase tại bước build. Cấu hình fallback mọi route về `index.html` vì ứng dụng dùng Vue Router history. Ví dụ Nginx: `try_files $uri $uri/ /index.html;`. Đặt Site URL đúng tên miền trên Supabase Dashboard. Chạy migration trên dự án Supabase đích trước khi sử dụng.

## Cấu trúc

```text
src/
  components/AppShell.vue    Bố cục và menu theo quyền
  lib/                      Supabase client, kiểm tra đầu vào
  router/                   Route và kiểm tra đăng nhập/admin
  services/accounts.ts      API hồ sơ và phân quyền
  stores/auth.ts            Phiên đăng nhập và hồ sơ hiện tại
  views/                    Đăng nhập, hồ sơ, mật khẩu, người dùng
supabase/
  migrations/               Database, RLS, trigger, RPC
  tests/                    Kiểm tra quyền tại database
```

Tài liệu chính thức: [Supabase Auth](https://supabase.com/docs/guides/auth/passwords), [User management](https://supabase.com/docs/guides/auth/managing-user-data), [Row Level Security](https://supabase.com/docs/guides/database/postgres/row-level-security).
