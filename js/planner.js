// Weekly plan (what to post and when), history of published posts, and the .ics calendar file.
import {store,K,uid,meta,objects,db} from "./state.js";
import {tplById} from "./templates.js";
import {upcoming,allHolidays} from "./holidays.js";
import {isoDate,parseIso} from "./ui.js";

// Order in which the kinds of post come up; the plan only suggests, Grishi can always pick another.
export const ROTATION=["stage","tip","ba","ad","grishi","review","offer"];

/* ---------- history ---------- */
export const history={
  all:()=>store.get(K.history,[]),
  save(l){store.set(K.history,l)},
  get(id){return this.all().find(h=>h.id===id)||null},
  add(e){const l=this.all();l.unshift(e);if(l.length>200){l.splice(200).forEach(o=>db.del("hist:"+o.id));}this.save(l);return e},
  update(id,p){const l=this.all(),i=l.findIndex(x=>x.id===id);if(i>=0){l[i]={...l[i],...p};this.save(l);}},
  remove(id){this.save(this.all().filter(x=>x.id!==id));db.del("hist:"+id)},
  lastTs(objId){return this.all().filter(h=>h.objId===objId).reduce((m,h)=>Math.max(m,h.ts),0)||0},
  lastAny(){return this.all().reduce((m,h)=>Math.max(m,h.ts),0)||0},
  countSince(ms){const t=Date.now()-ms;return this.all().filter(h=>h.ts>=t).length}
};

/* ---------- plan ---------- */
export const slots={all:()=>store.get(K.plan,[]),save(l){store.set(K.plan,l)}};
const addDays=(d,n)=>{const x=new Date(d);x.setDate(x.getDate()+n);return x;};
const day0=d=>new Date(d.getFullYear(),d.getMonth(),d.getDate());

// Fills in the days in the next `days` days that have no slot yet. Never changes existing slots, so it is safe to call often.
export function ensureSlots(S,from=new Date(),days=28){
  const f=day0(from),fIso=isoDate(f),wd=new Set((S.days||[]).map(Number));
  let list=slots.all().filter(s=>!(s.status==="planned"&&s.date>=fIso&&!s.holiday&&!wd.has(parseIso(s.date).getDay()))); // days no longer chosen
  list=list.filter(s=>s.date>=isoDate(addDays(f,-60)));                                                                      // forget old ones
  const byDate=new Map();list.forEach(s=>{if(!byDate.has(s.date))byDate.set(s.date,[]);byDate.get(s.date).push(s);});
  let idx=meta.get().planIdx||0;
  const all=objects.all(),active=all.filter(o=>o.status==="В строеж"||o.status==="Груб строеж"),pool=active.length?active:all;
  const last=new Map(all.map(o=>[o.id,history.lastTs(o.id)]));
  list.forEach(s=>{if(s.objId)last.set(s.objId,Math.max(last.get(s.objId)||0,parseIso(s.date).getTime()));});
  const pick=dt=>{if(!pool.length)return null;const o=pool.reduce((a,b)=>(last.get(a.id)||0)<=(last.get(b.id)||0)?a:b);last.set(o.id,dt.getTime());return o.id;};
  for(let i=0;i<=days;i++){
    const dt=addDays(f,i),iso=isoDate(dt);
    if(!wd.has(dt.getDay())||byDate.has(iso))continue;
    const tpl=ROTATION[idx%ROTATION.length];idx++;
    const s={id:uid(),date:iso,tpl,objId:tplById(tpl)&&tplById(tpl).useObject?pick(dt):null,status:"planned"};
    list.push(s);byDate.set(iso,[s]);
  }
  if(S.holidays!==false){
    upcoming(S,f,days).forEach(u=>{
      if(list.some(s=>s.holiday===u.key&&s.hy===u.year))return;
      const iso=isoDate(u.slot),ex=(byDate.get(iso)||[]).find(s=>s.status==="planned"&&!s.holiday);
      if(ex){ex.tpl="holiday";ex.holiday=u.key;ex.hy=u.year;ex.objId=null;}
      else{const s={id:uid(),date:iso,tpl:"holiday",holiday:u.key,hy:u.year,objId:null,status:"planned"};list.push(s);byDate.set(iso,[s]);}
    });
  }
  list.sort((a,b)=>a.date<b.date?-1:a.date>b.date?1:0);
  slots.save(list);meta.set({planIdx:idx});
  return list;
}

