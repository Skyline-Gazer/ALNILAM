#!/usr/bin/env node
// No remote tag is created; use a disposable git repo only.
import os from 'node:os';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const tmp=fs.mkdtempSync(path.join(os.tmpdir(),'alnilam-tag-'));
const git=(...args)=>{const r=spawnSync('git',['-C',tmp,...args],{encoding:'utf8'});if(r.status!==0)throw Error(r.stderr);return r.stdout.trim();};
try{
  git('init','-q');git('config','user.name','Fixture');git('config','user.email','fixture@example.invalid');
  fs.writeFileSync(path.join(tmp,'README'),'fixture\n');
  git('add','README');git('commit','-qm','fixture');
  git('tag','v0.0.1');
  if(git('tag','-l')!=='v0.0.1')throw Error('Initial tag mismatch');
  if(git('tag','-l','v0.0.2'))throw Error('Unexpected existing candidate');
  git('tag','v0.0.2');
  if(git('tag','-l')!=='v0.0.1\nv0.0.2')throw Error('Tag fixture mismatch');
  console.log('ISOLATED_TAG_DRY_RUN_PASS');
}finally{fs.rmSync(tmp,{recursive:true,force:true});}
