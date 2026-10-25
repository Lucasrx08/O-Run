import {apply} from '../domain/engine';
import {demo,emptyData} from '../domain/demo';
import type {Command,Data,Role} from '../domain/types';
import type {OfflineConfig} from '../domain/types';
import {importSessionPack as combineSession,mergeTimes as combineTimes,type TimesPack} from '../domain/offline';
export interface Workspace {data:Data;pending:Command[];room:string|null;role?:Role;offline?:OfflineConfig;}
interface RecordValue {revision:number;payload?:Workspace;cipher?:ArrayBuffer;iv?:Uint8Array;salt?:Uint8Array;}
let dbPromise:Promise<IDBDatabase>|null=null;let key:CryptoKey|null=null;let keySalt:Uint8Array|undefined;
export class LockedError extends Error {constructor(){super('Cet espace est verrouillé.');}}
function db(){return dbPromise??=new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('orun-v1',1);r.onupgradeneeded=()=>r.result.createObjectStore('workspace');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function readRecord():Promise<RecordValue|undefined>{const d=await db();return new Promise((resolve,reject)=>{const r=d.transaction('workspace').objectStore('workspace').get('main');r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function derive(password:string,salt:Uint8Array):Promise<CryptoKey>{const base=await crypto.subtle.importKey('raw',new TextEncoder().encode(password),'PBKDF2',false,['deriveKey']);return crypto.subtle.deriveKey({name:'PBKDF2',salt:salt as BufferSource,iterations:310000,hash:'SHA-256'},base,{name:'AES-GCM',length:256},false,['encrypt','decrypt']);}
async function decode(r:RecordValue):Promise<Workspace>{if(r.cipher){if(!key)throw new LockedError();try{return JSON.parse(new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:r.iv as BufferSource},key,r.cipher)));}catch{key=null;throw new LockedError();}}return r.payload!;}
async function encode(w:Workspace,revision:number):Promise<RecordValue>{if(!key)return {revision,payload:w};const iv=crypto.getRandomValues(new Uint8Array(12));return {revision,salt:keySalt,iv,cipher:await crypto.subtle.encrypt({name:'AES-GCM',iv},key,new TextEncoder().encode(JSON.stringify(w)))};}
async function cas(expected:number,record:RecordValue){const d=await db();return new Promise<boolean>((resolve,reject)=>{const tx=d.transaction('workspace','readwrite');const s=tx.objectStore('workspace');const q=s.get('main');let saved=false;q.onsuccess=()=>{if((q.result?.revision??-1)===expected){s.put(record,'main');saved=true;}};tx.oncomplete=()=>resolve(saved);tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error??new Error('Enregistrement interrompu.'));});}
export async function mutate(fn:(w:Workspace)=>Workspace):Promise<Workspace>{for(let i=0;i<8;i++){const old=await readRecord();const w=old?await decode(old):{data:emptyData(),pending:[],room:null};const next=fn(w);const record=await encode(next,(old?.revision??-1)+1);if(await cas(old?.revision??-1,record))return next;}throw new Error('Le stockage est occupé par un autre onglet. Réessayez.');}
export async function loadWorkspace(){const r=await readRecord();return r?decode(r):mutate(w=>w);}
export async function execute(command:Command,role:Role='teacher'){return mutate(w=>{const next=apply(w.data,command,role);return {...w,data:next,room:null,pending:w.pending};});}
export async function setOfflineConfig(offline:OfflineConfig){
 return mutate(w=>({...w,room:null,offline}));
}
export async function importOfflineSession(pack:unknown){
 return mutate(w=>{const result=combineSession(w.data,pack,w.offline);return {...w,data:result.data,room:null,offline:result.config};});
}
export async function mergeOfflineTimes(pack:TimesPack){
 let outcome={added:0,matched:0,withoutCorrection:0};
 const workspace=await mutate(w=>{if(!w.offline)throw new Error('Configurez d’abord le poste C.');const result=combineTimes(w.data,w.offline,pack);
  outcome={added:result.added,matched:result.matched,withoutCorrection:result.withoutCorrection};
  return {...w,data:result.data,room:null,offline:{...w.offline,importedPosts:[...new Set([...(w.offline.importedPosts||[]),pack.post])]}};});
 return {workspace,...outcome};
}
export async function acceptServer(room:string,data:Data,role:Role,exportedIds:string[]){return mutate(w=>{if(w.room!==room)throw new Error('L’espace partagé a changé.');if(w.pending.some(c=>!exportedIds.includes(c.id)))throw new Error('De nouvelles opérations ont été enregistrées. Exportez à nouveau avant de reprendre l’état serveur.');return {data,pending:[],room,role};});}
export async function unlock(password:string){const r=await readRecord();if(!r?.salt)throw new Error('Aucun espace chiffré.');keySalt=r.salt;key=await derive(password,keySalt);return decode(r);}
export async function protect(password:string){if(password.length<12)throw new Error('Utilisez au moins 12 caractères.');const w=await loadWorkspace();const old=await readRecord();keySalt=crypto.getRandomValues(new Uint8Array(16));key=await derive(password,keySalt);if(!await cas(old!.revision,await encode(w,old!.revision+1))){key=null;throw new Error('Le stockage a changé. Réessayez.');}}
export function lock(){key=null;}
export async function isProtected(){return Boolean((await readRecord())?.cipher);}
export async function reset(){const old=await readRecord();key=null;keySalt=undefined;const w:Workspace={data:demo(),pending:[],room:null};if(!await cas(old?.revision??-1,{revision:(old?.revision??-1)+1,payload:w}))throw new Error('Un autre onglet modifie cet espace.');return w;}
export function validateBackup(raw:unknown):Data {
 if(!raw||typeof raw!=='object')throw new Error('Sauvegarde invalide.');const d=raw as Data;
 if(d.schema!==1||!['students','sessions','sequences','courses','runs','audit','applied'].every(k=>Array.isArray((d as unknown as Record<string,unknown>)[k])))throw new Error('Format de sauvegarde inconnu.');
 const clean:Data={schema:1,version:0,updatedAt:Date.now(),students:[],sessions:[],sequences:[],courses:[],runs:[],audit:[],applied:[]};
 apply(clean,{kind:'config',id:crypto.randomUUID(),at:Date.now(),baseVersion:0,students:d.students,sequences:d.sequences,sessions:d.sessions,courses:d.courses,detail:'Vérification'});
 const ids=new Set<string>();for(const r of d.runs){if(ids.has(r.id)||!d.students.some(s=>s.id===r.studentId)||!d.sessions.some(s=>s.id===r.sessionId)||!Number.isFinite(r.start)||(r.end!==undefined&&(!Number.isFinite(r.end)||r.end<r.start))||!r.courseSnapshot||!Array.isArray(r.pauses))throw new Error('Passage invalide dans la sauvegarde.');ids.add(r.id);let last=r.start;for(const p of r.pauses){if(!Number.isFinite(p.start)||p.start<last||(p.end!==undefined&&(!Number.isFinite(p.end)||p.end<p.start))||(r.end!==undefined&&(p.end===undefined||p.end>r.end)))throw new Error('Pauses incohérentes.');last=p.end??Infinity;}if(r.errors!==null&&(!Number.isInteger(r.errors)||r.errors<0||r.errors>r.courseSnapshot.controls))throw new Error('Correction invalide.');}
 if(d.runs.some(r=>r.manualTimeMs!==undefined&&(r.end===undefined||!Number.isInteger(r.manualTimeMs)||r.manualTimeMs<100||r.manualTimeMs>24*60*60*1000)))throw new Error('Temps rectifié invalide dans la sauvegarde.');
 if(new Set(d.runs.filter(r=>r.end===undefined).map(r=>r.studentId)).size!==d.runs.filter(r=>r.end===undefined).length)throw new Error('Plusieurs passages actifs pour un élève.');return d;
}
