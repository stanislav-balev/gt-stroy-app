// "New post": four screens (what, photos, details, ready) and handing the result over to Facebook & co.
import {el,$,snack,dialog,sheet,lightbox,isoDate,copyText,download,fmtDate} from "./ui.js";
import {store,K,objects,uid,db,meta} from "./state.js";
import {getSettings,enabledPlatforms} from "./settings.js";
import {TEMPLATES,GROUPS,tplById,FMT_INFO,renderPost,checklist} from "./templates.js";
import {buildCaption,platformById} from "./captions.js";
import {photos,clearPhotos,mountPhotos} from "./photos.js";
import {buildFields} from "./forms.js";
import {uploadSteps} from "./help.js";
import {history,markDone,suggestion,slotTitle,ensureSlots} from "./planner.js";
import {allHolidays,greeting} from "./holidays.js";
import {chrome,go,replace,setWbar} from "./nav.js";

// fields that belong to the construction site (kept with the object, so next week only the stage changes)
export const OBJ_IDS=["title","place","type","status","area","floors","time","units","fact","desc","week","pct","now","mat"];

let wiz=store.get(K.draft,null);
export const getWiz=()=>wiz;
const save=()=>{if(wiz)store.set(K.draft,wiz);else store.del(K.draft);};
export function setWiz(w){wiz=w;save();}
export const blank=(extra={})=>({tpl:null,objId:null,data:{},fmt:null,platform:"facebook",variant:0,caps:{},slotId:null,pending:false,step:1,ts:Date.now(),...extra});

export async function startNew(){
  // never throw away a post that is half done without asking
  if(hasDraft()&&Object.values(wiz.data||{}).some(v=>String(v||"").trim())){
    const cont=await dialog({title:"Имате започнат пост",text:"Искате ли да продължите него, или да започнете нов? Започнатият ще се изхвърли.",ok:"Продължи започнатия",cancel:"Започни нов",lock:true});
    if(cont===null)return; // the question was dismissed by leaving the screen
    if(cont){continueDraft();return;}
  }
  clearPhotos();setWiz(blank());go("#/new/1");
}
export function startFromSlot(slot){
  clearPhotos();const S=getSettings(),t=tplById(slot.tpl);
  const w=blank({tpl:slot.tpl,slotId:slot.id,objId:slot.objId&&objects.get(slot.objId)?slot.objId:null});
  if(w.objId){const o=objects.get(w.objId);OBJ_IDS.forEach(k=>{if(o[k]!=null)w.data[k]=o[k];});}
  if(t&&t.init)Object.assign(w.data,t.init(S));
  if(slot.tpl==="holiday"&&slot.holiday){
    const h=allHolidays(S).find(x=>x.key===slot.holiday);
    if(h)Object.assign(w.data,{holiday:h.key,headline:h.head,greeting:greeting(h)});
  }
  setWiz(w);wiz=w;ensureDefaults(t);save();go("#/new/2");
}
export function startForObject(id){
  clearPhotos();const w=blank({objId:id}),o=objects.get(id);
  if(o)OBJ_IDS.forEach(k=>{if(o[k]!=null)w.data[k]=o[k];});
  setWiz(w);go("#/new/1");
}
export function continueDraft(){go("#/new/"+Math.max(2,Math.min(4,(wiz&&wiz.step)||2)));}
export function discardDraft(){clearPhotos();setWiz(null);}
export const hasDraft=()=>!!(wiz&&wiz.tpl&&!wiz.pending);

