import {stationProfiles,ensureStationChange,validStation} from '../domain/stations';
import {planLessonDevices} from '../domain/offline';
import {newTransferKey} from './offlineTransfer';
import {uid} from '../domain/types';
import {apply} from '../domain/engine';
import {demo,emptyData} from '../domain/demo';
import type {Command,Data,Role} from '../domain/types';
import type {OfflineConfig} from '../domain/types';
import {importSessionPack as combineSession,mergeTimes as combineTimes,type TimesPack} from '../domain/offline';
export interface Workspace {data:Data;pending:Command[];room:string|null;role?:Role;offline?:OfflineConfig;stationProfiles?:OfflineConfig[];}
interface RecordValue {revision:number;payload?:Workspace;cipher?:ArrayBuffer;iv?:Uint8Array;salt?:Uint8Array;savedAt?:number;label?:string;}
let dbPromise:Promise<IDBDatabase>|null=null;let key:CryptoKey|null=null;let keySalt:Uint8Array|undefined;
const WORKSPACE_MARKER='orun:has-workspace-v1';
function wasWorkspaceSaved(){try{return localStorage.getItem(WORKSPACE_MARKER)==='1';}catch{return false;}}
function markWorkspaceSaved(){try{localStorage.setItem(WORKSPACE_MARKER,'1');}catch{/* indexedDB remains the source of truth */}}

