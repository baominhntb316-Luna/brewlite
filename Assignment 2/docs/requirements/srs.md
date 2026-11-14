# Đặc tả Yêu cầu Phần mềm Rút gọn (Software Requirements Specification – SRS)

- **Dự án:** BrewLite – Ứng dụng Đặt Cà Phê Không Tiền Mặt (Cashless Coffee Ordering)
- **Học phần:** Công nghệ Phần mềm (Software Engineering) – Khoa CNTT, Trường Đại học Sài Gòn (SGU)
- **Giai đoạn:** Task 1.2 – Yêu cầu chức năng và phi chức năng (Assignment 2)
- **Tài liệu liên quan:** [context-and-scope.md](./context-and-scope.md)

---

## 1. Giới thiệu và Quy ước Đặc tả

### 1.1. Mục đích tài liệu
Tài liệu này đặc tả chi tiết các **yêu cầu chức năng (Functional Requirements – FR)**, **yêu cầu phi chức năng (Non-Functional Requirements – NFR)**, mức độ ưu tiên theo chuẩn **MoSCoW**, **tiêu chí chấp nhận (Acceptance Criteria)** có thể kiểm chứng được và **sơ đồ use-case tổng quát** của hệ thống **BrewLite**. Tài liệu là cơ sở trực tiếp để thiết kế sơ đồ UML (Task 2), thiết kế kiến trúc (Task 3), triển khai mã nguồn, viết kiểm thử (Task 4–5) và lập ma trận truy vết (Task 8).

### 1.2. Quy ước đánh mã và Mức ưu tiên MoSCoW
- **Mã yêu cầu chức năng:** `FR-01`, `FR-02`, ...
- **Mã yêu cầu phi chức năng:** `NFR-01`, `NFR-02`, ...
- **Thang ưu tiên MoSCoW:**
  - **Must (`Must have`):** Yêu cầu cốt lõi bắt buộc phải có để luồng nghiệp vụ chính hoạt động và nghiệm thu sản phẩm.
  - **Should (`Should have`):** Yêu cầu quan trọng nâng cao trải nghiệm người dùng và tính ổn định, ưu tiên hoàn thiện ngay sau nhóm *Must*.
  - **Could (`Could have`):** Yêu cầu mở rộng mang lại giá trị bổ sung nếu còn thời gian nguồn lực.
  - **Won't (`Won't have`):** Nội dung chủ động loại trừ khỏi phạm vi phiên bản hiện tại để tập trung nguồn lực cho MVP.

### 1.3. Bảng tổng hợp bao phủ các nhóm yêu cầu tối thiểu

| STT | Nhóm yêu cầu tối thiểu | Loại | Phạm vi mã yêu cầu |
| :--- | :--- | :--- | :--- |
| 1 | **Menu** | Chức năng (FR) | `FR-01`, `FR-02`, `FR-03` |
| 2 | **Chi tiết sản phẩm** | Chức năng (FR) | `FR-04`, `FR-05`, `FR-06` |
| 3 | **Giỏ hàng** | Chức năng (FR) | `FR-07`, `FR-08`, `FR-09` |
| 4 | **Xác thực** | Chức năng (FR) | `FR-10`, `FR-11`, `FR-12` |
| 5 | **Đặt đơn** | Chức năng (FR) | `FR-13`, `FR-14`, `FR-15` |
| 6 | **Thanh toán** | Chức năng (FR) | `FR-16`, `FR-17`, `FR-18` |
| 7 | **Lịch sử đơn** | Chức năng (FR) | `FR-19`, `FR-20` |
| 8 | **Quản lý trạng thái đơn** | Chức năng (FR) | `FR-21`, `FR-22`, `FR-23`, `FR-24` |
| 9 | **Hiệu năng (Performance)** | Phi chức năng (NFR) | `NFR-01`, `NFR-02`, `NFR-03` |
| 10 | **Bảo mật (Security)** | Phi chức năng (NFR) | `NFR-04`, `NFR-05`, `NFR-06` |
| 11 | **Tính khả dụng (Usability & Availability)** | Phi chức năng (NFR) | `NFR-07`, `NFR-08`, `NFR-09` |
| 12 | **Khả năng triển khai (Deployability)** | Phi chức năng (NFR) | `NFR-10`, `NFR-11`, `NFR-12` |

---

## 2. Sơ đồ Use-Case Tổng quát của Hệ thống

### 2.1. Biểu đồ Use-Case Tổng quát

```
@startuml use-case-overview
' BrewLite - Sơ đồ use-case tổng quát (Task 1.2)
' Xuất SVG: plantuml -tsvg use-case-overview.puml

