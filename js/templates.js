// The kinds of post. Each one: what the picker card says, which fields to ask for, and how to paint the picture.
// Ported from v1 (ad, ba, obj, stage, grishi) plus the new ones (sale, tip, review, video, offer, job, holiday).
import {painter,SIZES,D,B,SAFE} from "./draw.js";
import {HOLIDAYS,OTHER,holidayByKey,greeting,upcoming,allHolidays} from "./holidays.js";
import {getSettings,getAssets,PALETTES} from "./settings.js";

export const STATUSES=["В строеж","Груб строеж","Завършен","Предстои"];
export const TYPES=["Еднофамилна къща","Жилищна сграда","Двуфамилна къща","Ремонт / пристройка"];
export const FMT_INFO={
  post:{name:"За поста",ratio:"4:5",help:"4:5 е най-голямата картинка, която Facebook показва цяла на телефона — като по-голяма табела."},
  sq:{name:"Квадрат",ratio:"1:1",help:"Квадратът е по-малък, но пасва навсякъде — и във Facebook, и в Instagram."},
  story:{name:"Сторис",ratio:"9:16",help:"Сторис е снимка на цял екран, която стои 24 часа и после изчезва. Горе и долу оставяме място, което приложението на Facebook закрива."},
  wide:{name:"Широка",ratio:"16:9",help:"Широката картинка е за корица на клип в YouTube."}
};
export const GROUPS=[{id:"obj",title:"За обектите"},{id:"grishi",title:"От Гриши"},{id:"firma",title:"За фирмата"}];

/* ---------- small helpers ---------- */
const lines=s=>String(s||"").split(/\r?\n/).map(x=>x.replace(/^[\s•\-–*✓]+/,"").trim()).filter(Boolean);
export const cleanArea=x=>String(x??"").replace(/\s*(м²|м2|кв\.?\s*м\.?|квадрат\p{L}*)\s*$/iu,"").trim();
const norm=d=>{const o={};for(const [k,v] of Object.entries(d||{}))o[k]=typeof v==="string"?v.trim():v;return o;};

function statusChip(e){const {g,W,P,top,S,d}=e;if(S.showStatus===false||!d.status)return;const [bg,fg]=g.statusColor(d.status);g.chip(d.status,W-P,top,bg,fg);}
function bg(e,dim){const {ctx,g,W,H,photos}=e;if(photos.length){g.drawPhotos(0,0,W,H,photos,false);if(dim){ctx.fillStyle=`rgba(10,20,15,${dim})`;ctx.fillRect(0,0,W,H);}}else g.solid(W,H);}
// largest font size (stepping down) at which the text fits in maxLines; leaves ctx.font set to it
function fitLines(e,text,weight,family,size,maxW,maxLines,min=34,step=4){
  const {ctx,g}=e;let s=size;
  const words=String(text).split(/\s+/).filter(Boolean);
  for(;s>min;s-=step){ // shrink until no single word is wider than the line (a word is never cut in half) and the lines fit
    ctx.font=`${weight} ${s}px ${family}`;
    if(words.every(w=>ctx.measureText(w).width<=maxW)&&g.wlines(text,maxW,99).length<=maxLines)break;
  }
  ctx.font=`${weight} ${s}px ${family}`;return {s,lines:g.wlines(text,maxW,maxLines)};
}
// places blocks ({h, draw(top)}) one under another between top and bottom: centred with even gaps, or pinned to the bottom
function stack(blocks,top,bottom,{gapMin=24,gapMax=72,anchor="center"}={}){
  const total=blocks.reduce((s,b)=>s+b.h,0),n=blocks.length;
  if(anchor==="bottom"){let y=bottom-total-gapMin*(n-1);blocks.forEach(b=>{b.draw(y);y+=b.h+gapMin;});return;}
  const gap=Math.max(gapMin,Math.min(gapMax,(bottom-top-total)/(n+1)));
  let y=top+Math.max(0,(bottom-top-total-gap*(n-1))/2);
  blocks.forEach(b=>{b.draw(y);y+=b.h+gap;});
}
// biggest size (stepping down from size0) at which a marks() list fits in availH; measures only
function marksSize(g,items,x,maxW,availH,size0,opts={}){
  let s=size0;for(;s>24;s-=2)if(g.marks(items,x,0,maxW,{...opts,size:s,dry:true})<=availH)break;return s;
}
function fitMarks(e,items,x,y,maxW,availH,size0,opts={}){
  const {g}=e;let s=size0;
  for(;s>24;s-=2)if(g.marks(items,x,y,maxW,{...opts,size:s,dry:true})<=availH)break;
  return {s,h:g.marks(items,x,y,maxW,{...opts,size:s})};
}
function badge(e,text,x,y,maxW,size){ // sand rounded badge with ink text; returns its height
  const {ctx,g,C}=e;const s=g.fitFont(text,800,D,size,maxW-64,28);ctx.font=`800 ${s}px ${D}`;
  const w=ctx.measureText(text).width+64,h=Math.round(s*1.85);
  g.rr(x,y,w,h,h/2);ctx.fillStyle=C.sand;ctx.fill();ctx.fillStyle=C.ink;ctx.textBaseline="middle";ctx.fillText(text,x+32,y+h/2+2);ctx.textBaseline="alphabetic";return h;
}

