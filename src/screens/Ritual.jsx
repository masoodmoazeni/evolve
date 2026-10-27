import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, useKV } from '../db.js';
import { Card, Ck, Page, Skeleton, Top } from '../ui.jsx';
import { dateKey, faNum } from '../util.js';
import { capacityMin, fmtMinutes, plannedMin } from '../capacityLogic.js';

export const DEFAULT_RITUALS = { morning: { on: false, at: '07:30' }, evening: { on: false, at: '21:00' } };

function Step({ done, title, to, cta = 'شروع' }) {
  return (
    <Card>
      <div className="row"><Ck status={done ? 'done' : 'planned'} /><span className="grow">{title}</span><Link className="btn sm" to={to}>{cta}</Link></div>
    </Card>
  );
}

// آیین‌ها فقط مسیر هدایت‌شده روی صفحه‌های موجودند؛ هیچ رگه یا شمارنده‌ای نگه‌داری نمی‌شود
export function Ritual({ kind }) {
  const today = dateKey();
  const tasks = useLiveQuery(() => db.tasks.where('date').equals(today).toArray(), [today], undefined);
  const [dayPlan] = useKV('dayPlan', null);
  const [rest] = useKV('rest', []);
  const [intent] = useKV(`intent:${today}`, '');
  if (!tasks || dayPlan === undefined || rest === undefined || intent === undefined) return <Page tabs={false}><Top title="آیین" close="/today" /><Skeleton /></Page>;
  const cap = capacityMin(dayPlan, today, rest);
  const { minutes } = plannedMin(tasks);
  if (kind === 'morning') {
    return (
      <Page tabs={false}>
        <Top title="آیین صبح" close="/today" />
        <p className="s">دو دقیقه برای شروع روزت · هر مرحله قابل‌رد است</p>
        <Step done={!!intent} title="نیت امروز" to="/today" />
        <Step done={tasks.some((t) => t.priority)} title="سه اولویت امروز" to="/plan" />
        <Step done={false} title={cap ? `نگاه به ظرفیت: ${fmtMinutes(minutes)} از ${fmtMinutes(cap)}` : 'نگاه به خط زمانی'} to={`/calendar/day/${today}`} cta="دیدن" />
        <Card kind="ai"><span className="ai-tag">راهنما</span><p className="xs">اینجا شمارندهٔ روز یا رگه‌ای نیست؛ فقط یک شروع آرام.</p></Card>
      </Page>
    );
  }
  const done = tasks.filter((t) => t.done).length;
  return (
    <Page tabs={false}>
      <Top title="آیین شب" close="/today" />
      <p className="s">دو دقیقه برای شبت · هر مرحله قابل‌رد است</p>
      <Step done={done > 0} title={`انجام‌شده‌های امروز${done ? `: ${faNum(done)} کار` : ''}`} to="/today" cta="دیدن" />
      <Step done={false} title="مرور کوتاه روز" to="/review/day" />
      <Step done={false} title="سه کار فردا" to="/review/tomorrow" />
      <Card kind="ai"><span className="ai-tag">راهنما</span><p className="xs">اینجا شمارندهٔ روز یا رگه‌ای نیست؛ فقط یک پایان آرام برای روزت.</p></Card>
    </Page>
  );
}
export const RitualMorning = () => <Ritual kind="morning" />;
export const RitualEvening = () => <Ritual kind="evening" />;
