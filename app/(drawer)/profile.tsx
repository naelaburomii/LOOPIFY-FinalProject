import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, Alert } from 'react-native';
import { Text, TextInput, Button, Card, Divider, Snackbar } from 'react-native-paper';
import Header from '../../components/Header';
import { useTheme } from '../../contexts/ThemeContext';
import { getColors } from '../../theme/colors';
import { useDrawer } from '../../contexts/DrawerContext';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { getBusinessProfile, updateBusinessProfile, uploadBusinessLogo, uploadBusinessCoverImage, BusinessProfile } from '../../services/profile';
import { auth } from '../../config/firebase';

export default function ProfileScreen() {
  const { openDrawer } = useDrawer();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [snackbarVisible, setSnackbarVisible] = useState(false);
  const [snackbarMessage, setSnackbarMessage] = useState('');

  const [profile, setProfile] = useState<BusinessProfile>({
    uid: '',
    email: '',
    businessName: '',
    businessType: '',
    phoneNumber: '',
    address: '',
    location: '',
    workHours: '',
    description: '',
    services: '',
    logoUrl: '',
    coverImageUrl: '',
  });

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const data = await getBusinessProfile();
      if (data) {
        setProfile(data);
      } else if (auth?.currentUser) {
        // Initialize with current user data
        setProfile({
          uid: auth.currentUser.uid,
          email: auth.currentUser.email || '',
          businessName: '',
          businessType: '',
          phoneNumber: '',
          address: '',
          location: '',
          workHours: '',
          description: '',
          services: '',
          logoUrl: '',
          coverImageUrl: '',
        });
      }
    } catch (error: any) {
      setSnackbarMessage(error.message || 'Failed to load profile');
      setSnackbarVisible(true);
    } finally {
      setLoading(false);
    }
  };

  const handleImagePick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || 'images',
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5, // Reduced quality for faster uploads
        allowsMultipleSelection: false,
      } as any);

      if (!result.canceled && result.assets[0]) {
        setSaving(true);
        setSnackbarMessage('Uploading logo...');
        setSnackbarVisible(true);
        try {
          const logoUrl = await uploadBusinessLogo(result.assets[0].uri);
          setProfile({ ...profile, logoUrl });
          setSnackbarMessage('Logo updated successfully!');
          setSnackbarVisible(true);
        } catch (uploadError: any) {
          setSnackbarMessage(uploadError.message || 'Failed to upload logo');
          setSnackbarVisible(true);
        } finally {
          setSaving(false);
        }
      }
    } catch (error: any) {
      setSnackbarMessage(error.message || 'Failed to upload logo');
      setSnackbarVisible(true);
    } finally {
      setSaving(false);
    }
  };

  const handleCoverImagePick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission needed', 'Please grant permission to access your photos.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions?.Images || 'images',
        allowsEditing: true,
        aspect: [16, 9],
        quality: 0.5, // Reduced quality for faster uploads
        allowsMultipleSelection: false,
      } as any);

      if (!result.canceled && result.assets[0]) {
        setSaving(true);
        setSnackbarMessage('Uploading cover image...');
        setSnackbarVisible(true);
        try {
          const coverImageUrl = await uploadBusinessCoverImage(result.assets[0].uri);
          setProfile({ ...profile, coverImageUrl });
          setSnackbarMessage('Cover image updated successfully!');
          setSnackbarVisible(true);
        } catch (uploadError: any) {
          setSnackbarMessage(uploadError.message || 'Failed to upload cover image');
          setSnackbarVisible(true);
        } finally {
          setSaving(false);
        }
      }
    } catch (error: any) {
      setSnackbarMessage(error.message || 'Failed to upload cover image');
      setSnackbarVisible(true);
    } finally {
      setSaving(false);
    }
  };

  const handleSave = async () => {
    if (!profile.businessName.trim()) {
      setSnackbarMessage('Business name is required');
      setSnackbarVisible(true);
      return;
    }

    setSaving(true);
    try {
      await updateBusinessProfile(profile);
      setSnackbarMessage('Profile updated successfully!');
      setSnackbarVisible(true);
    } catch (error: any) {
      setSnackbarMessage(error.message || 'Failed to update profile');
      setSnackbarVisible(true);
    } finally {
      setSaving(false);
    }
  };

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
    headerCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 0,
      marginBottom: 24,
      borderWidth: 1,
      borderColor: colors.border,
    },
    headerCardWrapper: {
      overflow: 'hidden',
      borderRadius: 16,
    },
    coverImageContainer: {
      width: '100%',
      height: 200,
      position: 'relative',
      backgroundColor: colors.surfaceVariant,
    },
    coverImage: {
      width: '100%',
      height: '100%',
    },
    coverImagePlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
    },
    editCoverButton: {
      position: 'absolute',
      top: 16,
      right: 16,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      paddingHorizontal: 12,
      paddingVertical: 8,
      borderRadius: 8,
      flexDirection: 'row',
      alignItems: 'center',
    },
    logoContainer: {
      position: 'relative',
      marginBottom: 16,
      marginTop: -60,
      alignItems: 'center',
    },
    logoImage: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.surfaceVariant,
      borderWidth: 3,
      borderColor: colors.border,
    },
    logoPlaceholder: {
      width: 120,
      height: 120,
      borderRadius: 60,
      backgroundColor: colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: colors.border,
    },
    editLogoButton: {
      position: 'absolute',
      bottom: 0,
      right: 0,
      backgroundColor: colors.primary,
      width: 40,
      height: 40,
      borderRadius: 20,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 3,
      borderColor: colors.surface,
    },
    businessName: {
      fontSize: 24,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
      textAlign: 'center',
    },
    businessType: {
      fontSize: 16,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    sectionCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 20,
      borderWidth: 1,
      borderColor: colors.border,
    },
    sectionTitle: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 16,
    },
    input: {
      marginBottom: 16,
      backgroundColor: colors.surface,
    },
    textArea: {
      marginBottom: 16,
      backgroundColor: colors.surface,
      minHeight: 100,
    },
    divider: {
      marginVertical: 16,
      backgroundColor: colors.divider,
    },
    saveButton: {
      marginTop: 8,
      borderRadius: 12,
      paddingVertical: 4,
    },
    saveButtonContent: {
      paddingVertical: 10,
    },
    saveButtonLabel: {
      fontSize: 16,
      fontWeight: '600',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
    },
  });

  if (loading) {
    return (
      <View style={styles.container}>
        <Header title="Business Profile" onMenuPress={openDrawer} />
        <View style={styles.loadingContainer}>
          <Text variant="bodyLarge" style={{ color: colors.textSecondary }}>
            Loading profile...
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Header title="Business Profile" onMenuPress={openDrawer} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Cover Image, Logo and Business Name Section */}
        <Card style={styles.headerCard} mode="elevated">
          <View style={styles.headerCardWrapper}>
            {/* Cover Image */}
            <View style={styles.coverImageContainer}>
            {profile.coverImageUrl ? (
              <Image source={{ uri: profile.coverImageUrl }} style={styles.coverImage} />
            ) : (
              <View style={styles.coverImagePlaceholder}>
                <Ionicons name="image-outline" size={48} color={colors.textSecondary} />
              </View>
            )}
            <TouchableOpacity
              style={styles.editCoverButton}
              onPress={handleCoverImagePick}
              disabled={saving}
            >
              <Ionicons name="camera" size={18} color="#FFFFFF" />
              <Text style={{ color: '#FFFFFF', marginLeft: 6, fontSize: 12, fontWeight: '600' }}>
                {profile.coverImageUrl ? 'Change Cover' : 'Add Cover'}
              </Text>
            </TouchableOpacity>
          </View>

          {/* Logo and Business Info */}
          <View style={{ padding: 24, paddingTop: 80, alignItems: 'center' }}>
            <View style={styles.logoContainer}>
              {profile.logoUrl ? (
                <Image source={{ uri: profile.logoUrl }} style={styles.logoImage} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Ionicons name="storefront" size={48} color={colors.textSecondary} />
                </View>
              )}
              <TouchableOpacity
                style={styles.editLogoButton}
                onPress={handleImagePick}
                disabled={saving}
              >
                <Ionicons name="camera" size={20} color="#FFFFFF" />
              </TouchableOpacity>
            </View>
            <Text style={styles.businessName}>
              {profile.businessName || 'Your Business'}
            </Text>
            {profile.businessType && (
              <Text style={styles.businessType}>{profile.businessType}</Text>
            )}
          </View>
          </View>
        </Card>

        {/* Basic Information */}
        <Card style={styles.sectionCard} mode="elevated">
          <Text style={styles.sectionTitle}>Basic Information</Text>
          
          <TextInput
            label="Business Name *"
            value={profile.businessName}
            onChangeText={(text) => setProfile({ ...profile, businessName: text })}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="domain" />}
            disabled={saving}
          />

          <TextInput
            label="Email"
            value={profile.email}
            mode="outlined"
            style={styles.input}
            left={<TextInput.Icon icon="email" />}
            disabled
            editable={false}
          />

          <TextInput
            label="Business Type"
            value={profile.businessType}
            onChangeText={(text) => setProfile({ ...profile, businessType: text })}
            mode="outlined"
            placeholder="e.g., Retail, Wholesale, Manufacturing"
            style={styles.input}
            left={<TextInput.Icon icon="briefcase" />}
            disabled={saving}
          />

          <TextInput
            label="Phone Number"
            value={profile.phoneNumber}
            onChangeText={(text) => setProfile({ ...profile, phoneNumber: text })}
            mode="outlined"
            keyboardType="phone-pad"
            style={styles.input}
            left={<TextInput.Icon icon="phone" />}
            disabled={saving}
          />
        </Card>

        {/* Location Information */}
        <Card style={styles.sectionCard} mode="elevated">
          <Text style={styles.sectionTitle}>Location</Text>
          
          <TextInput
            label="Address"
            value={profile.address}
            onChangeText={(text) => setProfile({ ...profile, address: text })}
            mode="outlined"
            multiline
            numberOfLines={2}
            style={styles.input}
            left={<TextInput.Icon icon="map-marker" />}
            disabled={saving}
          />

          <TextInput
            label="Location"
            value={profile.location}
            onChangeText={(text) => setProfile({ ...profile, location: text })}
            mode="outlined"
            placeholder="City, State, Country"
            style={styles.input}
            left={<TextInput.Icon icon="map" />}
            disabled={saving}
          />
        </Card>

        {/* Business Hours */}
        <Card style={styles.sectionCard} mode="elevated">
          <Text style={styles.sectionTitle}>Work Hours</Text>
          
          <TextInput
            label="Work Hours"
            value={profile.workHours}
            onChangeText={(text) => setProfile({ ...profile, workHours: text })}
            mode="outlined"
            placeholder="e.g., Mon-Fri: 9:00 AM - 6:00 PM"
            style={styles.input}
            left={<TextInput.Icon icon="clock-outline" />}
            disabled={saving}
          />
        </Card>

        {/* Description and Services */}
        <Card style={styles.sectionCard} mode="elevated">
          <Text style={styles.sectionTitle}>About Your Business</Text>
          
          <TextInput
            label="Description"
            value={profile.description}
            onChangeText={(text) => setProfile({ ...profile, description: text })}
            mode="outlined"
            multiline
            numberOfLines={4}
            placeholder="Tell us about your business..."
            style={styles.textArea}
            disabled={saving}
          />

          <Divider style={styles.divider} />

          <TextInput
            label="Services"
            value={profile.services}
            onChangeText={(text) => setProfile({ ...profile, services: text })}
            mode="outlined"
            multiline
            numberOfLines={4}
            placeholder="List your services or products..."
            style={styles.textArea}
            disabled={saving}
          />
        </Card>

        {/* Save Button */}
        <Button
          mode="contained"
          onPress={handleSave}
          loading={saving}
          disabled={saving}
          style={styles.saveButton}
          contentStyle={styles.saveButtonContent}
          labelStyle={styles.saveButtonLabel}
          buttonColor={colors.primary}
        >
          Save Changes
        </Button>
      </ScrollView>

      <Snackbar
        visible={snackbarVisible}
        onDismiss={() => setSnackbarVisible(false)}
        duration={3000}
        action={{
          label: 'OK',
          onPress: () => setSnackbarVisible(false),
        }}
      >
        {snackbarMessage}
      </Snackbar>
    </View>
  );
}