left to right direction
skinparam shadowing false
skinparam packageStyle rectangle
skinparam usecase {
  BackgroundColor #FFFFFF
  BorderColor #333333
}
skinparam actor {
  BorderColor #333333
}

title BrewLite – Sơ đồ use-case tổng quát

actor "Khách hàng" as Customer
actor "Nhân viên quầy\n(Barista)" as Barista
actor "Quản lý cửa hàng" as Manager
actor "Payment Service\n(mô phỏng)" as Payment <<system>>

rectangle "BrewLite" {

  ' ----- Phạm vi MVP -----
  usecase "UC-01\nĐặt và thanh toán đơn hàng" as UC01
  usecase "UC-02\nXem menu, lọc & tìm kiếm" as UC02
  usecase "UC-03\nXem chi tiết, chọn size/topping" as UC03
  usecase "UC-04\nQuản lý giỏ hàng" as UC04
  usecase "UC-05\nĐăng ký tài khoản" as UC05
  usecase "UC-06\nĐăng nhập & xác thực JWT" as UC06
  usecase "UC-07\nXem xác nhận, tiến trình\nvà lịch sử đơn" as UC07
  usecase "UC-08\nHủy đơn & hoàn tồn kho" as UC08
  usecase "UC-09\nCập nhật trạng thái đơn" as UC09
  usecase "UC-10\nÁp mã khuyến mãi tại Checkout" as UC10
  usecase "UC-11\nTích điểm thưởng Loyalty" as UC11

  ' ----- Phạm vi mở rộng (màu xám) -----
  usecase "UC-12\nGiao diện quản trị pha chế\nvà thực đơn" as UC12 #DDDDDD
}

' ----- Khách hàng -----
Customer -- UC02
Customer -- UC03
Customer -- UC04
Customer -- UC05
Customer -- UC06
Customer -- UC01
Customer -- UC07
Customer -- UC08

' ----- Quan hệ giữa các use-case -----
UC01 ..> UC06 : <<include>>
UC10 ..> UC01 : <<extend>>
UC11 ..> UC01 : <<extend>>

' ----- Actor hệ thống bên ngoài -----
UC01 -- Payment

' ----- Barista và Quản lý -----
Barista -- UC09
Barista -- UC12
Manager -- UC12

note right of UC09
  Backend (Order State Machine) thuộc MVP.
  Giao diện Barista/Admin thuộc phạm vi
  mở rộng.
end note

legend right
  Nền trắng: thuộc MVP
  Nền xám: phạm vi mở rộng (Extension)
endlegend

