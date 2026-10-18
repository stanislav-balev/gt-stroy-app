// End-to-end test: headless Edge/Chrome drives the real app like a user would.
//   node test/e2e.mjs            → checks only
//   GT_OUT=some/dir node test/e2e.mjs   → also saves a PNG of every kind of post and key screens
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {serve,launch,sleep,ok,summary} from './lib.mjs';

const ROOT=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const OUT=process.env.GT_OUT?path.resolve(process.env.GT_OUT):null;if(OUT)fs.mkdirSync(OUT,{recursive:true});
const srv=await serve(ROOT,0),BASE='http://localhost:'+srv.address().port+'/'; // free ports every run, so a leftover browser never interferes
const b=await launch({width:1000,height:1400});
const ev=e=>b.ev(e);
process.on('exit',()=>{try{b.close()}catch(e){}}); // never leave the browser running, even when the test crashes
setTimeout(()=>{console.log('TIMEOUT');process.exit(2)},420000).unref();

const SAMPLE={title:"Къща в с. Зверино",place:"с. Зверино, общ. Мездра",type:"Еднофамилна къща",status:"В строеж",area:"186",floors:"2",time:"7 месеца",units:"4 спални",
  fact:"Монолитна стоманобетонна конструкция",desc:"Двуетажна монолитна къща със 186 кв.м РЗП и 4 спални, изградена за 7 месеца. Хубавата къща започва от основите.",
  week:"Седмица 9",pct:"45",now:"Кофраж и армировка на плочата над 1-ви етаж",mat:"38 м³ бетон В25",quote:"Хубавата къща започва от основите. Тук не пестим от арматура.",
  kind:"Апартамент",price:"89 000 €",rooms:"3 стаи",floor:"3-ти",note:"Акт 16, асансьор, гараж",
  heading:"Три неща преди да започнете къща",points:"Първо проверете парцела\nВземете виза за проектиране\nПитайте за срока писмено",
  client:"Иван Петров",object:"Къща в с. Зверино",stars:"5",vtitle:"Как се излива плоча",episode:"3",
  service:"Груб строеж на къща",includes:"Кофраж и армировка\nБетон и изливане\nПокрив до керемида",valid:"Валидна до 31 март",
  position:"Кофражист",pay:"до 2500 лв",conditions:"Редовно плащане\nРабота в Мездра и региона\nОсигуровки",
  headline:"Честит Димитровден!",greeting:"Честит празник на всички, които носят името Димитър и Димитрина! Поздрав и към колегите строители."};
const LONG={...SAMPLE,title:"Монолитна двуфамилна къща с гараж и лятна кухня в с. Зверино, общ. Мездра, област Враца",
  desc:"Строим от основите до покрива със собствени екипи. Тук не пестим от арматура и бетон, а всеки етаж се приема на място с клиента преди да минем нататък. Много дълго описание за проверка на съкращаването на текста в картинката.",
  quote:"Хубавата къща започва от основите. Тук не пестим от арматура и затова нашите къщи стоят десетилетия, а клиентите ни препоръчват на свои познати и близки.",
  points:"Първо проверете парцела много внимателно, преди да платите каквото и да е на когото и да е\nВземете виза за проектиране от общината\nПитайте за срока писмено и го запишете в договора\nПроверете дали майсторът има застраховка",
  position:"Кофражист-арматурист с опит над пет години",service:"Груб строеж на еднофамилна къща по индивидуален проект",vtitle:"Как точно се излива плоча над първия етаж и какво да внимавате",
  greeting:"Желаем ви здраве, спокойствие и дом, в който да се радвате на всеки ден. Нека новата година ви донесе нови начала, добри строежи и много поводи за радост със семейството и приятелите!"};

