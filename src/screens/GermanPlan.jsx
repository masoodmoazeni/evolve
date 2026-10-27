import { useKV } from '../db.js';
import DateField from '../DateField.jsx';
import { Card, Ck, Page, Skeleton, Top, useToast } from '../ui.jsx';
import { SKILLS, LESSONS, buildPlan, dayMinutes, defaultStart } from '../german/plan.js';
import { dateKey, faNum, fmtDate, WEEKDAYS } from '../util.js';

export function GermanPlan() {
  const toast = useToast();
  const today = dateKey();
  const [start, setStart] = useKV('germanStart', null);
  const [done, setDone] = useKV('germanDone', []);
  if (start === undefined || done === undefined) return <Page tabs={false}><Top title="برنامهٔ آلمانی A1" back="/today" /><Skeleton rows={4} /></Page>;

  const begin = start || defaultStart(today);
  const plan = buildPlan(begin);
  const doneSet = new Set(done);
  const toggle = async (date) => {
    const next = doneSet.has(date) ? done.filter((d) => d !== date) : [...done, date];
    await setDone(next);
    if (!doneSet.has(date)) toast('ثبت شد.');
  };
  const weeks = [...new Set(plan.map((d) => d.week))];

  return (
    <Page tabs={false}>
      <Top title="برنامهٔ آلمانی A1" back="/today" />
      <Card kind="mint">
        <span className="lbl">هدف: آزمون A1 با نمرهٔ بالای ۸۰ از ۱۰۰</span>
        <p className="s">هر روز حدود {faNum(45)} دقیقه. شش هفته، هر هفته دو درس؛ هفتهٔ هفتم مرور و دو آزمون آزمایشی. جمعه‌ها آزاد است. اگر روزی نشد، همان بخش را روز بعد ادامه بده؛ نیازی به جبران نیست.</p>
        <span className="lbl">تاریخ شروع</span>
        <DateField label="تاریخ شروع" value={begin} onChange={setStart} />
      </Card>
      {weeks.map((w) => {
        const ds = plan.filter((d) => d.week === w);
        const lessons = w <= 6 ? `درس ${faNum(w * 2 - 1)} و ${faNum(w * 2)}: ${LESSONS[w * 2 - 2].title} و ${LESSONS[w * 2 - 1].title}` : 'مرور و آزمون آزمایشی';
        return (
          <Card key={w}>
            <span className="lbl">هفتهٔ {faNum(w)}</span>
            <p className="s">{lessons}</p>
            {ds.map((d) => {
              const rest = d.items[0].skill === 'rest';
              const isToday = d.date === today;
              const status = doneSet.has(d.date) ? 'done' : rest || d.date >= today ? 'planned' : 'none';
              return (
                <div className="col" key={d.date} style={isToday ? { background: 'var(--mint)', borderRadius: 12, padding: 8 } : undefined}>
                  <div className="row">
                    <Ck status={status} small />
                    <b className="grow">{WEEKDAYS[d.slot]} · {fmtDate(d.date)}{isToday ? ' (امروز)' : ''}</b>
                    <span className="xs">{rest ? '' : `${faNum(dayMinutes(d))} دقیقه`}</span>
                  </div>
                  {d.items.map((it, i) => (
                    <div className="row" key={i}>
                      <span className="chip">{SKILLS[it.skill]}</span>
                      <span className="grow s">{it.text}</span>
                    </div>
                  ))}
                  {!rest && (
                    <button className="btn s2 sm" onClick={() => toggle(d.date)}>
                      {doneSet.has(d.date) ? 'برداشتن علامت' : 'این روز را انجام دادم'}
                    </button>
                  )}
                </div>
              );
            })}
          </Card>
        );
      })}
    </Page>
  );
}
