import { useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { db, getKV, setKV, useKV } from './db.js';
import { addDays, dateKey } from './util.js';
import { DEFAULT_GAME, EMPTY_TOTALS, FOLD_AFTER_DAYS, activeDaysLast7, dayStats, earnedBadges, hasComeback, levelInfo, questsFor, sumTotals, totalsForRows, weeklyChallenge } from './gameLogic.js';

const TABLES = ['focus', 'tasks', 'habitLogs', 'notes', 'reviews', 'moods'];

export async function loadRows() {
  const out = {};
  await Promise.all(TABLES.map(async (t) => { out[t] = await db[t].toArray(); }));
  return out;
}

// روزهای قدیمی‌تر از ۱۴ روز در «بانک» جمع می‌شوند تا پاک‌سازی ثبت‌ها امتیاز را کم نکند؛ باید پیش از prune اجرا شود
export async function foldBank(today = dateKey()) {
  const bank = (await getKV('gameBank')) || { upTo: '0000-00-00', totals: EMPTY_TOTALS };
  const limit = addDays(today, -FOLD_AFTER_DAYS);
  const rows = await loadRows();
  const old = {};
  TABLES.forEach((t) => { old[t] = rows[t].filter((x) => x.date > bank.upTo && x.date < limit); });
  if (!TABLES.some((t) => old[t].length)) return bank;
  const cfg = { ...DEFAULT_GAME, ...(await getKV('game', {})) };
  const next = { upTo: addDays(limit, -1), totals: sumTotals(bank.totals, totalsForRows(old, cfg.capMin)) };
  await setKV('gameBank', next);
  return next;
}

export function computeGame(rows, bank, cfg, today, saved = []) {
  const live = {};
  TABLES.forEach((t) => { live[t] = rows[t].filter((x) => x.date > bank.upTo); });
  const totals = sumTotals(bank.totals, totalsForRows(live, cfg.capMin));
  const stats = dayStats(live, today);
  const earned = new Set([...saved, ...earnedBadges(totals, { comeback: hasComeback(live, today) })]);
  return { totals, level: levelInfo(totals.xp), today: stats, active7: activeDaysLast7(live, today), challenge: weeklyChallenge(live, today), earned, live };
}

export function useGame() {
  const today = dateKey();
  const rows = useLiveQuery(loadRows, [], undefined);
  const [bank] = useKV('gameBank', null);
  const [stored] = useKV('game', {});
  const [light] = useKV(`lightDay:${today}`, false);
  const [saved, setSaved] = useKV('badges', []);
  const ready = rows && bank !== undefined && stored !== undefined && light !== undefined && saved !== undefined;
  const cfg = { ...DEFAULT_GAME, ...(stored || {}) };
  const g = ready ? computeGame(rows, bank || { upTo: '0000-00-00', totals: EMPTY_TOTALS }, cfg, today, saved) : null;
  const grew = !!g && g.earned.size > saved.length;
  useEffect(() => { if (grew) setSaved([...g.earned]); }, [grew]); // eslint-disable-line react-hooks/exhaustive-deps
  if (!g) return null;
  return { ...g, cfg, today, light: !!light, quests: questsFor(g.today, !!light) };
}
