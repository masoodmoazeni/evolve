import { Link } from 'react-router-dom';
import { Card, Icon } from '../ui.jsx';
import { faNum } from '../util.js';
import './Privacy.css';

// نشان کوچک «فقط محلی»؛ در Settings و Privacy (نه در تب‌های اصلی) نمایش داده می‌شود
export function LocalBadge() {
  return (
    <span className="local-badge" role="status">
      <Icon name="lock" size={16} />
      فقط محلی · بدون سرور · آفلاین هم کار می‌کند
    </span>
  );
}

const EXPIRES = ['ثبت عادت‌ها', 'ثبت هدف‌ها', 'کارها', 'جلسه‌های تمرکز', 'یادداشت‌ها', 'ثبت حال و انرژی', 'مرورها', 'پیشنهادهای ردشده یا پذیرفته‌شده'];
const STAYS = ['هدف‌ها', 'عادت‌ها', 'پروفایل و تنظیمات', 'نسخه‌های قبلی تعریف عادت‌ها', 'معیارهای پیشرفت مهارت'];

export function RetentionPolicy({ days = 60 }) {
  return (
    <Card>
      <span className="lbl">سیاست نگه‌داری داده</span>
      <p className="s">ثبت‌های روزانه {faNum(days)} روز نگه داشته می‌شود و بعد از آن در پاک‌سازی خودکار (حداکثر روزی یک بار) حذف می‌شود. پیش از اولین حذف به تو خبر می‌دهیم.</p>
      <div className="policy">
        <div>
          <b>پاک می‌شوند</b>
          <ul>{EXPIRES.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
        <div>
          <b>می‌مانند</b>
          <ul>{STAYS.map((x) => <li key={x}>{x}</li>)}</ul>
        </div>
      </div>
      <p className="xs">مدت نگه‌داری را در <Link className="lnk-inline" to="/prefs">ترجیحات</Link> عوض کن. اگر می‌خواهی چیزی بماند، پیش از پاک‌سازی از «گزارش» یا «خروجی» فایل بگیر.</p>
    </Card>
  );
}

export function DataLossNote() {
  return (
    <Card kind="sand">
      <h3>پشتیبان‌گیری با خودت است</h3>
      <p className="s">داده‌هایت فقط روی همین دستگاه می‌ماند و ما نسخهٔ دیگری نداریم. پاک‌کردن اطلاعات مرورگر، حذف اپ یا خراب شدن دستگاه می‌تواند داده‌ها را از بین ببرد.</p>
      <p className="xs">گرفتن خروجی JSON را گاهی تکرار کن و فایل را جای امنی نگه دار (مثلاً فضای ابری شخصی یا ایمیل به خودت).</p>
      <Link className="btn sm s2" to="/privacy/export">گرفتن خروجی همین حالا</Link>
    </Card>
  );
}
