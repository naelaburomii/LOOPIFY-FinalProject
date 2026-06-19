import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Image, RefreshControl } from 'react-native';
import { Text, TextInput, Card, Chip, Button, Avatar, Divider } from 'react-native-paper';
import Header from '../../components/Header';
import { useTheme } from '../../contexts/ThemeContext';
import { getColors } from '../../theme/colors';
import { useDrawer } from '../../contexts/DrawerContext';
import { Ionicons } from '@expo/vector-icons';
import { getBusinesses, getBusinessCategories, getBusinessLocations, BusinessFilter } from '../../services/businesses';
import { BusinessProfile } from '../../services/profile';
import { useRouter } from 'expo-router';
import { getCurrentBusinessId } from '../../services/rbac';

export default function BrowseBusinessesScreen() {
  const { openDrawer } = useDrawer();
  const router = useRouter();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const [businesses, setBusinesses] = useState<BusinessProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [selectedLocation, setSelectedLocation] = useState<string>('');
  const [categories, setCategories] = useState<string[]>([]);
  const [locations, setLocations] = useState<string[]>([]);

  useEffect(() => {
    loadCategoriesAndLocations();
    loadBusinesses();
  }, []);

  useEffect(() => {
    // Debounce search
    const timer = setTimeout(() => {
      loadBusinesses();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery, selectedCategory, selectedLocation]);

  const loadCategoriesAndLocations = async () => {
    try {
      const [cats, locs] = await Promise.all([
        getBusinessCategories(),
        getBusinessLocations(),
      ]);
      setCategories(cats);
      setLocations(locs);
    } catch (error) {
      console.error('Error loading categories/locations:', error);
    }
  };

  const loadBusinesses = async () => {
    try {
      setLoading(true);
      const filters: BusinessFilter = {
        businessType: selectedCategory || undefined,
        location: selectedLocation || undefined,
        searchQuery: searchQuery || undefined,
      };
      const data = await getBusinesses(filters);
      
      const myBusinessId = await getCurrentBusinessId();
      const filteredData = myBusinessId
        ? data.filter((business) => business.uid !== myBusinessId)
        : data;
      
      setBusinesses(filteredData);
    } catch (error: any) {
      console.error('Error loading businesses:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    setRefreshing(true);
    loadBusinesses();
  };

  const clearFilters = () => {
    setSelectedCategory('');
    setSelectedLocation('');
    setSearchQuery('');
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
      paddingBottom: 100, // Space for bottom nav
    },
    searchContainer: {
      marginBottom: 20,
    },
    searchInput: {
      backgroundColor: colors.surface,
      marginBottom: 16,
    },
    filtersContainer: {
      marginBottom: 20,
    },
    filtersTitle: {
      fontSize: 16,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 12,
    },
    chipsContainer: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      marginBottom: 16,
    },
    chip: {
      marginRight: 8,
      marginBottom: 8,
    },
    clearFiltersButton: {
      marginTop: 8,
    },
    resultsHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 16,
    },
    resultsCount: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    businessCard: {
      backgroundColor: colors.surface,
      borderRadius: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: colors.border,
    },
    businessCardWrapper: {
      borderRadius: 16,
    },
    businessCoverContainer: {
      width: '100%',
      height: 140,
      position: 'relative',
      backgroundColor: colors.surfaceVariant,
    },
    businessCoverImage: {
      width: '100%',
      height: '100%',
    },
    businessCoverPlaceholder: {
      width: '100%',
      height: '100%',
      backgroundColor: colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
    },
    businessCardContent: {
      padding: 16,
      paddingTop: 50,
    },
    businessHeader: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      marginBottom: 12,
    },
    businessLogo: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.surface,
      borderWidth: 4,
      borderColor: colors.surface,
      position: 'absolute',
      top: 90,
      left: 16,
      zIndex: 10,
    },
    businessLogoPlaceholder: {
      width: 80,
      height: 80,
      borderRadius: 40,
      backgroundColor: colors.surfaceVariant,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 4,
      borderColor: colors.surface,
      position: 'absolute',
      top: 90,
      left: 16,
      zIndex: 10,
    },
    businessInfo: {
      flex: 1,
    },
    businessName: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 4,
    },
    businessType: {
      fontSize: 14,
      color: colors.textSecondary,
    },
    businessDetails: {
      marginTop: 12,
    },
    businessDetailRow: {
      flexDirection: 'row',
      alignItems: 'center',
      marginBottom: 8,
    },
    businessDetailIcon: {
      marginRight: 8,
    },
    businessDetailText: {
      fontSize: 14,
      color: colors.textSecondary,
      flex: 1,
    },
    businessDescription: {
      fontSize: 14,
      color: colors.text,
      marginTop: 8,
      lineHeight: 20,
    },
    emptyState: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 60,
    },
    emptyStateIcon: {
      marginBottom: 16,
    },
    emptyStateText: {
      fontSize: 18,
      fontWeight: '700',
      color: colors.text,
      marginBottom: 8,
    },
    emptyStateSubtext: {
      fontSize: 14,
      color: colors.textSecondary,
      textAlign: 'center',
    },
    loadingContainer: {
      flex: 1,
      justifyContent: 'center',
      alignItems: 'center',
      paddingVertical: 60,
    },
  });

  return (
    <View style={styles.container}>
      <Header title="Browse Businesses" onMenuPress={openDrawer} />
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <TextInput
            placeholder="Search businesses..."
            value={searchQuery}
            onChangeText={setSearchQuery}
            mode="outlined"
            left={<TextInput.Icon icon="magnify" />}
            right={
              searchQuery ? (
                <TextInput.Icon
                  icon="close"
                  onPress={() => setSearchQuery('')}
                />
              ) : undefined
            }
            style={styles.searchInput}
          />
        </View>

        {/* Filters */}
        <View style={styles.filtersContainer}>
          <Text style={styles.filtersTitle}>Filter by:</Text>
          
          {categories.length > 0 && (
            <View style={styles.chipsContainer}>
              <Chip
                selected={selectedCategory === ''}
                onPress={() => setSelectedCategory('')}
                style={styles.chip}
              >
                All Types
              </Chip>
              {categories.map((category) => (
                <Chip
                  key={category}
                  selected={selectedCategory === category}
                  onPress={() =>
                    setSelectedCategory(selectedCategory === category ? '' : category)
                  }
                  style={styles.chip}
                >
                  {category}
                </Chip>
              ))}
            </View>
          )}

          {locations.length > 0 && (
            <View style={styles.chipsContainer}>
              <Chip
                selected={selectedLocation === ''}
                onPress={() => setSelectedLocation('')}
                style={styles.chip}
              >
                All Locations
              </Chip>
              {locations.map((location) => (
                <Chip
                  key={location}
                  selected={selectedLocation === location}
                  onPress={() =>
                    setSelectedLocation(selectedLocation === location ? '' : location)
                  }
                  style={styles.chip}
                >
                  {location}
                </Chip>
              ))}
            </View>
          )}

          {(selectedCategory || selectedLocation || searchQuery) && (
            <Button
              mode="text"
              onPress={clearFilters}
              style={styles.clearFiltersButton}
              icon="filter-remove"
            >
              Clear Filters
            </Button>
          )}
        </View>

        {/* Results Header */}
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsCount}>
            {businesses.length} {businesses.length === 1 ? 'business' : 'businesses'} found
          </Text>
        </View>

        {/* Loading State */}
        {loading && businesses.length === 0 && (
          <View style={styles.loadingContainer}>
            <Text style={{ color: colors.textSecondary }}>Loading businesses...</Text>
          </View>
        )}

        {/* Empty State */}
        {!loading && businesses.length === 0 && (
          <View style={styles.emptyState}>
            <Ionicons
              name="storefront-outline"
              size={64}
              color={colors.textLight}
              style={styles.emptyStateIcon}
            />
            <Text style={styles.emptyStateText}>No Businesses Found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery || selectedCategory || selectedLocation
                ? 'Try adjusting your filters or search query'
                : 'No businesses are registered yet'}
            </Text>
          </View>
        )}

        {/* Business List */}
        {businesses.map((business) => (
          <TouchableOpacity
            key={business.uid}
            activeOpacity={0.7}
            onPress={() => {
              router.push({
                pathname: '/(drawer)/business-details',
                params: { businessId: business.uid },
              });
            }}
          >
            <Card style={styles.businessCard} mode="elevated">
              <View style={styles.businessCardWrapper}>
                {/* Cover Image */}
                <View style={styles.businessCoverContainer}>
                {business.coverImageUrl ? (
                  <Image
                    source={{ uri: business.coverImageUrl }}
                    style={styles.businessCoverImage}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.businessCoverPlaceholder}>
                    <Ionicons
                      name="image-outline"
                      size={32}
                      color={colors.textLight}
                    />
                  </View>
                )}
                {/* Logo positioned on top of cover */}
                {business.logoUrl ? (
                  <Image
                    source={{ uri: business.logoUrl }}
                    style={styles.businessLogo}
                    resizeMode="cover"
                  />
                ) : (
                  <View style={styles.businessLogoPlaceholder}>
                    <Ionicons
                      name="storefront"
                      size={36}
                      color={colors.textSecondary}
                    />
                  </View>
                )}
                </View>

                <Card.Content style={styles.businessCardContent}>
              <View style={styles.businessHeader}>
                <View style={[styles.businessInfo, { marginLeft: 96 }]}>
                  <Text style={styles.businessName}>{business.businessName}</Text>
                  {business.businessType && (
                    <Text style={styles.businessType}>{business.businessType}</Text>
                  )}
                </View>
              </View>

              <Divider style={{ marginVertical: 12, backgroundColor: colors.divider }} />

              <View style={styles.businessDetails}>
                {business.location && (
                  <View style={styles.businessDetailRow}>
                    <Ionicons
                      name="location"
                      size={18}
                      color={colors.textSecondary}
                      style={styles.businessDetailIcon}
                    />
                    <Text style={styles.businessDetailText}>{business.location}</Text>
                  </View>
                )}

                {business.phoneNumber && (
                  <View style={styles.businessDetailRow}>
                    <Ionicons
                      name="call"
                      size={18}
                      color={colors.textSecondary}
                      style={styles.businessDetailIcon}
                    />
                    <Text style={styles.businessDetailText}>{business.phoneNumber}</Text>
                  </View>
                )}

                {business.workHours && (
                  <View style={styles.businessDetailRow}>
                    <Ionicons
                      name="time-outline"
                      size={18}
                      color={colors.textSecondary}
                      style={styles.businessDetailIcon}
                    />
                    <Text style={styles.businessDetailText}>{business.workHours}</Text>
                  </View>
                )}

                {business.description && (
                  <Text style={styles.businessDescription} numberOfLines={2}>
                    {business.description}
                  </Text>
                )}
              </View>
              </Card.Content>
              </View>
            </Card>
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

