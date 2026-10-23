import { useEffect, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useKV } from './db.js';
import { DEFAULT_NOTIF } from './notify.js';
import { fmtClock, remainingMs } from './focusLogic.js';
import { Icon } from './ui.jsx';
import './focusMini.css';

// نوار کوچک تایمر روی همهٔ صفحه‌ها وقتی جلسهٔ تمرکز در جریان است
export default function FocusMini() {
  const { pathname } = useLocation();
  const [run] = useKV('focusRun', null);
  const [stored] = useKV('notif', {});
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const cfg = { ...DEFAULT_NOTIF, ...(stored || {}) };
  if (!run || run.endedAt || !cfg.timerOnScreen || pathname.startsWith('/focus/run') || pathname.startsWith('/focus/end')) return null;
  const left = remainingMs(run, now);
  return (
    <Link to="/focus/run" className="focus-mini" aria-label="بازگشت به جلسهٔ تمرکز">
      <Icon name="timer" />
      <span className="grow">{run.title}</span>
      <strong>{run.pausedAt ? 'مکث' : left <= 0 ? 'تمام شد' : fmtClock(left)}</strong>
    </Link>
  );
}
