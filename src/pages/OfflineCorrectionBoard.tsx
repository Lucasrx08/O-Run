import {useState,type CSSProperties} from 'react';
import {Check,CheckCircle2,Clock3,Map,Search,Users} from 'lucide-react';
import {useStore} from '../store';
import {alphabeticalStudents} from '../domain/offline';
import {elapsed,formatTime,parseTime,studentLabels} from '../domain/engine';
import {uid,type Course,type Session} from '../domain/types';
import {now} from '../services/clock';
import {Dialog} from '../components/ui';

/** Poste C : carton papier → élève → carte → fautes, sans attendre le transfert des chronos. */
export function OfflineCorrectionBoard({session}:{session:Session}){
 const s=useStore(),labels=studentLabels(s.data.students);
 const students=alphabeticalStudents(s.data,session.id);
 const courses=session.courseIds.map(id=>s.data.courses.find(c=>c.id===id)).filter((c):c is Course=>!!c);
 const [search,setSearch]=useState(''),[studentId,setStudentId]=useState(''),[selectedCard,setSelectedCard]=useState<string|null>(null);
 const [errors,setErrors]=useState(0),[timeEditing,setTimeEditing]=useState(false),[timeText,setTimeText]=useState(''),[busy,setBusy]=useState(false);
 const chosen=students.find(p=>p.id===studentId);
 const corrections=(s.data.offlineCorrections||[]).filter(c=>c.sessionId===session.id);
 const runs=s.data.runs.filter(r=>r.sessionId===session.id&&r.end!==undefined);
 const corrected=new Set([...corrections.map(c=>`${c.studentId}:${c.courseId}`),...runs.filter(r=>r.errors!==null).map(r=>`${r.studentId}:${r.courseId}`)]);
 const byCard=(sid:string,cid:string)=>corrections.find(c=>c.studentId===sid&&c.courseId===cid&&c.attempt===1);
 const byRun=(sid:string,cid:string)=>runs.find(r=>r.studentId===sid&&r.courseId===cid);
 const displayed=students.filter(p=>labels.get(p.id)?.toLowerCase().includes(search.toLowerCase()));
 const selected=selectedCard?courses.find(c=>c.id===selectedCard):undefined;
 const chooseCard=(course:Course)=>{setErrors(byCard(studentId,course.id)?.errors??byRun(studentId,course.id)?.errors??0);setTimeText(byRun(studentId,course.id)?formatTime(elapsed(byRun(studentId,course.id)!),true):'');setTimeEditing(false);setSelectedCard(course.id);};
 const save=async()=>{
  if(!chosen||!selected||busy)return;
  let milliseconds:number|undefined;
  try{if(timeEditing)milliseconds=parseTime(timeText);}catch(e){s.notify((e as Error).message);return;}
  setBusy(true);
  const ok=await s.command({kind:'offlineCorrect',id:uid(),at:now(),sessionId:session.id,studentId:chosen.id,courseId:selected.id,attempt:1,errors,milliseconds});
  setBusy(false);
  if(ok){setSelectedCard(null);s.notify(`${labels.get(chosen.id)} · ${selected.name} : ${errors} balise(s) fausse(s).`);}
 };
 return <section className="c-correction-workspace" aria-label="Correction des cartons par élève">
  <div className="c-correction-head"><div><span className="eyebrow">POSTE C · CARTONS PAPIER</span><h2>Corriger par élève</h2><p>Le carton revient de la course : touchez l’élève, puis sa carte. Le chrono arrivera par AirDrop plus tard.</p></div>
   <div className="c-correction-counter"><strong>{corrected.size}</strong><span>cartons corrigés</span></div>
  </div>
  <div className="c-correction-layout">
   <aside className="c-pupil-pane"><div className="c-pane-title"><Users size={19}/>Élèves <span>{students.length}</span></div>
    <label className="search c-pupil-search"><Search size={17}/><input aria-label="Rechercher un élève à corriger" placeholder="Un prénom…" value={search} onChange={e=>setSearch(e.target.value)}/></label>
    <div className="c-pupil-list">{displayed.map(p=>{
     const done=courses.filter(c=>corrected.has(`${p.id}:${c.id}`)).length;
     return <button type="button" key={p.id} className={studentId===p.id?'c-pupil-tile active':'c-pupil-tile'} onClick={()=>setStudentId(p.id)} aria-pressed={studentId===p.id}>
      <span className="c-pupil-avatar">{p.firstName.charAt(0)}</span><strong>{labels.get(p.id)}</strong><span className="c-pupil-progress">{done}/{courses.length}</span>
     </button>;
    })}</div>
   </aside>
   <div className="c-card-pane">{!chosen?<div className="c-pick-first"><Users size={42}/><h3>Choisissez un élève</h3><p>Les six cartes apparaîtront ici, même si les chronos A et B ne sont pas encore revenus.</p></div>:<>
    <div className="c-selected-heading"><div><span className="eyebrow">CARTON DE CONTRÔLE</span><h3>{labels.get(chosen.id)}</h3></div><span>{courses.filter(c=>corrected.has(`${chosen.id}:${c.id}`)).length} / {courses.length} corrigées</span></div>
    <div className="c-card-grid">{courses.map(course=>{
     const correction=byCard(chosen.id,course.id),run=byRun(chosen.id,course.id),doneErrors=correction?.errors??run?.errors;
     return <button type="button" key={course.id} className={doneErrors!==null&&doneErrors!==undefined?'c-course-tile corrected':'c-course-tile'} style={{'--card-color':course.color} as CSSProperties} onClick={()=>chooseCard(course)}>
      <span className="c-course-icon"><Map size={19}/></span><strong>{course.name}</strong>
      <span className="c-course-status">{doneErrors!==null&&doneErrors!==undefined?<><CheckCircle2 size={15}/>{doneErrors} fausse{doneErrors>1?'s':''}</>:<>À corriger</>}</span>
      <span className="c-course-time">{run?<><Clock3 size={15}/>{formatTime(elapsed(run),true)}</>:<><Clock3 size={15}/>Chrono attendu</>}</span>
     </button>;
    })}</div>
   </>}</div>
  </div>
  {selected&&chosen&&<Dialog title={`${labels.get(chosen.id)} · ${selected.name}`} onClose={()=>setSelectedCard(null)}>
   <p className="muted compact">Reportez uniquement le nombre de balises fausses du carton papier.</p>
   {byRun(chosen.id,selected.id)&&<div className="c-time-row"><span>Chrono reçu</span>{timeEditing?<label className="correction-time-input"><span>Temps (mm:ss.d)</span><input autoFocus inputMode="decimal" aria-label="Temps corrigé du poste C" value={timeText} onChange={e=>setTimeText(e.target.value)}/></label>:<button className="correction-time-edit" aria-label="Corriger le temps du poste C" onClick={()=>setTimeEditing(true)}><strong className="mono">{formatTime(elapsed(byRun(chosen.id,selected.id)!),true)}</strong><span>✎ Corriger le temps</span></button>}</div>}
   <div className="offline-errors"><span>Balises fausses</span><div className="offline-error-buttons">{Array.from({length:Math.min(12,selected.controls)+1},(_,i)=><button type="button" key={i} aria-pressed={errors===i} className={errors===i?'active':''} onClick={()=>setErrors(i)}>{i}</button>)}</div></div>
   <div className="c-correction-preview"><strong>{errors} faute{errors>1?'s':''}</strong><span>{byRun(chosen.id,selected.id)?'Chrono déjà reçu':'Chrono à associer après AirDrop'}</span></div>
   <div className="dialog-actions"><button className="button primary" disabled={busy} onClick={save}><Check size={18}/>Enregistrer la carte</button></div>
  </Dialog>}
 </section>;
}
