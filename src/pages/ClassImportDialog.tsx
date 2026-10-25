import {useState,type DragEvent} from 'react';
import {Check,FileSpreadsheet,Upload} from 'lucide-react';
import {useStore,configCommand} from '../store';
import {addClassStudents} from '../domain/classroom';
import {inspectStudents,studentFileText} from '../services/studentImport';
import {Dialog,Field} from '../components/ui';

export function ClassImportDialog({className,onClose}:{className:string;onClose:()=>void}){
 const s=useStore(),[raw,setRaw]=useState(''),[fileName,setFileName]=useState(''),[preview,setPreview]=useState<ReturnType<typeof inspectStudents>|null>(null);
 const [error,setError]=useState(''),[busy,setBusy]=useState(false),[drag,setDrag]=useState(false);
 const check=(content:string)=>{try{const result=inspectStudents(content,s.data.students,className);setPreview(result);setError(result.students.length?'':result.duplicates?'Tous ces élèves sont déjà dans la classe.':'Aucun élève reconnu. Vérifiez le nom et le prénom.');}catch(e){setPreview(null);setError((e as Error).message);}};
 const load=async(file:File)=>{
  setError('');setPreview(null);setFileName(file.name);
  try{const text=await studentFileText(file);setRaw(text);check(text);}catch(e){setFileName('');setError((e as Error).message);}
 };
 const drop=async(e:DragEvent<HTMLDivElement>)=>{e.preventDefault();setDrag(false);const file=e.dataTransfer.files?.[0];if(file)await load(file);};
 const save=async()=>{
  if(!preview?.students.length||busy)return;
  setBusy(true);
  const ok=await s.command(configCommand(addClassStudents(s.data,className,preview.students),'Élèves importés'));
  setBusy(false);
  if(ok){s.notify(`${preview.students.length} élève(s) ajouté(s) à ${className}.`);onClose();}
 };
 return <Dialog wide title={`Importer dans ${className}`} onClose={onClose}>
  <div className={drag?'class-import-drop dragging':'class-import-drop'} onDragOver={e=>{e.preventDefault();setDrag(true);}} onDragLeave={e=>{if(!e.currentTarget.contains(e.relatedTarget as Node))setDrag(false);}} onDrop={drop}>
   <FileSpreadsheet size={27}/>
   <strong>Glisse ton fichier ici</strong><span>ou</span>
   <label className="button"><Upload size={18}/>Choisir un CSV ou Excel<input type="file" className="sr-only" aria-label="Choisir une liste d’élèves" accept=".csv,.txt,.tsv,.xls,.xlsx" onChange={async e=>{const f=e.target.files?.[0];e.target.value='';if(f)await load(f);}}/></label>
   <small>CSV, XLS ou XLSX · 5 Mo maximum</small>
   {fileName&&<p className="class-import-file"><Check size={16}/>{fileName}</p>}
  </div>
  <Field label="Ou colle directement les noms depuis ÉcoleDirecte">
   <textarea rows={5} value={raw} onChange={e=>{setRaw(e.target.value);setFileName('');setPreview(null);setError('');}} placeholder={'MARTEL Théo\nBELIN Léa\nBOREL Nina\n\nou\nNom;Prénom\nMARTEL;Théo'}/>
  </Field>
  <p className="muted compact">Avec ou sans en-têtes, sous la forme « NOM Prénom » ou en deux colonnes. L’ordre alphabétique sera conservé pour les tablettes.</p>
  <button type="button" className="button" disabled={!raw.trim()} onClick={()=>check(raw)}>Vérifier la liste</button>
  {error&&<p className="form-error" role="alert">{error}</p>}
  {preview&&<div className="class-import-verification" role="status"><div className="import-summary"><strong>{preview.students.length} {preview.students.length>1?'nouveaux élèves':'nouvel élève'}</strong><span>{preview.duplicates} doublon(s) ignoré(s)</span>{preview.invalid>0&&<span>{preview.invalid} ligne(s) à vérifier</span>}</div>
   <div className="class-import-preview">{preview.students.slice(0,10).map(p=><span key={p.id}>{p.firstName} {p.lastName}</span>)}{preview.students.length>10&&<small>… et {preview.students.length-10} autres</small>}</div>
   <div className="dialog-actions"><button className="button primary" disabled={!preview.students.length||busy} onClick={()=>void save()}><Check size={18}/>Ajouter {preview.students.length} élève{preview.students.length>1?'s':''} à la classe</button></div>
  </div>}
 </Dialog>;
}
