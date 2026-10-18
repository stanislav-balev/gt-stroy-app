// Text for the post, per place it is going to. Every kind of post describes itself once (`PARTS`);
// each platform then lays those parts out its own way (Facebook long, Instagram short with a block of tags, ad plain, …).
import {cleanArea} from "./templates.js";

// mode "share": hand the picture to the app through the phone's share list; "save": no share target, so the picture is saved instead
export const PLATFORMS=[
  {id:"facebook",name:"Facebook",icon:"📘",defFmt:null,mode:"share",action:"Качи във Facebook",where:"във Facebook"},
  {id:"instagram",name:"Instagram",icon:"📸",defFmt:"sq",mode:"share",action:"Качи в Instagram",where:"в Instagram"},
  {id:"tiktok",name:"TikTok",icon:"🎵",defFmt:"story",mode:"share",action:"Качи в TikTok",where:"в TikTok"},
  {id:"youtube",name:"YouTube",icon:"▶️",defFmt:"wide",mode:"save",action:"Запази корицата за YouTube",where:"в YouTube"},
  {id:"viber",name:"Viber",icon:"💬",defFmt:"post",mode:"share",action:"Прати във Viber",where:"във Viber"},
  {id:"google",name:"Google",icon:"📍",defFmt:"sq",mode:"save",action:"Запази за Google",where:"в Google"},
  {id:"ads",name:"Обява",icon:"🏠",defFmt:"sq",mode:"save",action:"Запази за обявата",where:"на сайта за обяви"}
];
export const platformById=id=>PLATFORMS.find(p=>p.id===id)||PLATFORMS[0];

const CTA={
  ad:["Обадете се за оглед и оферта.","Планирате строеж? Пишете ни или се обадете — ще обсъдим вашия проект.","Имате парцел и идея? Обадете се и ще видим какво можем да построим."],
  ba:["Искате такава промяна? Обадете се за оглед и оферта.","Преди и след — работата си личи. Пишете ни за вашия обект.","Имате сграда за обновяване? Обадете се."],
  obj:["Искате и вие такъв дом? Обадете се на Гриши за оглед и оферта.","Искате да видите обекта на живо? Обадете се и уговаряме посещение.","Вашият дом може да е следващият. Обадете се на Гриши."],
  stage:["Следете страницата, за да видите как расте сградата седмица по седмица.","Всяка седмица — нов етап. Следете страницата!","Показваме всеки етап от строежа — следете страницата."],
  grishi:["Имате въпрос за строежа на вашата къща? Пишете ни в коментарите — Гриши отговаря.","Попитайте Гриши в коментарите.","Гриши отговаря в коментарите — пишете ни за вашия строеж."],
  sale:["За оглед и въпроси — обадете се.","Заинтересовани ли сте? Обадете се и уговаряме оглед.","Повече подробности по телефона."],
  tip:["Имате въпрос? Питайте в коментарите.","Запазете си поста — ще ви потрябва.","Споделете с познат, който се кани да строи."],
  review:["Благодарим за доверието! Искате и вие такъв резултат? Обадете се.","Най-хубавата реклама е доволният клиент. Благодарим!","Вашият дом може да е следващият. Обадете се."],
  video:["Гледайте целия клип и пишете какво мислите в коментарите.","Ако ви хареса — споделете го с познат, който строи.","Още клипове от обектите ще има — следете страницата."],
  offer:["Обадете се за точна оферта за вашия обект.","Пишете ни или се обадете — ще пресметнем за вашия проект.","Питайте за оглед и оферта."],
  job:["Обадете се или ни пишете — ще се радваме да се запознаем.","Ако познавате добър майстор — споделете поста.","Звъннете още днес."],
  holiday:["С пожелание за здраве и успехи — екипът на {brand}.","Честит празник от целия екип на {brand}!","Нека празникът е светъл — {brand}."]
};
const BASE_TAGS="#строителство #къщи #новастроителство";

const splitLines=s=>String(s||"").split(/\r?\n/).map(x=>x.replace(/^[\s•\-–*✓]+/,"").trim()).filter(Boolean);
const clip=(s,n)=>s.length<=n?s:s.slice(0,n-1).replace(/\s+\S*$/,"")+"…";

