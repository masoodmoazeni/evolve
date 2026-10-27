import { useState } from 'react';
import { Field, Icon, Sheet, useToast } from '../ui.jsx';
import { addInbox } from '../planLogic.js';

// فکر مزاحم را بدون ترک جلسه به صندوق ورودی می‌فرستد؛ به focusRun دست نمی‌زند
export default function FocusCapture() {
  const toast = useToast();
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [err, setErr] = useState('');
  const save = async () => {
    try {
      const r = await addInbox(text, { fromFocus: true });
      if (!r) return setErr('چیزی بنویس تا در صندوق ورودی بماند.');
      toast('به صندوق ورودی رفت', r.undo);
      setText('');
      setErr('');
      setOpen(false);
    } catch {
      setErr('نتوانستیم ذخیره کنیم؛ دوباره امتحان کن. داده‌هایت امن است.');
    }
  };
  return (
    <>
      <button className="btn s2" onClick={() => setOpen(true)} aria-label="چیزی یادم آمد"><Icon name="edit" /> چیزی یادم آمد</button>
      {open && (
        <Sheet title="چیزی یادم آمد" onClose={() => setOpen(false)}>
          <Field label="فقط بنویس؛ بعداً مرتبش می‌کنی" error={err}>
            <input className={`in${err ? ' e' : ''}`} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
          </Field>
          <button className="btn" onClick={save}>ذخیره در صندوق</button>
        </Sheet>
      )}
    </>
  );
}
