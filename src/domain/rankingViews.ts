import {elapsed} from './engine';
import type {Run} from './types';
import {routeKey} from './successRanking';
export type RankingMetric='success'|'time'|'errors'|'combined';
export interface PupilRanking{studentId:string;rank:number|null;found:number;expected:number;errors:number;averageTime:number;averageErrors:number;passages:number;pending:number;lessons:number;}
/** Absences and unattempted maps never create a row or denominator. */
export function rankPupils(runs:Run[],metric:RankingMetric='success'):PupilRanking[]{
 const totals=new Map<string,PupilRanking>();
 for(const r of runs){if(r.end===undefined)continue;let t=totals.get(r.studentId);if(!t){t={studentId:r.studentId,rank:null,found:0,expected:0,errors:0,averageTime:0,averageErrors:0,passages:0,pending:0,lessons:0};totals.set(r.studentId,t);}if(r.errors===null){t.pending++;continue;}t.passages++;t.expected+=r.courseSnapshot.controls;t.errors+=r.errors;t.found+=r.courseSnapshot.controls-r.errors;t.averageTime+=elapsed(r);}
 for(const t of totals.values()){t.averageTime=t.passages?t.averageTime/t.passages:0;t.averageErrors=t.passages?t.errors/t.passages:0;t.lessons=new Set(runs.filter(r=>r.studentId===t.studentId&&r.end!==undefined&&r.errors!==null).map(r=>r.sessionId)).size;}
 const rate=(a:PupilRanking,b:PupilRanking)=>b.found*a.expected-a.found*b.expected;
 const compare=(a:PupilRanking,b:PupilRanking)=>Number(b.passages>0)-Number(a.passages>0)||(metric==='time'?a.averageTime-b.averageTime:metric==='errors'?a.errors*b.expected-b.errors*a.expected:metric==='combined'?rate(a,b)||a.averageTime-b.averageTime:rate(a,b));
 const sorted=[...totals.values()].sort((a,b)=>compare(a,b)||a.studentId.localeCompare(b.studentId));let rank=0;
 return sorted.map((t,i)=>{if(t.passages){if(!i||compare(t,sorted[i-1]))rank=i+1;t.rank=rank;}return t;});
}
export const correctionQueue=(runs:Run[])=>runs.filter(r=>r.end!==undefined).slice().sort((a,b)=>Number(a.errors!==null)-Number(b.errors!==null)||(a.errors===null?(a.end!-b.end!):(b.end!-a.end!))||a.id.localeCompare(b.id));

export const idoceoColors={1:'#fb7c92',2:'#f6c48c',3:'#fee5a6',4:'#c7e0b9'} as const;
export const courseCountLevel=(count:number):1|2|3|4=>count>=4?4:count===3?3:count===2?2:1;
export const falseControlsLevel=(errors:number):1|2|3|4=>errors===0?4:errors<=2?3:errors<=4?2:1;
/** One card per pupil and lesson. A repeat keeps the best corrected attempt. */
export function rankedCards(runs:Run[]){const best=new Map<string,Run>();for(const r of runs){if(r.end===undefined||r.errors===null)continue;const key=JSON.stringify([r.studentId,r.sessionId,routeKey(r)]),old=best.get(key);if(!old||r.courseSnapshot.controls-r.errors>old.courseSnapshot.controls-old.errors!||r.errors===old.errors&&elapsed(r)<elapsed(old))best.set(key,r);}return [...best.values()];}
export function participationRanking(runs:Run[],metric:'general'|'beacons'='general'):PupilRanking[]{const selected=rankedCards(runs),totals=rankPupils(selected,'success');for(const t of totals)t.pending=runs.filter(r=>r.studentId===t.studentId&&r.end!==undefined&&r.errors===null).length;
 for(const id of new Set(runs.filter(r=>r.end!==undefined&&r.errors===null).map(r=>r.studentId)))if(!totals.some(t=>t.studentId===id))totals.push({studentId:id,rank:null,found:0,expected:0,errors:0,averageTime:0,averageErrors:0,passages:0,pending:runs.filter(r=>r.studentId===id&&r.end!==undefined&&r.errors===null).length,lessons:0});
 const compare=(a:PupilRanking,b:PupilRanking)=>Number(b.passages>0)-Number(a.passages>0)||(metric==='general'?b.passages-a.passages:0)||b.found-a.found||a.averageTime-b.averageTime;
 const sorted=totals.sort((a,b)=>compare(a,b)||a.studentId.localeCompare(b.studentId));let rank=0;return sorted.map((t,i)=>{if(t.passages){if(!i||compare(t,sorted[i-1]))rank=i+1;t.rank=rank;}return t;});}