export class LockedError extends Error {constructor(){super('Cet espace est verrouillé.');}}
function db(){return dbPromise??=new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('orun-v1',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('workspace'))r.result.createObjectStore('workspace');};r.onsuccess=()=>{const database=r.result;database.onversionchange=()=>{database.close();dbPromise=null;};resolve(database);};r.onerror=()=>{dbPromise=null;reject(r.error);};r.onblocked=()=>{dbPromise=null;reject(new Error('Fermez les autres onglets O’Run puis réessayez.'));};});}
async function readRawRecord():Promise<RecordValue|undefined>{const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction('workspace').objectStore('workspace').get('main');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function checkpointRecords():Promise<{id:string;record:RecordValue}[]>{const d=await db();return new Promise((resolve,reject)=>{const s=d.transaction('workspace').objectStore('workspace'),out:{id:string;record:RecordValue}[]=[];const c=s.openCursor();c.onsuccess=()=>{const row=c.result;if(!row){resolve(out.sort((a,b)=>b.record.revision-a.record.revision||(b.record.savedAt||0)-(a.record.savedAt||0)));return;}if(String(row.key).startsWith('checkpoint:'))out.push({id:String(row.key),record:row.value});row.continue();};c.onerror=()=>reject(c.error);});}
function workspaceShape(w:Workspace){if(!w?.data||!['students','sessions','sequences','courses','runs','audit','applied'].every(k=>Array.isArray((w.data as unknown as Record<string,unknown>)[k]))||!Array.isArray(w.pending))throw new Error('Les données locales sont incomplètes. Une copie de secours est nécessaire.');return w;}
async function readRecord():Promise<RecordValue|undefined>{
 const main=await readRawRecord();
 if(main){try{await decode(main);return main;}catch(e){if(e instanceof LockedError)throw e;}}
 const copies=await checkpointRecords();
 for(const copy of copies){try{await decode(copy.record);const restored={...copy.record,revision:(main?.revision??copy.record.revision)+1};if(await cas(main?.revision??-1,restored,false))return restored;return readRecord();}catch(e){if(e instanceof LockedError)throw e;}}
 if(main||copies.length)throw new Error('Impossible de lire les données locales. Aucune donnée n’a été effacée.');
 if(wasWorkspaceSaved())throw new Error('Des classes étaient enregistrées sur cet appareil, mais le navigateur ne retrouve plus le stockage. L’application ne créera pas d’espace vide : tentez une restauration depuis une sauvegarde vérifiée.');
 return undefined;
}
async function derive(password:string,salt:Uint8Array):Promise<CryptoKey>{const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt:salt as BufferSource,iterations:310000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
async function decode(r:RecordValue):Promise<Workspace>{if(r.cipher){if(!key)throw new LockedError();try{return workspaceShape(JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:r.iv as BufferSource},key,r.cipher))));}catch{key=null;throw new LockedError();}}return workspaceShape(r.payload!);}
async function encode(w:Workspace,revision:number):Promise<RecordValue>{if(!key)return {revision,payload:w};const iv=crypto.getRandomValues(new Uint8Array(12));return {revision,salt:keySalt,iv,cipher:await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(w)))};}
async function cas(expected:number,record:RecordValue,checkpoint=true){const d=await db();return new Promise<boolean>((resolve,reject)=>{const tx=d.transaction('workspace','readwrite');const s=tx.objectStore('workspace');const q=s.get('main');let saved=false;q.onsuccess=()=>{if((q.result?.revision??-1)===expected){if(checkpoint&&q.result){const copy={...q.result,savedAt:Date.now(),label:'Copie automatique'};s.put(copy,`checkpoint:rolling:${Math.max(0,expected)%5}`);const day=Math.floor(Date.now()/86400000),id=`checkpoint:daily:${day%3}`;const daily=s.get(id);daily.onsuccess=()=>{if(Math.floor((daily.result?.savedAt||0)/86400000)!==day)s.put({...copy,label:'Copie quotidienne'},id);};}s.put({...record,savedAt:Date.now()},'main');saved=true;}};tx.oncomplete=()=>{if(saved)markWorkspaceSaved();resolve(saved);};tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??new Error('Enregistrement interrompu.'));});}
let activeWrites=0;const idleWaiters=new Set<()=>void>();
export async function waitForStorageIdle(){if(activeWrites)await new Promise<void>(resolve=>idleWaiters.add(resolve));}
export async function mutate(fn:(w:Workspace)=>Workspace):Promise<Workspace>{activeWrites++;try{for(let i=0;i<8;i++){const old=await readRecord();const w=old?await decode(old):{data:emptyData(),pending:[],room:null};const next=fn(w);if(old?.cipher&&!key)throw new LockedError();const record=await encode(next,(old?.revision??-1)+1);if(await cas(old?.revision??-1,record))return next;}throw new Error('Le stockage est occupé par un autre onglet. Réessayez.');}finally{activeWrites--;if(!activeWrites){for(const resolve of idleWaiters)resolve();idleWaiters.clear();}}}
export async function loadWorkspace(){const r=await readRecord();return r?decode(r):mutate(w=>w);}
export async function execute(command:Command,role:Role='teacher'){return mutate(w=>{const next=apply(w.data,command,role);return {...w,data:next,room:null,pending:w.pending};});}
export async function setOfflineConfig(offline:OfflineConfig){return mutate(w=>{if(!validStation(w.data,offline))throw new Error('La préparation de ce poste est invalide.');ensureStationChange(w.data,w.offline,offline);return {...w,room:null,stationProfiles:stationProfiles(w.data,w.stationProfiles,w.offline,offline),offline};});}
export async function leaveStation(){return mutate(w=>{ensureStationChange(w.data,w.offline);return {...w,room:null,stationProfiles:stationProfiles(w.data,w.stationProfiles,w.offline),offline:undefined};});}
export async function configureLessonDevices(sessionId:string,mode:1|2|3,groupA?:string[]){return mutate(w=>{
 const p=planLessonDevices(w.data,sessionId,mode,groupA,newTransferKey),config={...p.config,importedPosts:w.offline?.post==='C'&&w.offline.sessionId===sessionId?w.offline.importedPosts:[]};
 ensureStationChange(w.data,w.offline,config);
 const data=apply(w.data,{kind:'config',id:uid(),at:Date.now(),baseVersion:w.data.version,students:p.data.students,sequences:p.data.sequences,sessions:p.data.sessions,courses:p.data.courses,detail:`Organisation : ${mode} appareil(s)`});
 return {...w,data,offline:config,stationProfiles:stationProfiles(data,w.stationProfiles,w.offline,config),room:null};
});}
/** Secours après une ancienne version qui a écrasé le rôle de la tablette par C.
 * Ne touche jamais aux passages, à leur heure de départ ou à leur correction. */
