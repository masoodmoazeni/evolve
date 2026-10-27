export const GOAL_TYPES = {
  daily: { label: 'روزانه', hint: 'هر روز یک قدم' },
  weekly: { label: 'هفتگی', hint: 'چند بار در هفته' },
  milestones: { label: 'نقطه‌عطف‌محور', hint: 'مجموعه‌ای از مراحل' },
  okr: { label: 'نتیجه‌محور', hint: 'یک تا سه نتیجهٔ کلیدی قابل‌اندازه‌گیری' },
};

// اعتبارسنجی فرم هدف؛ خروجی: شیء خطاها (خالی = معتبر)
export function validateGoal(f) {
  const e = {};
  if (!f.title || !f.title.trim()) e.title = 'یک عنوان کوتاه برای هدف بنویس.';
  if (f.type === 'weekly') {
    const t = Number(f.target);
    if (!Number.isInteger(t) || t < 1 || t > 7) e.target = 'عددی بین ۱ تا ۷ وارد کن.';
  }
  if (f.type === 'milestones' && !(f.milestones ?? []).some((m) => m.title.trim())) {
    e.milestones = 'دست‌کم یک نقطه‌عطف اضافه کن.';
  }
  if (f.priority != null && ![1, 2, 3].includes(Number(f.priority))) e.priority = 'اولویت باید بین ۱ تا ۳ باشد.';
  ['baselineValue', 'targetValue'].forEach((k) => {
    if (f[k] !== undefined && f[k] !== null && String(f[k]).trim() !== '' && !Number.isFinite(Number(f[k]))) e[k] = 'یک عدد وارد کن.';
  });
  if (f.startDate && f.targetDate && f.targetDate < f.startDate) e.targetDate = 'تاریخ هدف نباید پیش از شروع باشد.';
  return e;
}

const numOrNull = (v) => (v === undefined || v === null || String(v).trim() === '' ? null : Number(v));

export function buildGoal(f) {
  return {
    title: f.title.trim(),
    why: (f.why || '').trim(),
    type: f.type,
    target: f.type === 'weekly' ? Number(f.target) : null,
    deadline: f.targetDate || f.deadline || null,
    description: (f.description || '').trim(),
    baseline: (f.baseline || '').trim(),
    targetOutcome: (f.targetOutcome || '').trim(),
    startDate: f.startDate || null,
    targetDate: f.targetDate || f.deadline || null,
    priority: [1, 2, 3].includes(Number(f.priority)) ? Number(f.priority) : 2,
    obstacles: (f.obstacles ?? []).map((o) => o.trim()).filter(Boolean),
    metrics: (f.metrics ?? []).filter((m) => m.label.trim()).map((m) => ({ ...m, label: m.label.trim() })),
    unit: (f.unit || '').trim(),
    baselineValue: numOrNull(f.baselineValue),
    targetValue: numOrNull(f.targetValue),
    milestones:
      f.type === 'milestones'
        ? f.milestones.filter((m) => m.title.trim()).map((m) => ({ ...m, title: m.title.trim() }))
        : [],
    area: f.area || null,
    keyResults: f.keyResults ?? [],
    status: f.status || 'active',
  };
}

export const newMilestone = () => ({ id: `${Date.now()}${Math.floor(Math.random() * 1000)}`, title: '', done: false, doneAt: null });

export const toggleMilestone = (goal, id, now = Date.now()) => ({
  ...goal,
  milestones: goal.milestones.map((m) => (m.id === id ? { ...m, done: !m.done, doneAt: m.done ? null : now } : m)),
});

export const PRIORITIES = { 1: 'اولویت بالا', 2: 'اولویت متوسط', 3: 'اولویت پایین' };
export const SKILL_PRESETS = ['شنیدن', 'صحبت کردن', 'واژگان', 'خواندن', 'نوشتن', 'گرامر', 'تلفظ', 'اعتمادبه‌نفس'];
export const MEASURE_KEY = '_measure';

export const newMetric = (label, scale = '1-5', unit = '') => ({
  key: `m${Date.now().toString(36)}${Math.floor(Math.random() * 1296).toString(36)}`,
  label,
  scale,
  unit,
});

// مرتب‌سازی: بر پایهٔ اولویت (۱ بالاترین) یا تازه‌ترین
export function sortGoals(goals, by = 'priority') {
  const list = [...goals];
  if (by === 'recent') return list.sort((a, b) => b.id - a.id);
  return list.sort((a, b) => (a.priority ?? 2) - (b.priority ?? 2) || a.id - b.id);
}

// اعتبارسنجی مقدار خودارزیابی/عددی یک معیار
export function parseMetricValue(metric, raw) {
  const v = Number(raw);
  if (raw === '' || raw === null || raw === undefined || !Number.isFinite(v)) return { ok: false, error: 'یک عدد وارد کن.' };
  if (metric.scale === '1-5' && (!Number.isInteger(v) || v < 1 || v > 5)) return { ok: false, error: 'عددی بین ۱ تا ۵ انتخاب کن.' };
  return { ok: true, value: v };
}

// پیشرفت هدف اندازه‌پذیر از مبدأ تا مقصد (0..1)؛ بدون داده یا مبدأ=مقصد → null
export function measureProgress(goal, latest) {
  const { baselineValue: a, targetValue: b } = goal;
  if (a == null || b == null || latest == null || a === b) return null;
  return Math.max(0, Math.min(1, (latest - a) / (b - a)));
}

// خلاصهٔ توصیفی یک معیار؛ کمتر از ۳ ثبت = داده کافی نیست
export function metricSummary(entries) {
  const list = [...entries].sort((x, y) => (x.date < y.date ? -1 : x.date > y.date ? 1 : (x.id ?? 0) - (y.id ?? 0)));
  return {
    count: list.length,
    first: list[0]?.value ?? null,
    latest: list[list.length - 1]?.value ?? null,
    enough: list.length >= 3,
    values: list.map((e) => e.value),
  };
}
