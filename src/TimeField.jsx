import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { Icon, Sheet } from './ui.jsx';
import { faNum } from './util.js';

const ROW = 48;
const HOURS = Array.from({ length: 24 }, (_, i) => i);
const MINUTES = Array.from({ length: 12 }, (_, i) => i * 5);
const two = (n) => faNum(String(n).padStart(2, '0'));

// یک ستون چرخان با snap؛ مقدار انتخابی را با onPick می‌دهد
function Wheel({ items, value, onPick, label }) {
  const ref = useRef();
  const timer = useRef();
  const idx = Math.max(0, items.indexOf(value));

  useEffect(() => {
    if (ref.current) ref.current.scrollTop = idx * ROW;
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const onScroll = () => {
    clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      const i = Math.min(items.length - 1, Math.max(0, Math.round(ref.current.scrollTop / ROW)));
      onPick(items[i]);
    }, 80);
  };

  useEffect(() => () => clearTimeout(timer.current), []);

  const go = (i) => ref.current?.scrollTo({ top: i * ROW, behavior: 'smooth' });
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); go(Math.min(items.length - 1, idx + 1)); }
    if (e.key === 'ArrowUp') { e.preventDefault(); go(Math.max(0, idx - 1)); }
  };

  return (
    <div className="wheel" ref={ref} onScroll={onScroll} onKeyDown={onKey} role="listbox" tabIndex={0} aria-label={label}>
      <div style={{ height: ROW }} aria-hidden="true" />
      {items.map((v, i) => (
        <button key={v} type="button" role="option" aria-selected={v === value} className={`wheel-i${v === value ? ' on' : ''}`} onClick={() => go(i)} tabIndex={-1}>
          {two(v)}
        </button>
      ))}
      <div style={{ height: ROW }} aria-hidden="true" />
    </div>
  );
}

const parse = (v) => {
  if (!/^\d\d:\d\d$/.test(v || '')) return { h: 9, m: 0 };
  return { h: Number(v.slice(0, 2)), m: Math.min(55, Math.round(Number(v.slice(3)) / 5) * 5) };
};

// انتخابگر ساعت چرخی، ۲۴ ساعته و با ارقام فارسی؛ مقدار 'HH:MM' یا ''
export default function TimeField({ value, onChange, label, title = 'ساعت', placeholder = 'انتخاب ساعت', clearable = true, hint = true }) {
  const [open, setOpen] = useState(false);
  const [t, setT] = useState(parse(value));
  const text = `${two(t.h)}:${two(t.m)}`;

  const openIt = () => {
    setT(parse(value));
    setOpen(true);
  };
  const done = () => {
    onChange(`${String(t.h).padStart(2, '0')}:${String(t.m).padStart(2, '0')}`);
    setOpen(false);
  };

  return (
    <>
      <button type="button" className="in datebtn" aria-label={label} onClick={openIt}>
        <span>{value ? `${two(Number(value.slice(0, 2)))}:${two(Number(value.slice(3, 5)))}` : placeholder}</span>
        <Icon name="timer" />
      </button>
      {open && createPortal(
        <Sheet title={title} onClose={() => setOpen(false)}>
          <div className="row">
            <span className="grow" />
            <span className="chip teal" aria-live="polite" style={{ fontSize: 20, minHeight: 44 }}>{text}</span>
          </div>
          <div className="wheels" dir="ltr">
            <div className="wheel-band" aria-hidden="true" />
            <Wheel items={HOURS} value={t.h} onPick={(h) => setT((x) => ({ ...x, h }))} label="ساعت" />
            <Wheel items={MINUTES} value={t.m} onPick={(m) => setT((x) => ({ ...x, m }))} label="دقیقه" />
          </div>
          {hint && <p className="xs">انتخاب ساعت چرخی، ۲۴ ساعته و فارسی است. دقیقه‌ها هر ۵ دقیقه‌اند.</p>}
          <div className="row">
            <button className="btn grow" onClick={done}>انتخاب شد</button>
            {clearable && (
              <button className="lnk" onClick={() => { onChange(''); setOpen(false); }}>بدون ساعت</button>
            )}
          </div>
        </Sheet>,
        document.querySelector('.app') ?? document.body
      )}
    </>
  );
}
