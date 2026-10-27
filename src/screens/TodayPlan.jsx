import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, setKV, useKV } from '../db.js';
import { Card, Ck, useToast } from '../ui.jsx';
import { addDays, dateKey, faNum, fmtDate, weekStart } from '../util.js';
import { loadWeekPlan, outcomeProgress, saveWeekPlan } from '../weekPlanLogic.js';
import { needsBackupNudge } from '../backupLogic.js';
import { isRest, justReturned } from '../restLogic.js';

// «نتیجه‌های این هفته» با تیک دستی و پیشرفت از کارهای وصل‌شده
export function WeekOutcomesCard({ today }) {
  const ws = weekStart(today);
  const [plan, setPlan] = useState(null);
  const tasks = useLiveQuery(() => db.tasks.where('date').between(ws, addDays(ws, 6), true, true).toArray(), [ws], []);
  useEffect(() => { loadWeekPlan(ws).then(setPlan); }, [ws]);
  if (!plan || !plan.outcomes.length) return null;
  const rows = outcomeProgress(plan, tasks);
  const toggle = async (id) => {
    const next = { ...plan, outcomes: plan.outcomes.map((o) => (o.id === id ? { ...o, done: !o.done } : o)) };
    setPlan(next);
    await saveWeekPlan(ws, next);
  };
  return (
    <Card kind="mint">
      <span className="lbl">نتیجه‌های این هفته</span>
      {rows.map((o) => (
        <button key={o.id} className="rowbtn" aria-pressed={o.done} onClick={() => toggle(o.id)}>
          <Ck status={o.done ? 'done' : 'planned'} />
          <span className="grow">{o.title}{o.total > 0 && <span className="xs" style={{ display: 'block' }}>{faNum(o.doneCount)} از {faNum(o.total)} کار</span>}</span>
        </button>
      ))}
    </Card>
  );
}

// یادآور پشتیبان‌گیری؛ «بعداً» فقط زمان نمایش بعدی را عقب می‌برد
export function BackupNudge({ today }) {
  const [lastExport] = useKV('lastExport', null);
  const [nudgeAt] = useKV('exportNudgeAt', null);
  const [profile] = useKV('profile', null);
  if (lastExport === undefined || nudgeAt === undefined || profile === undefined) return null;
  const firstUse = profile?.createdAt ? dateKey(new Date(profile.createdAt)) : null;
  if (!needsBackupNudge({ lastExport, firstUse, today, nudgeAt })) return null;
  return (
    <Card kind="sand">
      <span className="lbl" style={{ color: '#6B5B3A' }}>پشتیبان</span>
      <p className="s" style={{ color: '#4A4030' }}>یک نسخهٔ پشتیبان بگیر؛ داده‌هایت فقط روی همین گوشی است.</p>
      <div className="g2">
        <Link className="btn sm" to="/privacy/export">گرفتن خروجی</Link>
        <button className="btn sm s2" onClick={() => setKV('exportNudgeAt', today)}>بعداً</button>
      </div>
    </Card>
  );
}

// روز استراحت: کارت جدا (نه «ثبت‌نشده») و «خوش برگشتی» یک روز بعد از پایان بازه
export function RestCards({ today, rest }) {
  const toast = useToast();
  const back = justReturned(today, rest);
  const [dismissed] = useKV(`restBack:${today}`, false);
  if (dismissed === undefined) return null;
  if (isRest(today, rest)) {
    return <Card kind="mint"><span className="lbl">روز استراحت</span><p className="s">امروز در بازهٔ استراحتی. هیچ‌چیز «ثبت‌نشده» حساب نمی‌شود.</p></Card>;
  }
  if (back && !dismissed) {
    return (
      <Card kind="mint">
        <b>خوش برگشتی.</b>
        <p className="s">اگر خواستی، با نسخهٔ حداقلِ یک عادت شروع کن.</p>
        <button className="btn sm s2" onClick={() => { setKV(`restBack:${today}`, true); toast(`بازهٔ ${fmtDate(back.from)} تمام شد.`); }}>باشه</button>
      </Card>
    );
  }
  return null;
}
