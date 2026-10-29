import TimeField from '../TimeField.jsx';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, setKV, useKV } from '../db.js';
import { Page, Top, Card, Chip, Field, Icon, Skeleton, Toggle, useToast } from '../ui.jsx';
import { DEFAULT_NOTIF } from '../notify.js';
import { DEFAULT_DAY_PLAN } from '../capacityLogic.js';
import { DEFAULT_RITUALS } from './Ritual.jsx';
import { WEEKDAYS, faNum } from '../util.js';
import { SOUNDS, playSound } from '../sound.js';
import { alertNow } from '../alerts.js';
import { NotifPermissionCard } from './NotifStatus.jsx';
import { LocalBadge, RetentionPolicy } from './PrivacyNotes.jsx';
import './Settings.css';

export { Privacy, PrivacyExport, PrivacyDelete } from './PrivacyScreens.jsx';

export function AlertSettings() {
  const [stored, setStored] = useKV('notif', {});
  const [rit, setRit] = useKV('rituals', DEFAULT_RITUALS);
  if (stored === undefined || rit === undefined) return <Page tabs={false}><Top title="صدا و هشدار" back="/profile" /><Skeleton /></Page>;
  const cfg = { ...DEFAULT_NOTIF, ...stored };
  const save = async (patch) => { await setStored({ ...cfg, ...patch }); };
  return (
    <Page tabs={false}>
      <Top title="صدا و هشدار" back="/profile" />
      <NotifPermissionCard full />
      <Card>
        <span className="lbl">اعلان‌ها</span>
        <div className="row"><span className="grow">اعلان‌ها روشن باشند</span><Toggle on={cfg.enabled} label="اعلان‌ها" onChange={(v) => save({ enabled: v })} /></div>
        <div className="row"><span className="grow">پایان جلسهٔ تمرکز</span><Toggle on={cfg.focusEnd} label="اعلان پایان تمرکز" onChange={(v) => save({ focusEnd: v })} /></div>
        <div className="row"><span className="grow">کارهای ساعت‌دار</span><Toggle on={cfg.tasks} label="اعلان کارهای ساعت‌دار" onChange={(v) => save({ tasks: v })} /></div>
        <div className="row"><span className="grow">ساعت‌های عادت‌ها</span><Toggle on={cfg.habits} label="یادآور عادت‌ها" onChange={(v) => save({ habits: v })} /></div>
        <div className="row"><span className="grow">یادآور روزانه</span><Toggle on={cfg.daily} label="یادآور روزانه" onChange={(v) => save({ daily: v })} /></div>
        {cfg.daily && (
          <Field label="ساعت یادآور روزانه">
            <TimeField value={cfg.dailyAt} onChange={(v) => save({ dailyAt: v || DEFAULT_NOTIF.dailyAt })} label="ساعت یادآور" title="ساعت یادآور روزانه" clearable={false} />
          </Field>
        )}
        <p className="xs">یادآور هر عادت از «ساعت مناسب» همان عادت و فقط در روزهای انتخاب‌شده‌اش می‌آید. کارهایی که ساعت دارند سر همان ساعت اعلان می‌دهند.</p>
      </Card>
      <Card>
        <span className="lbl">آیین شروع و پایان روز (اختیاری)</span>
        {[['morning', 'آیین صبح', '/ritual/morning'], ['evening', 'آیین شب', '/ritual/evening']].map(([k, label, to]) => (
          <div key={k} className="col">
            <div className="row"><span className="grow">{label}</span><Toggle on={rit[k]?.on} label={label} onChange={(v) => setRit({ ...DEFAULT_RITUALS, ...rit, [k]: { ...DEFAULT_RITUALS[k], ...rit[k], on: v } })} /></div>
            {rit[k]?.on && <Field label="ساعت یادآور"><TimeField value={rit[k].at} onChange={(v) => setRit({ ...rit, [k]: { ...rit[k], at: v || DEFAULT_RITUALS[k].at } })} label={`ساعت ${label}`} clearable={false} /></Field>}
            <Link className="lnk" to={to}>دیدن مسیر</Link>
          </div>
        ))}
      </Card>
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
        <p className="xs">وقتی اپ باز است، صدا و بنر در خود اپ نشان داده می‌شود؛ وقتی بسته است، اعلان سیستمی می‌رسد.</p>
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
  if (profile === undefined) return <Page tabs={false}><Top title="ویرایش پروفایل" close="/profile" /><Skeleton /></Page>;
  const n = name ?? profile?.name ?? '';
  const save = async () => {
    await setKV('profile', { ...profile, name: n.trim() });
    toast('پروفایل ذخیره شد.');
    nav(-1);
  };
  return (
    <Page tabs={false}>
      <Top title="ویرایش پروفایل" close="/profile" />
      <Field label="نام (اختیاری)"><input className="in" value={n} maxLength={30} onChange={(e) => setName(e.target.value)} /></Field>
      <button className="btn" onClick={save}>ذخیره</button>
    </Page>
  );
}

const TONE_LABEL = { gentle: 'ملایم', balanced: 'متعادل', direct: 'مستقیم' };
export function Prefs() {
  const [prefs, setPrefs] = useKV('prefs', {});
  const [ret, setRet] = useKV('retention', 60);
  const [todayMode, setTodayMode] = useKV('todayMode', 'full');
  const [dayPlan, setDayPlan] = useKV('dayPlan', null);
  if (prefs === undefined || ret === undefined || todayMode === undefined || dayPlan === undefined) return <Page tabs={false}><Top title="ترجیحات" back="/profile" /><Skeleton /></Page>;
  const p = { tone: 'balanced', big: false, reduce: false, ...prefs };
  const set = (patch) => setPrefs({ ...p, ...patch });
  return (
    <Page tabs={false}>
      <Top title="ترجیحات" back="/profile" />
      <LocalBadge />
      <Card>
        <span className="lbl">لحن مربی</span>
        <p className="xs">فقط جمله‌بندی را عوض می‌کند.</p>
        <div className="chips">{Object.entries(TONE_LABEL).map(([k, l]) => <Chip key={k} on={p.tone === k} onClick={() => set({ tone: k })}>{l}</Chip>)}</div>
      </Card>
      <Card>
        <span className="lbl">ساعت‌های در دسترس من</span>
        <p className="xs">ظرفیت هر روز از همین ساعت‌ها (با ۲۰٪ حاشیه) حساب می‌شود.</p>
        <div className="g2">
          <Field label="شروع"><TimeField value={(dayPlan ?? DEFAULT_DAY_PLAN).start} onChange={(v) => setDayPlan({ ...DEFAULT_DAY_PLAN, ...dayPlan, start: v || '08:00' })} label="شروع" clearable={false} /></Field>
          <Field label="پایان"><TimeField value={(dayPlan ?? DEFAULT_DAY_PLAN).end} onChange={(v) => setDayPlan({ ...DEFAULT_DAY_PLAN, ...dayPlan, end: v || '22:00' })} label="پایان" clearable={false} /></Field>
        </div>
        <Link className="btn s2 sm" to="/rest">استراحت و سفر</Link>
      </Card>
      <Card>
        <span className="lbl">نمای امروز</span>
        <p className="xs">«ساده» فقط چیزهای لازم را نشان می‌دهد و بقیه زیر «بیشتر» است.</p>
        <div className="chips" role="group" aria-label="نمای امروز">
          <Chip on={todayMode === 'simple'} onClick={() => setTodayMode('simple')}>ساده</Chip>
          <Chip on={todayMode !== 'simple'} onClick={() => setTodayMode('full')}>کامل</Chip>
        </div>
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