/* ---------- ad (collage) and before/after: photos on top, info panel sized to its content ---------- */
function adMetrics(e){
  const {ctx,g,W,H,P,S,d,fmt,story}=e;
  const tw=W-2*P,slogan=(S.slogan||"").trim(),title=d.title||"Име на обекта",desc=(d.desc||"").replace(/\s+/g," ").trim();
  let hs=60;for(;hs>38;hs-=6){ctx.font=`800 ${hs}px ${D}`;if(g.wlines(title,tw,9).length<=2)break;}
  ctx.font=`800 ${hs}px ${D}`;const hl=g.wlines(title,tw,2),hlh=hs*1.18;
  const fl=(d.floors||"").trim(),area=cleanArea(d.area);
  const pills=[area&&area+" м²",fl&&(/^\d+$/.test(fl)?fl+(fl==="1"?" етаж":" етажа"):fl),d.time,d.units].map(x=>x&&String(x).trim()).filter(Boolean);
  ctx.font=`700 30px ${B}`;let px=P,rows=0;
  const pos=pills.map(t=>{const w=ctx.measureText(t).width+44;if(px+w>W-P&&px>P){px=P;rows++;}const o={t,w,x:px,row:rows};px+=w+14;return o;});
  ctx.font=`500 31px ${B}`;const bl=desc?g.wlines("„"+desc+"“",tw,story?6:fmt==="sq"?2:3):[];
  const fh=(S.showFooter===false?0:96)+(story?SAFE:0);
  const ph=Math.round(56+(slogan?22:0)+hs+(hl.length-1)*hlh+30+(pills.length?(rows+1)*74-14+30:0)+(bl.length?bl.length*44+36:0)+30+fh);
  return {slogan,hs,hl,hlh,pills,pos,rows,bl,ph,ptop:H-ph};
}
function paintAd(e,m){
  const {ctx,g,C,W,H,P,S}=e;
  g.rr(0,m.ptop,W,m.ph+10,[44,44,0,0]);ctx.fillStyle=C.green;ctx.fill();g.footer(W,H);
  let y=m.ptop+56;
  if(m.slogan){ctx.fillStyle=C.sand;ctx.font=`700 26px ${B}`;ctx.fillText(m.slogan.toUpperCase(),P,y);y+=22;}
  ctx.font=`800 ${m.hs}px ${D}`;ctx.fillStyle=C.white;
  m.hl.forEach((l,i)=>ctx.fillText(l,P,y+m.hs+i*m.hlh));y+=m.hs+(m.hl.length-1)*m.hlh+30;
  ctx.font=`700 30px ${B}`;
  m.pos.forEach(o=>{const yy=y+o.row*74;g.rr(o.x,yy,o.w,60,30);ctx.fillStyle="rgba(255,255,255,.16)";ctx.fill();
    ctx.fillStyle=C.white;ctx.textBaseline="middle";ctx.fillText(o.t,o.x+22,yy+31);ctx.textBaseline="alphabetic";});
  if(m.pills.length)y+=(m.rows+1)*74-14+30;
  if(m.bl.length){ctx.font=`500 31px ${B}`;ctx.fillStyle="rgba(255,255,255,.92)";m.bl.forEach((l,i)=>ctx.fillText(l,P,y+32+i*44));
    ctx.fillStyle=C.sand;ctx.font=`700 28px ${B}`;ctx.fillText("— "+(S.grishiName||"Гриши"),P,y+26+m.bl.length*44);}
}
// photo 1 = before, photo 2 = after; stacked, or side by side on the square format
function drawBA(e,ptop){
  const {ctx,g,C,W,P,fmt,photos}=e;
  const gap=8,h=ptop+60,side=fmt==="sq",hh=(h-gap)/2;
  const R=side?[[0,0,(W-gap)/2,h],[(W+gap)/2,0,(W-gap)/2,h]]:[[0,0,W,hh],[0,hh+gap,W,h-gap-hh]];
  ctx.fillStyle=C.ink;ctx.fillRect(0,0,W,h);
  [["Преди","#ffffff"],["След",C.sand]].forEach(([lb,bgc],i)=>{const r=R[i],p=photos[i];
    if(p)g.cover(p,...r);else g.placeholder(...r,i?"Тук идва снимката „след“":"Тук идва снимката „преди“");
    g.tag(lb,r[0]+P/2,Math.min(r[1]+r[3],ptop)-84,bgc,C.ink);});
}
function drawAd(e,kind){
  const {g,W,P,top,photos}=e;const m=adMetrics(e);
  if(kind==="ad")g.drawPhotos(0,0,W,m.ptop+60,photos,true);else drawBA(e,m.ptop);
  g.topShade(W);g.brand(P,top);statusChip(e);paintAd(e,m);
}

