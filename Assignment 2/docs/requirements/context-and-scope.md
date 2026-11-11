# Tài liệu Bối cảnh, Stakeholder và Phạm vi Dự án (Context & Scope)

- **Dự án:** BrewLite – Ứng dụng Đặt Cà Phê Không Tiền Mặt (Cashless Coffee Ordering)
- **Học phần:** Công nghệ Phần mềm (Software Engineering) – Khoa CNTT, Trường Đại học Sài Gòn (SGU)
- **Giai đoạn:** Task 1.1 – Khai thác và đặc tả yêu cầu (Assignment 2)
- **Tham chiếu mã nguồn:** `Assignment 2/apps/web` (Next.js), `Assignment 2/apps/api` (NestJS), `Assignment 2/apps/api/prisma/schema.prisma` (PostgreSQL)

---

## 1. Bối cảnh và Vấn đề nghiệp vụ

### 1.1. Bối cảnh vận hành
Tại các quán cà phê phục vụ nhóm khách hàng trẻ như sinh viên, giảng viên và nhân viên văn phòng (đặc biệt tại khu vực khuôn viên Trường Đại học Sài Gòn vào các khung giờ cao điểm trước tiết học hoặc giờ nghỉ trưa), lượng khách tập trung đặt đồ uống trong thời gian ngắn thường rất lớn.

Quy trình phục vụ truyền thống yêu cầu khách hàng phải xếp hàng trực tiếp tại quầy thu ngân để gọi món, tùy chỉnh kích cỡ/topping, thanh toán tiền mặt và đứng chờ nhận nước. Điều này tạo ra nhiều điểm nghẽn vận hành cho cả khách hàng lẫn cửa hàng.

### 1.2. Các vấn đề nghiệp vụ cần giải quyết
1. **Ùn ứ hàng chờ giờ cao điểm:** Thời gian gọi món và thanh toán thủ công tại quầy kéo dài khiến hàng chờ ùn tắc, làm giảm trải nghiệm và khiến nhiều khách hàng bỏ đi.
2. **Sai sót trong tùy chỉnh đồ uống và tính giá:** Đồ uống có nhiều lựa chọn kích cỡ (`S`, `M`, `L`), nhiều loại topping đi kèm và mã khuyến mãi; việc ghi nhận bằng lời nói hoặc giấy dễ dẫn đến nhầm lẫn giữa thu ngân và nhân viên pha chế.
3. **Bất tiện khi thanh toán tiền mặt:** Khách hàng phải chuẩn bị tiền lẻ, thu ngân mất thời gian kiểm đếm và thối tiền, dễ phát sinh sai lệch đối soát cuối ca.
4. **Thiếu minh bạch về trạng thái đơn hàng:** Sau khi đặt món, khách hàng không biết đơn đang chờ xử lý, đang pha chế hay đã hoàn thành để chủ động tới quầy nhận nước.
5. **Rủi ro nhất quán dữ liệu khi số hóa:** Khi nhiều khách hàng đặt cùng lúc một món có số lượng tồn kho giới hạn, hoặc bấm thanh toán lặp lại do mạng chập chờn, hệ thống thiếu kiểm soát sẽ gây bán vượt tồn kho (*overselling*) hoặc ghi nhận thanh toán trùng lặp (*duplicate payment*).

### 1.3. Giải pháp BrewLite
**BrewLite** giải quyết các vấn đề trên bằng nền tảng đặt đồ uống không tiền mặt theo hướng **mobile-first / PWA**, vận hành theo luồng nghiệp vụ khép kín tối thiểu:

$$\text{Xem menu} \rightarrow \text{Chọn tùy chọn (Size/Topping)} \rightarrow \text{Giỏ hàng} \rightarrow \text{Đặt đơn} \rightarrow \text{Thanh toán} \rightarrow \text{Theo dõi đơn}$$

Hệ thống kết hợp giao diện **Next.js** thân thiện trên thiết bị di động, **NestJS REST API** xử lý nghiệp vụ chặt chẽ (Order State Machine, Optimistic Locking, Idempotent Payment, Loyalty Points) và cơ sở dữ liệu **PostgreSQL** đảm bảo tính toàn vẹn giao dịch.

---

## 2. Phân tích Các bên liên quan (Stakeholders)

