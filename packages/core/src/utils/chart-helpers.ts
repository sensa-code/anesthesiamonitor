import { VitalRecord } from '../models';

export interface ChartData {
  data: number[];
  labels: string[];
  minValue: number;
  maxValue: number;
  padding: number;
}

/**
 * 從 VitalRecord 陣列提取圖表資料。
 * 過濾 null、undefined、NaN、Infinity 等無效值。
 * 原始邏輯從 VitalChart.tsx 提取並修正 Number(x) || 0 問題。
 */
export function processChartData(
  records: VitalRecord[],
  dataKey: keyof VitalRecord
): ChartData | null {
  // 過濾掉該欄位為空值或無效值的記錄
  const validRecords = records.filter((r) => {
    const value = r[dataKey];
    if (value === null || value === undefined || value === '') return false;
    const num = Number(value);
    if (isNaN(num) || !isFinite(num)) return false;
    return true;
  });

  if (validRecords.length === 0) return null;

  const data = validRecords.map((r) => Number(r[dataKey]));
  const labels = validRecords.map((r, index) => {
    if (validRecords.length <= 6 || index % Math.ceil(validRecords.length / 6) === 0) {
      const date = new Date(r.timestamp);
      return `${date.getHours()}:${date.getMinutes().toString().padStart(2, '0')}`;
    }
    return '';
  });

  const minValue = Math.min(...data);
  const maxValue = Math.max(...data);
  const padding = (maxValue - minValue) * 0.1 || 10;

  return { data, labels, minValue, maxValue, padding };
}
