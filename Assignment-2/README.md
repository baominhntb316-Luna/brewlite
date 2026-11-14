#BrewLite - Ứng dụng Đặt Cà Phê Không Tiền Mặt (Assignment 2)

**Bài tập lớn môn Công nghệ Phần mềm (Software Engineering)**  
**Đề tài: BrewLite – Requirements to Deployment (Ver 1.0)**  
**Trường Đại học Sài Gòn (SGU) - Khoa Công nghệ Thông tin**  
**Học kỳ I - Năm học 2026–2027**

---

## 1. Giới thiệu Sản phẩm (Product Vision)
**BrewLite** là ứng dụng web hướng mobile-first/PWA giúp khách hàng xem menu, tùy chọn đồ uống (kích cỡ, topping), quản lý giỏ hàng, đặt đơn, thanh toán không dùng tiền mặt và theo dõi trạng thái đơn hàng theo thời gian thực.

Trong **Assignment 2**, dự án được phát triển xuyên suốt từ **Khai thác & Đặc tả yêu cầu (Task 1)** -> **Mô hình hóa hệ thống (Task 2)** -> **Thiết kế kiến trúc (Task 3)** -> **Triển khai Sprint 1 (Task 4)** -> **Triển khai Sprint 2, CI/CD và Delivery lên Production (Task 5)**.

---

## 2. Kiến trúc, Công nghệ & Cấu trúc Repository 

| Thành phần | Công nghệ sử dụng |
| :--- | :--- |
| **Frontend (`apps/web`)** | Next.js (React, TypeScript, Mobile-first/PWA), TailwindCSS, Zustand |
| **Backend (`apps/api`)** | NestJS (TypeScript), REST API, `class-validator`, JWT (`@nestjs/passport`), `bcrypt` |
| **Cơ sở dữ liệu** | PostgreSQL 15 + Prisma ORM (Migration & Seed tự động) |
| **Thanh toán** | Mock Payment Gateway (Ví điện tử / Thẻ ngân hàng hỗ trợ Idempotency) |
| **CI/CD & DevOps** | GitHub Actions (CI/CD Pipeline), Docker, Docker Compose, Jest |

### Cấu trúc thư mục dự án
```text
Assignment 2/
├── apps/
│   ├── web/                    # Frontend Next.js mobile-first/PWA (Port 3000)
│   └── api/                    # Backend NestJS REST API + Prisma ORM (Port 3001)
├── docs/
│   ├── requirements/           # Tạo phẩm Task 1 (Context & Scope, SRS, Use-case Spec)
│   ├── diagrams/               # Tạo phẩm Task 2 & 3 (.puml và .svg kết xuất)
│   ├── architecture/           # Tạo phẩm Task 3 (Architecture Overview & ADRs)
│   ├── traceability-matrix.md  # Ma trận truy vết yêu cầu - thiết kế - code - test (Task 8)
│   └── deployment.md           # Tài liệu triển khai, vận hành và rollback (Task 5.4)
├── tests/                      # Kiểm thử tích hợp (Integration) và End-to-End (E2E)
├── .github/workflows/          # Cấu hình pipeline CI (Task 4.4) và CD (Task 5.3)
├── docker-compose.yml          # Khởi chạy đồng thời Web, API và PostgreSQL tại local
├── .env.example                # Mẫu cấu hình biến môi trường (không chứa secret thật)
├── .gitignore                  # Cấu hình loại trừ file rác, node_modules và .env
└── README.md                   # Tài liệu tổng quan, quy trình nhóm, cài đặt và bàn giao
```

---

## 3. Quy trình Làm việc Nhóm & Quản lý Mã nguồn 

### 3.1. Chiến lược Branch và Pull Request (Branching & PR Strategy)
Nhóm áp dụng mô hình **GitHub Flow** kết hợp kiểm soát chất lượng tự động qua Pull Request:

1. **Nhánh chính (`main`)**:
   * Luôn ở trạng thái ổn định, sẵn sàng triển khai (deployable).
   * Không commit/push trực tiếp lên `main`; mọi thay đổi bắt buộc phải đi qua **Pull Request (PR)**.
2. **Quy tắc đặt tên nhánh làm việc (Feature / Task Branches)**:
   * `docs/<ten-hang-muc>`: Cập nhật tài liệu yêu cầu, sơ đồ, kiến trúc (VD: `docs/add-task1`, `docs/task1-2-srs-tracking`, `docs/class-diagram`, `docs/task3-architecture`).
   * `feat/<ten-tinh-nang>`: Phát triển tính năng mới cho Frontend/Backend (VD: `feat/products-api`, `feat/fe-menu`, `feat/auth-jwt`, `feat/orders-api`, `feat/payments-idempotent`, `feat/concurrency-stock`).
   * `fix/<ten-loi>`: Sửa lỗi phát sinh trong quá trình kiểm thử hoặc tích hợp.
   * `ci/<ten-pipeline>`: Thiết lập hoặc nâng cấp GitHub Actions CI/CD (VD: `ci/github-actions-pr`).
   * `test/<ten-kiem-thu>`: Bổ sung Unit Test, Integration Test, E2E Test (VD: `test/task10-docker`).
   * `chore/<ten-cong-viec>`: Cấu hình monorepo, Docker, thư viện (VD: `chore/monorepo-restructure`).
