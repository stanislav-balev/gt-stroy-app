// Test helpers: static server + headless Edge/Chrome driven over the DevTools protocol (no dependencies, Node 22+).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';

export const sleep=ms=>new Promise(r=>setTimeout(r,ms));

export function serve(root,port){
  root=path.resolve(root);
  const types={'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.json':'application/json','.webmanifest':'application/manifest+json','.png':'image/png','.woff2':'font/woff2'};
  const srv=http.createServer((req,res)=>{
    let u=decodeURIComponent(req.url.split('?')[0]);if(u.endsWith('/'))u+='index.html';
    const f=path.join(root,u);
    if(!f.startsWith(root)||!fs.existsSync(f)||fs.statSync(f).isDirectory()){res.writeHead(404);res.end('not found');return;}
    res.writeHead(200,{'content-type':types[path.extname(f)]||'application/octet-stream','cache-control':'no-cache'});fs.createReadStream(f).pipe(res);
  });
  return new Promise(r=>srv.listen(port,'127.0.0.1',()=>r(srv)));
}

const BROWSERS=['C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Microsoft/Edge/Application/msedge.exe','C:/Program Files/Google/Chrome/Application/chrome.exe'];
export async function launch({port=20000+Math.floor(Math.random()*30000),width=1100,height=1400}={}){
  const exe=BROWSERS.find(p=>fs.existsSync(p));if(!exe)throw new Error('Не намирам Edge или Chrome.');
  const prof=fs.mkdtempSync(path.join(os.tmpdir(),'gt-prof-'));
  const proc=spawn(exe,['--headless=new','--disable-gpu','--remote-debugging-port='+port,'--user-data-dir='+prof,'--no-first-run','--window-size='+width+','+height,'about:blank'],{stdio:'ignore'});
  let targets;for(let i=0;i<60;i++){try{targets=await (await fetch('http://127.0.0.1:'+port+'/json')).json();if(targets.length)break}catch(e){}await sleep(250);}
  const page=targets.find(t=>t.type==='page');
  const ws=new WebSocket(page.webSocketDebuggerUrl);await new Promise(r=>ws.onopen=r);
  let id=0;const pend=new Map(),errors=[];
  ws.onmessage=m=>{const d=JSON.parse(m.data);
    if(d.id&&pend.has(d.id)){pend.get(d.id)(d);pend.delete(d.id);}
    else if(d.method==='Runtime.exceptionThrown')errors.push('EXC '+(d.params.exceptionDetails.exception?.description||d.params.exceptionDetails.text));
    else if(d.method==='Runtime.consoleAPICalled'&&d.params.type==='error')errors.push('CONSOLE '+d.params.args.map(a=>a.value??a.description).join(' '));
    else if(d.method==='Log.entryAdded'&&d.params.entry.level==='error'&&!/favicon|manifest/i.test(d.params.entry.text+d.params.entry.url))errors.push('LOG '+d.params.entry.text+' '+(d.params.entry.url||''));};
  const send=(method,params={})=>new Promise(r=>{const i=++id;pend.set(i,r);ws.send(JSON.stringify({id:i,method,params}));});
  const b={send,errors,
    async ev(expr){const r=await send('Runtime.evaluate',{expression:expr,awaitPromise:true,returnByValue:true});
      if(r.result.exceptionDetails)throw new Error(JSON.stringify(r.result.exceptionDetails.exception?.description||r.result.exceptionDetails.text));return r.result.result.value;},
    async nav(url,wait=1800){await send('Page.navigate',{url});await sleep(wait);},
    async shot(file,opts={}){const r=await send('Page.captureScreenshot',{format:'png',...opts});fs.writeFileSync(file,Buffer.from(r.result.data,'base64'));},
    async mobile(on){if(on)await send('Emulation.setDeviceMetricsOverride',{width:390,height:844,deviceScaleFactor:2,mobile:true});else await send('Emulation.clearDeviceMetricsOverride');},
    close(){try{ws.close()}catch(e){}proc.kill();try{fs.rmSync(prof,{recursive:true,force:true})}catch(e){}}};
  await send('Runtime.enable');await send('Page.enable');await send('Log.enable');
  await send('Page.bringToFront');await send('Emulation.setFocusEmulationEnabled',{enabled:true}); // headless tabs otherwise get no animation frames
  return b;
}

let passed=0,failed=0;
export const ok=(c,msg)=>{if(c)passed++;else failed++;console.log((c?'PASS ':'FAIL ')+msg);return c;};
export const summary=()=>{console.log(`\n${passed} passed, ${failed} failed`);return failed;};
