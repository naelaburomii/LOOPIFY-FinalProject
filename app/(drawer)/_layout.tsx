import React, { useEffect, useState, useRef } from 'react';
import { Stack } from 'expo-router';
import { View, StyleSheet, TouchableOpacity, Modal, Dimensions, Animated, Easing, Platform, ActivityIndicator, ScrollView } from 'react-native';
import { Text, Avatar, Divider, useTheme as usePaperTheme } from 'react-native-paper';
import { useRouter, usePathname } from 'expo-router';
import { logoutBusiness } from '../../services/auth';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../../contexts/ThemeContext';
import { getColors } from '../../theme/colors';
import { auth } from '../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { DrawerProvider, useDrawer } from '../../contexts/DrawerContext';
import BottomNavBar from '../../components/BottomNavBar';
import Logo from '../../components/Logo';
import { canAccessRoute, getCurrentUserRoleProfile, getDefaultRouteForRole } from '../../services/rbac';
import { APP_ROUTES, ROLE_LABELS, UserRole } from '../../types/roles';
import { clearSelectedDevBusinessId, getSelectedDevBusinessName, isCurrentUserDeveloper } from '../../services/devMode';
import { useActivityHub } from '../../contexts/ActivityHubContext';

const { width } = Dimensions.get('window');
const DRAWER_WIDTH = 280;

export default function DrawerLayout() {
  const isTablet = width >= 768;
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const paperTheme = usePaperTheme();
  const styles = getStyles(colors, paperTheme);

  return (
    <DrawerProvider>
      <View style={styles.container}>
        {isTablet && <DrawerContent isTablet={isTablet} />}
        <View style={[styles.contentWrapper, isTablet && { marginLeft: DRAWER_WIDTH }]}>
          <View style={{ flex: 1 }}>
            <Stack
              screenOptions={{
                headerShown: false,
                animation: 'none', // Disable slide animation for instant navigation
              }}
            />
          </View>
          {!isTablet && <BottomNavBar />}
        </View>
        {!isTablet && <DrawerContent isTablet={isTablet} />}
      </View>
    </DrawerProvider>
  );
}

