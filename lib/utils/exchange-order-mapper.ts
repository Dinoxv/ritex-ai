import { normalizeExchangeOrder, normalizeExchangeOrders } from './exchange-normalizers';
import type { Order } from '@/models/Order';

export function mapExchangeOrder(order: any): Order {
  return normalizeExchangeOrder(order);
}

export function mapExchangeOrders(orders: any[]): Order[] {
  return normalizeExchangeOrders(orders);
}