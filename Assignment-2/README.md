# BrewLite - Ứng dụng Đặt Cà Phê Không Tiền Mặt (Assignment 2)

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
Đảm bảo máy đã cài đặt **Docker Desktop**. Tại thư mục `Assignment-2`, chạy lệnh:

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
Dự án sử dụng file `.env` tại thư mục gốc `Assignment-2`:
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

### 6.1. Chạy bộ Kiểm thử (Unit, Integration, E2E, FR & NFR Tests)
```bash
cd apps/api
npm run lint
npm test
npx jest src/task10.spec.ts
```

### 6.2. Hướng dẫn Đóng gói & Build Ứng dụng (Production Build)
Để kiểm tra quá trình biên dịch TypeScript, đóng gói bundle Production cho cả Backend, Frontend và Docker Image trước khi triển khai:

```bash
# 1. Build Backend API (NestJS -> thư mục dist/)
cd apps/api
npx prisma generate
npm run build

# 2. Build Frontend Web/PWA (Next.js -> thư mục .next/)
cd ../web
npm run build

# 3. Đóng gói Docker Images cho toàn bộ hệ thống tại thư mục Assignment-2
cd ../..
docker compose build --no-cache
```

---

## 7. Triển khai Production (Deploy), Đường dẫn Cloud & Khôi phục Sự cố (Rollback)

### 7.1. Danh sách Đường dẫn Môi trường Production & Health Check (Cloud URLs)
Hệ thống được triển khai trên nền tảng Cloud hỗ trợ giao thức **HTTPS** và phân tách mạng nội bộ bảo mật cho Cơ sở dữ liệu:

| Thành phần | Nền tảng Triển khai | URL Truy cập (Production) | Giao thức / Cổng |
| :--- | :--- | :--- | :--- |
| **Frontend Web / PWA** | Vercel / Cloudflare Edge | `https://brewlite-web.vercel.app` *(hoặc `https://brewlite.onrender.com`)* | HTTPS (`Port 443`) |
| **Backend REST API** | Render Cloud Container | `https://api-brewlite.onrender.com` | HTTPS (`Port 443`) |
| **Health Check Endpoint** | Render Cloud Service | `https://api-brewlite.onrender.com/health` | HTTPS (`Port 443`) |
| **Managed Database** | PostgreSQL 16 (Render / Neon) | Kết nối nội bộ qua biến `DATABASE_URL` | PostgreSQL (`Port 5432` - Private Network) |

* **Bảo mật Database & Secrets**: Cơ sở dữ liệu PostgreSQL trên Production **không mở cổng public trực tiếp ra Internet**, chỉ cho phép dịch vụ Backend API truy cập qua mạng nội bộ (Private Network). Toàn bộ khóa bí mật (`DATABASE_URL`, `JWT_SECRET`, `RENDER_DEPLOY_HOOK_URL`) được lưu trữ trong **GitHub Actions Secrets** và **Cloud Environment Variables**, tuyệt đối không xuất hiện trong mã nguồn hoặc log CI/CD.

---

### 7.2. Quy trình Triển khai lên Production (Continuous Delivery / Deployment)