function DrawerContent({ isTablet }: { isTablet: boolean }) {
  const { drawerOpen, closeDrawer } = useDrawer();
  const router = useRouter();
  const pathname = usePathname();
  const insets = useSafeAreaInsets();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const paperTheme = usePaperTheme();
  const [businessName, setBusinessName] = useState('My Business');
  const [userEmail, setUserEmail] = useState('');
  const [userRole, setUserRole] = useState<UserRole>('manager');
  const [devBusinessName, setDevBusinessName] = useState<string | null>(null);
  const [fontsLoaded, setFontsLoaded] = useState(true);
  // Initialize animation value off-screen to the left
  const slideAnim = useRef(new Animated.Value(-DRAWER_WIDTH)).current;
  const overlayOpacity = useRef(new Animated.Value(0)).current;

  // Ionicons works natively on web, no font loading needed

  useEffect(() => {
    if (auth && auth.currentUser) {
      const currentUser = auth.currentUser;
      setUserEmail(currentUser.email || '');
      const fetchBusinessName = async () => {
        try {
          if (!db || !auth || !auth.currentUser) {
            console.warn('Firestore not initialized or user not authenticated');
            return;
          }
          const roleProfile = await getCurrentUserRoleProfile();
          const businessDoc = await getDoc(doc(db, 'businesses', roleProfile.uid || auth.currentUser.uid));
          if (businessDoc.exists()) {
            const data = businessDoc.data();
            setBusinessName(data.businessName || 'My Business');
          }
          setUserRole(roleProfile.role);
          setDevBusinessName(await getSelectedDevBusinessName());
        } catch (error: any) {
          // Handle permission errors gracefully
          if (error.code === 'permission-denied' || error.message?.includes('permissions')) {
            console.warn('Firestore permissions not set up. Using default business name.');
            // Keep default business name
          } else {
            console.error('Error fetching business name:', error);
          }
        }
      };
      fetchBusinessName();
    }
  }, []);

  useEffect(() => {
    if (!pathname) return;
    if (!canAccessRoute(userRole, pathname)) {
      router.replace(getDefaultRouteForRole(userRole) as any);
      closeDrawer();
    }
  }, [pathname, userRole]);

  useEffect(() => {
    // useNativeDriver is not supported on web
    const supportsNativeDriver = Platform.OS !== 'web';
    
    if (drawerOpen) {
      // Parallel animations for smooth opening
      Animated.parallel([
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 68,
          friction: 12,
          useNativeDriver: supportsNativeDriver,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 1,
          duration: 300,
          easing: Easing.out(Easing.ease),
          useNativeDriver: supportsNativeDriver,
        }),
      ]).start();
    } else {
      // Parallel animations for ultra-smooth closing
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: -DRAWER_WIDTH,
          duration: 350,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1), // Material Design standard easing - very smooth
          useNativeDriver: supportsNativeDriver,
        }),
        Animated.timing(overlayOpacity, {
          toValue: 0,
          duration: 350,
          easing: Easing.bezier(0.4, 0.0, 0.2, 1), // Same smooth easing for sync
          useNativeDriver: supportsNativeDriver,
        }),
      ]).start();
    }
  }, [drawerOpen]);

  const hub = useActivityHub();

  const handleLogout = async () => {
    try {
      await logoutBusiness();
      router.replace('/(auth)/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const menuItems = [
    ...(isCurrentUserDeveloper()
      ? [{ key: 'dev', label: 'Dev Console', icon: 'construct-outline', route: APP_ROUTES.dev }]
      : []),
    { key: 'profile', label: 'Business Profile', icon: 'person-outline', route: APP_ROUTES.profile },
    { key: 'dashboard', label: 'Dashboard', icon: 'grid-outline', route: APP_ROUTES.dashboard },
    { key: 'browse-businesses', label: 'Browse Businesses', icon: 'search-outline', route: APP_ROUTES.browseBusinesses },
    { key: 'cart', label: 'Shopping Cart', icon: 'cart-outline', route: APP_ROUTES.cart },
    { key: 'incoming-orders', label: 'Incoming Orders', icon: 'mail-outline', route: APP_ROUTES.incomingOrders },
    { key: 'my-orders', label: 'My Orders', icon: 'bag-outline', route: APP_ROUTES.myOrders },
    { key: 'inventory', label: 'Inventory Management', icon: 'cube-outline', route: APP_ROUTES.inventory },
    { key: 'shifts', label: 'Shift Planning', icon: 'calendar-outline', route: APP_ROUTES.shifts },
    { key: 'attendance', label: 'Attendance', icon: 'time-outline', route: APP_ROUTES.attendance },
    { key: 'requests', label: 'Requests', icon: 'document-text-outline', route: APP_ROUTES.requests },
    { key: 'alerts', label: 'Low Stock Alerts', icon: 'warning-outline', route: APP_ROUTES.lowStockAlerts },
    { key: 'scanner', label: 'Barcode / QR Scan', icon: 'scan-outline', route: APP_ROUTES.stockScanner },
    { key: 'team-users', label: 'Team Users', icon: 'people-outline', route: APP_ROUTES.teamUsers },
    { key: 'chat', label: 'Chat', icon: 'chatbubbles-outline', route: APP_ROUTES.chat },
    { key: 'notifications', label: 'Notifications', icon: 'notifications-outline', route: APP_ROUTES.notifications },
    { key: 'settings', label: 'Settings', icon: 'settings-outline', route: APP_ROUTES.settings },
  ];
  const filteredMenuItems = menuItems.filter((item) => canAccessRoute(userRole, item.route));

  const isActive = (route: string) => {
    return pathname === route || pathname?.startsWith(route + '/');
  };

  const handleNavigation = (route: string) => {
    router.push(route as any);
    closeDrawer();
  };

  // Create dynamic styles based on theme
  const styles = getStyles(colors, paperTheme);

  const drawerContent = !fontsLoaded ? (
    <View style={[styles.drawerContainer, { paddingTop: insets.top, justifyContent: 'center', alignItems: 'center' }]}>
      <ActivityIndicator size="small" color={colors.primary} />
    </View>
  ) : (
    <View style={[styles.drawerContainer, { paddingTop: insets.top }]}>
      <View style={styles.drawerHeader}>
        <View style={styles.logoContainer}>
          <Logo size={64} style={styles.drawerLogo} />
          <Text variant="titleLarge" style={styles.businessName} numberOfLines={1}>
            {businessName}
          </Text>
          <Text variant="bodySmall" style={styles.businessEmail} numberOfLines={1}>
            {userEmail}
          </Text>
          <Text variant="labelMedium" style={styles.businessEmail}>
            {devBusinessName ? `Developer viewing: ${devBusinessName}` : ROLE_LABELS[userRole]}
          </Text>
        </View>
      </View>

      <ScrollView
        style={styles.drawerContent}
        contentContainerStyle={styles.drawerContentContainer}
        showsVerticalScrollIndicator={false}
      >
        {filteredMenuItems.map((item) => {
          const badge = hub.badgeForRoute(item.route);
          const highlight = hub.shouldHighlightRoute(item.route);
          return (
          <TouchableOpacity
            key={item.key}
            style={[
              styles.menuItem,
              isActive(item.route) && styles.menuItemActive,
              highlight && !isActive(item.route) && { backgroundColor: `${colors.warning}22` },
            ]}
            onPress={() => handleNavigation(item.route)}
          >
            <Ionicons
              name={item.icon as any}
              size={24}
              color={isActive(item.route) ? colors.primary : highlight && !isActive(item.route) ? colors.warning : colors.textSecondary}
              style={styles.menuIcon}
            />
            <Text
              variant="bodyLarge"
              style={[
                styles.menuLabel,
                { flex: 1 },
                isActive(item.route) && styles.menuLabelActive,
                highlight && !isActive(item.route) && { color: colors.warning, fontWeight: '700' },
              ]}
            >
              {item.label}
            </Text>
            {badge > 0 && (
              <View
                style={{
                  minWidth: 22,
                  height: 22,
                  paddingHorizontal: 6,
                  borderRadius: 11,
                  backgroundColor: colors.error,
                  alignItems: 'center',
                  justifyContent: 'center',
                }}
              >
                <Text style={{ color: '#FFFFFF', fontSize: 11, fontWeight: '800' }}>
                  {badge > 99 ? '99+' : String(badge)}
                </Text>
              </View>
            )}
          </TouchableOpacity>
          );
        })}

        <Divider style={styles.divider} />

        {devBusinessName && (
          <TouchableOpacity
            style={styles.logoutItem}
            onPress={async () => {
              await clearSelectedDevBusinessId();
              closeDrawer();
              router.replace('/dev' as any);
            }}
          >
            <Ionicons
              name="exit-outline"
              size={24}
              color={colors.warning}
              style={styles.menuIcon}
            />
            <Text variant="bodyLarge" style={[styles.logoutLabel, { color: colors.warning }]}>
              Exit Business View
            </Text>
          </TouchableOpacity>
        )}

        <TouchableOpacity
          style={styles.logoutItem}
          onPress={handleLogout}
        >
          <Ionicons
            name="log-out-outline"
            size={24}
            color={colors.error}
            style={styles.menuIcon}
          />
          <Text variant="bodyLarge" style={styles.logoutLabel}>
            Logout
          </Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );

  if (isTablet) {
    // On tablet/desktop, sidebar is always visible
    return (
      <View style={styles.sidebarContainer}>
        {drawerContent}
      </View>
    );
  }

  // On mobile, show as modal that slides from left
  return (
    <Modal
      visible={drawerOpen}
      transparent={true}
      animationType="none"
      onRequestClose={closeDrawer}
    >
      <Animated.View
        style={[
          styles.overlay,
          {
            opacity: overlayOpacity,
          },
        ]}
      >
        <TouchableOpacity
          style={StyleSheet.absoluteFill}
          activeOpacity={1}
          onPress={closeDrawer}
        />
        <Animated.View
          style={[
            styles.drawerModal,
            {
              transform: [{ translateX: slideAnim }],
            },
          ]}
        >
          <TouchableOpacity 
            activeOpacity={1} 
            onPress={(e) => e.stopPropagation()}
            style={{ flex: 1 }}
          >
            {drawerContent}
          </TouchableOpacity>
        </Animated.View>
      </Animated.View>
    </Modal>
  );
}

// Dynamic styles function
const getStyles = (colors: ReturnType<typeof getColors>, paperTheme: any) => StyleSheet.create({
  container: {
    flex: 1,
    flexDirection: 'row',
  },
  contentWrapper: {
    flex: 1,
    position: 'relative',
  },
  drawerToggle: {
    position: 'absolute',
    top: 60,
    left: 20,
    zIndex: 1000,
    padding: 8,
    backgroundColor: paperTheme.colors.surface,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  sidebarContainer: {
    width: DRAWER_WIDTH,
    backgroundColor: paperTheme.colors.surface,
    borderRightWidth: 1,
    borderRightColor: paperTheme.colors.outline,
    height: '100%',
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    zIndex: 1,
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  drawerModal: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
    backgroundColor: paperTheme.colors.surface,
  },
  drawerContainer: {
    width: DRAWER_WIDTH,
    flex: 1,
    backgroundColor: paperTheme.colors.surface,
  },
  drawerHeader: {
    paddingBottom: 24,
    paddingHorizontal: 20,
    paddingTop: 20,
    backgroundColor: paperTheme.colors.surfaceVariant,
    borderBottomWidth: 1,
    borderBottomColor: paperTheme.colors.outline,
  },
  logoContainer: {
    alignItems: 'center',
  },
  drawerLogo: {
    marginBottom: 12,
  },
  logoCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: paperTheme.colors.surface,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
    borderWidth: 2,
    borderColor: paperTheme.colors.outline,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  businessName: {
    color: paperTheme.colors.onSurface,
    fontWeight: '700',
    marginBottom: 4,
    textAlign: 'center',
  },
  businessEmail: {
    color: paperTheme.colors.onSurfaceVariant,
    textAlign: 'center',
  },
  drawerContent: {
    paddingTop: 8,
    flex: 1,
  },
  drawerContentContainer: {
    paddingBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 12,
  },
  menuItemActive: {
    backgroundColor: `${colors.primary}15`,
  },
  menuIcon: {
    marginRight: 16,
  },
  menuLabel: {
    color: paperTheme.colors.onSurface,
    fontWeight: '500',
  },
  menuLabelActive: {
    color: colors.primary,
    fontWeight: '600',
  },
  divider: {
    marginVertical: 8,
    marginHorizontal: 20,
    backgroundColor: paperTheme.colors.outlineVariant,
  },
  logoutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    marginHorizontal: 8,
    marginVertical: 2,
    borderRadius: 12,
  },
  logoutLabel: {
    color: colors.error,
    fontWeight: '600',
  },
});