/* ---------- data of the post ---------- */
export function getData(){
  const o=wiz.objId?objects.get(wiz.objId):null,d={...wiz.data};
  if(o)OBJ_IDS.forEach(k=>{if(o[k]!=null)d[k]=o[k];});
  return d;
}
function setField(id,val){
  wiz.data[id]=val;
  if(wiz.objId&&OBJ_IDS.includes(id)){const o=objects.get(wiz.objId);if(o){o[id]=val;objects.upsert(o);}}
  wiz.caps={};save(); // the data changed, so the text is written anew
}
function ensureDefaults(t){
  if(!t)return;const S=getSettings();
  t.fields.forEach(f=>{
    if(f.type==="select"&&!wiz.data[f.id]){const o=(f.optionsFn?f.optionsFn(S):f.options)[0];wiz.data[f.id]=Array.isArray(o)?o[0]:o;}
  });
}
function pickObject(id){
  OBJ_IDS.forEach(k=>delete wiz.data[k]);
  wiz.objId=id;
  if(id){const o=objects.get(id);OBJ_IDS.forEach(k=>{if(o[k]!=null)wiz.data[k]=o[k];});}
  ensureDefaults(tplById(wiz.tpl));wiz.caps={};save();
}
function ensureObject(t){ // a new object is created from what was typed, so Grishi never has to "save" anything
  if(!t.useObject||wiz.objId||!String(wiz.data.title||"").trim())return;
  const o={id:uid(),created:Date.now()};
  OBJ_IDS.forEach(k=>{if(wiz.data[k]!=null&&wiz.data[k]!=="")o[k]=wiz.data[k];});
  objects.upsert(o);wiz.objId=o.id;save();
}
export function displayTitle(t,d){
  return d.title||d.vtitle||d.heading||d.headline||d.position||d.service||(d.kind?d.kind+(d.place?" — "+d.place:""):"")||t.name;
}
export function currentFmt(){
  const t=tplById(wiz.tpl),S=getSettings();
  if(wiz.fmt&&t.fmts.includes(wiz.fmt))return wiz.fmt;
  const plat=platformById(wiz.platform);
  if(wiz.platform!=="facebook"&&plat.defFmt&&t.fmts.includes(plat.defFmt))return plat.defFmt;
  if(t.defFmt)return t.defFmt;
  return t.fmts.includes(S.defaultFmt)?S.defaultFmt:t.fmts[0];
}
export function captionFor(platform){
  if(wiz.caps&&wiz.caps[platform]!=null)return wiz.caps[platform];
  return buildCaption({tpl:wiz.tpl,data:getData(),settings:getSettings(),platform,variant:wiz.variant||0});
}

/* ---------- the picture ---------- */
let pvRaf=0,pvSeq=0,pvUrl="";
export function renderNow(){renderPost($("cv"),wiz.tpl,getData(),photos,{fmt:currentFmt()});}
export function preview(){
  cancelAnimationFrame(pvRaf);
  pvRaf=requestAnimationFrame(()=>{
    if(!wiz||!wiz.tpl)return;
    try{renderNow();}catch(e){console.error(e);return;}
    const n=++pvSeq;
    $("cv").toBlob(b=>{
      if(!b||n!==pvSeq)return;
      const u=URL.createObjectURL(b);
      document.querySelectorAll("img[data-pv]").forEach(i=>{i.src=u;});
      if(pvUrl)URL.revokeObjectURL(pvUrl);pvUrl=u;
    },"image/jpeg",.85);
  });
}
export function makeBlob(){renderNow();const q=getSettings().quality==="high"?.95:.9;return new Promise(r=>$("cv").toBlob(r,"image/jpeg",q));}
function thumbBlob(src){
  const w=320,h=Math.round(src.height*w/src.width),c=document.createElement("canvas");c.width=w;c.height=h;
  c.getContext("2d").drawImage(src,0,0,w,h);return new Promise(r=>c.toBlob(r,"image/jpeg",.72));
}
const fname=()=>"gt-stroy-"+(displayTitle(tplById(wiz.tpl),getData())||"post").replace(/[^\p{L}\p{N}]+/gu,"-").toLowerCase().slice(0,40)+".jpg";
const pvImg=(cls="pv")=>{const i=el("img",{class:cls,"data-pv":"",alt:"Така ще изглежда картинката",onclick:()=>pvUrl&&lightbox(pvUrl)});if(pvUrl)i.src=pvUrl;return i;};

/* ---------- screens ---------- */
export function wizardView(v,stepStr){
  if(!wiz)setWiz(blank());
  if(wiz.objId&&!objects.get(wiz.objId))wiz.objId=null;
  const step=Math.max(1,Math.min(4,+stepStr||1));
  if(step>1&&!wiz.tpl){replace("#/");return;} // nothing in progress (e.g. Back after "Готово"): go home
  wiz.step=step;save();
  ({1:step1,2:step2,3:step3,4:step4}[step])(v);
}

