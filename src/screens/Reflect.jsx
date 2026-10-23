import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.js';
import { Page, Top, Card, Chip, Icon, Empty, Field, Fab, Dialog, Stepper, Skeleton, Bars, useToast } from '../ui.jsx';
import { MOODS, FACTORS } from '../logic.js';
import { addDays, dateKey, faNum, fmtDate, WEEKDAYS_SHORT, weekdayIdx } from '../util.js';
import { allTags, filterNotes, moodSeries, moodSummary, noteTitle, optionalAvg, parseTags } from '../reflectLogic.js';
import './Reflect.css';

const HUB = [
  { to: '/notes', label: 'یادداشت‌ها', text: 'ثبت فکرها و ایده‌ها', icon: 'book' },
  { to: '/mood', label: 'حال و انرژی', text: 'ثبت کوتاه، همهٔ مراحل اختیاری', icon: 'spark' },
  { to: '/mood/trend', label: 'روند حال', text: 'نگاهی به ۱۴ روز اخیر', icon: 'chart' },
  { to: '/review/day', label: 'مرور روزانه', text: 'سه مرحلهٔ کوتاه، هر کدام قابل‌رد', icon: 'check' },
  { to: '/review/week', label: 'مرور هفتگی', text: 'نگاه آرام به هفته', icon: 'cal' },
  { to: '/insights', label: 'بینش‌ها', text: 'توصیف داده‌های خودت', icon: 'chart' },
  { to: '/coach', label: 'مربی', text: 'پیشنهادهای قانون‌محور', icon: 'spark' },
  { to: '/calendar', label: 'تقویم', text: 'ماه، هفته و روز', icon: 'cal' },
  { to: '/game', label: 'امتیاز و نشان‌ها', text: 'سطح، ماموریت و چالش هفته', icon: 'spark' },
  { to: '/howto', label: 'نحوهٔ کار با اِوالو', text: 'راهنمای کامل و امتیازها', icon: 'book' },
  { to: '/notifications', label: 'اعلان‌ها', text: 'یادآورهای ملایم', icon: 'bell' },
  { to: '/profile', label: 'پروفایل و حریم', text: 'ترجیحات و داده‌ها', icon: 'user' },
];

export function ReflectHome() {
  const today = dateKey();
  const moods = useLiveQuery(() => db.moods.where('date').equals(today).toArray(), [today]);
  const last = (moods ?? []).sort((a, b) => b.ts - a.ts)[0];
  return (
    <Page>
      <Top title="بازتاب" />
      {moods && (
        <Card kind="teal">
          <span className="lbl">از داده‌های تو</span>
          {last ? (
            <span className="s">امروز حالت را «{MOODS[last.mood]?.label}» ثبت کرده‌ای.</span>
          ) : (
            <span className="s">امروز هنوز حالی ثبت نشده؛ هر وقت خواستی، یک ثبت کوتاه کافی است.</span>
          )}
        </Card>
      )}
      {HUB.map((h) => (
        <Link key={h.to} className="card hubrow" to={h.to}>
          <span className="ib bg">
            <Icon name={h.icon} />
          </span>
          <span className="grow">
            <h3>{h.label}</h3>
            <span className="xs">{h.text}</span>
          </span>
          <Icon name="chevl" />
        </Link>
      ))}
    </Page>
  );
}

export function Notes() {
  const nav = useNavigate();
  const notes = useLiveQuery(() => db.notes.toArray(), []);
  const [q, setQ] = useState('');
  const [tag, setTag] = useState(null);
  const shown = notes ? filterNotes(notes, q, tag) : [];
  return (
    <Page tabs={false}>
      <Top title="یادداشت‌ها" back="/reflect" />
      {!notes ? (
        <Skeleton />
      ) : (
        <>
          <Field label="جستجو">
            <input className="in" value={q} onChange={(e) => setQ(e.target.value)} placeholder="کلمه‌ای بنویس" />
          </Field>
          {allTags(notes).length > 0 && (
            <div className="chips">
              {allTags(notes).map((t) => (
                <Chip key={t} on={tag === t} onClick={() => setTag(tag === t ? null : t)}>
                  {t}
                </Chip>
              ))}
            </div>
          )}
          {!notes.length ? (
            <Empty title="هنوز یادداشتی نداری" text="هر فکر کوچکی را می‌شود همین‌جا نگه داشت." />
          ) : !shown.length ? (
            <Card>
              <span className="s">یادداشتی با این جستجو پیدا نشد.</span>
            </Card>
          ) : (
            shown.map((n) => (
              <Link key={n.id} className="card" to={`/notes/${n.id}`}>
                <h3>{noteTitle(n)}</h3>
                <span className="s note-ex">{n.text}</span>
                <span className="xs">
                  {fmtDate(n.date)}
                  {(n.tags ?? []).length ? ` · ${n.tags.join('، ')}` : ''}
                </span>
              </Link>
            ))
          )}
          <Fab label="یادداشت جدید" onClick={() => nav('/notes/new')} />
        </>
      )}
    </Page>
  );
}

