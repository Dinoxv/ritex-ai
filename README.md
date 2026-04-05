<div align="center">

# RITEX AI

### Nền Tảng Giao Dịch Chuyên Nghiệp cho Hyperliquid DEX

[![Website](https://img.shields.io/badge/Website-ritexai.com-00C853?style=for-the-badge&logo=google-chrome&logoColor=white)](https://ritexai.com)
[![GitHub](https://img.shields.io/badge/GitHub-Dinoxv%2Fritex--ai-181717?style=for-the-badge&logo=github&logoColor=white)](https://github.com/Dinoxv/ritex-ai)

![RITEX AI Hero](public/landing/hero.png)

**Giao dịch thông minh hơn. Tốc độ nhanh hơn. Lợi nhuận nhiều hơn.**

100% xử lý tại trình duyệt — Khóa riêng không bao giờ rời khỏi máy bạn.

[Truy cập ngay →](https://ritexai.com) · [Xem Demo](https://ritexai.com)

</div>

---

## Giới thiệu

**RITEX AI** là nền tảng giao dịch chuyên nghiệp kết nối trực tiếp đến [Hyperliquid DEX](https://hyperliquid.xyz) — sàn giao dịch phi tập trung hàng đầu. Không máy chủ trung gian, không thu thập dữ liệu. Mọi yêu cầu đi thẳng từ trình duyệt của bạn đến Hyperliquid.

### Tại sao chọn RITEX AI?

| | Đặc điểm | Mô tả |
|---|---|---|
| 🔒 | **Bảo mật tuyệt đối** | Khóa riêng được mã hóa cục bộ, không bao giờ truyền đi |
| ⚡ | **Tốc độ thời gian thực** | WebSocket trực tiếp, cập nhật biểu đồ và giá tức thì |
| 📊 | **Phân tích chuyên sâu** | EMA, MACD, RSI, Stochastic, phát hiện phân kỳ tự động |
| 🔍 | **Quét thị trường** | Tự động quét toàn bộ thị trường tìm tín hiệu giao dịch |
| 🌐 | **Đa ngôn ngữ** | Hỗ trợ Tiếng Việt, English, 中文 |

---

## Tính năng chính

### 📈 Biểu đồ & Phân tích kỹ thuật
- Biểu đồ nến thời gian thực (TradingView lightweight-charts)
- Chỉ báo: EMA (5/20/50), MACD, RSI, Stochastic Oscillator
- Kênh Donchian và Keltner
- Phát hiện hỗ trợ/kháng cự tự động
- Phát hiện phân kỳ thường và ẩn (MACD, RSI, Stochastic)
- Phân tích đa khung thời gian đồng bộ (1m, 5m, 15m, 1h)

### 🔍 Quét tín hiệu thị trường
- Quét toàn bộ cặp giao dịch tìm tín hiệu
- Phát hiện Stochastic cực đoan, EMA đồng hướng, đột biến khối lượng
- Phân kỳ đa khung thời gian với chấm điểm độ tin cậy
- Chế độ đảo ngược cho chiến lược bán khống

### ⚡ Thực thi lệnh
- Cloud ladder để trải lệnh DCA chính xác
- Lệnh thị trường một chạm
- Cắt lỗ và chốt lời tự động
- Phím tắt cho mọi hành động giao dịch

### 📊 Theo dõi hiệu suất
- Thống kê P&L theo ngày và tháng
- Biểu đồ P&L tích lũy
- Tỷ lệ thắng, trung bình giao dịch, phí
- Theo dõi ví của trader khác (Watchlist)

### 🎨 Giao diện
- 20+ giao diện màu sắc (Terminal Green, Synthwave, Amber, Cyberpunk, Matrix...)
- Hỗ trợ đa màn hình — bật biểu đồ ra cửa sổ riêng
- Thiết kế responsive cho mobile
- Thông báo âm thanh tùy chỉnh

---

## Bắt đầu

### Yêu cầu
- Node.js 18+
- Địa chỉ ví Hyperliquid (hỗ trợ chế độ chỉ đọc)

### Cài đặt

```bash
git clone https://github.com/Dinoxv/ritex-ai.git
cd ritex-ai
npm install
```

### Phát triển

```bash
npm run dev
```

Truy cập tại [http://localhost:3001](http://localhost:3001)

### Production

```bash
npm run build
npm start
```

### Deploy với PM2

```bash
pm2 start ecosystem.config.js
```

---

## Công nghệ

| Thành phần | Công nghệ |
|---|---|
| Framework | Next.js 16 + React 19 |
| Ngôn ngữ | TypeScript 5 |
| Giao diện | TailwindCSS 4 |
| Biểu đồ | TradingView lightweight-charts 4.2 |
| State | Zustand 5 (20+ store) |
| API | @nktkas/hyperliquid SDK |
| Font | BinancePlex (local) |
| i18n | Tiếng Việt, English, 中文 |

---

## Phím tắt

| Phím | Hành động |
|---|---|
| `Ctrl/Cmd + K` | Tìm kiếm nhanh cặp giao dịch |
| `Ctrl/Cmd + M` | Bật/tắt đa khung thời gian |
| `Ctrl/Cmd + I` | Bật/tắt chế độ đảo ngược |
| `Ctrl/Cmd + ,` | Mở cài đặt |

---

## Cấu trúc dự án

```
ritex-ai/
├── app/                    # Next.js App Router
│   ├── [address]/          # Các trang giao dịch
│   ├── layout.tsx          # Layout chính + SEO
│   └── page.tsx            # Trang chủ
├── components/             # React components
├── stores/                 # Zustand stores (20+)
├── lib/
│   ├── indicators.ts       # Phân tích kỹ thuật
│   ├── i18n/               # Đa ngôn ngữ (en/vi/zh)
│   ├── services/           # API services
│   └── websocket/          # WebSocket managers
├── hooks/                  # React hooks
└── types/                  # TypeScript types
```

---

## Tác giả

Phát triển bởi **RITEX AI** — [ritexai.com](https://ritexai.com)

## Giấy phép

Chỉ sử dụng cá nhân.

## Tuyên bố miễn trừ

Phần mềm này chỉ dành cho mục đích giáo dục và tham khảo. Giao dịch tiền mã hóa có rủi ro tổn thất tài chính đáng kể. Hiệu suất quá khứ không đảm bảo kết quả tương lai. Sử dụng theo rủi ro của bạn.
