# ☕ BrewLite - Ứng dụng Đặt Cà Phê Không Tiền Mặt

> **Bài tập lớn môn Công nghệ Phần mềm (Software Engineering)**  
> **Trường Đại học Sài Gòn (SGU) - Khoa Công nghệ Thông tin**  
> **Học kỳ I - Năm học 2026–2027**

---

## 1. Giới thiệu Sản phẩm (Product Vision)
**BrewLite** giúp khách hàng đặt và thanh toán đồ uống không dùng tiền mặt chỉ trong vài chạm, giảm thời gian xếp hàng và nhận đơn nhanh tại quầy. Dự án được phát triển theo quy trình **Agile Scrum** trải dài qua 3 Sprint, hoàn thành trọn vẹn 10/10 hạng mục trong Product Backlog.

---

## 2. Kiến trúc & Công nghệ Sử dụng

| Thành phần | Công nghệ |
| :--- | :--- |
| **Frontend** | Next.js (React, TypeScript), TailwindCSS, Zustand (Quản lý giỏ hàng) |
| **Backend** | NestJS (TypeScript), REST API, `class-validator`, JWT (`@nestjs/passport`), `bcrypt` |
| **Cơ sở dữ liệu** | PostgreSQL 15 + Prisma ORM |
| **Thanh toán** | Mock Payment Gateway (Mô phỏng thanh toán Ví điện tử / Thẻ ngân hàng có hỗ trợ Idempotency) |
| **DevOps & Testing** | Docker, Docker Compose, Jest (Unit & Integration Testing) |

### Cấu trúc thư mục dự án
```text
brewlite/
├── backend/            # Mã nguồn REST API (NestJS + Prisma)
├── frontend/           # Mã nguồn Giao diện người dùng (Next.js + TailwindCSS)
├── docker-compose.yml  # Cấu hình chạy đồng thời Frontend, Backend và PostgreSQL
├── api-test.http       # Kịch bản kiểm thử nhanh REST API trên VS Code
└── README.md           # Tài liệu hướng dẫn cài đặt và bàn giao
```

---

## 3. Hướng dẫn Cài đặt & Khởi chạy

### Cách 1: Chạy toàn bộ hệ thống bằng Docker Compose (Khuyên dùng khi Demo)
Đảm bảo máy đã cài đặt **Docker Desktop**. Tại thư mục gốc của dự án, chạy lệnh:

```bash
cp .env.example .env >>
docker compose up --build -d >>
```
* **Frontend (Next.js)**: Truy cập tại `http://localhost:3000`
* **Backend API (NestJS)**: Hoạt động tại `http://localhost:3001`
* **PostgreSQL DB**: Hoạt động tại cổng `5432` (Tự động migrate schema và seed 4 món đồ uống mẫu khi khởi động).

Để dừng hệ thống:
```bash
docker compose down
```

---

### Cách 2: Chạy môi trường Phát triển (Local Development trên VS Code)

#### Bước 1: Thiết lập Biến môi trường chung (Root .env)
Toàn bộ dự án sử dụng **duy nhất một file `.env` tại thư mục gốc**:
```bash
cp .env.example .env
```
*(Không cần tạo file `.env` riêng lẻ trong từng thư mục `apps/api` hay `apps/web`)*

#### Bước 2: Khởi chạy Database
```bash
docker compose up postgres -d
```

#### Bước 3: Khởi chạy Backend API (`Port 3001`)
```bash
cd apps/api
npm install
npm run db:push
npm run db:seed
npm run start:dev
```

#### Bước 4: Khởi chạy Frontend Web (`Port 3000`)
```bash
cd apps/web
npm install
npm run dev
```

---

## 4. Danh sách REST API Endpoints Chính

| Phương thức | Endpoint | Quyền | Mô tả chức năng |
| :--- | :--- | :--- | :--- |
| `GET` | `/products` | Public | Lấy danh sách toàn bộ đồ uống trong menu |
| `GET` | `/products/:id` | Public | Xem chi tiết một sản phẩm và số lượng tồn kho |
| `POST` | `/auth/register` | Public | Đăng ký tài khoản mới (băm mật khẩu với `bcrypt`) |
| `POST` | `/auth/login` | Public | Đăng nhập và nhận chuỗi `accessToken` (JWT) |
| `POST` | `/orders` | `JWT Guard` | Tạo đơn hàng ở trạng thái `PENDING`, kiểm soát tồn kho & áp mã giảm giá |
| `POST` | `/payments` | `JWT Guard` | Thanh toán không tiền mặt kèm header `Idempotency-Key` |
| `GET` | `/orders/me` | `JWT Guard` | Xem lịch sử đơn hàng và trạng thái đơn của người dùng hiện tại |
| `PATCH` | `/orders/:id/status` | `JWT Guard` | Chuyển trạng thái đơn hàng theo Order State Machine |

