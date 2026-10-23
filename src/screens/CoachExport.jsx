import { useEffect, useMemo, useState } from 'react';
import { exportAll } from '../db.js';
import { Page, Top, Card, Chip, Skeleton } from '../ui.jsx';
import { faNum } from '../util.js';
import { copyText, saveFile, shareText, stamp } from '../exportLogic.js';
import { DEFAULT_COACH_OPTS, buildCoachExport } from '../coachExport.js';

const RANGES = [7, 30, 60];

export function CoachExport() {
  const [tables, setTables] = useState(null);
  const [o, setO] = useState(DEFAULT_COACH_OPTS);
  const [msg, setMsg] = useState('');
  const set = (k, v) => setO((s) => ({ ...s, [k]: v }));

  useEffect(() => {
    exportAll().then((a) => setTables(a.tables)).catch(() => setMsg('نتوانستیم داده‌ها را بخوانیم؛ دوباره امتحان کن. داده‌هایت امن است.'));
  }, []);
  const text = useMemo(() => (tables ? buildCoachExport(tables, o) : ''), [tables, o]);

  if (!tables) return <Page tabs={false}><Top title="خروجی برای مربی هوشمند" back="/privacy/export" />{msg ? <p className="err">{msg}</p> : <Skeleton />}</Page>;

  const copy = async () => setMsg((await copyText(text)) ? 'کپی شد. حالا در ChatGPT، Gemini یا Claude بچسبان.' : 'کپی نشد؛ «ذخیره فایل» را امتحان کن.');
  const share = async () => {
    try {
      setMsg((await shareText('داده‌های اِوالو برای مربی', text)) ? '' : 'اشتراک‌گذاری در این مرورگر نیست؛ «کپی متن» را بزن.');
    } catch {
      setMsg('اشتراک‌گذاری لغو شد.');
    }
  };
  const save = async () => {
    try {
      const where = await saveFile(`evolve-coach-${stamp()}.txt`, text, 'text/plain');
      setMsg(where ? `ذخیره شد: ${where}` : 'فایل آماده شد و برگهٔ اشتراک‌گذاری باز شد.');
    } catch {
      setMsg('نتوانستیم فایل بسازیم؛ دوباره امتحان کن. داده‌هایت امن است.');
    }
  };

  return (
    <Page tabs={false}>
      <Top title="خروجی برای مربی هوشمند" back="/privacy/export" />
      <p className="s">یک متن آماده که هر دستیار هوش مصنوعی (ChatGPT، Gemini، Claude و…) را به مربی تو تبدیل می‌کند. سرآیند فارسی و انگلیسی دستورالعمل مربی‌گری است و بعد از آن داده‌های ساخت‌یافتهٔ تو می‌آید.</p>
      <Card kind="sand">
        <h3>پیش از فرستادن</h3>
        <p className="xs">این متن از دستگاه تو بیرون می‌رود وقتی خودت آن را جایی بچسبانی یا بفرستی. هرچه را نمی‌خواهی، خاموش بگذار.</p>
      </Card>
      <Card>
        <span className="lbl">بازهٔ زمانی</span>
        <div className="chips">{RANGES.map((d) => <Chip key={d} on={o.days === d} onClick={() => set('days', d)}>{faNum(d)} روز اخیر</Chip>)}</div>
        <span className="lbl">شامل شود</span>
        <div className="chips">
          <Chip on={o.moods} onClick={() => set('moods', !o.moods)}>حال و انرژی</Chip>
          <Chip on={o.reviews} onClick={() => set('reviews', !o.reviews)}>متن مرورها</Chip>
          <Chip on={o.notes} onClick={() => set('notes', !o.notes)}>متن یادداشت‌ها</Chip>
          <Chip on={o.names} onClick={() => set('names', !o.names)}>نام من</Chip>
        </div>
        <p className="xs">پیش‌فرض: متن مرورها و یادداشت‌ها و نام وارد نمی‌شود.</p>
      </Card>
      <div className="col">
        <button className="btn" onClick={copy}>کپی متن</button>
        <button className="btn s2" onClick={share}>اشتراک‌گذاری</button>
        <button className="btn s2" onClick={save}>ذخیرهٔ فایل متنی</button>
      </div>
      {msg && <p className="s" role="status">{msg}</p>}
      <Card>
        <span className="lbl">پیش‌نمایش</span>
        <pre className="xs" dir="auto" style={{ whiteSpace: 'pre-wrap', maxHeight: 320, overflow: 'auto', margin: 0 }}>{text}</pre>
      </Card>
    </Page>
  );
}
