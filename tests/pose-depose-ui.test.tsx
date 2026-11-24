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
async function enterPose(){fireEvent.click(await screen.findByRole('button',{name:'Choisir les appareils'}));fireEvent.click(await screen.findByRole('button',{name:'Ouvrir pose-dépose'}));await screen.findByRole('tab',{name:'Validation'});}
it('attribue par tuiles, interdit l’auto-vérification, valide les deux groupes sans doubler les points',async()=>{
 await prepare();fireEvent.click(await screen.findByRole('button',{name:/^Pose test/}));await enterPose();
 fireEvent.click(await screen.findByRole('button',{name:'Alice E.'}));fireEvent.click(screen.getByRole('button',{name:'Basile E.'}));fireEvent.click(screen.getByRole('button',{name:/^Balise 31 ·/}));fireEvent.click(screen.getByRole('button',{name:/^Balise 72 ·/}));fireEvent.click(screen.getByRole('button',{name:'Attribuer la pose'}));
 await waitFor(async()=>expect((await loadWorkspace()).data.sessions[0].poseDeposeTasks).toHaveLength(2));
 fireEvent.click(screen.getByRole('tab',{name:'Vérification'}));fireEvent.click(screen.getByRole('button',{name:/^Balise 31 ·/}));expect((screen.getByRole('button',{name:'Alice E.'}) as HTMLButtonElement).disabled).toBe(true);
 fireEvent.click(screen.getByRole('button',{name:'Camille E.'}));fireEvent.click(screen.getByRole('button',{name:'Dorian E.'}));fireEvent.click(screen.getByRole('button',{name:'Attribuer la vérification'}));
 await waitFor(async()=>expect((await loadWorkspace()).data.sessions[0].poseDeposeTasks![0].verifiers).toEqual(['c','d']));
 fireEvent.click(screen.getByRole('tab',{name:'Validation'}));await waitFor(()=>expect((screen.getByRole('button',{name:'Signaler une erreur balise 31'})as HTMLButtonElement).disabled).toBe(false));fireEvent.click(screen.getByRole('button',{name:'Signaler une erreur balise 31'}));fireEvent.click(screen.getByRole('button',{name:'Mal posée'}));fireEvent.click(screen.getByRole('button',{name:'Enregistrer le résultat'}));
 await waitFor(async()=>expect(poseDeposeRanking((await loadWorkspace()).data,'3e Pose').find(r=>r.student.id==='a')!.total).toBe(0));
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());expect(screen.queryByRole('article',{name:'Validation balise 31'})).toBeNull();expect(screen.queryByRole('checkbox',{name:'Balise 31 rangée'})).toBeNull();
 fireEvent.click(screen.getByRole('tab',{name:'Classement'}));expect(screen.getByRole('row',{name:/Alice E./}).textContent).toContain('0 / 1');expect(screen.getByRole('row',{name:/Camille E./}).textContent).toContain('1');
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
it('trie les prénoms, accepte trois poseurs et valide une sélection en une action',async()=>{
 await prepare();fireEvent.click(await screen.findByRole('button',{name:/^Pose test/}));await enterPose();
 const pupils=screen.getAllByRole('button').filter(b=>['Alice E.','Basile E.','Camille E.','Dorian E.'].includes(b.textContent||''));expect(pupils.map(b=>b.textContent)).toEqual(['Alice E.','Basile E.','Camille E.','Dorian E.']);
 for(const name of ['Alice E.','Basile E.','Camille E.'])fireEvent.click(screen.getByRole('button',{name}));
 fireEvent.click(screen.getByRole('button',{name:/^Balise 31 ·/}));fireEvent.click(screen.getByRole('button',{name:/^Balise 32 ·/}));fireEvent.click(screen.getByRole('button',{name:'Attribuer la pose'}));
 await waitFor(async()=>expect((await loadWorkspace()).data.sessions[0].poseDeposeTasks?.[0].placers).toEqual(['a','b','c']));
 fireEvent.click(screen.getByRole('tab',{name:'Validation'}));
 fireEvent.change(screen.getByRole('searchbox',{name:'Rechercher une balise ou un élève'}),{target:{value:'Alice'}});expect(screen.getAllByRole('article')).toHaveLength(2);
 await waitFor(()=>expect((screen.getByRole('checkbox',{name:/Tout sélectionner/}) as HTMLInputElement).disabled).toBe(false));fireEvent.click(screen.getByRole('checkbox',{name:/Tout sélectionner/}));fireEvent.click(screen.getByRole('button',{name:'Valider la sélection'}));
 await waitFor(()=>expect(screen.queryAllByRole('article')).toHaveLength(0),{timeout:5000});expect(poseDeposeRanking((await loadWorkspace()).data,'3e Pose').find(r=>r.student.id==='c')!.total).toBe(2);
 fireEvent.click(screen.getByRole('button',{name:'Validées'}));await screen.findByRole('article',{name:'Validation balise 31'});expect(screen.getAllByRole('article')).toHaveLength(2);expect(screen.queryByText('Marquer rangées')).toBeNull();
});
it('réutilise un groupe coloré pour plusieurs poses puis pour vérifier un autre groupe',async()=>{
 await prepare();fireEvent.click(await screen.findByRole('button',{name:/^Pose test/}));await enterPose();
 for(const name of ['Alice E.','Basile E.'])fireEvent.click(screen.getByRole('button',{name}));
 fireEvent.click(screen.getByRole('button',{name:/^Balise 31 ·/}));fireEvent.click(screen.getByRole('button',{name:'Attribuer la pose'}));
 const group=await screen.findByRole('button',{name:'Reprendre le groupe Alice E. + Basile E.'});expect(group.getAttribute('aria-pressed')).toBe('true');const color=group.style.getPropertyValue('--group-color');expect(color).toContain('hsl');
 fireEvent.click(screen.getByRole('button',{name:/^Balise 32 ·/}));fireEvent.click(screen.getByRole('button',{name:'Attribuer la pose'}));await waitFor(async()=>expect((await loadWorkspace()).data.sessions[0].poseDeposeTasks).toHaveLength(2));
 fireEvent.click(screen.getByRole('button',{name:'Nouveau groupe'}));fireEvent.click(screen.getByRole('button',{name:'Camille E.'}));fireEvent.click(screen.getByRole('button',{name:/^Balise 33 ·/}));fireEvent.click(screen.getByRole('button',{name:'Attribuer la pose'}));await screen.findByRole('button',{name:'Reprendre le groupe Camille E.'});
 fireEvent.click(screen.getByRole('tab',{name:'Vérification'}));fireEvent.click(screen.getByRole('button',{name:'Reprendre le groupe Alice E. + Basile E.'}));fireEvent.click(screen.getByRole('button',{name:/^Balise 33 ·/}));expect((screen.getByRole('button',{name:/^Balise 31 ·/}) as HTMLButtonElement).disabled).toBe(true);fireEvent.click(screen.getByRole('button',{name:'Attribuer la vérification'}));await waitFor(async()=>expect((await loadWorkspace()).data.sessions[0].poseDeposeTasks?.find(t=>t.beacon===33)?.verifiers).toEqual(['a','b']));expect(screen.getByRole('button',{name:'Reprendre le groupe Alice E. + Basile E.'}).style.getPropertyValue('--group-color')).toBe(color);
});

it('modifie un binôme enregistré sans perdre ses balises et persiste le nouveau groupe',async()=>{
 await prepare();fireEvent.click(await screen.findByRole('button',{name:/^Pose test/}));await enterPose();
 for(const name of ['Alice E.','Basile E.'])fireEvent.click(screen.getByRole('button',{name}));
 for(const n of [31,32])fireEvent.click(screen.getByRole('button',{name:new RegExp(`^Balise ${n} ·`)}));
 fireEvent.click(screen.getByRole('button',{name:'Attribuer la pose'}));await screen.findByRole('button',{name:'Reprendre le groupe Alice E. + Basile E.'});
 fireEvent.click(screen.getByRole('button',{name:'Modifier ce groupe'}));const {within}=await import('@testing-library/react');const dialog=within(screen.getByRole('dialog',{name:'Modifier le groupe'}));fireEvent.click(dialog.getByRole('button',{name:'Basile E.'}));fireEvent.click(dialog.getByRole('button',{name:'Camille E.'}));fireEvent.click(dialog.getByRole('button',{name:'Enregistrer le groupe'}));
 await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());const w=await loadWorkspace();expect(w.data.sessions[0].poseDeposeTasks).toHaveLength(2);expect(w.data.sessions[0].poseDeposeTasks!.every(t=>t.placers.join(',')==='a,c')).toBe(true);expect(w.data.students).toHaveLength(4);
 cleanup();render(<Provider><App/></Provider>);fireEvent.click(await screen.findByRole('button',{name:/^Pose test/}));fireEvent.click(await screen.findByRole('tab',{name:'Pose-dépose'}));expect(await screen.findByRole('button',{name:'Reprendre le groupe Alice E. + Camille E.'})).toBeTruthy();expect(screen.queryByRole('button',{name:'Reprendre le groupe Alice E. + Basile E.'})).toBeNull();
});
