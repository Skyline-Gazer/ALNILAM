#!/usr/bin/env node
// #94 isolated CNB pre-P1 browser CLS lab smoke: not field p75.
import fs from 'node:fs';
import path from 'node:path';
import http from 'node:http';
import {pathToFileURL} from 'node:url';
const ix=process.argv.indexOf('--output');
const root=path.resolve(ix<0?'dist/site':process.argv[ix+1]);
const out=path.resolve('artifacts/cnb-browser');
fs.mkdirSync(out,{recursive:true});
if(!fs.existsSync(path.join(root,'index.html')))throw Error('No composed Site');
const mod=path.resolve('.cnb-browser-tools/node_modules/playwright/index.mjs');
const {chromium}=await import(pathToFileURL(mod).href);
const types={'.html':'text/html; charset=utf-8','.css':'text/css','.js':'text/javascript','.json':'application/json','.svg':'image/svg+xml','.png':'image/png','.woff2':'font/woff2'};
const server=http.createServer((req,res)=>{
  try {
    const rel=decodeURIComponent(new URL(req.url||'/','http://localhost').pathname).replace(/^\/+/, '');
    let file=path.resolve(root,rel);
    if(file!==root&&!file.startsWith(root+path.sep)){res.writeHead(403).end();return;}
    if(fs.existsSync(file)&&fs.statSync(file).isDirectory())file=path.join(file,'index.html');
    if(!fs.existsSync(file)&&!path.extname(file))file=path.join(file,'index.html');
    if(!fs.existsSync(file)||!fs.statSync(file).isFile()){res.writeHead(404).end();return;}
    res.writeHead(200,{'Content-Type':types[path.extname(file)]||'application/octet-stream','Cache-Control':'no-store'});
    fs.createReadStream(file).pipe(res);
  }catch{res.writeHead(400).end();}
});
await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(0,'127.0.0.1',resolve);});
const base='http://127.0.0.1:'+server.address().port;
function cls(events){
  let max=0,total=0,start=0,prev=0;
  for(const e of events.filter(x=>!x.hadRecentInput).sort((a,b)=>a.startTime-b.startTime)){
    if(!total||e.startTime-prev>1000||e.startTime-start>5000){total=e.value;start=e.startTime;}else total+=e.value;
    prev=e.startTime;max=Math.max(max,total);
  }
  return Number(max.toFixed(5));
}
const init=()=>{
  window.__shifts=[];
  new PerformanceObserver(list=>{
    for(const e of list.getEntries())window.__shifts.push({value:e.value,startTime:e.startTime,hadRecentInput:e.hadRecentInput,sources:(e.sources||[]).map(s=>({tag:s.node?.tagName||'',id:s.node?.id||''}))});
  }).observe({type:'layout-shift',buffered:true});
};
let browser;let failed=false;
const summary={status:'NOT_VERIFIED',labOnly:true,sourceSha:process.env.CNB_PULL_REQUEST_SHA||'',testSha:process.env.CNB_COMMIT||'',views:[]};
try{
  browser=await chromium.launch({headless:true});
  for(const viewport of [{width:390,height:844},{width:1440,height:900}]){
    const ctx=await browser.newContext({viewport,reducedMotion:'reduce'});
    await ctx.addInitScript(init);await ctx.tracing.start({screenshots:true,snapshots:true});
    const page=await ctx.newPage();
    const errors=[];page.on('pageerror',err=>errors.push(String(err)));
    const response=await page.goto(base+'/',{waitUntil:'load'});
    if(response?.status()!==200)throw Error('Home unavailable');
    await page.locator('main').first().waitFor();
    await page.evaluate(()=>document.fonts.ready);
    await page.screenshot({path:path.join(out,viewport.width+'-home.png'),fullPage:true});
    const article=page.locator('a[href*="/posts/hello-alnilam/"]').first();
    if(await article.count()===0)throw Error('Article link missing');
    await article.click();await page.locator('article h1').first().waitFor();
    await page.evaluate(()=>document.fonts.ready);
    await page.waitForTimeout(350);await page.evaluate(()=>window.scrollTo(0,document.body.scrollHeight));
    await page.waitForTimeout(350);
    await page.screenshot({path:path.join(out,viewport.width+'-article.png'),fullPage:true});
    const shifts=await page.evaluate(()=>window.__shifts||[]);
    summary.views.push({viewport,cls:cls(shifts),events:shifts,pageErrors:errors});
    if(errors.length)throw Error(errors.join('; '));
    await ctx.tracing.stop({path:path.join(out,viewport.width+'-trace.zip')});
    await ctx.close();
  }
  const ctx=await browser.newContext({viewport:{width:390,height:844}});
  await ctx.addInitScript(init);const page=await ctx.newPage();await page.goto(base+'/',{waitUntil:'load'});
  await page.waitForTimeout(900);
  await page.evaluate(()=>{const el=document.createElement('div');el.style.height='340px';el.textContent='synthetic negative CLS';document.body.prepend(el);});
  await page.waitForTimeout(350);
  summary.negativeCLS=cls(await page.evaluate(()=>window.__shifts||[]));
  if(summary.negativeCLS<=0.01)throw Error('CLS detector negative fixture failed');
  await ctx.close();summary.status='BASELINE_RECORDED';
}catch(err){failed=true;summary.status='FAILED';summary.error=String(err?.stack||err);console.error(summary.error);}
finally{
  fs.writeFileSync(path.join(out,'cls-summary.json'),JSON.stringify(summary,null,2)+'\n');
  await browser?.close();await new Promise(resolve=>server.close(resolve));
}
console.log(JSON.stringify({status:summary.status,views:summary.views.map(x=>({width:x.viewport.width,cls:x.cls})),negativeCLS:summary.negativeCLS}));
if(failed)process.exitCode=1;
