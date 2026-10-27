import { Link } from 'react-router-dom';
import { Bars, Card } from '../ui.jsx';
import { faNum } from '../util.js';
import { estimateStats, estimateText } from '../estimateLogic.js';
import { peakWindow } from '../energyLogic.js';
import { focusByArea } from '../areaLogic.js';
import { fmtMinutes } from '../capacityLogic.js';
import { JMONTHS } from '../util.js';

export function EstimateCard({ focus }) {
  const st = estimateStats(focus);
  return (
    <Card kind="teal">
      <span className="lbl">از داده‌های تو · دقت تخمین</span>
      <p>{estimateText(st)}</p>
      {st.enough && st.bands.filter((b) => b.n).map((b) => <p key={b.key} className="xs">{b.label}: {faNum(Math.round(b.ratio * 10) / 10)} برابر · {faNum(b.n)} جلسه</p>)}
      <span className="xs">{st.enough ? `از ${faNum(st.n)} جلسه` : 'منبع: جلسه‌های تمرکز'}</span>
    </Card>
  );
}

export function PeakCard({ focus }) {
  const w = peakWindow(focus);
  return (
    <Card kind="teal">
      <span className="lbl">از داده‌های تو · پنجرهٔ اوج</span>
      {w.enough ? (
        <>
          <p>بیشتر جلسه‌های موفقت بین {faNum(w.from)} تا {faNum(w.to)} بوده ({faNum(w.count)} جلسه).</p>
          <p className="xs"><strong>همبستگی است، نه علت.</strong> از {faNum(w.n)} جلسه</p>
        </>
      ) : <p className="s">هنوز داده کافی نیست؛ دست‌کم ۸ جلسه در چند ساعت مختلف لازم است.</p>}
    </Card>
  );
}

const PATTERN = ['#7C9885', '#7BA9A3', '#B8A27A', '#8B7FC4', '#5F6A63', '#344E41', '#C9D1CA'];
export function AreaCard({ focus, goals, tasks, today }) {
  const r = focusByArea(focus, goals, tasks, today);
  if (!r.total) return null;
  return (
    <Card>
      <span className="lbl">زمان تمرکز به تفکیک حوزه · ۴ هفته</span>
      <div className="stack" role="img" aria-label="سهم هر حوزه از زمان تمرکز">
        {r.rows.map((x, i) => <i key={x.key} style={{ width: `${x.share * 100}%`, background: x.key === 'none' ? '#C9D1CA' : PATTERN[i % PATTERN.length] }} />)}
      </div>
      <table className="area-tbl"><tbody>{r.rows.map((x) => <tr key={x.key}><th scope="row">{x.label}</th><td>{fmtMinutes(x.minutes)}</td><td>{faNum(Math.round(x.share * 100))}٪</td></tr>)}</tbody></table>
      <p className="xs">فقط توصیف زمان است؛ «سهم ایده‌آل» وجود ندارد.</p>
    </Card>
  );
}

export function MonthlyCard({ sums }) {
  if (!sums.length) return null;
  const rows = [...sums].sort((a, b) => (a.month < b.month ? -1 : 1)).slice(-6);
  return (
    <Card>
      <span className="lbl">تمرکز ماهانه</span>
      <Bars values={rows.map((s) => s.focusMin)} label="دقیقهٔ تمرکز هر ماه شمسی" />
      <div className="row" style={{ justifyContent: 'space-between' }}>{rows.map((s) => <span key={s.month} className="xs">{JMONTHS[Number(s.month.slice(5)) - 1]}</span>)}</div>
      <p className="xs">فقط عدد ماه نگه داشته می‌شود. <Link className="lnk" to="/review/month">مرور ماه</Link></p>
    </Card>
  );
}
