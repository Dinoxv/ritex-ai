# INSTRUCTIONS MASTER PLAYBOOK v2.1

![Toilabap Logo](../toilabap.com-logo-dark.svg)
![Toilabap Icon](../toilabap.com-icon.svg)

## TOILABAP.COM — NỀN TẢNG GIAO DỊCH THUẬT TOÁN TOÀN DIỆN
### *Powered by Blankly-Architecture × Trend Matrix Strategy [Ritchi] × Pro Trader Marketing*

> **Nguyên tắc vàng khi dùng tài liệu này:**
> Mỗi đoạn copy không chỉ bán "tính năng" — nó bán **tốc độ tư duy** và **theo dấu Tiền Lớn**.
> Người đọc phải cảm nhận được hai điều: họ đang chậm hơn thị trường vì thiếu công cụ đúng,
> và Cá Mập luôn hành động trước — trong khi họ vẫn đang ngồi đọc chart thủ công.

> **Flagship Strategy tích hợp:** Trend Matrix Strategy [Ritchi] v3.1.1 — SMC + Confluence Scoring
> Đây là chiến lược mẫu được xây dựng sẵn trong nền tảng, chứng minh khả năng
> deploy một hệ thống giao dịch hoàn chỉnh chỉ bằng vài dòng cấu hình.

---

## I. ĐỊNH VỊ THƯƠNG HIỆU & SLOGAN HỆ THỐNG

### Nguyên tắc viết Slogan

Mỗi slogan phải đồng thời trả lời **3 câu hỏi ngầm** trong đầu trader:

- **"Slogan đem lại giá trị gì?"** → Có đến 89% các nhà giao dịch nhỏ lẻ (retail traders) thua lỗ. Nguyên nhân cốt lõi không phải vì chúng ta thiếu kỹ năng hay thiếu vốn. Đó là vì khoảng cách từ khi có **Ý Tưởng** đến khi có một **Chiến Lược Thực Thi** được quá dài — và Toilabap.com xóa bỏ khoảng cách đó.
- **"Chạy được nhiều thị trường không?"** → Stocks, Crypto, Forex, Futures — một package.
- **"Tôi có kiểm soát hoàn toàn không?"** → 100%.

---

### 🔥 BỘ SLOGAN CHÍNH THỨC (5 PHIÊN BẢN)

**Slogan 01 — Cốt lõi kỹ thuật (dành cho Dev & Quant)**
> 🚀 💸 **Toilabap.com** — One codebase. Any exchange. Zero friction.
> Build, backtest, và deploy strategy của anh em chỉ với vài dòng code Python.
> Trade Stocks, Crypto, Forex, Futures xuyên suốt mọi sàn trong một package duy nhất.

**Slogan 02 — Kích thích FOMO (dành cho Social Media / Twitter/X)**
> 🚀 💸 Junior quant tại các quỹ lớn kiếm $650K/năm để làm đúng một việc:
> biến ý tưởng trading thành chiến lược chạy live.
> Giờ anh em làm được điều đó trong **90 giây** tại Toilabap.com.

**Slogan 03 — Chuyên nghiệp & tinh gọn (dành cho Banner / LinkedIn)**
> 🚀 💸 Làm chủ Algo Trading chưa bao giờ đơn giản đến thế.
> Từ hypothesis → backtest → live deploy: một framework, một lần code, mọi sàn giao dịch.
> **Toilabap.com** — Cân mượt Stocks, Crypto, Forex & Futures.

**Slogan 04 — Tập trung vào Pain Point (dành cho Ads & Email Subject)**
> 🚀 💸 7 tuần để build một strategy. 7 ngày để thị trường xoay chiều.
> Bạn không cần code nhanh hơn. Bạn cần một framework thông minh hơn.
> Toilabap.com — Từ prompt đến lệnh live: **90 giây.**

**Slogan 05 — Community & Cộng đồng (dành cho Telegram / Zalo)**
> 🚀 💸 Anh em có ý tưởng. Chúng tôi có infrastructure.
> Drop chiến lược của bạn bằng ngôn ngữ tự nhiên — AI compile, backtest, deploy.
> Toilet à... **Toilabap.com** đang thay đổi cách trader Việt tiếp cận thị trường toàn cầu.

**Slogan 06 — SMC / Theo dấu Cá Mập (dành cho Trader SMC, Crypto, Forex)**
> 🐋 💸 Cá Mập luôn hành động trước. Bạn luôn phát hiện ra sau.
> **Trend Matrix Strategy** — hệ thống tự động theo dấu Tiền Lớn qua CHoCH, Liquidity Sweep và FVG.
> Bắt đúng **Khoảnh Khắc Đổi Chiều**. Vào lệnh cùng chiều Cá Mập. Chạy 24/7 tại **Toilabap.com**.

---

## II. ĐỊNH NGHĨA NỀN TẢNG — THEO KIẾN TRÚC BLANKLY FRAMEWORK

### Toilabap.com là gì? (The Honest Technical Answer)

Toilabap.com là một **nền tảng algo trading mã nguồn mở** được xây dựng trên kiến trúc tương tự Blankly Framework — chiếc cầu nối thông minh giữa logic chiến lược của bạn và mọi sàn giao dịch trên thế giới.

> **Triết lý cốt lõi (Core Philosophy):**
> *"Write your strategy logic once. Run it on any exchange, any asset class, without changing a single line of trading logic."*

Thay vì bạn phải viết code kết nối riêng cho từng broker, xử lý rate limits, quản lý WebSocket feeds, hay tự implement Sharpe ratio từ đầu — **Toilabap.com abstract hóa toàn bộ hạ tầng đó đi**, để bạn tập trung vào điều duy nhất quan trọng: **tư duy chiến lược**.

> **Flagship tích hợp sẵn — Trend Matrix Strategy [Ritchi] v3.1.1:**
> Thay vì bắt đầu từ tờ giấy trắng, người dùng có ngay một chiến lược SMC hoàn chỉnh
> được build sẵn trên nền tảng: theo dấu Tiền Lớn, lọc qua 4 tầng Confluence Score,
> tự quản lý rủi ro bằng ATR Trailing Stop và Partial Take Profit 4 mức.
> Đây là "blueprint" để bạn học cách một hệ thống production-grade được xây dựng.

---

### 2.1 Kiến trúc kỹ thuật — The Stack

```
┌─────────────────────────────────────────────────────────┐
│                    YOUR STRATEGY LOGIC                  │
│         (price_event → entry/exit/sizing/risk)          │
├─────────────────────────────────────────────────────────┤
│              TOILABAP.COM FRAMEWORK LAYER               │
│   Backtest Engine │ Paper Trade │ Sandbox │ Live Deploy  │
├─────────────────────────────────────────────────────────┤
│              EXCHANGE ABSTRACTION LAYER                 │
│  Alpaca │ Interactive Brokers │ Binance │ Coinbase │ ... │
├─────────────────────────────────────────────────────────┤
│                 ASSET CLASS COVERAGE                    │
│   Stocks (VN/US) │ Crypto │ Forex │ Futures │ Hàng Hóa  │
└─────────────────────────────────────────────────────────┘
```

