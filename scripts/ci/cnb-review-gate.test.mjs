import {test} from 'node:test';
import {strict as assert} from 'node:assert';
import {mkdtempSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
const tool=new URL('./cnb-review-gate.mjs',import.meta.url).pathname;
const cases=[
  [{status:'passed',issues:[]},0],
  [{status:'passed',issues:[{severity:'info'}]},0],
  [{status:'passed',issues:[{severity:'critical'}]},1],
  [{status:'passed',issues:[{severity:'warning'}]},1],
  [{status:'needs_modification',issues:[]},1],
  [{status:'critical',issues:[]},1],
  [{status:'passed',issues:[{severity:'unknown'}]},1],
  [{status:'passed',issues:'invalid'},1],
];
for(const [payload,expected] of cases)test('review gate '+JSON.stringify(payload),()=>{
  const dir=mkdtempSync(path.join(tmpdir(),'cnbr-'));
  try{const f=path.join(dir,'r.json');writeFileSync(f,JSON.stringify(payload));
    const p=spawnSync(process.execPath,[tool,f],{encoding:'utf8'});assert.equal(p.status,expected);
  }finally{rmSync(dir,{recursive:true,force:true});}
});
test('missing report is a failure',()=>{
 const p=spawnSync(process.execPath,[tool,'/impossible/report.json'],{encoding:'utf8'});
 assert.notEqual(p.status,0);
});
