import type {Data,OfflineConfig} from './types';
export const isTabletPost=(post?:string)=>['A','B','AB'].includes(post||'');
export function validStation(data:Data,c:OfflineConfig){return !!c&&['solo','A','B','AB','C'].includes(c.post)&&Array.isArray(c.studentIds)&&new Set(c.studentIds).size===c.studentIds.length&&data.sessions.some(s=>s.id===c.sessionId)&&c.studentIds.every(id=>data.students.some(s=>s.id===id)&&data.sessions.find(s=>s.id===c.sessionId)!.studentIds.includes(id))&&[c.groupA,c.groupB].every(ids=>ids===undefined||Array.isArray(ids)&&new Set(ids).size===ids.length&&ids.every(id=>c.studentIds.includes(id)))&&(!c.transferKey||/^[a-f0-9]{64}$/.test(c.transferKey));}
export function stationProfiles(data:Data,previous:OfflineConfig[]=[],...configs:(OfflineConfig|undefined)[]){
 const profiles=new Map(previous.map(c=>[`${c.sessionId}:${c.post}`,c]));
 for(const c of configs)if(c)profiles.set(`${c.sessionId}:${c.post}`,structuredClone(c));
 return [...profiles.values()].filter(c=>validStation(data,c));
}
export function ensureStationChange(data:Data,current?:OfflineConfig,target?:OfflineConfig){
 const active=data.runs.filter(r=>r.end===undefined);
 if(!active.length)return;
 const same=current&&target&&current.sessionId===target.sessionId&&current.post===target.post&&current.transferKey===target.transferKey&&(!isTabletPost(target.post)||active.every(r=>r.sessionId===target.sessionId&&target.studentIds.includes(r.studentId)));
 const adding=current&&target&&isTabletPost(current.post)&&isTabletPost(target.post)&&current.sessionId===target.sessionId&&current.transferKey===target.transferKey&&current.studentIds.every(id=>target.studentIds.includes(id));
 if(same||adding)return;
 throw new Error('Arrêtez les chronos en cours avant de changer de poste ou de leçon. Les données restent conservées.');
}
