import { useLiveQuery } from 'dexie-react-hooks';
import { Bars, Card } from '../ui.jsx';
import { db } from '../db.js';
import { goalTimeStats, fmtDuration } from '../goalTime.js';
import { dateKey, fmtDate, faNum } from '../util.js';

// زمان و کارهای یک هدف (جلسه‌های تمرکزِ وصل‌شده به هدف یا به کارهای آن)
export function GoalTime({ goal }) {
  const today = dateKey();
  const data = useLiveQuery(async () => {
    const [focus, tasks] = await Promise.all([db.focus.toArray(), db.tasks.toArray()]);
    return goalTimeStats(goal, focus, tasks, today);
  }, [goal.id, goal.startDate, goal.targetDate, today], undefined);
  if (!data) return null;

  if (data.sessions === 0 && data.tasks.length === 0) {
    return (
      <Card>
        <h3>زمان و کارها</h3>
        <p className="xs">هنوز زمانی برای این هدف ثبت نشده. در «تمرکز» این هدف را انتخاب کن، یا هنگام ساختن کار آن را به این هدف وصل کن.</p>
      </Card>
    );
  }
  const recent = data.perDay.slice(-14);
  const weeks = data.perWeek.slice(-8).reverse();

  return (
    <>
      <Card kind="teal">
        <span className="lbl">از داده‌های تو</span>
        <h3>{fmtDuration(data.totalMin)} برای این هدف</h3>
        <p className="xs">{faNum(data.sessions)} جلسهٔ تمرکز در {faNum(data.activeDays)} روز{data.start && ` · از ${fmtDate(data.start)} تا ${fmtDate(data.end)}`}</p>
        {recent.length > 0 && <Bars values={recent.map((d) => d.minutes)} label="دقیقهٔ تمرکز در ۱۴ روز اخیر بازهٔ هدف" />}
        <span className="xs">ستون نقطه‌چین یعنی در آن روز ثبتی نیست.</span>
      </Card>
      {weeks.length > 0 && (
        <Card>
          <h3>زمان هر هفته</h3>
          {weeks.map((w) => (
            <div className="row" key={w.weekStart}>
              <span className="grow">هفتهٔ {fmtDate(w.weekStart)}</span>
              <span className="xs">{w.days ? fmtDuration(w.minutes) : 'ثبتی نیست'}</span>
            </div>
          ))}
        </Card>
      )}
      <Card>
        <h3>کارهای این هدف</h3>
        {data.tasksTotal > 0 && <p className="xs">{faNum(data.tasksDone)} انجام‌شده از {faNum(data.tasksTotal)} کار</p>}
        {data.tasks.map((t) => (
          <div className="row" key={t.taskId ?? `l-${t.title}`}>
            <span className="grow">{t.title}{t.done === true && ' (انجام شد)'}</span>
            <span className="xs">{t.minutes ? fmtDuration(t.minutes) : 'بدون جلسه'}</span>
          </div>
        ))}
      </Card>
    </>
  );
}
