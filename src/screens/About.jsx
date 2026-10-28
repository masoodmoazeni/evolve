import { Page, Top, Card } from '../ui.jsx';
import { faNum, dateKey, fmtDateFull } from '../util.js';

// __BUILD__ توسط Vite در زمان بیلد تزریق می‌شود (در آزمون‌ها تعریف نیست)
const build = typeof __BUILD__ !== 'undefined' ? __BUILD__ : { version: 'dev', time: new Date().toISOString(), id: 'dev' };

const PALETTE = [
  ['سبز جنگلی', '#344E41', 'دکمهٔ اصلی و عنوان'],
  ['سبز مریم‌گلی', '#7C9885', 'اصلی و پیشرفت'],
  ['نعنایی', '#EAF1EC', 'کارت تأکیدی'],
  ['عاجی', '#FAF9F6', 'پس‌زمینه'],
  ['فیروزه‌ای', '#7BA9A3', 'از داده‌های تو'],
  ['اطلس', '#EAE7F4', 'فقط پیشنهاد مربی'],
  ['شنی', '#F0E8D9', 'ثبت‌نشده و ردشده'],
];

export function About() {
  const d = new Date(build.time);
  const t = `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
  return (
    <Page tabs={false}>
      <Top title="دربارهٔ اِوالو" back="/profile" />
      <Card kind="mint">
        <h3>هدف اپ</h3>
        <p className="s">اِوالو همراهی آرام برای رشد شخصی پایدار است: هدف، عادت، تمرکز، برنامه و بازتاب؛ بدون سرزنش، بدون فشار و همه‌چیز فقط روی همین دستگاه.</p>
      </Card>
      <Card>
        <span className="lbl">شناسهٔ ساخت</span>
        <div className="row"><span className="grow">نسخه</span><strong>{faNum(build.version)}</strong></div>
        <div className="row"><span className="grow">زمان ساخت</span><strong>{fmtDateFull(dateKey(d))}، {faNum(t)}</strong></div>
        <div className="row"><span className="grow">شناسهٔ بیلد</span><strong dir="ltr">{build.id}</strong></div>
        <p className="xs">هر بیلد جدید شناسهٔ تازه‌ای می‌گیرد؛ با آن می‌فهمی کدام نسخه نصب است.</p>
      </Card>
      <Card>
        <span className="lbl">ترکیب رنگ</span>
        {PALETTE.map(([name, hex, use]) => (
          <div className="row" key={hex}>
            <span aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 14, background: hex, border: '1px solid var(--line)', flex: 'none' }} />
            <span className="grow">{name}<span className="xs" style={{ display: 'block' }}>{use}</span></span>
            <span className="xs" dir="ltr">{hex}</span>
          </div>
        ))}
      </Card>
    </Page>
  );
}
