
export type Message = { date:string; sender:string; text:string };

const AFFECTION=["je t'aime","je t’aime","tu me manques","mon amour","mon cœur","ma chérie","mon chéri","bébé","❤️","🥰","😘","😍","💕","💖","💋","love"];
const CONFLICT=["désolé","desole","pardon","excuse","énervé","enerve","colère","colere","dispute","fâché","fache","peur","triste","rupture","quitte","sépare","separe","jaloux","jalouse","confiance","marre","merde"];
const IMPORTANT=["je t'aime","je t’aime","tu me manques","amour","rupture","séparation","separation","mariage","fiançailles","fiancailles","enfant","bébé","travail","argent","maison","famille","ex","garde","divorce","promis","pardon","désolé","desole","anniversaire","vacances","projet"];

export function normalize(s:string){return s.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g,"");}
function words(s:string){return s.trim()?s.trim().split(/\s+/).length:0;}
export function parseDate(s:string):Date|null{
  const m=s.match(/(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})\s+(\d{1,2}):(\d{2})/);
  if(!m)return null; let y=+m[3]; if(y<100)y+=2000;
  return new Date(y,+m[2]-1,+m[1],+m[4],+m[5]);
}
function count(text:string,term:string){const a=normalize(text),b=normalize(term);let n=0,p=0;while((p=a.indexOf(b,p))!==-1){n++;p+=b.length;}return n;}
function month(s:string){const d=parseDate(s);return d?`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`:"unknown";}
function median(a:number[]){if(!a.length)return null;const v=[...a].sort((x,y)=>x-y),m=Math.floor(v.length/2);return Math.round(v.length%2?v[m]:(v[m-1]+v[m])/2);}
function score(m:Message){const t=normalize(m.text);let s=0;for(const k of IMPORTANT)if(t.includes(normalize(k)))s+=3;if(m.text.length>180)s++;if(/[!?]{2,}/.test(m.text))s+=2;if(/[❤️💔🥰😘😍😂🤣😭🔥]/u.test(m.text))s+=2;return s;}

export function analyzeConversation(messages:Message[]){
  if(!messages.length)throw new Error("Conversation vide.");
  const senders=[...new Set(messages.map(m=>m.sender))];
  const stats:Record<string,any>={},monthly:Record<string,any>={},responses:Record<string,number[]>={},gaps:Record<string,number>={};
  for(const s of senders)stats[s]={messages:0,characters:0,words:0,questions:0,exclamations:0,affection:{},conflict:{}};
  let prev:Message|null=null;
  for(const m of messages){
    const st=stats[m.sender];st.messages++;st.characters+=m.text.length;st.words+=words(m.text);
    st.questions+=(m.text.match(/\?/g)||[]).length;st.exclamations+=(m.text.match(/!/g)||[]).length;
    for(const k of AFFECTION){const n=count(m.text,k);if(n)st.affection[k]=(st.affection[k]||0)+n;}
    for(const k of CONFLICT){const n=count(m.text,k);if(n)st.conflict[k]=(st.conflict[k]||0)+n;}
    const mk=month(m.date);(monthly[mk]??={});monthly[mk][m.sender]=(monthly[mk][m.sender]||0)+1;
    if(prev){const a=parseDate(prev.date),b=parseDate(m.date);if(a&&b){const delta=b.getTime()-a.getTime();if(delta>6*3600e3)gaps[m.sender]=(gaps[m.sender]||0)+1;if(prev.sender!==m.sender&&delta>=0&&delta<=7*86400e3)(responses[m.sender]??=[]).push(delta/60000);}}
    prev=m;
  }
  for(const s of senders){
    const st=stats[s];
    st.averageWords=Math.round(st.words/Math.max(1,st.messages)*10)/10;
    st.averageMessageLength=Math.round(st.characters/Math.max(1,st.messages));
    st.affectionTop=Object.entries(st.affection).sort((a:any,b:any)=>b[1]-a[1]).slice(0,12).map(([term,n])=>({term,n}));
    st.conflictTop=Object.entries(st.conflict).sort((a:any,b:any)=>b[1]-a[1]).slice(0,12).map(([term,n])=>({term,n}));
    st.affectionTotal=Object.values(st.affection).reduce((a:any,b:any)=>a+(b as number),0);
    st.conflictTotal=Object.values(st.conflict).reduce((a:any,b:any)=>a+(b as number),0);
  }
  const evidence=messages.map((m,i)=>({...m,index:i,score:score(m)})).filter(x=>x.score>0).sort((a,b)=>b.score-a.score).slice(0,900).sort((a,b)=>a.index-b.index);
  const first=parseDate(messages[0].date),last=parseDate(messages[messages.length-1].date);
  return {
    meta:{totalMessages:messages.length,senders,firstDate:first?.toISOString()||null,lastDate:last?.toISOString()||null,durationDays:first&&last?Math.round((last.getTime()-first.getTime())/86400000):null},
    stats,relationship:{gapInitiations:gaps,medianResponseMinutes:Object.fromEntries(senders.map(s=>[s,median(responses[s]||[])]))},
    monthly,evidence
  };
}
