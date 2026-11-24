import {useEffect,useRef,useState} from 'react';
import {RefreshCw} from 'lucide-react';
import {saveCheckpoint,loadWorkspace} from '../services/storage';
import {useStore} from '../store';

/** Les mises à jour du service worker ne sont jamais appliquées en plein chrono. */
export function UpdateNotice(){
 const s=useStore(),[ready,setReady]=useState(false),[updating,setUpdating]=useState(false),[error,setError]=useState('');
 const attempt=useRef(false);
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
 const applyUpdate=async()=>{if(attempt.current||running||s.saving)return;attempt.current=true;setUpdating(true);setError('');try{await saveCheckpoint();const w=await loadWorkspace();if(w.data.runs.some(r=>r.end===undefined))throw new Error('Chrono actif');window.location.reload();}catch{setError('Actualisation reportée. Téléchargez une sauvegarde depuis les réglages.');setUpdating(false);attempt.current=false;}};
 useEffect(()=>{if(!ready||running||s.saving||updating||error)return;let timer:number;const schedule=()=>{clearTimeout(timer);timer=window.setTimeout(()=>{if(!document.querySelector('dialog[open]')&&document.querySelector('.class-grid'))void applyUpdate();},1500);};const observer=new MutationObserver(schedule);observer.observe(document.getElementById('main')||document.body,{childList:true,subtree:true});schedule();return()=>{clearTimeout(timer);observer.disconnect();};},[ready,running,s.saving,updating,error,s.view]);
 if(!ready)return null;
 return <aside className="orun-update-notice" role="status">
  <RefreshCw size={19}/>
  <div><strong>Nouvelle version d’O’Run prête</strong><span>{running?'Terminez les chronos en cours avant d’actualiser.':'Une copie de secours sera créée avant d’actualiser.'}</span></div>
  <button type="button" disabled={running||s.saving||updating} onClick={()=>void applyUpdate()}>Mettre à jour</button>{error&&<p role="alert">{error}</p>}
 </aside>;
}
