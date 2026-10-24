# ADR 002: Lựa chọn PostgreSQL và Prisma ORM cho Tầng Dữ liệu

* **Trạng thái**: Accepted
* **Ngày quyết định**: 2026-10-21
* **Người phụ trách**: Hasan & Nhóm Kỹ thuật BrewLite
* **Liên kết yêu cầu**: Task 1.1, Task 3.1, NFR-02 (Toàn vẹn dữ liệu)

---

## 1. Bối cảnh (Context)
Hệ thống BrewLite xử lý các giao dịch kinh doanh đồ uống bao gồm đặt hàng, thanh toán, quản lý kho nguyên liệu và tích lũy điểm thưởng. Dữ liệu có tính ràng buộc quan hệ cao và yêu cầu tính toàn vẹn tuyệt đối (ACID). Nhóm cần một hệ quản trị cơ sở dữ liệu quan hệ mạnh mẽ kèm theo công cụ ORM hiện đại hỗ trợ TypeScript.

## 2. Các phương án xem xét
* **Phương án A: MongoDB / Mongoose (NoSQL)**: Thiếu hỗ trợ quan hệ chặt chẽ và giao dịch đa tài liệu phức tạp.
* **Phương án B: MySQL + TypeORM**: Phổ biến nhưng TypeORM có cú pháp migration phức tạp và kiểu dữ liệu TypeScript chưa đạt độ Type-safe tuyệt đối.
* **Phương án C: PostgreSQL + Prisma ORM** — *(ĐƯỢC CHỌN)*: Hệ quản trị CSDL quan hệ chuẩn doanh nghiệp kết hợp ORM Type-safe thế hệ mới.

## 3. Quyết định (Decision)
Nhóm thống nhất sử dụng **PostgreSQL 16** và **Prisma ORM**:
* Định nghĩa schema tập trung trong `prisma/schema.prisma` với 7 mô hình dữ liệu chính: `User`, `Product`, `Order`, `OrderItem`, `Payment`, `Promotion`, `LoyaltyTransaction`.
* Sử dụng **Prisma Migrate** để tạo và đồng bộ hóa lịch sử thay đổi schema vào git (`prisma/migrations`).
* Sử dụng **Prisma Interactive Transactions** (`prisma.$transaction`) để bảo vệ các thao tác nhạy cảm: thanh toán idempotent, trừ kho đồng thời.

## 4. Hệ quả & Đánh đổi (Consequences)
* **Ưu điểm**:
  * Tự động sinh kiểu TypeScript (Type-safe client) giảm thiểu 90% lỗi cú pháp thời gian biên dịch (compile-time).
  * Hỗ trợ Transaction mạnh mẽ, dễ dàng kết hợp với NestJS.
* **Đánh đổi**:
  * Cần chạy bước `npx prisma generate` trong quy trình CI/CD trước khi build và test code.
