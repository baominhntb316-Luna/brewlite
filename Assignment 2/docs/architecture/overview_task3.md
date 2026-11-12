# Tài liệu Thiết kế Kiến trúc Hệ thống BrewLite (Task 3.1)

* **Dự án**: Hệ thống Đặt đồ uống trực tuyến BrewLite
* **Môn học**: Công nghệ Phần mềm – Đại học Sài Gòn
* **Phiên bản**: 2.0 (Assignment 2)
* **Người thực hiện**: San + Minh & Nhóm BrewLite

---

## 1. Phương pháp luận & Phong cách Kiến trúc (Architecture Style)

Hệ thống **BrewLite** được thiết kế theo mô hình **Kiến trúc Phân lớp (Layered Architecture)** kết hợp với **Module-Based Domain** tại tầng Backend, nhằm đảm bảo nguyên tắc phân tách mối quan tâm (*Separation of Concerns*) và khả năng mở rộng độc lập giữa các thành phần.

```
+-----------------------------------------------------------------------+
|  1. Presentation Tier (Mobile-First Web / PWA)                        |
|     Next.js 14 (App Router) + Tailwind CSS + Zustand Client State     |
+-----------------------------------------------------------------------+
                                  |
                      HTTPS REST API / JSON (JWT)
                                  v
+-----------------------------------------------------------------------+
|  2. Application & Business Logic Tier (NestJS Monolith Modular)        |
|     - Controllers: Routing, Validation Pipes (class-validator)        |
|     - Services: Business Rules, State Machine, Idempotent Logic       |
|     - Guards / Strategies: Passport JWT Authentication                |
|     - Health & Monitoring: Terminus Health Check (/health)            |
+-----------------------------------------------------------------------+
                                  |
                         Prisma ORM (Engine)
                                  v
+-----------------------------------------------------------------------+
|  3. Data Persistence Tier (PostgreSQL 16)                             |
|     Relational Tables, ACID Transactions, Unique Indexes, Volumes     |
+-----------------------------------------------------------------------+
```

---

## 2. Chi tiết các Thành phần Cốt lõi (System Components)

### 2.1. Tầng Giao diện (Frontend - `apps/web`)
* **Công nghệ**: Next.js 14, React, TypeScript, Tailwind CSS.
* **Định hướng trải nghiệm**: Mobile-First / Progressive Web App (PWA) tối ưu hóa việc đặt món nhanh trên điện thoại thông minh.
* **Quản trị State**: Sử dụng **Zustand** cho giỏ hàng (`useCartStore`) và trạng thái xác thực (`useAuthStore`). Zustand giúp lưu trữ giỏ hàng ở Client một cách gọn nhẹ, phản hồi tức thì mà không gây re-render toàn bộ cây component như Context API.
* **Giao tiếp API**: Tầng gọi API tập trung tại `src/lib/api.ts` tự động đính kèm `Bearer JWT` token và tạo header `Idempotency-Key` khi thực hiện thanh toán.

### 2.2. Tầng Nghiệp vụ (Backend API - `apps/api`)
* **Công nghệ**: NestJS Framework (Node.js/TypeScript).
* **Kiến trúc Module**: Phân tách thành các domain module độc lập:
  * `AuthModule`: Đăng ký, đăng nhập băm mật khẩu bằng `bcrypt`, phát hành và xác thực JSON Web Token (`JWT`).
  * `ProductsModule`: Quản lý danh mục menu, hỗ trợ phân loại, lọc và xem chi tiết sản phẩm.
  * `OrdersModule`: Tiếp nhận đơn hàng, tính giá size/topping, áp dụng mã khuyến mãi (`Promotion`), kiểm soát tồn kho với Optimistic Locking và thực thi **Order State Machine** chặt chẽ.
  * `PaymentsModule`: Xử lý thanh toán ví/thẻ với cơ chế **Idempotent Consumer**, tích lũy điểm khách hàng thân thiết (`Loyalty Points`).
  * `PrismaModule`: Quản lý vòng đời kết nối CSDL và cung cấp transaction engine.

