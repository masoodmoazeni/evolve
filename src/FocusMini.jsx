import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useKV } from './db.js';
import { DEFAULT_NOTIF } from './notify.js';
import { fmtClock, remainingMs } from './focusLogic.js';
import { Icon } from './ui.jsx';
import './focusMini.css';

// فقط روی صفحه‌های اصلی تب‌ها (نه تمرکز، فرم‌ها و آمار) و فقط تا پایان زمان جلسه؛ قابل‌بستن
export const MINI_ROOTS = ['/today', '/goals', '/habits', '/reflect'];
const key = (run) => `evolve-mini-off:${run.startedAt}`;
const closed = (run) => {
  try { return sessionStorage.getItem(key(run)) === '1'; } catch { return false; }
};

export default function FocusMini() {
  const { pathname } = useLocation();
  const [run] = useKV('focusRun', null);
  const [stored] = useKV('notif', {});
  const [now, setNow] = useState(Date.now());
  const [, bump] = useState(0);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const cfg = { ...DEFAULT_NOTIF, ...(stored || {}) };
  if (!run || run.endedAt || run.pausedAt || !cfg.timerOnScreen || !MINI_ROOTS.includes(pathname) || closed(run)) return null;
  const left = remainingMs(run, now);
  if (left <= 0) return null;
  const hide = () => {
    try { sessionStorage.setItem(key(run), '1'); } catch { /* اختیاری */ }
    bump((n) => n + 1);
  };
  return (
    <div className="focus-mini">
      <Link to="/focus/run" className="focus-mini-link" aria-label="بازگشت به جلسهٔ تمرکز">
        <Icon name="timer" />
        <span className="grow">{run.title}</span>
        <strong>{fmtClock(left)}</strong>
      </Link>
      <button className="ib" aria-label="بستن نوار تایمر" onClick={hide}><Icon name="x" /></button>
    </div>
  );
}
