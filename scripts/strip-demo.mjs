// استفاده: node scripts/strip-demo.mjs <export.json> <out.json>  — همهٔ رکوردهای نمونه را از فایل پشتیبان حذف می‌کند
import { readFileSync, writeFileSync } from 'node:fs';
import { stripDemo } from '../src/demoLogic.js';

const [src, out] = process.argv.slice(2);
writeFileSync(out, JSON.stringify(stripDemo(JSON.parse(readFileSync(src, 'utf8').replace(/^﻿/, ''))), null, 2));
