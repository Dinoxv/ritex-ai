# RITEX AI - HyperScalper

Nền tảng giao dịch và scanner tín hiệu cho Hyperliquid và Binance USD-M Futures, tối ưu cho tốc độ và quan sát thị trường thời gian thực.

## Điểm nổi bật

- Multi-exchange: Hyperliquid + Binance USD-M Futures
- Scanner đa chiến lược với 10 bộ quét:
  - Stochastic
  - Volume Spike
  - EMA Alignment
  - MACD Reversal
  - RSI Reversal
  - Channel
  - Divergence
  - Support/Resistance
  - Kalman Trend
  - Ritchi Trend
- Scanner có tiến độ realtime:
  - preparing
  - fetching-candles
  - scanning
  - finalizing
- Metrics hiệu năng scanner:
  - tổng số lần chạy
  - trung bình thời gian chạy
  - thời gian chạy gần nhất
  - số lần fail
  - top scanner chậm nhất
- Cảnh báo hiệu năng theo ngưỡng cấu hình:
  - Medium warning (màu vàng)
  - High warning (màu đỏ)
- Retry + exponential backoff cho fetch candles
- Batch size động theo exchange để cân bằng tốc độ và ổn định

## Cập nhật mới nhất

### P0 - Stability & Correctness

- Fix race condition khi scanner fetch candles đồng thời
- Bỏ hardcoded yêu cầu candles và tính động theo scanner/timeframe đang bật
- Validate lại dữ liệu sau khi aggregate 1m -> 5m trước khi scan

### P1 - Maintainability & Throughput

- Refactor logic scan nhiều symbol về generic runner
- Thêm giới hạn concurrency khi scan để tránh bắn quá nhiều promise cùng lúc
- Thêm clamp validation cho input số trong Scanner Settings

### P2 - Operational Visibility

- Structured logger cho ScannerService và ScannerStore
- Progress tracking theo stage trong scanner status
- Dynamic batch size khi fetch candles theo exchange

### P3 - Performance Alerting

- Retry/backoff khi fetch candle bị lỗi tạm thời
- Scanner runtime metrics theo từng scan type
- UI progress bar + metrics trong Sidepanel
- Cảnh báo màu vàng/đỏ theo ngưỡng thời gian chạy
- Ngưỡng cảnh báo đưa vào Settings, chỉnh realtime:
  - Medium Duration Warning (seconds)
  - High Duration Warning (seconds)

## Cấu hình Scanner Warning Threshold

Trong Settings -> Scanner:

- Medium Duration Warning (seconds)
- High Duration Warning (seconds)

Quy tắc hiển thị:

- Avg duration > High -> đỏ
- Avg duration > Medium và <= High -> vàng
- Còn lại -> màu mặc định

## Bảo mật trước khi push

Đã áp dụng hardening cho ignore rule để tránh lộ dữ liệu local:

- Ignore env local
- Ignore credential/secrets/token files local
- Ignore file backup

Khuyến nghị trước khi public source:

1. Không commit key/secret thật vào code, config, hoặc docs
2. Dùng file ví dụ dạng .example cho biến môi trường
3. Giữ remote URL sạch, không nhúng token
4. Rà lại lịch sử commit nếu từng lộ key

## Cài đặt

Yêu cầu:

- Node.js 18+
- npm 9+

Chạy local:

```bash
npm install
npm run dev
```

Build production:

```bash
npm run build
npm start
```

## Deploy với PM2

```bash
pm2 start ecosystem.config.js
```

Hoặc restart frontend:

```bash
pm2 restart hyperscalper-frontend
```

## Cấu trúc chính

- app: Next.js App Router
- components: UI và chart/scanner panels
- lib/services: exchange services và scanner service
- stores: Zustand stores cho scanner, settings, candles, positions, orders
- models: type contracts

## Ghi chú quan trọng

- Binance integration trong dự án này tập trung vào USD-M Futures.
- Scanner chỉ scan tốt khi symbols có dữ liệu candle đầy đủ; hệ thống đã tự fetch bổ sung trước khi quét.

## License

Internal / Proprietary.
