import { describe, it, expect } from 'vitest';
import {
  formatTimestamp,
  formatDateTime,
  formatTime,
  escapeCSV,
  calculateDuration,
  generateSessionId,
  SPECIES_LABELS,
} from '../utils/formatters';
import { generateCSV } from '../utils/csv';
import { AnesthesiaSession, VitalRecord } from '../models';

// ============================================================
// Phase 5: 格式化工具反向測試
// 目的：測試所有格式化函式的邊界條件
// ============================================================

describe('formatTimestamp — 邊界條件', () => {
  it('有效 ISO 日期 → 格式化成功', () => {
    const result = formatTimestamp('2026-01-01T10:00:00.000Z');
    expect(result).toBeTruthy();
    expect(result).not.toContain('Invalid');
  });

  it('無效日期字串 → 不應 crash', () => {
    // new Date("invalid") 回傳 Invalid Date
    expect(() => formatTimestamp('invalid')).not.toThrow();
  });

  it('空字串 → 不應 crash', () => {
    expect(() => formatTimestamp('')).not.toThrow();
  });

  it('未來日期 → 正常格式化', () => {
    const result = formatTimestamp('2099-12-31T23:59:59.000Z');
    expect(result).toBeTruthy();
  });
});

describe('formatDateTime — 邊界條件', () => {
  it('有效日期 → 格式化成功', () => {
    const result = formatDateTime('2026-01-01T10:00:00.000Z');
    expect(result).toBeTruthy();
  });

  it('無效日期 → 不 crash', () => {
    expect(() => formatDateTime('not-a-date')).not.toThrow();
  });
});

describe('formatTime — 邊界條件', () => {
  it('有效日期 → 回傳時間', () => {
    const result = formatTime('2026-01-01T10:30:45.000Z');
    expect(result).toBeTruthy();
  });

  it('無效日期 → 不 crash', () => {
    expect(() => formatTime('garbage')).not.toThrow();
  });
});

describe('calculateDuration — 反向測試', () => {
  it('正常 2 小時 → "2 小時 0 分鐘"', () => {
    const result = calculateDuration(
      '2026-01-01T10:00:00.000Z',
      '2026-01-01T12:00:00.000Z'
    );
    expect(result).toContain('2');
    expect(result).toContain('小時');
  });

  it('30 分鐘 → "30 分鐘"', () => {
    const result = calculateDuration(
      '2026-01-01T10:00:00.000Z',
      '2026-01-01T10:30:00.000Z'
    );
    expect(result).toContain('30');
    expect(result).toContain('分鐘');
  });

  it('endTime undefined → "-"', () => {
    expect(calculateDuration('2026-01-01T10:00:00.000Z')).toBe('-');
  });

  it('相同 start 和 end → "0 分鐘"', () => {
    const result = calculateDuration(
      '2026-01-01T10:00:00.000Z',
      '2026-01-01T10:00:00.000Z'
    );
    expect(result).toContain('0');
  });

  it('startTime > endTime → 不應回傳負數', () => {
    const result = calculateDuration(
      '2026-01-01T12:00:00.000Z',
      '2026-01-01T10:00:00.000Z'
    );
    // 修復後應回傳 "-" 或 "0 分鐘"，不應含負號
    expect(result).not.toMatch(/-\d/);
  });

  it('無效 startTime → 不 crash', () => {
    expect(() => calculateDuration('invalid', '2026-01-01T10:00:00.000Z')).not.toThrow();
  });

  it('無效 endTime → 不 crash', () => {
    expect(() => calculateDuration('2026-01-01T10:00:00.000Z', 'invalid')).not.toThrow();
  });

  it('極長持續時間（100 天）→ 格式正確', () => {
    const result = calculateDuration(
      '2026-01-01T00:00:00.000Z',
      '2026-04-11T00:00:00.000Z' // 100 天
    );
    expect(result).toContain('小時');
  });
});

