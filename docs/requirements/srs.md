# BrewLite - Software Requirements Specification (SRS)

## 1. Yêu cầu chức năng

> **Chú thích.** MoSCoW: **Must** bắt buộc có trong MVP · **Should** quan trọng, làm nếu còn năng lực · **Could** mong muốn, chỉ làm khi Must/Should xong · **Won't** cố ý không làm. Cách kiểm chứng: **UT** unit test · **IT** integration test · **E2E** end-to-end test · **TC** kiểm tra thủ công hoặc đo đạc có ghi lại kết quả.

### 1.1 Menu và sản phẩm

| ID | Yêu cầu | MoSCoW | Tiêu chí chấp nhận | Kiểm chứng |
|---|---|---|---|---|
| FR-01 | Hệ thống hiển thị danh sách đồ uống gồm hình, tên, giá | Must | `GET /products` trả 200 và mảng sản phẩm (sắp xếp theo `id` tăng dần), mỗi phần tử có `id`, `name`, `price`, `imageUrl`, `stock`. UI hiển thị lưới sản phẩm kèm bộ lọc danh mục và ô tìm kiếm theo tên; có trạng thái *loading* (skeleton) khi chờ, *empty* ("Không tìm thấy đồ uống phù hợp") khi không có kết quả. | IT, UT |
| FR-02 | Hệ thống cho phép xem chi tiết một sản phẩm | Must | `GET /products/:id` với id tồn tại trả 200 kèm thông tin sản phẩm; id không tồn tại trả 404. Trên UI, chi tiết sản phẩm hiển thị dạng modal (không có trang riêng) khi bấm vào thẻ sản phẩm | IT |
| FR-03 | Khách chọn size (S/M/L) và topping, hệ thống tính giá theo lựa chọn | Must | **Giá hiển thị trên UI:** phụ thu size S +0đ, M +6.000đ, L +12.000đ; topping chọn nhiều, mỗi topping có giá riêng: Trân châu hoàng kim +8.000đ, Kem Macchiato phô mai +12.000đ, Thêm 1 Shot Espresso +10.000đ, Thạch cà phê giòn +8.000đ. Ví dụ Cappuccino (45.000đ) size L và 1 topping Trân châu: 45.000 + 12.000 + 8.000 = 65.000đ. Đổi lựa chọn thì giá cập nhật ngay, không cần tải lại trang.  | UT, E2E |

### 1.2 Giỏ hàng

| ID | Yêu cầu | MoSCoW | Tiêu chí chấp nhận | Kiểm chứng |
|---|---|---|---|---|
| FR-04 | Khách thêm, sửa số lượng, xóa món trong giỏ | Must | Thêm món: giỏ có thêm dòng, badge trên nút giỏ hàng hiển thị tổng số lượng, giỏ tự mở. Thêm lại cùng sản phẩm, size, topping thì tăng số lượng thay vì tạo dòng mới. Số lượng tối thiểu là 1 (giảm về 0 thì món bị xóa). ** Xóa món: dòng biến mất khỏi giỏ. Giỏ được lưu bền (`localStorage`, key `brewlite-cart-storage`) nên vẫn còn khi chuyển trang hoặc tải lại | UT, E2E |
| FR-05 | Hệ thống tự tính tổng tiền giỏ hàng | Must | Tạm tính = Σ(đơn giá × số lượng), cập nhật ngay khi giỏ thay đổi. Giỏ rỗng: drawer hiển thị "Giỏ hàng đang trống" và ẩn nút "Thanh toán"; trang `/checkout` hiển thị thông báo giỏ trống kèm liên kết quay lại menu | UT |

### 1.3 Xác thực

