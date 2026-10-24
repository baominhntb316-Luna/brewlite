# BrewLite - Software Requirements Specification (SRS) 
## 1. Yêu cầu chức năng

> **Chú thích.** MoSCoW: **Must** bắt buộc có trong MVP · **Should** quan trọng, làm nếu còn năng lực · **Could** mong muốn, chỉ làm khi Must/Should xong · **Won't** cố ý không làm. Cách kiểm chứng: **UT** unit test · **IT** integration test · **E2E** end-to-end test · **TC** kiểm tra thủ công hoặc đo đạc có ghi lại kết quả.

### 1.1 Menu và sản phẩm

| ID | Yêu cầu | MoSCoW | Tiêu chí chấp nhận | Kiểm chứng |
|---|---|---|---|---|
| FR-01 | Hệ thống hiển thị danh sách đồ uống gồm hình, tên, giá | Must | `GET /products` trả 200 và mảng sản phẩm, mỗi phần tử có `id`, `name`, `price`, `imageUrl`. UI hiển thị lưới sản phẩm; có trạng thái *loading* khi chờ, *empty* khi mảng rỗng, *error* (kèm nút thử lại) khi API lỗi | IT, UT |
| FR-02 | Hệ thống cho phép xem chi tiết một sản phẩm | Must | `GET /products/:id` với id tồn tại trả 200 kèm thông tin sản phẩm; id không tồn tại trả 404 | IT |
| FR-03 | Khách chọn size (S/M/L) và topping, hệ thống tính giá theo lựa chọn | Must | Phụ thu size: S +0đ, M +5.000đ, L +10.000đ; mỗi topping +5.000đ. Ví dụ Cappuccino (45.000đ) chọn size L và 1 topping hiển thị 45.000 + 10.000 + 5.000 = 60.000đ. Đổi lựa chọn thì giá cập nhật ngay, không cần tải lại trang | UT, E2E |

### 1.2 Giỏ hàng

| ID | Yêu cầu | MoSCoW | Tiêu chí chấp nhận | Kiểm chứng |
|---|---|---|---|---|
| FR-04 | Khách thêm, sửa số lượng, xóa món trong giỏ | Must | Thêm món: giỏ có thêm dòng và badge tăng đúng số lượng. Thêm lại cùng sản phẩm, size, topping thì tăng số lượng thay vì tạo dòng mới. Số lượng hợp lệ từ 1 đến 99. Xóa món: dòng biến mất khỏi giỏ. Giỏ vẫn còn khi chuyển trang | UT, E2E |
| FR-05 | Hệ thống tự tính tổng tiền giỏ hàng | Must | Tổng = Σ(đơn giá × số lượng), cập nhật ngay khi giỏ thay đổi. Giỏ rỗng thì nút "Thanh toán" bị ẩn hoặc vô hiệu hóa | UT |

### 1.3 Xác thực

| ID | Yêu cầu | MoSCoW | Tiêu chí chấp nhận | Kiểm chứng |
|---|---|---|---|---|
| FR-06 | Hệ thống cho phép đăng ký tài khoản | Must | Email hợp lệ và mật khẩu ≥ 8 ký tự: `POST /auth/register` trả 201, phản hồi không chứa mật khẩu hay `passwordHash`. Email đã tồn tại trả 409. Dữ liệu sai định dạng trả 400. Trong DB mật khẩu lưu dạng bcrypt hash | IT |
| FR-07 | Hệ thống cho phép đăng nhập và cấp JWT | Must | Đúng email và mật khẩu: `POST /auth/login` trả 200 kèm JWT có thời hạn. Sai thông tin trả 401 và thông báo không tiết lộ email hay mật khẩu sai | IT |
| FR-08 | Hệ thống bảo vệ các route cần đăng nhập bằng JWT | Must | `POST /orders`, `POST /payments`, `GET /orders/me` không kèm token, token sai hoặc hết hạn đều trả 401. Token hợp lệ thì xử lý bình thường | IT |

### 1.4 Đặt đơn

| ID | Yêu cầu | MoSCoW | Tiêu chí chấp nhận | Kiểm chứng |
|---|---|---|---|---|
| FR-09 | Hệ thống tạo đơn hàng ở trạng thái PENDING và trả mã đơn | Must | Giỏ hợp lệ kèm JWT: `POST /orders` trả 201 với `orderId`, `status = PENDING`, `total` do server tính từ giá trong DB (bỏ qua giá client gửi). Đơn thuộc về người dùng đang đăng nhập. Body sai (giỏ rỗng, `qty ≤ 0`, `productId` không tồn tại) trả 400 kèm chi tiết lỗi | IT |
| FR-10 | Hệ thống không cho bán vượt số lượng tồn kho | Must | Sản phẩm `stock = 1`, hai request đặt đồng thời: đúng 1 request thành công (201), request còn lại trả 409 nêu sản phẩm hết hàng; `stock` không bao giờ âm. Tồn kho được trừ khi tạo đơn | IT |
| FR-11 | Hệ thống áp mã khuyến mãi hợp lệ cho đơn | Should | `POST /orders` kèm `promoCode` hợp lệ (còn hạn, đủ điều kiện): `total` = tổng trước giảm − giá trị giảm (theo phần trăm hoặc số tiền cố định của mã), không âm. Mã sai, hết hạn hoặc không đủ điều kiện trả 400 kèm lý do, đơn không bị tạo. Mỗi đơn áp tối đa 1 mã | UT, IT |