| Mã | Stakeholder | Phân loại | Vai trò trong hệ thống | Mục tiêu & Kỳ vọng |
| :--- | :--- | :--- | :--- | :--- |
| **STK-01** | **Khách hàng** *(Customer – Sinh viên, giảng viên, nhân viên văn phòng)* | Người dùng cuối (External) | Duyệt menu, lọc danh mục, tùy chỉnh size/topping, quản lý giỏ hàng, đăng ký/đăng nhập, áp mã khuyến mãi, thanh toán không tiền mặt, theo dõi trạng thái đơn và hủy đơn chưa pha chế. | Đặt đồ uống nhanh chóng trong vài chạm mà không cần xếp hàng; giá cả và khuyến mãi minh bạch; thanh toán an toàn không bị trừ tiền trùng lặp; nhận thông tin trạng thái đơn rõ ràng và tích điểm thưởng tự động. |
| **STK-02** | **Nhân viên quầy / Pha chế** *(Barista / Counter Staff)* | Người dùng vận hành (Internal) | Tiếp nhận các đơn hàng đã thanh toán (`PAID`), thực hiện pha chế và cập nhật tiến độ đơn hàng (`PREPARING` $\rightarrow$ `READY` $\rightarrow$ `COMPLETED`). | Nhận thông tin đơn hàng chính xác đến từng size và topping; quy trình chuyển trạng thái rõ ràng, không bị nhảy cóc trạng thái gây nhầm lẫn; giảm áp lực thu ngân tại quầy. |
| **STK-03** | **Quản lý cửa hàng** *(Store Manager / Admin)* | Quản trị nghiệp vụ (Internal) | Quản lý danh mục đồ uống, thông tin sản phẩm, giá bán, số lượng tồn kho (`stock`), chương trình khuyến mãi và giám sát tình hình đơn hàng. | Kiểm soát chính xác số lượng tồn kho theo thời gian thực (không bán âm kho, tự động hoàn kho khi đơn hủy); triển khai hiệu quả các chiến dịch ưu đãi (`BREWLITE10`, `GIAM10K`, `SGU2026`) để giữ chân khách hàng. |
| **STK-04** | **Giảng viên / Khách hàng nghiệm thu** *(Lecturer / Product Owner)* | Chủ sở hữu yêu cầu & Đánh giá (External) | Định hướng yêu cầu bài tập lớn Assignment 2, nghiệm thu tài liệu phân tích – thiết kế, mã nguồn, kiểm thử, pipeline CI/CD và môi trường production. | Sản phẩm hoàn thiện đầy đủ luồng end-to-end; tài liệu rõ ràng, nhất quán giữa SRS, sơ đồ UML, kiến trúc và mã nguồn; có ma trận truy vết đầy đủ và ứng dụng chạy ổn định trên URL production qua HTTPS. |
| **STK-05** | **Nhóm phát triển** *(Development Team)* | Đội ngũ kỹ thuật (Internal) | Khai thác yêu cầu, mô hình hóa hệ thống, thiết kế kiến trúc, lập trình Frontend/Backend, viết kiểm thử tự động và vận hành CI/CD. | Yêu cầu được đặc tả rõ ràng, có tiêu chí chấp nhận kiểm chứng được; kiến trúc phân tách module mạch lạc, dễ bảo trì và triển khai tự động không gián đoạn. |
| **STK-06** | **Đơn vị thanh toán** *(Payment Service / Gateway Provider)* | Hệ thống bên ngoài (External) | Cung cấp kênh thanh toán không tiền mặt qua Ví điện tử (`WALLET` – MoMo/VNPay) và Thẻ/Chuyển khoản ngân hàng (`CARD` – VietQR) (mô phỏng trong phạm vi đồ án). | Giao tiếp API chuẩn hóa; mỗi yêu cầu thanh toán đi kèm khóa định danh duy nhất (`Idempotency-Key`) để chống xử lý trùng lặp; phản hồi trạng thái giao dịch (`SUCCESS` / `FAILED`) nhất quán. |

---

## 3. Phạm vi Sản phẩm (Product Scope)

### 3.1. Phạm vi trong MVP (In-Scope)

Các hạng mục dưới đây thuộc phạm vi bắt buộc của phiên bản MVP và được đối chiếu trực tiếp với mã nguồn của **BrewLite (Assignment 2)**:

