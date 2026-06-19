import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { Snackbar } from 'react-native-paper';
import { onAuthStateChanged } from 'firebase/auth';
import { collection, onSnapshot, query, where, DocumentData } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { useCart } from './CartContext';
import { useBusinessContext } from './BusinessContext';
import { getCurrentUserRoleProfile, canPerformAction, canAccessRoute, canReviewTeamRequests } from '../services/rbac';
import { subscribeToConversations, type Conversation } from '../services/chat';
import { APP_ROUTES } from '../types/roles';
import type { Order } from '../services/orders';
import type { LowStockAlert } from '../services/alerts';
import type { EmployeeRequest } from '../services/requests';

export type HubFeedKind =
  | 'cart'
  | 'incoming_order'
  | 'order_status'
  | 'chat'
  | 'low_stock'
  | 'request';

export interface HubFeedItem {
  id: string;
  kind: HubFeedKind;
  title: string;
  subtitle: string;
  createdAt: Date;
  route: string;
}

interface ActivityHubValue {
  feed: HubFeedItem[];
  /** Total items shown in hub feed (capped for badge). */
  feedCount: number;
  pendingIncomingCount: number;
  openLowStockCount: number;
  pendingManagerRequestsCount: number;
  chatAttentionCount: number;
  cartItemCount: number;
  /** True when this drawer / bottom route should be visually emphasized. */
  shouldHighlightRoute: (route: string) => boolean;
  /** Badge count for a bottom-nav or drawer route (0 hides). */
  badgeForRoute: (route: string) => number;
  /** Aggregate for notifications tab icon. */
  notificationsBadgeCount: number;
  dismissSnackbar: () => void;
}

const ActivityHubContext = createContext<ActivityHubValue | undefined>(undefined);

function parseOrder(id: string, data: DocumentData): Order {
  return {
    id,
    orderNumber: data.orderNumber || '',
    buyerId: data.buyerId || '',
    buyerName: data.buyerName || '',
    buyerEmail: data.buyerEmail || '',
    buyerPhone: data.buyerPhone || '',
    buyerAddress: data.buyerAddress || '',
    supplierId: data.supplierId || '',
    supplierName: data.supplierName || '',
    supplierEmail: data.supplierEmail || '',
    supplierPhone: data.supplierPhone || '',
    supplierAddress: data.supplierAddress || '',
    items: Array.isArray(data.items)
      ? data.items.map((raw: Record<string, unknown>) => ({
          productId: String(raw.productId || ''),
          productName: String(raw.productName || ''),
          categoryName: raw.categoryName ? String(raw.categoryName) : undefined,
          unit: String(raw.unit || ''),
          quantity: Number(raw.quantity) || 0,
          pricePerUnit: Number(raw.pricePerUnit) || 0,
          total: Number(raw.total) || 0,
          imageUrl: raw.imageUrl ? String(raw.imageUrl) : undefined,
          prepared: raw.prepared === true,
        }))
      : [],
    subtotal: data.subtotal || 0,
    total: data.total || 0,
    note: data.note || '',
    status: data.status || 'pending',
    invoiceStatus: data.invoiceStatus || 'not_sent',
    invoiceReference: data.invoiceReference || '',
    inventoryCommitted: data.inventoryCommitted === true,
    createdAt: data.createdAt?.toDate?.() || new Date(),
    updatedAt: data.updatedAt?.toDate?.() || new Date(),
  };
}

function parseAlert(id: string, data: DocumentData): LowStockAlert {
  return {
    id,
    productId: data.productId || '',
    productName: data.productName || '',
    currentQty: data.currentQty || 0,
    reorderPoint: data.reorderPoint || 0,
    status: data.status || 'open',
    createdAt: data.createdAt?.toDate?.() || new Date(),
  };
}

function parseRequest(id: string, data: DocumentData): EmployeeRequest {
  return {
    id,
    employeeId: data.employeeId || '',
    employeeName: data.employeeName || 'Employee',
    type: data.type || 'other',
    reason: data.reason || '',
    status: data.status || 'pending',
    createdAt: data.createdAt?.toDate?.() || new Date(),
    updatedAt: data.updatedAt?.toDate?.(),
  };
}