### 1.5 Thanh toán

| ID | Yêu cầu | MoSCoW | Tiêu chí chấp nhận | Kiểm chứng |
|---|---|---|---|---|
| FR-12 | Hệ thống thanh toán đơn bằng Ví hoặc Thẻ (mô phỏng) | Must | `POST /payments` với `orderId` và `method` ∈ {`WALLET`, `CARD`}. Mock thành công: lưu Payment, đơn chuyển PENDING → PAID. Đơn không thuộc người dùng trả 404; đơn không ở trạng thái PENDING trả 409 | IT |
| FR-13 | Hệ thống xử lý thanh toán idempotent | Must | Gửi `POST /payments` hai lần cùng `Idempotency-Key`: DB chỉ có đúng 1 bản ghi Payment, đơn chuyển PAID một lần, hai phản hồi có cùng kết quả. Thiếu header `Idempotency-Key` trả 400 | IT |
| FR-14 | Hệ thống xử lý thanh toán thất bại và cho phép thử lại | Must | Mock trả lỗi: Payment ghi nhận thất bại, đơn chuyển PENDING → PAYMENT_FAILED, API trả lỗi thanh toán, giỏ hàng phía client giữ nguyên. Khách thử lại với `Idempotency-Key` mới: đơn PAYMENT_FAILED → PENDING, nếu thành công thì → PAID | IT, E2E |
| FR-15 | Hệ thống cộng điểm thưởng sau khi đơn PAID | Should | Đơn PAID tạo đúng 1 `LoyaltyTransaction`; `loyaltyPoints` của người dùng tăng `floor(total / 10.000)` với `total` là số tiền sau giảm giá. Gọi lại hoặc thanh toán lặp không cộng thêm điểm | UT, IT |

### 1.6 Xác nhận, lịch sử và trạng thái đơn

| ID | Yêu cầu | MoSCoW | Tiêu chí chấp nhận | Kiểm chứng |
|---|---|---|---|---|
| FR-16 | Hệ thống hiển thị màn hình xác nhận sau thanh toán | Must | Thanh toán thành công: UI hiển thị mã đơn (`#orderId`) và trạng thái PAID, giỏ hàng được xóa. Thanh toán thất bại: UI hiển thị thông báo lỗi và nút thử lại | E2E |
| FR-17 | Hệ thống cho xem lịch sử đơn của chính mình | Must | `GET /orders/me` chỉ trả đơn của người dùng đang đăng nhập, sắp xếp mới nhất trước, mỗi đơn có mã, trạng thái, tổng tiền, thời gian tạo. Người dùng chưa có đơn nhận mảng rỗng và UI hiển thị trạng thái *empty* | IT |
| FR-18 | Hệ thống quản lý trạng thái đơn bằng state machine | Must | Chỉ các chuyển tiếp sau được thực hiện: PENDING → PAID / PAYMENT_FAILED / CANCELLED; PAYMENT_FAILED → PENDING / CANCELLED; PAID → PREPARING / CANCELLED; PREPARING → READY; READY → COMPLETED. Mọi chuyển tiếp khác (ví dụ PENDING → READY, COMPLETED → PAID) bị chặn: trả 409 và trạng thái đơn không đổi. COMPLETED và CANCELLED không chuyển tiếp được | UT (phủ mọi cặp trạng thái), IT |
| FR-19 | Khách hủy đơn theo quy tắc cơ bản | Should | Đơn ở PENDING, PAYMENT_FAILED hoặc PAID: hủy thành công → CANCELLED và tồn kho được hoàn lại đúng số lượng. Đơn ở PREPARING, READY, COMPLETED: hủy bị chặn, trả 409. Không có hoàn tiền thực (xem FR-24) | IT |

### 1.7 Mở rộng (Could) và không thực hiện (Won't)

| ID | Yêu cầu | MoSCoW | Tiêu chí chấp nhận | Kiểm chứng |
|---|---|---|---|---|
| FR-20 | Giao diện barista nhận đơn và cập nhật trạng thái | Could | Barista chỉ thấy đơn từ trạng thái PAID trở đi; đổi lần lượt PAID → PREPARING → READY → COMPLETED qua giao diện; không bỏ qua được bước nào | E2E |
| FR-21 | Thông báo trạng thái đơn thời gian thực cho khách | Could | Khi barista đổi trạng thái, trang theo dõi đơn của khách cập nhật trong ≤ 5 giây mà không cần tải lại | TC |
| FR-22 | Giao diện quản trị sản phẩm, tồn kho, mã khuyến mãi | Could | Quản lý thêm/sửa sản phẩm, số lượng tồn và mã khuyến mãi qua giao diện; thay đổi hiển thị ngay trên menu của khách | E2E |
| FR-23 | Dashboard doanh thu theo ngày | Could | Hiển thị số đơn và doanh thu theo ngày; số liệu bằng tổng các đơn PAID trở đi trong ngày đó | IT |
| FR-24 | Tích hợp cổng thanh toán thật, hoàn tiền và đối soát | Won't | Hệ thống chỉ dùng cổng mô phỏng; không có endpoint hoặc màn hình hoàn tiền. Xác nhận bằng review phạm vi | TC |
| FR-25 | Giao hàng tận nơi, ứng dụng native, nhiều chi nhánh | Won't | Không có chức năng giao hàng, không có ứng dụng iOS/Android, dữ liệu chỉ một cửa hàng. Xác nhận bằng review phạm vi | TC |