#### Cách 1: Triển khai Tự động qua GitHub Actions CD Pipeline (`.github/workflows/cd.yml`)
Khi có sự kiện gộp Pull Request vào nhánh `main` hoặc đẩy thẻ phiên bản `v*.*.*` (`git push origin v2.0.0`), pipeline CD tự động thực thi tuần tự **7 chặng**:
1. **Quality Gate (`Lint & Test`)**: Cài đặt dependencies, khởi chạy PostgreSQL service container, kiểm tra `npm run lint`, chạy toàn bộ bộ test (`npm test`) và kiểm tra biên dịch.
2. **Build Application**: Đóng gói tạo phẩm biên dịch cho `apps/api` và `apps/web`.
3. **Docker Image & Tagging**: Đóng gói Multi-stage Docker Image cho Backend và Frontend, gắn tag theo **Commit SHA** (`sha-<commit>`) và **Semantic Version** (`v1.0.0`, `v2.0.0`, `latest`).
4. **Push Container Registry**: Đẩy Docker Images lên **GitHub Container Registry (`ghcr.io`)**.
5. **Deploy & Safe Migration**: Thực thi migration an toàn bằng `npx prisma migrate deploy` (không làm mất dữ liệu hiện có) và kích hoạt Deploy Hook lên hạ tầng Production.
6. **Post-Deploy Smoke Test (`GET /health`)**: Tự động gọi `curl --fail https://api-brewlite.onrender.com/health` kiểm tra mã phản hồi `HTTP 200 OK`, trạng thái `"status": "ok"` và kết nối `"database": { "status": "connected" }`.
7. **Auto Failure Detection & Rollback Alert**: Nếu bất kỳ bước nào hoặc Smoke Test thất bại, pipeline lập tức dừng lại và xuất hướng dẫn Rollback khẩn cấp.

#### Cách 2: Triển khai Thủ công lên Nền tảng Cloud (Render & Vercel)
1. **Triển khai Database & Backend API (Render.com)**:
   * Khởi tạo dịch vụ **PostgreSQL** trên Render $\rightarrow$ Sao chép chuỗi kết nối nội bộ (`Internal Database URL`).
   * Khởi tạo **Web Service** liên kết với repository GitHub, chọn thư mục gốc `Assignment-2/apps/api` (Runtime: `Docker`).
   * Thiết lập các biến môi trường: `NODE_ENV=production`, `PORT=3001`, `DATABASE_URL`, `JWT_SECRET`, `CORS_ORIGIN`.
2. **Triển khai Frontend Next.js (Vercel.com)**:
   * Import repository vào Vercel, cấu hình **Root Directory** là `Assignment-2/apps/web`.
   * Thiết lập biến môi trường `NEXT_PUBLIC_API_URL=https://api-brewlite.onrender.com` và nhấn **Deploy**.

---

### 7.3. Quy trình Khôi phục Khi Sự cố (Rollback Strategy)
Khi bản triển khai mới gặp sự cố (Smoke Test tại `/health` trả về `503 Service Unavailable` hoặc phát sinh lỗi nghiệp vụ trên Production), nhóm thực hiện khôi phục theo 2 bước:

#### Bước 1: Rollback Tức thời trên Hạ tầng Cloud & Container Registry (Zero-Downtime)
* **Trên Render / Railway Dashboard**: Truy cập mục **Deployments** $\rightarrow$ Chọn bản phát hành ổn định liền trước $\rightarrow$ Nhấn **"Rollback to this deploy"** để chuyển lưu lượng về container cũ trong vòng chưa đầy 10 giây.
* **Trên Vercel Dashboard**: Truy cập mục **Deployments** $\rightarrow$ Chọn bản build ổn định trước đó $\rightarrow$ Nhấn **"Promote to Production"**.
* **Hoặc kéo trực tiếp Image theo Commit SHA ổn định từ GHCR**:
  ```bash
  docker pull ghcr.io/baominhntb316-luna/brewlite-api:<previous-stable-sha>
  docker pull ghcr.io/baominhntb316-luna/brewlite-web:<previous-stable-sha>
  ```

#### Bước 2: Hoàn tác Mã nguồn trên Git & Kích hoạt lại Pipeline
```bash
# 1. Tra cứu lịch sử commit/tag ổn định gần nhất
git log --oneline -n 5

# 2. Tạo commit hoàn tác an toàn và đẩy lên nhánh main (hoặc qua PR khẩn cấp)
git revert HEAD --no-edit
git push origin main
```

---

## 8. Quản lý Phiên bản (Release / Git Tag) & Release Notes

Dự án quản lý phát hành theo chuẩn **Semantic Versioning (`vMAJOR.MINOR.PATCH`)** gắn với từng Sprint:

```bash
# Gắn thẻ phiên bản và đẩy tag lên GitHub
git tag -a v1.0.0 -m "Release v1.0.0: Sprint 1 MVP - Menu, Docs & CI Pipeline"
git tag -a v2.0.0 -m "Release v2.0.0: Sprint 2 Production Delivery - Full E2E Checkout, CD & HealthCheck"
git push origin --tags
```

### 8.1. Release Notes `v1.0.0` – Sprint 1 Release
* **Mục tiêu phát hành**: Thiết lập nền tảng kỹ thuật monorepo, hoàn thiện toàn bộ tài liệu yêu cầu – mô hình hóa – kiến trúc (Task 1–3), cấu hình pipeline CI và phát hành MVP đầu tiên cho luồng Xem Menu.
* **Nội dung bàn giao**:
  * **Tài liệu Yêu cầu & Mô hình hóa**: Bối cảnh & phạm vi (`docs/requirements/context-and-scope.md`), đặc tả SRS (`docs/requirements/srs.md` với `FR-01`..`FR-23`, `NFR-01`..`NFR-12`), đặc tả Use-case trọng tâm Đặt & Thanh toán đơn hàng (`docs/requirements/use-case-checkout.md`) và bộ sơ đồ UML `.puml`/`.svg` (Use-case, Activity, Sequence, Class Diagram).
  * **Thiết kế Kiến trúc & ADR**: Tài liệu kiến trúc tổng thể (`docs/architecture/architecture-overview.md`), sơ đồ triển khai Production (`deployment-production.puml`/`.svg`) và 5 bản ghi quyết định kiến trúc (`ADR-001`..`ADR-005`).
  * **MVP Xem Menu & Nền tảng Monorepo**: Cấu trúc `apps/web`, `apps/api`, `docs`, `tests`; Prisma Schema, migration khởi tạo PostgreSQL và script `seed.ts`; API `GET /products`, `GET /products/:id`, `GET /products/categories`; màn hình Menu mobile-first trên Next.js xử lý đầy đủ trạng thái `loading`, `empty`, `error`.
  * **Continuous Integration**: Pipeline `.github/workflows/ci.yml` tự động kiểm tra `Install -> Lint -> Unit Test -> Build` khi mở Pull Request.

### 8.2. Release Notes `v2.0.0` – Sprint 2 Production Release
* **Mục tiêu phát hành**: Hoàn thiện luồng nghiệp vụ End-to-End từ chọn món đến thanh toán và theo dõi đơn hàng, tích hợp bộ kiểm thử tự động toàn diện, thiết lập pipeline CD 7 bước và triển khai Production qua HTTPS.
* **Nội dung bàn giao**:
  * **Hoàn thiện MVP End-to-End**:
    * Tùy chọn kích cỡ (`S`/`M`/`L`), topping và tính giá tự động (`FR-02`).
    * Quản lý giỏ hàng với Zustand, lưu trữ `localStorage` và áp mã khuyến mãi `BREWLITE10`, `GIAM10K`, `SGU2026` (`FR-03`).
    * Đăng ký, đăng nhập (`bcrypt` + `JWT`) và phân quyền `CUSTOMER` / `BARISTA` (`FR-04`, `NFR-04`, `NFR-05`).
    * Đặt đơn hàng (`POST /orders`) sử dụng Database Transaction kết hợp **Optimistic Locking (`version`)** chống âm kho khi đặt đồng thời (`FR-05`, `NFR-02`, `NFR-09`).
    * Thanh toán Ví điện tử / Thẻ ngân hàng mô phỏng (`POST /payments`) hỗ trợ `Idempotency-Key` chống thanh toán trùng lặp và cộng điểm thưởng `loyaltyPoints` (`FR-06`).
    * Quản lý vòng đời đơn hàng theo **Order State Machine** (`PATCH /orders/:id/status`), hoàn kho tự động khi hủy đơn (`CANCELLED`) và xem lịch sử đơn (`GET /orders/me`) (`FR-07`, `FR-08`).
  * **Tích hợp, Kiểm thử Toàn diện & Health Check**:
    * Endpoint `GET /health` kiểm tra kết nối PostgreSQL thực tế (`SELECT 1`), trả về trạng thái hệ thống và độ trễ DB.
    * Hoàn thiện `docker-compose.yml` với `healthcheck` tự động cho cả PostgreSQL và Backend API.
    * Bộ kiểm thử tự động bao phủ toàn diện: Unit Test, Integration Test (`orders-payments-integration.spec.ts`), E2E Test (`checkout-e2e.spec.ts`), FR Test (`fr-*.spec.ts`) và NFR Test (`nfr.spec.ts`).
  * **Continuous Delivery, Bàn giao & Truy vết**:
    * Pipeline CD 7 bước (`.github/workflows/cd.yml`) tự động build, push Docker Image lên GHCR, chạy migration an toàn (`prisma migrate deploy`), kiểm tra Smoke Test `/health` và hỗ trợ Rollback.
    * Hoàn thiện Ma trận truy vết (`docs/traceability-matrix.md`) và Tài liệu triển khai & vận hành (`docs/deployment.md`).