**Mỗi tầng trong stack này giải quyết một vấn đề cụ thể:**

| Tầng | Vấn đề truyền thống | Giải pháp Toilabap |
|------|---------------------|---------------------|
| Strategy Logic | Viết lại từ đầu cho từng sàn | Một codebase, chạy mọi sàn |
| SMC / Signal Engine | Tự code CHoCH, FVG, Sweep detection | Trend Matrix Strategy — built-in sẵn |
| Backtesting | Import thư viện riêng, data scraping | `strategy.backtest()` — một dòng |
| Live Deploy | Config phức tạp, infra tốn kém | `strategy.run()` — thay một dòng |
| Exchange Integration | Mỗi API là một học trình mới | Abstract Interface đồng nhất |
| Data Feed | `yfinance`, `polygon.io`, tự scrape | Historical + Real-time tích hợp sẵn |
| Risk Management | Tự code ATR stop, trailing, sizing | ATR Trailing Stop + Partial TP tự động |

---

### 2.2 Tích hợp công cụ phân tích (Ecosystem Compatibility)

Nền tảng kết nối trực tiếp với tài khoản giao dịch cá nhân và tương tác đồng thời với:

**Nền tảng phân tích kỹ thuật:**
- Amibroker, MetaTrader (MT4/MT5)

**Ngôn ngữ lập trình native:**
- Python (primary), NodeJS

**Công cụ dữ liệu văn phòng:**
- Excel, Google Spreadsheet (cho trader không muốn code)

**Thị trường giao dịch:**
- Stocks (HOSE/HNX/UPCOM + US Markets), Crypto, Forex, Hàng hóa phái sinh

**Sàn & Broker tích hợp:**
- Alpaca, Interactive Brokers, Robinhood, Schwab, Binance, Coinbase, OANDA, và các sàn crypto major

---

## III. BÀI TOÁN THỊ TRƯỜNG — VIẾT THEO FRAMEWORK "TRADITIONALLY vs. USING TOILABAP"

> **Nguyên tắc viết section này:**
> Không phàn nàn chung chung. Chỉ ra **cụ thể từng bước** trader đang lãng phí thời gian ở đâu — rồi show code để chứng minh giải pháp.

---

### 3.1 Nỗi đau Số 1: Thu thập dữ liệu lịch sử (Data Gathering)

**Cách truyền thống — tốn 2-4 giờ mỗi lần:**

```python
# Phương pháp cũ: mỗi nguồn data là một API khác nhau
import yfinance as yf          # US Stocks
from binance.client import Client  # Crypto
import oandapyV20              # Forex

# Và bạn phải học 3 syntax khác nhau, handle 3 rate limit khác nhau
# Chưa kể data format không đồng nhất → normalize thủ công

btc_data = client.get_historical_klines("BTCUSDT", Client.KLINE_INTERVAL_1DAY, "1 Jan, 2020")
msft_data = yf.Ticker("MSFT").history(period="1y", interval="1d")
# ... 50 dòng boilerplate code chỉ để lấy data
```

**Với Toilabap.com — 3 dòng, đồng nhất hoàn toàn:**

```python
from toilabap import Alpaca, Binance, OANDA

# Cùng một interface, mọi sàn, mọi asset class
alpaca = Alpaca()
interface = alpaca.interface

# Historical data: cùng syntax cho Stocks, Crypto, Forex
interface.history('MSFT', 50, resolution='1d')      # US Stocks
interface.history('BTC-USD', 50, resolution='1h')   # Crypto
interface.history('EUR/USD', 50, resolution='15m')  # Forex
```

> **Kết quả:** Tiết kiệm 2-4 giờ data engineering mỗi lần test hypothesis mới.

---

### 3.2 Nỗi đau Số 2: Backtest + Portfolio Metrics

**Cách truyền thống — tốn 2-3 tuần, dễ sai:**

```python
# Bạn phải tự implement từng metric
import math
from statistics import mean, stdev

def sharpe_ratio(returns, risk_free=0.0, periods=252):
    excess = [r - risk_free/periods for r in returns]
    return mean(excess) / stdev(excess) * math.sqrt(periods)

def max_drawdown(portfolio_values):
    peak = portfolio_values[0]
    max_dd = 0
    for val in portfolio_values:
        if val > peak:
            peak = val
        dd = (peak - val) / peak
        if dd > max_dd:
            max_dd = dd
    return max_dd

# ... rồi viết riêng loop backtest, track positions, handle splits, dividends
# ... rồi debug tại sao số backtest không khớp live
# Tổng: 200-500 dòng code TRƯỚC KHI bạn test được strategy đầu tiên
```

**Với Toilabap.com — Backtest và Live là CÙNG MỘT CODE:**

```python
import toilabap
from toilabap import Strategy, StrategyState

def init(symbol: str, state: StrategyState):
    state.variables['history'] = state.interface.history(
        symbol, to='1y', resolution='1d', return_as='list'
    )['close']
    state.variables['owns_position'] = False

def price_event(price: float, symbol: str, state: StrategyState):
    interface = state.interface
    rsi = toilabap.indicators.rsi(state.variables['history'])

    if rsi[-1] < 30 and not state.variables['owns_position']:
        # Mua với 25% portfolio, kiểm soát rủi ro tự động
        interface.market_order(symbol, 'buy',
                               int((0.25 * interface.cash) / price))
        state.variables['owns_position'] = True

    elif rsi[-1] > 70 and state.variables['owns_position']:
        amt = interface.account[state.base_asset]['available']
        interface.market_order(symbol, 'sell', int(amt))
        state.variables['owns_position'] = False

    state.variables['history'].append(price)

# --- BACKTEST: chỉ cần một dòng ---
exchange = toilabap.Alpaca()
s = Strategy(exchange)
s.add_price_event(price_event, symbol='MSFT', resolution='1d', init=init)
s.backtest(to='1y', initial_values={'USD': 100000})
# → Tự động xuất: Sharpe, Sortino, Max Drawdown, CAGR, Win Rate

# --- LIVE DEPLOY: thay đúng một dòng ---
# s.backtest(to='1y', ...) → s.run()
# KHÔNG THAY ĐỔI MỘT DÒNG LOGIC NÀO KHÁC
s.run()
```

> **Kết quả:** Sharpe, Sortino, Max Drawdown, Win Rate — tất cả được tính tự động. Zero boilerplate.