function step1(v){
  chrome({title:"Какво ще публикуваме?",back:true,progress:1});
  v.append(el("p",{class:"lead"},"Изберете вида на поста. Не се безпокойте — после можете да се върнете и да смените."));
  GROUPS.forEach(g=>{
    v.append(el("h2",{class:"grp"},g.title));
    TEMPLATES.filter(t=>t.group===g.id).forEach(t=>v.append(
      el("button",{type:"button",class:"pick"+(wiz.tpl===t.id?" on":""),onclick:()=>{
        const changed=wiz.tpl!==t.id;wiz.tpl=t.id;if(changed){wiz.fmt=null;wiz.variant=0;wiz.caps={};}
        Object.entries(t.init?t.init(getSettings()):{}).forEach(([k,val])=>{if(!wiz.data[k])wiz.data[k]=val;});
        ensureDefaults(t);save();go("#/new/2");}},
        el("span",{class:"pick-i"},t.icon),el("span",{class:"pick-b"},el("b",{},t.name),el("small",{},t.blurb)),el("span",{class:"pick-go"},"›"))));
  });
}

function photoHint(t){
  if(t.id==="ad")return "Първата снимка е най-голяма в колажа. Подредбата се сменя с „По-напред / По-назад“.";
  if(t.id==="ba")return "Снимка 1 = ПРЕДИ, снимка 2 = СЛЕД.";
  return photos.length>1?"От тях се използва само първата.":"";
}
function step2(v){
  const t=tplById(wiz.tpl);
  chrome({title:t.minPhotos>0?"Снимки":"Снимки (по желание)",back:true,progress:2});
  v.append(el("p",{class:"lead"},t.photoHelp));
  v.append(el("div",{class:"pvs"},pvImg()));
  const need=()=>photos.length>=t.minPhotos?"":t.minPhotos>1?`Нужни са ${t.minPhotos} снимки`:"Изберете поне 1 снимка";
  const bar=()=>setWbar({need:need(),next:"Напред →",onNext:()=>go("#/new/3")});
  mountPhotos(v,{onChange:()=>{preview();bar();},hint:()=>photoHint(t)});
  bar();preview();
}

function objectPicker(rerender){
  const list=objects.all();
  const sel=el("select",{class:"sel","aria-label":"Обект"},
    el("option",{value:""},list.length?"＋ Нов обект":"＋ Нов обект (запомня се сам)"),
    ...list.map(o=>el("option",{value:o.id},o.title||"Без име")));
  sel.value=wiz.objId&&list.some(o=>o.id===wiz.objId)?wiz.objId:"";
  sel.onchange=async()=>{
    const id=sel.value;
    if(id){
      if(!wiz.objId&&String(wiz.data.title||"").trim()&&!await dialog({title:"Да сменим ли обекта?",text:"Написаното за новия обект ще се изчисти. Ако искате да го запазите, първо натиснете „Напред“.",ok:"Да, смени",cancel:"Не"})){sel.value="";return;}
      pickObject(id);
    }else if(wiz.objId)pickObject(null);
    rerender();preview();
  };
  return el("div",{class:"field"},el("span",{class:"lbl"},"За кой обект е постът?"),sel,
    el("small",{class:"help"},"Изберете обект от списъка — данните му се попълват сами. Или започнете нов: запомня се автоматично."));
}

function step3(v){
  v.replaceChildren();
  const t=tplById(wiz.tpl);
  chrome({title:t.name,back:true,progress:3});
  v.append(el("div",{class:"pvs"},pvImg()));
  if(!meta.get().micTip){
    const tip=el("div",{class:"tip"},el("span",{},"🎤 Не ви се пише? Натиснете микрофона на клавиатурата и кажете."),
      el("button",{type:"button",class:"x","aria-label":"Скрий",onclick:()=>{meta.set({micTip:true});tip.remove();}},"✕"));
    v.append(tip);
  }
  if(t.useObject)v.append(objectPicker(()=>step3(v)));
  const missing=()=>t.fields.filter(f=>f.req&&!String(getData()[f.id]??"").trim()).map(f=>f.short||f.label);
  const bar=()=>{const m=missing();setWbar({need:m.length?"Попълнете: "+m.join(", "):"",next:"Напред →",onNext:()=>{ensureObject(t);go("#/new/4");}});};
  const form=buildFields(t.fields,{get:id=>getData()[id],set:setField,after:()=>{preview();bar();}});
  v.append(form.root);
  bar();preview();
}

