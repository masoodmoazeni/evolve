import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, setKV } from '../db.js';
import { Page, Top, Card, Chip, Field, Stepper, Bars, Skeleton, useToast } from '../ui.jsx';
import { OBSTACLES, statusCounts } from '../logic.js';
import { dateKey, faNum, fmtDate, WEEKDAYS_SHORT, weekdayIdx } from '../util.js';
import { REALISTIC, dayValues, draftInsights, draftsToText, reviewKeys, weekSummaryText } from '../reflectLogic.js';
import { obstacleRanking } from '../insightLogic.js';
import './Reflect.css';

const COPY = {
  day: {
    title: 'مرور روزانه',
    steps: [
      { key: 'good', q: 'امروز چه چیزی خوب پیش رفت؟', hint: 'هر چیز کوچکی هم به حساب می‌آید.' },
      { key: 'hard', q: 'چه چیزی سخت بود؟', hint: 'فقط توصیف کن؛ قضاوتی در کار نیست.' },
      { key: 'tomorrow', q: 'یک قدم کوچک برای فردا؟', hint: 'اگر خواستی، به کارهای فردا اضافه‌اش می‌کنم.' },
    ],
    stepLabel: 'فردا',
  },
  week: {
    title: 'مرور هفتگی',
    steps: [
      { key: 'good', q: 'این هفته چه چیزی خوب بود؟', hint: 'از ثبت‌هایت هم می‌توانی کمک بگیری.' },
      { key: 'hard', q: 'چه چیزی سخت‌تر از انتظار بود؟', hint: 'فقط توصیف کن؛ قضاوتی در کار نیست. مانع‌های تکراری را هم می‌توانی علامت بزنی.' },
      { key: 'realistic', q: 'برنامهٔ این هفته چقدر واقع‌بینانه بود؟', hint: 'و اگر خواستی بنویس چه چیزی دربارهٔ رفتار خودت یاد گرفتی.' },
      { key: 'change', q: 'چه چیزی ادامه، توقف یا تغییر کند؟', hint: 'این‌ها فقط یادداشت تواند؛ چیزی در برنامه‌هایت خودکار تغییر نمی‌کند.' },
      { key: 'tomorrow', q: 'اولویت اصلی هفتهٔ بعد؟', hint: 'اگر خواستی، به کارهای هفتهٔ بعد اضافه‌اش می‌کنم.' },
    ],
    stepLabel: 'هفتهٔ بعد',
  },
};

async function loadFacts(dates) {
  const [from, to] = [dates[0], dates[dates.length - 1]];
  const range = (t) => db[t].where('date').between(from, to, true, true).toArray();
  const [habitLogs, focus, tasks, habits] = await Promise.all([range('habitLogs'), range('focus'), range('tasks'), db.habits.toArray()]);
  return {
    habitLogs,
    habits,
    counts: statusCounts(habitLogs),
    focusMin: focus.reduce((a, f) => a + (Number(f.actual) || 0), 0),
    tasksDone: tasks.filter((t) => t.done).length,
  };
}

function Facts({ kind, dates, facts }) {
  const c = facts.counts;
  return (
    <Card kind="teal">
      <span className="lbl">از داده‌های تو</span>
      <span className="s">{weekSummaryText(c)}</span>
      {kind === 'week' && (
        <>
          <Bars values={dayValues(dates, facts.habitLogs)} label="تعداد عادت‌های انجام‌شده در هر روز هفته؛ ستون نقطه‌چین یعنی ثبت نشده" />
          <div className="bar-labels" aria-hidden="true">
            {dates.map((d) => (
              <span key={d}>{WEEKDAYS_SHORT[weekdayIdx(d)]}</span>
            ))}
          </div>
        </>
      )}
      <span className="xs">
        {facts.focusMin ? `${faNum(facts.focusMin)} دقیقه تمرکز` : 'بدون جلسهٔ تمرکز ثبت‌شده'}
        {facts.tasksDone ? ` · ${faNum(facts.tasksDone)} کار انجام‌شده` : ''}
      </span>
    </Card>
  );
}

