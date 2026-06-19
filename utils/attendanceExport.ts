import { Platform } from 'react-native';
import { cacheDirectory, writeAsStringAsync, EncodingType } from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import * as XLSX from 'xlsx';
import { WorkerAttendanceSummary } from '../services/attendance';
import { calculateSalary } from '../utils/attendanceHours';

function buildWorkbookRows(summaries: WorkerAttendanceSummary[]) {
  const detailRows: Array<Record<string, string | number>> = [];
  const summaryRows: Array<Record<string, string | number>> = [];

  summaries.forEach((worker) => {
    let totalHours = 0;
    let totalSalary = 0;

    worker.monthlyBreakdown.forEach((month) => {
      const salary = calculateSalary(month.hours, worker.hourlySalary);
      totalHours += month.hours;
      totalSalary += salary;
      detailRows.push({
        Worker: worker.employeeName,
        Email: worker.email,
        'Hourly salary (₪)': worker.hourlySalary,
        Month: month.label,
        Hours: Number(month.hours.toFixed(2)),
        'Salary (₪)': salary,
      });
    });

    if (worker.monthlyBreakdown.length === 0) {
      detailRows.push({
        Worker: worker.employeeName,
        Email: worker.email,
        'Hourly salary (₪)': worker.hourlySalary,
        Month: '—',
        Hours: 0,
        'Salary (₪)': 0,
      });
    }

    summaryRows.push({
      Worker: worker.employeeName,
      Email: worker.email,
      'Hourly salary (₪)': worker.hourlySalary,
      'Total hours': Number(totalHours.toFixed(2)),
      'Total salary (₪)': Number(totalSalary.toFixed(2)),
    });
  });

  return { detailRows, summaryRows };
}

export async function downloadAttendanceExcel(
  summaries: WorkerAttendanceSummary[],
  fileLabel = 'attendance-payroll'
): Promise<void> {
  const { detailRows, summaryRows } = buildWorkbookRows(summaries);
  const workbook = XLSX.utils.book_new();
  const summarySheet = XLSX.utils.json_to_sheet(summaryRows);
  const detailSheet = XLSX.utils.json_to_sheet(detailRows);
  XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');
  XLSX.utils.book_append_sheet(workbook, detailSheet, 'Monthly detail');

  const fileName = `${fileLabel}-${new Date().toISOString().slice(0, 10)}.xlsx`;

  if (Platform.OS === 'web') {
    XLSX.writeFile(workbook, fileName);
    return;
  }

  const base64 = XLSX.write(workbook, { bookType: 'xlsx', type: 'base64' });
  const uri = `${cacheDirectory}${fileName}`;
  await writeAsStringAsync(uri, base64, {
    encoding: EncodingType.Base64,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(uri, {
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      dialogTitle: 'Export attendance payroll',
      UTI: 'com.microsoft.excel.xlsx',
    });
    return;
  }

  throw new Error('Sharing is not available on this device.');
}
