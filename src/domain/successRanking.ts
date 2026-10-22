import {elapsed} from './engine';
import type {Run} from './types';

export const validated=(r:Run)=>r.courseSnapshot.controls-(r.errors??0);
const corrected=(r:Run)=>r.end!==undefined&&r.errors!==null;
// A map whose length or control count changed is a different comparison group.
export const routeKey=(r:Run)=>JSON.stringify([r.courseSnapshot.familyId||r.courseId,r.courseSnapshot.controls,r.courseSnapshot.distance]);
export function rankRoute(runs:Run[]){
 const best=new Map<string,Run>();
 const compare=(a:Run,b:Run)=>validated(b)-validated(a)||elapsed(a)-elapsed(b);
 for(const r of runs.filter(corrected)){const old=best.get(r.studentId);if(!old||compare(r,old)<0)best.set(r.studentId,r);}
 const sorted=[...best.values()].sort((a,b)=>compare(a,b)||a.studentId.localeCompare(b.studentId));let rank=0;
 return sorted.map((run,i)=>{if(!i||compare(run,sorted[i-1])!==0)rank=i+1;return {run,rank,found:validated(run),expected:run.courseSnapshot.controls};});
}
export interface SuccessTotal{studentId:string;found:number;expected:number;passages:number;pending:number;rank:number|null;}
export function rankOverall(runs:Run[]):SuccessTotal[]{
 const totals=new Map<string,SuccessTotal>();
 for(const r of runs.filter(r=>r.end!==undefined)){
  let t=totals.get(r.studentId);if(!t){t={studentId:r.studentId,found:0,expected:0,passages:0,pending:0,rank:null};totals.set(r.studentId,t);}
  t.passages++;if(r.errors===null){t.pending++;continue;}t.found+=validated(r);t.expected+=r.courseSnapshot.controls;
 }
 const ratioCompare=(a:SuccessTotal,b:SuccessTotal)=>b.found*a.expected-a.found*b.expected;
 const sorted=[...totals.values()].sort((a,b)=>Number(b.expected>0)-Number(a.expected>0)||ratioCompare(a,b)||a.studentId.localeCompare(b.studentId));
 let rank=0;return sorted.map((t,i)=>{if(t.expected){if(!i||ratioCompare(t,sorted[i-1])!==0)rank=i+1;t.rank=rank;}return t;});
}
export const successPercent=(found:number,expected:number)=>expected?`${(100*found/expected).toLocaleString('fr-FR',{maximumFractionDigits:1})} %`:'—';
