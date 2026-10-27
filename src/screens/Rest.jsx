import { useState } from 'react';
import { Card, Empty, Field, Page, Skeleton, Top, useToast } from '../ui.jsx';
import { useKV } from '../db.js';
import DateField from '../DateField.jsx';
import { dateKey, fmtDate } from '../util.js';
import { newRest, validateRest } from '../restLogic.js';

// حالت استراحت و سفر: در این روزها هیچ‌چیز «ثبت‌نشده» حساب نمی‌شود
export default function Rest() {
  const toast = useToast();
  const [rest, setRest] = useKV('rest', []);
  const [from, setFrom] = useState(dateKey());
  const [to, setTo] = useState(dateKey());
  const [label, setLabel] = useState('');
  const [err, setErr] = useState('');
  if (rest === undefined) return <Page tabs={false}><Top title="استراحت و سفر" back="/prefs" /><Skeleton /></Page>;
  const add = async () => {
    const e = validateRest({ from, to }, rest);
    if (e) return setErr(e);
    setErr('');
    await setRest([...rest, newRest(from, to, label)]);
    toast('بازهٔ استراحت ثبت شد.', () => setRest(rest));
    setLabel('');
  };
  return (
    <Page tabs={false}>
      <Top title="استراحت و سفر" back="/prefs" />
      <Card kind="mint">
        <span className="lbl">بازهٔ استراحت</span>
        <p className="s">عادت‌ها و یادآورها در این روزها بی‌صدا می‌شوند و هیچ‌چیز «ثبت‌نشده» حساب نمی‌شود.</p>
        <Field label="از"><DateField value={from} onChange={setFrom} label="از" /></Field>
        <Field label="تا" error={err}><DateField value={to} onChange={setTo} label="تا" /></Field>
        <Field label="برچسب (اختیاری)"><input className="in" value={label} onChange={(e) => setLabel(e.target.value)} placeholder="مثلاً سفر" /></Field>
        <button className="btn" onClick={add}>ثبت استراحت</button>
      </Card>
      {rest.length === 0 ? <Empty title="بازه‌ای ثبت نشده" text="هر وقت سفر یا استراحتی داشتی، اینجا بنویس." /> : rest.map((r) => (
        <Card key={r.id}>
          <div className="row"><span className="grow">{fmtDate(r.from)} تا {fmtDate(r.to)}{r.label ? ` · ${r.label}` : ''}</span>
            <button className="btn sm t" onClick={async () => { await setRest(rest.filter((x) => x.id !== r.id)); toast('حذف شد.', () => setRest(rest)); }}>حذف</button></div>
        </Card>
      ))}
    </Page>
  );
}
