// صداهای کوتاه با WebAudio (بدون فایل صوتی؛ آفلاین)
export const SOUNDS = { ding: 'دینگ', bell: 'زنگ', chime: 'زنگوله', soft: 'ملایم', none: 'بی‌صدا' };

let ctx;
const audio = () => {
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = ctx || new AC();
  if (ctx.state === 'suspended') ctx.resume().catch(() => {});
  return ctx;
};

// نت: [فرکانس، شروع (ثانیه)، مدت، بلندی نسبی]
const SCORES = {
  ding: [[880, 0, 0.9, 1], [1760, 0, 0.5, 0.25]],
  bell: [[660, 0, 1.6, 1], [1320, 0, 1.2, 0.4], [1980, 0, 0.8, 0.15], [660, 0.9, 1.4, 0.8], [1320, 0.9, 1, 0.3]],
  chime: [[523, 0, 0.7, 0.9], [659, 0.18, 0.7, 0.9], [784, 0.36, 1.1, 1]],
  soft: [[440, 0, 1.0, 0.5], [554, 0.25, 1.2, 0.4]],
};

export function playSound(kind = 'ding', volume = 0.7) {
  const notes = SCORES[kind];
  if (!notes) return;
  try {
    const c = audio();
    if (!c) return;
    const t0 = c.currentTime + 0.02;
    notes.forEach(([f, at, dur, vol]) => {
      const o = c.createOscillator();
      const g = c.createGain();
      o.type = 'sine';
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t0 + at);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.35 * vol * volume), t0 + at + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, t0 + at + dur);
      o.connect(g).connect(c.destination);
      o.start(t0 + at);
      o.stop(t0 + at + dur + 0.05);
    });
  } catch {
    // بدون صدا ادامه می‌دهیم
  }
}
