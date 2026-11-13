import {createSessionPack} from '../src/domain/offline';
import {describe,it,expect} from 'vitest';
import {demo} from '../src/domain/demo';
import {assignPoseDepose,judgePoseDepose,collectPoseDepose,poseDeposeRanking,validatePoseDepose,batchPoseDepose,comparePoseDeposeStudents} from '../src/domain/poseDepose';
import {createLesson,copyLesson} from '../src/domain/classroom';
import {apply} from '../src/domain/engine';
import {validateBackup} from '../src/services/storage';
import type {Data,Session} from '../src/domain/types';
const pupil=(n:number)=>`demo-student-${n}`;
function prepared(){const d=demo();const session:Session={...d.sessions[0],className:'5e Horizon',poseDepose:true,poseDeposeTasks:[]};d.sessions[0]=session;return {d,session};}
function ready(){let {d,session}=prepared();session=assignPoseDepose(session,'pose',[31,72],[pupil(1),pupil(2)]);session=assignPoseDepose(session,'verification',[31,72],[pupil(3),pupil(4)]);return {d,session};}
function data(d:Data,s:Session){return {...d,sessions:d.sessions.map(l=>l.id===s.id?s:l)};}
const total=(d:Data,id:string,s?:string)=>poseDeposeRanking(d,'5e Horizon',s).find(r=>r.student.id===id)!.total;
describe('pose-dépose : attributions et barème',()=>{
 for(const [pose,verification] of [[true,true],[false,true],[true,false],[false,false]])it(`attribue exactement ${pose?'+1':'−1'} en pose et ${verification?'+1':'−1'} en vérification à chaque membre`,()=>{
  let {d,session}=ready();const task=session.poseDeposeTasks![0];session=judgePoseDepose(session,31,task.revision,pose,verification);d=data(d,session);
  for(const n of [1,2])expect(total(d,pupil(n))).toBe(pose?1:-1);for(const n of [3,4])expect(total(d,pupil(n))).toBe(verification?1:-1);
 });
 it('ne compte pas les attributions non validées, conserve les points négatifs et recalcule une rectification sans cumul',()=>{
  let {d,session}=ready();expect(total(data(d,session),pupil(1))).toBe(0);session=judgePoseDepose(session,31,session.poseDeposeTasks![0].revision,false,false);expect(total(data(d,session),pupil(1))).toBe(-1);
  session=judgePoseDepose(session,31,session.poseDeposeTasks![0].revision,true,true);expect(total(data(d,session),pupil(1))).toBe(1);session=judgePoseDepose(session,31,session.poseDeposeTasks![0].revision,null,null);expect(total(data(d,session),pupil(1))).toBe(0);
 });
 it('sépare les scores de la leçon du cumul et ignore les autres classes',()=>{
  let {d,session}=ready();session=judgePoseDepose(session,31,session.poseDeposeTasks![0].revision,true,false);d=data(d,session);let second={...session,id:'pose-2'};second=judgePoseDepose(second,31,second.poseDeposeTasks![0].revision,false,true);d.sessions.push(second);d.sessions.push({...session,id:'wrong-class',className:'5e Aurore'});
  expect(total(d,pupil(1),session.id)).toBe(1);expect(total(d,pupil(1))).toBe(0);expect(total(d,pupil(3))).toBe(0);expect(poseDeposeRanking(d,'5e Horizon').filter(r=>r.total===0).every(r=>r.rank===1)).toBe(true);
 });
 it('remplace un groupe sans dupliquer les balises ni transférer les anciens points',()=>{
  let {d,session}=ready();session=judgePoseDepose(session,31,session.poseDeposeTasks![0].revision,true,true);session=assignPoseDepose(session,'pose',[31],[pupil(5)]);expect(session.poseDeposeTasks).toHaveLength(2);expect(total(data(d,session),pupil(1))).toBe(0);expect(total(data(d,session),pupil(5))).toBe(0);expect(total(data(d,session),pupil(3))).toBe(0);
 });
 it('refuse auto-vérification, groupe de quatre, élèves étrangers, mauvais numéro et validation périmée',()=>{
  const {session}=ready();expect(()=>assignPoseDepose(session,'verification',[31],[pupil(1)])).toThrow(/propre/);expect(()=>assignPoseDepose(session,'pose',[31],[pupil(1),pupil(2),pupil(3),pupil(4)])).toThrow();expect(()=>assignPoseDepose(session,'pose',[30],[pupil(1)])).toThrow();expect(()=>assignPoseDepose(session,'pose',[73],[pupil(1)])).toThrow();expect(()=>assignPoseDepose(session,'pose',[31],['unknown'])).toThrow();expect(()=>judgePoseDepose(session,31,999,true,true)).toThrow(/changé/);
 });
 it('préserve une attribution identique et les points déjà validés',()=>{
  let {session}=ready();session=judgePoseDepose(session,31,session.poseDeposeTasks![0].revision,true,true);expect(assignPoseDepose(session,'pose',[31],[pupil(2),pupil(1)])).toEqual(session);
 });
 it('suit le rangement sans modifier les scores',()=>{
  let {d,session}=ready();session=judgePoseDepose(session,31,session.poseDeposeTasks![0].revision,true,true);const before=total(data(d,session),pupil(1));session=collectPoseDepose(session,31,true);expect(session.poseDeposeTasks![0].collected).toBe(true);expect(total(data(d,session),pupil(1))).toBe(before);
 });
 it('sauvegarde les tâches dans la leçon, les valide à l’import et les efface lors de la purge de résultats',()=>{
  const {d,session}=ready(),withTasks=data(d,session);expect(validateBackup(JSON.parse(JSON.stringify(withTasks))).sessions[0].poseDeposeTasks).toEqual(session.poseDeposeTasks);
  const corrupt=structuredClone(withTasks);corrupt.sessions[0].poseDeposeTasks![0].beacon=12;expect(()=>validateBackup(corrupt)).toThrow();
  const purged=apply(withTasks,{kind:'purge',id:'purge-pose',at:Date.now(),sessionId:session.id});expect(purged.sessions[0].poseDeposeTasks).toEqual([]);
 });
 it('copie l’option de la leçon sans recopier les attributions ni les points',()=>{
  const {d,session}=ready();const {session:copy}=createLesson(data(d,session),'5e Horizon','Copie','2026-11-13',copyLesson(data(d,session),session));expect(copy.poseDepose).toBe(true);expect(copy.poseDeposeTasks).toBeUndefined();
 });
 it('refuse une sauvegarde avec deux entrées pour la même balise',()=>{const {session}=ready();session.poseDeposeTasks!.push({...session.poseDeposeTasks![0]});expect(()=>validatePoseDepose(session)).toThrow();});
});

