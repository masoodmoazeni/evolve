import TimeField from '../TimeField.jsx';
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, setKV, useKV } from '../db.js';
import { Page, Top, Card, Chip, Field, Icon, Skeleton, Toggle, useToast } from '../ui.jsx';
import { DEFAULT_NOTIF, buildSchedule, isNative, permissionState, requestPermission, rescheduleAll } from '../notify.js';
import { WEEKDAYS, faNum } from '../util.js';
import { SOUNDS, playSound } from '../sound.js';
import { alertNow, requestWebPermission } from '../alerts.js';
import { LocalBadge, RetentionPolicy } from './PrivacyNotes.jsx';
import './Settings.css';

export { Privacy, PrivacyExport, PrivacyDelete } from './PrivacyScreens.jsx';

const rs = () => rescheduleAll().catch(() => {});

export function Notifications() {
  const [perm, setPerm] = useState(null);
  const [profile] = useKV('profile', null);
  const [stored] = useKV('notif', {});
  const habits = useLiveQuery(() => db.habits.toArray(), []);
  useEffect(() => { permissionState().then(setPerm).catch(() => setPerm('web')); }, []);
  if (perm === null || stored === undefined || !habits) return <Page><Top title="اعلان‌ها" back /><Skeleton /></Page>;
  const cfg = { ...DEFAULT_NOTIF, ...stored };
  const items = buildSchedule(profile, habits, cfg);
  const ask = async () => { setPerm(await requestPermission()); rs(); };
  return (
    <Page>
      <Top title="اعلان‌ها" back />
      {perm === 'web' && <Card kind="sand"><p className="s">یادآورها در اپ موبایل فعال می‌شود. اینجا می‌توانی از حالا تنظیمشان کنی.</p></Card>}
      {perm === 'denied' && (
        <Card kind="sand">
          <h3>اعلان‌ها فعلاً خاموش است</h3>
          <p className="s">اشکالی ندارد؛ اپ بدون اعلان هم کامل کار می‌کند. هر وقت خواستی، از تنظیمات گوشی برای اِوالو اعلان را روشن کن.</p>
          <p className="xs">اگر اعلان‌ها دیر می‌رسند، در تنظیمات باتری گوشی اِوالو را از «صرفه‌جویی» مستثنا کن.</p>
          <button className="btn sm s2" onClick={ask}>دوباره امتحان کن</button>
        </Card>
      )}
      {perm === 'granted' && <Card kind="mint"><p className="s">اعلان‌ها فعال است. لحن یادآورها دعوت‌کننده است و ساعت سکوت رعایت می‌شود.</p></Card>}
      {isNative() && perm !== 'granted' && perm !== 'denied' && <button className="btn" onClick={ask}>روشن کردن اعلان‌ها</button>}
      <h2>یادآورهای برنامه‌ریزی‌شده</h2>
      {!items.length && <Card><p className="s">فعلاً یادآوری تنظیم نشده است.</p></Card>}
      {items.length > 0 && (
        <Card>
          {items.slice(0, 12).map((n) => (
            <div className="row" key={n.key}>
              <Icon name="bell" />
              <span className="grow s">{n.title}</span>
              <span className="xs">{n.weekday ? `${WEEKDAYS[n.weekday === 7 ? 0 : n.weekday]} · ` : 'هر روز · '}{faNum(n.time)}</span>
            </div>
          ))}
        </Card>
      )}
      <Link className="btn s2" to="/notifications/settings">تنظیم یادآورها</Link>
    </Page>
  );
}

