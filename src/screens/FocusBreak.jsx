import { useEffect, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { db, useKV } from '../db.js';
import { Page, Skeleton, Top } from '../ui.jsx';
import { breakRemainingMs, fmtClock } from '../focusLogic.js';

// استراحت کوتاه بعد از جلسه؛ زمان از startedAt حساب می‌شود
export default function FocusBreak() {
  const nav = useNavigate();
  const [b] = useKV('breakRun', null);
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(id); }, []);
  if (b === undefined) return <Page tabs={false}><Skeleton /></Page>;
  if (!b) return <Navigate to="/focus/history" replace />;
  const left = breakRemainingMs(b, now);
  const finish = async () => { await db.kv.delete('breakRun'); nav('/focus/history'); };
  return (
    <Page tabs={false}>
      <Top title="استراحت" close="/focus/history" />
      <div className="focus-timer"><div role="timer" aria-label="زمان باقی‌مانده استراحت">{fmtClock(left)}<small>{left <= 0 ? 'استراحتت تمام شد؛ هر وقت آماده بودی' : 'نفس بکش و آب بخور'}</small></div></div>
      <button className="btn" onClick={finish}>تمام</button>
    </Page>
  );
}
