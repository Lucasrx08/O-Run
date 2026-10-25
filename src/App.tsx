import {useEffect,useState} from 'react';
import {ArrowLeft,Check,ChevronRight,Copy,LockKeyhole,Pencil,Settings,Timer} from 'lucide-react';
import {useStore,configCommand} from './store';
import {classNames,copyLesson,type LessonTemplate} from './domain/classroom';
import {Classes,ClassDetail} from './pages/Classrooms';
import {LessonCards} from './pages/LessonCards';
import {RunBoard} from './pages/RunBoard';
import {LessonResults} from './pages/LessonResults';
import {SettingsPage} from './pages/Settings';
import {Dialog,Empty,Field} from './components/ui';
export default function App(){
 const s=useStore();
 const [className,setClassName]=useState<string|null>(null),[tab,setTab]=useState<'lessons'|'students'>('lessons');
 const [lessonView,setLessonView]=useState<'cards'|'field'|'results'|null>(null),[clipboard,setClipboard]=useState<LessonTemplate|null>(null);
 const [metadata,setMetadata]=useState(false),[name,setName]=useState(''),[date,setDate]=useState(''),[saving,setSaving]=useState(false);
 const teacher=s.role==='teacher',session=s.data.sessions.find(l=>l.id===s.sessionId);
 const inferredClass=session?.className||s.data.students.find(p=>session?.studentIds.includes(p.id))?.className||classNames(s.data)[0]||'';
 const currentClass=className&&classNames(s.data).includes(className)?className:inferredClass,active=s.data.runs.filter(r=>r.end===undefined);
 const workMode=s.role==='departure'?'departures':s.role==='arrival'?'arrivals':s.mode;
 const field=teacher?(lessonView?(workMode==='control'?'results':['departures','arrivals'].includes(workMode)?'field':lessonView):null):'field';
 const postLabel=s.offline?.post==='AB'?`iPad A + B · ${s.offline.studentIds.length} élèves`:s.offline?.post==='A'||s.offline?.post==='B'?`iPad ${s.offline.post} · ${s.offline.studentIds.length} élèves`:s.offline?.post==='C'?'Poste C · Corrections':workMode==='arrivals'?'Poste d’arrivée':workMode==='departures'?'Poste de départ':workMode==='control'?'Poste de pilotage':'';
 useEffect(()=>{const prevent=(e:Event)=>e.preventDefault();const touch=(e:TouchEvent)=>{if(e.touches.length>1)e.preventDefault();};document.addEventListener('gesturestart',prevent,{passive:false});document.addEventListener('gesturechange',prevent,{passive:false});document.addEventListener('touchmove',touch,{passive:false});return()=>{document.removeEventListener('gesturestart',prevent);document.removeEventListener('gesturechange',prevent);document.removeEventListener('touchmove',touch);};},[]);
 const home=()=>{setClassName(null);setLessonView(null);s.go('home');};
 const openClass=(n:string)=>{setClassName(n);setLessonView(null);setTab(s.data.students.some(p=>p.className===n)?'lessons':'students');s.go('home');};
 const openLesson=(id:string)=>{s.setSessionId(id);setLessonView(workMode==='control'?'results':workMode==='departures'||workMode==='arrivals'?'field':'cards');s.go('home');};
 useEffect(()=>{if(['departures','arrivals','control'].includes(s.view)){setClassName(inferredClass);setLessonView(s.view==='control'?'results':'field');}},[s.view,inferredClass]);
 const jumpToRun=()=>{const r=active[0];if(!r)return;s.setSessionId(r.sessionId);setClassName(s.data.students.find(p=>p.id===r.studentId)?.className||'');setLessonView('field');s.go('home');};
 return <div className={`app ${field==='field'&&s.view!=='settings'?'terrain-mode':''}`}><a className="skip" href="#main">Aller au contenu</a>
 <header className="app-header"><div className="header-inner"><button className="brand" onClick={home} aria-label="O’Run accueil"><img src="./logo.svg" alt=""/><strong>O’Run<span>.</span><small>LE TERRAIN DE JEU</small></strong></button><div className="header-actions">{postLabel&&<span className="post-badge">{postLabel}</span>}{active.length>0&&<button className="live-pill" onClick={jumpToRun}><Timer size={15}/>{active.length} en course</button>}<span className="demo-tag">{s.room?'Partagé':'Local'}</span>{s.pending>0&&<button className="pending-pill" onClick={()=>s.go('settings')}>{s.pending} en attente</button>}{s.protectedData&&<button className="icon-button" aria-label="Verrouiller" onClick={s.lockNow}><LockKeyhole size={19}/></button>}<button className="icon-button" aria-label="Réglages" onClick={()=>s.go('settings')}><Settings size={21}/></button></div></div></header>
 <main id="main" tabIndex={-1} className={`main-content ${field==='field'?'field-content':''}`}>
 {s.view==='settings'?<><button className="back-link" onClick={()=>s.go('home')}><ArrowLeft size={16}/>Retour</button><SettingsPage/></>:teacher&&!className&&!lessonView?<Classes open={openClass}/>:<>
 {teacher&&<nav className="breadcrumbs" aria-label="Fil d’Ariane"><button onClick={home}>Mes classes</button><ChevronRight size={14}/>{field?<><button onClick={()=>openClass(currentClass)}>{currentClass}</button><ChevronRight size={14}/><span>{session?.name}</span></>:<span>{currentClass}</span>}</nav>}
 {field?session?<><div className="page-heading lesson-heading lesson-heading-stable"><div className="lesson-heading-meta"><div className="title-with-action"><h1>{session.name}</h1>{teacher&&<button className="icon-button" aria-label="Modifier la leçon" onClick={()=>{setName(session.name);setDate(session.date);setMetadata(true);}}><Pencil size={17}/></button>}</div><p className="page-intro">{!teacher&&classNames(s.data).length>1?<select aria-label="Classe affichée" value={currentClass} onChange={e=>setClassName(e.target.value)}>{classNames(s.data).map(n=><option key={n}>{n}</option>)}</select>:currentClass}<span className="separator">·</span>{new Date(session.date+'T12:00:00').toLocaleDateString('fr-FR',{day:'numeric',month:'long'})}</p></div>
 {teacher&&workMode==='complet'&&<div className="lesson-heading-controls"><div className="section-tabs lesson-tabs" role="tablist" aria-label="Leçon"><button role="tab" aria-selected={field==='cards'} className={field==='cards'?'active':''} onClick={()=>setLessonView('cards')}>Cartes<span>{session.courseIds.length}</span></button><button role="tab" aria-selected={field==='field'} className={field==='field'?'active':''} onClick={()=>setLessonView('field')}>Départs & arrivées</button><button role="tab" aria-selected={field==='results'} className={field==='results'?'active':''} onClick={()=>setLessonView('results')}>Résultats</button></div></div>}</div>
 {teacher&&workMode==='complet'&&field==='cards'&&<div className="lesson-copy-line"><button className="button" onClick={()=>{setClipboard(copyLesson(s.data,session));s.notify('Leçon copiée. Ouvrez une classe pour la coller.');}}><Copy size={17}/>Copier la leçon</button></div>}
 {field==='cards'?<LessonCards key={session.id} session={session} className={currentClass} onStart={()=>setLessonView('field')}/>:field==='results'?<LessonResults key={session.id+currentClass+workMode} session={session} className={currentClass} correctionOnly={workMode==='control'}/>:<RunBoard key={session.id+currentClass} session={session} className={currentClass}/>}
 </>:<Empty title="Aucune leçon disponible."/>:<ClassDetail key={currentClass} className={currentClass} tab={tab} setTab={setTab} openLesson={openLesson} renamed={setClassName} clipboard={clipboard} setClipboard={setClipboard}/>}
 </>}
 </main><footer className="app-footer"><span>O’Run · Créé par L. RIGAUX</span><span>{s.room?s.connection:'Enregistré sur cet appareil'}</span></footer>
 {s.notice&&<div className="toast" role="status"><Check size={19}/><span>{s.notice}</span></div>}
 {metadata&&session&&<Dialog title="Modifier la leçon" onClose={()=>setMetadata(false)}><form onSubmit={async e=>{e.preventDefault();if(saving)return;setSaving(true);if(name.trim()&&await s.command(configCommand({...s.data,sessions:s.data.sessions.map(l=>l.id===session.id?{...l,name:name.trim(),date}:l)},'Leçon renommée')))setMetadata(false);setSaving(false);}}><Field label="Nom de la leçon"><input autoFocus required value={name} onChange={e=>setName(e.target.value)}/></Field><Field label="Date"><input type="date" required value={date} onChange={e=>setDate(e.target.value)}/></Field><div className="dialog-actions"><button className="button primary" disabled={saving}>Enregistrer</button></div></form></Dialog>}
 </div>;
}
