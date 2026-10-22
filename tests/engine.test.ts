import {describe,it,expect} from 'vitest';import {demo} from '../src/domain/demo';import {apply,elapsed,score,level,studentLabels,ranking,competitionKey} from '../src/domain/engine';import {importStudents,parseCSV,exportCSV,csvCell} from '../src/domain/csv';import type {Data,Command} from '../src/domain/types';
const T=1792410000000;
function initial(){const d=demo(T);d.runs=[];return d;}
function start(d=initial(),ids=['demo-student-1'],op='start-1',at=T){return apply(d,{kind:'start',id:op,at,sessionId:'session-2',courseId:'course-orange',students:ids,runIds:ids.map(id=>op+'-'+id)});}
function event(d:Data,kind:'pause'|'resume'|'stop',at:number,id:string=kind){return apply(d,{kind,id,at,runId:d.runs[0].id});}
function complete(){return event(start(),'stop',T+360000);}
describe('Chronométrage et état des passages',()=>{
 it('départ simultané avec un instant unique',()=>{const d=start(initial(),['demo-student-1','demo-student-2']);expect(d.runs).toHaveLength(2);expect(d.runs[0].start).toBe(d.runs[1].start);});
 it('les nouvelles vagues ne modifient pas les chronos existants',()=>{const d=start(start(),['demo-student-2'],'start-2',T+30000);expect(d.runs[0].start).toBe(T);expect(d.runs[1].start).toBe(T+30000);});
 it('empêche deux passages actifs pour le même élève',()=>expect(()=>start(start(),['demo-student-1'],'different')).toThrow(/déjà/));
 it('soustrait plusieurs pauses et fige la durée',()=>{let d=event(start(),'pause',T+60000);d=event(d,'resume',T+90000);d=event(d,'pause',T+120000,'pause2');d=event(d,'stop',T+150000);expect(elapsed(d.runs[0],T+900000)).toBe(90000);});
 it('une pause en cours est soustraite sans compteur',()=>{const d=event(start(),'pause',T+20000);expect(elapsed(d.runs[0],T+900000)).toBe(20000);});
 it('STOP est idempotent même avec deux identifiants distincts',()=>{const d=complete();const e=event(d,'stop',T+800000,'stop-again');expect(e).toBe(d);expect(e.runs[0].end).toBe(T+360000);});
 it('rejouer une opération ne crée pas une seconde écriture',()=>{const cmd:Command={kind:'start',id:'a',at:T,sessionId:'session-2',courseId:'course-orange',students:['demo-student-1'],runIds:['r']};const d=apply(initial(),cmd);expect(apply(d,cmd)).toBe(d);});
 it('permet plusieurs parcours successifs au même élève',()=>{const d=start(complete(),['demo-student-1'],'second',T+400000);expect(d.runs).toHaveLength(2);});
 it('rejette un instant antérieur au départ',()=>expect(()=>event(start(),'stop',T-1)).toThrow(/Horloge/));
 it('rejette une reprise sans pause',()=>expect(()=>event(start(),'resume',T+1000)).toThrow(/actif/));
 it('une sélection invalide est rejetée en totalité',()=>expect(()=>start(initial(),['demo-student-1','missing'])).toThrow(/absent/));
 it('le rechargement JSON conserve précisément le temps',()=>{const d=event(event(start(),'pause',T+1000),'resume',T+5000);const restored=JSON.parse(JSON.stringify(d));expect(elapsed(restored.runs[0],T+10000)).toBe(6000);});
 it('deux arrivées rapprochées conservent leurs instants propres',()=>{let d=start(initial(),['demo-student-1','demo-student-2']);d=apply(d,{kind:'stop',id:'stop1',at:T+10000,runId:d.runs[0].id});d=apply(d,{kind:'stop',id:'stop2',at:T+10020,runId:d.runs[1].id});expect(d.runs.map(r=>r.end)).toEqual([T+10000,T+10020]);});
});
describe('Correction indépendante, évaluation et droits',()=>{
 it('corriger n’altère ni le départ ni l’arrivée',()=>{const d=complete();const n=apply(d,{kind:'correct',id:'c',at:T+800000,runId:d.runs[0].id,errors:2,expectedRevision:1});expect(n.runs[0].end).toBe(d.runs[0].end);expect(n.runs[0].start).toBe(T);expect(score(n.runs[0])).toBe(420000);expect(n.audit.at(-1)?.detail).toContain('→ 2');});
 it('une correction concurrente obsolète est refusée',()=>{const d=complete();const c:Command={kind:'correct',id:'c',at:T+500000,runId:d.runs[0].id,errors:0,expectedRevision:1};const n=apply(d,c);expect(()=>apply(n,{...c,id:'other',errors:3})).toThrow(/autre poste/);});
 it('rejette les balises négatives, décimales ou surnuméraires',()=>{for(const errors of [-1,.5,9]){const d=complete();expect(()=>apply(d,{kind:'correct',id:'c',at:T+500000,runId:d.runs[0].id,errors,expectedRevision:1})).toThrow(/invalide/);}});
 it('un parcours sans barème ne crée pas de niveau',()=>{const r=complete().runs[0];r.errors=0;r.courseSnapshot.rubric.enabled=false;expect(level(r)).toBeNull();});
 it('attribue les quatre niveaux avec le barème défini',()=>{const r=complete().runs[0];r.errors=0;expect(level(r)).toBe(4);r.errors=1;expect(level(r)).toBe(3);r.errors=2;expect(level(r)).toBe(2);r.errors=5;expect(level(r)).toBe(1);});
 it('ne classe pas un passage non corrigé',()=>expect(ranking(complete().runs)).toHaveLength(0));
 it('attribue le même rang aux ex æquo',()=>{const d=complete();const r={...d.runs[0],errors:0};expect(ranking([r,{...r,id:'2'},{...r,id:'3',end:r.end!+1000}]).map(x=>x.rank)).toEqual([1,1,3]);});
 it('les barèmes différents constituent des groupes distincts',()=>{const a=complete().runs[0],b=structuredClone(a);b.courseSnapshot.distance=1400;expect(competitionKey(a)).not.toBe(competitionKey(b));});
 it('un rôle arrivées ne peut pas corriger',()=>{const d=complete();expect(()=>apply(d,{kind:'correct',id:'c',at:T,runId:d.runs[0].id,errors:0,expectedRevision:1},'arrival')).toThrow(/autorisation/);});
 it('un poste départs ne peut pas arrêter une course',()=>{const d=start();expect(()=>apply(d,{kind:'stop',id:'s',at:T+1000,runId:d.runs[0].id},'departure')).toThrow(/autorisation/);});
 it('une annulation d’arrivée nécessite un motif et laisse une trace',()=>{const d=complete();const c:Command={kind:'reopen',id:'undo',at:T+900000,runId:d.runs[0].id,reason:'Mauvaise tuile'};const n=apply(d,c);expect(n.runs[0].end).toBeUndefined();expect(n.audit.at(-1)?.detail).toContain('Mauvaise tuile');});
 it('un changement de parcours préserve le barème déjà utilisé',()=>{const d=start();const changed=structuredClone(d);changed.courses[0].penalty=90;const n=apply(d,{kind:'config',id:'cfg',at:T+1,baseVersion:d.version,students:changed.students,sequences:changed.sequences,sessions:changed.sessions,courses:changed.courses,detail:'barème'});expect(n.runs[0].courseSnapshot.penalty).toBe(30);});
});
describe('Identités et CSV',()=>{
 it('distingue les homonymes sans dévoiler les noms',()=>{const labels=studentLabels(demo(T).students);expect(labels.get('demo-student-4')).toBe('Lucas R. 1');expect(labels.get('demo-student-25')).toBe('Lucas R. 2');});
 it('lit les accents, BOM, séparateurs et champs entre guillemets',()=>{const res=importStudents('\uFEFFNOM;Prénom;Classe\r\n"DUPONT";"Éléa";"5e A; B"',[],()=> '1');expect(res.students[0].className).toBe('5e A; B');expect(res.students[0].firstName).toBe('Éléa');});
 it('détecte doublons et lignes incomplètes',()=>{const r=importStudents('NOM,Prénom,Classe\nDUPONT,Éléa,5e\nDupont,Eléa,5e\nMARTIN,,5e',[],()=>crypto.randomUUID());expect(r.students).toHaveLength(1);expect(r.duplicates).toBe(1);expect(r.invalid).toBe(1);});
 it('rejette les en-têtes manquants et les guillemets ouverts',()=>{expect(()=>importStudents('nom,prenom\nDUPONT,Anne',[],()=> '1')).toThrow(/Colonnes/);expect(()=>parseCSV('a,b\n"x,y')).toThrow(/Guillemets/);});
 it('neutralise les formules injectées dans un CSV',()=>{expect(csvCell('=IMPORTXML("x")')).toContain("'=IMPORTXML");expect(csvCell(' @SUM(1)')).toContain("' @");});
 it('exporte noms complets, ID stable et zéro balise explicite',()=>{const d=complete();d.runs[0].errors=0;const csv=exportCSV(d,d.runs);expect(csv.startsWith('\uFEFF')).toBe(true);expect(csv).toContain('"Delmas"');expect(csv).toContain('"demo-student-1"');expect(parseCSV(csv)[1][11]).toBe('0');});
});
