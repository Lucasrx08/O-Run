// @vitest-environment jsdom
import React from 'react';
import {render,screen,waitFor,cleanup,within,fireEvent,act} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import {it,expect,vi,beforeAll,afterEach,beforeEach} from 'vitest';
import 'fake-indexeddb/auto';
import App from '../src/App';
import {Provider} from '../src/store';
import {reset,loadWorkspace,mutate} from '../src/services/storage';
import {addClassStudents,createClass,createLesson} from '../src/domain/classroom';
vi.mock('../src/services/clock',()=>({now:()=>Date.now(),drift:()=>0,setServerOffset:vi.fn()}));
vi.mock('../src/services/download',()=>({download:vi.fn()}));
beforeAll(()=>{window.scrollTo=vi.fn();HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};});
beforeEach(async()=>{localStorage.clear();sessionStorage.clear();await reset();});
afterEach(()=>{cleanup();vi.useRealTimers();});

it('classe → élève → 6 cartes → arrêt → nouvelle carte → correction → copie dans une autre classe',async()=>{
 const user=userEvent.setup();render(<Provider><App/></Provider>);await screen.findByRole('heading',{name:/Mes classes/});
 await user.click(screen.getByRole('button',{name:'Nouvelle classe'}));await user.type(screen.getByLabelText('Nom de la classe'),'3e Essai');await user.click(screen.getByRole('button',{name:'Créer la classe'}));
 await user.click(await screen.findByRole('button',{name:'Ajouter un élève'}));await user.type(screen.getByLabelText('Prénom'),'Camille');await user.type(screen.getByLabelText('Nom',{exact:true}),'Exemple');await user.click(screen.getByRole('button',{name:'Enregistrer l’élève'}));await screen.findByText('Camille Exemple');
 await user.click(screen.getByRole('tab',{name:/Leçons/}));await user.click(screen.getByRole('button',{name:'Nouvelle leçon'}));await user.click(screen.getByRole('button',{name:'Créer la leçon'}));
 await screen.findByRole('button',{name:'Configurer Carte 6'});expect(screen.getAllByText('6 balises')).toHaveLength(6);
 await user.click(screen.getByRole('button',{name:'Modifier Carte 1'}));await user.click(screen.getByRole('button',{name:'Ajouter une balise'}));await user.click(screen.getByRole('button',{name:'Enregistrer la carte'}));await screen.findByText('7 balises');
 await user.click(screen.getByRole('button',{name:'Supprimer Carte 6'}));await user.click(screen.getByRole('button',{name:'Retirer la carte'}));await waitFor(()=>expect(screen.queryByRole('button',{name:'Configurer Carte 6'})).toBeNull());
 await user.click(screen.getByRole('button',{name:'Ajouter une carte'}));await user.click(screen.getByRole('button',{name:'Enregistrer la carte'}));await screen.findByRole('button',{name:'Configurer Carte 6'});
 await user.click(screen.getByRole('button',{name:'Choisir les appareils'}));await user.click(screen.getByRole('button',{name:'Ouvrir ma leçon'}));await user.click(await screen.findByRole('button',{name:'Lancer 1 élève'}));
 await user.click(await screen.findByRole('button',{name:'Arrêter le chrono de Camille E.'}));await screen.findByRole('button',{name:'Choisir une nouvelle carte pour Camille E.'});
 const before=(await loadWorkspace()).data.runs.at(-1)!;expect(before.end).toBeDefined();
 await user.click(screen.getByRole('button',{name:'Choisir une nouvelle carte pour Camille E.'}));expect(screen.getByRole('dialog').classList.contains('wide')).toBe(true);expect(within(screen.getByRole('dialog')).getByRole('button',{name:'Carte 2'}).classList.contains('map-card')).toBe(true);expect(within(screen.getByRole('dialog')).queryByRole('button',{name:'Carte 1'})).toBeNull();await user.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Carte 2'}));
 await screen.findByRole('button',{name:'Arrêter le chrono de Camille E.'});let data=(await loadWorkspace()).data;expect(data.runs.at(-1)!.courseSnapshot.name).toBe('Carte 2');expect(data.runs.find(r=>r.id===before.id)!.end).toBe(before.end);expect(data.runs.at(-1)!.id).not.toBe(before.id);
 await user.click(screen.getByRole('button',{name:'Arrêter le chrono de Camille E.'}));await screen.findByRole('button',{name:'Choisir une nouvelle carte pour Camille E.'});
 await user.click(screen.getByRole('tab',{name:'Résultats'}));await user.click(within(screen.getByRole('group',{name:'Cartes à corriger'})).getByRole('button',{name:/Carte 2/}));await user.click(screen.getByRole('button',{name:'Corriger Camille E. · Carte 2'}));await user.click(screen.getByRole('button',{name:'Ajouter une erreur'}));await user.click(screen.getByRole('button',{name:'Enregistrer le résultat'}));await waitFor(()=>expect(screen.queryByRole('button',{name:'Corriger Camille E. · Carte 2'})).toBeNull());await user.click(screen.getByRole('tab',{name:/^Corrigés/}));await screen.findByText('1 balise fausse');expect(screen.getByRole('button',{name:'iDoceo'}).hasAttribute('disabled')).toBe(false);await user.click(screen.getByRole('tab',{name:/^Classement$/}));await user.click(screen.getByRole('tab',{name:'Classement de toutes les leçons'}));await screen.findAllByText(/83,3 %/);expect(screen.getByText(/1 chrono\(s\) reçu\(s\) mais carton\(s\) à corriger/)).toBeTruthy();await user.click(screen.getByRole('tab',{name:/^Correction/}));expect(screen.getByRole('button',{name:'Corriger Camille E. · Carte 2'}).textContent).toContain('1 balise fausse');
 await user.click(screen.getByRole('tab',{name:/Cartes/}));await user.click(screen.getByRole('button',{name:'Copier la leçon'}));await user.click(screen.getByRole('button',{name:'O’Run accueil'}));await user.click(screen.getByRole('button',{name:/^N.*5e Aurore/}));await user.click(screen.getByRole('button',{name:'Coller la leçon'}));await user.click(screen.getByRole('button',{name:'Coller dans cette classe'}));await screen.findByRole('heading',{name:'Leçon 1 · copie'});
 data=(await loadWorkspace()).data;const source=data.sessions.find(l=>l.className==='3e Essai')!,copied=data.sessions.at(-1)!;expect(copied.className).toBe('5e Aurore');expect(copied.studentIds).toHaveLength(8);expect(copied.courseIds.some(id=>source.courseIds.includes(id))).toBe(false);expect(data.runs.some(r=>r.sessionId===copied.id)).toBe(false);expect(data.courses.find(c=>c.id===copied.courseIds[0])!.controls).toBe(7);
},30000);

