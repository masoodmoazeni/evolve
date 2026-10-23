import { Link } from 'react-router-dom';
import { Page, Top, Card, Chip, Icon, Skeleton, Toggle, Ck } from '../ui.jsx';
import { setKV } from '../db.js';
import { useGame } from '../game.js';
import { BADGES, CHEST_XP, LEVEL_NAMES, overCap } from '../gameLogic.js';
import { faNum } from '../util.js';

const Bar = ({ ratio }) => <div className="pb"><i style={{ width: `${Math.round(Math.max(0, Math.min(1, ratio)) * 100)}%` }} /></div>;

function Quests({ g }) {
  const all = g.quests.every((q) => q.done);
  return (
    <>
      {g.quests.map((q) => (
        <div className="row" key={q.id}><Ck status={q.done ? 'done' : 'planned'} small /><span className="grow s">{q.title}</span></div>
      ))}
      {all && !g.light && <p className="s">صندوقچهٔ امروز باز شد: {faNum(CHEST_XP)} امتیاز هدیه.</p>}
    </>
  );
}

// کارت فشردهٔ صفحهٔ امروز
export function GameCard() {
  const g = useGame();
  if (!g || !g.cfg.enabled) return null;
  const l = g.level;
  return (
    <Card kind="mint">
      <div className="row"><strong className="grow">سطح {faNum(l.level)} · {l.name}</strong><span className="xs">{faNum(l.into)} از {faNum(l.need)} امتیاز</span></div>
      <Bar ratio={l.ratio} />
      <span className="lbl">ماموریت‌های امروز</span>
      <Quests g={g} />
      <div className="row"><span className="xs grow">{faNum(g.active7)} از ۷ روز اخیر فعال بودی</span><Link className="lnk" to="/game">جزئیات</Link></div>
    </Card>
  );
}

export function GamePage() {
  const g = useGame();
  if (!g) return <Page tabs={false}><Top title="امتیاز و نشان‌ها" back /><Skeleton /></Page>;
  const { cfg, level: l, challenge: c } = g;
  const saveCfg = (patch) => setKV('game', { enabled: cfg.enabled, capMin: cfg.capMin, ...patch });
  const pct = Math.min(1, c.done / c.target);
  return (
    <Page tabs={false}>
      <Top title="امتیاز و نشان‌ها" back />
      <Link className="lnk" to="/howto">امتیاز چطور گرفته می‌شود؟ (نحوهٔ کار)</Link>
      {!cfg.enabled && <Card kind="sand"><p className="s">بازی‌وارسازی خاموش است. داده‌هایت نگه داشته شده و هر وقت روشنش کنی ادامه می‌دهد.</p></Card>}
      <Card kind="mint">
        <div className="row"><h2 className="grow">سطح {faNum(l.level)} · {l.name}</h2><strong>{faNum(l.xp)}</strong></div>
        <Bar ratio={l.ratio} />
        <p className="xs">{faNum(l.need - l.into)} امتیاز تا سطح بعد. امتیاز هیچ‌وقت کم نمی‌شود.</p>
      </Card>
      <Card>
        <span className="lbl">ماموریت‌های امروز</span>
        <Quests g={g} />
        <div className="row">
          <span className="grow s">روز سبک (فقط یک ماموریت)</span>
          <Toggle on={g.light} label="روز سبک" onChange={(v) => setKV(`lightDay:${g.today}`, v)} />
        </div>
        {overCap(g.today.focusMin, cfg.capMin) && <p className="s">امروز به سقف امتیاز تمرکز رسیدی. کمی استراحت هم بخشی از کار است.</p>}
      </Card>
      <Card kind="teal">
        <span className="lbl">چالش این هفته</span>
        <p className="s">{c.hasHistory ? 'کمی بالاتر از میانگین ۴ هفتهٔ خودت' : 'شروع آرام برای هفتهٔ اول'}: {faNum(Math.round(c.target / 6) / 10)} ساعت تمرکز</p>
        <Bar ratio={pct} />
        <p className="xs">{faNum(Math.round(c.done / 6) / 10)} ساعت از {faNum(Math.round(c.target / 6) / 10)} ساعت</p>
      </Card>
      <Card>
        <span className="lbl">زنجیرهٔ مهربان</span>
        <p className="s">{faNum(g.active7)} از ۷ روز اخیر فعال بودی. روز بدون فعالیت چیزی را از بین نمی‌برد.</p>
      </Card>
      <Card>
        <span className="lbl">نشان‌ها ({faNum(g.earned.size)} از {faNum(BADGES.length)})</span>
        <div className="col">
          {BADGES.map((b) => (
            <div className="row" key={b.id} style={{ opacity: g.earned.has(b.id) ? 1 : 0.45 }}>
              <Icon name={g.earned.has(b.id) ? 'spark' : 'lock'} />
              <span className="grow"><strong>{b.title}</strong><span className="xs" style={{ display: 'block' }}>{b.text}</span></span>
            </div>
          ))}
        </div>
      </Card>
      <Card>
        <span className="lbl">تنظیمات</span>
        <div className="row"><span className="grow">روشن بودن امتیاز و ماموریت</span><Toggle on={cfg.enabled} label="بازی‌وارسازی" onChange={(v) => saveCfg({ enabled: v })} /></div>
        <span className="lbl">سقف امتیاز تمرکز در روز</span>
        <div className="chips">{[120, 180, 240, 360].map((m) => <Chip key={m} on={cfg.capMin === m} onClick={() => saveCfg({ capMin: m })}>{faNum(m / 60)} ساعت</Chip>)}</div>
        <p className="xs">بعد از این سقف، تمرکز ثبت می‌شود اما امتیاز اضافه نمی‌دهد؛ برای جلوگیری از فرسودگی.</p>
      </Card>
    </Page>
  );
}

