import React, { useCallback, useState } from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View,
} from 'react-native';
import { Button, Card, Divider, IconButton, Text, TextInput } from 'react-native-paper';
import Header from '../../components/Header';
import { useDrawer } from '../../contexts/DrawerContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getColors } from '../../theme/colors';
import { useFocusEffect } from 'expo-router';
import {
  AttendanceEntry,
  buildWorkerAttendanceSummaries,
  calculateEntryHours,
  clockIn,
  clockOut,
  getMonthlySummaryHours,
  getMyAttendance,
  WorkerAttendanceSummary,
} from '../../services/attendance';
import { canReviewTeamRequests, getCurrentUserRoleProfile } from '../../services/rbac';
import { updateTeamUserHourlySalary } from '../../services/teamUsers';
import { calculateSalary } from '../../utils/attendanceHours';
import { downloadAttendanceExcel } from '../../utils/attendanceExport';

export default function AttendanceScreen() {
  const { openDrawer } = useDrawer();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const [isManagerView, setIsManagerView] = useState(false);
  const [entries, setEntries] = useState<AttendanceEntry[]>([]);
  const [workerSummaries, setWorkerSummaries] = useState<WorkerAttendanceSummary[]>([]);
  const [monthlyHours, setMonthlyHours] = useState(0);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [exportLoading, setExportLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedWorker, setSelectedWorker] = useState<WorkerAttendanceSummary | null>(null);
  const [salaryInput, setSalaryInput] = useState('');
  const [savingSalary, setSavingSalary] = useState(false);

  const load = useCallback(async () => {
    try {
      setError('');
      setLoading(true);
      const profile = await getCurrentUserRoleProfile();
      const managerView = canReviewTeamRequests(profile);
      setIsManagerView(managerView);

      if (managerView) {
        const summaries = await buildWorkerAttendanceSummaries();
        setWorkerSummaries(summaries);
        setEntries([]);
        setMonthlyHours(0);
      } else {
        const [attendance, hours] = await Promise.all([getMyAttendance(), getMonthlySummaryHours()]);
        setEntries(attendance);
        setMonthlyHours(hours);
        setWorkerSummaries([]);
      }
    } catch (err: any) {
      setError(err?.message || 'Failed to load attendance');
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const activeEntry = entries.find((entry) => entry.status === 'clocked_in' && !entry.clockOutAt);

  const handleClockIn = async () => {
    setActionLoading(true);
    try {
      await clockIn();
      await load();
    } catch (err: any) {
      setError(err?.message || 'Could not clock in');
    } finally {
      setActionLoading(false);
    }
  };

  const handleClockOut = async () => {
    if (!activeEntry) return;
    setActionLoading(true);
    try {
      await clockOut(activeEntry.id);
      await load();
    } catch (err: any) {
      setError(err?.message || 'Could not clock out');
    } finally {
      setActionLoading(false);
    }
  };

  const openWorkerDetail = (worker: WorkerAttendanceSummary) => {
    setSelectedWorker(worker);
    setSalaryInput(String(worker.hourlySalary || 0));
  };

  const handleSaveSalary = async () => {
    if (!selectedWorker) return;
    const hourlySalary = Number(salaryInput);
    if (Number.isNaN(hourlySalary) || hourlySalary < 0) {
      setError('Enter a valid hourly salary.');
      return;
    }
    setSavingSalary(true);
    setError('');
    try {
      await updateTeamUserHourlySalary(selectedWorker.employeeId, hourlySalary);
      const summaries = await buildWorkerAttendanceSummaries();
      setWorkerSummaries(summaries);
      const updated = summaries.find((worker) => worker.employeeId === selectedWorker.employeeId);
      if (updated) {
        setSelectedWorker(updated);
        setSalaryInput(String(updated.hourlySalary || 0));
      }
    } catch (err: any) {
      setError(err?.message || 'Could not save hourly salary');
    } finally {
      setSavingSalary(false);
    }
  };

  const handleExport = async () => {
    setExportLoading(true);
    setError('');
    try {
      const summaries =
        workerSummaries.length > 0 ? workerSummaries : await buildWorkerAttendanceSummaries();
      await downloadAttendanceExcel(summaries);
    } catch (err: any) {
      setError(err?.message || 'Could not export Excel file');
    } finally {
      setExportLoading(false);
    }
  };

  const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    content: { padding: 16, gap: 12, paddingBottom: 96 },
    workerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    statBox: {
      marginTop: 8,
      padding: 12,
      borderRadius: 10,
      backgroundColor: isDark ? colors.surfaceVariant : colors.backgroundAlt,
    },
    tableHeader: {
      flexDirection: 'row',
      paddingVertical: 10,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    tableRow: {
      flexDirection: 'row',
      paddingVertical: 12,
      paddingHorizontal: 4,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    colMonth: { flex: 1.2 },
    colHours: { width: 72, textAlign: 'right' as const },
    colSalary: { width: 96, textAlign: 'right' as const },
    modalRoot: {
      flex: 1,
      justifyContent: 'flex-end',
      backgroundColor: 'rgba(0,0,0,0.5)',
    },
    modalSheet: {
      backgroundColor: colors.surface,
      borderTopLeftRadius: 16,
      borderTopRightRadius: 16,
      maxHeight: '92%',
      paddingBottom: 24,
    },
    modalHeader: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 8,
    },
    modalBody: { paddingHorizontal: 20, paddingTop: 8 },
  });

  return (
    <View style={styles.container}>
      <Header title="Attendance" onMenuPress={openDrawer} />
      <ScrollView contentContainerStyle={styles.content}>
        {!!error && (
          <Card>
            <Card.Content>
              <Text variant="bodyMedium" style={{ color: colors.error }}>
                {error}
              </Text>
            </Card.Content>
          </Card>
        )}

        {isManagerView ? (
          <>
            <Card>
              <Card.Content>
                <Text variant="titleMedium">Team attendance</Text>
                <Text variant="bodySmall" style={{ color: colors.textSecondary, marginTop: 4, marginBottom: 12 }}>
                  Tap a worker to see monthly hours and manage hourly salary.
                </Text>
                <Button
                  mode="contained"
                  icon="file-download-outline"
                  loading={exportLoading}
                  disabled={exportLoading || loading}
                  onPress={handleExport}
                >
                  Download Excel (all workers)
                </Button>
              </Card.Content>
            </Card>

            {loading && (
              <Card>
                <Card.Content>
                  <Text style={{ color: colors.textSecondary }}>Loading team attendance…</Text>
                </Card.Content>
              </Card>
            )}

            {!loading && workerSummaries.length === 0 && (
              <Card>
                <Card.Content>
                  <Text style={{ color: colors.textSecondary }}>
                    No employee accounts yet. Add workers in Team Users, then their attendance will
                    appear here.
                  </Text>
                </Card.Content>
              </Card>
            )}

            {workerSummaries.map((worker) => (
              <TouchableOpacity key={worker.employeeId} activeOpacity={0.85} onPress={() => openWorkerDetail(worker)}>
                <Card>
                  <Card.Content>
                    <View style={styles.workerRow}>
                      <View style={{ flex: 1 }}>
                        <Text variant="titleMedium">{worker.employeeName}</Text>
                        <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                          {worker.email}
                        </Text>
                      </View>
                      <Text variant="bodySmall" style={{ color: colors.primary }}>
                        View
                      </Text>
                    </View>
                    <View style={styles.statBox}>
                      <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                        This month
                      </Text>
                      <Text variant="titleLarge" style={{ color: colors.primary }}>
                        {worker.currentMonthHours.toFixed(1)} h
                      </Text>
                      <Text variant="bodyMedium" style={{ marginTop: 4 }}>
                        Salary: ₪{worker.currentMonthSalary.toFixed(2)}
                        {worker.hourlySalary > 0 ? ` (₪${worker.hourlySalary.toFixed(2)}/h)` : ' — set hourly rate'}
                      </Text>
                    </View>
                  </Card.Content>
                </Card>
              </TouchableOpacity>
            ))}
          </>
        ) : (
          <>
            <Card>
              <Card.Content>
                <Text variant="titleLarge">Monthly Hours</Text>
                <Text variant="headlineMedium" style={{ color: colors.primary, marginTop: 8 }}>
                  {monthlyHours.toFixed(1)} h
                </Text>
              </Card.Content>
            </Card>
            <Card>
              <Card.Content>
                <Text variant="titleMedium" style={{ marginBottom: 12 }}>
                  Time Clock
                </Text>
                {activeEntry ? (
                  <Button mode="contained" loading={actionLoading} onPress={handleClockOut}>
                    Clock Out
                  </Button>
                ) : (
                  <Button mode="contained" loading={actionLoading} onPress={handleClockIn}>
                    Clock In
                  </Button>
                )}
              </Card.Content>
            </Card>
            {entries.slice(0, 10).map((entry) => (
              <Card key={entry.id}>
                <Card.Content>
                  <Text variant="bodyLarge">{new Date(entry.clockInAt).toLocaleString()}</Text>
                  <Text variant="bodySmall">
                    {entry.clockOutAt
                      ? `${calculateEntryHours(entry).toFixed(2)} h — Status: ${entry.status}`
                      : `Status: ${entry.status}`}
                  </Text>
                </Card.Content>
              </Card>
            ))}
          </>
        )}
      </ScrollView>

      <Modal
        visible={!!selectedWorker}
        animationType="slide"
        transparent
        onRequestClose={() => setSelectedWorker(null)}
      >
        <View style={styles.modalRoot}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text variant="titleLarge" style={{ flex: 1, paddingLeft: 12 }}>
                {selectedWorker?.employeeName}
              </Text>
              <IconButton icon="close" onPress={() => setSelectedWorker(null)} />
            </View>
            {selectedWorker && (
              <ScrollView style={styles.modalBody} keyboardShouldPersistTaps="handled">
                <Text variant="bodySmall" style={{ color: colors.textSecondary, marginBottom: 12 }}>
                  {selectedWorker.email}
                </Text>

                <Text variant="titleSmall" style={{ marginBottom: 8 }}>
                  Hourly salary (₪)
                </Text>
                <TextInput
                  mode="outlined"
                  value={salaryInput}
                  onChangeText={setSalaryInput}
                  keyboardType="decimal-pad"
                  style={{ marginBottom: 8 }}
                />
                <Button
                  mode="contained-tonal"
                  loading={savingSalary}
                  disabled={savingSalary}
                  onPress={handleSaveSalary}
                  style={{ marginBottom: 16 }}
                >
                  Save hourly salary
                </Button>

                <Divider style={{ marginBottom: 12 }} />

                <Text variant="titleSmall" style={{ marginBottom: 8 }}>
                  Monthly hours & salary
                </Text>
                <View style={styles.tableHeader}>
                  <Text style={[styles.colMonth, { fontWeight: '700', color: colors.textSecondary }]}>
                    Month
                  </Text>
                  <Text style={[styles.colHours, { fontWeight: '700', color: colors.textSecondary }]}>
                    Hours
                  </Text>
                  <Text style={[styles.colSalary, { fontWeight: '700', color: colors.textSecondary }]}>
                    Salary
                  </Text>
                </View>
                {selectedWorker.monthlyBreakdown.length === 0 ? (
                  <Text style={{ color: colors.textSecondary, marginTop: 12 }}>
                    No completed shifts recorded yet.
                  </Text>
                ) : (
                  selectedWorker.monthlyBreakdown.map((month) => (
                    <View key={month.key} style={styles.tableRow}>
                      <Text style={styles.colMonth}>{month.label}</Text>
                      <Text style={styles.colHours}>{month.hours.toFixed(1)}</Text>
                      <Text style={styles.colSalary}>
                        ₪{calculateSalary(month.hours, selectedWorker.hourlySalary).toFixed(2)}
                      </Text>
                    </View>
                  ))
                )}

                <Text variant="titleSmall" style={{ marginTop: 20, marginBottom: 8 }}>
                  Recent shifts
                </Text>
                {selectedWorker.entries.slice(0, 8).map((entry) => (
                  <View key={entry.id} style={{ marginBottom: 10 }}>
                    <Text variant="bodyMedium">{entry.clockInAt.toLocaleString()}</Text>
                    <Text variant="bodySmall" style={{ color: colors.textSecondary }}>
                      {entry.clockOutAt
                        ? `${calculateEntryHours(entry).toFixed(2)} h — ${entry.status}`
                        : `In progress — ${entry.status}`}
                    </Text>
                  </View>
                ))}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
}
