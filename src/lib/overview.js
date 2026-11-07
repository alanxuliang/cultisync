const DAY=86400000;
const dayString=t=>new Date(t).toISOString().slice(0,10);

export function weeklyEto(points,now=Date.now()) {
  const today=Date.parse(dayString(now)),values=new Map(points.filter(p=>Number.isFinite(p.value)&&p.value>=0&&Date.parse(p.date)<today).map(p=>[p.date,p.value]));
  const latest=[...values.keys()].sort().at(-1);
  if(!latest)return {total:null,reason:'No daily ET₀ available.'};
  const end=Date.parse(latest),start=dayString(end-6*DAY);
  const sum=offset=>{const days=Array.from({length:7},(_,i)=>values.get(dayString(end-(i+offset)*DAY)));return days.every(Number.isFinite)?days.reduce((a,b)=>a+b,0):null;};
  const total=sum(0),previous=sum(7),stale=today-end>3*DAY;
  return {start,end:latest,total:stale?null:total,previous,delta:total!==null&&previous!==null&&!stale?total-previous:null,stale,
    reason:stale?'ET₀ is delayed; refresh for a current week.':total===null?'A full seven days is not available.':null};
}

export function seasonalNdvi(points,now=Date.now()) {
  const today=dayString(now),year=Number(today.slice(0,4)),cutoff=today.slice(5);
  return [year,year-1].map(y=>({year:y,points:points.filter(p=>p.date.startsWith(`${y}-`)&&p.date.slice(5)<=cutoff&&Number.isFinite(p.value)&&p.value>=-1&&p.value<=1).sort((a,b)=>a.date.localeCompare(b.date)).map(p=>({...p,seasonDay:(Date.parse(`2000-${p.date.slice(5)}T00:00:00Z`)-Date.UTC(2000,0,1))/DAY}))}));
}

export function overviewForecast(weather,now=Date.now()) {
  const days=new Map();
  for(const p of weather?.periods||[]){
    if(Date.parse(p.endTime)<=now||!Number.isFinite(Date.parse(p.startTime)))continue;
    const date=p.startTime.slice(0,10);
    if(!days.has(date))days.set(date,{date,periods:[]});
    days.get(date).periods.push(p);
  }
  return [...days.values()].sort((a,b)=>a.date.localeCompare(b.date)).slice(0,3);
}
