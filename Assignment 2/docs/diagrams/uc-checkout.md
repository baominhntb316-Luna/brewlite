# Đặc tả Use-case UC-01: Đặt và thanh toán đơn hàng

## 1. Bối cảnh và Tác nhân (Actors)
* **Mã Use-case:** UC-01
* **Tên Use-case:** Đặt và thanh toán đơn hàng (Checkout)
* **Actor chính:** Khách hàng (Đã đăng nhập vào hệ thống).
* **Actor phụ:** Cổng thanh toán mô phỏng (Mock Payment Gateway), Dịch vụ quản lý Kho (Inventory).
* **Mô tả tổng quan:** Khách hàng chốt giỏ hàng, hệ thống tạo đơn `PENDING`. Khách hàng thanh toán qua Ví/Thẻ, hệ thống gọi cổng mô phỏng để xác nhận, sau đó đổi trạng thái đơn sang `PAID` và cộng điểm thưởng.

## 2. Ranh giới Use-case (Tiêu chí hệ thống làm gì / không làm gì)
Để đảm bảo đúng phạm vi MVP và phục vụ viết test, Use-case này tuân thủ các ranh giới sau:
* **Hệ thống LÀM GÌ:** 
  - Khóa (lock) và trừ số lượng tồn kho ngay khi tạo đơn để chống bán vượt mức (Overbooking).
  - Tự động tính tổng tiền dựa trên giá gốc trong Database (tuyệt đối bỏ qua giá do Client gửi lên).
  - Áp dụng duy nhất 1 mã khuyến mãi hợp lệ (nếu có) trên mỗi đơn hàng.
  - Chặn các request thanh toán trùng lặp (do double-click hoặc mạng chậm) thông qua header `Idempotency-Key`.
  - Quản lý trạng thái đơn hàng bằng State Machine chặt chẽ.
* **Hệ thống KHÔNG LÀM GÌ:**
  - Không cho phép thanh toán bằng tiền mặt (Cash).
  - Không thực hiện hoàn tiền thật (Refund money) qua cổng thanh toán khi khách hủy đơn, chỉ hỗ trợ hoàn lại số lượng tồn kho.
  - Không xử lý quá trình vận chuyển (Delivery) hay theo dõi tài xế.

## 3. Điều kiện & Sự kiện kích hoạt
* **Sự kiện kích hoạt (Trigger):** Khách hàng nhấn nút "Thanh toán" tại màn hình Giỏ hàng trên ứng dụng.
* **Tiền điều kiện (Pre-conditions):**
  1. Khách hàng đang có phiên đăng nhập hợp lệ (Token JWT còn hạn sử dụng).
  2. Giỏ hàng có ít nhất 1 sản phẩm và số lượng mỗi món `qty > 0`.
  3. Client phải tự sinh một chuỗi `Idempotency-Key` duy nhất và đính kèm vào header khi gọi API thanh toán.
* **Hậu điều kiện (Post-conditions):**
  * *Trường hợp thành công:* Đơn hàng được lưu vào Database với trạng thái `PAID`; Tồn kho bị trừ thực tế theo số lượng đặt; Có 1 bản ghi Payment thành công; Có 1 bản ghi LoyaltyTransaction được tạo để cộng điểm; Giỏ hàng ở phía Client bị xóa.
  * *Trường hợp thất bại:* Đơn hàng bị từ chối tạo (nếu hết hàng/sai dữ liệu) HOẶC bị lưu ở trạng thái `PAYMENT_FAILED`; Không có điểm thưởng nào được cộng; Giỏ hàng ở Client được giữ nguyên; Tồn kho được hoàn lại nguyên trạng.

## 4. Luồng sự kiện (Event Flows) & Liên kết mã Yêu cầu (FR)

