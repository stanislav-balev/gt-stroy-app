// Pulls the numbers Grishi mentions (area, floors, time, rooms, place, type) out of free text.
export function parseDesc(t){
  const r={},low=t.toLowerCase(),N={една:1,един:1,два:2,две:2,три:3,четири:4,пет:5,шест:6};let m;
  if(m=low.match(/(\d+(?:[.,]\d+)?)\s*(?:кв\.?\s*м(?![\p{L}])|кв\.?\s*метр\p{L}*|м2|м²|квадрат\p{L}*)/u))r.area=m[1].replace(",",".");
  if(m=low.match(/(\d+)\s*(?:-\s*)?етаж/u))r.floors=m[1];
  else if(m=low.match(/(едно|дву|три|четири)етажн/u))r.floors=String({едно:1,дву:2,три:3,четири:4}[m[1]]);
  else if(m=low.match(/(един|една|два|три|четири)\s+етажа?(?![\p{L}])/u))r.floors=String(N[m[1]]);
  if(m=low.match(/(\d+)\s*(месец\p{L}*|мес\.|седмиц\p{L}*|седм\.|дни|дена|ден)(?![\p{L}])/u)){
    const n=+m[1],w=m[2];r.time=n+" "+(/^мес/.test(w)?(n==1?"месец":"месеца"):/^сед/.test(w)?(n==1?"седмица":"седмици"):(n==1?"ден":"дни"));}
  if(m=low.match(/(\d+|една|един|два|две|три|четири|пет|шест)\s+(спалн\p{L}*|стаи|стая|апартамент\p{L}*|жилищ\p{L}*|гарсониер\p{L}*)/u)){
    const n=+m[1]||N[m[1]],w=m[2],one=n==1;
    r.units=n+" "+(/^спалн/.test(w)?(one?"спалня":"спални"):/^ста/.test(w)?(one?"стая":"стаи"):/^апарт/.test(w)?(one?"апартамент":"апартамента"):/^жил/.test(w)?(one?"жилище":"жилища"):(one?"гарсониера":"гарсониери"));}
  if(m=t.match(/(?:^|[\s,(])(с\.|село|гр\.|град)\s*([А-Я][\p{L}-]+)/u))r.place=(/^с|^село/.test(m[1])?"с. ":"гр. ")+m[2];
  if(/двуфамилн/.test(low))r.type="Двуфамилна къща";
  else if(/блок|жилищна сграда|многофамилн/.test(low))r.type="Жилищна сграда";
  else if(/ремонт|пристройк|надстройк/.test(low))r.type="Ремонт / пристройка";
  else if(/къщ/.test(low))r.type="Еднофамилна къща";
  return r;
}
export const LBL={area:"квадрати",floors:"етажи",time:"срок",units:"стаи",place:"място",type:"вид"};
