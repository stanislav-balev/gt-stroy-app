// Settings schema. The settings screens are drawn from this list, so every setting carries its own plain-language
// explanation (`help`) that is always visible under the control. Written for someone who knows building, not phones.
import {store,K,db} from "./state.js";
import {readImage,makePhoto} from "./photos.js";

export const PALETTES={
  green:{name:"Зелено и жълто (както сега)",green:"#2d5a43",green2:"#3d7a5a",sand:"#e8b04a",ink:"#14201a",white:"#ffffff"},
  blue:{name:"Синьо и жълто",green:"#1f4e79",green2:"#2f6fa8",sand:"#f2b632",ink:"#0f1c2b",white:"#ffffff"},
  orange:{name:"Оранжево и тъмно",green:"#b5470f",green2:"#d2601f",sand:"#ffd36b",ink:"#2a1608",white:"#ffffff"},
  dark:{name:"Тъмно и златно",green:"#222426",green2:"#44484d",sand:"#d9b24c",ink:"#0d0d0e",white:"#ffffff"},
  red:{name:"Бордо и жълто",green:"#7d1d24",green2:"#a62b34",sand:"#f0c14b",ink:"#1d0b0b",white:"#ffffff"}
};

export const SECTIONS=[
  {id:"firma",icon:"🏢",title:"Фирмата",blurb:"Името и телефона, които се пишат на всяка картинка.",
   intro:"Тук е това, което клиентите виждат: как се казвате и на кой телефон да ви търсят. Попълнете го веднъж и после не мислите за него."},
  {id:"vid",icon:"🎨",title:"Лого и цветове",blurb:"Как изглеждат всички картинки.",
   intro:"Един и същи цвят и лого на всички картинки правят фирмата позната — както работните дрехи с емблема."},
  {id:"grishi",icon:"👷",title:"Гриши",blurb:"Вашето име и снимка за постовете.",
   intro:"Хората вярват повече на човек, когото виждат. Затова някои картинки са от ваше име."},
  {id:"kade",icon:"📣",title:"Къде публикуваме",blurb:"Facebook и други места, където искате да ви виждат.",
   intro:"Facebook е винаги включен. Тук можете да добавите и други места. Приложението не публикува само — то приготвя картинката и текста, а вие ги качвате, както винаги."},
  {id:"tekst",icon:"✍️",title:"Текстове",blurb:"Хаштагове и изречението накрая на поста.",
   intro:"Как звучат текстовете под картинките."},
  {id:"kartinki",icon:"🖼️",title:"Картинки",blurb:"Размер и какво да има по тях.",
   intro:"Малки неща по външния вид на картинките."},
  {id:"plan",icon:"📅",title:"План и напомняния",blurb:"Колко често публикувате и в кои дни.",
   intro:"За да ви виждат постоянно, е нужно да публикувате редовно. Приложението подрежда какво да публикувате и кога, а вие само натискате."},
  {id:"danni",icon:"💾",title:"Резервно копие",blurb:"Запазете всичко, за да не се изгуби.",
   intro:"Всичко, което сте въвели, стои само в този телефон. Копието е файл, с който можете да върнете всичко."},
  {id:"pomosht",icon:"❓",title:"Помощ",blurb:"Кратки обяснения стъпка по стъпка.",special:true},
  {id:"za",icon:"ℹ️",title:"За приложението",blurb:"Версия и обновяване.",special:true}
];

const DEFAULT_TAGS="#ГТСтрой #строителство #къщи #новастроителство #грубстроеж #Мездра #Враца";
const DAYS=[[1,"Пн"],[2,"Вт"],[3,"Ср"],[4,"Чт"],[5,"Пт"],[6,"Сб"],[0,"Нд"]];

