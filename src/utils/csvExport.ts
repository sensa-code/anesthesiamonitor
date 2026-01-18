import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { Platform } from 'react-native';
import { AnesthesiaSession, VitalRecord } from '../types';

const SPECIES_LABELS: Record<string, string> = {
  dog: '犬',
  cat: '貓',
  other: '其他',
};

function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

function escapeCSV(value: string | number): string {
  const str = String(value);
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function generateCSV(session: AnesthesiaSession): string {
  const lines: string[] = [];

  // Patient info header
  lines.push('病患資料');
  lines.push(`病患名稱,${escapeCSV(session.patientInfo.patientName)}`);
  lines.push(`病例編號,${escapeCSV(session.patientInfo.caseNumber)}`);
  lines.push(`體重 (kg),${session.patientInfo.weight}`);
  lines.push(`動物種別,${SPECIES_LABELS[session.patientInfo.species]}`);
  lines.push(`開始時間,${formatTimestamp(session.startTime)}`);
  if (session.endTime) {
    lines.push(`結束時間,${formatTimestamp(session.endTime)}`);
  }
  lines.push('');

  // Vital records header
  lines.push('生理數值記錄');
  lines.push(
    '時間,收縮壓 (mmHg),舒張壓 (mmHg),心跳 (bpm),呼吸 (次/分),血氧 SpO2 (%),麻醉濃度 (%),體溫 (°C),備註'
  );

  // Vital records data
  const formatValue = (value: number | null): string => {
    return value !== null ? String(value) : '';
  };

  session.records.forEach((record: VitalRecord) => {
    lines.push(
      [
        formatTimestamp(record.timestamp),
        formatValue(record.systolicBP),
        formatValue(record.diastolicBP),
        formatValue(record.heartRate),
        formatValue(record.respiratoryRate),
        formatValue(record.spO2),
        formatValue(record.anesthesiaConc),
        formatValue(record.temperature),
        escapeCSV(record.notes || ''),
      ].join(',')
    );
  });

  return lines.join('\n');
}

function generateSVGChart(
  records: VitalRecord[],
  dataKey: keyof VitalRecord,
  title: string,
  color: string,
  unit: string
): string {
  // 過濾掉該欄位為空值的記錄
  const validRecords = records.filter(r => {
    const value = r[dataKey];
    return value !== null && value !== undefined;
  });

  if (validRecords.length === 0) return '';

  const values = validRecords.map(r => Number(r[dataKey]) || 0);
  const minVal = Math.min(...values);
  const maxVal = Math.max(...values);
  const range = maxVal - minVal || 1;

  const width = 600;
  const height = 150;
  const padding = 40;
  const chartWidth = width - padding * 2;
  const chartHeight = height - padding * 2;

  const points = values.map((v, i) => {
    const x = padding + (i / (values.length - 1 || 1)) * chartWidth;
    const y = padding + chartHeight - ((v - minVal) / range) * chartHeight;
    return `${x},${y}`;
  }).join(' ');

  const timeLabels = validRecords.map((r, i) => {
    if (validRecords.length <= 6 || i % Math.ceil(validRecords.length / 6) === 0) {
      const date = new Date(r.timestamp);
      return { x: padding + (i / (validRecords.length - 1 || 1)) * chartWidth, label: `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}` };
    }
    return null;
  }).filter(Boolean);

  return `
    <div class="chart-container">
      <h3>${title} (${unit})</h3>
      <svg width="${width}" height="${height}" style="border: 1px solid #ddd; background: #fff;">
        <line x1="${padding}" y1="${padding}" x2="${padding}" y2="${height - padding}" stroke="#ccc" />
        <line x1="${padding}" y1="${height - padding}" x2="${width - padding}" y2="${height - padding}" stroke="#ccc" />
        <text x="10" y="${padding + 5}" font-size="10" fill="#666">${maxVal.toFixed(1)}</text>
        <text x="10" y="${height - padding}" font-size="10" fill="#666">${minVal.toFixed(1)}</text>
        <polyline points="${points}" fill="none" stroke="${color}" stroke-width="2" />
        ${values.map((v, i) => {
          const x = padding + (i / (values.length - 1 || 1)) * chartWidth;
          const y = padding + chartHeight - ((v - minVal) / range) * chartHeight;
          return `<circle cx="${x}" cy="${y}" r="3" fill="${color}" />`;
        }).join('')}
        ${timeLabels.map((t: any) => `<text x="${t.x}" y="${height - 10}" font-size="9" fill="#666" text-anchor="middle">${t.label}</text>`).join('')}
      </svg>
    </div>
  `;
}

function exportPDFWeb(session: AnesthesiaSession): void {
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-TW');
  };

  const charts = session.records.length > 0 ? `
    <h2>生理數值趨勢圖</h2>
    <div class="charts-grid">
      ${generateSVGChart(session.records, 'systolicBP', '收縮壓', '#e53935', 'mmHg')}
      ${generateSVGChart(session.records, 'heartRate', '心跳', '#d81b60', 'bpm')}
      ${generateSVGChart(session.records, 'respiratoryRate', '呼吸', '#8e24aa', '次/分')}
      ${generateSVGChart(session.records, 'spO2', '血氧 SpO2', '#1e88e5', '%')}
      ${generateSVGChart(session.records, 'anesthesiaConc', '麻醉濃度', '#43a047', '%')}
      ${generateSVGChart(session.records, 'temperature', '體溫', '#fb8c00', '°C')}
    </div>
  ` : '';

  const html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <title>麻醉記錄 - ${session.patientInfo.patientName}</title>
      <style>
        body { font-family: Arial, sans-serif; padding: 20px; }
        h1 { color: #2196F3; border-bottom: 2px solid #2196F3; padding-bottom: 10px; }
        h2 { color: #333; margin-top: 30px; }
        h3 { color: #666; font-size: 14px; margin: 10px 0 5px 0; }
        .info-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
        .info-table td { padding: 8px; border-bottom: 1px solid #ddd; }
        .info-table td:first-child { font-weight: bold; width: 120px; color: #666; }
        .data-table { width: 100%; border-collapse: collapse; font-size: 12px; }
        .data-table th, .data-table td { border: 1px solid #ddd; padding: 6px; text-align: center; }
        .data-table th { background-color: #2196F3; color: white; }
        .data-table tr:nth-child(even) { background-color: #f9f9f9; }
        .data-table .notes { text-align: left; max-width: 150px; font-size: 11px; }
        .charts-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .chart-container { page-break-inside: avoid; }
        @media print {
          body { print-color-adjust: exact; -webkit-print-color-adjust: exact; }
          .charts-grid { grid-template-columns: 1fr 1fr; }
        }
      </style>
    </head>
    <body>
      <h1>獸醫麻醉監測記錄</h1>

      <h2>病患資料</h2>
      <table class="info-table">
        <tr><td>病患名稱</td><td>${session.patientInfo.patientName}</td></tr>
        <tr><td>病例編號</td><td>${session.patientInfo.caseNumber}</td></tr>
        <tr><td>動物種別</td><td>${SPECIES_LABELS[session.patientInfo.species]}</td></tr>
        <tr><td>體重</td><td>${session.patientInfo.weight} kg</td></tr>
        <tr><td>開始時間</td><td>${formatTime(session.startTime)}</td></tr>
        ${session.endTime ? `<tr><td>結束時間</td><td>${formatTime(session.endTime)}</td></tr>` : ''}
      </table>

      ${charts}

      <h2>生理數值記錄</h2>
      <table class="data-table">
        <thead>
          <tr>
            <th>時間</th>
            <th>收縮壓<br>(mmHg)</th>
            <th>舒張壓<br>(mmHg)</th>
            <th>心跳<br>(bpm)</th>
            <th>呼吸<br>(次/分)</th>
            <th>SpO2<br>(%)</th>
            <th>麻醉<br>(%)</th>
            <th>體溫<br>(°C)</th>
            <th>備註</th>
          </tr>
        </thead>
        <tbody>
          ${session.records.map(r => `
            <tr>
              <td>${new Date(r.timestamp).toLocaleTimeString('zh-TW')}</td>
              <td>${r.systolicBP !== null ? r.systolicBP : '-'}</td>
              <td>${r.diastolicBP !== null ? r.diastolicBP : '-'}</td>
              <td>${r.heartRate !== null ? r.heartRate : '-'}</td>
              <td>${r.respiratoryRate !== null ? r.respiratoryRate : '-'}</td>
              <td>${r.spO2 !== null ? r.spO2 : '-'}</td>
              <td>${r.anesthesiaConc !== null ? r.anesthesiaConc : '-'}</td>
              <td>${r.temperature !== null ? r.temperature : '-'}</td>
              <td class="notes">${r.notes || ''}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>

      <script>window.onload = function() { window.print(); }</script>
    </body>
    </html>
  `;

  const printWindow = window.open('', '_blank');
  if (printWindow) {
    printWindow.document.write(html);
    printWindow.document.close();
  }
}

async function exportCSVNative(session: AnesthesiaSession): Promise<void> {
  const csvContent = generateCSV(session);
  const fileName = `anesthesia_${session.patientInfo.caseNumber}_${Date.now()}.csv`;
  const filePath = `${FileSystem.documentDirectory}${fileName}`;

  // Add BOM for UTF-8 encoding to support Chinese characters in Excel
  const bom = '\uFEFF';
  await FileSystem.writeAsStringAsync(filePath, bom + csvContent, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const canShare = await Sharing.isAvailableAsync();
  if (canShare) {
    await Sharing.shareAsync(filePath, {
      mimeType: 'text/csv',
      dialogTitle: '匯出麻醉記錄',
      UTI: 'public.comma-separated-values-text',
    });
  } else {
    throw new Error('分享功能不可用');
  }
}

export async function exportCSV(session: AnesthesiaSession): Promise<void> {
  try {
    if (Platform.OS === 'web') {
      exportPDFWeb(session);
    } else {
      await exportCSVNative(session);
    }
  } catch (error) {
    console.error('Error exporting CSV:', error);
    throw error;
  }
}
