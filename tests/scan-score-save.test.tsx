// @vitest-environment jsdom
import React from 'react';
import {render,screen,waitFor,cleanup,within,fireEvent,act} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {it,expect,vi,beforeAll,afterEach,beforeEach} from 'vitest';
import 'fake-indexeddb/auto';
import App from '../src/App';
vi.mock('../src/components/PunchScanner',()=>({PunchScanner:({onApply}:{onApply:(n:number)=>void})=><button onClick={()=>onApply(1)}>Enregistrer 5 points</button>}));
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
async function openBoard(){await screen.findByRole('button',{name:'O’Run accueil'});if(screen.queryByRole('heading',{name:/Mes classes/}))fireEvent.click(screen.getByRole('button',{name:/^N.*3e Vagues/}));fireEvent.click(await screen.findByRole('button',{name:/^Vagues test/}));const choose=screen.queryByRole('button',{name:'Choisir les appareils'});if(choose)fireEvent.click(choose);const open=await screen.findByRole('button',{name:'Ouvrir ma leçon'});await waitFor(()=>expect(open.hasAttribute('disabled')).toBe(false));fireEvent.click(open);await screen.findByRole('button',{name:'Simultané'});}
it('enregistre directement cinq points comme une faute sans changer le chrono',async()=>{await prepared();render(<Provider><App/></Provider>);await openBoard();fireEvent.click(screen.getByRole('button',{name:'Lancer 3 élèves'}));fireEvent.click(await screen.findByRole('button',{name:'Arrêter le chrono de Alice E.'}));await screen.findByRole('button',{name:'Choisir une nouvelle carte pour Alice E.'});const before=(await loadWorkspace()).data.runs.find(r=>r.studentId==='a')!;fireEvent.click(screen.getByRole('tab',{name:'Résultats'}));fireEvent.click(await screen.findByRole('button',{name:'Corriger Alice E. · Carte 1'}));fireEvent.click(screen.getByRole('button',{name:/Scanner le carton/}));fireEvent.click(screen.getByRole('button',{name:'Enregistrer 5 points'}));await waitFor(async()=>expect((await loadWorkspace()).data.runs.find(r=>r.id===before.id)!.errors).toBe(1));const after=(await loadWorkspace()).data.runs.find(r=>r.id===before.id)!;expect(after.start).toBe(before.start);expect(after.end).toBe(before.end);});
