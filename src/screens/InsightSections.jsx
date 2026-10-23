import { Card, Bars } from '../ui.jsx';
import { faNum, fmtDate } from '../util.js';
import { MIN_RECORDED } from '../insightLogic.js';
import './Reflect.css';

const pct = (r) => (r == null ? '—' : `${faNum(Math.round(r * 100))}٪`);
export const THIN = 'اطلاعات برای الگوی قابل‌اعتماد کافی نیست';

// نرخ‌ها جدا از هم؛ «ثبت‌نشده» نه انجام‌شده است و نه انجام‌نشده
export function RatesCard({ stats }) {
  const thin = stats.recorded < MIN_RECORDED;
  return (
    <Card>
      <span className="lbl">برنامه‌ریزی‌شده در برابر ثبت‌شده · ۵ هفتهٔ اخیر</span>
      <div className="g2">
        <div className="rate"><b>{faNum(stats.scheduled)}</b><span className="xs">برنامه‌ریزی‌شده</span></div>
        <div className="rate"><b>{faNum(stats.recorded)}</b><span className="xs">ثبت‌شده</span></div>
        <div className="rate"><b>{faNum(stats.done)}</b><span className="xs">انجام‌شده</span></div>
        <div className="rate"><b>{faNum(stats.partial)}</b><span className="xs">نیمه‌کاره</span></div>
        <div className="rate"><b>{faNum(stats.skipped)}</b><span className="xs">ردشدهٔ عمدی</span></div>
        <div className="rate sandy"><b>{faNum(stats.unrecorded)}</b><span className="xs">ثبت‌نشده (داده نیست)</span></div>
      </div>
      <div className="row"><span className="grow s">انجام‌شده، میان ثبت‌شده‌ها</span><b>{thin ? '—' : pct(stats.rateOfRecorded)}</b></div>
      <div className="row"><span className="grow s">انجام‌شده، میان همهٔ برنامه‌ریزی‌شده‌ها</span><b>{stats.scheduled ? pct(stats.rateOfScheduled) : '—'}</b></div>
      <p className="xs">هر دو نرخ جدا حساب می‌شوند و ثبت‌نشده‌ها نه جزو انجام‌شده‌اند و نه جزو انجام‌نشده.</p>
      <div className="row"><span className="grow s">نسخهٔ حداقل (جدا از انجام کامل)</span><b>{faNum(stats.minDone)}</b></div>
      <div className="row"><span className="grow s">زمان ثبت‌شده</span><b>{stats.hasMinutes ? `${faNum(stats.minutes)} دقیقه` : '—'}</b></div>
      {thin && <p className="xs">{THIN}؛ با چند ثبت بیشتر درصدها معنادار می‌شوند.</p>}
    </Card>
  );
}

export function WeeklyTrendCard({ trend }) {
  const withData = trend.filter((w) => w.recorded > 0);
  return (
    <Card>
      <span className="lbl">روند هفتگی · انجام‌شده</span>
      {withData.length < 2 ? (
        <p className="s">{THIN}. دست‌کم دو هفته ثبت لازم است.</p>
      ) : (
        <>
          <Bars values={trend.map((w) => (w.recorded ? w.done : null))} label="تعداد عادت‌های انجام‌شده در هر هفته؛ ستون نقطه‌چین یعنی ثبتی نیست" />
          <div className="bar-labels" aria-hidden="true">{trend.map((w) => <span key={w.weekStart}>{fmtDate(w.weekStart)}</span>)}</div>
        </>
      )}
    </Card>
  );
}

export function ObstaclesCard({ list }) {
  return (
    <Card>
      <span className="lbl">مانع‌هایی که خودت ثبت کرده‌ای</span>
      {!list.length ? (
        <p className="s">هنوز مانعی ثبت نشده. هنگام نیمه‌کاره یا ردکردن می‌توانی دلیلش را انتخاب کنی.</p>
      ) : (
        list.slice(0, 5).map((o) => (
          <div className="row" key={o.key}><span className="grow s">{o.label}</span><b>{faNum(o.n)} بار</b></div>
        ))
      )}
      {list.length > 0 && list[0].n < 3 && <p className="xs">{THIN}؛ این‌ها فقط شمارش ثبت‌های توست.</p>}
    </Card>
  );
}

export function SlotsCard({ rows }) {
  return (
    <Card>
      <span className="lbl">زمان‌هایی که بیشتر انجام شده</span>
      {!rows.length ? (
        <p className="s">{THIN}. برای هر بازهٔ روز دست‌کم ۳ ثبت لازم است.</p>
      ) : (
        <>
          {rows.map((r) => (
            <div className="row" key={r.slot}><span className="grow s">{r.label}</span><b>{pct(r.rate)}</b><span className="xs">از {faNum(r.n)} ثبت</span></div>
          ))}
          <p className="xs"><strong>همبستگی است، نه علت.</strong> ممکن است عادت‌های ساده‌تر در آن ساعت قرار داشته باشند.</p>
        </>
      )}
    </Card>
  );
}

export function DifficultyCard({ trend }) {
  const withData = trend.filter((w) => w.avg != null);
  return (
    <Card>
      <span className="lbl">روند دشواری ثبت‌شده (تلاش ۱ تا ۵)</span>
      {withData.length < 2 ? (
        <p className="s">{THIN}. اگر هنگام ثبت میزان تلاش را بنویسی، روندش اینجا دیده می‌شود.</p>
      ) : (
        <>
          <Bars values={trend.map((w) => w.avg)} max={5} label="میانگین تلاش ثبت‌شده در هر هفته؛ ستون نقطه‌چین یعنی ثبتی نیست" />
          <div className="bar-labels" aria-hidden="true">{trend.map((w) => <span key={w.weekStart}>{w.avg == null ? '—' : faNum(w.avg)}</span>)}</div>
        </>
      )}
    </Card>
  );
}
