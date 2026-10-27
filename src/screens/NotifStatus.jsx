import { useCallback, useEffect, useState } from 'react';
import { Card } from '../ui.jsx';
import { batteryUnrestricted, exactAlarmState, isNative, openBatterySettings, openExactAlarmSettings, openNotificationSettings, lastSyncError, pendingCount, permissionState, requestPermission, sendTestNotification, syncNotifications } from '../notify.js';
import { faNum } from '../util.js';

const PERM_TEXT = {
  granted: 'اعلان‌ها مجازند.',
  denied: 'اعلان‌ها هنوز مجاز نشده‌اند. بدون مجوز، وقتی اپ بسته است خبری نمی‌رسد.',
  unavailable: 'بخش اعلان در این نسخهٔ نصب‌شده نیست. اپ را دوباره بیلد و نصب کن (راهنما در README).',
  web: 'اعلان سیستمی در اپ موبایل فعال می‌شود.',
};

export function useNotifStatus() {
  const [st, setSt] = useState(null);
  const refresh = useCallback(async () => {
    await syncNotifications();
    const [perm, exact, battery, pending] = await Promise.all([permissionState(), exactAlarmState(), batteryUnrestricted(), pendingCount()]);
    setSt({ perm, exact, battery, pending });
  }, []);
  useEffect(() => {
    refresh();
    document.addEventListener('visibilitychange', refresh);
    return () => document.removeEventListener('visibilitychange', refresh);
  }, [refresh]);
  return [st, refresh];
}

// کارت مجوز: وضعیت روشن، درخواست مجوز، باز کردن تنظیمات سیستم و اعلان آزمایشی
export function NotifPermissionCard({ full = false }) {
  const [st, refresh] = useNotifStatus();
  const [msg, setMsg] = useState('');
  if (!st) return null;
  const native = isNative();
  if (!native && !full) return null;
  const ask = async () => { await requestPermission(); await syncNotifications(); await refresh(); };
  const test = async () => {
    const r = await sendTestNotification();
    setMsg({ ok: 'اعلان آزمایشی تا پنج ثانیهٔ دیگر می‌رسد. اگر نیامد، اپ را ببند و منتظر بمان یا تنظیمات پایین را بررسی کن.', denied: 'مجوز اعلان داده نشده است.', unavailable: 'ارسال اعلان ممکن نشد؛ اپ را دوباره بیلد و نصب کن.', web: PERM_TEXT.web }[r]);
    refresh();
  };
  return (
    <Card kind={st.perm === 'granted' ? 'mint' : 'sand'}>
      <span className="lbl">اعلان‌های سیستمی</span>
      <p className="s" role="status">{PERM_TEXT[st.perm]}</p>
      {native && st.perm === 'denied' && (
        <>
          <button className="btn" onClick={ask}>اجازهٔ اعلان</button>
          <button className="btn s2 sm" onClick={async () => { await openNotificationSettings(); }}>باز کردن تنظیمات اعلان گوشی</button>
        </>
      )}
      {native && full && (
        <>
          {st.perm === 'granted' && <button className="btn s2 sm" onClick={openNotificationSettings}>تنظیمات اعلان گوشی</button>}
          <p className="s">هشدار دقیق (آلارم‌ها و یادآورها): {st.exact === 'granted' ? 'مجاز' : 'غیرفعال؛ اعلان ممکن است با تأخیر برسد.'}</p>
          {st.exact !== 'granted' && <button className="btn s2 sm" onClick={openExactAlarmSettings}>اجازهٔ «آلارم‌ها و یادآورها»</button>}
          <p className="s">بهینه‌سازی باتری: {st.battery === false ? 'فعال؛ ممکن است گوشی اپ را ببندد و اعلان نرسد.' : st.battery ? 'محدودیتی نیست' : 'نامشخص'}</p>
          {st.battery === false && <button className="btn s2 sm" onClick={openBatterySettings}>برداشتن محدودیت باتری برای اِوالو</button>}
          {st.pending != null && <p className="xs">اعلان‌های زمان‌بندی‌شده: {faNum(st.pending)}</p>}
          {lastSyncError() && <p className="xs" role="status">آخرین خطای زمان‌بندی: {lastSyncError()}</p>}
          <button className="btn s2 sm" onClick={test}>ارسال اعلان آزمایشی</button>
          {msg && <p className="xs" role="status">{msg}</p>}
        </>
      )}
    </Card>
  );
}
