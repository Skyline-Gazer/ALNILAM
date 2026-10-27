#!/usr/bin/env node
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';

const SHA = /^[a-f0-9]{40}$/;
export function gateReview(result, reviewed, current) {
  for (const key of ['source', 'target', 'merge']) {
    if (!SHA.test(reviewed?.[key] || '') || !SHA.test(current?.[key] || '')) throw Error(`Missing trusted ${key} SHA`);
    if (reviewed[key] !== current[key]) throw Error(`STALE_REVIEW: ${key} moved`);
  }
  if (!result || Object.keys(result).sort().join(',') !== 'issues,status' ||
      !['passed', 'needs_modification', 'critical'].includes(result.status) || !Array.isArray(result.issues)) throw Error('Invalid review schema');
  const counts = {critical: 0, warning: 0, info: 0};
  for (const issue of result.issues) {
    if (!issue || !Object.hasOwn(counts, issue.severity) || typeof issue.problem !== 'string' || !issue.problem.trim()) throw Error('Invalid finding or unknown severity');
    counts[issue.severity]++;
  }
  if (result.status === 'critical' || counts.critical || counts.warning ||
      (result.status === 'needs_modification' && !counts.info)) throw Error('Unresolved blocking review; no PR-supplied exception is accepted');
  return counts;
}

export function currentIdentity(env = process.env, git = (...args) => execFileSync('git', args, {encoding: 'utf8'}).trim()) {
  if (env.CNB_PULL_REQUEST_SLUG !== env.CNB_REPO_SLUG || !env.CNB_REPO_SLUG) throw Error('Fork/unknown source requires a trusted API adapter');
  const branches = [env.CNB_PULL_REQUEST_BRANCH, env.CNB_BRANCH];
  for (const branch of branches) {
    if (!branch || branch.startsWith('-')) throw Error('Missing native branch identity');
    git('check-ref-format', `refs/heads/${branch}`);
  }
  const live = branches.map(branch => {
    const lines = git('ls-remote', 'origin', `refs/heads/${branch}`).split('\n');
    if (lines.length !== 1 || lines[0].split('\t')[1] !== `refs/heads/${branch}`) throw Error('Missing/ambiguous live ref');
    return lines[0].split('\t')[0];
  });
  const merge = git('rev-parse', 'HEAD');
  if (merge !== env.CNB_PULL_REQUEST_MERGE_SHA || merge !== env.CNB_COMMIT) throw Error('Checkout is not the native evaluated merge candidate');
  for (const sha of [env.CNB_PULL_REQUEST_SHA, env.CNB_PULL_REQUEST_TARGET_SHA]) {
    if (!SHA.test(sha || '')) throw Error('Missing native source/target SHA');
    git('merge-base', '--is-ancestor', sha, merge);
  }
  return {source: live[0], target: live[1], merge};
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  try {
    const file = process.argv[2];
    if (!file || !fs.lstatSync(file).isFile()) throw Error('Review output must be a fresh regular file');
    const reviewed = {source: process.env.CNB_PULL_REQUEST_SHA, target: process.env.CNB_PULL_REQUEST_TARGET_SHA, merge: process.env.CNB_PULL_REQUEST_MERGE_SHA};
    const counts = gateReview(JSON.parse(fs.readFileSync(file, 'utf8')), reviewed, currentIdentity());
    console.log(JSON.stringify({status: 'REVIEW_PASS', ...reviewed, counts}));
  } catch (error) {
    console.error(`REVIEW_BLOCKED: ${error.message}`);
    process.exitCode = 1;
  }
}