export function NotifSettings() {
  const [stored, setStored] = useKV('notif', {});
  if (stored === undefined) return <Page tabs={false}><Top title="تنظیم یادآورها" back /><Skeleton /></Page>;
  const cfg = { ...DEFAULT_NOTIF, ...stored };
  const save = async (patch) => { await setStored({ ...cfg, ...patch }); rs(); };
  const rowsT = [['enabled', 'اعلان‌ها'], ['daily', 'یادآور روزانه'], ['habits', 'یادآور عادت‌ها'], ['review', 'دعوت به مرور شبانه']];
  return (
    <Page tabs={false}>
      <Top title="تنظیم یادآورها" back />
      <Card>
        {rowsT.map(([k, l]) => (
          <div className="row" key={k}><span className="grow">{l}</span><Toggle on={cfg[k]} label={l} onChange={(v) => save({ [k]: v })} /></div>
        ))}
      </Card>
      <Card>
        <span className="lbl">ساعت سکوت</span>
        <div className="g2">
          <Field label="از"><TimeField value={cfg.quietFrom} onChange={(v) => save({ quietFrom: v || '22:00' })} label="شروع ساعت سکوت" title="شروع سکوت" clearable={false} /></Field>
          <Field label="تا"><TimeField value={cfg.quietTo} onChange={(v) => save({ quietTo: v || '07:00' })} label="پایان ساعت سکوت" title="پایان سکوت" clearable={false} /></Field>
        </div>
      </Card>
      <Card>
        <span className="lbl">سقف اعلان در روز</span>
        <div className="row">
          <button className="ib bg" aria-label="کمتر" onClick={() => save({ cap: Math.max(1, cfg.cap - 1) })}>−</button>
          <strong className="grow" style={{ textAlign: 'center' }}>{faNum(cfg.cap)}</strong>
          <button className="ib bg" aria-label="بیشتر" onClick={() => save({ cap: Math.min(10, cfg.cap + 1) })}>+</button>
        </div>
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
        <button className="btn s2 sm" onClick={async () => { await requestWebPermission(); alertNow({ title: 'آزمایش اعلان', body: 'اگر این را می‌بینی و می‌شنوی، یادآورها درست کار می‌کنند.' }); }}>آزمایش صدا و اعلان</button>
        <p className="xs">صدای پایان تمرکز و یادآورها وقتی اپ باز است در خود اپ پخش می‌شود. در اندروید اعلان‌ها با صدای پیش‌فرض گوشی نمایش داده می‌شوند.</p>
      </Card>
      {!isNative() && <p className="xs">در مرورگر، اعلان وقتی اپ باز است یا به‌صورت PWA نصب شده کار می‌کند. در اپ اندروید حتی با بسته‌بودن اپ هم می‌آید.</p>}
    </Page>
  );
}

export function Profile() {
  const [profile] = useKV('profile', null);
  if (profile === undefined) return <Page><Top title="پروفایل" /><Skeleton /></Page>;
  const name = profile?.name || 'دوست من';
  const links = [['/profile/edit', 'ویرایش پروفایل', 'user'], ['/prefs', 'ترجیحات', 'spark'], ['/notifications', 'اعلان‌ها', 'bell'], ['/insights', 'بینش‌ها', 'chart'], ['/coach', 'مربی', 'spark'], ['/calendar', 'تقویم', 'cal'], ['/privacy', 'حریم خصوصی و داده‌ها', 'lock'], ['/about', 'دربارهٔ اِوالو', 'spark']];
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
  const [at, setAt] = useState(null);
  if (profile === undefined) return <Page tabs={false}><Top title="ویرایش پروفایل" close /><Skeleton /></Page>;
  const n = name ?? profile?.name ?? '';
  const t = at ?? profile?.remindAt ?? '20:00';
  const save = async () => {
    await setKV('profile', { ...profile, name: n.trim(), remindAt: t });
    rs();
    toast('پروفایل ذخیره شد.');
    nav(-1);
  };
  return (
    <Page tabs={false}>
      <Top title="ویرایش پروفایل" close />
      <Field label="نام (اختیاری)"><input className="in" value={n} maxLength={30} onChange={(e) => setName(e.target.value)} /></Field>
      <Field label="ساعت یادآور روزانه"><TimeField value={t} onChange={setAt} label="ساعت یادآور روزانه" title="ساعت یادآور" clearable={false} /></Field>
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
