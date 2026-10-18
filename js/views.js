// All screens except the new-post wizard: home, objects, plan, history, settings, help, first-run setup.
import {el,$,snack,dialog,fmtDate,relDays,download,copyText,WD,WDS,isoDate,parseIso,lightbox} from "./ui.js";
import {store,K,objects,uid,db,meta,exportAll,importAll,clearAll} from "./state.js";
import {getSettings,setSetting,SECTIONS,FIELDS,PALETTES,DAY_OPTIONS,saveAsset,removeAsset,getAssets,resetSettingsCache,loadAssets} from "./settings.js";
import {tplById,OBJECT_FIELDS} from "./templates.js";
import {history,slots,ensureSlots,suggestion,slotStatus,slotTitle,skipSlot,buildIcs} from "./planner.js";
import {GUIDES} from "./help.js";
import {buildFields} from "./forms.js";
import {chrome,go,onLeave,back} from "./nav.js";
import {startNew,startFromSlot,startForObject,continueDraft,discardDraft,getWiz,hasDraft,finishPublish,blank,setWiz} from "./wizard.js";
import {clearPhotos} from "./photos.js";
import {VERSION} from "./version.js";

const H2=t=>el("h2",{class:"h2"},t);
const eyebrow=t=>el("small",{class:"eyebrow"},t);
const plural=(n,one,many)=>n+" "+(n===1?one:many);
const kindName=h=>{const t=tplById(h.tpl);return t?t.name:h.tpl;};

/* ---------- home ---------- */
let checkUpdateFn=()=>{};
export const setUpdateChecker=f=>{checkUpdateFn=f;};

export function homeView(v){
  const S=getSettings();chrome({home:true,tab:"home"});
  $("brandtxt").textContent=(S.brandName||"Г.Т. Строй").toUpperCase();
  const hr=new Date().getHours(),gr=hr<11?"Добро утро":hr<18?"Добър ден":"Добър вечер";
  v.append(el("h2",{class:"hello"},`${gr}, ${S.grishiName||"Гриши"}!`),el("p",{class:"date"},fmtDate(new Date())));

  const w=getWiz();
  if(w&&w.pending){
    const t=tplById(w.tpl);
    v.append(el("div",{class:"card alert"},eyebrow("НЕ ЗАБРАВЯЙТЕ"),el("h3",{},"Публикувахте ли последния пост?"),
      el("p",{},(t?t.name:"Постът")+(w.data&&w.data.title?" — "+w.data.title:"")),
      el("div",{class:"btns"},
        el("button",{type:"button",class:"btn",onclick:()=>finishPublish()},"✓ Да, публикувах"),
        el("button",{type:"button",class:"btn ghost",onclick:()=>{w.pending=false;store.set(K.draft,w);homeView.again();}},"Още не"))));
  }

  ensureSlots(S);
  const sg=S.todayBanner!==false?suggestion():null;
  if(sg){
    const sl=sg.slot,o=sl.objId?objects.get(sl.objId):null,nm=slotTitle(sl,S);
    const head=sg.kind==="today"?"ДНЕС Е "+WD[new Date().getDay()].toUpperCase():sg.kind==="missed"?"ПРОПУСНАХТЕ "+WD[parseIso(sl.date).getDay()].toUpperCase():"СЛЕДВАЩИЯТ ПОСТ — "+fmtDate(sl.date).toUpperCase();
    v.append(el("div",{class:"card today"+(sg.kind==="next"?" calm":"")},eyebrow(head),
      el("h3",{},sg.kind==="next"?nm:"Ред е на: "+nm),
      o&&o.title?el("p",{},"Обект: "+o.title):null,
      el("button",{type:"button",class:"btn big block"+(sg.kind==="next"?" ghost":""),onclick:()=>startFromSlot(sl)},sg.kind==="next"?"Направи го вече":"Направи този пост")));
  }

  v.append(el("button",{type:"button",class:"bigbtn",onclick:startNew},el("span",{class:"bi"},"📸"),
    el("span",{class:"bt"},el("b",{},"Нов пост"),el("small",{},"Картинка и текст за Facebook"))));

  if(hasDraft()){
    const t=tplById(w.tpl);
    v.append(el("div",{class:"card"},eyebrow("ЗАПОЧНАТ ПОСТ"),el("h3",{},t.name+(w.data&&w.data.title?" — "+w.data.title:"")),
      el("div",{class:"btns"},
        el("button",{type:"button",class:"btn",onclick:continueDraft},"Продължи"),
        el("button",{type:"button",class:"btn ghost red",onclick:async()=>{if(await dialog({title:"Да изхвърлим ли започнатия пост?",text:"Написаното за него ще се загуби.",ok:"Да, изхвърли",cancel:"Не",danger:true})){discardDraft();homeView.again();}}},"Изхвърли"))));
  }

  const n=objects.all().length;
  v.append(el("a",{class:"bigbtn alt",href:"#/objects"},el("span",{class:"bi"},"🏗️"),
    el("span",{class:"bt"},el("b",{},"Моите обекти"),el("small",{},n?plural(n,"обект","обекта"):"Още нямате обекти"))));

  const last=history.lastAny();
  v.append(el("p",{class:"stat"},"Последен пост: "+relDays(last)+(last?" · за 30 дни: "+plural(history.countSince(30*864e5),"пост","поста"):"")));

  const m=meta.get();
  if(m.fromV1&&m.seenNew!==VERSION)v.append(el("div",{class:"card soft"},eyebrow("НОВО В ВЕРСИЯ 2"),
    el("p",{},"Нови видове постове (отзив, съвет, оферта, търсим работници, празници, продава се), план какво да публикувате и настройки. Обектите ви са прехвърлени."),
    el("button",{type:"button",class:"btn ghost",onclick:()=>{meta.set({seenNew:VERSION});homeView.again();}},"Разбрах")));
  homeView.again=()=>{v.replaceChildren();homeView(v);};
}

