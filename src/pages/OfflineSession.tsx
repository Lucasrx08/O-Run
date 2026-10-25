import {useState,type ChangeEvent} from 'react';
import {ArrowRight,Check,CheckCircle2,Download,FileUp,Flag,LockKeyhole,Monitor,Share2,Tablet,Timer,Users} from 'lucide-react';
import {useStore} from '../store';
import {alphabeticalStudents,createSessionPack,exportTimes,splitAlphabetical,validateSessionPack} from '../domain/offline';
import {type OfflineConfig} from '../domain/types';
import {newTransferKey,openTimes,sealTimes,shareOrDownload} from '../services/offlineTransfer';
import * as storage from '../services/storage';

export function OfflineSession(){
 const s=useStore(),sessions=s.data.sessions;
 const [sessionId,setSessionId]=useState(s.offline?.sessionId||s.sessionId);
 const current=sessions.some(t=>t.id===sessionId)?sessionId:sessions[0]?.id||'';
 const students=current?alphabeticalStudents(s.data,current):[];
 const [selectedA,setSelectedA]=useState<string[]|null>(null);
 const effectiveA=selectedA??(s.offline?.post==='C'&&s.offline.sessionId===current&&s.offline.groupA? s.offline.groupA:current?splitAlphabetical(s.data,current).A:[]);
 const split=current?splitAlphabetical(s.data,current,effectiveA):{A:[],B:[]};
 const post=s.offline?.post||'solo',config=s.offline;
 const [busy,setBusy]=useState(false);
 const [lastMessage,setLastMessage]=useState('');
 const existing=s.data.offlineCorrections||[];
 const corrections=existing.filter(c=>c.sessionId===config?.sessionId);
 const finished=s.data.runs.filter(r=>r.sessionId===config?.sessionId&&r.end!==undefined);
 const forPost=(p:'A'|'B')=>split[p].map(id=>s.data.students.find(x=>x.id===id)!).filter(Boolean);
 const protect=async(fn:()=>Promise<void>)=>{if(busy)return;setBusy(true);try{await fn();}catch(e){s.notify((e as Error).message);}finally{setBusy(false);}};
 const configure=()=>protect(async()=>{
  if(!current||!split.A.length||!split.B.length)throw new Error('Il faut au moins deux élèves pour répartir la classe.');
  const key=config?.post==='C'&&config.sessionId===current&&config.transferKey?config.transferKey:newTransferKey();
  const next:OfflineConfig={post:'C',sessionId:current,studentIds:students.map(p=>p.id),groupA:split.A,groupB:split.B,transferKey:key,
   importedPosts:config?.sessionId===current&&config.post==='C'?config.importedPosts:[]};
  if(await s.saveOffline(next)){s.setSessionId(current);s.setMode('complet');setSelectedA(null);s.notify('Poste C prêt. Envoyez maintenant la préparation aux tablettes A et B.');}
 });
 const sendPack=(p:'A'|'B')=>protect(async()=>{
  if(!config||config.post!=='C'||config.sessionId!==current||!config.transferKey)throw new Error('Enregistrez d’abord la répartition du poste C.');
  const ids=p==='A'?config.groupA:config.groupB;
  if(!ids?.length)throw new Error('Ce groupe est vide.');
  const pack=createSessionPack(s.data,current,p,ids,config.transferKey);
  s.notify(await shareOrDownload(`ORun_Preparation_${p}.json`,JSON.stringify(pack)));
 });
 const importSetup=(event:ChangeEvent<HTMLInputElement>)=>protect(async()=>{
  const file=event.target.files?.[0];event.target.value='';
  if(!file)return;if(file.size>3*1024*1024)throw new Error('Fichier de préparation trop volumineux.');
  const pack=validateSessionPack(JSON.parse(await file.text()));
  if(await s.importOffline(pack)){s.setSessionId(pack.sessionId);s.setMode('complet');setSessionId(pack.sessionId);s.notify(`Tablette ${pack.post} prête · ${pack.students.length} élèves.`);}
 });
 const exportChronos=()=>protect(async()=>{
  if(!config)throw new Error('Importez d’abord votre préparation.');
  const pack=exportTimes(s.data,config),sealed=await sealTimes(pack,config);
  s.notify(await shareOrDownload(`ORun_Chronos_${config.post}.json`,sealed));
 });
 const importChronos=(event:ChangeEvent<HTMLInputElement>)=>protect(async()=>{
  const file=event.target.files?.[0];event.target.value='';
  if(!file)return;if(file.size>4*1024*1024)throw new Error('Fichier de chronos trop volumineux.');
  if(!config||config.post!=='C')throw new Error('Ce poste doit être configuré en C.');
  const pack=await openTimes(await file.text(),config);
  const r=await storage.mergeOfflineTimes(pack);
  await s.refresh();
  const msg=`Tablette ${pack.post} : ${r.added} chrono(s) ajoutés, ${r.matched} associé(s) aux corrections, ${r.withoutCorrection} encore à corriger.`;
  setLastMessage(msg);s.notify(msg);
 });
 const resetSolo=()=>protect(async()=>{
  await s.saveOffline({post:'solo',sessionId:s.sessionId,studentIds:[]});
  s.setMode('complet');s.notify('Mode appareil unique activé. Aucune donnée n’a été supprimée.');
 });
 return <div className="offline-workspace">
  <div className="offline-hero"><div><span className="eyebrow">SÉANCE HORS LIGNE</span><h2><Tablet size={24}/>Mes appareils</h2><p>Chaque appareil travaille seul. Aucun serveur, aucune synchronisation. Les chronos sont réunis manuellement par AirDrop en fin de séance.</p></div><span className="offline-privacy"><LockKeyhole size={17}/>Local</span></div>
  <div className="offline-role-summary">
   <span className={post==='C'?'offline-role-active':''}><Monitor size={18}/>Poste C · Correction</span>
   <span className={post==='A'||post==='B'?'offline-role-active':''}><Timer size={18}/>iPad {post==='A'||post==='B'?post:'A / B'} · Chronos</span>
   <span className={post==='solo'?'offline-role-active':''}><CheckCircle2 size={18}/>Appareil unique</span>
  </div>
  {post!=='A'&&post!=='B'&&<section className="offline-panel"><h3><Users size={20}/>Préparer la répartition alphabétique</h3>
   <label className="field"><span>Leçon</span><select value={current} onChange={e=>{setSessionId(e.target.value);setSelectedA(null);}}>{sessions.map(l=><option key={l.id} value={l.id}>{l.className||'Classe'} · {l.name}</option>)}</select></label>
   {students.length>0&&<><p className="muted compact">Les noms sont triés par ordre alphabétique. La coupure est équilibrée automatiquement et peut être ajustée. Une fois les iPads préparés, conservez la même répartition pendant la séance.</p>
    <div className="offline-split">
     {(['A','B'] as const).map(p=><div className="offline-group" key={p}><h4><Tablet size={18}/>Tablette {p}<span>{split[p].length} élèves</span></h4>
      {forPost(p).map(student=><button type="button" key={student.id} className="offline-student" aria-label={`Déplacer ${student.firstName} ${student.lastName} sur la tablette ${p==='A'?'B':'A'}`} onClick={()=>setSelectedA(old=>{const currentA=old||split.A;return p==='A'?currentA.filter(id=>id!==student.id):[...currentA,student.id];})}><span>{student.lastName.toUpperCase()} {student.firstName}</span><ArrowRight size={15}/></button>)}
     </div>)}
    </div>
    <button className="button primary" disabled={busy} onClick={configure}><Check size={18}/>{post==='C'&&config?.sessionId===current?'Enregistrer la répartition':'Configurer cet appareil comme poste C'}</button>
   </>}
   {!students.length&&<p className="muted">Créez d’abord une classe et une leçon pour utiliser trois appareils.</p>}
   {config?.post==='C'&&config.sessionId===current&&<div className="offline-send-row"><button className="button" disabled={busy} onClick={()=>sendPack('A')}><Share2 size={17}/>Envoyer la préparation A</button><button className="button" disabled={busy} onClick={()=>sendPack('B')}><Share2 size={17}/>Envoyer la préparation B</button></div>}
  </section>}
  {post!=='C'&&<section className="offline-panel"><h3><FileUp size={20}/>Configurer un iPad A ou B</h3><p>Depuis le poste C, récupérez le fichier <b>ORun_Preparation_A.json</b> ou <b>ORun_Preparation_B.json</b> par AirDrop et enregistrez-le dans Fichiers. Puis choisissez-le ici. L’importation conserve les autres leçons de la tablette.</p>
   <label className="button offline-file-button"><FileUp size={18}/>Choisir la préparation dans Fichiers<input className="sr-only" type="file" accept=".json,application/json" onChange={importSetup}/></label>
  </section>}
  {(post==='A'||post==='B')&&<section className="offline-panel offline-action"><h3><Timer size={20}/>Tablette {post} · {config?.studentIds.length||0} élèves</h3>
   <p>Cette tablette gère les départs, les arrivées et les redéparts de son groupe uniquement.</p>
   <div className="offline-send-row"><button className="button primary" onClick={()=>{s.setSessionId(config!.sessionId);s.go('departures');}}><Flag size={18}/>Ouvrir les chronos</button>
    <button className="button" disabled={busy} onClick={exportChronos}><Share2 size={18}/>Envoyer les chronos à C</button></div>
   <p className="muted compact">AirDrop sur Mac ou iPad C. Le fichier de temps est chiffré ; aucun nom complet n’est transmis.</p>
  </section>}
  {post==='C'&&<><section className="offline-panel offline-action"><h3><CheckCircle2 size={20}/>Correction par élève</h3>
   <p>La saisie se fait maintenant directement dans le poste de correction : choisissez l’élève, puis sa carte papier. Vous n’avez pas besoin d’attendre les chronos A et B.</p>
   <button className="button primary" onClick={()=>{s.setSessionId(config!.sessionId);s.go('control');}}><Users size={18}/>Ouvrir les profils des élèves <ArrowRight size={18}/></button>
   <div className="offline-stats"><span><strong>{corrections.length}</strong> cartons corrigés</span><span><strong>{finished.length}</strong> chronos reçus</span></div>
  </section>
  <section className="offline-panel"><h3><Download size={20}/>Récupérer les chronos par AirDrop</h3>
   <p>Recevez les fichiers A et B par AirDrop sur ce Mac ou cet iPad, puis importez-les ci-dessous. Les corrections restent enregistrées.</p>
   <div className="offline-import-status">{(['A','B'] as const).map(p=><span key={p} className={config?.importedPosts?.includes(p)?'received':''}><Tablet size={16}/>Tablette {p} {config?.importedPosts?.includes(p)?'· reçue':'· en attente'}</span>)}</div>
   <label className="button primary offline-file-button"><FileUp size={18}/>Importer les chronos A ou B<input className="sr-only" type="file" accept=".json,application/json" onChange={importChronos}/></label>
   {lastMessage&&<p className="offline-merge-message" role="status">{lastMessage}</p>}
   <button className="button" onClick={()=>{s.setSessionId(config!.sessionId);s.go('control');}}><ArrowRight size={18}/>Afficher les résultats complets</button>
  </section></>}
  {post!=='solo'&&<button className="text-button offline-solo" disabled={busy} onClick={resetSolo}>Revenir au mode appareil unique (sans supprimer les données)</button>}
 </div>;
}
