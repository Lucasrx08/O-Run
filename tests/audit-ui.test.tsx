// @vitest-environment jsdom
import React from 'react';
import {render,screen,waitFor,cleanup,fireEvent,within} from '@testing-library/react';
import {it,expect,vi,beforeAll,beforeEach,afterEach} from 'vitest';
import 'fake-indexeddb/auto';
import App from '../src/App';
import {Provider} from '../src/store';
import {reset,mutate,loadWorkspace,setOfflineConfig,configureLessonDevices} from '../src/services/storage';
import {emptyData} from '../src/domain/demo';
import {createClass,addClassStudents,createLesson} from '../src/domain/classroom';
vi.mock('../src/services/clock',()=>({now:()=>Date.now(),drift:()=>0,setServerOffset:vi.fn()}));
vi.mock('../src/services/download',()=>({download:vi.fn()}));
beforeAll(()=>{window.scrollTo=vi.fn();HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};});
beforeEach(async()=>{localStorage.clear();sessionStorage.clear();await reset();});afterEach(cleanup);
async function data(){let d=createClass(emptyData(),'Classe conservée');d=addClassStudents(d,'Classe conservée',[{id:'a',firstName:'Alice',lastName:'Exemple',className:'Classe conservée'},{id:'b',firstName:'Basile',lastName:'Exemple',className:'Classe conservée'}]);return createLesson(d,'Classe conservée','Terrain','2026-11-19',undefined,undefined,{cards:6,controls:6,poseDepose:true});}
it('sort du kiosque A après le code, retrouve les classes et peut rouvrir C',async()=>{
 const fixture=await data();await mutate(w=>({...w,data:fixture.data}));await configureLessonDevices(fixture.session.id,3);const central=(await loadWorkspace()).offline!;await setOfflineConfig({...central,post:'A',studentIds:['a'],groupA:['a'],groupB:[]});
 const hash=await crypto.subtle.digest('SHA-256',new TextEncoder().encode('test-salt:1234'));localStorage.setItem('orun-teacher-pin-v1',Array.from(new Uint8Array(hash),b=>b.toString(16).padStart(2,'0')).join(''));localStorage.setItem('orun-teacher-pin-salt-v1','test-salt');localStorage.setItem('orun-teacher-pin-format','4');
 render(<Provider><App/></Provider>);fireEvent.click(await screen.findByRole('button',{name:'Accès enseignant protégé'}));for(const n of ['1','2','3','4'])fireEvent.click(screen.getByRole('button',{name:`Chiffre ${n}`}));fireEvent.click(screen.getByRole('button',{name:'Déverrouiller'}));fireEvent.click(await screen.findByRole('button',{name:'Changer de poste / leçon'}));
 fireEvent.click(await screen.findByRole('button',{name:'Mes classes et leçons'}));await screen.findByRole('heading',{name:/Mes classes/});expect((await loadWorkspace()).data.students).toHaveLength(2);expect((await loadWorkspace()).offline).toBeUndefined();
 fireEvent.click(screen.getByRole('button',{name:'Réglages'}));const card=(await screen.findByText('Poste C · Terrain')).closest('article')!;fireEvent.click(within(card).getByRole('button',{name:'Ouvrir ce poste'}));await waitFor(async()=>expect((await loadWorkspace()).offline?.post).toBe('C'));expect((await loadWorkspace()).data.sessions).toHaveLength(1);
});
it('le classement affiche points/possible et la couleur du total, sans colonne À valider',async()=>{
 const fixture=await data();fixture.session.deviceMode=1;fixture.session.poseDeposeTasks=[{beacon:31,placers:['a'],verifiers:['b'],placementValid:true,verificationValid:false,collected:false,revision:1}];fixture.data.sessions=[fixture.session];await mutate(w=>({...w,data:fixture.data}));render(<Provider><App/></Provider>);fireEvent.click(await screen.findByRole('button',{name:/^N.*Classe conservée/}));fireEvent.click(screen.getByRole('button',{name:/^Terrain/}));fireEvent.click(screen.getByRole('tab',{name:'Pose-dépose'}));fireEvent.click(screen.getByRole('tab',{name:'Classement'}));
 expect(screen.queryByRole('columnheader',{name:'À valider'})).toBeNull();const alice=screen.getByRole('row',{name:/Alice E./}),basile=screen.getByRole('row',{name:/Basile E./});expect(alice.textContent).toContain('100 %');expect(alice.querySelector('.pd-total')?.getAttribute('style')).toContain('rgb(199, 224, 185)');expect(basile.textContent).toContain('0 %');expect(basile.querySelector('.pd-total')?.getAttribute('style')).toContain('rgb(251, 124, 146)');
});
it('la récupération d’un fichier ajoute une classe sans remplacer les classes actuelles',async()=>{
 const fixture=await data();await mutate(w=>({...w,data:fixture.data}));render(<Provider><App/></Provider>);fireEvent.click(await screen.findByRole('button',{name:'Réglages'}));const backup=createClass(emptyData(),'Classe retrouvée');const file=new File([JSON.stringify(backup)],'sauvegarde.json',{type:'application/json'});Object.defineProperty(file,'text',{value:async()=>JSON.stringify(backup)});fireEvent.change(screen.getByLabelText('Importer une sauvegarde O’Run'),{target:{files:[file]}});fireEvent.click(await screen.findByRole('button',{name:'Récupérer les données'}));await waitFor(async()=>expect((await loadWorkspace()).data.sequences.flatMap(q=>q.classes)).toContain('Classe retrouvée'));expect((await loadWorkspace()).data.students).toHaveLength(2);await waitFor(()=>expect((screen.getByRole('button',{name:'Télécharger ma sauvegarde'}) as HTMLButtonElement).disabled).toBe(false));
});
