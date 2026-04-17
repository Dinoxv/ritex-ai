import type { Order, OrderSide, OrderType } from '@/models/Order';
import type { Position } from '@/models/Position';

type RawPositionPayload = {
  coin?: string;
  szi?: string | number;
  entryPx?: string | number;
  unrealizedPnl?: string | number;
  positionValue?: string | number;
  leverage?: { value?: string | number } | string | number;
};

function getPositionPayload(rawPosition: any): RawPositionPayload {
  return rawPosition?.position || rawPosition || {};
}

export function getRawPositionSymbol(rawPosition: any): string {
  return String(getPositionPayload(rawPosition).coin || '');
}

export function getRawPositionSignedSize(rawPosition: any): number {
  return parseFloat(String(getPositionPayload(rawPosition).szi || '0'));
}

export function getRawPositionEntryPrice(rawPosition: any): number {
  return parseFloat(String(getPositionPayload(rawPosition).entryPx || '0'));
}

export function getRawPositionUnrealizedPnl(rawPosition: any): number {
  return parseFloat(String(getPositionPayload(rawPosition).unrealizedPnl || '0'));
}

export function getRawPositionLeverage(rawPosition: any): number {
  const leverage = getPositionPayload(rawPosition).leverage;
  if (typeof leverage === 'object' && leverage !== null) {
    return parseFloat(String(leverage.value || '1'));
  }
  return parseFloat(String(leverage || '1'));
}

export function getRawPositionValue(rawPosition: any): number {
  return parseFloat(String(getPositionPayload(rawPosition).positionValue || '0'));
}

export function normalizeExchangePosition(rawPosition: any): Position {
  const signedSize = getRawPositionSignedSize(rawPosition);
  const entryPrice = getRawPositionEntryPrice(rawPosition);
  const unrealizedPnl = getRawPositionUnrealizedPnl(rawPosition);
  const positionValue = getRawPositionValue(rawPosition);
  const leverage = getRawPositionLeverage(rawPosition);
  const size = Math.abs(signedSize);

  return {
    symbol: getRawPositionSymbol(rawPosition),
    side: signedSize > 0 ? 'long' : 'short',
    size,
    entryPrice,
    currentPrice: positionValue !== 0 && size > 0 ? Math.abs(positionValue) / size : entryPrice,
    pnl: unrealizedPnl,
    pnlPercentage: positionValue !== 0 ? (unrealizedPnl / Math.abs(positionValue)) * 100 : 0,
    leverage,
  };
}

function normalizeOrderSide(rawOrder: any): OrderSide {
  const side = String(rawOrder?.side || '').toUpperCase();
  if (side === 'A' || side === 'SELL' || side === 'S') {
    return 'sell';
  }
  return 'buy';
}

function normalizeOrderType(rawOrder: any, side: OrderSide): OrderType {
  const explicit = String(rawOrder?.orderType || '').toLowerCase();
  const isTrigger = Boolean(rawOrder?.isTrigger || rawOrder?.triggerPx);
  const isPositionTpsl = Boolean(rawOrder?.isPositionTpsl);
  const reduceOnly = Boolean(rawOrder?.reduceOnly);

  if (explicit === 'limit' || explicit === 'trigger' || explicit === 'stop' || explicit === 'tp') {
    return explicit as OrderType;
  }

  if (isTrigger) {
    if (isPositionTpsl || reduceOnly) {
      if (explicit.includes('stop')) {
        return 'stop';
      }
      if (explicit.includes('take_profit') || explicit.includes('tp')) {
        return 'tp';
      }
      return side === 'sell' ? 'tp' : 'stop';
    }

    if (explicit.includes('stop')) {
      return 'stop';
    }

    return 'trigger';
  }

  return 'limit';
}

export function normalizeExchangeOrder(rawOrder: any): Order {
  const side = normalizeOrderSide(rawOrder);
  const orderType = normalizeOrderType(rawOrder, side);
  const rawPrice = rawOrder?.triggerPx || rawOrder?.limitPx || rawOrder?.price || '0';
  const rawSize = rawOrder?.origSz || rawOrder?.sz || rawOrder?.origQty || rawOrder?.executedQty || rawOrder?.size || '0';

  return {
    oid: String(rawOrder?.oid || rawOrder?.orderId || ''),
    coin: String(rawOrder?.coin || rawOrder?.symbol || ''),
    side,
    price: parseFloat(String(rawPrice || '0')),
    size: Math.abs(parseFloat(String(rawSize || '0'))),
    orderType,
    timestamp: Number(rawOrder?.timestamp || rawOrder?.updateTime || rawOrder?.time || Date.now()),
  };
}

export function normalizeExchangeOrders(rawOrders: any[]): Order[] {
  return rawOrders.map(normalizeExchangeOrder);
}