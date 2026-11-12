import {sixRealReferences,classifyPunch} from '../src/domain/punchScan';
import {describe,it,expect} from 'vitest';
import {createLesson,newMap,copyLesson} from '../src/domain/classroom';
import {referenceForCourse,validCorrection,canScanCourse} from '../src/domain/correctionModels';
import {apply} from '../src/domain/engine';
import {demo} from '../src/domain/demo';
describe('modèles de correction persistants',()=>{
 it('crée les six cartes du modèle et conserve leur référence après renommage et copie',()=>{
  const {data,session}=createLesson(demo(),'5e Aurore','Scan','2026-11-12',undefined,undefined,{cards:6,controls:6,correctionModel:'cards-6'});
  const courses=data.courses.filter(c=>session.courseIds.includes(c.id));expect(courses.map(c=>c.correction)).toEqual([1,2,3,4,5,6].map(reference=>({model:'cards-6',reference})));
  courses[1].name='Parcours du stade';expect(referenceForCourse(courses[1])).toBe(2);
  const copied=createLesson(data,'5e Aurore','Copie','2026-11-13',copyLesson(data,session));expect(copied.data.courses.filter(c=>copied.session.courseIds.includes(c.id)).map(c=>c.correction)).toEqual(courses.map(c=>c.correction));
  const started=apply(data,{kind:'start',id:'scan-start',at:123456,sessionId:session.id,courseId:courses[1].id,students:[session.studentIds[0]],runIds:['scan-run']});expect(started.runs.at(-1)!.courseSnapshot.correction).toEqual({model:'cards-6',reference:2});
 });
 it('refuse un modèle incompatible et préserve les anciennes cartes',()=>{
  expect(validCorrection(newMap(1))).toBe(true);expect(referenceForCourse(newMap(4))).toBe(4);expect(canScanCourse(newMap(1))).toBe(true);
  const c={...newMap(1),correction:{model:'cards-6' as const,reference:2}};
  expect(validCorrection(c)).toBe(true);expect(validCorrection({...c,controls:3})).toBe(false);expect(validCorrection({...c,correction:{...c.correction,reference:7}})).toBe(false);
  expect(()=>createLesson(demo(),'5e Aurore','Scan','2026-11-12',undefined,undefined,{cards:7,controls:6,correctionModel:'cards-6'})).toThrow();
 });
 it('propose les variantes 3 et 4 balises en manuel sans inventer de poinçons',()=>{
  for(const controls of [3,4]){
   const {data,session}=createLesson(demo(),'5e Aurore','Manuel','2026-11-12',undefined,undefined,{cards:6,controls,correctionModel:controls===3?'cards-3':'cards-4'});
   const courses=data.courses.filter(c=>session.courseIds.includes(c.id));expect(courses.every(c=>validCorrection(c)&&!canScanCourse(c))).toBe(true);
  }
 });
});

it('conserve les 36 motifs complets et ne valide pas un poinçon incomplet',()=>{
 expect(sixRealReferences.map(row=>row.map(p=>p.length))).toEqual([[6,3,8,6,7,4],[6,3,5,4,5,8],[6,9,5,3,5,5],[5,5,3,4,5,5],[4,2,4,3,8,4],[6,5,6,3,4,6]]);
 const p=sixRealReferences[0][0];expect(classifyPunch(p.slice(1),p).status).toBe('review');expect(classifyPunch(sixRealReferences[1][0],p).status).toBe('review');
});