| Phân hệ | Nội dung thực hiện trong MVP | Thành phần mã nguồn liên quan |
| :--- | :--- | :--- |
| **1. Danh mục & Thực đơn** | - Hiển thị lưới đồ uống kèm ảnh, giá gốc, danh mục (`Cà phê`, `Trà`), số lượng tồn kho (`stock`).<br>- Lọc theo danh mục (`ALL`, `COFFEE`, `TEA`) và tìm kiếm theo từ khóa.<br>- Xử lý đầy đủ các trạng thái giao diện: `loading` (skeleton), `empty`, và `error`. | `apps/api/src/products/*`<br>`apps/web/src/app/page.tsx` |
| **2. Chi tiết & Tùy chỉnh món** | - Mở chi tiết đồ uống, xem mô tả và tồn kho hiện có.<br>- Chọn kích cỡ: `Size S` (+0đ), `Size M` (+6.000đ), `Size L` (+12.000đ).<br>- Chọn nhiều topping: `Trân châu hoàng kim` (+8.000đ), `Kem Macchiato phô mai` (+12.000đ), `Thêm 1 Shot Espresso` (+10.000đ), `Thạch cà phê giòn` (+8.000đ).<br>- Điều chỉnh số lượng (`1 .. stock`) và tự động tính tạm tính. | `apps/web/src/components/ProductModal.tsx`<br>`apps/api/src/products/products.service.ts` |
| **3. Quản lý Giỏ hàng** | - Thêm món, tăng/giảm số lượng, xóa món qua ngăn kéo giỏ hàng (`CartDrawer`).<br>- Hiển thị huy hiệu (badge) tổng số ly trên thanh điều hướng.<br>- Lưu trữ bền vững trên `localStorage` tách biệt theo từng tài khoản (`userKey`) và tự động gộp giỏ hàng khách vãng lai (`guest`) khi đăng nhập. | `apps/web/src/store/useCartStore.ts`<br>`apps/web/src/components/CartDrawer.tsx`<br>`apps/web/src/components/Navbar.tsx` |
| **4. Xác thực & Phân quyền** | - Đăng ký tài khoản mới (`POST /auth/register`) với kiểm tra trùng email và băm mật khẩu bằng `bcrypt`.<br>- Đăng nhập (`POST /auth/login`) cấp phát `accessToken` JWT (thời hạn 7 ngày).<br>- Bảo vệ các API đặt đơn, thanh toán và lịch sử đơn bằng `JwtAuthGuard`; phân tách vai trò `CUSTOMER`, `BARISTA`, `ADMIN`. | `apps/api/src/auth/*`<br>`apps/web/src/app/login/page.tsx`<br>`apps/web/src/store/useAuthStore.ts` |
| **5. Đặt đơn & Khuyến mãi** | - Tạo đơn hàng ở trạng thái `PENDING` (`POST /orders`) với kiểm tra dữ liệu đầu vào (`class-validator`).<br>- Áp dụng mã khuyến mãi: `BREWLITE10` (giảm 10%), `GIAM10K` (giảm 10.000đ), `SGU2026` (giảm 20%).<br>- Đảm bảo toàn vẹn tồn kho khi đặt đồng thời bằng `prisma.$transaction` kết hợp **Optimistic Locking** (`Product.version`). | `apps/api/src/order/orders.controller.ts`<br>`apps/api/src/order/orders.service.ts`<br>`apps/api/src/order/dto/create-order.dto.ts` |
| **6. Thanh toán & Tích điểm** | - Thanh toán không tiền mặt mô phỏng (`POST /payments`) qua `WALLET` (Ví điện tử / QR MoMo) và `CARD` (Thẻ ngân hàng / VietQR).<br>- Bắt buộc header `Idempotency-Key` để chống thanh toán lặp lại khi người dùng nhấn nhiều lần hoặc mạng chập chờn.<br>- Xử lý kịch bản thanh toán thất bại (`PAYMENT_FAILED`): giữ giỏ hàng & tạm giữ tồn kho, cho phép thử lại thanh toán hoặc hủy đơn hoàn kho.<br>- Tự động cộng điểm thưởng Loyalty (`10.000đ = 1 điểm`) khi đơn đạt trạng thái `PAID`. | `apps/api/src/payments/*`<br>`apps/web/src/app/checkout/page.tsx` |
| **7. Theo dõi & Vòng đời đơn** | - Xem danh sách lịch sử đơn hàng cá nhân (`GET /orders/me`, trang `/orders`) và chi tiết tiến độ đơn hàng (`/orders/[id]`).<br>- Kiểm soát chuyển trạng thái (`PATCH /orders/:id/status`) qua **Order State Machine**: `PENDING` $\rightarrow$ `PAID` $\rightarrow$ `PREPARING` $\rightarrow$ `READY` $\rightarrow$ `COMPLETED`, cùng các nhánh ngoại lệ `PAYMENT_FAILED` và `CANCELLED` (tự động hoàn trả tồn kho). | `apps/api/src/order/order-state-machine.ts`<br>`apps/web/src/app/orders/page.tsx`<br>`apps/web/src/app/orders/[id]/page.tsx` |
| **8. Kiểm thử, CI/CD & Triển khai** | - Bộ kiểm thử tự động (Unit test, Integration test, E2E test) kiểm chứng State Machine, Idempotency, Concurrency và luồng mua hàng.<br>- Đóng gói container bằng `Dockerfile` và `docker-compose.yml` (`postgres`, `backend`, `frontend`).<br>- Thiết lập GitHub Actions CI/CD tự động kiểm tra chất lượng (`Lint`, `Test`, `Build`) và triển khai môi trường production truy cập qua HTTPS kèm endpoint health check. | `apps/api/src/task10.spec.ts`<br>`docker-compose.yml`<br>`.github/workflows/*` |