// type: text | tel | email | textarea | bool | select | palette | image | days | date | time
export const FIELDS=[
  {id:"brandName",section:"firma",type:"text",def:"Г.Т. Строй",label:"Име на логото",
   help:"Така се казва фирмата в бялата табелка горе вляво на всяка картинка. Пишете го кратко.",ph:"Г.Т. Строй"},
  {id:"company",section:"firma",type:"text",def:"Г.Т. Строй 2025 ЕООД",label:"Пълно име на фирмата",
   help:"Пише се най-отдолу под текста на поста, като подпис.",ph:"Г.Т. Строй 2025 ЕООД"},
  {id:"phone",section:"firma",type:"tel",def:"0893 010109",label:"Телефон за връзка",
   help:"Този номер се пише на всяка картинка и под всеки текст. Клиентите звънят на него — проверете го внимателно.",ph:"0893 010109"},
  {id:"phone2",section:"firma",type:"tel",def:"",label:"Втори телефон (по желание)",
   help:"Ако имате и втори номер. Пише се само в текста, не на картинката.",ph:"0888 000000"},
  {id:"email",section:"firma",type:"email",def:"",label:"Имейл (по желание)",
   help:"Пише се в текстовете за Google и за обяви.",ph:"office@gtstroy.bg"},
  {id:"region",section:"firma",type:"text",def:"Къщи и жилищни сгради · Мездра и региона",label:"Надпис в долната лента",
   help:"Редът, който стои най-долу на картинките, до телефона. Кажете с няколко думи какво правите и къде.",ph:"Къщи и жилищни сгради · Мездра и региона"},
  {id:"address",section:"firma",type:"text",def:"",label:"Адрес на офиса (по желание)",
   help:"Пише се в някои текстове (за Google и обяви), за да ви намират.",ph:"гр. Мездра, ул. …"},
  {id:"services",section:"firma",type:"text",def:"къщи, малки блокове, ремонти",label:"Какво строите",
   help:"Изброете със запетаи. Влиза в някои текстове, за да се разбира с какво се занимавате.",ph:"къщи, малки блокове, ремонти"},
  {id:"slogan",section:"firma",type:"text",def:"Строим къщи и малки блокове",label:"Рекламен надпис",
   help:"Малкото жълто изречение над заглавието на рекламата за обект.",ph:"Строим къщи и малки блокове"},

  {id:"palette",section:"vid",type:"palette",def:"green",label:"Цветове на картинките",
   help:"Изберете един набор и го пазете. Така хората ви разпознават още щом видят картинката."},
  {id:"logo",section:"vid",type:"image",key:"logo",label:"Лого (по желание)",max:600,png:true,
   help:"Ако имате лого на фирмата като картинка, качете го — ще стои горе вляво вместо къщичката. Най-добре е на бял или прозрачен фон. Ако нямате, оставете както е."},

  {id:"grishiName",section:"grishi",type:"text",def:"Гриши",label:"Как ви викат",
   help:"Името, което се пише на картинките „Гриши казва“ и „Съвет от Гриши“.",ph:"Гриши"},
  {id:"grishiRole",section:"grishi",type:"text",def:"майстор-строител",label:"Какъв сте",
   help:"Пише се под името на някои картинки.",ph:"майстор-строител"},
  {id:"grishiPhoto",section:"grishi",type:"image",key:"grishi",label:"Ваша снимка",max:900,
   help:"Слага се на картинките със съвети и на корицата за клипчета. Хубава снимка, на която ви се вижда лицето."},

  {id:"p_instagram",section:"kade",type:"bool",def:false,label:"Instagram",
   help:"Приложение за снимки. Много хора в България го ползват, особено по-младите. Подходящо за снимки от обекти. Ако го включите, при всеки пост ще получавате и текст, подходящ за него."},
  {id:"p_tiktok",section:"kade",type:"bool",def:false,label:"TikTok",
   help:"Кратки клипчета. Ако ще снимате клипчета от обекта, тук се качват."},
  {id:"p_youtube",section:"kade",type:"bool",def:false,label:"YouTube",
   help:"Видео. За по-дългите клипове. Приложението прави корица за клипа и описание под него."},
  {id:"p_viber",section:"kade",type:"bool",def:false,label:"Viber (групи и общности)",
   help:"Ако имате група с клиенти или познати във Viber, оттам можете да пращате новините. Текстът е без хаштагове."},
  {id:"p_google",section:"kade",type:"bool",def:false,label:"Google (фирмен профил)",
   help:"Когато някой напише в Google „строителна фирма Мездра“, виждате се на картата с адрес и телефон. Там също се пускат новини. Профилът се прави веднъж, безплатно — вижте „Помощ“."},
  {id:"p_ads",section:"kade",type:"bool",def:false,label:"Обяви за имоти (OLX, imot.bg)",
   help:"Когато продавате апартамент или къща — текст за обява със всички данни, без малки картинки."},

  {id:"tags",section:"tekst",type:"textarea",def:DEFAULT_TAGS,label:"Хаштагове",
   help:"Хаштагът е като табела на пътя: #къщи води хората, които търсят къщи, към вашия пост. Слагат се накрая на текста. Разделяйте ги с интервал."},
  {id:"cta",section:"tekst",type:"textarea",def:"",label:"Свое изречение накрая (по желание)",
   help:"Изречението накрая, което кани хората да ви се обадят. Ако оставите празно, приложението ползва готови. Можете да напишете няколко — по едно на ред; бутонът „Друг вариант“ ги сменя.",ph:"Обадете се на Гриши за безплатен оглед."},
  {id:"alwaysPhone",section:"tekst",type:"bool",def:true,label:"Винаги пиши телефона под текста",
   help:"Клиентите най-често искат само да позвънят. Препоръчваме да е включено."},
  {id:"emoji",section:"tekst",type:"bool",def:true,label:"Малки картинки в текста (емоджита)",
   help:"Като 🏠 или 📞 в текста. Правят поста по-весел. Изключете, ако не ги харесвате."},

  {id:"defaultFmt",section:"kartinki",type:"select",def:"post",label:"Размер по подразбиране",
   options:[["post","За поста (4:5)"],["sq","Квадрат"],["story","Сторис (24 часа)"]],
   help:"Колко е голяма картинката. 4:5 е най-голямата, която Facebook показва цяла на телефона — като по-голяма табела. Квадратът е по-малък. Сторис е за снимка, която стои 24 часа."},
  {id:"showStatus",section:"kartinki",type:"bool",def:true,label:"Показвай етикета „В строеж“",
   help:"Малкият етикет горе вдясно — В строеж, Груб строеж, Завършен или Предстои."},
  {id:"showFooter",section:"kartinki",type:"bool",def:true,label:"Показвай долната лента с телефона",
   help:"Лентата най-долу с телефона. Препоръчваме да е включена — така картинката сама казва как да ви намерят."},
  {id:"quality",section:"kartinki",type:"select",def:"normal",label:"Качество на картинката",
   options:[["normal","Нормално"],["high","Високо"]],
   help:"„Високо“ прави картинката по-ясна, но по-голяма — може да се качва по-бавно, ако нямате добър интернет."},

  {id:"days",section:"plan",type:"days",def:[2,5],label:"В кои дни публикуваме",
   help:"Приложението ще ви подсказва какво да публикувате точно в тези дни. Два дена седмично е добре за начало — важно е да е редовно."},
  {id:"todayBanner",section:"plan",type:"bool",def:true,label:"Показвай „Какво да публикувам днес“",
   help:"На началния екран приложението ви казва кой пост е ред да направите."},
  {id:"holidays",section:"plan",type:"bool",def:true,label:"Подсказвай празниците",
   help:"Нова година, Баба Марта, Великден, Гергьовден, Димитровден и други — приложението ви напомня да поздравите."},
  {id:"ownHolidayName",section:"plan",type:"text",def:"",label:"Свой празник — как се казва",
   help:"Например „Рожден ден на фирмата“. Приложението ще ви напомня всяка година.",ph:"Рожден ден на фирмата"},
  {id:"ownHolidayDate",section:"plan",type:"date",def:"",label:"Свой празник — кога е",
   help:"Изберете датата. Повтаря се всяка година."},
  {id:"remindTime",section:"plan",type:"time",def:"18:00",label:"Час на напомнянето в календара",
   help:"Когато добавите плана в календара на телефона, в този час ще звънне напомняне."}
];
export const DAY_OPTIONS=DAYS;
export const DEFAULTS=Object.fromEntries(FIELDS.map(f=>[f.id,f.def]));

