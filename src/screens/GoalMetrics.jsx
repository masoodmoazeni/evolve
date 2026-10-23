import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import DateField from '../DateField.jsx';
import { Icon, Card, Chip, Field, Sheet, Bars, useToast } from '../ui.jsx';
import { db } from '../db.js';
import { dateKey, faNum, fmtDate } from '../util.js';
import { MEASURE_KEY, PRIORITIES, SKILL_PRESETS, measureProgress, metricSummary, newMetric, parseMetricValue } from '../goalUtils.js';

const SCALE_LABEL = { '1-5': 'خودارزیابی ۱ تا ۵', number: 'عدد' };

// بخش اختیاری و جمع‌شدهٔ فرم هدف؛ ساخت سریع هدف را کند نمی‌کند
export function GoalFormExtras({ f, set, errors }) {
  const hasExtras = !!(f.description || f.baseline || f.targetOutcome || f.startDate || f.obstacles?.length || f.metrics?.length || f.baselineValue || f.targetValue);
  const [open, setOpen] = useState(hasExtras);
  const [ob, setOb] = useState('');
  const [custom, setCustom] = useState('');
  const metrics = f.metrics ?? [];
  const obstacles = f.obstacles ?? [];

  const addMetric = (label) => {
    const l = label.trim();
    if (!l || metrics.some((m) => m.label === l)) return;
    set({ metrics: [...metrics, newMetric(l)] });
  };
  const setMetric = (key, patch) => set({ metrics: metrics.map((m) => (m.key === key ? { ...m, ...patch } : m)) });

  return (
    <div className="col">
      <button type="button" className="lnk" aria-expanded={open} onClick={() => setOpen(!open)}>
        {open ? 'بستن جزئیات اختیاری' : 'جزئیات بیشتر (اختیاری)'}
      </button>
      {open && (
        <div className="col goal-extras">
          <Field label="توضیح (اختیاری)">
            <textarea className="in" value={f.description ?? ''} maxLength={400} onChange={(e) => set({ description: e.target.value })} />
          </Field>
          <Field label="وضع فعلی (اختیاری)">
            <input className="in" value={f.baseline ?? ''} maxLength={120} onChange={(e) => set({ baseline: e.target.value })} />
          </Field>
          <Field label="نتیجهٔ مطلوب (اختیاری)">
            <input className="in" value={f.targetOutcome ?? ''} maxLength={120} onChange={(e) => set({ targetOutcome: e.target.value })} />
          </Field>
          <div className="col">
            <span className="lbl">اولویت</span>
            <div className="chips" role="group" aria-label="اولویت هدف">
              {[1, 2, 3].map((p) => (
                <Chip key={p} on={(f.priority ?? 2) === p} onClick={() => set({ priority: p })}>
                  {PRIORITIES[p]}
                </Chip>
              ))}
            </div>
            {errors.priority && <span className="err">{errors.priority}</span>}
          </div>
          <Field label="تاریخ شروع (اختیاری)">
            <DateField value={f.startDate ?? ''} onChange={(v) => set({ startDate: v })} label="تاریخ شروع" />
          </Field>
          <Field label="تاریخ هدف (اختیاری)" error={errors.targetDate}>
            <DateField value={f.targetDate ?? ''} onChange={(v) => set({ targetDate: v })} label="تاریخ هدف" />
          </Field>

          <div className="col">
            <span className="lbl">اندازه‌گیری عددی (اختیاری)</span>
            <span className="xs">اگر هدفت عددی است، مبدأ و مقصد را بنویس؛ بعداً مقدار فعلی را ثبت می‌کنی.</span>
            <div className="g2">
              <Field label="مبدأ" error={errors.baselineValue}>
                <input className="in" inputMode="decimal" value={f.baselineValue ?? ''} onChange={(e) => set({ baselineValue: e.target.value })} />
              </Field>
              <Field label="مقصد" error={errors.targetValue}>
                <input className="in" inputMode="decimal" value={f.targetValue ?? ''} onChange={(e) => set({ targetValue: e.target.value })} />
              </Field>
            </div>
            <Field label="واحد (مثلاً کیلو یا صفحه)">
              <input className="in" value={f.unit ?? ''} maxLength={20} onChange={(e) => set({ unit: e.target.value })} />
            </Field>
          </div>

          <div className="col">
            <span className="lbl">موانع احتمالی</span>
            <div className="chips">
              {obstacles.map((o) => (
                <button key={o} type="button" className="chip on" aria-label={`حذف مانع ${o}`} onClick={() => set({ obstacles: obstacles.filter((x) => x !== o) })}>
                  {o} <Icon name="x" size={14} />
                </button>
              ))}
            </div>
            <div className="ms-row">
              <input className="in" aria-label="مانع جدید" value={ob} maxLength={60} onChange={(e) => setOb(e.target.value)} />
              <button type="button" className="btn s2 sm" onClick={() => { if (ob.trim()) { set({ obstacles: [...obstacles, ob.trim()] }); setOb(''); } }}>افزودن</button>
            </div>
          </div>

          <div className="col">
            <span className="lbl">معیارهای پیشرفت مهارت</span>
            <span className="xs">برای هدف‌های یادگیری؛ جدا از تمرین منظم.</span>
            <div className="chips">
              {SKILL_PRESETS.map((l) => (
                <Chip key={l} on={metrics.some((m) => m.label === l)} onClick={() => (metrics.some((m) => m.label === l) ? set({ metrics: metrics.filter((m) => m.label !== l) }) : addMetric(l))}>
                  {l}
                </Chip>
              ))}
            </div>
            <div className="ms-row">
              <input className="in" aria-label="معیار دلخواه" placeholder="معیار دلخواه" value={custom} maxLength={40} onChange={(e) => setCustom(e.target.value)} />
              <button type="button" className="btn s2 sm" onClick={() => { addMetric(custom); setCustom(''); }}>افزودن</button>
            </div>
            {metrics.map((m) => (
              <div key={m.key} className="row">
                <span className="grow">{m.label}</span>
                <div className="chips" role="group" aria-label={`مقیاس ${m.label}`}>
                  {Object.entries(SCALE_LABEL).map(([k, l]) => (
                    <Chip key={k} on={m.scale === k} onClick={() => setMetric(m.key, { scale: k })}>{l}</Chip>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ثبت و روند پیشرفت مهارت؛ کاملاً جدا از ثبت تمرین (پایبندی)
export function SkillSection({ goal }) {
  const toast = useToast();
  const entries = useLiveQuery(() => db.goalMetrics.where('goalId').equals(goal.id).toArray(), [goal.id], undefined);
  const [sheet, setSheet] = useState(false);
  const hasMeasure = goal.baselineValue != null && goal.targetValue != null;
  const dims = [...(hasMeasure ? [{ key: MEASURE_KEY, label: goal.unit ? `مقدار (${goal.unit})` : 'مقدار فعلی', scale: 'number' }] : []), ...(goal.metrics ?? [])];
  if (!dims.length || entries === undefined) return null;

  const latestMeasure = metricSummary(entries.filter((e) => e.dimension === MEASURE_KEY)).latest;
  const ratio = measureProgress(goal, latestMeasure);

  const del = async (id) => {
    const row = await db.goalMetrics.get(id);
    await db.goalMetrics.delete(id);
    toast('ثبت برداشته شد.', () => db.goalMetrics.add(row));
  };

  return (
    <Card kind="teal">
      <div className="row"><h3 className="grow">پیشرفت مهارت</h3><button className="btn sm" onClick={() => setSheet(true)}>ثبت جدید</button></div>
      <p className="xs">تمرین منظم لزوماً به معنی پیشرفت مهارت نیست؛ اینجا فقط ارزیابی خودت از مهارت ثبت می‌شود، جدا از ثبت روزانه.</p>
      {hasMeasure && (
        <div className="col">
          <span className="lbl">از مبدأ تا مقصد</span>
          <div className="pb" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((ratio ?? 0) * 100)} aria-label="پیشرفت عددی"><i style={{ width: `${(ratio ?? 0) * 100}%` }} /></div>
          <span className="xs">{faNum(goal.baselineValue)} ← {latestMeasure != null ? faNum(latestMeasure) : 'هنوز ثبت نشده'} ← {faNum(goal.targetValue)} {goal.unit}</span>
        </div>
      )}
      {dims.map((d) => {
        const list = entries.filter((e) => e.dimension === d.key);
        const sm = metricSummary(list);
        return (
          <div key={d.key} className="col skill-dim">
            <div className="row"><span className="grow lbl">{d.label}</span><span className="xs">{faNum(sm.count)} ثبت</span></div>
            {sm.enough ? (
              <>
                <Bars values={sm.values.slice(-8)} max={d.scale === '1-5' ? 5 : undefined} label={`روند ${d.label}`} />
                <span className="xs">از {faNum(sm.first)} به {faNum(sm.latest)} (توصیف ثبت‌های خودت)</span>
              </>
            ) : (
              <span className="xs">هنوز داده کافی نیست؛ با چند ثبت دیگر روند دیده می‌شود.</span>
            )}
          </div>
        );
      })}
      {entries.length > 0 && (
        <details>
          <summary className="xs">ثبت‌های اخیر</summary>
          {[...entries].sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 8).map((e) => (
            <div key={e.id} className="row">
              <span className="grow xs">{fmtDate(e.date)} · {dims.find((d) => d.key === e.dimension)?.label ?? 'معیار'}: {faNum(e.value)}{e.note ? ` · ${e.note}` : ''}</span>
              <button className="lnk" aria-label="برداشتن این ثبت" onClick={() => del(e.id)}>برداشتن</button>
            </div>
          ))}
        </details>
      )}
      {sheet && <EntrySheet goal={goal} dims={dims} onClose={() => setSheet(false)} />}
    </Card>
  );
}

function EntrySheet({ goal, dims, onClose }) {
  const toast = useToast();
  const [dim, setDim] = useState(dims[0].key);
  const [raw, setRaw] = useState('');
  const [note, setNote] = useState('');
  const [date, setDate] = useState(dateKey());
  const [err, setErr] = useState('');
  const d = dims.find((x) => x.key === dim);

  const save = async () => {
    const r = parseMetricValue(d, raw);
    if (!r.ok) return setErr(r.error);
    try {
      const id = await db.goalMetrics.add({ goalId: goal.id, date: date || dateKey(), dimension: dim, value: r.value, note: note.trim() });
      toast('ثبت شد.', () => db.goalMetrics.delete(id));
      onClose();
    } catch {
      setErr('نتوانستیم ذخیره کنیم؛ دوباره امتحان کن. داده‌هایت امن است.');
    }
  };

  return (
    <Sheet title="ثبت پیشرفت مهارت" onClose={onClose}>
      <div className="chips" role="group" aria-label="معیار">
        {dims.map((x) => <Chip key={x.key} on={dim === x.key} onClick={() => { setDim(x.key); setRaw(''); setErr(''); }}>{x.label}</Chip>)}
      </div>
      {d.scale === '1-5' ? (
        <div className="col">
          <span className="lbl">ارزیابی خودت (۱ کم، ۵ زیاد)</span>
          <div className="chips" role="group" aria-label="مقدار">
            {[1, 2, 3, 4, 5].map((n) => <Chip key={n} on={Number(raw) === n} onClick={() => { setRaw(String(n)); setErr(''); }}>{faNum(n)}</Chip>)}
          </div>
        </div>
      ) : (
        <Field label="مقدار">
          <input className="in" inputMode="decimal" value={raw} onChange={(e) => { setRaw(e.target.value); setErr(''); }} />
        </Field>
      )}
      <Field label="تاریخ"><DateField value={date} onChange={setDate} label="تاریخ ثبت" /></Field>
      <Field label="یادداشت (اختیاری)"><input className="in" value={note} maxLength={120} onChange={(e) => setNote(e.target.value)} /></Field>
      {err && <p className="err" role="alert">{err}</p>}
      <button className="btn" onClick={save}>ذخیره</button>
    </Sheet>
  );
}
