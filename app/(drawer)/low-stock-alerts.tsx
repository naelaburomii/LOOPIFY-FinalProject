import React, { useCallback, useState } from 'react';
import { ActivityIndicator, ScrollView, View } from 'react-native';
import { Button, Card, Text } from 'react-native-paper';
import Header from '../../components/Header';
import { useDrawer } from '../../contexts/DrawerContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getColors } from '../../theme/colors';
import { acknowledgeAlert, getMyLowStockAlerts, type LowStockAlert } from '../../services/alerts';
import { useFocusEffect } from 'expo-router';

export default function LowStockAlertsScreen() {
  const { openDrawer } = useDrawer();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const [alerts, setAlerts] = useState<LowStockAlert[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setError(null);
    setLoading(true);
    try {
      const data = await getMyLowStockAlerts();
      setAlerts(data);
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Could not load alerts';
      setError(message);
      setAlerts([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Low Stock Alerts" onMenuPress={openDrawer} />
      {loading ? (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 }}>
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      ) : (
        <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 96 }}>
          {error && (
            <Card style={{ backgroundColor: colors.surface, borderColor: colors.error, borderWidth: 1 }}>
              <Card.Content>
                <Text variant="titleSmall" style={{ color: colors.error }}>
                  {error}
                </Text>
                <Button mode="contained-tonal" style={{ marginTop: 12 }} onPress={load}>
                  Retry
                </Button>
              </Card.Content>
            </Card>
          )}
          {alerts.map((alert) => (
            <Card key={alert.id} style={{ backgroundColor: colors.surface }}>
              <Card.Content>
                <Text variant="titleSmall">{alert.productName}</Text>
                <Text variant="bodyMedium">
                  Current: {alert.currentQty} | Reorder: {alert.reorderPoint}
                </Text>
                <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                  Status: {alert.status}
                </Text>
                {alert.status === 'open' && (
                  <Button
                    mode="text"
                    onPress={async () => {
                      await acknowledgeAlert(alert.id);
                      await load();
                    }}
                  >
                    Acknowledge
                  </Button>
                )}
              </Card.Content>
            </Card>
          ))}
          {!error && alerts.length === 0 && (
            <Text style={{ color: colors.textSecondary }}>No low stock alerts yet.</Text>
          )}
        </ScrollView>
      )}
    </View>
  );
}
