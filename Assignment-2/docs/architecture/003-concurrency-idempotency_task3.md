# ADR 003: Chiến lược Xử lý Thanh toán Idempotent (Idempotency) & Tích điểm Thưởng (Loyalty)

* **Trạng thái**: Accepted
* **Ngày quyết định**: 2026-10-22
* **Người phụ trách**: An + San 
* **Liên kết yêu cầu**: FR-06 (Thanh toán Ví/Thẻ), FR-09 (Idempotent & Loyalty), NFR-02 (Bảo mật & Toàn vẹn dữ liệu), Task 10.2 & 10.4

---

## 1. Bối cảnh (Context)

Trong hệ thống đặt đồ uống trực tuyến **BrewLite**, thanh toán là mắt xích nghiệp vụ tài chính nhạy cảm và tối quan trọng:
1. **Rủi ro mạng chập chờn (Network Instability)**: Khi khách hàng thực hiện thanh toán (Ví MoMo / Thẻ ngân hàng), nếu gặp lỗi timeout mạng hoặc độ trễ phản hồi, ứng dụng máy khách (Next.js client) hoặc proxy mạng có thể tự động gửi lại (auto-retry) cùng một yêu cầu thanh toán.
2. **Hành vi người dùng (User Double-Click)**: Người dùng có thể nhấn nút "Xác nhận thanh toán" liên tiếp nhiều lần hoặc tải lại trang trong lúc chờ giao dịch hoàn tất.
3. **Nguy cơ nghiệp vụ**:
   * Khách hàng bị trừ tiền trùng lặp cho một đơn hàng.
   * Tạo ra nhiều giao dịch ghi nhận doanh thu sai lệch trong hệ thống kế toán.
   * Điểm thưởng khách hàng thân thiết (`loyaltyPoints`) bị nhân đôi hoặc nhân ba sai quy định (10.000đ = 1 điểm).

Chỉ khóa hoặc vô hiệu hóa nút bấm ở Frontend (Disable Button) là **không đủ an toàn**, vì kẻ xấu hoặc lỗi mạng có thể dễ dàng vượt qua tầng giao diện. Do đó, hệ thống bắt buộc phải có cơ chế **Idempotent Consumer** tại tầng Backend (NestJS API).

---

## 2. Các phương án kiến trúc được xem xét (Alternatives Considered)

### Phương án A: Lưu trữ Idempotency Key trên In-Memory Cache (Redis)
* **Mô tả**: Sử dụng Redis làm tầng đệm lưu trữ khóa `Idempotency-Key` với thời gian sống (TTL) khoảng 24 giờ.
* **Ưu điểm**: Tốc độ đọc/ghi cực nhanh trên RAM, tự động giải phóng bộ nhớ khi hết hạn TTL.
* **Nhược điểm**: 
  * Cần duy trì thêm một cụm hạ tầng Redis bên cạnh PostgreSQL (tăng chi phí vận hành, phức tạp hóa việc triển khai Docker và CI/CD).
  * Tiềm ẩn nguy cơ bất nhất quán dữ liệu phân tán (Split-brain / Dual-write problem): nếu ghi Redis thành công nhưng ghi PostgreSQL thất bại hoặc ngược lại.

### Phương án B: Tận dụng trực tiếp Ràng buộc Khóa duy nhất (Unique Constraint) trong Cơ sở dữ liệu Quan hệ (PostgreSQL) — *(ĐƯỢC CHỌN)*
* **Mô tả**: Lưu trữ trực tiếp `idempotencyKey` trong bảng `Payment` của PostgreSQL với chỉ mục duy nhất (`@unique`), kết hợp Prisma Interactive Transaction (`tx`).
* **Ưu điểm**:
  * Đảm bảo tính chất **ACID tuyệt đối**: Việc tạo giao dịch thanh toán, cập nhật trạng thái đơn hàng (`PENDING` $\rightarrow$ `PAID`), và cộng điểm thưởng được đóng gói trong một Transaction duy nhất.
  * Tận dụng hạ tầng PostgreSQL hiện có, không phát sinh chi phí hay dịch vụ phụ thuộc ngoài.
  * Tự động ngăn chặn việc ghi đè nhờ cơ chế khóa cấp cơ sở dữ liệu (Database-level concurrency lock).
