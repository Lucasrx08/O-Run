import {elapsed,formatTime,level,score} from './engine';
import type {Data,Run,Student} from './types';
function normalize(s:string){return s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();}
export function parseCSV(text:string):string[][] {
 text=text.replace(/^\uFEFF/,'');const first=text.split(/\r?\n/)[0];const delimiter=first.includes(';')?';':first.includes('\t')?'\t':',';
 const rows:string[][]=[];let row:string[]=[];let cell='';let quoted=false;
 for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(c===delimiter&&!quoted){row.push(cell.trim());cell='';}else if((c==='\n'||c==='\r')&&!quoted){if(c==='\r'&&text[i+1]==='\n')i++;row.push(cell.trim());if(row.some(Boolean))rows.push(row);row=[];cell='';}else cell+=c;}
 if(quoted)throw new Error('Guillemets non fermés dans le CSV.');row.push(cell.trim());if(row.some(Boolean))rows.push(row);return rows;
}
export function importStudents(text:string,existing:Student[],makeId:()=>string):{students:Student[];duplicates:number;invalid:number} {
 const rows=parseCSV(text);if(rows.length<2)throw new Error('Le CSV doit contenir un en-tête et des élèves.');
 const headers=rows.shift()!.map(normalize); const pick=(aliases:string[])=>headers.findIndex(h=>aliases.includes(h));
 const ni=pick(['nom','last name','lastname','nom de famille']), pi=pick(['prenom','first name','firstname']),ci=pick(['classe','class','class name']);
 if([ni,pi,ci].includes(-1))throw new Error('Colonnes requises : NOM, Prénom, Classe.');
 const key=(s:Student)=>[s.lastName,s.firstName,s.className].map(normalize).join('|');const seen=new Set(existing.map(key));const students:Student[]=[];let duplicates=0,invalid=0;
 for(const row of rows){const s={id:makeId(),lastName:row[ni]||'',firstName:row[pi]||'',className:row[ci]||''};if(!s.lastName||!s.firstName||!s.className){invalid++;continue;}if(seen.has(key(s))){duplicates++;continue;}seen.add(key(s));students.push(s);}
 return {students,duplicates,invalid};
}
export function csvCell(value:unknown):string {let s=String(value??'');if(/^[\s]*[=+\-@\t\r]/.test(s))s="'"+s;return '"'+s.replaceAll('"','""')+'"';}
export function exportCSV(data:Data,runs:Run[]):string {
 const rows:unknown[][]=[['ID élève','NOM','Prénom','Classe','Séquence','Séance','Date','Carte','ID passage','Temps (s)','Temps','Balises fausses','Pénalité (s)','Temps pénalisé (s)','Niveau','Statut']];
 for(const r of runs){const s=data.students.find(s=>s.id===r.studentId),session=data.sessions.find(s=>s.id===r.sessionId);if(!s)continue;rows.push([s.id,s.lastName,s.firstName,s.className,data.sequences.find(q=>q.id===session?.sequenceId)?.name,session?.name,session?.date,r.courseSnapshot.name,r.id,r.end===undefined?'':(elapsed(r)/1000).toFixed(1),r.end===undefined?'':formatTime(elapsed(r)),r.errors,r.errors===null?'':r.errors*r.courseSnapshot.penalty,score(r)===null?'':(score(r)!/1000).toFixed(1),level(r),r.end===undefined?'En course':r.errors===null?'À corriger':'Corrigé']);}
 return '\uFEFF'+rows.map(row=>row.map(csvCell).join(';')).join('\r\n');
}
