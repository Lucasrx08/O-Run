import {useEffect,useRef,useState} from 'react';
import {RefreshCw} from 'lucide-react';
import {loadWorkspace,saveCheckpoint} from '../services/storage';
import {useStore} from '../store';

/**
 * Ne jamais recharger un chronomètre ou une écriture en cours.
 * La nouvelle version s'applique seule à l'accueil, après sauvegarde locale
 * et vérification du contenu enregistré. Aucun transfert externe.
 */
export function UpdateNotice(){
 const s=useStore(),[ready,setReady]=useState(false),[updating,setUpdating]=useState(false),[error,setError]=useState('');
 const attempt=useRef(false);
 const running=s.data.runs.some(r=>r.end===undefined);
 const busy=running||s.saving;
 useEffect(()=>{
  if(!import.meta.env.PROD||!('serviceWorker'in navigator))return;
  let disposed=false;
  const hadController=!!navigator.serviceWorker.controller;
  const onChanged=()=>{if(!disposed&&hadController)setReady(true);};
  navigator.serviceWorker.addEventListener('controllerchange',onChanged);
  let registered:ServiceWorkerRegistration|null=null;
  const update=()=>{if(document.visibilityState==='visible'&&navigator.onLine)void registered?.update().catch(()=>{});};
  void navigator.serviceWorker.register('./sw.js',{scope:'./',updateViaCache:'none'})
   .then(reg=>{if(disposed)return;registered=reg;update();}).catch(()=>{});
  document.addEventListener('visibilitychange',update);
  window.addEventListener('online',update);
  const timer=window.setInterval(update,10*60*1000);
  return()=>{disposed=true;window.clearInterval(timer);document.removeEventListener('visibilitychange',update);window.removeEventListener('online',update);navigator.serviceWorker.removeEventListener('controllerchange',onChanged);};
 },[]);
 async function applyUpdate(){
  setUpdating(true);setError('');
  try{
   await saveCheckpoint('Avant mise à jour automatique');
   const workspace=await loadWorkspace();
   if(workspace.data.runs.some(r=>r.end===undefined)){
    setError('Un chronomètre a démarré : mise à jour reportée.');attempt.current=false;setUpdating(false);return;
   }
   window.location.reload();
  }catch{
   setError('Mise à jour reportée : sauvegarde impossible. Exportez une copie depuis les réglages.');
   attempt.current=false;setUpdating(false);
  }
 }
 // À l'accueil uniquement, l'actualisation se fait sans désinstaller l'application.
 useEffect(()=>{
  if(!ready||busy||s.view!=='home'||attempt.current)return;
  attempt.current=true;
  void applyUpdate();
 },[ready,busy,s.view]);
 if(!ready)return null;
 return <aside className="orun-update-notice" role="status">
  <RefreshCw size={19}/>
  <div><strong>Nouvelle version d’O’Run disponible</strong><span>{busy?'Enregistrement en cours : mise à jour différée.':s.view==='home'?'Vérification des données avant actualisation…':'Retournez à l’accueil pour une actualisation automatique, ou utilisez le bouton.'}</span></div>
  <button type="button" disabled={busy||updating||s.view!=='home'} onClick={()=>{if(!attempt.current){attempt.current=true;void applyUpdate();}}}> {updating?'Vérification…':'Mettre à jour'}</button>{error&&<p role="alert">{error}</p>}
 </aside>;
}
