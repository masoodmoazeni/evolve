import TimeField from '../TimeField.jsx';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, setKV, useKV } from '../db.js';
import { Page, Top, Card, Chip, Field, Icon, Skeleton, Toggle, useToast } from '../ui.jsx';
import { DEFAULT_NOTIF } from '../notify.js';
import { WEEKDAYS, faNum } from '../util.js';
import { SOUNDS, playSound } from '../sound.js';
import { alertNow } from '../alerts.js';
import { LocalBadge, RetentionPolicy } from './PrivacyNotes.jsx';
import './Settings.css';

export { Privacy, PrivacyExport, PrivacyDelete } from './PrivacyScreens.jsx';

export function AlertSettings() {
  const [stored, setStored] = useKV('notif', {});
  if (stored === undefined) return <Page tabs={false}><Top title="صدا و هشدار" back /><Skeleton /></Page>;
  const cfg = { ...DEFAULT_NOTIF, ...stored };
  const save = async (patch) => { await setStored({ ...cfg, ...patch }); };
  return (
    <Page tabs={false}>
      <Top title="صدا و هشدار" back />
      <Card>
        <span className="lbl">تایمر تمرکز</span>
        <div className="row"><span className="grow">روشن ماندن صفحه هنگام تمرکز</span><Toggle on={cfg.keepAwake} label="روشن ماندن صفحه" onChange={(v) => save({ keepAwake: v })} /></div>
      </Card>
      <Card>
        <span className="lbl">صدا</span>
        <div className="chips">
          {Object.entries(SOUNDS).map(([k, l]) => (
            <Chip key={k} on={cfg.sound === k} onClick={() => { save({ sound: k }); playSound(k, cfg.volume); }}>{l}</Chip>
          ))}
        </div>
        <Field label="بلندی صدا">
          <input type="range" min="0.1" max="1" step="0.1" value={cfg.volume} onChange={(e) => save({ volume: Number(e.target.value) })} aria-label="بلندی صدا" />
        </Field>
        <div className="row"><span className="grow">لرزش</span><Toggle on={cfg.vibrate} label="لرزش" onChange={(v) => save({ vibrate: v })} /></div>
        <button className="btn s2 sm" onClick={async () => { alertNow({ title: 'آزمایش هشدار', body: 'اگر این را می‌بینی و می‌شنوی، هشدار درون اپ درست کار می‌کند.' }); }}>آزمایش صدا و هشدار</button>
        <p className="xs">صدا و بنر پایان تمرکز وقتی اپ باز است در خود اپ نشان داده می‌شود. اِوالو اعلان سیستمی نمی‌فرستد.</p>
      </Card>
    </Page>
  );
}

export function Profile() {
  const [profile] = useKV('profile', null);
  if (profile === undefined) return <Page><Top title="پروفایل" /><Skeleton /></Page>;
  const name = profile?.name || 'دوست من';
  const links = [['/profile/edit', 'ویرایش پروفایل', 'user'], ['/prefs', 'ترجیحات', 'spark'], ['/notifications', 'صدا و هشدار', 'bell'], ['/game', 'امتیاز و نشان‌ها', 'spark'], ['/howto', 'نحوهٔ کار با اِوالو', 'book'], ['/insights', 'بینش‌ها', 'chart'], ['/coach', 'مربی', 'spark'], ['/calendar', 'تقویم', 'cal'], ['/privacy', 'حریم خصوصی و داده‌ها', 'lock'], ['/about', 'دربارهٔ اِوالو', 'spark']];
  return (
    <Page tabs={false}>
      <Top title="پروفایل" back="/today" />
      <div className="row"><span className="av" aria-hidden="true">{name.slice(0, 1)}</span><h2>{name}</h2></div>
      <Card>
        <div className="list">
          {links.map(([to, l, ic]) => (
            <Link className="row" key={to} to={to}><Icon name={ic} /><span className="grow">{l}</span><Icon name="chevl" /></Link>
          ))}
        </div>
      </Card>
      <LocalBadge />
      <p className="xs">همهٔ داده‌هایت فقط روی همین دستگاه ذخیره می‌شود و پشتیبان‌گیری با خودت است.</p>
    </Page>
  );
}

export function ProfileEdit() {
  const nav = useNavigate();
  const toast = useToast();
  const [profile] = useKV('profile', null);
  const [name, setName] = useState(null);
  if (profile === undefined) return <Page tabs={false}><Top title="ویرایش پروفایل" close /><Skeleton /></Page>;
  const n = name ?? profile?.name ?? '';
  const save = async () => {
    await setKV('profile', { ...profile, name: n.trim() });
    toast('پروفایل ذخیره شد.');
    nav(-1);
  };
  return (
    <Page tabs={false}>
      <Top title="ویرایش پروفایل" close />
      <Field label="نام (اختیاری)"><input className="in" value={n} maxLength={30} onChange={(e) => setName(e.target.value)} /></Field>
      <button className="btn" onClick={save}>ذخیره</button>
    </Page>
  );
}

const TONE_LABEL = { gentle: 'ملایم', balanced: 'متعادل', direct: 'مستقیم' };
export function Prefs() {
  const [prefs, setPrefs] = useKV('prefs', {});
  const [ret, setRet] = useKV('retention', 60);
  if (prefs === undefined || ret === undefined) return <Page tabs={false}><Top title="ترجیحات" back /><Skeleton /></Page>;
  const p = { tone: 'balanced', big: false, reduce: false, ...prefs };
  const set = (patch) => setPrefs({ ...p, ...patch });
  return (
    <Page tabs={false}>
      <Top title="ترجیحات" back />
      <LocalBadge />
      <Card>
        <span className="lbl">لحن مربی</span>
        <p className="xs">فقط جمله‌بندی را عوض می‌کند.</p>
        <div className="chips">{Object.entries(TONE_LABEL).map(([k, l]) => <Chip key={k} on={p.tone === k} onClick={() => set({ tone: k })}>{l}</Chip>)}</div>
      </Card>
      <Card>
        <div className="row"><span className="grow">متن بزرگ‌تر</span><Toggle on={p.big} label="متن بزرگ‌تر" onChange={(v) => set({ big: v })} /></div>
        <div className="row"><span className="grow">کاهش حرکت</span><Toggle on={p.reduce} label="کاهش حرکت" onChange={(v) => set({ reduce: v })} /></div>
      </Card>
      <Card>
        <span className="lbl">مدت نگه‌داری ثبت‌های روزانه</span>
        <div className="chips">{[30, 60, 90].map((n) => <Chip key={n} on={ret === n} onClick={() => setRet(n)}>{faNum(n)} روز</Chip>)}</div>
        <p className="xs">هدف‌ها و عادت‌ها پاک نمی‌شوند؛ فقط ثبت‌های قدیمی‌تر از این مدت در پاک‌سازی بعدی حذف می‌شوند.</p>
      </Card>
      <RetentionPolicy days={ret} />
    </Page>
  );
}
