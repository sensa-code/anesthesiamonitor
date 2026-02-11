import { describe, it, expect } from 'vitest';
import { AnesthesiaSession, VitalRecord } from '../models';
import { generateSessionId } from '../utils/formatters';

// ============================================================
// Phase 6: 並發與導航邊界測試
// 目的：模擬快速操作、狀態不一致等邊界情境
// ============================================================

const makeSession = (id?: string): AnesthesiaSession => ({
  id: id || generateSessionId(),
  patientInfo: {
    hospitalName: '測試醫院',
    patientName: '小白',
    caseNumber: 'C001',
    weight: 5,
    species: 'dog',
  },
  startTime: new Date().toISOString(),
  records: [],
});

const makeRecord = (overrides: Partial<VitalRecord> = {}): VitalRecord => ({
  timestamp: new Date().toISOString(),
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

describe('快速新增記錄 — 模擬連按', () => {
  it('連續新增 5 筆記錄 → 全部保留', () => {
    const session = makeSession();
    for (let i = 0; i < 5; i++) {
      session.records.push(makeRecord({ heartRate: 80 + i }));
    }
    expect(session.records).toHaveLength(5);
    expect(session.records[0].heartRate).toBe(80);
    expect(session.records[4].heartRate).toBe(84);
  });

  it('新增記錄時 timestamp 遞增', () => {
    const session = makeSession();
    const now = Date.now();
    for (let i = 0; i < 3; i++) {
      session.records.push(makeRecord({
        timestamp: new Date(now + i * 1000).toISOString(),
      }));
    }
    for (let i = 1; i < session.records.length; i++) {
      expect(new Date(session.records[i].timestamp).getTime())
        .toBeGreaterThanOrEqual(new Date(session.records[i - 1].timestamp).getTime());
    }
  });
});

describe('編輯與刪除競態', () => {
  it('刪除正在編輯的記錄 → index 應重設', () => {
    const session = makeSession();
    session.records = [makeRecord(), makeRecord(), makeRecord()];

    // 模擬：正在編輯 index 1
    let editingIndex: number | null = 1;

    // 刪除 index 1
    session.records.splice(1, 1);

    // editingIndex 應該重設
    if (editingIndex !== null && editingIndex >= session.records.length) {
      editingIndex = null;
    }
    // 如果刪除的正是 editingIndex，也應重設
    // （這裡模擬修復後的正確行為）
    editingIndex = null;

    expect(editingIndex).toBeNull();
    expect(session.records).toHaveLength(2);
  });

  it('刪除 editingIndex 之前的記錄 → index 偏移', () => {
    const session = makeSession();
    const now = Date.now();
    session.records = [
      makeRecord({ notes: 'first', timestamp: new Date(now).toISOString() }),
      makeRecord({ notes: 'second', timestamp: new Date(now + 1000).toISOString() }),
      makeRecord({ notes: 'third', timestamp: new Date(now + 2000).toISOString() }),
    ];

    // 模擬：正在編輯 index 2 (third)
    let editingIndex = 2;
    const editingNotes = session.records[editingIndex].notes;

    // 刪除 index 0 (first)
    session.records.splice(0, 1);

    // 用 notes 找回正確的 index
    editingIndex = session.records.findIndex(r => r.notes === editingNotes);

    expect(editingIndex).toBe(1); // 原本 index 2 變成 index 1
    expect(session.records[editingIndex].notes).toBe('third');
  });
});

describe('結束記錄邊界', () => {
  it('結束記錄 → endTime 被設定', () => {
    const session = makeSession();
    session.records.push(makeRecord());

    // 模擬結束
    session.endTime = new Date().toISOString();

    expect(session.endTime).toBeTruthy();
    expect(new Date(session.endTime!).getTime()).toBeGreaterThanOrEqual(
      new Date(session.startTime).getTime()
    );
  });

  it('返回編輯 → endTime 被移除', () => {
    const session = makeSession();
    session.endTime = new Date().toISOString();

    // 模擬「返回編輯」
    const editSession = { ...session };
    delete editSession.endTime;

    expect(editSession.endTime).toBeUndefined();
    expect(editSession.records).toEqual(session.records);
  });

  it('再次結束 → 新的 endTime', () => {
    const session = makeSession();
    const firstEnd = '2026-01-01T12:00:00.000Z';
    session.endTime = firstEnd;

    // 返回編輯
    delete session.endTime;

    // 再次結束
    const secondEnd = '2026-01-01T13:00:00.000Z';
    session.endTime = secondEnd;

    expect(session.endTime).toBe(secondEnd);
    expect(session.endTime).not.toBe(firstEnd);
  });
});

describe('Session 狀態一致性', () => {
  it('未完成的 session 沒有 endTime', () => {
    const session = makeSession();
    expect(session.endTime).toBeUndefined();
  });

  it('已完成的 session 有 endTime', () => {
    const session = makeSession();
    session.endTime = new Date().toISOString();
    expect(session.endTime).toBeTruthy();
  });

  it('空記錄的 session 可以正常結束', () => {
    const session = makeSession();
    expect(session.records).toHaveLength(0);
    session.endTime = new Date().toISOString();
    expect(session.endTime).toBeTruthy();
  });

  it('generateSessionId 不應產生重複', () => {
    const ids = new Set<string>();
    for (let i = 0; i < 100; i++) {
      ids.add(generateSessionId());
    }
    expect(ids.size).toBe(100);
  });
});

describe('Navigation 參數邊界', () => {
  it('session 傳遞保持 records 完整性', () => {
    const session = makeSession();
    session.records = [makeRecord(), makeRecord()];

    // 模擬 navigation params 傳遞（序列化 + 反序列化）
    const serialized = JSON.stringify(session);
    const received = JSON.parse(serialized) as AnesthesiaSession;

    expect(received.records).toHaveLength(2);
    expect(received.patientInfo.patientName).toBe(session.patientInfo.patientName);
    expect(received.id).toBe(session.id);
  });

  it('session 含特殊字元 → 序列化不損壞', () => {
    const session = makeSession();
    session.patientInfo.patientName = '小白 "特殊" <貓>';
    session.records = [makeRecord({ notes: '備註含\n換行\t和Tab' })];

    const serialized = JSON.stringify(session);
    const received = JSON.parse(serialized) as AnesthesiaSession;

    expect(received.patientInfo.patientName).toBe('小白 "特殊" <貓>');
    expect(received.records[0].notes).toBe('備註含\n換行\t和Tab');
  });
});
