import {useState} from 'react';
import {Users} from 'lucide-react';
import {useStore,configCommand} from '../store';
import type {Session} from '../domain/types';
import {Dialog} from './ui';

export function LessonAttendance({session,className}:{session:Session;className:string}){
 const s=useStore();
 const [draft,setDraft]=useState<NonNullable<Session['attendance']>|null>(null);
 const [busy,setBusy]=useState(false);
 const pupils=s.data.students.filter(p=>p.className===className&&(session.studentIds.includes(p.id)||session.attendance?.[p.id]));
 const recorded=(id:string)=>s.data.runs.some(r=>r.sessionId===session.id&&r.studentId===id)
  ||s.data.offlineCorrections?.some(r=>r.sessionId===session.id&&r.studentId===id)
  ||session.poseDeposeTasks?.some(t=>t.placers.includes(id)||t.verifiers.includes(id));
 async function save(){
  if(!draft||busy)return;
  const attendance={...session.attendance};
  for(const p of pupils){
   if(draft[p.id]&&!recorded(p.id))attendance[p.id]=draft[p.id];
   else delete attendance[p.id];
  }
  const roster=new Set([...session.studentIds,...pupils.map(p=>p.id)]);
  const studentIds=s.data.students.filter(p=>roster.has(p.id)&&!attendance[p.id]).map(p=>p.id);
  const updated={...session,attendance,studentIds};
  if(session.deviceGroupA){
   updated.deviceGroupA=studentIds.filter(id=>session.deviceMode!==3||session.deviceGroupA!.includes(id));
   updated.deviceGroupB=studentIds.filter(id=>!updated.deviceGroupA!.includes(id));
  }
  setBusy(true);
  try{
   if(await s.command(configCommand({...s.data,sessions:s.data.sessions.map(l=>l.id===session.id?updated:l)},'Appel enregistré')))setDraft(null);
  }finally{setBusy(false);}
 }
 return <><button type="button" className="lesson-mode-shortcut" onClick={()=>setDraft({...session.attendance})}><Users size={16}/>Appel</button>
 {draft&&<Dialog title={'Appel · '+session.name} onClose={()=>setDraft(null)}>
 {pupils.map(p=><label key={p.id} className="attendance-row"><span>{p.firstName} {p.lastName}{recorded(p.id)&&<small> · Activité enregistrée</small>}</span>
 <select disabled={busy||!!recorded(p.id)} value={draft[p.id]||''} onChange={e=>{const next={...draft};if(e.target.value)next[p.id]=e.target.value as 'absent'|'dispensed';else delete next[p.id];setDraft(next);}}>
 <option value="">Présent</option><option value="absent">Absent</option><option value="dispensed">Dispensé</option></select></label>)}
 {session.deviceMode&&session.deviceMode>1&&<p>Après modification, retransfère la leçon aux tablettes de chronométrage avant les départs.</p>}
 <div className="dialog-actions"><button className="button primary" disabled={busy} onClick={save}>Enregistrer l’appel</button></div></Dialog>}</>;
}
