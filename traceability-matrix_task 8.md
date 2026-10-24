# Ma trận Truy vết Yêu cầu Phần mềm (Traceability Matrix - Mục 8.1)

* **Dự án**: Hệ thống Đặt đồ uống trực tuyến BrewLite
* **Môn học**: Công nghệ Phần mềm – Đại học Sài Gòn
* **Phiên bản**: v2.0.0 (Assignment 2)
* **Tổng hợp**: Nhóm Kỹ thuật BrewLite

---

## Bảng Ma trận Truy vết Yêu cầu Chức năng (Functional Requirements - FR)

| Mã Yêu Cầu | Use-case / User Story | Thiết kế & Sơ đồ (UML Diagrams) | Thành phần Mã nguồn & API | Bài Kiểm thử Tương ứng (Test Suite) | Thành viên Phụ trách |
| :---: | :--- | :--- | :--- | :--- | :---: |
| **FR-01** | **US-01 / UC-01**: Khám phá danh mục Menu & Chi tiết đồ uống | • `activity-menu.puml`<br>• `sequence-menu.puml`<br>• `class-domain.puml` | • `GET /products`<br>• `GET /products/:id`<br>• `ProductsService.findAll()`<br>• `apps/web/src/app/page.tsx` | • Unit test Products<br>• E2E: `checkout-e2e.spec.ts` (Chặng 1) | Nhung (TV2) |
| **FR-02** | **US-02 / UC-02**: Tùy chọn kích cỡ (Size S/M/L) và Topping | • `activity-cart.puml`<br>• `class-domain.puml` | • `ProductModal.tsx`<br>• Tính giá theo Size & Topping (+5.000đ/topping) | • Frontend component tests<br>• E2E: `checkout-e2e.spec.ts` | Tuyết Vy (TV1) |
| **FR-03** | **US-03 / UC-02**: Quản lý Giỏ hàng (Thêm/Sửa/Xóa, badge số lượng) | • `activity-cart.puml`<br>• `sequence-cart.puml` | • `useCartStore.ts` (Zustand)<br>• `CartDrawer.tsx`<br>• Tự tính tổng tiền đơn hàng | • Zustand store tests<br>• Frontend render test | Tuyết Vy (TV1) |
| **FR-04** | **US-04 / UC-03**: Xác thực người dùng (Đăng ký, Đăng nhập, JWT) | • `activity-auth.puml`<br>• `sequence-auth.puml`<br>• `ADR 002-database-prisma` | • `POST /auth/register`<br>• `POST /auth/login`<br>• `JwtStrategy`, `JwtAuthGuard` | • Unit test Auth service<br>• Bcrypt hashing test | Hasan (TV3) |
| **FR-05** | **US-05 / UC-04**: Tạo đơn hàng & Khóa tồn kho đồng thời (Concurrency) | • `activity-end-to-end.puml`<br>• `sequence-order-create.puml`<br>• `ADR 003` | • `POST /orders`<br>• `OrdersService.createOrder()`<br>• Transaction + Optimistic Locking | • Test Concurrency (Tiêu chí c trong `task10.spec.ts`)<br>• `checkout-e2e.spec.ts` | An (TV4) |
| **FR-06** | **US-06 / UC-05**: Thanh toán Không tiền mặt (Ví điện tử / Thẻ ngân hàng) | • `sequence-checkout.puml`<br>• `activity-payment.puml`<br>• `ADR 003` | • `POST /payments`<br>• `PaymentsService.processPayment()`<br>• Mock Payment Gateway | • Integration Test Payment<br>• E2E: `checkout-e2e.spec.ts` (Chặng 3) | **San (TV5)** |
| **FR-07** | **US-07 / UC-06**: Quản lý Vòng đời & Trạng thái Đơn hàng (State Machine) | • `state-order.puml`<br>• `sequence-order-tracking.puml` | • `order-state-machine.ts`<br>• `assertTransition()`<br>• `PATCH /orders/:id/status` | • Test State Machine (Tiêu chí a trong `task10.spec.ts`) | Minh (TV6) |
| **FR-08** | **US-08 / UC-04**: Khuyến mãi & Mã giảm giá (Coupons) | • `sequence-order-create.puml`<br>• `class-domain.puml` | • `dto.couponCode`<br>• Logic giảm giá (`BREWLITE10`, `GIAM10K`) | • Unit test Coupon validation<br>• `checkout-e2e.spec.ts` | An (TV4) |
| **FR-09** | **US-09 / UC-05**: Thanh toán Idempotent & Tích lũy Điểm thưởng (Loyalty) | • `sequence-checkout.puml`<br>• `activity-payment.puml`<br>• `ADR 003` | • Header `Idempotency-Key`<br>• Ràng buộc `@unique idempotencyKey`<br>• `user.loyaltyPoints` (+1 điểm/10k) | • Test Idempotency (Tiêu chí b trong `task10.spec.ts`)<br>• `checkout-e2e.spec.ts` | **San (TV5)** |
| **FR-10** | **US-10 / UC-06**: Theo dõi & Lịch sử Đơn hàng cá nhân | • `sequence-order-tracking.puml`<br>• `deployment-production.puml` | • `GET /orders/me`<br>• `apps/web/src/app/orders/page.tsx`<br>• `apps/web/src/app/orders/[id]/page.tsx` | • Component test Order history<br>• E2E: `checkout-e2e.spec.ts` (Chặng 5) | Minh (TV6) |

---

## Bảng Ma trận Truy vết Yêu cầu Phi Chức năng (Non-Functional Requirements - NFR)

| Mã Yêu Cầu | Nhóm Yêu Cầu | Tiêu chí Kỹ thuật | Giải pháp Thực thi | Minh chứng & Kiểm thử |
| :---: | :--- | :--- | :--- | :--- |
| **NFR-01** | **Hiệu năng & Khả năng chịu tải** | Phản hồi API < 500ms; không bán âm tồn kho khi nhiều khách mua đồng thời. | Dùng Optimistic Locking và Index B-tree trên PostgreSQL. | Test Concurrency tại `task10.spec.ts` (bắn 2 request cùng lúc thành công xử lý 1). |
| **NFR-02** | **Bảo mật & Toàn vẹn** | Mật khẩu băm an toàn, bảo vệ route bằng JWT, không lộ secret trên Git. | Bcrypt salt rounds = 10, Passport JWT Guard, `.env` nằm trong `.gitignore`. | Kiểm thử JwtAuthGuard từ chối truy cập khi không có token; Quét git không có secret. |
| **NFR-03** | **Khả năng Giám sát (Observability)** | Có cơ chế tự động kiểm tra sức khỏe hệ thống và đo độ trễ CSDL. | Endpoint `GET /health` trả về trạng thái kết nối PostgreSQL. | Test `health.controller.spec.ts` và Smoke Test trong GitHub Actions CI/CD. |
| **NFR-04** | **Khả năng Triển khai (Deployability)** | Tự động hóa build, test và deploy qua container độc lập. | Dockerfile đa tầng, `docker-compose.yml`, GitHub Actions workflow `.github/workflows/cd.yml`. | Pipeline CI/CD báo xanh; chạy thành công cả 3 service qua `docker-compose up`. |
