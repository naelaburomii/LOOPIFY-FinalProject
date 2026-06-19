import { useEffect } from 'react';
import { useRouter } from 'expo-router';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../config/firebase';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useTheme } from '../contexts/ThemeContext';
import { getColors } from '../theme/colors';
import Logo from '../components/Logo';

export default function Index() {
  const router = useRouter();
  const { isDark } = useTheme();
  const colors = getColors(isDark);

  useEffect(() => {
    if (!auth) {
      // If Firebase is not configured, go to login screen
      router.replace('/(auth)/login');
      return;
    }

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        router.replace('/(drawer)/dashboard');
      } else {
        router.replace('/(auth)/login');
      }
    });

    return unsubscribe;
  }, []);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    content: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoImage: {
      width: 150,
      height: 150,
      resizeMode: 'contain',
      marginBottom: 20,
    },
    loader: {
      marginTop: 16,
    },
  });

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Logo size={150} style={styles.logoImage} />
        <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
      </View>
    </View>
  );
}
