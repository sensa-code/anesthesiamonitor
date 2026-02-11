import { describe, it, expect } from 'vitest';

// ============================================================
// Phase 3: 資料持久化反向測試
// 目的：測試 JSON 序列化/反序列化的邊界條件
// 注意：AsyncStorage 的完整整合測試需在 app 層執行
//       這裡測試資料層面的邊界條件
// ============================================================

describe('JSON 序列化/反序列化 — 邊界條件', () => {
  // 模擬 storage.ts 的 loadSessions 解析邏輯
  function parseSessionsJSON(raw: string | null): unknown[] {
    if (!raw) return [];
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  it('null → 空陣列', () => {
    expect(parseSessionsJSON(null)).toEqual([]);
  });

  it('有效 JSON 陣列 → 正確解析', () => {
    expect(parseSessionsJSON('[{"id":"s1"}]')).toEqual([{ id: 's1' }]);
  });

  it('損壞 JSON → 空陣列（不 crash）', () => {
    expect(parseSessionsJSON('not valid json{{{')).toEqual([]);
  });

  it('"null" 字串 → 空陣列', () => {
    // JSON.parse("null") === null, 不是陣列
    expect(parseSessionsJSON('null')).toEqual([]);
  });

  it('截斷 JSON → 空陣列', () => {
    expect(parseSessionsJSON('[{"id":"s1"')).toEqual([]);
  });

  it('空字串 → 空陣列', () => {
    expect(parseSessionsJSON('')).toEqual([]);
  });

  it('JSON object 而非陣列 → 空陣列', () => {
    expect(parseSessionsJSON('{"id":"s1"}')).toEqual([]);
  });

  it('JSON 數字 → 空陣列', () => {
    expect(parseSessionsJSON('42')).toEqual([]);
  });

  it('巨大 JSON（1000 筆 session）→ 正確解析', () => {
    const sessions = Array.from({ length: 1000 }, (_, i) => ({ id: `s${i}` }));
    const json = JSON.stringify(sessions);
    const parsed = parseSessionsJSON(json);
    expect(parsed).toHaveLength(1000);
  });
});

describe('Session ID 唯一性', () => {
  // 模擬 read-modify-write 的 upsert 邏輯
  function upsertSession(sessions: { id: string }[], newSession: { id: string }): { id: string }[] {
    const result = [...sessions];
    const idx = result.findIndex(s => s.id === newSession.id);
    if (idx >= 0) {
      result[idx] = newSession;
    } else {
      result.push(newSession);
    }
    return result;
  }

  it('新 session → 附加到列表', () => {
    const result = upsertSession([{ id: 's1' }], { id: 's2' });
    expect(result).toHaveLength(2);
  });

  it('已存在的 session → 更新（不重複）', () => {
    const result = upsertSession([{ id: 's1' }], { id: 's1' });
    expect(result).toHaveLength(1);
  });

  it('空列表 → 加入第一個', () => {
    const result = upsertSession([], { id: 's1' });
    expect(result).toHaveLength(1);
  });
});

describe('未完成 Session 過濾邏輯', () => {
  interface MockSession {
    id: string;
    endTime?: string;
    startTime: string;
  }

  function findLatestUnfinished(sessions: MockSession[]): MockSession | null {
    const unfinished = sessions
      .filter(s => !s.endTime)
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime());
    return unfinished.length > 0 ? unfinished[0] : null;
  }

  it('無 session → null', () => {
    expect(findLatestUnfinished([])).toBeNull();
  });

  it('全部已完成 → null', () => {
    const sessions: MockSession[] = [
      { id: 's1', startTime: '2026-01-01T10:00:00Z', endTime: '2026-01-01T12:00:00Z' },
    ];
    expect(findLatestUnfinished(sessions)).toBeNull();
  });

  it('一個未完成 → 回傳該 session', () => {
    const sessions: MockSession[] = [
      { id: 's1', startTime: '2026-01-01T10:00:00Z' },
    ];
    expect(findLatestUnfinished(sessions)?.id).toBe('s1');
  });

  it('多個未完成 → 回傳最新的', () => {
    const sessions: MockSession[] = [
      { id: 's1', startTime: '2026-01-01T10:00:00Z' },
      { id: 's2', startTime: '2026-01-02T10:00:00Z' },
      { id: 's3', startTime: '2026-01-01T15:00:00Z' },
    ];
    expect(findLatestUnfinished(sessions)?.id).toBe('s2');
  });

  it('endTime 為空字串 → 視為未完成', () => {
    const sessions: MockSession[] = [
      { id: 's1', startTime: '2026-01-01T10:00:00Z', endTime: '' },
    ];
    // 空字串是 falsy，所以 !s.endTime 為 true
    expect(findLatestUnfinished(sessions)?.id).toBe('s1');
  });

  it('無效 startTime → 排序不 crash', () => {
    const sessions: MockSession[] = [
      { id: 's1', startTime: 'invalid' },
      { id: 's2', startTime: '2026-01-02T10:00:00Z' },
    ];
    // NaN comparison 不 crash，但順序可能不確定
    const result = findLatestUnfinished(sessions);
    expect(result).not.toBeNull();
  });
});
