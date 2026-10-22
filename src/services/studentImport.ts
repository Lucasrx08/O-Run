import {csvCell,importStudents,parseCSV} from '../domain/csv';
import {uid,type Student} from '../domain/types';
export function inspectStudents(text:string,existing:Student[],className:string){
 const rows=parseCSV(text);if(rows.length<2)throw new Error('Ajoutez la ligne d’en-tête Nom et Prénom puis les élèves.');
 const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
 const ci=rows[0].findIndex(h=>['classe','class'].includes(normalize(h)));
 if(ci<0){rows[0].push('Classe');for(const row of rows.slice(1))row.push(className);}else for(const row of rows.slice(1))row[ci]=className;
 if(rows.length>2001)throw new Error('Import limité à 2 000 élèves.');
 return importStudents(rows.map(r=>r.map(csvCell).join(';')).join('\n'),existing,uid);
}
export async function studentFileText(file:File){
 if(file.size>5*1024*1024)throw new Error('Fichier limité à 5 Mo.');
 if(/\.xlsx?$/i.test(file.name)){
  const XLSX=await import('@e965/xlsx');const book=XLSX.read(await file.arrayBuffer(),{type:'array',cellFormula:false,cellHTML:false,sheetRows:2002});
  const sheet=book.SheetNames.map(n=>book.Sheets[n]).find(s=>XLSX.utils.sheet_to_json(s,{header:1,blankrows:false}).length>1);
  if(!sheet)throw new Error('Aucune liste d’élèves trouvée dans ce classeur.');
  return XLSX.utils.sheet_to_csv(sheet,{FS:';'});
 }
 return file.text();
}
