// Start-up: carry v1 data over, load pictures and fonts, wire the screens, watch for new versions.
import {$,snack} from "./ui.js";
import {migrateV1,meta} from "./state.js";
import {loadAssets} from "./settings.js";
import {register,route,back} from "./nav.js";
import {wizardView,doneView} from "./wizard.js";
import * as V from "./views.js";
import {VERSION} from "./version.js";

register([
  [/^#?\/?$/,V.homeView],
  [/^#\/new\/(\d)$/,wizardView],
  [/^#\/done$/,doneView],
  [/^#\/objects$/,V.objectsView],
  [/^#\/objects\/([^/]+)$/,V.objectView],
  [/^#\/plan$/,V.planView],
  [/^#\/history$/,V.historyView],
  [/^#\/history\/([^/]+)$/,V.historyItemView],
  [/^#\/settings$/,V.settingsHome],
  [/^#\/settings\/([^/]+)$/,V.settingsSection],
  [/^#\/help$/,V.helpView],
  [/^#\/help\/([^/]+)$/,V.guideView],
  [/^#\/welcome\/(\d)$/,V.welcomeView]
]);

const FONTS=["800 40px Unbounded","700 40px Unbounded","600 20px 'Golos Text'","500 20px 'Golos Text'","700 20px 'Golos Text'"];
const fontsReady=()=>Promise.race([
  Promise.all(FONTS.map(f=>document.fonts.load(f,"Абвгдежзийклмнопрстуфхцчшщъьюя abc 0123"))),
  new Promise(r=>setTimeout(r,3000))]).catch(()=>{});

/* ---------- updates: the service worker fetches the new version by itself, we only tell Grishi ---------- */
let reg=null;
function registerWorker(){
  if(!("serviceWorker" in navigator))return;
  const had=!!navigator.serviceWorker.controller;
  navigator.serviceWorker.register("sw.js").then(r=>{reg=r;}).catch(()=>{});
  navigator.serviceWorker.addEventListener("controllerchange",()=>{if(had)$("update").hidden=false;});
}
async function checkUpdate(){
  if(!reg){snack("Обновяването не е налично тук.");return;}
  snack("Проверявам…",2500);
  try{await reg.update();}catch(e){snack("Няма връзка с интернет. Опитайте пак по-късно.");return;}
  await new Promise(r=>setTimeout(r,2500));
  if($("update").hidden)snack("Имате последната версия ("+VERSION+").");
}
V.setUpdateChecker(checkUpdate);

async function start(){
  migrateV1();
  const m=meta.get();
  if(m.fromV1&&!m.onboarded)meta.set({onboarded:true});
  await Promise.all([loadAssets(),fontsReady()]);
  $("back").addEventListener("click",back);
  $("reload").addEventListener("click",()=>location.reload());
  if(!meta.get().onboarded&&(!location.hash||location.hash==="#"||location.hash==="#/"))history.replaceState(null,"","#/welcome/1");
  window.addEventListener("hashchange",route);
  route();
  registerWorker();
}
start();
