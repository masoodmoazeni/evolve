import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, useKV } from '../db.js';
import { useKeepAwake } from '../alerts.js';
import { cancelFocusEnd, scheduleFocusEnd, showFocusOngoing } from '../notify.js';
import { actualMinutes, elapsedMs, finishRun, fmtClock, pauseRun, progressRatio, remainingMs, resumeRun, startRun, OUTCOME_LABEL } from '../focusLogic.js';
import { Card, Chip, Dialog, Field, Icon, Page, Skeleton, Top, useToast } from '../ui.jsx';
import { dateKey, faNum } from '../util.js';
import './Focus.css';

export { FocusHistory, FocusStats } from './FocusViews.jsx';

const PRESETS = [15, 25, 45, 60];

export function FocusHome() {
  const nav = useNavigate();
  const today = dateKey();
  const [run] = useKV('focusRun', null);
  const tasks = useLiveQuery(() => db.tasks.where('date').equals(today).filter((t) => !t.done).toArray(), [today]);
  const [title, setTitle] = useState('');
  const [taskId, setTaskId] = useState(null);
  const [intent, setIntent] = useState('');
  const [planned, setPlanned] = useState(25);

  if (run === undefined || !tasks) return <Page><Top title="تمرکز" /><Skeleton /></Page>;

  const start = async () => {
    const r = startRun({ title: title.trim() || 'تمرکز آزاد', taskId, intent: intent.trim(), planned });
    await db.kv.put({ key: 'focusRun', value: r });
    const end = r.startedAt + planned * 60000;
    scheduleFocusEnd(end).then(() => showFocusOngoing(r.title, end)).catch(() => {});
    nav('/focus/run');
  };

  return (
    <Page>
      <Top title="تمرکز" right={<Link className="ib bg" to="/focus/stats" aria-label="آمار تمرکز"><Icon name="chart" /></Link>} />
      {run && (
        <Card kind="teal">
          <span className="lbl">جلسهٔ در جریان</span>
          <p className="s">{run.title}</p>
          <Link className="btn" to={run.endedAt ? '/focus/end' : '/focus/run'}>{run.endedAt ? 'ثبت پایان جلسه' : 'ادامهٔ جلسه'}</Link>
        </Card>
      )}
      <Card>
        <span className="lbl">آماده‌سازی</span>
        {tasks.length > 0 && (
          <div className="col">
            <span className="xs">یکی از کارهای امروز را انتخاب کن (اختیاری)</span>
            <div className="chips">
              {tasks.map((t) => (
                <Chip key={t.id} on={taskId === t.id} onClick={() => { setTaskId(taskId === t.id ? null : t.id); setTitle(taskId === t.id ? '' : t.title); }}>{t.title}</Chip>
              ))}
            </div>
          </div>
        )}
        <Field label="روی چه چیزی تمرکز می‌کنی؟">
          <input className="in" value={title} onChange={(e) => { setTitle(e.target.value); setTaskId(null); }} placeholder="مثلاً: خواندن فصل دوم" />
        </Field>
        <Field label="نیت این جلسه (اختیاری)">
          <input className="in" value={intent} onChange={(e) => setIntent(e.target.value)} placeholder="مثلاً: فقط شروع کنم" />
        </Field>
        <span className="lbl">مدت</span>
        <div className="chips">
          {PRESETS.map((m) => <Chip key={m} on={planned === m} onClick={() => setPlanned(m)}>{faNum(m)} دقیقه</Chip>)}
        </div>
        <div className="mins">
          <button className="ib bg" aria-label="پنج دقیقه کمتر" onClick={() => setPlanned(Math.max(5, planned - 5))}>−</button>
          <output aria-live="polite">{faNum(planned)} دقیقه</output>
          <button className="ib bg" aria-label="پنج دقیقه بیشتر" onClick={() => setPlanned(Math.min(180, planned + 5))}>+</button>
        </div>
        <button className="btn" onClick={start} disabled={!!run && !run.endedAt}>شروع جلسه</button>
      </Card>
      <div className="g2">
        <Link className="btn s2 sm" to="/focus/history">تاریخچه</Link>
        <Link className="btn s2 sm" to="/focus/stats">آمار</Link>
      </div>
    </Page>
  );
}

function useNow() {
  const [now, setNow] = useState(Date.now());
  useEffect(() => {
    const tick = () => setNow(Date.now());
    const id = setInterval(tick, 1000);
    document.addEventListener('visibilitychange', tick);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', tick); };
  }, []);
  return now;
}

