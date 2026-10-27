import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.js';
import { Card, Chip, Field, Select, Sheet, useToast } from '../ui.jsx';
import { AREAS } from '../data.js';
import { dateKey, faNum } from '../util.js';
import { MAX_KR, PERIOD_DAYS, SOURCES, krCurrent, krLabel, krProgress, newKR, validateKR } from '../keyResultLogic.js';

export function AreaChips({ value, onChange }) {
  return (
    <div className="col">
      <span className="lbl">حوزه (اختیاری)</span>
      <div className="chips" role="group" aria-label="حوزهٔ زندگی">
        {AREAS.map((a) => <Chip key={a.key} on={value === a.key} onClick={() => onChange(value === a.key ? null : a.key)}>{a.label}</Chip>)}
      </div>
    </div>
  );
}

const PERIODS = [{ key: 'week', label: 'هفته' }, { key: '30d', label: '۳۰ روز' }, { key: '60d', label: '۶۰ روز' }];

function KRForm({ habits, onSave, onClose }) {
  const [kr, setKr] = useState(newKR());
  const [err, setErr] = useState('');
  const set = (p) => setKr({ ...kr, ...p });
  const save = () => {
    const e = validateKR({ ...kr, start: Number(kr.start), target: Number(kr.target) });
    if (e) return setErr(e);
    onSave({ ...kr, start: Number(kr.start), target: Number(kr.target), current: Number(kr.start) });
  };
  return (
    <Sheet title="نتیجهٔ کلیدی" onClose={onClose}>
      <Field label="عنوان" error={err}><input className="in" value={kr.title} onChange={(e) => set({ title: e.target.value })} placeholder="مثلاً ۱۲ ساعت مطالعه" /></Field>
      <div className="g2">
        <Field label="شروع"><input className="in" type="number" value={kr.start} onChange={(e) => set({ start: e.target.value })} /></Field>
        <Field label="هدف"><input className="in" type="number" value={kr.target} onChange={(e) => set({ target: e.target.value })} /></Field>
      </div>
      <Field label="واحد (اختیاری)"><input className="in" value={kr.unit} onChange={(e) => set({ unit: e.target.value })} placeholder="ساعت، درس، بار…" /></Field>
      <div className="col"><span className="lbl">منبع</span>
        <div className="chips">{SOURCES.map((s) => <Chip key={s.key} on={kr.source === s.key} onClick={() => set({ source: s.key, period: s.key === 'manual' ? null : kr.period ?? '30d' })}>{s.label}</Chip>)}</div></div>
      {kr.source !== 'manual' && <div className="col"><span className="lbl">بازه (حداکثر ۶۰ روز)</span>
        <div className="chips">{PERIODS.map((p) => <Chip key={p.key} on={kr.period === p.key} onClick={() => set({ period: p.key })}>{p.label}</Chip>)}</div></div>}
      {kr.source === 'habit' && <Select label="عادت" value={kr.habitId ?? ''} onChange={(v) => set({ habitId: Number(v) })} options={[{ value: '', label: 'انتخاب عادت' }, ...habits.map((h) => ({ value: h.id, label: h.title }))]} />}
      <button className="btn" onClick={save}>ذخیره</button>
    </Sheet>
  );
}

// نتایج کلیدی هدف (حداکثر ۳) + «پایان دوره» با صفحهٔ آرام مرور
export default function GoalKeyResults({ goal, status }) {
  const toast = useToast();
  const nav = useNavigate();
  const today = dateKey();
  const [adding, setAdding] = useState(false);
  const [review, setReview] = useState(null);
  const [upd, setUpd] = useState(null);
  const rows = useLiveQuery(async () => {
    const [focus, tasks, habitLogs, habits] = await Promise.all([db.focus.toArray(), db.tasks.toArray(), db.habitLogs.toArray(), db.habits.toArray()]);
    return { focus, tasks, habitLogs, habits };
  }, [], undefined);
  if (!rows) return null;
  const krs = goal.keyResults ?? [];
  const save = (keyResults) => db.goals.update(goal.id, { keyResults });
  const shown = krs.map((k) => (k.source === 'manual' ? k : { ...k, current: krCurrent(k, { goal, ...rows }, today) }));
  const add = async (kr) => { await save([...krs, kr]); setAdding(false); toast('نتیجهٔ کلیدی اضافه شد.', () => save(krs)); };
  const finish = async (next) => {
    await db.goals.update(goal.id, { periodReviews: [...(goal.periodReviews ?? []), { date: today, ...review }] });
    if (next === 'archived' || next === 'done') { await status(next); nav('/goals'); }
    setReview(null);
  };
  return (
    <Card kind="mint">
      <span className="lbl">نتایج کلیدی</span>
      {shown.length === 0 && <p className="s">یک تا سه نتیجهٔ قابل‌اندازه‌گیری برای این هدف بنویس؛ رسیدن به ۷۰٪ هم دستاورد است.</p>}
      {shown.map((k) => {
        const p = krProgress(k);
        const src = k.source === 'manual' ? 'دستی' : `${SOURCES.find((s) => s.key === k.source)?.label} · ${faNum(PERIOD_DAYS[k.period])} روز اخیر`;
        return (
          <div key={k.id} className="col">
            <span>{k.title}</span>
            <div className="pb" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p * 100)} aria-label={`پیشرفت ${k.title}`}><i style={{ width: `${p * 100}%` }} /></div>
            <span className="xs">{faNum(k.current)} از {faNum(k.target)} {k.unit} · {src} · {krLabel(p)}</span>
            {k.source === 'manual' && <button className="lnk" onClick={() => setUpd({ id: k.id, value: String(k.current) })}>به‌روز کردن عدد</button>}
            <button className="lnk" onClick={async () => { await save(krs.filter((x) => x.id !== k.id)); toast('حذف شد.', () => save(krs)); }}>حذف</button>
          </div>
        );
      })}
      {krs.length < MAX_KR && <button className="btn s2 sm" onClick={() => setAdding(true)}>+ نتیجهٔ کلیدی (حداکثر ۳)</button>}
      {krs.length > 0 && <button className="btn t sm" onClick={() => setReview({ what: '', learned: '' })}>پایان دوره</button>}
      {adding && <KRForm habits={rows.habits} onSave={add} onClose={() => setAdding(false)} />}
      {upd && (
        <Sheet title="به‌روز کردن عدد" onClose={() => setUpd(null)}>
          <Field label="مقدار فعلی"><input className="in" type="number" value={upd.value} onChange={(e) => setUpd({ ...upd, value: e.target.value })} /></Field>
          <button className="btn" onClick={async () => { await save(krs.map((k) => (k.id === upd.id ? { ...k, current: Number(upd.value) || 0, doneAt: null } : k))); setUpd(null); }}>ذخیره</button>
        </Sheet>
      )}
      {review && (
        <Sheet title="مرور هدف" onClose={() => setReview(null)}>
          <p className="s">همین که تا اینجا آمده‌ای ارزشمند است.</p>
          <Field label="چه شد؟"><textarea className="in" value={review.what} onChange={(e) => setReview({ ...review, what: e.target.value })} /></Field>
          <Field label="چه یاد گرفتم؟"><textarea className="in" value={review.learned} onChange={(e) => setReview({ ...review, learned: e.target.value })} /></Field>
          <button className="btn" onClick={() => finish('active')}>ادامه</button>
          <button className="btn s2" onClick={() => finish('archived')}>بایگانی</button>
          <button className="btn s2" onClick={() => finish('done')}>تکمیل</button>
        </Sheet>
      )}
    </Card>
  );
}
