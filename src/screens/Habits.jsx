import ExamplePicker from '../ExamplePicker.jsx';
import { HABIT_EXAMPLES, addHabitExample } from '../examples.js';
import TimeField from '../TimeField.jsx';
import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.js';
import { recordRevision } from '../data.js';
import { habitsForDate } from '../logic.js';
import { addDays, dateKey, faNum, fmtDate, WEEKDAYS, WEEKDAYS_SHORT } from '../util.js';
import { rescheduleAll } from '../notify.js';
import { Bars, Chip, Ck, Dialog, Empty, Fab, Field, Page, Select, Skeleton, STATUS_LABEL, Top, useToast, Card } from '../ui.jsx';
import { TIME_OF_DAY, barValues, changedFields, emptyHabit, habitToForm, hasExtras, lastDays, splitCounts, toHabitRecord, validateHabit } from './habitLogic.js';
import { DifficultyChips, HabitLogSheet, ListEditor, PrepChecklist, Revisions, habitSub } from './HabitParts.jsx';
import './Habits.css';

export { HabitLogSheet };

const SAVE_ERR = 'نتوانستیم ذخیره کنیم؛ دوباره امتحان کن. داده‌هایت امن است.';

function HabitRow({ habit, log, onOpen }) {
  const status = log?.status ?? 'none';
  return (
    <button className="rowbtn" onClick={onOpen} aria-label={`${habit.title}، ${STATUS_LABEL[status]}`}>
      <Ck status={status} />
      <span className="grow">
        <b>{habit.title}</b>
        {habitSub(habit) && <span className="hb-sub" style={{ display: 'block' }}>{habitSub(habit)}</span>}
      </span>
    </button>
  );
}

export function HabitsList() {
  const nav = useNavigate();
  const today = dateKey();
  const habits = useLiveQuery(() => db.habits.toArray(), [], undefined);
  const logs = useLiveQuery(() => db.habitLogs.where('date').equals(today).toArray(), [today], undefined);
  const [sheet, setSheet] = useState(null);

  if (!habits || !logs) return <Page><Top title="عادت‌ها" /><Skeleton /></Page>;
  const active = habits.filter((h) => h.status !== 'archived');
  const todays = habitsForDate(active, today);
  const byId = new Map(logs.map((l) => [l.habitId, l]));

  return (
    <Page>
      <Top title="عادت‌ها" right={<Link className="chip out" to="/habits/log">ثبت روزانه</Link>} />
      {active.length === 0 ? (
        <Empty
          title="هنوز عادتی نداری"
          text="با یک عادت کوچک شروع کن؛ هر اندازه که برایت شدنی است."
          action={<Link className="btn" to="/habits/new">ساخت عادت</Link>}
        />
      ) : (
        <>
          <Card>
            <span className="lbl">امروز · {fmtDate(today, true)}</span>
            {todays.length === 0 ? (
              <p className="s">برای امروز عادتی برنامه‌ریزی نشده است.</p>
            ) : (
              <div>
                {todays.map((h) => (
                  <HabitRow key={h.id} habit={h} log={byId.get(h.id)} onOpen={() => setSheet({ habit: h, date: today })} />
                ))}
              </div>
            )}
          </Card>
          <Card>
            <span className="lbl">همهٔ عادت‌ها</span>
            <div className="list">
              {active.map((h) => (
                <Link key={h.id} className="row" to={`/habits/${h.id}`}>
                  <span className="grow">
                    <b>{h.title}</b>
                    {habitSub(h) && <span className="hb-sub" style={{ display: 'block' }}>{habitSub(h)}</span>}
                  </span>
                  {h.paused && <span className="chip sand">توقف موقت</span>}
                </Link>
              ))}
            </div>
          </Card>
        </>
      )}
      {active.length < 2 && <ExamplePicker items={HABIT_EXAMPLES} onAdd={addHabitExample} />}
      <Fab label="عادت تازه" onClick={() => nav('/habits/new')} />
      {sheet && <HabitLogSheet {...sheet} onClose={() => setSheet(null)} />}
    </Page>
  );
}