### 4.1. Luồng chính (Main Flow - Happy Path)
1. **[Customer]** Khách hàng nhấn "Thanh toán" từ màn hình giỏ hàng.
2. **[System]** Xác thực Token JWT, lấy `userId` trực tiếp từ token (bỏ qua `userId` do client gửi để đảm bảo bảo mật) `[Liên kết: FR-09]`.
3. **[System]** Validate body giỏ hàng: không rỗng, `qty > 0`, `productId` hợp lệ `[Liên kết: FR-09]`.
4. **[System]** Kiểm tra tồn kho và trừ kho bằng Database Transaction: `UPDATE ... WHERE stock >= qty` `[Liên kết: FR-10]`.
5. **[System]** Tính `total` từ giá niêm yết lưu trong DB `[Liên kết: FR-09]`.
6. **[System]** Tạo đơn hàng trạng thái `PENDING`, trả về HTTP 201 kèm `orderId`, `status`, `total` `[Liên kết: FR-09]`.
7. **[Customer]** Khách hàng chọn phương thức thanh toán không tiền mặt (`WALLET` hoặc `CARD`) và nhấn "Xác nhận trả".
8. **[System]** Nhận request `POST /payments` với `orderId`, `method`, và header `Idempotency-Key`. Kiểm tra đơn phải thuộc quyền sở hữu của user và đang ở trạng thái `PENDING` `[Liên kết: FR-12]`.
9. **[Gateway]** Cổng thanh toán mô phỏng xử lý và trả kết quả thành công.
10. **[System]** Ghi 1 bản ghi Payment, chuyển trạng thái đơn hàng từ `PENDING` → `PAID` `[Liên kết: FR-12, FR-13, FR-18]`.
11. **[System]** Tạo 1 bản ghi LoyaltyTransaction, cộng `floor(total/10.000)` điểm thưởng cho khách `[Liên kết: FR-15]`.
12. **[System]** Trả kết quả về UI. UI tiến hành xóa giỏ hàng, hiển thị mã đơn `#orderId` và trạng thái `PAID` `[Liên kết: FR-16]`.

### 4.2. Luồng thay thế (Alternative Flows)
* **A1 - Áp mã khuyến mãi:** Tại bước 5, nếu có truyền `promoCode`, hệ thống kiểm tra mã hợp lệ và giảm `total` tương ứng. Nếu mã sai/hết hạn, trả HTTP 400 và không tạo đơn (Rollback Database) `[Liên kết: FR-11]`.
* **A2 - Đổi phương thức thanh toán:** Tại bước 7, khách chọn `WALLET` thay vì `CARD`. Luồng đi tương tự, chỉ thay đổi giá trị `method` lưu vào bảng Payment.
* **A3 - Chống trùng lặp (Double Click / Idempotency):** Tại bước 8, nếu hệ thống nhận lại request `POST /payments` với cùng `Idempotency-Key` (do mạng lag hoặc người dùng nhấn 2 lần), hệ thống bỏ qua việc gọi Gateway, không tạo thêm Payment, không trừ tiền, không cộng điểm lần 2 và trực tiếp trả lại kết quả thành công của giao dịch cũ `[Liên kết: FR-13, FR-15]`.
* **A4 - Hủy đơn:** Khách hủy đơn khi đang ở trạng thái `PENDING`, `PAYMENT_FAILED` hoặc `PAID`. Hệ thống chuyển đơn sang `CANCELLED` và cộng hoàn lại số lượng tồn kho `[Liên kết: FR-19]`.
* **A5 - Xem lịch sử đơn:** Khách hàng truy cập màn hình Lịch sử đơn (`GET /orders/me`) để xem danh sách đơn hàng đã đặt, sắp xếp từ mới đến cũ `[Liên kết: FR-17]`.

