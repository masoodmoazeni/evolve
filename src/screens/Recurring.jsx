import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db.js';
import { Card, Dialog, Empty, Page, Skeleton, Top, useToast } from '../ui.jsx';
import { ruleSummary } from '../recurLogic.js';
import { WEEKDAYS, fmtDate } from '../util.js';

// فهرست کارهای تکراری: توقف، ادامه و حذف (با تأیید)
export default function Recurring() {
  const toast = useToast();
  const list = useLiveQuery(() => db.recurring.toArray(), [], undefined);
  const [del, setDel] = useState(null);
  if (!list) return <Page tabs={false}><Top title="کارهای تکراری" back="/plan" /><Skeleton /></Page>;
  const toggle = async (r) => {
    const was = r.status;
    await db.recurring.update(r.id, { status: was === 'active' ? 'paused' : 'active' });
    toast(was === 'active' ? 'متوقف شد؛ کارهای ساخته‌شده سر جایشان می‌مانند.' : 'دوباره فعال شد.', () => db.recurring.update(r.id, { status: was }));
  };
  const remove = async () => {
    const copy = { ...del };
    await db.recurring.delete(del.id);
    setDel(null);
    toast('قاعدهٔ تکرار حذف شد.', () => db.recurring.put(copy));
  };
  return (
    <Page tabs={false}>
      <Top title="کارهای تکراری" back="/plan" />
      {list.length === 0 ? (
        <Empty title="کار تکراری نداری" text="هنگام ساخت یک کار، بخش «تکرار» را انتخاب کن تا هر بار خودش ساخته شود." />
      ) : list.map((r) => (
        <Card key={r.id}>
          <h3>{r.title}</h3>
          <p className="s">{ruleSummary(r.rule, WEEKDAYS)} · از {fmtDate(r.startDate)}{r.status === 'paused' ? ' · متوقف' : ''}</p>
          <div className="chips">
            <button className="chip out" onClick={() => toggle(r)}>{r.status === 'active' ? 'توقف موقت' : 'ادامه'}</button>
            <button className="chip out" onClick={() => setDel(r)}>حذف</button>
          </div>
        </Card>
      ))}
      {del && <Dialog title="این تکرار حذف شود؟" text="کارهای ساخته‌شده حذف نمی‌شوند؛ فقط از این به بعد ساخته نمی‌شود." confirm="حذف" danger onConfirm={remove} onCancel={() => setDel(null)} />}
    </Page>
  );
}
