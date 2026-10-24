# BrewLite – Bối cảnh, Stakeholder và Phạm vi
## 1. Bối cảnh và vấn đề nghiệp vụ
 
Tại các quán cà phê, khách phải xếp hàng để gọi món và trả tiền tại quầy. Việc thu tiền mặt và thối tiền làm chậm quy trình, tạo hàng chờ vào giờ cao điểm. BrewLite là ứng dụng web đặt và thanh toán đồ uống không dùng tiền mặt, giúp khách chọn món, tùy chỉnh size và topping, thanh toán trên điện thoại rồi nhận đồ uống tại quầy.
 
**Tầm nhìn sản phẩm:** BrewLite giúp khách hàng đặt và thanh toán đồ uống không dùng tiền mặt chỉ trong vài chạm, giảm thời gian xếp hàng và nhận đơn nhanh tại quầy.
 
**Luồng nghiệp vụ tối thiểu:** Xem menu → Chọn size/topping → Giỏ hàng → Đăng nhập → Đặt đơn → Thanh toán → Theo dõi đơn.

---

## 2. Stakeholder

### 2.1 Bảng stakeholder

| ID | Stakeholder | Vai trò trong hệ thống | Mục tiêu | Kỳ vọng đối với hệ thống | Ảnh hưởng | Quan tâm |
|---|---|---|---|---|---|---|
| SH-01 | Khách hàng | Người dùng cuối: xem menu, chọn size/topping, đặt đơn, thanh toán, theo dõi đơn | Gọi đồ nhanh, không cần mang tiền mặt, không phải xếp hàng | Giao diện dùng được một tay trên điện thoại; không bị trừ tiền hai lần; thấy mã đơn và trạng thái rõ ràng; giỏ hàng không mất khi thanh toán lỗi | Cao | Cao |
| SH-02 | Nhân viên quầy / Barista | Nhận đơn đã thanh toán, pha chế, cập nhật trạng thái | Biết chính xác đơn nào cần làm, không phải đối chiếu tiền thủ công | Chỉ nhìn thấy đơn đã `PAID`; trạng thái đi đúng thứ tự `PAID → PREPARING → READY → COMPLETED`. *Giao diện riêng cho barista thuộc phạm vi mở rộng (EX-01)* | Trung bình | Cao |
| SH-03 | Quản lý cửa hàng / Product Owner | Xác định yêu cầu, sắp xếp Product Backlog, nghiệm thu Increment sau mỗi Sprint | Tăng tốc độ phục vụ giờ cao điểm, giữ chân khách, giảm thất thoát | Mỗi Sprint có bản chạy được; yêu cầu bám giá trị nghiệp vụ; dữ liệu đơn và tồn kho chính xác | Cao | Cao |
| SH-04 | Giảng viên / khách hàng nghiệm thu | Đánh giá quy trình, sản phẩm và mức đáp ứng tiêu chí chấp nhận | Xác nhận nhóm làm đúng quy trình Scrum và sản phẩm chạy thật | Tài liệu truy vết đầy đủ; mọi tạo phẩm có trên repo với lịch sử thay đổi rõ; URL production hoạt động; README chạy lại được | Cao | Cao |
| SH-05 | Nhóm phát triển | Phân tích, thiết kế, lập trình, kiểm thử, triển khai và bàn giao | Hoàn thành đúng hạn, đúng chất lượng, mọi thành viên cùng đóng góp | Yêu cầu rõ ràng và ít thay đổi giữa Sprint; tiêu chí chấp nhận kiểm thử được | Cao | Cao |
| SH-06 | Đơn vị thanh toán (mô phỏng Ví/Thẻ) | Nhận yêu cầu thanh toán và trả kết quả thành công/thất bại | Xử lý giao dịch chính xác, không ghi nhận trùng | Nhận yêu cầu hợp lệ kèm khóa idempotency; phản hồi rõ ràng; có thể giả lập lỗi để kiểm thử nhánh thất bại | Thấp | Trung bình |
## 3. Phạm vi sản phẩm (Product Scope)