let cache=null;
export function getSettings(){
  if(!cache)cache={...DEFAULTS,...store.get(K.settings,{})};
  return cache;
}
export function setSetting(id,val){
  const s=getSettings();s[id]=val;
  const saved=store.get(K.settings,{});saved[id]=val;store.set(K.settings,saved);
}
export function resetSettingsCache(){cache=null;}
export const colors=()=>PALETTES[getSettings().palette]||PALETTES.green;
export function enabledPlatforms(){
  const s=getSettings();
  return ["facebook",...["instagram","tiktok","youtube","viber","google","ads"].filter(p=>s["p_"+p])];
}

/* ---- uploaded pictures (logo, Grishi's photo) live in IndexedDB; the canvas versions are cached for drawing ---- */
const assets={logo:null,grishi:null,ready:false};
export const getAssets=()=>assets;
export async function loadAssets(){
  for(const k of ["logo","grishi"]){
    assets[k]=null;
    try{const b=await db.get(k);if(b){const im=await readImage(b);if(im){const p=makePhoto(im,k==="logo"?600:900);assets[k]=p.im;}}}catch(e){}
  }
  assets.ready=true;return assets;
}
export async function saveAsset(key,file,{max,png}){
  const im=await readImage(file);if(!im)throw new Error("Тази снимка не може да се отвори.");
  const p=makePhoto(im,max),c=p.im;
  const blob=await new Promise(r=>c.toBlob(r,png?"image/png":"image/jpeg",.9));
  const ok=await db.put(key,blob);
  if(ok===null)throw new Error("Снимката не може да се запази в този телефон.");
  await loadAssets();return c;
}
export async function removeAsset(key){await db.del(key);await loadAssets();}