async function prepared(){
 let d=(await loadWorkspace()).data;d=createClass(d,'3e Vagues');d=addClassStudents(d,'3e Vagues',[{id:'a',firstName:'Alice',lastName:'Essai',className:''},{id:'b',firstName:'Basile',lastName:'Essai',className:''},{id:'c',firstName:'Camille',lastName:'Essai',className:''}]);const result=createLesson(d,'3e Vagues','Vagues test','2026-10-20');await mutate(w=>({...w,data:result.data}));return result.session;
}
async function openBoard(){await screen.findByRole('button',{name:'O’Run accueil'});if(screen.queryByRole('heading',{name:/Mes classes/}))fireEvent.click(screen.getByRole('button',{name:/^N.*3e Vagues/}));fireEvent.click(await screen.findByRole('button',{name:/^Vagues test/}));const choose=screen.queryByRole('button',{name:'Choisir les appareils'});if(choose)fireEvent.click(choose);const open=await screen.findByRole('button',{name:'Ouvrir ma leçon'});await waitFor(()=>expect(open.hasAttribute('disabled')).toBe(false));fireEvent.click(open);await screen.findByRole('button',{name:'Simultané'});}
it('départ simultané sur des cartes différentes avec un instant commun',async()=>{
 const session=await prepared();render(<Provider><App/></Provider>);await openBoard();fireEvent.click(screen.getByRole('button',{name:'Carte de départ de Basile E.'}));fireEvent.click(within(screen.getByRole('dialog')).getByRole('button',{name:'Carte 2'}));fireEvent.click(screen.getByRole('button',{name:'Lancer 3 élèves'}));await waitFor(async()=>expect((await loadWorkspace()).data.runs.filter(r=>r.sessionId===session.id)).toHaveLength(3));const runs=(await loadWorkspace()).data.runs.filter(r=>r.sessionId===session.id);expect(new Set(runs.map(r=>r.start)).size).toBe(1);expect(runs.find(r=>r.studentId==='b')!.courseSnapshot.name).toBe('Carte 2');
});
it('vagues espacées, suspension et reprise sans redépart des élèves déjà partis',async()=>{
 const session=await prepared();const ui=render(<Provider><App/></Provider>);await openBoard();
 fireEvent.click(screen.getByRole('button',{name:'Par vagues'}));fireEvent.change(screen.getByLabelText('Élèves par vague'),{target:{value:'1'}});fireEvent.change(screen.getByLabelText('Intervalle entre les vagues'),{target:{value:'5'}});
 vi.useFakeTimers({toFake:['Date','setInterval','clearInterval']});fireEvent.click(screen.getByRole('button',{name:'Lancer les vagues'}));await act(async()=>{await vi.advanceTimersByTimeAsync(3200);});await waitFor(async()=>expect((await loadWorkspace()).data.runs.filter(r=>r.sessionId===session.id)).toHaveLength(1));
 fireEvent.click(screen.getByRole('button',{name:'Suspendre'}));await act(async()=>{await vi.advanceTimersByTimeAsync(10000);});expect((await loadWorkspace()).data.runs.filter(r=>r.sessionId===session.id)).toHaveLength(1);
 ui.unmount();render(<Provider><App/></Provider>);await openBoard();await screen.findByText('Vagues suspendues');fireEvent.click(screen.getByRole('button',{name:'Reprendre'}));await act(async()=>{await vi.advanceTimersByTimeAsync(3200);});await waitFor(async()=>expect((await loadWorkspace()).data.runs.filter(r=>r.sessionId===session.id)).toHaveLength(2));await act(async()=>{await vi.advanceTimersByTimeAsync(5200);});await waitFor(async()=>expect((await loadWorkspace()).data.runs.filter(r=>r.sessionId===session.id)).toHaveLength(3));expect(screen.queryByRole('button',{name:'Reprendre'})).toBeNull();
 const runs=(await loadWorkspace()).data.runs.filter(r=>r.sessionId===session.id);expect(new Set(runs.map(r=>r.studentId)).size).toBe(3);expect(runs[2].start-runs[1].start).toBeGreaterThanOrEqual(5000);
});
it('importe une liste sans colonne Classe dans la classe ouverte',async()=>{
 await prepared();render(<Provider><App/></Provider>);await screen.findByRole('heading',{name:/Mes classes/});fireEvent.click(screen.getByRole('button',{name:/^N.*3e Vagues/}));fireEvent.click(screen.getByRole('tab',{name:/Élèves/}));fireEvent.click(screen.getByRole('button',{name:'Importer'}));fireEvent.change(screen.getByLabelText('Ou colle directement les noms depuis ÉcoleDirecte'),{target:{value:'Nom;Prénom\nExemple;Zoé'}});fireEvent.click(screen.getByRole('button',{name:'Vérifier la liste'}));fireEvent.click(screen.getByRole('button',{name:'Ajouter 1 élève à la classe'}));await screen.findByText('Zoé Exemple');const d=(await loadWorkspace()).data,p=d.students.find(p=>p.firstName==='Zoé'&&p.lastName==='Exemple')!;expect(p.className).toBe('3e Vagues');expect(d.sessions.at(-1)!.studentIds).toContain(p.id);
});