export function NoteEdit() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const [f, setF] = useState({ title: '', text: '', tags: '' });
  const [ready, setReady] = useState(!id);
  const [err, setErr] = useState('');
  const [confirm, setConfirm] = useState(false);

  useEffect(() => {
    if (!id) return;
    db.notes.get(Number(id)).then((n) => {
      if (!n) return nav('/notes', { replace: true });
      setF({ title: n.title ?? '', text: n.text ?? '', tags: (n.tags ?? []).join('، ') });
      setReady(true);
    });
  }, [id, nav]);

  const set = (k) => (e) => setF({ ...f, [k]: e.target.value });

  async function save() {
    if (!f.title.trim() && !f.text.trim()) return setErr('چیزی بنویس تا ذخیره شود.');
    const rec = { title: f.title.trim(), text: f.text.trim(), tags: parseTags(f.tags) };
    try {
      if (id) await db.notes.update(Number(id), rec);
      else await db.notes.add({ ...rec, date: dateKey(), ts: Date.now() });
      toast('یادداشت ذخیره شد');
      nav('/notes');
    } catch {
      setErr('نتوانستیم ذخیره کنیم؛ دوباره امتحان کن. داده‌هایت امن است.');
    }
  }

  async function remove() {
    const old = await db.notes.get(Number(id));
    await db.notes.delete(Number(id));
    setConfirm(false);
    toast('یادداشت حذف شد', () => db.notes.add(old));
    nav('/notes');
  }

  if (!ready) return <Page tabs={false}><Skeleton /></Page>;
  return (
    <Page tabs={false}>
      <Top title={id ? 'ویرایش یادداشت' : 'یادداشت جدید'} close="/notes" />
      <Field label="عنوان (اختیاری)">
        <input className="in" value={f.title} onChange={set('title')} />
      </Field>
      <Field label="متن" error={err}>
        <textarea className={`in${err ? ' e' : ''}`} rows={6} value={f.text} onChange={set('text')} />
      </Field>
      <Field label="برچسب‌ها (با ویرگول جدا کن)">
        <input className="in" value={f.tags} onChange={set('tags')} />
      </Field>
      <button className="btn" onClick={save}>ذخیره</button>
      {id && <button className="btn t" onClick={() => setConfirm(true)}>حذف یادداشت</button>}
      {confirm && (
        <Dialog title="این یادداشت حذف شود؟" text="می‌توانی بلافاصله بعد از حذف آن را بازگردانی کنی." confirm="حذف" danger onConfirm={remove} onCancel={() => setConfirm(false)} />
      )}
    </Page>
  );
}

function Scale({ label, value, onChange }) {
  return (
    <div className="col" role="group" aria-label={label}>
      <span className="lbl">{label} (۱ تا ۵)</span>
      <div className="chips">
        {[1, 2, 3, 4, 5].map((n) => (
          <Chip key={n} on={value === n} onClick={() => onChange(value === n ? null : n)}>{faNum(n)}</Chip>
        ))}
      </div>
    </div>
  );
}

