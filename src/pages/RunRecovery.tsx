import {useState} from 'react';
import {RotateCcw,Search,Undo2} from 'lucide-react';
import {Dialog} from '../components/ui';
import {useStore} from '../store';
import {elapsed,formatTime,studentLabels} from '../domain/engine';
import {uid,type Run,type Session,type Student} from '../domain/types';
import {now} from '../services/clock';

/** Accessible seulement dans la vue enseignant, sur les élèves du poste courant. */
export function RunRecovery({session,pupils,onClose}:{session:Session;pupils:Student[];onClose:()=>void}){
 const s=useStore(),[search,setSearch]=useState(''),[confirm,setConfirm]=useState<Run|null>(null),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const labels=studentLabels(s.data.students),ids=new Set(pupils.map(p=>p.id));
 const normalize=(v:string)=>v.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const runs=s.data.runs.filter(r=>r.sessionId===session.id&&ids.has(r.studentId)&&normalize(labels.get(r.studentId)||'').includes(normalize(search))).sort((a,b)=>b.start-a.start);
 const lastCancellation=[...s.data.audit].reverse().find(a=>a.action==='voidRun'&&a.cancelledRun?.sessionId===session.id&&ids.has(a.cancelledRun.studentId)&&!s.data.runs.some(r=>r.id===a.cancelledRun!.id));
 const cancel=async()=>{if(!confirm||busy)return;setBusy(true);setError('');try{if(await s.command({kind:'voidRun',id:uid(),at:now(),runId:confirm.id,expectedRevision:confirm.revision,reason:'Appui accidentel sur la tablette'})){setConfirm(null);s.notify('Départ annulé. La carte est de nouveau disponible pour cet élève.');}}finally{setBusy(false);}};
 return <Dialog wide title="Corriger un départ" onClose={()=>{if(!busy)onClose();}}><p>Un appui accidentel ? Annulez uniquement le dernier départ de l’élève. Les autres cartes et chronos sont conservés.</p>
 <label className="recovery-search"><Search size={18}/><input type="search" aria-label="Rechercher un départ" placeholder="Rechercher un prénom…" value={search} onChange={e=>setSearch(e.target.value)}/></label>
 {lastCancellation&&<button className="button recovery-undo" disabled={busy} onClick={async()=>{setBusy(true);try{await s.command({kind:'restoreRun',id:uid(),at:now(),cancellationId:lastCancellation.id});}finally{setBusy(false);}}}><Undo2 size={17}/>Rétablir le départ annulé de {labels.get(lastCancellation.cancelledRun!.studentId)}</button>}
 <div className="recovery-list">{runs.map(r=>{const latest=!s.data.runs.some(x=>x.studentId===r.studentId&&x.sessionId===r.sessionId&&x.start>r.start),corrected=r.errors!==null||r.manualLevel!==null||r.manualTimeMs!==undefined;return <article key={r.id} className="recovery-row"><div><strong>{labels.get(r.studentId)}</strong><span>{r.courseSnapshot.name} · {r.end===undefined?'En course':'Arrivé'} · {formatTime(elapsed(r,now()),true)}</span></div>{r.end!==undefined&&latest&&!s.data.runs.some(x=>x.studentId===r.studentId&&x.end===undefined)&&<button className="button" disabled={busy||corrected} onClick={async()=>{setBusy(true);try{await s.command({kind:'reopen',id:uid(),at:now(),runId:r.id,reason:'Arrêt accidentel'});}finally{setBusy(false);}}}><RotateCcw size={16}/>Reprendre le chrono</button>}<button className="button recovery-cancel" aria-label={`Annuler le départ de ${labels.get(r.studentId)} · ${r.courseSnapshot.name}`} disabled={busy||!latest||corrected} title={corrected?'Ce passage est déjà corrigé':!latest?'Un départ plus récent existe':undefined} onClick={()=>{setConfirm(r);setError('');}}>Annuler ce départ</button></article>;})}</div>
 {!runs.length&&<p>Aucun départ pour cette recherche.</p>}
 {confirm&&<section className="recovery-confirm" aria-label="Confirmer l’annulation du départ"><strong>{labels.get(confirm.studentId)} · {confirm.courseSnapshot.name}</strong><p>Remettre cette carte à disposition ? Ce passage sera retiré des chronos et pourra être rétabli ici.</p><div><button className="button" disabled={busy} onClick={()=>setConfirm(null)}>Conserver le départ</button><button className="button primary" disabled={busy} onClick={()=>void cancel()}>Confirmer l’annulation</button></div></section>}{error&&<p role="alert">{error}</p>}
 </Dialog>;
}
