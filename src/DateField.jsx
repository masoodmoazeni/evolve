import { useState } from 'react';
import { createPortal } from 'react-dom';
import { buildMonth, shiftMonth } from './calendarLogic.js';
import { Icon, Sheet } from './ui.jsx';
import { JMONTHS, WEEKDAYS_SHORT, dateKey, faNum, fmtDateFull } from './util.js';

// انتخابگر تاریخ شمسی؛ مقدار به‌صورت کلید میلادی yyyy-mm-dd ذخیره می‌شود
export default function DateField({ value, onChange, placeholder = 'انتخاب تاریخ', label }) {
  const [open, setOpen] = useState(false);
  const [ref, setRef] = useState(value || dateKey());
  const month = buildMonth(ref);
  const today = dateKey();

  const pick = (key) => {
    onChange(key);
    setOpen(false);
  };

  return (
    <>
      <button type="button" className="in datebtn" aria-label={label} onClick={() => { setRef(value || dateKey()); setOpen(true); }}>
        <span>{value ? fmtDateFull(value) : placeholder}</span>
        <Icon name="cal" />
      </button>
      {open && createPortal(
        <Sheet title="انتخاب تاریخ" onClose={() => setOpen(false)}>
          <div className="row">
            <button className="ib bg" aria-label="ماه بعد" onClick={() => setRef(shiftMonth(ref, 1))}>
              <Icon name="chevl" />
            </button>
            <h3 className="grow" style={{ textAlign: 'center' }} aria-live="polite">{`${JMONTHS[month.m - 1]} ${faNum(month.y)}`}</h3>
            <button className="ib bg" aria-label="ماه قبل" onClick={() => setRef(shiftMonth(ref, -1))}>
              <Icon name="chev" />
            </button>
          </div>
          <div className="g7 xs" aria-hidden="true">
            {WEEKDAYS_SHORT.map((d) => <span key={d}>{d}</span>)}
          </div>
          <div className="g7">
            {month.weeks.flat().map((c, i) =>
              c ? (
                <button
                  key={c.key}
                  type="button"
                  className={`daycell${c.key === value ? ' sel' : ''}${c.key === today ? ' now' : ''}`}
                  aria-pressed={c.key === value}
                  aria-label={fmtDateFull(c.key)}
                  onClick={() => pick(c.key)}
                >
                  {faNum(c.d)}
                </button>
              ) : (
                <span key={`e${i}`} />
              )
            )}
          </div>
          <div className="row">
            <button className="lnk" onClick={() => pick(today)}>امروز</button>
            <button className="lnk" onClick={() => pick('')}>پاک کردن</button>
          </div>
        </Sheet>,
        document.querySelector('.app') ?? document.body
      )}
    </>
  );
}