export function Mood() {
  const nav = useNavigate();
  const toast = useToast();
  const [step, setStep] = useState(1);
  const [mood, setMood] = useState(null);
  const [energy, setEnergy] = useState(50);
  const [factors, setFactors] = useState([]);
  const [note, setNote] = useState('');
  const [focus, setFocus] = useState(null);
  const [stress, setStress] = useState(null);
  const [availMin, setAvailMin] = useState(null);
  const [challenge, setChallenge] = useState('');
  const [err, setErr] = useState('');

  const toggle = (x) => setFactors(factors.includes(x) ? factors.filter((y) => y !== x) : [...factors, x]);

  async function save() {
    if (!mood) {
      setStep(1);
      return setErr('اول یکی از حال‌ها را انتخاب کن؛ یا اگر حوصله نداری، ببند.');
    }
    try {
      const rec = { date: dateKey(), ts: Date.now(), mood, energy, factors, note: note.trim() };
      if (focus != null) rec.focus = focus;
      if (stress != null) rec.stress = stress;
      if (availMin != null) rec.availMin = availMin;
      if (challenge.trim()) rec.challenge = challenge.trim();
      const id = await db.moods.add(rec);
      toast('حال امروز ثبت شد', () => db.moods.delete(id));
      nav('/reflect');
    } catch {
      setErr('نتوانستیم ذخیره کنیم؛ دوباره امتحان کن. داده‌هایت امن است.');
    }
  }

  return (
    <Page tabs={false}>
      <Top title="حال و انرژی" close="/reflect" right={<Stepper step={step} total={4} />} />
      {step === 1 && (
        <>
          <h3>الان حالت چطور است؟</h3>
          <div className="mood-pick" role="group" aria-label="حال">
            {Object.entries(MOODS).map(([k, m]) => (
              <button key={k} aria-pressed={mood === k} onClick={() => { setMood(k); setErr(''); }}>
                <b style={{ background: m.color }} />
                {m.label}
              </button>
            ))}
          </div>
          {err && <span className="err">{err}</span>}
        </>
      )}
      {step === 2 && (
        <>
          <h3>سطح انرژی‌ات؟</h3>
          <Field label={`انرژی: ${faNum(energy)} از ۱۰۰`}>
            <input className="range" type="range" min="0" max="100" step="5" value={energy} onChange={(e) => setEnergy(Number(e.target.value))} aria-label="انرژی" />
          </Field>
          <span className="lbl">چه چیزی اثر داشته؟ (اختیاری)</span>
          <div className="chips">
            {FACTORS.map((x) => (
              <Chip key={x} on={factors.includes(x)} onClick={() => toggle(x)}>{x}</Chip>
            ))}
          </div>
        </>
      )}
      {step === 3 && (
        <>
          <h3>چند مورد اختیاری، فقط اگر خواستی</h3>
          <Scale label="تمرکز امروز" value={focus} onChange={setFocus} />
          <Scale label="استرس امروز" value={stress} onChange={setStress} />
          <span className="lbl">چقدر وقت آزاد داری؟ (دقیقه)</span>
          <div className="chips" role="group" aria-label="وقت آزاد">
            {[15, 30, 60, 120, 180].map((m) => (
              <Chip key={m} on={availMin === m} onClick={() => setAvailMin(availMin === m ? null : m)}>{faNum(m)}</Chip>
            ))}
          </div>
        </>
      )}
      {step === 4 && (
        <>
          <Field label="چالش اصلی امروز (اختیاری)">
            <input className="in" value={challenge} onChange={(e) => setChallenge(e.target.value)} />
          </Field>
          <Field label="یادداشت کوتاه (اختیاری)" error={err}>
            <textarea className="in" rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </>
      )}
      {step < 4 ? (
        <button className="btn" onClick={() => setStep(step + 1)}>ادامه</button>
      ) : (
        <button className="btn" onClick={save}>ثبت</button>
      )}
      {step > 1 && step < 4 && <button className="btn s2" onClick={save}>همین‌قدر کافی است؛ ثبت کن</button>}
      {step < 4 && step > 1 && <button className="btn t" onClick={() => setStep(step + 1)}>رد کردن این مرحله</button>}
      {step > 1 && <button className="btn t" onClick={() => setStep(step - 1)}>بازگشت</button>}
    </Page>
  );
}

export function MoodTrend() {
  const today = dateKey();
  const from = addDays(today, -13);
  const moods = useLiveQuery(() => db.moods.where('date').between(from, today, true, true).toArray(), [from, today]);
  const series = moods ? moodSeries(moods, today, 14) : [];
  const sum = moods ? moodSummary(series) : null;
  return (
    <Page tabs={false}>
      <Top title="روند حال" back="/reflect" />
      {!moods ? (
        <Skeleton />
      ) : !sum.enough ? (
        <Empty title="هنوز داده کافی نیست" text="با چند ثبت دیگر، تصویر روشن‌تری از روند حالت می‌بینی. ثبت‌نشده یعنی داده نیست." />
      ) : (
        <>
          <Card kind="teal">
            <span className="lbl">از داده‌های تو · ۱۴ روز اخیر</span>
            <span className="s">
              {faNum(sum.count)} ثبت داری{sum.avgEnergy != null ? ` و میانگین انرژی‌ات ${faNum(sum.avgEnergy)} از ۱۰۰ است` : ''}.
            </span>
          </Card>
          <Card>
            <h3>انرژی در هر روز</h3>
            <Bars values={series.map((s) => s.energy)} max={100} label="نمودار انرژی ۱۴ روز اخیر؛ ستون نقطه‌چین یعنی ثبت نشده" />
            <div className="bar-labels" aria-hidden="true">
              {series.map((s) => (
                <span key={s.date}>{WEEKDAYS_SHORT[weekdayIdx(s.date)]}</span>
              ))}
            </div>
            <span className="xs">ستون نقطه‌چین یعنی آن روز حالی ثبت نشده.</span>
          </Card>
          {(optionalAvg(moods, 'focus') != null || optionalAvg(moods, 'stress') != null) && (
            <Card>
              <h3>تمرکز و استرس ثبت‌شده</h3>
              {optionalAvg(moods, 'focus') != null && <span className="s">میانگین تمرکز: {faNum(optionalAvg(moods, 'focus'))} از ۵</span>}
              {optionalAvg(moods, 'stress') != null && <span className="s">میانگین استرس: {faNum(optionalAvg(moods, 'stress'))} از ۵</span>}
              <span className="xs">فقط توصیف ثبت‌های توست؛ هیچ رابطهٔ علتی ادعا نمی‌شود.</span>
            </Card>
          )}
          <Card>
            <h3>حال‌های ثبت‌شده</h3>
            <div className="chips">
              {Object.entries(sum.counts).map(([k, n]) => (
                <span key={k} className="chip">{MOODS[k]?.label}: {faNum(n)}</span>
              ))}
            </div>
          </Card>
        </>
      )}
    </Page>
  );
}