/* ---------- obj / stage / grishi (full-bleed photo with text at the bottom) ---------- */
function drawObj(e){
  const {ctx,g,C,W,H,P,top,story,d,photos}=e;
  g.drawPhotos(0,0,W,H,photos,false);
  g.shade(W,H,story?.38:.3);g.brand(P,top);statusChip(e);
  const fh=g.footer(W,H);let y=H-fh-P;
  const area=cleanArea(d.area),title=d.title||"Име на обекта";
  const st=[["Площ",area?area+" м²":""],["Етажи",d.floors],["Срок",d.time],[(d.type||"").includes("сграда")?"Апартаменти":"Помещения",d.units]];
  const sh=g.stats(st,P,y-140,W-2*P);y-=sh+30;
  if(d.fact){ctx.fillStyle=C.sand;ctx.font=`600 30px ${B}`;ctx.fillText("▸ "+d.fact,P,y);y-=58;}
  ctx.fillStyle="rgba(255,255,255,.8)";ctx.font=`500 32px ${B}`;ctx.fillText([d.type,d.place].filter(Boolean).join(" · "),P,y);y-=72;
  ctx.fillStyle=C.white;ctx.font=`800 70px ${D}`;
  g.wlines(title,W-2*P,2).reverse().forEach((l,i)=>ctx.fillText(l,P,y-i*82));
}
function drawStage(e){
  const {ctx,g,C,W,H,P,top,story,d,photos}=e;
  g.drawPhotos(0,0,W,H,photos,false);
  g.shade(W,H,story?.4:.32);g.brand(P,top);g.chip(d.week||"Етап",W-P,top,C.sand,C.ink);
  const fh=g.footer(W,H);let y=H-fh-P;
  const pct=Math.max(0,Math.min(100,+String(d.pct??"").replace(",",".")||0)),title=d.title||"Име на обекта";
  g.bar(pct,P,y-26,W-2*P);y-=50;
  ctx.fillStyle="rgba(255,255,255,.75)";ctx.font=`600 28px ${B}`;ctx.fillText("ГОТОВНОСТ НА ОБЕКТА",P,y);
  ctx.fillStyle=C.white;ctx.font=`800 120px ${D}`;ctx.textAlign="right";ctx.fillText(Math.round(pct)+"%",W-P,y+6);ctx.textAlign="left";y-=150;
  if(d.mat){ctx.fillStyle=C.sand;ctx.font=`600 32px ${B}`;ctx.fillText("▸ "+d.mat,P,y);y-=60;}
  ctx.fillStyle=C.white;ctx.font=`700 50px ${D}`;
  const ln=g.wlines(d.now||"Какво правим сега",W-2*P,3);ln.slice().reverse().forEach((l,i)=>ctx.fillText(l,P,y-i*64));y-=ln.length*64+8;
  ctx.fillStyle="rgba(255,255,255,.75)";ctx.font=`600 28px ${B}`;ctx.fillText(("Сега на обекта · "+title).toUpperCase().slice(0,48),P,y);
}
function drawGrishi(e){
  const {ctx,g,C,W,H,P,top,story,S,A,d,photos}=e;
  g.drawPhotos(0,0,W,H,photos,false);
  g.shade(W,H,story?.45:.35);g.brand(P,top);
  const fh=g.footer(W,H);let y=H-fh-P;
  ctx.font=`700 ${story?54:50}px ${D}`;
  const lines2=g.wlines("„"+(d.quote||"…")+"“",W-2*P-80,6);
  const lh=story?70:64,bh=lines2.length*lh+80;
  g.rr(P,y-bh,W-2*P,bh,22);ctx.fillStyle="rgba(255,255,255,.95)";ctx.fill();
  ctx.beginPath();ctx.moveTo(P+70,y-bh);ctx.lineTo(P+110,y-bh-34);ctx.lineTo(P+140,y-bh);ctx.fill();
  ctx.fillStyle=C.ink;lines2.forEach((l,i)=>ctx.fillText(l,P+40,y-bh+40+lh*0.8+i*lh));
  y-=bh+60;
  const nm=(S.grishiName||"Гриши").toUpperCase();let x0=P;
  if(A.grishi){g.avatar(A.grishi,P+50,y-20,50);x0=P+124;}
  ctx.font=`800 44px ${D}`;const nw=ctx.measureText(nm).width;g.rr(x0,y-56,nw+56,72,36);ctx.fillStyle=C.sand;ctx.fill();
  ctx.fillStyle=C.ink;ctx.textBaseline="middle";ctx.fillText(nm,x0+28,y-20);ctx.textBaseline="alphabetic";
  ctx.fillStyle="rgba(255,255,255,.85)";ctx.font=`500 30px ${B}`;ctx.fillText("на обекта · "+(d.title||"Име на обекта"),x0+nw+80,y-10);
}

