import React, { useCallback, useState } from 'react';
import { ScrollView, View } from 'react-native';
import { Button, Card, Chip, SegmentedButtons, Text, TextInput } from 'react-native-paper';
import Header from '../../components/Header';
import { useDrawer } from '../../contexts/DrawerContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getColors } from '../../theme/colors';
import {
  EmployeeRequest,
  getAllRequests,
  getMyRequests,
  reviewRequest,
  submitRequest,
} from '../../services/requests';
import { canReviewTeamRequests, getCurrentUserRoleProfile } from '../../services/rbac';
import { useFocusEffect } from 'expo-router';

const REQUEST_TYPE_LABELS: Record<EmployeeRequest['type'], string> = {
  leave: 'Leave',
  shift_change: 'Shift change',
  other: 'Other',
};

function statusColor(
  status: EmployeeRequest['status'],
  colors: ReturnType<typeof getColors>
): string {
  if (status === 'approved') return colors.success;
  if (status === 'rejected') return colors.error;
  return colors.warning;
}

export default function RequestsScreen() {
  const { openDrawer } = useDrawer();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const [isManagerView, setIsManagerView] = useState(false);
  const [items, setItems] = useState<EmployeeRequest[]>([]);
  const [type, setType] = useState('leave');
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [filter, setFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');

  const load = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      const profile = await getCurrentUserRoleProfile();
      const managerView = canReviewTeamRequests(profile);
      setIsManagerView(managerView);
      setItems(managerView ? await getAllRequests() : await getMyRequests());
    } catch (err: any) {
      setError(err?.message || 'Failed to load requests');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const filteredItems =
    filter === 'all' ? items : items.filter((req) => req.status === filter);

  const pendingCount = items.filter((req) => req.status === 'pending').length;

  const handleSubmit = async () => {
    const trimmed = reason.trim();
    if (!trimmed) {
      setError('Please enter a reason for your request.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await submitRequest(type as EmployeeRequest['type'], trimmed);
      setReason('');
      await load();
    } catch (err: any) {
      setError(err?.message || 'Failed to submit request');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Requests" onMenuPress={openDrawer} />
      <ScrollView contentContainerStyle={{ padding: 16, gap: 12, paddingBottom: 96 }}>
        {!!error && (
          <Card>
            <Card.Content>
              <Text variant="bodyMedium" style={{ color: colors.error }}>
                {error}
              </Text>
            </Card.Content>
          </Card>
        )}

        {isManagerView && (
          <Card>
            <Card.Content>
              <Text variant="titleMedium" style={{ marginBottom: 4 }}>
                Team requests
              </Text>
              <Text variant="bodySmall" style={{ color: colors.textSecondary, marginBottom: 12 }}>
                Review leave, shift change, and other requests from your employees.
                {pendingCount > 0 ? ` ${pendingCount} pending.` : ''}
              </Text>
              <SegmentedButtons
                value={filter}
                onValueChange={(value) => setFilter(value as typeof filter)}
                buttons={[
                  { value: 'all', label: 'All' },
                  { value: 'pending', label: 'Pending' },
                  { value: 'approved', label: 'Approved' },
                  { value: 'rejected', label: 'Rejected' },
                ]}
              />
            </Card.Content>
          </Card>
        )}

        {!isManagerView && (
          <Card>
            <Card.Content>
              <Text variant="titleMedium" style={{ marginBottom: 8 }}>
                Submit Request
              </Text>
              <SegmentedButtons
                value={type}
                onValueChange={setType}
                buttons={[
                  { value: 'leave', label: 'Leave' },
                  { value: 'shift_change', label: 'Shift Change' },
                  { value: 'other', label: 'Other' },
                ]}
              />
              <TextInput
                mode="outlined"
                label="Reason"
                multiline
                value={reason}
                onChangeText={setReason}
                style={{ marginVertical: 8 }}
              />
              <Button mode="contained" loading={submitting} disabled={submitting} onPress={handleSubmit}>
                Submit
              </Button>
            </Card.Content>
          </Card>
        )}

        {loading && (
          <Card>
            <Card.Content>
              <Text style={{ color: colors.textSecondary }}>Loading requests…</Text>
            </Card.Content>
          </Card>
        )}

        {!loading && filteredItems.length === 0 && (
          <Card>
            <Card.Content>
              <Text style={{ color: colors.textSecondary }}>
                {isManagerView
                  ? filter === 'all'
                    ? 'No team requests yet. Requests from employees will appear here.'
                    : `No ${filter} requests.`
                  : 'No requests yet. Submit one above.'}
              </Text>
            </Card.Content>
          </Card>
        )}

        {filteredItems.map((req) => (
          <Card key={req.id}>
            <Card.Content>
              <View
                style={{
                  flexDirection: 'row',
                  alignItems: 'flex-start',
                  justifyContent: 'space-between',
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <Text variant="titleSmall" style={{ flex: 1, color: colors.text }}>
                  {req.employeeName} — {REQUEST_TYPE_LABELS[req.type] || req.type}
                </Text>
                <Chip
                  compact
                  textStyle={{ fontSize: 11, color: statusColor(req.status, colors) }}
                  style={{ backgroundColor: `${statusColor(req.status, colors)}22` }}
                >
                  {req.status}
                </Chip>
              </View>
              <Text variant="bodyMedium" style={{ color: colors.text, lineHeight: 22 }}>
                {req.reason}
              </Text>
              <Text variant="bodySmall" style={{ color: colors.textSecondary, marginTop: 8 }}>
                Submitted {req.createdAt.toLocaleString()}
              </Text>
              {isManagerView && req.status === 'pending' && (
                <View style={{ flexDirection: 'row', gap: 8, marginTop: 12 }}>
                  <Button
                    mode="contained"
                    style={{ flex: 1 }}
                    onPress={async () => {
                      await reviewRequest(req.id, 'approved');
                      await load();
                    }}
                  >
                    Approve
                  </Button>
                  <Button
                    mode="outlined"
                    style={{ flex: 1 }}
                    onPress={async () => {
                      await reviewRequest(req.id, 'rejected');
                      await load();
                    }}
                  >
                    Reject
                  </Button>
                </View>
              )}
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}
