import { Order, OrderItem } from '../services/orders';

const KDS_ACTIVE_STATUSES: Order['status'][] = ['pending', 'confirmed', 'processing'];

export function isKdsActiveOrder(order: Order): boolean {
  return KDS_ACTIVE_STATUSES.includes(order.status);
}

export function filterKdsOrders(orders: Order[]): Order[] {
  return orders
    .filter(isKdsActiveOrder)
    .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export function getOrderPrepStats(order: Order): { prepared: number; total: number } {
  const total = order.items.length;
  const prepared = order.items.filter((item) => item.prepared).length;
  return { prepared, total };
}

export function isOrderFullyPrepared(order: Order): boolean {
  const { prepared, total } = getOrderPrepStats(order);
  return total > 0 && prepared === total;
}

export function orderItemKey(orderId: string, index: number): string {
  return `${orderId}-${index}`;
}

export function formatKdsTime(date: Date): string {
  return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
}

export type { OrderItem };