### 3.2. Phạm vi mở rộng (Extended Scope – Giai đoạn sau MVP)

Các tính năng đã có nền tảng dữ liệu/backend hoặc dự kiến mở rộng sau khi hoàn thành luồng MVP cốt lõi:
1. **Endpoint giám sát sức khỏe (`GET /health`):** Bổ sung controller health check chuyên biệt cho Backend và kết nối Database để phục vụ smoke test tự động sau triển khai CI/CD.
2. **Giao diện vận hành cho Barista & Admin:** Xây dựng màn hình quản trị trên Web cho phép `BARISTA` xem danh sách đơn cần pha chế và bấm chuyển trạng thái (`PAID` $\rightarrow$ `PREPARING` $\rightarrow$ `READY` $\rightarrow$ `COMPLETED`), và `ADMIN` thêm/sửa sản phẩm, cập nhật tồn kho.
3. **Quản lý Khuyến mãi động & Lịch sử biến động điểm thưởng:** Kết nối trực tiếp bảng `Promotion` (kiểm tra thời hạn `validFrom`, `validTo`, trạng thái `active`) và ghi chi tiết lịch sử cộng/trừ điểm vào bảng `LoyaltyTransaction` (đã được định nghĩa sẵn trong `prisma/schema.prisma`).
4. **Thông báo trạng thái thời gian thực:** Tích hợp Server-Sent Events (SSE) / WebSocket hoặc Web Push Notification (PWA) để tự động cập nhật trạng thái đơn trên màn hình khách hàng mà không cần tải lại trang.

### 3.3. Nội dung không thực hiện (Out-of-Scope)

Các nội dung sau đây **không** nằm trong phạm vi phát triển và nghiệm thu của dự án BrewLite:

| Hạng mục loại trừ | Lý do loại trừ |
| :--- | :--- |
| **1. Tích hợp cổng thanh toán tiền thật** *(VNPay, MoMo, Stripe Live)* | Yêu cầu đăng ký pháp nhân doanh nghiệp, ký quỹ thương mại và kiểm duyệt bảo mật PCI-DSS; sử dụng dịch vụ thanh toán mô phỏng có `Idempotency-Key` và mã QR minh họa là phù hợp với phạm vi học phần. |
| **2. Dịch vụ giao hàng tận nơi** *(Delivery, định vị shipper, tính phí ship)* | BrewLite được định vị cho mô hình đặt trước và nhận tại quầy (*Counter Pick-up*) nhằm giải quyết ùn ứ tại quán, không vận hành đội ngũ giao hàng. |
| **3. Thanh toán tiền mặt tại quầy & phần cứng POS** | Mục tiêu cốt lõi của sản phẩm là *Cashless Coffee* (100% không tiền mặt) và không phụ thuộc thiết bị phần cứng chuyên dụng như máy in hóa đơn nhiệt hay ngăn kéo đựng tiền. |
| **4. Đăng nhập OAuth2 bên thứ ba & Xác thực 2FA/OTP** | Đăng ký/đăng nhập bằng Email + Mật khẩu băm `bcrypt` và JWT đã đáp ứng đầy đủ yêu cầu xác thực và phân quyền người dùng của đề bài. |
| **5. Quản lý kho nguyên liệu thô (ERP)** | Hệ thống quản lý tồn kho theo số lượng ly thành phẩm (`Product.stock`), không quản lý định lượng nguyên liệu đầu vào (hạt cà phê, sữa tươi, đường, đá). |
| **6. Ứng dụng di động Native (iOS / Android)** | Hệ thống phát triển theo kiến trúc Web hiện đại chuẩn mobile-first / PWA trên Next.js để chạy đa nền tảng trên mọi trình duyệt di động mà không cần cài đặt qua App Store/Google Play. |