### 4.3. Luồng ngoại lệ (Exception Flows)
* **E1 - Dữ liệu giỏ hàng sai:** Tại bước 3, body không hợp lệ → API trả HTTP 400 kèm chi tiết lỗi, không tạo đơn `[Liên kết: FR-09]`.
* **E2 - Hết hàng (Overbooking):** Tại bước 4, 2 người dùng tiến hành đặt cùng lúc nhưng sản phẩm chỉ còn 1 (`stock = 1`) → Người gửi request đến sau bị từ chối, trả HTTP 409 "Sản phẩm đã hết". Tồn kho không bao giờ bị âm `[Liên kết: FR-10]`.
* **E3 - Bảo mật ID đơn hàng:** Tại bước 8, nếu `orderId` truyền vào không thuộc `userId` đang đăng nhập → API trả HTTP 404 Not Found (che giấu sự tồn tại của đơn hàng) `[Liên kết: FR-12]`.
* **E4 - Sai trạng thái thanh toán:** Tại bước 8, đơn đã ở trạng thái `PAID` hoặc `CANCELLED` nhưng lại bị gọi thanh toán → API trả HTTP 409 Conflict `[Liên kết: FR-12, FR-18]`.
* **E5 - Thiếu Header chống trùng lặp:** Tại bước 8, request gửi lên không có `Idempotency-Key` → API trả HTTP 400 Bad Request `[Liên kết: FR-13]`.
* **E6 - Thanh toán thất bại:** Tại bước 9, Cổng Mock Gateway báo lỗi từ chối giao dịch → Hệ thống ghi bản ghi Payment thất bại, đơn chuyển từ `PENDING` → `PAYMENT_FAILED`. API trả thông báo lỗi, giỏ hàng trên UI giữ nguyên. Khách hàng có thể lấy Key mới để thử lại (quay về bước 8) `[Liên kết: FR-14]`.
* **E7 - Chuyển trạng thái sai quy tắc:** Có request cố ép đơn chuyển từ `PENDING` thẳng sang `READY` hoặc `COMPLETED` → Bị chặn đứng bởi State Machine, trả HTTP 409 `[Liên kết: FR-18]`.

## 5. Tiêu chí nghiệm thu kiểm thử (Acceptance Criteria & Test Matrix)
*(Viết theo cấu trúc BDD: Given - When - Then nhằm phục vụ đội QA/Dev viết Unit/Integration Test tự động ở Task 5)*

| Kịch bản Test (Scenario) | Mã FR | Given (Giả định tình huống) | When (Hành động kích hoạt) | Then (Kết quả hệ thống mong đợi) |
|---|---|---|---|---|
| **Tạo đơn thành công** | FR-09 | Hệ thống nhận JWT hợp lệ và giỏ hàng đủ thông tin, đúng cú pháp. | Gửi request `POST /orders` | Nhận HTTP 201; Đơn lưu DB trạng thái `PENDING`; Tổng tiền `total` do server tự tính lại đúng với CSDL. |
| **Chặn Overbooking** | FR-10 | Sản phẩm X trong DB chỉ có `stock = 1`. | Hai (2) users cùng gửi request tạo đơn mua sản phẩm X trong cùng 1 mili-giây. | Đúng 1 request nhận HTTP 201, request còn lại nhận HTTP 409. Tồn kho trong DB bằng 0. |
| **Khuyến mãi hết hạn** | FR-11 | Request truyền lên `promoCode` đã hết hạn sử dụng. | Gửi request `POST /orders` | Nhận HTTP 400; Database bị Rollback, không có đơn nào được tạo ra. |
| **Bảo vệ Idempotency** | FR-13 | Đơn hàng đang ở trạng thái `PENDING`. | Gửi hai (2) request `POST /payments` đồng thời có chung một `Idempotency-Key`. | Chỉ có 1 bản ghi Payment được tạo; Cả 2 request nhận chung 1 phản hồi thành công; Điểm Loyalty cộng 1 lần. |
| **Thanh toán lỗi & Retry** | FR-14 | Đơn hàng đang ở trạng thái `PENDING`. | Mock Payment trả kết quả từ chối thanh toán. | Đơn hàng chuyển sang `PAYMENT_FAILED`. |
| | | Đơn hàng đang ở trạng thái `PAYMENT_FAILED`. | Khách hàng gửi lại request thanh toán với `Idempotency-Key` mới thành công. | Đơn hàng chuyển sang trạng thái `PAID`. |
| **Bảo vệ State Machine** | FR-18 | Đơn hàng đang ở trạng thái `PAID`. | Gửi request ép chuyển sang trạng thái `COMPLETED` (Bỏ qua bước `PREPARING` và `READY`). | Nhận HTTP 409; Trạng thái đơn trong Database không thay đổi. |
| **Hủy đơn hoàn kho** | FR-19 | Đơn hàng đang ở trạng thái `PAID`. | Gửi request `POST` yêu cầu Hủy đơn. | Đơn đổi thành `CANCELLED`, số lượng từng món được cộng ngược lại vào kho hàng. |