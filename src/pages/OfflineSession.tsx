import {useState,type ChangeEvent} from 'react';
import {ArrowRight,Check,CheckCircle2,Download,FileUp,Flag,LockKeyhole,Monitor,Share2,Tablet,Timer,Users,Trophy} from 'lucide-react';
import {useStore} from '../store';
import {alphabeticalStudents,createSessionPack,exportTimes,splitAlphabetical,validateSessionPack} from '../domain/offline';
import {type OfflineConfig} from '../domain/types';
import {newTransferKey,openTimes,sealTimes,shareOrDownload} from '../services/offlineTransfer';
import * as storage from '../services/storage';

type Phase=1|2|3|4;
const phases=[{id:1,title:'Répartir',detail:'Préparer A et B',Icon:Users},
 {id:2,title:'Sur le terrain',detail:'Chronos et cartons',Icon:Flag},
 {id:3,title:'Rassembler',detail:'Recevoir les chronos',Icon:Download},
 {id:4,title:'Classements',detail:'Dans la leçon',Icon:Trophy}] as const;

export function OfflineSession(){
 const s=useStore(),sessions=s.data.sessions;
 const [sessionId,setSessionId]=useState(s.offline?.sessionId||s.sessionId);
 const current=sessions.some(t=>t.id===sessionId)?sessionId:sessions[0]?.id||'';
 const students=current?alphabeticalStudents(s.data,current):[];
 const [selectedA,setSelectedA]=useState<string[]|null>(null),[phase,setPhase]=useState<Phase>(1);
 const config=s.offline,post=config?.post||'solo',central=post==='C',tablet=['A','B','AB'].includes(post);
 const effectiveA=selectedA??(central&&config?.sessionId===current&&config?.groupA?config.groupA:current?splitAlphabetical(s.data,current).A:[]);
 const split=current?splitAlphabetical(s.data,current,effectiveA):{A:[],B:[]};
 const [busy,setBusy]=useState(false),[lastMessage,setLastMessage]=useState('');
 const corrections=(s.data.offlineCorrections||[]).filter(c=>c.sessionId===config?.sessionId);
 const finished=s.data.runs.filter(r=>r.sessionId===config?.sessionId&&r.end!==undefined);
 const forPost=(p:'A'|'B')=>split[p].map(id=>s.data.students.find(x=>x.id===id)!).filter(Boolean);
 const protect=async(fn:()=>Promise<void>)=>{if(busy)return;setBusy(true);try{await fn();}catch(e){s.notify((e as Error).message);}finally{setBusy(false);}};
 const configure=()=>protect(async()=>{
  if(!current||!split.A.length||!split.B.length)throw new Error('Il faut au moins deux élèves pour répartir la classe.');
  const key=central&&config?.sessionId===current&&config?.transferKey?config.transferKey:newTransferKey();
  const next:OfflineConfig={post:'C',sessionId:current,studentIds:students.map(p=>p.id),groupA:split.A,groupB:split.B,transferKey:key,
   importedPosts:central&&config?.sessionId===current?config.importedPosts:[]};
  if(await s.saveOffline(next)){s.setSessionId(current);s.setMode('complet');setSelectedA(null);s.notify('Répartition enregistrée. Vous pouvez envoyer A et B.');}
 });
 const sendPack=(p:'A'|'B')=>protect(async()=>{
  if(!config||config.post!=='C'||config.sessionId!==current||!config.transferKey)throw new Error('Enregistrez la répartition avant l’envoi.');
  const ids=p==='A'?config.groupA:config.groupB;
  if(!ids?.length)throw new Error('Ce groupe est vide.');
  const pack=createSessionPack(s.data,current,p,ids,config.transferKey);
  s.notify(await shareOrDownload(`Préparation tablette ${p}.json`,JSON.stringify(pack)));
 });
 const importSetup=(event:ChangeEvent<HTMLInputElement>)=>protect(async()=>{
  const file=event.target.files?.[0];event.target.value='';
  if(!file)return;if(file.size>3*1024*1024)throw new Error('Fichier de préparation trop volumineux.');
  const pack=validateSessionPack(JSON.parse(await file.text()));
  if(await s.importOffline(pack)){s.setSessionId(pack.sessionId);s.setMode('complet');setSessionId(pack.sessionId);setLastMessage('');
   s.notify(`Préparation ${pack.post} ajoutée. Les chronos déjà enregistrés sont conservés.`);}
 });
 const exportChronos=(group:'A'|'B')=>protect(async()=>{
  if(!config)throw new Error('Importez d’abord votre préparation.');
  const pack=exportTimes(s.data,config,group),sealed=await sealTimes(pack,config);
  s.notify(await shareOrDownload(`Chrono de la tablette ${group}.json`,sealed));
 });
 const importChronos=(event:ChangeEvent<HTMLInputElement>)=>protect(async()=>{
  const file=event.target.files?.[0];event.target.value='';
  if(!file)return;if(file.size>4*1024*1024)throw new Error('Fichier de chronos trop volumineux.');
  if(!config||config.post!=='C')throw new Error('Ce poste doit être configuré en C.');
  const pack=await openTimes(await file.text(),config);
  const r=await storage.mergeOfflineTimes(pack);
  await s.refresh();
  const msg=`Tablette ${pack.post} : ${r.added} chrono(s) ajoutés, ${r.matched} associés aux cartons, ${r.withoutCorrection} à corriger.`;
  setLastMessage(msg);s.notify(msg);
 });
 const resetSolo=()=>protect(async()=>{
  await s.saveOffline({post:'solo',sessionId:s.sessionId,studentIds:[]});
  s.setMode('complet');s.notify('Mode appareil unique activé. Aucune donnée n’a été supprimée.');
 });
 const launch=(view:'departures'|'control')=>{if(!config||post==='solo'){s.notify('Préparez cet appareil avant de commencer.');return;}s.setSessionId(config.sessionId);s.go(view);};

 return <div className="offline-workspace offline-wizard">
  <div className="offline-hero offline-wizard-hero"><div><span className="eyebrow">SÉANCE HORS LIGNE</span><h2><Tablet size={24}/>Mes appareils</h2><p>Une seule organisation pour les trois postes. Les transferts se font par AirDrop, sans cloud ni synchronisation automatique.</p></div><span className="offline-privacy"><LockKeyhole size={17}/>Local</span></div>
  <nav className="offline-stepbar" aria-label="Parcours des appareils">
   {phases.map(p=><button type="button" key={p.id} aria-current={phase===p.id?'step':undefined} className={phase===p.id?'offline-step active':'offline-step'} onClick={()=>setPhase(p.id)}>
    <span className="offline-step-number">{p.id}</span><span className="offline-step-text"><strong>{p.title}</strong><small>{p.detail}</small></span><p.Icon size={19}/></button>)}
  </nav>
  <div className="offline-current-role"><span className={central?'live':''}>{central?<Monitor size={17}/>:tablet?<Timer size={17}/>:<Tablet size={17}/>}{central?'Poste C · Corrections':post==='AB'?'iPad A + B · Chronos':post==='A'||post==='B'?`iPad ${post} · Chronos`:'Appareil à configurer'}</span>{tablet&&<small>Un même iPad peut gérer A et B</small>}</div>

  {phase===1&&<section className="offline-panel offline-step-panel">
   <div className="offline-panel-heading"><div><span className="eyebrow">01 · PRÉPARER</span><h3>La répartition des élèves</h3></div><span className="offline-panel-hint">Ordre alphabétique · groupes équilibrés</span></div>
   {!tablet&&<><label className="field"><span>Leçon</span><select value={current} onChange={e=>{setSessionId(e.target.value);setSelectedA(null);}}>{sessions.map(l=><option key={l.id} value={l.id}>{l.className||'Classe'} · {l.name}</option>)}</select></label>
    {students.length>0?<div className="offline-split">
     {(['A','B'] as const).map(p=><div className="offline-group" key={p}><h4><Tablet size={18}/>Tablette {p}<span>{split[p].length} élèves</span></h4>
      <div className="offline-group-roster">{forPost(p).map(student=><button type="button" key={student.id} className="offline-student" aria-label={`Déplacer ${student.firstName} ${student.lastName} sur la tablette ${p==='A'?'B':'A'}`} onClick={()=>setSelectedA(old=>{const currentA=old||split.A;return p==='A'?currentA.filter(id=>id!==student.id):[...currentA,student.id];})}><span>{student.lastName.toUpperCase()} {student.firstName}</span><ArrowRight size={15}/></button>)}</div>
     </div>)}
    </div>:<p className="muted">Créez une classe et une leçon avant de répartir les élèves.</p>}
    <div className="offline-step-actions"><button className="button primary" disabled={busy||!students.length} onClick={configure}><Check size={18}/>{central?'Enregistrer la répartition':'Préparer le poste C'}</button>
     {central&&config?.sessionId===current&&<><button className="button" disabled={busy} onClick={()=>sendPack('A')}><Share2 size={17}/>Envoyer A</button><button className="button" disabled={busy} onClick={()=>sendPack('B')}><Share2 size={17}/>Envoyer B</button></>}</div>
   </>}
   {!central&&<div className="offline-tablet-import"><div><strong>Sur un iPad A ou B</strong><p>Recevez les préparations via AirDrop, puis ouvrez-les ici. Si cet iPad doit remplacer les deux tablettes, ajoutez A puis B : vos chronos restent en place.</p></div>
    <label className="button offline-file-button"><FileUp size={18}/>Ajouter une préparation A ou B<input className="sr-only" aria-label="Fichier de préparation A ou B" type="file" accept=".json,application/json" onChange={importSetup}/></label></div>}
  </section>}

  {phase===2&&<section className="offline-panel offline-step-panel">
   <div className="offline-panel-heading"><div><span className="eyebrow">02 · SUR LE TERRAIN</span><h3>Départs, arrivées et corrections</h3></div></div>
   {central?<><p>Au poste C, l’élève remet son carton de contrôle. Touchez son prénom pour corriger une ou plusieurs cartes en une seule fois, sans attendre les chronos.</p><div className="offline-step-actions"><button className="button primary" onClick={()=>launch('control')}><Users size={18}/>Ouvrir les tuiles des élèves<ArrowRight size={17}/></button></div>
    <div className="offline-stats"><span><strong>{corrections.length}</strong> cartons corrigés</span><span><strong>{finished.length}</strong> chronos reçus</span></div></>:tablet?<><p>{post==='AB'?'Cet iPad gère les élèves A et B.':'Cet iPad gère uniquement son groupe.'} Touchez les grandes tuiles pour déclencher ou arrêter les chronos.</p><div className="offline-step-actions"><button className="button primary" onClick={()=>launch('departures')}><Flag size={18}/>Ouvrir les chronos de {config?.studentIds.length||0} élèves<ArrowRight size={17}/></button></div></>:<p>Commencez par la répartition ou ajoutez la préparation reçue par AirDrop.</p>}
  </section>}

  {phase===3&&<section className="offline-panel offline-step-panel">
   <div className="offline-panel-heading"><div><span className="eyebrow">03 · TRANSFÉRER</span><h3>{central?'Récupérer les chronos A et B':'Envoyer les chronos au poste C'}</h3></div></div>
   {central?<><p>Récupérez les fichiers reçus par AirDrop dans Fichiers/Téléchargements. Les anciens fichiers <b>.oruntimes</b> et les nouveaux <b>.json</b> sont acceptés.</p><div className="offline-import-status">{(['A','B'] as const).map(p=><span key={p} className={config?.importedPosts?.includes(p)?'received':''}><Tablet size={16}/>Tablette {p} {config?.importedPosts?.includes(p)?'· reçue':'· en attente'}</span>)}</div>
    <label className="button primary offline-file-button"><FileUp size={18}/>Importer les chronos A ou B<input className="sr-only" aria-label="Fichier de chronos A ou B" type="file" onChange={importChronos}/></label>
    {lastMessage&&<p className="offline-merge-message" role="status">{lastMessage}</p>}</>:tablet?<><p>Arrêtez les chronos encore en cours puis envoyez le ou les fichiers par AirDrop au poste C.</p><div className="offline-step-actions">
     {(['A','B'] as const).filter(p=>post==='AB'||post===p).map(p=><button key={p} className="button primary" disabled={busy} onClick={()=>exportChronos(p)}><Share2 size={18}/>Chrono de la tablette {p}</button>)}</div><p className="muted compact">Fichiers chiffrés. Les données restent sur vos appareils jusqu’à l’importation manuelle.</p></>:<p>Configurez d’abord votre poste au numéro 1.</p>}
  </section>}

  {phase===4&&<section className="offline-panel offline-step-panel">
   <div className="offline-panel-heading"><div><span className="eyebrow">04 · CONSULTER</span><h3>Tous les résultats dans la leçon</h3></div></div>
   <p>Chronos et corrections sont regroupés dans la leçon habituelle : onglet <b>Résultats</b>, puis <b>Classement</b>. Aucun espace supplémentaire à apprendre.</p>
   <div className="offline-step-actions"><button className="button primary" onClick={()=>{if(config){sessionStorage.setItem('orun-open-ranking',config.sessionId);launch('control');}}} disabled={!central}><Trophy size={18}/>Accéder aux résultats de la leçon<ArrowRight size={17}/></button></div>
   {!central&&<p className="muted compact">Les classements complets se consultent depuis le poste C après les transferts.</p>}
  </section>}
  {post!=='solo'&&<button className="text-button offline-solo" disabled={busy} onClick={resetSolo}>Revenir au mode appareil unique (sans supprimer les données)</button>}
 </div>;
}
