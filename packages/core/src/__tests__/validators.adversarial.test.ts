import { describe, it, expect } from 'vitest';
import { parseNumber, validatePatientInfo, validateWeight } from '../utils/validators';
import { validateVitalRange, VITAL_RANGES } from '../utils/validators';

// ============================================================
// Phase 1: 輸入邊界反向測試 — validators.ts
// 目的：模擬各種不可控輸入，確認驗證器防禦力
// ============================================================

describe('parseNumber — 反向測試', () => {
  // --- 正常路徑 ---
  it('正常數字 "120" → 120', () => {
    expect(parseNumber('120')).toBe(120);
  });

  it('小數 "37.5" → 37.5', () => {
    expect(parseNumber('37.5')).toBe(37.5);
  });

  it('零 "0" → 0', () => {
    expect(parseNumber('0')).toBe(0);
  });

  it('帶空白 "  120.5  " → 120.5', () => {
    expect(parseNumber('  120.5  ')).toBe(120.5);
  });

  // --- 空值 ---
  it('空字串 "" → null', () => {
    expect(parseNumber('')).toBeNull();
  });

  it('純空白 "  " → null', () => {
    expect(parseNumber('  ')).toBeNull();
  });

  it('"NaN" 字串 → null', () => {
    expect(parseNumber('NaN')).toBeNull();
  });

  // --- 危險值：Infinity ---
  it('"Infinity" → 應為 null（非有限數字）', () => {
    expect(parseNumber('Infinity')).toBeNull();
  });

  it('"-Infinity" → 應為 null', () => {
    expect(parseNumber('-Infinity')).toBeNull();
  });

  // --- 極大數（1e308 在 IEEE 754 中是有限數，parseNumber 不拒絕）---
  it('"1e308" → 接受（isFinite 為 true）', () => {
    expect(parseNumber('1e308')).toBe(1e308);
  });

  // 真正的 overflow
  it('"1e309" → null（超出 Number.MAX_VALUE，變成 Infinity）', () => {
    expect(parseNumber('1e309')).toBeNull();
  });

  // --- 部分解析問題 ---
  it('"12abc" → 應為 null（非完整數字）', () => {
    expect(parseNumber('12abc')).toBeNull();
  });

  it('"1.2.3" → 應為 null（多個小數點）', () => {
    expect(parseNumber('1.2.3')).toBeNull();
  });

  it('"12 34" → 應為 null（含空格的數字）', () => {
    expect(parseNumber('12 34')).toBeNull();
  });

  // --- 負數 ---
  it('"-50" → -50（負數是合法數字）', () => {
    expect(parseNumber('-50')).toBe(-50);
  });

  it('"-0" → -0（IEEE 754 負零）', () => {
    const result = parseNumber('-0');
    expect(result).not.toBeNull();
    expect(result! + 0).toBe(0); // -0 + 0 === 0
  });

  // --- 科學記號 ---
  it('"1e2" → 100（合理的科學記號）', () => {
    expect(parseNumber('1e2')).toBe(100);
  });
});

describe('validatePatientInfo — 反向測試', () => {
  const validInfo = {
    hospitalName: '測試醫院',
    patientName: '小白',
    caseNumber: 'C001',
    weight: 5,
    species: 'dog' as const,
  };

  it('完整有效資料 → valid', () => {
    expect(validatePatientInfo(validInfo).isValid).toBe(true);
  });

  // --- 必填欄位 ---
  it('缺少 patientName → invalid', () => {
    expect(validatePatientInfo({ ...validInfo, patientName: '' }).isValid).toBe(false);
  });

  it('patientName 純空白 → invalid', () => {
    expect(validatePatientInfo({ ...validInfo, patientName: '   ' }).isValid).toBe(false);
  });

  it('缺少 caseNumber → invalid', () => {
    expect(validatePatientInfo({ ...validInfo, caseNumber: '' }).isValid).toBe(false);
  });

  it('缺少 hospitalName → 應為 invalid', () => {
    expect(validatePatientInfo({ ...validInfo, hospitalName: '' }).isValid).toBe(false);
  });

  // --- 體重邊界 ---
  it('weight = 0 → invalid', () => {
    expect(validatePatientInfo({ ...validInfo, weight: 0 }).isValid).toBe(false);
  });

  it('weight = -1 → invalid', () => {
    expect(validatePatientInfo({ ...validInfo, weight: -1 }).isValid).toBe(false);
  });

  it('weight = 0.001 → valid（小型動物）', () => {
    expect(validatePatientInfo({ ...validInfo, weight: 0.001 }).isValid).toBe(true);
  });

  it('weight = Infinity → 應為 invalid', () => {
    expect(validatePatientInfo({ ...validInfo, weight: Infinity }).isValid).toBe(false);
  });

  it('weight = NaN → 應為 invalid', () => {
    expect(validatePatientInfo({ ...validInfo, weight: NaN }).isValid).toBe(false);
  });

  it('weight = undefined → invalid', () => {
    expect(validatePatientInfo({ ...validInfo, weight: undefined }).isValid).toBe(false);
  });

  // --- 超長字串 ---
  it('patientName 10000 字元 → valid（不限長度，但不應 crash）', () => {
    const longName = 'A'.repeat(10000);
    const result = validatePatientInfo({ ...validInfo, patientName: longName });
    expect(result.isValid).toBe(true);
  });

  // --- HTML 注入（驗證器不負責消毒，但應該通過）---
  it('含 HTML 的 patientName → valid（驗證不負責 XSS）', () => {
    const result = validatePatientInfo({
      ...validInfo,
      patientName: '<script>alert(1)</script>',
    });
    expect(result.isValid).toBe(true);
  });
});

