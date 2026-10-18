// Tiny hash router. Screens live at #/..., so the Android Back button simply works.
import {$,el} from "./ui.js";

let routes=[],leaving=[];
export const register=r=>{routes=r;};
export const onLeave=fn=>{leaving.push(fn);};

export function go(h){if(location.hash===h)route();else location.hash=h;}
export function replace(h){history.replaceState(null,"",h);route();}
export function back(){if(history.length>1)history.back();else go("#/");}

export function route(){
  const h=location.hash||"#/";
  leaving.splice(0).forEach(f=>{try{f()}catch(e){}});
  document.querySelectorAll(".ovl,.lb").forEach(n=>n.dispatchEvent(new Event("gt-close"))); // close open questions and the picture viewer
  for(const [re,fn] of routes){
    const m=h.match(re);
    if(m){
      const v=$("view");v.replaceChildren();
      chrome({});setWbar(null);
      window.scrollTo(0,0);
      Promise.resolve().then(()=>fn(v,...m.slice(1))).catch(err=>{
        console.error(err);
        v.append(el("div",{class:"card"},el("h3",{},"Нещо се обърка"),el("p",{},"Натиснете „Начало“ долу и опитайте пак. Вашите данни са запазени."),
          el("a",{class:"btn block",href:"#/"},"Към началото")));
      });
      return;
    }
  }
  replace("#/");
}

// top bar, bottom menu and step dots for the current screen
export function chrome(o){
  $("title").textContent=o.title||"";$("title").hidden=!!o.home;
  $("brandmark").hidden=!o.home;
  const sub=$("sub");sub.textContent=o.sub||(o.progress?`Стъпка ${o.progress} от 4`:"");sub.hidden=!sub.textContent;
  $("back").hidden=!o.back;
  const wiz=!!o.progress;
  $("tabs").hidden=wiz||o.tabs===false;
  document.querySelectorAll("#tabs a").forEach(a=>{if(a.dataset.tab===o.tab)a.setAttribute("aria-current","page");else a.removeAttribute("aria-current");});
  const p=$("prog");p.hidden=!wiz;
  if(wiz)p.innerHTML=[1,2,3,4].map(i=>`<i class="${i<o.progress?"d":i===o.progress?"c":""}"></i>`).join("");
  document.body.classList.toggle("wiz",wiz);
}

// fixed bar at the bottom of the steps: Back + the one main action
export function setWbar(o){
  const bar=$("wbar");
  document.body.classList.toggle("hasw",!!o);
  if(!o){bar.hidden=true;bar.replaceChildren();return;}
  bar.hidden=false;bar.replaceChildren();
  if(o.need)bar.append(el("p",{class:"wneed"},o.need));
  const btns=el("div",{class:"wbtns"});
  if(o.back!==false)btns.append(el("button",{type:"button",class:"btn ghost big",onclick:back},"← Назад"));
  btns.append(el("button",{type:"button",class:"btn big"+(o.cls?" "+o.cls:""),disabled:!!o.need,onclick:()=>o.onNext&&o.onNext()},o.next||"Напред →"));
  bar.append(btns);
}
