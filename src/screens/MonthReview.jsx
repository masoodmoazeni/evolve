import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.js';
import { Card, Field, Page, Skeleton, Stepper, Top, Bars } from '../ui.jsx';
import { dateKey, faNum, JMONTHS } from '../util.js';
import { compareText, prevMonth, ymOf } from '../monthLogic.js';
import { fmtMinutes } from '../capacityLogic.js';

const STEPS = [
  { key: 'worked', q: 'چه چیزی کار کرد؟' },
  { key: 'lighter', q: 'چه چیزی سبک‌تر شود؟' },
  { key: 'change', q: 'یک تغییر برای ماه بعد؟' },
];

// مرور ماهانه: ۳ مرحلهٔ قابل‌رد؛ فقط اعداد ماه می‌مانند و متن‌ها بعد از ۶۰ روز پاک می‌شوند
export default function MonthReview() {
  const today = dateKey();
  const ym = ymOf(today);
  const pm = prevMonth(ym);
  const sums = useLiveQuery(() => db.monthSummaries.toArray(), [], undefined);
  const [step, setStep] = useState(1);
  const [v, setV] = useState({ worked: '', lighter: '', change: '' });
  const [done, setDone] = useState(false);
  if (!sums) return <Page tabs={false}><Top title="مرور ماه" close="/reflect" /><Skeleton /></Page>;
  const prev = sums.find((s) => s.month === pm);
  const prev2 = sums.find((s) => s.month === prevMonth(pm));
  const jm = (m) => JMONTHS[Number(m.slice(5)) - 1];
  const save = async () => { await db.reviews.add({ kind: 'month', date: today, ...v, ts: Date.now() }); setDone(true); };
  const cur = STEPS[step - 1];
  if (done) return <Page tabs={false}><Top title="مرور ماه" close="/today" /><Card kind="mint"><h2>مرور ثبت شد</h2><p className="s">همین که نگاهی انداختی کافی است.</p></Card><Link className="btn" to="/today">بازگشت به امروز</Link></Page>;
  return (
    <Page tabs={false}>
      <Top title="مرور ماه" close="/reflect" right={<Stepper step={step} total={3} />} />
      {step === 1 && (
        <Card kind="teal">
          <span className="lbl">از داده‌های تو · {prev ? jm(prev.month) : jm(pm)}</span>
          {prev ? (
            <>
              <b style={{ fontSize: 20 }}>{fmtMinutes(prev.focusMin)} تمرکز</b>
              <p className="s">{faNum(prev.tasksDone)} کار · {faNum(prev.habitDone)} عادت انجام‌شده · {faNum(prev.restDays)} روز استراحت</p>
              {compareText(prev, prev2) && <p className="s">{compareText(prev, prev2)}</p>}
              {prev.partial && <p className="xs">بخشی از داده‌های این ماه پاک شده بود؛ عددها ناقص‌اند.</p>}
            </>
          ) : <p className="s">هنوز داده کافی نیست؛ خلاصهٔ ماه بعد از تمام‌شدن ماه ساخته می‌شود.</p>}
          <Bars values={sums.slice(-4).map((s) => Math.min(100, Math.round(s.focusMin / 12)))} label="تمرکز ماه‌های اخیر" />
        </Card>
      )}
      <h3>{cur.q}</h3>
      <Field label="یادداشت (اختیاری)"><textarea className="in" rows={4} value={v[cur.key]} onChange={(e) => setV({ ...v, [cur.key]: e.target.value })} /></Field>
      <Card kind="sand"><p className="xs" style={{ color: '#4A4030' }}>فقط اعداد ماه نگه داشته می‌شود؛ متن‌هایت بعد از ۶۰ روز پاک می‌شود.</p></Card>
      <button className="btn" onClick={() => (step === 3 ? save() : setStep(step + 1))}>{step === 3 ? 'ثبت مرور' : 'ادامه'}</button>
      <button className="btn t" onClick={() => (step === 3 ? setDone(true) : setStep(step + 1))}>رد کردن این مرحله</button>
    </Page>
  );
}
