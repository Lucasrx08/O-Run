import {ViewportGrid} from '../components/ViewportPages';
import {useState,type CSSProperties} from 'react';
import {Check,CheckCircle2,Clock3,Map,Search,Users,Pencil} from 'lucide-react';
import {useStore} from '../store';
import {alphabeticalStudents} from '../domain/offline';
import {elapsed,formatTime,parseTime,studentLabels} from '../domain/engine';
import {uid,type Course,type Session} from '../domain/types';
import {now} from '../services/clock';
import {Dialog} from '../components/ui';

/** Poste C : correction rapide d'un ou plusieurs cartons sans attendre l'import des chronos. */
export function OfflineCorrectionBoard({session}:{session:Session}){
 const s=useStore(),labels=studentLabels(s.data.students);
 const students=alphabeticalStudents(s.data,session.id);
 const courses=session.courseIds.map(id=>s.data.courses.find(c=>c.id===id)).filter((c):c is Course=>!!c);
 const [search,setSearch]=useState(''),[studentId,setStudentId]=useState('');
 const [queueView,setQueueView]=useState<'pending'|'corrected'|'all'>('pending'),[manual,setManual]=useState(false);
 const [manualSelections,setManualSelections]=useState<Record<string,string[]>>({});
 const [drafts,setDrafts]=useState<Record<string,number>>({}),[touched,setTouched]=useState<string[]>([]);
 const [timeDrafts,setTimeDrafts]=useState<Record<string,string>>({}),[timeTouched,setTimeTouched]=useState<string[]>([]);
 const [busy,setBusy]=useState(false);
 const chosen=students.find(p=>p.id===studentId);
 const corrections=(s.data.offlineCorrections||[]).filter(c=>c.sessionId===session.id);
 const runs=s.data.runs.filter(r=>r.sessionId===session.id&&r.end!==undefined);
 const corrected=new Set([...corrections.map(c=>`${c.studentId}:${c.courseId}`),...runs.filter(r=>r.errors!==null).map(r=>`${r.studentId}:${r.courseId}`)]);
 const byCard=(sid:string,cid:string)=>corrections.find(c=>c.studentId===sid&&c.courseId===cid&&c.attempt===1);
 const byRun=(sid:string,cid:string)=>runs.find(r=>r.studentId===sid&&r.courseId===cid);
 // Un carton n'existe que si un passage est chronométré, déjà corrigé ou
 // explicitement déclaré par l'enseignant. Le mode manuel n'invente jamais
 // six cartes effectuées pour chaque élève.
 const cardsFor=(sid:string)=>courses.filter(course=>runs.some(r=>r.studentId===sid&&r.courseId===course.id)||corrections.some(c=>c.studentId===sid&&c.courseId===course.id)||(manualSelections[sid]||[]).includes(course.id));
 const isComplete=(sid:string)=>{const cards=cardsFor(sid);return cards.length>0&&cards.every(c=>corrected.has(`${sid}:${c.id}`));};
 const hasPending=(sid:string)=>cardsFor(sid).some(c=>!corrected.has(`${sid}:${c.id}`));
 const pendingCount=students.filter(p=>hasPending(p.id)).length;
 const completeCount=students.filter(p=>isComplete(p.id)).length;
 const displayed=students.filter(p=>labels.get(p.id)?.toLowerCase().includes(search.toLowerCase())&&
  (queueView==='pending'?hasPending(p.id)||(manual&&cardsFor(p.id).length===0):queueView==='corrected'?isComplete(p.id):manual||cardsFor(p.id).length>0));
 const currentErrors=(course:Course)=>drafts[course.id]??byCard(studentId,course.id)?.errors??byRun(studentId,course.id)?.errors??null;
 const choose=(id:string)=>{setStudentId(id);setDrafts({});setTouched([]);setTimeDrafts({});setTimeTouched([]);};
 const selectErrors=(cid:string,count:number)=>{setDrafts(old=>({...old,[cid]:count}));setTouched(old=>old.includes(cid)?old:[...old,cid]);};
 const editTime=(cid:string,initial:string)=>{setTimeDrafts(old=>({...old,[cid]:initial}));setTimeTouched(old=>old.includes(cid)?old:[...old,cid]);};
 const save=async(next=false)=>{
  if(!chosen||busy||(!touched.length&&!timeTouched.length))return;
  const ids=[...new Set([...touched,...timeTouched])];
  const correctionsToSave:{courseId:string;errors:number;milliseconds?:number}[]=[];
  try{
   for(const courseId of ids){
    const course=courses.find(c=>c.id===courseId)!;
    const value=currentErrors(course);
    if(value===null)throw new Error(`Sélectionnez les balises fausses de ${course.name} avant de corriger son temps.`);
    const milliseconds=timeTouched.includes(courseId)?parseTime(timeDrafts[courseId]):undefined;
    correctionsToSave.push({courseId,errors:value,milliseconds});
   }
  }catch(e){s.notify((e as Error).message);return;}
  setBusy(true);let saved=0;
  for(const item of correctionsToSave){
   if(!await s.command({kind:'offlineCorrect',id:uid(),at:now(),sessionId:session.id,studentId:chosen.id,courseId:item.courseId,attempt:1,errors:item.errors,milliseconds:item.milliseconds}))break;
   saved++;
  }
  setBusy(false);
  if(saved){s.notify(`${labels.get(chosen.id)} · ${saved} carte(s) enregistrée(s).`);}
  if(saved===correctionsToSave.length){
   if(next){const index=displayed.findIndex(p=>p.id===chosen.id);choose(displayed[index+1]?.id??'');}
   else choose('');
  }else{setTouched(old=>old.slice(saved));setTimeTouched(old=>old.slice(saved));}
 };
 return <section className="c-correction-workspace c-correction-new" aria-label="Correction des cartons par élève">
  <div className="c-correction-head"><div><h2>Correction par élève</h2><p>Les tuiles présentent uniquement les parcours effectués.</p></div>
   <div className="c-correction-counter"><strong>{corrected.size}</strong><span>cartons corrigés</span></div>
  </div>
  <div className="c-correction-toolbar"><span><Users size={18}/>{students.length} élèves · {runs.length} chrono(s) reçu(s)</span>
   <div className="c-correction-filters" role="tablist" aria-label="Statut des corrections">{([['pending','À corriger',pendingCount],['corrected','Corrigés',completeCount],['all','Tous',students.filter(p=>cardsFor(p.id).length).length]] as const).map(([id,name,count])=><button type="button" role="tab" key={id} aria-selected={queueView===id} className={queueView===id?'active':''} onClick={()=>setQueueView(id)}>{name} <span>{count}</span></button>)}</div>
   <label className="search"><Search size={17}/><input aria-label="Rechercher un élève à corriger" placeholder="Un prénom…" value={search} onChange={e=>setSearch(e.target.value)}/></label></div>
  {!runs.length&&!corrections.length&&!manual&&<div className="c-pending-hint">Les chronos A / B ne sont pas encore arrivés. Scannez-les pour faire apparaître les passages, ou indiquez manuellement les cartes réellement effectuées. <button type="button" className="button" onClick={()=>setManual(true)}>Corriger un carton avant transfert</button></div>}
  {runs.length>0&&!manual&&<button type="button" className="text-button c-manual-toggle" onClick={()=>setManual(true)}>Corriger un carton avant réception de son chrono</button>}
  {manual&&<button type="button" className="text-button c-manual-toggle" onClick={()=>setManual(false)}>Afficher seulement les passages chronométrés</button>}
  <ViewportGrid className="c-pupil-board" minWidth={180} rowHeight={140} label="Pages des cartons">{displayed.map(p=>{
   const cards=cardsFor(p.id),done=cards.filter(c=>corrected.has(`${p.id}:${c.id}`)).length;
   return <button type="button" key={p.id} className={done===cards.length&&cards.length?'c-student-tile complete':'c-student-tile'} onClick={()=>choose(p.id)}
    aria-label={`Corriger ${labels.get(p.id)}`}>
    <span className="c-student-check">{done?<Check size={15}/>:<span/>}</span>
    <strong>{labels.get(p.id)}</strong>
    <span className="c-student-progress">{cards.length?`${done} / ${cards.length} carte(s)`:'Choisir les cartes'} <span><Map size={14}/></span></span>
   </button>;
  })}</ViewportGrid>
  {chosen&&<Dialog wide title={`Cartons · ${labels.get(chosen.id)}`} onClose={()=>choose('')}>
   <div className="c-student-sheet"><p>Indiquez les <b>balises fausses</b> uniquement sur les cartes récupérées. Vous pouvez corriger plusieurs cartes avant d’enregistrer.</p>
    {manual&&<div className="c-attempt-picker"><span>Cartes réellement effectuées</span><div>{courses.map(course=>{const received=runs.some(r=>r.studentId===chosen.id&&r.courseId===course.id)||corrections.some(c=>c.studentId===chosen.id&&c.courseId===course.id);const picked=cardsFor(chosen.id).some(c=>c.id===course.id);return <button type="button" key={course.id} aria-pressed={picked} disabled={received} className={picked?'active':''} onClick={()=>setManualSelections(old=>{const current=old[chosen.id]||[];return {...old,[chosen.id]:current.includes(course.id)?current.filter(id=>id!==course.id):[...current,course.id]};})}><span style={{background:course.color}}/>{course.name}{picked?' ✓':''}</button>;})}</div></div>}
    {!cardsFor(chosen.id).length&&<div className="c-pending-hint">Aucun parcours déclaré pour cet élève. {manual?'Sélectionnez ci-dessus la ou les cartes de son carton.':'Importez ses chronos ou activez la correction manuelle.'}</div>}
    <div className="c-sheet-grid">{cardsFor(chosen.id).map(course=>{
     const run=byRun(chosen.id,course.id),value=currentErrors(course),dirty=touched.includes(course.id)||timeTouched.includes(course.id);
     return <div className={dirty?'c-sheet-card dirty':value!==null?'c-sheet-card corrected':'c-sheet-card'} key={course.id} style={{'--card-color':course.color} as CSSProperties}>
      <div className="c-sheet-top"><span className="c-sheet-map-icon"><Map size={17}/></span><strong>{course.name}</strong>{value!==null&&<CheckCircle2 size={16} color="#548a50"/>}</div>
      <span className="c-sheet-prompt">Balises fausses</span>
      <div className="c-sheet-buttons" role="group" aria-label={`Balises fausses · ${course.name}`}>{Array.from({length:Math.min(12,course.controls)+1},(_,i)=><button type="button" key={i} aria-label={`${course.name} · ${i} faute${i>1?'s':''}`} aria-pressed={value===i} className={value===i?'active':''} onClick={()=>selectErrors(course.id,i)}>{i}</button>)}</div>
      <div className="c-sheet-time">{run?<><Clock3 size={14}/>{timeTouched.includes(course.id)?<input aria-label={`Temps corrigé · ${course.name}`} autoFocus={false} value={timeDrafts[course.id]} onChange={e=>setTimeDrafts(old=>({...old,[course.id]:e.target.value}))}/>:<><span>{formatTime(elapsed(run),true)}</span><button type="button" aria-label={`Modifier le temps · ${course.name}`} onClick={()=>editTime(course.id,formatTime(elapsed(run),true))}><Pencil size={13}/> Modifier</button></>}</>:<><Clock3 size={14}/>Chrono à recevoir</>}</div>
     </div>;
    })}</div>
    <div className="c-sheet-footer"><span>{new Set([...touched,...timeTouched]).size} carte(s) à enregistrer</span><div className="offline-step-actions">
     <button type="button" className="button" disabled={busy||(!touched.length&&!timeTouched.length)} onClick={()=>void save(true)}>Enregistrer &amp; élève suivant</button>
     <button type="button" className="button primary" disabled={busy||(!touched.length&&!timeTouched.length)} onClick={()=>void save()}><Check size={17}/>Enregistrer les cartes</button></div></div>
   </div>
  </Dialog>}
 </section>;
}