/* ---------- objects ---------- */
const stClass=s=>s==="Завършен"?"done":s==="Предстои"?"soon":"go";
export async function objectsView(v){
  chrome({title:"Моите обекти",tab:"objects"});
  v.append(el("p",{class:"lead"},"Обектите са вашите строежи. Те се създават сами, когато правите пост — тук можете да ги прегледате или да добавите нов."),
    el("button",{type:"button",class:"btn big block",onclick:async()=>{
      const name=await dialog({title:"Как се казва обектът?",text:"Например „Къща в с. Зверино“.",input:{placeholder:"Къща в с. Зверино"},ok:"Създай",cancel:"Отказ"});
      if(!name)return;const o=objects.create({title:name});go("#/objects/"+o.id);}},"＋ Нов обект"));
  const list=objects.all();
  if(!list.length){v.append(el("div",{class:"empty"},el("div",{class:"ei"},"🏗️"),el("p",{},"Още няма обекти. Започнете първия пост или натиснете „Нов обект“.")));return;}
  list.forEach(o=>v.append(el("a",{class:"card obj",href:"#/objects/"+o.id},
    el("div",{class:"obj-h"},el("b",{},o.title||"Без име"),el("span",{class:"badge "+stClass(o.status)},o.status||"В строеж")),
    o.place?el("small",{},o.place):null,
    el("small",{class:"muted"},"Последен пост: "+relDays(history.lastTs(o.id))))));
}
export async function objectView(v,id){
  const o=objects.get(id);
  if(!o){go("#/objects");return;}
  chrome({title:o.title||"Обект",back:true,tab:"objects"});
  v.append(el("p",{class:"lead"},"Тук се пазят данните на обекта. Какво промените, се вижда и в следващия пост."));
  const form=buildFields(OBJECT_FIELDS,{get:k=>o[k]??"",set:(k,val)=>{o[k]=val;objects.upsert(o);if(k==="title")$("title").textContent=val||"Обект";}});
  v.append(form.root,
    el("button",{type:"button",class:"btn big block",onclick:()=>startForObject(o.id)},"📸 Направи пост за този обект"),
    el("button",{type:"button",class:"btn ghost block red",onclick:async()=>{
      if(await dialog({title:"Да изтрием ли обекта?",text:"Постовете в Историята остават. Обектът изчезва от списъка.",ok:"Да, изтрий",cancel:"Не",danger:true})){objects.remove(o.id);go("#/objects");}}},"Изтрий обекта"));
}

