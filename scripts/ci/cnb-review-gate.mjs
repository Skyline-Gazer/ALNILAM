#!/usr/bin/env node
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {createHash} from 'node:crypto';

const SHA = /^[a-f0-9]{40}$/;
export function normalizeReview(result) {
  if (!result || Object.keys(result).sort().join(',') !== 'issues,status' ||
      !['passed', 'needs_modification', 'critical'].includes(result.status) || !Array.isArray(result.issues)) throw Error('Invalid review schema');
  return {...result, issues: result.issues.map(issue => {
    if (!issue || !['critical', 'warning', 'info'].includes(issue.severity) || typeof issue.problem !== 'string' || !issue.problem.trim() ||
        typeof issue.file !== 'string' || !issue.file || !Number.isInteger(issue.start_line) || issue.start_line < 1 || typeof issue.suggestion !== 'string') throw Error('Invalid finding or unknown severity');
    const adapted = {...issue};
    // Observed in native cnb-dje-1k5tfen7s: optional confidence:null rejects upstream comments.
    if (adapted.confidence === null) delete adapted.confidence;
    if (adapted.confidence !== undefined && !['high', 'medium', 'low'].includes(adapted.confidence)) throw Error('Unknown confidence');
    if (adapted.category !== undefined && !['security', 'bug', 'perf', 'maintainability', 'style', 'nit', 'other'].includes(adapted.category)) throw Error('Unknown category');
    return adapted;
  })};
}
function requireCurrent(reviewed, current) {
  for (const key of ['source', 'target', 'merge']) {
    if (!SHA.test(reviewed?.[key] || '') || !SHA.test(current?.[key] || '')) throw Error(`Missing trusted ${key} SHA`);
    if (reviewed[key] !== current[key]) throw Error(`STALE_REVIEW: ${key} moved`);
  }
}
export function gateReview(result, reviewed, current) {
  requireCurrent(reviewed, current);
  result = normalizeReview(result);
  const counts = {critical: 0, warning: 0, info: 0};
  for (const issue of result.issues) {
    if (!issue || !Object.hasOwn(counts, issue.severity) || typeof issue.problem !== 'string' || !issue.problem.trim()) throw Error('Invalid finding or unknown severity');
    counts[issue.severity]++;
  }
  if (result.status === 'critical' || counts.critical || counts.warning ||
      (result.status === 'needs_modification' && !counts.info)) throw Error('Unresolved blocking review; no PR-supplied exception is accepted');
  return counts;
}

export async function commentReview(raw, identity, env = process.env, request = fetch) {
  const result = normalizeReview(JSON.parse(raw));
  if (env.CNB_API_ENDPOINT !== 'https://api.cnb.cool' || !/^[\w-]+(?:\/[\w.-]+)+$/.test(env.CNB_REPO_SLUG || '') ||
      !/^[1-9]\d*$/.test(env.CNB_PULL_REQUEST_IID || '') || !/^[\w.-]+$/.test(env.CNB_REVIEW_COMMENT_AUTHOR || '') || !env.CNB_TOKEN) throw Error('Missing trusted comment API context');
  const digest = createHash('sha256').update(raw).digest('hex');
  const marker = `<!-- ads-cnb-review:${identity.source}:${identity.target}:${identity.merge}:${digest} -->`;
  const isOwnComment = review => {
    const author = review.author?.username, user = review.user?.username;
    return (author || user) === env.CNB_REVIEW_COMMENT_AUTHOR && (!author || !user || author === user) &&
      review.state === 'commented' && review.body?.includes(marker);
  };
  const url = `${env.CNB_API_ENDPOINT}/${env.CNB_REPO_SLUG}/-/pulls/${env.CNB_PULL_REQUEST_IID}/reviews`;
  const headers = {Authorization: `Bearer ${env.CNB_TOKEN}`, Accept: 'application/vnd.cnb.api+json', 'Content-Type': 'application/json'};
  const api = async (suffix, options = {}) => {
    const response = await request(url + suffix, {...options, headers, signal: AbortSignal.timeout(30000)});
    if (!response.ok) throw Error(`Review comment API unavailable: ${response.status}`);
    return response;
  };
  for (let page = 1; page <= 10; page++) {
    const reviews = await (await api(`?page=${page}&page_size=100`)).json();
    if (!Array.isArray(reviews)) throw Error('Malformed native review list');
    if (reviews.some(isOwnComment)) return {state: 'COMMENT_ALREADY_PRESENT', digest};
    if (reviews.length < 100) break;
    if (page === 10) throw Error('Review pagination bound exceeded');
  }
  const body = `${marker}\nOfficial code-review output (comment only). Source ${identity.source}; target ${identity.target}; merge ${identity.merge}. Raw SHA-256 ${digest}. Status: ${result.status}.\n\n` +
    result.issues.map(issue => `**${issue.severity}** ${issue.file}:${issue.start_line}\n\n${issue.problem}\n\n${issue.suggestion}`).join('\n\n---\n\n');
  await api('', {method: 'POST', body: JSON.stringify({event: 'comment', work_mode: false, body, comments: []})});
  const readback = await (await api('?page=1&page_size=100')).json();
  if (!Array.isArray(readback) || !readback.some(isOwnComment)) throw Error('Trusted comment readback missing');
  return {state: 'COMMENT_PUBLISHED', digest};
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
  const head = git('rev-parse', 'HEAD');
  const {CNB_PULL_REQUEST_SHA: source, CNB_PULL_REQUEST_TARGET_SHA: target} = env;
  for (const sha of [source, target, env.CNB_PULL_REQUEST_MERGE_SHA]) {
    if (!SHA.test(sha || '')) throw Error('Missing native source/target/merge SHA');
  }
  if (env.CNB_EVENT !== 'pull_request.target' || env.CNB_COMMIT !== target || head !== target) throw Error('Checkout/event is not the trusted target revision');
  return {source: live[0], target: live[1], merge: env.CNB_PULL_REQUEST_MERGE_SHA};
}

if (import.meta.url === pathToFileURL(process.argv[1] || '').href) {
  try {
    const file = process.argv[2];
    if (!file || !fs.lstatSync(file).isFile()) throw Error('Review output must be a fresh regular file');
    const reviewed = {source: process.env.CNB_PULL_REQUEST_SHA, target: process.env.CNB_PULL_REQUEST_TARGET_SHA, merge: process.env.CNB_PULL_REQUEST_MERGE_SHA};
    const raw = fs.readFileSync(file, 'utf8');
    const current = currentIdentity();
    requireCurrent(reviewed, current);
    if (process.argv.includes('--comment')) console.log(JSON.stringify(await commentReview(raw, reviewed)));
    const counts = gateReview(JSON.parse(raw), reviewed, currentIdentity());
    console.log(JSON.stringify({status: 'REVIEW_PASS', ...reviewed, counts}));
  } catch (error) {
    console.error(`REVIEW_BLOCKED: ${error.message}`);
    process.exitCode = 1;
  }
}
