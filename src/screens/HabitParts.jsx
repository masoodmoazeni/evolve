import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, useKV } from '../db.js';
import { setHabitLog } from '../data.js';
import { OBSTACLES } from '../logic.js';
import { dateKey, faNum, fmtDate } from '../util.js';
import { Card, Chip, Field, Sheet, STATUS_LABEL, useToast } from '../ui.jsx';
import { DIFFICULTY, logExtra, snapshotSummary } from './habitLogic.js';

const SAVE_ERR = 'نتوانستیم ذخیره کنیم؛ دوباره امتحان کن. داده‌هایت امن است.';

export const habitSub = (h) =>
  [h.amount ? `${faNum(h.amount)} دقیقه` : '', h.minVersion ? `نسخهٔ کوچک: ${h.minVersion}` : ''].filter(Boolean).join(' · ');

function ObstacleChips({ value, onChange, label }) {
  return (
    <div className="col">
      <span className="lbl">{label}</span>
      <div className="chips" role="group" aria-label={label}>
        {Object.entries(OBSTACLES).map(([k, t]) => (
          <Chip key={k} on={value === k} onClick={() => onChange(value === k ? '' : k)}>{t}</Chip>
        ))}
      </div>
    </div>
  );
}

// برگهٔ ثبت وضعیت یک عادت در یک روز (استفاده در عادت‌ها و امروز)
export function HabitLogSheet({ habit, date, onClose }) {
  const toast = useToast();
  const existing = useLiveQuery(() => db.habitLogs.where('[habitId+date]').equals([habit.id, date]).first().then((r) => r ?? null), [habit.id, date], undefined);
  const [mode, setMode] = useState(null);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [obstacle, setObstacle] = useState('');
  const [more, setMore] = useState(false);
  const [effort, setEffort] = useState(0);
  const [energy, setEnergy] = useState('');

  async function save(status, extra = {}) {
    try {
      const undo = await setHabitLog(habit.id, date, status, extra);
      toast(status === 'none' ? 'ثبت برداشته شد' : 'ثبت شد', undo);
    } catch {
      toast(SAVE_ERR);
    }
    onClose();
  }

  const details = (usedMin = false) => logExtra({ usedMin, effort, energy: more ? energy : '', obstacle });

  function openPartial() {
    setAmount(String(existing?.amount ?? (habit.amount ? Math.round(habit.amount / 2) : '')));
    setObstacle(existing?.obstacle ?? '');
    setMode('partial');
  }

  return (
    <Sheet title={habit.title} onClose={onClose}>
      <p className="s">
        {fmtDate(date, true)}
        {habitSub(habit) ? ` · ${habitSub(habit)}` : ''}
      </p>
      {habit.cue && <p className="xs">نشانهٔ شروع: {habit.cue}</p>}
      {existing && (
        <p className="xs">
          ثبت فعلی: {STATUS_LABEL[existing.status]}
          {existing.usedMin ? ' (نسخهٔ حداقل)' : ''}
        </p>
      )}
      {mode === null && (
        <div className="col">
          <button className="btn" onClick={() => save('done', { amount: habit.amount ?? null, ...details(false) })}>
            انجام شد
          </button>
          {habit.minVersion && (
            <button className="btn s2" onClick={() => save('done', { amount: null, ...details(true) })}>
              نسخهٔ حداقل انجام شد
            </button>
          )}
          <button className="btn s2" onClick={openPartial}>
            نیمه‌کاره
          </button>
          <button className="btn s2" onClick={() => { setObstacle(existing?.obstacle ?? ''); setMode('skipped'); }}>
            عمداً رد می‌کنم
          </button>
          <button className="lnk" aria-expanded={more} onClick={() => setMore(!more)}>
            {more ? 'بستن جزئیات' : 'جزئیات بیشتر (اختیاری)'}
          </button>
          {more && (
            <div className="col hb-more">
              <span className="lbl">تلاش</span>
              <div className="chips" role="group" aria-label="میزان تلاش">
                {[1, 2, 3, 4, 5].map((n) => (
                  <Chip key={n} on={effort === n} aria-label={`تلاش ${faNum(n)} از ${faNum(5)}`} onClick={() => setEffort(effort === n ? 0 : n)}>{faNum(n)}</Chip>
                ))}
              </div>
              <Field label={`انرژی${energy === '' ? '' : `: ${faNum(energy)}`}`}>
                <input type="range" min="0" max="100" step="10" value={energy === '' ? 50 : energy} onChange={(e) => setEnergy(e.target.value)} aria-label="سطح انرژی" />
              </Field>
              <p className="xs">این‌ها فقط برای شناخت الگوی خودت است و کاملاً اختیاری.</p>
            </div>
          )}
          {existing && (
            <button className="btn t" onClick={() => save('none')}>
              پاک کردن ثبت
            </button>
          )}
        </div>
      )}
      {mode === 'partial' && (
        <div className="col">
          <Field label="چند دقیقه انجام شد؟">
            <input className="in" type="number" inputMode="numeric" min="0" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </Field>
          <ObstacleChips label="چه چیزی راه را سخت کرد؟ (اختیاری)" value={obstacle} onChange={setObstacle} />
          <button className="btn" onClick={() => save('partial', { amount: amount === '' ? null : Number(amount), ...details(false) })}>
            ذخیره
          </button>
          <button className="btn t" onClick={() => setMode(null)}>
            بازگشت
          </button>
        </div>
      )}
      {mode === 'skipped' && (
        <div className="col">
          <p className="xs">رد کردن هم اطلاعات است، نه شکست.</p>
          <ObstacleChips label="چه چیزی پیش آمد؟ (اختیاری)" value={obstacle} onChange={setObstacle} />
          <Field label="توضیح (اختیاری)">
            <input className="in" value={reason} onChange={(e) => setReason(e.target.value)} />
          </Field>
          <button className="btn" onClick={() => save('skipped', { reason: reason.trim(), ...logExtra({ obstacle }) })}>
            ذخیره
          </button>
          <button className="btn t" onClick={() => setMode(null)}>
            بازگشت
          </button>
        </div>
      )}
    </Sheet>
  );
}

