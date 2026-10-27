import TimeField from '../TimeField.jsx';
import { useState } from 'react';
import { db } from '../db.js';
import { EFFORT, MAX_PRIORITIES } from '../data.js';
import { skipInstance } from '../recurLogic.js';
import RecurPicker, { defaultRule, ruleError } from './RecurPicker.jsx';
import DateField from '../DateField.jsx';
import { useLiveQuery } from 'dexie-react-hooks';
import { Card, Chip, Ck, Dialog, Field, Icon, Select, Sheet, Toggle, useToast } from '../ui.jsx';
import { addDays, dateKey, faNum, fmtDate } from '../util.js';
import './Plan.css';

const DATE_CHOICES = (today) => [
  { key: today, label: 'امروز' },
  { key: addDays(today, 1), label: 'فردا' },
  { key: 'someday', label: 'بدون زمان' },
];

export function TaskRow({ task }) {
  const toast = useToast();
  const toggle = async () => {
    const was = !!task.done;
    await db.tasks.update(task.id, { done: !was });
    if (!was) toast('کار انجام‌شده ثبت شد.', () => db.tasks.update(task.id, { done: false }));
  };
  return (
    <div className="task-row">
      <button className="tk" aria-label={task.done ? `برگرداندن «${task.title}» به برنامه` : `انجام شد: ${task.title}`} onClick={toggle}>
        <Ck status={task.done ? 'done' : 'planned'} />
      </button>
      <TaskText task={task} />
    </div>
  );
}

// نشان انرژی با شکل: سنگین ۳ خط، متوسط ۲، سبک ۱
export function EffortMark({ effort }) {
  const e = EFFORT.find((x) => x.key === effort);
  if (!e) return null;
  return (
    <svg className="eff" viewBox="0 0 12 12" role="img" aria-label={`انرژی ${e.label}`} width="12" height="12">
      {Array.from({ length: e.weight }, (_, i) => <path key={i} d={`M1 ${3 + i * 3}h10`} />)}
    </svg>
  );
}

function TaskText({ task, onEdit }) {
  const [open, setOpen] = useState(false);
  const meta = [task.time && faNum(task.time), task.minutes && `${faNum(task.minutes)} دقیقه`].filter(Boolean).join(' · ');
  return (
    <>
      <button className="txt" aria-label={`ویرایش «${task.title}»`} onClick={onEdit ?? (() => setOpen(true))}>
        <span className={task.done ? 'done-t' : ''} style={{ fontWeight: 600 }}>{task.title}</span>
        {(meta || task.effort) && <span className="xs">{task.effort && <EffortMark effort={task.effort} />}{meta}</span>}
      </button>
      {open && <TaskSheet task={task} date={task.date} onClose={() => setOpen(false)} />}
    </>
  );
}

