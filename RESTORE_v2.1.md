# Restore Point: v2.1-binance-fixes

**Date:** 2026-04-21 18:30 GMT+7  
**Commit:** 23b9dcb  
**Tag:** v2.1-binance-fixes  
**PM2 Status:** Online (PID: 1315743, restart #84)

## What's Included

### ✅ Binance Perp Improvements
- **Trades**: Increased limit from 100 → **500** (max API)
- **Metadata Cache**: Reduced from 60s → **30s** (fresher data)
- **History Symbols**: Increased from 30 → **100** symbols
- **Ghost Orders**: Fixed filter to remove size=0, price=0, inactive orders

### ✅ Position Mode Detection
- Auto-detect Hedge vs One-way mode via `/fapi/v1/positionSide/dual`
- Automatically set correct `positionSide` parameter
- Remove `reduceOnly` in Hedge mode (not supported)
- Retry on position-side mismatch with mode refresh

### ✅ Trigger Order Improvements
- Added `workingType: MARK_PRICE` for reliable trigger execution
- Use `closePosition: true` for SL/TP orders (primary)
- Fallback to quantity+reduceOnly if closePosition fails
- Console warning log when fallback activates

### ✅ Files Modified
- `/root/hyperscalper/lib/services/binance.service.ts` (main changes)
- UI components: time display (UTC → GMT+7), chart improvements
- Stores: scanner, user fills optimizations

## How to Restore

### Method 1: Git Tag (Recommended)
```bash
cd /root/hyperscalper
git checkout v2.1-binance-fixes
npm run build
pm2 restart hyperscalper-frontend
```

### Method 2: Git Commit Hash
```bash
cd /root/hyperscalper
git checkout 23b9dcb
npm run build
pm2 restart hyperscalper-frontend
```

### Method 3: Branch Reset (if on master)
```bash
cd /root/hyperscalper
git reset --hard v2.1-binance-fixes
npm run build
pm2 restart hyperscalper-frontend
```

## Verify After Restore

1. **Check PM2 Status:**
   ```bash
   pm2 status hyperscalper-frontend
   pm2 logs hyperscalper-frontend --lines 20
   ```

2. **Test Binance Perp:**
   - Open RAVE or any token page
   - Verify no ghost orders (size=0, price=$0.00)
   - Check that trades show up to 500 entries
   - Test placing orders (market, limit, stop-loss)

3. **Check Browser:**
   - Hard refresh: `Ctrl + Shift + R`
   - Clear cache if needed
   - Verify time shows GMT+7

## Rollback to Previous Version

If you need to go back **before** this restore point:

```bash
cd /root/hyperscalper
git log --oneline -10  # Find desired commit
git checkout <commit-hash>
npm run build
pm2 restart hyperscalper-frontend
```

## Notes

- This restore point includes all Binance API compatibility fixes
- Ghost orders are filtered at service level (not UI)
- Position mode detection is cached for 60 seconds
- All changes are production-tested and PM2-verified

---

**Created by:** AI Agent  
**Session:** 2026-04-21 fixes for Binance Perp ghost orders & data improvements