it('garde les points pose-dépose sur le poste enseignant lors de la préparation des iPads de chrono',()=>{const {d,session}=ready();const pack=createSessionPack(data(d,session),session.id,'A',[pupil(1)],'ab'.repeat(32));expect(pack.session.poseDeposeTasks).toBeUndefined();expect(session.poseDeposeTasks).toHaveLength(2);});

it('accepte trois élèves par rôle et valide ou range plusieurs balises sans cumul',()=>{
 let {d,session}=prepared();session=assignPoseDepose(session,'pose',[31,32],[pupil(1),pupil(2),pupil(3)]);session=assignPoseDepose(session,'verification',[31],[pupil(4),pupil(5),pupil(6)]);
 session=batchPoseDepose(session,[31,32],'good');for(const n of [1,2,3])expect(total(data(d,session),pupil(n))).toBe(2);for(const n of [4,5,6])expect(total(data(d,session),pupil(n))).toBe(1);
 expect(session.poseDeposeTasks![1].verificationValid).toBeNull();const again=batchPoseDepose(session,[31,32],'good');expect(total(data(d,again),pupil(1))).toBe(2);
 const ranged=batchPoseDepose(again,[31,32],'collect');expect(ranged.poseDeposeTasks!.every(t=>t.collected)).toBe(true);expect(total(data(d,ranged),pupil(1))).toBe(2);
 const before=structuredClone(session);expect(()=>batchPoseDepose(session,[31,99],'good')).toThrow();expect(session).toEqual(before);expect(()=>assignPoseDepose(session,'verification',[31],[pupil(3)])).toThrow(/propre/);
});
it('trie les élèves par prénom avant le nom, sans tenir compte des accents',()=>{
 const student=(firstName:string,lastName:string)=>({id:firstName+lastName,firstName,lastName,className:'Test'});
 expect([student('Zoé','A'),student('Élodie','B'),student('Alice','Z'),student('Elodie','A')].sort(comparePoseDeposeStudents).map(s=>s.firstName+' '+s.lastName)).toEqual(['Alice Z','Elodie A','Élodie B','Zoé A']);
});
