# BrewLite – Đặc Tả Use-Case UC-06: Theo Dõi Đơn Hàng & Máy Trạng Thái Đơn Hàng (Order Tracking & State Machine Lifecycle)

> **Mã tạo phẩm**: DOC-REQ-06  
> **Căn cứ**: Đề bài Assignment 2 – Mục 3 (Task 1 & Task 2), Phân công TV6 (Minh)  
> **Tên Use-Case**: UC-06 – Theo dõi tiến độ đơn hàng và Quản lý máy trạng thái đơn hàng (Order Tracking & Order State Machine)  
> **Tác nhân chính (Primary Actor)**: Khách hàng (Customer), Barista / Quản trị viên (Staff / Admin)  
> **Tác nhân hỗ trợ (Supporting Actors)**: Hệ thống NestJS Backend API, Hệ quản trị CSDL PostgreSQL.

---

## 1. Thông tin tổng quan Use-Case

| Thuộc tính | Chi tiết đặc tả |
|---|---|
| **Mục tiêu (Goal)** | Cung cấp khả năng theo dõi tiến độ đơn hàng theo thời gian thực cho khách hàng; quản lý toàn bộ vòng đời trạng thái đơn hàng thông qua máy trạng thái hữu hạn (Finite State Machine), đảm bảo tính toàn vẹn trạng thái và tự động hoàn trả tồn kho khi hủy đơn. |
| **Sự kiện kích hoạt (Trigger)** | 1. Khách hàng truy cập trang Theo dõi đơn hàng (`/orders` hoặc `/orders/:id`).<br>2. Nhân viên/Barista tiếp nhận đơn, hoàn tất pha chế hoặc giao đồ uống tại quầy. |
| **Tiền điều kiện (Preconditions)** | 1. Ứng dụng Next.js kết nối thông suốt tới NestJS API.<br>2. Khách hàng đã đăng nhập tài khoản (đã có Bearer JWT hợp lệ).<br>3. Đơn hàng đã được khởi tạo trong CSDL thông qua `POST /orders` (ở trạng thái ít nhất là `PENDING`).<br>4. Nhân viên/Barista có thẩm quyền truy cập cập nhật trạng thái đơn hàng. |
| **Hậu điều kiện thành công (Postconditions - Success)** | 1. Khách hàng xem được thông tin chi tiết đơn hàng (mã đơn, danh sách món, giá snapshot, tổng tiền, trạng thái thời gian thực).<br>2. Trạng thái đơn hàng được chuyển tiếp tuần tự, hợp lệ theo đúng ma trận máy trạng thái: `PENDING` $\rightarrow$ `PAID` $\rightarrow$ `PREPARING` $\rightarrow$ `READY` $\rightarrow$ `COMPLETED`.<br>3. Nếu đơn bị hủy (`CANCELLED`), toàn bộ số lượng tồn kho (stock) của các sản phẩm trong đơn được tự động hoàn trả đầy đủ vào CSDL trong một transaction an toàn.<br>4. Giao diện khách hàng cập nhật trực quan tiến trình đơn (Order Stepper). |
| **Hậu điều kiện thất bại (Postconditions - Failure)** | 1. Tuyệt đối không lưu các bước chuyển trạng thái nhảy cóc hoặc vi phạm máy trạng thái vào CSDL.<br>2. Khi có ngoại lệ chuyển tiếp, hệ thống ném `BadRequestException` (HTTP 400), giữ nguyên trạng thái cũ.<br>3. Nếu xảy ra sự cố kỹ thuật trong quá trình hủy đơn (hoàn kho), Database Transaction tự động `ROLLBACK`, bảo đảm tính nhất quán dữ liệu. |
| **Yêu cầu liên quan (Linked Requirements)** | FR-08, FR-09, FR-17, FR-18, FR-19; NFR-02, NFR-03, NFR-09, NFR-13. |
| **API Endpoints liên quan** | `GET /orders/me`, `GET /orders/:id`, `PATCH /orders/:id/status`. |

---

## 2. Ma trận Chuyển trạng thái Đơn hàng (State Transition Matrix)

