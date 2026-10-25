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
export function importSessionPack(data:Data,input:unknown,config?:OfflineConfig):{data:Data;config:OfflineConfig}{
 const p=validateSessionPack(input);
 const existing=data.sessions.find(s=>s.id===p.sessionId);
 const fromTablet=!!config&&['A','B','AB'].includes(config.post)&&config.sessionId===p.sessionId;
 if(existing&&!fromTablet)throw new Error('Cette leçon existe déjà sur cet appareil. Pour fusionner A et B, importez la préparation sur un iPad configuré en A ou B.');
 if(fromTablet&&config!.transferKey!==p.transferKey)throw new Error('Préparation incompatible : les fichiers A et B ne proviennent pas de la même séance.');
 if(existing&&(existing.sequenceId!==p.session.sequenceId||existing.name!==p.session.name||
  existing.date!==p.session.date||existing.className!==p.session.className||
  JSON.stringify(existing.courseIds)!==JSON.stringify(p.session.courseIds)))throw new Error('Préparation incompatible avec la leçon présente sur cet iPad.');
 const groupA=fromTablet?(config!.groupA??(config!.post==='A'?config!.studentIds:[])):[];
 const groupB=fromTablet?(config!.groupB??(config!.post==='B'?config!.studentIds:[])):[];
 const opposite=p.post==='A'?groupB:groupA;
 if(p.students.some(s=>opposite.includes(s.id)))throw new Error('Un élève est affecté aux deux groupes. Réexportez A et B depuis le poste C.');
 const nextA=p.post==='A'?p.session.studentIds:groupA;
 const nextB=p.post==='B'?p.session.studentIds:groupB;
 if(fromTablet&&data.runs.some(r=>r.sessionId===p.sessionId&&(
  groupA.includes(r.studentId)&&!nextA.includes(r.studentId)||groupB.includes(r.studentId)&&!nextB.includes(r.studentId))))
  throw new Error('Cette préparation modifierait un groupe qui contient déjà des chronos.');
 const studentIds=[...new Set([...nextA,...nextB])];
 const byId=<T extends {id:string}>(previous:T[],incoming:T[])=>{
  const map=new Map(previous.map(x=>[x.id,x]));
  for(const item of incoming)map.set(item.id,item);
  return [...map.values()];
 };
 const next={...data,students:byId(data.students,p.students),sequences:byId(data.sequences,[p.sequence]),
  sessions:byId(data.sessions,[{...p.session,studentIds}]),courses:byId(data.courses,p.courses),version:data.version+1,updatedAt:Date.now()};
 return {data:next,config:{post:nextA.length&&nextB.length?'AB':p.post,sessionId:p.sessionId,studentIds,groupA:nextA,groupB:nextB,transferKey:p.transferKey}};
}
export function exportTimes(data:Data,config:OfflineConfig,post?:'A'|'B'):TimesPack{
 const source=post??(config.post==='A'||config.post==='B'?config.post:undefined);
 if(!source||!['A','B','AB'].includes(config.post))throw new Error('Choisissez le groupe de chronos A ou B.');
 const assigned=source==='A'?(config.groupA??(config.post==='A'?config.studentIds:[])):(config.groupB??(config.post==='B'?config.studentIds:[]));
 if(!assigned.length)throw new Error(`Le groupe ${source} n’est pas installé sur cet appareil.`);
 const runs=data.runs.filter(r=>r.sessionId===config.sessionId&&assigned.includes(r.studentId));
 if(runs.some(r=>r.end===undefined))throw new Error('Des chronos sont encore en cours. Arrêtez-les avant cet export.');
 return {kind:'orun-times-v1',post:source,sessionId:config.sessionId,createdAt:Date.now(),
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
