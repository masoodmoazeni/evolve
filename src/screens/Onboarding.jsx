import TimeField from '../TimeField.jsx';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, Page, Top, Card, Chip, Field } from '../ui.jsx';
import { setKV } from '../db.js';
import { NotifPermissionCard } from './NotifStatus.jsx';

export function Welcome() {
  const nav = useNavigate();
  return (
    <div className="body hero">
      <div className="orb" style={{ width: 190, height: 190 }}>
        <div className="orb" style={{ width: 120, height: 120, background: '#C9DACE' }}>
          <div className="orb" style={{ width: 66, height: 66, background: 'var(--forest)', color: '#fff' }}>
            <Icon name="spark" size={32} />
          </div>
        </div>
      </div>
      <h1 style={{ fontSize: 40 }}>اِوالو</h1>
      <p className="s" style={{ fontSize: 17 }}>
        کمی بهتر، هر روز؛
        <br />
        به شیوهٔ خودت و با سرعت خودت.
      </p>
      <div className="col" style={{ width: '100%', marginTop: 30 }}>
        <button className="btn" onClick={() => nav('/intro')}>
          شروع کنیم
        </button>
        <p className="xs">همهٔ داده‌هایت فقط روی همین دستگاه می‌ماند. نیازی به ثبت‌نام نیست.</p>
      </div>
    </div>
  );
}

const ART = {
  start: (
    <svg viewBox="0 0 280 220" role="img" aria-label="جوانهٔ کوچکی که تازه سر از خاک درآورده">
      <circle cx="140" cy="110" r="100" fill="#EAF1EC" />
      <circle cx="140" cy="110" r="68" fill="#C9DACE" />
      <path d="M70 168h140" stroke="#344E41" strokeWidth="4" strokeLinecap="round" />
      <path d="M140 168v-46" stroke="#344E41" strokeWidth="5" strokeLinecap="round" />
      <path d="M140 134c-26 2-38-14-38-30 24-2 38 10 38 30z" fill="#7C9885" />
      <path d="M140 122c24 0 36-14 36-30-22-1-36 10-36 30z" fill="#344E41" />
      <circle cx="204" cy="60" r="8" fill="#F0E8D9" />
      <circle cx="68" cy="82" r="5" fill="#7BA9A3" />
    </svg>
  ),
  way: (
    <svg viewBox="0 0 280 220" role="img" aria-label="مسیری با نشانه‌های انجام‌شده، نیمه‌کاره و ثبت‌نشده">
      <circle cx="140" cy="110" r="100" fill="#EAF1EC" />
      <path d="M52 168C96 168 96 120 140 120S184 72 228 72" fill="none" stroke="#7C9885" strokeWidth="4" strokeLinecap="round" strokeDasharray="2 10" />
      <circle cx="52" cy="168" r="14" fill="#344E41" />
      <path d="M46 168l4 4 8-9" fill="none" stroke="#fff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="96" cy="140" r="14" fill="#fff" stroke="#7C9885" strokeWidth="3" />
      <path d="M96 126a14 14 0 000 28z" fill="#7C9885" />
      <circle cx="140" cy="120" r="14" fill="#F0E8D9" stroke="#B5A481" strokeWidth="3" strokeDasharray="4 3" />
      <circle cx="184" cy="96" r="14" fill="#fff" stroke="#A5B0A7" strokeWidth="3" strokeDasharray="1 5" strokeLinecap="round" />
      <circle cx="228" cy="72" r="14" fill="#fff" stroke="#7C9885" strokeWidth="3" />
    </svg>
  ),
  goal: (
    <svg viewBox="0 0 280 220" role="img" aria-label="نمودار رو به رشد و پرچمی در مقصد">
      <circle cx="140" cy="110" r="100" fill="#EAF1EC" />
      <rect x="64" y="132" width="26" height="40" rx="6" fill="#C9DACE" />
      <rect x="102" y="112" width="26" height="60" rx="6" fill="#7C9885" />
      <rect x="140" y="92" width="26" height="80" rx="6" fill="#7C9885" />
      <rect x="178" y="68" width="26" height="104" rx="6" fill="#344E41" />
      <path d="M52 172h176" stroke="#344E41" strokeWidth="4" strokeLinecap="round" />
      <path d="M220 62V34" stroke="#344E41" strokeWidth="4" strokeLinecap="round" />
      <path d="M220 34l22 8-22 8z" fill="#7BA9A3" />
    </svg>
  ),
};

