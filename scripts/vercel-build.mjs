#!/usr/bin/env node
// Vercel build entry: compose the demo Site into dist/site and run the artifact
// budgets. Vercel serves `outputDirectory: "dist/site"` from this repository's
// vercel.json, so the deployment root is the composed Site rather than the
// repository's dist/ directory.
//
// Absolute URLs (canonical, sitemap, robots, RSS, OpenGraph) must name the
// deployment that is actually served. When the project does not pin
// ALNILAM_SITE_URL, derive it from Vercel's own system variables: the stable
// production host for production deployments and the deployment host elsewhere.
import {spawnSync} from 'node:child_process';

const env = {...process.env};
const host = env.VERCEL_ENV === 'production'
  ? env.VERCEL_PROJECT_PRODUCTION_URL || env.VERCEL_URL
  : env.VERCEL_URL || env.VERCEL_PROJECT_PRODUCTION_URL;
if (!env.ALNILAM_SITE_URL && host) {
  env.ALNILAM_SITE_URL = `https://${host.replace(/\/+$/, '')}/`;
}

const run = (name, command, args) => {
  const result = spawnSync(command, args, {stdio: 'inherit', env});
  if (result.error) throw result.error;
  if (result.status !== 0) throw Error(`${name} failed (status ${result.status})`);
};

if (env.ALNILAM_SITE_URL) console.log(`Deploying with site URL: ${env.ALNILAM_SITE_URL}`);
run('compose', process.execPath, ['scripts/compose.mjs', '--site', 'sites/demo', '--out', 'dist/site']);
run('artifact-check', process.execPath, ['scripts/artifact-check.mjs', 'dist/site']);
