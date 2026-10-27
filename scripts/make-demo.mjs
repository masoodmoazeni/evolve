// استفاده: node scripts/make-demo.mjs <export.json> <out.json> [yyyy-mm-dd امروز]
// داده‌های واقعی دست‌نخورده می‌ماند و رکوردهای نمونهٔ علامت‌دار به آن اضافه می‌شود
import { readFileSync, writeFileSync } from 'node:fs';
import { buildDemo } from '../src/demoData.js';
import { stripDemo } from '../src/demoLogic.js';

const [src, out, today = new Date().toISOString().slice(0, 10)] = process.argv.slice(2);
const real = stripDemo(JSON.parse(readFileSync(src, 'utf8').replace(/^﻿/, '')));
const demo = buildDemo(today);
for (const [name, rows] of Object.entries(demo)) real.tables[name] = [...(real.tables[name] ?? []), ...rows];
real.exportedAt = new Date().toISOString();
writeFileSync(out, JSON.stringify(real, null, 2));
console.log(Object.entries(demo).map(([k, v]) => `${k}:${v.length}`).join(' '));
