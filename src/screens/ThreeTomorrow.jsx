import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.js';
import { Card, Chip, Empty, Page, Skeleton, Top, useToast } from '../ui.jsx';
import { addDays, dateKey, faNum } from '../util.js';
import { MAX_PRIORITIES } from '../data.js';
import { moveInList, pickTomorrow } from '../priorityLogic.js';

// «سه کار فردا»: انتخاب تا ۳ کار و ترتیب با دکمه‌های بالا/پایین؛ کاملاً اختیاری
export default function ThreeTomorrow() {
  const nav = useNavigate();
  const toast = useToast();
  const tomorrow = addDays(dateKey(), 1);
  const rows = useLiveQuery(() => db.tasks.where('date').anyOf(tomorrow, 'someday').filter((t) => !t.done).toArray(), [tomorrow], undefined);
  const [ids, setIds] = useState(null);
  useEffect(() => {
    if (rows && ids === null) setIds(rows.filter((t) => t.date === tomorrow && t.priority).sort((a, b) => (a.rank ?? 9) - (b.rank ?? 9)).map((t) => t.id).slice(0, MAX_PRIORITIES));
  }, [rows, ids, tomorrow]);
  if (!rows || ids === null) return <Page tabs={false}><Top title="سه کار فردا" close="/today" /><Skeleton /></Page>;
  const byId = new Map(rows.map((t) => [t.id, t]));
  const toggle = (id) => setIds(ids.includes(id) ? ids.filter((x) => x !== id) : ids.length < MAX_PRIORITIES ? [...ids, id] : ids);
  const save = async () => {
    const prev = rows.map((t) => ({ id: t.id, date: t.date, priority: t.priority, rank: t.rank ?? null }));
    await db.transaction('rw', db.tasks, async () => {
      for (const u of pickTomorrow(rows, ids)) await db.tasks.update(u.id, u.patch);
      for (const id of ids) if (byId.get(id).date !== tomorrow) await db.tasks.update(id, { date: tomorrow });
    });
    toast('سه کار فردا ذخیره شد.', () => Promise.all(prev.map((p) => db.tasks.update(p.id, p))));
    nav('/today');
  };
  return (
    <Page tabs={false}>
      <Top title="سه کار فردا" close="/today" />
      <p className="s">اگر خواستی، حداکثر ۳ کار را انتخاب و مرتب کن. این مرحله کاملاً اختیاری است.</p>
      {rows.length === 0 && <Empty title="کاری برای انتخاب نیست" text="یک کار برای فردا اضافه کن، بعد برگرد." action={<Link className="btn" to="/plan">برنامه</Link>} />}
      {ids.length > 0 && (
        <Card kind="mint">
          {ids.map((id, i) => (
            <div key={id} className="ob-row">
              <span className="chip on">{faNum(i + 1)}</span>
              <span className="grow">{byId.get(id)?.title}</span>
              <button className="ib bg" aria-label="بالا" disabled={i === 0} onClick={() => setIds(moveInList(ids, id, -1))}>↑</button>
              <button className="ib bg" aria-label="پایین" disabled={i === ids.length - 1} onClick={() => setIds(moveInList(ids, id, 1))}>↓</button>
            </div>
          ))}
        </Card>
      )}
      {rows.length > 0 && (
        <Card>
          <span className="lbl">کارهای دیگر</span>
          <div className="chips">
            {rows.filter((t) => !ids.includes(t.id)).map((t) => <Chip key={t.id} onClick={() => toggle(t.id)} disabled={ids.length >= MAX_PRIORITIES}>{t.title}</Chip>)}
          </div>
        </Card>
      )}
      <div className="g2"><Link className="btn s2" to="/today">رد کردن</Link><button className="btn" onClick={save}>ذخیره</button></div>
    </Page>
  );
}