/* ---------- plan ---------- */
const slotBadge={planned:["Планиран","go"],missed:["Пропуснат","miss"],done:["Публикуван ✓","done"],skipped:["Пропуснат","off"]};
export async function planView(v){
  const S=getSettings();chrome({title:"План",tab:"plan"});
  ensureSlots(S);
  const today=isoDate(new Date()),from=isoDate(new Date(Date.now()-7*864e5));
  const list=slots.all().filter(s=>s.date>=from);
  v.append(el("p",{class:"lead"},"Приложението подрежда какво да публикувате и кога. Натиснете пост, за да го направите."));
  if(!list.length){
    v.append(el("div",{class:"empty"},el("div",{class:"ei"},"📅"),el("p",{},"Няма избрани дни за публикуване."),el("a",{class:"btn",href:"#/settings/plan"},"Избери дни")));
    return;
  }
  list.forEach(s=>{
    const st=slotStatus(s),[bl,bc]=slotBadge[st],d=parseIso(s.date),o=s.objId?objects.get(s.objId):null;
    const act=st==="planned"||st==="missed";
    v.append(el("div",{class:"slot"+(s.date===today?" today":"")+(st==="done"||st==="skipped"?" past":"")},
      el("div",{class:"sd"},el("small",{},WDS[d.getDay()]),el("b",{},String(d.getDate()))),
      el("div",{class:"sb"},el("b",{},slotTitle(s,S)),o&&o.title?el("small",{},o.title):null,el("span",{class:"badge "+bc},bl)),
      act?el("div",{class:"sa"},el("button",{type:"button",class:"btn sm",onclick:()=>startFromSlot(s)},"Направи"),
        st==="missed"?el("button",{type:"button",class:"link",onclick:()=>{skipSlot(s.id);planView.again();}},"Пропусни"):null):null));
  });
  v.append(el("button",{type:"button",class:"btn ghost big block",onclick:async()=>{
      const up=slots.all().filter(s=>s.status==="planned"&&s.date>=today);
      if(!up.length){snack("Няма предстоящи постове за календара.");return;}
      const blob=new Blob([buildIcs(S,up)],{type:"text/calendar"}),file=new File([blob],"gt-stroy-plan.ics",{type:"text/calendar"});
      try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:"План за постове"});return;}}catch(e){if(e&&e.name==="AbortError")return;}
      download(blob,"gt-stroy-plan.ics");snack("Файлът е готов. Отворете го от „Изтегляния“ и изберете „Календар“.",7000);}},"📅 Добави плана в календара на телефона"),
    el("p",{class:"help c"},"В календара ще звънне напомняне в избрания час. Приложението само не може да ви звъни, когато е затворено."),
    el("a",{class:"btn ghost block",href:"#/settings/plan"},"Промени дните и часа"));
  planView.again=()=>{v.replaceChildren();planView(v);};
}