// ویرایشگر فهرست ساده (مراحل آماده‌سازی، موانع احتمالی)
export function ListEditor({ label, items, onChange, placeholder }) {
  const [text, setText] = useState('');
  const add = () => {
    if (!text.trim()) return;
    onChange([...items, text.trim()]);
    setText('');
  };
  return (
    <div className="col">
      <span className="lbl">{label}</span>
      {items.map((it, i) => (
        <div className="row" key={`${it}-${i}`}>
          <span className="grow s">{it}</span>
          <button className="lnk" aria-label={`حذف ${it}`} onClick={() => onChange(items.filter((_, j) => j !== i))}>حذف</button>
        </div>
      ))}
      <div className="row">
        <input className="in grow" value={text} placeholder={placeholder} aria-label={label} onChange={(e) => setText(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), add())} />
        <button className="btn s2 sm" onClick={add}>افزودن</button>
      </div>
    </div>
  );
}

export function DifficultyChips({ value, onChange }) {
  return (
    <div className="col">
      <span className="lbl">سختی</span>
      <div className="chips" role="group" aria-label="سختی">
        {DIFFICULTY.map((d) => (
          <Chip key={d.key} on={Number(value) === d.key} onClick={() => onChange(Number(value) === d.key ? '' : d.key)}>{d.label}</Chip>
        ))}
      </div>
    </div>
  );
}

// فهرست آماده‌سازی محیط؛ تیک‌ها فقط برای امروز نگه داشته می‌شود (یک کلید kv که هر روز بازنویسی می‌شود)
export function PrepChecklist({ habit }) {
  const today = dateKey();
  const [saved, setSaved] = useKV(`prep:${habit.id}`, null);
  const toast = useToast();
  if (!habit.prep?.length) return null;
  const done = saved?.date === today ? saved.done : [];
  const toggle = async (i) => {
    const next = done.includes(i) ? done.filter((x) => x !== i) : [...done, i];
    try {
      await setSaved({ date: today, done: next });
    } catch {
      toast(SAVE_ERR);
    }
  };
  return (
    <Card>
      <span className="lbl">آماده‌سازی محیط · امروز</span>
      {habit.prep.map((p, i) => (
        <label className="row hb-prep" key={`${p}-${i}`}>
          <input type="checkbox" checked={done.includes(i)} onChange={() => toggle(i)} />
          <span className="grow s">{p}</span>
        </label>
      ))}
      <p className="xs">برداشتن اصطکاک شروع، کار را راحت‌تر می‌کند.</p>
    </Card>
  );
}

// تاریخچهٔ تغییرات تعریف عادت
export function Revisions({ habitId }) {
  const revs = useLiveQuery(() => db.habitRevisions.where('habitId').equals(habitId).reverse().sortBy('ts'), [habitId], undefined);
  if (!revs || revs.length === 0) return null;
  return (
    <Card>
      <span className="lbl">تاریخچهٔ تغییرات</span>
      <p className="xs">هر تغییر، نسخهٔ پیشین را نگه می‌دارد تا ثبت‌های قدیمی همچنان معنی داشته باشند.</p>
      {revs.map((r) => (
        <div className="col hb-rev" key={r.id}>
          <b className="s">{fmtDate(dateKey(new Date(r.ts)))}{r.source === 'coach' ? ' · با تأیید پیشنهاد مربی' : ''}</b>
          {r.reason && <span className="xs">{r.reason}</span>}
          <span className="xs">نسخهٔ پیشین: {snapshotSummary(r.snapshot) || 'بدون جزئیات'}</span>
        </div>
      ))}
    </Card>
  );
}
