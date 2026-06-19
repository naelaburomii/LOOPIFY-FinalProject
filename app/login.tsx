import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Snackbar, Text, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import Logo from '../components/Logo';
import { useTheme } from '../contexts/ThemeContext';
import { getColors } from '../theme/colors';
import { loginBusiness } from '../services/auth';
import { isDeveloperEmail } from '../services/devMode';

const DEFAULT_DEV_EMAIL = 'nael@loopify.dev';
const DEFAULT_DEV_PASSWORD = 'password';

export default function DeveloperLoginScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const [email, setEmail] = useState(DEFAULT_DEV_EMAIL);
  const [password, setPassword] = useState(DEFAULT_DEV_PASSWORD);
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  const handleLogin = async () => {
    try {
      setLoading(true);
      setMessage('');
      await loginBusiness(email, password);
      if (!isDeveloperEmail(email)) {
        setMessage('This email is not allowed for developer access.');
        return;
      }
      router.replace('/dev');
    } catch (error: any) {
      setMessage(error.message || 'Developer login failed');
    } finally {
      setLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      justifyContent: 'center',
      padding: 24,
    },
    content: {
      width: '100%',
      maxWidth: 420,
      alignSelf: 'center',
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 32,
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      borderWidth: 1,
      borderColor: colors.border,
      padding: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
    },
    title: {
      color: colors.text,
      fontWeight: '700',
      textAlign: 'center',
      marginBottom: 8,
    },
    subtitle: {
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 24,
    },
    input: {
      marginBottom: 16,
      backgroundColor: colors.surface,
    },
    button: {
      marginTop: 8,
      borderRadius: 8,
    },
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView contentContainerStyle={styles.scrollContent} keyboardShouldPersistTaps="handled">
        <View style={styles.content}>
          <View style={styles.logoContainer}>
            <Logo size={160} />
          </View>

          <View style={styles.card}>
            <Text variant="headlineSmall" style={styles.title}>
              Developer Login
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Sign in to open the Loopify developer console.
            </Text>

            <TextInput
              label="Developer Email"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              left={<TextInput.Icon icon="email-outline" />}
              style={styles.input}
            />

            <TextInput
              label="Password"
              value={password}
              onChangeText={setPassword}
              mode="outlined"
              secureTextEntry={!showPassword}
              left={<TextInput.Icon icon="lock-outline" />}
              right={
                <TextInput.Icon
                  icon={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  onPress={() => setShowPassword((value) => !value)}
                />
              }
              style={styles.input}
            />

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.button}
              buttonColor={colors.primary}
            >
              Open Developer Console
            </Button>
          </View>
        </View>
      </ScrollView>

      <Snackbar visible={!!message} onDismiss={() => setMessage('')} duration={5000}>
        {message}
      </Snackbar>
    </KeyboardAvoidingView>
  );
}
