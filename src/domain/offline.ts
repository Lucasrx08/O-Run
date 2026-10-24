import type {Course,Data,OfflineConfig,Pause,Run,Sequence,Session,Student} from './types';

export interface SessionPack {
 kind:'orun-session-v1';post:'A'|'B';sessionId:string;createdAt:number;transferKey:string;
 session:Session;sequence:Sequence;courses:Course[];students:Student[];
}
export interface TimeEntry {id:string;studentId:string;courseId:string;start:number;end:number;pauses:Pause[];}
export interface TimesPack {kind:'orun-times-v1';post:'A'|'B';sessionId:string;createdAt:number;runs:TimeEntry[];}

const unique=(values:string[])=>new Set(values).size===values.length;
export function alphabeticalStudents(data:Data,sessionId:string):Student[]{
 const session=data.sessions.find(s=>s.id===sessionId);
 if(!session)throw new Error('Leçon introuvable.');
 return data.students.filter(s=>session.studentIds.includes(s.id))
  .sort((a,b)=>a.lastName.localeCompare(b.lastName,'fr',{sensitivity:'base'})||a.firstName.localeCompare(b.firstName,'fr',{sensitivity:'base'})||a.id.localeCompare(b.id));
}
export function splitAlphabetical(data:Data,sessionId:string,selectedA?:string[]):{A:string[];B:string[]}{
 const ids=alphabeticalStudents(data,sessionId).map(s=>s.id);
 const a=selectedA===undefined?ids.slice(0,Math.ceil(ids.length/2)):selectedA;
 if(!unique(a)||a.some(id=>!ids.includes(id)))throw new Error('Répartition inconnue ou répétée.');
 return {A:ids.filter(id=>a.includes(id)),B:ids.filter(id=>!a.includes(id))};
}
export function createSessionPack(data:Data,sessionId:string,post:'A'|'B',studentIds:string[],transferKey:string):SessionPack{
 const session=data.sessions.find(s=>s.id===sessionId),sequence=data.sequences.find(q=>q.id===session?.sequenceId);
 if(!session||!sequence||!studentIds.length||!transferKey||!unique(studentIds)||studentIds.some(id=>!session.studentIds.includes(id)))throw new Error('Préparation de séance invalide.');
 const courses=session.courseIds.map(id=>data.courses.find(c=>c.id===id));
 if(courses.some(c=>!c))throw new Error('Carte introuvable dans la séance.');
 return {kind:'orun-session-v1',post,sessionId,createdAt:Date.now(),transferKey,
  session:{...session,studentIds:[...studentIds]},sequence:{...sequence,classes:[session.className||sequence.classes[0]]},
  // Les iPads de chronométrage n'ont besoin que du prénom et de l'initiale.
  courses:(courses as Course[]).map(({map:_map,...course})=>course),students:studentIds.map(id=>data.students.find(s=>s.id===id)!).filter(Boolean).map(s=>({...s,lastName:s.lastName.charAt(0).toUpperCase()}))};
}
export function validateSessionPack(value:unknown):SessionPack{
 const p=value as SessionPack;
 if(!p||p.kind!=='orun-session-v1'||!['A','B'].includes(p.post)||typeof p.transferKey!=='string'||!/^([a-f0-9]{64})$/.test(p.transferKey)||
  !p.session||p.session.id!==p.sessionId||!p.sequence||p.sequence.id!==p.session.sequenceId||!Array.isArray(p.students)||!Array.isArray(p.courses)||
  !p.students.length||!unique(p.students.map(s=>s.id))||!unique(p.courses.map(c=>c.id))||
  !unique(p.session.studentIds)||!p.session.studentIds.every(id=>p.students.some(s=>s.id===id))||
  !p.session.courseIds.every(id=>p.courses.some(c=>c.id===id)))throw new Error('Fichier de répartition invalide.');
 return p;
}
export function importSessionPack(data:Data,input:unknown):{data:Data;config:OfflineConfig}{
 const p=validateSessionPack(input);
 const existing=data.sessions.find(s=>s.id===p.sessionId);
 if(existing&&JSON.stringify(existing)!==JSON.stringify(p.session))throw new Error('Cette leçon existe déjà avec une autre répartition. Conservez une sauvegarde et vérifiez la tablette.');
 const byId=<T extends {id:string}>(previous:T[],incoming:T[])=>{
  const map=new Map(previous.map(x=>[x.id,x]));
  for(const item of incoming)map.set(item.id,item);
  return [...map.values()];
 };
 const next={...data,students:byId(data.students,p.students),sequences:byId(data.sequences,[p.sequence]),
  sessions:byId(data.sessions,[p.session]),courses:byId(data.courses,p.courses),version:data.version+1,updatedAt:Date.now()};
 return {data:next,config:{post:p.post,sessionId:p.sessionId,studentIds:p.session.studentIds,transferKey:p.transferKey}};
}
export function exportTimes(data:Data,config:OfflineConfig):TimesPack{
 if(config.post!=='A'&&config.post!=='B')throw new Error('Sélectionnez une tablette A ou B.');
 const runs=data.runs.filter(r=>r.sessionId===config.sessionId&&config.studentIds.includes(r.studentId));
 if(runs.some(r=>r.end===undefined))throw new Error('Des chronos sont encore en cours. Arrêtez-les avant cet export.');
 return {kind:'orun-times-v1',post:config.post,sessionId:config.sessionId,createdAt:Date.now(),
  runs:runs.map(r=>({id:r.id,studentId:r.studentId,courseId:r.courseId,start:r.start,end:r.end!,pauses:r.pauses}))};
}
export function mergeTimes(data:Data,config:OfflineConfig,input:unknown):{data:Data;added:number;matched:number;withoutCorrection:number}{
 const p=input as TimesPack;
 if(config.post!=='C'||!p||p.kind!=='orun-times-v1'||!['A','B'].includes(p.post)||p.sessionId!==config.sessionId||
  !Array.isArray(p.runs)||!unique(p.runs.map(r=>r.id)))throw new Error('Fichier chrono invalide ou appartenant à une autre leçon.');
 const session=data.sessions.find(s=>s.id===config.sessionId);
 if(!session)throw new Error('La leçon centrale est introuvable.');
 const assigned=new Set(p.post==='A'?config.groupA:config.groupB);
 if(!assigned.size)throw new Error('La répartition alphabétique de cette tablette est absente.');
 for(const r of p.runs){
  if(!r||!assigned.has(r.studentId)||!session.studentIds.includes(r.studentId)||!session.courseIds.includes(r.courseId)||
   typeof r.id!=='string'||!r.id||!Number.isFinite(r.start)||!Number.isFinite(r.end)||r.end<r.start||
   !Array.isArray(r.pauses)||r.pauses.some(q=>!Number.isFinite(q.start)||!Number.isFinite(q.end)||q.end!<q.start||q.start<r.start||q.end!>r.end))
   throw new Error('Chrono incohérent ou élève affecté à la mauvaise tablette.');
  const existing=data.runs.find(x=>x.id===r.id);
  if(existing&&(existing.studentId!==r.studentId||existing.courseId!==r.courseId||existing.start!==r.start||
   existing.end!==r.end||JSON.stringify(existing.pauses)!==JSON.stringify(r.pauses)))
   throw new Error('Conflit entre deux versions du même chrono. Import annulé.');
 }
 const addedRuns:Run[]=p.runs.filter(r=>!data.runs.some(x=>x.id===r.id)).map(r=>{
  const course=data.courses.find(c=>c.id===r.courseId)!;
  return {...r,sessionId:p.sessionId,courseSnapshot:structuredClone(course),errors:null,manualLevel:null,revision:0};
 });
 const all=[...data.runs,...addedRuns];
 let matched=0,withoutCorrection=0;
 for(const r of all.filter(r=>r.sessionId===p.sessionId&&assigned.has(r.studentId)&&r.end!==undefined)){
  const ordered=all.filter(x=>x.sessionId===r.sessionId&&x.studentId===r.studentId&&x.courseId===r.courseId&&x.end!==undefined)
   .sort((a,b)=>a.start-b.start||a.id.localeCompare(b.id));
  const attempt=ordered.findIndex(x=>x.id===r.id)+1;
  const correction=(data.offlineCorrections||[]).find(c=>c.sessionId===r.sessionId&&c.studentId===r.studentId&&c.courseId===r.courseId&&c.attempt===attempt);
  if(correction){r.errors=correction.errors;matched++;}else if(r.errors===null)withoutCorrection++;
 }
 return {data:{...data,runs:all,version:data.version+1,updatedAt:Date.now()},added:addedRuns.length,matched,withoutCorrection};
}
