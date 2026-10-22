import {uid,type Course,type Data,type Session,type Student,type Command} from './types';
export const mapColors=['#ef702c','#568d72','#5d87b1','#a789b6','#d48e97','#b7a365'];
export function classNames(d:Data){return [...new Set([...d.sequences.flatMap(s=>s.classes),...d.students.map(s=>s.className),...d.sessions.flatMap(s=>s.className?[s.className]:[])])].filter(Boolean).sort((a,b)=>a.localeCompare(b,'fr',{numeric:true}));}
export function lessonsForClass(d:Data,name:string){return d.sessions.filter(s=>s.className?s.className===name:d.sequences.find(q=>q.id===s.sequenceId)?.classes.includes(name)||s.studentIds.some(id=>d.students.some(p=>p.id===id&&p.className===name)));}
export function lessonStudents(d:Data,s:Session,name:string){return d.students.filter(p=>p.className===name&&s.studentIds.includes(p.id));}
export function createClass(d:Data,name:string,makeId=uid,color=mapColors[0]):Data{name=name.trim();if(!name)throw new Error('Donnez un nom à la classe.');if(classNames(d).some(c=>c.toLowerCase()===name.toLowerCase()))throw new Error('Cette classe existe déjà.');return {...d,sequences:[...d.sequences,{id:makeId(),name,color,period:'',objectives:'',classes:[name],archived:false}]};}
export function newMap(i:number,makeId=uid):Course{return {id:makeId(),name:`Carte ${i}`,color:mapColors[(i-1)%mapColors.length],controls:6,distance:1000,penalty:0,difficulty:'Découverte',rubric:{enabled:false,thresholds:[600,780,960],maxErrors:[0,1,3]}};}
export interface LessonTemplate{name:string;courses:Course[];}
export function copyLesson(d:Data,s:Session):LessonTemplate{return {name:s.name,courses:s.courseIds.map(id=>d.courses.find(c=>c.id===id)).filter((c):c is Course=>!!c).map(c=>structuredClone(c))};}
export interface NewLessonOptions {cards:number;controls:number;}
export function createLesson(d:Data,className:string,name:string,date:string,template?:LessonTemplate,makeId=uid,options:NewLessonOptions={cards:6,controls:6}):{data:Data;session:Session}{
 if(!classNames(d).includes(className))throw new Error('Classe introuvable.');if(!name.trim()||!date)throw new Error('Indiquez un nom et une date.');
 let q=d.sequences.find(q=>q.classes.length===1&&q.classes[0]===className&&!q.archived);if(!q)q={id:makeId(),name:className,period:'',objectives:'',classes:[className],archived:false};
 if(!template&&(!Number.isInteger(options.cards)||options.cards<1||options.cards>30||!Number.isInteger(options.controls)||options.controls<1||options.controls>60))throw new Error('Choisissez entre 1 et 30 cartes et entre 1 et 60 balises par carte.');
 const courses=template?template.courses.map(c=>({...structuredClone(c),familyId:c.familyId||c.id,id:makeId()})):Array.from({length:options.cards},(_,i)=>({...newMap(i+1,makeId),controls:options.controls}));
 const session:Session={id:makeId(),sequenceId:q.id,className,name:name.trim(),date,courseIds:courses.map(c=>c.id),studentIds:d.students.filter(p=>p.className===className).map(p=>p.id)};
 return {data:{...d,sequences:d.sequences.some(x=>x.id===q!.id)?d.sequences:[...d.sequences,q],courses:[...d.courses,...courses],sessions:[...d.sessions,session]},session};
}
export function addClassStudents(d:Data,name:string,students:Student[]):Data{const ids=new Set(lessonsForClass(d,name).map(s=>s.id)),added=students.map(p=>({...p,className:name}));return {...d,students:[...d.students,...added],sessions:d.sessions.map(s=>ids.has(s.id)?{...s,studentIds:[...new Set([...s.studentIds,...added.map(p=>p.id)])]}:s)};}
export function renameClass(d:Data,from:string,to:string):Data{to=to.trim();if(!to)throw new Error('Donnez un nom à la classe.');if(classNames(d).some(c=>c!==from&&c.toLowerCase()===to.toLowerCase()))throw new Error('Cette classe existe déjà.');return {...d,students:d.students.map(p=>p.className===from?{...p,className:to}:p),sequences:d.sequences.map(q=>({...q,name:q.name===from?to:q.name,classes:q.classes.map(c=>c===from?to:c)})),sessions:d.sessions.map(s=>s.className===from?{...s,className:to}:s)};}
export interface StartEntry{studentId:string;courseId:string;}
export function startCommands(sessionId:string,entries:StartEntry[],at:number,makeId=uid):Extract<Command,{kind:'start'}>[]{if(new Set(entries.map(e=>e.studentId)).size!==entries.length)throw new Error('Un élève ne peut pas partir deux fois.');const groups=new Map<string,string[]>();for(const e of entries)groups.set(e.courseId,[...(groups.get(e.courseId)??[]),e.studentId]);return [...groups].map(([courseId,students])=>({kind:'start',id:makeId(),at,sessionId,courseId,students,runIds:students.map(()=>makeId())}));}
export interface ClassWavePlan{id:string;queue:StartEntry[];size:number;interval:number;nextAt:number;paused:boolean;}
export function waveDecision(p:ClassWavePlan,t:number,hidden:boolean,drift:number){if(p.paused)return 'wait';if(hidden||drift>2000||t-p.nextAt>1800)return 'pause';return t>=p.nextAt?'fire':'wait';}
export const today=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;};