function buildFeed(params: {
  cartCount: number;
  incoming: Order[];
  myOrders: Order[];
  alerts: LowStockAlert[];
  conversations: Conversation[];
  requests: EmployeeRequest[];
  uid: string;
  businessId: string;
  role: string;
}): HubFeedItem[] {
  const { cartCount, incoming, myOrders, alerts, conversations, requests, uid, businessId, role } =
    params;
  const items: HubFeedItem[] = [];

  if (cartCount > 0) {
    items.push({
      id: 'cart-summary',
      kind: 'cart',
      title: 'Items in cart',
      subtitle: `${cartCount} ${cartCount === 1 ? 'item' : 'items'} ready to review or checkout`,
      createdAt: new Date(),
      route: APP_ROUTES.cart,
    });
  }

  const pendingIncoming = incoming.filter((o) => o.status === 'pending');
  pendingIncoming.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  for (const o of pendingIncoming.slice(0, 8)) {
    items.push({
      id: `in-${o.id}`,
      kind: 'incoming_order',
      title: 'New incoming order',
      subtitle: `${o.buyerName} · ${o.orderNumber} · ₪${o.total.toFixed(2)}`,
      createdAt: o.createdAt,
      route: APP_ROUTES.incomingOrders,
    });
  }

  const statusOrders = myOrders
    .filter((o) => {
      if (o.status === 'pending' || o.status === 'cancelled') return false;
      return o.updatedAt.getTime() - o.createdAt.getTime() > 5000;
    })
    .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
  for (const o of statusOrders.slice(0, 8)) {
    items.push({
      id: `st-${o.id}-${o.status}`,
      kind: 'order_status',
      title: 'Order status updated',
      subtitle: `${o.orderNumber} → ${o.status} (${o.supplierName})`,
      createdAt: o.updatedAt,
      route: APP_ROUTES.myOrders,
    });
  }

  const openAlerts = alerts.filter((a) => a.status === 'open');
  openAlerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  for (const a of openAlerts.slice(0, 8)) {
    items.push({
      id: `al-${a.id}`,
      kind: 'low_stock',
      title: 'Low stock',
      subtitle: `${a.productName} · ${a.currentQty} left (reorder at ${a.reorderPoint})`,
      createdAt: a.createdAt,
      route: APP_ROUTES.lowStockAlerts,
    });
  }

  const chatThreads = [...conversations].sort(
    (a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0)
  );
  for (const c of chatThreads.slice(0, 10)) {
    const otherId = c.participantIds.find((p) => p !== businessId);
    const otherName = otherId ? c.participantNames?.[otherId] || 'Contact' : 'Chat';
    const fromOther =
      c.lastMessageSenderId && c.lastMessageSenderId !== businessId && !!c.lastMessage;
    if (!fromOther) continue;
    items.push({
      id: `ch-${c.id}`,
      kind: 'chat',
      title: 'New message',
      subtitle: `${otherName}: ${(c.lastMessage || '').slice(0, 80)}${(c.lastMessage || '').length > 80 ? '…' : ''}`,
      createdAt: c.updatedAt || c.lastMessageTime || new Date(),
      route: APP_ROUTES.chat,
    });
  }

  if (role === 'manager') {
    const pend = requests.filter((r) => r.status === 'pending');
    pend.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    for (const r of pend.slice(0, 8)) {
      items.push({
        id: `rq-${r.id}`,
        kind: 'request',
        title: 'Pending request',
        subtitle: `${r.employeeName} · ${r.type} · ${(r.reason || '').slice(0, 60)}`,
        createdAt: r.createdAt,
        route: APP_ROUTES.requests,
      });
    }
  } else if (role === 'employee') {
    const done = requests.filter(
      (r) => r.status !== 'pending' && r.updatedAt && r.updatedAt.getTime() > r.createdAt.getTime()
    );
    done.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
    for (const r of done.slice(0, 5)) {
      items.push({
        id: `rq-${r.id}-done`,
        kind: 'request',
        title: 'Request updated',
        subtitle: `${r.type} → ${r.status}`,
        createdAt: r.updatedAt || r.createdAt,
        route: APP_ROUTES.requests,
      });
    }
  }

  items.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  return items.slice(0, 40);
}

