const pad = (n) => String(n).padStart(2, '0');

// کلید تاریخ میلادی محلی به شکل yyyy-mm-dd
export function dateKey(d = new Date()) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDays(key, n) {
  const [y, m, d] = key.split('-').map(Number);
  return dateKey(new Date(y, m - 1, d + n));
}

const FA_DIGITS = '۰۱۲۳۴۵۶۷۸۹';
export const faNum = (n) => String(n).replace(/\d/g, (d) => FA_DIGITS[d]);

export const JMONTHS = ['فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور', 'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'];
export const WEEKDAYS = ['شنبه', 'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه'];
export const WEEKDAYS_SHORT = ['ش', 'ی', 'د', 'س', 'چ', 'پ', 'ج'];

const toDate = (key) => {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d, 12);
};

const pf = new Intl.DateTimeFormat('fa-IR-u-ca-persian-nu-latn', { year: 'numeric', month: 'numeric', day: 'numeric' });

export function jalali(key) {
  const p = Object.fromEntries(pf.formatToParts(toDate(key)).map((x) => [x.type, x.value]));
  return { y: Number(p.year), m: Number(p.month), d: Number(p.day) };
}

// شنبه = ۰ … جمعه = ۶
export const weekdayIdx = (key) => (toDate(key).getDay() + 1) % 7;
export const weekStart = (key) => addDays(key, -weekdayIdx(key));
export const diffDays = (a, b) => Math.round((toDate(a) - toDate(b)) / 86400000);

export function fmtDate(key, withWeekday = false) {
  if (key === 'someday') return 'بدون زمان';
  const j = jalali(key);
  const base = `${faNum(j.d)} ${JMONTHS[j.m - 1]}`;
  return withWeekday ? `${WEEKDAYS[weekdayIdx(key)]} ${base}` : base;
}

export const nowTime = (d = new Date()) => `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
export const timeToMin = (t) => (t ? Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5)) : 0);

export const fmtDateFull = (key) => (key ? `${fmtDate(key)} ${faNum(jalali(key).y)}` : '');