| ID | Yêu cầu | MoSCoW | Tiêu chí chấp nhận | Kiểm chứng |
|---|---|---|---|---|
| FR-06 | Hệ thống cho phép đăng ký tài khoản | Must | Email hợp lệ và mật khẩu ≥ **6** ký tự: `POST /auth/register` trả 201 kèm `id`, `email`, `loyaltyPoints`; phản hồi không chứa mật khẩu hay `passwordHash`. Email đã tồn tại trả **400** ("Email đã tồn tại"). Dữ liệu sai định dạng (email sai, mật khẩu < 6 ký tự) trả 400. Trong DB mật khẩu lưu dạng bcrypt hash. Response đăng ký không có JWT, nên frontend gọi tiếp `POST /auth/login` để lấy token. Frontend yêu cầu thêm ô xác nhận mật khẩu khi đăng ký | IT |
| FR-07 | Hệ thống cho phép đăng nhập và cấp JWT | Must | Đúng email và mật khẩu: `POST /auth/login` trả **201** (mặc định của NestJS cho `@Post`) kèm `accessToken` (JWT hiệu lực 7 ngày) và `user` gồm `id`, `email`, `loyaltyPoints`. Sai thông tin trả 401 với thông báo chung "Sai email hoặc mật khẩu", không tiết lộ email hay mật khẩu sai. Backend không trả trường `name`; frontend ở chế độ thật không có tên hiển thị | IT |
| FR-08 | Hệ thống bảo vệ các route cần đăng nhập bằng JWT | Must | Toàn bộ route của `OrdersController` (`POST /orders`, `GET /orders/me`, `PATCH /orders/:id/status`) và `POST /payments` không kèm token, token sai hoặc hết hạn đều trả 401. Token hợp lệ thì xử lý bình thường. Strategy kiểm tra thêm user còn tồn tại trong DB | IT |

### 1.4 Đặt đơn

| ID | Yêu cầu | MoSCoW | Tiêu chí chấp nhận | Kiểm chứng |
|---|---|---|---|---|
| FR-09 | Hệ thống tạo đơn hàng ở trạng thái PENDING và trả mã đơn | Must | Giỏ hợp lệ kèm JWT: `POST /orders` trả 201 với đối tượng đơn gồm `id` (mã đơn), `status = PENDING`, `total`, `discount`, `couponCode`, `items`. Body gửi lên chỉ gồm `items[{productId, size, toppings[], qty}]` và `couponCode` tùy chọn; `total` do server tính từ giá trong DB, không nhận giá từ client. Đơn thuộc về người dùng đang đăng nhập. Body sai (giỏ rỗng, `qty < 1`, `size` ngoài S/M/L, kiểu dữ liệu sai) trả 400 kèm chi tiết lỗi; `productId` không tồn tại trả **404** | IT |
| FR-10 | Hệ thống không cho bán vượt số lượng tồn kho | Must | Tồn kho được trừ ngay khi tạo đơn (tạm giữ) bằng transaction + optimistic locking (cột `version`, điều kiện `stock >= qty`). Sản phẩm `stock = 1`, hai request đặt đồng thời: đúng 1 request thành công (201), request còn lại bị từ chối; `stock` không bao giờ âm. Mã lỗi của request bị từ chối là **400** ("không đủ tồn kho") nếu nó đọc stock sau khi request kia commit, hoặc **409** ("xung đột dữ liệu") nếu xung đột khóa lạc quan | IT |
| FR-11 | Hệ thống áp mã khuyến mãi hợp lệ cho đơn | Should | `POST /orders` kèm `couponCode`. Backend hiện chấp nhận 2 mã **được hardcode**: `BREWLITE10` (giảm 10% tạm tính, làm tròn xuống) và `GIAM10K` (giảm 10.000đ). `total = max(0, tạm tính − giảm)`. Mã khác trả 400 "Mã giảm giá không hợp lệ" và đơn không được tạo (transaction rollback, tồn kho không bị trừ). Mỗi đơn áp tối đa 1 mã.  | UT, IT |

### 1.5 Thanh toán

