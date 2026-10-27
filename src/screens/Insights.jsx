import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.js';
import { Page, Top, Card, Empty, Skeleton } from '../ui.jsx';
import { WEEKDAYS_SHORT, addDays, dateKey, faNum, fmtDate, weekStart } from '../util.js';
import { buildInsights, dayMap, difficultyTrend, indicators, MIN_DAYS, obstacleRanking, periodStats, slotStats, weeklyTrend } from '../insightLogic.js';
import { AreaCard, EstimateCard, MonthlyCard, PeakCard } from './InsightPlan.jsx';
import { DifficultyCard, ObstaclesCard, RatesCard, SlotsCard, WeeklyTrendCard } from './InsightSections.jsx';
import './Insights.css';

const WEEKS = 5;
const LEVEL_TEXT = ['ثبت‌نشده', 'ثبت شده، بدون انجام‌شده', 'کمتر از نیمی انجام‌شده', 'بیش از نیمی انجام‌شده', 'همه انجام‌شده'];

export function Insights() {
  const today = dateKey();
  const start = weekStart(addDays(today, -7 * (WEEKS - 1)));
  const cells = Array.from({ length: WEEKS * 7 }, (_, i) => addDays(start, i));
  const data = useLiveQuery(async () => {
    const [habits, habitLogs, focus, moods, focusAll, goals, tasks, sums] = await Promise.all([
      db.habits.toArray(),
      db.habitLogs.where('date').between(start, today, true, true).toArray(),
      db.focus.where('date').between(start, today, true, true).toArray(),
      db.moods.where('date').between(start, today, true, true).toArray(),
      db.focus.toArray(),
      db.goals.toArray(),
      db.tasks.where('date').between(addDays(today, -28), today, true, true).toArray(),
      db.monthSummaries.toArray(),
    ]);
    return { habits, habitLogs, focus, moods, focusAll, goals, tasks, sums };
  }, [start, today]);

  if (!data) return <Page><Top title="بینش‌ها" back /><Skeleton /></Page>;

  const past = cells.filter((d) => d <= today);
  const days = dayMap({ habits: data.habits, habitLogs: data.habitLogs, dates: past });
  const byDate = Object.fromEntries(days.map((d) => [d.date, d]));
  const weekStarts = Array.from({ length: WEEKS }, (_, i) => addDays(start, 7 * i));
  const stats = periodStats({ habits: data.habits, habitLogs: data.habitLogs, dates: past, today });
  const trend = weeklyTrend({ habits: data.habits, habitLogs: data.habitLogs, weekStarts, today });
  const ind = indicators({ days, focus: data.focus, moods: data.moods });
  const ins = buildInsights({ days, habitLogs: data.habitLogs, focus: data.focus, moods: data.moods });

  if (!data.habits.length && !data.focus.length && !data.moods.length) {
    return (
      <Page>
        <Top title="بینش‌ها" back />
        <Empty title="هنوز داده کافی نیست" text="وقتی چند روز عادت، تمرکز یا حال ثبت کنی، اینجا تصویر روشنی از ثبت‌هایت می‌بینی." action={<Link className="btn sm" to="/habits/new">ساخت اولین عادت</Link>} />
      </Page>
    );
  }

  return (
    <Page>
      <Top title="بینش‌ها" back />
      <p className="s">این صفحه فقط ثبت‌های خودت را توصیف می‌کند؛ قضاوت یا پیش‌بینی نیست.</p>

      <Card>
        <span className="lbl">نقشهٔ روزها · ۵ هفتهٔ اخیر</span>
        <div className="g7 xs" aria-hidden="true">{WEEKDAYS_SHORT.map((w) => <span key={w}>{w}</span>)}</div>
        <div className="hm">
          {cells.map((d) => {
            if (d > today) return <i key={d} className="hm-future" aria-hidden="true" />;
            const x = byDate[d];
            return <i key={d} className={`l${x.level}`} role="img" aria-label={`${fmtDate(d)}: ${LEVEL_TEXT[x.level]}`} />;
          })}
        </div>
        <div className="row hm-legend xs" aria-hidden="true">
          {LEVEL_TEXT.map((t, i) => (
            <span key={t} className="row"><i className={`l${i}`} />{t}</span>
          ))}
        </div>
        <p className="xs">خانهٔ نقطه‌چین یعنی «داده نیست»؛ نه شکست.</p>
      </Card>

      <div className="g2">
        <Card kind="mint">
          <span className="lbl">روزهای دارای ثبت</span>
          <h2>{faNum(ind.loggedDays)} از {faNum(ind.totalDays)}</h2>
        </Card>
        <Card kind="mint">
          <span className="lbl">سهم «انجام‌شده»</span>
          <h2>{ind.doneShare == null ? '—' : `${faNum(Math.round(ind.doneShare * 100))}٪`}</h2>
          <span className="xs">از ثبت‌های عادت‌ها</span>
        </Card>
        <Card kind="mint">
          <span className="lbl">تمرکز</span>
          <h2>{faNum(ind.focusMinutes)} دقیقه</h2>
          <span className="xs">{faNum(ind.focusSessions)} جلسه</span>
        </Card>
        <Card kind="mint">
          <span className="lbl">ثبت حال</span>
          <h2>{faNum(ind.moodDays)} روز</h2>
        </Card>
      </div>

      <RatesCard stats={stats} />
      <WeeklyTrendCard trend={trend} />
      <ObstaclesCard list={obstacleRanking(data.habitLogs)} />
      <SlotsCard rows={slotStats(data.habits, data.habitLogs)} />
      <DifficultyCard trend={difficultyTrend(data.habitLogs, weekStarts)} />

      <EstimateCard focus={data.focusAll} />
      <PeakCard focus={data.focusAll} />
      <AreaCard focus={data.focusAll} goals={data.goals} tasks={data.tasks} today={today} />
      <MonthlyCard sums={data.sums} />

      <h2>از داده‌های تو</h2>
      {!ins.enough && (
        <Empty title="هنوز داده کافی نیست" text={`برای دیدن الگوها دست‌کم ${faNum(MIN_DAYS)} روز ثبت عادت لازم است؛ ${faNum(ins.needed)} روز دیگر. بدون عجله، هر وقت ثبت کردی.`} />
      )}
      {ins.enough && !ins.items.length && <Card kind="teal"><p className="s">فعلاً الگوی روشنی در ثبت‌هایت دیده نمی‌شود، و این اشکالی ندارد.</p></Card>}
      {ins.items.map((it) => (
        <Card key={it.id} kind="teal">
          <span className="lbl">از داده‌های تو</span>
          <p>{it.text}</p>
          {it.correlation && <p className="xs"><strong>همبستگی است، نه علت.</strong></p>}
          <span className="xs">منبع: {it.source}</span>
        </Card>
      ))}

      <Link className="btn s2" to="/coach">دیدن پیشنهادهای مربی</Link>
    </Page>
  );
}
