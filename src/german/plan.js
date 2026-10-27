import { addDays, dateKey, diffDays, weekStart, weekdayIdx } from '../util.js';

// ۱۲ درس A1؛ ترتیب و عنوان‌ها طرح خودمان است و فهرست رسمی کتاب نیست
export const LESSONS = [
  { n: 1, title: 'الفبا و تلفظ', grammar: 'حروف خاص، ei/ie/eu، ch/sch' },
  { n: 2, title: 'معرفی خود', grammar: 'ضمیرها، صرف فعل، sein، W-Fragen' },
  { n: 3, title: 'اعداد، سن و شمارهٔ تلفن', grammar: 'اعداد ۰ تا ۱۰۰، haben' },
  { n: 4, title: 'خانواده', grammar: 'der/die/das، ein/eine، kein، mein' },
  { n: 5, title: 'غذا و نوشیدنی', grammar: 'Akkusativ، möchten' },
  { n: 6, title: 'خرید و قیمت', grammar: 'قیمت، جمع اسم‌ها، nicht/kein' },
  { n: 7, title: 'خانه و وسایل', grammar: 'es gibt، صفت، حرف اضافهٔ مکان' },
  { n: 8, title: 'ساعت و برنامهٔ روزانه', grammar: 'ساعت، فعل جداشدنی، am/um' },
  { n: 9, title: 'کار و آموزش', grammar: 'können / müssen / wollen' },
  { n: 10, title: 'شهر و مسیر', grammar: 'mit/zu/nach، جملهٔ امر' },
  { n: 11, title: 'بدن و سلامت', grammar: 'درد، sollen، وقت پزشک' },
  { n: 12, title: 'سرگرمی، هوا و قرار', grammar: 'gern، دعوت، denn/aber/oder' },
];

export const SKILLS = { vocab: 'واژگان', grammar: 'گرامر', lesen: 'خواندن', hoeren: 'شنیدن', schreiben: 'نوشتن', sprechen: 'صحبت', review: 'مرور', exam: 'آزمون', rest: 'استراحت' };

export const DAY_MIN = 45;
export const WEEKS = 7;

const lessonTitle = (n) => `درس ${n} · ${LESSONS[n - 1].title}`;

// الگوی هفته: دو درس؛ هر روز یک کار مشخص (اندیس ۰ = شنبه)
function lessonDay(slot, a, b) {
  const A = lessonTitle(a);
  const B = lessonTitle(b);
  return [
    [['vocab', 20, `واژگان ${A}`], ['grammar', 25, `گرامر ${A}`]],
    [['lesen', 20, `خواندن و تمرین ${A}`], ['sprechen', 25, `بلند گفتن جمله‌ها و گفت‌وگوی ${A}`]],
    [['vocab', 20, `واژگان ${B}`], ['grammar', 25, `گرامر ${B}`]],
    [['hoeren', 20, `شنیدن و تمرین ${B}`], ['sprechen', 25, `بلند گفتن جمله‌ها و گفت‌وگوی ${B}`]],
    [['review', 20, `مرور کارت‌های واژگان هر دو درس`], ['schreiben', 25, `نوشتن یک پیام کوتاه ۳۰ کلمه‌ای دربارهٔ ${B}`]],
    [['hoeren', 20, 'شنیدن اعداد، ساعت و قیمت'], ['sprechen', 25, 'معرفی خود و پرسش‌وپاسخ با خودت']],
    [['rest', 0, 'روز آزاد؛ اگر حال داشتی ۱۰ دقیقه کارت‌ها را مرور کن']],
  ][slot];
}

const EXAM_DAYS = [
  [['review', 45, 'مرور همهٔ واژگان و گرامرهای ۱۲ درس']],
  [['exam', 45, 'آزمون آزمایشی ۱: خواندن و شنیدن']],
  [['exam', 45, 'آزمون آزمایشی ۱: نوشتن و صحبت، سپس بررسی نمره']],
  [['review', 45, 'تمرین نقطه‌ضعف‌ها (موضوع‌هایی که نمره‌شان پایین‌تر بود)']],
  [['exam', 45, 'آزمون آزمایشی ۲ (هدف: بالاتر از ۸۰ از ۱۰۰)']],
  [['review', 45, 'مرور آخر و تمرین معرفی خود و درخواست‌های ساده']],
  [['rest', 0, 'روز آزاد']],
];

// ۴۹ روز از تاریخ شروع؛ هفتهٔ ۱ تا ۶ دو درس، هفتهٔ ۷ آزمون و مرور
export function buildPlan(start) {
  const days = [];
  for (let i = 0; i < WEEKS * 7; i++) {
    const week = Math.floor(i / 7) + 1;
    const slot = i % 7;
    const items = week <= 6 ? lessonDay(slot, week * 2 - 1, week * 2) : EXAM_DAYS[slot];
    days.push({ date: addDays(start, i), week, slot, items: items.map(([skill, min, text]) => ({ skill, min, text })) });
  }
  return days;
}

// نخستین شنبه از امروز به بعد (امروز اگر شنبه باشد)
export function defaultStart(today = dateKey()) {
  return weekdayIdx(today) === 0 ? today : addDays(weekStart(today), 7);
}

export const dayIndex = (start, date) => diffDays(date, start);
export const dayMinutes = (d) => d.items.reduce((s, x) => s + x.min, 0);
