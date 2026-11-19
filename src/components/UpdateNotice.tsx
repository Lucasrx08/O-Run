import {useEffect,useState} from 'react';
import {RefreshCw} from 'lucide-react';
import {saveCheckpoint} from '../services/storage';
import {useStore} from '../store';

/** Les mises à jour du service worker ne sont jamais appliquées en plein chrono. */
export function UpdateNotice(){
 const s=useStore(),[ready,setReady]=useState(false),[updating,setUpdating]=useState(false),[error,setError]=useState('');
 const running=s.data.runs.some(r=>r.end===undefined);
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
 if(!ready)return null;
 return <aside className="orun-update-notice" role="status">
  <RefreshCw size={19}/>
  <div><strong>Nouvelle version d’O’Run prête</strong><span>{running?'Terminez les chronos en cours avant d’actualiser.':'Une copie de secours sera créée avant d’actualiser.'}</span></div>
  <button type="button" disabled={running||s.saving||updating} onClick={async()=>{setUpdating(true);setError('');try{await saveCheckpoint();window.location.reload();}catch{setError('Actualisation interrompue : la copie de secours n’a pas pu être créée. Téléchargez une sauvegarde depuis les réglages.');setUpdating(false);}}}>Mettre à jour</button>{error&&<p role="alert">{error}</p>}
 </aside>;
}