// what each kind of post says: icon, headline, place, paragraphs, facts (emoji, label for Facebook, value, label for plain text)
function parts(tpl,d,S){
  const t=(d.title||"").trim(),pl=(d.place||"").trim(),name=S.grishiName||"Гриши",brand=S.brandName||S.company||"Г.Т. Строй";
  const fact=(e,l,v,pl2)=>v?{e,l,v,pl:pl2??l}:null;
  const objFacts=()=>[
    fact("🏠","",d.type,"Вид"),fact("📐","РЗП",cleanArea(d.area)&&cleanArea(d.area)+" м²","Площ (РЗП)"),fact("🧱","Етажи",d.floors,"Етажи"),
    fact("🚪","",d.units,"Помещения"),fact("⏱️","Срок за изграждане",d.time,"Срок за изграждане"),fact("🔩","",d.fact,"Особености"),
    fact("📌","Статус",d.status,"Статус")].filter(Boolean);
  switch(tpl){
    case "ad":return {icon:"🏗️",head:(S.slogan?S.slogan+" — ":"")+t,loc:pl,body:[d.desc,d.desc&&`— ${name}, ${brand}`].filter(Boolean),facts:objFacts()};
    case "ba":return {icon:"🔄",head:"Преди и след — "+t,loc:pl,body:[d.desc].filter(Boolean),facts:objFacts()};
    case "obj":return {icon:"🏗️",head:t,loc:pl,body:[],facts:objFacts()};
    case "stage":return {icon:"🔨",head:`${d.week||"Нов етап"} на обект „${t}“`,loc:pl,body:[d.now&&`Сега: ${d.now.replace(/[.\s]+$/,"")}.`].filter(Boolean),
      facts:[fact("🚛","",d.mat,"Материали"),fact("📊","Готовност",String(d.pct||"0").replace(/\s*%$/,"")+"%","Готовност")].filter(Boolean)};
    case "grishi":return {icon:"💬",head:`${name} казва:`,loc:"",body:[`„${d.quote||""}“`],facts:[],after:t?`Обект: ${t}${pl?", "+pl:""}`:""};
    case "sale":return {icon:"🏷️",head:`Продава се: ${(d.kind||"имот").toLowerCase()}${pl?" — "+pl:""}`,loc:"",body:[d.note].filter(Boolean),
      facts:[fact("💰","Цена",d.price,"Цена"),fact("🚪","",d.rooms,"Стаи"),fact("📐","Площ",cleanArea(d.area)&&cleanArea(d.area)+" м²","Площ"),fact("🏢","Етаж",d.floor,"Етаж")].filter(Boolean)};
    case "tip":return {icon:"💡",head:d.heading||"Съвет",loc:"",body:[],facts:splitLines(d.points).slice(0,4).map((p,i)=>({e:"👉",l:"",v:p,pl:String(i+1)}))};
    case "review":{const n=Math.max(1,Math.min(5,Math.round(+d.stars||5)));
      return {icon:"⭐",head:"Доволен клиент",loc:"",body:["⭐".repeat(n),`„${d.quote||""}“`,`— ${d.client||""}${d.object?", "+d.object:""}`],facts:[]};}
    case "video":return {icon:"🎬",head:d.vtitle||"Ново видео",loc:"",body:[d.episode&&`Епизод ${String(d.episode).replace(/^епизод\s*/i,"")}`].filter(Boolean),facts:[]};
    case "offer":return {icon:"💼",head:d.service||"Оферта",loc:"",body:[d.price&&`Цена: ${d.price}`,d.valid].filter(Boolean),facts:splitLines(d.includes).slice(0,3).map(p=>({e:"✅",l:"",v:p,pl:"Включва"}))};
    case "job":return {icon:"👷",head:`Търсим ${d.position||"работници"}`,loc:pl,body:[d.pay&&`Заплащане: ${d.pay}`].filter(Boolean),facts:splitLines(d.conditions).slice(0,3).map(p=>({e:"✅",l:"",v:p,pl:"Условия"}))};
    case "holiday":return {icon:"🎉",head:d.headline||"Честит празник!",loc:"",body:[d.greeting].filter(Boolean),facts:[]};
  }
  return {icon:"",head:t,loc:pl,body:[],facts:[]};
}