/* ---------- new kinds ---------- */
function drawSale(e){
  const {ctx,g,C,W,H,P,top,story,fmt,d,photos}=e;
  g.drawPhotos(0,0,W,H,photos,false);
  g.shade(W,H,story?.38:.3);g.brand(P,top);g.chip("Продава се",W-P,top,C.sand,C.ink);
  const fh=g.footer(W,H),tw=W-2*P;let y=H-fh-P;
  const area=cleanArea(d.area);
  const sh=g.stats([["Стаи",String(d.rooms||"").replace(/\s*(стаи|стая)\s*$/i,"")],["Площ",area?area+" м²":""],["Етаж",d.floor]],P,y-140,tw);y-=sh+28;
  if(d.note){ctx.fillStyle=C.sand;ctx.font=`600 30px ${B}`;ctx.fillText("▸ "+d.note,P,y);y-=56;}
  if(d.price){const ps=fmt==="sq"?64:78,bh=Math.round(g.fitFont(d.price,800,D,ps,tw-64,28)*1.85);badge(e,d.price,P,y-bh,tw,ps);y-=bh+30;}
  if(d.place){ctx.fillStyle="rgba(255,255,255,.85)";ctx.font=`500 32px ${B}`;ctx.fillText(d.place,P,y);y-=62;}
  const t=fitLines(e,d.kind||"Апартамент",800,D,70,tw,2,40);ctx.fillStyle=C.white;
  t.lines.forEach((l,j)=>ctx.fillText(l,P,y-6-(t.lines.length-1-j)*t.s*1.18));
}
function drawJob(e){
  const {ctx,g,C,W,H,P,top,fmt,d}=e;
  bg(e,.58);g.topShade(W);g.brand(P,top);
  if(d.place)g.chip(d.place,W-P,top,C.white,C.green);
  const fh=g.footer(W,H),k=fmt==="sq"?.82:fmt==="story"?1.15:1,tw=W-2*P;
  const rTop=top+72+30,rBot=H-fh-P-64;
  const fs=g.fitFont("ТЪРСИМ",800,D,Math.round(170*k),tw,60);
  const pl=fitLines(e,String(d.position||"Позиция").toUpperCase(),800,D,Math.round(86*k),tw,2,36),plh=pl.s*1.15;
  const ps=d.pay?g.fitFont(d.pay,800,D,Math.round(60*k),tw-64,28):0,payH=d.pay?Math.round(ps*1.85):0;
  const conds=lines(d.conditions).slice(0,3);
  const fixed=fs*.86+(pl.lines.length-1)*plh+pl.s*.9+payH;
  const msize=conds.length?marksSize(g,conds,P,tw,rBot-rTop-fixed-4*28,Math.round(40*k),{gap:14}):0;
  const mh=conds.length?g.marks(conds,P,0,tw,{size:msize,gap:14,dry:true}):0;
  const blocks=[
    {h:fs*.86,draw:y=>{ctx.font=`800 ${fs}px ${D}`;ctx.fillStyle=C.sand;ctx.fillText("ТЪРСИМ",P,y+fs*.8);}},
    {h:(pl.lines.length-1)*plh+pl.s*.9,draw:y=>{ctx.font=`800 ${pl.s}px ${D}`;ctx.fillStyle=C.white;pl.lines.forEach((l,i)=>ctx.fillText(l,P,y+pl.s*.85+i*plh));}}];
  if(d.pay)blocks.push({h:payH,draw:y=>badge(e,d.pay,P,y,tw,Math.round(60*k))});
  if(conds.length)blocks.push({h:mh,draw:y=>g.marks(conds,P,y,tw,{size:msize,gap:14})});
  stack(blocks,rTop,rBot,{gapMin:26,gapMax:70});
  ctx.fillStyle=C.sand;ctx.font=`700 30px ${B}`;ctx.fillText("ОБАДЕТЕ СЕ ▼",P,H-fh-28);
}
function drawOffer(e){
  const {ctx,g,C,W,H,P,top,story,fmt,d,photos}=e;
  bg(e,0);if(photos.length)g.shade(W,H,story?.3:.22);else g.topShade(W);
  g.brand(P,top);
  if(d.valid)g.chip(d.valid,W-P,top,C.sand,C.ink);
  const fh=g.footer(W,H),tw=W-2*P;
  const t=fitLines(e,d.service||"Услуга",800,D,fmt==="sq"?64:76,tw,3,40),lh=t.s*1.18;
  const ps=fmt==="sq"?64:78,pfs=d.price?g.fitFont(d.price,800,D,ps,tw-64,28):0,pbh=d.price?Math.round(pfs*1.85):0;
  const inc=lines(d.includes).slice(0,3),msize=fmt==="sq"?30:36,mh=inc.length?g.marks(inc,P,0,tw,{size:msize,dry:true}):0;
  const blocks=[
    {h:30,draw:y=>{ctx.fillStyle=C.sand;ctx.font=`700 26px ${B}`;ctx.fillText("ОФЕРТА",P,y+24);}},
    {h:(t.lines.length-1)*lh+t.s*.9,draw:y=>{ctx.font=`800 ${t.s}px ${D}`;ctx.fillStyle=C.white;t.lines.forEach((l,i)=>ctx.fillText(l,P,y+t.s*.85+i*lh));}}];
  if(d.price)blocks.push({h:pbh,draw:y=>badge(e,d.price,P,y,tw,ps)});
  if(inc.length)blocks.push({h:mh,draw:y=>g.marks(inc,P,y,tw,{size:msize})});
  if(photos.length)stack(blocks,top+110,H-fh-P*.6,{gapMin:30,anchor:"bottom"});
  else stack(blocks,top+72+30,H-fh-P*.8,{gapMin:30,gapMax:64});
}
function drawReview(e){
  const {ctx,g,C,W,H,P,top,fmt,d}=e;
  bg(e,.5);g.topShade(W);g.brand(P,top);
  const fh=g.footer(W,H),tw=W-2*P-80,q=d.quote||"Текст на отзива";
  const rTop=top+72+50,rBot=H-fh-P*.7,rH=rBot-rTop,starsH=76,nameH=96,pad=78+56;
  let s=fmt==="story"?58:54;
  for(;s>30;s-=2){ctx.font=`600 ${s}px ${B}`;if(g.wlines(q,tw,99).length*s*1.38+pad+starsH+24+28+nameH<=rH)break;}
  ctx.font=`600 ${s}px ${B}`;const ql=g.wlines(q,tw,10),lh=s*1.38,cardH=Math.round(ql.length*lh+pad);
  const blockH=starsH+24+cardH+28+nameH;let y=rTop+Math.max(0,(rH-blockH)/2);
  const n=Math.max(1,Math.min(5,Math.round(+d.stars||5)));
  for(let i=0;i<5;i++)g.star(P+40+i*76,y+34,34,i<n);
  y+=starsH+24;
  g.rr(P,y,W-2*P,cardH,28);ctx.fillStyle="rgba(255,255,255,.96)";ctx.fill();
  ctx.fillStyle=C.sand;ctx.font=`800 150px ${D}`;ctx.fillText("“",P+34,y+112);
  ctx.fillStyle=C.ink;ctx.font=`600 ${s}px ${B}`;ql.forEach((l,i)=>ctx.fillText(l,P+40,y+78+s+i*lh-8));
  y+=cardH+28;
  ctx.fillStyle=C.white;ctx.font=`700 38px ${D}`;ctx.fillText(g.wlines(d.client||"Име на клиента",tw,1)[0],P+8,y+40);
  if(d.object){ctx.fillStyle=C.sand;ctx.font=`600 30px ${B}`;ctx.fillText(g.wlines(d.object,tw,1)[0],P+8,y+84);}
}
function drawTip(e){
  const {ctx,g,C,W,H,P,top,fmt,S,A,d}=e;
  bg(e,.72);g.topShade(W);g.brand(P,top);
  const fh=g.footer(W,H),tw=W-2*P,k=fmt==="sq"?.85:fmt==="story"?1.1:1;
  const nm=(S.grishiName||"Гриши");
  const avH=A.grishi?150:0,rTop=top+72+30,rBot=H-fh-P*.6-(avH?avH+24:0);
  const hl=fitLines(e,d.heading||"Знаете ли, че…",800,D,Math.round(70*k),tw,3,40),hlh=hl.s*1.18;
  const pts=lines(d.points).slice(0,4);
  const fixed=60+(hl.lines.length-1)*hlh+hl.s*.9;
  const msize=pts.length?marksSize(g,pts,P,tw,rBot-rTop-fixed-3*30,Math.round(42*k),{numbered:true,gap:20}):0;
  const mh=pts.length?g.marks(pts,P,0,tw,{size:msize,numbered:true,gap:20,dry:true}):0;
  const blocks=[
    {h:60,draw:y=>g.pill("СЪВЕТ ОТ "+nm.toUpperCase(),P,y,C.sand,C.ink,`800 28px ${B}`)},
    {h:(hl.lines.length-1)*hlh+hl.s*.9,draw:y=>{ctx.font=`800 ${hl.s}px ${D}`;ctx.fillStyle=C.white;hl.lines.forEach((l,i)=>ctx.fillText(l,P,y+hl.s*.85+i*hlh));}}];
  if(pts.length)blocks.push({h:mh,draw:y=>g.marks(pts,P,y,tw,{size:msize,numbered:true,gap:20})});
  stack(blocks,rTop,rBot,{gapMin:30,gapMax:64});
  if(A.grishi){const cy=H-fh-P*.6-avH/2;g.avatar(A.grishi,P+64,cy,64);
    ctx.fillStyle=C.white;ctx.font=`700 36px ${D}`;ctx.fillText(nm,P+160,cy-4);
    if(S.grishiRole){ctx.fillStyle="rgba(255,255,255,.85)";ctx.font=`500 28px ${B}`;ctx.fillText(S.grishiRole,P+160,cy+38);}}
}
function drawHoliday(e){
  const {ctx,g,C,W,H,P,top,fmt,d}=e;
  bg(e,.55);g.topShade(W);g.brand(P,top);
  const fh=g.footer(W,H),tw=W-2*P;
  const rTop=top+72+30,rBot=H-fh-P*.6,rH=rBot-rTop;
  const hl=fitLines(e,d.headline||"Честит празник!",800,D,fmt==="sq"?104:128,tw,3,52);
  const gs=fmt==="story"?46:42,glh=gs*1.45;ctx.font=`500 ${gs}px ${B}`;
  const gl=d.greeting?g.wlines(d.greeting,tw-40,fmt==="sq"?5:7):[];
  const hlh=hl.s*1.15,blockH=hl.lines.length*hlh+(gl.length?70+gl.length*glh:0);
  let y=rTop+Math.max(0,(rH-blockH)/2);
  ctx.textAlign="center";ctx.font=`800 ${hl.s}px ${D}`;ctx.fillStyle=C.sand;
  hl.lines.forEach((l,i)=>ctx.fillText(l,W/2,y+hl.s+i*hlh));y+=hl.lines.length*hlh;
  if(gl.length){y+=26;g.rr(W/2-80,y,160,6,3);ctx.fillStyle=C.white;ctx.fill();y+=44;
    ctx.font=`500 ${gs}px ${B}`;ctx.fillStyle="rgba(255,255,255,.96)";gl.forEach((l,i)=>ctx.fillText(l,W/2,y+gs+i*glh));}
  ctx.textAlign="left";
}
function drawVideo(e){
  const {ctx,g,C,W,H,P,top,story,fmt,S,A,d,photos}=e;
  const cov=photos[0]||(A.grishi?{im:A.grishi,zoom:1,x:0,y:0}:null);
  const title=d.vtitle||"Заглавие на клипчето",ep=d.episode?"Епизод "+String(d.episode).replace(/^епизод\s*/i,""):"";
  const play=(cx,cy,r)=>{ctx.beginPath();ctx.arc(cx,cy,r,0,Math.PI*2);ctx.fillStyle=C.sand;ctx.fill();
    ctx.beginPath();ctx.moveTo(cx-r*.28,cy-r*.42);ctx.lineTo(cx+r*.48,cy);ctx.lineTo(cx-r*.28,cy+r*.42);ctx.closePath();ctx.fillStyle=C.ink;ctx.fill();};
  if(fmt==="wide"){
    const pw=Math.round(W*.56),m=52;
    if(cov)g.cover(cov,pw,0,W-pw,H);else{const gr=ctx.createLinearGradient(pw,0,W,H);gr.addColorStop(0,C.green2);gr.addColorStop(1,C.ink);ctx.fillStyle=gr;ctx.fillRect(pw,0,W-pw,H);}
    g.solid(pw,H); // brand-colour panel on the left
    g.brand(m,m-8);let y=m+90;
    if(ep){g.pill(ep.toUpperCase(),m,y,C.sand,C.ink,`800 28px ${B}`);y+=60+26;}
    const t=fitLines(e,title,800,D,84,pw-2*m,4,40);ctx.fillStyle=C.white;
    t.lines.forEach((l,i)=>ctx.fillText(l,m,y+t.s+i*t.s*1.15));
    g.pill("▶ ГЛЕДАЙТЕ",m,H-m-60,C.white,C.green,`800 30px ${B}`);
    play(pw,H/2,64);return;
  }
  const sf=story?SAFE:0,tw=W-2*P;
  const fh=(S.showFooter===false?0:96)+sf;
  const k=fmt==="sq"?.85:1;
  const t=fitLines(e,title,800,D,Math.round(66*k),tw,3,38);
  const tlh=t.s*1.18,ph=Math.round(56+(ep?60+26:0)+t.s+(t.lines.length-1)*tlh+30+60+30+fh),ptop=H-ph;
  if(cov)g.cover(cov,0,0,W,ptop+60);else{const gr=ctx.createLinearGradient(0,0,W,ptop);gr.addColorStop(0,C.green2);gr.addColorStop(1,C.ink);ctx.fillStyle=gr;ctx.fillRect(0,0,W,ptop+60);}
  g.topShade(W);g.brand(P,top);play(W/2,ptop/2+20,story?96:78);
  g.rr(0,ptop,W,ph+10,[44,44,0,0]);ctx.fillStyle=C.green;ctx.fill();g.footer(W,H);
  let y=ptop+44;
  if(ep){g.pill(ep.toUpperCase(),P,y,C.sand,C.ink,`800 28px ${B}`);y+=60+26;}
  ctx.font=`800 ${t.s}px ${D}`;ctx.fillStyle=C.white;t.lines.forEach((l,i)=>ctx.fillText(l,P,y+t.s+i*tlh));
  y+=t.s+(t.lines.length-1)*tlh+30;
  g.pill("▶ ГЛЕДАЙТЕ",P,y,C.white,C.green,`800 30px ${B}`);
}

