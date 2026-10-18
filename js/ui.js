// Small DOM helpers, dialogs and date formatting. Everything Grishi reads is in Bulgarian, with big buttons.
export const $=id=>document.getElementById(id);
export const esc=s=>String(s??"").replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));

export function el(tag,attrs={},...kids){
  const e=document.createElement(tag);
  for(const [k,v] of Object.entries(attrs||{})){
    if(k.startsWith("aria-")&&v!=null){e.setAttribute(k,String(v));continue;} // aria-pressed="false" must stay present
    if(v==null||v===false)continue;
    if(k==="class")e.className=v;else if(k==="html")e.innerHTML=v;else if(k.startsWith("on"))e.addEventListener(k.slice(2),v);
    else if(k==="style")e.style.cssText=v;else e.setAttribute(k,v===true?"":v);
  }
  for(const c of kids.flat(Infinity)){if(c==null||c===false)continue;e.append(c.nodeType?c:document.createTextNode(c));}
  return e;
}

let snackT=0;
export function snack(t,ms=3500){
  const s=$("snack");if(!s)return;s.textContent=t;s.hidden=false;clearTimeout(snackT);snackT=setTimeout(()=>s.hidden=true,ms);
}

// Modal with big Bulgarian buttons (window.confirm shows English/locale buttons and tiny text).
export function dialog({title="",text="",ok="Да",cancel="Не",danger=false,input=null,lock=false}){
  return new Promise(res=>{
    const sn=$("snack");if(sn)sn.hidden=true;
    const close=v=>{back.remove();res(v)};
    const inp=input?el("input",{class:"dlg-in",value:input.value||"",placeholder:input.placeholder||"",autocomplete:"off"}):null;
    const back=el("div",{class:"ovl",onclick:e=>{if(!lock&&e.target===back)close(false)}},
      el("div",{class:"dlg",role:"dialog","aria-modal":"true"},
        title&&el("h3",{},title),text&&el("p",{},text),inp,
        el("div",{class:"dlg-b"},
          cancel&&el("button",{class:"btn ghost big",type:"button",onclick:()=>close(false)},cancel),
          el("button",{class:"btn big"+(danger?" red":""),type:"button",onclick:()=>close(inp?inp.value.trim():true)},ok))));
    back.addEventListener("gt-close",()=>close(null)); // dismissed by leaving the screen: neither yes nor no
    document.body.append(back);
    (inp||back.querySelector(".dlg-b .btn:last-child")).focus();
    if(inp)inp.addEventListener("keydown",e=>{if(e.key==="Enter")close(inp.value.trim())});
  });
}

// Bottom sheet that stays on screen (used for the "upload to Facebook" steps).
export function sheet({title="",body=null,buttons=[],onClose=null}){
  const sn=$("snack");if(sn)sn.hidden=true;
  const close=()=>{back.remove();onClose&&onClose()};
  const back=el("div",{class:"ovl sheet-ovl",onclick:e=>{if(e.target===back)close()}},
    el("div",{class:"sheet",role:"dialog"},
      el("div",{class:"sheet-h"},el("h3",{},title),el("button",{class:"x",type:"button","aria-label":"Затвори",onclick:close},"✕")),
      body,
      buttons.length&&el("div",{class:"dlg-b"},...buttons.map(b=>el("button",{class:"btn big"+(b.primary?"":" ghost"),type:"button",onclick:()=>{b.onclick&&b.onclick(close)}},b.label)))));
  back.addEventListener("gt-close",close);
  document.body.append(back);
  return {close,el:back};
}

export function lightbox(src){
  const back=el("div",{class:"lb",onclick:()=>back.remove()},el("img",{src,alt:"Картинката в голям размер"}));
  back.addEventListener("gt-close",()=>back.remove());
  document.body.append(back);
}

export const WD=["неделя","понеделник","вторник","сряда","четвъртък","петък","събота"];
export const WDS=["Нд","Пн","Вт","Ср","Чт","Пт","Сб"];
export const MONTHS=["януари","февруари","март","април","май","юни","юли","август","септември","октомври","ноември","декември"];
export const isoDate=d=>{const x=new Date(d);return x.getFullYear()+"-"+String(x.getMonth()+1).padStart(2,"0")+"-"+String(x.getDate()).padStart(2,"0")};
export const parseIso=s=>{const [y,m,d]=s.split("-").map(Number);return new Date(y,m-1,d)};
export function fmtDate(d,withDay=true){const x=d instanceof Date?d:parseIso(d);return (withDay?WD[x.getDay()]+", ":"")+x.getDate()+" "+MONTHS[x.getMonth()]}
export function relDays(ts){
  if(!ts)return "още няма";
  const n=Math.floor((Date.now()-ts)/864e5);
  if(n<=0)return "днес";if(n===1)return "вчера";if(n<7)return "преди "+n+" дни";
  const w=Math.floor(n/7);if(w<5)return "преди "+w+(w===1?" седмица":" седмици");
  const m=Math.floor(n/30);return "преди "+m+(m===1?" месец":" месеца");
}
export function download(blob,name){
  const u=URL.createObjectURL(blob),a=el("a",{href:u,download:name});document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),4000);
}
export async function copyText(t){try{await navigator.clipboard.writeText(t);return true}catch(e){return false}}