function HabitFormInner({ initial, prev }) {
  const nav = useNavigate();
  const toast = useToast();
  const goals = useLiveQuery(() => db.goals.where('status').equals('active').toArray(), [], []);
  const [f, setF] = useState(initial);
  const [err, setErr] = useState({});
  const [more, setMore] = useState(hasExtras(initial));
  const set = (k, v) => setF((x) => ({ ...x, [k]: v }));
  const toggleDay = (d) => set('days', f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d]);

  async function submit() {
    const e = validateHabit(f);
    setErr(e);
    if (Object.keys(e).length) return;
    try {
      const rec = toHabitRecord(f, prev);
      let id = prev?.id;
      if (id != null) {
        const changes = changedFields(prev, rec);
        if (changes.length) await recordRevision(prev, `تغییر: ${changes.join('، ')}`, 'user');
        await db.habits.put({ ...rec, id });
      }
      else id = await db.habits.add(rec);
      rescheduleAll().catch(() => {});
      toast('عادت ذخیره شد');
      nav(prev ? `/habits/${id}` : '/habits');
    } catch {
      toast(SAVE_ERR);
    }
  }

  return (
    <Page tabs={false}>
      <Top title={prev ? 'ویرایش عادت' : 'عادت تازه'} back close={prev ? `/habits/${prev.id}` : '/habits'} />
      <Field label="نام عادت" error={err.title}>
        <input className={`in${err.title ? ' e' : ''}`} value={f.title} onChange={(e) => set('title', e.target.value)} />
      </Field>
      <Field label="مقدار (دقیقه)" error={err.amount}>
        <input className={`in${err.amount ? ' e' : ''}`} type="number" inputMode="numeric" min="0" value={f.amount} onChange={(e) => set('amount', e.target.value)} />
      </Field>
      <Field label="نسخهٔ کوچک برای روزهای سخت (اختیاری)">
        <input className="in" value={f.minVersion} onChange={(e) => set('minVersion', e.target.value)} />
      </Field>
      <div className="col">
        <span className="lbl">روزهای هفته (از شنبه)</span>
        <div className="dayrow" role="group" aria-label="روزهای هفته">
          {WEEKDAYS_SHORT.map((s, d) => (
            <Chip key={d} on={f.days.includes(d)} aria-label={WEEKDAYS[d]} onClick={() => toggleDay(d)}>
              {s}
            </Chip>
          ))}
        </div>
        {err.days && <span className="err">{err.days}</span>}
      </div>
      <div className="col">
        <span className="lbl">زمان روز</span>
        <div className="chips" role="group" aria-label="زمان روز">
          {TIME_OF_DAY.map((t) => (
            <Chip key={t.key} on={f.timeOfDay === t.key} onClick={() => set('timeOfDay', t.key)}>
              {t.label}
            </Chip>
          ))}
        </div>
      </div>
      <Field label="یادآور (اختیاری)" error={err.reminder}>
        <TimeField value={f.reminder} onChange={(v) => set('reminder', v)} label="ساعت یادآور" title="ساعت یادآور" />
      </Field>
      <button className="lnk" aria-expanded={more} onClick={() => setMore(!more)}>
        {more ? 'بستن گزینه‌های بیشتر' : 'گزینه‌های بیشتر: نشانه، نسخهٔ چالشی، آماده‌سازی'}
      </button>
      {more && (
        <div className="col hb-more">
          <Field label="نشانهٔ شروع؛ بعد از چه کاری؟ (اختیاری)">
            <input className="in" value={f.cue} placeholder="مثلاً بعد از صبحانه" onChange={(e) => set('cue', e.target.value)} />
          </Field>
          <Field label="نسخهٔ چالشی (دقیقه، اختیاری)" error={err.challengeMin}>
            <input className={`in${err.challengeMin ? ' e' : ''}`} type="number" inputMode="numeric" min="0" value={f.challengeMin} onChange={(e) => set('challengeMin', e.target.value)} />
          </Field>
          <DifficultyChips value={f.difficulty} onChange={(v) => set('difficulty', v)} />
          <ListEditor label="آماده‌سازی محیط" items={f.prep} onChange={(v) => set('prep', v)} placeholder="مثلاً لباس ورزشی را شب قبل آماده کن" />
          <ListEditor label="موانع احتمالی" items={f.obstaclesNote} onChange={(v) => set('obstaclesNote', v)} placeholder="مثلاً خستگی بعد از کار" />
        </div>
      )}
      <Field label="مرتبط با هدف (اختیاری)">
        <Select label="مرتبط با هدف" value={f.goalId} onChange={(v) => set('goalId', String(v))} options={[{ value: '', label: 'بدون هدف' }, ...goals.map((g) => ({ value: g.id, label: g.title }))]} />
      </Field>
      <button className="btn" onClick={submit}>
        ذخیره
      </button>
    </Page>
  );
}