/* ---------- history ---------- */
export async function historyView(v){
  chrome({title:"История",tab:"history"});
  const list=history.all(),urls=[];
  onLeave(()=>urls.forEach(u=>URL.revokeObjectURL(u)));
  if(!list.length){
    v.append(el("div",{class:"empty"},el("div",{class:"ei"},"🕘"),el("p",{},"Още няма публикувани постове. Когато качите пост и натиснете „Да, публикувах“, той се появява тук.")));return;
  }
  const month=history.countSince(30*864e5),best=list.filter(h=>+h.likes>0).sort((a,b)=>b.likes-a.likes)[0];
  v.append(el("div",{class:"card soft"},el("p",{},plural(list.length,"публикуван пост","публикувани поста")+" · за последните 30 дни: "+month),
    best?el("p",{},"👍 Най-харесван: „"+best.title+"“ — "+best.likes):el("small",{class:"help"},"Отваряйте поста и записвайте колко харесвания е събрал — така ще виждате кое върви.")));
  list.forEach(h=>{
    const thumb=h.thumb?el("img",{class:"hth",alt:""}):el("div",{class:"hth none"},"🖼️");
    if(h.thumb)db.get("hist:"+h.id).then(b=>{if(b){const u=URL.createObjectURL(b);urls.push(u);thumb.src=u;}});
    v.append(el("a",{class:"hrow",href:"#/history/"+h.id},thumb,
      el("div",{class:"hb"},el("b",{},h.title),el("small",{},kindName(h)),el("small",{class:"muted"},fmtDate(new Date(h.ts)))),
      +h.likes>0?el("span",{class:"badge go"},"👍 "+h.likes):null));
  });
}
export async function historyItemView(v,id){
  const h=history.get(id);
  if(!h){go("#/history");return;}
  chrome({title:"Публикуван пост",back:true,tab:"history"});
  const urls=[];onLeave(()=>urls.forEach(u=>URL.revokeObjectURL(u)));
  const img=el("img",{class:"pv big",alt:h.title});
  if(h.thumb)db.get("hist:"+h.id).then(b=>{if(b){const u=URL.createObjectURL(b);urls.push(u);img.src=u;img.onclick=()=>lightbox(u);}});
  v.append(h.thumb?el("div",{class:"pvbox"},img):null,
    el("h2",{class:"h2"},h.title),el("p",{class:"muted"},kindName(h)+" · "+fmtDate(new Date(h.ts))));
  const ta=el("textarea",{class:"cap",readonly:true,rows:10});ta.value=h.caption||"";
  const likes=el("input",{type:"text",inputmode:"numeric",placeholder:"например 25",value:h.likes||"",oninput:e=>{history.update(h.id,{likes:e.target.value.replace(/\D/g,"")});}});
  v.append(ta,el("label",{class:"field"},el("span",{class:"lbl"},"Колко харесвания събра?"),likes,el("small",{class:"help"},"По желание. Гледате във Facebook и записвате числото тук — така виждате кои постове вървят най-добре.")),
    el("div",{class:"btns"},
      el("button",{type:"button",class:"btn big",onclick:()=>{
        clearPhotos();setWiz(blank({tpl:h.tpl,objId:h.objId&&objects.get(h.objId)?h.objId:null,data:{...h.data},fmt:h.fmt||null}));go("#/new/2");}},"↻ Използвай пак"),
      el("button",{type:"button",class:"btn ghost big",onclick:async()=>{snack(await copyText(h.caption||"")?"Текстът е копиран.":"Не успях да копирам.");}},"📋 Копирай текста")),
    el("button",{type:"button",class:"btn ghost block red",onclick:async()=>{if(await dialog({title:"Да изтрием ли поста от историята?",text:"Това не го маха от Facebook.",ok:"Да, изтрий",cancel:"Не",danger:true})){history.remove(h.id);go("#/history");}}},"Изтрий от историята"));
}
/* ---------- settings ---------- */
export function settingsHome(v){
  chrome({title:"Настройки",tab:"settings"});
  v.append(el("p",{class:"lead"},"Тук нагласяте приложението. Всичко се запазва само — не е нужно да натискате „Запази“."));
  SECTIONS.forEach(s=>v.append(el("a",{class:"row-item",href:"#/settings/"+s.id},
    el("span",{class:"ri"},s.icon),el("span",{class:"rb"},el("b",{},s.title),el("small",{},s.blurb)),el("span",{class:"pick-go"},"›"))));
}

