import type { Order } from '../services/orders';

export type OrderStatusPalette = {
  primary: string;
  primaryLight: string;
  success: string;
  warning: string;
  error: string;
  text: string;
  border: string;
  surfaceVariant: string;
};

export function formatOrderStatusLabel(status: Order['status']): string {
  return status.charAt(0).toUpperCase() + status.slice(1);
}

/**
 * Pill / chip colors for order workflow status (light-on-tint label).
 */
export function orderStatusChipStyle(
  status: Order['status'],
  c: OrderStatusPalette
): { backgroundColor: string; color: string; borderWidth?: number; borderColor?: string } {
  switch (status) {
    case 'pending':
      return {
        backgroundColor: `${c.warning}26`,
        color: c.warning,
        borderWidth: 1,
        borderColor: `${c.warning}55`,
      };
    case 'confirmed':
      return {
        backgroundColor: `${c.primary}22`,
        color: c.primary,
        borderWidth: 1,
        borderColor: `${c.primary}50`,
      };
    case 'processing':
      return {
        backgroundColor: `${c.primaryLight}28`,
        color: c.primary,
        borderWidth: 1,
        borderColor: `${c.primaryLight}55`,
      };
    case 'shipped':
      return {
        backgroundColor: `${c.success}22`,
        color: c.success,
        borderWidth: 1,
        borderColor: `${c.success}45`,
      };
    case 'delivered':
      return {
        backgroundColor: `${c.success}38`,
        color: '#FFFFFF',
      };
    case 'cancelled':
      return {
        backgroundColor: `${c.error}24`,
        color: c.error,
        borderWidth: 1,
        borderColor: `${c.error}50`,
      };
  }
}
