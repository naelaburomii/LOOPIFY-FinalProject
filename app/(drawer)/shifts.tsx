import React, { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { Button, Card, Text, TextInput } from 'react-native-paper';
import Header from '../../components/Header';
import { useDrawer } from '../../contexts/DrawerContext';
import { useTheme } from '../../contexts/ThemeContext';
import { getColors } from '../../theme/colors';
import { createShift, getAllShifts, getMyShifts } from '../../services/shifts';
import { getCurrentUserRoleProfile } from '../../services/rbac';

export default function ShiftsScreen() {
  const { openDrawer } = useDrawer();
  const { isDark } = useTheme();
  const colors = getColors(isDark);
  const [role, setRole] = useState('employee');
  const [shifts, setShifts] = useState<any[]>([]);
  const [employeeId, setEmployeeId] = useState('');
  const [employeeName, setEmployeeName] = useState('');
  const [startAt, setStartAt] = useState('');
  const [endAt, setEndAt] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      setError('');
      const profile = await getCurrentUserRoleProfile();
      setRole(profile.role);
      const data = profile.role === 'manager' ? await getAllShifts() : await getMyShifts();
      setShifts(data);
    } catch (err: any) {
      const message = err?.message || 'Failed to load shifts';
      setError(message);
      Alert.alert('Shifts unavailable', message);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    await createShift({
      employeeId: employeeId.trim(),
      employeeName: employeeName.trim() || 'Employee',
      role: 'employee',
      startAt: new Date(startAt),
      endAt: new Date(endAt),
    });
    setEmployeeId('');
    setEmployeeName('');
    setStartAt('');
    setEndAt('');
    await load();
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <Header title="Shifts" onMenuPress={openDrawer} />
      <ScrollView contentContainerStyle={styles.content}>
        {!!error && (
          <Card>
            <Card.Content>
              <Text variant="bodyMedium" style={{ color: colors.error }}>{error}</Text>
            </Card.Content>
          </Card>
        )}
        {role === 'manager' && (
          <Card>
            <Card.Content>
              <Text variant="titleMedium" style={{ marginBottom: 12 }}>Create Shift</Text>
              <TextInput label="Employee User ID" value={employeeId} onChangeText={setEmployeeId} mode="outlined" style={styles.input} />
              <TextInput label="Employee Name" value={employeeName} onChangeText={setEmployeeName} mode="outlined" style={styles.input} />
              <TextInput label="Start DateTime (YYYY-MM-DD HH:mm)" value={startAt} onChangeText={setStartAt} mode="outlined" style={styles.input} />
              <TextInput label="End DateTime (YYYY-MM-DD HH:mm)" value={endAt} onChangeText={setEndAt} mode="outlined" style={styles.input} />
              <Button mode="contained" onPress={handleCreate}>Publish Shift</Button>
            </Card.Content>
          </Card>
        )}
        {shifts.map((shift) => (
          <Card key={shift.id}>
            <Card.Content>
              <Text variant="titleSmall">{shift.employeeName}</Text>
              <Text variant="bodyMedium">{new Date(shift.startAt).toLocaleString()} - {new Date(shift.endAt).toLocaleString()}</Text>
              <Text variant="bodySmall">Status: {shift.status}</Text>
            </Card.Content>
          </Card>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  content: { padding: 16, gap: 12, paddingBottom: 96 },
  input: { marginBottom: 8 },
});
