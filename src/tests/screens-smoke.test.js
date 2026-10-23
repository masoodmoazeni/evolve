import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';

// بازمانده‌های اعلان سیستمی («زمان‌بندی دقیق») نباید به صفحهٔ تمرکز برگردند؛ مرجع تعریف‌نشده کل صفحه را خراب می‌کرد
describe('Focus screen', () => {
  const src = readFileSync(new URL('../screens/Focus.jsx', import.meta.url), 'utf8');
  it('به متغیر تعریف‌نشدهٔ exact و openExactAlarmSettings ارجاع نمی‌دهد', () => {
    expect(src).not.toMatch(/\bexact\b/);
    expect(src).not.toMatch(/openExactAlarmSettings/);
  });
});