const click=sel=>ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)throw new Error("няма "+${JSON.stringify(sel)});e.click();return 1})()`);
const clickText=(sel,txt)=>ev(`(()=>{const e=[...document.querySelectorAll(${JSON.stringify(sel)})].find(x=>x.textContent.includes(${JSON.stringify(txt)}));if(!e)throw new Error("няма "+${JSON.stringify(txt)});e.click();return 1})()`);
const setVal=(sel,val)=>ev(`(()=>{const e=document.querySelector(${JSON.stringify(sel)});if(!e)throw new Error("няма "+${JSON.stringify(sel)});e.value=${JSON.stringify(val)};e.dispatchEvent(new Event(e.tagName==="SELECT"?"change":"input",{bubbles:true}));return 1})()`);
const text=sel=>ev(`(document.querySelector(${JSON.stringify(sel)})||{}).textContent||""`);
const hash=()=>ev('location.hash');
async function goto(h,wait=700){await ev(`location.hash=${JSON.stringify(h)}`);await sleep(wait);}
async function freshStart(){ // clean profile, then load the app
  await b.nav(BASE+'?x='+Date.now(),1200);
  await ev('localStorage.clear();(async()=>{for(const d of await indexedDB.databases())indexedDB.deleteDatabase(d.name)})();1');
  await sleep(300);
}
const MK=`(async()=>{
  const mk=(c1,c2,t)=>new Promise(res=>{const c=document.createElement('canvas');c.width=3000;c.height=2000;const x=c.getContext('2d');const g=x.createLinearGradient(0,0,3000,2000);g.addColorStop(0,c1);g.addColorStop(1,c2);x.fillStyle=g;x.fillRect(0,0,3000,2000);
    x.fillStyle='rgba(255,255,255,.4)';x.fillRect(600,800,1800,1200);x.beginPath();x.moveTo(500,800);x.lineTo(1500,200);x.lineTo(2500,800);x.fill();x.fillStyle='#000';x.font='220px sans-serif';x.fillText(t,200,330);
    c.toBlob(b=>res(new File([b],t+'.png',{type:'image/png'})),'image/png')});
  window.__fs=[await mk('#4a7bb5','#c9d8e8','A'),await mk('#8b6b3d','#e6d3a8','B'),await mk('#5d8a5a','#cfe3c4','C'),await mk('#a05a5a','#f0cfcf','D')];return 4})()`;
const upload=(n,sel='.ph input[type=file]')=>ev(`(()=>{const dt=new DataTransfer();window.__fs.slice(0,${n}).forEach(f=>dt.items.add(f));const i=document.querySelector(${JSON.stringify(sel)});i.files=dt.files;i.dispatchEvent(new Event('change'));return 1})()`);
const wbarDisabled=()=>ev('document.querySelector("#wbar .wbtns .btn:last-child").disabled');
const nextBtn=()=>click('#wbar .wbtns .btn:last-child');
async function newPost(){await click('.bigbtn');await sleep(350);if(await ev('!!document.querySelector(".dlg")'))await clickText('.dlg .btn','Започни нов');await sleep(300);}

/* ============ 1. first run ============ */
await freshStart();
await b.nav(BASE,1800);
ok((await hash())==='#/welcome/1','първо пускане води към приветствието');
ok((await text('#view')).includes('Здравейте'),'приветствие на български');
await clickText('.btn','Започваме');await sleep(400);
ok((await hash())==='#/welcome/2','стъпка 2 на първата настройка');
await setVal('input[placeholder="0893 010109"]','0888 123456');
await clickText('.btn','Напред');await sleep(300);await clickText('.btn','Напред');await sleep(300);
ok((await hash())==='#/welcome/4','стъпка 4');
await setVal('input[placeholder="Гриши"]','Гриши');
await clickText('.btn','Готово');await sleep(900);
ok((await hash())==='#/','след настройката — началото');
ok((await ev('JSON.parse(localStorage.getItem("gt2.settings")).phone'))==='0888 123456','телефонът е запазен в настройките');
ok((await text('#view')).includes('Нов пост'),'началото има „Нов пост“');
ok((await text('#view')).includes('Гриши'),'поздрав с името');

/* ============ 2. every kind of post, every size ============ */
await ev(MK);
const tpls=await ev('import("/js/templates.js").then(m=>m.TEMPLATES.map(t=>({id:t.id,fmts:t.fmts,min:t.minPhotos})))');
ok(tpls.length===12,'12 вида постове ('+tpls.length+')');
for(const t of tpls){
  for(const fmt of t.fmts){
    const r=await ev(`(async()=>{
      const T=await import('/js/templates.js'),P=await import('/js/photos.js'),S=await import('/js/settings.js');
      const ph=[];for(const f of window.__fs.slice(0,${Math.max(t.min,t.id==='ad'?4:t.id==='ba'?2:0)})){const im=await P.readImage(f);ph.push(P.makePhoto(im));}
      const cv=document.createElement('canvas');const SAMPLE=${JSON.stringify(SAMPLE)};
      T.renderPost(cv,${JSON.stringify(t.id)},SAMPLE,ph,{fmt:${JSON.stringify(fmt)}});
      const x=cv.getContext('2d'),d=x.getImageData(0,0,cv.width,cv.height).data;const seen=new Set();for(let i=0;i<d.length;i+=4*997)seen.add((d[i]>>4)+','+(d[i+1]>>4)+','+(d[i+2]>>4));
      return {w:cv.width,h:cv.height,colors:seen.size,png:${OUT?'cv.toDataURL("image/png")':'""'}};})()`);
    ok(r.colors>8&&r.w>=1000,`рисува се: ${t.id} / ${fmt} (${r.w}×${r.h}, ${r.colors} цвята)`);
    if(OUT&&r.png&&(fmt===t.fmts[0]||fmt==='story'))fs.writeFileSync(path.join(OUT,`post-${t.id}-${fmt}.png`),Buffer.from(r.png.split(',')[1],'base64'));
  }
  // long text must never break the drawing
  const bad=await ev(`(async()=>{try{const T=await import('/js/templates.js');const cv=document.createElement('canvas');
    for(const f of ${JSON.stringify(t.fmts)})T.renderPost(cv,${JSON.stringify(t.id)},${JSON.stringify(LONG)},[],{fmt:f});return ""}catch(e){return String(e)}})()`);
  ok(bad==="",`дълъг текст не чупи: ${t.id} ${bad}`);
}
{ // long text pictures, for eyeballing
  if(OUT)for(const id of ['review','tip','holiday','job','offer','video','ad']){
    const png=await ev(`(async()=>{const T=await import('/js/templates.js'),P=await import('/js/photos.js');const ph=[];for(const f of window.__fs.slice(0,${id==='ad'?3:1})){ph.push(P.makePhoto(await P.readImage(f)));}
      const cv=document.createElement('canvas');T.renderPost(cv,${JSON.stringify(id)},${JSON.stringify(LONG)},${id==='review'||id==='holiday'||id==='job'?'ph':'ph'},{fmt:${id==='video'?'"wide"':'"sq"'}});return cv.toDataURL('image/png')})()`);
    fs.writeFileSync(path.join(OUT,`long-${id}.png`),Buffer.from(png.split(',')[1],'base64'));
  }
}

/* ============ 3. the new-post wizard like a user ============ */
await goto('#/');
await click('.bigbtn');await sleep(500);
ok((await hash())==='#/new/1','„Нов пост“ отваря стъпка 1');
ok((await ev('document.querySelectorAll(".pick").length'))===12,'стъпка 1 показва 12 вида');
ok((await ev('[...document.querySelectorAll(".grp")].map(x=>x.textContent).join("|")'))==='За обектите|От Гриши|За фирмата','групи: за обектите / от Гриши / за фирмата');
await clickText('.pick','Реклама на обект');await sleep(500);
ok((await hash())==='#/new/2','избор на вид води към снимките');
ok(await wbarDisabled(),'без снимка „Напред“ е изключено');
ok((await text('#wbar .wneed')).includes('поне 1 снимка'),'казва какво липсва');
await upload(3);await sleep(1200);
ok((await ev('document.querySelectorAll(".th").length'))===3,'3 снимки са качени');
ok(!(await wbarDisabled()),'със снимка „Напред“ работи');
ok((await ev('document.querySelector(".pvs img").src.startsWith("blob:")'))===true,'има преглед на картинката');
await nextBtn();await sleep(500);
ok((await hash())==='#/new/3','стъпка 3');
ok((await ev('[...document.querySelectorAll("[data-field]")].map(x=>x.dataset.field).join(",")'))==='title,place,desc,status,type,area,floors,time,units,fact','рекламата пита само за своите полета');
ok(await wbarDisabled(),'без име „Напред“ е изключено');
ok((await text('#wbar .wneed')).includes('име на обекта'),'казва „име на обекта“');
await setVal('[data-f=title]','Къща в с. Зверино');
await setVal('[data-f=desc]','Двуетажна къща в с. Зверино със 186 кв.м, 4 спални, строим я 7 месеца.');
await clickText('.btn','Попълни квадратите');await sleep(300);
ok((await ev('document.querySelector("[data-f=area]").value'))==='186','бутонът попълва квадратите');
ok((await ev('document.querySelector("[data-f=floors]").value'))==='2','… и етажите');
ok((await ev('document.querySelector("[data-f=time]").value'))==='7 месеца','… и срока');
ok((await ev('document.querySelector("details.adv").open'))===true,'… и отваря „още подробности“');
ok(!(await wbarDisabled()),'с име „Напред“ работи');
await nextBtn();await sleep(700);
ok((await hash())==='#/new/4','стъпка 4');
ok((await ev('JSON.parse(localStorage.getItem("gt2.objects")).length'))===1,'новият обект е създаден сам');
const cap=await ev('document.querySelector("textarea.cap").value');
ok(cap.includes('Къща в с. Зверино')&&cap.includes('0888 123456'),'текстът е готов и съдържа името и телефона');
ok(cap.includes('📐 РЗП: 186 м²'),'данните са в текста');
ok((await ev('[...document.querySelectorAll(".ckc")].every(x=>x.classList.contains("ok"))'))===true,'всичко в чеклиста е ✓');
ok((await text('#wbar .wbtns .btn:last-child'))==='Качи във Facebook','главният бутон: „Качи във Facebook“');
ok((await ev('document.querySelectorAll(".chip").length'))===3,'три размера, без платформи (само Facebook)');
await clickText('.chip','Квадрат');await sleep(500);
ok((await ev('document.querySelector("[aria-pressed=true].chip").textContent'))==='Квадрат','размерът се сменя');
if(OUT){await b.shot(path.join(OUT,'screen-step4.png'));}

// manual text edit survives until the data changes
await setVal('textarea.cap','МОЙ ТЕКСТ');
await click('#wbar .wbtns .btn:first-child');await sleep(500);
ok((await hash())==='#/new/3','„Назад“ връща към стъпка 3');
await setVal('[data-f=place]','с. Зверино');
await nextBtn();await sleep(500);
ok((await ev('document.querySelector("textarea.cap").value')).includes('Къща в с. Зверино'),'след промяна на данните текстът се пише наново');
await clickText('.btn','Друг вариант');await sleep(200);
ok((await ev('document.querySelector("textarea.cap").value'))!==cap,'„Друг вариант“ сменя края на текста');

// hand over: stub the phone's share list and clipboard
await ev(`(()=>{window.__clip="";window.__shared=null;
  Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async t=>{window.__clip=t}}});
  navigator.canShare=()=>true;navigator.share=async d=>{window.__shared={n:d.files.length,type:d.files[0].type,size:d.files[0].size,text:d.text};};return 1})()`);
await nextBtn();await sleep(500);
ok((await ev('!!document.querySelector(".sheet")'))===true,'преди да отвори Facebook, показва стъпките');
ok((await ev('document.querySelectorAll(".sheet .step").length'))===4,'4 стъпки за Facebook');
ok((await text('.sheet')).includes('Над клавиатурата ще се покаже вашият текст'),'казва как се поставя текстът');
if(OUT){await b.shot(path.join(OUT,'screen-steps.png'));}
await click('.sheet .dlg-b .btn:last-child');await sleep(1500);
const sh=await ev('window.__shared');
ok(sh&&sh.n===1&&sh.type==='image/jpeg'&&sh.size>20000,'картинката е изпратена към споделянето ('+(sh&&sh.size)+' байта)');
ok((await ev('window.__clip')).includes('Къща в с. Зверино'),'текстът е копиран в клипборда');
ok((await ev('JSON.parse(localStorage.getItem("gt2.draft")).pending'))===true,'постът е отбелязан „чака потвърждение“');
// back from Facebook
await ev(`(()=>{const set=v=>Object.defineProperty(document,'visibilityState',{configurable:true,get:()=>v});set('hidden');document.dispatchEvent(new Event('visibilitychange'));set('visible');document.dispatchEvent(new Event('visibilitychange'));return 1})()`);
await sleep(500);
ok((await text('.dlg')).includes('Публикувахте ли поста'),'при връщане пита „Публикувахте ли поста?“');
await clickText('.dlg .btn','Да, публикувах');await sleep(1500);
ok((await hash())==='#/done','след „Да“ — екран „Готово“');
const hist=await ev('JSON.parse(localStorage.getItem("gt2.history"))');
ok(hist.length===1&&hist[0].title==='Къща в с. Зверино'&&hist[0].thumb===true,'записан в История с миниатюра');
ok((await ev('import("/js/state.js").then(m=>m.db.get("hist:"+JSON.parse(localStorage.getItem("gt2.history"))[0].id)).then(b=>b&&b.size)'))>1000,'миниатюрата е в хранилището');
ok((await ev('localStorage.getItem("gt2.draft")'))===null,'чернова е изчистена');
await ev('history.back()');await sleep(700);
{const hh=await hash();ok(hh==='#/'||hh==='','„Назад“ след „Готово“ води към началото, не към старата стъпка ('+hh+')');}
await goto('#/history');
ok((await text('#view')).includes('Къща в с. Зверино'),'История показва поста');
await click('.hrow');await sleep(600);
ok((await text('#view')).includes('Колко харесвания'),'детайлът има поле за харесвания');
await setVal('input[inputmode=numeric]','25');
ok((await ev('JSON.parse(localStorage.getItem("gt2.history"))[0].likes'))==='25','харесванията се записват');

/* ============ 3b. Back after "Готово", half-done post is never thrown away silently ============ */
await goto('#/');await click('.bigbtn');await sleep(300);
await clickText('.pick','Търсим работници');await sleep(300);await nextBtn();await sleep(300);
await setVal('[data-f=position]','Зидар');
await goto('#/');
ok((await text('#view')).includes('ЗАПОЧНАТ ПОСТ'),'началото показва „Започнат пост“');
await click('.bigbtn');await sleep(400);
ok((await text('.dlg')).includes('Имате започнат пост'),'„Нов пост“ пита, преди да изхвърли започнатия');
await ev('document.querySelector(".ovl").click()');await sleep(200);
ok((await ev('!!document.querySelector(".dlg")'))===true,'докосване встрани не затваря въпроса');
await clickText('.dlg .btn','Продължи започнатия');await sleep(500);
ok((await hash()).startsWith('#/new/'),'„Продължи започнатия“ връща в поста');
ok((await ev('document.querySelector("[data-f=position]")?.value'))==='Зидар'||(await hash())==='#/new/2','данните на започнатия пост са запазени');
await goto('#/');await click('.bigbtn');await sleep(400);await clickText('.dlg .btn','Започни нов');await sleep(500);
ok((await hash())==='#/new/1','„Започни нов“ започва нов пост');
await goto('#/');await sleep(300);

// leaving the screen (e.g. Android Back) closes an open question instead of leaving it hanging
await goto('#/');await newPost();await clickText('.pick','Съвет от Гриши');await sleep(300);await nextBtn();await sleep(300);
await setVal('[data-f=heading]','Тест за съвет');await setVal('[data-f=points]','Първо\nВторо\nТрето');
await goto('#/');await click('.bigbtn');await sleep(400);
ok((await ev('!!document.querySelector(".dlg")'))===true,'въпросът „имате започнат пост“ е отворен');
await goto('#/plan',500);
ok((await ev('!!document.querySelector(".dlg")'))===false,'при смяна на екрана въпросът се затваря сам');
// the text could not be copied: do not send Grishi to Facebook without it
await goto('#/');await clickText('.btn','Продължи');await sleep(400);
await goto('#/new/4',600);
await ev(`(()=>{window.__shared=null;Object.defineProperty(navigator,'clipboard',{configurable:true,value:{writeText:async()=>{throw new Error('no')}}});return 1})()`);
await nextBtn();await sleep(400);
await click('.sheet .dlg-b .btn:last-child');await sleep(900);
ok((await ev('window.__shared'))===null,'при неуспешно копиране не се отваря споделянето');
ok((await text('#snack')).includes('Текстът не се копира сам'),'казва какво да направи');
await goto('#/');await sleep(300);

/* ============ 4. object reuse: next week only the stage changes ============ */
await goto('#/objects');
ok((await text('#view')).includes('Къща в с. Зверино'),'обектът е в списъка');
await click('a.obj');await sleep(500);
ok((await ev('document.querySelector("[data-f=area]").value'))==='186','обектът пази квадратите');
await clickText('.btn','Направи пост за този обект');await sleep(500);
await clickText('.pick','Как върви строежът');await sleep(400);
await upload(1);await sleep(900);await nextBtn();await sleep(500);
ok((await ev('document.querySelector("[data-f=title]").value'))==='Къща в с. Зверино','втори пост за същия обект е вече с попълнено име');
ok((await ev('document.querySelector("select.sel").value'))!=='','обектът е избран');
ok((await ev('[...document.querySelectorAll("[data-field]")].map(x=>x.dataset.field).join(",")'))==='title,week,pct,now,place,mat','етапът пита само за своите полета');
await setVal('[data-f=week]','Седмица 10');await setVal('[data-f=pct]','52');await setVal('[data-f=now]','Заливане на плочата');
await nextBtn();await sleep(500);
ok((await ev('document.querySelector("textarea.cap").value')).includes('Седмица 10 на обект'),'текстът за етапа е готов');
ok((await ev('JSON.parse(localStorage.getItem("gt2.objects"))[0].pct'))==='52','новият процент е запазен в обекта');
ok((await ev('JSON.parse(localStorage.getItem("gt2.objects")).length'))===1,'без дублиране на обекта');

/* ============ 5. other kinds ask only for their own fields ============ */
async function fieldsOf(tplName,photosN=0){
  await goto('#/');await newPost();await clickText('.pick',tplName);await sleep(300);
  if(photosN)await upload(photosN);await sleep(photosN?800:100);await nextBtn();await sleep(400);
  return ev('[...document.querySelectorAll("[data-field]")].map(x=>x.dataset.field).join(",")');
}
ok((await fieldsOf('Търсим работници'))==='position,pay,conditions,place','„Търсим работници“: позиция, заплата, условия, място');
ok((await fieldsOf('Отзив от клиент'))==='quote,client,object,stars','„Отзив“: текст, име, обект, звезди');
ok((await fieldsOf('Празничен поздрав'))==='holiday,headline,greeting','„Празник“: повод, заглавие, пожелание');
const nearest=await ev('import("/js/holidays.js").then(m=>{const u=m.upcoming({},new Date(),400)[0];return {key:u.key,head:m.holidayByKey(u.key).head}})');
ok((await ev('document.querySelector("[data-f=holiday]").value'))===nearest.key,'най-близкият празник е избран сам ('+nearest.key+')');
ok((await ev('document.querySelector("[data-f=headline]").value'))===nearest.head,'заглавието е попълнено сам („'+nearest.head+'“)');
await setVal('[data-f=holiday]','xmas');
ok((await ev('document.querySelector("[data-f=headline]").value'))==='Весела Коледа!','смяна на празника сменя заглавието');
ok((await fieldsOf('Продава се',1))==='kind,price,rooms,area,floor,place,note','„Продава се“');
ok((await fieldsOf('Съвет от Гриши'))==='heading,points','„Съвет“');
ok((await fieldsOf('Оферта'))==='service,price,includes,valid','„Оферта“');
ok((await fieldsOf('Корица за клип'))==='vtitle,episode','„Корица за клип“');
ok((await fieldsOf('Преди и след',2))==='title,place,desc,status,type,area,floors,time,units,fact','„Преди и след“');

/* ============ 6. settings ============ */
await goto('#/settings');
ok((await ev('document.querySelectorAll(".row-item").length'))===10,'10 раздела в настройките');
await goto('#/settings/firma');
const helps=await ev('[...document.querySelectorAll(".field")].map(f=>!!f.querySelector(".help"))');
ok(helps.length>=9&&helps.every(Boolean),`всяка настройка във „Фирмата“ има обяснение (${helps.length})`);
for(const sec of ['vid','grishi','kade','tekst','kartinki','plan']){
  await goto('#/settings/'+sec,500);
  const hs=await ev('[...document.querySelectorAll(".field")].map(f=>!!f.querySelector(".help"))');
  ok(hs.length>0&&hs.every(Boolean),`всяка настройка в „${sec}“ има обяснение (${hs.length})`);
}
await goto('#/settings/firma');
await setVal('input[placeholder="0893 010109"]','0899 111222');
ok((await ev('JSON.parse(localStorage.getItem("gt2.settings")).phone'))==='0899 111222','смяна на телефона се запазва');
await goto('#/settings/kade');
await ev('document.querySelector("[data-set=p_instagram] input").click()');
await ev('document.querySelector("[data-set=p_google] input").click()');
ok((await ev('JSON.parse(localStorage.getItem("gt2.settings")).p_instagram'))===true,'Instagram се включва');
await goto('#/settings/vid');
await clickText('.pal','Синьо');
ok((await ev('JSON.parse(localStorage.getItem("gt2.settings")).palette'))==='blue','цветовете се сменят');
// logo upload
await upload(1,'[data-set=logo] input[type=file]');await sleep(1200);
ok((await ev('!!document.querySelector("[data-set=logo] .imgprev img")'))===true,'логото е качено и се вижда');
ok((await ev('import("/js/state.js").then(m=>m.db.get("logo")).then(b=>!!b)'))===true,'логото е в хранилището');
// effect in a new post
await goto('#/');await newPost();await clickText('.pick','Данни за обекта');await sleep(300);
await upload(1);await sleep(800);await nextBtn();await sleep(400);
await setVal('[data-f=title]','Тест');await nextBtn();await sleep(800);
ok((await ev('document.querySelectorAll(".chip").length'))===3+3,'с Instagram и Google има чипове за платформи (3 размера + 3 места)');
ok((await ev('document.querySelector("textarea.cap").value')).includes('0899 111222'),'новият телефон е в текста');
await clickText('.chip','Instagram');await sleep(500);
const ig=await ev('document.querySelector("textarea.cap").value');
ok(ig.includes('\n.\n.\n#'),'Instagram текстът има блок с хаштагове');
ok((await text('#wbar .wbtns .btn:last-child'))==='Качи в Instagram','бутонът става „Качи в Instagram“');
await clickText('.chip','Google');await sleep(400);
const gg=await ev('document.querySelector("textarea.cap").value');
ok(!gg.includes('#')&&gg.includes('Обадете се: 0899 111222'),'Google текстът е без хаштагове и с „Обадете се“');
ok((await text('#wbar .wbtns .btn:last-child'))==='Запази за Google','Google е режим „запази“');
await clickText('.chip','Facebook');await sleep(300);

/* ============ 7. plan and holidays ============ */
const plan=await ev(`(async()=>{
  const H=await import('/js/holidays.js'),P=await import('/js/planner.js');
  const east=[2024,2025,2026,2027,2028].map(y=>{const d=H.easterDate(y);return d.getFullYear()+'-'+(d.getMonth()+1)+'-'+d.getDate()});
  const S={days:[2,5],holidays:true};
  localStorage.removeItem('gt2.plan');
  const list=P.ensureSlots(S,new Date(2026,9,18),28);
  return {east,slots:list.map(s=>s.date+':'+s.tpl+(s.holiday?'('+s.holiday+')':'')),count:list.length};})()`);
ok(plan.east.join()==='2024-5-5,2025-4-20,2026-4-12,2027-5-2,2028-4-16','православният Великден е верен за 2024–2028 ('+plan.east.join()+')');
ok(plan.slots.includes('2026-10-26:holiday(dimitrovden)'),'планът слага Димитровден (26 октомври) като празничен поздрав');
ok(plan.slots.filter(s=>!s.includes('holiday')).every(s=>['2026-10-20','2026-10-23','2026-10-27','2026-10-30','2026-11-03','2026-11-06','2026-11-10','2026-11-13'].includes(s.split(':')[0])),'обикновените постове са във вторниците и петъците');
ok(plan.slots.some(s=>s.includes('stage'))&&plan.slots.some(s=>s.includes(':tip')),'въртележката дава различни видове ('+plan.slots.slice(0,4).join(' ')+')');
const ics=await ev(`(async()=>{const P=await import('/js/planner.js');const l=JSON.parse(localStorage.getItem('gt2.plan'));
  const t=P.buildIcs({remindTime:'18:30'},l.slice(0,3),new Date(2026,9,18));return t})()`);
ok(ics.startsWith('BEGIN:VCALENDAR\r\n')&&ics.trimEnd().endsWith('END:VCALENDAR')&&(ics.match(/BEGIN:VEVENT/g)||[]).length===3,'календарният файл е валиден (3 събития)');
ok(ics.includes('DTSTART:20261020T183000')&&ics.includes('TRIGGER:PT0M'),'часът на напомнянето е 18:30');
ok(ics.split('\r\n').every(l=>new TextEncoder().encode(l).length<=75),'редовете в .ics са до 75 байта');
await goto('#/plan');
ok((await ev('document.querySelectorAll(".slot").length'))>=4,'екранът „План“ показва постове');
ok((await text('#view')).includes('Димитровден'),'… и Димитровден');
await clickText('.slot .btn','Направи');await sleep(600);
ok((await hash())==='#/new/2','„Направи“ от плана отваря стъпка 2');

/* ============ 8. back-up, restore, migration ============ */
const exp=await ev(`(async()=>{const m=await import('/js/state.js');const blob=await m.exportAll();const t=await blob.text();const d=JSON.parse(t);
  return {app:d.app,objs:d.objects.length,hist:d.history.length,logo:!!d.images.logo,phone:d.settings.phone,txt:t}})()`);
ok(exp.app==='gt-stroy'&&exp.objs===2&&exp.hist===1&&exp.logo&&exp.phone==='0899 111222','резервното копие съдържа обекти, история, лого и настройки');
await ev(`(async()=>{const m=await import('/js/state.js');await m.clearAll();return 1})()`);
ok((await ev('localStorage.getItem("gt2.settings")'))===null&&(await ev('import("/js/state.js").then(m=>m.db.get("logo")).then(b=>b===undefined)')),'„Изтрий всичко“ изчиства всичко');
const imp=await ev(`(async()=>{const m=await import('/js/state.js');return await m.importAll(${JSON.stringify(exp.txt)})})()`);
ok(imp.objects===2&&imp.history===1,'връщането от копие работи');
ok((await ev('import("/js/state.js").then(m=>m.db.get("logo")).then(b=>!!b)'))===true,'… и логото се връща');
const badImp=await ev(`import('/js/state.js').then(m=>m.importAll('{"x":1}')).then(()=>'прие',e=>e.message)`);
ok(badImp.includes('не е резервно копие'),'чужд файл се отказва с ясно съобщение');
// v1 → v2 migration
await ev(`(async()=>{localStorage.clear();for(const d of await indexedDB.databases())indexedDB.deleteDatabase(d.name);
  localStorage.setItem('gt.objs',JSON.stringify({'Къща Враца':{title:'Къща Враца',place:'гр. Враца',area:'120',status:'Завършен',type:'Жилищна сграда'}}));
  localStorage.setItem('gt.state',JSON.stringify({f:{phone:'0877 000111',company:'Стара Фирма ЕООД',title:'Стар обект',place:'с. Лютиброд',area:'90',tags:'#стар'},tpl:'ad',fmt:'sq'}));return 1})()`);
await b.nav(BASE+'?m='+Date.now(),2200);
ok(!(await hash()).startsWith('#/welcome')&&(await text('#view')).includes('Нов пост'),'потребител от v1 не минава през първата настройка');
const mig=await ev('({objs:JSON.parse(localStorage.getItem("gt2.objects")),set:JSON.parse(localStorage.getItem("gt2.settings"))})');
ok(mig.objs.length===2&&mig.objs.some(o=>o.title==='Къща Враца'&&o.area==='120')&&mig.objs.some(o=>o.title==='Стар обект'),'обектите от v1 са прехвърлени');
ok(mig.set.phone==='0877 000111'&&mig.set.company==='Стара Фирма ЕООД'&&mig.set.tags==='#стар','настройките от v1 са прехвърлени');
ok((await text('#view')).includes('НОВО В ВЕРСИЯ 2'),'показва „Ново във версия 2“');
ok((await ev('localStorage.getItem("gt.objs")'))!==null,'старите данни не са изтрити');

/* ============ 9. help, offline, phone layout ============ */
await goto('#/help');
ok((await ev('document.querySelectorAll(".row-item").length'))===8,'8 ръководства в „Помощ“');
await click('a.row-item');await sleep(500);
ok((await ev('document.querySelectorAll(".gs li").length'))>=4,'ръководството има номерирани стъпки');
const sw=await ev(`navigator.serviceWorker.ready.then(r=>!!r.active)`);ok(sw===true,'service worker е активен');
await sleep(2500);
const cached=await ev('caches.keys().then(async k=>{const c=await caches.open(k.find(x=>x.startsWith("gt-stroy")));return (await c.keys()).map(r=>new URL(r.url).pathname)})');
const need=['/','/index.html','/css/app.css','/js/app.js','/js/views.js','/js/wizard.js','/js/templates.js','/fonts/fonts.css','/fonts/unbounded-cyrillic.woff2'];
ok(need.every(p=>cached.includes(p)),'за работа без интернет са кеширани и страницата, и скриптовете, и шрифтовете ('+cached.length+' файла)');
const files=await ev('fetch("/sw.js").then(r=>r.text())');
const list=[...files.matchAll(/"\.\/([^"]+)"/g)].map(m=>m[1]);
const missing=list.filter(f=>!fs.existsSync(path.join(ROOT,f)));
ok(missing.length===0,'всеки файл от списъка на sw.js съществува '+missing.join());

await b.mobile(true);
await goto('#/',600);
const scr=[['#/','home'],['#/new/1','step1'],['#/objects','objects'],['#/plan','plan'],['#/history','history'],['#/settings','settings'],['#/settings/kade','kade'],['#/help','help']];
for(const [h,name] of scr){
  await goto(h,700);
  const m=await ev(`({sw:document.documentElement.scrollWidth,iw:innerWidth,small:[...document.querySelectorAll("button,.btn,.pick,.row-item,.chip,a.bigbtn,.tabs a")].filter(e=>e.offsetParent&&!e.closest("[hidden]")).filter(e=>{const r=e.getBoundingClientRect();return r.height<44&&r.height>0}).map(e=>e.textContent.trim().slice(0,20)+":"+Math.round(e.getBoundingClientRect().height))})`);
  ok(m.sw<=m.iw,`на телефон няма хоризонтален скрол: ${name} (${m.sw}/${m.iw})`);
  ok(m.small.length===0,`бутоните са поне 44px високи: ${name} ${m.small.join(',')}`);
  if(OUT)await b.shot(path.join(OUT,`phone-${name}.png`));
}
await b.mobile(false);

ok(b.errors.length===0,'няма грешки в конзолата'+(b.errors.length?': '+b.errors.slice(0,5).join(' | '):''));
const failed=summary();
b.close();srv.close();
process.exit(failed?1:0);