| ID | Yêu cầu | MoSCoW | Tiêu chí chấp nhận | Kiểm chứng |
|---|---|---|---|---|
| FR-12 | Hệ thống thanh toán đơn bằng Ví hoặc Thẻ (mô phỏng) | Must | `POST /payments` với `orderId`, `method` ∈ {`WALLET`, `CARD`} và `simulateFailure` tùy chọn. Mock thành công: lưu Payment (`SUCCESS`, số tiền = `total` của đơn), đơn chuyển PENDING → PAID, trả 201. Đơn không tồn tại hoặc không thuộc người dùng trả 404; đơn ở trạng thái không cho phép chuyển sang PAID/PAYMENT_FAILED trả **400** (do `assertTransition`) | IT |
| FR-13 | Hệ thống xử lý thanh toán idempotent | Must | Header `Idempotency-Key` bắt buộc, thiếu trả 400. Gửi `POST /payments` lần hai cùng key: DB chỉ có đúng 1 bản ghi Payment, đơn chuyển trạng thái một lần, điểm thưởng cộng một lần; phản hồi lần hai trả lại payment và order đã lưu cùng cờ `idempotentReplay: true` (lần đầu là `false`). Key là duy nhất toàn bảng `Payment`.  | IT |
| FR-14 | Hệ thống xử lý thanh toán thất bại và cho phép thử lại | Must | Khi `simulateFailure = true` (cờ do client gửi, dùng cho demo): Payment ghi nhận `FAILED`, đơn chuyển PENDING → PAYMENT_FAILED. API vẫn trả **201** kèm `message = "Thanh toán thất bại"` và `order.status = PAYMENT_FAILED`; frontend dựa vào trạng thái này để báo lỗi và hiện modal "Thanh toán chưa thành công". Giỏ hàng phía client giữ nguyên, đơn giữ tồn kho. Khách có thể **thử lại** với `Idempotency-Key` mới (đơn PAYMENT_FAILED → PENDING, thành công thì → PAID) hoặc **hủy đơn** để hoàn kho | IT, E2E |
| FR-15 | Hệ thống cộng điểm thưởng sau khi đơn PAID | Should | Trong cùng transaction thanh toán thành công, `loyaltyPoints` của người dùng tăng `floor(total / 10.000)` với `total` là số tiền sau giảm giá. Thanh toán lặp cùng key không cộng thêm.| UT, IT |

### 1.6 Xác nhận, lịch sử và trạng thái đơn

| ID | Yêu cầu | MoSCoW | Tiêu chí chấp nhận | Kiểm chứng |
|---|---|---|---|---|
| FR-16 | Hệ thống hiển thị màn hình xác nhận sau thanh toán | Must | Thanh toán thành công: giỏ hàng được xóa và UI chuyển sang `/orders/:id`, hiển thị mã đơn (`#id`), trạng thái, thanh tiến trình các bước PENDING → COMPLETED và danh sách món. Thanh toán thất bại: modal báo lỗi kèm nút "Thử lại thanh toán", "Hủy đơn & hoàn tồn kho" và liên kết xem chi tiết đơn. Trang chi tiết đơn ở trạng thái PAYMENT_FAILED cũng có 2 nút này | E2E |
| FR-17 | Hệ thống cho xem lịch sử đơn của chính mình | Must | `GET /orders/me` chỉ trả đơn của người dùng đang đăng nhập, sắp xếp mới nhất trước (`createdAt` giảm dần), mỗi đơn kèm `id`, `status`, `total`, `createdAt`, danh sách `items` (kèm thông tin sản phẩm) và `payments`. Người dùng chưa có đơn nhận mảng rỗng và UI (`/orders`) hiển thị trạng thái *empty* | IT |
| FR-18 | Hệ thống quản lý trạng thái đơn bằng state machine | Must | Chỉ các chuyển tiếp sau được thực hiện: PENDING → PAID / PAYMENT_FAILED / CANCELLED; PAYMENT_FAILED → PENDING / CANCELLED; PAID → PREPARING / CANCELLED; PREPARING → READY; READY → COMPLETED. Mọi chuyển tiếp khác (ví dụ PENDING → READY, COMPLETED → PAID) bị chặn: trả **400** ("Chuyển trạng thái đơn hàng không hợp lệ từ X sang Y") và trạng thái đơn không đổi. COMPLETED và CANCELLED không chuyển tiếp được. Hiện unit test mới kiểm tra một số cặp tiêu biểu.| UT , IT |
| FR-19 | Khách hủy đơn theo quy tắc cơ bản | Could | Hủy qua `PATCH /orders/:id/status` với `{ "status": "CANCELLED" }`. Đơn ở PENDING, PAYMENT_FAILED hoặc PAID: hủy thành công → CANCELLED và tồn kho được hoàn lại đúng số lượng (tăng `version`). Đơn ở PREPARING, READY, COMPLETED: hủy bị chặn, trả **400**. Không hoàn tiền thực (xem FR-24) và không thu hồi điểm thưởng đã cộng của đơn PAID.  | IT |

