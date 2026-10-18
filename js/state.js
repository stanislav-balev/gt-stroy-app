// Persistent state: small data in localStorage, images (logo, Grishi's photo, history thumbnails) in IndexedDB.
export const K={settings:'gt2.settings',objects:'gt2.objects',plan:'gt2.plan',history:'gt2.history',draft:'gt2.draft',meta:'gt2.meta'};

export const store={
  get(k,d){try{const x=JSON.parse(localStorage.getItem(k));return x==null?d:x}catch(e){return d}},
  set(k,v){try{localStorage.setItem(k,JSON.stringify(v));return true}catch(e){return false}},
  del(k){try{localStorage.removeItem(k)}catch(e){}}
};
export const uid=()=>Date.now().toString(36)+Math.random().toString(36).slice(2,7);

let dbp=null;
function open(){
  if(dbp)return dbp;
  dbp=new Promise((res,rej)=>{
    if(!("indexedDB" in window)){rej(new Error("no idb"));return;}
    const r=indexedDB.open("gt-stroy",1);
    r.onupgradeneeded=()=>r.result.createObjectStore("images");
    r.onsuccess=()=>res(r.result);r.onerror=()=>rej(r.error);
  });
  return dbp;
}
function tx(mode,fn){
  return open().then(d=>new Promise((res,rej)=>{
    const t=d.transaction("images",mode),q=fn(t.objectStore("images"));
    t.oncomplete=()=>res(q&&q.result);t.onerror=()=>rej(t.error);t.onabort=()=>rej(t.error);
  })).catch(()=>null);
}
export const db={
  get:k=>tx("readonly",s=>s.get(k)),
  put:(k,b)=>tx("readwrite",s=>s.put(b,k)),
  del:k=>tx("readwrite",s=>s.delete(k)),
  keys:()=>tx("readonly",s=>s.getAllKeys())
};

export const meta={get:()=>store.get(K.meta,{}),set(p){store.set(K.meta,{...this.get(),...p})}};

// Objects (construction sites). Fields marked obj:true in templates.js live here.
export const objects={
  all:()=>store.get(K.objects,[]),
  save(list){store.set(K.objects,list)},
  get(id){return this.all().find(o=>o.id===id)||null},
  upsert(o){const l=this.all(),i=l.findIndex(x=>x.id===o.id);if(i<0)l.unshift(o);else l[i]=o;this.save(l);return o},
  remove(id){this.save(this.all().filter(o=>o.id!==id))},
  create(data={}){return this.upsert({id:uid(),created:Date.now(),title:"",place:"",type:"Еднофамилна къща",status:"В строеж",...data})}
};

// v1 kept everything under gt.state / gt.objs; carry the objects and the few settings over once.
export function migrateV1(){
  if(meta.get().migrated)return false;
  const st=store.get("gt.state",null),objs=store.get("gt.objs",null);
  if(!st&&!objs){meta.set({migrated:true});return false;}
  const settings=store.get(K.settings,{}),f=(st&&st.f)||{};
  ["phone","company","region","tags","slogan"].forEach(k=>{if(f[k])settings[k]=f[k];});
  store.set(K.settings,settings);
  const OBJ=["desc","type","status","title","place","area","floors","time","units","fact","week","pct","now","mat","quote"];
  const pick=o=>Object.fromEntries(OBJ.filter(k=>o[k]!=null&&o[k]!=="").map(k=>[k,o[k]]));
  const list=objects.all();
  if(objs)Object.entries(objs).forEach(([name,o])=>{if(!list.some(x=>x.title===name))list.push({id:uid(),created:Date.now(),...pick(o),title:name});});
  if(f.title&&!list.some(x=>x.title===f.title))list.push({id:uid(),created:Date.now(),...pick(f)});
  objects.save(list);
  meta.set({migrated:true,fromV1:true});
  return true;
}

export const blobToDataURL=b=>new Promise(r=>{const fr=new FileReader();fr.onload=()=>r(fr.result);fr.readAsDataURL(b)});

export async function exportAll(){
  const data={app:"gt-stroy",version:2,date:new Date().toISOString(),settings:store.get(K.settings,{}),objects:objects.all(),
    plan:store.get(K.plan,[]),history:store.get(K.history,[]),meta:meta.get(),images:{}};
  for(const k of ["logo","grishi"]){const b=await db.get(k);if(b)data.images[k]=await blobToDataURL(b);}
  return new Blob([JSON.stringify(data)],{type:"application/json"});
}
export async function importAll(text){
  let d;try{d=JSON.parse(text)}catch(e){throw new Error("Файлът не може да се прочете.")}
  if(!d||d.app!=="gt-stroy")throw new Error("Това не е резервно копие от това приложение.");
  if(d.settings)store.set(K.settings,d.settings);if(d.objects)objects.save(d.objects);
  if(d.plan)store.set(K.plan,d.plan);if(d.history)store.set(K.history,d.history);
  meta.set({...(d.meta||{}),migrated:true});
  for(const [k,u] of Object.entries(d.images||{})){try{const b=await (await fetch(u)).blob();await db.put(k,b);}catch(e){}}
  return {objects:(d.objects||[]).length,history:(d.history||[]).length};
}
export async function clearAll(){
  Object.values(K).forEach(k=>store.del(k));["gt.state","gt.objs"].forEach(k=>store.del(k));
  for(const k of (await db.keys())||[])await db.del(k);
}
