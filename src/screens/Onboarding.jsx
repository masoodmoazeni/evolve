import TimeField from '../TimeField.jsx';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Icon, Page, Top, Card, Chip, Field, Stepper } from '../ui.jsx';
import { setKV } from '../db.js';
import { requestPermission, rescheduleAll } from '../notify.js';

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

const INTRO = [
  { title: 'بدون سرزنش', text: 'ثبت‌نشدن یعنی «داده نیست»، نه شکست. اینجا هیچ‌چیز تو را قضاوت نمی‌کند.' },
  { title: 'قدم‌های کوچک', text: 'هدف، عادت و تمرکز را با مقدار کم شروع کن. هر مقدار که بشود، خوب است.' },
  { title: 'تو تصمیم می‌گیری', text: 'مربی فقط پیشنهاد می‌دهد و بدون تأیید تو هیچ‌چیز تغییر نمی‌کند.' },
];

export function Intro() {
  const nav = useNavigate();
  const [i, setI] = useState(0);
  const last = i === INTRO.length - 1;
  return (
    <Page tabs={false}>
      <div className="row">
        <Stepper step={i + 1} total={INTRO.length} />
        <button className="lnk" onClick={() => nav('/setup')}>
          رد کردن
        </button>
      </div>
      <Card kind="mint">
        <h1>{INTRO[i].title}</h1>
        <p className="s">{INTRO[i].text}</p>
      </Card>
      <div style={{ flex: 1 }} />
      <button className="btn" onClick={() => (last ? nav('/personalize') : setI(i + 1))}>
        {last ? 'ادامه' : 'بعدی'}
      </button>
      {i > 0 && (
        <button className="btn t" onClick={() => setI(i - 1)}>
          قبلی
        </button>
      )}
    </Page>
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
  const [remindAt, setRemindAt] = useState('20:00');
  const [perm, setPerm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState('');

  const ask = async () => {
    try {
      setPerm(await requestPermission());
    } catch {
      setPerm('denied');
    }
  };

  const finish = async (skip) => {
    setSaving(true);
    try {
      await setKV('profile', {
        name: skip ? '' : name.trim(),
        remindAt: skip ? '20:00' : remindAt,
        createdAt: Date.now(),
      });
      rescheduleAll().catch(() => {});
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
      <Field label="ساعت یادآور روزانه">
        <TimeField value={remindAt} onChange={setRemindAt} label="ساعت یادآور" title="ساعت یادآور" clearable={false} />
      </Field>
      <Card kind="sand">
        <h3>اعلان‌ها</h3>
        <p className="s">یادآورها همیشه ملایم‌اند و هر وقت خواستی خاموش می‌شوند.</p>
        {perm === 'granted' && <p className="s">اعلان‌ها روشن شد.</p>}
        {perm === 'web' && <p className="s">در اپ موبایل فعال می‌شود.</p>}
        {perm === 'denied' && (
          <p className="s">اشکالی ندارد؛ اپ بدون اعلان هم کار می‌کند. بعداً از «اعلان‌ها» در پروفایل می‌توانی روشنش کنی.</p>
        )}
        {perm == null && (
          <button className="btn s2 sm" onClick={ask}>
            اجازهٔ اعلان
          </button>
        )}
      </Card>
      {err && <p className="err" role="alert">{err}</p>}
      <div style={{ flex: 1 }} />
      <button className={`btn${saving ? ' dis' : ''}`} onClick={() => finish(false)} disabled={saving}>
        بریم سراغ امروز
      </button>
    </Page>
  );
}