export async function recoverTabletPost(post:'A'|'B'){
 return mutate(w=>{
  if(w.offline?.post!=='C')throw new Error('Cette récupération concerne uniquement un ancien poste A/B passé accidentellement en C.');
  const session=w.data.sessions.find(s=>s.id===w.offline!.sessionId);
  if(!session?.deviceKey)throw new Error('Clé de transfert introuvable. Ne supprimez pas cette leçon.');
  const runs=w.data.runs.filter(r=>r.sessionId===session.id);
  if(!runs.length)throw new Error('Aucun chrono à récupérer dans cette leçon.');
  const ids=session.studentIds.filter(id=>w.data.students.some(student=>student.id===id)).sort((a,b)=>{
   const pa=w.data.students.find(s=>s.id===a)!,pb=w.data.students.find(s=>s.id===b)!;
   return pa.lastName.localeCompare(pb.lastName,'fr',{sensitivity:'base'})||pa.firstName.localeCompare(pb.firstName,'fr',{sensitivity:'base'});
  });
  if(runs.some(r=>!ids.includes(r.studentId)))throw new Error('Un chrono concerne un élève absent de la répartition actuelle.');
  const offline:OfflineConfig={post,sessionId:session.id,studentIds:ids,groupA:post==='A'?ids:[],groupB:post==='B'?ids:[],transferKey:session.deviceKey,devices:session.deviceMode===2?2:3};
  return {...w,offline,stationProfiles:stationProfiles(w.data,w.stationProfiles,w.offline,offline),room:null};
 });
}
export async function importOfflineSession(pack:unknown){
 return mutate(w=>{const result=combineSession(w.data,pack,w.offline);ensureStationChange(w.data,w.offline,result.config);return {...w,data:result.data,room:null,offline:result.config,stationProfiles:stationProfiles(result.data,w.stationProfiles,w.offline,result.config)};});
}
export async function mergeOfflineTimes(pack:TimesPack){
 let outcome={added:0,matched:0,withoutCorrection:0};
 const workspace=await mutate(w=>{if(!w.offline)throw new Error('Configurez d’abord le poste C.');const result=combineTimes(w.data,w.offline,pack);
  outcome={added:result.added,matched:result.matched,withoutCorrection:result.withoutCorrection};
  return {...w,data:result.data,room:null,offline:{...w.offline,importedPosts:[...new Set([...(w.offline.importedPosts||[]),pack.post])]}};});
 return {workspace,...outcome};
}
export async function acceptServer(room:string,data:Data,role:Role,exportedIds:string[]){return mutate(w=>{if(w.room!==room)throw new Error('L’espace partagé a changé.');if(w.pending.some(c=>!exportedIds.includes(c.id)))throw new Error('De nouvelles opérations ont été enregistrées. Exportez à nouveau avant de reprendre l’état serveur.');return {data,pending:[],room,role};});}
export async function unlock(password:string){const r=await readRawRecord()||(await checkpointRecords())[0]?.record;if(!r?.salt)throw new Error('Aucun espace chiffré.');keySalt=r.salt;key=await derive(password,keySalt);await decode(r);return loadWorkspace();}
export async function protect(password:string){
 if(password.length<12)throw new Error('Utilisez au moins 12 caractères.');
 const w=await loadWorkspace(),old=await readRecord(),copies=await checkpointRecords(),decoded=await Promise.all(copies.map(async c=>({id:c.id,record:c.record,w:await decode(c.record)})));
 const previousKey=key,previousSalt=keySalt;try{
  keySalt=crypto.getRandomValues(new Uint8Array(16));key=await derive(password,keySalt);
  const main=await encode(w,old!.revision+1),encrypted=await Promise.all(decoded.map(async c=>({id:c.id,record:{...await encode(c.w,c.record.revision),savedAt:c.record.savedAt,label:c.record.label}})));
  const database=await db();await new Promise<void>((resolve,reject)=>{const tx=database.transaction('workspace','readwrite'),s=tx.objectStore('workspace'),q=s.get('main');q.onsuccess=()=>{if(q.result?.revision!==old!.revision){tx.abort();return;}for(const c of encrypted)s.put(c.record,c.id);s.put(main,'main');};tx.oncomplete=()=>resolve();tx.onabort=()=>reject(new Error('Le stockage a changé. Réessayez.'));tx.onerror=()=>reject(tx.error);});
 }catch(e){key=previousKey;keySalt=previousSalt;throw e;}
}
export function lock(){key=null;}
export async function isProtected(){return Boolean((await readRecord())?.cipher);}
export async function reset(){const old=await readRawRecord();key=null;keySalt=undefined;const w:Workspace={data:demo(),pending:[],room:null};const database=await db();await new Promise<void>((resolve,reject)=>{const tx=database.transaction('workspace','readwrite');tx.objectStore('workspace').clear();tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});if(!await cas(-1,{revision:0,payload:w},false))throw new Error('Un autre onglet modifie cet espace.');return w;}
export function validateBackup(raw:unknown):Data {
 if(!raw||typeof raw!=='object')throw new Error('Sauvegarde invalide.');const d=raw as Data;
 if(d.schema!==1||!['students','sessions','sequences','courses','runs','audit','applied'].every(k=>Array.isArray((d as unknown as Record<string,unknown>)[k])))throw new Error('Format de sauvegarde inconnu.');
 const clean:Data={schema:1,version:0,updatedAt:Date.now(),students:[],sessions:[],sequences:[],courses:[],runs:[],audit:[],applied:[]};
 apply(clean,{kind:'config',id:crypto.randomUUID(),at:Date.now(),baseVersion:0,students:d.students,sequences:d.sequences,sessions:d.sessions,courses:d.courses,detail:'Vérification'});
 const ids=new Set<string>();for(const r of d.runs){if(ids.has(r.id)||!d.students.some(s=>s.id===r.studentId)||!d.sessions.some(s=>s.id===r.sessionId)||!Number.isFinite(r.start)||(r.end!==undefined&&(!Number.isFinite(r.end)||r.end<r.start))||!r.courseSnapshot||!Array.isArray(r.pauses))throw new Error('Passage invalide dans la sauvegarde.');ids.add(r.id);let last=r.start;for(const p of r.pauses){if(!Number.isFinite(p.start)||p.start<last||(p.end!==undefined&&(!Number.isFinite(p.end)||p.end<p.start))||(r.end!==undefined&&(p.end===undefined||p.end>r.end)))throw new Error('Pauses incohérentes.');last=p.end??Infinity;}if(r.errors!==null&&(!Number.isInteger(r.errors)||r.errors<0||r.errors>r.courseSnapshot.controls))throw new Error('Correction invalide.');}
 if(d.runs.some(r=>r.manualTimeMs!==undefined&&(r.end===undefined||!Number.isInteger(r.manualTimeMs)||r.manualTimeMs<100||r.manualTimeMs>24*60*60*1000)))throw new Error('Temps rectifié invalide dans la sauvegarde.');
 if(new Set(d.runs.filter(r=>r.end===undefined).map(r=>r.studentId)).size!==d.runs.filter(r=>r.end===undefined).length)throw new Error('Plusieurs passages actifs pour un élève.');return d;
}