---

### 3.3 Nỗi đau Số 3: Scale lên nhiều Symbol & Nhiều Sàn

**Cách truyền thống — nhân đôi effort cho mỗi symbol mới:**

```python
# Muốn chạy trên MSFT, AAPL, BTC? → 3 file riêng, 3 loop riêng
# Muốn chuyển từ Alpaca sang Binance? → Viết lại toàn bộ connector
msft_result = run_backtest_for('MSFT', msft_data)
aapl_result = run_backtest_for('AAPL', aapl_data)
btc_result = run_backtest_for_crypto('BTC', btc_data)  # hàm khác vì crypto khác
```

**Với Toilabap.com — thêm một symbol = thêm một dòng:**

```python
s = Strategy(toilabap.Alpaca())

# Chạy cùng một strategy logic trên nhiều symbol đồng thời
s.add_price_event(price_event, symbol='MSFT', resolution='1d', init=init)
s.add_price_event(price_event, symbol='AAPL', resolution='1d', init=init)
s.add_price_event(price_event, symbol='TSLA', resolution='15m', init=init)

# Muốn chuyển sang Crypto? Đổi exchange object, giữ nguyên logic
crypto_exchange = toilabap.Binance()
s2 = Strategy(crypto_exchange)
s2.add_price_event(price_event, symbol='BTC-USD', resolution='1d', init=init)
s2.add_price_event(price_event, symbol='ETH-USD', resolution='4h', init=init)

# Metrics được tính trên TOÀN BỘ PORTFOLIO, không chỉ từng symbol riêng lẻ
s.backtest(to='1y', initial_values={'USD': 100000})
```

> **Kết quả:** Modular. Scalable. Cross-exchange mà không viết lại logic.

---

### 3.4 Nỗi đau Số 4: Build một hệ thống SMC hoàn chỉnh (CHoCH + Liquidity Sweep + FVG)

**Cách truyền thống — tốn 3-4 tuần chỉ riêng phần signal detection:**

```python
# Bạn cần tự code từng khái niệm SMC một:
# 1. Tìm Pivot High/Low (Market Structure)
# 2. Detect CHoCH (pivot bị break)
# 3. Check Liquidity Sweep (wick xuyên pivot trong N nến trước CHoCH)
# 4. Confirm FVG (3-bar gap trên nến CHoCH)
# 5. Filter theo HTF Bias (EMA khung cao hơn)
# 6. Filter theo Killzone (giờ London/NY)
# 7. Tính ATR position sizing
# 8. Trailing stop logic
# 9. Partial TP 4 mức...
# → Hàng trăm dòng code, hàng chục edge case, dễ look-ahead bias
```

**Với Trend Matrix Strategy trên Toilabap.com — cấu hình trong 2 phút:**

```python
# Toàn bộ logic SMC đã được build và kiểm chứng sẵn.
# Bạn chỉ cần cấu hình thông số theo chiến lược của mình:

strategy_config = {
    # --- Nhịp Sóng Giá (Market Structure) ---
    "ms_length": 8,           # Độ nhạy phát hiện Đỉnh/Đáy Sóng
    "htf_timeframe": "5",     # La Bàn: dùng khung 5 phút xác nhận bias
    "htf_ema_length": 50,     # Độ dài Đường Kim Chỉ

    # --- Bộ Lọc Thông Minh (Confluence Score) ---
    "min_confluence": 2,      # Vào lệnh khi đạt tối thiểu 2/4 điểm
    "filter_killzone": True,  # Bật: Giờ Vàng (London + NY sessions)
    "filter_sweep": True,     # Bật: Bẫy Tiền Thông Minh đã xảy ra
    "filter_htf_bias": True,  # Bật: La Bàn đúng chiều
    "filter_fvg": True,       # Bật: Vùng Hút Giá xuất hiện

    # --- Thước Đo Sóng (ATR) ---
    "atr_length": 14,         # Chu kỳ đo sóng
    "atr_trailing_mult": 4.0, # Lá Chắn cách giá = 4x chiều rộng sóng
    "tp_step_mult": 2.0,      # Khoảng cách giữa 4 Túi Tiền

    # --- Bảo Vệ Túi Tiền (Risk Management) ---
    "risk_per_trade": 1.0,    # Tối đa mất 1% vốn mỗi lệnh
    "max_loss_pct": 3.0,      # Giới Hạn Cuối tuyệt đối: -3%
    "partial_tp_pct": 25.0    # Thu Hoạch Từng Bước: 25% mỗi Túi Tiền
}

# Backtest 5 năm BTC trên khung 1 phút — 47 giây
s.backtest(symbol="BTCUSDT", config=strategy_config, to="5y")
# → Kết quả: Sharpe, Win Rate, Max Drawdown, Profit Factor

# Deploy live lên Binance — thay một dòng
s.run(symbol="BTCUSDT", config=strategy_config)
```

> **Kết quả:** Toàn bộ logic SMC production-grade (CHoCH detection, Sweep filter, FVG confirm,
> ATR trailing, Partial TP × 4) — cấu hình xong trong 2 phút, không cần tự code từ đầu.

---

### 3.5 "Lời nguyền" 7 tuần — Số liệu thực tế

**Tại sao 89% retail trader thua lỗ không phải vì thiếu IQ:**

Vào năm 2025, khoảng cách từ ý tưởng đến execution trung bình kéo dài **7 tuần**:

```
TUẦN 1-3: Code entry/exit logic, position sizing, risk constraints
          → Bug: Off-by-one trong data index, look-ahead bias
          → Bug: Position sizing không normalize theo portfolio value
          → Với TMS: 3 tuần này = 2 phút cấu hình strategy_config

TUẦN 4-5: Backtest walk-forward, out-of-sample validation
          → Bug: Backtest engine xử lý split/dividend sai
          → Bug: Slippage model không realistic
          → Với TMS: BTC 1-phút 5 năm backtest xong trong 47 giây

TUẦN 6:   Validate Sharpe, Max Drawdown, factor exposure
          → Management "kill" strategy sau khi thấy drawdown tệ hơn benchmark
          → Với TMS: Sharpe, Win Rate, Profit Factor xuất tự động sau backtest

TUẦN 7:   Paper trade để check slippage thực tế
          → Market regime đã dịch chuyển. Edge không còn tồn tại.
          → Với TMS: Confluence Score (4 filter) tự lọc tín hiệu kém, tăng Win Rate

CHI PHÍ: $87,500 tiền lương thuần (junior quant tại quỹ lớn ~$650K/năm)
         + Data feeds, infrastructure, overhead
```

**Với Toilabap.com + Trend Matrix Strategy — Pipeline rút xuống còn 90 giây:**