const arIcon=f=>{const [w,h]={post:[16,20],sq:[18,18],story:[12,21],wide:[24,14]}[f];return el("i",{class:"ar",style:`width:${w}px;height:${h}px`});};
function step4(v){
  v.replaceChildren();
  const t=tplById(wiz.tpl),S=getSettings(),d=getData();
  const plats=enabledPlatforms().map(platformById);
  if(!plats.some(p=>p.id===wiz.platform))wiz.platform="facebook";
  const plat=platformById(wiz.platform),fmt=currentFmt();
  chrome({title:"Готово!",back:true,progress:4});
  v.append(el("div",{class:"pvbox"},pvImg("pv big"),el("small",{class:"help c"},"Натиснете картинката, за да я видите голяма.")));
  v.append(el("div",{class:"ck"},checklist(t,d,photos.length,S).map(c=>el("span",{class:"ckc "+(c.ok?"ok":"no")},(c.ok?"✓ ":"✗ ")+c.label))));
  if(plats.length>1){
    v.append(el("h2",{class:"h2"},"Къде ще го качите?"),
      el("div",{class:"chips"},plats.map(p=>el("button",{type:"button",class:"chip","aria-pressed":p.id===plat.id,
        onclick:()=>{wiz.platform=p.id;wiz.fmt=null;save();step4(v);preview();}},p.icon+" "+p.name))));
  }
  v.append(el("h2",{class:"h2"},"Размер на картинката"),
    el("div",{class:"chips"},t.fmts.map(f=>el("button",{type:"button",class:"chip","aria-pressed":f===fmt,
      onclick:()=>{wiz.fmt=f;save();step4(v);preview();}},arIcon(f),FMT_INFO[f].name))),
    el("p",{class:"help"},FMT_INFO[fmt].help));
  const ta=el("textarea",{class:"cap",spellcheck:"false",rows:12,"aria-label":"Текст за поста"});
  ta.value=captionFor(plat.id);
  ta.addEventListener("input",()=>{wiz.caps[plat.id]=ta.value;save();});
  v.append(el("h2",{class:"h2"},"Текст за поста"),ta,
    el("div",{class:"btns"},
      el("button",{type:"button",class:"btn ghost",onclick:()=>{wiz.variant=(wiz.variant||0)+1;delete wiz.caps[plat.id];save();ta.value=captionFor(plat.id);snack("Друг вариант на края на текста.");}},"↻ Друг вариант"),
      el("button",{type:"button",class:"btn ghost",onclick:()=>{delete wiz.caps[plat.id];save();ta.value=captionFor(plat.id);snack("Текстът е написан наново от данните.");}},"Нов текст от данните")),
    el("p",{class:"help"},"Можете да поправите текста ръчно. Ако промените данните, текстът се пише наново."));
  v.append(el("div",{class:"btns"},
    el("button",{type:"button",class:"btn ghost",onclick:saveImage},"💾 Запази снимката"),
    el("button",{type:"button",class:"btn ghost",onclick:async()=>{snack(await copyText(ta.value)?"Текстът е копиран.":"Не успях да копирам — маркирайте текста и го копирайте ръчно.");}},"📋 Копирай текста")));
  setWbar({next:plat.action,cls:"go",onNext:publish});
  preview();
}