describe('escapeCSV — 完整反向測試', () => {
  it('一般字串 → 不變', () => {
    expect(escapeCSV('hello')).toBe('hello');
  });

  it('空字串 → 空字串', () => {
    expect(escapeCSV('')).toBe('');
  });

  it('含逗號 → 包裹雙引號', () => {
    expect(escapeCSV('a,b')).toBe('"a,b"');
  });

  it('含雙引號 → escape 且包裹', () => {
    expect(escapeCSV('he said "hi"')).toBe('"he said ""hi"""');
  });

  it('含換行 → 包裹', () => {
    expect(escapeCSV('line1\nline2')).toBe('"line1\nline2"');
  });

  it('數字 0 → "0"', () => {
    expect(escapeCSV(0)).toBe('0');
  });

  it('數字 -5 → "-5"（純負數不視為公式）', () => {
    expect(escapeCSV(-5)).toBe('-5');
  });

  // --- CSV 公式注入防禦 ---
  it('= 開頭 → 防禦', () => {
    const result = escapeCSV('=1+1');
    expect(result.charAt(0)).not.toBe('=');
  });

  it('+ 開頭 → 防禦', () => {
    const result = escapeCSV('+1+1');
    expect(result.charAt(0)).not.toBe('+');
  });

  it('@ 開頭 → 防禦', () => {
    const result = escapeCSV('@SUM(A1)');
    expect(result.charAt(0)).not.toBe('@');
  });
});

describe('SPECIES_LABELS — 反向測試', () => {
  it('dog → 犬', () => {
    expect(SPECIES_LABELS['dog']).toBe('犬');
  });

  it('cat → 貓', () => {
    expect(SPECIES_LABELS['cat']).toBe('貓');
  });

  it('other → 其他', () => {
    expect(SPECIES_LABELS['other']).toBe('其他');
  });

  it('不存在的 species → undefined', () => {
    // 這是個已知問題，generateCSV 會輸出 "undefined"
    expect(SPECIES_LABELS['rabbit']).toBeUndefined();
  });
});

describe('generateSessionId — 唯一性', () => {
  it('生成的 ID 包含 session_ 前綴', () => {
    expect(generateSessionId()).toMatch(/^session_/);
  });

  it('兩次呼叫產生不同 ID', () => {
    const id1 = generateSessionId();
    const id2 = generateSessionId();
    expect(id1).not.toBe(id2);
  });

  it('生成的 ID 不含空白', () => {
    const id = generateSessionId();
    expect(id).not.toMatch(/\s/);
  });
});

describe('generateCSV — 邊界整合測試', () => {
  const makeSession = (overrides: Partial<AnesthesiaSession> = {}): AnesthesiaSession => ({
    id: 'test-id',
    patientInfo: {
      hospitalName: '測試醫院',
      patientName: '小白',
      caseNumber: 'C001',
      weight: 5,
      species: 'dog',
    },
    startTime: '2026-01-01T10:00:00.000Z',
    records: [],
    ...overrides,
  });

  const makeRecord = (overrides: Partial<VitalRecord> = {}): VitalRecord => ({
    timestamp: '2026-01-01T10:05:00.000Z',
    systolicBP: 120,
    diastolicBP: 80,
    meanBP: 93,
    heartRate: 80,
    respiratoryRate: 15,
    spO2: 98,
    etCO2: 35,
    anesthesiaConc: 2.0,
    temperature: 38.0,
    notes: '',
    ...overrides,
  });

  it('正常 session → CSV 格式正確', () => {
    const csv = generateCSV(makeSession({ records: [makeRecord()] }));
    expect(csv).toContain('病患資料');
    expect(csv).toContain('小白');
    expect(csv).toContain('120');
  });

  it('無 endTime → CSV 不含結束時間行', () => {
    const csv = generateCSV(makeSession());
    expect(csv).not.toContain('結束時間');
  });

  it('有 endTime → CSV 含結束時間行', () => {
    const csv = generateCSV(makeSession({ endTime: '2026-01-01T12:00:00.000Z' }));
    expect(csv).toContain('結束時間');
  });

  it('notes 含特殊字元 → 正確 escape', () => {
    const csv = generateCSV(makeSession({
      records: [makeRecord({ notes: '打了 "止痛藥", 觀察中' })],
    }));
    expect(csv).toContain('""止痛藥""');
  });

  it('species 不在 SPECIES_LABELS → 不輸出 undefined', () => {
    const session = makeSession();
    (session.patientInfo as any).species = 'rabbit';
    const csv = generateCSV(session);
    expect(csv).not.toContain('undefined');
  });
});
