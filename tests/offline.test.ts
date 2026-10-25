import {describe,it,expect} from 'vitest';
import {createClass,addClassStudents,createLesson} from '../src/domain/classroom';
import {emptyData} from '../src/domain/demo';
import {apply,elapsed,parseTime} from '../src/domain/engine';
import {alphabeticalStudents,splitAlphabetical,createSessionPack,importSessionPack,exportTimes,mergeTimes} from '../src/domain/offline';
import type {Data,OfflineConfig,Student} from '../src/domain/types';
import {openTimes,sealTimes} from '../src/services/offlineTransfer';

function fixture(){
 let data=createClass(emptyData(),'3e Alphas',()=> 'seq');
 const names=['Martin','André','Zola','Bernard','Garcia','Durand','Petit'];
 const pupils:Student[]=names.map((lastName,i)=>({id:`student-${i}`,firstName:'Élève',lastName,className:'3e Alphas'}));
 data=addClassStudents(data,'3e Alphas',pupils);
 const created=createLesson(data,'3e Alphas','Leçon test','2026-10-24',undefined,(()=>{let n=0;return ()=>`id-${++n}`})(),{cards:6,controls:6});
 return {data:created.data,session:created.session,pupils};
}
const transferKey='ab'.repeat(32);

describe('Séance hors ligne A/B/C',()=>{
 it('répartit les élèves en deux moitiés alphabétiques équilibrées',()=>{
  const {data,session}=fixture();
  const sorted=alphabeticalStudents(data,session.id).map(s=>s.lastName);
  expect(sorted).toEqual(['André','Bernard','Durand','Garcia','Martin','Petit','Zola']);
  const split=splitAlphabetical(data,session.id);
  expect(split.A).toHaveLength(4);expect(split.B).toHaveLength(3);
  expect(split.A.map(id=>data.students.find(s=>s.id===id)!.lastName)).toEqual(sorted.slice(0,4));
  const moved=splitAlphabetical(data,session.id,split.A.slice(0,3));
  expect(moved.A).toHaveLength(3);expect(moved.B).toHaveLength(4);
 });
 it('prépare chaque tablette avec les mêmes identifiants de classe, de cartes et d’élèves',()=>{
  const {data,session}=fixture(),split=splitAlphabetical(data,session.id);
  const p=createSessionPack(data,session.id,'A',split.A,transferKey);
  const imported=importSessionPack(emptyData(),p);
  expect(imported.config).toMatchObject({post:'A',studentIds:split.A,sessionId:session.id});
  expect(imported.data.students.map(s=>s.id)).toEqual(split.A);
  expect(imported.data.students.every(s=>s.lastName.length===1)).toBe(true);
  expect(imported.data.sessions[0].courseIds).toEqual(session.courseIds);
  expect(imported.data.courses).toHaveLength(6);
 });
 it('fusionne les temps reçus après les corrections, sans doublons ni écrasement',()=>{
  const {data,session}=fixture(),split=splitAlphabetical(data,session.id);
  const central:OfflineConfig={post:'C',sessionId:session.id,studentIds:session.studentIds,groupA:split.A,groupB:split.B,transferKey};
  const p=createSessionPack(data,session.id,'A',split.A,transferKey);
  const tablet=importSessionPack(emptyData(),p);
  const studentId=split.A[0],courseId=session.courseIds[0];
  const start=apply(tablet.data,{kind:'start',id:'op-start',at:100000,sessionId:session.id,courseId,students:[studentId],runIds:['run-1']});
  const ended=apply(start,{kind:'stop',id:'op-stop',at:460000,runId:'run-1'});
  const corrected=apply(data,{kind:'offlineCorrect',id:'correction-1',at:470000,sessionId:session.id,studentId,courseId,attempt:1,errors:2});
  expect(corrected.runs).toHaveLength(0);expect(corrected.offlineCorrections).toHaveLength(1);
  const packet=exportTimes(ended,tablet.config);
  const merged=mergeTimes(corrected,central,packet);
  expect(merged.added).toBe(1);expect(merged.matched).toBe(1);
  expect(merged.data.runs[0]).toMatchObject({id:'run-1',errors:2,start:100000,end:460000});
  const again=mergeTimes(merged.data,central,packet);
  expect(again.added).toBe(0);expect(again.data.runs).toHaveLength(1);
  expect(again.data.offlineCorrections).toEqual(corrected.offlineCorrections);
  const retouched=apply(again.data,{kind:'offlineCorrect',id:'correction-time',at:480000,sessionId:session.id,studentId,courseId,attempt:1,errors:1,milliseconds:84500});
  expect(retouched.runs[0].errors).toBe(1);
  expect(elapsed(retouched.runs[0])).toBe(84500);
  expect(retouched.audit.at(-1)?.detail).toContain('Chrono rectifié');
 });
 it('rejette les fichiers mal affectés et les chronos modifiés',()=>{
  const {data,session}=fixture(),split=splitAlphabetical(data,session.id);
  const c:OfflineConfig={post:'C',sessionId:session.id,studentIds:session.studentIds,groupA:split.A,groupB:split.B,transferKey};
  const bad={kind:'orun-times-v1',post:'A',sessionId:session.id,createdAt:5,runs:[{id:'r',studentId:split.B[0],courseId:session.courseIds[0],start:100,end:200,pauses:[]}]};
  expect(()=>mergeTimes(data,c,bad)).toThrow(/mauvaise tablette/);
  expect(()=>mergeTimes(data,c,{...bad,sessionId:'autre'})).toThrow(/autre leçon/);
 });
 it('chiffre les fichiers de temps et refuse une autre clé de séance',async()=>{
  const {data,session}=fixture(),split=splitAlphabetical(data,session.id);
  const a:OfflineConfig={post:'A',sessionId:session.id,studentIds:split.A,transferKey};
  const c:OfflineConfig={post:'C',sessionId:session.id,studentIds:session.studentIds,groupA:split.A,groupB:split.B,transferKey};
  const pack=exportTimes(data,a),sealed=await sealTimes(pack,a);
  expect(sealed).not.toContain('student-');
  expect(await openTimes(sealed,c)).toEqual(pack);
  await expect(openTimes(sealed,{...c,transferKey:'cd'.repeat(32)})).rejects.toThrow(/déchiffrer/);
 });
});
it('corrige les temps saisis en minutes:secondes et rejette les valeurs invalides',()=>{
 expect(parseTime('01:24.5')).toBe(84500);expect(parseTime('1:24,5')).toBe(84500);
 expect(parseTime('13.2')).toBe(13200);
 expect(()=>parseTime('01:75')).toThrow();
 expect(()=>parseTime('abc')).toThrow();
});
