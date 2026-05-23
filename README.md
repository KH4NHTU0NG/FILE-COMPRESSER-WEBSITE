# [TKT] FILE COMPRESSER

Ứng dụng Web-App hỗ trợ nén tệp PDF và Hình ảnh hoạt động 100% tại Client-side (Zero-Trust Architecture) [1, 2].

## 1. Công nghệ sử dụng (Tech Stack)

*   **Framework chính:** React.js (TypeScript) + Vite [6]
*   **Styling (Giao diện):** Tailwind CSS v4 [5]
*   **Xử lý nhị phân PDF:** `pdf-lib` [2]
*   **Kết xuất trang PDF:** `pdfjs-dist` [2]
*   **Nén & Xử lý pixel:** HTML5 Canvas API [3]
*   **Icons:** `lucide-react`

---

## 2. Cách khởi chạy dự án (How to Run)

### Yêu cầu hệ thống
*   Đã cài đặt **Node.js** (Phiên bản gợi ý >= 18.x) và **npm**.

### Các bước thực hiện

1.  **Cài đặt các thư viện phụ thuộc:**
    ```bash
    npm install
    ```

2.  **Chạy ứng dụng trong môi trường phát triển (Local Dev):**
    ```bash
    npm run dev
    ```
    *Mặc định ứng dụng sẽ chạy tại địa chỉ: `http://localhost:5173`*

3.  **Biên dịch dự án cho môi trường sản xuất (Production Build):**
    ```bash
    npm run build
    ```
    *Sản phẩm tĩnh sẽ được tạo ra tại thư mục `dist/`*
