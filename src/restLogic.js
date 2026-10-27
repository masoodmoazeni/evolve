import { addDays, diffDays } from './util.js';

export const MAX_REST_DAYS = 60;

export const isRest = (date, rest = []) => rest.some((r) => date >= r.from && date <= r.to);
export const restCount = (dates, rest = []) => dates.filter((d) => isRest(d, rest)).length;

// بازهٔ فعال امروز (برای کارت «خوش برگشتی» یک روز بعد از پایان)
export const justReturned = (today, rest = []) => rest.find((r) => addDays(r.to, 1) === today) ?? null;

export function validateRest({ from, to }, rest = [], ignoreId = null) {
  if (!from || !to) return 'شروع و پایان بازه را انتخاب کن.';
  if (to < from) return 'پایان بازه نباید پیش از شروع باشد.';
  if (diffDays(to, from) + 1 > MAX_REST_DAYS) return 'بازهٔ استراحت حداکثر ۶۰ روز است.';
  if (rest.some((r) => r.id !== ignoreId && from <= r.to && to >= r.from)) return 'این بازه با یک استراحت دیگر هم‌پوشانی دارد.';
  return '';
}

export const newRest = (from, to, label = '') => ({ id: `${Date.now()}${Math.floor(Math.random() * 1000)}`, from, to, label: label.trim() });