---

## 5. Điểm nhấn Nghiệp vụ Backend Nâng cao (Task 10)

Hệ thống hiện thực đầy đủ 4 yêu cầu nghiệp vụ thực tế tại tầng Backend:

1. **Order State Machine (`src/orders/order-state-machine.ts`)**:
   * Luồng chuẩn: `PENDING` $\rightarrow$ `PAID` $\rightarrow$ `PREPARING` $\rightarrow$ `READY` $\rightarrow$ `COMPLETED`.
   * Luồng ngoại lệ: Hỗ trợ chuyển sang `PAYMENT_FAILED` (cho phép thử lại về `PENDING`) và `CANCELLED`.
   * Hàm `assertTransition(from, to)` chặn mọi thao tác nhảy cóc trạng thái không hợp lệ.
2. **Thanh toán Idempotent (`src/payments/payments.service.ts`)**:
   * Bắt buộc truyền `Idempotency-Key` trên Header. Nếu client gửi trùng request thanh toán nhiều lần do lỗi mạng, hệ thống trả về kết quả đã xử lý trước đó mà không tạo giao dịch mới hay trừ tiền/cộng điểm 2 lần.
3. **Kiểm soát Tồn kho khi Đặt đồng thời (`src/orders/orders.service.ts`)**:
   * Kết hợp Database Transaction (`prisma.$transaction`) và **Optimistic Locking** (thông qua trường `version` của `Product`). Đảm bảo không bao giờ xảy ra tình trạng bán lố số lượng tồn kho (overselling) khi nhiều khách hàng bấm đặt cùng một thời điểm.
4. **Khuyến mãi & Tích điểm Loyalty**:
   * Hỗ trợ áp mã giảm giá (`BREWLITE10` giảm 10%, `GIAM10K` giảm 10.000đ) khi tạo đơn.
   * Tự động cộng điểm tích lũy (`loyaltyPoints`) cho khách hàng theo tỷ lệ `10.000đ = 1 điểm` ngay khi đơn hàng chuyển sang trạng thái `PAID`.

### Chạy bộ Unit & Integration Test kiểm chứng Task 10
Để chạy file kiểm thử tự động chứng minh cả 3 tiêu chí chấm điểm `(a) State Machine`, `(b) Idempotency`, và `(c) Concurrency Optimistic Locking`:

```bash
cd backend
npx jest test/task10.spec.ts
```

---

## 6. Trạng thái Hoàn thành Product Backlog (Definition of Done)

- [x] **Task 1**: Khởi tạo dự án monorepo (`frontend` + `backend`), cấu hình Git, `.env.example`, `README.md`.
- [x] **Task 2**: API `GET /products` và `GET /products/:id` trả về danh sách menu từ PostgreSQL.
- [x] **Task 3**: Trang Menu (Frontend) hiển thị lưới sản phẩm, xử lý trạng thái loading/empty.
- [x] **Task 4**: Màn hình chi tiết sản phẩm, tùy chọn Size (`S`/`M`/`L`) và Topping, tự động tính giá.
- [x] **Task 5**: Quản lý Giỏ hàng (Thêm/sửa số lượng/xóa, tự tính tổng tiền, hiển thị badge số lượng).
- [x] **Task 6**: API `POST /orders` validate dữ liệu với `class-validator`, lưu đơn trạng thái `PENDING`.
- [x] **Task 7**: Đăng ký / Đăng nhập (`bcrypt` + `JWT`), bảo vệ route đặt đơn và thanh toán bằng Guard.
- [x] **Task 8**: Tích hợp Mock Payment (`POST /payments`), chuyển trạng thái `PAID` hoặc `PAYMENT_FAILED`.
- [x] **Task 9**: Màn hình xác nhận đơn, API `GET /orders/me`, đóng gói `docker-compose.yml` chạy trọn bộ 3 dịch vụ.
- [x] **Task 10**: Hoàn thiện State Machine, Idempotent Payment, Optimistic Locking, Loyalty & vượt qua toàn bộ Test Suite.