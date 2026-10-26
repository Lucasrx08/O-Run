import * as XLSX from '@e965/xlsx';

/** Parse les classeurs hors du fil d'interface, particulièrement important sur iPad. */
self.onmessage=(event:MessageEvent<ArrayBuffer>)=>{
 try{
  const book=XLSX.read(event.data,{type:'array',dense:true,cellFormula:false,cellHTML:false,cellStyles:false,cellNF:false,cellText:false,sheetRows:2002});
  let csv='';
  for(const name of book.SheetNames){
   const candidate=XLSX.utils.sheet_to_csv(book.Sheets[name],{FS:';',blankrows:false});
   if(candidate.trim().split(/\r?\n/).length>1){csv=candidate;break;}
  }
  if(!csv)throw new Error('Aucune liste d’élèves trouvée dans ce classeur.');
  self.postMessage({ok:true,text:csv});
 }catch(error){self.postMessage({ok:false,error:error instanceof Error?error.message:'Lecture Excel impossible.'});}
};
