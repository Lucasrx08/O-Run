import type {Data,PoseDeposeTask,Session,Student} from './types';
export const comparePoseDeposeStudents=(a:Student,b:Student)=>a.firstName.localeCompare(b.firstName,'fr',{sensitivity:'base',numeric:true})||a.lastName.localeCompare(b.lastName,'fr',{sensitivity:'base',numeric:true});
export const poseDeposeBeacons=Array.from({length:42},(_,i)=>31+i);
const ensure=(ok:unknown,message:string)=>{if(!ok)throw new Error(message);};
export function validatePoseDepose(session:Session){
 ensure(session.poseDepose===undefined||typeof session.poseDepose==='boolean','Option pose-dépose invalide.');
 const tasks=session.poseDeposeTasks||[];ensure(Array.isArray(tasks)&&tasks.length<=42&&new Set(tasks.map(t=>t.beacon)).size===tasks.length,'Attributions de balises invalides.');
 for(const t of tasks){
  ensure(Number.isInteger(t.beacon)&&t.beacon>=31&&t.beacon<=72,'Les balises vont de 31 à 72.');
  ensure(Array.isArray(t.placers)&&Array.isArray(t.verifiers)&&t.placers.length>=1&&t.placers.length<=3&&t.verifiers.length<=3,'Choisissez un à trois élèves par groupe.');
  for(const ids of [t.placers,t.verifiers])ensure(new Set(ids).size===ids.length&&ids.every(id=>session.studentIds.includes(id)),'Élève absent de la leçon ou sélectionné en double.');
  ensure(t.verifiers.every(id=>!t.placers.includes(id)),'Un élève ne peut pas vérifier sa propre balise.');
  ensure((t.placementValid===null||typeof t.placementValid==='boolean')&&(t.verificationValid===null||typeof t.verificationValid==='boolean')&&(!t.verifiers.length?t.verificationValid===null:true),'Validation pose-dépose invalide.');
  ensure(typeof t.collected==='boolean'&&Number.isInteger(t.revision)&&t.revision>=0,'Suivi pose-dépose invalide.');
 }
}
export function assignPoseDepose(session:Session,role:'pose'|'verification',beacons:number[],students:string[]):Session{
 ensure(session.poseDepose,'Activez pose-dépose dans les paramètres de la leçon.');
 ensure(students.length>=1&&students.length<=3&&new Set(students).size===students.length&&students.every(id=>session.studentIds.includes(id)),'Choisissez un à trois élèves de la leçon.');
 ensure(beacons.length>0&&new Set(beacons).size===beacons.length&&beacons.every(n=>Number.isInteger(n)&&n>=31&&n<=72),'Choisissez au moins une balise entre 31 et 72.');
 const tasks=structuredClone(session.poseDeposeTasks||[]);
 for(const beacon of beacons){
  let task=tasks.find(t=>t.beacon===beacon);
  if(role==='pose'){
   if(!task){task={beacon,placers:[],verifiers:[],placementValid:null,verificationValid:null,collected:false,revision:0};tasks.push(task);}
   const unchanged=task.placers.length===students.length&&students.every(id=>task!.placers.includes(id));if(unchanged)continue;
   task.placers=[...students];task.verifiers=task.verifiers.filter(id=>!students.includes(id));task.placementValid=null;task.verificationValid=null;task.collected=false;task.revision++;
  }else{
   ensure(task,'Attribuez la pose avant la vérification.');
   ensure(students.every(id=>!task!.placers.includes(id)),'Un élève ne peut pas vérifier sa propre balise.');
   if(task!.verifiers.length===students.length&&students.every(id=>task!.verifiers.includes(id)))continue;
   task!.verifiers=[...students];task!.verificationValid=null;task!.placementValid=null;task!.revision++;
  }
 }
 const next={...session,poseDeposeTasks:tasks.sort((a,b)=>a.beacon-b.beacon)};validatePoseDepose(next);return next;
}
export function judgePoseDepose(session:Session,beacon:number,revision:number,placementValid:boolean|null,verificationValid:boolean|null):Session{
 const task=session.poseDeposeTasks?.find(t=>t.beacon===beacon);ensure(task,'Balise non attribuée.');ensure(task!.revision===revision,'Cette balise a changé. Rouvrez sa validation.');
 const next={...session,poseDeposeTasks:session.poseDeposeTasks!.map(t=>t!==task?t:{...t,placementValid,verificationValid,revision:t.revision+1})};validatePoseDepose(next);return next;
}
export function collectPoseDepose(session:Session,beacon:number,collected:boolean):Session{
 ensure(session.poseDeposeTasks?.some(t=>t.beacon===beacon),'Balise non attribuée.');return {...session,poseDeposeTasks:session.poseDeposeTasks!.map(t=>t.beacon===beacon?{...t,collected,revision:t.revision+1}:t)};
}
export function poseDeposeRanking(data:Data,className:string,sessionId?:string){
 const students=data.students.filter(s=>s.className===className),rows=students.map(student=>({student,rank:0,pose:0,verification:0,total:0,good:0,wrong:0,pending:0,lessons:0}));
 const byId=new Map(rows.map(r=>[r.student.id,r]));
 for(const session of data.sessions.filter(s=>!sessionId||s.id===sessionId)){
  // Explicit classes isolate cumulative results; old mixed-class lessons use student membership.
  if(session.className&&session.className!==className)continue;
  const seen=new Set<string>();
  for(const task of session.poseDeposeTasks||[])for(const [ids,valid,key] of [[task.placers,task.placementValid,'pose'],[task.verifiers,task.verificationValid,'verification']] as const){
   for(const id of ids){const row=byId.get(id);if(!row)continue;seen.add(id);if(valid===null){row.pending++;continue;}const points=valid?1:-1;row[key]+=points;row.total+=points;if(valid)row.good++;else row.wrong++;}
  }
  for(const id of seen)byId.get(id)!.lessons++;
 }
 rows.sort((a,b)=>b.total-a.total||comparePoseDeposeStudents(a.student,b.student));
 let rank=0;return rows.map((r,i)=>{if(!i||r.total!==rows[i-1].total)rank=i+1;return {...r,rank};});
}

/** A batch is validated before any caller saves it; points are still derived from decisions. */
export function batchPoseDepose(session:Session,beacons:number[],action:'good'|'collect'):Session{
 ensure(beacons.length>0&&new Set(beacons).size===beacons.length&&beacons.every(n=>session.poseDeposeTasks?.some(t=>t.beacon===n)),'Sélection de balises invalide.');
 let next=session;for(const beacon of beacons){const task=next.poseDeposeTasks!.find(t=>t.beacon===beacon)!;next=action==='good'?judgePoseDepose(next,beacon,task.revision,true,task.verifiers.length?true:null):collectPoseDepose(next,beacon,true);}
 return next;
}