| Trạng thái hiện tại (`current`) | Trạng thái kế tiếp cho phép (`target`) | Ý nghĩa nghiệp vụ & Hành động hệ thống |
|:---|:---|:---|
| **`PENDING`** | `PAID` | Khách hàng thanh toán thành công qua Mock Gateway. Cho phép cộng điểm thưởng. |
| **`PENDING`** | `PAYMENT_FAILED` | Giao dịch thanh toán bị từ chối/lỗi. Bảo lưu giỏ hàng/đơn để thử lại. |
| **`PENDING`** | `CANCELLED` | Khách hàng chủ động hủy đơn trước khi thanh toán. Hệ thống hoàn trả tồn kho. |
| **`PAYMENT_FAILED`** | `PENDING` | Khách hàng bấm "Thử lại thanh toán". Hệ thống kiểm tra lại tồn kho. |
| **`PAYMENT_FAILED`** | `CANCELLED` | Khách hàng hủy đơn sau khi thanh toán thất bại. Hệ thống hoàn trả tồn kho. |
| **`PAID`** | `PREPARING` | Barista tiếp nhận đơn hàng tại quầy và bắt đầu pha chế đồ uống. |
| **`PREPARING`** | `READY` | Barista hoàn tất pha chế, đồ uống sẵn sàng tại quầy nhận món. |
| **`READY`** | `COMPLETED` | Khách hàng đã nhận đồ uống tại quầy. Đơn hoàn tất (*Terminal State*). |
| **`COMPLETED`** | *(Không cho phép)* | Trạng thái kết thúc; mọi yêu cầu chuyển trạng thái đều bị chặn (HTTP 400). |
| **`CANCELLED`** | *(Không cho phép)* | Trạng thái kết thúc; đơn đã đóng, không cho phép mở lại (HTTP 400). |

---

## 3. Kịch bản Luồng chính (Main Success Flow - Happy Path)

| Bước | Tác nhân | Hành động thực hiện |
|:---:|---|---|
| **1** | Khách hàng | Mở giao diện ứng dụng BrewLite, điều hướng đến trang "Lịch sử đơn hàng" (`/orders`) hoặc bấm vào thông báo chi tiết đơn vừa đặt (`/orders/:id`). |
| **2** | Ứng dụng Next.js | Gửi yêu cầu HTTP `GET /orders/me` (hoặc `GET /orders/:id`) kèm tiêu đề `Authorization: Bearer <JWT>` tới NestJS Backend API. |
| **3** | NestJS Backend | `JwtAuthGuard` giải mã và xác thực mã JWT. `OrdersService` truy vấn CSDL PostgreSQL lấy danh sách đơn hàng có `userId` khớp với người dùng đăng nhập, kèm thông tin chi tiết `OrderItems`, `Product` và `Payment`. |
| **4** | NestJS Backend | Trả về mã HTTP `200 OK` cùng payload JSON chứa đầy đủ thông tin đơn hàng và trạng thái hiện tại (`PAID`). |
| **5** | Ứng dụng Next.js | Giao diện hiển thị danh sách đơn kèm thanh tiến trình trạng thái (Order Stepper): Đã đặt $\rightarrow$ **Đã thanh toán** $\rightarrow$ Đang pha chế $\rightarrow$ Sẵn sàng $\rightarrow$ Hoàn tất. |
| **6** | Barista / Quầy | Xem màn hình danh sách đơn tại quầy pha chế, thấy đơn hàng mới ở trạng thái `PAID` và bấm nút "Bắt đầu pha chế". |
| **7** | Hệ thống Quầy / Admin | Gửi yêu cầu HTTP `PATCH /orders/:id/status` kèm tiêu đề xác thực và thân request `{"status": "PREPARING"}`. |
| **8** | NestJS Backend | `OrdersController` tiếp nhận yêu cầu, gọi hàm kiểm định `assertTransition(order.status, 'PREPARING')`. Xác nhận chuyển tiếp từ `PAID` $\rightarrow$ `PREPARING` là hợp lệ. |
| **9** | NestJS Backend | Cập nhật trường `status = PREPARING` của bản ghi `Order` trong CSDL PostgreSQL. Trả về mã HTTP `200 OK` kèm dữ liệu đơn đã cập nhật. |
| **10** | Barista / Quầy | Pha chế xong toàn bộ đồ uống trong đơn, bấm nút "Đã pha xong / Sẵn sàng giao". |
| **11** | Hệ thống Quầy / Admin | Gửi yêu cầu HTTP `PATCH /orders/:id/status` với thân request `{"status": "READY"}`. |
| **12** | NestJS Backend | Hàm `assertTransition('PREPARING', 'READY')` kiểm tra hợp lệ. Cập nhật `status = READY` vào CSDL. Trả về HTTP `200 OK`. |
| **13** | Ứng dụng Next.js | Giao diện khách hàng tự động cập nhật (hoặc khi tải lại trang) hiển thị trạng thái "Sẵn sàng nhận đồ uống tại quầy". |
| **14** | Barista & Khách hàng | Khách hàng đến quầy đọc mã đơn nhận đồ uống; Barista đối chiếu và bấm nút "Xác nhận đã giao". |
| **15** | Hệ thống Quầy / Admin | Gửi yêu cầu HTTP `PATCH /orders/:id/status` với thân request `{"status": "COMPLETED"}`. |
| **16** | NestJS Backend | Hàm `assertTransition('READY', 'COMPLETED')` kiểm tra hợp lệ. CSDL ghi nhận trạng thái cuối `COMPLETED`. Trả về HTTP `200 OK`. Hoàn tất vòng đời đơn hàng. |