/* ---------- handing over ---------- */
async function saveImage(){
  const b=await makeBlob();download(b,fname());snack("Картинката е запазена в телефона (папка „Изтегляния“).",5000);
}
async function publish(){
  const plat=platformById(wiz.platform),steps=uploadSteps(plat.id,currentFmt());
  if(meta.get().skipSteps){handOver(plat);return;}
  const skip=el("input",{type:"checkbox"});
  sheet({title:"Как да го качите "+plat.where,
    body:el("div",{class:"steps"},
      ...steps.map((s,i)=>el("div",{class:"step"},el("b",{class:"n"},String(i+1)),el("div",{},el("strong",{},s.t),el("p",{},s.d)))),
      el("label",{class:"chk"},skip,el("span",{},"Следващия път не показвай това"))),
    buttons:[{label:plat.mode==="save"?"Разбрах — запази и копирай":"Разбрах — отвори "+plat.name,primary:true,
      onclick:close=>{if(skip.checked)meta.set({skipSteps:true});close();handOver(plat);}}]});
}
async function handOver(plat){
  const text=captionFor(plat.id),copied=await copyText(text); // the text is copied first: Facebook ignores text sent with a picture
  if(!copied){ // without the text in the clipboard the trip to Facebook is pointless: let Grishi copy it by hand
    const ta=document.querySelector("textarea.cap");if(ta){ta.focus();ta.select();}
    snack("Текстът не се копира сам. Задръжте пръст върху маркирания текст, изберете „Копирай“ и после натиснете бутона пак.",9000);
    return;
  }
  const blob=await makeBlob();
  const file=new File([blob],fname(),{type:"image/jpeg"});
  wiz.pending=true;wiz.pendingPlat=plat.id;save();
  if(plat.mode==="share"&&navigator.canShare&&navigator.canShare({files:[file]})){
    try{await navigator.share({files:[file],text,title:getData().title||tplById(wiz.tpl).name});return;} // coming back to the app asks "did you publish?"
    catch(e){if(e&&e.name==="AbortError"){wiz.pending=false;save();return;}}
  }
  download(blob,fname());
  snack(copied?(plat.mode==="save"?"Картинката е запазена, текстът е копиран.":"Картинката е запазена в телефона, текстът е копиран. Качете я от там."):"Картинката е запазена. Текстът не се копира сам — натиснете „Копирай текста“.",7000);
}

// coming back from the other app: did it get published?
let asking=false,wasHidden=false;
export async function askPublished(){
  if(asking||!wiz||!wiz.pending)return;
  asking=true;
  const plat=platformById(wiz.pendingPlat||wiz.platform);
  const ok=await dialog({title:"Публикувахте ли поста?",text:"Ако сте го качили "+plat.where+", натиснете „Да“ — ще го запишем в Историята.",ok:"Да, публикувах",cancel:"Още не"});
  asking=false;
  if(ok===null)return; // dismissed by leaving the screen: the home screen will ask again
  if(ok)await finishPublish();
  else{wiz.pending=false;save();snack(await copyText(captionFor(plat.id))?"Текстът е копиран пак. Опитайте отново, когато сте готов.":"Опитайте отново, когато сте готов.");}
}
document.addEventListener("visibilitychange",()=>{
  if(!wiz||!wiz.pending)return;
  if(document.visibilityState==="hidden")wasHidden=true;
  else if(wasHidden){wasHidden=false;askPublished();}
});

export async function finishPublish(){
  const t=tplById(wiz.tpl),d=getData(),id=uid(),pl=wiz.pendingPlat||wiz.platform;
  const entry={id,ts:Date.now(),tpl:wiz.tpl,objId:wiz.objId||null,title:displayTitle(t,d),platform:pl,caption:captionFor(pl),data:d,fmt:currentFmt(),likes:"",thumb:false};
  try{
    if(photos.length>=t.minPhotos){renderNow();const b=await thumbBlob($("cv"));if(b&&await db.put("hist:"+id,b)!==null)entry.thumb=true;}
  }catch(e){}
  history.add(entry);markDone(wiz.slotId,isoDate(new Date()),wiz.tpl,id);
  discardDraft();go("#/done");
}

export function doneView(v){
  chrome({title:"Готово",tab:null,tabs:true});
  const S=getSettings();ensureSlots(S);const sg=suggestion();
  v.append(el("div",{class:"done"},
    el("div",{class:"okmark"},"✓"),el("h2",{},"Браво! Постът е готов."),el("p",{class:"lead"},"Записахме го в История, за да знаете какво сте публикували."),
    el("button",{type:"button",class:"btn big block",onclick:startNew},"📸 Нов пост"),
    el("a",{class:"btn ghost big block",href:"#/"},"Към началото")));
  if(sg&&sg.kind!=="today")v.append(el("div",{class:"card soft"},el("small",{class:"eyebrow"},"СЛЕДВАЩИЯТ ПОСТ"),
    el("p",{},fmtDate(sg.slot.date)+" — "+slotTitle(sg.slot,S))));
}
