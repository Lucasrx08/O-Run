import {useState,type ChangeEvent} from 'react';
import {ArrowRight,Camera,Check,Download,KeyRound,Lock,Monitor,Shield,Tablet,Timer,FileUp} from 'lucide-react';
import {useStore} from '../store';
import {QRScanDialog} from '../components/QRTransfer';
import {decodePreparationQR} from '../services/qrTransfer';
import {validateSessionPack} from '../domain/offline';
import {Dialog,Field} from '../components/ui';
import * as storage from '../services/storage';
import {download} from '../services/download';

export function SettingsPage(){
 const s=useStore(),[scanner,setScanner]=useState<'A'|'B'|null>(null),[busy,setBusy]=useState(false),[recovery,setRecovery]=useState<'A'|'B'|null>(null);
 const [protect,setProtect]=useState(false),[password,setPassword]=useState(''),[confirmPassword,setConfirmPassword]=useState('');
 const loadPack=async(pack:unknown,role:'A'|'B')=>{
  const prepared=validateSessionPack(pack);
  if(prepared.post!==role)throw new Error(`Ce QR prépare la tablette ${prepared.post}, pas la tablette ${role}.`);
  if(!await s.importOffline(prepared))throw new Error('La préparation n’a pas pu être importée.');
  s.setSessionId(prepared.sessionId);s.setMode('complet');s.notify(`Tablette ${role} prête · ${prepared.students.length} élèves.`);
  s.go('departures');
 };
 const importFile=async(event:ChangeEvent<HTMLInputElement>,role:'A'|'B')=>{
  const file=event.target.files?.[0];event.target.value='';if(!file)return;
  try{if(file.size>3*1024*1024)throw new Error('Fichier trop volumineux.');await loadPack(JSON.parse(await file.text()),role);}
  catch(e){s.notify((e as Error).message);}
 };
 const ready=['A','B','AB'].includes(s.offline?.post||'');
 return <div className="page-enter settings-simplified stations-settings">
  <div className="page-heading"><div><p className="overline">SUR LE TERRAIN</p><h1>Mon poste<span>.</span></h1><p className="page-intro">Chaque appareil connaît son rôle. Préparez les iPads en scannant les QR codes de la leçon.</p></div></div>
  <div className="station-options">
   <button type="button" className={s.offline?.post==='C'?'station-choice active':'station-choice'} onClick={()=>{if(s.offline?.post==='C'){s.setSessionId(s.offline.sessionId);s.go('control');}else{s.go('home');s.notify('Ouvrez une classe et une leçon, puis choisissez 2 ou 3 appareils pour configurer le poste C.');}}}>
    <span className="station-choice-icon"><Monitor size={30}/></span><strong>Correction · C</strong><small>Corriger les cartons, scanner les chronos, consulter les classements.</small><span className="station-choice-foot">{s.offline?.post==='C'?<><Check size={16}/>Poste prêt</>:<>Depuis la leçon<ArrowRight size={17}/></>}</span>
   </button>
   {(['A','B'] as const).map(role=><button type="button" key={role} className={(s.offline?.post===role||s.offline?.post==='AB')?'station-choice active':'station-choice'} onClick={()=>setScanner(role)}>
    <span className="station-choice-icon"><Tablet size={30}/></span><strong>Tablette {role}</strong><small>Départs et arrivées du groupe {role}. Scanner la préparation de la leçon.</small>
    <span className="station-choice-foot"><Camera size={17}/>{s.offline?.post===role||s.offline?.post==='AB'?'Réimporter ou ajouter un groupe':'Scanner le QR de préparation'}</span>
   </button>)}</div>
  {ready&&<section className="station-ready"><div><Check size={19}/><strong>{s.offline?.post==='AB'?'iPad A + B prêt':`Tablette ${s.offline?.post} prête`}</strong><span>{s.offline?.studentIds.length} élèves · leçon reçue</span></div>
   <button className="button primary" onClick={()=>{s.setSessionId(s.offline!.sessionId);s.go('departures');}}><Timer size={18}/>Ouvrir les chronos<ArrowRight size={17}/></button></section>}
  {s.offline?.post==='C'&&s.data.runs.some(r=>r.sessionId===s.offline?.sessionId)&&<details className="station-backup station-recovery"><summary><Shield size={17}/>Secours : récupérer les chronos d’une tablette bloquée</summary>
   <p>À utiliser uniquement si cet iPad était une tablette A ou B et qu’une ancienne version l’a fait passer en « Poste C ». La récupération conserve tous les chronos, sans effacement.</p>
   <div className="offline-send-row"><button className="button" onClick={()=>setRecovery('A')}>Retrouver les chronos A</button><button className="button" onClick={()=>setRecovery('B')}>Retrouver les chronos B</button></div>
  </details>}
  <details className="station-backup"><summary><FileUp size={17}/>Transfert par fichier (secours AirDrop)</summary>
   <p>En cas de difficulté avec la caméra, vous pouvez toujours ajouter les préparations JSON par Fichiers.</p>
   <div className="offline-send-row">{(['A','B'] as const).map(role=><label key={role} className="button offline-file-button"><FileUp size={17}/>Préparation {role}<input className="sr-only" aria-label={`Importer préparation ${role}`} type="file" accept=".json,application/json" onChange={e=>void importFile(e,role)}/></label>)}</div>
  </details>
  <details className="advanced-settings settings-local-security"><summary><Shield size={17}/>Protection des données locales</summary>
   <p className="muted compact">Les données des élèves restent sur vos appareils. Pour les protéger en cas de perte, activez une phrase secrète et verrouillez les iPads.</p>
   <div className="button-row"><button className="button" onClick={()=>setProtect(true)}><KeyRound size={18}/>{s.protectedData?'Changer la phrase secrète':'Chiffrer cet appareil'}</button>{s.protectedData&&<button className="button" onClick={s.lockNow}><Lock size={17}/>Verrouiller</button>}</div>
   <button className="button" onClick={()=>{download(`ORun_sauvegarde_${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(s.data),'application/json');s.notify('Copie locale enregistrée.');}}><Download size={17}/>Sauvegarde locale</button>
  </details>
  {scanner&&<QRScanDialog title={`Préparer la tablette ${scanner}`} kind="P" onPayload={async payload=>{await loadPack(decodePreparationQR(payload),scanner);}} onClose={()=>setScanner(null)}/>}
  {recovery&&<Dialog title={`Récupérer la tablette ${recovery} ?`} onClose={()=>setRecovery(null)}><p>Confirmez uniquement sur la tablette contenant les chronos d’origine. Les passages restent intacts et les QR des chronos seront à nouveau accessibles.</p><div className="dialog-actions"><button type="button" className="button primary" disabled={busy} onClick={async()=>{setBusy(true);try{await storage.recoverTabletPost(recovery);await s.refresh();s.notify(`Chronos de la tablette ${recovery} récupérés. Accès aux QR restauré.`);setRecovery(null);}catch(e){s.notify((e as Error).message);}finally{setBusy(false);}}}>Conserver les chronos et restaurer {recovery}</button></div></Dialog>}
  {protect&&<Dialog title="Chiffrer les données locales" onClose={()=>setProtect(false)}><form onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);try{if(password!==confirmPassword)throw new Error('Les phrases secrètes sont différentes.');await storage.protect(password);setProtect(false);setPassword('');setConfirmPassword('');await s.refresh();s.notify('Protection locale activée.');}catch(e){s.notify((e as Error).message);}finally{setBusy(false);}}}><Field label="Phrase secrète (12 caractères minimum)"><input required type="password" minLength={12} value={password} onChange={e=>setPassword(e.target.value)}/></Field><Field label="Confirmer"><input required type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></Field><div className="dialog-actions"><button className="button primary" disabled={busy}>Activer le chiffrement</button></div></form></Dialog>}
 </div>;
}
