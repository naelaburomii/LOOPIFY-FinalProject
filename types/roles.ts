export type UserRole = 'manager' | 'employee' | 'supplier' | 'customer';

export type Permission =
  | 'manage_business'
  | 'manage_inventory'
  | 'manage_orders'
  | 'manage_users'
  | 'view_reports'
  | 'manage_shifts'
  | 'clock_attendance'
  | 'submit_requests'
  | 'browse_catalog'
  | 'place_orders'
  | 'track_orders'
  | 'receive_b2b_orders'
  | 'send_invoices';

export const DEFAULT_ROLE: UserRole = 'manager';

export const ROLE_LABELS: Record<UserRole, string> = {
  manager: 'Manager',
  employee: 'Employee',
  supplier: 'Supplier',
  customer: 'Customer',
};

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  manager: [
    'manage_business',
    'manage_inventory',
    'manage_orders',
    'manage_users',
    'view_reports',
    'manage_shifts',
    'receive_b2b_orders',
    'send_invoices',
  ],
  employee: [
    'clock_attendance',
    'submit_requests',
    'track_orders',
    'browse_catalog',
  ],
  supplier: [
    'receive_b2b_orders',
    'manage_inventory',
    'manage_orders',
    'send_invoices',
    'view_reports',
  ],
  customer: [
    'browse_catalog',
    'place_orders',
    'track_orders',
  ],
};

export const APP_ROUTES = {
  profile: '/(drawer)/profile',
  dashboard: '/(drawer)/dashboard',
  browseBusinesses: '/(drawer)/browse-businesses',
  cart: '/(drawer)/cart',
  incomingOrders: '/(drawer)/incoming-orders',
  myOrders: '/(drawer)/my-orders',
  inventory: '/(drawer)/inventory',
  chat: '/(drawer)/chat',
  notifications: '/(drawer)/notifications',
  settings: '/(drawer)/settings',
  shifts: '/(drawer)/shifts',
  attendance: '/(drawer)/attendance',
  requests: '/(drawer)/requests',
  lowStockAlerts: '/(drawer)/low-stock-alerts',
  stockScanner: '/(drawer)/stock-scanner',
  teamUsers: '/(drawer)/team-users',
  dev: '/dev',
} as const;

export const ROUTE_ACCESS: Record<string, UserRole[]> = {
  [APP_ROUTES.profile]: ['manager', 'employee', 'supplier', 'customer'],
  [APP_ROUTES.dashboard]: ['manager', 'supplier'],
  [APP_ROUTES.browseBusinesses]: ['manager', 'employee', 'customer'],
  [APP_ROUTES.cart]: ['manager', 'employee', 'customer'],
  [APP_ROUTES.incomingOrders]: ['manager', 'supplier'],
  [APP_ROUTES.myOrders]: ['manager', 'employee', 'customer'],
  [APP_ROUTES.inventory]: ['manager', 'supplier'],
  [APP_ROUTES.chat]: ['manager', 'employee', 'supplier', 'customer'],
  [APP_ROUTES.notifications]: ['manager', 'employee', 'supplier', 'customer'],
  [APP_ROUTES.settings]: ['manager', 'supplier'],
  [APP_ROUTES.shifts]: ['manager', 'employee'],
  [APP_ROUTES.attendance]: ['manager', 'employee'],
  [APP_ROUTES.requests]: ['manager', 'employee'],
  [APP_ROUTES.lowStockAlerts]: ['manager', 'supplier'],
  [APP_ROUTES.stockScanner]: ['manager', 'supplier'],
  [APP_ROUTES.teamUsers]: ['manager'],
  [APP_ROUTES.dev]: ['manager'],
};
