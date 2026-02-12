# CHUM VÉ SỐ 🎰

Ứng dụng dò vé số **Xổ Số Miền Nam (XSMN)** trực tuyến — Dữ liệu từ Đài Xổ Số Minh Ngọc.

## Tính năng

- 📊 Xem kết quả XSMN theo ngày (tất cả đài Miền Nam)
- 🔍 Dò vé số tự động — nhập số vé, chọn số chữ số cần so khớp
- 📋 Lưu lịch sử dò số trong trình duyệt (localStorage)
- 🌙 Chế độ Tối / Sáng (mặc định: Tối)
- 📱 PWA — cài được trên điện thoại, hỗ trợ offline
- ♿ Accessibility — semantic HTML, focus states, ARIA labels

## Cài đặt & Phát triển

### Chạy local

```bash
# Cách 1: Python
python -m http.server 8000

# Cách 2: Node
npx -y serve .

# Cách 3: VS Code Live Server extension
```

Mở `http://localhost:8000` trong trình duyệt.

### Deploy lên GitHub Pages

1. Tạo repository mới trên GitHub
2. Push code lên nhánh `main`:
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/USERNAME/chum-ve-so.git
   git push -u origin main
   ```
3. Vào **Settings → Pages → Source** chọn `main` / `/ (root)` → Save
4. Truy cập: `https://USERNAME.github.io/chum-ve-so/`

## Cấu trúc thư mục

```
chum-ve-so/
├── index.html          # Trang chính
├── assets/
│   ├── style.css       # Neumorphism design system
│   └── app.js          # Logic ứng dụng
├── manifest.json       # PWA manifest
├── sw.js               # Service Worker
└── README.md           # Tài liệu
```

## Tùy chỉnh

| Thay đổi       | File              | Mục cần sửa                                           |
|----------------|-------------------|-------------------------------------------------------|
| Màu chủ đạo    | `style.css`       | CSS custom properties trong `[data-theme="dark/light"]` |
| Font chữ       | `index.html`      | Google Fonts link + `--font-family` trong CSS          |
| Nguồn dữ liệu | `app.js`          | `XSKT_BASE` và `CORS_PROXIES`                         |

## Công nghệ

- HTML5 + CSS3 + Vanilla JavaScript
- Neumorphism UI design
- PWA (Progressive Web App)
- Không framework, không build step

## Giấy phép

MIT License