### 2.3. Tầng Dữ liệu & Cơ chế Migration (`PostgreSQL` & `Prisma`)
* **Hệ quản trị CSDL**: PostgreSQL 16.
* **Cơ chế Migration**: Sử dụng **Prisma Migrate** (`prisma migrate dev` / `prisma migrate deploy`) với các file SQL được đánh phiên bản rõ ràng trong thư mục `prisma/migrations/`.
* **Toàn vẹn dữ liệu**:
  * Đơn hàng, thanh toán và trừ kho được gói gọn trong `prisma.$transaction(async (tx) => { ... })` để ngăn ngừa tình trạng Race Condition và Deadlock.
  * Khóa duy nhất `@unique` trên cột `idempotencyKey` bảo vệ tuyệt đối tính duy nhất của giao dịch thanh toán.

### 2.4. Dịch vụ Thanh toán Giả lập (Mock Payment Gateway)
* Được tích hợp trong `PaymentsService` hỗ trợ hai phương thức: `WALLET` (Ví điện tử MoMo/ZaloPay) và `CREDIT_CARD` (Thẻ ngân hàng/VNPAY QR).
* Cung cấp tham số `simulateFailure: true/false` trong môi trường dev/staging nhằm kiểm thử tự động khả năng tự phục hồi của đơn hàng khi thanh toán gặp sự cố (`PAYMENT_FAILED` $\rightarrow$ cho phép thử lại).

### 2.5. Giám sát, Nhật ký & Quản lý Cấu hình (Observability & Config)
* **Health Check Endpoint**: Cung cấp đường dẫn `GET /health` trả về trạng thái hoạt động của HTTP Service và kiểm tra ping kết nối tới PostgreSQL.
* **Logging**: Tích hợp Logger của NestJS ghi nhận thông tin request/response và các chuyển tiếp trạng thái đơn hàng ra `stdout` (phù hợp với quy chuẩn 12-Factor App trên Docker/Cloud).
* **Quản lý Cấu hình**: Toàn bộ cấu hình nhạy cảm (`DATABASE_URL`, `JWT_SECRET`, `PORT`) được nạp qua biến môi trường (`.env`), không bao giờ commit secret lên kho mã nguồn Git.

---

## 3. Lý do Lựa chọn Kiến trúc & Đánh đổi (Trade-offs)

| Tiêu chí | Lựa chọn của Nhóm | Lựa chọn thay thế | Lý do & Đánh đổi (Trade-off) |
| :--- | :--- | :--- | :--- |
| **Cấu trúc Repository** | Monorepo (`apps/web`, `apps/api`) | Multi-repo riêng biệt | **Lý do**: Dễ dàng chia sẻ kiểu dữ liệu (TypeScript types), quản lý version và CI/CD đồng bộ.<br>**Đánh đổi**: Kích thước repo ban đầu lớn hơn một chút. |
| **Kiến trúc Ứng dụng** | Modular Monolith (NestJS) | Microservices | **Lý do**: Giảm thiểu chi phí hạ tầng mạng và độ phức tạp khi deploy cho nhóm 6 người. Hệ thống vẫn giữ được tính độc lập giữa các module.<br>**Đánh đổi**: Không thể scale riêng từng module lên các container độc lập. |
| **Xử lý Bất đồng bộ / Idempotency** | PostgreSQL Transaction + Unique Index | Redis Distributed Lock | **Lý do**: Đảm bảo chuẩn ACID nghiêm ngặt của giao dịch tài chính mà không cần phụ thuộc thêm cụm Redis.<br>**Đánh đổi**: Tốn thêm 1 câu lệnh kiểm tra DB cho mỗi giao dịch thanh toán. |
| **Môi trường Triển khai** | Dockerized Container trên Cloud PaaS (Render/Railway/Vercel) | Tự dựng Kubernetes (K8s) | **Lý do**: Tự động hóa cao, miễn phí/chi phí thấp, tích hợp sẵn SSL/HTTPS và domain công khai.<br>**Đánh đổi**: Ít tùy biến cấu hình mạng sâu như hạ tầng tự quản lý. |

---

## 4. Danh mục Các Quyết định Kiến trúc (ADR)

1. [ADR 001: Lựa chọn Mô hình Monorepo cho Dự án BrewLite](file:///docs/architecture/adr/001-monorepo.md)
2. [ADR 002: Sử dụng PostgreSQL và Prisma ORM](file:///docs/architecture/adr/002-database-prisma.md)
3. [ADR 003: Chiến lược Xử lý Thanh toán Idempotent & Tích lũy Điểm thưởng](file:///docs/architecture/adr/003-concurrency-idempotency.md)
