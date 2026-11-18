// @vitest-environment jsdom
import React from 'react';
import {render,screen,waitFor,cleanup,fireEvent,act} from '@testing-library/react';
import {it,expect,vi,beforeAll,beforeEach,afterEach} from 'vitest';
import 'fake-indexeddb/auto';
import {RunBoard} from '../src/pages/RunBoard';
import {Provider} from '../src/store';
import {reset,mutate,loadWorkspace} from '../src/services/storage';
import {emptyData} from '../src/domain/demo';
import {createClass,addClassStudents,createLesson,startCommands} from '../src/domain/classroom';
import {apply} from '../src/domain/engine';
vi.mock('../src/services/clock',()=>({now:()=>Date.now(),drift:()=>0,setServerOffset:vi.fn()}));
beforeAll(()=>{window.scrollTo=vi.fn();HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};});
beforeEach(async()=>{localStorage.clear();sessionStorage.clear();await reset();});afterEach(()=>{cleanup();vi.useRealTimers();});
async function setup(post?:'A'|'B',kiosk=false,withRun=false){
 let d=createClass(emptyData(),'Essai terrain');d=addClassStudents(d,'Essai terrain',['Zélie','Alice','Tom','Basile','Lou','Camille'].map((firstName,i)=>({id:`s${i}`,firstName,lastName:'Essai',className:'Essai terrain'})));
 const created=createLesson(d,'Essai terrain','Terrain','2026-11-18');d=created.data;const session=created.session;
 if(withRun)d=apply(d,startCommands(session.id,[{studentId:'s0',courseId:session.courseIds[0]}],Date.now()-5000)[0]);
 await mutate(w=>({...w,data:d,offline:post?{post,sessionId:session.id,studentIds:post==='A'?['s0','s1','s2']:['s3','s4','s5'],groupA:['s0','s1','s2'],groupB:['s3','s4','s5'],transferKey:'ab'.repeat(32)}:undefined}));
 render(<Provider><RunBoard session={session} className="Essai terrain" kiosk={kiosk}/></Provider>);await screen.findByRole('button',{name:'Par vagues'});return session;
}
it('attribue 1 à 6 dans le même ordre que les tuiles et inverse exactement la rotation',async()=>{
 await setup();fireEvent.change(screen.getByRole('combobox',{name:'Carte de départ'}),{target:{value:'order-asc'}});
 for(const [i,name]of ['Zélie','Alice','Tom','Basile','Lou','Camille'].entries())expect(screen.getByRole('button',{name:`Carte de départ de ${name} E.`}).textContent).toContain(`Carte ${i+1}`);
 fireEvent.change(screen.getByRole('combobox',{name:'Carte de départ'}),{target:{value:'order-desc'}});for(const[i,name]of ['Zélie','Alice','Tom','Basile','Lou','Camille'].entries())expect(screen.getByRole('button',{name:`Carte de départ de ${name} E.`}).textContent).toContain(`Carte ${6-i}`);
});
it('recommence la rotation au premier élève visible sur la tablette B',async()=>{await setup('B');fireEvent.change(screen.getByRole('combobox',{name:'Carte de départ'}),{target:{value:'order-asc'}});expect(screen.getByRole('button',{name:'Carte de départ de Basile E.'}).textContent).toContain('Carte 1');expect(screen.getByRole('button',{name:'Carte de départ de Camille E.'}).textContent).toContain('Carte 3');});
it('laisse effacer les nombres et donne une minute de préparation avant la première vague',async()=>{
 const session=await setup();fireEvent.click(screen.getByRole('button',{name:'Par vagues'}));
 for(const name of ['Élèves par vague','Intervalle entre les vagues']){const input=screen.getByRole('spinbutton',{name});fireEvent.change(input,{target:{value:''}});expect((input as HTMLInputElement).value).toBe('');fireEvent.change(input,{target:{value:name==='Élèves par vague'?'1':'30'}});}
 expect((screen.getByRole('spinbutton',{name:'Préparation avant la première vague'})as HTMLInputElement).value).toBe('60');
 fireEvent.click(screen.getByRole('button',{name:'1 min'}));expect((screen.getByRole('spinbutton',{name:'Intervalle entre les vagues'})as HTMLInputElement).value).toBe('60');
 vi.useFakeTimers({toFake:['Date','setInterval','clearInterval']});fireEvent.click(screen.getByRole('button',{name:'Lancer les vagues'}));expect(screen.getByRole('timer').textContent).toContain('01:00');expect(screen.queryByRole('button',{name:'Corriger un départ'})).toBeNull();
 await act(async()=>{await vi.advanceTimersByTimeAsync(59000);});expect((await loadWorkspace()).data.runs.filter(r=>r.sessionId===session.id)).toHaveLength(0);
 await act(async()=>{await vi.advanceTimersByTimeAsync(1200);});await waitFor(async()=>expect((await loadWorkspace()).data.runs.filter(r=>r.sessionId===session.id)).toHaveLength(1));fireEvent.click(screen.getByRole('button',{name:'Suspendre'}));expect(screen.getByRole('button',{name:'Corriger un départ'})).toBeTruthy();
});
it('annule uniquement un départ accidentel, libère la carte et permet de le rétablir',async()=>{
 await setup('A',false,true);fireEvent.click(screen.getByRole('button',{name:'Corriger un départ'}));
 fireEvent.click(await screen.findByRole('button',{name:'Annuler le départ de Zélie E. · Carte 1'}));fireEvent.click(screen.getByRole('button',{name:'Confirmer l’annulation'}));
 await waitFor(async()=>expect((await loadWorkspace()).data.runs).toHaveLength(0));expect((await loadWorkspace()).offline?.studentIds).toEqual(['s0','s1','s2']);
 const undo=await screen.findByRole('button',{name:'Rétablir le départ annulé de Zélie E.'});await waitFor(()=>expect((undo as HTMLButtonElement).disabled).toBe(false));fireEvent.click(undo);await waitFor(async()=>expect((await loadWorkspace()).data.runs).toHaveLength(1));
});
it('ne donne pas accès à l’annulation dans la vue élèves',async()=>{await setup('A',true,true);expect(screen.queryByRole('button',{name:'Corriger un départ'})).toBeNull();});
