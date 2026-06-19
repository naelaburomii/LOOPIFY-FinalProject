import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Avatar, useTheme } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme as useAppTheme } from '../contexts/ThemeContext';
import { getColors } from '../theme/colors';

interface HeaderProps {
  title: string;
  showBack?: boolean;
  onMenuPress?: () => void;
}

export default function Header({ title, showBack = false, onMenuPress }: HeaderProps) {
  const router = useRouter();
  const { isDark } = useAppTheme();
  const colors = getColors(isDark);
  const paperTheme = useTheme();

  const goBack = () => {
    if (router.canGoBack()) {
      router.back();
    }
  };

  const styles = StyleSheet.create({
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 16,
      paddingTop: 60,
      backgroundColor: paperTheme.colors.surface,
      borderBottomWidth: 1,
      borderBottomColor: paperTheme.colors.outline,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.05,
      shadowRadius: 4,
      elevation: 2,
    },
    headerLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    iconButton: {
      marginRight: 16,
      padding: 4,
    },
    title: {
      fontWeight: '700',
      color: paperTheme.colors.onSurface,
      flex: 1,
    },
    avatar: {
      backgroundColor: `${colors.primary}15`,
    },
  });

  return (
    <View style={styles.header}>
      <View style={styles.headerLeft}>
        {showBack ? (
          <TouchableOpacity onPress={goBack} style={styles.iconButton}>
            <Ionicons name="arrow-back" size={24} color={paperTheme.colors.onSurface} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity onPress={onMenuPress} style={styles.iconButton}>
            <Ionicons name="menu" size={24} color={paperTheme.colors.onSurface} />
          </TouchableOpacity>
        )}
        <Text variant="titleLarge" style={styles.title}>
          {title}
        </Text>
      </View>
      <Avatar.Icon
        size={40}
        icon="account"
        style={styles.avatar}
      />
    </View>
  );
}

