import { describe, expect, it, vi } from 'vitest';

// پراکسی Capacitor برای هر ویژگی، از جمله then، تابع برمی‌گرداند؛ await روی آن هرگز تمام نمی‌شود
const capProxy = (impl) => new Proxy({}, { get: (_, k) => impl[k] ?? (() => new Promise(() => {})) });

vi.mock('@capacitor/core', () => ({ Capacitor: { isNativePlatform: () => true }, registerPlugin: () => capProxy({}) }));
vi.mock('@capacitor/local-notifications', () => ({
  LocalNotifications: capProxy({ checkPermissions: async () => ({ display: 'granted' }), getPending: async () => ({ notifications: [{ id: 1 }, { id: 2 }] }) }),
}));

describe('اعلان در نسخهٔ بومی', () => {
  it('وضعیت مجوز بدون گیر کردن روی پراکسی پلاگین خوانده می‌شود', async () => {
    const { permissionState, pendingCount } = await import('../notify.js');
    expect(await permissionState()).toBe('granted');
    expect(await pendingCount()).toBe(2);
  });
});