/* ---------- fields (shared definitions) ---------- */
const F={
  title:{id:"title",obj:true,req:true,short:"име на обекта",label:"Как се казва обектът?",ph:"Къща в с. Зверино",help:"Така го знаете вие. Пише се най-голямо на картинката."},
  place:{id:"place",obj:true,label:"Къде е?",ph:"с. Зверино, общ. Мездра",help:"Село или град."},
  type:{id:"type",obj:true,type:"select",options:TYPES,label:"Какъв е обектът?"},
  status:{id:"status",obj:true,type:"select",options:STATUSES,label:"Докъде е стигнал?",help:"Показва се като малък етикет горе вдясно на картинката."},
  area:{id:"area",obj:true,inputmode:"decimal",label:"Колко квадрата е?",ph:"186",help:"Само числото, в квадратни метра (РЗП — всички етажи заедно)."},
  floors:{id:"floors",obj:true,inputmode:"numeric",label:"Колко етажа?",ph:"2"},
  time:{id:"time",obj:true,label:"За колко време се строи?",ph:"7 месеца"},
  units:{id:"units",obj:true,label:"Колко спални или апартамента?",ph:"4 спални"},
  fact:{id:"fact",obj:true,label:"Нещо, с което се гордеете",ph:"Монолитна стоманобетонна конструкция",help:"Едно кратко изречение за здравината или материалите."},
  desc:{id:"desc",obj:true,type:"textarea",parse:true,label:"Кажете с няколко думи за обекта",
    ph:"Двуетажна къща със 186 кв.м и 4 спални, строим я 7 месеца…",
    help:"Пишете както говорите — или натиснете микрофона на клавиатурата и кажете. После натиснете бутона по-долу и приложението само попълва квадратите, етажите и срока."},
  week:{id:"week",obj:true,label:"Коя седмица е?",ph:"Седмица 9",help:"Или кой ден — както ви е удобно. Показва се горе вдясно."},
  pct:{id:"pct",obj:true,req:true,short:"процент",inputmode:"numeric",label:"Колко процента е готов?",ph:"45",help:"Само числото, без знак за процент."},
  now:{id:"now",obj:true,req:true,short:"какво правите",label:"Какво правите сега?",ph:"Кофраж и армировка на плочата над 1-ви етаж"},
  mat:{id:"mat",obj:true,label:"Материали (по желание)",ph:"38 м³ бетон В25"}
};
const adv=f=>({...f,adv:true}),core=f=>({...f,adv:false});
const OBJ_BASIC=[F.title,F.place];
const OBJ_ADVANCED=[adv(F.type),adv(F.area),adv(F.floors),adv(F.time),adv(F.units),adv(F.fact)];

