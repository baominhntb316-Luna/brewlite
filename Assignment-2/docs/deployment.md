# Tài liệu Hướng dẫn Triển khai & Vận hành Hệ thống BrewLite (Task 5.4)

* **Dự án**: Hệ thống Đặt đồ uống trực tuyến BrewLite
* **Môn học**: Công nghệ Phần mềm – Đại học Sài Gòn
* **Phiên bản**: v2.0.0 (Release Assignment 2)
* **Người thực hiện**: San + Minh (TV5 - Payment, Architecture & Deployment) & Nhóm BrewLite

---

## 1. Danh sách Đường dẫn Môi trường Production (Cloud URLs)

Hệ thống được triển khai trên nền tảng Cloud đạt chuẩn HTTPS và phân tách mạng nội bộ bảo mật:

| Thành phần | Nền tảng Cloud | URL Truy cập (Production) | Giao thức / Port |
| :--- | :--- | :--- | :--- |
| **Frontend Web / PWA** | Vercel / Cloudflare Edge | `https://brewlite-web.vercel.app` *(hoặc `https://brewlite.onrender.com`)* | HTTPS (Port 443) |
| **Backend REST API** | Render Cloud Container | `https://api-brewlite.onrender.com` | HTTPS (Port 443) |
| **Health Check Endpoint** | Render Cloud Service | `https://api-brewlite.onrender.com/health` | HTTPS (Port 443) |
| **Managed Database** | PostgreSQL 16 (Render/Neon) | Kết nối nội bộ qua chuỗi `DATABASE_URL` | PostgreSQL (Port 5432 - Private Network) |

> 🔒 **Chính sách Bảo mật Cơ sở Dữ liệu**: CSDL PostgreSQL Production **tuyệt đối không mở cổng công khai ra ngoài Internet**. Chỉ có Docker Container của Backend API mới được cấp quyền truy cập thông qua Private Network Connection String. Mọi mật khẩu và chuỗi kết nối nhạy cảm đều được lưu trong Cloud Environment Secrets, không commit vào kho Git.

---

## 2. Hướng dẫn Chạy Hệ thống, Kiểm thử & Build ở Máy Cá nhân (Local Development)

Nhóm đã đóng gói toàn bộ hệ thống vào file `docker-compose.yml`. Bất kỳ ai chỉ cần clone repository về máy và làm theo các bước sau là có thể chạy ngay toàn bộ 3 dịch vụ mà không cần cài đặt thêm Node.js hay PostgreSQL:

### Bước 1: Sao chép tệp biến môi trường mẫu
```bash
cp .env.example .env
```

### Bước 2: Khởi động toàn bộ 3 dịch vụ bằng Docker Compose
```bash
docker compose up --build -d
```
Lệnh trên sẽ tự động:
1. Kéo image `postgres:15-alpine`, tạo volume lưu trữ bền vững `pgdata`.
2. Khởi chạy và kiểm tra sức khỏe của database (`healthcheck`).
3. Build container `brewlite_backend` (NestJS), tự động chạy migration tạo bảng CSDL và nạp dữ liệu mẫu đồ uống (`prisma/seed.ts`).
4. Build container `brewlite_frontend` (Next.js 14) tối ưu hóa Production mode, chỉ khởi chạy sau khi `backend` đạt trạng thái `service_healthy` qua endpoint `/health`.

