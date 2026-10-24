# Tài liệu Hướng dẫn Triển khai & Vận hành Hệ thống BrewLite (Task 5.4)

* **Dự án**: Hệ thống Đặt đồ uống trực tuyến BrewLite
* **Môn học**: Công nghệ Phần mềm – Đại học Sài Gòn
* **Phiên bản**: v2.0.0 (Release Assignment 2)
* **Người thực hiện**: San (TV5 - Payment, Architecture & Deployment) & Nhóm BrewLite

---

## 1. Danh sách Đường dẫn Môi trường Production (Cloud URLs)

Hệ thống được triển khai trên nền tảng Cloud đạt chuẩn HTTPS và phân tách mạng nội bộ bảo mật:

| Thành phần | Nền tảng Cloud | URL Truy cập (Production) | Giao thức / Port |
| :--- | :--- | :--- | :--- |
| **Frontend Web / PWA** | Vercel / Cloudflare Edge | `https://brewlite-web.vercel.app` *(hoặc `https://brewlite.onrender.com`)* | HTTPS (Port 443) |
| **Backend REST API** | Render Cloud Container | `https://api-brewlite.onrender.com` | HTTPS (Port 443) |
| **Health Check Endpoint** | Render Cloud Service | `https://api-brewlite.onrender.com/health` | HTTPS (Port 443) |
| **Managed Database** | PostgreSQL 16 (Render/Neon) | Kết nối nội bộ qua chuỗi `DATABASE_URL` | PostgreSQL (Port 5432 - Private Network) |

> 🔒 **Chính sách Bảo mật Cơ sở Dữ liệu**: CSDL PostgreSQL Production **tuyệt đối không mở cổng công khai ra ngoài Internet**. Chỉ có Docker Container của Backend API mới được cấp quyền truy cập thông qua Private Network Connection String. Mọi mật khẩu và chuỗi kết nối nhạy cảm đều được lưu trong Cloud Environment Secrets, không commit vào kho Git.

---

## 2. Hướng dẫn Chạy Hệ thống ở Máy Cá nhân (Local Development via Docker)

Nhóm đã đóng gói toàn bộ hệ thống vào file `docker-compose.yml`. Bất kỳ ai chỉ cần clone repository về máy và làm theo các bước sau là có thể chạy ngay toàn bộ 3 dịch vụ mà không cần cài đặt thêm Node.js hay PostgreSQL:

### Bước 1: Sao chép tệp biến môi trường mẫu
```bash
cp .env.example .env
```

### Bước 2: Khởi động toàn bộ 3 dịch vụ bằng Docker Compose
```bash
docker-compose up --build
```
Lệnh trên sẽ tự động:
1. Kéo image `postgres:15-alpine`, tạo volume lưu trữ bền vững `pgdata`.
2. Khởi chạy và kiểm tra sức khỏe của database (`healthcheck`).
3. Build container `brewlite_backend` (NestJS), tự động chạy migration tạo bảng CSDL và nạp dữ liệu mẫu đồ uống (`prisma/seed.ts`).
4. Build container `brewlite_frontend` (Next.js 14) tối ưu hóa Production mode.