export function markDone(slotId,dateIso,tpl,histId){
  const l=slots.all();
  let s=slotId&&l.find(x=>x.id===slotId);
  if(!s)s=l.find(x=>x.date===dateIso&&x.status==="planned"&&x.tpl===tpl)||l.find(x=>x.date===dateIso&&x.status==="planned");
  if(s){s.status="done";s.histId=histId;slots.save(l);}
}
export function skipSlot(id){const l=slots.all(),s=l.find(x=>x.id===id);if(s){s.status="skipped";slots.save(l);}}

// what to say on the start screen: today's post, a recent missed one, or the next one
export function suggestion(today=new Date()){
  const iso=isoDate(today),l=slots.all().filter(s=>s.status==="planned");
  const t=l.find(s=>s.date===iso);if(t)return {kind:"today",slot:t};
  const lo=isoDate(addDays(day0(today),-3)),missed=l.filter(s=>s.date<iso&&s.date>=lo).pop();
  if(missed)return {kind:"missed",slot:missed};
  const next=l.find(s=>s.date>iso);
  return next?{kind:"next",slot:next}:null;
}
export function slotStatus(s,today=new Date()){
  if(s.status==="done")return "done";if(s.status==="skipped")return "skipped";
  return s.date<isoDate(today)?"missed":"planned";
}
export function slotTitle(s,S){
  if(s.tpl==="holiday"){const h=allHolidays(S).find(x=>x.key===s.holiday);return h?h.name:"Празничен поздрав";}
  const t=tplById(s.tpl);return t?t.name:s.tpl;
}

/* ---------- calendar file ---------- */
const esc=t=>String(t).replace(/\\/g,"\\\\").replace(/;/g,"\\;").replace(/,/g,"\\,").replace(/\r?\n/g,"\\n");
function fold(line){ // lines longer than 75 bytes are continued on the next line, starting with a space
  const enc=new TextEncoder(),out=[];let cur="",bytes=0,limit=75;
  for(const ch of line){const b=enc.encode(ch).length;if(bytes+b>limit-1&&cur){out.push(cur);cur=" ";bytes=1;limit=75;}cur+=ch;bytes+=b;}
  out.push(cur);return out.join("\r\n");
}
const p2=n=>String(n).padStart(2,"0");
const stamp=d=>d.getUTCFullYear()+p2(d.getUTCMonth()+1)+p2(d.getUTCDate())+"T"+p2(d.getUTCHours())+p2(d.getUTCMinutes())+p2(d.getUTCSeconds())+"Z";
export function buildIcs(S,list,now=new Date()){
  const time=/^\d{2}:\d{2}$/.test(S.remindTime||"")?S.remindTime:"18:00",[hh,mm]=time.split(":").map(Number);
  const L=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//GT Stroy//Posts//BG","CALSCALE:GREGORIAN","METHOD:PUBLISH"];
  list.forEach(s=>{
    const d=parseIso(s.date),end=new Date(d.getFullYear(),d.getMonth(),d.getDate(),hh,mm+30);
    const ymd=x=>x.getFullYear()+p2(x.getMonth()+1)+p2(x.getDate())+"T"+p2(x.getHours())+p2(x.getMinutes())+"00";
    const o=s.objId?objects.get(s.objId):null,name=slotTitle(s,S)+(o&&o.title?" — "+o.title:"");
    L.push("BEGIN:VEVENT","UID:"+s.id+"@gt-stroy","DTSTAMP:"+stamp(now),"DTSTART:"+ymd(new Date(d.getFullYear(),d.getMonth(),d.getDate(),hh,mm)),"DTEND:"+ymd(end),
      "SUMMARY:"+esc("Пост: "+name),"DESCRIPTION:"+esc("Отворете приложението „Г.Т. Строй постове“ и направете поста."),
      "BEGIN:VALARM","TRIGGER:PT0M","ACTION:DISPLAY","DESCRIPTION:"+esc("Време е за пост: "+name),"END:VALARM","END:VEVENT");
  });
  L.push("END:VCALENDAR");
  return L.map(fold).join("\r\n")+"\r\n";
}
