import { isNative } from './notify.js';

const esc = (v) => {
  const s = v == null ? '' : typeof v === 'object' ? JSON.stringify(v) : String(v);
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

export const toCSV = (header, rows) => [header, ...rows].map((r) => r.map(esc).join(',')).join('\r\n');

// CSV ثبت‌ها: عادت‌ها، اهداف و جلسه‌های تمرکز
export function logsCSV(tables) {
  const title = (rows, id) => rows?.find((x) => x.id === id)?.title ?? '';
  const rows = [
    ...(tables.habitLogs ?? []).map((l) => ['عادت', title(tables.habits, l.habitId), l.date, l.status, l.amount, l.reason]),
    ...(tables.goalLogs ?? []).map((l) => ['هدف', title(tables.goals, l.goalId), l.date, l.status, l.amount, l.reason]),
    ...(tables.focus ?? []).map((f) => ['تمرکز', f.title, f.date, f.outcome, f.actual, f.note]),
  ].sort((a, b) => (a[2] < b[2] ? -1 : a[2] > b[2] ? 1 : 0));
  return '﻿' + toCSV(['نوع', 'عنوان', 'تاریخ', 'وضعیت', 'مقدار', 'یادداشت'], rows);
}

export const stamp = (d = new Date()) => d.toISOString().slice(0, 10);

// در اپ نیتیو: ذخیره در Documents/Evolve (پوشهٔ قابل‌مشاهده) و باز کردن برگهٔ اشتراک‌گذاری؛ در وب: دانلود.
// خروجی: مسیر ذخیره برای نمایش به کاربر
export async function saveFile(name, text, mime) {
  if (isNative()) {
    const { Filesystem, Directory, Encoding } = await import('@capacitor/filesystem');
    const { Share } = await import('@capacitor/share');
    let uri;
    let where;
    try {
      await Filesystem.requestPermissions().catch(() => {});
      const r = await Filesystem.writeFile({ path: `Evolve/${name}`, data: text, directory: Directory.Documents, encoding: Encoding.UTF8, recursive: true });
      uri = r.uri;
      where = `Documents/Evolve/${name}`;
    } catch {
      const r = await Filesystem.writeFile({ path: name, data: text, directory: Directory.Cache, encoding: Encoding.UTF8 });
      uri = r.uri;
      where = null;
    }
    await Share.share({ title: name, url: uri }).catch(() => {});
    return where;
  }
  const url = URL.createObjectURL(new Blob([text], { type: `${mime};charset=utf-8` }));
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 2000);
  return `Downloads/${name}`;
}

// کپی متن در کلیپ‌بورد؛ در نبود دسترسی، با ناحیهٔ متنی موقت
export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand?.('copy') ?? false;
    ta.remove();
    return ok;
  }
}

// برگهٔ اشتراک‌گذاری متن (نیتیو یا وب)؛ false اگر در دسترس نبود
export async function shareText(title, text) {
  if (isNative()) {
    const { Share } = await import('@capacitor/share');
    await Share.share({ title, text });
    return true;
  }
  if (navigator.share) {
    await navigator.share({ title, text });
    return true;
  }
  return false;
}
