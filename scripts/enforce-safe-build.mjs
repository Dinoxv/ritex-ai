#!/usr/bin/env node

const isCI = process.env.CI === 'true';
const allowUnsafeBuild = process.env.ALLOW_UNSAFE_BUILD === '1';
const hasDeploymentId = Boolean(process.env.NEXT_DEPLOYMENT_ID);

if (isCI || allowUnsafeBuild || hasDeploymentId) {
  process.exit(0);
}

console.error('\n[build-guard] Refusing unsafe production build.');
console.error('[build-guard] Missing NEXT_DEPLOYMENT_ID can cause stale chunk 404 and frozen page loads.\n');
console.error('[build-guard] Use the safe rollout command instead:');
console.error('  npm run deploy:pm2\n');
console.error('[build-guard] If you intentionally need a one-off local build, run:');
console.error('  ALLOW_UNSAFE_BUILD=1 npm run build\n');

process.exit(1);
