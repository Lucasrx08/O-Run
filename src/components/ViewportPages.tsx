import {Children,useEffect,useRef,useState,type CSSProperties,type ReactNode} from 'react';
import {idoceoColors} from '../domain/rankingViews';
import {ResultTable} from './ResultTable';
import {sortedSection,type ReportSection,type TableSort} from '../services/resultExport';
export function pageCapacity(width:number,height:number,minWidth:number,rowHeight:number){const columns=Math.max(1,Math.floor((width+10)/(minWidth+10))),rows=Math.max(1,Math.floor((height-50+10)/(rowHeight+10)));return {columns,rows,size:columns*rows};}
/** Cherche une grille de classe complète, en donnant la priorité aux noms lisibles. */
export function overviewGrid(width:number,height:number,count:number){
 const n=Math.max(1,count),gap=6,max=Math.min(n,6,Math.max(1,Math.floor((width+gap)/(180+gap))));
 let best={columns:1,rows:n,tileHeight:height/n,tileWidth:width},score=-Infinity;
 for(let columns=1;columns<=max;columns++){
  const rows=Math.ceil(n/columns),w=(width-(columns-1)*gap)/columns,h=(height-(rows-1)*gap)/rows;
  const value=Math.min(w/220,h/70)-Math.abs(Math.log(Math.max(.01,w/h)/3.5))*.08-(columns*rows-n)/n*.25-Math.max(0,42-h)*.08;
  if(value>score){score=value;best={columns,rows,tileHeight:h,tileWidth:w};}
 }
 return best;
}
export function rankingOverview(width:number,height:number,count:number,fields:number){
 const columns=count>14&&width>=900?2:1,rows=Math.max(1,Math.ceil(count/columns));
 const rowHeight=Math.max(18,Math.min(30,Math.floor((height-(fields>5?44:34))/rows)));
 return {columns,rows,rowHeight,fontSize:Math.max(12,Math.min(width<1100&&columns===2&&fields>5?12.5:14,(rowHeight-4)/1.4))};
}
function useBox(){const ref=useRef<HTMLDivElement>(null),[box,setBox]=useState({width:1200,height:620});useEffect(()=>{const e=ref.current;if(!e)return;const measure=()=>{const r=e.getBoundingClientRect();if(r.width&&r.height)setBox({width:r.width,height:r.height});};measure();const o=typeof ResizeObserver==='undefined'?null:new ResizeObserver(measure);o?.observe(e);window.addEventListener('resize',measure);return()=>{o?.disconnect();window.removeEventListener('resize',measure);};},[]);return {ref,box};}
function Pager({page,pages,start,end,total,onChange,label}:{page:number;pages:number;start:number;end:number;total:number;onChange:(n:number)=>void;label:string}){return <nav className="viewport-pager" aria-label={label}><button className="button" disabled={page===0} onClick={()=>onChange(page-1)}>Précédents</button><span aria-live="polite">{start+1}–{end} / {total}<small>Page {page+1} / {pages}</small></span><button className="button" disabled={page>=pages-1} onClick={()=>onChange(page+1)}>Suivants</button></nav>;}
export function ViewportGrid({children,minWidth=200,rowHeight=164,className='',label='Pages',maxColumns=99,mobileRowHeight,overview=false,cellWidth}:{children:ReactNode;minWidth?:number;rowHeight?:number;className?:string;label?:string;maxColumns?:number;mobileRowHeight?:number;overview?:boolean;cellWidth?:number}){
 const items=Children.toArray(children),{ref,box}=useBox(),[wanted,setPage]=useState(0),mobile=box.width<700;
 const full=overview&&!mobile?overviewGrid(box.width-2,box.height-4,items.length):null;
 const tileHeight=full?Math.max(38,Math.min(rowHeight,full.tileHeight)):mobile?(mobileRowHeight??rowHeight):rowHeight;
 const fit=pageCapacity(box.width,box.height,cellWidth??minWidth,tileHeight),columns=full?.columns??(overview?1:Math.min(fit.columns,maxColumns)),size=overview?items.length:columns*fit.rows,pages=Math.max(1,Math.ceil(items.length/Math.max(1,size))),page=Math.min(wanted,pages-1),start=page*size;
 const track=cellWidth?`${Math.min(cellWidth,box.width)}px`:'1fr';
 return <div ref={ref} className={`viewport-pages ${overview?'overview-pages':''} ${cellWidth?'hub-pages':''}`} style={items.length?undefined:{display:'none'}}><div className={`viewport-grid ${className} ${overview?'overview-pupils':''} ${full&&tileHeight<80?'compact-overview':''}`} style={{gridTemplateColumns:`repeat(${columns},minmax(0,${track}))`,gridAutoRows:`${tileHeight}px`,'--overview-tile-height':`${tileHeight}px`,'--overview-font':tileHeight<62?'13px':'14px'} as CSSProperties}>{items.slice(start,start+size)}</div>{!overview&&pages>1&&<Pager label={label} page={page} pages={pages} start={start} end={Math.min(items.length,start+size)} total={items.length} onChange={setPage}/>}</div>;
}
export function ViewportRanking({section,sort,onSort}:{section:ReportSection;sort?:TableSort;onSort:(column:number)=>void}){
 const {ref,box}=useBox(),ordered=sortedSection(section,sort),mobile=box.width<700,layout=rankingOverview(box.width,box.height,ordered.rows.length,ordered.columns.length);
 const part=(offset:number):ReportSection=>({...ordered,rows:ordered.rows.slice(offset,offset+layout.rows),tones:ordered.tones?.slice(offset,offset+layout.rows),sortValues:ordered.sortValues?.slice(offset,offset+layout.rows)});
 return <div className="viewport-ranking overview-ranking" ref={ref} style={{'--ranking-row-height':`${layout.rowHeight}px`,'--ranking-font':`${layout.fontSize}px`} as CSSProperties}>{mobile?<div className="mobile-ranking-cards" aria-label="Classement complet">{ordered.rows.map((row,i)=><article key={i} className="mobile-ranking-card"><header><span>{row[0]}</span><strong>{row[1]}</strong></header><dl>{row.slice(2).map((value,j)=>{const tone=ordered.tones?.[i]?.[j+2];return <div key={j} style={tone?{background:idoceoColors[tone]}:undefined}><dt>{ordered.columns[j+2]}</dt><dd>{value}</dd></div>;})}</dl></article>)}</div>:<div className="viewport-tables" style={{gridTemplateColumns:`repeat(${layout.columns},minmax(0,1fr))`}}>{Array.from({length:layout.columns},(_,i)=>i*layout.rows<ordered.rows.length&&<ResultTable key={i} section={part(i*layout.rows)} sort={sort} onSort={onSort}/>)}</div>}</div>;
}
