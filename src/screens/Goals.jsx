import { useState } from 'react';
import ExamplePicker from '../ExamplePicker.jsx';
import { GOAL_EXAMPLES, addGoalExample } from '../examples.js';
import { useNavigate, useParams } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { Icon, Page, Top, Card, Chip, Empty, Fab, Field, Ck, Sheet, Dialog, Skeleton, useToast, STATUS_LABEL } from '../ui.jsx';
import { db } from '../db.js';
import { setGoalLog } from '../data.js';
import { goalProgress, weekDates } from '../logic.js';
import { dateKey, fmtDate, fmtDateFull, WEEKDAYS, WEEKDAYS_SHORT, faNum } from '../util.js';
import { GOAL_TYPES, PRIORITIES, buildGoal, newMilestone, sortGoals, toggleMilestone, validateGoal } from '../goalUtils.js';
import { GoalFormExtras, SkillSection } from './GoalMetrics.jsx';
import './Goals.css';

const TABS = [
  ['active', 'فعال'],
  ['paused', 'متوقف'],
  ['done', 'تکمیل‌شده'],
  ['archived', 'بایگانی'],
];

function useWeekLogs(goalIds) {
  const week = weekDates(dateKey());
  const logs = useLiveQuery(
    () => db.goalLogs.where('date').between(week[0], week[6], true, true).toArray(),
    [week[0]],
    undefined
  );
  return { week, logs: logs && goalIds ? logs.filter((l) => goalIds.includes(l.goalId)) : logs };
}

export function GoalsList() {
  const nav = useNavigate();
  const [tab, setTab] = useState('active');
  const [by, setBy] = useState('priority');
  const goals = useLiveQuery(() => db.goals.toArray(), [], undefined);
  const { logs } = useWeekLogs(null);

  const shown = sortGoals(goals?.filter((g) => g.status === tab) ?? [], by);
  return (
    <Page>
      <Top title="اهداف" />
      <div className="chips" role="group" aria-label="وضعیت هدف">
        {TABS.map(([k, l]) => (
          <Chip key={k} on={tab === k} onClick={() => setTab(k)}>
            {l}
          </Chip>
        ))}
      </div>
      {shown.length > 1 && (
        <div className="chips" role="group" aria-label="ترتیب نمایش">
          <Chip on={by === 'priority'} onClick={() => setBy('priority')}>بر پایهٔ اولویت</Chip>
          <Chip on={by === 'recent'} onClick={() => setBy('recent')}>تازه‌ترین</Chip>
        </div>
      )}
      {goals === undefined || logs === undefined ? (
        <Skeleton />
      ) : shown.length === 0 ? (
        <Empty
          title={tab === 'active' ? 'هنوز هدفی نساخته‌ای' : 'اینجا چیزی نیست'}
          text={tab === 'active' ? 'یک هدف کوچک و روشن شروع خوبی است. هر وقت آماده بودی.' : 'هدف‌هایی که به این بخش بروند اینجا دیده می‌شوند.'}
          action={tab === 'active' && <button className="btn sm" onClick={() => nav('/goals/new')}>ساخت اولین هدف</button>}
        />
      ) : (
        shown.map((g) => {
          const p = goalProgress(g, logs.filter((l) => l.goalId === g.id));
          return (
            <button key={g.id} className="card" style={{ textAlign: 'right', cursor: 'pointer' }} onClick={() => nav(`/goals/${g.id}`)}>
              <div className="row">
                <h3 className="grow">{g.title}</h3>
                {(g.priority ?? 2) === 1 && <span className="chip sand">{PRIORITIES[1]}</span>}
                <span className="chip teal">{GOAL_TYPES[g.type].label}</span>
              </div>
              <div className="pb" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p.ratio * 100)} aria-label={`پیشرفت ${g.title}`}>
                <i style={{ width: `${p.ratio * 100}%` }} />
              </div>
              <span className="xs">{faNum(p.label)}</span>
            </button>
          );
        })
      )}
      {goals !== undefined && tab === 'active' && shown.length < 2 && (
        <ExamplePicker items={GOAL_EXAMPLES} onAdd={addGoalExample} />
      )}
      <Fab label="هدف جدید" onClick={() => nav('/goals/new')} />
    </Page>
  );
}