### Bước 3: Truy cập hệ thống ở Local
* **Giao diện Menu & Đặt đồ uống**: [http://localhost:3000](http://localhost:3000)
* **Backend API Swagger / Routes**: [http://localhost:3001](http://localhost:3001)
* **Kiểm tra trạng thái sức khỏe**: [http://localhost:3001/health](http://localhost:3001/health)

---

## 3. Quy trình Triển khai Lên Môi trường Production (Cloud Deployment)

Hệ thống hỗ trợ 2 hình thức triển khai:

### Cách 1: Tự động hóa qua GitHub Actions CI/CD (Khuyên dùng)
Mỗi khi thành viên nhóm gộp code (Merge Pull Request) vào nhánh `main` hoặc tạo Git Release Tag:
1. GitHub Actions kích hoạt pipeline trong `.github/workflows/cd.yml`.
2. Tự động chạy bộ **Quality Gate**: Kiểm tra lỗi Lint, chạy toàn bộ Unit Test và E2E Test.
3. Đóng gói Docker Image và gắn thẻ tag commit SHA lên GitHub Packages (`ghcr.io`).
4. Kích hoạt Webhook tự động cập nhật container trên Render/Railway.
5. Chạy Smoke Test kiểm tra endpoint `/health`. Nếu thành công, pipeline báo xanh (✅).

### Cách 2: Triển khai thủ công từng phần lên Cloud miễn phí (PaaS)
* **Backend & Database**:
  1. Tạo tài khoản trên [Render.com](https://render.com).
  2. Tạo dịch vụ **PostgreSQL** $\rightarrow$ Lưu chuỗi kết nối nội bộ `Internal Database URL`.
  3. Tạo dịch vụ **Web Service** $\rightarrow$ Liên kết với Git Repo $\rightarrow$ Chọn thư mục gốc `apps/api` (Docker runtime).
  4. Cấu hình các Environment Variables: `DATABASE_URL`, `JWT_SECRET`, `PORT=3001`.
* **Frontend Next.js**:
  1. Tạo tài khoản trên [Vercel.com](https://vercel.com).
  2. Import repository Git $\rightarrow$ Chọn Root Directory là `apps/web`.
  3. Cấu hình biến môi trường: `NEXT_PUBLIC_API_URL` trỏ tới URL backend đã deploy ở trên.

---

## 4. Cơ chế Giám sát & Smoke Test Sau Triển khai

Sau khi hệ thống được đẩy lên Cloud, script tự động thực hiện Smoke Test bằng lệnh:
```bash
curl -X GET https://api-brewlite.onrender.com/health
```
Kết quả phản hồi đạt chuẩn:
```json
{
  "status": "ok",
  "timestamp": "2026-10-22T13:45:00.000Z",
  "uptimeSeconds": 1420,
  "database": {
    "status": "connected",
    "latencyMs": 15
  },
  "environment": "production",
  "service": "brewlite-api",
  "version": "2.0.0"
}
```

---

## 5. Quy trình Khôi phục Khi Sự cố (Rollback Strategy - Task 5.3.7)

Trong trường hợp bản deploy mới phát sinh lỗi nghiêm trọng (Smoke test báo đỏ hoặc phát hiện bug trên giao diện):

### Bước 1: Rollback tức thời trên giao diện Cloud (Zero-Downtime)
* **Trên Render / Railway**: Vào mục **Deployments** $\rightarrow$ Chọn bản deploy ổn định gần nhất trước đó $\rightarrow$ Nhấn **"Rollback to this version"**. Server sẽ chuyển hướng truy cập về container cũ trong vòng 10 giây.
* **Trên Vercel**: Vào mục **Deployments** $\rightarrow$ Chọn bản build trước đó $\rightarrow$ Nhấn **"Promote to Production"**.

### Bước 2: Khôi phục mã nguồn trên Git
1. Tìm mã thẻ tag hoặc commit SHA ổn định trước đó:
   ```bash
   git log --oneline -n 5
   ```
2. Tạo commit hoàn tác và đẩy lên nhánh `main`:
   ```bash
   git revert HEAD --no-edit
   git push origin main
   ```
3. GitHub Actions sẽ tự động biên dịch lại phiên bản ổn định và triển khai lại an toàn.

---

## 6. Tổng kết Sprint Review & Sprint Retrospective (Task 5.4)

### 6.1. Sprint Review (Nghiệm thu Sản phẩm)
* **Mục tiêu đạt được**: Hoàn tất 100% luồng end-to-end từ Xem Menu $\rightarrow$ Tùy chọn Size/Topping $\rightarrow$ Giỏ hàng Zustand $\rightarrow$ Đăng nhập JWT $\rightarrow$ Đặt đơn hàng $\rightarrow$ Thanh toán Idempotent (Ví/Thẻ) $\rightarrow$ Tích lũy điểm Loyalty $\rightarrow$ Xem lịch sử đơn.
* **Hạ tầng**: Hệ thống chạy đồng bộ trên Docker, tích hợp đầy đủ CI/CD, Health Check và tài liệu kiến trúc ADR.

### 6.2. Sprint Retrospective (Rút kinh nghiệm)
* **Điểm làm tốt**:
  * Phân chia công việc rõ ràng theo 6 chặng, mỗi thành viên chịu trách nhiệm độc lập trên các file sơ đồ và module riêng, không bị xung đột code (conflict).
  * Ứng dụng thành công cơ chế khóa chống bán quá tồn kho (Optimistic Locking) và Idempotent Payment.
* **Điểm cần cải thiện trong các phiên bản sau**:
  * Bổ sung tính năng Webhook đồng bộ thời gian thực từ các cổng thanh toán thật (MoMo IPN, VNPay IPN).
  * Nâng cấp giao diện quản trị (Admin Dashboard) dành cho Barista cập nhật trạng thái đơn trực quan bằng WebSocket thay vì polling.