---

## 4. Giả định và Ràng buộc (Assumptions & Constraints)

### 4.1. Các giả định (Assumptions)

| Mã | Giả định | Tác động nếu giả định thay đổi |
| :--- | :--- | :--- |
| **ASM-01** | Khách hàng sử dụng điện thoại thông minh hoặc máy tính có kết nối Internet ổn định và trình duyệt web hiện đại (Chrome, Safari, Edge) hỗ trợ `localStorage` và JavaScript. | Nếu trình duyệt chặn `localStorage`, giỏ hàng cục bộ sẽ không được lưu giữ khi người dùng tải lại trang. |
| **ASM-02** | Quán cà phê hoạt động theo mô hình nhận tại quầy (*Pick-up at Counter*); khách hàng chủ động theo dõi trạng thái `READY` trên ứng dụng để tới quầy nhận đồ uống. | Nếu bổ sung hình thức giao hàng tận nơi, hệ thống phải mở rộng thêm thực thể địa chỉ giao hàng, phí vận chuyển và trạng thái giao nhận. |
| **ASM-03** | Cổng thanh toán mô phỏng (`POST /payments`) phản hồi đồng bộ kết quả giao dịch (`SUCCESS` hoặc `FAILED`) đại diện cho hành vi của cổng thanh toán thực tế. | Khi tích hợp cổng thanh toán bất đồng bộ thật trong tương lai, cần bổ sung endpoint nhận Webhook IPN và hàng đợi đối soát. |
| **ASM-04** | Tồn kho sản phẩm (`Product.stock`) được tạm giữ ngay tại thời điểm tạo đơn `PENDING` và được hoàn trả tự động khi đơn chuyển sang `CANCELLED`. | Cần cơ chế tự động hủy các đơn `PENDING` hoặc `PAYMENT_FAILED` quá thời gian chờ (ví dụ 15 phút) nếu triển khai vận hành thực tế lâu dài. |
| **ASM-05** | Tài khoản nhân viên pha chế (`BARISTA`) và quản lý (`ADMIN`) được khởi tạo sẵn trong cơ sở dữ liệu thông qua script seed hoặc quản trị hệ thống. | Cần bổ sung luồng cấp quyền hoặc trang quản lý người dùng nếu cửa hàng mở rộng quy mô nhiều chi nhánh. |

### 4.2. Các ràng buộc (Constraints)

