import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, useKV } from '../db.js';
import { Card, Chip, Empty, Fab, Page, Skeleton, Top } from '../ui.jsx';
import { fmtDate, faNum } from '../util.js';
import { DEFAULT_DAY_PLAN } from '../capacityLogic.js';
import { layoutDay, minToTime } from '../timelineLogic.js';
import { isRest } from '../restLogic.js';
import { timeToMin } from '../util.js';
import { CapacityBar } from './PlanParts.jsx';
import { EffortMark, TaskList, TaskSheet } from './TaskUI.jsx';
import './Plan.css';

const HOUR = 48; // ارتفاع ثابت هر ساعت

function Timeline({ date, tasks, focus, dayPlan, onGap, onTask }) {
  const lay = layoutDay({ tasks, focus, dayPlan, date });
  const p = { ...DEFAULT_DAY_PLAN, ...(dayPlan ?? {}) };
  const from = Math.floor(timeToMin(p.start) / 60);
  const to = Math.ceil(timeToMin(p.end) / 60);
  const top = (m) => ((m - from * 60) / 60) * HOUR;
  const hours = Array.from({ length: to - from + 1 }, (_, i) => from + i);
  return (
    <>
      <div className="tlx" style={{ height: (to - from) * HOUR }} role="list" aria-label="خط زمانی روز">
        {hours.map((h) => <span key={h}><span className="ln" style={{ top: top(h * 60) }} /><span className="hr" style={{ top: top(h * 60) }}>{faNum(String(h).padStart(2, '0'))}</span></span>)}
        {lay.gaps.map((g) => (
          <button key={`g${g.start}`} className="gap" style={{ top: top(g.start) + 2, height: Math.max(24, top(g.end) - top(g.start) - 4) }} onClick={() => onGap(g)} aria-label={`جای خالی ${g.minutes} دقیقه؛ کار تازه`}>
            جا: {faNum(Math.floor(g.minutes / 60))} س {faNum(g.minutes % 60)} د · ضربه بزن
          </button>
        ))}
        {lay.blocks.map((b) => {
          const half = lay.blocks.some((o) => o !== b && o.lane !== b.lane && o.start < b.end && o.end > b.start);
          const task = b.taskId ? tasks.find((t) => t.id === b.taskId) : null;
          return (
            <div key={b.id} role="listitem" className={`blk ${b.kind}${b.done ? ' done' : ''}`}
              style={{ top: top(b.start), height: Math.max(22, top(b.end) - top(b.start) - 2), insetInlineStart: half ? (b.lane ? '52%' : '4px') : '4px', width: half ? '46%' : 'calc(100% - 8px)' }}>
              <button className="lnk" style={{ color: 'inherit', textAlign: 'right' }} onClick={() => task && onTask(task)}>{b.title}</button>
              {b.effort && <EffortMark effort={b.effort} />}
              {task && !task.done && <Link className="lnk" style={{ color: 'inherit' }} to={`/focus?task=${task.id}`}> · شروع تمرکز</Link>}
            </div>
          );
        })}
      </div>
      {lay.conflicts.length > 0 && <Card kind="sand"><span className="lbl" style={{ color: '#6B5B3A' }}>تداخل</span>{lay.conflicts.map((c) => <p key={c.id} className="s" style={{ color: '#4A4030' }}>{c.title} · {faNum(minToTime(c.start))}</p>)}</Card>}
      {lay.unscheduled.length > 0 && <Card kind="sand"><span className="lbl" style={{ color: '#6B5B3A' }}>بدون ساعت</span><p className="s" style={{ color: '#4A4030' }}>{lay.unscheduled.map((t) => t.title).join(' · ')}</p></Card>}
      <p className="xs">خط‌چین = برنامه‌ریزی‌شده، پر = انجام‌شده، فیروزه‌ای = جلسهٔ تمرکز، نقطه‌چین = جای خالی.</p>
    </>
  );
}

export function CalendarDay() {
  const { d } = useParams();
  const [adding, setAdding] = useState(null);
  const [editing, setEditing] = useState(null);
  const [view, setView] = useKV('dayView', 'list');
  const [dayPlan] = useKV('dayPlan', null);
  const [rest] = useKV('rest', []);
  const tasks = useLiveQuery(() => db.tasks.where('date').equals(d).toArray(), [d]);
  const sessions = useLiveQuery(() => db.focus.where('date').equals(d).toArray(), [d]);
  if (!tasks || !sessions || view === undefined || dayPlan === undefined || rest === undefined) return <Page tabs={false}><Top title="روز" back="/calendar" /><Skeleton /></Page>;
  return (
    <Page tabs={false}>
      <Top title={fmtDate(d, true)} back="/calendar" />
      <div className="chips" role="group" aria-label="نمای روز">
        <Chip on={view !== 'timeline'} onClick={() => setView('list')}>فهرست</Chip>
        <Chip on={view === 'timeline'} onClick={() => setView('timeline')}>خط زمانی</Chip>
      </div>
      {isRest(d, rest) && <Card kind="mint"><span className="lbl">روز استراحت</span><p className="s">در این روز هیچ‌چیز «ثبت‌نشده» حساب نمی‌شود.</p></Card>}
      <CapacityBar tasks={tasks} date={d} />
      {view === 'timeline' ? (
        <Timeline date={d} tasks={tasks} focus={sessions} dayPlan={dayPlan} onGap={(g) => setAdding({ time: minToTime(g.start), minutes: Math.min(g.minutes, 60) })} onTask={setEditing} />
      ) : tasks.length === 0 && sessions.length === 0 ? (
        <Empty title="این روز خالی است" text="خالی بودن یعنی چیزی ثبت نشده؛ نه کمبود." />
      ) : <TaskList tasks={tasks} />}
      <Fab label="افزودن کار" onClick={() => setAdding({})} />
      {adding && <TaskSheet date={d} preset={adding} onClose={() => setAdding(null)} />}
      {editing && <TaskSheet task={editing} date={d} onClose={() => setEditing(null)} />}
    </Page>
  );
}
