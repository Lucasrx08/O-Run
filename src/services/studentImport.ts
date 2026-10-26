import {csvCell,importStudents,parseCSV} from '../domain/csv';
import {uid,type Student} from '../domain/types';

const normalize=(s:string)=>s.normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
function separateName(value:string):[string,string]|null{
 // ÉcoleDirecte colle souvent « NOM Prénom,,,, » sans ligne d'en-tête.
 const match=value.trim().match(/^([\p{Lu}\p{M}'’\-]+(?:\s+[\p{Lu}\p{M}'’\-]+)*)\s+(.+)$/u);
 if(match)return [match[1],match[2].trim()];
 const words=value.trim().split(/\s+/);
 return words.length>=2?[words[0],words.slice(1).join(' ')]:null;
}

export function inspectStudents(text:string,existing:Student[],className:string){
 const rows=parseCSV(text.trim());
 if(!rows.length)throw new Error('Collez des noms ou sélectionnez un fichier CSV / Excel.');
 if(rows.length>2001)throw new Error('Import limité à 2 000 élèves.');
 // ÉcoleDirecte ajoute souvent plusieurs lignes administratives avant « Nom ».
 // Ne jamais confondre l'effectif, la classe ou le professeur avec un élève.
 const headerIndex=rows.findIndex(row=>row.some(cell=>['nom','nom de famille','last name','lastname'].includes(normalize(cell))));
 const header=(headerIndex<0?rows[0]:rows[headerIndex]).map(normalize);
 const ni=header.findIndex(h=>['nom','last name','lastname','nom de famille'].includes(h));
 const pi=header.findIndex(h=>['prenom','first name','firstname'].includes(h));
 const structured=ni>=0&&pi>=0;
 const studentsRows=headerIndex>=0?rows.slice(headerIndex+1):rows;
 const entries=studentsRows.map(row=>{
  if(structured)return [row[ni]||'',row[pi]||'',className];
  if(headerIndex>=0&&ni>=0){const name=separateName(row[ni]||'');return [name?.[0]||'',name?.[1]||'',className];}
  const filled=row.map(cell=>cell.trim()).filter(Boolean);
  if(filled.length>=2)return [filled[0],filled[1],className];
  const name=separateName(filled[0]||'');
  return [name?.[0]||'',name?.[1]||'',className];
 });
 if(!entries.length)throw new Error('Le fichier ne contient aucun élève.');
 return importStudents([['Nom','Prénom','Classe'],...entries].map(r=>r.map(csvCell).join(';')).join('\n'),existing,uid);
}
export async function studentFileText(file:File){
 if(file.size>5*1024*1024)throw new Error('Fichier limité à 5 Mo.');
 if(/\.xlsx?$/i.test(file.name)){
  const buffer=await file.arrayBuffer();
  if(typeof Worker!=='undefined'){
   try{
    const worker=new Worker(new URL('./studentImport.worker.ts',import.meta.url),{type:'module'});
    return await new Promise<string>((resolve,reject)=>{
     const timeout=setTimeout(()=>{worker.terminate();reject(new Error('La lecture Excel est trop longue. Exportez cette liste au format CSV puis réessayez.'));},20000);
     const finish=()=>{clearTimeout(timeout);worker.terminate();};
     worker.onmessage=(event:MessageEvent<{ok:boolean;text?:string;error?:string}>)=>{
      finish();if(event.data.ok&&event.data.text)resolve(event.data.text);else reject(new Error(event.data.error||'Classeur Excel illisible.'));
     };
     worker.onerror=()=>{finish();reject(new Error('Lecture Excel interrompue. Essayez le format CSV.'));};
     worker.postMessage(buffer,[buffer]);
    });
   }catch(e){throw new Error(`${(e as Error).message} Aucun élève n’a été effacé.`);}
  }
  const XLSX=await import('@e965/xlsx');const book=XLSX.read(buffer,{type:'array',dense:true,cellFormula:false,cellHTML:false,sheetRows:2002});
  const sheet=book.SheetNames.map(n=>book.Sheets[n]).find(s=>XLSX.utils.sheet_to_csv(s,{FS:';',blankrows:false}).trim().split(/\r?\n/).length>1);
  if(!sheet)throw new Error('Aucune liste d’élèves trouvée dans ce classeur.');
  return XLSX.utils.sheet_to_csv(sheet,{FS:';',blankrows:false});
 }
 return file.text();
}