@enduml
```

### 2.2. Bảng ánh xạ Use-Case & User Story (UC/US) với Actor và Mã yêu cầu

| Mã UC / US | Tên Use-Case | User Story (Câu chuyện người dùng) | Actor tham gia | Mã yêu cầu liên kết |
| :--- | :--- | :--- | :--- | :--- |
| **UC-01** | Đặt và thanh toán đơn hàng (Cashless Checkout)| Khách hàng, Payment Service (mô phỏng) | `FR-13`, `FR-14`, `FR-15`, `FR-16`, `FR-17`, `FR-18` |

| **UC-02** | Xem menu, lọc danh mục & tìm kiếm | Khách hàng | `FR-01`, `FR-02`, `FR-03` |

| **UC-03** | Xem chi tiết, chọn size/topping & số lượng | Khách hàng | `FR-04`, `FR-05`, `FR-06` |

| **UC-04** | Quản lý giỏ hàng | Khách hàng | `FR-07`, `FR-08`, `FR-09` |

| **UC-05** | Đăng ký tài khoản | Khách hàng | `FR-10` |

| **UC-06** | Đăng nhập & Xác thực JWT  | Khách hàng | `FR-11`, `FR-12` |

| **UC-07** | Xem xác nhận, tiến trình và lịch sử đơn | Khách hàng | `FR-19`, `FR-20` |

| **UC-08** | Hủy đơn & Hoàn trả tồn kho | Khách hàng | `FR-21`, `FR-22` |

| **UC-09** | Cập nhật trạng thái đơn hàng  | Nhân viên quầy (Barista), Quản lý (Admin) | `FR-21` |

| **UC-10** | Áp mã khuyến mãi tại trang Checkout (`<<extend>>` UC-01) | Khách hàng | `FR-14` |

| **UC-11** | Tích điểm thưởng Loyalty (`<<extend>>` UC-01) | Khách hàng | `FR-18` |

| **UC-12** | Giao diện quản trị pha chế và thực đơn (phạm vi mở rộng) | Barista, Quản lý cửa hàng | `FR-23` |

---

## 3. Đặc tả Yêu cầu Chức năng (Functional Requirements)

### 3.1. Nhóm 1: Menu

| Mã | Tên yêu cầu | Mô tả chi tiết | Ưu tiên (MoSCoW) | Tiêu chí chấp nhận (Acceptance Criteria) |
| :--- | :--- | :--- | :--- | :--- |
| **FR-01** | **Hiển thị danh sách thực đơn** | Hệ thống cung cấp API `GET /products` và màn hình trang chủ (`/`) hiển thị toàn bộ đồ uống trong cửa hàng bao gồm: tên món, giá gốc (VNĐ), hình ảnh, nhãn danh mục và số lượng tồn kho (`stock`). | **Must** | - Gọi `GET /products` trả về HTTP `200` cùng mảng sản phẩm kèm thông tin `category`.<br>- Giao diện hiển thị khung xương `loading` khi đang tải, thông báo rõ ràng khi danh sách rỗng (`empty`) hoặc lỗi kết nối (`error`). |
| **FR-02** | **Lọc thực đơn theo danh mục** | Người dùng có thể lọc danh sách đồ uống theo các danh mục lấy từ `GET /products/categories`: `Tất cả (ALL)`, `Cà phê (COFFEE)`, `Trà (TEA)`. | **Must** | - Khi chọn danh mục `COFFEE`, chỉ các sản phẩm thuộc danh mục `Cà phê` được hiển thị.<br>- Khi chọn `ALL`, toàn bộ danh sách sản phẩm được khôi phục đầy đủ. |
| **FR-03** | **Tìm kiếm đồ uống theo từ khóa** | Người dùng có thể nhập từ khóa vào ô tìm kiếm trên trang chủ để lọc nhanh đồ uống theo tên sản phẩm hoặc tên danh mục (không phân biệt hoa/thường). | **Should** | - Nhập `"trà"` hoặc `"cà phê"` hiển thị ngay các món khớp từ khóa.<br>- Nhập từ khóa không tồn tại hiển thị trạng thái rỗng *"Không tìm thấy đồ uống phù hợp"*. |

### 3.2. Nhóm 2: Chi tiết sản phẩm

| Mã | Tên yêu cầu | Mô tả chi tiết | Ưu tiên (MoSCoW) | Tiêu chí chấp nhận (Acceptance Criteria) |
| :--- | :--- | :--- | :--- | :--- |
| **FR-04** | **Xem chi tiết sản phẩm** | Hệ thống cung cấp API `GET /products/:id` và hộp thoại `ProductModal` hiển thị đầy đủ hình ảnh, tên món, giá cơ bản, mô tả và số lượng tồn kho hiện có. | **Must** | - Gọi `GET /products/:id` với ID hợp lệ trả về HTTP `200` và thông tin chi tiết món.<br>- Gọi với ID không tồn tại trả về HTTP `404 Not Found`. |
| **FR-05** | **Tùy chỉnh kích cỡ (Size) và Topping** | Trên màn hình chi tiết món, người dùng bắt buộc chọn 1 kích cỡ (`Size S` +0đ, `Size M` +6.000đ, `Size L` +12.000đ) và có thể chọn thêm 0..N topping (`Trân châu hoàng kim` +8.000đ, `Kem Macchiato phô mai` +12.000đ, `Thêm 1 Shot Espresso` +10.000đ, `Thạch cà phê giòn` +8.000đ). | **Must** | - Mặc định chọn `Size M` khi mở chi tiết sản phẩm.<br>- Mỗi lần thay đổi Size hoặc tích/bỏ Topping, đơn giá và thành tiền tạm tính cập nhật tức thì theo công thức: `(giá gốc + phụ thu size + tổng giá topping) × số lượng`. |
| **FR-06** | **Chọn số lượng giới hạn theo tồn kho** | Người dùng có thể tăng/giảm hoặc nhập số lượng ly cần mua (`qty >= 1`), hệ thống không cho phép chọn vượt quá tồn kho hiện tại (`stock`). | **Must** | - Nút giảm bị chặn tại giá trị tối thiểu `1`.<br>- Số lượng nhập hoặc tăng không thể vượt quá `product.stock`. |

### 3.3. Nhóm 3: Giỏ hàng

| Mã | Tên yêu cầu | Mô tả chi tiết | Ưu tiên (MoSCoW) | Tiêu chí chấp nhận (Acceptance Criteria) |
| :--- | :--- | :--- | :--- | :--- |
| **FR-07** | **Thao tác thêm, sửa, xóa mục trong giỏ hàng** | Người dùng có thể thêm món đã tùy chỉnh vào ngăn kéo giỏ hàng (`CartDrawer`), tăng/giảm số lượng hoặc xóa từng mục; các mục trùng `(productId, size, toppings)` tự động cộng dồn số lượng. | **Must** | - Thêm cùng một món với cùng Size và Topping sẽ tăng `qty` của mục hiện có thay vì tạo dòng trùng.<br>- Badge trên nút *Giỏ hàng* ở Navbar luôn hiển thị đúng tổng số lượng ly hiện có (`getTotalCount()`). |
| **FR-08** | **Tính tổng tạm tính trong giỏ hàng** | Ngăn kéo giỏ hàng (`CartDrawer`) tự động tính thành tiền từng dòng (`lineTotal = unitPrice × qty`) và tổng tạm tính (`subtotal`) của toàn bộ món trong giỏ trước khi chuyển sang trang thanh toán (`/checkout`). | **Must** | - Khi thay đổi số lượng hoặc xóa món trong giỏ, `lineTotal` và `subtotal` (`Tổng tạm tính`) cập nhật chính xác ngay lập tức.<br>- Khi giỏ hàng trống, nút chuyển sang trang `/checkout` bị ẩn và hiển thị thông báo *"Giỏ hàng đang trống"*. |
| **FR-09** | **Lưu trữ giỏ hàng bền vững theo tài khoản** | Giỏ hàng được lưu trên `localStorage` tách biệt theo từng định danh người dùng (`userKey`) và tự động gộp các món chọn lúc chưa đăng nhập (`guest`) vào giỏ của tài khoản khi đăng nhập thành công. | **Should** | - Tải lại trang (F5) không làm mất các món đã chọn trong giỏ hàng.<br>- Đăng xuất sẽ ẩn giỏ của tài khoản cũ; đăng nhập lại tài khoản đó sẽ khôi phục đúng giỏ hàng đã lưu. |

### 3.4. Nhóm 4: Xác thực

| Mã | Tên yêu cầu | Mô tả chi tiết | Ưu tiên (MoSCoW) | Tiêu chí chấp nhận (Acceptance Criteria) |
| :--- | :--- | :--- | :--- | :--- |
| **FR-10** | **Đăng ký tài khoản mới** | Người dùng đăng ký tài khoản qua `POST /auth/register` với `email` hợp lệ và `password` tối thiểu 6 ký tự; mật khẩu được băm bằng `bcrypt` trước khi lưu DB. | **Must** | - Dữ liệu hợp lệ trả về HTTP `201` với `{ id, email, loyaltyPoints: 0 }`.<br>- Email đã tồn tại trả về HTTP `409 Conflict`; email sai định dạng hoặc mật khẩu `< 6` ký tự trả về HTTP `400 Bad Request`. |
| **FR-11** | **Đăng nhập và cấp phát JWT** | Người dùng đăng nhập qua `POST /auth/login` với `email` và `password` để nhận `accessToken` chuẩn JWT (thời hạn 7 ngày) và thông tin hồ sơ người dùng. | **Must** | - Thông tin đúng trả về HTTP `200` gồm `accessToken` và đối tượng `user`.<br>- Sai email hoặc sai mật khẩu trả về HTTP `401 Unauthorized`. |
| **FR-12** | **Kiểm soát truy cập bằng JWT Guard & Role** | Các endpoint nghiệp vụ (`/orders`, `/orders/me`, `/orders/:id/status`, `/payments`) bắt buộc đính kèm `Authorization: Bearer <token>` và kiểm tra quyền sở hữu / vai trò (`CUSTOMER`, `BARISTA`, `ADMIN`). | **Must** | - Gọi các API được bảo vệ mà thiếu hoặc sai token trả về HTTP `401 Unauthorized`.<br>- Khách hàng thao tác trên đơn hàng của người dùng khác hoặc gọi chuyển trạng thái pha chế trả về HTTP `403 Forbidden`. |

### 3.5. Nhóm 5: Đặt đơn

| Mã | Tên yêu cầu | Mô tả chi tiết | Ưu tiên (MoSCoW) | Tiêu chí chấp nhận (Acceptance Criteria) |
| :--- | :--- | :--- | :--- | :--- |
| **FR-13** | **Khởi tạo đơn hàng trạng thái PENDING** | Tại trang `/checkout`, khách hàng đã đăng nhập gửi yêu cầu `POST /orders` gồm danh sách món (`productId`, `size`, `toppings`, `qty`) và mã khuyến mãi tùy chọn (`couponCode`); hệ thống kiểm tra dữ liệu, tính lại giá tại Backend và tạo đơn ở trạng thái `PENDING`. | **Must** | - Payload hợp lệ và đủ tồn kho trả về HTTP `201` với đơn hàng có `status = "PENDING"`, chi tiết `items` và tổng tiền `total` được tính chuẩn xác tại Backend.<br>- Danh sách `items` rỗng hoặc `qty < 1` trả về HTTP `400 Bad Request`. |
| **FR-14** | **Áp dụng mã khuyến mãi và tính tổng thanh toán tại trang Checkout** | Trên trang `/checkout` (cùng màn hình với phương thức thanh toán) và trong API `POST /orders`, hỗ trợ nhập và áp dụng mã khuyến mãi: `BREWLITE10` (giảm 10% tổng tạm tính), `GIAM10K` (giảm trực tiếp 10.000đ), `SGU2026` (giảm 20% tổng tạm tính), tự động tính tiền giảm (`discount`) và tổng thanh toán (`total = max(0, subtotal - discount)`). | **Must** | - Mã hợp lệ được hiển thị ngay ở mục *Tóm tắt đơn hàng* trên trang `/checkout` và được Backend trừ đúng mức chiết khấu vào `discount`, `total`.<br>- Mã không tồn tại trả về thông báo lỗi ở Frontend và HTTP `400 Bad Request` (*"Mã giảm giá không hợp lệ"*) tại Backend. |
| **FR-15** | **Kiểm soát tồn kho nguyên tử khi đặt đồng thời** | Khi tạo đơn, hệ thống thực hiện trong `prisma.$transaction` và dùng **Optimistic Locking** (`Product.version`) để trừ tồn kho (`stock`), ngăn chặn bán vượt tồn kho khi nhiều yêu cầu gửi đồng thời. | **Must** | - Khi sản phẩm còn `stock = 1` và có 2 yêu cầu đặt mua cùng lúc, chỉ 1 yêu cầu tạo đơn thành công (`201`), yêu cầu còn lại bị từ chối (`409 Conflict` hoặc `400 Bad Request`) và `stock` sau cùng bằng `0` (không âm). |

### 3.6. Nhóm 6: Thanh toán

| Mã | Tên yêu cầu | Mô tả chi tiết | Ưu tiên (MoSCoW) | Tiêu chí chấp nhận (Acceptance Criteria) |
| :--- | :--- | :--- | :--- | :--- |
| **FR-16** | **Thanh toán không tiền mặt mô phỏng** | Khách hàng thanh toán đơn hàng qua `POST /payments` với phương thức Ví điện tử (`WALLET` – mã QR MoMo) hoặc Thẻ/Chuyển khoản ngân hàng (`CARD` – mã VietQR); khi thành công, bản ghi `Payment` có `status = "SUCCESS"` và đơn chuyển sang `PAID`. | **Must** | - Thanh toán thành công trả về HTTP `201`, lưu bản ghi `Payment` với đúng `amount = order.total`, `method` và cập nhật `Order.status = "PAID"`. |
| **FR-17** | **Đảm bảo tính bất biến thanh toán (Idempotency)** | Yêu cầu `POST /payments` bắt buộc truyền header `Idempotency-Key`. Nếu client gửi lặp lại cùng `Idempotency-Key` cho cùng đơn hàng và người dùng, hệ thống trả về kết quả đã xử lý trước đó mà không tạo giao dịch mới. | **Must** | - Thiếu header `Idempotency-Key` trả về HTTP `400 Bad Request`.<br>- Gửi 2 lần cùng `Idempotency-Key` cho cùng `orderId` chỉ tạo đúng `1` bản ghi trong bảng `Payment`, cộng điểm thưởng đúng `1` lần và lần gọi thứ 2 trả về `idempotentReplay: true`.<br>- Dùng lại `Idempotency-Key` cho đơn hàng hoặc user khác trả về HTTP `400 Bad Request`. |
| **FR-18** | **Xử lý thanh toán thất bại & Tích điểm Loyalty** | - Khi giao dịch thất bại (mô phỏng lỗi `simulateFailure` ở môi trường non-production), đơn chuyển sang `PAYMENT_FAILED`, giữ nguyên giỏ hàng và cho phép thử lại thanh toán hoặc hủy đơn hoàn kho.<br>- Khi thanh toán thành công (`PAID`), tự động cộng điểm tích lũy cho khách hàng theo tỷ lệ `10.000đ = 1 điểm` (`Math.floor(order.total / 10000)`). | **Must** | - Thanh toán thất bại chuyển `Order.status = "PAYMENT_FAILED"`, tồn kho tạm giữ không bị trừ thêm, giỏ hàng không bị xóa và hiển thị tùy chọn thử lại hoặc hủy đơn.<br>- Đơn `81.000đ` thanh toán thành công cộng chính xác `+8` vào `User.loyaltyPoints`. |

### 3.7. Nhóm 7: Lịch sử đơn

| Mã | Tên yêu cầu | Mô tả chi tiết | Ưu tiên (MoSCoW) | Tiêu chí chấp nhận (Acceptance Criteria) |
| :--- | :--- | :--- | :--- | :--- |
| **FR-19** | **Xem danh sách lịch sử đơn hàng cá nhân** | Hệ thống cung cấp API `GET /orders/me` và trang `/orders` hiển thị toàn bộ đơn hàng của người dùng đang đăng nhập, sắp xếp theo thời gian tạo mới nhất trước. | **Must** | - Gọi `GET /orders/me` chỉ trả về các đơn thuộc `req.user.userId`, kèm danh sách `items` và `payments`.<br>- Khi người dùng chưa có đơn nào, trang `/orders` hiển thị trạng thái rỗng kèm nút quay lại đặt món. |
| **FR-20** | **Xem chi tiết và tiến độ một đơn hàng** | Trang `/orders/[id]` hiển thị thông tin chi tiết đơn hàng gồm mã đơn, danh sách đồ uống (size, topping, số lượng, thành tiền), tổng tiền, trạng thái hiện tại và thanh tiến trình 5 bước (`PENDING` $\rightarrow$ `PAID` $\rightarrow$ `PREPARING` $\rightarrow$ `READY` $\rightarrow$ `COMPLETED`). | **Must** | - Truy cập `/orders/[id]` của đơn đã đặt hiển thị chính xác trạng thái và các món trong đơn.<br>- Nếu đơn ở trạng thái `PAYMENT_FAILED`, màn hình hiển thị nút *Thử lại thanh toán* và *Hủy đơn & Hoàn tồn kho*. |

### 3.8. Nhóm 8: Quản lý trạng thái đơn

| Mã | Tên yêu cầu | Mô tả chi tiết | Ưu tiên (MoSCoW) | Tiêu chí chấp nhận (Acceptance Criteria) |
| :--- | :--- | :--- | :--- | :--- |
| **FR-21** | **Kiểm soát vòng đời đơn qua Order State Machine** | API `PATCH /orders/:id/status` chỉ cho phép các bước chuyển trạng thái hợp lệ định nghĩa trong `order-state-machine.ts`:<br>- `PENDING` $\rightarrow$ `PAID` \| `PAYMENT_FAILED` \| `CANCELLED`<br>- `PAYMENT_FAILED` $\rightarrow$ `PENDING` \| `CANCELLED`<br>- `PAID` $\rightarrow$ `PREPARING` \| `CANCELLED`<br>- `PREPARING` $\rightarrow$ `READY`<br>- `READY` $\rightarrow$ `COMPLETED` | **Must** | - Các bước chuyển hợp lệ cập nhật thành công trạng thái đơn.<br>- Mọi thao tác chuyển sai quy tắc (ví dụ: `PENDING` $\rightarrow$ `READY`, `PREPARING` $\rightarrow$ `CANCELLED`, `COMPLETED` $\rightarrow$ `CANCELLED`) bị từ chối với HTTP `400 Bad Request`. |
| **FR-22** | **Tự động hoàn trả tồn kho khi hủy đơn (CANCELLED)** | Khi một đơn hàng hợp lệ được chuyển sang trạng thái `CANCELLED`, hệ thống tự động cộng trả số lượng (`qty`) của từng món trong đơn về lại `Product.stock` trong cùng một transaction. | **Must** | - Đơn mua 2 ly làm giảm tồn kho từ `5` xuống `3`; sau khi hủy đơn (`CANCELLED`), `Product.stock` của sản phẩm đó được hoàn lại thành `5`. |
| **FR-23** | **Giao diện quản trị pha chế & thực đơn cho Barista/Admin** | Cung cấp màn hình nội bộ cho phép `BARISTA` cập nhật trạng thái đơn đang pha chế và `ADMIN` quản lý danh mục, sản phẩm, tồn kho. | **Could** | - Tài khoản có `role = BARISTA` hoặc `ADMIN` có thể thao tác cập nhật trạng thái đơn trực tiếp trên giao diện mà không cần gọi API thủ công. |
| **FR-24** | **Thanh toán tiền mặt tại quầy và giao hàng tận nơi** | Hỗ trợ thu tiền mặt trực tiếp tại quầy và đặt giao hàng theo địa chỉ GPS. | **Won't** | - Không triển khai trong hệ thống BrewLite (xem mục Out-of-Scope trong `context-and-scope.md`). |

---

## 4. Đặc tả Yêu cầu Phi chức năng (Non-Functional Requirements)

### 4.1. Nhóm 9: Hiệu năng (Performance)

| Mã | Tên yêu cầu | Mô tả chi tiết | Ưu tiên (MoSCoW) | Tiêu chí chấp nhận (Acceptance Criteria) |
| :--- | :--- | :--- | :--- | :--- |
| **NFR-01** | **Thời gian phản hồi API đọc thực đơn** | Các API truy vấn danh sách và chi tiết sản phẩm (`GET /products`, `GET /products/:id`, `GET /products/categories`) phải phản hồi nhanh để đảm bảo trải nghiệm duyệt menu mượt mà. | **Must** | - Thời gian phản hồi trung vị (P50) `< 150ms` và P95 `< 300ms` trong điều kiện 50 người dùng truy cập đồng thời. |
| **NFR-02** | **Thời gian xử lý giao dịch & Khả năng chịu tải đồng thời** | Các API ghi dữ liệu (`POST /orders`, `POST /payments`) phải xử lý nhanh và đảm bảo tính đúng đắn khi có nhiều yêu cầu đồng thời trên cùng sản phẩm. | **Must** | - Thời gian phản hồi P95 `< 1.000ms` cho giao dịch tạo đơn và thanh toán.<br>- Hệ thống xử lý chính xác bài kiểm thử đồng thời (concurrency test) với nhiều request đặt cùng lúc mà không gây deadlock hoặc âm tồn kho. |
| **NFR-03** | **Tốc độ tải và hiển thị giao diện Web** | Ứng dụng Frontend Next.js tối ưu tài nguyên tĩnh và hình ảnh để hiển thị nhanh trên thiết bị di động. | **Should** | - Thời gian hiển thị nội dung đầu tiên (First Contentful Paint – FCP) `< 2.0s` trên kết nối mạng tiêu chuẩn. |

### 4.2. Nhóm 10: Bảo mật (Security)

| Mã | Tên yêu cầu | Mô tả chi tiết | Ưu tiên (MoSCoW) | Tiêu chí chấp nhận (Acceptance Criteria) |
| :--- | :--- | :--- | :--- | :--- |
| **NFR-04** | **Mã hóa mật khẩu người dùng** | Mật khẩu người dùng bắt buộc phải được băm một chiều bằng thuật toán `bcrypt` (tối thiểu 10 salt rounds) trước khi lưu xuống PostgreSQL. | **Must** | - Giá trị cột `User.passwordHash` trong DB là chuỗi hash `bcrypt`, không bao giờ lưu hoặc trả về mật khẩu gốc trong bất kỳ response API nào. |
| **NFR-05** | **Bảo mật phiên xác thực JWT & Kiểm tra quyền sở hữu** | API sử dụng JWT ký bằng khóa bí mật `JWT_SECRET` (hiệu lực 7 ngày), kiểm tra hợp lệ chữ ký/thời hạn và kiểm tra chặt chẽ quyền sở hữu đơn hàng (`order.userId === req.user.userId`) cùng phân quyền `Role`. | **Must** | - Token hết hạn hoặc bị chỉnh sửa chữ ký trả về HTTP `401 Unauthorized`.<br>- Người dùng vai trò `CUSTOMER` cố tình gửi `PATCH /orders/:id/status` với trạng thái khác `CANCELLED` (như `PAID` hoặc `COMPLETED`) bị từ chối với HTTP `403 Forbidden`. |
| **NFR-06** | **Bảo vệ thông tin bí mật & Hạ tầng Production** | Quản lý toàn bộ thông tin nhạy cảm (`DATABASE_URL`, `JWT_SECRET`) qua biến môi trường/CI Secrets; giới hạn CORS; vô hiệu hóa `simulateFailure` trên môi trường production; không public cổng DB ra ngoài. | **Must** | - Không có mật khẩu, chuỗi kết nối DB hoặc JWT secret thật nào được commit trong repository hoặc in ra log CI.<br>- Khi `NODE_ENV=production`, tham số `simulateFailure: true` luôn bị bỏ qua.<br>- Cổng PostgreSQL (`5432`) trên production chỉ cho phép kết nối nội bộ từ Backend container/service. |

### 4.3. Nhóm 11: Tính khả dụng & Trải nghiệm người dùng (Usability & Availability)

| Mã | Tên yêu cầu | Mô tả chi tiết | Ưu tiên (MoSCoW) | Tiêu chí chấp nhận (Acceptance Criteria) |
| :--- | :--- | :--- | :--- | :--- |
| **NFR-07** | **Thiết kế Mobile-First Responsive** | Giao diện người dùng được thiết kế ưu tiên thiết bị di động (mobile-first) và tự động co giãn phù hợp trên nhiều kích thước màn hình. | **Must** | - Toàn bộ luồng từ trang chủ, chọn món, giỏ hàng, thanh toán đến lịch sử đơn hiển thị không vỡ bố cục, không tràn ngang trên viewport `375×812px` (mobile) và `1440×900px` (desktop). |
| **NFR-08** | **Xử lý trạng thái giao diện & Phục hồi lỗi thân thiện** | Giao diện hiển thị rõ ràng trạng thái đang tải (`Loading`), danh sách rỗng (`Empty`), thông báo lỗi tiếng Việt dễ hiểu (`Error`) và bảo toàn dữ liệu giỏ hàng khi thanh toán thất bại. | **Must** | - Khi API trả lỗi hoặc thanh toán thất bại, ứng dụng không bị trắng trang (crash), hiển thị thông báo lỗi cụ thể và giữ nguyên các món trong giỏ hàng để khách thử lại. |
| **NFR-09** | **Tính toàn vẹn dữ liệu giao dịch (ACID)** | Mọi thao tác cập nhật liên quan nhiều bảng (tạo đơn + trừ tồn kho; thanh toán + cập nhật đơn + cộng điểm; hủy đơn + hoàn kho) phải thực hiện trong database transaction. | **Should** | - Nếu một bước trong transaction thất bại, toàn bộ thay đổi trước đó được rollback hoàn toàn, không tồn tại đơn hàng thiếu `OrderItem` hoặc thanh toán thành công nhưng đơn vẫn ở trạng thái `PENDING`. |

### 4.4. Nhóm 12: Khả năng triển khai & Bảo trì (Deployability & Maintainability)

| Mã | Tên yêu cầu | Mô tả chi tiết | Ưu tiên (MoSCoW) | Tiêu chí chấp nhận (Acceptance Criteria) |
| :--- | :--- | :--- | :--- | :--- |
| **NFR-10** | **Đóng gói Container & Khởi chạy độc lập** | Hệ thống được đóng gói bằng `Dockerfile` (cho cả `apps/web` và `apps/api`) và điều phối qua `docker-compose.yml` để khởi chạy đầy đủ 3 dịch vụ (`postgres`, `backend`, `frontend`). | **Must** | - Một người dùng mới clone repository, tạo `.env` từ `.env.example` và chạy `docker compose up --build` có thể truy cập Web (`http://localhost:3000`) và API (`http://localhost:3001`) hoạt động đầy đủ. |
| **NFR-11** | **Tái tạo Database Migration & Idempotent Seed** | Cơ sở dữ liệu có cơ chế đồng bộ/migration schema Prisma và script `prisma/seed.ts` khởi tạo dữ liệu mẫu an toàn khi chạy nhiều lần. | **Must** | - Chạy `npm run db:seed` nhiều lần liên tiếp không tạo bản ghi danh mục, sản phẩm hoặc tài khoản mẫu bị trùng lặp. |
| **NFR-12** | **Tự động hóa CI/CD, Health Check & Triển khai HTTPS** | Hệ thống cung cấp endpoint kiểm tra sức khỏe (`GET /health`), tích hợp pipeline CI/CD chạy `Install → Lint → Test → Build → Deploy` và phục vụ phiên bản production qua giao thức HTTPS. | **Must** | - Pull Request có lỗi lint, test hoặc build bị pipeline CI chặn merge tự động.<br>- Phiên bản production truy cập được qua URL `HTTPS` công khai và endpoint health check trả về HTTP `200`. |
---