3. **Quy trình Pull Request (PR Workflow)**:
   * **Bước 1:** Tạo nhánh mới từ `main` và thực hiện công việc theo từng Task/User Story.
   * **Bước 2:** Mở Pull Request vào `main`, ghi rõ mục tiêu thay đổi, danh sách tạo phẩm và lý do cập nhật (đặc biệt khi thay đổi tài liệu ở `docs/`).
   * **Bước 3:** Pipeline **Continuous Integration (CI)** tự động chạy các bước: `Install -> Lint -> Unit Test -> Build`.
   * **Bước 4:** PR chỉ được phép **Merge** khi toàn bộ bước trong CI thành công (xanh) và được thành viên khác trong nhóm review & approve.

---

### 3.2. Quy ước Commit (Commit Convention)
Toàn bộ lịch sử commit tuân thủ chuẩn **Conventional Commits**:

```text
<type>(<scope>): <mô tả ngắn gọn thay đổi>
```

* **`feat`**: Thêm tính năng mới (VD: `feat(api): implement GET /products and GET /products/:id`).
* **`fix`**: Sửa lỗi (VD: `fix(order): prevent negative stock on concurrent requests`).
* **`docs`**: Thêm hoặc cập nhật tài liệu, sơ đồ trong `docs/` và `README.md` (VD: `docs(srs): add acceptance criteria for FR-01 to FR-08`).
* **`refactor`**: Tái cấu trúc mã nguồn không làm thay đổi hành vi nghiệp vụ (VD: `refactor(repo): package and reconstruct Assignment 2 structure`).
* **`test`**: Thêm hoặc chỉnh sửa kịch bản kiểm thử (VD: `test(api): add optimistic locking and idempotency tests`).
* **`ci`**: Cập nhật cấu hình pipeline GitHub Actions (VD: `ci(workflow): add lint, test and build quality gate on PR`).
* **`chore`**: Cập nhật cấu hình dự án, Docker, dependencies (VD: `chore(docker): configure healthcheck for postgres and api`).

---

### 3.3. Product Backlog / Issue Board cho Sprint 1 và Sprint 2

####  Sprint 1 (Task 4): Nền tảng kỹ thuật, Tài liệu, CI cơ bản & MVP Xem Menu
**Sprint Goal:** Tạo nền tảng kỹ thuật monorepo, đưa tài liệu Task 1–3 vào kiểm soát phiên bản, thiết lập CI tự động và phát hành MVP đầu tiên chạy được cho luồng xem menu.

| Mã Backlog | Hạng mục công việc (User Story / Task) | Liên kết Yêu cầu / Task | Ưu tiên (MoSCoW) | Trạng thái |
| :--- | :--- | :--- | :---: | :---: |
| **S1-01** | Thiết lập cấu trúc repository (`apps/web`, `apps/api`, `docs`, `tests`), `.gitignore`, `.env.example`, quy ước nhánh/commit & DoD | Task 4.1 | Must | Done |
| **S1-02** | Đưa toàn bộ tạo phẩm Task 1 (SRS, Use-case), Task 2 (Activity, Sequence, Class Diagram) và Task 3 (Architecture, ADR, Deployment Diagram) vào `docs/` qua PR | Task 4.2 | Must | Done |
| **S1-03** | Thiết kế Prisma Schema ban đầu, cấu hình migration và kịch bản `seed.ts` tạo dữ liệu đồ uống mẫu trên PostgreSQL | Task 4.3 / FR-01 | Must | Done |
| **S1-04** | Hiện thực API `GET /products` và `GET /products/:id` tại `apps/api` | Task 4.3 / FR-01, FR-02 | Must | Done |
| **S1-05** | Xây dựng màn hình Menu mobile-first trên Next.js (`apps/web`), xử lý đầy đủ trạng thái `loading`, `empty` và `error` | Task 4.3 / FR-01, NFR-01 | Must | Done |
| **S1-06** | Viết kiểm thử tối thiểu (Unit Test) cho Products API và luồng hiển thị chính | Task 4.3 | Must | Done |
| **S1-07** | Thiết lập pipeline CI (`.github/workflows/ci.yml`) tự động chạy `Install -> Lint -> Unit Test -> Build` khi mở PR | Task 4.4 / NFR-04 | Must | Done |

