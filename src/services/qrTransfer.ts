import {compressSync,decompressSync,strToU8,strFromU8} from 'fflate';
import {exportTimes,validateSessionPack,type SessionPack,type TimesPack} from '../domain/offline';
import type {Data,OfflineConfig} from '../domain/types';

type Kind='P'|'T';
export interface QRFrame {kind:Kind;index:number;total:number;part:string;}
const MAX_PART=1450;
const textEncode=(s:string)=>strToU8(s);
const toB64=(a:Uint8Array)=>btoa(Array.from(a,b=>String.fromCharCode(b)).join('')).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
const fromB64=(s:string)=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')+'='.repeat((4-s.length%4)%4)),c=>c.charCodeAt(0));
const hexKey=(key:string)=>Uint8Array.from(key.match(/.{2}/g)!.map(pair=>parseInt(pair,16)));
async function sessionKey(config:OfflineConfig){
 if(!config.transferKey||!/^([a-f0-9]{64})$/.test(config.transferKey))throw new Error('Clé de la leçon absente. Préparez le poste C.');
 return crypto.subtle.importKey('raw',hexKey(config.transferKey) as BufferSource,'AES-GCM',false,['encrypt','decrypt']);
}
export function createQRFrames(kind:Kind,payload:string):string[]{
 if(!payload||payload.length>150000)throw new Error('Transfert QR trop volumineux.');
 const count=Math.ceil(payload.length/MAX_PART);
 if(count>24)throw new Error('Trop de données pour un transfert QR. Utilisez le fichier de secours.');
 return Array.from({length:count},(_,i)=>`ORUN1|${kind}|${i+1}|${count}|${payload.slice(i*MAX_PART,(i+1)*MAX_PART)}`);
}
export function parseQRFrame(raw:string):QRFrame{
 const m=/^ORUN1\|([PT])\|(\d{1,2})\|(\d{1,2})\|([A-Za-z0-9_-]+)$/.exec(raw.trim());
 if(!m)throw new Error('Ce QR code ne provient pas d’O’Run.');
 const index=Number(m[2]),total=Number(m[3]);
 if(total<1||total>24||index<1||index>total||m[4].length>MAX_PART)throw new Error('QR code incomplet ou invalide.');
 return {kind:m[1] as Kind,index,total,part:m[4]};
}
export function encodePreparationQR(pack:SessionPack):string[]{
 return createQRFrames('P',toB64(compressSync(textEncode(JSON.stringify(validateSessionPack(pack))),{level:9})));
}
export function decodePreparationQR(payload:string):SessionPack{
 try{return validateSessionPack(JSON.parse(strFromU8(decompressSync(fromB64(payload)))));}
 catch{throw new Error('Préparation QR illisible ou incomplète.');}
}
/** The timing QR transmits only identifiers by position, times and pause deltas.
 * Student names, course details and the session key are never encoded in a timing QR. */
export async function encodeTimingQR(data:Data,config:OfflineConfig,group:'A'|'B'):Promise<string[]>{
 const pack=exportTimes(data,config,group);
 const session=data.sessions.find(s=>s.id===config.sessionId);
 if(!session)throw new Error('Leçon introuvable.');
 const pupils=group==='A'?config.groupA:config.groupB;
 if(!pupils?.length)throw new Error('Groupe de la tablette introuvable.');
 const origin=pack.runs.length?Math.min(...pack.runs.map(r=>r.start)):0;
 const entries=pack.runs.map(run=>{
  const sid=pupils.indexOf(run.studentId),cid=session.courseIds.indexOf(run.courseId);
  if(sid<0||cid<0)throw new Error('Un chrono est affecté à une autre tablette.');
  const pauses=run.pauses.map(p=>[p.start-run.start,p.end!-run.start]);
  return [sid,cid,run.start-origin,run.end-run.start,pauses] as const;
 });
 const compact=JSON.stringify([1,group,config.sessionId,origin,entries]);
 const compressed=compressSync(textEncode(compact),{level:9});
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const encrypted=new Uint8Array(await crypto.subtle.encrypt({name:'AES-GCM',iv},await sessionKey(config),compressed as BufferSource));
 const combined=new Uint8Array(iv.length+encrypted.length);combined.set(iv);combined.set(encrypted,iv.length);
 return createQRFrames('T',toB64(combined));
}
export async function decodeTimingQR(payload:string,config:OfflineConfig,data:Data):Promise<TimesPack>{
 if(config.post!=='C')throw new Error('La récupération des chronos se fait sur le poste C.');
 let packet:unknown;
 try{
  const combined=fromB64(payload),iv=combined.slice(0,12),ciphertext=combined.slice(12);
  const plain=await crypto.subtle.decrypt({name:'AES-GCM',iv},await sessionKey(config),ciphertext as BufferSource);
  packet=JSON.parse(strFromU8(decompressSync(new Uint8Array(plain))));
 }catch{throw new Error('QR impossible à déchiffrer : autre leçon ou code incomplet.');}
 if(!Array.isArray(packet)||packet[0]!==1||!['A','B'].includes(packet[1])||packet[2]!==config.sessionId||
  !Number.isFinite(packet[3])||!Array.isArray(packet[4])||packet[4].length>500)
  throw new Error('Ce QR ne correspond pas à la leçon du poste C.');
 const group=packet[1] as 'A'|'B',origin=packet[3] as number,entries=packet[4] as unknown[];
 const students=group==='A'?config.groupA:config.groupB,session=data.sessions.find(s=>s.id===config.sessionId);
 if(!students?.length||!session)throw new Error('La répartition du poste C est introuvable.');
 const used=new Set<string>();
 const runs=entries.map(raw=>{
  if(!Array.isArray(raw)||raw.length!==5)throw new Error('Chrono QR invalide.');
  const [studentIndex,courseIndex,startDelta,duration,pauses]=raw as [number,number,number,number,number[][]];
  if(!Number.isInteger(studentIndex)||!Number.isInteger(courseIndex)||!students[studentIndex]||!session.courseIds[courseIndex]||
   !Number.isInteger(startDelta)||startDelta<0||!Number.isInteger(duration)||duration<0||duration>24*60*60*1000||
   !Array.isArray(pauses)||pauses.some(p=>!Array.isArray(p)||p.length!==2||p.some(v=>!Number.isInteger(v))))
   throw new Error('Chrono QR incohérent.');
  const studentId=students[studentIndex],courseId=session.courseIds[courseIndex],route=`${studentId}:${courseId}`;
  if(used.has(route))throw new Error('Une carte apparaît plusieurs fois dans le QR.');used.add(route);
  const start=origin+startDelta,end=start+duration;
  return {id:`qr1-${group}-${config.sessionId}-${studentId}-${courseId}`,studentId,courseId,start,end,
   pauses:pauses.map(p=>({start:start+p[0],end:start+p[1]}))};
 });
 return {kind:'orun-times-v1',sessionId:config.sessionId,post:group,createdAt:Date.now(),runs};
}