function setCtl(f){
  const S=getSettings();
  const wrap=(...k)=>el("div",{class:"field","data-set":f.id},...k);
  switch(f.type){
    case "bool":{
      const cb=el("input",{type:"checkbox",role:"switch",checked:!!S[f.id],onchange:e=>setSetting(f.id,e.target.checked)});
      return el("div",{class:"field","data-set":f.id},el("label",{class:"swrow"},el("span",{class:"lbl"},f.label),el("span",{class:"sw"},cb,el("i",{}))),el("small",{class:"help"},f.help));
    }
    case "select":{
      const sel=el("select",{onchange:e=>setSetting(f.id,e.target.value)},f.options.map(([val,l])=>el("option",{value:val},l)));sel.value=S[f.id];
      return wrap(el("span",{class:"lbl"},f.label),sel,el("small",{class:"help"},f.help));
    }
    case "textarea":{
      const t=el("textarea",{rows:4,placeholder:f.ph||"",oninput:e=>setSetting(f.id,e.target.value)});t.value=S[f.id]||"";
      return wrap(el("span",{class:"lbl"},f.label),t,el("small",{class:"help"},f.help));
    }
    case "palette":{
      const box=el("div",{class:"pals"});
      const draw=()=>{box.replaceChildren(...Object.entries(PALETTES).map(([k,p])=>el("button",{type:"button",class:"pal","aria-pressed":getSettings()[f.id]===k,onclick:()=>{setSetting(f.id,k);draw();}},
        el("span",{class:"sw4"},[p.green,p.green2,p.sand,p.ink].map(c=>el("i",{style:"background:"+c}))),el("span",{},p.name))));};
      draw();return wrap(el("span",{class:"lbl"},f.label),box,el("small",{class:"help"},f.help));
    }
    case "image":{
      const a=getAssets(),prev=el("div",{class:"imgprev"}),file=el("input",{type:"file",accept:"image/*",hidden:true});
      const draw=()=>{const c=getAssets()[f.key];prev.replaceChildren();
        if(c){const i=el("img",{alt:""});i.src=c.toDataURL("image/png");prev.append(i);}else prev.append(el("span",{class:"muted"},"Още няма"));
        rm.hidden=!c;};
      const rm=el("button",{type:"button",class:"btn ghost sm red",onclick:async()=>{await removeAsset(f.key);draw();}},"Махни");
      file.onchange=async e=>{const fl=e.target.files[0];if(!fl)return;try{await saveAsset(f.key,fl,{max:f.max,png:f.png});draw();snack("Запазено.");}catch(err){snack(err.message);}e.target.value="";};
      draw();
      return wrap(el("span",{class:"lbl"},f.label),el("div",{class:"imgrow"},prev,el("div",{class:"btns"},el("button",{type:"button",class:"btn ghost sm",onclick:()=>file.click()},"Изберете снимка"),rm)),file,el("small",{class:"help"},f.help));
    }
    case "days":{
      const box=el("div",{class:"chips"});
      const draw=()=>{const cur=new Set((getSettings()[f.id]||[]).map(Number));
        box.replaceChildren(...DAY_OPTIONS.map(([n,l])=>el("button",{type:"button",class:"chip","aria-pressed":cur.has(n),onclick:()=>{cur.has(n)?cur.delete(n):cur.add(n);setSetting(f.id,[...cur].sort());draw();}},l)));};
      draw();return wrap(el("span",{class:"lbl"},f.label),box,el("small",{class:"help"},f.help));
    }
    default:{
      const i=el("input",{type:f.type==="tel"?"tel":f.type==="email"?"email":f.type==="date"?"date":f.type==="time"?"time":"text",placeholder:f.ph||"",autocomplete:"off",oninput:e=>setSetting(f.id,e.target.value)});
      i.value=S[f.id]||"";
      return wrap(el("span",{class:"lbl"},f.label),i,el("small",{class:"help"},f.help));
    }
  }
}

export async function settingsSection(v,id){
  const sec=SECTIONS.find(s=>s.id===id);
  if(!sec){go("#/settings");return;}
  chrome({title:sec.title,back:true,tab:"settings"});
  if(id==="pomosht")return helpList(v);
  if(id==="za")return aboutView(v);
  if(sec.intro)v.append(el("p",{class:"lead"},sec.intro));
  if(id==="danni")return dataView(v);
  FIELDS.filter(f=>f.section===id).forEach(f=>v.append(setCtl(f)));
}

