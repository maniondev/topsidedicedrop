#!/usr/bin/env node
/**
 * i18n parity guard.
 *
 * Validates every locale in ./locales against en.json (the source of truth):
 *   1. JSON parses.
 *   2. Key parity — same key tree as en.json (no missing, no extra keys).
 *      Falling behind here means a language silently falls back to English for
 *      the missing keys; extra keys mean stale entries after a rename.
 *   3. Placeholder parity — every {{var}} and <tag> in the English value is
 *      present in the translation. A dropped {{score}} / <terms> ships as a
 *      broken string in that language.
 *
 * Exit code 1 on any problem so this can gate a commit or CI run.
 * Run: `npm run check-i18n`
 */
const fs = require('fs');
const path = require('path');

const LOCALES_DIR = path.join(__dirname, '..', 'locales');
const SOURCE = 'en';

function flatten(obj, prefix = '', out = {}) {
  for (const k of Object.keys(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (obj[k] && typeof obj[k] === 'object') flatten(obj[k], key, out);
    else out[key] = obj[k];
  }
  return out;
}

// Signature of the placeholders/tags in a string, order-independent.
function placeholders(value) {
  const s = String(value);
  const vars = [...s.matchAll(/\{\{(\w+)\}\}/g)].map((m) => m[1]).sort();
  const tags = [...s.matchAll(/<(\/?\w+)>/g)].map((m) => m[1]).sort();
  return JSON.stringify({ vars, tags });
}

function readLocale(lang) {
  const file = path.join(LOCALES_DIR, `${lang}.json`);
  return flatten(JSON.parse(fs.readFileSync(file, 'utf8')));
}

const en = readLocale(SOURCE);
const enKeys = Object.keys(en);

const langs = fs
  .readdirSync(LOCALES_DIR)
  .filter((f) => f.endsWith('.json'))
  .map((f) => path.basename(f, '.json'))
  .filter((l) => l !== SOURCE)
  .sort();

let problems = 0;

for (const lang of langs) {
  let t;
  try {
    t = readLocale(lang);
  } catch (e) {
    console.log(`[${lang}] ✗ invalid JSON — ${e.message}`);
    problems++;
    continue;
  }

  const tKeys = Object.keys(t);
  const missing = enKeys.filter((k) => !(k in t));
  const extra = tKeys.filter((k) => !(k in en));
  const phMismatch = enKeys.filter((k) => k in t && placeholders(en[k]) !== placeholders(t[k]));

  if (missing.length || extra.length || phMismatch.length) {
    problems++;
    console.log(`[${lang}] ✗`);
    if (missing.length) console.log(`  missing keys: ${missing.join(', ')}`);
    if (extra.length) console.log(`  extra keys: ${extra.join(', ')}`);
    for (const k of phMismatch) {
      console.log(`  placeholder mismatch: ${k}\n    en: ${placeholders(en[k])}\n    ${lang}: ${placeholders(t[k])}`);
    }
  } else {
    console.log(`[${lang}] ✓ ${tKeys.length} keys`);
  }
}

if (problems) {
  console.log(`\n${problems} locale file(s) with problems.`);
  process.exit(1);
}
console.log(`\nAll ${langs.length} locales match en.json (${enKeys.length} keys).`);