export function ctaList(tpl,S){
  const mine=splitLines(S.cta);
  const brand=S.brandName||S.company||"Г.Т. Строй";
  return mine.length?mine:(CTA[tpl]||CTA.ad).map(x=>x.replace("{brand}",brand));
}

export function buildCaption({tpl,data:d,settings:S,platform="facebook",variant=0}){
  const p=parts(tpl,d,S),list=ctaList(tpl,S),cta=list[variant%list.length];
  const on=S.emoji!==false,em=x=>on&&x?x+" ":"";
  const tags=(S.tags||"").trim();
  const phone=(S.phone||"").trim(),phones=[phone,(S.phone2||"").trim()].filter(Boolean).join(" · ");
  const fb=f=>`${em(f.e)}${f.l?f.l+": ":""}${f.v}`;
  const plain=f=>/^\d+$/.test(f.pl)?`${f.pl}. ${f.v}`:`${f.pl}: ${f.v}`;
  const paras=a=>a.filter(Boolean).join("\n");
  const headLine=`${em(p.icon)}${p.head}`.trim();
  const locLine=p.loc?`${em("📍")}${p.loc}`:"";
  let s;
  switch(platform){
    case "instagram":{
      const short=p.facts.slice(0,4).map(f=>f.e&&on?`${f.e} ${f.v}`:f.v).join(" · ");
      s=[paras([headLine,locLine]),p.body.length?clip(p.body.join("\n"),260):"",short,cta,phones&&`${em("📞")}${phones}`].filter(Boolean).join("\n\n");
      s+=`\n\n.\n.\n${[tags,BASE_TAGS].filter(Boolean).join(" ")}`;break;}
    case "tiktok":case "youtube":{
      const desc=[p.body[0]&&clip(p.body.join(" "),200),cta,phones&&`${em("📞")}${phones}`].filter(Boolean).join("\n");
      s=[clip(p.head,90),desc,tags.split(/\s+/).slice(0,5).join(" ")].filter(Boolean).join("\n\n");break;}
    case "viber":
      s=[paras([headLine,locLine]),p.body.join("\n"),p.facts.slice(0,5).map(fb).join("\n"),cta,phones&&`${em("📞")}${phones}`].filter(Boolean).join("\n\n");break;
    case "google":{
      const addr=(S.address||"").trim();
      s=[p.head,p.loc,p.body.join("\n"),p.facts.slice(0,6).map(f=>"• "+plain(f)).join("\n"),cta,phones&&`Обадете се: ${phones}`,addr&&`Адрес: ${addr}`].filter(Boolean).join("\n\n");
      s=clip(s,1500);break;}
    case "ads":{
      const addr=(S.address||"").trim(),mail=(S.email||"").trim();
      s=[p.head,p.loc&&`Местоположение: ${p.loc}`,p.facts.map(plain).join("\n"),p.body.join("\n"),
         [phones&&`Телефон за връзка: ${phones}`,mail&&`Имейл: ${mail}`,addr&&`Адрес: ${addr}`].filter(Boolean).join("\n")].filter(Boolean).join("\n\n");break;}
    default:{ // facebook
      const body=p.body.join("\n"),factsTxt=p.facts.map(fb).join("\n");
      s=[paras([headLine,locLine]),body,p.after&&`${em("📍")}${p.after}`,factsTxt,cta].filter(Boolean).join("\n\n");
      const contact=[S.alwaysPhone!==false&&phones&&`${em("📞")}${phones}`,S.email&&S.alwaysPhone!==false?`${em("✉️")}${S.email}`:"",(S.company||"").trim()].filter(Boolean).join("\n");
      if(contact)s+="\n\n"+contact;
      if(tags)s+="\n\n"+tags;
    }
  }
  return s;
}