async function dataView(v){
  v.append(
    el("div",{class:"card"},el("h3",{},"Запази копие"),el("p",{class:"help"},"Прави файл с всичко — обекти, настройки, история. Пратете си го на имейла или го запазете в Google Drive."),
      el("button",{type:"button",class:"btn big block",onclick:async()=>{
        const blob=await exportAll(),name="gt-stroy-kopie-"+isoDate(new Date())+".json",file=new File([blob],name,{type:"application/json"});
        try{if(navigator.canShare&&navigator.canShare({files:[file]})){await navigator.share({files:[file],title:"Копие на Г.Т. Строй"});return;}}catch(e){if(e&&e.name==="AbortError")return;}
        download(blob,name);snack("Файлът е запазен в „Изтегляния“.",6000);}},"💾 Запази резервно копие")),
    el("div",{class:"card"},el("h3",{},"Върни от копие"),el("p",{class:"help"},"Избирате файла, който сте запазили. Данните в телефона ще бъдат заменени."),
      (()=>{const f=el("input",{type:"file",accept:".json,application/json",hidden:true,onchange:async e=>{
        const fl=e.target.files[0];e.target.value="";if(!fl)return;
        if(!await dialog({title:"Да върнем ли копието?",text:"Сегашните данни в телефона ще бъдат заменени с тези от файла.",ok:"Да, върни",cancel:"Не"}))return;
        try{const r=await importAll(await fl.text());resetSettingsCache();await loadAssets();snack("Върнато: "+plural(r.objects,"обект","обекта")+", "+plural(r.history,"пост","поста")+".",6000);setTimeout(()=>go("#/"),800);}catch(err){snack(err.message,6000);}}});
        return el("div",{},f,el("button",{type:"button",class:"btn ghost big block",onclick:()=>f.click()},"📂 Върни от файл"));})()),
    el("div",{class:"card"},el("h3",{},"Изтрий всичко"),el("p",{class:"help"},"Връща приложението такова, каквото беше в началото. Няма връщане назад — първо запазете копие."),
      el("button",{type:"button",class:"btn ghost big block red",onclick:async()=>{
        if(!await dialog({title:"Да изтрием ли всичко?",text:"Обектите, историята и настройките ще изчезнат от този телефон.",ok:"Да, продължи",cancel:"Не",danger:true}))return;
        if(!await dialog({title:"Наистина ли?",text:"Това не може да се върне назад.",ok:"Изтрий всичко",cancel:"Не, спри",danger:true}))return;
        await clearAll();resetSettingsCache();await loadAssets();location.hash="#/";location.reload();}},"🗑 Изтрий всичко")));
}

function aboutView(v){
  v.append(el("div",{class:"card"},el("h3",{},"Г.Т. Строй постове"),el("p",{},"Версия "+VERSION),
      el("p",{class:"help"},"Приложението приготвя картинки и текстове за публикации. Работи и без интернет, а когато има връзка, се обновява само."),
      el("button",{type:"button",class:"btn big block",onclick:()=>checkUpdateFn()},"🔄 Провери за нова версия")),
    el("div",{class:"card soft"},eyebrow("КАКВО Е НОВО В ВЕРСИЯ 2"),
      el("p",{},"Пост се прави в 4 прости стъпки. Нови видове постове: отзив, съвет, оферта, търсим работници, празнични поздрави, продава се, корица за клип. План какво да публикувате и кога. Запомня обектите. Настройки с обяснения за всичко.")));
}

