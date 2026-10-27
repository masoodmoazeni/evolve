import { useState } from 'react';
import { db, useKV } from '../db.js';
import { Card, Sheet, useToast, Field } from '../ui.jsx';
import { addDays, faNum } from '../util.js';
import { capacityMin, capacityText, fmtMinutes, loadState, plannedMin } from '../capacityLogic.js';
import { applyTemplate, saveDayAsTemplate } from '../recurLogic.js';
import { moveTask } from '../weekPlanLogic.js';
import { useLiveQuery } from 'dexie-react-hooks';

// نوار ظرفیت روز؛ در روز استراحت پنهان است
export function CapacityBar({ tasks, date }) {
  const toast = useToast();
  const [dayPlan] = useKV('dayPlan', null);
  const [rest] = useKV('rest', []);
  if (dayPlan === undefined || rest === undefined) return null;
  const cap = capacityMin(dayPlan, date, rest);
  if (cap === 0) return null;
  const { minutes, unestimated } = plannedMin(tasks);
  if (!tasks.some((t) => !t.done)) return null;
  const state = loadState(minutes, cap);
  const movable = tasks.filter((t) => !t.done && !t.priority).sort((a, b) => (b.minutes || 0) - (a.minutes || 0))[0];
  const toTomorrow = async () => {
    const undo = await moveTask(movable, addDays(date, 1));
    toast('به فردا رفت.', undo);
  };
  return (
    <Card kind={state === 'over' ? 'sand' : ''}>
      <div className="row"><span className="lbl grow">ظرفیت امروز</span><span className="xs">{fmtMinutes(minutes)} از {fmtMinutes(cap)}</span></div>
      <div className={`cap-bar ${state}`} role="img" aria-label={`برنامه‌ریزی‌شده ${fmtMinutes(minutes)} از ${fmtMinutes(cap)}`}><i style={{ width: `${Math.min(100, Math.round((minutes / cap) * 100))}%` }} /></div>
      <p className="s">{capacityText(state, minutes, cap)}</p>
      {unestimated > 0 && <p className="xs">{faNum(unestimated)} کار مدت ندارد و در این جمع نیست.</p>}
      {state === 'over' && movable && <button className="btn s2 sm" onClick={toTomorrow}>ببر به فردا: {movable.title}</button>}
    </Card>
  );
}

// قالب‌های روز: اعمال و «ذخیرهٔ این روز به‌عنوان قالب»
export function TemplatesSheet({ date, onClose }) {
  const toast = useToast();
  const list = useLiveQuery(() => db.dayTemplates.toArray(), [], []);
  const [name, setName] = useState('');
  const apply = async (t) => {
    const undo = await applyTemplate(t, date);
    toast('قالب اعمال شد.', undo);
    onClose();
  };
  const save = async () => {
    const undo = await saveDayAsTemplate(date, name);
    toast('قالب ذخیره شد.', undo);
    onClose();
  };
  return (
    <Sheet title="قالب‌های روز" onClose={onClose}>
      {list.length === 0 && <p className="s">هنوز قالبی نداری. یک روز خوب را به‌عنوان قالب ذخیره کن.</p>}
      {list.map((t) => (
        <div key={t.id} className="row">
          <span className="grow">{t.title} <span className="xs">· {faNum(t.items.length)} کار</span></span>
          <button className="btn sm s2" onClick={() => apply(t)}>اعمال</button>
          <button className="btn sm t" aria-label={`حذف قالب ${t.title}`} onClick={() => db.dayTemplates.delete(t.id)}>حذف</button>
        </div>
      ))}
      <Field label="ذخیرهٔ همین روز به‌عنوان قالب"><input className="in" value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً روز کاری" /></Field>
      <button className="btn" onClick={save}>ذخیره</button>
    </Sheet>
  );
}