####  Sprint 2 (Task 5): Hoàn thiện MVP End-to-End, Kiểm thử Tích hợp, CD & Triển khai Production
**Sprint Goal:** Hoàn thành toàn bộ luồng nghiệp vụ từ chọn món đến thanh toán và theo dõi đơn, tự động hóa đóng gói CD và triển khai phiên bản Production truy cập được qua HTTPS.

| Mã Backlog | Hạng mục công việc (User Story / Task) | Liên kết Yêu cầu / Task | Ưu tiên (MoSCoW) | Trạng thái |
| :--- | :--- | :--- | :---: | :---: |
| **S2-01** | Hiện thực màn hình chi tiết sản phẩm, tùy chọn kích cỡ (`S`/`M`/`L`), topping và tự động tính giá | Task 5.1 / FR-02 | Must |  Done |
| **S2-02** | Quản lý Giỏ hàng (Zustand): thêm/sửa số lượng/xóa món, áp mã khuyến mãi và tính tổng tiền | Task 5.1 / FR-03 | Must | Done |
| **S2-03** | Xác thực người dùng: Đăng ký, Đăng nhập (`bcrypt` + `JWT`) và bảo vệ route bằng `JwtAuthGuard` | Task 5.1 / FR-04, NFR-02 | Must | Done |
| **S2-04** | API Tạo đơn hàng (`POST /orders`) kết hợp Transaction & Optimistic Locking chống âm kho khi đặt đồng thời | Task 5.1 / FR-05, NFR-03 | Must | Done |
| **S2-05** | Thanh toán Ví/Thẻ mô phỏng (`POST /payments`) hỗ trợ `Idempotency-Key` và cộng điểm tích lũy Loyalty | Task 5.1 / FR-06 | Must | Done |
| **S2-06** | Quản lý trạng thái đơn hàng theo Order State Machine (`PATCH /orders/:id/status`), màn hình xác nhận & lịch sử đơn (`GET /orders/me`) | Task 5.1 / FR-07, FR-08 | Must | Done |
| **S2-07** | Hiện thực endpoint `GET /health`, hoàn thiện `docker-compose.yml` chạy trọn bộ Web + API + DB ở local | Task 5.2 / NFR-03, NFR-04 | Must | Done |
| **S2-08** | Viết Unit Test nghiệp vụ lõi, Integration Test cho API đặt đơn/thanh toán và E2E Test cho luồng từ menu đến xác nhận đơn | Task 5.2 | Must | Done |
| **S2-09** | Thiết lập pipeline Continuous Delivery/Deployment (`Push/Tag -> Lint & Test -> Build -> Docker Image -> Deploy -> Smoke Test`) | Task 5.3 / NFR-04 | Must | Done |
| **S2-10** | Triển khai Production (HTTPS), lập Ma trận truy vết (`docs/traceability-matrix.md`), Release Notes, hướng dẫn Rollback và Sprint Retrospective | Task 5.4 & Task 8 | Must | Done |

---

### 3.4. Tiêu chuẩn Hoàn thành – Definition of Done (DoD)
Một User Story hoặc Task trong Sprint chỉ được chuyển sang trạng thái **Done** khi thỏa mãn toàn bộ các điều kiện sau:

1. **Mã nguồn & Kiến trúc (Code Quality)**:
   * Hiện thực đúng thiết kế kiến trúc và mô hình dữ liệu đã đặc tả ở Task 1–3.
   * Có kiểm tra dữ liệu đầu vào (`class-validator` ở Backend, validation ở Frontend) và xử lý ngoại lệ rõ ràng.
   * Không chứa thông tin nhạy cảm (secret, mật khẩu, khóa bí mật) cứng trong code; mọi cấu hình mới phải được cập nhật vào `.env.example`.
2. **Kiểm thử & CI Quality Gate (Testing & CI)**:
   * Vượt qua 100% tiêu chí chấp nhận (Acceptance Criteria) của yêu cầu chức năng/phi chức năng tương ứng trong SRS.
   * Có Unit Test / Integration Test đi kèm và chạy pass toàn bộ.
   * Pipeline CI trên Pull Request đạt trạng thái thành công ở cả 4 bước: `Install` $\rightarrow$ `Lint` $\rightarrow$ `Unit Test` $\rightarrow$ `Build`.
3. **Quản lý Phiên bản & Review (Git & PR)**:
   * Mã nguồn được đẩy lên nhánh riêng đúng quy ước, commit message tuân thủ chuẩn Conventional Commits.
   * Đã tạo Pull Request vào `main`, được thành viên trong nhóm review và không còn xung đột (merge conflict).
