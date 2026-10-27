import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.js';
import { Card, Empty, Fab, Page, Skeleton, Top, useToast } from '../ui.jsx';
import { dateKey, faNum, fmtDate } from '../util.js';
import { TaskList, TaskSheet } from './TaskUI.jsx';
import { CapacityBar, TemplatesSheet } from './PlanParts.jsx';
import { Chip } from '../ui.jsx';
import { FILTERS, matchesFilter } from '../priorityLogic.js';
import './Plan.css';

export { Calendar, CalendarDay, CalendarWeek } from './CalendarViews.jsx';

export function Plan() {
  const today = dateKey();
  const [adding, setAdding] = useState(false);
  const [tpl, setTpl] = useState(false);
  const [filter, setFilter] = useState('all');
  const tasks = useLiveQuery(() => db.tasks.where('date').equals(today).toArray(), [today]);
  const leftover = useLiveQuery(() => db.tasks.where('date').below(today).filter((t) => !t.done).count(), [today]);
  if (!tasks) return <Page><Top title="برنامهٔ امروز" /><Skeleton /></Page>;
  const done = tasks.filter((t) => t.done).length;
  return (
    <Page tabs={false}>
      <Top title="برنامهٔ امروز" back="/today" />
      <p className="s">{fmtDate(today, true)}{tasks.length > 0 && ` · ${faNum(done)} از ${faNum(tasks.length)} کار انجام شده`}</p>
      {leftover > 0 && (
        <Card kind="sand">
          <span className="lbl" style={{ color: '#6B5B3A' }}>مانده از روزهای قبل</span>
          <p className="s" style={{ color: '#4A4030' }}>{faNum(leftover)} کار هنوز جای مشخصی ندارد. هر وقت خواستی بازبینی‌شان کن.</p>
          <Link className="btn s2 sm" to="/plan/review">بازبینی کارها</Link>
        </Card>
      )}
      <CapacityBar tasks={tasks} date={today} />
      <div className="chips" role="group" aria-label="فیلتر کارها">
        {FILTERS.map((f) => <Chip key={f.key} on={filter === f.key} onClick={() => setFilter(f.key)}>{f.label}</Chip>)}
      </div>
      {tasks.length === 0 ? (
        <Empty title="برنامهٔ امروز خالی است" text="یک یا دو کار کوچک اضافه کن؛ لازم نیست همه‌چیز را بنویسی." />
      ) : (
        <TaskList tasks={[...tasks].filter((t) => matchesFilter(t, filter, today)).sort((a, b) => (a.time || '99').localeCompare(b.time || '99'))} />
      )}
      <div className="g2">
        <Link className="btn s2 sm" to="/calendar">تقویم</Link>
        <Link className="btn s2 sm" to="/calendar/week">نمای هفته</Link>
        <button className="btn s2 sm" onClick={() => setTpl(true)}>قالب‌ها</button>
        <Link className="btn s2 sm" to="/plan/recurring">کارهای تکراری</Link>
        <Link className="btn s2 sm" to="/plan/inbox">صندوق ورودی</Link>
        <Link className="btn s2 sm" to="/plan/week">برنامهٔ هفتگی</Link>
      </div>
      {tpl && <TemplatesSheet date={today} onClose={() => setTpl(false)} />}
      <Fab label="افزودن کار" onClick={() => setAdding(true)} />
      {adding && <TaskSheet date={today} onClose={() => setAdding(false)} />}
    </Page>
  );
}

export function PlanReview() {
  const today = dateKey();
  const toast = useToast();
  const list = useLiveQuery(() => db.tasks.where('date').below(today).filter((t) => !t.done).toArray(), [today]);
  if (!list) return <Page tabs={false}><Top title="بازبینی کارها" back="/plan" /><Skeleton /></Page>;

  const act = async (t, patch, msg) => {
    const prev = { date: t.date, done: t.done, priority: t.priority };
    await db.tasks.update(t.id, patch);
    toast(msg, () => db.tasks.update(t.id, prev));
  };
  const toToday = async (t) => {
    const n = await db.tasks.where('date').equals(today).filter((x) => x.priority).count();
    return act(t, { date: today, priority: t.priority && n < 3 }, 'به امروز آمد.');
  };

  return (
    <Page tabs={false}>
      <Top title="بازبینی کارها" back="/plan" />
      <p className="s">این‌ها از روزهای قبل مانده‌اند. هر کدام را به دلخواه جابه‌جا کن؛ هیچ‌کدام عقب‌افتاده حساب نمی‌شود.</p>
      {list.length === 0 ? (
        <Empty title="چیزی برای بازبینی نیست" text="همهٔ کارها جای خودشان را دارند." action={<Link className="btn sm" to="/plan">بازگشت به برنامه</Link>} />
      ) : (
        list.map((t) => (
          <Card key={t.id}>
            <h3>{t.title}</h3>
            <span className="xs">{fmtDate(t.date)}</span>
            <div className="chips">
              <button className="chip" onClick={() => toToday(t)}>به امروز</button>
              <button className="chip out" onClick={() => act(t, { date: 'someday', priority: false }, 'به «بدون زمان» رفت.')}>بعداً</button>
              <button className="chip out" onClick={() => act(t, { done: true }, 'انجام‌شده ثبت شد.')}>انجام شده بود</button>
              <button className="chip out" onClick={async () => { const c = { ...t }; await db.tasks.delete(t.id); toast('کار کنار گذاشته شد.', () => db.tasks.add(c)); }}>کنار بگذار</button>
            </div>
          </Card>
        ))
      )}
    </Page>
  );
}