* **Nhược điểm**: Bảng `Payment` sẽ lưu trữ khóa idempotency lâu dài (chiếm một lượng nhỏ dung lượng ổ cứng, có thể khắc phục bằng chỉ mục B-tree hiệu quả).

---

## 3. Quyết định Kiến trúc (Decision)

Nhóm quyết định chọn **Phương án B: Idempotency dựa trên PostgreSQL & Prisma Transaction**.

Cơ chế thực thi cụ thể:
1. **Quy ước Client**: Phía giao diện (Next.js Web / PWA) sinh một chuỗi định danh ngẫu nhiên chuẩn UUIDv4 cho mỗi phiên thanh toán đơn hàng và truyền vào HTTP Request Header:
   ```http
   POST /payments HTTP/1.1
   Host: api.brewlite.vn
   Authorization: Bearer <JWT_TOKEN>
   Idempotency-Key: c9b2f347-9f4a-4a7b-8c6e-821f57d60a12
   Content-Type: application/json

   {
     "orderId": 12,
     "method": "WALLET"
   }
   ```
2. **Kiểm tra sơ bộ (Pre-check)**:
   * `PaymentsService` truy vấn bảng `Payment` theo `idempotencyKey`.
   * Nếu đã tìm thấy giao dịch trước đó: Hệ thống ngay lập tức trả về phản hồi thành công cũ với cờ `idempotentReplay: true` mà **không trừ tiền hay cộng điểm thêm lần nào**.
3. **Thực thi giao dịch nguyên tử (Interactive Transaction)**:
   * Mở `this.prisma.$transaction(async (tx) => { ... })`.
   * Khóa bản ghi đơn hàng, xác thực quyền sở hữu của `userId`.
   * Kiểm tra chuyển trạng thái hợp lệ thông qua `assertTransition(order.status, OrderStatus.PAID)`.
   * Tạo bản ghi `Payment` với `idempotencyKey` duy nhất.
   * Chuyển trạng thái `Order` sang `PAID`.
   * Tính toán và tích lũy điểm thưởng: $\text{points} = \lfloor \frac{\text{total}}{10000} \rfloor$, cập nhật trường `user.loyaltyPoints`.

---

## 4. Hệ quả và Đánh đổi (Consequences & Trade-offs)

### Ưu điểm đạt được (Pros):
* **An toàn tài chính 100%**: Loại bỏ hoàn toàn nguy cơ trùng lặp giao dịch và sai lệch điểm thưởng.
* **Đơn giản và Tin cậy**: Tận dụng triệt để ACID của PostgreSQL mà không làm tăng độ phức tạp hạ tầng mạng.
* **Khả năng tự phục hồi**: Nếu thanh toán lần đầu thất bại (`PAYMENT_FAILED`), đơn hàng cho phép người dùng đổi phương thức hoặc bấm thử lại mà không bị khóa cứng.

### Hạn chế và Biện pháp giảm thiểu (Cons & Mitigations):
* **Chi phí truy vấn DB**: Mỗi request thanh toán tốn thêm 1 câu lệnh `SELECT` kiểm tra key.
  * *Giảm thiểu*: Tạo chỉ mục `@unique` B-tree trên cột `idempotencyKey`, đảm bảo tốc độ tra cứu $O(\log N)$ cực nhanh (dưới 1ms).
* **Quản lý dữ liệu lịch sử**: Các key cũ lưu mãi trong DB.
  * *Giảm thiểu*: Với quy mô cửa hàng vừa và nhỏ, dung lượng một chuỗi UUID là không đáng kể. Sau này có thể thiết lập cron job lưu trữ (archive) các giao dịch trên 1 năm.

---

## 5. Minh chứng và Kiểm thử (Verification & Testing)

Kiến trúc này đã được kiểm chứng tự động thông qua bộ Unit & Integration Test trong file `apps/api/src/task10.spec.ts`:
* **Test Case**: Mô phỏng bắn 2 request liên tiếp cùng một `Idempotency-Key`.
* **Kết quả kiểm chứng**:
  * Lần gọi 1: `idempotentReplay = false`, ghi nhận thanh toán và cộng điểm.
  * Lần gọi 2: `idempotentReplay = true`, trả về cùng mã `payment.id`.
  * Số lượng bản ghi `Payment` trong database sau 2 lần gọi luôn chính xác bằng `1`.
  * Số điểm `loyaltyPoints` của người dùng chỉ được cộng đúng 1 lần duy nhất.
