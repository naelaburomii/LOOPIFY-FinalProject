import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Animated, Platform } from 'react-native';
import { Text } from 'react-native-paper';
import { useRouter, usePathname } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '../contexts/ThemeContext';
import { getColors } from '../theme/colors';
import { useCart } from '../contexts/CartContext';
import { useActivityHub } from '../contexts/ActivityHubContext';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { APP_ROUTES, UserRole } from '../types/roles';
import { canAccessRoute, getCurrentUserRoleProfile, getDefaultRouteForRole } from '../services/rbac';

interface NavItemProps {
  item: {
    key: string;
    label: string;
    icon: string;
    route: string;
  };
  active: boolean;
  highlight: boolean;
  badgeCount: number;
  onPress: () => void;
  colors: ReturnType<typeof getColors>;
  isDark: boolean;
}

function NavItem({ item, active, highlight, badgeCount, onPress, colors, isDark }: NavItemProps) {
  const scaleAnim = useRef(new Animated.Value(active ? 1 : 0.9)).current;
  const opacityAnim = useRef(new Animated.Value(active ? 1 : 0.6)).current;

  useEffect(() => {
    const supportsNativeDriver = Platform.OS !== 'web';

    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: active ? 1 : 0.9,
        useNativeDriver: supportsNativeDriver,
        tension: 300,
        friction: 20,
      }),
      Animated.timing(opacityAnim, {
        toValue: active ? 1 : 0.6,
        duration: 200,
        useNativeDriver: supportsNativeDriver,
      }),
    ]).start();
  }, [active, opacityAnim, scaleAnim]);

  const styles = StyleSheet.create({
    navItem: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 8,
      paddingHorizontal: 4,
      minWidth: 0,
      position: 'relative',
    },
    activeIndicator: {
      position: 'absolute',
      top: 0,
      width: 40,
      height: 3,
      borderRadius: 2,
      backgroundColor: colors.primary,
    },
    iconContainer: {
      width: 48,
      height: 48,
      borderRadius: 24,
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: 4,
      position: 'relative',
    },
    iconContainerActive: {
      backgroundColor: isDark ? 'rgba(59, 130, 246, 0.15)' : 'rgba(29, 78, 216, 0.1)',
    },
    iconGlow: {
      borderWidth: 2,
      borderColor: colors.warning,
    },
    navIcon: {
      zIndex: 1,
    },
    navLabel: {
      fontSize: 10,
      fontWeight: '600',
      textAlign: 'center',
      letterSpacing: 0.2,
      marginTop: 2,
    },
    navLabelActive: {
      fontWeight: '700',
    },
    badge: {
      position: 'absolute',
      top: 4,
      right: 8,
      backgroundColor: colors.error,
      borderRadius: 8,
      minWidth: 16,
      height: 16,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 4,
      zIndex: 2,
      borderWidth: 2,
      borderColor: isDark ? colors.surface : '#FFFFFF',
    },
    badgeText: {
      color: '#FFFFFF',
      fontSize: 9,
      fontWeight: '700',
    },
  });

  const showBadge = badgeCount > 0;

  return (
    <TouchableOpacity style={styles.navItem} onPress={onPress} activeOpacity={0.8}>
      {active && <View style={styles.activeIndicator} />}
      <Animated.View
        style={[
          styles.iconContainer,
          active && styles.iconContainerActive,
          highlight && !active && styles.iconGlow,
          {
            transform: [{ scale: scaleAnim }],
            opacity: opacityAnim,
          },
        ]}
      >
        <Ionicons
          name={item.icon as any}
          size={24}
          color={active ? colors.primary : colors.textSecondary}
          style={styles.navIcon}
        />
        {showBadge && (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badgeCount > 99 ? '99+' : String(badgeCount)}</Text>
          </View>
        )}
      </Animated.View>
      <Text
        numberOfLines={1}
        style={[
          styles.navLabel,
          {
            color: active ? colors.primary : highlight && !active ? colors.warning : colors.textSecondary,
          },
          active && styles.navLabelActive,
        ]}
      >
        {item.label}
      </Text>
    </TouchableOpacity>
  );
}

export default function BottomNavBar() {
  const router = useRouter();
  const pathname = usePathname();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const { getTotalItems } = useCart();
  const hub = useActivityHub();
  const insets = useSafeAreaInsets();
  const cartItemCount = getTotalItems();
  const [userRole, setUserRole] = React.useState<UserRole>('manager');

  useEffect(() => {
    getCurrentUserRoleProfile()
      .then((profile) => setUserRole(profile.role))
      .catch(() => setUserRole('manager'));
  }, []);

  const navItems = [
    { key: 'dashboard', label: 'Dashboard', icon: 'grid-outline', route: APP_ROUTES.dashboard },
    { key: 'browse', label: 'Browse', icon: 'search-outline', route: APP_ROUTES.browseBusinesses },
    { key: 'cart', label: 'Cart', icon: 'cart-outline', route: APP_ROUTES.cart },
    { key: 'chat', label: 'Chat', icon: 'chatbubbles-outline', route: APP_ROUTES.chat },
    { key: 'notifications', label: 'Alerts', icon: 'notifications-outline', route: APP_ROUTES.notifications },
    { key: 'profile', label: 'Profile', icon: 'person-outline', route: APP_ROUTES.profile },
  ];
  const filteredNavItems = navItems.filter((item) => canAccessRoute(userRole, item.route));

  const isActive = (route: string) => {
    return pathname === route || pathname?.startsWith(route + '/');
  };

  const handleNavigation = (route: string) => {
    if (!canAccessRoute(userRole, route)) {
      router.replace(getDefaultRouteForRole(userRole) as any);
      return;
    }
    if (pathname !== route) {
      router.replace(route as any);
    }
  };

  const badgeForNavKey = (key: string, route: string) => {
    if (key === 'cart') return cartItemCount;
    return hub.badgeForRoute(route);
  };

  const styles = StyleSheet.create({
    container: {
      flexDirection: 'row',
      backgroundColor: isDark ? 'rgba(31, 41, 55, 0.95)' : 'rgba(255, 255, 255, 0.95)',
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.08)',
      paddingTop: 8,
      paddingBottom: Math.max(insets.bottom, 8),
      ...Platform.select({
        ios: {
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.1,
          shadowRadius: 12,
        },
        android: {
          elevation: 16,
        },
      }),
    },
  });

  return (
    <View style={styles.container}>
      {filteredNavItems.map((item) => (
        <NavItem
          key={item.key}
          item={item}
          active={isActive(item.route)}
          highlight={hub.shouldHighlightRoute(item.route)}
          badgeCount={badgeForNavKey(item.key, item.route)}
          onPress={() => handleNavigation(item.route)}
          colors={colors}
          isDark={isDark}
        />
      ))}
    </View>
  );
}
