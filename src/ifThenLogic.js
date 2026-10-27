// «اگر… آنگاه…» برای عادت: cue قدیمی همان «وقتی» است
const trim = (s) => String(s ?? '').trim().replace(/[.،]+$/, '');

export function ifThenSentence(habit, habitsById = new Map()) {
  const then = trim(habit.ifThen?.then);
  const anchor = habit.afterHabitId != null ? habitsById.get(habit.afterHabitId) : null;
  const live = anchor && !anchor.paused && anchor.status !== 'archived';
  const whenText = trim(habit.ifThen?.when ?? habit.cue);
  const when = live ? `بعد از «${anchor.title}»` : whenText ? `وقتی ${whenText}` : '';
  if (!when) return '';
  return then ? `${when}، ${then}.` : `${when}.`;
}

// فقط وقتی «آنگاه» هست و «وقتی/لنگر» نیست خطا می‌دهد
export function validateIfThen(f) {
  if (f.thenDo?.trim() && !f.cue?.trim() && (f.afterHabitId === '' || f.afterHabitId == null)) {
    return 'برای «آنگاه» اول بنویس «وقتی» چه اتفاقی می‌افتد، یا یک عادت را لنگر کن.';
  }
  return '';
}
