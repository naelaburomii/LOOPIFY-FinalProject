import React, { useEffect, useMemo, useState } from 'react';
import { Modal, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, IconButton, SegmentedButtons, Snackbar, Text, TextInput } from 'react-native-paper';
import Header from '../../components/Header';
import { useDrawer } from '../../contexts/DrawerContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getColors } from '../../theme/colors';
import { useRouter } from 'expo-router';
import {
  createTeamUser,
  generateTeamEmail,
  generateTemporaryPassword,
  getTeamUsers,
  sendTeamUserPasswordReset,
  TeamUser,
  TeamUserRole,
  updateTeamUser,
  updateTeamUserHourlySalary,
} from '../../services/teamUsers';
import { getCurrentUserRoleProfile, getDefaultRouteForRole } from '../../services/rbac';
import { ROLE_LABELS } from '../../types/roles';
import { clearSelectedDevBusinessId, isCurrentUserDeveloper } from '../../services/devMode';
import { loginBusiness } from '../../services/auth';

export default function TeamUsersScreen() {
  const router = useRouter();
  const { openDrawer } = useDrawer();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const [teamUsers, setTeamUsers] = useState<TeamUser[]>([]);
  const [storeName, setStoreName] = useState('Loopify');
  const [modalVisible, setModalVisible] = useState(false);
  const [editingUser, setEditingUser] = useState<TeamUser | null>(null);
  const [displayName, setDisplayName] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editConfirmPassword, setEditConfirmPassword] = useState('');
  const [role, setRole] = useState<TeamUserRole>('employee');
  const [hourlySalary, setHourlySalary] = useState('');
  const [saving, setSaving] = useState(false);
  const [snackbar, setSnackbar] = useState('');
  const [modalError, setModalError] = useState('');
  const [createdCredentials, setCreatedCredentials] = useState<{ email: string; password: string } | null>(null);
  const [staffLoginUser, setStaffLoginUser] = useState<TeamUser | null>(null);
  const [staffLoginPassword, setStaffLoginPassword] = useState('');
  const [staffLoginLoading, setStaffLoginLoading] = useState(false);
  const [staffLoginError, setStaffLoginError] = useState('');

  const generatedEmail = useMemo(() => generateTeamEmail(displayName || role, storeName), [displayName, role, storeName]);

  const load = async () => {
    const [profile, users] = await Promise.all([getCurrentUserRoleProfile(), getTeamUsers()]);
    setStoreName(profile.businessName || 'Loopify');
    setTeamUsers(users);
  };

  useEffect(() => {
    load().catch((error) => setSnackbar(error.message || 'Failed to load team users'));
  }, []);

  const handleStaffSignIn = async () => {
    if (!staffLoginUser) return;
    if (!staffLoginPassword.trim()) {
      setStaffLoginError('Enter this user’s password (the one set when the account was created).');
      return;
    }
    setStaffLoginError('');
    try {
      setStaffLoginLoading(true);
      await clearSelectedDevBusinessId();
      await loginBusiness(staffLoginUser.email, staffLoginPassword.trim());
      const profile = await getCurrentUserRoleProfile();
      setStaffLoginUser(null);
      setStaffLoginPassword('');
      router.replace(getDefaultRouteForRole(profile.role) as any);
    } catch (error: any) {
      setStaffLoginError(error.message || 'Could not sign in. Check the password and try again.');
    } finally {
      setStaffLoginLoading(false);
    }
  };

  const resetForm = () => {
    setEditingUser(null);
    setDisplayName('');
    setPhoneNumber('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setEditPassword('');
    setEditConfirmPassword('');
    setRole('employee');
    setHourlySalary('');
    setModalError('');
    setCreatedCredentials(null);
  };

  const openEditModal = (user: TeamUser) => {
    setModalError('');
    setCreatedCredentials(null);
    setEditingUser(user);
    setDisplayName(user.displayName);
    setPhoneNumber(user.phoneNumber || '');
    setEmail(user.email);
    setRole(user.role);
    setHourlySalary(user.hourlySalary ? String(user.hourlySalary) : '');
    setPassword('');
    setEditPassword('');
    setEditConfirmPassword('');
    setModalVisible(true);
  };

  const handleSave = async () => {
    setModalError('');
    setCreatedCredentials(null);
    if (!displayName.trim()) {
      setModalError('Name is required');
      return;
    }
    if (!editingUser && (password || '').length < 6) {
      setModalError('Password must be at least 6 characters');
      return;
    }
    if (!editingUser && password !== confirmPassword) {
      setModalError('Passwords do not match');
      return;
    }
    try {
      setSaving(true);
      if (editingUser) {
        if (editPassword.trim() || editConfirmPassword.trim()) {
          if (editPassword.trim().length < 6) {
            setModalError('New password must be at least 6 characters');
            return;
          }
          if (editPassword !== editConfirmPassword) {
            setModalError('New passwords do not match');
            return;
          }
        }
        await updateTeamUser(editingUser.uid, {
          displayName: displayName.trim(),
          phoneNumber: phoneNumber.trim(),
          email: email.trim().toLowerCase(),
          role,
          password: editPassword.trim() || undefined,
        });
        if (role === 'employee') {
          await updateTeamUserHourlySalary(editingUser.uid, Number(hourlySalary) || 0);
        }
        setSnackbar('Team user updated');
      } else {
        const result = await createTeamUser({
          displayName,
          phoneNumber,
          role,
          email: (email || generatedEmail).trim().toLowerCase(),
          password: password || generateTemporaryPassword(),
          hourlySalary: role === 'employee' ? Number(hourlySalary) || 0 : 0,
        });
        setCreatedCredentials({ email: result.user.email, password: result.password });
        setSnackbar('Team login created');
        setDisplayName('');
        setPhoneNumber('');
        setEmail('');
        setPassword('');
        setConfirmPassword('');
        setRole('employee');
        setHourlySalary('');
      }
      await load();
      if (editingUser) {
        setModalVisible(false);
        resetForm();
      }
    } catch (error: any) {
      setModalError(error.message || 'Failed to save team user');
    } finally {
      setSaving(false);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, gap: 12, paddingBottom: 96 },
    card: { backgroundColor: colors.surface },
    formGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 16,
      alignItems: 'flex-start',
    },
    formColumn: {
      flex: 1,
      minWidth: 280,
    },
    addButtonRow: {
      alignItems: 'flex-end',
      marginTop: 4,
    },
    addButton: {
      minWidth: 96,
      borderRadius: 8,
    },
    modalBackdrop: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    modalContent: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 20,
      borderTopRightRadius: 20,
      padding: 20,
      maxHeight: '92%',
    },
    input: { marginBottom: 12, backgroundColor: colors.surface },
    helper: { color: colors.textSecondary, marginBottom: 12 },
    errorBox: {
      backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2',
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
    },
    successBox: {
      backgroundColor: isDark ? '#064E3B' : '#DCFCE7',
      borderRadius: 10,
      padding: 12,
      marginBottom: 12,
    },
    staffLoginBackdrop: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: 'rgba(0,0,0,0.5)',
      padding: 20,
    },
    staffLoginCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      width: '100%',
      maxWidth: 400,
    },
  });

  return (
    <View style={styles.container}>
      <Header title="Team Users" onMenuPress={openDrawer} />
      <ScrollView contentContainerStyle={styles.content}>
        {isCurrentUserDeveloper() && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleSmall" style={{ marginBottom: 8 }}>
                Developer: test worker / supplier logins
              </Text>
              <Text variant="bodyMedium" style={{ color: colors.textSecondary }}>
                Use &quot;Sign in as this user&quot; on a team row, enter their password, and you will switch to that
                account with the correct sidebar. Dev business view is cleared so their store context is correct.
              </Text>
            </Card.Content>
          </Card>
        )}
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="titleLarge" style={{ marginBottom: 16 }}>Add New User</Text>
            {!!modalError && !editingUser && (
              <View style={styles.errorBox}>
                <Text variant="bodyMedium" style={{ color: colors.error, fontWeight: '700' }}>
                  {modalError}
                </Text>
              </View>
            )}
            {createdCredentials && !editingUser && (
              <View style={styles.successBox}>
                <Text variant="titleSmall" style={{ color: colors.success, marginBottom: 6 }}>
                  Login created successfully
                </Text>
                <Text selectable>Login Email: {createdCredentials.email}</Text>
                <Text selectable>Password: {createdCredentials.password}</Text>
                <Text variant="bodySmall" style={{ marginTop: 8, color: colors.textSecondary }}>
                  Use this exact email and password on the login screen.
                </Text>
              </View>
            )}
            <Text variant="bodyMedium" style={{ color: colors.textSecondary, marginTop: 6, marginBottom: 12 }}>
              Create employee and supplier accounts for the same store. Their sidebar will automatically match their role.
            </Text>
            <View style={styles.formGrid}>
              <View style={styles.formColumn}>
                <TextInput
                  label="Name *"
                  value={displayName}
                  onChangeText={setDisplayName}
                  mode="outlined"
                  style={styles.input}
                />
                <TextInput
                  label="Phone Number"
                  value={phoneNumber}
                  onChangeText={setPhoneNumber}
                  mode="outlined"
                  keyboardType="phone-pad"
                  style={styles.input}
                />
                <TextInput
                  label="Confirm Password *"
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                  mode="outlined"
                  secureTextEntry
                  style={styles.input}
                />
                {role === 'employee' && (
                  <TextInput
                    label="Hourly salary (₪)"
                    value={hourlySalary}
                    onChangeText={setHourlySalary}
                    mode="outlined"
                    keyboardType="decimal-pad"
                    style={styles.input}
                  />
                )}
              </View>
              <View style={styles.formColumn}>
                <TextInput
                  label="Login Email *"
                  value={email}
                  onChangeText={setEmail}
                  mode="outlined"
                  autoCapitalize="none"
                  keyboardType="email-address"
                  placeholder={`Leave empty to use ${generatedEmail}`}
                  style={styles.input}
                />
                <Text variant="bodySmall" style={styles.helper}>Role *</Text>
                <SegmentedButtons
                  value={role}
                  onValueChange={(value) => setRole(value as TeamUserRole)}
                  buttons={[
                    { value: 'employee', label: 'Employee' },
                    { value: 'supplier', label: 'Supplier' },
                  ]}
                  style={{ marginBottom: 12 }}
                />
                <TextInput
                  label="Password *"
                  value={password}
                  onChangeText={setPassword}
                  mode="outlined"
                  secureTextEntry
                  style={styles.input}
                />
                <Button
                  mode="outlined"
                  onPress={() => {
                    const generatedPassword = generateTemporaryPassword();
                    setPassword(generatedPassword);
                    setConfirmPassword(generatedPassword);
                  }}
                  style={{ marginBottom: 12 }}
                >
                  Generate Password
                </Button>
              </View>
            </View>
            <View style={styles.addButtonRow}>
              <Button
                mode="contained"
                loading={saving && !editingUser}
                disabled={saving}
                onPress={handleSave}
                style={styles.addButton}
              >
                Add
              </Button>
            </View>
          </Card.Content>
        </Card>

        {teamUsers.map((user) => (
          <Card key={user.uid} style={styles.card}>
            <Card.Content>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                <View style={{ flex: 1 }}>
                  <Text variant="titleMedium">{user.displayName}</Text>
                  <Text variant="bodySmall" style={{ color: colors.textSecondary }}>Login Email</Text>
                  <Text selectable variant="bodyMedium" style={{ color: colors.textSecondary }}>{user.email}</Text>
                  {!!user.phoneNumber && <Text variant="bodySmall">{user.phoneNumber}</Text>}
                  {user.role === 'employee' && (
                    <Text variant="bodySmall" style={{ marginTop: 6 }}>
                      Hourly salary: ₪{(user.hourlySalary || 0).toFixed(2)}
                    </Text>
                  )}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <Chip compact>{ROLE_LABELS[user.role]}</Chip>
                    <Chip compact>{user.status}</Chip>
                  </View>
                </View>
                <IconButton icon="pencil" onPress={() => openEditModal(user)} />
              </View>
              <Button
                mode="text"
                icon="lock-reset"
                onPress={async () => {
                  await sendTeamUserPasswordReset(user.email);
                  setSnackbar('Password reset email sent');
                }}
              >
                Send Password Reset
              </Button>
              {isCurrentUserDeveloper() && (
                <Button
                  mode="contained-tonal"
                  icon="login"
                  style={{ marginTop: 8 }}
                  onPress={() => {
                    setStaffLoginUser(user);
                    setStaffLoginPassword('');
                    setStaffLoginError('');
                  }}
                >
                  Sign in as this user
                </Button>
              )}
            </Card.Content>
          </Card>
        ))}

        {teamUsers.length === 0 && (
          <Card style={styles.card}>
            <Card.Content>
              <Text>No team users yet. Create your first employee or supplier login.</Text>
            </Card.Content>
          </Card>
        )}
      </ScrollView>

      <Modal visible={modalVisible} transparent animationType="slide" onRequestClose={() => setModalVisible(false)}>
        <View style={styles.modalBackdrop}>
          <View style={styles.modalContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text variant="titleLarge">{editingUser ? 'Edit Team User' : 'Create Team Login'}</Text>
              <IconButton icon="close" onPress={() => setModalVisible(false)} />
            </View>
            <ScrollView keyboardShouldPersistTaps="handled">
              {!!modalError && (
                <View style={styles.errorBox}>
                  <Text variant="bodyMedium" style={{ color: colors.error, fontWeight: '700' }}>
                    {modalError}
                  </Text>
                </View>
              )}
              {createdCredentials && (
                <View style={styles.successBox}>
                  <Text variant="titleSmall" style={{ color: colors.success, marginBottom: 6 }}>
                    Login created successfully
                  </Text>
                  <Text selectable>Email: {createdCredentials.email}</Text>
                  <Text selectable>Password: {createdCredentials.password}</Text>
                  <Text variant="bodySmall" style={{ marginTop: 8, color: colors.textSecondary }}>
                    Share these credentials with the user. Close this dialog when done.
                  </Text>
                  <Button
                    mode="contained"
                    style={{ marginTop: 10 }}
                    onPress={() => {
                      setModalVisible(false);
                      resetForm();
                    }}
                  >
                    Done
                  </Button>
                </View>
              )}
              <TextInput label="Full Name" value={displayName} onChangeText={setDisplayName} mode="outlined" style={styles.input} />
              <TextInput label="Phone Number" value={phoneNumber} onChangeText={setPhoneNumber} mode="outlined" keyboardType="phone-pad" style={styles.input} />
              <Text variant="bodySmall" style={styles.helper}>Role determines the sidebar and allowed pages.</Text>
              <SegmentedButtons
                value={role}
                onValueChange={(value) => setRole(value as TeamUserRole)}
                buttons={[
                  { value: 'employee', label: 'Employee' },
                  { value: 'supplier', label: 'Supplier' },
                ]}
                style={{ marginBottom: 12 }}
              />
              {role === 'employee' && (
                <TextInput
                  label="Hourly salary (₪)"
                  value={hourlySalary}
                  onChangeText={setHourlySalary}
                  mode="outlined"
                  keyboardType="decimal-pad"
                  style={styles.input}
                />
              )}
              <TextInput
                label="Login Email"
                value={email || (!editingUser ? generatedEmail : '')}
                onChangeText={setEmail}
                mode="outlined"
                autoCapitalize="none"
                keyboardType="email-address"
                style={styles.input}
              />
              {!editingUser && (
                <>
                  <TextInput
                    label="Temporary Password"
                    value={password}
                    onChangeText={setPassword}
                    mode="outlined"
                    style={styles.input}
                  />
                  <Button mode="outlined" onPress={() => setPassword(generateTemporaryPassword())} style={{ marginBottom: 12 }}>
                    Generate Password
                  </Button>
                </>
              )}
              {editingUser && (
                <>
                  <Text variant="titleSmall" style={{ marginTop: 8, marginBottom: 8 }}>
                    Change Login Password
                  </Text>
                  <TextInput
                    label="New Password"
                    value={editPassword}
                    onChangeText={setEditPassword}
                    mode="outlined"
                    secureTextEntry
                    style={styles.input}
                  />
                  <TextInput
                    label="Confirm New Password"
                    value={editConfirmPassword}
                    onChangeText={setEditConfirmPassword}
                    mode="outlined"
                    secureTextEntry
                    style={styles.input}
                  />
                  <Button
                    mode="outlined"
                    onPress={() => {
                      const generatedPassword = generateTemporaryPassword();
                      setEditPassword(generatedPassword);
                      setEditConfirmPassword(generatedPassword);
                    }}
                    style={{ marginBottom: 12 }}
                  >
                    Generate New Password
                  </Button>
                  <Text variant="bodySmall" style={styles.helper}>
                    Save Changes updates the user's name, phone, role, login email, and password.
                  </Text>
                </>
              )}
              <Button mode="contained" loading={saving} disabled={saving || !!createdCredentials} onPress={handleSave}>
                {editingUser ? 'Save Changes' : 'Create Login'}
              </Button>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal
        visible={!!staffLoginUser}
        transparent
        animationType="fade"
        onRequestClose={() => {
          setStaffLoginUser(null);
          setStaffLoginPassword('');
          setStaffLoginError('');
        }}
      >
        <View style={styles.staffLoginBackdrop}>
          <View style={styles.staffLoginCard}>
            <Text variant="titleLarge" style={{ marginBottom: 4 }}>
              Sign in as team user
            </Text>
            {staffLoginUser && (
              <>
                <Text variant="bodyMedium" style={{ marginBottom: 4 }}>
                  {staffLoginUser.displayName}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.textSecondary, marginBottom: 12 }}>
                  {staffLoginUser.email}
                </Text>
              </>
            )}
            <TextInput
              label="Password"
              value={staffLoginPassword}
              onChangeText={setStaffLoginPassword}
              mode="outlined"
              secureTextEntry
              autoCapitalize="none"
              style={styles.input}
              disabled={staffLoginLoading}
            />
            {!!staffLoginError && (
              <Text variant="bodySmall" style={{ color: colors.error, marginBottom: 8 }}>
                {staffLoginError}
              </Text>
            )}
            <Button
              mode="contained"
              loading={staffLoginLoading}
              disabled={staffLoginLoading}
              onPress={handleStaffSignIn}
              style={{ marginTop: 8 }}
            >
              Sign in
            </Button>
            <Button
              mode="text"
              onPress={() => {
                setStaffLoginUser(null);
                setStaffLoginPassword('');
                setStaffLoginError('');
              }}
              disabled={staffLoginLoading}
            >
              Cancel
            </Button>
          </View>
        </View>
      </Modal>

      <Snackbar visible={!!snackbar} onDismiss={() => setSnackbar('')} duration={3000}>
        {snackbar}
      </Snackbar>
    </View>
  );
}
