import { View, StyleSheet, ScrollView, Modal, TextInput, Alert } from 'react-native';
import { Text, Card, List, Switch, Divider, Button, Portal, Dialog } from 'react-native-paper';
import Header from '../../components/Header';
import { useTheme } from '../../contexts/ThemeContext';
import { getColors } from '../../theme/colors';
import { useState, useEffect } from 'react';
import { useDrawer } from '../../contexts/DrawerContext';
import { useRouter } from 'expo-router';
import { auth } from '../../config/firebase';
import { deleteAccount } from '../../services/auth';

export default function SettingsScreen() {
  const { openDrawer } = useDrawer();
  const router = useRouter();
  const { isDark, toggleTheme } = useTheme();
  const colors = getColors(isDark);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [advancedModalVisible, setAdvancedModalVisible] = useState(false);
  const [deleteConfirmVisible, setDeleteConfirmVisible] = useState(false);
  const [emailInput, setEmailInput] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  useEffect(() => {
    const user = auth?.currentUser;
    if (user && user.email) {
      setUserEmail(user.email);
    }
  }, []);

  const styles = StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    scrollView: {
      flex: 1,
    },
    scrollContent: {
      padding: 20,
      paddingBottom: 40,
    },
    card: {
      marginBottom: 20,
      backgroundColor: colors.surface,
    },
    sectionTitle: {
      fontWeight: '700',
      marginBottom: 8,
      color: colors.text,
    },
    advancedButton: {
      marginTop: 8,
      borderColor: colors.primary,
      borderWidth: 1.5,
    },
    advancedButtonContent: {
      paddingVertical: 8,
    },
    advancedButtonLabel: {
      fontSize: 15,
      fontWeight: '600',
      color: colors.primary,
    },
    modalContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 24,
      width: '90%',
      maxWidth: 400,
    },
    modalTitle: {
      fontSize: 20,
      fontWeight: '700',
      marginBottom: 16,
      color: colors.text,
    },
    modalDescription: {
      fontSize: 14,
      color: colors.textSecondary,
      marginBottom: 24,
      lineHeight: 20,
    },
    emailInput: {
      backgroundColor: colors.surfaceVariant,
      borderRadius: 8,
      paddingHorizontal: 16,
      paddingVertical: 12,
      fontSize: 16,
      color: colors.text,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    emailInputError: {
      borderColor: colors.error,
    },
    deleteButton: {
      backgroundColor: colors.error,
      marginTop: 8,
    },
    deleteButtonContent: {
      paddingVertical: 8,
    },
    cancelButton: {
      marginTop: 8,
    },
    errorText: {
      color: colors.error,
      fontSize: 12,
      marginTop: -12,
      marginBottom: 12,
    },
  });

  const handleDeleteAccount = async () => {
    if (!auth?.currentUser) {
      Alert.alert('Error', 'No user logged in');
      return;
    }

    if (emailInput.trim().toLowerCase() !== userEmail?.toLowerCase()) {
      Alert.alert('Error', 'Email does not match. Please enter your exact email address.');
      return;
    }

    setIsDeleting(true);
    try {
      await deleteAccount(auth.currentUser);
      Alert.alert(
        'Account Deleted',
        'Your account has been successfully deleted.',
        [
          {
            text: 'OK',
            onPress: () => {
              router.replace('/(auth)/login');
            },
          },
        ]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to delete account');
    } finally {
      setIsDeleting(false);
      setDeleteConfirmVisible(false);
      setEmailInput('');
    }
  };

  return (
    <View style={styles.container}>
      <Header title="Settings" onMenuPress={openDrawer} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Appearance
            </Text>
            <List.Item
              title="Dark Mode"
              description="Switch between light and dark theme"
              left={(props) => <List.Icon {...props} icon={isDark ? "weather-night" : "weather-sunny"} />}
              right={() => (
                <Switch
                  value={isDark}
                  onValueChange={toggleTheme}
                />
              )}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Notifications
            </Text>
            <List.Item
              title="Push Notifications"
              description="Receive push notifications on your device"
              left={(props) => <List.Icon {...props} icon="bell" />}
              right={() => (
                <Switch
                  value={notificationsEnabled}
                  onValueChange={setNotificationsEnabled}
                />
              )}
            />
            <Divider />
            <List.Item
              title="Email Notifications"
              description="Receive notifications via email"
              left={(props) => <List.Icon {...props} icon="email" />}
              right={() => (
                <Switch
                  value={emailNotifications}
                  onValueChange={setEmailNotifications}
                />
              )}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Account
            </Text>
            <List.Item
              title="Business Profile"
              description="Manage your business information"
              left={(props) => <List.Icon {...props} icon="account-circle" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              onPress={() => router.push('/(drawer)/profile')}
            />
            <Divider />
            <List.Item
              title="Privacy & Security"
              description="Manage your privacy settings"
              left={(props) => <List.Icon {...props} icon="shield" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
          </Card.Content>
        </Card>

        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              Advanced
            </Text>
            <Button
              mode="outlined"
              icon="cog"
              onPress={() => setAdvancedModalVisible(true)}
              style={styles.advancedButton}
              contentStyle={styles.advancedButtonContent}
              labelStyle={styles.advancedButtonLabel}
            >
              Advanced Settings
            </Button>
          </Card.Content>
        </Card>

        <Card style={styles.card} mode="elevated">
          <Card.Content>
            <Text variant="titleLarge" style={styles.sectionTitle}>
              About
            </Text>
            <List.Item
              title="Version"
              description="1.0.0"
              left={(props) => <List.Icon {...props} icon="information" />}
            />
            <Divider />
            <List.Item
              title="Help & Support"
              description="Get help and contact support"
              left={(props) => <List.Icon {...props} icon="help-circle" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
            />
          </Card.Content>
        </Card>
      </ScrollView>

      {/* Advanced Settings Modal */}
      <Portal>
        <Modal
          visible={advancedModalVisible}
          onDismiss={() => setAdvancedModalVisible(false)}
          transparent={true}
          animationType="fade"
        >
          <View style={styles.modalContainer}>
            <Card style={styles.modalContent} mode="elevated">
              <Card.Content>
                <Text variant="titleLarge" style={styles.modalTitle}>
                  Advanced Settings
                </Text>
                <Text variant="bodyMedium" style={styles.modalDescription}>
                  Manage advanced account settings and preferences.
                </Text>
                <Button
                  mode="contained"
                  buttonColor={colors.error}
                  textColor="#FFFFFF"
                  icon="delete"
                  onPress={() => {
                    setAdvancedModalVisible(false);
                    setDeleteConfirmVisible(true);
                  }}
                  style={styles.deleteButton}
                  contentStyle={styles.deleteButtonContent}
                >
                  Delete Account
                </Button>
                <Button
                  mode="outlined"
                  onPress={() => setAdvancedModalVisible(false)}
                  style={styles.cancelButton}
                >
                  Cancel
                </Button>
              </Card.Content>
            </Card>
          </View>
        </Modal>
      </Portal>

      {/* Delete Account Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={deleteConfirmVisible}
          onDismiss={() => {
            setDeleteConfirmVisible(false);
            setEmailInput('');
          }}
        >
          <Dialog.Title>Delete Account</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.modalDescription}>
              This action cannot be undone. All your data will be permanently deleted.
            </Text>
            <Text variant="bodyMedium" style={[styles.modalDescription, { marginTop: 16, marginBottom: 8 }]}>
              To confirm, please enter your email address:
            </Text>
            <Text variant="labelSmall" style={{ color: colors.textSecondary, marginBottom: 4 }}>
              {userEmail}
            </Text>
            <TextInput
              style={styles.emailInput}
              placeholder="Enter your email"
              placeholderTextColor={colors.textSecondary}
              value={emailInput}
              onChangeText={setEmailInput}
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              editable={!isDeleting}
            />
          </Dialog.Content>
          <Dialog.Actions>
            <Button
              onPress={() => {
                setDeleteConfirmVisible(false);
                setEmailInput('');
              }}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              mode="contained"
              buttonColor={colors.error}
              textColor="#FFFFFF"
              onPress={handleDeleteAccount}
              loading={isDeleting}
              disabled={isDeleting || emailInput.trim() === ''}
            >
              Delete Account
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}