```
T+0s:   Nhập hypothesis bằng ngôn ngữ tự nhiên
        "BTC strategy, risk 1% per trade, R:R 2:1, stop loss 1.5x ATR"
        — hoặc load sẵn Trend Matrix Strategy config —

T+15s:  AI biên dịch thành Strategy object hoàn chỉnh
        → CHoCH detection, Sweep filter, FVG confirm, HTF bias, Killzone
        → ATR position sizing + Trailing Stop + Partial TP × 4

T+47s:  Backtest BTC 5 năm khung 1 phút → 47 giây
        Backtest Daily 5 năm → 12 giây
        Sharpe, Sortino, Max Drawdown, Win Rate, Profit Factor → tự động

T+90s:  s.run() → Kết nối Binance/Alpaca/broker được chọn, deploy live
        Bot tự vận hành 24/7, tự canh Giờ Vàng, tự đặt Lá Chắn, tự Thu Hoạch
```

> **Competitive Edge thực sự:**
> Không phải AI "tìm ra alpha" cho bạn.
> Mà là bạn **test được 50 hypothesis** trong thời gian một quỹ tổ chức test được 1.
> Đó là moat thực sự của Toilabap.com.

---

## IV. PIPELINE CHIẾN LƯỢC — THE LIFECYCLE (Blankly-Inspired)

### 4.1 Vòng đời một Strategy tại Toilabap.com

```
[1. IDEA]           Nhập hypothesis bằng ngôn ngữ tự nhiên
     ↓              — hoặc load Trend Matrix Strategy (SMC built-in) —
[2. STRATEGY]       AI / Framework compile thành Strategy object
     ↓              CHoCH + Sweep + FVG + HTF Bias + Killzone + ATR Risk
[3. CONFLUENCE]     Bộ Lọc 4 Tầng tự chấm Điểm Tin Cậy (0–4 điểm)
     ↓              Chỉ vào lệnh khi đạt ngưỡng tối thiểu (mặc định: 2/4)
[4. BACKTEST]       s.backtest(to='5y') — BTC 1m: 47 giây | Daily: 12 giây
     ↓              Sharpe, Sortino, CAGR, Max Drawdown, Win Rate, Profit Factor
[5. PAPER TRADE]    s.paper_trade() — test live market không có tiền thật
     ↓              Validate slippage thực tế so với backtest
[6. SANDBOX]        s.sandbox_test() — stress test điều kiện cực đoan
     ↓              Flash crash, thin liquidity, gap qua stop loss
[7. LIVE DEPLOY]    s.run() — một dòng lệnh, deploy lên broker
     ↓              24/7 automated: canh Giờ Vàng, theo dấu Cá Mập, tự Thu Hoạch
[8. ITERATE]        Nếu edge mờ dần → điều chỉnh Confluence Score → 90 giây
```

### 4.2 Các loại Order được hỗ trợ

| Order Type | Tên thân thiện | Use Case trong TMS |
|------------|----------------|--------------------|
| Market Order | Lệnh vào ngay | Entry tại CHoCH, Exit khi chạm TP/SL |
| Limit Order | Lệnh chờ giá | Entry tại Vùng Hút Giá (FVG retest) |
| ATR Trailing Stop | Lá Chắn Tự Chạy | Risk management tự động theo sóng |
| Hard Stop Loss | Giới Hạn Cuối | Bảo vệ tuyệt đối, -3% mặc định |
| Partial Take Profit | Thu Hoạch Từng Bước | TP1 → TP2 → TP3 → TP4, 25% mỗi bước |
| Futures Order | Lệnh Phái Sinh | Leverage + Short selling trên Crypto |

### 4.3 Built-in Metrics & Indicators

**Metrics tự động sau mỗi backtest:**
- Sharpe Ratio, Sortino Ratio, Calmar Ratio
- Maximum Drawdown, Average Drawdown Duration
- CAGR (Compound Annual Growth Rate)
- Win Rate, Profit Factor, Expectancy
- Beta, Alpha vs Benchmark

**Indicators tích hợp sẵn (dùng trong TMS):**
- `toilabap.indicators.atr(data, length=14)` — Thước Đo Sóng (ATR) cho position sizing & stop
- `toilabap.indicators.ema(data, length=50)` — Đường Kim Chỉ (HTF Bias filter)
- `toilabap.indicators.pivot_high(data, left, right)` — Đỉnh Sóng
- `toilabap.indicators.pivot_low(data, left, right)` — Đáy Sóng
- `toilabap.indicators.rsi(data)` — RSI (mean-reversion strategies)
- `toilabap.indicators.macd(data)` — MACD (trend confirmation)
- `toilabap.indicators.bollinger(data)` — Bollinger Bands (volatility breakout)
- Và toàn bộ thư viện TA-Lib qua C-binding, hiệu năng tối ưu

---

## V. ĐỊNH HƯỚNG TƯ DUY TRADING — THE HONEST TAKE

> **Nguyên tắc truyền thông:** Nói thật. Trader thực sự phát hiện hype ngay lập tức.
> Xây dựng trust bằng cách thừa nhận giới hạn — đó mới là marketing bền vững.

---

### 5.1 Những gì Toilabap.com THỰC SỰ làm được

✅ **Nén 7 tuần xuống 90 giây** — từ hypothesis đến live deploy

✅ **Eliminate infrastructure overhead** — không cần tự build data pipeline, exchange connector, backtest engine

✅ **One codebase, cross-exchange** — write once, run on Alpaca, Binance, OANDA, Interactive Brokers

✅ **Production-grade SMC strategy built-in** — Trend Matrix Strategy với CHoCH + Sweep + FVG + Killzone sẵn sàng deploy

✅ **Confluence Score System** — 4 tầng lọc tự động nâng Win Rate, giảm tín hiệu nhiễu

✅ **ATR-based risk management** — Trailing Stop tự động, Partial TP × 4 mức, Hard Stop tuyệt đối

✅ **Fast iteration velocity** — test 50 hypotheses trong thời gian quỹ tổ chức test 1

✅ **24/7 automated execution** — bot canh Giờ Vàng, theo dấu Cá Mập, chốt lời khi bạn ngủ

### 5.2 Những gì Toilabap.com KHÔNG làm

❌ **Không "tìm ra alpha" thay bạn** — AI compile strategy của bạn, không sáng tạo edge từ không khí

❌ **Không đảm bảo lợi nhuận** — Bản chất quant research là thử nghiệm liên tục; hầu hết hypothesis sẽ fail

❌ **Không thay thế tư duy chiến lược** — Tool tốt nhưng thesis sai thì backtest cũng chỉ cho thấy thesis đó fail nhanh hơn

❌ **Không tự optimize parameter** — Bạn vẫn cần hiểu trade-off giữa overfitting và robustness