### Bước 3: Truy cập hệ thống ở Local
* **Giao diện Menu & Đặt đồ uống**: [http://localhost:3000](http://localhost:3000)
* **Backend API Swagger / Routes**: [http://localhost:3001](http://localhost:3001)
* **Kiểm tra trạng thái sức khỏe**: [http://localhost:3001/health](http://localhost:3001/health)

### Bước 4: Chạy Kiểm thử Tự động (Test) & Đóng gói (Build)
Để kiểm tra chất lượng mã nguồn, chạy bộ test (Unit, Integration, E2E, FR, NFR) và kiểm chứng khả năng đóng gói Production ở máy cá nhân:

```bash
# 1. Kiểm tra Lint & Chạy toàn bộ bộ Kiểm thử Tự động tại Backend
cd apps/api
npm run lint
npm test

# 2. Build ứng dụng Backend (NestJS) và Frontend (Next.js)
npm run build
cd ../web
npm run lint
npm run build

# 3. Đóng gói lại toàn bộ Docker Images (Production Mode)
cd ../..
docker compose build --no-cache
```

---

## 3. Quy trình Triển khai Lên Môi trường Production (Cloud Deployment)

Hệ thống hỗ trợ 2 hình thức triển khai:

### Cách 1: Tự động hóa qua GitHub Actions CI/CD (Khuyên dùng)
Mỗi khi thành viên nhóm gộp code (Merge Pull Request) vào nhánh `main` hoặc tạo Git Release Tag:
1. GitHub Actions kích hoạt pipeline trong `.github/workflows/cd.yml`.
2. Tự động chạy bộ **Quality Gate**: Kiểm tra lỗi Lint, chạy toàn bộ Unit Test và E2E Test.
3. Đóng gói Docker Image và gắn thẻ tag commit SHA lên GitHub Packages (`ghcr.io`).
4. Kích hoạt Webhook tự động cập nhật container trên Render/Railway.
5. Chạy Smoke Test kiểm tra endpoint `/health`. Nếu thành công, pipeline báo xanh (✅).

### Cách 2: Triển khai thủ công từng phần lên Cloud miễn phí (PaaS)
* **Backend & Database**:
  1. Tạo tài khoản trên [Render.com](https://render.com).
  2. Tạo dịch vụ **PostgreSQL** $\rightarrow$ Lưu chuỗi kết nối nội bộ `Internal Database URL`.
  3. Tạo dịch vụ **Web Service** $\rightarrow$ Liên kết với Git Repo $\rightarrow$ Chọn thư mục gốc `apps/api` (Docker runtime).
  4. Cấu hình các Environment Variables: `DATABASE_URL`, `JWT_SECRET`, `PORT=3001`.
* **Frontend Next.js**:
  1. Tạo tài khoản trên [Vercel.com](https://vercel.com).
  2. Import repository Git $\rightarrow$ Chọn Root Directory là `apps/web`.
  3. Cấu hình biến môi trường: `NEXT_PUBLIC_API_URL` trỏ tới URL backend đã deploy ở trên.

---

## 4. Cơ chế Giám sát & Smoke Test Sau Triển khai

Sau khi hệ thống được đẩy lên Cloud, script tự động thực hiện Smoke Test bằng lệnh:
```bash
curl -X GET https://api-brewlite.onrender.com/health
```
Kết quả phản hồi đạt chuẩn:
```json
{
  "status": "ok",
  "timestamp": "2026-10-22T13:45:00.000Z",
  "uptimeSeconds": 1420,
  "database": {
    "status": "connected",
    "latencyMs": 15
  },
  "environment": "production",
  "service": "brewlite-api",
  "version": "2.0.0"
}
```

---

## 5. Quy trình Khôi phục Khi Sự cố (Rollback Strategy)

Trong trường hợp bản deploy mới phát sinh lỗi nghiêm trọng (Smoke test báo đỏ hoặc phát hiện bug trên giao diện):

### Bước 1: Rollback tức thời trên giao diện Cloud (Zero-Downtime)
* **Trên Render / Railway**: Vào mục **Deployments** $\rightarrow$ Chọn bản deploy ổn định gần nhất trước đó $\rightarrow$ Nhấn **"Rollback to this version"**. Server sẽ chuyển hướng truy cập về container cũ trong vòng 10 giây.
* **Trên Vercel**: Vào mục **Deployments** $\rightarrow$ Chọn bản build trước đó $\rightarrow$ Nhấn **"Promote to Production"**.

### Bước 2: Khôi phục mã nguồn trên Git
1. Tìm mã thẻ tag hoặc commit SHA ổn định trước đó:
   ```bash
   git log --oneline -n 5
   ```
2. Tạo commit hoàn tác và đẩy lên nhánh `main`:
   ```bash
   git revert HEAD --no-edit
   git push origin main
   ```
3. GitHub Actions sẽ tự động biên dịch lại phiên bản ổn định và triển khai lại an toàn.

---

## 6. Quản lý Phiên bản (Release / Git Tag) & Release Notes

Dự án áp dụng chuẩn **Semantic Versioning (`vMAJOR.MINOR.PATCH`)** gắn liền với từng mốc bàn giao Sprint. Khi đẩy thẻ tag (`v*.*.*`) lên GitHub, pipeline CD (`.github/workflows/cd.yml`) sẽ tự động đóng gói Docker image gắn tag phiên bản tương ứng và triển khai lên môi trường Production.

### 6.1. Lệnh Tạo & Đẩy Release Tag trên Git
```bash
# Phát hành phiên bản MVP Sprint 1 (v1.0.0)
git tag -a v1.0.0 -m "Release v1.0.0: Sprint 1 MVP - Menu, Docs & CI Pipeline"
git push origin v1.0.0

# Phát hành phiên bản Production Sprint 2 (v2.0.0)
git tag -a v2.0.0 -m "Release v2.0.0: Sprint 2 Production Delivery - Full E2E Checkout, CD & HealthCheck"
git push origin v2.0.0
```

---

### 6.2. Release Notes `v1.0.0` – Sprint 1 Release 
* **Phiên bản (Git Tag)**: `v1.0.0`
* **Mục tiêu phát hành**: Thiết lập nền tảng kỹ thuật Monorepo, hoàn thiện bộ tài liệu đặc tả & kiến trúc (Task 1–3), cấu hình pipeline CI tự động và bàn giao MVP đầu tiên cho luồng Xem Menu.
* **Các tính năng & tạo phẩm chính**:
  * **Tài liệu Yêu cầu & Mô hình hóa**:
    * Hoàn thiện bối cảnh, phạm vi và danh sách stakeholder (`docs/requirements/context-and-scope.md`).
    * Đặc tả yêu cầu phần mềm SRS rút gọn (`docs/requirements/srs.md`) gồm 23 yêu cầu chức năng (`FR-01`..`FR-23`) và 12 yêu cầu phi chức năng (`NFR-01`..`NFR-12`) theo mức ưu tiên MoSCoW kèm tiêu chí chấp nhận.
    * Đặc tả chi tiết Use-case trọng tâm *Đặt và thanh toán đơn hàng* (`docs/requirements/use-case-checkout.md`) cùng bộ sơ đồ UML kết xuất chuẩn `.puml` & `.svg` (Use-case, Activity, Sequence, Class Diagram tại `docs/diagrams/`).
  * **Thiết kế Kiến trúc & ADR**:
    * Xây dựng tài liệu kiến trúc tổng thể (`docs/architecture/architecture-overview.md`), sơ đồ triển khai (`deployment-production.puml`/`.svg`) và 5 quyết định kiến trúc (`ADR-001` đến `ADR-005` tại `docs/architecture/adr/`).
  * **Nền tảng Kỹ thuật & MVP Xem Thực đơn**:
    * Khởi tạo cấu trúc monorepo (`apps/web`, `apps/api`, `docs`, `tests`), tệp cấu hình mẫu `.env.example`, `.gitignore` và quy ước làm việc nhóm trong `README.md`.
    * Thiết kế Prisma Schema, migration khởi tạo CSDL PostgreSQL và kịch bản `prisma/seed.ts` nạp dữ liệu đồ uống mẫu có kiểm tra chống trùng lặp (idempotent seed).
    * Hiện thực REST API đọc danh sách sản phẩm (`GET /products`), chi tiết sản phẩm (`GET /products/:id`) và danh mục (`GET /products/categories`).
    * Xây dựng giao diện Menu mobile-first trên Next.js (`apps/web`), hỗ trợ tìm kiếm theo từ khóa, lọc theo danh mục và xử lý đầy đủ 3 trạng thái giao diện (`loading`, `empty`, `error`).
  * **Tích hợp Liên tục – Continuous Integration**:
    * Thiết lập workflow `.github/workflows/ci.yml` tự động chạy 4 bước kiểm soát chất lượng (`Install -> Lint -> Unit Test -> Build`) trên mọi Pull Request vào nhánh `main`.

---

### 6.3. Release Notes `v2.0.0` – Sprint 2 Production Release
* **Phiên bản (Git Tag)**: `v2.0.0`
* **Mục tiêu phát hành**: Hoàn thiện 100% luồng nghiệp vụ End-to-End từ chọn món đến thanh toán và theo dõi đơn hàng, nâng cấp kiểm thử toàn diện, tự động hóa pipeline CD 7 bước và bàn giao hệ thống Production qua HTTPS.
* **Các tính năng & nâng cấp mới**:
  * **Hoàn thiện Nghiệp vụ End-to-End**:
    * **Tùy chọn Đồ uống & Giỏ hàng (`FR-02`, `FR-03`)**: Hỗ trợ chọn kích cỡ (`S`, `M`, `L`), chọn nhiều topping (`trân châu đen`, `kem cheese`, `thạch dừa`, `pudding trứng`), tự động tính phụ phí và quản lý giỏ hàng bền vững với Zustand (lưu `localStorage`, áp mã giảm giá `BREWLITE10`, `GIAM10K`, `SGU2026`).
    * **Xác thực & Phân quyền JWT (`FR-04`, `NFR-04`, `NFR-05`)**: Hiện thực đăng ký (`POST /auth/register` băm mật khẩu một chiều bằng `bcrypt` 10 salt rounds), đăng nhập (`POST /auth/login` cấp JWT token) và bảo vệ các API nhạy cảm bằng `JwtAuthGuard`.
    * **Đặt đơn hàng & Chống âm kho đồng thời (`FR-05`, `NFR-02`, `NFR-09`)**: Hiện thực `POST /orders` sử dụng giao dịch nguyên tử (`prisma.$transaction`) kết hợp **Optimistic Locking** (kiểm tra trường `version` và `stock >= qty`), ngăn chặn tuyệt đối tình trạng bán lố tồn kho (overselling) khi nhiều khách hàng đặt mua cùng lúc.
    * **Thanh toán Không tiền mặt Idempotent & Tích điểm Loyalty (`FR-06`)**: Hiện thực `POST /payments` (Ví điện tử / Thẻ ngân hàng mô phỏng) bắt buộc kiểm tra khóa `Idempotency-Key` để chống trừ tiền trùng lặp khi mạng chập chờn; tự động cộng điểm thưởng `loyaltyPoints` (`10.000đ = 1 điểm`) khi giao dịch thành công.
    * **Theo dõi & Quản lý Trạng thái Đơn hàng (`FR-07`, `FR-08`)**: Hiện thực **Order State Machine** kiểm soát chặt chẽ các bước chuyển trạng thái hợp lệ (`PENDING -> PAID -> PREPARING -> READY -> COMPLETED`, nhánh lỗi `PAYMENT_FAILED` và nhánh hủy đơn `CANCELLED` tự động hoàn trả tồn kho); bổ sung trang Lịch sử đơn hàng (`GET /orders/me`) và Quầy Barista cập nhật trạng thái đơn (`PATCH /orders/:id/status`).
  * **Tích hợp, Kiểm thử Tự động & Health Check**:
    * Hiện thực endpoint `GET /health` (`HealthController`) thực thi truy vấn `SELECT 1` đo độ trễ thực tế tới PostgreSQL, trả về HTTP `200 OK` (`status: "ok"`) hoặc `503 Service Unavailable` (`status: "degraded"`).
    * Nâng cấp `docker-compose.yml` bổ sung `healthcheck` cho cả `postgres` và `backend`, đảm bảo `frontend` chỉ khởi động khi `backend` đã sẵn sàng phục vụ.
    * Hoàn thiện bộ kiểm thử tự động tại `tests/` và `apps/api/src/` bao phủ toàn bộ yêu cầu: Unit Test, Integration Test (`orders-payments-integration.spec.ts`), E2E Test (`checkout-e2e.spec.ts`), bộ kiểm thử chức năng (`fr-auth.spec.ts`, `fr-cart.spec.ts`, `fr-menu-products.spec.ts`, `fr-orders.spec.ts`, `fr-payments.spec.ts`) và bộ kiểm thử phi chức năng (`nfr.spec.ts`).
  * **Continuous Delivery, Truy vết & Bàn giao Production**:
    * Thiết lập pipeline CD 7 chặng (`.github/workflows/cd.yml`): `Quality Gate (Lint, Test, Build) -> Build Artifacts -> Docker Image (SHA & SemVer tags) -> Push GHCR -> Deploy Production & Safe Migration (prisma migrate deploy) -> Smoke Test (/health) -> Auto Rollback Guidance`.
    * Hoàn thiện Ma trận truy vết hai chiều (`docs/traceability-matrix.md`) ánh xạ đầy đủ `FR/NFR <-> Use-case <-> Diagram <-> Code/API <-> Test Case`.

---

## 7. Tổng kết Sprint Review & Sprint Retrospective 

### 7.1. Sprint Review (Nghiệm thu Sản phẩm)
* **Mục tiêu đạt được**: Hoàn tất 100% luồng end-to-end từ Xem Menu $\rightarrow$ Tùy chọn Size/Topping $\rightarrow$ Giỏ hàng Zustand $\rightarrow$ Đăng nhập JWT $\rightarrow$ Đặt đơn hàng $\rightarrow$ Thanh toán Idempotent (Ví/Thẻ) $\rightarrow$ Tích lũy điểm Loyalty $\rightarrow$ Xem lịch sử đơn.
* **Hạ tầng**: Hệ thống chạy đồng bộ trên Docker, tích hợp đầy đủ CI/CD, Health Check và tài liệu kiến trúc ADR.

### 7.2. Sprint Retrospective (Rút kinh nghiệm)
* **Điểm làm tốt**:
  * Phân chia công việc rõ ràng theo 6 chặng, mỗi thành viên chịu trách nhiệm độc lập trên các file sơ đồ và module riêng, không bị xung đột code (conflict).
  * Ứng dụng thành công cơ chế khóa chống bán quá tồn kho (Optimistic Locking) và Idempotent Payment.
* **Điểm cần cải thiện trong các phiên bản sau**:
  * Bổ sung tính năng Webhook đồng bộ thời gian thực từ các cổng thanh toán thật (MoMo IPN, VNPay IPN).
  * Nâng cấp giao diện quản trị (Admin Dashboard) dành cho Barista cập nhật trạng thái đơn trực quan bằng WebSocket thay vì polling.