export function classColor(d:Data,name:string){return d.sequences.find(q=>q.classes.length===1&&q.classes[0]===name&&q.color)?.color||mapColors[classNames(d).indexOf(name)%mapColors.length]||mapColors[0];}
export function setClassColor(d:Data,name:string,color:string):Data{if(!/^#[0-9a-f]{6}$/i.test(color))throw new Error('Couleur invalide.');const anchor=d.sequences.find(q=>q.classes.length===1&&q.classes[0]===name);return {...d,sequences:anchor?d.sequences.map(q=>q.id===anchor.id?{...q,color}:q):[...d.sequences,{id:uid(),name,color,period:'',objectives:'',classes:[name],archived:false}]};}
export function removeClass(d:Data,name:string):Data{
 if(!classNames(d).includes(name))throw new Error('Classe introuvable.');
 const pupils=new Set(d.students.filter(p=>p.className===name).map(p=>p.id));
 if(d.runs.some(r=>pupils.has(r.studentId)&&r.end===undefined))throw new Error('Arrêtez les chronos de cette classe avant de la supprimer.');
 const sequences=d.sequences.map(q=>({...q,classes:q.classes.filter(n=>n!==name)}));
 const sessions=d.sessions.map(l=>({...l,studentIds:l.studentIds.filter(id=>!pupils.has(id))})).filter(l=>l.className?l.className!==name:l.studentIds.length>0||!!sequences.find(q=>q.id===l.sequenceId)?.classes.length);
 const removedSessions=d.sessions.filter(l=>!sessions.some(x=>x.id===l.id)),removedCourses=new Set(removedSessions.flatMap(l=>l.courseIds)),removedRuns=new Set(d.runs.filter(r=>pupils.has(r.studentId)||removedSessions.some(l=>l.id===r.sessionId)).map(r=>r.id));
 return {...d,students:d.students.filter(p=>!pupils.has(p.id)),sessions,sequences:sequences.filter(q=>q.classes.length||sessions.some(l=>l.sequenceId===q.id)),courses:d.courses.filter(c=>!removedCourses.has(c.id)||sessions.some(l=>l.courseIds.includes(c.id))),runs:d.runs.filter(r=>!removedRuns.has(r.id)),audit:d.audit.filter(a=>!a.runId||!removedRuns.has(a.runId))};
}