export function TaskSheet({ task, date, preset, onClose }) {
  const toast = useToast();
  const today = dateKey();
  const [f, setF] = useState({
    title: task?.title ?? '',
    time: task?.time ?? preset?.time ?? '',
    minutes: task?.minutes ?? preset?.minutes ?? '',
    priority: !!task?.priority,
    date: task?.date ?? date ?? today,
    goalId: task?.goalId == null ? '' : String(task.goalId),
    effort: task?.effort ?? '',
    important: !!task?.important,
    deadline: task?.deadline ?? '',
  });
  const [rule, setRule] = useState(defaultRule(task?.date ?? date ?? today));
  const goals = useLiveQuery(() => db.goals.where('status').equals('active').toArray(), [], []);
  const [err, setErr] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));

  const countPriority = async (d) =>
    (await db.tasks.where('date').equals(d).filter((t) => t.priority && t.id !== task?.id).count());

  const save = async () => {
    if (!f.title.trim()) return setErr('یک عنوان کوتاه بنویس.');
    let priority = f.priority && f.date !== 'someday';
    if (priority && (await countPriority(f.date)) >= MAX_PRIORITIES) priority = false;
    const re = !task && rule.type !== 'none' ? ruleError(rule) : '';
    if (re) return setErr(re);
    const rec = { title: f.title.trim(), date: f.date, time: f.time || '', minutes: f.minutes ? Number(f.minutes) : null, priority, goalId: f.goalId === '' ? null : Number(f.goalId), effort: f.effort || null, important: f.important, deadline: f.deadline || null };
    if (task) await db.tasks.update(task.id, rec);
    else if (rule.type !== 'none' && f.date !== 'someday') {
      const rid = await db.recurring.add({ title: rec.title, time: rec.time, minutes: rec.minutes, priority, goalId: rec.goalId, effort: rec.effort, rule, startDate: f.date, endDate: null, status: 'active', skip: [] });
      await db.tasks.add({ ...rec, done: false, recurId: rid });
    } else await db.tasks.add({ ...rec, done: false });
    if (f.priority && !priority) toast('سه اولویت پر است؛ این کار به «کارهای دیگر» رفت.');
    onClose();
  };

  const remove = async () => {
    const copy = { ...task };
    const unskip = await skipInstance(task);
    await db.tasks.delete(task.id);
    setConfirmDel(false);
    onClose();
    toast('کار حذف شد.', async () => { await db.tasks.add(copy); await unskip?.(); });
  };

  return (
    <Sheet title={task ? 'ویرایش کار' : 'کار تازه'} onClose={onClose}>
      <Field label="عنوان" error={err}>
        <input className={`in${err ? ' e' : ''}`} value={f.title} onChange={(e) => { set('title', e.target.value); setErr(''); }} placeholder="مثلاً: نوشتن گزارش" />
      </Field>
      <div className="g2">
        <Field label="ساعت (اختیاری)">
          <TimeField value={f.time} onChange={(v) => set('time', v)} label="ساعت کار" />
        </Field>
        <Field label="مدت (دقیقه)">
          <input className="in" type="number" inputMode="numeric" min="0" value={f.minutes} onChange={(e) => set('minutes', e.target.value)} />
        </Field>
      </div>
      <Field label="مرتبط با هدف (اختیاری)">
        <Select label="هدف این کار" value={f.goalId} onChange={(v) => set('goalId', String(v))} options={[{ value: '', label: 'بدون هدف' }, ...goals.map((g) => ({ value: String(g.id), label: g.title }))]} />
      </Field>
      <div className="col">
        <span className="lbl">زمان</span>
        <div className="chips">
          {DATE_CHOICES(today).map((c) => (
            <Chip key={c.key} on={f.date === c.key} onClick={() => set('date', c.key)}>{c.label}</Chip>
          ))}
          {!DATE_CHOICES(today).some((c) => c.key === f.date) && <Chip on>{fmtDate(f.date)}</Chip>}
        </div>
      </div>
      <div className="col">
        <span className="lbl">انرژی این کار (اختیاری)</span>
        <div className="chips" role="group" aria-label="انرژی کار">
          {EFFORT.map((e) => <Chip key={e.key} on={f.effort === e.key} onClick={() => set('effort', f.effort === e.key ? '' : e.key)}>{e.label}</Chip>)}
        </div>
      </div>
      <div className="row">
        <span className="grow">مهم است</span>
        <Toggle on={f.important} onChange={(v) => set('important', v)} label="مهم است" />
      </div>
      <Field label="مهلت (اختیاری)">
        <DateField value={f.deadline} onChange={(v) => set('deadline', v)} placeholder="بدون مهلت" label="مهلت" />
      </Field>
      {!task && f.date !== 'someday' && <RecurPicker rule={rule} onChange={setRule} />}
      <div className="row">
        <div className="grow">
          <h3>اولویت</h3>
          <p className="xs">حداکثر ۳ اولویت در روز؛ بقیه «کارهای دیگر» می‌مانند.</p>
        </div>
        <Toggle on={f.priority} onChange={(v) => set('priority', v)} label="اولویت امروز" />
      </div>
      <button className="btn" onClick={save}>ذخیره</button>
      {task && <button className="btn t" onClick={() => setConfirmDel(true)}>حذف کار</button>}
      {confirmDel && (
        <Dialog title="این کار حذف شود؟" text="بعد از حذف تا چند ثانیه می‌توانی بازگردانی کنی." confirm="حذف" danger onConfirm={remove} onCancel={() => setConfirmDel(false)} />
      )}
    </Sheet>
  );
}

// فهرست کارهای یک روز: اولویت‌ها و کارهای دیگر
export function TaskList({ tasks }) {
  const pri = tasks.filter((t) => t.priority);
  const rest = tasks.filter((t) => !t.priority);
  return (
    <>
      {pri.length > 0 && (
        <Card kind="mint">
          <span className="lbl">اولویت‌ها</span>
          {pri.map((t) => <TaskRow key={t.id} task={t} />)}
        </Card>
      )}
      {rest.length > 0 && (
        <Card>
          <span className="lbl">{pri.length ? 'کارهای دیگر' : 'کارها'}</span>
          {rest.map((t) => <TaskRow key={t.id} task={t} />)}
        </Card>
      )}
    </>
  );
}

export const AddIcon = () => <Icon name="plus" size={26} />;
