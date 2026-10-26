import 'fake-indexeddb/auto';import {describe,it,expect,beforeEach} from 'vitest';import {loadWorkspace,reset,execute,protect,lock,unlock,validateBackup,mutate,setOfflineConfig,recoverTabletPost} from '../src/services/storage';import {demo} from '../src/domain/demo';
describe('Persistance locale et chiffrement',()=>{
 beforeEach(async()=>{await reset();});
 it('enregistre puis recharge un départ',async()=>{const d=await loadWorkspace();await execute({kind:'start',id:'start',at:Date.now(),sessionId:'session-2',courseId:'course-orange',students:['demo-student-11'],runIds:['new']});const reloaded=await loadWorkspace();expect(reloaded.data.runs.find(r=>r.id==='new')).toBeTruthy();expect(reloaded.pending).toHaveLength(0);});
 it('conserve deux mutations concurrentes de deux postes locaux',async()=>{await Promise.all(['11','12'].map(n=>execute({kind:'start',id:'op'+n,at:Date.now(),sessionId:'session-2',courseId:'course-orange',students:['demo-student-'+n],runIds:['run'+n]})));expect((await loadWorkspace()).data.runs.filter(r=>r.id.startsWith('run'))).toHaveLength(2);});
 it('ne déchiffre pas sans phrase secrète, ni avec la mauvaise',async()=>{await protect('phrase de test suffisamment longue');lock();await expect(loadWorkspace()).rejects.toThrow(/verrouillé/);await expect(unlock('mauvaise')).rejects.toThrow(/verrouillé/);const w=await unlock('phrase de test suffisamment longue');expect(w.data.students).toHaveLength(32);});
 it('rejette une sauvegarde avec des passages incohérents',()=>{const d=demo();d.runs[0].end=d.runs[0].start-1;expect(()=>validateBackup(d)).toThrow(/Passage/);});
 it('interrompt tout espace serveur ancien avant un nouveau chrono',async()=>{await mutate(w=>({...w,room:'room-test',role:'arrival'}));await execute({kind:'start',id:'local',at:Date.now(),sessionId:'session-2',courseId:'course-orange',students:['demo-student-11'],runIds:['new']});const w=await loadWorkspace();expect(w.room).toBeNull();expect(w.data.runs.some(r=>r.id==='new')).toBe(true);});
 it('préserve les anciennes opérations locales en attente sans les envoyer',async()=>{const cmd={kind:'start' as const,id:'old',at:Date.now(),sessionId:'session-2',courseId:'course-orange',students:['demo-student-12'],runIds:['old-run']};await mutate(w=>({...w,room:'room-test',pending:[cmd]}));await execute({kind:'start',id:'new-command',at:Date.now(),sessionId:'session-2',courseId:'course-orange',students:['demo-student-11'],runIds:['new']});const w=await loadWorkspace();expect(w.pending).toHaveLength(1);expect(w.pending[0].id).toBe('old');expect(w.room).toBeNull();});
 it('enregistre la configuration locale de l’appareil C sans effacer les données',async()=>{const original=(await loadWorkspace()).data;await setOfflineConfig({post:'C',sessionId:'session-2',studentIds:original.sessions[1].studentIds,groupA:['demo-student-11'],groupB:['demo-student-12'],transferKey:'ab'.repeat(32)});const w=await loadWorkspace();expect(w.offline?.post).toBe('C');expect(w.data).toEqual(original);});
 it('empêche de transformer une tablette A contenant des chronos en poste C',async()=>{
  const before=await loadWorkspace(),ids=before.data.sessions[1].studentIds;
  await setOfflineConfig({post:'A',sessionId:'session-2',studentIds:ids,groupA:ids,groupB:[],transferKey:'ab'.repeat(32)});
  await expect(setOfflineConfig({post:'C',sessionId:'session-2',studentIds:ids,groupA:ids.slice(0,12),groupB:ids.slice(12),transferKey:'ab'.repeat(32)})).rejects.toThrow(/protégée/);
  const after=await loadWorkspace();expect(after.offline?.post).toBe('A');expect(after.data.runs).toEqual(before.data.runs);
 });
 it('restaure les QR de la tablette A après une ancienne mauvaise organisation',async()=>{
  const before=await loadWorkspace(),ids=before.data.sessions[1].studentIds;
  await mutate(w=>({...w,data:{...w.data,sessions:w.data.sessions.map(s=>s.id==='session-2'?{...s,deviceMode:3,deviceKey:'ab'.repeat(32)}:s)}}));
  await setOfflineConfig({post:'C',sessionId:'session-2',studentIds:ids,groupA:ids.slice(0,12),groupB:ids.slice(12),transferKey:'ab'.repeat(32)});
  await recoverTabletPost('A');const after=await loadWorkspace();
  expect(after.offline?.post).toBe('A');expect(after.offline?.groupA).toHaveLength(ids.length);expect(after.data.runs).toEqual(before.data.runs);
 });
});
