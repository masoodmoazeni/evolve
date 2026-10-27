import TimeField from '../TimeField.jsx';
import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.js';
import { DURATIONS, MAX_PRIORITIES } from '../data.js';
import { Chip, Field, Sheet, Toggle, useToast } from '../ui.jsx';
import { canAddPriority, emptyHabit, toHabitRecord, validateHabit } from './habitLogic.js';

const KINDS = [
  { key: 'task', label: 'کار' },
  { key: 'habit', label: 'عادت' },
  { key: 'note', label: 'یادداشت' },
];

export default function AddSheet({ today, onClose }) {
  const toast = useToast();
  const todays = useLiveQuery(() => db.tasks.where('date').equals(today).toArray(), [today], []);
  const [kind, setKind] = useState('task');
  const [title, setTitle] = useState('');
  const [time, setTime] = useState('');
  const [priority, setPriority] = useState(false);
  const [minutes, setMinutes] = useState(null);
  const [custom, setCustom] = useState('');
  const [amount, setAmount] = useState('');
  const [cue, setCue] = useState('');
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const room = canAddPriority(todays);

  async function save() {
    try {
      if (kind === 'task') {
        if (!title.trim()) return setErr('یک نام کوتاه برای کار بنویس.');
        if (minutes === 'custom' && !(Number(custom) > 0)) return setErr('مدت دلخواه را با عدد دقیقه بنویس.');
        const id = await db.tasks.add({ title: title.trim(), date: today, time: time || null, minutes: minutes === 'custom' ? Math.round(Number(custom)) : minutes || null, priority: priority && room, goalId: null, done: false });
        toast('کار اضافه شد', () => db.tasks.delete(id));
      } else if (kind === 'habit') {
        const form = { ...emptyHabit(), title, amount, cue };
        const e = validateHabit(form);
        if (e.title || e.amount) return setErr(e.title || e.amount);
        const id = await db.habits.add(toHabitRecord(form));
        toast('عادت اضافه شد', () => db.habits.delete(id));
      } else {
        if (!text.trim()) return setErr('چیزی بنویس تا ذخیره شود.');
        const id = await db.notes.add({ date: today, text: text.trim(), tags: [], ts: Date.now() });
        toast('یادداشت ذخیره شد', () => db.notes.delete(id));
      }
      onClose();
    } catch {
      toast('نتوانستیم ذخیره کنیم؛ دوباره امتحان کن. داده‌هایت امن است.');
    }
  }

  const pick = (k) => {
    setKind(k);
    setErr('');
  };

  return (
    <Sheet title="افزودن سریع" onClose={onClose}>
      <div className="chips" role="group" aria-label="نوع">
        {KINDS.map((k) => (
          <Chip key={k.key} on={kind === k.key} onClick={() => pick(k.key)}>
            {k.label}
          </Chip>
        ))}
      </div>
      {kind === 'note' ? (
        <Field label="یادداشت" error={err}>
          <textarea className={`in${err ? ' e' : ''}`} value={text} onChange={(e) => setText(e.target.value)} />
        </Field>
      ) : (
        <Field label={kind === 'task' ? 'نام کار' : 'نام عادت'} error={err}>
          <input className={`in${err ? ' e' : ''}`} value={title} onChange={(e) => setTitle(e.target.value)} />
        </Field>
      )}
      {kind === 'task' && (
        <>
          <Field label="ساعت (اختیاری)">
            <TimeField value={time} onChange={setTime} label="ساعت" />
          </Field>
          <div className="col">
            <span className="lbl">مدت انجام (اختیاری)</span>
            <div className="chips" role="group" aria-label="مدت انجام">
              {DURATIONS.map((d) => (
                <Chip key={d.min} on={minutes === d.min} onClick={() => setMinutes(minutes === d.min ? null : d.min)}>{d.label}</Chip>
              ))}
              <Chip on={minutes === 'custom'} onClick={() => setMinutes(minutes === 'custom' ? null : 'custom')}>دلخواه</Chip>
            </div>
            {minutes === 'custom' && (
              <input className="in" type="number" inputMode="numeric" min="1" max="1440" aria-label="مدت دلخواه به دقیقه" placeholder="دقیقه" value={custom} onChange={(e) => setCustom(e.target.value)} />
            )}
          </div>
          <div className="row">
            <span className="grow s">اولویت امروز</span>
            <Toggle on={priority && room} onChange={(v) => room && setPriority(v)} label="اولویت امروز" />
          </div>
          {!room && <p className="xs">حداکثر {MAX_PRIORITIES === 3 ? 'سه' : MAX_PRIORITIES} اولویت در روز؛ این کار به «کارهای دیگر» می‌رود.</p>}
        </>
      )}
      {kind === 'habit' && (
        <>
          <Field label="مقدار (دقیقه، اختیاری)">
            <input className="in" type="number" inputMode="numeric" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <Field label="نشانهٔ شروع (اختیاری)">
            <input className="in" value={cue} placeholder="مثلاً بعد از صبحانه" onChange={(e) => setCue(e.target.value)} />
          </Field>
        </>
      )}
      <button className="btn" onClick={save}>
        ذخیره
      </button>
    </Sheet>
  );
}
