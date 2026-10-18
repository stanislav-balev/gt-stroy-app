// Photo manager (from v1): up to 4 photos, reorder, remove, zoom/pan each one. Also used to load the logo and Grishi's photo.
import {el,snack} from "./ui.js";
export const MAXP=4;
export const photos=[];
export let sel=0;

export function makePhoto(im,max=2000){
  const s=Math.min(1,max/Math.max(im.naturalWidth||im.width,im.naturalHeight||im.height)),w=Math.round((im.naturalWidth||im.width)*s),h=Math.round((im.naturalHeight||im.height)*s);
  const c=document.createElement("canvas");c.width=w;c.height=h;c.getContext("2d").drawImage(im,0,0,w,h); // phone photos are huge: keep a 2000px copy
  const t=document.createElement("canvas"),k=160/Math.max(w,h);t.width=Math.max(1,Math.round(w*k));t.height=Math.max(1,Math.round(h*k));t.getContext("2d").drawImage(c,0,0,t.width,t.height);
  return {im:c,th:t.toDataURL("image/jpeg",.7),zoom:1,x:0,y:0};
}
export function readImage(f){return new Promise(res=>{const u=URL.createObjectURL(f),im=new Image();
  im.onload=()=>{URL.revokeObjectURL(u);res(im);};im.onerror=()=>{URL.revokeObjectURL(u);res(null);};im.src=u;});}
export const readPhoto=f=>readImage(f).then(im=>im?makePhoto(im):null);
export function blobToImage(b){return readImage(b);}

let onChange=()=>{},hintFn=()=>"";
export function clearPhotos(){photos.length=0;sel=0;}
export function addFiles(list){
  const fs=[...list].filter(f=>f.type.startsWith("image/"));if(!fs.length)return Promise.resolve();
  const room=MAXP-photos.length;if(room<=0){snack("Най-много 4 снимки — първо махнете някоя.");return Promise.resolve();}
  return Promise.all(fs.slice(0,room).map(readPhoto)).then(a=>{
    a.filter(Boolean).forEach(p=>photos.push(p));
    if(fs.length>room)snack("Най-много 4 снимки — добавих първите "+room+".");
    sel=Math.min(sel,photos.length-1);render();onChange();});
}
function move(d){const j=sel+d;if(j<0||j>=photos.length)return;[photos[sel],photos[j]]=[photos[j],photos[sel]];sel=j;render();onChange();}
let root=null;
function render(){
  if(!root)return;
  const th=root.querySelector(".thumbs");th.innerHTML="";
  photos.forEach((p,i)=>th.append(el("button",{type:"button",class:"th"+(i===sel?" on":""),"aria-label":"Снимка "+(i+1),onclick:()=>{sel=i;render();}},el("img",{alt:"",src:p.th}),el("span",{},String(i+1)))));
  const adj=root.querySelector(".adj");adj.hidden=!photos.length;
  const p=photos[sel];if(p){root.querySelector("[data-k=zoom]").value=p.zoom*100;root.querySelector("[data-k=x]").value=p.x*100;root.querySelector("[data-k=y]").value=p.y*100;}
  root.querySelector(".drop-t").textContent=!photos.length?"Натиснете тук и изберете снимки":photos.length<MAXP?"＋ Добави още снимки ("+photos.length+" от 4)":"Има 4 снимки — това е максимумът";
  root.querySelector(".ph-hint").textContent=photos.length?hintFn():"";
  root.querySelector(".adj-sel").textContent=photos.length>1?"Снимка "+(sel+1)+" от "+photos.length:"";
}
export function mountPhotos(container,opts={}){
  onChange=opts.onChange||(()=>{});hintFn=opts.hint||(()=>"");
  const input=el("input",{type:"file",accept:"image/*",multiple:true,hidden:true,onchange:e=>{addFiles(e.target.files);e.target.value="";}});
  const range=(k,min,max)=>el("input",{type:"range",min,max,value:k==="zoom"?100:0,"data-k":k,oninput:e=>{const p=photos[sel];if(!p)return;
    if(k==="zoom")p.zoom=e.target.value/100;else p[k]=e.target.value/100;onChange();}});
  root=el("div",{class:"ph"},
    el("button",{type:"button",class:"drop",onclick:()=>input.click()},el("span",{class:"drop-i"},"📷"),el("span",{class:"drop-t"},"")),input,
    el("div",{class:"thumbs"}),
    el("p",{class:"hint ph-hint"}),
    el("div",{class:"adj",hidden:true},
      el("div",{class:"adj-sel"}),
      el("label",{},"Увеличение ",el("small",{},"— ако къщата е малка в кадъра"),range("zoom",100,300)),
      el("label",{},"Наляво / надясно",range("x",-100,100)),
      el("label",{},"Нагоре / надолу",range("y",-100,100)),
      el("div",{class:"btns"},
        el("button",{type:"button",class:"btn ghost",onclick:()=>move(-1)},"◀ По-напред"),
        el("button",{type:"button",class:"btn ghost",onclick:()=>move(1)},"По-назад ▶"),
        el("button",{type:"button",class:"btn ghost red",onclick:()=>{if(!photos.length)return;photos.splice(sel,1);sel=Math.max(0,Math.min(sel,photos.length-1));render();onChange();}},"Махни тази"))));
  container.append(root);render();
  return {refresh:render};
}
