export type View = 'home'|'sequences'|'departures'|'arrivals'|'results'|'control'|'students'|'settings';
export type Role = 'teacher'|'departure'|'arrival';
export type Level = 1|2|3|4;
export interface Student {id:string; firstName:string; lastName:string; className:string; label?:string;}
export interface Rubric {enabled:boolean; useTime?:boolean; useControls?:boolean; thresholds:[number,number,number]; maxErrors:[number,number,number];}
export interface Course {id:string;familyId?:string; name:string; color:string; distance:number; controls:number; penalty:number; difficulty:string; rubric:Rubric; map?:{name:string;type:string;data:string};}
export interface Sequence {id:string;color?:string;name:string;period:string;objectives:string;classes:string[];archived:boolean;}
export interface Session {id:string;sequenceId:string;name:string;date:string;courseIds:string[];studentIds:string[];className?:string;}
export interface Pause {start:number;end?:number;}
export interface Run {id:string;studentId:string;sessionId:string;courseId:string;start:number;end?:number;pauses:Pause[];errors:number|null;manualLevel:Level|null;revision:number; courseSnapshot:Course; manualTimeMs?:number;}
export interface Audit {id:string;at:number;action:string;runId?:string;actor:string;detail:string;}
export interface OfflineCorrection {id:string;at:number;sessionId:string;studentId:string;courseId:string;attempt:number;errors:number;}
export type OfflinePost = 'solo'|'A'|'B'|'C';
export interface OfflineConfig {post:OfflinePost;sessionId:string;studentIds:string[];groupA?:string[];groupB?:string[];transferKey?:string;importedPosts?:Array<'A'|'B'>;}
export interface Data {schema:1;version:number;students:Student[];sequences:Sequence[];sessions:Session[];courses:Course[];runs:Run[];audit:Audit[];applied:string[];updatedAt:number;offlineCorrections?:OfflineCorrection[];}
export type Command =
 | {kind:'start';id:string;at:number;sessionId:string;courseId:string;students:string[];runIds:string[]}
 | {kind:'pause'|'resume'|'stop'|'reopen';id:string;at:number;runId:string;reason?:string}
 | {kind:'correct';id:string;at:number;runId:string;errors:number;expectedRevision:number;reason?:string;milliseconds?:number}
 | {kind:'adjustTime';id:string;at:number;runId:string;milliseconds:number;expectedRevision:number}
 | {kind:'level';id:string;at:number;runId:string;level:Level|null;expectedRevision:number;reason:string}
 | {kind:'config';id:string;at:number;baseVersion:number;students:Student[];sequences:Sequence[];sessions:Session[];courses:Course[];detail:string}
 | {kind:'deleteClass';id:string;at:number;className:string;baseVersion:number}
 | {kind:'purge';id:string;at:number;sessionId:string}
 | {kind:'offlineCorrect';id:string;at:number;sessionId:string;studentId:string;courseId:string;attempt:number;errors:number;milliseconds?:number};
export interface WavePlan {sessionId:string;courseId:string;queue:string[];size:number;interval:number;nextAt:number;paused:boolean;remaining?:number;sound:boolean;}
export const uid=()=>{if(typeof crypto.randomUUID==='function')return crypto.randomUUID();const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const h=[...bytes].map(b=>b.toString(16).padStart(2,'0')).join('');return `${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`;};
