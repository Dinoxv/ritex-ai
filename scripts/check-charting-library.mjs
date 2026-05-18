#!/usr/bin/env node

import { existsSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const REQUIRED_FILES = [
  'public/charting_library/charting_library.js',
];

const RECOMMENDED_FILES = [
  'public/charting_library/charting_library.standalone.js',
  'public/charting_library/bundles',
];

const projectRoot = process.cwd();
const strict = process.env.REQUIRE_TRADINGVIEW_LIBRARY === '1';

const missingRequired = REQUIRED_FILES.filter((file) => !existsSync(resolve(projectRoot, file)));
const missingRecommended = RECOMMENDED_FILES.filter((file) => !existsSync(resolve(projectRoot, file)));

if (missingRequired.length === 0) {
  for (const file of REQUIRED_FILES) {
    const stats = statSync(resolve(projectRoot, file));
    if (!stats.isFile() || stats.size === 0) {
      console.error(`[charting-library] ${file} exists but is empty or not a file.`);
      process.exit(strict ? 1 : 0);
    }
  }

  if (missingRecommended.length > 0) {
    console.warn('[charting-library] Optional assets missing:');
    for (const file of missingRecommended) {
      console.warn(`  - ${file}`);
    }
    console.warn('[charting-library] Widget will load, but some features may be unavailable.');
  } else {
    console.log('[charting-library] TradingView Charting Library detected.');
  }

  process.exit(0);
}

const message = [
  '[charting-library] TradingView Charting Library not found.',
  '[charting-library] Missing files:',
  ...missingRequired.map((file) => `  - ${file}`),
  '',
  '[charting-library] Drop the library bundle into public/charting_library/ to enable the TradingView widget.',
  '[charting-library] Until then, the app will fall back to the built-in ScalpingChart automatically.',
];

if (strict) {
  console.error(message.join('\n'));
  console.error('[charting-library] REQUIRE_TRADINGVIEW_LIBRARY=1 is set — failing the build.');
  process.exit(1);
}

console.warn(message.join('\n'));
process.exit(0);
