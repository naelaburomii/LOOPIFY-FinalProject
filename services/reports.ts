import { auth } from '../config/firebase';
import { getStoreMonthlySummaryHours } from './attendance';
import { getMyLowStockAlerts } from './alerts';
import { getProducts } from './inventory';
import { getIncomingOrders, type Order } from './orders';
import { getCurrentUserRoleProfile } from './rbac';

export interface DashboardMetrics {
  ordersCount: number;
  totalSales: number;
  monthlyAttendanceHours: number;
  lowStockCount: number;
  productCount: number;
}

const REVENUE_STATUSES = new Set<Order['status']>(['confirmed', 'processing', 'shipped', 'delivered']);

/** Counts toward dashboard revenue when fulfilled or supplier has sent/paid an invoice. */
export const countsTowardRevenue = (order: Order): boolean => {
  if (order.status === 'cancelled') return false;
  if (REVENUE_STATUSES.has(order.status)) return true;
  return order.invoiceStatus === 'sent' || order.invoiceStatus === 'paid';
};

const EMPTY_METRICS: DashboardMetrics = {
  ordersCount: 0,
  totalSales: 0,
  monthlyAttendanceHours: 0,
  lowStockCount: 0,
  productCount: 0,
};

export const getDashboardMetrics = async (): Promise<DashboardMetrics> => {
  if (!auth?.currentUser) {
    return EMPTY_METRICS;
  }

  const profile = await getCurrentUserRoleProfile();

  const [incomingOrders, alerts, products] = await Promise.all([
    getIncomingOrders(),
    getMyLowStockAlerts(),
    getProducts(),
  ]);

  const activeOrders = incomingOrders.filter((order) => order.status !== 'cancelled');
  const revenueOrders = incomingOrders.filter(countsTowardRevenue);

  let monthlyAttendanceHours = 0;
  if (profile.role === 'manager') {
    monthlyAttendanceHours = await getStoreMonthlySummaryHours();
  }

  return {
    ordersCount: activeOrders.length,
    totalSales: revenueOrders.reduce((sum, order) => sum + order.total, 0),
    monthlyAttendanceHours,
    lowStockCount: alerts.filter((alert) => alert.status === 'open').length,
    productCount: products.length,
  };
};
