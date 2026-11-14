# 🧪 Hướng dẫn Chạy Kiểm thử (Testing Guide) – BrewLite (Assignment 2)

Tài liệu hướng dẫn cấu hình môi trường và thực thi các bộ kiểm thử tự động (**Unit Test**, **Integration Test**, và **E2E Test**) cho dự án BrewLite.

---

## 1. Cấu trúc các Bộ Kiểm thử trong Dự án

| Loại kiểm thử | Tệp kiểm thử (Test file) | Phạm vi kiểm tra |
| :--- | :--- | :--- |
| **Integration Test** | `apps/api/src/order-payment.integration.spec.ts` | Kiểm thử tích hợp toàn diện API Tạo đơn hàng (`POST /orders`), Tính giá Size/Topping, Áp mã giảm giá, Concurrency Locking, API Thanh toán (`POST /payments`), Idempotency-Key và State Machine. |
| **Nghiệp vụ Nâng cao** | `apps/api/src/task10.spec.ts` | Kiểm thử 3 tiêu chí cốt lõi: Order State Machine, Idempotent Payment và Concurrency Locking. |

---

## 2. Hướng dẫn Chạy Kiểm thử

### Cách 1: Chạy trực tiếp tại môi trường Local

Đảm bảo PostgreSQL đang chạy (thông qua Docker hoặc local port 5432) và đã cấu hình `DATABASE_URL` trong `.env`:

```bash
cd "Assignment 2/apps/api"

# Chạy riêng bộ Integration Test Tạo đơn hàng & Thanh toán
npm run test:integration

# Hoặc chạy kiểm thử Task 10
npm run test:task10

# Chạy toàn bộ các bài test
npm test
```

### Cách 2: Chạy bên trong Docker Container (Khuyên dùng)

```bash
# Đứng tại thư mục Assignment 2
docker compose exec backend npm run test:integration
```
