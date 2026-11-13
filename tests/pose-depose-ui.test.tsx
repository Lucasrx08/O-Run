// @vitest-environment jsdom
import React from 'react';
import {render,screen,waitFor,cleanup,fireEvent} from '@testing-library/react';
import {it,expect,vi,beforeAll,beforeEach,afterEach} from 'vitest';
import 'fake-indexeddb/auto';
import App from '../src/App';
import {Provider} from '../src/store';
import {reset,mutate,loadWorkspace} from '../src/services/storage';
import {emptyData} from '../src/domain/demo';
import {createClass,addClassStudents,createLesson} from '../src/domain/classroom';
import {poseDeposeRanking} from '../src/domain/poseDepose';
vi.mock('../src/services/clock',()=>({now:()=>Date.now(),drift:()=>0,setServerOffset:vi.fn()}));
beforeAll(()=>{window.scrollTo=vi.fn();HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};});
beforeEach(async()=>{localStorage.clear();sessionStorage.clear();await reset();});afterEach(cleanup);
async function prepare(lesson=true,pose=true){let d=createClass(emptyData(),'3e Pose');d=addClassStudents(d,'3e Pose',[['a','Alice'],['b','Basile'],['c','Camille'],['d','Dorian']].map(([id,firstName])=>({id,firstName,lastName:'Essai',className:'3e Pose'})));if(lesson)d=createLesson(d,'3e Pose','Pose test','2026-11-13',undefined,undefined,{cards:6,controls:6,poseDepose:pose}).data;await mutate(w=>({...w,data:d}));render(<Provider><App/></Provider>);fireEvent.click(await screen.findByRole('button',{name:/^N.*3e Pose/}));}
async function enterPose(){fireEvent.click(await screen.findByRole('button',{name:'Choisir les appareils'}));fireEvent.click(await screen.findByRole('button',{name:'Ouvrir pose-dépose'}));await screen.findByRole('tab',{name:'Validation & rangement'});}
it('attribue par tuiles, interdit l’auto-vérification, valide les deux groupes et range sans doubler les points',async()=>{
 await prepare();fireEvent.click(await screen.findByRole('button',{name:/^Pose test/}));await enterPose();
 fireEvent.click(await screen.findByRole('button',{name:'Alice E.'}));fireEvent.click(screen.getByRole('button',{name:'Basile E.'}));fireEvent.click(screen.getByRole('button',{name:/^Balise 31 ·/}));fireEvent.click(screen.getByRole('button',{name:/^Balise 72 ·/}));fireEvent.click(screen.getByRole('button',{name:'Attribuer la pose'}));
 await waitFor(async()=>expect((await loadWorkspace()).data.sessions[0].poseDeposeTasks).toHaveLength(2));
 fireEvent.click(screen.getByRole('tab',{name:'Vérification'}));fireEvent.click(screen.getByRole('button',{name:/^Balise 31 ·/}));expect((screen.getByRole('button',{name:'Alice E.'}) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'Camille E.'}));fireEvent.click(screen.getByRole('button',{name:'Dorian E.'}));fireEvent.click(screen.getByRole('button',{name:'Attribuer la vérification'}));
 await waitFor(async()=>expect((await loadWorkspace()).data.sessions[0].poseDeposeTasks![0].verifiers).toEqual(['c','d']));
 fireEvent.click(screen.getByRole('tab',{name:'Validation & rangement'}));fireEvent.click(screen.getByRole('button',{name:'Pose balise 31 fausse −1'}));await waitFor(()=>expect(screen.getByRole('button',{name:'Pose balise 31 fausse −1'}).getAttribute('aria-pressed')).toBe('true'),{timeout:5000});await waitFor(()=>expect((screen.getByRole('button',{name:'Vérification balise 31 juste +1'}) as HTMLButtonElement).disabled).toBe(false));fireEvent.click(screen.getByRole('button',{name:'Vérification balise 31 juste +1'}));
 await waitFor(async()=>expect(poseDeposeRanking((await loadWorkspace()).data,'3e Pose').find(r=>r.student.id==='a')!.total).toBe(-1));
 fireEvent.click(screen.getByRole('button',{name:'À ranger'}));await waitFor(()=>expect((screen.getByRole('checkbox',{name:'Balise 31 rangée'}) as HTMLInputElement).disabled).toBe(false));fireEvent.click(screen.getByRole('checkbox',{name:'Balise 31 rangée'}));await waitFor(async()=>expect((await loadWorkspace()).data.sessions[0].poseDeposeTasks![0].collected).toBe(true));
 fireEvent.click(screen.getByRole('tab',{name:'Classement'}));expect(screen.getByRole('row',{name:/Alice E./}).textContent).toContain('-1');expect(screen.getByRole('row',{name:/Camille E./}).textContent).toContain('1');
 fireEvent.click(screen.getByRole('button',{name:'Toutes les leçons'}));expect(screen.getByRole('button',{name:'Toutes les leçons'}).getAttribute('aria-pressed')).toBe('true');
 fireEvent.click(screen.getByRole('tab',{name:'Résultats'}));expect(screen.getByRole('group',{name:'Rubrique du classement'})).toBeTruthy();expect(screen.getByRole('heading',{name:'Classement pose-dépose'})).toBeTruthy();
});
it('active l’option à la création de leçon et enchaîne cartes, appareils puis les 42 balises',async()=>{
 await prepare(false);fireEvent.click(await screen.findByRole('button',{name:'Nouvelle leçon'}));fireEvent.click(screen.getByRole('checkbox',{name:'Pose-dépose'}));fireEvent.click(screen.getByRole('button',{name:'Créer la leçon'}));
 await enterPose();expect(screen.getAllByRole('button',{name:/^Balise \d+ ·/})).toHaveLength(42);expect((await loadWorkspace()).data.sessions[0].poseDepose).toBe(true);
});