const EMPTY_FORM = { title: '', why: '', type: 'daily', target: 3, deadline: '', priority: 2, milestones: [newMilestone()] };

export function GoalForm() {
  const { id } = useParams();
  const nav = useNavigate();
  const toast = useToast();
  const existing = useLiveQuery(() => (id ? db.goals.get(Number(id)) : null), [id], undefined);
  const [form, setForm] = useState(null);
  const [errors, setErrors] = useState({});
  const [saveErr, setSaveErr] = useState('');

  if (existing === undefined) return <Page tabs={false}><Skeleton /></Page>;
  const f = form ?? (existing ? { ...existing, target: existing.target ?? 3, deadline: existing.deadline ?? '', targetDate: existing.targetDate ?? existing.deadline ?? '', milestones: existing.milestones?.length ? existing.milestones : [newMilestone()] } : EMPTY_FORM);
  const set = (patch) => setForm({ ...f, ...patch });
  const setMs = (mid, title) => set({ milestones: f.milestones.map((m) => (m.id === mid ? { ...m, title } : m)) });

  const save = async () => {
    const e = validateGoal(f);
    setErrors(e);
    if (Object.keys(e).length) return;
    try {
      const data = buildGoal(f);
      if (id) {
        await db.goals.update(Number(id), data);
        toast('تغییرها ذخیره شد.');
        nav(`/goals/${id}`, { replace: true });
      } else {
        const newId = await db.goals.add(data);
        toast('هدف ساخته شد.');
        nav(`/goals/${newId}`, { replace: true });
      }
    } catch {
      setSaveErr('نتوانستیم ذخیره کنیم؛ دوباره امتحان کن. داده‌هایت امن است.');
    }
  };

  return (
    <Page tabs={false}>
      <Top title={id ? 'ویرایش هدف' : 'هدف جدید'} close="/goals" />
      <Field label="عنوان هدف" error={errors.title}>
        <input className={`in${errors.title ? ' e' : ''}`} value={f.title} maxLength={80} onChange={(e) => set({ title: e.target.value })} />
      </Field>
      <Field label="چرا برایت مهم است؟ (اختیاری)">
        <textarea className="in" value={f.why} maxLength={300} onChange={(e) => set({ why: e.target.value })} />
      </Field>
      <div className="col">
        <span className="lbl">نوع هدف</span>
        <div className="chips" role="group" aria-label="نوع هدف">
          {Object.entries(GOAL_TYPES).map(([k, t]) => (
            <Chip key={k} on={f.type === k} onClick={() => set({ type: k })}>
              {t.label}
            </Chip>
          ))}
        </div>
        <span className="xs">{GOAL_TYPES[f.type].hint}</span>
      </div>
      {f.type === 'weekly' && (
        <Field label="چند بار در هفته؟" error={errors.target}>
          <input className={`in${errors.target ? ' e' : ''}`} type="number" inputMode="numeric" min="1" max="7" value={f.target} onChange={(e) => set({ target: e.target.value })} />
        </Field>
      )}
      {f.type === 'milestones' && (
        <div className="col">
          <span className="lbl">نقطه‌عطف‌ها</span>
          {f.milestones.map((m, i) => (
            <div key={m.id} className="ms-row">
              <input className="in" aria-label={`نقطه‌عطف ${faNum(i + 1)}`} value={m.title} maxLength={80} onChange={(e) => setMs(m.id, e.target.value)} />
              {f.milestones.length > 1 && (
                <button className="ib bg" aria-label="حذف نقطه‌عطف" onClick={() => set({ milestones: f.milestones.filter((x) => x.id !== m.id) })}>
                  <Icon name="x" />
                </button>
              )}
            </div>
          ))}
          {errors.milestones && <span className="err">{errors.milestones}</span>}
          <button className="btn s2 sm" onClick={() => set({ milestones: [...f.milestones, newMilestone()] })}>
            افزودن نقطه‌عطف
          </button>
        </div>
      )}
      <GoalFormExtras f={f} set={set} errors={errors} />
      {saveErr && <p className="err" role="alert">{saveErr}</p>}
      <button className="btn" onClick={save}>
        ذخیره
      </button>
    </Page>
  );
}

