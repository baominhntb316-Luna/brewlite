# ADR 001: Lựa chọn Mô hình Monorepo cho Dự án BrewLite

* **Trạng thái**: Accepted
* **Ngày quyết định**: 2026-10-20
* **Người phụ trách**: Nhóm Kỹ thuật BrewLite
* **Liên kết yêu cầu**: Task 4.1 (Thiết lập repository), Task 3.1 (Quyết định kiến trúc)

---

## 1. Bối cảnh (Context)
Dự án BrewLite bao gồm hai ứng dụng chính:
* Frontend: Next.js Web/PWA (`apps/web`).
* Backend: NestJS REST API (`apps/api`).
* Tài liệu đặc tả và thiết kế: Thư mục `docs/`.

Nhóm cần lựa chọn mô hình tổ chức kho mã nguồn (Repository Structure) phù hợp cho 6 thành viên phối hợp làm việc theo quy trình Scrum, viết tài liệu tuần tự và thiết lập CI/CD pipeline tự động.

## 2. Các phương án kiến trúc
* **Phương án A: Multi-repo (Tách riêng frontend và backend thành 2 repo riêng)**:
  * Khó đồng bộ mã nguồn, khó quản lý tài liệu chung và tốn nhiều công sức cấu hình CI/CD trên nhiều repo.
* **Phương án B: Monorepo hợp nhất trong một Git Repository (`apps/web`, `apps/api`, `docs`)** — *(ĐƯỢC CHỌN)*:
  * Tất cả mã nguồn, tài liệu và pipeline CI/CD nằm chung trong một kho lưu trữ duy nhất.

## 3. Quyết định (Decision)
Nhóm quyết định áp dụng mô hình **Monorepo**:
* `apps/web`: Ứng dụng Next.js.
* `apps/api`: Dịch vụ Backend NestJS & Prisma.
* `docs/`: Toàn bộ tài liệu yêu cầu, sơ đồ UML và quyết định kiến trúc (ADR).
* Gốc repo: Cấu hình `docker-compose.yml`, `.github/workflows/` cho CI/CD.

## 4. Hệ quả & Đánh đổi (Consequences)
* **Ưu điểm**:
  * Dễ dàng kiểm tra chéo (PR Review), đảm bảo tính toàn vẹn khi thay đổi schema API và UI cùng lúc.
  * Toàn bộ tài liệu thiết kế và mã nguồn luôn đồng bộ phiên bản (Traceability).
* **Đánh đổi**:
  * Cần cấu hình CI thông minh để chỉ kiểm thử hoặc build phần code có thay đổi nhằm tiết kiệm thời gian chạy pipeline.
