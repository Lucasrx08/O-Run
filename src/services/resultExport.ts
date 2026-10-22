import type {Data,Run} from '../domain/types';
import {csvCell,exportCSV} from '../domain/csv';
import {elapsed,formatTime,level} from '../domain/engine';
import {rankOverall,rankRoute,routeKey,successPercent} from '../domain/successRanking';
export interface ReportSection{title:string;columns:string[];rows:(string|number)[][];}
export interface ResultReport{title:string;subtitle:string;note:string;sections:ReportSection[];podium?:{name:string;rank:number;detail:string}[];}
export function gradebookCSV(data:Data,runs:Run[],wide=false){
 if(!wide)return exportCSV(data,runs);
 const groups=[...new Set(runs.map(routeKey))].map((key,i)=>{const group=runs.filter(r=>routeKey(r)===key);return {key,name:`${group[0].courseSnapshot.name} [${i+1}]`,best:rankRoute(group)};});
 const head=['ID élève','NOM','Prénom','Classe','Parcours effectués','Balises réussies','Balises attendues corrigées','Réussite',...groups.flatMap(g=>[`${g.name} · Balises`,`${g.name} · Temps`,`${g.name} · Niveau (1–4)`])];
 const rows=rankOverall(runs).map(t=>{const p=data.students.find(p=>p.id===t.studentId)!;return [p.id,p.lastName,p.firstName,p.className,t.passages,t.found,t.expected,successPercent(t.found,t.expected),...groups.flatMap(g=>{const best=g.best.find(b=>b.run.studentId===t.studentId);return best?[`${best.found}/${best.expected}`,formatTime(elapsed(best.run)),level(best.run)??'']:['','',''];})];});
 return '\uFEFF'+[head,...rows].map(r=>r.map(csvCell).join(';')).join('\r\n');
}
let fontCache:Promise<[string,string]>|null=null;
const base64=(bytes:Uint8Array)=>{let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);};
async function fonts(){if(!fontCache)fontCache=Promise.all(['nunito','outfit'].map(async n=>{const r=await fetch(new URL(`./fonts/${n}.ttf`,document.baseURI));if(!r.ok)throw new Error('La police du PDF n’a pas pu être chargée.');return base64(new Uint8Array(await r.arrayBuffer()));})) as Promise<[string,string]>;return fontCache;}
export async function exportResultPDF(report:ResultReport,filename:string){
 const [{jsPDF},{autoTable},[body,heading]]=await Promise.all([import('jspdf'),import('jspdf-autotable'),fonts()]);
 const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
 doc.addFileToVFS('nunito.ttf',body);doc.addFont('nunito.ttf','Nunito','normal');doc.addFileToVFS('outfit.ttf',heading);doc.addFont('outfit.ttf','Outfit','normal');
 doc.setFillColor(244,249,237);doc.rect(0,0,210,67,'F');doc.setFillColor(244,122,54);doc.roundedRect(15,13,10,10,3,3,'F');doc.setDrawColor(255);doc.setLineWidth(.6);doc.triangle(17,16,23,18,20,21,'S');doc.setFont('Outfit');doc.setTextColor(32,69,47);doc.setFontSize(24);doc.text('O’Run',29,21);doc.setFont('Nunito');doc.setFontSize(8);doc.setTextColor(103,131,83);doc.text('COURSE D’ORIENTATION · EPS',195,20,{align:'right'});
 doc.setFont('Outfit');doc.setFontSize(21);doc.setTextColor(32,69,47);const title=doc.splitTextToSize(report.title,180);doc.text(title,15,38);let y=39+title.length*7;
 doc.setFont('Nunito');doc.setFontSize(10);doc.setTextColor(103,125,85);const subtitle=doc.splitTextToSize(report.subtitle,180);doc.text(subtitle,15,y);y+=subtitle.length*5+12;
 if(report.podium?.length){const winners=report.podium.slice(0,3),width=(180-(winners.length-1)*5)/winners.length;for(let i=0;i<winners.length;i++){const p=winners[i],x=15+i*(width+5);doc.setFillColor(i===0?255:242,i===0?238:247,i===0?219:233);doc.roundedRect(x,y,width,31,3,3,'F');doc.setFont('Outfit');doc.setFontSize(11);doc.setTextColor(185,109,44);doc.text(`TOP ${p.rank}`,x+5,y+8);doc.setTextColor(44,83,48);doc.setFontSize(12);doc.text(doc.splitTextToSize(p.name,width-10),x+5,y+15);doc.setFont('Nunito');doc.setFontSize(9);doc.text(doc.splitTextToSize(p.detail,width-10),x+5,y+24);}y+=39;}
 doc.setFont('Nunito');doc.setTextColor(112,132,97);doc.setFontSize(8);const note=doc.splitTextToSize(report.note,180);doc.text(note,15,y);y+=note.length*4+7;
 for(const section of report.sections){if(y>245){doc.addPage();y=20;}doc.setFont('Outfit');doc.setFontSize(13);doc.setTextColor(45,86,47);doc.text(doc.splitTextToSize(section.title,180),15,y);y+=7;
 autoTable(doc,{startY:y,margin:{left:15,right:15,bottom:19,top:19},head:[section.columns],body:section.rows.length?section.rows:[section.columns.map((_,i)=>i===0?'Aucun résultat corrigé.':'')],styles:{font:'Nunito',fontStyle:'normal',fontSize:8.5,cellPadding:3,textColor:[52,74,48],lineColor:[229,237,217],lineWidth:.15,overflow:'linebreak'},headStyles:{font:'Outfit',fontStyle:'normal',fillColor:[44,88,51],textColor:[255,255,255],fontSize:9},alternateRowStyles:{fillColor:[247,250,242]},rowPageBreak:'avoid'});
 y=(doc as typeof doc&{lastAutoTable:{finalY:number}}).lastAutoTable.finalY+13;
 }
 const count=doc.getNumberOfPages();for(let page=1;page<=count;page++){doc.setPage(page);doc.setDrawColor(221,232,207);doc.line(15,282,195,282);doc.setFont('Nunito');doc.setFontSize(8);doc.setTextColor(132,151,111);doc.text(`O’Run · ${new Date().toLocaleDateString('fr-FR')}`,15,288);doc.text(`${page} / ${count}`,195,288,{align:'right'});}
 const url=URL.createObjectURL(doc.output('blob'));const link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