/* ---------- help ---------- */
function helpList(v){
  v.append(el("p",{class:"lead"},"Кратки обяснения на прост език. Изберете какво ви интересува."));
  GUIDES.forEach(g=>v.append(el("a",{class:"row-item",href:"#/help/"+g.id},el("span",{class:"ri"},g.icon),el("span",{class:"rb"},el("b",{},g.title)),el("span",{class:"pick-go"},"›"))));
}
export function helpView(v){chrome({title:"Помощ",back:true,tab:"settings"});helpList(v);}
export function guideView(v,id){
  const g=GUIDES.find(x=>x.id===id);
  if(!g){go("#/help");return;}
  chrome({title:g.title,back:true,tab:"settings"});
  g.blocks.forEach(b=>{
    if(b.p)v.append(el("p",{class:"gp"},b.p));
    if(b.h)v.append(el("h3",{class:"gh"},b.h));
    if(b.steps)v.append(el("ol",{class:"gs"},b.steps.map(s=>el("li",{},s))));
    if(b.tip)v.append(el("div",{class:"tip static"},"💡 "+b.tip));
  });
}

/* ---------- first run ---------- */
export function welcomeView(v,n){
  n=+n||1;chrome({title:"",tabs:false});
  const next=()=>go("#/welcome/"+(n+1)),S=getSettings();
  const finish=()=>{meta.set({onboarded:true});go("#/");};
  const skip=el("button",{type:"button",class:"link",onclick:finish},"Пропусни — ще настроя после");
  const field=(label,help,id,ph,type="text")=>{const i=el("input",{type,placeholder:ph,autocomplete:"off",oninput:e=>setSetting(id,e.target.value)});i.value=getSettings()[id]||"";
    return el("label",{class:"field"},el("span",{class:"lbl"},label),i,el("small",{class:"help"},help));};
  v.classList.add("welcome");onLeave(()=>v.classList.remove("welcome"));
  if(n===1)v.append(el("div",{class:"wl"},el("div",{class:"wemoji"},"👋"),el("h1",{},"Здравейте!"),
    el("p",{class:"lead"},"Това приложение приготвя картинка и текст за Facebook страницата на фирмата. Ще ви попитаме няколко неща — отнема две минути."),
    el("button",{type:"button",class:"btn big block",onclick:next},"Започваме"),skip));
  else if(n===2)v.append(el("div",{class:"wl"},el("h2",{class:"h2"},"Как се казва фирмата?"),
    field("Име на фирмата","Така ще пише на картинките горе вляво.","brandName","Г.Т. Строй"),
    field("Телефон за връзка","Пише се на всяка картинка. Клиентите ви звънят на него.","phone","0893 010109","tel"),
    el("button",{type:"button",class:"btn big block",onclick:next},"Напред →"),skip));
  else if(n===3){
    const prev=el("div",{class:"imgprev"}),draw=()=>{const c=getAssets().logo;prev.replaceChildren();if(c){const i=el("img",{alt:""});i.src=c.toDataURL("image/png");prev.append(i);}else prev.append(el("span",{class:"muted"},"Още няма"));};
    const file=el("input",{type:"file",accept:"image/*",hidden:true,onchange:async e=>{const f=e.target.files[0];if(!f)return;try{await saveAsset("logo",f,{max:600,png:true});draw();}catch(err){snack(err.message);}}});
    draw();
    v.append(el("div",{class:"wl"},el("h2",{class:"h2"},"Къде работите?"),
      field("Надпис в долната лента","Кажете с няколко думи какво правите и къде. Стои най-долу на картинките.","region","Къщи и жилищни сгради · Мездра и региона"),
      el("div",{class:"field"},el("span",{class:"lbl"},"Имате ли лого?"),el("small",{class:"help"},"Ако имате лого като картинка, качете го. Ако нямате — няма проблем, ще сложим къщичка."),
        el("div",{class:"imgrow"},prev,el("button",{type:"button",class:"btn ghost sm",onclick:()=>file.click()},"Качи лого")),file),
      el("button",{type:"button",class:"btn big block",onclick:next},"Напред →"),skip));
  }else v.append(el("div",{class:"wl"},el("h2",{class:"h2"},"Как да ви наричаме?"),
    field("Вашето име","Ще ви поздравяваме с него и ще го пишем на картинките „Гриши казва“.","grishiName","Гриши"),
    el("button",{type:"button",class:"btn big block",onclick:finish},"✓ Готово — към началото")));
}
