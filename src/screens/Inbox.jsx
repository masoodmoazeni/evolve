import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.js';
import { dateKey, faNum } from '../util.js';
import { Card, Chip, Empty, Page, Skeleton, Top, useToast } from '../ui.jsx';
import DateField from '../DateField.jsx';
import { inboxItems, triage } from '../planLogic.js';

export default function Inbox() {
  const toast = useToast();
  const today = dateKey();
  const rows = useLiveQuery(() => db.tasks.where('date').equals('someday').toArray(), [], undefined);
  const [skipped, setSkipped] = useState(0);
  const [picking, setPicking] = useState(false);
  const [date, setDate] = useState(today);
  if (!rows) return <Page tabs={false}><Top title="صندوق ورودی" back="/today" /><Skeleton /></Page>;
  const items = inboxItems(rows);
  const cur = items.length ? items[skipped % items.length] : null;

  const act = async (action, opts) => {
    try {
      const undo = await triage(cur, action, { today, ...opts });
      setPicking(false);
      toast('انجام شد', undo);
    } catch {
      toast('نتوانستیم ذخیره کنیم؛ دوباره امتحان کن. داده‌هایت امن است.');
    }
  };

  return (
    <Page tabs={false}>
      <Top title="صندوق ورودی" back="/today" />
      {!cur ? (
        <Empty title="صندوق خالی است" text="هر فکر یا کاری که یادت آمد را با «افزودن سریع ← فقط بنویس» اینجا بریز." action={<Link className="btn" to="/today">بازگشت به امروز</Link>} />
      ) : (
        <>
          <p className="s">{faNum(items.length)} مورد مانده</p>
          <Card><h3>{cur.title}</h3><span className="xs">{cur.fromFocus ? 'نوشته‌شده هنگام تمرکز' : 'بدون تاریخ'}</span></Card>
          <div className="chips" role="group" aria-label="این مورد را کجا بگذارم؟">
            <Chip onClick={() => act('today')}>امروز</Chip>
            <Chip onClick={() => act('tomorrow')}>فردا</Chip>
            <Chip on={picking} onClick={() => setPicking(!picking)}>یک روز دیگر…</Chip>
            <Chip onClick={() => act('someday')}>روزی</Chip>
            <Chip onClick={() => act('delete')}>حذف</Chip>
          </div>
          {picking && (
            <Card>
              <DateField value={date} onChange={setDate} label="روز" />
              <button className="btn sm" onClick={() => act('date', { date })}>ذخیره</button>
            </Card>
          )}
          {items.length > 1 && <button className="btn s2" onClick={() => setSkipped(skipped + 1)}>بعدی</button>}
        </>
      )}
    </Page>
  );
}
