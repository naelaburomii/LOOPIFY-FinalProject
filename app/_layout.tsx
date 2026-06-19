import { Stack } from 'expo-router';
import { PaperProvider, MD3LightTheme, MD3DarkTheme, configureFonts } from 'react-native-paper';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { useEffect, useState } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { useRouter, useSegments } from 'expo-router';
import { getColors } from '../theme/colors';
import { ThemeProvider, useTheme } from '../contexts/ThemeContext';
import { DrawerProvider } from '../contexts/DrawerContext';
import { CartProvider } from '../contexts/CartContext';
import { ActivityHubProvider } from '../contexts/ActivityHubContext';
import { BusinessContextProvider } from '../contexts/BusinessContext';
import WebFontLoader from '../components/WebFontLoader';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { canAccessRoute, getCurrentUserRoleProfile, getDefaultRouteForRole } from '../services/rbac';

// Suppress known deprecation warnings from dependencies
if (typeof console !== 'undefined' && console.warn) {
  const originalWarn = console.warn;
  console.warn = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    // Suppress pointerEvents deprecation warning from expo-router
    if (message.includes('props.pointerEvents is deprecated')) {
      return;
    }
    // Suppress React hydration errors related to font loading
    if (message.includes('Minified React error #418') || message.includes('hydration')) {
      return;
    }
    // Suppress useNativeDriver warnings on web (expected behavior)
    if (message.includes('useNativeDriver') && message.includes('not supported')) {
      return;
    }
    // Suppress shadow* style prop deprecation warnings
    if (message.includes('shadow*') && message.includes('deprecated')) {
      return;
    }
    // Suppress Image resizeMode deprecation warnings
    if (message.includes('style.resizeMode is deprecated')) {
      return;
    }
    originalWarn.apply(console, args);
  };
}

// Suppress React error #418 (hydration mismatch) on web
// This error often occurs due to font loading differences between server and client
if (typeof window !== 'undefined' && typeof Error !== 'undefined') {
  const originalError = console.error;
  console.error = (...args: any[]) => {
    const message = args[0]?.toString() || '';
    // Suppress React error #418 which is often related to font loading differences
    // This is a known issue with React Native Web and font loading
    if (message.includes('Minified React error #418') || 
        (message.includes('hydration') && message.includes('mismatch')) ||
        message.includes('Hydration failed')) {
      return;
    }
    originalError.apply(console, args);
  };
}

const fontConfig = {
  displayLarge: {
    fontFamily: 'System',
    fontSize: 57,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 64,
  },
  displayMedium: {
    fontFamily: 'System',
    fontSize: 45,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 52,
  },
  displaySmall: {
    fontFamily: 'System',
    fontSize: 36,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 44,
  },
  headlineLarge: {
    fontFamily: 'System',
    fontSize: 32,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 40,
  },
  headlineMedium: {
    fontFamily: 'System',
    fontSize: 28,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 36,
  },
  headlineSmall: {
    fontFamily: 'System',
    fontSize: 24,
    fontWeight: '400' as const,
    letterSpacing: 0,
    lineHeight: 32,
  },
  titleLarge: {
    fontFamily: 'System',
    fontSize: 22,
    fontWeight: '500' as const,
    letterSpacing: 0,
    lineHeight: 28,
  },
  titleMedium: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '500' as const,
    letterSpacing: 0.15,
    lineHeight: 24,
  },
  titleSmall: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '500' as const,
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  labelLarge: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '500' as const,
    letterSpacing: 0.1,
    lineHeight: 20,
  },
  labelMedium: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  labelSmall: {
    fontFamily: 'System',
    fontSize: 11,
    fontWeight: '500' as const,
    letterSpacing: 0.5,
    lineHeight: 16,
  },
  bodyLarge: {
    fontFamily: 'System',
    fontSize: 16,
    fontWeight: '400' as const,
    letterSpacing: 0.15,
    lineHeight: 24,
  },
  bodyMedium: {
    fontFamily: 'System',
    fontSize: 14,
    fontWeight: '400' as const,
    letterSpacing: 0.25,
    lineHeight: 20,
  },
  bodySmall: {
    fontFamily: 'System',
    fontSize: 12,
    fontWeight: '400' as const,
    letterSpacing: 0.4,
    lineHeight: 16,
  },
};

function AppContent() {
  const router = useRouter();
  const segments = useSegments();
  const { isDark } = useTheme();
  const [isReady, setIsReady] = useState(false);

  // Ensure fonts are loaded before rendering to prevent hydration mismatch
  useEffect(() => {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      // On web, wait for fonts to be ready
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(() => {
          // Small delay to ensure fonts are fully loaded
          setTimeout(() => setIsReady(true), 100);
        }).catch(() => {
          // If font loading fails, proceed anyway
          setIsReady(true);
        });
      } else {
        setIsReady(true);
      }
    } else {
      setIsReady(true);
    }
  }, []);

  useEffect(() => {
    if (!isReady) return;
    
    if (!auth) {
      // If Firebase is not configured, allow navigation to auth screens
      return;
    }

    const unsubscribe = onAuthStateChanged(auth!, (user) => {
      const inAuthGroup = segments[0] === '(auth)';
      const currentPath = `/${segments.join('/')}`;
      
      if (!user && !inAuthGroup) {
        // User is not signed in and not in auth group, redirect to login
        router.replace('/(auth)/login');
      } else if (user && inAuthGroup) {
        getCurrentUserRoleProfile().then((profile) => {
          router.replace(getDefaultRouteForRole(profile.role) as any);
        });
      } else if (user && !inAuthGroup) {
        getCurrentUserRoleProfile().then((profile) => {
          if (!canAccessRoute(profile.role, currentPath)) {
            router.replace(getDefaultRouteForRole(profile.role) as any);
          }
        });
      }
    });

    return unsubscribe;
  }, [segments, isReady]);

  const baseTheme = isDark ? MD3DarkTheme : MD3LightTheme;
  const themeColors = getColors(isDark);
  const theme = {
    ...baseTheme,
    colors: {
      ...baseTheme.colors,
      primary: themeColors.primary,
      primaryContainer: themeColors.primaryLight,
      secondary: themeColors.secondary,
      secondaryContainer: themeColors.surfaceVariant,
      tertiary: themeColors.warning,
      surface: themeColors.surface,
      surfaceVariant: themeColors.surfaceVariant,
      background: themeColors.background,
      error: themeColors.error,
      errorContainer: isDark ? '#7F1D1D' : '#FEE2E2',
      onPrimary: '#FFFFFF',
      onSecondary: '#FFFFFF',
      onSurface: themeColors.text,
      onSurfaceVariant: themeColors.textSecondary,
      onBackground: themeColors.text,
      outline: themeColors.border,
      outlineVariant: themeColors.divider,
    },
    fonts: configureFonts({ config: fontConfig }),
  };

  // Don't render until fonts are ready on web to prevent hydration mismatch
  if (!isReady) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <PaperProvider
        theme={theme}
        settings={{
          icon: (props) => <MaterialCommunityIcons {...props} />,
        }}
      >
        <WebFontLoader />
        <CartProvider>
          <BusinessContextProvider>
            <ActivityHubProvider>
              <DrawerProvider>
                <Stack
                  screenOptions={{
                    headerShown: false,
                  }}
                />
              </DrawerProvider>
            </ActivityHubProvider>
          </BusinessContextProvider>
        </CartProvider>
      </PaperProvider>
    </GestureHandlerRootView>
  );
}

export default function RootLayout() {
  return (
    <ThemeProvider>
      <AppContent />
    </ThemeProvider>
  );
}