export function HabitForm() {
  const { id } = useParams();
  const habit = useLiveQuery(() => (id ? db.habits.get(Number(id)).then((h) => h ?? null) : Promise.resolve(false)), [id], undefined);
  if (habit === undefined) return <Page tabs={false}><Top title="عادت" back /><Skeleton rows={4} /></Page>;
  if (id && !habit) return <Page tabs={false}><Top title="عادت" back="/habits" /><Empty title="این عادت پیدا نشد" text="ممکن است حذف شده باشد." action={<Link className="btn" to="/habits">بازگشت به عادت‌ها</Link>} /></Page>;
  return <HabitFormInner key={id ?? 'new'} initial={habit ? habitToForm(habit) : emptyHabit()} prev={habit || undefined} />;
}

export function HabitDetail() {
  const nav = useNavigate();
  const toast = useToast();
  const id = Number(useParams().id);
  const today = dateKey();
  const dates = lastDays(today, 14);
  const habit = useLiveQuery(() => db.habits.get(id).then((h) => h ?? null), [id], undefined);
  const logs = useLiveQuery(() => db.habitLogs.where('[habitId+date]').between([id, dates[0]], [id, today], true, true).toArray(), [id, today], undefined);
  const [sheet, setSheet] = useState(false);
  const [del, setDel] = useState(false);

  if (habit === undefined || !logs) return <Page tabs={false}><Top title="عادت" back="/habits" /><Skeleton rows={4} /></Page>;
  if (!habit) return <Page tabs={false}><Top title="عادت" back="/habits" /><Empty title="این عادت پیدا نشد" text="ممکن است حذف شده باشد." action={<Link className="btn" to="/habits">بازگشت به عادت‌ها</Link>} /></Page>;

  const counts = splitCounts(logs);
  const togglePause = async () => {
    const was = !!habit.paused;
    await db.habits.update(id, { paused: !was });
    rescheduleAll().catch(() => {});
    toast(was ? 'عادت از سر گرفته شد' : 'عادت موقتاً متوقف شد؛ داده‌هایت سر جایش است', () => db.habits.update(id, { paused: was }));
  };
  const remove = async () => {
    await db.transaction('rw', db.habits, db.habitLogs, db.habitRevisions, db.kv, async () => {
      await db.habitLogs.where('habitId').equals(id).delete();
      await db.habitRevisions.where('habitId').equals(id).delete();
      await db.kv.delete(`prep:${id}`);
      await db.habits.delete(id);
    });
    rescheduleAll().catch(() => {});
    toast('عادت حذف شد');
    nav('/habits');
  };

  return (
    <Page tabs={false}>
      <Top title={habit.title} back="/habits" />
      <Card kind="mint">
        <span className="lbl">برنامه</span>
        <p className="s">{(habit.days ?? []).map((d) => WEEKDAYS[d]).join('، ') || 'بدون روز'}</p>
        {habit.cue && <p className="s">نشانهٔ شروع: {habit.cue}</p>}
        <div className="hb-versions">
          <span><b>حداقل</b>{habit.minVersion || 'تعریف نشده'}</span>
          <span><b>عادی</b>{habit.amount ? `${faNum(habit.amount)} دقیقه` : 'تعریف نشده'}</span>
          <span><b>چالشی</b>{habit.challengeMin ? `${faNum(habit.challengeMin)} دقیقه` : 'تعریف نشده'}</span>
        </div>
        {habit.difficulty && <p className="xs">سختی: {['', 'آسان', 'متوسط', 'چالشی'][habit.difficulty]}</p>}
        {habit.obstaclesNote?.length > 0 && <p className="xs">موانع احتمالی: {habit.obstaclesNote.join('، ')}</p>}
        {habit.reminder && <p className="s">یادآور: {faNum(habit.reminder)}</p>}
        {habit.paused && <span className="chip sand">توقف موقت</span>}
      </Card>
      <Card>
        <span className="lbl">۱۴ روز اخیر</span>
        <Bars values={barValues(logs, dates)} max={100} label="نمودار ثبت‌های ۱۴ روز اخیر" />
        <p className="xs">ستون نقطه‌چین یعنی ثبت‌نشده؛ فقط داده نیست.</p>
        <div className="hb-counts">
          <span><Ck status="done" small />{faNum(counts.full)} انجام‌شده</span>
          <span><Ck status="partial" small />{faNum(counts.partial)} نیمه‌کاره</span>
          <span><Ck status="skipped" small />{faNum(counts.skipped)} ردشده</span>
        </div>
        {counts.minimum > 0 && <p className="xs">{faNum(counts.minimum)} بار هم نسخهٔ حداقل را انجام دادی؛ این‌ها جدا شمرده می‌شود و همچنان یک قدم معنادار است، نه انجام کامل.</p>}
      </Card>
      <PrepChecklist habit={habit} />
      <button className="btn" onClick={() => setSheet(true)}>ثبت امروز</button>
      <button className="btn s2" onClick={() => nav(`/habits/${id}/edit`)}>ویرایش</button>
      <button className="btn s2" onClick={togglePause}>{habit.paused ? 'از سر گرفتن' : 'توقف موقت'}</button>
      <button className="lnk" onClick={() => setDel(true)}>حذف عادت</button>
      <Revisions habitId={id} />
      {sheet && <HabitLogSheet habit={habit} date={today} onClose={() => setSheet(false)} />}
      {del && (
        <Dialog title="حذف عادت؟" text="حذف، همهٔ ثبت‌های این عادت را هم پاک می‌کند و برنگشتنی است. اگر فقط می‌خواهی کمی استراحت کنی، «توقف موقت» داده‌هایت را نگه می‌دارد." confirm="حذف" danger onConfirm={remove} onCancel={() => setDel(false)}>
          <button className="btn s2" onClick={() => { setDel(false); togglePause(); }}>
            توقف موقت به‌جای حذف
          </button>
        </Dialog>
      )}
    </Page>
  );
}

