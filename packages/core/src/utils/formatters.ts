export const SPECIES_LABELS: Record<string, string> = {
  dog: '犬',
  cat: '貓',
  other: '其他',
};

export function formatTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function formatDateTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('zh-TW', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export function formatTime(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleTimeString('zh-TW', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * CSV 欄位跳脫 + 公式注入防禦。
 * - 含 , " \n 時用雙引號包裹
 * - 字串以 = + @ 開頭時加 ' 前綴防禦 Excel 公式注入
 * - 數字型態的負值不視為公式
 */
export function escapeCSV(value: string | number): string {
  const str = String(value);

  // 公式注入防禦：字串以危險字元開頭（數字負值除外）
  if (typeof value === 'string' && /^[=+@]/.test(str)) {
    return `"'${str.replace(/"/g, '""')}"`;
  }
  // 字串以 - 開頭且不是純負數（如 "-1+1"）
  if (typeof value === 'string' && str.startsWith('-') && !/^-?\d+(\.\d+)?$/.test(str)) {
    return `"'${str.replace(/"/g, '""')}"`;
  }

  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * HTML 跳脫，防止 XSS 注入。
 * 用於 PDF 匯出的 HTML template。
 */
export function escapeHTML(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * 消毒檔案名稱，移除不安全字元。
 */
export function sanitizeFileName(name: string): string {
  if (!name) return 'unnamed';
  return name.replace(/[/\\:*?"<>|]/g, '_');
}

export function calculateDuration(startTime: string, endTime?: string): string {
  if (!endTime) return '-';
  const start = new Date(startTime).getTime();
  const end = new Date(endTime).getTime();

  // 防禦：無效日期或 endTime < startTime
  if (isNaN(start) || isNaN(end) || end < start) return '-';

  const minutes = Math.round((end - start) / 60000);
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours > 0) {
    return `${hours} 小時 ${mins} 分鐘`;
  }
  return `${mins} 分鐘`;
}

export function generateSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}
