/**
 * sizing.service.ts – Fix #7: Risk-based position sizing.
 *
 * Formula:
 *   notional = equity × (riskPercent / 100)
 *   size     = notional / slDistance
 *
 * This replaces the fixed `initialMarginUsdt × leverage` sizing with
 * a risk-percent approach that scales proportionally to equity.
 */

export interface SizingParams {
  /** Current account equity / wallet balance in USDT */
  equity: number;
  /** Percentage of equity to risk on this trade (e.g. 1.0 = 1%) */
  riskPercent: number;
  /** Stop-loss distance in price units (abs(entryPrice - stopPrice)) */
  slDistance: number;
}

/**
 * Calculate position size in base-asset units.
 * Returns 0 if any input is invalid.
 */
export function calcPositionSize({ equity, riskPercent, slDistance }: SizingParams): number {
  if (equity <= 0 || riskPercent <= 0 || slDistance <= 0) return 0;
  const riskAmount = equity * (riskPercent / 100);
  return riskAmount / slDistance;
}

/**
 * Calculate stop-loss distance from ATR.
 * slDistance = atr × atrMultiplier
 */
export function calcSlDistanceFromAtr(atr: number, atrMultiplier: number): number {
  if (atr <= 0 || atrMultiplier <= 0) return 0;
  return atr * atrMultiplier;
}

/**
 * Calculate stop price given entry, side and SL distance.
 */
export function calcStopPrice(
  entryPrice: number,
  side: 'long' | 'short',
  slDistance: number
): number {
  return side === 'long' ? entryPrice - slDistance : entryPrice + slDistance;
}
