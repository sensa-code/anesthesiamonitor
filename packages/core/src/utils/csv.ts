import { AnesthesiaSession, VitalRecord } from '../models';
import { formatTimestamp, escapeCSV, SPECIES_LABELS } from './formatters';

export function generateCSV(session: AnesthesiaSession): string {
  const lines: string[] = [];

  // Patient info header
  lines.push('病患資料');
  lines.push(`病患名稱,${escapeCSV(session.patientInfo.patientName)}`);
  lines.push(`病例編號,${escapeCSV(session.patientInfo.caseNumber)}`);
  lines.push(`體重 (kg),${session.patientInfo.weight}`);
  lines.push(`動物種別,${SPECIES_LABELS[session.patientInfo.species] ?? session.patientInfo.species}`);
  lines.push(`開始時間,${formatTimestamp(session.startTime)}`);
  if (session.endTime) {
    lines.push(`結束時間,${formatTimestamp(session.endTime)}`);
  }
  lines.push('');

  // Vital records header
  lines.push('生理數值記錄');
  lines.push(
    '時間,收縮壓Sys (mmHg),舒張壓Dia (mmHg),平均壓MAP (mmHg),心跳HR (bpm),呼吸RR (次/分),血氧SpO2 (%),呼末二氧化碳EtCO2 (mmHg),麻醉濃度MAC (%),體溫BT (°C),備註Others'
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
        formatValue(record.meanBP),
        formatValue(record.heartRate),
        formatValue(record.respiratoryRate),
        formatValue(record.spO2),
        formatValue(record.etCO2),
        formatValue(record.anesthesiaConc),
        formatValue(record.temperature),
        escapeCSV(record.notes || ''),
      ].join(',')
    );
  });

  return lines.join('\n');
}
