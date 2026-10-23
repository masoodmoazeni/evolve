import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

const ICONS = {
  home: 'M3 11l9-8 9 8v10H3z',
  goal: 'M12 3a9 9 0 100 18 9 9 0 000-18zM12 8a4 4 0 100 8 4 4 0 000-8z',
  check: 'M5 13l4 4L19 7',
  timer: 'M12 5a8 8 0 100 16 8 8 0 000-16zM12 9v4l3 2M9 2h6',
  book: 'M4 5h6a2 2 0 012 2v13a2 2 0 00-2-2H4zM20 5h-6a2 2 0 00-2 2v13a2 2 0 012-2h6z',
  plus: 'M12 5v14M5 12h14',
  chev: 'M9 5l7 7-7 7',
  chevl: 'M15 5l-7 7 7 7',
  x: 'M6 6l12 12M18 6L6 18',
  cal: 'M3 8a3 3 0 013-3h12a3 3 0 013 3v10a3 3 0 01-3 3H6a3 3 0 01-3-3zM3 10h18M8 3v4M16 3v4',
  user: 'M12 4a4 4 0 100 8 4 4 0 000-8zM4 21c0-4 4-6 8-6s8 2 8 6',
  chart: 'M4 20V10M10 20V4M16 20v-8M22 20H2',
  bell: 'M6 16v-5a6 6 0 0112 0v5l2 2H4zM10 21h4',
  spark: 'M12 3l2 6 6 2-6 2-2 6-2-6-6-2 6-2z',
  lock: 'M5 11h14v10H5zM8 11V8a4 4 0 018 0v3',
  more: 'M5 12h.01M12 12h.01M19 12h.01',
};

export function Icon({ name, size }) {
  return (
    <svg className="i" viewBox="0 0 24 24" aria-hidden="true" style={size ? { width: size, height: size } : undefined}>
      <path d={ICONS[name]} />
    </svg>
  );
}

const TABS = [
  { to: '/today', label: 'امروز', icon: 'home' },
  { to: '/goals', label: 'اهداف', icon: 'goal' },
  { to: '/habits', label: 'عادت‌ها', icon: 'check' },
  { to: '/focus', label: 'تمرکز', icon: 'timer' },
  { to: '/reflect', label: 'بازتاب', icon: 'book' },
];

export function TabBar() {
  return (
    <nav className="tab-bar" aria-label="ناوبری اصلی">
      {TABS.map((t) => (
        <NavLink key={t.to} to={t.to} className={({ isActive }) => (isActive ? 'on' : '')}>
          <Icon name={t.icon} />
          {t.label}
        </NavLink>
      ))}
    </nav>
  );
}

export function Top({ title, back, close, right }) {
  const nav = useNavigate();
  return (
    <div className="top">
      {back && (
        <button className="ib bg" aria-label="بازگشت" onClick={() => (typeof back === 'string' ? nav(back) : nav(-1))}>
          <Icon name="chev" />
        </button>
      )}
      <h2>{title}</h2>
      {right}
      {close && (
        <button className="ib bg" aria-label="بستن" onClick={() => (typeof close === 'string' ? nav(close) : nav(-1))}>
          <Icon name="x" />
        </button>
      )}
    </div>
  );
}

export function Page({ children, tabs = true }) {
  return <div className={`body${tabs ? ' nav-pad' : ''}`}>{children}</div>;
}

export function Card({ kind = '', children, ...rest }) {
  return (
    <div className={`card ${kind}`} {...rest}>
      {children}
    </div>
  );
}

export function Empty({ title, text, action }) {
  return (
    <div className="card mint empty">
      <h3>{title}</h3>
      <p className="s">{text}</p>
      {action}
    </div>
  );
}

export function Chip({ on, children, ...rest }) {
  return (
    <button className={`chip${on ? ' on' : ' out'}`} aria-pressed={!!on} {...rest}>
      {children}
    </button>
  );
}

export function Toggle({ on, onChange, label }) {
  return (
    <button className={`tg${on ? '' : ' o'}`} role="switch" aria-checked={!!on} aria-label={label} onClick={() => onChange(!on)} />
  );
}

