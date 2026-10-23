import { DEFAULT_RETENTION, DATED_TABLES, db, getKV, setKV } from './db.js';
import { addDays, dateKey } from './util.js';

// کلیدهای kv که وضعیت موقت همین دستگاه‌اند و از پشتیبان وارد نمی‌شوند
export const LOCAL_KV = ['lastPrune', 'focusRun', 'pruneAck'];

export const TABLE_LABELS = {
  goals: 'هدف‌ها', goalLogs: 'ثبت هدف‌ها', habits: 'عادت‌ها', habitLogs: 'ثبت عادت‌ها', tasks: 'کارها', focus: 'جلسه‌های تمرکز',
  notes: 'یادداشت‌ها', moods: 'ثبت حال', reviews: 'مرورها', suggestions: 'پیشنهادها', kv: 'تنظیمات و پروفایل',
};

// بررسی ساختار فایل پشتیبان؛ { ok, error?, backup? }
export function parseBackup(text) {
  let data;
  try {
    data = JSON.parse(text.replace(/^﻿/, ''));
  } catch {
    return { ok: false, error: 'این فایل JSON معتبر نیست.' };
  }
  if (!data || data.app !== 'evolve' || typeof data.tables !== 'object' || Array.isArray(data.tables)) {
    return { ok: false, error: 'این فایل پشتیبان اِوالو نیست.' };
  }
  if (typeof data.version === 'number' && data.version > db.verno) {
    return { ok: false, error: 'این پشتیبان از نسخهٔ جدیدتری از اپ گرفته شده؛ اپ را به‌روز کن.' };
  }
  for (const [name, rows] of Object.entries(data.tables)) {
    if (!Array.isArray(rows)) return { ok: false, error: `جدول «${name}» در فایل خراب است.` };
  }
  return { ok: true, backup: data };
}

const cutoffKey = async (now) => addDays(dateKey(now), -(await getKV('retention', DEFAULT_RETENTION)));

// برنامهٔ ورود: برای هر جدول چه رکوردهایی نوشته می‌شود (بدون نوشتن)
async function plan(backup, { mode, skipOld }, now) {
  const cutoff = await cutoffKey(now);
  const known = new Set(db.tables.map((t) => t.name));
  const out = [];
  for (const [name, rows] of Object.entries(backup.tables)) {
    if (!known.has(name)) {
      out.push({ name, inFile: rows.length, write: [], existing: 0, old: 0, unknown: true });
      continue;
    }
    let list = rows;
    if (name === 'kv') list = list.filter((r) => r && !LOCAL_KV.includes(r.key));
    let old = 0;
    if (skipOld && (DATED_TABLES.includes(name) || name === 'suggestions')) {
      const keep = list.filter((r) => !r.date || r.date >= cutoff);
      old = list.length - keep.length;
      list = keep;
    }
    let existing = 0;
    if (mode === 'merge') {
      const keyOf = (r) => (name === 'kv' ? r.key : r.id);
      const have = await db[name].bulkGet(list.map(keyOf));
      const fresh = list.filter((_, i) => have[i] === undefined);
      existing = list.length - fresh.length;
      list = fresh;
    }
    out.push({ name, inFile: rows.length, write: list, existing, old });
  }
  return out;
}

export async function previewImport(backup, opts, now = new Date()) {
  const p = await plan(backup, opts, now);
  return p.map(({ name, inFile, write, existing, old, unknown }) => ({ name, inFile, willAdd: write.length, existing, old, unknown: !!unknown }));
}

export async function applyImport(backup, opts, now = new Date()) {
  const p = await plan(backup, opts, now);
  const names = p.filter((x) => !x.unknown).map((x) => x.name);
  await db.transaction('rw', db.tables, async () => {
    for (const { name, write } of p) {
      if (!names.includes(name)) continue;
      if (opts.mode === 'replace') {
        if (name === 'kv') await db.kv.filter((r) => !LOCAL_KV.includes(r.key)).delete();
        else await db[name].clear();
      }
      await db[name].bulkPut(write);
    }
    // پس از ورود، پاک‌سازی همان روز اجرا نشود تا کاربر فرصت بررسی داشته باشد
    await setKV('lastPrune', dateKey(now));
  });
  return p.filter((x) => !x.unknown).map(({ name, write }) => ({ name, added: write.length }));
}