export function FocusRun() {
  const nav = useNavigate();
  const now = useNow();
  const [run] = useKV('focusRun', null);
  useKeepAwake(!!run && !run.pausedAt && !run.endedAt);
  if (run === undefined) return <Page tabs={false}><Skeleton /></Page>;
  if (!run) return <Navigate to="/focus" replace />;
  if (run.endedAt) return <Navigate to="/focus/end" replace />;

  const save = (r) => db.kv.put({ key: 'focusRun', value: r });
  const left = remainingMs(run, now);
  const over = left <= 0;
  const paused = !!run.pausedAt;

  const togglePause = async () => {
    if (paused) {
      const r = resumeRun(run);
      await save(r);
      const end = Date.now() + Math.max(1000, remainingMs(r));
      scheduleFocusEnd(end).then(() => showFocusOngoing(run.title, end)).catch(() => {});
    } else {
      await save(pauseRun(run));
      cancelFocusEnd().catch(() => {});
    }
  };
  const finish = async () => {
    await save(finishRun(run));
    cancelFocusEnd().catch(() => {});
    nav('/focus/end');
  };

  return (
    <Page tabs={false}>
      <Top title="در جریان" close="/focus" />
      <h3 style={{ textAlign: 'center' }}>{run.title}</h3>
      {run.intent && <p className="s" style={{ textAlign: 'center' }}>نیت: {run.intent}</p>}
      <div className="focus-timer" style={{ background: `conic-gradient(var(--forest) 0 ${Math.round(progressRatio(run, now) * 100)}%, #fff 0)` }}>
        <div role="timer" aria-label={over ? 'زمان جلسه تمام شد' : 'زمان باقی‌مانده'}>
          {fmtClock(left)}
          <small>{over ? 'زمان تمام شد؛ هر وقت خواستی ثبت کن' : paused ? 'مکث' : `${faNum(Math.round(elapsedMs(run, now) / 60000))} دقیقه گذشته`}</small>
        </div>
      </div>
      <div className="col">
        <button className="btn s2" onClick={togglePause}>{paused ? 'ادامه' : 'مکث'}</button>
        <button className="btn" onClick={finish}>{over ? 'پایان و ثبت' : 'پایان زودهنگام و ثبت'}</button>
      </div>
      <p className="xs" style={{ textAlign: 'center' }}>می‌توانی اپ را ببندی؛ زمان از ساعت دستگاه حساب می‌شود.</p>
    </Page>
  );
}

const ENERGY = [{ v: 25, label: 'کم' }, { v: 55, label: 'متوسط' }, { v: 85, label: 'زیاد' }];

export function FocusEnd() {
  const nav = useNavigate();
  const toast = useToast();
  const [run] = useKV('focusRun', null);
  const [outcome, setOutcome] = useState('done');
  const [energy, setEnergy] = useState(null);
  const [note, setNote] = useState('');
  const [discard, setDiscard] = useState(false);
  if (run === undefined) return <Page tabs={false}><Skeleton /></Page>;
  if (!run) return <Navigate to="/focus" replace />;
  if (!run.endedAt) return <Navigate to="/focus/run" replace />;

  const clear = async () => { await db.kv.delete('focusRun'); cancelFocusEnd().catch(() => {}); };
  const actual = actualMinutes(run);

  const save = async () => {
    await db.focus.add({ date: run.date, start: run.start, planned: run.planned, actual, taskId: run.taskId, title: run.title, intent: run.intent, outcome, energy, note: note.trim() });
    if (outcome === 'done' && run.taskId) await db.tasks.update(run.taskId, { done: true });
    await clear();
    toast('جلسه ثبت شد.');
    nav('/focus/history');
  };

  return (
    <Page tabs={false}>
      <Top title="ثبت پایان" />
      <Card kind="mint">
        <h3>{run.title}</h3>
        <p className="s">{faNum(actual)} دقیقه از {faNum(run.planned)} دقیقهٔ برنامه‌ریزی‌شده</p>
      </Card>
      <div className="col">
        <span className="lbl">نتیجه</span>
        <div className="chips">
          {Object.entries(OUTCOME_LABEL).map(([k, l]) => <Chip key={k} on={outcome === k} onClick={() => setOutcome(k)}>{l}</Chip>)}
        </div>
      </div>
      <div className="col">
        <span className="lbl">انرژی بعد از جلسه (اختیاری)</span>
        <div className="chips">
          {ENERGY.map((e) => <Chip key={e.v} on={energy === e.v} onClick={() => setEnergy(energy === e.v ? null : e.v)}>{e.label}</Chip>)}
        </div>
      </div>
      <Field label="یادداشت (اختیاری)">
        <textarea className="in" value={note} onChange={(e) => setNote(e.target.value)} placeholder="چه چیزی کمک کرد یا چه چیزی حواس را پرت کرد؟" />
      </Field>
      <button className="btn" onClick={save}>ثبت جلسه</button>
      <button className="btn t" onClick={() => setDiscard(true)}>ثبت نکن</button>
      {discard && (
        <Dialog title="این جلسه ثبت نشود؟" text="چیزی در تاریخچه ذخیره نمی‌شود." confirm="بدون ثبت ببند" danger onConfirm={async () => { await clear(); nav('/focus'); }} onCancel={() => setDiscard(false)} />
      )}
    </Page>
  );
}