// everything that is kept with a construction site, for the "My objects" screen
export const OBJECT_FIELDS=[{...F.title,req:false},F.place,F.type,F.status,F.desc,adv(F.area),adv(F.floors),adv(F.time),adv(F.units),adv(F.fact),adv(F.week),adv(F.pct),adv(F.now),adv(F.mat)]
  .map(f=>({...f,req:false}));

const holidayOptions=S=>[...allHolidays(S).map(h=>[h.key,h.name]),[OTHER.key,OTHER.name]];
function holidayPatch(key,S){
  const h=holidayByKey(key)||allHolidays(S).find(x=>x.key===key);
  if(!h)return {headline:"",greeting:""};
  return {headline:h.head,greeting:greeting(h)};
}

export const TEMPLATES=[
  {id:"ad",group:"obj",icon:"📢",name:"Реклама на обект",blurb:"Снимки от обекта, данните и вашите думи. Най-добрият, когато искате да ви се обадят.",
   useObject:true,minPhotos:1,fmts:["post","sq","story"],
   photoHelp:"Качете до 4 снимки от обекта. Първата е най-голямата в колажа.",
   fields:[F.title,F.place,F.desc,F.status,...OBJ_ADVANCED],draw:e=>drawAd(e,"ad")},
  {id:"ba",group:"obj",icon:"🔄",name:"Преди и след",blurb:"Две снимки: как е било и как е сега. Хората обичат да виждат разликата.",
   useObject:true,minPhotos:2,fmts:["post","sq","story"],
   photoHelp:"Качете точно 2 снимки: първата е „ПРЕДИ“, втората е „СЛЕД“. Ако са наобратно, натиснете „По-назад“.",
   fields:[F.title,F.place,{...F.desc,parse:false,label:"Няколко думи (по желание)"},F.status,...OBJ_ADVANCED],draw:e=>drawAd(e,"ba")},
  {id:"obj",group:"obj",icon:"🏗️",name:"Данни за обекта",blurb:"Голяма снимка и четири кутийки: квадрати, етажи, срок, стаи.",
   useObject:true,minPhotos:1,fmts:["post","sq","story"],
   photoHelp:"Качете една хубава снимка — на нея ще се наредят данните.",
   fields:[F.title,F.place,F.status,core(F.type),core(F.area),core(F.floors),core(F.time),core(F.units),core(F.fact)],draw:drawObj},
  {id:"stage",group:"obj",icon:"📊",name:"Как върви строежът",blurb:"Докъде е стигнал строежът тази седмица, с процент. За да ви следят.",
   useObject:true,minPhotos:1,fmts:["post","sq","story"],
   photoHelp:"Качете снимка от обекта днес — най-хубаво е да се вижда какво е ново.",
   fields:[F.title,F.week,F.pct,F.now,adv(F.place),adv(F.mat)],draw:drawStage},
  {id:"sale",group:"obj",icon:"🏷️",name:"Продава се",blurb:"Апартамент или къща за продан: цена, стаи, квадрати.",
   minPhotos:1,fmts:["post","sq","story"],
   photoHelp:"Качете най-хубавата снимка на имота.",
   init:()=>({kind:"Апартамент"}),
   fields:[
     {id:"kind",type:"select",options:["Апартамент","Къща","Магазин","Гараж","Парцел"],label:"Какво се продава?"},
     {id:"price",req:true,short:"цена",label:"Каква е цената?",ph:"89 000 €",help:"Пишете както искате да се вижда — с € или лв."},
     {id:"rooms",label:"Колко стаи?",ph:"3 стаи"},
     {id:"area",inputmode:"decimal",label:"Колко квадрата?",ph:"98",help:"Само числото."},
     {id:"floor",label:"На кой етаж?",ph:"3-ти"},
     {id:"place",label:"Къде е?",ph:"гр. Мездра, център"},
     {id:"note",adv:true,label:"Нещо важно (по желание)",ph:"Акт 16, асансьор, гараж"}],draw:drawSale},
  {id:"grishi",group:"grishi",icon:"💬",name:"Гриши казва",blurb:"Едно ваше изречение върху снимка — като съвет от майстора.",
   useObject:true,minPhotos:1,fmts:["post","sq","story"],
   photoHelp:"Качете снимка от обекта или ваша снимка.",
   fields:[{id:"quote",type:"textarea",req:true,short:"изречението",label:"Какво искате да кажете?",ph:"Хубавата къща започва от основите. Тук не пестим от арматура.",help:"Едно-две изречения, както го казвате на обекта."},
     F.title,adv(F.place)],draw:drawGrishi},
  {id:"tip",group:"grishi",icon:"💡",name:"Съвет от Гриши",blurb:"Три кратки съвета, например как да изберем керемиди.",
   minPhotos:0,fmts:["post","sq","story"],
   photoHelp:"Снимка не е нужна. Ако качите, ще стои приглушена отзад.",
   fields:[{id:"heading",req:true,short:"заглавие",label:"За какво е съветът?",ph:"Три неща преди да започнете къща",help:"Кратко заглавие — като табелка."},
     {id:"points",type:"textarea",req:true,short:"съветите",label:"Самите съвети — по един на ред",ph:"Първо проверете парцела\nВземете виза за проектиране\nПитайте за срока писмено",help:"До 4 реда. Всеки ред е един съвет."}],draw:drawTip},
  {id:"review",group:"grishi",icon:"⭐",name:"Отзив от клиент",blurb:"Какво казва доволен клиент за вас, със звезди.",
   minPhotos:0,fmts:["post","sq","story"],
   photoHelp:"Снимка не е нужна. Ако качите (например на къщата), ще стои приглушена отзад.",
   init:()=>({stars:"5"}),
   fields:[{id:"quote",type:"textarea",req:true,short:"отзива",label:"Какво е казал клиентът?",ph:"Къщата е точно каквато я искахме и се прибра в срок.",help:"Попитайте клиента дали може да го публикувате."},
     {id:"client",req:true,short:"името",label:"Как се казва клиентът?",ph:"Иван Петров",help:"Може и само малкото име."},
     {id:"object",label:"За кой обект? (по желание)",ph:"Къща в с. Зверино"},
     {id:"stars",type:"select",options:[["5","5 звезди"],["4","4 звезди"],["3","3 звезди"]],label:"Колко звезди?"}],draw:drawReview},
  {id:"video",group:"grishi",icon:"🎬",name:"Корица за клип",blurb:"Корица за клипче, което сте заснели. Да се познава от пръв поглед.",
   minPhotos:0,fmts:["wide","story","sq"],defFmt:"wide",
   photoHelp:"Качете кадър от клипа. Ако не качите, ще се ползва вашата снимка от настройките.",
   fields:[{id:"vtitle",req:true,short:"заглавие",label:"Как се казва клипчето?",ph:"Как се излива плоча",help:"Кратко и ясно."},
     {id:"episode",inputmode:"numeric",label:"Кой по ред е? (по желание)",ph:"3",help:"Само числото. Ако е серия от клипчета."}],draw:drawVideo},
  {id:"offer",group:"firma",icon:"💼",name:"Оферта",blurb:"Какво предлагате и на каква цена, със списък какво включва.",
   minPhotos:0,fmts:["post","sq","story"],
   photoHelp:"Снимка не е нужна, но с нея изглежда по-добре.",
   fields:[{id:"service",req:true,short:"услугата",label:"Каква е услугата?",ph:"Груб строеж на къща",help:"Какво предлагате."},
     {id:"price",req:true,short:"цената",label:"Каква е цената?",ph:"от 420 лв/м²",help:"Пишете както искате да се вижда."},
     {id:"includes",type:"textarea",label:"Какво включва — по един ред",ph:"Кофраж и армировка\nБетон и изливане\nПокрив до керемида",help:"До 3 реда."},
     {id:"valid",adv:true,label:"До кога важи? (по желание)",ph:"Валидна до 31 март"}],draw:drawOffer},
  {id:"job",group:"firma",icon:"👷",name:"Търсим работници",blurb:"Търсите майстори или работници? Голямо „ТЪРСИМ“ с позиция и заплата.",
   minPhotos:0,fmts:["post","sq","story"],
   photoHelp:"Снимка не е нужна. Ако качите (например на екипа), ще стои приглушена отзад.",
   fields:[{id:"position",req:true,short:"позицията",label:"Кого търсите?",ph:"Кофражист",help:"Една или две думи."},
     {id:"pay",label:"Колко е заплащането? (по желание)",ph:"до 2500 лв",help:"Хората отговарят много повече, когато се вижда заплата."},
     {id:"conditions",type:"textarea",label:"Условия — по един ред",ph:"Редовно плащане\nРабота в Мездра и региона\nОсигуровки",help:"До 3 реда."},
     {id:"place",label:"Къде е работата?",ph:"Мездра"}],draw:drawJob},
  {id:"holiday",group:"firma",icon:"🎉",name:"Празничен поздрав",blurb:"Поздрав за празник от името на фирмата.",
   minPhotos:0,fmts:["post","sq","story"],
   photoHelp:"Снимка не е нужна. Ако качите, ще стои приглушена отзад.",
   init:S=>{const u=upcoming(S,new Date(),400)[0];const h=u?allHolidays(S).find(x=>x.key===u.key):null;return h?{holiday:h.key,headline:h.head,greeting:greeting(h)}:{holiday:"other",headline:"",greeting:""};},
   fields:[{id:"holiday",type:"select",optionsFn:holidayOptions,affects:["headline","greeting"],onChange:(v,d,S)=>holidayPatch(v,S),label:"Кой е празникът?",help:"Като го изберете, приложението пише поздрава. Можете да го промените."},
     {id:"headline",req:true,short:"поздрава",label:"Голямото заглавие",ph:"Честит празник!"},
     {id:"greeting",type:"textarea",label:"Пожелание",ph:"Здраве и успехи от целия екип.",help:"Две-три изречения."}],draw:drawHoliday}
];
export const tplById=id=>TEMPLATES.find(t=>t.id===id)||null;

