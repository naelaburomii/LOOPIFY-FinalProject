import React, { useState } from 'react';
import { View, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { TextInput, Button, Text, Snackbar, SegmentedButtons } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { registerBusiness } from '../../services/auth';
import { useTheme } from '../../contexts/ThemeContext';
import { getColors } from '../../theme/colors';
import Logo from '../../components/Logo';
import { UserRole } from '../../types/roles';

export default function RegisterScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [address, setAddress] = useState('');
  const [role, setRole] = useState<UserRole>('manager');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [visible, setVisible] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const router = useRouter();
  const { isDark } = useTheme();
  const colors = getColors(isDark);

  const handleRegister = async () => {
    // Validation
    if (!email || !password || !confirmPassword || !businessName) {
      setError('Please fill in all required fields');
      setVisible(true);
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      setVisible(true);
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      setVisible(true);
      return;
    }

    setLoading(true);
    setError('');

    try {
      await registerBusiness(
        email,
        password,
        businessName,
        businessType,
        phoneNumber,
        address,
        role
      );
      router.replace('/(drawer)/dashboard');
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
      setVisible(true);
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
      padding: 24,
      paddingTop: 40,
      paddingBottom: 40,
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
      marginBottom: 24,
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
              Create your business account
            </Text>
          </View>

          {/* Form Card */}
          <View style={styles.card}>
            <Text variant="headlineSmall" style={styles.cardTitle}>
              Business Registration
            </Text>
            <Text variant="bodyMedium" style={styles.cardSubtitle}>
              Fill in your business details to get started
            </Text>

            <TextInput
              label="Business Name"
              value={businessName}
              onChangeText={setBusinessName}
              mode="outlined"
              left={<TextInput.Icon icon="store-outline" />}
              style={styles.input}
              disabled={loading}
              contentStyle={styles.inputContent}
              outlineStyle={styles.inputOutline}
              activeOutlineColor={colors.primary}
            />

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

            <Text variant="bodyMedium" style={{ color: colors.text, marginBottom: 8 }}>
              Account Role
            </Text>
            <SegmentedButtons
              value={role}
              onValueChange={(value) => setRole(value as UserRole)}
              style={{ marginBottom: 16 }}
              buttons={[
                { value: 'manager', label: 'Manager' },
                { value: 'employee', label: 'Employee' },
                { value: 'supplier', label: 'Supplier' },
                { value: 'customer', label: 'Customer' },
              ]}
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

            <TextInput
              label="Confirm Password"
              value={confirmPassword}
              onChangeText={setConfirmPassword}
              mode="outlined"
              secureTextEntry={!showConfirmPassword}
              left={<TextInput.Icon icon="lock-check-outline" />}
              right={
                <TextInput.Icon
                  icon={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                />
              }
              style={styles.input}
              disabled={loading}
              contentStyle={styles.inputContent}
              outlineStyle={styles.inputOutline}
              activeOutlineColor={colors.primary}
            />

            <TextInput
              label="Business Type"
              value={businessType}
              onChangeText={setBusinessType}
              mode="outlined"
              placeholder="e.g., Retail, Wholesale, Manufacturing"
              left={<TextInput.Icon icon="tag-outline" />}
              style={styles.input}
              disabled={loading}
              contentStyle={styles.inputContent}
              outlineStyle={styles.inputOutline}
              activeOutlineColor={colors.primary}
            />

            <TextInput
              label="Phone Number"
              value={phoneNumber}
              onChangeText={setPhoneNumber}
              mode="outlined"
              keyboardType="phone-pad"
              left={<TextInput.Icon icon="phone-outline" />}
              style={styles.input}
              disabled={loading}
              contentStyle={styles.inputContent}
              outlineStyle={styles.inputOutline}
              activeOutlineColor={colors.primary}
            />

            <TextInput
              label="Business Address"
              value={address}
              onChangeText={setAddress}
              mode="outlined"
              multiline
              numberOfLines={3}
              left={<TextInput.Icon icon="map-marker-outline" />}
              style={styles.input}
              disabled={loading}
              contentStyle={styles.inputContent}
              outlineStyle={styles.inputOutline}
              activeOutlineColor={colors.primary}
            />

            <Button
              mode="contained"
              onPress={handleRegister}
              loading={loading}
              disabled={loading}
              style={styles.button}
              contentStyle={styles.buttonContent}
              labelStyle={styles.buttonLabel}
              buttonColor={colors.primary}
            >
              Create Account
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
              onPress={() => router.push('/(auth)/login')}
              disabled={loading}
              style={styles.linkButton}
              labelStyle={styles.linkButtonLabel}
            >
              Already have an account? <Text style={styles.linkText}>Sign In</Text>
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
    </KeyboardAvoidingView>
  );
}
