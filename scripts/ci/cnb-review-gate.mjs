#!/usr/bin/env node
// An AI review plugin can return exit 0 for a Critical issue. Fail closed.
import fs from 'node:fs';
const f=process.argv[2];
if(!f||!fs.existsSync(f))throw Error('No structured review JSON');
const result=JSON.parse(fs.readFileSync(f,'utf8'));
if(!['passed','needs_modification','critical'].includes(result.status)||!Array.isArray(result.issues))throw Error('Invalid review schema');
const unknown=result.issues.filter(x=>!x||!['critical','warning','info'].includes(x.severity));
if(unknown.length)throw Error('Unknown severity');
const blocking=result.issues.filter(x=>x.severity==='critical'||x.severity==='warning');
console.log(JSON.stringify({status:result.status,issues:result.issues.length,blocking:blocking.length,sourceSHA:process.env.CNB_PULL_REQUEST_SHA||'UNVERIFIED',testedSHA:process.env.CNB_COMMIT||'UNVERIFIED'}));
if(result.status!=='passed'||blocking.length){console.error('Blocking unresolved review issues');process.exitCode=1;}
// A separate CNB native remote-current-SHA verification is still needed
// before elevating this pilot to a required merge gate.
