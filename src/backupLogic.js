import { diffDays } from './util.js';

// کارت یادآور پشتیبان‌گیری: هرگز خروجی نگرفته و ≥۷ روز استفاده، یا آخرین خروجی ≥۱۴ روز پیش؛ و آخرین نمایش ≥۳ روز پیش
export function needsBackupNudge({ lastExport, firstUse, today, nudgeAt }) {
  if (nudgeAt && diffDays(today, nudgeAt) < 3) return false;
  if (lastExport) return diffDays(today, lastExport) >= 14;
  return !!firstUse && diffDays(today, firstUse) >= 7;
}
