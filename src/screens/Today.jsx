import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getKV, useKV } from '../db.js';
import { habitsForDate, MOODS, weekDates } from '../logic.js';
import { addDays, dateKey, faNum, fmtDate, WEEKDAYS_SHORT } from '../util.js';
import { Bars, Card, Ck, Empty, Fab, Field, Icon, Page, Skeleton, STATUS_LABEL, Top } from '../ui.jsx';
import { HabitLogSheet } from './Habits.jsx';
import AddSheet from './AddSheet.jsx';
import { greeting, splitTasks, weekBarValues } from './habitLogic.js';
import { buildCoach } from '../coachLogic.js';
import { recoveryState } from '../coachRules.js';
import { computeMilestones } from '../milestoneLogic.js';
import { DaySummary, HardDay, MilestoneCard, NextAction, RecoveryCard, nextAction, remainingMinutes } from './TodayCards.jsx';
import { setHabitLog } from '../data.js';
import { GameCard } from './Game.jsx';
import { TaskRow } from './TaskUI.jsx';
import { ifThenSentence } from '../ifThenLogic.js';
import { inboxItems } from '../planLogic.js';
import { BackupNudge, RestCards, WeekOutcomesCard } from './TodayPlan.jsx';
import { CapacityBar } from './PlanParts.jsx';
import { generateRecurring } from '../recurLogic.js';
import { weekCount } from '../logic.js';
import './Today.css';

function Intent({ today }) {
  const [saved, setSaved] = useKV(`intent:${today}`, '');
  const [draft, setDraft] = useState('');
  const [editing, setEditing] = useState(false);
  useEffect(() => {
    if (saved !== undefined) setDraft(saved);
  }, [saved]);
  if (saved === undefined) return null;
  if (saved && !editing) {
    return (
      <Card kind="mint">
        <span className="lbl">نیت امروز</span>
        <p>{saved}</p>
        <button className="lnk" onClick={() => setEditing(true)}>ویرایش</button>
      </Card>
    );
  }
  return (
    <Card kind="mint">
      <Field label="نیت امروز">
        <input className="in" value={draft} placeholder="امروز می‌خواهم…" onChange={(e) => setDraft(e.target.value)} />
      </Field>
      <button className="btn sm" onClick={async () => { await setSaved(draft.trim()); setEditing(false); }}>
        ذخیره
      </button>
    </Card>
  );
}