### 1.7 Mở rộng (Could) và không thực hiện (Won't)

| ID | Yêu cầu | MoSCoW | Tiêu chí chấp nhận | Kiểm chứng |
|---|---|---|---|---|
| FR-20 | Giao diện barista nhận đơn và cập nhật trạng thái | Could | Barista chỉ thấy đơn từ trạng thái PAID trở đi; đổi lần lượt PAID → PREPARING → READY → COMPLETED qua giao diện; không bỏ qua được bước nào. **Hiện trạng:** chưa có giao diện barista và chưa có phân quyền theo vai trò | E2E |
| FR-21 | Thông báo trạng thái đơn thời gian thực cho khách | Could | Khi barista đổi trạng thái, trang theo dõi đơn của khách cập nhật trong ≤ 5 giây mà không cần tải lại. | TC |
| FR-22 | Giao diện quản trị sản phẩm, tồn kho, mã khuyến mãi | Could | Quản lý thêm/sửa sản phẩm, số lượng tồn và mã khuyến mãi qua giao diện; thay đổi hiển thị ngay trên menu của khách. | E2E |
| FR-23 | Dashboard doanh thu theo ngày | Could | Hiển thị số đơn và doanh thu theo ngày; số liệu bằng tổng các đơn PAID trở đi trong ngày đó. **Hiện trạng:** chưa hiện thực | IT |
| FR-24 | Tích hợp cổng thanh toán thật, hoàn tiền và đối soát | Won't | Hệ thống chỉ dùng cổng mô phỏng; không có endpoint hoặc màn hình hoàn tiền. Trang thanh toán có hiển thị ảnh QR MoMo/VietQR tĩnh chỉ mang tính minh họa, không có đối soát tự động; người dùng phải bấm "Xác nhận trả" để hoàn tất. Xác nhận bằng review phạm vi | TC |
| FR-25 | Giao hàng tận nơi, ứng dụng native, nhiều chi nhánh | Won't | Không có chức năng giao hàng, không có ứng dụng iOS/Android, dữ liệu chỉ một cửa hàng. Xác nhận bằng review phạm vi | TC |


---

## 2. Yêu cầu phi chức năng