function SuccessView({ goal, onReopen }) {
  const nav = useNavigate();
  return (
    <Page tabs={false}>
      <div className="hero">
        <div className="orb"><Icon name="check" size={40} /></div>
        <h1>این هدف تکمیل شد</h1>
        <p className="s">«{goal.title}» را به جایی رساندی. می‌توانی کمی مکث کنی و از مسیری که آمدی راضی باشی.</p>
        <div className="col" style={{ width: '100%' }}>
          <button className="btn" onClick={() => nav('/goals')}>بازگشت به اهداف</button>
          <button className="btn t" onClick={onReopen}>دوباره فعالش کن</button>
        </div>
      </div>
    </Page>
  );
}

export function GoalDetail() {
  const { id } = useParams();
  const gid = Number(id);
  const nav = useNavigate();
  const toast = useToast();
  const goal = useLiveQuery(() => db.goals.get(gid).then((g) => g ?? null), [gid], undefined);
  const { week, logs } = useWeekLogs([gid]);
  const [sheetDay, setSheetDay] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const today = dateKey();

  if (goal === undefined || logs === undefined) return <Page tabs={false}><Skeleton /></Page>;
  if (goal === null) return <Page tabs={false}><Top title="هدف" back="/goals" /><Empty title="این هدف پیدا نشد" text="ممکن است حذف یا جابه‌جا شده باشد." /></Page>;

  const setStatus = async (status) => {
    const prev = goal.status;
    await db.goals.update(gid, { status });
    return () => db.goals.update(gid, { status: prev });
  };
  if (goal.status === 'done') return <SuccessView goal={goal} onReopen={() => setStatus('active')} />;

  const p = goalProgress(goal, logs);
  const logOf = (d) => logs.find((l) => l.date === d);
  const logDay = async (d, status) => {
    const undo = await setGoalLog(gid, d, status);
    setSheetDay(null);
    toast(status === 'none' ? 'ثبت برداشته شد.' : `ثبت شد: ${STATUS_LABEL[status]}`, undo);
  };
  const toggle = async (mid) => {
    const before = goal;
    await db.goals.update(gid, { milestones: toggleMilestone(goal, mid).milestones });
    toast('نقطه‌عطف به‌روز شد.', () => db.goals.update(gid, { milestones: before.milestones }));
  };
  const doArchive = async () => {
    const undo = await setStatus(goal.status === 'archived' ? 'active' : 'archived');
    toast(goal.status === 'archived' ? 'هدف دوباره فعال شد.' : 'هدف بایگانی شد.', undo);
    setConfirm(null);
    nav('/goals');
  };
  const doDelete = async () => {
    await db.transaction('rw', db.goals, db.goalLogs, db.goalMetrics, db.habits, async () => {
      await db.goalLogs.where('goalId').equals(gid).delete();
      await db.goalMetrics.where('goalId').equals(gid).delete();
      await db.habits.filter((h) => h.goalId === gid).modify({ goalId: null });
      await db.goals.delete(gid);
    });
    setConfirm(null);
    toast('هدف حذف شد.');
    nav('/goals');
  };
  const doComplete = async () => {
    await setStatus('done');
    setConfirm(null);
  };

  return (
    <Page tabs={false}>
      <Top title={goal.title} back="/goals" right={<button className="ib bg" aria-label="ویرایش هدف" onClick={() => nav(`/goals/${gid}/edit`)}><Icon name="more" /></button>} />
      {goal.why && <Card kind="mint"><span className="lbl">چرا مهم است</span><p className="s">{goal.why}</p></Card>}
      <Card>
        <div className="row"><h3 className="grow">پیشرفت این هفته</h3><span className="chip teal">{GOAL_TYPES[goal.type].label}</span></div>
        <div className="pb" role="progressbar" aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round(p.ratio * 100)} aria-label="پیشرفت هدف"><i style={{ width: `${p.ratio * 100}%` }} /></div>
        <span className="xs">{faNum(p.label)}</span>
        {(goal.targetDate || goal.deadline) && <span className="xs">مهلت: {fmtDateFull(goal.targetDate || goal.deadline)}</span>}
        {goal.startDate && <span className="xs">شروع: {fmtDateFull(goal.startDate)}</span>}
        <span className="xs">{PRIORITIES[goal.priority ?? 2]}</span>
      </Card>
      {(goal.description || goal.baseline || goal.targetOutcome || goal.obstacles?.length > 0) && (
        <Card>
          {goal.description && <p className="s">{goal.description}</p>}
          {(goal.baseline || goal.targetOutcome) && <p className="xs">{goal.baseline && `وضع فعلی: ${goal.baseline}`}{goal.baseline && goal.targetOutcome && ' · '}{goal.targetOutcome && `نتیجهٔ مطلوب: ${goal.targetOutcome}`}</p>}
          {goal.obstacles?.length > 0 && <div className="chips" aria-label="موانع احتمالی">{goal.obstacles.map((o) => <span key={o} className="chip sand">{o}</span>)}</div>}
        </Card>
      )}
      {goal.type !== 'milestones' ? (
        <Card>
          <h3>ثبت روزانه</h3>
          <div className="goal-days">
            {week.map((d, i) => {
              const future = d > today;
              return (
                <button key={d} className={d === today ? 'today' : ''} disabled={future} aria-label={`${WEEKDAYS[i]} ${fmtDate(d)}: ${STATUS_LABEL[logOf(d)?.status ?? 'none']}`} onClick={() => setSheetDay(d)}>
                  <Ck status={future ? 'planned' : logOf(d)?.status ?? 'none'} />
                  {WEEKDAYS_SHORT[i]}
                </button>
              );
            })}
          </div>
        </Card>
      ) : (
        <Card>
          <h3>نقطه‌عطف‌ها</h3>
          {goal.milestones.map((m) => (
            <button key={m.id} className="rowbtn" aria-pressed={m.done} onClick={() => toggle(m.id)}>
              <Ck status={m.done ? 'done' : 'planned'} />
              <span className="grow">{m.title}</span>
            </button>
          ))}
        </Card>
      )}
      <SkillSection goal={goal} />
      <button className="btn" onClick={() => setConfirm('complete')}>تکمیل هدف</button>
      {goal.status !== 'archived' && (
        <button className="btn s2" onClick={async () => {
          const resume = goal.status === 'paused';
          const undo = await setStatus(resume ? 'active' : 'paused');
          toast(resume ? 'هدف از سر گرفته شد.' : 'هدف موقتاً متوقف شد.', undo);
        }}>
          {goal.status === 'paused' ? 'ازسرگیری هدف' : 'توقف موقت'}
        </button>
      )}
      <button className="btn s2" onClick={() => (goal.status === 'archived' ? doArchive() : setConfirm('archive'))}>
        {goal.status === 'archived' ? 'خارج کردن از بایگانی' : 'بایگانی'}
      </button>
      <button className="btn t" style={{ color: '#9A3F33' }} onClick={() => setConfirm('delete')}>حذف هدف</button>
      {sheetDay && (
        <Sheet title={fmtDate(sheetDay, true)} onClose={() => setSheetDay(null)}>
          {['done', 'partial', 'skipped'].map((s) => (
            <button key={s} className="rowbtn" onClick={() => logDay(sheetDay, s)}><Ck status={s} /><span>{STATUS_LABEL[s]}</span></button>
          ))}
          {logOf(sheetDay) && <button className="btn t" onClick={() => logDay(sheetDay, 'none')}>برداشتن ثبت</button>}
        </Sheet>
      )}
      {confirm === 'archive' && <Dialog title="بایگانی هدف؟" text="هدف از فهرست فعال کنار می‌رود و هر وقت خواستی برمی‌گردد." confirm="بایگانی" onConfirm={doArchive} onCancel={() => setConfirm(null)} />}
      {confirm === 'delete' && <Dialog title="حذف هدف؟" text="حذف، همهٔ ثبت‌های این هدف را هم پاک می‌کند و برنگشتنی است. اگر فقط می‌خواهی کنارش بگذاری، «بایگانی» داده‌هایت را نگه می‌دارد." confirm="حذف" danger onConfirm={doDelete} onCancel={() => setConfirm(null)} />}
      {confirm === 'complete' && <Dialog title="این هدف را تکمیل‌شده بدانیم؟" text="هر وقت خواستی می‌توانی دوباره فعالش کنی." confirm="بله، تکمیل شد" onConfirm={doComplete} onCancel={() => setConfirm(null)} />}
    </Page>
  );
}