---

## 4. Các Luồng Ngoại Lệ & Luồng Phụ (Alternative & Exception Flows)

### A1 – Khách hàng chưa đăng nhập hoặc Token JWT hết hạn
- **Điều kiện**: Khách hàng truy cập `/orders` hoặc gửi request `GET /orders/me` mà không đính kèm Bearer token hoặc token đã quá hạn 7 ngày.
- **Xử lý của hệ thống**:
  1. `JwtAuthGuard` chặn request tại tầng Middleware/Guard.
  2. Backend trả về HTTP `401 Unauthorized` kèm thông báo `"Unauthorized"`.
  3. Giao diện Next.js xóa bỏ token cũ trong `useAuthStore` và điều hướng người dùng về trang Đăng nhập (`/login`).

### A2 – Đơn hàng không tồn tại
- **Điều kiện**: Yêu cầu `GET /orders/:id` hoặc `PATCH /orders/:id/status` với mã `id` không có trong CSDL.
- **Xử lý của hệ thống**:
  1. Backend truy vấn `prisma.order.findUnique` trả về `null`.
  2. Backend ném ngoại lệ `NotFoundException` và phản hồi HTTP `404 Not Found` kèm thông báo `"Không tìm thấy đơn hàng"`.

### A3 – Khách hàng truy cập đơn hàng của người khác
- **Điều kiện**: Khách hàng A gửi request tra cứu `GET /orders/:id` nhưng đơn hàng đó thuộc quyền sở hữu của Khách hàng B.
- **Xử lý của hệ thống**:
  1. Backend kiểm tra điều kiện `order.userId !== currentUser.id` (và người dùng không có vai trò Quản trị viên).
  2. Backend từ chối cung cấp dữ liệu, trả về HTTP `404 Not Found` hoặc `403 Forbidden` nhằm đảm bảo nguyên tắc bảo mật và riêng tư dữ liệu khách hàng.

### A4 – Vi phạm quy tắc chuyển trạng thái máy trạng thái (Invalid State Transition)
- **Điều kiện**: Request `PATCH /orders/:id/status` gửi lên trạng thái không tuân thủ đường đi hợp lệ (ví dụ: chuyển trực tiếp từ `PENDING` $\rightarrow$ `READY`, hoặc cố tình chuyển từ `COMPLETED` về lại `PREPARING`).
- **Xử lý của hệ thống**:
  1. Hàm `assertTransition(currentStatus, targetStatus)` kích hoạt điều kiện kiểm tra ma trận chuyển trạng thái.
  2. Nhận thấy `targetStatus` không nằm trong danh sách cho phép của `currentStatus`.
  3. Hàm ném ngoại lệ `BadRequestException("Invalid state transition from {currentStatus} to {targetStatus}")`.
  4. Backend trả về HTTP `400 Bad Request`. Trạng thái của đơn trong CSDL hoàn toàn không bị biến động.

### A5 – Khách hàng hủy đơn hàng & Tự động hoàn trả tồn kho (Cancel Order & Restock)
- **Điều kiện**: Đơn hàng đang ở trạng thái `PENDING` hoặc `PAYMENT_FAILED`, khách hàng hoặc nhân viên gửi yêu cầu hủy đơn (`{"status": "CANCELLED"}`).
- **Xử lý của hệ thống**:
  1. `assertTransition` kiểm tra và xác nhận chuyển tiếp sang `CANCELLED` là hợp lệ.
  2. Backend mở một **Database Transaction** (`prisma.$transaction`):
     - Bước a: Cập nhật trạng thái đơn sang `CANCELLED`.
     - Bước b: Lấy toàn bộ danh sách sản phẩm trong `OrderItem` của đơn.
     - Bước c: Với mỗi sản phẩm, thực thi câu lệnh cộng hoàn trả tồn kho:
       `prisma.product.update({ where: { id: item.productId }, data: { stock: { increment: item.qty } } })`.
  3. Commit transaction. Tồn kho được hoàn trả ngay lập tức cho các khách hàng khác tiếp tục mua sắm.
  4. Backend trả về HTTP `200 OK` kèm trạng thái `CANCELLED`.

### A6 – Xử lý thanh toán thất bại (Payment Failure & Retry Flow)
- **Điều kiện**: Khách hàng thanh toán qua cổng thanh toán mô phỏng nhưng giao dịch trả về `FAILURE`.
- **Xử lý của hệ thống**:
  1. Trạng thái đơn được cập nhật sang `PAYMENT_FAILED`.
  2. Giao diện hiển thị nút "Thử lại thanh toán" hoặc "Hủy đơn hàng".
  3. Nếu khách hàng chọn thử lại, hệ thống chuyển về `PENDING`, kiểm tra lại tồn kho và cho phép thực hiện lượt thanh toán mới.
