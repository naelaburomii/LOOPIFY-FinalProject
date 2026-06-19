import React, { useState, useEffect } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView, TouchableOpacity } from 'react-native';
import { TextInput, Button, Text, Snackbar, Modal, Portal } from 'react-native-paper';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { loginBusiness, resetPassword } from '../../services/auth';
import { useTheme } from '../../contexts/ThemeContext';
import { getColors } from '../../theme/colors';
import Logo from '../../components/Logo';
import { getCurrentUserRoleProfile, getDefaultRouteForRole } from '../../services/rbac';

export default function LoginScreen() {
  const params = useLocalSearchParams<{ email?: string }>();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordVisible, setForgotPasswordVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const router = useRouter();
  const { isDark } = useTheme();
  const colors = getColors(isDark);

  useEffect(() => {
    const paramEmail = params.email;
    if (typeof paramEmail === 'string' && paramEmail.includes('@')) {
      setEmail(paramEmail.trim());
    } else if (Array.isArray(paramEmail) && paramEmail[0]?.includes('@')) {
      setEmail(paramEmail[0].trim());
    }
  }, [params.email]);

  const handleLogin = async () => {
    if (!email || !password) {
      setError('Please fill in all fields');
      setVisible(true);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await loginBusiness(email, password);
      const profile = await getCurrentUserRoleProfile();
      router.replace(getDefaultRouteForRole(profile.role) as any);
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
      setVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      setError('Please enter your email address');
      setVisible(true);
      return;
    }

    setResetLoading(true);
    setError('');

    try {
      await resetPassword(resetEmail);
      setResetSuccess(true);
    } catch (err: any) {
      setError(err.message || 'Failed to send password reset email. Please try again.');
      setVisible(true);
    } finally {
      setResetLoading(false);
    }
  };

  const openForgotPassword = () => {
    setResetEmail(email); // Pre-fill with email from login form if available
    setResetSuccess(false);
    setForgotPasswordVisible(true);
  };

  const closeForgotPassword = () => {
    setForgotPasswordVisible(false);
    setResetEmail('');
    setResetSuccess(false);
  };

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollContent: {
      flexGrow: 1,
      padding: 24,
      paddingTop: 80,
      justifyContent: 'center',
    },
    content: {
      width: '100%',
      maxWidth: 420,
      alignSelf: 'center',
    },
    logoContainer: {
      alignItems: 'center',
      marginBottom: 48,
    },
    logoImage: {
      marginBottom: 24,
    },
    title: {
      color: colors.text,
      fontWeight: '700',
      marginBottom: 8,
      textAlign: 'center',
    },
    subtitle: {
      color: colors.textSecondary,
      textAlign: 'center',
    },
    card: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.1,
      shadowRadius: 12,
      elevation: 4,
      borderWidth: 1,
      borderColor: colors.border,
    },
    cardTitle: {
      color: colors.text,
      fontWeight: '700',
      marginBottom: 8,
      textAlign: 'center',
    },
    cardSubtitle: {
      color: colors.textSecondary,
      textAlign: 'center',
      marginBottom: 32,
    },
    input: {
      marginBottom: 16,
      backgroundColor: colors.surface,
    },
    inputContent: {
      fontSize: 16,
    },
    inputOutline: {
      borderWidth: 1.5,
      borderColor: colors.border,
    },
    button: {
      marginTop: 8,
      marginBottom: 24,
      borderRadius: 8,
      paddingVertical: 4,
    },
    buttonContent: {
      paddingVertical: 8,
    },
    buttonLabel: {
      fontSize: 16,
      fontWeight: '600',
      letterSpacing: 0.5,
    },
    divider: {
      flexDirection: 'row',
      alignItems: 'center',
      marginVertical: 24,
    },
    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: colors.divider,
    },
    dividerText: {
      marginHorizontal: 16,
      color: colors.textTertiary,
      fontSize: 12,
    },
    linkButton: {
      marginTop: 8,
    },
    linkButtonLabel: {
      fontSize: 14,
    },
    linkText: {
      color: colors.primary,
      fontWeight: '600',
    },
    snackbar: {
      marginBottom: 20,
    },
    forgotPasswordContainer: {
      alignSelf: 'flex-end',
      marginBottom: 16,
      marginTop: -8,
    },
    forgotPasswordText: {
      color: colors.primary,
      fontSize: 14,
      fontWeight: '600',
    },
    modalContainer: {
      backgroundColor: colors.surface,
      padding: 24,
      margin: 20,
      borderRadius: 16,
      maxWidth: 400,
      alignSelf: 'center',
    },
    modalTitle: {
      color: colors.text,
      fontWeight: '700',
      marginBottom: 8,
      fontSize: 20,
    },
    modalSubtitle: {
      color: colors.textSecondary,
      marginBottom: 24,
      fontSize: 14,
    },
    successContainer: {
      alignItems: 'center',
      paddingVertical: 24,
    },
    successIcon: {
      marginBottom: 16,
    },
    successText: {
      color: colors.text,
      fontSize: 16,
      textAlign: 'center',
      marginBottom: 8,
    },
    successSubtext: {
      color: colors.textSecondary,
      fontSize: 14,
      textAlign: 'center',
    },
  });

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={styles.container}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          {/* Logo Section */}
          <View style={styles.logoContainer}>
            <Logo size={180} style={styles.logoImage} />
            <Text variant="titleMedium" style={styles.subtitle}>
              B2B Business Platform
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text variant="headlineSmall" style={styles.cardTitle}>
              Welcome Back
            </Text>
            <Text variant="bodyMedium" style={styles.cardSubtitle}>
              Sign in to continue to your business dashboard
            </Text>

            <TextInput
              label="Email Address"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              keyboardType="email-address"
              autoCapitalize="none"
              left={<TextInput.Icon icon="email-outline" />}
              style={styles.input}
              disabled={loading}
              contentStyle={styles.inputContent}
              outlineStyle={styles.inputOutline}
              activeOutlineColor={colors.primary}
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
                  onPress={() => setShowPassword(!showPassword)}
                />
              }
              style={styles.input}
              disabled={loading}
              contentStyle={styles.inputContent}
              outlineStyle={styles.inputOutline}
              activeOutlineColor={colors.primary}
            />

            <TouchableOpacity
              onPress={openForgotPassword}
              disabled={loading}
              style={styles.forgotPasswordContainer}
            >
              <Text style={styles.forgotPasswordText}>Forgot Password?</Text>
            </TouchableOpacity>

            <Button
              mode="contained"
              onPress={handleLogin}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
              buttonColor={colors.primary}
            >
              Sign In
            </Button>

            <View style={styles.divider}>
              <View style={styles.dividerLine} />
              <Text variant="bodySmall" style={styles.dividerText}>
                OR
              </Text>
              <View style={styles.dividerLine} />
            </View>

            <Button
              mode="text"
              onPress={() => router.push('/(auth)/register')}
              disabled={loading}
              style={styles.linkButton}
              labelStyle={styles.linkButtonLabel}
            >
              Don't have an account? <Text style={styles.linkText}>Sign Up</Text>
            </Button>
          </View>
        </View>
      </ScrollView>

      <Snackbar
        visible={visible}
        onDismiss={() => setVisible(false)}
        duration={3000}
        style={styles.snackbar}
        action={{
          label: 'Dismiss',
          onPress: () => setVisible(false),
        }}
      >
        {error}
      </Snackbar>

      <Portal>
        <Modal
          visible={forgotPasswordVisible}
          onDismiss={closeForgotPassword}
          contentContainerStyle={styles.modalContainer}
        >
          {!resetSuccess ? (
            <>
              <Text style={styles.modalTitle}>Reset Password</Text>
              <Text style={styles.modalSubtitle}>
                Enter your email address and we'll send you a link to reset your password.
              </Text>

              <TextInput
                label="Email Address"
                value={resetEmail}
                onChangeText={setResetEmail}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                left={<TextInput.Icon icon="email-outline" />}
                style={styles.input}
                disabled={resetLoading}
                contentStyle={styles.inputContent}
                outlineStyle={styles.inputOutline}
                activeOutlineColor={colors.primary}
              />

              <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
                <Button
                  mode="outlined"
                  onPress={closeForgotPassword}
                  disabled={resetLoading}
                  style={{ flex: 1 }}
                  textColor={colors.text}
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleForgotPassword}
                  loading={resetLoading}
                  disabled={resetLoading}
                  style={{ flex: 1 }}
                  buttonColor={colors.primary}
                >
                  Send Reset Link
                </Button>
              </View>
            </>
          ) : (
            <View style={styles.successContainer}>
              <Text style={styles.successIcon}>✓</Text>
              <Text style={styles.successText}>Password Reset Email Sent!</Text>
              <Text style={styles.successSubtext}>
                Check your email ({resetEmail}) for instructions to reset your password.
              </Text>
              <Button
                mode="contained"
                onPress={closeForgotPassword}
                style={{ marginTop: 24, width: '100%' }}
                buttonColor={colors.primary}
              >
                Close
              </Button>
            </View>
          )}
        </Modal>
      </Portal>
    </KeyboardAvoidingView>
  );
}