const BLANK = { good: '', hard: '', tomorrow: '', intent: '', obstacles: [], realistic: '', learned: '', keep: '', stop: '', change: '', drafts: '' };
const pick = (r) => ({ ...BLANK, ...Object.fromEntries(Object.keys(BLANK).map((k) => [k, r[k] ?? BLANK[k]])) });

function Review({ kind }) {
  const toast = useToast();
  const copy = COPY[kind];
  const total = copy.steps.length;
  const today = dateKey();
  const { date, nextDate, dates } = reviewKeys(kind, today);
  const facts = useLiveQuery(() => loadFacts(dates), [kind, today]);
  const existing = useLiveQuery(() => db.reviews.where('kind').equals(kind).and((r) => r.date === date).first().then((r) => r ?? null), [kind, date]);

  const [step, setStep] = useState(1);
  const [v, setV] = useState(BLANK);
  const [addTask, setAddTask] = useState(true);
  const [err, setErr] = useState('');
  const [done, setDone] = useState(false);
  const [seeded, setSeeded] = useState(false);

  useEffect(() => {
    if (existing) setV(pick(existing));
  }, [existing]);

  const draft = useMemo(
    () => (facts && kind === 'week' ? draftInsights({ habits: facts.habits, habitLogs: facts.habitLogs, dates, today }) : null),
    [facts, kind, today] // eslint-disable-line react-hooks/exhaustive-deps
  );
  // پیش‌نویس فقط یک بار و فقط اگر کاربر خودش چیزی ننوشته باشد وارد کادر می‌شود
  useEffect(() => {
    if (draft?.enough && !seeded && existing !== undefined && !existing?.drafts) {
      setV((x) => (x.drafts ? x : { ...x, drafts: draftsToText(draft.items) }));
    }
    if (draft && existing !== undefined) setSeeded(true);
  }, [draft, existing]); // eslint-disable-line react-hooks/exhaustive-deps

  const set = (k) => (e) => setV({ ...v, [k]: e.target.value });
  const cur = copy.steps[step - 1];
  const last = step === total;
  const next = () => (last ? finish() : setStep(step + 1));
  const skip = () => (last ? finish(true) : setStep(step + 1));
  const toggleObs = (k) => setV({ ...v, obstacles: v.obstacles.includes(k) ? v.obstacles.filter((x) => x !== k) : [...v.obstacles, k] });

  async function finish(skipLast = false) {
    const line = skipLast ? '' : v.tomorrow.trim();
    const intent = skipLast ? '' : v.intent.trim();
    try {
      const accepted = [];
      if (line && addTask && !(existing?.accepted ?? []).length) {
        accepted.push(await db.tasks.add({ title: line, date: nextDate, priority: false, done: false }));
      }
      const text = Object.fromEntries(['good', 'hard', 'learned', 'keep', 'stop', 'change', 'drafts', 'realistic'].map((k) => [k, (v[k] ?? '').trim()]));
      const rec = { kind, date, ...text, obstacles: v.obstacles, tomorrow: line, priority: kind === 'week' ? line : undefined, intent, accepted: [...(existing?.accepted ?? []), ...accepted], ts: Date.now() };
      if (existing) await db.reviews.update(existing.id, rec);
      else await db.reviews.add(rec);
      if (intent && kind === 'day') await setKV(`intent:${nextDate}`, intent);
      setDone(true);
      if (accepted.length) toast('به کارهای بعدی اضافه شد', () => db.tasks.delete(accepted[0]));
    } catch {
      setErr('نتوانستیم ذخیره کنیم؛ دوباره امتحان کن. داده‌هایت امن است.');
    }
  }

  if (!facts || existing === undefined) return <Page tabs={false}><Top title={copy.title} close="/reflect" /><Skeleton /></Page>;

  if (done) {
    return (
      <Page tabs={false}>
        <Top title={copy.title} close="/today" />
        <Card kind="mint" className="empty">
          <h2>مرور ثبت شد</h2>
          <p className="s">همین که نگاهی انداختی کافی است. هر وقت خواستی برگرد.</p>
        </Card>
        <Link className="btn" to="/today">بازگشت به امروز</Link>
        <Link className="btn t" to="/insights">دیدن بینش‌ها</Link>
      </Page>
    );
  }

  const obstacleList = obstacleRanking(facts.habitLogs);
  const textStep = cur.key === 'good' || cur.key === 'hard';

  return (
    <Page tabs={false}>
      <Top title={copy.title} close="/reflect" right={<Stepper step={step} total={total} />} />
      {step === 1 && <Facts kind={kind} dates={dates} facts={facts} />}
      {step === 1 && kind === 'week' && draft && (
        <Card kind="teal">
          <span className="lbl">پیش‌نویس از داده‌های تو · قابل‌ویرایش</span>
          {draft.enough ? (
            <Field label="می‌توانی خطوط را ویرایش یا حذف کنی">
              <textarea className="in" rows={6} value={v.drafts} onChange={set('drafts')} />
            </Field>
          ) : (
            <span className="s">{draft.note}</span>
          )}
          <span className="xs">این‌ها فقط توصیف داده‌اند و چیزی در روتین‌ها یا عادت‌هایت تغییر نمی‌کند.</span>
        </Card>
      )}
      <h3>{cur.q}</h3>
      <p className="s">{cur.hint}</p>
      {textStep && (
        <Field label="یادداشت (اختیاری)">
          <textarea className="in" rows={4} value={v[cur.key]} onChange={set(cur.key)} />
        </Field>
      )}
      {kind === 'week' && cur.key === 'hard' && (
        <>
          <span className="lbl">مانع‌های تکراری (اختیاری)</span>
          {obstacleList.length > 0 && <span className="xs">از ثبت‌های تو: {obstacleList.slice(0, 3).map((o) => `${o.label} (${faNum(o.n)})`).join('، ')}</span>}
          <div className="chips">
            {Object.entries(OBSTACLES).map(([k, label]) => (
              <Chip key={k} on={v.obstacles.includes(k)} onClick={() => toggleObs(k)}>{label}</Chip>
            ))}
          </div>
        </>
      )}
      {cur.key === 'realistic' && (
        <>
          <div className="chips" role="group" aria-label="واقع‌بینانه بودن برنامه">
            {REALISTIC.map((o) => (
              <Chip key={o.key} on={v.realistic === o.key} onClick={() => setV({ ...v, realistic: v.realistic === o.key ? '' : o.key })}>{o.label}</Chip>
            ))}
          </div>
          <Field label="چه چیزی دربارهٔ رفتار خودم یاد گرفتم؟ (اختیاری)">
            <textarea className="in" rows={3} value={v.learned} onChange={set('learned')} />
          </Field>
        </>
      )}
      {cur.key === 'change' && (
        <>
          <Field label="ادامه بدهم"><input className="in" value={v.keep} onChange={set('keep')} /></Field>
          <Field label="متوقف کنم"><input className="in" value={v.stop} onChange={set('stop')} /></Field>
          <Field label="تغییر بدهم"><input className="in" value={v.change} onChange={set('change')} /></Field>
        </>
      )}
      {cur.key === 'tomorrow' && (
        <>
          <Field label={kind === 'week' ? 'اولویت اصلی هفتهٔ بعد' : `قدم کوچک ${copy.stepLabel}`} error={err}>
            <input className="in" value={v.tomorrow} onChange={set('tomorrow')} />
          </Field>
          {v.tomorrow.trim() && (
            <label className="row">
              <input type="checkbox" checked={addTask} onChange={(e) => setAddTask(e.target.checked)} />
              <span className="s">اضافه شدن به کارها ({fmtDate(nextDate)})</span>
            </label>
          )}
          {kind === 'day' && (
            <Field label="نیت فردا (اختیاری)">
              <input className="in" value={v.intent} onChange={set('intent')} />
            </Field>
          )}
        </>
      )}
      <button className="btn" onClick={next}>{last ? 'ثبت مرور' : 'ادامه'}</button>
      <button className="btn t" onClick={skip}>رد کردن این مرحله</button>
      {step > 1 && <button className="btn t" onClick={() => setStep(step - 1)}>بازگشت</button>}
    </Page>
  );
}

export const ReviewDay = () => <Review kind="day" />;
export const ReviewWeek = () => <Review kind="week" />;
