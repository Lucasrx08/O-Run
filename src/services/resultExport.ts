import type {Data,Run} from '../domain/types';
import {csvCell,exportCSV} from '../domain/csv';
import {elapsed,formatTime,level} from '../domain/engine';
import {rankRoute,routeKey,successPercent} from '../domain/successRanking';
import {participationRanking,courseCountLevel,falseControlsLevel,idoceoColors} from '../domain/rankingViews';
import type {Level} from '../domain/types';
export interface TableSort{column:number;direction:'asc'|'desc';}
export interface ReportSection{title:string;columns:string[];rows:(string|number)[][];sortValues?:(string|number|null)[][];tones?:(Level|null)[][];}
export function sortedSection(section:ReportSection,sort?:TableSort):ReportSection{if(!sort)return section;const indices=section.rows.map((_,i)=>i).sort((a,b)=>{const av=(section.sortValues||section.rows)[a][sort.column],bv=(section.sortValues||section.rows)[b][sort.column];if(av===null||av===undefined)return bv===null||bv===undefined?a-b:1;if(bv===null||bv===undefined)return -1;const delta=typeof av==='number'&&typeof bv==='number'?av-bv:String(av).localeCompare(String(bv),'fr',{numeric:true});return (sort.direction==='asc'?delta:-delta)||a-b;});return {...section,rows:indices.map(i=>section.rows[i]),sortValues:section.sortValues&&indices.map(i=>section.sortValues![i]),tones:section.tones&&indices.map(i=>section.tones![i])};}
export interface ResultReport{title:string;subtitle:string;note:string;sections:ReportSection[];podium?:{name:string;rank:number;detail:string}[];}
export function gradebookCSV(data:Data,runs:Run[],wide=false){
 if(!wide)return exportCSV(data,runs);
 const groups=[...new Set(runs.map(routeKey))].map((key,i)=>{const group=runs.filter(r=>routeKey(r)===key);return {key,name:`${group[0].courseSnapshot.name} [${i+1}]`,best:rankRoute(group)};});
 const head=['ID élève','NOM','Prénom','Classe','Parcours effectués','Balises réussies','Balises attendues corrigées','Réussite','Repère parcours (1–4)','Repère fautes (1–4)',...groups.flatMap(g=>[`${g.name} · Balises`,`${g.name} · Temps`,`${g.name} · Niveau (1–4)`])];
 const rows=participationRanking(runs).map(t=>{const p=data.students.find(p=>p.id===t.studentId)!;return [p.id,p.lastName,p.firstName,p.className,t.passages||'',t.passages?t.found:'',t.passages?t.expected:'',successPercent(t.found,t.expected),t.passages?courseCountLevel(t.passages):'',t.passages?falseControlsLevel(t.errors):'',...groups.flatMap(g=>{const best=g.best.find(b=>b.run.studentId===t.studentId);return best?[`${best.found}/${best.expected}`,formatTime(elapsed(best.run)),level(best.run)??'']:['','',''];})];});
 return '\uFEFF'+[head,...rows].map(r=>r.map(csvCell).join(';')).join('\r\n');
}
let fontCache:Promise<[string,string]>|null=null;
const base64=(bytes:Uint8Array)=>{let text='';for(let i=0;i<bytes.length;i+=8192)text+=String.fromCharCode(...bytes.subarray(i,i+8192));return btoa(text);};
async function fonts(){if(!fontCache)fontCache=Promise.all(['nunito','outfit'].map(async n=>{const r=await fetch(new URL(`./fonts/${n}.ttf`,document.baseURI));if(!r.ok)throw new Error('La police du PDF n’a pas pu être chargée.');return base64(new Uint8Array(await r.arrayBuffer()));})) as Promise<[string,string]>;return fontCache;}
export async function exportResultPDF(report:ResultReport,filename:string){
 const [{jsPDF},{autoTable},[body,heading]]=await Promise.all([import('jspdf'),import('jspdf-autotable'),fonts()]);
 const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
 doc.addFileToVFS('nunito.ttf',body);doc.addFont('nunito.ttf','Nunito','normal');doc.addFileToVFS('outfit.ttf',heading);doc.addFont('outfit.ttf','Outfit','normal');
 doc.setFillColor(244,249,237);doc.rect(0,0,210,67,'F');
 // Topographic contours and orienteering route, matching the class tiles.
 doc.setDrawColor(215,227,201);doc.setLineWidth(.3);for(let i=0;i<7;i++){doc.ellipse(169+i*2,12+i*3,31+i*3,12+i*3,'S');}
 doc.setDrawColor(244,122,54);doc.setLineWidth(.6);doc.setLineDashPattern([2,2],0);doc.line(147,18,165,34);doc.line(165,34,184,19);doc.setLineDashPattern([],0);doc.triangle(144,14,150,14,147,20,'S');doc.circle(165,34,2.5,'S');doc.circle(184,19,2.5,'S');doc.circle(184,19,1.6,'S');
 doc.setFont('Outfit');doc.setFontSize(23);doc.setTextColor(32,69,47);const title=doc.splitTextToSize(report.title,180);doc.text(title,15,20);let y=21+title.length*8;
 doc.setFont('Outfit');doc.setFontSize(15);doc.setTextColor(71,107,63);const subtitle=doc.splitTextToSize(report.subtitle,180);doc.text(subtitle,15,y);y+=subtitle.length*6+14;
 if(report.podium?.length){const winners=report.podium.slice(0,3),width=(180-(winners.length-1)*5)/winners.length;for(let i=0;i<winners.length;i++){const p=winners[i],x=15+i*(width+5);doc.setFillColor(i===0?255:242,i===0?238:247,i===0?219:233);doc.roundedRect(x,y,width,31,3,3,'F');doc.setFont('Outfit');doc.setFontSize(11);doc.setTextColor(185,109,44);doc.text(`TOP ${p.rank}`,x+5,y+8);doc.setTextColor(44,83,48);doc.setFontSize(12);doc.text(doc.splitTextToSize(p.name,width-10),x+5,y+15);doc.setFont('Nunito');doc.setFontSize(9);doc.text(doc.splitTextToSize(p.detail,width-10),x+5,y+24);}y+=39;}
 doc.setFont('Nunito');doc.setTextColor(112,132,97);doc.setFontSize(8);const note=doc.splitTextToSize(report.note,180);doc.text(note,15,y);y+=note.length*4+7;
 for(const section of report.sections){if(y>245){doc.addPage();y=20;}doc.setFont('Outfit');doc.setFontSize(13);doc.setTextColor(45,86,47);doc.text(doc.splitTextToSize(section.title,180),15,y);y+=7;
 autoTable(doc,{startY:y,margin:{left:15,right:15,bottom:12,top:12},head:[section.columns],body:section.rows.length?section.rows:[section.columns.map((_,i)=>i===0?'Aucun résultat corrigé.':'')],styles:{font:'Nunito',fontStyle:'normal',fontSize:8.5,cellPadding:3,textColor:[52,74,48],lineColor:[229,237,217],lineWidth:.15,overflow:'linebreak'},headStyles:{font:'Outfit',fontStyle:'normal',fillColor:[44,88,51],textColor:[255,255,255],fontSize:9},alternateRowStyles:{fillColor:[247,250,242]},rowPageBreak:'avoid',didParseCell:cell=>{if(cell.section!=='body')return;const tone=section.tones?.[cell.row.index]?.[cell.column.index];if(tone){const hex=idoceoColors[tone];cell.cell.styles.fillColor=[parseInt(hex.slice(1,3),16),parseInt(hex.slice(3,5),16),parseInt(hex.slice(5,7),16)];cell.cell.styles.textColor=[23,43,32];}}});
 y=(doc as typeof doc&{lastAutoTable:{finalY:number}}).lastAutoTable.finalY+13;
 }
 const url=URL.createObjectURL(doc.output('blob'));const link=document.createElement('a');link.href=url;link.download=filename;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
}
