import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Chip, Dialog, Portal, Text, TextInput } from 'react-native-paper';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { collection, doc, serverTimestamp, setDoc } from 'firebase/firestore';
import { auth, db } from '../config/firebase';
import { getBusinesses } from '../services/businesses';
import { BusinessProfile } from '../services/profile';
import {
  clearSelectedDevBusinessId,
  getSelectedDevBusinessId,
  isCurrentUserDeveloper,
  setSelectedDevBusinessId,
} from '../services/devMode';
import { useTheme } from '../contexts/ThemeContext';
import { useBusinessContext } from '../contexts/BusinessContext';
import { getColors } from '../theme/colors';
import { seedDemoTestStore, DEMO_SEED_STATS } from '../services/demoSeed';
import {
  createDeveloperThemedStore,
  DEVELOPER_STORE_TEMPLATES,
  DeveloperStoreTheme,
} from '../services/developerStoreSeeds';
import { deleteBusinessCompletely } from '../services/devBusiness';

export default function DevConsoleScreen() {
  const router = useRouter();
  const { isDark } = useTheme();
  const { selectDevBusiness } = useBusinessContext();
  const colors = getColors(isDark);
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [selectedBusinessId, setSelectedBusinessIdState] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [demoSeeding, setDemoSeeding] = useState(false);
  const [themedSeeding, setThemedSeeding] = useState<DeveloperStoreTheme | null>(null);
  const [error, setError] = useState('');
  const [editingBusinessId, setEditingBusinessId] = useState<string | null>(null);
  const [businessName, setBusinessName] = useState('');
  const [businessEmail, setBusinessEmail] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [businessPhone, setBusinessPhone] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [businessLocation, setBusinessLocation] = useState('');
  const [deleteConfirm, setDeleteConfirm] = useState<BusinessProfile | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [notice, setNotice] = useState('');

  const enterBusiness = async (id: string) => {
    await selectDevBusiness(id);
    setSelectedBusinessIdState(id);
  };

  const load = async () => {
    try {
      setLoading(true);
      setError('');
      if (!auth?.currentUser) {
        router.replace('/(auth)/login');
        return;
      }
      if (!isCurrentUserDeveloper()) {
        setError('Developer access denied. Add your email to EXPO_PUBLIC_DEV_EMAILS or services/devMode.ts.');
        return;
      }
      const [items, selectedId] = await Promise.all([getBusinesses(), getSelectedDevBusinessId()]);
      setBusinesses(items.filter((business) => !business.isTeamMember));
      setSelectedBusinessIdState(selectedId);
    } catch (err: any) {
      setError(err.message || 'Failed to load developer console');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const filteredBusinesses = businesses.filter((business) => {
    const query = search.trim().toLowerCase();
    if (!query) return true;
    return (
      business.businessName?.toLowerCase().includes(query) ||
      business.email?.toLowerCase().includes(query) ||
      business.businessType?.toLowerCase().includes(query)
    );
  });

  const resetBusinessForm = () => {
    setEditingBusinessId(null);
    setBusinessName('');
    setBusinessEmail('');
    setBusinessType('');
    setBusinessPhone('');
    setBusinessAddress('');
    setBusinessLocation('');
  };

  const startEditBusiness = (business: BusinessProfile) => {
    setEditingBusinessId(business.uid);
    setBusinessName(business.businessName || '');
    setBusinessEmail(business.email || '');
    setBusinessType(business.businessType || '');
    setBusinessPhone(business.phoneNumber || '');
    setBusinessAddress(business.address || '');
    setBusinessLocation(business.location || '');
  };

  const saveBusiness = async () => {
    if (!db) {
      setError('Firestore is not configured');
      return;
    }
    if (!businessName.trim()) {
      setError('Business name is required');
      return;
    }
    try {
      setSaving(true);
      setError('');
      const businessRef = editingBusinessId
        ? doc(db, 'businesses', editingBusinessId)
        : doc(collection(db, 'businesses'));
      const businessId = businessRef.id;
      await setDoc(
        businessRef,
        {
          uid: businessId,
          email: businessEmail.trim().toLowerCase(),
          displayName: businessName.trim(),
          businessName: businessName.trim(),
          businessType: businessType.trim(),
          phoneNumber: businessPhone.trim(),
          address: businessAddress.trim(),
          location: businessLocation.trim(),
          role: 'manager',
          storeId: businessId,
          ownerBusinessId: businessId,
          isTeamMember: false,
          updatedAt: serverTimestamp(),
          ...(editingBusinessId ? {} : { createdAt: serverTimestamp() }),
        },
        { merge: true }
      );
      resetBusinessForm();
      await load();
    } catch (err: any) {
      setError(err.message || 'Failed to save business');
    } finally {
      setSaving(false);
    }
  };

  const confirmDeleteBusiness = async () => {
    if (!deleteConfirm) return;
    try {
      setDeleting(true);
      setError('');
      const result = await deleteBusinessCompletely(deleteConfirm.uid);
      if (selectedBusinessId === deleteConfirm.uid) {
        await clearSelectedDevBusinessId();
        setSelectedBusinessIdState(null);
      }
      setDeleteConfirm(null);
      await load();
      setNotice(
        `Deleted "${deleteConfirm.businessName}" — ${result.productsDeleted} products, ${result.categoriesDeleted} categories` +
          (result.teamProfilesDeleted ? `, ${result.teamProfilesDeleted} team profiles` : '')
      );
    } catch (err: any) {
      setError(err.message || 'Failed to delete business');
    } finally {
      setDeleting(false);
    }
  };

  const handleCreateThemedStore = async (theme: DeveloperStoreTheme) => {
    try {
      setThemedSeeding(theme);
      setError('');
      const result = await createDeveloperThemedStore(theme);
      await enterBusiness(result.businessId);
      setSelectedBusinessIdState(result.businessId);
      await load();
      Alert.alert(
        'Store created',
        `${result.businessName}\n\n` +
          `• ${result.categoriesCreated} categories\n` +
          `• ${result.productsCreated} products (no images — add in Inventory)\n` +
          `• Business ID: ${result.businessId}\n\n` +
          'Dev context is set to this store. Open Inventory to add product photos.',
        [{ text: 'OK' }]
      );
    } catch (err: any) {
      setError(err.message || 'Failed to create store');
    } finally {
      setThemedSeeding(null);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 20, gap: 12, paddingBottom: 80 },
    header: { color: colors.text, fontWeight: '700' },
    subtext: { color: colors.textSecondary, marginTop: 4 },
    card: { backgroundColor: colors.surface },
    formGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    formColumn: {
      flex: 1,
      minWidth: 260,
    },
    input: {
      marginBottom: 12,
      backgroundColor: colors.surface,
    },
    error: {
      backgroundColor: isDark ? '#7F1D1D' : '#FEE2E2',
      padding: 12,
      borderRadius: 10,
    },
  });

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.card}>
          <Card.Content>
            <Text variant="headlineSmall" style={styles.header}>
              Developer Console
            </Text>
            <Text variant="bodyMedium" style={styles.subtext}>
              View all businesses and enter any business context for debugging and final-project review.
            </Text>
            <View style={{ flexDirection: 'row', gap: 10, marginTop: 14, flexWrap: 'wrap' }}>
              <Button mode="outlined" icon="refresh" onPress={load} loading={loading}>
                Refresh
              </Button>
              <Button
                mode="outlined"
                icon="exit-to-app"
                onPress={async () => {
                  await clearSelectedDevBusinessId();
                  setSelectedBusinessIdState(null);
                }}
              >
                Clear Business View
              </Button>
              <Button mode="contained" icon="view-dashboard" onPress={() => router.push('/(drawer)/dashboard')}>
                Go to App
              </Button>
            </View>
          </Card.Content>
        </Card>

        {isCurrentUserDeveloper() && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={{ color: colors.text, marginBottom: 8 }}>
                Quick store builders
              </Text>
              <Text variant="bodyMedium" style={{ color: colors.textSecondary, marginBottom: 14 }}>
                One click creates a full business + catalog (20 products each, no images). Add photos in
                Inventory after creation. Remove these buttons when done.
              </Text>
              <View style={{ gap: 10 }}>
                <Button
                  mode="contained"
                  icon="food-apple"
                  loading={themedSeeding === 'tnuva'}
                  disabled={!!themedSeeding || demoSeeding || loading}
                  onPress={() => handleCreateThemedStore('tnuva')}
                >
                  Create Tnuva store ({DEVELOPER_STORE_TEMPLATES.tnuva.productCount} dairy products)
                </Button>
                <Button
                  mode="contained"
                  icon="broom"
                  loading={themedSeeding === 'cleaning'}
                  disabled={!!themedSeeding || demoSeeding || loading}
                  onPress={() => handleCreateThemedStore('cleaning')}
                >
                  Create cleaning tools store ({DEVELOPER_STORE_TEMPLATES.cleaning.productCount} products)
                </Button>
                <Button
                  mode="contained"
                  icon="cup"
                  loading={themedSeeding === 'plastic'}
                  disabled={!!themedSeeding || demoSeeding || loading}
                  onPress={() => handleCreateThemedStore('plastic')}
                >
                  Create plastic products store ({DEVELOPER_STORE_TEMPLATES.plastic.productCount} products)
                </Button>
              </View>
            </Card.Content>
          </Card>
        )}

        {isCurrentUserDeveloper() && (
          <Card style={styles.card}>
            <Card.Content>
              <Text variant="titleLarge" style={{ color: colors.text, marginBottom: 8 }}>
                Demo test store
              </Text>
              <Text variant="bodyMedium" style={{ color: colors.textSecondary, marginBottom: 14 }}>
                Creates a new business named{' '}
                <Text style={{ fontWeight: '700', color: colors.text }}>Loopify Demo Wholesale Co.</Text>
                {' '}
                with full metadata (hours, description, services), {DEMO_SEED_STATS.categories} product categories, and{' '}
                {DEMO_SEED_STATS.products} products including
                stock levels, reorder points, and sample QR codes for scanner testing. Use Enter on that business to try
                inventory, orders, browse-businesses, and low-stock flows.
              </Text>
              <Button
                mode="contained"
                icon="database-plus"
                loading={demoSeeding}
                disabled={demoSeeding || loading}
                onPress={async () => {
                  try {
                    setDemoSeeding(true);
                    setError('');
                    const result = await seedDemoTestStore();
                    await enterBusiness(result.businessId);
                    setSelectedBusinessIdState(result.businessId);
                    await load();
                    Alert.alert(
                      'Demo store created',
                      `${result.businessName}\n\n` +
                        `• ${result.categoriesCreated} categories\n` +
                        `• ${result.productsCreated} products\n` +
                        `• Business ID: ${result.businessId}\n\n` +
                        'Dev context is set to this store. Open Inventory or Browse businesses to test.',
                      [{ text: 'OK' }]
                    );
                  } catch (err: any) {
                    setError(err.message || 'Failed to create demo store');
                  } finally {
                    setDemoSeeding(false);
                  }
                }}
              >
                Create demo B2B store + catalog
              </Button>
            </Card.Content>
          </Card>
        )}

        {!!notice && (
          <View style={[styles.error, { backgroundColor: isDark ? '#064E3B' : '#DCFCE7' }]}>
            <Text style={{ color: colors.success, fontWeight: '700' }}>{notice}</Text>
          </View>
        )}

        {!!error && (
          <View style={styles.error}>
            <Text style={{ color: colors.error, fontWeight: '700' }}>{error}</Text>
          </View>
        )}

        {isCurrentUserDeveloper() && (
          <>
            <Card style={styles.card}>
              <Card.Content>
                <Text variant="titleLarge" style={{ color: colors.text, marginBottom: 12 }}>
                  {editingBusinessId ? 'Edit Business' : 'Add Business'}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.textSecondary, marginBottom: 12 }}>
                  This creates/updates real business store records only. Team users are excluded from this page.
                </Text>
                <View style={styles.formGrid}>
                  <View style={styles.formColumn}>
                    <TextInput
                      label="Business Name *"
                      value={businessName}
                      onChangeText={setBusinessName}
                      mode="outlined"
                      style={styles.input}
                    />
                    <TextInput
                      label="Business Email"
                      value={businessEmail}
                      onChangeText={setBusinessEmail}
                      mode="outlined"
                      keyboardType="email-address"
                      autoCapitalize="none"
                      style={styles.input}
                    />
                    <TextInput
                      label="Business Type"
                      value={businessType}
                      onChangeText={setBusinessType}
                      mode="outlined"
                      style={styles.input}
                    />
                  </View>
                  <View style={styles.formColumn}>
                    <TextInput
                      label="Phone"
                      value={businessPhone}
                      onChangeText={setBusinessPhone}
                      mode="outlined"
                      keyboardType="phone-pad"
                      style={styles.input}
                    />
                    <TextInput
                      label="Address"
                      value={businessAddress}
                      onChangeText={setBusinessAddress}
                      mode="outlined"
                      style={styles.input}
                    />
                    <TextInput
                      label="Location"
                      value={businessLocation}
                      onChangeText={setBusinessLocation}
                      mode="outlined"
                      style={styles.input}
                    />
                  </View>
                </View>
                <View style={{ flexDirection: 'row', gap: 8, justifyContent: 'flex-end', flexWrap: 'wrap' }}>
                  {editingBusinessId && (
                    <Button mode="outlined" onPress={resetBusinessForm} disabled={saving}>
                      Cancel Edit
                    </Button>
                  )}
                  <Button mode="contained" onPress={saveBusiness} loading={saving} disabled={saving}>
                    {editingBusinessId ? 'Save Business' : 'Add Business'}
                  </Button>
                </View>
              </Card.Content>
            </Card>

            <TextInput
              label="Search businesses"
              value={search}
              onChangeText={setSearch}
              mode="outlined"
              left={<TextInput.Icon icon="magnify" />}
              style={{ backgroundColor: colors.surface }}
            />

            {filteredBusinesses.map((business) => (
              <Card key={business.uid} style={styles.card}>
                <Card.Content>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: 12 }}>
                    <View style={{ flex: 1 }}>
                      <Text variant="titleMedium">{business.businessName || 'Unnamed Business'}</Text>
                      <Text variant="bodySmall" style={{ color: colors.textSecondary }}>{business.email}</Text>
                      <View style={{ flexDirection: 'row', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
                        {!!business.businessType && <Chip compact>{business.businessType}</Chip>}
                        {selectedBusinessId === business.uid && <Chip compact selected>Currently viewing</Chip>}
                      </View>
                    </View>
                    <Ionicons name="business-outline" size={28} color={colors.primary} />
                  </View>
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 12, flexWrap: 'wrap' }}>
                    <Button
                      mode="contained"
                      onPress={async () => {
                        await enterBusiness(business.uid);
                        setSelectedBusinessIdState(business.uid);
                        router.push('/(drawer)/dashboard');
                      }}
                    >
                      Enter
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={() => startEditBusiness(business)}
                    >
                      Edit
                    </Button>
                    <Button
                      mode="outlined"
                      textColor={colors.error}
                      onPress={() => setDeleteConfirm(business)}
                    >
                      Delete
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={async () => {
                        await enterBusiness(business.uid);
                        setSelectedBusinessIdState(business.uid);
                        router.push('/(drawer)/profile');
                      }}
                    >
                      Edit Profile
                    </Button>
                    <Button
                      mode="outlined"
                      onPress={async () => {
                        await enterBusiness(business.uid);
                        setSelectedBusinessIdState(business.uid);
                        router.push('/(drawer)/inventory');
                      }}
                    >
                      Inventory
                    </Button>
                  </View>
                </Card.Content>
              </Card>
            ))}

            {!loading && filteredBusinesses.length === 0 && (
              <Card style={styles.card}>
                <Card.Content>
                  <Text>No businesses found.</Text>
                </Card.Content>
              </Card>
            )}
          </>
        )}
      </ScrollView>

      <Portal>
        <Dialog visible={!!deleteConfirm} onDismiss={() => !deleting && setDeleteConfirm(null)}>
          <Dialog.Title>Delete business?</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">
              Permanently delete "{deleteConfirm?.businessName}" and all of its products, categories,
              and linked team profiles? This cannot be undone.
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setDeleteConfirm(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button
              textColor={colors.error}
              loading={deleting}
              disabled={deleting}
              onPress={confirmDeleteBusiness}
            >
              Delete
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </View>
  );
}