export async function saveCheckpoint(label='Avant mise à jour'){
 await waitForStorageIdle();const record=await readRecord();if(!record)return;const database=await db();await new Promise<void>((resolve,reject)=>{const tx=database.transaction('workspace','readwrite');tx.objectStore('workspace').put({...record,savedAt:Date.now(),label},'checkpoint:manual');tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});
}
export async function listCheckpoints(){const rows=await checkpointRecords();const out=[];for(const row of rows){try{const w=await decode(row.record);out.push({id:row.id,at:row.record.savedAt||w.data.updatedAt,label:row.record.label||'Copie de secours',classes:new Set(w.data.students.map(s=>s.className).concat(w.data.sequences.flatMap(q=>q.classes))).size,students:w.data.students.length,lessons:w.data.sessions.length});}catch(e){if(e instanceof LockedError)throw e;}}return out;}
export async function exportWorkspaceBackup(){const w=await loadWorkspace();return {kind:'orun-backup-v1',createdAt:Date.now(),data:w.data,offline:w.offline,stationProfiles:w.stationProfiles};}
export function readBackup(input:unknown):Workspace{
 const raw=input as {kind?:string;data?:Data;offline?:OfflineConfig;stationProfiles?:OfflineConfig[]};const data=validateBackup(raw?.kind==='orun-backup-v1'?raw.data:input);
 const configs=raw?.kind==='orun-backup-v1'?[...(Array.isArray(raw.stationProfiles)?raw.stationProfiles:[]),...(raw.offline?[raw.offline]:[])]:[];if(configs.some(c=>!validStation(data,c)))throw new Error('Un poste de cette sauvegarde est invalide.');return {data,pending:[],room:null,stationProfiles:stationProfiles(data,configs)};
}
export async function mergeBackup(input:unknown){const backup=readBackup(input);return mutate(w=>{
 const merge=<T extends {id:string}>(current:T[],incoming:T[])=>{const map=new Map(incoming.map(x=>[x.id,x]));for(const x of current)map.set(x.id,x);return [...map.values()];};
 const sessions=merge(w.data.sessions,backup.data.sessions).map(session=>{const current=w.data.sessions.find(s=>s.id===session.id),old=backup.data.sessions.find(s=>s.id===session.id);if(!current||!old||current.sequenceId!==old.sequenceId||current.className!==old.className)return session;const tasks=new Map((old.poseDeposeTasks||[]).map(t=>[t.beacon,t]));for(const t of current.poseDeposeTasks||[])tasks.set(t.beacon,t);return {...session,studentIds:[...new Set([...current.studentIds,...old.studentIds])],courseIds:[...new Set([...current.courseIds,...old.courseIds])],...(tasks.size?{poseDeposeTasks:[...tasks.values()].sort((a,b)=>a.beacon-b.beacon)}:{})};});
 const sequences=merge(w.data.sequences,backup.data.sequences).map(q=>({...q,classes:[...new Set([...q.classes,...(backup.data.sequences.find(old=>old.id===q.id)?.classes||[])])]}));
 const runs=merge(w.data.runs,backup.data.runs).filter(r=>!w.data.runs.some(x=>x.id!==r.id&&x.studentId===r.studentId&&x.end===undefined&&r.end===undefined));
 const data={...w.data,students:merge(w.data.students,backup.data.students),sequences,sessions,courses:merge(w.data.courses,backup.data.courses),runs,audit:merge(w.data.audit,backup.data.audit),applied:[...new Set([...w.data.applied,...backup.data.applied])],offlineCorrections:merge(w.data.offlineCorrections||[],backup.data.offlineCorrections||[]),version:w.data.version+1,updatedAt:Date.now()};
 validateBackup(data);return {...w,data,stationProfiles:stationProfiles(data,backup.stationProfiles,...(w.stationProfiles||[]),w.offline)};
});}
export async function recoverCheckpoint(id:string){const row=(await checkpointRecords()).find(r=>r.id===id);if(!row)throw new Error('Copie de secours introuvable.');const w=await decode(row.record);return mergeBackup({kind:'orun-backup-v1',data:w.data,stationProfiles:w.stationProfiles,offline:w.offline});}
