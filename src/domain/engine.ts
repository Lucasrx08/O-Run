import {removeClass} from './classroom';
import type {Command, Course, Data, Level, Role, Run, Student} from './types';
export function elapsed(run:Run, now=Date.now()):number {
 if(run.end!==undefined&&run.manualTimeMs!==undefined)return run.manualTimeMs;
 const end=run.end ?? now;
 const paused=run.pauses.reduce((n,p)=>n+Math.max(0,Math.min(p.end ?? end,end)-p.start),0);
 return Math.max(0,end-run.start-paused);
}
export function formatTime(ms:number, tenths=false):string {
 const s=Math.floor(Math.max(0,ms)/1000); const base=`${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`;
 return tenths?`${base}.${Math.floor(ms%1000/100)}`:base;
}
export function parseTime(text:string):number{
 const parts=text.trim().replace(',','.').split(':');
 if(parts.length>3||!parts.length||parts.some(p=>!/^\d+(?:\.\d+)?$/.test(p)))throw new Error('Saisissez un temps, par exemple 01:24.5.');
 const values=parts.map(Number);
 if(values.some(v=>!Number.isFinite(v))||(parts.length>1&&values.slice(1).some(v=>v>=60))||
  (parts.length===3&&values[1]>=60))throw new Error('Temps incorrect : les secondes doivent être inférieures à 60.');
 const seconds=values.reduce((total,value)=>total*60+value,0);
 const rounded=Math.round(seconds*10)*100;
 if(rounded<100||rounded>24*60*60*1000)throw new Error('Le temps doit être compris entre 0,1 seconde et 24 heures.');
 return rounded;
}
export function score(run:Run):number|null {return run.end===undefined||run.errors===null?null:elapsed(run)+run.errors*run.courseSnapshot.penalty*1000;}
export function level(run:Run):Level|null {
 if(run.manualLevel!==null) return run.manualLevel;
 const rubric=run.courseSnapshot.rubric;
 const useTime=rubric.useTime!==false,useControls=rubric.useControls!==false;
 if(!rubric.enabled||run.end===undefined||(!useTime&&!useControls))return null;
 if((useControls||useTime&&run.courseSnapshot.penalty>0)&&run.errors===null)return null;
 const seconds=(elapsed(run)+(run.errors??0)*run.courseSnapshot.penalty*1000)/1000;
 for(let i=0;i<3;i++)if((!useTime||seconds<=rubric.thresholds[i])&&(!useControls||run.errors!<=rubric.maxErrors[i]))return (4-i) as Level;
 return 1;
}
export function studentLabels(students:Student[]):Map<string,string> {
 const bases=students.map(s=>s.label||`${s.firstName} ${s.lastName.trim().charAt(0).toUpperCase()}.`);
 return new Map(students.map((s,i)=>[s.id,bases.filter(b=>b===bases[i]).length>1?`${bases[i]} ${students.slice(0,i+1).filter((_,j)=>bases[j]===bases[i]).length}`:bases[i]]));
}
export function running(data:Data,sessionId?:string){return data.runs.filter(r=>r.end===undefined&&(!sessionId||r.sessionId===sessionId));}
export function courseForRun(run:Run):Course {return run.courseSnapshot;}
function check(ok:unknown,message:string):asserts ok {if(!ok)throw new Error(message);}
export function apply(data:Data,cmd:Command,role:Role='teacher',actor='Ce poste'):Data {
 if(data.applied.includes(cmd.id))return data;
 check(Number.isFinite(cmd.at)&&cmd.at>0,'Instant invalide.');
 const allowed=role==='teacher'||(role==='departure'&&cmd.kind==='start')||(role==='arrival'&&['stop','pause','resume'].includes(cmd.kind));
 check(allowed,'Ce compte ne possède pas cette autorisation.');
 const next=structuredClone(data); let detail='';
 if(cmd.kind==='start') {
  const session=next.sessions.find(s=>s.id===cmd.sessionId); const course=next.courses.find(c=>c.id===cmd.courseId);
  check(session&&course&&session.courseIds.includes(course.id),'Parcours absent de cette séance.');
  check(cmd.students.length>0&&cmd.students.length===cmd.runIds.length&&new Set(cmd.students).size===cmd.students.length&&new Set(cmd.runIds).size===cmd.runIds.length,'Sélection de départ invalide.');
  for(let i=0;i<cmd.students.length;i++){
   const id=cmd.students[i]; check(session.studentIds.includes(id)&&next.students.some(s=>s.id===id),'Élève absent de cette séance.');
   check(!next.runs.some(r=>r.studentId===id&&r.end===undefined),'Un élève sélectionné est déjà en course.');
   check(!next.runs.some(r=>r.id===cmd.runIds[i]),'Identifiant de passage déjà utilisé.');
  }
  for(let i=0;i<cmd.students.length;i++)next.runs.push({id:cmd.runIds[i],studentId:cmd.students[i],sessionId:session.id,courseId:course.id,courseSnapshot:structuredClone(course),start:cmd.at,pauses:[],errors:null,manualLevel:null,revision:0});
  detail=`${cmd.students.length} départ(s) · ${course.name}`;
 }else if(cmd.kind==='config') {
  const ids=(items:{id:string}[])=>items.length===new Set(items.map(s=>s.id)).size;
  check(ids(cmd.students)&&ids(cmd.sessions)&&ids(cmd.courses)&&ids(cmd.sequences),'Identifiants en doublon.');
  for(const c of cmd.courses) check((c.rubric.useTime===undefined||typeof c.rubric.useTime==='boolean')&&(c.rubric.useControls===undefined||typeof c.rubric.useControls==='boolean')&&(!c.rubric.enabled||c.rubric.useTime!==false||c.rubric.useControls!==false)&&c.name.trim()&&c.distance>0&&Number.isFinite(c.distance)&&Number.isInteger(c.controls)&&c.controls>0&&c.penalty>=0&&Number.isFinite(c.penalty)&&c.rubric.thresholds.every((t,i,a)=>Number.isFinite(t)&&t>0&&(!i||t>=a[i-1]))&&c.rubric.maxErrors.every(e=>Number.isInteger(e)&&e>=0&&e<=c.controls),'Paramètres de parcours ou barème invalides.');
  for(const s of cmd.students) check(s.firstName.trim()&&s.lastName.trim()&&s.className.trim(),'Prénom, nom et classe sont obligatoires.');
  for(const s of cmd.sessions) check(cmd.sequences.some(q=>q.id===s.sequenceId)&&s.studentIds.every(id=>cmd.students.some(p=>p.id===id))&&s.courseIds.every(id=>cmd.courses.some(c=>c.id===id)),'Séance incohérente.');
  for(const r of next.runs)check(cmd.students.some(s=>s.id===r.studentId)&&cmd.sessions.some(s=>s.id===r.sessionId),'Supprimez les résultats associés avant de supprimer cet élève ou cette séance.');
  next.students=cmd.students;next.sequences=cmd.sequences;next.sessions=cmd.sessions;next.courses=cmd.courses;
  next.offlineCorrections=(next.offlineCorrections||[]).filter(c=>cmd.students.some(s=>s.id===c.studentId)&&cmd.sessions.some(s=>s.id===c.sessionId&&s.courseIds.includes(c.courseId)&&s.studentIds.includes(c.studentId)));
  detail=cmd.detail;
 }else if(cmd.kind==='deleteClass'){
  check(cmd.baseVersion===data.version,'La classe a changé sur un autre poste. Réessayez.');Object.assign(next,removeClass(next,cmd.className));detail=`Classe supprimée : ${cmd.className}`;
 }else if(cmd.kind==='purge') {
  next.runs=next.runs.filter(r=>r.sessionId!==cmd.sessionId);next.offlineCorrections=(next.offlineCorrections||[]).filter(c=>c.sessionId!==cmd.sessionId);detail='Résultats de la séance supprimés';
 }else if(cmd.kind==='offlineCorrect'){
  const session=next.sessions.find(s=>s.id===cmd.sessionId);
  const course=next.courses.find(c=>c.id===cmd.courseId);
  check(!!session&&!!course&&session.courseIds.includes(course.id)&&session.studentIds.includes(cmd.studentId),'Élève ou carte absent de cette leçon.');
  check(Number.isInteger(cmd.attempt)&&cmd.attempt>=1&&cmd.attempt<=50,'Numéro de passage invalide.');
  check(Number.isInteger(cmd.errors)&&cmd.errors>=0&&cmd.errors<=course.controls,'Nombre de balises fausses invalide.');
  const corrections=next.offlineCorrections||[];
  const previous=corrections.find(c=>c.sessionId===cmd.sessionId&&c.studentId===cmd.studentId&&c.courseId===cmd.courseId&&c.attempt===cmd.attempt);
  next.offlineCorrections=[...corrections.filter(c=>c!==previous),{id:previous?.id||cmd.id,at:cmd.at,sessionId:cmd.sessionId,studentId:cmd.studentId,courseId:cmd.courseId,attempt:cmd.attempt,errors:cmd.errors}];
  const matching=next.runs.filter(r=>r.sessionId===cmd.sessionId&&r.studentId===cmd.studentId&&r.courseId===cmd.courseId&&r.end!==undefined).sort((a,b)=>a.start-b.start||a.id.localeCompare(b.id));
  const run=matching[cmd.attempt-1];
  if(cmd.milliseconds!==undefined){
   check(run,'Importez les chronos avant d’en corriger la durée.');
   check(Number.isInteger(cmd.milliseconds)&&cmd.milliseconds>=100&&cmd.milliseconds<=24*60*60*1000,'Temps corrigé invalide.');
  }
  if(run){run.errors=cmd.errors;if(cmd.milliseconds!==undefined)run.manualTimeMs=cmd.milliseconds;run.revision++;}
  detail=`Correction carton · ${cmd.errors} balise(s) fausse(s)${cmd.milliseconds!==undefined?' · Chrono rectifié : '+formatTime(cmd.milliseconds,true):''}`;
 }else{
  const run=next.runs.find(r=>r.id===cmd.runId);check(run,'Passage introuvable.');
  const paused=run.pauses.at(-1)?.end===undefined&&run.pauses.length>0;
  if(['pause','resume','stop'].includes(cmd.kind)){
   // Repeated STOP is idempotent even when distinct operation IDs are sent.
   if(cmd.kind==='stop'&&run.end!==undefined)return data;
   check(run.end===undefined,'Ce passage est déjà terminé.');
   check(cmd.at>=run.start&&cmd.at>=(run.pauses.at(-1)?.end??run.pauses.at(-1)?.start??run.start),'Horloge incohérente. Vérifiez l’heure du poste.');
  }
  if(cmd.kind==='pause'){check(!paused,'Le chrono est déjà en pause.');run.pauses.push({start:cmd.at});detail='Chrono en pause';}
  if(cmd.kind==='resume'){check(paused,'Le chrono est déjà actif.');run.pauses[run.pauses.length-1].end=cmd.at;detail='Chrono repris';}
  if(cmd.kind==='stop'){if(paused)run.pauses[run.pauses.length-1].end=cmd.at;run.end=cmd.at;detail='Arrivée enregistrée';}
  if(cmd.kind==='reopen'){
   check(run.end!==undefined,'Ce passage est déjà actif.');check(cmd.reason?.trim(),'Un motif est obligatoire.');
   check(!next.runs.some(r=>r.id!==run.id&&r.studentId===run.studentId&&r.end===undefined),'Un autre passage est actif.');
   run.end=undefined;run.errors=null;run.manualLevel=null;run.manualTimeMs=undefined;detail=`Arrivée annulée : ${cmd.reason}`;
  }
  if(cmd.kind==='correct'||cmd.kind==='level'||cmd.kind==='adjustTime'){
   check(run.end!==undefined,'La course doit être terminée.');
   check(run.revision===cmd.expectedRevision,'Ce résultat a changé sur un autre poste. Rechargez sa correction.');
   if(cmd.kind==='adjustTime'){
    check(Number.isInteger(cmd.milliseconds)&&cmd.milliseconds>=100&&cmd.milliseconds<=24*60*60*1000,'Temps invalide (minimum 0,1 seconde, maximum 24 heures).');
    detail=`Chrono rectifié : ${formatTime(elapsed(run),true)} → ${formatTime(cmd.milliseconds,true)}`;
    run.manualTimeMs=cmd.milliseconds;
   }else if(cmd.kind==='correct'){
    check(Number.isInteger(cmd.errors)&&cmd.errors>=0&&cmd.errors<=run.courseSnapshot.controls,'Nombre de balises fausses invalide.');
    detail=`Balises fausses : ${run.errors===null?'non corrigé':run.errors} → ${cmd.errors}${cmd.reason?' · '+cmd.reason:''}`;run.errors=cmd.errors;
    if(cmd.milliseconds!==undefined){
     check(Number.isInteger(cmd.milliseconds)&&cmd.milliseconds>=100&&cmd.milliseconds<=24*60*60*1000,'Temps corrigé invalide.');
     detail+=` · Chrono ${formatTime(elapsed(run),true)} → ${formatTime(cmd.milliseconds,true)}`;
     run.manualTimeMs=cmd.milliseconds;
    }
   }else{check(cmd.reason.trim(),'Un motif est obligatoire.');check(cmd.level===null||[1,2,3,4].includes(cmd.level),'Niveau invalide.');detail=`Niveau manuel : ${cmd.level??'barème'} · ${cmd.reason}`;run.manualLevel=cmd.level;}
  }
  run.revision++;
 }
 next.audit.push({id:cmd.id,at:cmd.at,action:cmd.kind,runId:'runId'in cmd?cmd.runId:undefined,actor,detail});
 next.applied.push(cmd.id);next.version++;next.updatedAt=cmd.at;return next;
}
export function ranking(runs:Run[]):(Run&{rank:number})[]{
 const sorted=runs.filter(r=>score(r)!==null).sort((a,b)=>score(a)!-score(b)!||a.start-b.start);
 let prev:number|null=null,rank=0;
 return sorted.map((r,i)=>{if(score(r)!==prev)rank=i+1;prev=score(r);return {...r,rank};});
}

export function competitionKey(r:Run):string {const c=r.courseSnapshot;return JSON.stringify([c.id,c.distance,c.controls,c.penalty,c.difficulty,c.rubric]);}