---

## 2. Yêu cầu phi chức năng

| ID | Nhóm | Yêu cầu | MoSCoW | Tiêu chí chấp nhận (đo được) | Kiểm chứng |
|---|---|---|---|---|---|
| NFR-01 | Hiệu năng | Thời gian phản hồi API | Must | p95 < 500 ms cho `GET /products`, `POST /orders`, `POST /payments` với dữ liệu mẫu (≥ 100 request, 10 kết nối đồng thời); lưu kết quả đo vào `docs/` | TC (k6/autocannon) |
| NFR-02 | Bảo mật | Băm mật khẩu và JWT | Must | Mật khẩu lưu bcrypt (cost ≥ 10), không có plaintext trong DB; JWT có thời hạn [CẦN ĐIỀN: ví dụ 1 giờ]; mật khẩu và token không xuất hiện trong log | IT, TC |
| NFR-03 | Bảo mật | Validate dữ liệu đầu vào | Must | Mọi endpoint nhận body dùng DTO có class-validator; dữ liệu sai trả 400 chứ không phải 500; UI validate cơ bản ở form đăng ký/đăng nhập | IT |
| NFR-04 | Bảo mật | Quản lý secret | Must | Repo chỉ có `.env.example` không chứa giá trị thật; quét lịch sử commit không thấy secret; CI dùng secret store; database production không public | TC |
| NFR-05 | Tính khả dụng (dễ dùng) | Giao diện mobile-first, PWA | Must | Bố cục hiển thị đúng ở chiều rộng 360 px, không cuộn ngang; có web manifest hợp lệ và cài được lên màn hình chính | TC |
| NFR-06 | Tính khả dụng (dễ dùng) | Số thao tác đặt hàng | Must | Khách đã đăng nhập đặt và thanh toán 1 món (size mặc định, không topping) trong ≤ 5 lần chạm kể từ màn hình menu | TC (đếm khi demo) |
| NFR-07 | Tính khả dụng (dễ dùng) | Trình duyệt hỗ trợ | Must | Luồng menu → giỏ → thanh toán → xác nhận chạy đúng trên Chrome, Safari, Edge bản gần đây | TC |
| NFR-08 | Tính khả dụng (sẵn sàng) | Health check | Must | `GET /health` trả 200 khi API và DB hoạt động; trả 503 khi không kết nối được DB | IT |
| NFR-09 | Toàn vẹn dữ liệu | Transaction khi tạo đơn và trừ kho | Must | Lỗi xảy ra giữa chừng thì rollback toàn bộ: không có đơn không có OrderItem, không có tồn kho bị trừ mà không có đơn | IT |
| NFR-10 | Khả năng triển khai | Chạy bằng Docker Compose | Must | Người ngoài nhóm clone repo, làm theo README và chạy được web, API, DB ở local bằng `docker compose up`, trong ≤ 15 phút | TC |
| NFR-11 | Khả năng triển khai | CI/CD và rollback | Must | CI chạy Install → Lint → Test → Build trên mỗi PR, PR lỗi không merge được. CD chạy Lint/Test → Build image → Push → Deploy → Smoke test; lỗi thì dừng. `docs/deployment.md` có hướng dẫn rollback | TC |
| NFR-12 | Khả năng triển khai | Migration và seed | Must | Chạy migration và seed trên DB trống tạo đúng cấu trúc và dữ liệu menu mẫu; chạy lại không gây lỗi | TC, IT |
| NFR-13 | Khả năng kiểm thử | Kiểm thử nghiệp vụ lõi | Should | Có unit test cho state machine, integration test cho tạo đơn/thanh toán (gồm idempotency và đặt đồng thời), ≥ 1 E2E từ menu đến xác nhận đơn; toàn bộ chạy trong CI | UT, IT, E2E |
| NFR-14 | Khả năng bảo trì | Logging | Should | Mỗi request có một dòng log gồm method, path, status, thời gian xử lý; log không chứa mật khẩu, token hay thông tin thanh toán | TC |
| NFR-15 | Tính khả dụng (dễ dùng) | Hoạt động khi mất mạng | Could | Mất mạng thì giao diện đã tải vẫn hiển thị khung ứng dụng và thông báo "không có kết nối"; không hỗ trợ đặt đơn khi offline | TC |
| NFR-16 | Hiệu năng | Khả năng mở rộng quy mô lớn | Won't | Không đặt yêu cầu về hàng nghìn người dùng đồng thời hay mở rộng ngang; chỉ kiểm chứng tải ở mức NFR-01 | TC |

