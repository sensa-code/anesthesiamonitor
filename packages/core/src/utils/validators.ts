import { PatientInfo } from '../models';

export function parseNumber(value: string): number | null {
  const trimmed = value.trim();
  if (trimmed === '') return null;
  const num = parseFloat(trimmed);
  return isNaN(num) ? null : num;
}

export interface ValidationResult {
  isValid: boolean;
  message?: string;
}

export function validatePatientInfo(info: Partial<PatientInfo>): ValidationResult {
  if (!info.patientName?.trim()) {
    return { isValid: false, message: '請輸入病患名稱' };
  }
  if (!info.caseNumber?.trim()) {
    return { isValid: false, message: '請輸入病例編號' };
  }
  if (info.weight === undefined || info.weight <= 0) {
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
  if (isNaN(weight) || weight <= 0) {
    return { isValid: false, message: '請輸入有效的體重' };
  }
  return { isValid: true };
}
