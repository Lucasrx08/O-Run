// @vitest-environment jsdom
import React from 'react';
import {render,screen,waitFor,cleanup,within,fireEvent,act} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {it,expect,vi,beforeAll,afterEach,beforeEach} from 'vitest';
import 'fake-indexeddb/auto';
import App from '../src/App';
vi.mock('../src/components/PunchScanner',()=>({PunchScanner:({onApply,onApplyNext,autoStart}:{onApply:(n:number)=>void;onApplyNext?:(n:number)=>void;autoStart?:boolean})=><div><button onClick={()=>onApply(1)}>Enregistrer 5 points</button>{onApplyNext&&<button onClick={()=>onApplyNext(1)}>Enregistrer et scanner le suivant</button>}{autoStart&&<span>Caméra suivante demandée</span>}</div>}));
import {Provider} from '../src/store';
import {reset,loadWorkspace,mutate} from '../src/services/storage';
import {addClassStudents,createClass,createLesson} from '../src/domain/classroom';
vi.mock('../src/services/clock',()=>({now:()=>Date.now(),drift:()=>0,setServerOffset:vi.fn()}));
vi.mock('../src/services/download',()=>({download:vi.fn()}));
beforeAll(()=>{window.scrollTo=vi.fn();HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};});
beforeEach(async()=>{localStorage.clear();sessionStorage.clear();await reset();});
afterEach(()=>{cleanup();vi.useRealTimers();});

async function prepared(){
 let d=(await loadWorkspace()).data;d=createClass(d,'3e Vagues');d=addClassStudents(d,'3e Vagues',[{id:'a',firstName:'Alice',lastName:'Essai',className:''},{id:'b',firstName:'Basile',lastName:'Essai',className:''},{id:'c',firstName:'Camille',lastName:'Essai',className:''}]);const result=createLesson(d,'3e Vagues','Vagues test','2026-10-20');await mutate(w=>({...w,data:result.data}));return result.session;
}
async function openBoard(){await screen.findByRole('button',{name:'O’Run accueil'});if(screen.queryByRole('heading',{name:/Mes classes/}))fireEvent.click(screen.getByRole('button',{name:/^N.*3e Vagues/}));fireEvent.click(await screen.findByRole('button',{name:/^Vagues test/}));const choose=screen.queryByRole('button',{name:'Choisir les appareils'});if(choose)fireEvent.click(choose);const open=await screen.findByRole('button',{name:'Ouvrir ma leçon'});await waitFor(()=>expect(open.hasAttribute('disabled')).toBe(false));fireEvent.click(open);await screen.findByRole('button',{name:'Simultané'}, {timeout:5000});}
it('enregistre directement cinq points comme une faute sans changer le chrono',async()=>{await prepared();render(<Provider><App/></Provider>);await openBoard();fireEvent.click(screen.getByRole('button',{name:'Lancer 3 élèves'}));fireEvent.click(await screen.findByRole('button',{name:'Arrêter le chrono de Alice E.'}));await screen.findByRole('button',{name:'Choisir une nouvelle carte pour Alice E.'});const before=(await loadWorkspace()).data.runs.find(r=>r.studentId==='a')!;fireEvent.click(screen.getByRole('tab',{name:'Résultats'}));fireEvent.click(await screen.findByRole('button',{name:'Corriger Alice E. · Carte 1'}));fireEvent.click(screen.getByRole('button',{name:/Scanner le carton/}));fireEvent.click(screen.getByRole('button',{name:'Enregistrer 5 points'}));await waitFor(async()=>expect((await loadWorkspace()).data.runs.find(r=>r.id===before.id)!.errors).toBe(1));const after=(await loadWorkspace()).data.runs.find(r=>r.id===before.id)!;expect(after.start).toBe(before.start);expect(after.end).toBe(before.end);});

it('enregistre le carton puis ouvre le scan du prochain passage sans corriger cet élève',async()=>{await prepared();render(<Provider><App/></Provider>);await openBoard();fireEvent.click(screen.getByRole('button',{name:'Lancer 3 élèves'}));fireEvent.click(await screen.findByRole('button',{name:'Arrêter le chrono de Alice E.'}));fireEvent.click(await screen.findByRole('button',{name:'Arrêter le chrono de Basile E.'}));await screen.findByRole('button',{name:'Choisir une nouvelle carte pour Basile E.'});fireEvent.click(screen.getByRole('tab',{name:'Résultats'}));fireEvent.click(await screen.findByRole('button',{name:'Corriger Alice E. · Carte 1'}));fireEvent.click(screen.getByRole('button',{name:/Scanner le carton/}));fireEvent.click(screen.getByRole('button',{name:'Enregistrer et scanner le suivant'}));await screen.findByText('Caméra suivante demandée');expect(screen.getByRole('dialog').getAttribute('aria-label')).toBe('Résultat · Basile E.');const data=(await loadWorkspace()).data;expect(data.runs.find(r=>r.studentId==='a')!.errors).toBe(1);expect(data.runs.find(r=>r.studentId==='b')!.errors).toBeNull();});

it('sélectionne le modèle photographique dans la création de carte et conserve le numéro après renommage',async()=>{
 const lesson=await prepared();const {LessonCards}=await import('../src/pages/LessonCards');
 render(<Provider><LessonCards session={lesson} className="3e Vagues" onStart={()=>{}}/></Provider>);
 fireEvent.click(await screen.findByRole('button',{name:'Modifier Carte 2'}));
 const model=screen.getByRole('combobox',{name:'Modèle de correction'});fireEvent.change(model,{target:{value:'cards-6'}});
 expect((screen.getByRole('combobox',{name:'Numéro dans le modèle'}) as HTMLSelectElement).value).toBe('2');
 fireEvent.change(screen.getByRole('textbox',{name:'Nom de la carte'}),{target:{value:'Parcours du stade'}});
 fireEvent.click(screen.getByRole('button',{name:'Enregistrer la carte'}));
 await waitFor(async()=>expect((await loadWorkspace()).data.courses.find(c=>c.name==='Parcours du stade')?.correction).toEqual({model:'cards-6',reference:2}));
});
