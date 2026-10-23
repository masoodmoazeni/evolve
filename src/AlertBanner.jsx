import { useEffect, useState } from 'react';
import { BANNER_EVENT } from './alerts.js';
import { Icon } from './ui.jsx';

// بنر هشدار داخل اپ (پایان تمرکز، یادآورها)؛ آفلاین و بدون نیاز به مجوز
export default function AlertBanner() {
  const [msg, setMsg] = useState(null);
  useEffect(() => {
    let timer;
    const on = (e) => {
      setMsg(e.detail);
      clearTimeout(timer);
      timer = setTimeout(() => setMsg(null), 15000);
    };
    window.addEventListener(BANNER_EVENT, on);
    return () => {
      window.removeEventListener(BANNER_EVENT, on);
      clearTimeout(timer);
    };
  }, []);
  if (!msg) return null;
  return (
    <div className="alert-banner" role="alert">
      <Icon name="bell" />
      <span className="grow"><b>{msg.title}</b>{msg.body && <span className="xs" style={{ display: 'block', color: '#fff' }}>{msg.body}</span>}</span>
      <button className="ib" aria-label="بستن" onClick={() => setMsg(null)} style={{ color: '#fff' }}>
        <Icon name="x" />
      </button>
    </div>
  );
}