export function Today() {
  const today = dateKey();
  const week = weekDates(today);
  const [profile] = useKV('profile', null);
  const habits = useLiveQuery(() => db.habits.toArray(), [], undefined);
  const tasks = useLiveQuery(() => db.tasks.where('date').equals(today).toArray(), [today], undefined);
  const logs14 = useLiveQuery(() => db.habitLogs.where('date').between(addDays(today, -14), today, true, true).toArray(), [today], undefined);
  const focusRows = useLiveQuery(() => db.focus.toArray(), [], undefined);
  const history = useLiveQuery(() => db.suggestions.toArray(), [], undefined);
  const [seen] = useKV('milestonesSeen', []);
  const [recovDismissed] = useKV(`recoveryDismiss:${today}`, false);
  const moods = useLiveQuery(() => db.moods.where('date').equals(today).toArray(), [today], undefined);
  const pending = useLiveQuery(() => db.suggestions.where('status').equals('pending').first().then((s) => s ?? null), [], undefined);
  const [mode] = useKV('todayMode', 'full');
  const [rest] = useKV('rest', []);
  useEffect(() => { getKV('rest', []).then((r) => generateRecurring(today, 1, r ?? [])).catch(() => {}); }, [today]);
  const inboxRows = useLiveQuery(() => db.tasks.where('date').equals('someday').toArray(), [], undefined);
  const [more, setMore] = useState(false);
  const [sheet, setSheet] = useState(null);
  const [adding, setAdding] = useState(false);

  const name = profile?.name;
  const head = (
    <Top title={`${greeting(new Date().getHours())}${name ? `، ${name}` : ''}`} right={<><Link className="ib bg" to="/profile" aria-label="پروفایل"><Icon name="user" /></Link></>} />
  );
  if (!habits || !tasks || !logs14 || !moods || !focusRows || !history || seen === undefined || recovDismissed === undefined || mode === undefined || rest === undefined || !inboxRows || pending === undefined) return <Page>{head}<Skeleton rows={4} /></Page>;

  const weekLogs = logs14.filter((l) => l.date >= week[0] && l.date <= week[6]);
  const active = habits.filter((h) => h.status !== 'archived');
  const todays = habitsForDate(active, today, rest);
  const todayLogs = new Map(weekLogs.filter((l) => l.date === today).map((l) => [l.habitId, l]));
  const { priorities, others } = splitTasks(tasks);
  const doneCount = weekLogs.filter((l) => l.status === 'done').length;
  const partialCount = weekLogs.filter((l) => l.status === 'partial').length;
  const firstDay = active.length === 0 && tasks.length === 0;
  const mood = moods[0] ? MOODS[moods[0].mood] : null;
  const logged = new Set(todayLogs.keys());
  const next = nextAction(todays, logged, tasks);
  const hardDay = moods[0] && (['tired', 'hard'].includes(moods[0].mood) || (moods[0].energy != null && moods[0].energy < 40));
  const recov = recovDismissed ? null : recoveryState({ habits: active, habitLogs: logs14, today, rest });
  const recovSuggestion = recov
    ? buildCoach({ habits: active, habitLogs: logs14, tasksTomorrow: [], focus: [], moods: [], suggestions: history, today }).suggestions.find((x) => x.habitId === recov.habit.id)
    : null;
  const nextHabit = todays.find((h) => !logged.has(h.id) && h.id !== recov?.habit.id);
  const simple = mode === 'simple';
  const byId = new Map(habits.map((h) => [h.id, h]));
  const inboxCount = inboxItems(inboxRows).length;
  const milestones = computeMilestones({ habitLogs: logs14, focus: focusRows, today, seen });
  const logMinimum = async (h) => {
    const m = Number(h.minVersion);
    await setHabitLog(h.id, today, 'partial', { usedMin: true, amount: Number.isNaN(m) ? null : m });
  };

  return (
    <Page>
      {head}
      <p className="td-date">{fmtDate(today, true)}</p>
      {firstDay && (
        <Empty
          title="امروز یک روز تازه است"
          text="لازم نیست همه‌چیز را همین حالا بچینی. یک کار یا یک عادت کوچک کافی است."
          action={
            <div className="col" style={{ width: '100%' }}>
              <Link className="btn" to="/habits/new">ساخت عادت</Link>
              <button className="btn s2" onClick={() => setAdding(true)}>افزودن کار</button>
            </div>
          }
        />
      )}
      <RestCards today={today} rest={rest} />
      <BackupNudge today={today} />
      {recov && <RecoveryCard state={recov} suggestion={recovSuggestion} nextHabit={nextHabit} today={today} onMinimum={logMinimum} onResume={(h) => setSheet({ habit: h, date: today })} />}
      <NextAction next={next} remaining={remainingMinutes(todays, logged)} onHabit={(h) => setSheet({ habit: h, date: today })} byId={byId} />
      {hardDay && <HardDay todays={todays} logged={logged} today={today} />}
      <CapacityBar tasks={tasks} date={today} />
      <WeekOutcomesCard today={today} />
      <Card>
        <div className="row"><span className="lbl grow">اولویت‌های امروز</span><span className="xs">حداکثر ۳</span></div>
        {priorities.length === 0 ? <p className="s">هنوز اولویتی نگذاشته‌ای؛ با دکمهٔ + یکی اضافه کن.</p> : <div>{priorities.map((t) => <TaskRow key={t.id} task={t} />)}</div>}
        {others.length > 0 && (
          <>
            <span className="lbl">کارهای دیگر</span>
            <div>{others.map((t) => <TaskRow key={t.id} task={t} />)}</div>
          </>
        )}
      </Card>
      <Card>
        <div className="row"><span className="lbl grow">عادت‌های امروز</span><Link className="lnk" to="/habits/log">ثبت روزانه</Link></div>
        {todays.length === 0 ? (
          <p className="s">برای امروز عادتی برنامه‌ریزی نشده است.</p>
        ) : (
          <div>
            {todays.map((h) => {
              const st = todayLogs.get(h.id)?.status ?? 'none';
              return (
                <button key={h.id} className="rowbtn" aria-label={`${h.title}، ${STATUS_LABEL[st]}`} onClick={() => setSheet({ habit: h, date: today })}>
                  <Ck status={st} />
                  <span className="grow">
                    {h.title}
                    {ifThenSentence(h, byId) && <span className="xs" style={{ display: 'block' }}>{ifThenSentence(h, byId)}</span>}
                  </span>
                  {h.weeklyTarget > 0 ? <span className="xs">{weekCount(h.id, weekLogs, week[0]) >= h.weeklyTarget ? 'این هفته کامل' : `${faNum(weekCount(h.id, weekLogs, week[0]))} از ${faNum(h.weeklyTarget)} در این هفته`}</span> : h.amount ? <span className="xs">{faNum(h.amount)} دقیقه</span> : null}
                </button>
              );
            })}
          </div>
        )}
      </Card>
      {inboxCount > 0 && <Link className="chip out" to="/plan/inbox">صندوق ورودی · {faNum(inboxCount)}</Link>}
      {simple && (
        <button className="lnk" aria-expanded={more} onClick={() => setMore(!more)}>{more ? 'کمتر ˄' : 'بیشتر ˅'}</button>
      )}
      {(!simple || more) && (
        <>
          <MilestoneCard items={milestones} seen={seen} />
          <GameCard />
          <Intent today={today} />
      <DaySummary todays={todays} todayLogs={todayLogs} />
      <Link className="card teal" to="/focus">
        <div className="row"><Icon name="timer" /><span className="grow"><b>یک جلسهٔ تمرکز</b><span className="xs" style={{ display: 'block' }}>هر وقت آماده بودی شروع کن</span></span><Icon name="chevl" /></div>
      </Link>
      <Card>
        <span className="lbl">این هفته</span>
        {doneCount + partialCount === 0 ? (
          <p className="s">هنوز ثبتی برای این هفته نیست؛ ثبت‌نشده یعنی داده نیست.</p>
        ) : (
          <p className="s">{faNum(doneCount)} بار انجام‌شده و {faNum(partialCount)} بار نیمه‌کاره ثبت کرده‌ای.</p>
        )}
        <Bars values={weekBarValues(weekLogs, week, today)} label="نمودار عادت‌های این هفته" />
        <div className="g7 td-wk">{WEEKDAYS_SHORT.map((w) => <span key={w}>{w}</span>)}</div>
      </Card>
      <Link className="card" to="/mood">
        <div className="row">
          <span className="grow"><b>حال امروز</b><span className="xs" style={{ display: 'block' }}>{mood ? `ثبت‌شده: ${mood.label}` : 'اگر خواستی، حالت را ثبت کن'}</span></span>
          <Icon name="chevl" />
        </div>
      </Link>
      <Link className="card" to="/review/day">
        <div className="row"><span className="grow"><b>مرور امروز</b><span className="xs" style={{ display: 'block' }}>سه مرحلهٔ کوتاه؛ هر مرحله قابل‌رد است</span></span><Icon name="chevl" /></div>
      </Link>
      {pending && (
        <Link className="card ai" to="/coach">
          <span className="ai-tag">پیشنهاد مربی · اعمال نشده</span>
          <p className="s">{pending.text || pending.title || 'یک پیشنهاد برای دیدن آماده است.'}</p>
        </Link>
      )}
        </>
      )}
      <Fab label="افزودن سریع" onClick={() => setAdding(true)} />
      {sheet && <HabitLogSheet {...sheet} onClose={() => setSheet(null)} />}
      {adding && <AddSheet today={today} onClose={() => setAdding(false)} />}
    </Page>
  );
}
