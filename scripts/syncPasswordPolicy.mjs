#!/usr/bin/env node
/**
 * Password-policy sync utility.
 *
 * The password policy lives canonically in
 * `backend/src/utils/passwordPolicy.ts` and is mirrored to
 * `frontend/src/common/lib/passwordPolicy.ts`. Both files must stay
 * byte-identical between the `// @keep-in-sync:start` and
 * `// @keep-in-sync:end` markers; the per-side
 * `PASSWORD_POLICY_ERROR_MESSAGE` below the synced block may differ
 * (Korean on the backend for API responses, English on the frontend for
 * UI copy).
 *
 * Usage from the repo root:
 *   node scripts/syncPasswordPolicy.mjs          # rewrite the frontend block from backend
 *   node scripts/syncPasswordPolicy.mjs --check  # exit non-zero if the blocks differ (use in CI)
 */
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(here, '..');
const BACKEND_PATH = resolve(repoRoot, 'backend/src/utils/passwordPolicy.ts');
const FRONTEND_PATH = resolve(repoRoot, 'frontend/src/common/lib/passwordPolicy.ts');

// Only match the markers when they sit at the very start of a line so that
// references to them inside a header doc-comment (where they appear as
// prose like `// @keep-in-sync:end`) don't get picked up.
const START_MARKER_PATTERN = /^\/\/ @keep-in-sync:start$/m;
const END_MARKER_PATTERN = /^\/\/ @keep-in-sync:end$/m;

const locateMarkers = (source, label) => {
  const startMatch = START_MARKER_PATTERN.exec(source);
  const endMatch = END_MARKER_PATTERN.exec(source);

  if (!startMatch || !endMatch || endMatch.index < startMatch.index) {
    throw new Error(`Missing @keep-in-sync markers in ${label}`);
  }

  return {
    startIndex: startMatch.index,
    endIndex: endMatch.index + endMatch[0].length,
  };
};

const extractSyncedBlock = (source, label) => {
  const { startIndex, endIndex } = locateMarkers(source, label);
  return source.slice(startIndex, endIndex);
};

const replaceSyncedBlock = (source, nextBlock, label) => {
  const { startIndex, endIndex } = locateMarkers(source, label);
  return source.slice(0, startIndex) + nextBlock + source.slice(endIndex);
};

const backendSource = readFileSync(BACKEND_PATH, 'utf8');
const frontendSource = readFileSync(FRONTEND_PATH, 'utf8');

const backendBlock = extractSyncedBlock(backendSource, 'backend passwordPolicy.ts');
const frontendBlock = extractSyncedBlock(frontendSource, 'frontend passwordPolicy.ts');

const isCheckMode = process.argv.includes('--check');

if (backendBlock === frontendBlock) {
  console.log('passwordPolicy: synced blocks match.');
  process.exit(0);
}

if (isCheckMode) {
  console.error(
    'passwordPolicy: DRIFT DETECTED between backend and frontend synced blocks.\n' +
      '  canonical: backend/src/utils/passwordPolicy.ts\n' +
      '  mirror:    frontend/src/common/lib/passwordPolicy.ts\n' +
      'Run `node scripts/syncPasswordPolicy.mjs` to regenerate the mirror from the canonical file.',
  );
  process.exit(1);
}

const nextFrontendSource = replaceSyncedBlock(
  frontendSource,
  backendBlock,
  'frontend passwordPolicy.ts',
);
writeFileSync(FRONTEND_PATH, nextFrontendSource);
console.log('passwordPolicy: regenerated frontend/src/common/lib/passwordPolicy.ts from backend.');