// نشان وضعیت: رنگ + شکل
const CK_CLASS = { done: 'd', partial: 'p', skipped: 'k', none: 'u', planned: '' };
export const STATUS_LABEL = { done: 'انجام‌شده', partial: 'نیمه‌کاره', skipped: 'ردشده', none: 'ثبت‌نشده', planned: 'برنامه‌ریزی‌شده' };
export function Ck({ status = 'none', small }) {
  return <span className={`ck ${CK_CLASS[status] ?? 'u'}${small ? ' sm-ck' : ''}`} role="img" aria-label={STATUS_LABEL[status]} />;
}

export function Bars({ values, max, label }) {
  const m = max || Math.max(1, ...values.filter((v) => v != null));
  return (
    <div className="bar" role="img" aria-label={label}>
      {values.map((v, i) => (v == null ? <i key={i} className="n" /> : <i key={i} style={{ height: `${Math.max(6, (v / m) * 100)}%` }} />))}
    </div>
  );
}

export function Field({ label, error, children }) {
  return (
    <label className="fld">
      {label}
      {children}
      {error && <span className="err">{error}</span>}
    </label>
  );
}

export function Stepper({ step, total }) {
  return <span className="step">{`مرحلهٔ ${step} از ${total}`.replace(/\d/g, (d) => '۰۱۲۳۴۵۶۷۸۹'[d])}</span>;
}

export function Skeleton({ rows = 3 }) {
  return (
    <div className="col" aria-busy="true" aria-label="در حال بارگذاری">
      {Array.from({ length: rows }, (_, i) => (
        <div key={i} className="sk" style={{ height: 56 }} />
      ))}
    </div>
  );
}

// قفل اسکرول پشت برگه/پنجره تا وقتی باز است
function useModalLock() {
  useEffect(() => {
    document.body.classList.add('modal-open');
    return () => document.body.classList.remove('modal-open');
  }, []);
}

export function Sheet({ title, onClose, children }) {
  useModalLock();
  return (
    <div className="sheetbg" onClick={onClose}>
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title} onClick={(e) => e.stopPropagation()}>
        <div className="row">
          <h2 className="grow">{title}</h2>
          <button className="ib" aria-label="بستن" onClick={onClose}>
            <Icon name="x" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

export function Dialog({ title, text, confirm = 'تأیید', cancel = 'انصراف', danger, onConfirm, onCancel, children, disabled }) {
  useModalLock();
  return (
    <div className="dlgwrap">
      <div className="dlg" role="alertdialog" aria-modal="true" aria-label={title}>
        <h2>{title}</h2>
        {text && <p className="s">{text}</p>}
        {children}
        <button className={`btn${danger ? ' danger' : ''}${disabled ? ' dis' : ''}`} onClick={onConfirm} disabled={disabled}>
          {confirm}
        </button>
        <button className="btn t" onClick={onCancel}>
          {cancel}
        </button>
      </div>
    </div>
  );
}

export function Fab({ label, onClick }) {
  return (
    <button className="fab" aria-label={label} onClick={onClick}>
      <Icon name="plus" size={26} />
    </button>
  );
}

const ToastCtx = createContext(() => {});
export const useToast = () => useContext(ToastCtx);

export function ToastProvider({ children }) {
  const [t, setT] = useState(null);
  const timer = useRef();
  const show = useCallback((msg, onUndo) => {
    clearTimeout(timer.current);
    setT({ msg, onUndo });
    timer.current = setTimeout(() => setT(null), 6000);
  }, []);
  useEffect(() => () => clearTimeout(timer.current), []);
  return (
    <ToastCtx.Provider value={show}>
      {children}
      {t && (
        <div className="toast-wrap" role="status">
          <div className="toast">
            {t.msg}
            {t.onUndo && (
              <button
                className="undo"
                onClick={() => {
                  t.onUndo();
                  setT(null);
                }}
              >
                بازگردانی
              </button>
            )}
          </div>
        </div>
      )}
    </ToastCtx.Provider>
  );
}