// what the "ready" checklist on the last screen checks
export function checklist(t,d,photoCount,S){
  const out=[];
  if(t.minPhotos>0)out.push({ok:photoCount>=t.minPhotos,label:t.minPhotos>1?"снимки":"снимка"});
  t.fields.filter(f=>f.req).forEach(f=>out.push({ok:!!String(d[f.id]??"").trim(),label:f.short||f.label}));
  out.push({ok:!!(S.phone||"").trim(),label:"телефон"});
  return out;
}

/* ---------- render ---------- */
export function renderPost(cv,tplId,data,photos,opts={}){
  const t=tplById(tplId);if(!t)throw new Error("Непознат вид пост: "+tplId);
  const S=opts.S||getSettings(),A=opts.assets||getAssets(),C=opts.C||PALETTES[S.palette]||PALETTES.green;
  const fmt=SIZES[opts.fmt]?opts.fmt:"post",[W,H]=SIZES[fmt];
  cv.width=W;cv.height=H;const ctx=cv.getContext("2d");
  const o={fmt,logo:A.logo,brandName:S.brandName,phone:S.phone,region:S.region,showFooter:S.showFooter!==false};
  const g=painter(ctx,C,o);
  const e={ctx,g,C,W,H,P:fmt==="wide"?52:60,fmt,story:fmt==="story",top:fmt==="story"?120:fmt==="wide"?44:60,S,A,photos:photos||[],d:norm(data)};
  t.draw(e);
}
export {SIZES};
