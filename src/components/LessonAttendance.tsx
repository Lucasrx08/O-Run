import {useState} from 'react';
import {Users,Check,Minus,X,LockKeyhole} from 'lucide-react';
import {useStore,configCommand} from '../store';
import type {Session} from '../domain/types';
import {Dialog} from './ui';

type AttendanceStatus='absent'|'dispensed';
type AttendancePupil={id:string;firstName:string;lastName:string};
export function AttendanceList({pupils,value,onChange,locked,disabled=false}:{pupils:AttendancePupil[];value:Record<string,AttendanceStatus>;onChange:(next:Record<string,AttendanceStatus>)=>void;locked?:(id:string)=>boolean;disabled?:boolean}){
 const ordered=[...pupils].sort((a,b)=>a.lastName.localeCompare(b.lastName,'fr')||a.firstName.localeCompare(b.firstName,'fr'));
 const absent=ordered.filter(p=>value[p.id]==='absent').length,dispensed=ordered.filter(p=>value[p.id]==='dispensed').length;
 return <div className="attendance-list">
 <div className="attendance-counts"><span data-status="present">{ordered.length-absent-dispensed} présents</span><span data-status="dispensed">{dispensed} dispensés</span><span data-status="absent">{absent} absents</span></div>
 <p className="attendance-hint">Touchez un élève : présent → dispensé → absent → présent.</p>
 <div className="attendance-grid">{ordered.map(p=>{
  const status=value[p.id]||'present',label=status==='dispensed'?'Dispensé':status==='absent'?'Absent':'Présent',fixed=!!locked?.(p.id);
  const Icon=fixed?LockKeyhole:status==='dispensed'?Minus:status==='absent'?X:Check;
  return <button type="button" key={p.id} className="attendance-tile" data-status={status} disabled={disabled||fixed} aria-label={p.firstName+' '+p.lastName+' · '+label+(fixed?' · Activité enregistrée':'')} onClick={()=>{const next={...value};if(status==='present')next[p.id]='dispensed';else if(status==='dispensed')next[p.id]='absent';else delete next[p.id];onChange(next);}}>
  <span className="attendance-name">{p.firstName} {p.lastName}</span><span className="attendance-status"><Icon size={15} aria-hidden="true"/>{label}</span>{fixed&&<small>Activité enregistrée</small>}
  </button>;
 })}</div></div>;
}

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
 {draft&&<Dialog wide title={'Appel · '+session.name} onClose={()=>{if(!busy)setDraft(null);}}>
 <AttendanceList pupils={pupils} value={draft} onChange={setDraft} locked={id=>!!recorded(id)} disabled={busy}/>
 {session.deviceMode&&session.deviceMode>1&&<p>Après modification, retransfère la leçon aux tablettes de chronométrage avant les départs.</p>}
 <div className="dialog-actions"><button className="button primary" disabled={busy} onClick={save}>Enregistrer l’appel</button></div></Dialog>}</>;
}