---

## 9. Tổng kết Sprint Review & Sprint Retrospective

### 9.1. Sprint Review (Nghiệm thu Sản phẩm)
* **Kết quả đạt được so với Sprint Goal**:
  * Hoàn thành 100% các hạng mục trong Product Backlog của cả **Sprint 1 (`S1-01`..`S1-07`)** và **Sprint 2 (`S2-01`..`S2-10`)** theo đúng tiêu chuẩn Definition of Done (DoD).
  * Luồng nghiệp vụ End-to-End hoạt động thông suốt: *Xem Menu $\rightarrow$ Chọn Size & Topping $\rightarrow$ Giỏ hàng & Mã giảm giá $\rightarrow$ Đăng ký/Đăng nhập JWT $\rightarrow$ Đặt đơn (Optimistic Locking) $\rightarrow$ Thanh toán Không tiền mặt (Idempotent) & Tích điểm Loyalty $\rightarrow$ Theo dõi & Cập nhật trạng thái đơn (Order State Machine)*.
  * Toàn bộ hệ thống khởi chạy ổn định chỉ với một lệnh `docker compose up --build -d`, vượt qua toàn bộ bài kiểm thử tự động trên CI/CD và triển khai thành công lên môi trường Production (HTTPS).

### 9.2. Sprint Retrospective (Rút kinh nghiệm)
* **Những điểm nhóm đã làm tốt (What Went Well)**:
  * **Tuân thủ quy trình GitHub Flow & CI Quality Gate**: Mọi thay đổi tài liệu và mã nguồn đều đi qua nhánh riêng, tuân thủ chuẩn Conventional Commits, được kiểm tra tự động bởi CI trước khi gộp vào `main`, giúp nhánh chính luôn ổn định và tránh xung đột lớn.
  * **Thiết kế kiến trúc và mô hình hóa rõ ràng ngay từ đầu**: Các sơ đồ Activity, Sequence, Class Diagram và 5 bản ghi ADR ở Task 2–3 giúp việc chia việc hiện thực Frontend/Backend ở Task 4–5 diễn ra mạch lạc, nhất quán với SRS và Ma trận truy vết.
  * **Giải quyết triệt để các bài toán kỹ thuật cốt lõi**: Hiện thực thành công cơ chế chống bán lố tồn kho khi có truy cập đồng thời (Optimistic Locking với trường `version`) và chống thanh toán lặp (Idempotency-Key).
* **Những điểm cần cải thiện trong các phiên bản tiếp theo (What Could Be Improved)**:
  * Tích hợp cổng thanh toán thực tế (VNPay / MoMo Sandbox IPN Webhook) thay cho cổng thanh toán mô phỏng nội bộ.
  * Bổ sung kết nối thời gian thực qua **WebSocket / Server-Sent Events (SSE)** để tự động đẩy thông báo cập nhật trạng thái đơn hàng tức thời từ quầy Barista tới màn hình khách hàng mà không cần làm mới trang.