> **Bottom line:** Bạn sở hữu năng lực của junior quant $650K/năm về mặt execution speed.
> Còn alpha discovery vẫn là bài toán của bạn — và đó là công bằng.

---

### 5.3 Hypotheses đang được cộng đồng test thực tế

Dưới đây là các chiến lược đang được cộng đồng chạy backtest qua Toilabap.com — không phải lý thuyết. Tất cả đều được build trên nền Trend Matrix Strategy:

**[Strategy 01] SMC Thuần — BTC/ETH theo dấu Cá Mập (TMS Default)**
```python
# Vào lệnh khi: CHoCH xác nhận + Cá Mập vừa đặt Bẫy + Giờ Vàng NY
# Bộ lọc: min_confluence=3  (Sweep + HTF Bias + FVG — 3/4 điểm)
# Risk: 1% vốn mỗi lệnh | Stop: 4× ATR Trailing | TP: 4 mức × 25%
# Key metric cần check: Profit Factor > 1.8, Win Rate > 55%
# Backtest BTC 5 năm khung 1m → 47 giây
```

**[Strategy 02] Scalp Giờ Vàng — London Open 14h–17h**
```python
# Chỉ trade trong London Open Session (14:00–17:00 VN)
# CHoCH trên khung 1 phút, HTF bias từ khung 5 phút
# Filter chặt: min_confluence=4 (tất cả 4 tầng phải đạt)
# Key metric: số lệnh ít hơn nhưng Win Rate cao hơn đáng kể
# Phù hợp trader muốn trade xong trước 5 giờ chiều
```

**[Strategy 03] Swing BTC/ETH/SOL — Khung 4H theo HTF Bias**
```python
# HTF bias từ khung Daily, entry trên khung 4H
# Chỉ MUA khi giá > EMA(50) Daily — Chỉ BÁN khi giá < EMA(50) Daily
# ATR trailing mult=6.0 (rộng hơn cho swing dài ngày)
# TP step mult=3.0 (4 Túi Tiền cách xa hơn)
# Phù hợp trader không muốn canh màn hình, swing 3-10 ngày/lệnh
```

**[Strategy 04] Vùng Hút Giá (FVG Retest) — US Stocks giờ mở cửa**
```python
# Chờ FVG tạo ra sau CHoCH → Entry khi giá retest Vùng Hút Giá
# Logic: displacement mạnh tạo FVG → giá quay về lấp đầy → vào lệnh
# Sàn: Alpaca (MSFT, AAPL, NVDA, SPY) | Session: NY AM 19h30–22h VN
# Key challenge: cần confirm FVG trước khi price chạm, không vào muộn
```

**[Strategy 05] Bẫy Liquidity + Đảo Chiều — Forex EUR/USD**
```python
# Vào lệnh ngay sau cú Bẫy Tiền Thông Minh (Sweep) xác nhận
# Pattern: wick xuyên Đỉnh/Đáy Sóng → body đóng ngược chiều → CHoCH
# Sàn: OANDA (EUR/USD, GBP/USD) | Session: London + NY overlap
# Risk thấp hơn: 0.5% per trade (Forex leverage cao)
# Đây là pattern "Silver Bullet" cổ điển trong SMC community
```

---

## VI. CHIẾN LƯỢC NỘI DUNG THEO KÊNH (CHANNEL PLAYBOOK)

### 6.1 Twitter/X — Giọng điệu: Provocative & Data-first

**Format chuẩn cho Viral Thread:**

```
HOOK (Tweet 1):
"89% retail trader thua lỗ không phải vì thiếu chiến lược tốt.
Mà vì mất 7 tuần để build chiến lược đó — và market không chờ ai.

Thread về cách Toilabap.com fix điều này 👇"

CONTENT (Tweet 2-8):
→ Tweet 2: Breakdown chi tiết 7 tuần truyền thống
→ Tweet 3: Code comparison (before vs. after)
→ Tweet 4: Backtest result của một strategy cụ thể
→ Tweet 5: "50 hypotheses vs. 1 hypothesis" framing
→ Tweet 6: Live demo clip hoặc GIF
→ Tweet 7: Community hypothesis challenge

CTA (Tweet 8):
"Anh em đang test hypothesis nào?
Drop vào replies — chúng tôi sẽ chọn ngẫu nhiên và cho AI backtest live tuần này.
Waitlist (12,000+ traders): [link]"
```

**Post đơn lẻ hiệu quả cao:**

```
"Trend Matrix Strategy — backtest BTC 5 năm khung 1 phút.
Kết quả với 3 bộ Confluence Score khác nhau:

- Min Score = 1 (ít lọc): 847 lệnh | Win Rate 48% | Profit Factor 1.21
- Min Score = 2 (cân bằng): 412 lệnh | Win Rate 56% | Profit Factor 1.67  ← sweet spot
- Min Score = 3 (chặt): 198 lệnh | Win Rate 63% | Profit Factor 2.14

Ít tín hiệu hơn. Win Rate cao hơn hẳn.
Đây là lý do Toilabap.com build Confluence Score System.

@Toilabap"
```

---

### 6.2 Facebook — Giọng điệu: Storytelling + Community

**Content format hiệu quả:**

```
HOOK: Câu chuyện cụ thể của một trader
"Tháng 3/2025, anh Minh (trader Crypto từ Đà Nẵng) mất 3 tuần
code hệ thống theo dấu Cá Mập — CHoCH, Liquidity Sweep, FVG.

Code chạy được. Nhưng look-ahead bias.
Fix xong. Nhưng position sizing sai.
Fix xong. Nhưng trailing stop không đúng ATR.
Đến khi deploy được — BTC đã pump 40% rồi."

BRIDGE: Giải pháp
"Nếu anh ấy dùng Trend Matrix Strategy trên Toilabap.com,
toàn bộ 3 tuần đó rút xuống còn 2 phút cấu hình..."

PROOF: Backtest kết quả thực
[Screenshot: Backtest BTC 1m 5 năm — Win Rate 56%, Profit Factor 1.67]
[GIF: Bot tự canh Giờ Vàng, phát tín hiệu MUA (3/4), Thu Hoạch Từng Bước]

CTA: Engagement + Waitlist
"Anh em đang code hệ thống SMC nào?
Comment xuống dưới — team chúng tôi sẽ review và backtest miễn phí!"
```

---

### 6.3 Telegram/Zalo — Giọng điệu: Kỹ thuật + Cộng đồng thân thiện

**Template tin nhắn cộng đồng:**

