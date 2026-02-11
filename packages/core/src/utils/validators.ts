import { PatientInfo } from '../models';

/**
 * 嚴格解析數字字串。
 * 拒絕 Infinity、部分解析（如 "12abc"）、極大值。
 */
export function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;

  // 嚴格匹配：可選負號 + 數字 + 可選小數 + 可選科學記號
  if (!/^-?(\d+\.?\d*|\d*\.?\d+)([eE][+-]?\d+)?$/.test(trimmed)) {
    return null;
  }

  const num = parseFloat(trimmed);
  if (isNaN(num) || !isFinite(num)) return null;

  return num;
}

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export function validatePatientInfo(info: Partial<PatientInfo>): ValidationResult {
  if (!info.hospitalName?.trim()) {
    return { isValid: false, message: '請輸入動物醫院名' };
  }
  if (!info.patientName?.trim()) {
    return { isValid: false, message: '請輸入病患名稱' };
  }
  if (!info.caseNumber?.trim()) {
    return { isValid: false, message: '請輸入病例編號' };
  }
  if (info.weight === undefined || !isFinite(info.weight) || info.weight <= 0) {
    return { isValid: false, message: '請輸入有效的體重' };
  }
  return { isValid: true };
}

export function validateWeight(weightStr: string): ValidationResult {
  const trimmed = weightStr.trim();
  if (!trimmed) {
    return { isValid: false, message: '請輸入有效的體重' };
  }
  const weight = parseFloat(trimmed);
  if (isNaN(weight) || !isFinite(weight) || weight <= 0) {
    return { isValid: false, message: '請輸入有效的體重' };
  }
  return { isValid: true };
}

/**
 * 獸醫生理數值合理範圍定義
 */
export const VITAL_RANGES: Record<string, { min: number; max: number }> = {
  systolicBP:      { min: 0, max: 400 },
  diastolicBP:     { min: 0, max: 300 },
  meanBP:          { min: 0, max: 350 },
  heartRate:       { min: 0, max: 500 },
  respiratoryRate: { min: 0, max: 200 },
  spO2:            { min: 0, max: 100 },
  etCO2:           { min: 0, max: 150 },
  anesthesiaConc:  { min: 0, max: 20 },
  temperature:     { min: 15, max: 50 },
};

/**
 * 驗證生理數值是否在合理範圍內。
 * null 值允許（代表該欄位未填寫）。
 */
export function validateVitalRange(
  field: string,
  value: number | null
): ValidationResult {
  if (value === null) return { isValid: true };

  if (!isFinite(value)) {
    return { isValid: false, message: `${field} 數值無效` };
  }

  const range = VITAL_RANGES[field];
  if (!range) return { isValid: true }; // 未定義範圍的欄位不限制

  if (value < range.min || value > range.max) {
    return {
      isValid: false,
      message: `${field} 超出合理範圍 (${range.min}–${range.max})`,
    };
  }
  return { isValid: true };
}