| Mã | Loại ràng buộc | Mô tả ràng buộc |
| :--- | :--- | :--- |
| **CON-01** | **Công nghệ bắt buộc** | Frontend phải sử dụng **Next.js** (hướng mobile-first/PWA); Backend phải sử dụng **NestJS**; Cơ sở dữ liệu phải sử dụng **PostgreSQL** (qua Prisma ORM) và đóng gói triển khai bằng **Docker**. Không được thay thế ba thành phần cốt lõi này. |
| **CON-02** | **Quy trình thực hiện tuần tự** | Dự án phải thực hiện lần lượt qua 5 Task của Assignment 2 (Yêu cầu $\rightarrow$ Mô hình hóa $\rightarrow$ Thiết kế kiến trúc $\rightarrow$ Sprint 1 $\rightarrow$ Sprint 2 & Delivery). Task sau chỉ được nghiệm thu khi tạo phẩm bắt buộc của Task trước đã tồn tại trên repository với lịch sử commit rõ ràng. |
| **CON-03** | **Cấu trúc Repository chuẩn** | Mã nguồn và tài liệu phải tổ chức theo cấu trúc monorepo chuẩn của Assignment 2 gồm: `apps/web/`, `apps/api/`, `docs/requirements/`, `docs/diagrams/`, `docs/architecture/`, `tests/`, `.github/workflows/`, `docker-compose.yml`, `.env.example`, và `README.md`. |
| **CON-04** | **Đơn vị tiền tệ & Tính toán** | Toàn bộ giá sản phẩm, phụ thu size, topping, giảm giá và tổng đơn hàng tính bằng đồng Việt Nam (**VNĐ**), lưu trữ dưới dạng số nguyên (`Int`) để tránh sai số dấu phẩy động. Giá trị đơn hàng cuối cùng không được nhỏ hơn `0đ`. |
| **CON-05** | **Bảo mật hạ tầng & Bí mật** | Cơ sở dữ liệu PostgreSQL trên môi trường production không được mở public trực tiếp ra Internet; mọi khóa bí mật (`DATABASE_URL`, `JWT_SECRET`) phải quản lý qua biến môi trường / CI Secrets và tuyệt đối không xuất hiện trong mã nguồn hoặc log CI. |
| **CON-06** | **Tính nhất quán nghiệp vụ** | Mọi chuyển đổi trạng thái đơn hàng phải đi qua `OrderStateMachine`; mọi yêu cầu thanh toán phải kèm `Idempotency-Key`; cờ mô phỏng lỗi (`simulateFailure`) chỉ được phép hoạt động ở môi trường phát triển/kiểm thử (`NODE_ENV !== 'production'`). |

---

## 5. Rủi ro ban đầu và Hướng giảm thiểu (Initial Risks)

| Mã | Rủi ro ban đầu | Mức độ | Biện pháp giảm thiểu |
| :--- | :--- | :--- | :--- |
| **RSK-01** | **Bán vượt tồn kho (Overselling):** Hai hoặc nhiều khách hàng đặt mua cùng lúc sản phẩm chỉ còn 1 ly duy nhất. | Cao | Sử dụng `prisma.$transaction` kết hợp **Optimistic Locking** qua cột `Product.version` (`updateMany` kiểm tra đồng thời `id`, `version` và `stock >= qty`), từ chối giao dịch xung đột với mã lỗi `409 Conflict`. |
| **RSK-02** | **Thanh toán trùng lặp (Duplicate Charge):** Khách hàng bấm nút thanh toán nhiều lần hoặc trình duyệt gửi lại request khi mạng chập chờn. | Cao | Bắt buộc truyền header `Idempotency-Key` (ràng buộc `@unique` trong bảng `Payment`); hệ thống phát hiện key trùng sẽ trả về bản ghi giao dịch cũ mà không trừ tiền hay cộng điểm lần hai. |
| **RSK-03** | **Chuyển sai trạng thái đơn hàng:** Đơn hàng chưa thanh toán bị chuyển sang pha chế hoặc đơn đã hoàn thành bị hủy ngược lại. | Trung bình | Cài đặt máy trạng thái hữu hạn (`OrderStateMachine` – `assertTransition`) tại tầng Service để chặn mọi bước chuyển không hợp lệ với lỗi `400 Bad Request`. |
| **RSK-04** | **Sai lệch tính giá giữa Frontend và Backend:** Người dùng chỉnh sửa payload từ trình duyệt để gửi tổng tiền thấp hơn thực tế. | Cao | Backend không tin tưởng giá từ client; `OrdersService` tự truy vấn giá gốc từ DB, cộng phụ thu theo bảng chuẩn `SIZE_PRICES`, `TOPPING_PRICES` và tính lại chiết khấu mã khuyến mãi. |
| **RSK-05** | **Chậm tiến độ hoặc lệch pha giữa tài liệu và mã nguồn:** Tài liệu yêu cầu/sơ đồ không khớp với API và cấu trúc thực tế. | Trung bình | Áp dụng quy tắc thực hiện tuần tự, quản lý mọi thay đổi qua Pull Request và duy trì ma trận truy vết (`docs/traceability-matrix.md`) xuyên suốt từ `FR/NFR` đến `Code` và `Test`. |
