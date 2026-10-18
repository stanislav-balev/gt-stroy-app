// Builds the input fields of a post (or of an object) from the field definitions in templates.js.
// Only the fields of the chosen kind of post are shown; rarely needed ones are folded under "Още подробности".
import {el,snack} from "./ui.js";
import {getSettings} from "./settings.js";
import {parseDesc,LBL} from "./parse.js";

const optList=(f,S)=>(f.optionsFn?f.optionsFn(S):f.options||[]).map(o=>Array.isArray(o)?o:[o,o]);

function control(f,get,set,S){
  const id=f.id,common={"data-f":id,autocomplete:"off"};
  if(f.type==="select"){
    const opts=optList(f,S),cur=get(id);
    const sel=el("select",{...common,onchange:e=>set(id,e.target.value,true)},opts.map(([v,l])=>el("option",{value:v},l)));
    sel.value=opts.some(([v])=>v===cur)?cur:opts[0]?opts[0][0]:"";
    return sel;
  }
  const attrs={...common,placeholder:f.ph||"",enterkeyhint:f.type==="textarea"?"enter":"next",oninput:e=>set(id,e.target.value)};
  if(f.inputmode)attrs.inputmode=f.inputmode;
  if(f.type==="textarea"){const t=el("textarea",{...attrs,rows:f.rows||4});t.value=get(id)||"";return t;}
  const i=el("input",{...attrs,type:"text"});i.value=get(id)||"";return i;
}

// get(id) → value; set(id,value,fromSelect) stores it. Returns {root, setValue(id,v)} so other code can fill fields in.
export function buildFields(fields,{get,set,after=()=>{}}){
  const S=getSettings(),root=el("div",{class:"form"});
  const refs=new Map();
  const setValue=(id,v)=>{const c=refs.get(id);if(c){c.value=v;}set(id,v);};
  const apply=(id,v,fromSelect)=>{
    set(id,v);
    const f=fields.find(x=>x.id===id);
    if(fromSelect&&f&&f.onChange){const patch=f.onChange(v,{get},S)||{};Object.entries(patch).forEach(([k,val])=>setValue(k,val));}
    after(id);
  };
  const mk=f=>{
    const c=control(f,get,apply,S);refs.set(f.id,c);
    const kids=[el("span",{class:"lbl"},f.label),c];
    if(f.help)kids.push(el("small",{class:"help"},f.help));
    if(f.parse){
      kids.push(el("button",{type:"button",class:"btn ghost block",onclick:()=>{
        const r=parseDesc(c.value),k=Object.keys(r);
        if(!k.length){snack("Не намерих числа в описанието — попълнете ги ръчно.");return;}
        k.forEach(x=>{if(refs.has(x)){setValue(x,r[x]);after(x);}});
        const d=root.querySelector("details.adv");if(d)d.open=true;
        snack("Попълнено: "+k.map(x=>LBL[x]).join(", ")+". Проверете ги.");
      }},"✨ Попълни квадратите, етажите и срока"));
    }
    return el("label",{class:"field","data-field":f.id},...kids);
  };
  fields.filter(f=>!f.adv).forEach(f=>root.append(mk(f)));
  const advs=fields.filter(f=>f.adv);
  if(advs.length){
    const d=el("details",{class:"adv"},el("summary",{},"Още подробности (по желание)"));
    advs.forEach(f=>d.append(mk(f)));
    if(advs.some(f=>String(get(f.id)??"").trim()))d.open=true;
    root.append(d);
  }
  return {root,setValue,refs};
}