export function HabitsLog() {
  const today = dateKey();
  const yesterday = addDays(today, -1);
  const habits = useLiveQuery(() => db.habits.toArray(), [], undefined);
  const logs = useLiveQuery(() => db.habitLogs.where('date').anyOf([today, yesterday]).toArray(), [today], undefined);
  const [sheet, setSheet] = useState(null);

  if (!habits || !logs) return <Page tabs={false}><Top title="ثبت روزانه" back="/habits" /><Skeleton /></Page>;
  const active = habits.filter((h) => h.status !== 'archived');
  const section = (date, title, note) => {
    const list = habitsForDate(active, date);
    const by = new Map(logs.filter((l) => l.date === date).map((l) => [l.habitId, l]));
    return (
      <Card>
        <span className="lbl">{title} · {fmtDate(date, true)}</span>
        {note && <p className="xs">{note}</p>}
        {list.length === 0 ? (
          <p className="s">عادتی برای این روز برنامه‌ریزی نشده است.</p>
        ) : (
          <div>{list.map((h) => <HabitRow key={h.id} habit={h} log={by.get(h.id)} onOpen={() => setSheet({ habit: h, date })} />)}</div>
        )}
      </Card>
    );
  };

  return (
    <Page tabs={false}>
      <Top title="ثبت روزانه" back="/habits" />
      {section(today, 'امروز')}
      {section(yesterday, 'مرور دیروز', 'اگر دیروز چیزی ثبت نشده، یعنی داده نیست؛ اگر خواستی الان ثبتش کن.')}
      {sheet && <HabitLogSheet {...sheet} onClose={() => setSheet(null)} />}
    </Page>
  );
}
