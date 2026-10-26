import {it,expect,vi} from 'vitest';
import {readFileSync,writeFileSync} from 'node:fs';
import {exportResultPDF} from '../src/services/resultExport';
it('produces a PDF with embedded fonts',async()=>{let generated:Blob|undefined;vi.stubGlobal('document',{baseURI:'http://localhost/',createElement:()=>({click(){},remove(){}}),body:{appendChild(){}}});vi.stubGlobal('fetch',async(url:URL)=>({ok:true,arrayBuffer:async()=>{const b=readFileSync(`public${url.pathname}`);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}}));vi.spyOn(URL,'createObjectURL').mockImplementation((blob)=>{generated=blob as Blob;return 'blob:pdf';});await exportResultPDF({title:'5e Horizon',subtitle:'Classement général · jusqu’à la leçon 7',note:'Seuls les parcours effectués et corrigés comptent.',podium:[{name:'Lina D.',rank:1,detail:'100 % de réussite'},{name:'Lucas R.',rank:1,detail:'100 % de réussite'}],sections:[{title:'Réussite globale',columns:['Rang','Élève','Parcours','Bonnes balises','Fautes','Temps moyen'],rows:[[1,'Lina D.',4,24,0,'05:40'],[2,'Lucas R.',3,17,1,'06:10'],[3,'Jade M.',2,9,4,'07:00'],[4,'Emma D.',1,1,5,'08:00']],tones:[[null,null,4,null,4,null],[null,null,3,null,3,null],[null,null,2,null,2,null],[null,null,1,null,1,null]]}]},'test.pdf');expect(URL.createObjectURL).toHaveBeenCalled();expect((await generated!.text()).startsWith('%PDF')).toBe(true);if(process.env.ORUN_PDF_PREVIEW)writeFileSync(process.env.ORUN_PDF_PREVIEW,new Uint8Array(await generated!.arrayBuffer()));vi.unstubAllGlobals();vi.restoreAllMocks();});
it('garde 30 élèves sur une seule page A4 en mode classement compact',async()=>{
 let generated:Blob|undefined;
 vi.stubGlobal('document',{baseURI:'http://localhost/',createElement:()=>({click(){},remove(){}}),body:{appendChild(){}}});
 vi.stubGlobal('fetch',async(url:URL)=>({ok:true,arrayBuffer:async()=>{const b=readFileSync(`public${url.pathname}`);return b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength);}}));
 vi.spyOn(URL,'createObjectURL').mockImplementation(blob=>{generated=blob as Blob;return 'blob:pdf';});
 try{
  await exportResultPDF({title:'6e Daudet',subtitle:'Leçon 1 · Classement général',note:'Parcours corrigés.',sections:[{title:'Classement général',columns:['Rang','Élève','Cartes','Balises fausses','Temps moyen','Réussite','Leçons'],rows:Array.from({length:30},(_,i)=>[i+1,`Élève ${i+1} D.`,1,i%6,'01:24.5','83,3 %',1])}]},'classement-30.pdf');
  const source=await generated!.text();
  expect([...source.matchAll(/\/Type\s*\/Page\b/g)]).toHaveLength(1);
 }finally{vi.unstubAllGlobals();vi.restoreAllMocks();}
});