export function ActivityHubProvider({ children }: { children: ReactNode }) {
  const { getTotalItems } = useCart();
  const { businessId } = useBusinessContext();

  const [incoming, setIncoming] = useState<Order[]>([]);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [requests, setRequests] = useState<EmployeeRequest[]>([]);
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [role, setRole] = useState<string>('manager');
  const [uid, setUid] = useState<string | null>(null);

  const [snack, setSnack] = useState<string | null>(null);
  const prevPendingIncoming = useRef<number>(-1);

  const cartCount = getTotalItems();

  const feed = useMemo(
    () =>
      uid && businessId
        ? buildFeed({
            cartCount,
            incoming,
            myOrders,
            alerts,
            conversations,
            requests,
            uid,
            businessId,
            role,
          })
        : [],
    [cartCount, incoming, myOrders, alerts, conversations, requests, uid, businessId, role]
  );

  const pendingIncomingCount = useMemo(
    () => incoming.filter((o) => o.status === 'pending').length,
    [incoming]
  );
  const openLowStockCount = useMemo(() => alerts.filter((a) => a.status === 'open').length, [alerts]);
  const pendingManagerRequestsCount = useMemo(
    () => (role === 'manager' ? requests.filter((r) => r.status === 'pending').length : 0),
    [requests, role]
  );
  const chatAttentionCount = useMemo(
    () =>
      conversations.filter(
        (c) =>
          businessId &&
          c.lastMessageSenderId &&
          c.lastMessageSenderId !== businessId &&
          !!c.lastMessage
      ).length,
    [conversations, businessId]
  );

  useEffect(() => {
    if (!auth) return;
    const unsub = onAuthStateChanged(auth, (u) => {
      if (!u) prevPendingIncoming.current = -1;
      setUid(u?.uid ?? null);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!uid) {
      setRole('manager');
      return;
    }
    getCurrentUserRoleProfile().then((profile) => setRole(profile.role));
  }, [uid, businessId]);

  useEffect(() => {
    if (!db || !uid || !businessId) return;
    const unsubs: (() => void)[] = [];

    const profileSync = async () => {
      const profile = await getCurrentUserRoleProfile();
      setRole(profile.role);
    };

    (async () => {
      await profileSync();
      const profile = await getCurrentUserRoleProfile();
      const canIncoming =
        canPerformAction(profile.role, 'receive_b2b_orders') &&
        canAccessRoute(profile.role, APP_ROUTES.incomingOrders);
      const canMy = canAccessRoute(profile.role, APP_ROUTES.myOrders);
      const canLow = canAccessRoute(profile.role, APP_ROUTES.lowStockAlerts);
      const canChat = canAccessRoute(profile.role, APP_ROUTES.chat);
      const canReq = canAccessRoute(profile.role, APP_ROUTES.requests);

      if (canIncoming) {
        const q = query(collection(db, 'orders'), where('supplierId', '==', businessId));
        unsubs.push(
          onSnapshot(q, (snap) => {
            const list: Order[] = [];
            snap.forEach((d) => list.push(parseOrder(d.id, d.data())));
            list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
            setIncoming(list);
            const pend = list.filter((o) => o.status === 'pending').length;
            if (prevPendingIncoming.current >= 0 && pend > prevPendingIncoming.current) {
              setSnack('New incoming order');
            }
            prevPendingIncoming.current = pend;
          })
        );
      } else {
        setIncoming([]);
      }

      if (canMy) {
        const q = query(collection(db, 'orders'), where('buyerId', '==', businessId));
        unsubs.push(
          onSnapshot(q, (snap) => {
            const list: Order[] = [];
            snap.forEach((d) => list.push(parseOrder(d.id, d.data())));
            list.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
            setMyOrders(list);
          })
        );
      } else {
        setMyOrders([]);
      }

      if (canLow) {
        const q = query(
          collection(db, 'alerts'),
          where('businessId', '==', businessId),
          where('type', '==', 'low_stock')
        );
        unsubs.push(
          onSnapshot(
            q,
            (snap) => {
              const list: LowStockAlert[] = [];
              snap.forEach((d) => list.push(parseAlert(d.id, d.data())));
              list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
              setAlerts(list);
            },
            (err) => console.warn('ActivityHub alerts listener:', err)
          )
        );
      } else {
        setAlerts([]);
      }

      if (canReq) {
        const storeId = profile.storeId || businessId;
        if (canReviewTeamRequests(profile)) {
          const q = query(
            collection(db, 'requests'),
            where('storeId', '==', storeId),
            where('status', '==', 'pending')
          );
          unsubs.push(
            onSnapshot(
              q,
              (snap) => {
                const list: EmployeeRequest[] = [];
                snap.forEach((d) => list.push(parseRequest(d.id, d.data())));
                list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
                setRequests(list);
              },
              (err) => console.warn('ActivityHub requests listener:', err)
            )
          );
        } else if (profile.role === 'employee') {
          const q = query(collection(db, 'requests'), where('employeeId', '==', uid));
          unsubs.push(
            onSnapshot(q, (snap) => {
              const list: EmployeeRequest[] = [];
              snap.forEach((d) => list.push(parseRequest(d.id, d.data())));
              list.sort((a, b) => (b.updatedAt?.getTime() || 0) - (a.updatedAt?.getTime() || 0));
              setRequests(list);
            })
          );
        } else {
          setRequests([]);
        }
      } else {
        setRequests([]);
      }

      if (canChat && businessId) {
        unsubs.push(
          subscribeToConversations(setConversations, businessId, () => setConversations([]))
        );
      } else {
        setConversations([]);
      }
    })();

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [uid, businessId]);

  const dismissSnackbar = useCallback(() => setSnack(null), []);

  const notificationsBadgeCount = useMemo(() => Math.min(99, feed.length), [feed]);

  const shouldHighlightRoute = useCallback(
    (route: string) => {
      if (route === APP_ROUTES.incomingOrders && pendingIncomingCount > 0) return true;
      if (route === APP_ROUTES.myOrders && feed.some((f) => f.kind === 'order_status')) return true;
      if (route === APP_ROUTES.chat && chatAttentionCount > 0) return true;
      if (route === APP_ROUTES.cart && cartCount > 0) return true;
      if (route === APP_ROUTES.lowStockAlerts && openLowStockCount > 0) return true;
      if (
        route === APP_ROUTES.requests &&
        (pendingManagerRequestsCount > 0 ||
          (role === 'employee' && requests.some((r) => r.status === 'pending')))
      )
        return true;
      if (route === APP_ROUTES.notifications && notificationsBadgeCount > 0) return true;
      return false;
    },
    [
      pendingIncomingCount,
      feed,
      chatAttentionCount,
      cartCount,
      openLowStockCount,
      pendingManagerRequestsCount,
      notificationsBadgeCount,
      role,
      requests,
    ]
  );

  const badgeForRoute = useCallback(
    (route: string) => {
      if (route === APP_ROUTES.incomingOrders) return pendingIncomingCount;
      if (route === APP_ROUTES.myOrders) {
        const n = feed.filter((f) => f.kind === 'order_status').length;
        return Math.min(99, n);
      }
      if (route === APP_ROUTES.chat) return chatAttentionCount;
      if (route === APP_ROUTES.cart) return cartCount;
      if (route === APP_ROUTES.lowStockAlerts) return openLowStockCount;
      if (route === APP_ROUTES.requests) {
        if (role === 'manager') return pendingManagerRequestsCount;
        if (role === 'employee') return requests.filter((r) => r.status === 'pending').length;
        return 0;
      }
      if (route === APP_ROUTES.notifications) return notificationsBadgeCount;
      return 0;
    },
    [
      pendingIncomingCount,
      feed,
      chatAttentionCount,
      cartCount,
      openLowStockCount,
      pendingManagerRequestsCount,
      notificationsBadgeCount,
      role,
      requests,
    ]
  );

  const value = useMemo<ActivityHubValue>(
    () => ({
      feed,
      feedCount: feed.length,
      pendingIncomingCount,
      openLowStockCount,
      pendingManagerRequestsCount,
      chatAttentionCount,
      cartItemCount: cartCount,
      shouldHighlightRoute,
      badgeForRoute,
      notificationsBadgeCount,
      dismissSnackbar,
    }),
    [
      feed,
      pendingIncomingCount,
      openLowStockCount,
      pendingManagerRequestsCount,
      chatAttentionCount,
      cartCount,
      shouldHighlightRoute,
      badgeForRoute,
      notificationsBadgeCount,
      dismissSnackbar,
    ]
  );

  return (
    <ActivityHubContext.Provider value={value}>
      {children}
      <Snackbar visible={!!snack} onDismiss={dismissSnackbar} duration={4000} action={{ label: 'OK', onPress: dismissSnackbar }}>
        {snack}
      </Snackbar>
    </ActivityHubContext.Provider>
  );
}

export function useActivityHub() {
  const ctx = useContext(ActivityHubContext);
  if (!ctx) {
    throw new Error('useActivityHub must be used within ActivityHubProvider');
  }
  return ctx;
}