it('importe des noms ÉcoleDirecte sans en-tête, avec virgules finales',async()=>{
 await prepared();render(<Provider><App/></Provider>);await screen.findByRole('heading',{name:/Mes classes/});
 fireEvent.click(screen.getByRole('button',{name:/^N.*3e Vagues/}));fireEvent.click(screen.getByRole('tab',{name:/Élèves/}));fireEvent.click(screen.getByRole('button',{name:'Importer'}));
 fireEvent.change(screen.getByLabelText('Ou colle directement les noms depuis ÉcoleDirecte'),{target:{value:'MARTEL Théo,,,,\nBELIN Léa,,,,\nBOREL Nina,,,,\nDUPONT-LECLERC Ana,,,,'}});
 fireEvent.click(screen.getByRole('button',{name:'Vérifier la liste'}));expect(screen.getByText('4 nouveaux élèves')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Ajouter 4 élèves à la classe'}));
 await screen.findByText('Théo MARTEL');await screen.findByText('Ana DUPONT-LECLERC');
 expect((await loadWorkspace()).data.sessions.at(-1)!.studentIds).toHaveLength(7);
});

it('autorise à rectifier le chrono directement dans la fenêtre de correction',async()=>{
 const session=await prepared();render(<Provider><App/></Provider>);await openBoard();
 fireEvent.click(screen.getByRole('button',{name:'Lancer 3 élèves'}));await screen.findByRole('button',{name:'Arrêter le chrono de Alice E.'});
 fireEvent.click(screen.getByRole('button',{name:'Arrêter le chrono de Alice E.'}));await screen.findByRole('button',{name:'Choisir une nouvelle carte pour Alice E.'});
 fireEvent.click(screen.getByRole('tab',{name:'Résultats'}));fireEvent.click(screen.getByRole('button',{name:'Corriger Alice E. · Carte 1'}));
 fireEvent.click(screen.getByRole('button',{name:'Modifier le chrono'}));fireEvent.change(screen.getByRole('textbox',{name:'Temps corrigé'}),{target:{value:'01:24.5'}});
 fireEvent.click(screen.getByRole('button',{name:'Enregistrer le résultat'}));
 await waitFor(async()=>expect((await loadWorkspace()).data.runs.find(r=>r.sessionId===session.id&&r.studentId==='a')?.manualTimeMs).toBe(84500));
 expect((await loadWorkspace()).data.audit.some(a=>a.detail.includes('Chrono'))).toBe(true);
});

it('poste C : corrige la carte d’un élève avant de recevoir ses chronos',async()=>{
 const session=await prepared();await mutate(w=>({...w,offline:{post:'C',sessionId:session.id,studentIds:session.studentIds,groupA:['a','b'],groupB:['c'],transferKey:'ab'.repeat(32),importedPosts:[]}}));
 render(<Provider><App/></Provider>);await screen.findByRole('heading',{name:/Mes classes/});
 fireEvent.click(screen.getByRole('button',{name:/^N.*3e Vagues/}));fireEvent.click(screen.getByRole('button',{name:/^Vagues test/}));
 expect(screen.getByRole('heading',{name:'Correction par élève'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Corriger Alice E.'}));
 const dialog=screen.getByRole('dialog');
 fireEvent.click(within(dialog).getByRole('button',{name:'Carte 2 · 2 fautes'}));
 fireEvent.click(within(dialog).getByRole('button',{name:'Carte 3 · 0 faute'}));
 fireEvent.click(within(dialog).getByRole('button',{name:'Enregistrer les cartes'}));
 await waitFor(async()=>expect((await loadWorkspace()).data.offlineCorrections?.some(c=>c.studentId==='a'&&c.courseId===session.courseIds[1]&&c.errors===2)).toBe(true));
 expect((await loadWorkspace()).data.offlineCorrections?.some(c=>c.studentId==='a'&&c.courseId===session.courseIds[2]&&c.errors===0)).toBe(true);
 expect((await loadWorkspace()).data.runs.filter(r=>r.sessionId===session.id)).toHaveLength(0);
});

it('poste C : le chrono reçu se corrige sur la carte de l’élève',async()=>{
 const session=await prepared();await mutate(w=>{
  const course=w.data.courses.find(c=>c.id===session.courseIds[0])!;
  return {...w,offline:{post:'C',sessionId:session.id,studentIds:session.studentIds,groupA:['a','b'],groupB:['c'],transferKey:'ab'.repeat(32)},
   data:{...w.data,runs:[...w.data.runs,{id:'c-run',studentId:'a',sessionId:session.id,courseId:course.id,courseSnapshot:course,start:100000,end:145000,pauses:[],errors:null,manualLevel:null,revision:0}]}};
 });
 render(<Provider><App/></Provider>);await screen.findByRole('heading',{name:/Mes classes/});
 fireEvent.click(screen.getByRole('button',{name:/^N.*3e Vagues/}));fireEvent.click(screen.getByRole('button',{name:/^Vagues test/}));
 fireEvent.click(screen.getByRole('button',{name:'Corriger Alice E.'}));
 const dialog=screen.getByRole('dialog');fireEvent.click(within(dialog).getByRole('button',{name:'Carte 1 · 0 faute'}));fireEvent.click(within(dialog).getByRole('button',{name:'Modifier le temps · Carte 1'}));
 fireEvent.change(within(dialog).getByRole('textbox',{name:'Temps corrigé · Carte 1'}),{target:{value:'01:25.3'}});
 fireEvent.click(within(dialog).getByRole('button',{name:'Enregistrer les cartes'}));
 await waitFor(async()=>expect((await loadWorkspace()).data.runs.find(r=>r.id==='c-run')?.manualTimeMs).toBe(85300));
});

it('enregistre un barème balises seules puis temps seul en minutes et secondes',async()=>{
 const session=await prepared();render(<Provider><App/></Provider>);await openBoard();fireEvent.click(screen.getByRole('tab',{name:/Cartes/}));fireEvent.click(screen.getByRole('button',{name:'Modifier Carte 1'}));fireEvent.click(screen.getByText('Réglages avancés'));fireEvent.click(screen.getByLabelText('Utiliser un barème de maîtrise'));fireEvent.click(screen.getByLabelText('Évaluer le temps'));expect(screen.queryByLabelText('Minutes maximales niveau 4')).toBeNull();fireEvent.change(screen.getByLabelText('Balises fausses maximales niveau 4'),{target:{value:'1'}});fireEvent.click(screen.getByRole('button',{name:'Enregistrer la carte'}));await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());let d=(await loadWorkspace()).data;expect(d.courses.find(c=>c.id===session.courseIds[0])!.rubric.useTime).toBe(false);
 fireEvent.click(screen.getByRole('button',{name:'Modifier Carte 1'}));fireEvent.click(screen.getByText('Réglages avancés'));fireEvent.click(screen.getByLabelText('Évaluer le temps'));fireEvent.click(screen.getByLabelText('Évaluer les balises fausses'));expect(screen.queryByLabelText('Balises fausses maximales niveau 4')).toBeNull();fireEvent.change(screen.getByLabelText('Minutes maximales niveau 4'),{target:{value:'1'}});fireEvent.change(screen.getByLabelText('Secondes maximales niveau 4'),{target:{value:'30'}});fireEvent.click(screen.getByRole('button',{name:'Enregistrer la carte'}));await waitFor(()=>expect(screen.queryByRole('dialog')).toBeNull());d=(await loadWorkspace()).data;expect(d.courses.find(c=>c.id===session.courseIds[0])!.rubric).toMatchObject({useControls:false,useTime:true,thresholds:[90,780,960]});
});
it('propose les trois rôles de terrain et conserve le mode mono-appareil',async()=>{
 await prepared();render(<Provider><App/></Provider>);await openBoard();fireEvent.click(screen.getByRole('button',{name:'Réglages'}));
 await screen.findByRole('heading',{name:/Mon poste/});expect(screen.getByRole('button',{name:/Correction · C/})).toBeTruthy();
 expect(screen.getByRole('button',{name:/Tablette A/})).toBeTruthy();expect(screen.getByRole('button',{name:/Tablette B/})).toBeTruthy();
 expect(screen.queryByText('Données & documentation')).toBeNull();
 expect(screen.getByText('Transfert par fichier (secours AirDrop)')).toBeTruthy();
});

it('verrouille les menus des iPads A/B et garde les départs simultanés ou par vagues',async()=>{
 const session=await prepared();localStorage.setItem('orun-session',session.id);
 await mutate(w=>({...w,offline:{post:'A',sessionId:session.id,studentIds:session.studentIds,groupA:session.studentIds,groupB:[],transferKey:'ab'.repeat(32)}}));
 render(<Provider><App/></Provider>);
 expect(await screen.findByRole('button',{name:'Accès enseignant protégé'})).toBeTruthy();
 expect(screen.queryByRole('button',{name:'Organisation'})).toBeNull();
 expect(screen.queryByRole('button',{name:'Réglages'})).toBeNull();
 expect(screen.queryByRole('tab',{name:'Résultats'})).toBeNull();
 expect(screen.getByRole('button',{name:'Simultané'})).toBeTruthy();
 expect(screen.getByRole('button',{name:'Par vagues'})).toBeTruthy();
 expect(screen.getByRole('button',{name:'Choisir une carte pour Alice E.'})).toBeTruthy();
});

it('organise trois appareils en deux groupes alphabétiques, avec QR de préparation et récupération',async()=>{
 const session=await prepared();render(<Provider><App/></Provider>);
 await screen.findByRole('heading',{name:/Mes classes/});fireEvent.click(screen.getByRole('button',{name:/^N.*3e Vagues/}));fireEvent.click(screen.getByRole('button',{name:/^Vagues test/}));
 fireEvent.click(screen.getByRole('button',{name:'Choisir les appareils'}));
 fireEvent.click(screen.getByRole('button',{name:/3 appareils/}));
 expect(screen.getByText('Répartition alphabétique')).toBeTruthy();expect(screen.getByText('2 élèves')).toBeTruthy();expect(screen.getByText('1 élève')).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Enregistrer et ouvrir la correction'}));
 await waitFor(async()=>expect((await loadWorkspace()).data.sessions.find(x=>x.id===session.id)?.deviceMode).toBe(3));
 expect(screen.getByRole('button',{name:'QR Tablette A'})).toBeTruthy();expect(screen.getByRole('button',{name:'QR Tablette B'})).toBeTruthy();
 expect(screen.getByRole('heading',{name:'Correction par élève'})).toBeTruthy();
 expect(screen.getByRole('button',{name:'Scanner les chronos A / B'})).toBeTruthy();
});
it('choisit la couleur et supprime une classe après confirmation du nom',async()=>{
 const user=userEvent.setup();render(<Provider><App/></Provider>);await screen.findByRole('heading',{name:/Mes classes/});await user.click(screen.getByRole('button',{name:'Nouvelle classe'}));await user.type(screen.getByLabelText('Nom de la classe'),'3e Couleur');await user.click(screen.getByRole('button',{name:'Couleur de classe #568d72'}));await user.click(screen.getByRole('button',{name:'Créer la classe'}));await screen.findByRole('heading',{name:'3e Couleur'});expect((await loadWorkspace()).data.sequences.find(q=>q.classes.includes('3e Couleur'))!.color).toBe('#568d72');await user.click(screen.getByRole('button',{name:'O’Run accueil'}));await user.click(screen.getByRole('button',{name:'Supprimer la classe 3e Couleur'}));expect(screen.queryByLabelText('Recopier le nom de la classe')).toBeNull();await user.click(screen.getByRole('button',{name:'Supprimer la classe'}));await waitFor(()=>expect(screen.queryByRole('button',{name:/^N.*3e Couleur/})).toBeNull());expect((await loadWorkspace()).data.sequences.some(q=>q.classes.includes('3e Couleur'))).toBe(false);
});

it('retire les corrections validées et propose les quatre classements pour la leçon et le cumul',async()=>{
 await prepared();render(<Provider><App/></Provider>);await openBoard();expect(screen.getAllByRole('button',{name:'Mes classes'})).toHaveLength(1);fireEvent.click(screen.getByRole('button',{name:'Lancer 3 élèves'}));await screen.findByRole('button',{name:'Arrêter le chrono de Alice E.'});fireEvent.click(screen.getByRole('button',{name:'Arrêter le chrono de Alice E.'}));await screen.findByRole('button',{name:'Choisir une nouvelle carte pour Alice E.'});fireEvent.click(screen.getByRole('button',{name:'Arrêter le chrono de Basile E.'}));await screen.findByRole('button',{name:'Choisir une nouvelle carte pour Basile E.'});fireEvent.click(screen.getByRole('tab',{name:'Résultats'}));expect(screen.getAllByRole('button',{name:/^Corriger/})[0].getAttribute('aria-label')).toBe('Corriger Alice E. · Carte 1');fireEvent.click(screen.getByRole('button',{name:'Corriger Alice E. · Carte 1'}));fireEvent.click(screen.getByRole('button',{name:'Enregistrer le résultat'}));await waitFor(()=>expect(screen.queryByRole('button',{name:'Corriger Alice E. · Carte 1'})).toBeNull());fireEvent.click(screen.getByRole('tab',{name:'Par élève'}));expect(screen.queryByRole('button',{name:'Corriger Alice E. · Carte 1'})).toBeNull();expect(screen.getByRole('button',{name:'Corriger Basile E. · Carte 1'})).toBeTruthy();fireEvent.click(screen.getByRole('tab',{name:/^Corrigés/}));expect(screen.getByRole('button',{name:'Corriger Alice E. · Carte 1'})).toBeTruthy();fireEvent.click(screen.getByRole('tab',{name:/^Classement$/}));
 for(const name of ['Général','Par carte','Balises','Par élève'])expect(screen.getByRole('tab',{name})).toBeTruthy();fireEvent.click(screen.getByRole('tab',{name:'Par carte'}));expect(screen.getByRole('group',{name:'Cartes du classement'})).toBeTruthy();expect(screen.getByRole('table')).toBeTruthy();expect(screen.queryByRole('button',{name:/^Corriger/})).toBeNull();fireEvent.click(screen.getByRole('tab',{name:'Classement de toutes les leçons'}));for(const name of ['Général','Par carte','Balises','Par élève'])expect(screen.getByRole('tab',{name})).toBeTruthy();fireEvent.click(screen.getByRole('tab',{name:'Général'}));expect(screen.queryByText(/Nombre de parcours en priorité/)).toBeNull();fireEvent.click(screen.getByRole('button',{name:'Trier par Élève'}));expect(screen.getByRole('columnheader',{name:/Élève/}).getAttribute('aria-sort')).toBe('ascending');
});

it('crée une nouvelle leçon avec le nombre de cartes et de balises choisi',async()=>{
 await prepared();render(<Provider><App/></Provider>);
 await screen.findByRole('heading',{name:/Mes classes/});
 fireEvent.click(screen.getByRole('button',{name:/^N.*3e Vagues/}));
 fireEvent.click(screen.getByRole('button',{name:'Nouvelle leçon'}));
 expect((screen.getByLabelText('Nombre de cartes') as HTMLInputElement).value).toBe('6');
 expect((screen.getByLabelText('Balises par carte') as HTMLInputElement).value).toBe('6');
 fireEvent.change(screen.getByLabelText('Nombre de cartes'),{target:{value:'4'}});
 fireEvent.change(screen.getByLabelText('Balises par carte'),{target:{value:'8'}});
 expect(screen.getByText(/4 cartes de 8 balises seront créées/)).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'Créer la leçon'}));
 await screen.findByRole('button',{name:'Configurer Carte 4'});
 expect(screen.queryByRole('button',{name:'Configurer Carte 5'})).toBeNull();
 expect(screen.getAllByText('8 balises')).toHaveLength(4);
});