| ID | Nhóm | Yêu cầu | MoSCoW | Tiêu chí chấp nhận (đo được) | Kiểm chứng |
|---|---|---|---|---|---|
| NFR-01 | Hiệu năng | Thời gian phản hồi API | Must | p95 < 500 ms cho `GET /products`, `POST /orders`, `POST /payments` với dữ liệu mẫu (≥ 100 request, 10 kết nối đồng thời); lưu kết quả đo vào `docs/`. | TC (k6/autocannon) |
| NFR-02 | Bảo mật | Băm mật khẩu và JWT | Must | Mật khẩu lưu bcrypt (cost = 10), không có plaintext trong DB; JWT hết hạn sau **7 ngày**, ký bằng `JWT_SECRET`.| IT, TC |
| NFR-03 | Bảo mật | Validate dữ liệu đầu vào | Must | Backend dùng `ValidationPipe` toàn cục (`whitelist`, `transform`); các endpoint `auth`, `orders` (tạo đơn), `payments` dùng DTO class-validator, dữ liệu sai trả 400. UI validate mật khẩu ≥ 6 ký tự và khớp xác nhận ở form đăng ký/đăng nhập | IT |
| NFR-04 | Bảo mật | Quản lý secret | Must | Repo chỉ có `.env.example` không chứa giá trị thật; quét lịch sử commit không thấy secret; CI dùng secret store; database production không public. **⚠ Hiện có chuỗi bí mật mặc định `brewlite-super-secret-key-2026` hardcode** trong `auth.module.ts` và `jwt.strategy.ts` (dùng khi thiếu `JWT_SECRET`); cần loại bỏ trước khi triển khai production | TC |
| NFR-05 | Tính khả dụng (dễ dùng) | Giao diện mobile-first, PWA | Won't | Bố cục hiển thị đúng ở chiều rộng 360 px, không cuộn ngang; có web manifest hợp lệ và cài được lên màn hình chính.  | TC |
| NFR-06 | Tính khả dụng (dễ dùng) | Số thao tác đặt hàng | Must | Khách đã đăng nhập đặt và thanh toán 1 món (size mặc định, không topping) trong ≤ 5 lần chạm kể từ màn hình menu. Luồng hiện tại: chọn món → thêm vào giỏ → thanh toán trong drawer → xác nhận trả (4 lần chạm). Lưu ý size mặc định trên UI là **M** | TC (đếm khi demo) |
| NFR-07 | Tính khả dụng (dễ dùng) | Trình duyệt hỗ trợ | Must | Luồng menu → giỏ → thanh toán → xác nhận chạy đúng trên Chrome, Safari, Edge bản gần đây | TC |
| NFR-08 | Tính khả dụng (sẵn sàng) | Health check | Could | `GET /health` trả 200 khi API và DB hoạt động; trả 503 khi không kết nối được DB.  | IT |
| NFR-09 | Toàn vẹn dữ liệu | Transaction khi tạo đơn và trừ kho | Must | Tạo đơn, trừ kho, áp mã giảm giá nằm trong một `$transaction`; lỗi giữa chừng thì rollback toàn bộ: không có đơn không có OrderItem, không có tồn kho bị trừ mà không có đơn. Thanh toán và hủy đơn (hoàn kho) cũng chạy trong transaction | IT |
| NFR-10 | Khả năng triển khai | Chạy bằng Docker Compose | Must | Người ngoài nhóm clone repo, làm theo README và chạy được web, API, DB ở local bằng `docker compose up`, trong ≤ 15 phút.  | TC |
| NFR-11 | Khả năng triển khai | CI/CD và rollback | Must | CI chạy Install → Lint → Test → Build trên mỗi PR, PR lỗi không merge được. CD chạy Lint/Test → Build image → Push → Deploy → Smoke test; lỗi thì dừng. `docs/deployment.md` có hướng dẫn rollback. | TC |
| NFR-12 | Khả năng triển khai | Migration và seed | Must | Chạy migration và seed trên DB trống tạo đúng cấu trúc và dữ liệu menu mẫu; chạy lại không gây lỗi. | TC, IT |
| NFR-13 | Khả năng kiểm thử | Kiểm thử nghiệp vụ lõi | Should | Hiện có `task10.spec.ts` kiểm thử trực tiếp ở tầng service với DB thật: state machine (một số cặp), hoàn kho khi hủy, idempotency kèm điểm thưởng, đặt đồng thời khi `stock = 1`. integration test qua HTTP (401/400/404/409) và E2E từ menu đến xác nhận đơn; chưa chạy trong CI. Lưu ý test dọn sạch các bảng `payment`, `orderItem`, `order`, `product`, `user` nên chỉ chạy trên DB test | UT, IT, E2E |
| NFR-14 | Khả năng bảo trì | Logging | Could | Mỗi request có một dòng log gồm method, path, status, thời gian xử lý; log không chứa mật khẩu, token hay thông tin thanh toán.| TC |
| NFR-15 | Tính khả dụng (dễ dùng) | Hoạt động khi mất mạng | Could | Mất mạng thì giao diện đã tải vẫn hiển thị khung ứng dụng và thông báo "không có kết nối"; không hỗ trợ đặt đơn khi offline.  | TC |
| NFR-16 | Hiệu năng | Khả năng mở rộng quy mô lớn | Won't | Không đặt yêu cầu về hàng nghìn người dùng đồng thời hay mở rộng ngang; chỉ kiểm chứng tải ở mức NFR-01 | TC |

---

