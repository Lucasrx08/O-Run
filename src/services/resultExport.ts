import type {Data,Run} from '../domain/types';
import {csvCell} from '../domain/csv';
import {elapsed,formatTime,level} from '../domain/engine';
import {rankRoute,routeKey,successPercent} from '../domain/successRanking';
import {participationRanking,idoceoColors} from '../domain/rankingViews';
import type {Level} from '../domain/types';
export interface TableSort{column:number;direction:'asc'|'desc';}
export interface ReportSection{title:string;columns:string[];rows:(string|number)[][];sortValues?:(string|number|null)[][];tones?:(Level|null)[][];}
export function sortedSection(section:ReportSection,sort?:TableSort):ReportSection{if(!sort)return section;const indices=section.rows.map((_,i)=>i).sort((a,b)=>{const av=(section.sortValues||section.rows)[a][sort.column],bv=(section.sortValues||section.rows)[b][sort.column];if(av===null||av===undefined)return bv===null||bv===undefined?a-b:1;if(bv===null||bv===undefined)return -1;const delta=typeof av==='number'&&typeof bv==='number'?av-bv:String(av).localeCompare(String(bv),'fr',{numeric:true});return (sort.direction==='asc'?delta:-delta)||a-b;});return {...section,rows:indices.map(i=>section.rows[i]),sortValues:section.sortValues&&indices.map(i=>section.sortValues![i]),tones:section.tones&&indices.map(i=>section.tones![i])};}
export interface ResultReport{title:string;subtitle:string;note:string;sections:ReportSection[];podium?:{name:string;rank:number;detail:string}[];}
export function gradebookCSV(data:Data,runs:Run[],wide=false){
 const nameOf=(id:string)=>{const pupil=data.students.find(p=>p.id===id);return pupil?`${pupil.firstName} ${pupil.lastName.toLocaleUpperCase('fr-FR')}`:'';};
 if(!wide){
  const head=['Prénom NOM','Classe','Leçon','Carte','Balises fausses','Temps','Réussite','Niveau (1–4)'];
  const rows=runs.filter(r=>r.end!==undefined).map(r=>{const p=data.students.find(p=>p.id===r.studentId);const lesson=data.sessions.find(l=>l.id===r.sessionId);return [nameOf(r.studentId),p?.className||'',lesson?.name||'',r.courseSnapshot.name,r.errors??'',formatTime(elapsed(r),true),r.errors===null?'':successPercent(r.courseSnapshot.controls-r.errors,r.courseSnapshot.controls),level(r)??''];});
  return '\uFEFF'+[head,...rows].map(r=>r.map(csvCell).join(';')).join('\r\n');
 }
 const groups=[...new Set(runs.map(routeKey))].map(key=>{const group=runs.filter(r=>routeKey(r)===key);return {name:group[0].courseSnapshot.name,best:rankRoute(group)};});
 const head=['Prénom NOM','Classe','Total de cartes effectuées','Total de balises fausses','Réussite','Temps moyen',...groups.flatMap(g=>[`${g.name} · Balises fausses`,`${g.name} · Temps`,`${g.name} · Niveau (1–4)`])];
 const rows=participationRanking(runs).slice().sort((a,b)=>{const p=data.students.find(p=>p.id===a.studentId),q=data.students.find(p=>p.id===b.studentId);return (p?.lastName||'').localeCompare(q?.lastName||'','fr')||(p?.firstName||'').localeCompare(q?.firstName||'','fr');}).map(t=>{const p=data.students.find(p=>p.id===t.studentId);return [nameOf(t.studentId),p?.className||'',t.passages||'',t.passages?t.errors:'',t.passages?successPercent(t.found,t.expected):'',t.passages?formatTime(t.averageTime,true):'',...groups.flatMap(g=>{const best=g.best.find(b=>b.run.studentId===t.studentId);return best?[`${best.run.errors}`,formatTime(elapsed(best.run),true),level(best.run)??'']:['','',''];})];});
 return '\uFEFF'+[head,...rows].map(r=>r.map(csvCell).join(';')).join('\r\n');
}
let fontCache:Promise<[string,string,string]>|null=null;
const base64=(bytes:Uint8Array)=>{let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);};
async function fonts(){if(!fontCache)fontCache=Promise.all(['nunito','outfit','barlow'].map(async n=>{const r=await fetch(new URL(`./fonts/${n}.ttf`,document.baseURI));if(!r.ok)throw new Error('La police du PDF n’a pas pu être chargée.');return base64(new Uint8Array(await r.arrayBuffer()));})) as Promise<[string,string,string]>;return fontCache;}
export async function exportResultPDF(report:ResultReport,filename:string){
 const [{jsPDF},{autoTable},[body,heading,sport]]=await Promise.all([import('jspdf'),import('jspdf-autotable'),fonts()]);
 const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
 const compact=report.sections.length===1&&report.sections[0].rows.length<=30&&!report.podium?.length;
 doc.addFileToVFS('nunito.ttf',body);doc.addFont('nunito.ttf','Nunito','normal');doc.addFileToVFS('outfit.ttf',heading);doc.addFont('outfit.ttf','Outfit','normal');doc.addFileToVFS('barlow.ttf',sport);doc.addFont('barlow.ttf','Barlow','normal');
 doc.setFillColor(246,135,16);doc.rect(0,0,210,3,'F');
 doc.setFillColor(247,244,239);doc.rect(0,3,210,compact?34:43,'F');
 doc.setDrawColor(238,201,95);doc.setLineWidth(1.2);for(let i=0;i<3;i++)doc.line(179+i*6,4,168+i*6,34);
 doc.setFont('Barlow');doc.setFontSize(compact?22:26);doc.setTextColor(51,51,51);const title=doc.splitTextToSize(report.title,180);doc.text(title,15,compact?17:20);let y=(compact?17:21)+title.length*(compact?6:8);
 doc.setFont('Outfit');doc.setFontSize(compact?11:15);doc.setTextColor(105,96,82);const subtitle=doc.splitTextToSize(report.subtitle,180);doc.text(subtitle,15,y);y+=subtitle.length*(compact?4:6)+(compact?7:14);
 if(report.podium?.length){const winners=report.podium.slice(0,3),width=(180-(winners.length-1)*5)/winners.length;for(let i=0;i<winners.length;i++){const p=winners[i],x=15+i*(width+5);doc.setFillColor(i===0?254:235,i===0?228:229,i===0?167:222);doc.roundedRect(x,y,width,31,3,3,'F');doc.setFont('Outfit');doc.setFontSize(11);doc.setTextColor(169,87,0);doc.text(`TOP ${p.rank}`,x+5,y+8);doc.setTextColor(51,51,51);doc.setFontSize(12);doc.text(doc.splitTextToSize(p.name,width-10),x+5,y+15);doc.setFont('Nunito');doc.setFontSize(9);doc.text(doc.splitTextToSize(p.detail,width-10),x+5,y+24);}y+=39;}
 doc.setFont('Nunito');doc.setTextColor(105,96,82);doc.setFontSize(8);const note=doc.splitTextToSize(report.note,180);doc.text(note,15,y);y+=note.length*(compact?3:4)+(compact?4:7);
 for(const section of report.sections){if(y>245){doc.addPage();y=20;}if(!compact||!report.subtitle.includes(section.title)){doc.setFont('Outfit');doc.setFontSize(compact?10:13);doc.setTextColor(51,51,51);doc.text(doc.splitTextToSize(section.title,180),15,y);y+=compact?5:7;}
 const rowPadding=compact?(section.rows.length<=25?2.35:1.65):3;
 autoTable(doc,{startY:y,margin:{left:compact?10:15,right:compact?10:15,bottom:compact?12:12,top:compact?8:12},head:[section.columns],body:section.rows.length?section.rows:[section.columns.map((_,i)=>i===0?'Aucun résultat corrigé.':'')],styles:{font:'Nunito',fontStyle:'normal',fontSize:compact?9:9.5,cellPadding:rowPadding,textColor:[51,51,51],lineColor:[235,229,222],lineWidth:.15,overflow:'linebreak'},headStyles:{font:'Outfit',fontStyle:'normal',fillColor:[51,51,51],textColor:[255,255,255],fontSize:9},alternateRowStyles:{fillColor:[247,244,239]},rowPageBreak:'avoid',didParseCell:cell=>{if(cell.section!=='body')return;const tone=section.tones?.[cell.row.index]?.[cell.column.index];if(tone){const hex=idoceoColors[tone];cell.cell.styles.fillColor=[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];cell.cell.styles.textColor=[36,36,36];}}});
 y=(doc as typeof doc&{lastAutoTable:{finalY:number}}).lastAutoTable.finalY+13;
 }
 for(let page=1;page<=doc.getNumberOfPages();page++){doc.setPage(page);doc.setDrawColor(235,229,222);doc.line(14,285,196,285);doc.setFont('Nunito');doc.setFontSize(8);doc.setTextColor(105,96,82);doc.text('O’Run · Créé par L. RIGAUX · Le Bon Sauveur',14,290);doc.text(`${page} / ${doc.getNumberOfPages()}`,196,290,{align:'right'});}
 const url=URL.createObjectURL(doc.output('blob'));const link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
