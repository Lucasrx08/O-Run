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
 const [drafts,setDrafts]=useState<Record<string,number>>({}),[touched,setTouched]=useState<string[]>([]);
 const [timeDrafts,setTimeDrafts]=useState<Record<string,string>>({}),[timeTouched,setTimeTouched]=useState<string[]>([]);
 const [busy,setBusy]=useState(false);
 const chosen=students.find(p=>p.id===studentId);
 const corrections=(s.data.offlineCorrections||[]).filter(c=>c.sessionId===session.id);
 const runs=s.data.runs.filter(r=>r.sessionId===session.id&&r.end!==undefined);
 const corrected=new Set([...corrections.map(c=>`${c.studentId}:${c.courseId}`),...runs.filter(r=>r.errors!==null).map(r=>`${r.studentId}:${r.courseId}`)]);
 const byCard=(sid:string,cid:string)=>corrections.find(c=>c.studentId===sid&&c.courseId===cid&&c.attempt===1);
 const byRun=(sid:string,cid:string)=>runs.find(r=>r.studentId===sid&&r.courseId===cid);
 const displayed=students.filter(p=>labels.get(p.id)?.toLowerCase().includes(search.toLowerCase()));
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
  <div className="c-correction-head"><div><span className="eyebrow">POSTE C · CARTONS PAPIER</span><h2>Correction par élève</h2><p>Comme pour les chronos : touchez une tuile, corrigez les cartes reçues, puis enregistrez-les ensemble.</p></div>
   <div className="c-correction-counter"><strong>{corrected.size}</strong><span>cartons corrigés</span></div>
  </div>
  <div className="c-correction-toolbar"><span><Users size={18}/>{students.length} élèves</span>
   <label className="search"><Search size={17}/><input aria-label="Rechercher un élève à corriger" placeholder="Un prénom…" value={search} onChange={e=>setSearch(e.target.value)}/></label></div>
  <div className="c-pupil-board">{displayed.map(p=>{
   const done=courses.filter(c=>corrected.has(`${p.id}:${c.id}`)).length;
   return <button type="button" key={p.id} className={done===courses.length&&courses.length?'c-student-tile complete':'c-student-tile'} onClick={()=>choose(p.id)}
    aria-label={`Corriger ${labels.get(p.id)}`}>
    <span className="c-student-check">{done?<Check size={15}/>:<span/>}</span>
    <strong>{labels.get(p.id)}</strong>
    <span className="c-student-progress">{done} / {courses.length} cartes <span><Map size={14}/></span></span>
   </button>;
  })}</div>
  {chosen&&<Dialog wide title={`Cartons · ${labels.get(chosen.id)}`} onClose={()=>choose('')}>
   <div className="c-student-sheet"><p>Indiquez les <b>balises fausses</b> uniquement sur les cartes récupérées. Vous pouvez corriger plusieurs cartes avant d’enregistrer.</p>
    <div className="c-sheet-grid">{courses.map(course=>{
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