it('active pose-dépose dans les paramètres d’une leçon existante',async()=>{
 await prepare(true,false);fireEvent.click(await screen.findByRole('button',{name:/^Pose test/}));fireEvent.click(await screen.findByRole('button',{name:'Modifier la leçon'}));fireEvent.click(screen.getByRole('checkbox',{name:'Pose-dépose'}));fireEvent.click(screen.getByRole('button',{name:'Enregistrer'}));
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());await enterPose();expect((await loadWorkspace()).data.sessions[0].poseDepose).toBe(true);
});
it('trie les prénoms, accepte trois poseurs et valide puis range une sélection en une action',async()=>{
 await prepare();fireEvent.click(await screen.findByRole('button',{name:/^Pose test/}));await enterPose();
 const pupils=screen.getAllByRole('button').filter(b=>['Alice E.','Basile E.','Camille E.','Dorian E.'].includes(b.textContent||''));expect(pupils.map(b=>b.textContent)).toEqual(['Alice E.','Basile E.','Camille E.','Dorian E.']);
 for(const name of ['Alice E.','Basile E.','Camille E.'])fireEvent.click(screen.getByRole('button',{name}));
 fireEvent.click(screen.getByRole('button',{name:/^Balise 31 ·/}));fireEvent.click(screen.getByRole('button',{name:/^Balise 32 ·/}));fireEvent.click(screen.getByRole('button',{name:'Attribuer la pose'}));
 await waitFor(async()=>expect((await loadWorkspace()).data.sessions[0].poseDeposeTasks?.[0].placers).toEqual(['a','b','c']));
 fireEvent.click(screen.getByRole('tab',{name:'Validation & rangement'}));
 fireEvent.change(screen.getByRole('searchbox',{name:'Rechercher une balise ou un élève'}),{target:{value:'Alice'}});expect(screen.getAllByRole('article')).toHaveLength(2);
 await waitFor(()=>expect((screen.getByRole('checkbox',{name:/Tout sélectionner/}) as HTMLInputElement).disabled).toBe(false));fireEvent.click(screen.getByRole('checkbox',{name:/Tout sélectionner/}));fireEvent.click(screen.getByRole('button',{name:'Tout juste (+1)'}));
 await waitFor(()=>expect(screen.queryAllByRole('article')).toHaveLength(0),{timeout:5000});expect(poseDeposeRanking((await loadWorkspace()).data,'3e Pose').find(r=>r.student.id==='c')!.total).toBe(2);
 fireEvent.click(screen.getByRole('button',{name:'À ranger'}));await waitFor(()=>expect((screen.getByRole('checkbox',{name:/Tout sélectionner/}) as HTMLInputElement).disabled).toBe(false));fireEvent.click(screen.getByRole('checkbox',{name:/Tout sélectionner/}));fireEvent.click(screen.getByRole('button',{name:'Marquer rangées'}));await waitFor(()=>expect(screen.queryAllByRole('article')).toHaveLength(0),{timeout:5000});
 expect((await loadWorkspace()).data.sessions[0].poseDeposeTasks!.every(t=>t.collected)).toBe(true);
});