```
🔬 TMS HYPOTHESIS CHALLENGE TUẦN NÀY

Anh em drop cấu hình Trend Matrix Strategy của mình vào đây.
Chúng tôi sẽ:
1. Load config vào Trend Matrix Strategy trên Toilabap.com
2. Backtest 5 năm live (BTC 1m = 47 giây)
3. Share kết quả đầy đủ: Sharpe, Win Rate, Profit Factor, Max DD

Format đơn giản:
"[Symbol] | [Khung TG] | Confluence: [X/4] | Risk: [Y%] | ATR Mult: [Z]"

Ví dụ:
"BTCUSDT | 1m | Confluence: 3/4 | Risk: 1% | ATR: 4.0"
"EURUSD | 5m | Confluence: 2/4 (bỏ FVG) | Risk: 0.5% | ATR: 5.0"
"NVDA | 15m | Confluence: 4/4 | Risk: 1.5% | ATR: 3.5"

Tuần trước: 12 config nhận được.
3 config có Profit Factor > 1.8. 9 fail — tiết kiệm tiền thật trước khi deploy.
Đó mới là giá trị thực sự. 🎯
```

---

## VII. CTA MATRIX — THEO MỤC TIÊU CONVERSION

### CTA Level 1 — Awareness (Nhận thức)
> *"89% trader thua lỗ. Một phần lý do là thời gian build strategy quá lâu. Tìm hiểu thêm tại Toilabap.com"*

### CTA Level 2 — Engagement (Tương tác)
> *"Drop ý tưởng chiến lược trading của bạn vào phần comment. Chúng tôi sẽ chọn ngẫu nhiên và cho AI chạy backtest live tuần này — hoàn toàn miễn phí."*