describe('validateWeight — 反向測試', () => {
  it('"5" → valid', () => {
    expect(validateWeight('5').isValid).toBe(true);
  });

  it('"0" → invalid', () => {
    expect(validateWeight('0').isValid).toBe(false);
  });

  it('"-5" → invalid', () => {
    expect(validateWeight('-5').isValid).toBe(false);
  });

  it('"abc" → invalid', () => {
    expect(validateWeight('abc').isValid).toBe(false);
  });

  it('"" → invalid', () => {
    expect(validateWeight('').isValid).toBe(false);
  });

  it('"Infinity" → 應為 invalid', () => {
    expect(validateWeight('Infinity').isValid).toBe(false);
  });

  it('"1e308" → valid（isFinite 為 true，極大但合法）', () => {
    expect(validateWeight('1e308').isValid).toBe(true);
  });

  it('"1e309" → invalid（Infinity）', () => {
    expect(validateWeight('1e309').isValid).toBe(false);
  });
});

describe('validateVitalRange — 生理數值範圍驗證', () => {
  // --- 心跳 (HR) ---
  it('heartRate 80 → valid', () => {
    expect(validateVitalRange('heartRate', 80).isValid).toBe(true);
  });

  it('heartRate -10 → invalid', () => {
    expect(validateVitalRange('heartRate', -10).isValid).toBe(false);
  });

  it('heartRate 999 → warning（超出正常範圍但物理上可能）', () => {
    const result = validateVitalRange('heartRate', 999);
    expect(result.isValid).toBe(false);
  });

  it('heartRate null → valid（空值允許）', () => {
    expect(validateVitalRange('heartRate', null).isValid).toBe(true);
  });

  it('heartRate Infinity → invalid', () => {
    expect(validateVitalRange('heartRate', Infinity).isValid).toBe(false);
  });

  // --- 血氧 (SpO2) ---
  it('spO2 98 → valid', () => {
    expect(validateVitalRange('spO2', 98).isValid).toBe(true);
  });

  it('spO2 150 → invalid（>100% 不可能）', () => {
    expect(validateVitalRange('spO2', 150).isValid).toBe(false);
  });

  it('spO2 -5 → invalid', () => {
    expect(validateVitalRange('spO2', -5).isValid).toBe(false);
  });

  // --- 體溫 (BT) ---
  it('temperature 38.5 → valid', () => {
    expect(validateVitalRange('temperature', 38.5).isValid).toBe(true);
  });

  it('temperature -273 → invalid', () => {
    expect(validateVitalRange('temperature', -273).isValid).toBe(false);
  });

  it('temperature 100 → invalid（獸醫場景不可能）', () => {
    expect(validateVitalRange('temperature', 100).isValid).toBe(false);
  });

  // --- 收縮壓 (Sys) ---
  it('systolicBP 120 → valid', () => {
    expect(validateVitalRange('systolicBP', 120).isValid).toBe(true);
  });

  it('systolicBP -100 → invalid', () => {
    expect(validateVitalRange('systolicBP', -100).isValid).toBe(false);
  });

  it('systolicBP 99999 → invalid', () => {
    expect(validateVitalRange('systolicBP', 99999).isValid).toBe(false);
  });

  // --- 麻醉濃度 (MAC) ---
  it('anesthesiaConc 2.5 → valid', () => {
    expect(validateVitalRange('anesthesiaConc', 2.5).isValid).toBe(true);
  });

  it('anesthesiaConc -1 → invalid', () => {
    expect(validateVitalRange('anesthesiaConc', -1).isValid).toBe(false);
  });

  it('anesthesiaConc 100 → invalid', () => {
    expect(validateVitalRange('anesthesiaConc', 100).isValid).toBe(false);
  });

  // --- 不存在的欄位 ---
  it('未知欄位名 → valid（不限制未定義欄位）', () => {
    expect(validateVitalRange('unknownField' as any, 50).isValid).toBe(true);
  });

  // --- VITAL_RANGES 匯出確認 ---
  it('VITAL_RANGES 包含所有生理數值欄位', () => {
    const expectedFields = [
      'systolicBP', 'diastolicBP', 'meanBP',
      'heartRate', 'respiratoryRate', 'spO2',
      'etCO2', 'anesthesiaConc', 'temperature',
    ];
    expectedFields.forEach(field => {
      expect(VITAL_RANGES).toHaveProperty(field);
    });
  });
});
