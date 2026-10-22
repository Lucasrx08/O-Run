import {useEffect,useRef,type ReactNode} from 'react';
import {X,HelpCircle,ArrowUpRight,Flag} from 'lucide-react';
import type {Course,Level} from '../domain/types';
export function Dialog({title,children,onClose,wide=false,full=false}:{title:string;children:ReactNode;onClose:()=>void;wide?:boolean;full?:boolean}){const ref=useRef<HTMLDialogElement>(null);useEffect(()=>{const d=ref.current;d?.showModal();return()=>d?.close();},[]);return <dialog ref={ref} className={full?'dialog fullscreen-dialog':wide?'dialog wide':'dialog'} onCancel={onClose} onClick={e=>{if(e.target===ref.current)onClose();}} aria-label={title}><div className="dialog-head"><h2>{title}</h2><button className="icon-button" aria-label="Fermer" onClick={onClose}><X size={22}/></button></div>{children}</dialog>;}
export function SectionHead({eyebrow,title,children}:{eyebrow?:string;title:string;children?:ReactNode}){return <div className="section-head"><div>{eyebrow&&<p className="eyebrow">{eyebrow}</p>}<h1>{title}</h1></div><div className="head-actions">{children}</div></div>;}
export function Empty({title,children}:{title:string;children?:ReactNode}){return <div className="empty"><Flag size={32} strokeWidth={1.4}/><h3>{title}</h3>{children}</div>;}
export function CourseTag({course}:{course:Course}){return <span className="course-tag"><i style={{background:course.color}}/>{course.name}</span>;}
export function LevelBadge({value}:{value:Level|null}){return value?<span className={`level level-${value}`}>Niveau {value}</span>:<span className="muted">—</span>;}
export function HelpButton({onClick}:{onClick:()=>void}){return <button className="icon-button" aria-label="Aide" onClick={onClick}><HelpCircle size={19}/></button>;}
export function ArrowLink({children,onClick}:{children:ReactNode;onClick:()=>void}){return <button className="text-button" onClick={onClick}>{children}<ArrowUpRight size={17}/></button>;}
export function Field({label,children}:{label:string;children:ReactNode}){return <label className="field"><span>{label}</span>{children}</label>;}