4. **Tài liệu & Truy vết (Documentation & Traceability)**:
   * Mọi thay đổi liên quan đến yêu cầu, sơ đồ UML hoặc kiến trúc đều được cập nhật đồng bộ trong thư mục `docs/` thông qua PR và ghi rõ lý do.
   * Cập nhật đầy đủ ánh xạ `Mã yêu cầu <-> Use-case <-> Thiết kế/Sơ đồ <-> Code/API <-> Test` vào tệp `docs/traceability-matrix.md`.
5. **Khả năng Chạy & Tích hợp (Runnability)**:
   * Tính năng hoạt động ổn định khi khởi chạy bằng `docker compose up --build` trên môi trường local mà không phát sinh lỗi runtime.

---

## 4. Hướng dẫn Cài đặt & Khởi chạy

### Cách 1: Chạy toàn bộ hệ thống bằng Docker Compose (Khuyên dùng khi Demo)
Đảm bảo máy đã cài đặt **Docker Desktop**. Tại thư mục `Assignment 2`, chạy lệnh:

```bash
cp .env.example .env
docker compose up --build -d
```
* **Frontend (Next.js)**: Truy cập tại `http://localhost:3000`
* **Backend API (NestJS)**: Hoạt động tại `http://localhost:3001`
* **Health Check API**: `http://localhost:3001/health`
* **PostgreSQL DB**: Hoạt động tại cổng `5432` (Tự động đẩy schema và nạp dữ liệu đồ uống mẫu khi khởi động).

Để dừng hệ thống:
```bash
docker compose down
```

---

### Cách 2: Chạy môi trường Phát triển (Local Development trên VS Code)

#### Bước 1: Thiết lập Biến môi trường chung (Root `.env`)
Dự án sử dụng file `.env` tại thư mục gốc `Assignment 2`:
```bash
cp .env.example .env
```

#### Bước 2: Khởi chạy Database PostgreSQL
```bash
docker compose up postgres -d
```

#### Bước 3: Khởi chạy Backend API (`Port 3001`)
```bash
cd apps/api
npm install
npx prisma generate
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

## 5. Danh sách REST API Endpoints Chính

| Phương thức | Endpoint | Quyền | Mô tả chức năng |
| :--- | :--- | :--- | :--- |
| `GET` | `/health` | Public | Kiểm tra trạng thái hoạt động của API và kết nối Database |
| `GET` | `/products` | Public | Lấy danh sách toàn bộ đồ uống trong menu |
| `GET` | `/products/:id` | Public | Xem chi tiết một sản phẩm và số lượng tồn kho |
| `POST` | `/auth/register` | Public | Đăng ký tài khoản mới (băm mật khẩu với `bcrypt`) |
| `POST` | `/auth/login` | Public | Đăng nhập và nhận chuỗi `accessToken` (JWT) |
| `POST` | `/orders` | `JWT Guard` | Tạo đơn hàng ở trạng thái `PENDING`, kiểm soát tồn kho & áp mã giảm giá |
| `POST` | `/payments` | `JWT Guard` | Thanh toán không tiền mặt kèm header `Idempotency-Key` |
| `GET` | `/orders/me` | `JWT Guard` | Xem lịch sử đơn hàng và trạng thái đơn của người dùng hiện tại |
| `PATCH` | `/orders/:id/status` | `JWT Guard` | Chuyển trạng thái đơn hàng theo Order State Machine |

---

## 6. Điểm nhấn Nghiệp vụ & Kiểm thử Tự động

1. **Order State Machine (`apps/api/src/order/order-state-machine.ts`)**:
   * Luồng chuẩn: `PENDING` $\rightarrow$ `PAID` $\rightarrow$ `PREPARING` $\rightarrow$ `READY` $\rightarrow$ `COMPLETED`.
   * Luồng ngoại lệ: Hỗ trợ chuyển sang `PAYMENT_FAILED` (cho phép thử lại về `PENDING`) và `CANCELLED` (tự động hoàn lại tồn kho).
2. **Thanh toán Idempotent (`apps/api/src/payments/payments.service.ts`)**:
   * Sử dụng `Idempotency-Key` trên Header để chống thanh toán trùng lặp khi client gửi lại yêu cầu do lỗi mạng.
3. **Kiểm soát Tồn kho khi Đặt đồng thời (`apps/api/src/order/orders.service.ts`)**:
   * Kết hợp Database Transaction (`prisma.$transaction`) và **Optimistic Locking** (trường `version` của `Product`) ngăn chặn hoàn toàn tình trạng bán lố tồn kho (overselling).
4. **Khuyến mãi & Tích điểm Loyalty**:
   * Hỗ trợ áp mã giảm giá (`BREWLITE10`, `GIAM10K`, `SGU2026`) khi tạo đơn và tự động tích điểm `loyaltyPoints` (`10.000đ = 1 điểm`) khi thanh toán thành công.

### Chạy bộ Kiểm thử (Unit & Integration Tests)
```bash
cd apps/api
npm test
npx jest src/task10.spec.ts
```