const INTRO = [
  { art: 'start', tag: 'شروع', title: 'از یک قدم کوچک شروع کن', text: 'یک هدف یا عادت ساده بساز، هر اندازه که برایت شدنی است. اگر ایده‌ای نداری، نمونه‌ها آماده‌اند.' },
  { art: 'way', tag: 'مسیر', title: 'هر روز کمی، بدون سرزنش', text: 'انجام‌شده، نیمه‌کاره یا ردشده را ثبت کن. ثبت‌نشدن یعنی «داده نیست»، نه شکست. تمرکز و مرور هم همراهت‌اند.' },
  { art: 'goal', tag: 'مقصد', title: 'تغییرت را ببین', text: 'نمودارها و مربی همراه، الگوی خودت را نشان می‌دهند و فقط پیشنهاد می‌دهند. همهٔ داده‌ها فقط روی همین گوشی می‌ماند.' },
];

export function Intro() {
  const nav = useNavigate();
  const [i, setI] = useState(0);
  const [x0, setX0] = useState(null);
  const last = i === INTRO.length - 1;
  const s = INTRO[i];
  const go = (d) => setI((v) => Math.min(INTRO.length - 1, Math.max(0, v + d)));
  return (
    <div
      className="body splash"
      onTouchStart={(e) => setX0(e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (x0 == null) return;
        const dx = e.changedTouches[0].clientX - x0;
        if (Math.abs(dx) > 50) go(dx > 0 ? -1 : 1);
        setX0(null);
      }}
    >
      <div className="row">
        <span className="chip teal">{s.tag}</span>
        <span className="grow" />
        {!last && (
          <button className="lnk" onClick={() => nav('/personalize')}>
            رد کردن
          </button>
        )}
      </div>
      <div className="splash-art" key={i}>{ART[s.art]}</div>
      <div className="splash-text" key={`t${i}`}>
        <h1>{s.title}</h1>
        <p className="s">{s.text}</p>
      </div>
      <div className="splash-dots" role="tablist" aria-label="صفحه‌های معرفی">
        {INTRO.map((_, k) => (
          <button key={k} className={k === i ? 'on' : ''} role="tab" aria-selected={k === i} aria-label={`صفحهٔ ${k + 1}`} onClick={() => setI(k)} />
        ))}
      </div>
      <button className="btn" onClick={() => (last ? nav('/personalize') : go(1))}>
        {last ? 'شروع کنیم' : 'بعدی'}
      </button>
      <button className="btn t" style={{ visibility: i > 0 ? 'visible' : 'hidden' }} onClick={() => go(-1)}>
        قبلی
      </button>
    </div>
  );
}

export const MATTERS = ['آرامش', 'تمرکز', 'سلامت', 'یادگیری', 'روابط', 'کار و درآمد', 'خلاقیت', 'انرژی'];

export function Personalize() {
  const nav = useNavigate();
  const [sel, setSel] = useState([]);
  const toggle = (m) => setSel((s) => (s.includes(m) ? s.filter((x) => x !== m) : [...s, m]));
  const next = async () => {
    await setKV('matters', sel);
    nav('/setup');
  };
  return (
    <Page tabs={false}>
      <div className="row">
        <Top title="چه چیزی برایت مهم است؟" />
        <button className="lnk" onClick={() => nav('/setup')}>
          رد کردن
        </button>
      </div>
      <p className="s">هر چند مورد که خواستی انتخاب کن. فقط برای خودت ذخیره می‌شود.</p>
      <div className="chips">
        {MATTERS.map((m) => (
          <Chip key={m} on={sel.includes(m)} onClick={() => toggle(m)}>
            {m}
          </Chip>
        ))}
      </div>
      <div style={{ flex: 1 }} />
      <button className="btn" onClick={next}>
        ادامه
      </button>
    </Page>
  );
}

export function Setup() {
  const nav = useNavigate();
  const [name, setName] = useState('');
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const finish = async (skip) => {
    setSaving(true);
    try {
      await setKV('profile', {
        name: skip ? '' : name.trim(),
        createdAt: Date.now(),
      });
      nav('/today', { replace: true });
    } catch {
      setSaving(false);
      setErr('نتوانستیم ذخیره کنیم؛ دوباره امتحان کن. داده‌هایت امن است.');
    }
  };

  return (
    <Page tabs={false}>
      <div className="row">
        <Top title="چند چیز کوچک دربارهٔ تو" />
        <button className="lnk" onClick={() => finish(true)} disabled={saving}>
          رد کردن
        </button>
      </div>
      <Field label="نام (اختیاری)">
        <input className="in" value={name} maxLength={40} onChange={(e) => setName(e.target.value)} autoComplete="off" />
      </Field>
      <NotifPermissionCard />
      {err && <p className="err" role="alert">{err}</p>}
      <div style={{ flex: 1 }} />
      <button className={`btn${saving ? ' dis' : ''}`} onClick={() => finish(false)} disabled={saving}>
        بریم سراغ امروز
      </button>
    </Page>
  );
}
