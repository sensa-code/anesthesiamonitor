import { describe, it, expect } from 'vitest';
import { processChartData } from '../utils/chart-helpers';

// ============================================================
// Phase 4: 圖表渲染反向測試
// 目的：測試圖表資料轉換的邊界條件
// processChartData 是從 VitalChart.tsx 提取的純函式
// ============================================================

describe('processChartData — 資料轉換反向測試', () => {
  // --- 空資料 ---
  it('空陣列 → 回傳 null', () => {
    expect(processChartData([], 'heartRate')).toBeNull();
  });

  it('全 null 值 → 回傳 null', () => {
    const records = [
      { heartRate: null, timestamp: '2026-01-01T10:00:00Z' },
      { heartRate: null, timestamp: '2026-01-01T10:05:00Z' },
    ];
    expect(processChartData(records as any, 'heartRate')).toBeNull();
  });

  it('全 undefined 值 → 回傳 null', () => {
    const records = [
      { timestamp: '2026-01-01T10:00:00Z' },
      { timestamp: '2026-01-01T10:05:00Z' },
    ];
    expect(processChartData(records as any, 'heartRate')).toBeNull();
  });

  // --- 正常資料 ---
  it('有效資料 → 回傳正確的 data 和 labels', () => {
    const records = [
      { heartRate: 80, timestamp: '2026-01-01T10:00:00Z' },
      { heartRate: 90, timestamp: '2026-01-01T10:05:00Z' },
    ];
    const result = processChartData(records as any, 'heartRate');
    expect(result).not.toBeNull();
    expect(result!.data).toEqual([80, 90]);
    expect(result!.labels).toHaveLength(2);
  });

  it('單筆記錄 → 回傳一個資料點', () => {
    const records = [
      { heartRate: 80, timestamp: '2026-01-01T10:00:00Z' },
    ];
    const result = processChartData(records as any, 'heartRate');
    expect(result).not.toBeNull();
    expect(result!.data).toEqual([80]);
  });

  // --- 危險值 ---
  it('Infinity 值 → 被過濾掉', () => {
    const records = [
      { heartRate: 80, timestamp: '2026-01-01T10:00:00Z' },
      { heartRate: Infinity, timestamp: '2026-01-01T10:05:00Z' },
      { heartRate: 90, timestamp: '2026-01-01T10:10:00Z' },
    ];
    const result = processChartData(records as any, 'heartRate');
    expect(result).not.toBeNull();
    expect(result!.data).toEqual([80, 90]);
    // Infinity 不應在資料中
    expect(result!.data.every(v => isFinite(v))).toBe(true);
  });

  it('-Infinity 值 → 被過濾掉', () => {
    const records = [
      { heartRate: -Infinity, timestamp: '2026-01-01T10:00:00Z' },
      { heartRate: 80, timestamp: '2026-01-01T10:05:00Z' },
    ];
    const result = processChartData(records as any, 'heartRate');
    expect(result).not.toBeNull();
    expect(result!.data).toEqual([80]);
  });

  it('NaN 值 → 被過濾掉（不轉為 0）', () => {
    const records = [
      { heartRate: NaN, timestamp: '2026-01-01T10:00:00Z' },
      { heartRate: 80, timestamp: '2026-01-01T10:05:00Z' },
    ];
    const result = processChartData(records as any, 'heartRate');
    expect(result).not.toBeNull();
    expect(result!.data).toEqual([80]);
    // NaN 不應被轉為 0
    expect(result!.data).not.toContain(0);
  });

  // --- 值為 0 ---
  it('genuine 0 值 → 保留（不被過濾）', () => {
    const records = [
      { heartRate: 0, timestamp: '2026-01-01T10:00:00Z' },
      { heartRate: 80, timestamp: '2026-01-01T10:05:00Z' },
    ];
    const result = processChartData(records as any, 'heartRate');
    expect(result).not.toBeNull();
    expect(result!.data).toContain(0);
    expect(result!.data).toHaveLength(2);
  });

  // --- null 穿插 ---
  it('null 穿插有效值 → null 被過濾，有效值保留', () => {
    const records = [
      { heartRate: 80, timestamp: '2026-01-01T10:00:00Z' },
      { heartRate: null, timestamp: '2026-01-01T10:05:00Z' },
      { heartRate: 85, timestamp: '2026-01-01T10:10:00Z' },
    ];
    const result = processChartData(records as any, 'heartRate');
    expect(result).not.toBeNull();
    expect(result!.data).toEqual([80, 85]);
  });

  // --- 負值 ---
  it('負值 → 保留（可能是溫度校正等合法場景）', () => {
    const records = [
      { temperature: -2, timestamp: '2026-01-01T10:00:00Z' },
      { temperature: 38, timestamp: '2026-01-01T10:05:00Z' },
    ];
    const result = processChartData(records as any, 'temperature');
    expect(result).not.toBeNull();
    expect(result!.data).toContain(-2);
  });

  // --- 全相同值 ---
  it('全相同值 → 回傳 padding 正確', () => {
    const records = [
      { heartRate: 80, timestamp: '2026-01-01T10:00:00Z' },
      { heartRate: 80, timestamp: '2026-01-01T10:05:00Z' },
      { heartRate: 80, timestamp: '2026-01-01T10:10:00Z' },
    ];
    const result = processChartData(records as any, 'heartRate');
    expect(result).not.toBeNull();
    // 全相同值時 padding 應有預設值（避免 0 range）
    expect(result!.padding).toBeGreaterThan(0);
  });

  // --- 大量資料 ---
  it('1000 筆記錄 → 正常處理', () => {
    const records = Array.from({ length: 1000 }, (_, i) => ({
      heartRate: 60 + Math.sin(i / 10) * 20,
      timestamp: new Date(Date.now() + i * 300000).toISOString(),
    }));
    const result = processChartData(records as any, 'heartRate');
    expect(result).not.toBeNull();
    expect(result!.data).toHaveLength(1000);
  });

  // --- 極大跨度 ---
  it('數值跨度極大 → 不 crash', () => {
    const records = [
      { heartRate: 1, timestamp: '2026-01-01T10:00:00Z' },
      { heartRate: 99999, timestamp: '2026-01-01T10:05:00Z' },
    ];
    const result = processChartData(records as any, 'heartRate');
    expect(result).not.toBeNull();
    expect(result!.data).toEqual([1, 99999]);
  });

  // --- 字串值（型別錯誤）---
  it('字串 "80" → 被過濾或正確轉換', () => {
    const records = [
      { heartRate: '80' as any, timestamp: '2026-01-01T10:00:00Z' },
    ];
    const result = processChartData(records as any, 'heartRate');
    // 字串值應被安全處理
    if (result) {
      expect(result.data.every(v => typeof v === 'number' && isFinite(v))).toBe(true);
    }
  });
});