### 3.1 In-Scope (Phạm vi thực hiện trong MVP - Sprint 1 & Sprint 2)
* Luồng nghiệp vụ cốt lõi end-to-end: Xem Menu → Chi tiết sản phẩm (chọn Size, Topping) → Giỏ hàng → Đặt đơn → Thanh toán mô phỏng → Theo dõi trạng thái & Lịch sử đơn hàng.
* Giao diện PWA/Mobile-first xây dựng bằng Next.js.
* Hệ thống RESTful API xây dựng bằng NestJS, xác thực người dùng bằng JWT Token.
* Lưu trữ dữ liệu hệ thống trên PostgreSQL.
* Cơ chế thanh toán Idempotent, chống bán quá tồn kho (Optimistic locking/Transaction) và máy trạng thái đơn hàng (Order State Machine).

### 3.2 Out-of-Scope (Nội dung không thực hiện trong đề tài này)
* Tích hợp cổng thanh toán thật (VNPay/Momo/Stripe thật với tài khoản ngân hàng thực).
* Tính năng giao hàng tận nơi (Delivery) hoặc tích hợp với bên thứ ba (Ahamove, GrabExpress).
* Quản lý kho nguyên liệu chi tiết (nhập/xuất/tồn nguyên liệu thô).
* Quản lý nhân sự, chấm công và ca làm việc của nhân viên.

### 3.3 Phạm vi mở rộng (Future / Extended Scope)
* Màn hình riêng cho Barista để tiếp nhận và cập nhật trạng thái pha chế theo thời gian thực (Websocket).
* Chương trình tích điểm thưởng (Loyalty points) và áp mã giảm giá (Promotion) nâng cao.

---

## 4. Giả định và Ràng buộc (Assumptions & Constraints)

### 4.1 Giả định (Assumptions)
* Khách hàng truy cập ứng dụng thông qua trình duyệt di động có kết nối Internet ổn định.
* Dịch vụ thanh toán mô phỏng (Mock Payment) luôn sẵn sàng phản hồi kết quả trong thời gian < 1 giây.
* Dữ liệu mẫu (Seed data) về menu sản phẩm và tài khoản mẫu đã được chuẩn bị sẵn cho việc kiểm thử.

### 4.2 Ràng buộc (Constraints)
* **Công nghệ bắt buộc:** Frontend phải dùng Next.js, Backend dùng NestJS, Database dùng PostgreSQL và đóng gói bằng Docker.
* **Quy trình bắt buộc:** Phải tuân thủ thứ tự 5 Task tuần tự; Task sau chỉ được làm khi Task trước đã commit lên GitHub.
* **Thời gian phản hồi:** API phải phản hồi < 500ms đối với dữ liệu mẫu.
* **Bảo mật:** Mật khẩu phải được băm (bcrypt), API được bảo vệ bằng JWT Guard.

---

## 5. Rủi ro ban đầu & Biện pháp giảm thiểu (Initial Risks & Mitigation)

| ID | Rủi ro nhận diện | Mức độ | Biện pháp giảm thiểu |
| :--- | :--- | :--- | :--- |
| **RSK-01** | Khách hàng bấm thanh toán lặp lại nhiều lần gây trùng đơn/trừ tiền 2 lần[cite: 2] | High | Tích hợp **Idempotency-Key** cho API thanh toán. |
| **RSK-02** | Nhiều khách hàng đặt cùng lúc gây bán quá số lượng tồn kho (Overbooking)[cite: 1, 2] | High | Sử dụng Database **Transaction** kết hợp **Optimistic Locking**[cite: 1, 2]. |
| **RSK-03** | Nghẽn tiến độ dự án do các thành viên làm việc không đồng đều | Medium | Áp dụng quy trình Scrum, họp Daily, theo dõi tiến độ trên GitHub Board[cite: 1, 2]. |
| **RSK-04** | Lỗi môi trường giữa các máy tính thành viên trong nhóm | Medium | Đóng gói toàn bộ ứng dụng bằng **Docker Compose**[cite: 1, 2]. |