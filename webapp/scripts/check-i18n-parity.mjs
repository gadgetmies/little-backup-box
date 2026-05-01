#!/usr/bin/env node
// Verify that every language file under public/lang/ has the same set of keys.
// Exits non-zero (and lists the missing/extra keys) if any file diverges from
// the union of all keys.
//
// Run via `node scripts/check-i18n-parity.mjs` or `npm run check:i18n`.

import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const LANG_DIR = join(__dirname, '..', 'public', 'lang');

function flatten(obj, prefix = '') {
  const out = new Set();
  for (const [k, v] of Object.entries(obj)) {
    const key = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === 'object' && !Array.isArray(v)) {
      for (const sub of flatten(v, key)) out.add(sub);
    } else {
      out.add(key);
    }
  }
  return out;
}

const files = readdirSync(LANG_DIR).filter((f) => f.endsWith('.json')).sort();
if (files.length === 0) {
  console.error(`No *.json files found in ${LANG_DIR}`);
  process.exit(1);
}

const keysByFile = new Map();
const allKeys = new Set();

for (const file of files) {
  const path = join(LANG_DIR, file);
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(path, 'utf8'));
  } catch (err) {
    console.error(`Failed to parse ${file}: ${err.message}`);
    process.exit(1);
  }
  const keys = flatten(parsed);
  keysByFile.set(file, keys);
  for (const k of keys) allKeys.add(k);
}

let ok = true;
for (const file of files) {
  const keys = keysByFile.get(file);
  const missing = [...allKeys].filter((k) => !keys.has(k));
  if (missing.length > 0) {
    ok = false;
    console.error(`${file} is missing ${missing.length} keys:`);
    for (const k of missing.slice(0, 50)) console.error(`  ${k}`);
    if (missing.length > 50) console.error(`  ... and ${missing.length - 50} more`);
  }
}

if (ok) {
  console.log(`i18n parity OK: ${files.length} files share ${allKeys.size} keys.`);
  process.exit(0);
} else {
  console.error('\nFix: add the missing keys (use the English string as the value if you cannot translate).');
  process.exit(1);
}