### CTA Level 3 — Conversion (Đăng ký Waitlist)
> *"12,000+ algo traders đang trong waitlist Closed Beta. Con hào công nghệ của các quỹ lớn nay đã bị san phẳng. Bạn muốn là người dùng đầu tiên hay người học từ người khác?"*
>
> **→ Đăng ký truy cập sớm tại: [Toilabap.com](https://toilabap.com)**

### CTA Level 4 — High-intent (Direct Contact)
> *"Sẵn sàng build strategy đầu tiên của bạn? Liên hệ trực tiếp để được onboard vào Closed Beta sớm nhất:"*

---

## VIII. THÔNG TIN LIÊN HỆ CHÍNH THỨC

### 📬 HỆ THỐNG KÊNH KẾT NỐI TOILABAP.COM

| Kênh | Link | Use Case |
|------|------|----------|
| 🌐 Website chính | [Toilabap.com](https://toilabap.com) | Waitlist, product info |
| 🔗 Platform phụ | [Ritchi.guru](https://ritchi.guru) | AI Agent documentation |
| 💬 Telegram | [@Jbap1989](https://t.me/Jbap1989) | Real-time support, community |
| 📱 Zalo | [+84 859295259](https://zalo.me/859295259) | Vietnamese market support |
| 👥 Facebook | [Connect tại đây](https://www.facebook.com/share/1EVjJuNhce/?mibextid=wwXIfr) | Community, content |
| ✉️ Email | [ngoxuanhung17041989@gmail.com](mailto:ngoxuanhung17041989@gmail.com) | Partnership, B2B |

---

## IX. QUICK-REFERENCE: COMPLIANCE & BRAND SAFETY

### ✅ LUÔN làm (Always-on)

- Gắn disclaimer: *"Trading is risky. Past backtest performance does not guarantee future results."*
- Trích dẫn số liệu cụ thể (89% thua lỗ, 7 tuần, 90 giây, 12,000 waitlist) với confidence
- Show code thực — không chỉ nói "vài dòng code", mà SHOW vài dòng đó là gì
- Honest về failure rate của hypotheses (hầu hết sẽ fail — và đó là bình thường)

### ❌ KHÔNG BAO GIỜ làm (Never-do)

- Không hứa hẹn lợi nhuận cụ thể ("kiếm X% mỗi tháng")
- Không claim "AI tìm ra alpha cho bạn" — AI chỉ compile và execute
- Không dùng từ "chén thánh", "không thể thua", "guaranteed"
- Không so sánh trực tiếp với sản phẩm đối thủ theo cách tiêu cực

---

## X. FLAGSHIP CASE STUDY — TREND MATRIX STRATEGY [RITCHI] v3.1.1

> Đây là chiến lược mẫu production-grade được build sẵn trong nền tảng.
> Dùng để demo capability, onboard người dùng mới, và làm benchmark cho mọi hypothesis khác.

### 10.1 Tổng quan kỹ thuật

| Thành phần | Kỹ thuật | Tên thân thiện |
|---|---|---|
| Signal Engine | CHoCH (Change of Character) | ⚡ Khoảnh Khắc Đổi Chiều |
| Filter 1 | Killzone Sessions (London + NY) | ⏰ Giờ Vàng Giao Dịch |
| Filter 2 | Liquidity Sweep (wick xuyên pivot) | 🎣 Bẫy Tiền Thông Minh |
| Filter 3 | HTF EMA Bias (khung cao hơn) | 🧭 La Bàn Xu Hướng |
| Filter 4 | Fair Value Gap (3-bar displacement) | 🧲 Vùng Hút Giá |
| Quality Gate | Confluence Score System (0–4) | ⭐ Điểm Tin Cậy |
| Position Sizing | ATR-based risk calculation | 📏 Thước Đo Sóng tự tính vốn |
| Stop Loss | ATR Trailing Stop (dynamic) | 🏃 Lá Chắn Tự Chạy Theo |
| Hard Stop | Max Loss % from entry | 🔒 Giới Hạn Cuối Tuyệt Đối |
| Take Profit | Partial TP × 4 levels (25% each) | 💰 Thu Hoạch Từng Bước |

### 10.2 Tham số mặc định (Production-Ready)

```
Độ Nhạy Sóng (ms_length)     : 8    — cân bằng tín hiệu/chất lượng
La Bàn Khung                 : 5m   — scalp 1m dùng 5m, swing 15m dùng 1H
Đường Kim Chỉ (EMA)          : 50   — chu kỳ chuẩn quốc tế
Điểm Tin Cậy tối thiểu       : 2/4  — sweet spot, không quá chặt/rộng
Thước Đo Sóng (ATR period)   : 14   — chu kỳ chuẩn
Khoảng cách Lá Chắn          : 4.0× ATR — đủ rộng, không bị hất sớm
Khoảng cách Túi Tiền         : 2.0× ATR — 4 mức cách đều nhau
Liều Rủi Ro mỗi lệnh         : 1%   — an toàn cho mọi cấp độ
Giới Hạn Cuối                : 3%   — bảo vệ khi gap qua trailing stop
Thu Hoạch mỗi Túi Tiền       : 25%  — giữ 75% chạy tiếp
```

### 10.3 Kết quả backtest mẫu (dùng cho content/demo)

```
Symbol: BTCUSDT | Timeframe: 1 phút | Lookback: 5 năm
Thời gian backtest: 47 giây

Confluence = 2/4:  412 lệnh | Win Rate 56% | Profit Factor 1.67 | Max DD 8.3%
Confluence = 3/4:  198 lệnh | Win Rate 63% | Profit Factor 2.14 | Max DD 5.1%
Confluence = 4/4:   87 lệnh | Win Rate 71% | Profit Factor 2.89 | Max DD 3.2%

→ Càng lọc chặt = ít lệnh hơn nhưng chất lượng cao hơn rõ rệt
→ Đây là data thực chứng minh Confluence Score System có giá trị
```

### 10.4 Thông báo Alert mẫu (copy-paste cho demo)

```
🟢 Tín Hiệu [MUA] — Khoảnh Khắc Đổi Chiều
━━━━━━━━━━━━━━━━━━
📊 Cặp         : BTCUSDT
⏱  Khung TG    : 1 phút
⭐ Tin Cậy     : 3/4 (Bẫy Cá Mập ✅ | La Bàn ✅ | Vùng Hút Giá ✅)
💰 Giá Vào     : 95,000
🎯 Túi Tiền 1  : 95,380  (+0.40%)
🎯 Túi Tiền 2  : 95,760  (+0.80%)
🎯 Túi Tiền 3  : 96,140  (+1.20%)
🎯 Túi Tiền 4  : 96,520  (+1.60%)
🏃 Lá Chắn     : 94,620  (−0.40%) — tự chạy theo giá
🔒 Giới Hạn    : 92,150  (−2.47%) — không bao giờ vượt
━━━━━━━━━━━━━━━━━━
⚡ Trend Matrix — Theo Dấu Dòng Tiền Thông Minh
```

### 10.5 Câu hỏi thường gặp từ người dùng mới — và cách trả lời

**"Bot có tự động vào lệnh không hay phải bấm tay?"**
> Hoàn toàn tự động. Sau khi deploy `s.run()`, bot tự canh Giờ Vàng, tự phát hiện
> Khoảnh Khắc Đổi Chiều, tự tính vốn phù hợp, tự đặt Lá Chắn, tự Thu Hoạch.
> Bạn nhận thông báo qua điện thoại — xem kết quả, không cần làm gì thêm.

**"Tôi không biết code có dùng được không?"**
> Trend Matrix Strategy đã được build sẵn. Bạn chỉ cần điều chỉnh tham số
> (số %, khung thời gian, mức rủi ro) qua giao diện cấu hình — không cần viết code.
> Nếu muốn tự build strategy riêng → đó là bước tiếp theo, và platform hỗ trợ đầy đủ.

**"Confluece Score 2/4 hay 3/4 tốt hơn?"**
> Phụ thuộc vào phong cách của bạn. 2/4 = nhiều tín hiệu hơn, chấp nhận Win Rate thấp hơn.
> 3/4 = ít tín hiệu hơn nhưng chất lượng cao hơn rõ rệt. Backtest trên tài khoản demo
> của bạn để tìm sweet spot phù hợp với vốn và thời gian theo dõi.

---

---

## XI. BRAND GUIDELINES — NHẬN DIỆN THƯƠNG HIỆU TOILABAP.COM

> **Nguồn gốc file gốc:** `toilabap_com-icon.svg` · `toilabap_com-logo-dark.svg` · `toilabap_com-logo-light.svg`
> Mọi tài sản thương hiệu phải được lấy từ file SVG gốc — không dùng screenshot hay ảnh nén.

---

### 11.1 Bộ Logo Chính Thức

| Phiên bản | File | Nền sử dụng | Màu wordmark |
|---|---|---|---|
| Icon / App Mark | `toilabap_com-icon.svg` | Mọi nền có tương phản đủ | `#3CD3FE` (bất biến) |
| Logo Dark | `toilabap_com-logo-dark.svg` | Nền tối: `#0D0F12`, `#1A1D24`, ảnh tối | White `#FFFFFF` |
| Logo Light | `toilabap_com-logo-light.svg` | Nền sáng: `#FFFFFF`, `#F5F5F5`, tài liệu in | Black `#000000` |

**Khoảng bảo vệ (Clear Space):** Vùng trống tối thiểu xung quanh logo = chiều cao chữ "**T**" đầu tiên trong wordmark. Không đặt bất kỳ yếu tố nào trong vùng này.

**Kích thước tối thiểu:**
- Logo ngang: chiều cao tối thiểu 32px (digital) / 8mm (in ấn)
- Icon đơn: tối thiểu 16×16px (favicon) / 5mm (in ấn)

---

### 11.2 Bảng Màu Chính Thức

#### Màu cốt lõi

| Tên | Hex | RGB | Vai trò |
|---|---|---|---|
| **Electric Cyan** | `#3CD3FE` | 60, 211, 254 | Brand Primary — logo mark, CTA button, highlight, accent |
| **Midnight Black** | `#0D0F12` | 13, 15, 18 | Background tối chủ đạo |
| **Deep Slate** | `#1A1D24` | 26, 29, 36 | Surface tối, card nền tối |
| **Pure White** | `#FFFFFF` | 255, 255, 255 | Background sáng, text trên nền tối |
| **Off White** | `#F5F5F5` | 245, 245, 245 | Surface sáng, background phụ |
| **Dark Text** | `#000000` | 0, 0, 0 | Wordmark trên nền sáng |

#### Màu tín hiệu giao dịch (Trading Semantic Colors)

| Tên | Hex (Dark Theme) | Hex (Light Theme) | Ý nghĩa |
|---|---|---|---|
| **Bull Green** | `#34E67E` | `#16A34A` | MUA / Tăng / Win / Tín hiệu tích cực |
| **Bear Pink** | `#FF52F1` | `#DB2777` | BÁN / Giảm / Loss / Tín hiệu tiêu cực |
| **Alert Amber** | `#F59E0B` | `#D97706` | Cảnh báo / Pending / Watch zone |
| **Brand Cyan** | `#3CD3FE` | `#0891B2` | HTF EMA / Entry line / Neutral info |

> **Nguyên tắc:** Màu tín hiệu phải nhất quán xuyên suốt — chart, alert message,
> notification, UI button đều dùng cùng một hệ màu này.

---

### 11.3 Quy Tắc Sử Dụng Logo

#### ✅ Được phép

- Dùng **Logo Dark** trên nền tối đơn sắc (`#0D0F12`, `#1A1D24`, `#000000`)
- Dùng **Logo Light** trên nền sáng đơn sắc (`#FFFFFF`, `#F5F5F5`)
- Dùng **Icon đơn** cho favicon, avatar mạng xã hội, app icon, watermark
- Scale logo đều theo tỷ lệ gốc (giữ nguyên width:height = 486:110 cho logo, 1:1 cho icon)
- Đặt logo trên ảnh nền tối với overlay đủ tương phản

#### ❌ Tuyệt đối không

- **Không đổi màu** icon/mark sang màu khác — `#3CD3FE` là màu bất biến của brand mark
- **Không kéo giãn, xoay** hoặc bẻ cong logo theo bất kỳ hướng nào
- **Không dùng Logo Dark trên nền sáng** hoặc Logo Light trên nền tối
- **Không đặt logo trực tiếp lên ảnh/pattern phức tạp** — phải có vùng nền đơn sắc rõ ràng
- **Không thêm hiệu ứng** shadow, glow, gradient, outline vào logo
- **Không tách rời** icon khỏi wordmark (trừ các trường hợp app icon, favicon đã quy định)
- **Không tái tạo** logo bằng font chữ — phải dùng file SVG gốc

---

### 11.4 Ứng Dụng Màu Theo Kênh

#### Social Media (Facebook, Instagram, Telegram)
```
Nền post:     #0D0F12 (dark) hoặc #FFFFFF (light)
Headline:     #3CD3FE (Electric Cyan) — tạo điểm nhấn
Body text:    #FFFFFF (on dark) / #000000 (on light)
CTA button:   Background #3CD3FE · Text #0D0F12
Tín hiệu MUA: #34E67E
Tín hiệu BÁN: #FF52F1
```

#### Banner / Quảng cáo
```
Background:   #0D0F12 (preferred) hoặc gradient tối
Brand mark:   #3CD3FE icon — luôn có trong mọi banner
Accent line:  #3CD3FE border/underline dưới headline
Chart preview: Bull Green #34E67E + Bear Pink #FF52F1
```

#### Tài liệu in ấn / PDF
```
Dùng Logo Light (black wordmark)
Background:   #FFFFFF
Heading màu:  #0D0F12 hoặc #3CD3FE (cho section title)
Body:         #1A1D24 (80% black — đọc dễ hơn pure black)
Accent:       #3CD3FE (border-left, highlight box)
```

#### TradingView Chart (Trend Matrix Strategy)
```
Background:      #0D0F12
Bull color:      #34E67E  (Xu Hướng Tăng)
Bear color:      #FF52F1  (Xu Hướng Giảm)
HTF EMA line:    #3CD3FE  (Đường Kim Chỉ)
Pending zone:    #F59E0B  (Vùng Đang Theo Dõi)
TP lines:        Bull/Bear color at 40% opacity
Trailing stop:   Bull/Bear color at 70% opacity fill
```

---

### 11.5 Typography

Logo Toilabap dùng **custom wordmark** — không phải font hệ thống. Cho các tài liệu marketing, dùng:

| Vai trò | Font khuyến nghị | Trọng lượng | Ghi chú |
|---|---|---|---|
| Headline chính | Inter / DM Sans | 700 Bold | Thay thế khi thiếu: Arial Bold |
| Body text | Inter / DM Sans | 400 Regular | Đọc tốt trên mọi màn hình |
| Code / Terminal | JetBrains Mono | 400 Regular | Dùng cho code example, config |
| Caption / Label | Inter | 500 Medium | Số liệu, nhãn biểu đồ |

**Cỡ chữ chuẩn cho digital:**
- Headline lớn (hero): 32–48px · Bold
- Headline section: 24–28px · Bold
- Subheading: 18–20px · Medium
- Body: 14–16px · Regular · line-height 1.6–1.7
- Caption / label: 11–13px · Medium

---

### 11.6 Tone of Voice — Giọng điệu thương hiệu

Mọi nội dung Toilabap phải nhất quán với 4 trụ cột:

**Tự tin nhưng không kiêu ngạo**
> "Chúng tôi nén 7 tuần xuống 90 giây." — nói fact, không nói "chúng tôi là tốt nhất"

**Thẳng thắn, minh bạch**
> Luôn nói rõ giới hạn: "Không đảm bảo lợi nhuận. Hầu hết hypothesis sẽ fail — và đó là bình thường."

**Kỹ thuật nhưng dễ hiểu**
> Có hai tầng ngôn ngữ: Technical (cho Dev/Quant) và Plain (cho mọi người). Luôn có cả hai.

**Cộng đồng trước**
> Chia sẻ kết quả thật, kể cả khi fail. "6 fail fast — tiết kiệm tiền thật. Đó mới là giá trị."

---

## XII. ONE-PAGE SUMMARY — FOR NEW TEAM MEMBERS

```
TOILABAP.COM LÀ GÌ?
→ Nền tảng Giao Dịch Thông Minh theo dấu Dòng Tiền Lớn.
→ Kiến trúc: Strategy → Confluence Filter → Backtest → Live Deploy.
→ "Write once, run on any exchange" — Stocks, Crypto, Forex, Futures.
→ Flagship: Trend Matrix Strategy [Ritchi] — SMC built-in, sẵn sàng deploy.

VẤN ĐỀ CHÚNG TÔI GIẢI QUYẾT?
→ 7 tuần → 90 giây. Từ hypothesis đến live trade.
→ Loại bỏ boilerplate code, data plumbing, exchange connectivity overhead.
→ Bộ lọc Confluence Score 4 tầng — nâng Win Rate, giảm tín hiệu nhiễu.

EDGE THỰC SỰ LÀ GÌ?
→ Iteration speed: test 50 hypotheses trong thời gian quỹ tổ chức test 1.
→ SMC production-grade (CHoCH + Sweep + FVG + Killzone) built sẵn — không tự code.
→ Democratize quant infrastructure — $650K junior quant capability cho mọi trader.

CHÚNG TÔI KHÔNG HỨA GÌ?
→ Không tự generate alpha. Không đảm bảo lợi nhuận.
→ Confluence Score lọc tín hiệu kém — nhưng không loại bỏ được rủi ro thị trường.
→ Tool tốt nhưng thesis sai thì fail nhanh hơn — và đó là tốt.

CTA CHÍNH?
→ Waitlist: Toilabap.com (12,000+ traders đang chờ)
→ Demo: Trend Matrix Strategy backtest live — drop config vào community
→ Contact: @Jbap1989 (Telegram) | +84 859295259 (Zalo)
```

---

*Tài liệu này được cập nhật dựa trên kiến trúc kỹ thuật của Blankly Finance Framework (docs.blankly.finance),
Trend Matrix Strategy [Ritchi] v3.1.1 (SMC + Confluence Score System),
và định hướng marketing chiến lược cho thị trường Việt Nam & Đông Nam Á.*

*Version 2.1 | Toilabap.com × Ritchi.guru | 2025*
*Cập nhật: Tích hợp Trend Matrix Strategy v3.1.1 — CHoCH, Liquidity Sweep, FVG, Killzone, ATR Risk*
