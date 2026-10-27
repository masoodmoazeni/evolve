import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { countPrunable, exportAll, prune, setPruneAck, useKV, wipeAll } from '../db.js';
import { Page, Top, Card, Dialog, Field, Icon, Skeleton, useToast } from '../ui.jsx';
import { faNum } from '../util.js';
import { demoCount, removeDemoData } from '../demoLogic.js';
import { logsCSV, saveFile, stamp } from '../exportLogic.js';
import { DataLossNote, LocalBadge, RetentionPolicy } from './PrivacyNotes.jsx';

const SAVE_ERR = 'نتوانستیم خروجی بسازیم؛ دوباره امتحان کن. داده‌هایت امن است.';

export function Privacy() {
  const toast = useToast();
  const [ret] = useKV('retention', 60);
  const [ack] = useKV('pruneAck', false);
  const count = useLiveQuery(() => countPrunable(), [], undefined);
  const demo = useLiveQuery(() => demoCount(), [], 0);
  const dropDemo = async () => {
    try {
      const r = await removeDemoData();
      toast(`${faNum(r.count)} داده نمونه حذف شد.`, r.undo);
    } catch {
      toast('نتوانستیم حذف کنیم؛ دوباره امتحان کن. داده‌هایت امن است.');
    }
  };
  if (ret === undefined || ack === undefined || count === undefined) return <Page tabs={false}><Top title="حریم خصوصی" back="/profile" /><Skeleton /></Page>;
  const exportNow = async () => {
    try {
      const where = await saveFile(`evolve-${stamp()}.json`, JSON.stringify(await exportAll(), null, 2), 'application/json');
      toast(where ? `خروجی ذخیره شد: ${where}` : 'خروجی آماده شد.');
    } catch {
      toast(SAVE_ERR);
    }
  };
  const go = async () => {
    await setPruneAck();
    await prune().catch(() => {});
    toast('باشه؛ ثبت‌های قدیمی پاک‌سازی شد.');
  };
  return (
    <Page tabs={false}>
      <Top title="حریم خصوصی" back="/profile" />
      <LocalBadge />
      <Card kind="mint">
        <Icon name="lock" />
        <p className="s">داده‌هایت فقط روی همین دستگاه می‌ماند؛ هیچ حساب، سرور یا ردیابی‌ای در کار نیست.</p>
      </Card>
      <RetentionPolicy days={ret} />
      <DataLossNote />
      {!ack && count > 0 && (
        <Card kind="sand">
          <h3>پیش از اولین پاک‌سازی</h3>
          <p className="s">{faNum(count)} ثبت قدیمی‌تر از {faNum(ret)} روز وجود دارد که در پاک‌سازی بعدی حذف می‌شود. اگر می‌خواهی، اول خروجی بگیر.</p>
          <button className="btn sm s2" onClick={exportNow}>اول خروجی JSON بگیر</button>
          <button className="btn sm t" onClick={go}>فهمیدم، ادامه بده</button>
        </Card>
      )}
      <div className="col">
        <Link className="btn s2" to="/privacy/export">خروجی گرفتن از داده‌ها</Link>
        <Link className="btn s2" to="/privacy/import">وارد کردن پشتیبان</Link>
        <Link className="btn s2" to="/privacy/coach">خروجی برای مربی هوشمند (AI)</Link>
        <Link className="btn s2" to="/privacy/report">گزارش و تحلیل داده‌ها</Link>
        {demo > 0 && <button className="btn s2" onClick={dropDemo}>حذف داده‌های نمونه ({faNum(demo)})</button>}
        <Link className="btn t" to="/privacy/delete">حذف همهٔ داده‌ها</Link>
      </div>
    </Page>
  );
}

export function PrivacyExport() {
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const run = async (kind) => {
    setBusy(true);
    setMsg('');
    try {
      const all = await exportAll();
      let where;
      if (kind === 'json') where = await saveFile(`evolve-${stamp()}.json`, JSON.stringify(all, null, 2), 'application/json');
      else where = await saveFile(`evolve-logs-${stamp()}.csv`, logsCSV(all.tables), 'text/csv');
      setMsg(where ? `خروجی ذخیره شد: ${where}` : 'خروجی آماده شد و برگهٔ اشتراک‌گذاری باز شد.');
    } catch {
      setMsg(SAVE_ERR);
    }
    setBusy(false);
  };
  return (
    <Page tabs={false}>
      <Top title="خروجی داده‌ها" back="/privacy" />
      <LocalBadge />
      <p className="s">خروجی فایل است و فقط تو به آن دسترسی داری. آن را جای امنی نگه دار.</p>
      <Card>
        <h3>همهٔ داده‌ها (JSON)</h3>
        <p className="xs">شامل هدف‌ها، عادت‌ها، ثبت‌ها، یادداشت‌ها و تنظیمات؛ مناسب پشتیبان.</p>
        <button className={`btn${busy ? ' dis' : ''}`} disabled={busy} onClick={() => run('json')}>گرفتن JSON</button>
      </Card>
      <Card>
        <h3>ثبت‌ها (CSV)</h3>
        <p className="xs">ثبت عادت‌ها، هدف‌ها و جلسه‌های تمرکز؛ مناسب صفحه‌گسترده.</p>
        <button className={`btn s2${busy ? ' dis' : ''}`} disabled={busy} onClick={() => run('csv')}>گرفتن CSV</button>
      </Card>
      {msg && <p className="s" role="status">{msg}</p>}
      <div className="col">
        <Link className="btn s2" to="/privacy/coach">خروجی برای مربی هوشمند (AI)</Link>
        <Link className="btn t" to="/privacy/report">گزارش و تحلیل داده‌ها</Link>
        <Link className="btn t" to="/privacy/import">وارد کردن پشتیبان</Link>
      </div>
    </Page>
  );
}

export function PrivacyDelete() {
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState('');
  const [err, setErr] = useState('');
  const confirm = async () => {
    try {
      await wipeAll();
      window.location.replace('#/welcome');
      window.location.reload();
    } catch {
      setErr('نتوانستیم حذف کنیم؛ دوباره امتحان کن.');
    }
  };
  return (
    <Page tabs={false}>
      <Top title="حذف همهٔ داده‌ها" back="/privacy" />
      <Card kind="sand">
        <h3>این کار برگشت‌پذیر نیست</h3>
        <p className="s">هدف‌ها، عادت‌ها، ثبت‌ها، یادداشت‌ها و تنظیمات از این دستگاه پاک می‌شود. پیشنهاد می‌کنیم اول خروجی بگیری.</p>
        <Link className="btn sm s2" to="/privacy/export">اول خروجی می‌گیرم</Link>
      </Card>
      <button className="btn danger" onClick={() => setOpen(true)}>ادامه برای حذف</button>
      {open && (
        <Dialog title="حذف همهٔ داده‌ها؟" text="برای تأیید، کلمهٔ «حذف» را بنویس." confirm="حذف همه‌چیز" danger disabled={word.trim() !== 'حذف'} onConfirm={confirm} onCancel={() => { setOpen(false); setWord(''); }}>
          <Field label="کلمهٔ تأیید" error={err}><input className="in" value={word} onChange={(e) => setWord(e.target.value)} autoComplete="off" /></Field>
        </Dialog>
      )}
    </Page>
  );
}
