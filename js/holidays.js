// Bulgarian holidays a building firm would greet. Dates are computed, never typed in by hand.
// lead = how many days before the holiday the greeting should go out (Easter greeting goes out on Saturday, etc.).

// Orthodox Easter (Meeus Julian algorithm, +13 days for 1900-2099 → Gregorian)
export function easterDate(y){
  const a=y%4,b=y%7,c=y%19,d=(19*c+15)%30,e=(2*a+4*b-d+34)%7;
  const month=Math.floor((d+e+114)/31),day=((d+e+114)%31)+1;
  const dt=new Date(y,month-1,day);dt.setDate(dt.getDate()+13);return dt;
}

export const HOLIDAYS=[
  {key:"ny",name:"Нова година",m:1,d:1,lead:1,head:"Честита нова година!",
   text:y=>`Желаем ви здраве, спокойствие и дом, в който да се радвате на всеки ден. Нека ${y} ви донесе нови начала!`},
  {key:"baba",name:"Баба Марта",m:3,d:1,lead:0,head:"Честита Баба Марта!",
   text:()=>"Здраве и сила, и да сме все с мартеници на ръка! Весела пролет от целия екип."},
  {key:"mar3",name:"3 март — Ден на Освобождението",m:3,d:3,lead:0,head:"Честит 3 март!",
   text:()=>"Честит Национален празник — Ден на Освобождението на България! Да сме здрави и обединени."},
  {key:"mar8",name:"8 март — Ден на жената",m:3,d:8,lead:0,head:"Честит 8 март!",
   text:()=>"Честит празник на всички жени — здраве, усмивки и уютен дом!"},
  {key:"easter",name:"Великден",easter:true,lead:1,head:"Христос воскресе!",
   text:()=>"Честит Великден! Желаем ви светли празници, здраве и мир в дома."},
  {key:"may1",name:"1 май — Ден на труда",m:5,d:1,lead:0,head:"Честит 1 май!",
   text:()=>"Честит Ден на труда! Поздрав към всички, които работят със здрави ръце и честен труд."},
  {key:"may6",name:"Гергьовден",m:5,d:6,lead:0,head:"Честит Гергьовден!",
   text:()=>"Честит празник! Здраве, сила и берекет за вас и вашите близки."},
  {key:"may24",name:"24 май — Ден на просветата",m:5,d:24,lead:0,head:"Честит 24 май!",
   text:()=>"Честит Ден на българската просвета и култура и на славянската писменост!"},
  {key:"sep6",name:"6 септември — Съединението",m:9,d:6,lead:0,head:"Честит 6 септември!",
   text:()=>"Честит Ден на Съединението на България!"},
  {key:"sep22",name:"22 септември — Независимостта",m:9,d:22,lead:0,head:"Честит 22 септември!",
   text:()=>"Честит Ден на Независимостта на България!"},
  {key:"dimitrovden",name:"Димитровден",m:10,d:26,lead:0,head:"Честит Димитровден!",
   text:()=>"Честит празник на всички, които носят името Димитър и Димитрина! Поздрав и към колегите строители — по традиция това е и наш празник."},
  {key:"xmas",name:"Коледа",m:12,d:25,lead:1,head:"Весела Коледа!",
   text:()=>"Весела Коледа! Нека домът ви е пълен със светлина, топлина и усмивки."}
];
export const OTHER={key:"other",name:"Друг повод",head:"",text:()=>""};

export const holidayByKey=k=>HOLIDAYS.find(h=>h.key===k)||null;

export function eventDate(h,y){
  if(h.easter)return easterDate(y);
  return new Date(y,h.m-1,h.d);
}
export function slotDate(h,y){const d=eventDate(h,y);d.setDate(d.getDate()-(h.lead||0));return d;}

// the holiday's next occurrence on or after `from` (compares the event day, not the lead day)
export function nextEvent(h,from=new Date()){
  const f=new Date(from.getFullYear(),from.getMonth(),from.getDate());
  for(const y of [f.getFullYear(),f.getFullYear()+1]){const d=eventDate(h,y);if(d>=f)return {date:d,year:y};}
  const y=f.getFullYear()+2;return {date:eventDate(h,y),year:y};
}

// the user's own yearly holiday from settings (date input gives YYYY-MM-DD)
export function ownHoliday(S){
  if(!S||!S.ownHolidayName||!/^\d{4}-\d{2}-\d{2}$/.test(S.ownHolidayDate||""))return null;
  const [,m,d]=S.ownHolidayDate.split("-").map(Number);
  return {key:"own",name:S.ownHolidayName,m,d,lead:0,head:S.ownHolidayName+"!",text:()=>"Благодарим ви, че сте с нас!"};
}
export const allHolidays=S=>{const o=ownHoliday(S);return o?[...HOLIDAYS,o]:HOLIDAYS;};

// text for the holiday as of its next occurrence
export const greeting=(h,from=new Date())=>h.text(nextEvent(h,from).year);

// holidays whose greeting day falls in [from, from+days]
export function upcoming(S,from=new Date(),days=60){
  const f=new Date(from.getFullYear(),from.getMonth(),from.getDate()),end=new Date(f);end.setDate(end.getDate()+days);
  const out=[];
  for(const h of allHolidays(S))for(const y of [f.getFullYear(),f.getFullYear()+1]){
    const sd=slotDate(h,y);if(sd>=f&&sd<=end)out.push({key:h.key,name:h.name,event:eventDate(h,y),slot:sd,year:y});
  }
  return out.sort((a,b)=>a.slot-b.slot);
}