const STEPS = [
  ['۱. صبح: نگاه به «امروز»', 'کارت سبز بالای صفحهٔ امروز سطح و سه ماموریت امروزت را نشان می‌دهد. نیت امروز را بنویس و حداکثر ۳ کار اولویت‌دار بگذار.'],
  ['۲. کار اصلی: تمرکز', 'از تب «تمرکز» یک جلسه شروع کن (پیش‌فرض ۲۵ دقیقه). تایمر با صفحه و اعلان کار می‌کند. می‌توانی هر زمان زودتر تمامش کنی؛ جریمه‌ای نیست و دقیقه‌های واقعی حساب می‌شود.'],
  ['۳. در طول روز: کارها و عادت‌ها', 'کار را با زدن روی آن تمام کن و عادت را از «ثبت روزانه» یا خود صفحهٔ امروز ثبت کن. نیمه‌کاره هم حساب می‌شود.'],
  ['۴. شب: بازتاب', 'در تب «بازتاب» یادداشت، حال و انرژی و مرور روزانه را ثبت کن. این‌ها هم امتیاز دارند و به بینش‌ها و مربی داده می‌دهند.'],
];

const POINTS = [
  ['تمرکز', 'هر ۵ دقیقه ۲ امتیاز (تا سقف روزانه، پیش‌فرض ۴ ساعت)'],
  ['کار انجام‌شده', '۱۰ امتیاز'],
  ['عادت انجام‌شده یا نیمه‌کاره', '۵ امتیاز (ردشده امتیاز ندارد ولی چیزی هم کم نمی‌کند)'],
  ['یادداشت', '۳ امتیاز'],
  ['مرور روزانه یا هفتگی', '۱۰ امتیاز'],
  ['ثبت حال و انرژی', '۲ امتیاز در روز'],
  ['صندوقچهٔ روز', `${CHEST_XP} امتیاز وقتی هر سه ماموریت را کامل کنی`],
];

export function Howto() {
  return (
    <Page tabs={false}>
      <Top title="نحوهٔ کار با اِوالو" back />
      <Card kind="mint"><p className="s">اِوالو برای شروع کردن و ادامه دادن پاداش می‌دهد، نه برای کامل بودن. هیچ امتیازی کم نمی‌شود و روز خالی سرزنشی ندارد.</p></Card>
      <h2>یک روز با اِوالو</h2>
      {STEPS.map(([t, x]) => <Card key={t}><h3>{t}</h3><p className="s">{x}</p></Card>)}
      <h2>امتیاز چطور گرفته می‌شود؟</h2>
      <Card>
        {POINTS.map(([t, x]) => <div className="row" key={t}><strong>{t}</strong><span className="s grow" style={{ textAlign: 'left' }}>{x}</span></div>)}
      </Card>
      <Card>
        <h3>سطح‌ها</h3>
        <p className="s">{LEVEL_NAMES.join(' ← ')}. سطح ۲ با ۱۰۰ امتیاز، سطح ۳ با ۳۰۰، سطح ۴ با ۶۰۰ و همین‌طور بالاتر. امتیاز فقط زیاد می‌شود.</p>
      </Card>
      <Card>
        <h3>ماموریت‌ها، روز سبک و زنجیره</h3>
        <p className="s">هر روز سه ماموریت: ۲۰ دقیقه تمرکز، یک کار تمام‌شده، و یک عادت یا یادداشت. روز کم‌انرژی را با «روز سبک» به یک ماموریت کوچک کاهش بده. به‌جای زنجیرهٔ شکننده، «x از ۷ روز اخیر فعال» نشان داده می‌شود.</p>
      </Card>
      <Card>
        <h3>نشان‌ها و چالش هفته</h3>
        <p className="s">نشان‌ها با تمرکز و ثبت‌های پیوسته باز می‌شوند و می‌مانند؛ «برگشتن» برای وقتی است که بعد از چند روز وقفه برمی‌گردی. چالش هفته کمی بالاتر از میانگین ۴ هفتهٔ خودت است.</p>
      </Card>
      <Card>
        <h3>تایمر و اعلان‌ها</h3>
        <p className="s">وقتی جلسه تمرکز در جریان است و در صفحهٔ دیگری هستی، یک نوار کوچک تایمر پایین صفحه می‌ماند. پایان جلسه نوار بالای صفحه را نشان می‌دهد تا بسته شود، و در اندروید اعلان هم می‌آید. همهٔ این‌ها در «اعلان‌ها ← تنظیم یادآورها» قابل خاموش و روشن است.</p>
        <Link className="btn s2 sm" to="/notifications">اعلان‌ها</Link>
      </Card>
      <Card>
        <h3>برنامه‌ریزی و بازتاب</h3>
        <p className="s">هدف‌ها مسیر بلندمدت‌اند، عادت‌ها گام‌های تکرارشونده، تقویم برنامهٔ روز و هفته، بینش‌ها توصیف داده‌های خودت، و مربی پیشنهادهای قانون‌محور می‌دهد که فقط با تأیید خودت اعمال می‌شوند.</p>
      </Card>
      <Link className="btn" to="/game">دیدن سطح و نشان‌ها</Link>
    </Page>
  );
}
