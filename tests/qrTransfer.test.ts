import {describe,expect,it} from 'vitest';
import {createClass,addClassStudents,createLesson} from '../src/domain/classroom';
import {emptyData} from '../src/domain/demo';
import {createSessionPack,importSessionPack,mergeTimes,planLessonDevices} from '../src/domain/offline';
import {createQRFrames,decodePreparationQR,decodeTimingQR,encodePreparationQR,encodeTimingQR,parseQRFrame} from '../src/services/qrTransfer';
import type {Run,Student} from '../src/domain/types';
import QRCode from 'qrcode';
import jsQR from 'jsqr';

function fixture(){
 let data=createClass(emptyData(),'6e QR');
 const students:Student[]=Array.from({length:24},(_,i)=>({id:`p${i.toString().padStart(2,'0')}`,firstName:`Prénom${i}`,lastName:`Nom${i.toString().padStart(2,'0')}`,className:'6e QR'}));
 data=addClassStudents(data,'6e QR',students);
 const created=createLesson(data,'6e QR','Course QR','2026-10-26');
 return {...created,students};
}
function prepared(mode:2|3){
 const {data,session}=fixture();
 const result=planLessonDevices(data,session.id,mode,undefined,()=> 'ab'.repeat(32));
 const lesson=result.data.sessions.find(x=>x.id===session.id)!;
 return {data:result.data,lesson,config:result.config};
}

describe('Préparations et chronos par QR, sans serveur',()=>{
 it('prépare un iPad avec le QR de leçon, et fusionne A/B sur le même iPad',()=>{
  const {data,lesson,config}=prepared(3);
  const a=createSessionPack(data,lesson.id,'A',config.groupA!,'ab'.repeat(32));
  const b=createSessionPack(data,lesson.id,'B',config.groupB!,'ab'.repeat(32));
  const frames=encodePreparationQR(a);
  const decoded=decodePreparationQR(frames.map(f=>parseQRFrame(f).part).join(''));
  expect(decoded).toEqual(a);
  const first=importSessionPack(emptyData(),decoded);
  const second=importSessionPack(first.data,b,first.config);
  expect(second.config.post).toBe('AB');
  expect(second.config.studentIds).toHaveLength(24);
  expect(second.data.students.every(x=>x.lastName.length===1)).toBe(true);
 });
 it('en mode 2, la tablette A reçoit les 24 élèves et le poste C fusionne leurs chronos',async()=>{
  const {data,lesson,config}=prepared(2);
  expect(config.groupA).toHaveLength(24);expect(config.groupB).toHaveLength(0);
  const a=importSessionPack(emptyData(),createSessionPack(data,lesson.id,'A',config.groupA!,'ab'.repeat(32)));
  expect(a.config.devices).toBe(2);
  const course=data.courses.find(c=>c.id===lesson.courseIds[0])!;
  const runs:Run[]=config.groupA!.map((id,i)=>({id:`chrono-${i}`,studentId:id,sessionId:lesson.id,courseId:course.id,start:1000000+i*10000,end:1014500+i*10000,pauses:[],errors:null,manualLevel:null,revision:0,courseSnapshot:course}));
  const frames=await encodeTimingQR({...a.data,runs},a.config,'A');
  const packet=await decodeTimingQR(frames.map(f=>parseQRFrame(f).part).join(''),config,data);
  const merged=mergeTimes(data,config,packet);
  expect(merged.added).toBe(24);expect(merged.data.runs).toHaveLength(24);
  expect(mergeTimes(merged.data,config,packet).added).toBe(0);
  await expect(decodeTimingQR(frames.map(f=>parseQRFrame(f).part).join(''),{...config,transferKey:'cd'.repeat(32)},data)).rejects.toThrow(/déchiffrer/);
 });
 it('réunit 72 temps sur les deux tablettes sans mélanger les groupes',async()=>{
  const {data,lesson,config}=prepared(3),runsByGroup=[] as {group:'A'|'B';frames:string[]}[];
  for(const group of ['A','B'] as const){
   const preparation=createSessionPack(data,lesson.id,group,config[`group${group}`]!,'ab'.repeat(32));
   const tablet=importSessionPack(emptyData(),preparation);
   const runs:Run[]=tablet.config.studentIds.flatMap((studentId,i)=>lesson.courseIds.slice(0,3).map((courseId,j)=>({id:`run-${group}-${i}-${j}`,studentId,sessionId:lesson.id,courseId,start:1750000000000+i*55000+j*1800000,end:1750000010000+i*55000+j*1800000,pauses:[],errors:null,manualLevel:null,revision:0,courseSnapshot:data.courses.find(c=>c.id===courseId)!})));
   runsByGroup.push({group,frames:await encodeTimingQR({...tablet.data,runs},tablet.config,group)});
  }
  let central=data;
  for(const item of runsByGroup){
   const packet=await decodeTimingQR(item.frames.map(f=>parseQRFrame(f).part).join(''),config,central);
   central=mergeTimes(central,config,packet).data;
  }
  expect(central.runs).toHaveLength(72);
  expect(new Set(central.runs.map(r=>r.id)).size).toBe(72);
  expect(runsByGroup.every(x=>x.frames.every(f=>parseQRFrame(f).kind==='T'))).toBe(true);
 });
 it('rejette un QR différent, incomplet ou surdimensionné',()=>{
  expect(()=>parseQRFrame('https://autre.site')).toThrow();
  expect(()=>parseQRFrame('ORUN1|T|3|2|abc')).toThrow();
  expect(()=>createQRFrames('T','a'.repeat(40000))).toThrow(/Trop/);
 });
 it('produit des QR codes de préparation que le lecteur iPad peut décoder',()=>{
  const {data,lesson,config}=prepared(3);
  const preparation=createSessionPack(data,lesson.id,'A',config.groupA!,'ab'.repeat(32));
  for(const frame of encodePreparationQR(preparation)){
   const matrix=QRCode.create(frame,{errorCorrectionLevel:frame.length>1000?'L':'M'}).modules;
   const scale=4,quiet=4,size=matrix.size,width=(size+quiet*2)*scale;
   const pixels=new Uint8ClampedArray(width*width*4);
   for(let y=0;y<width;y++)for(let x=0;x<width;x++){
    const xx=Math.floor(x/scale)-quiet,yy=Math.floor(y/scale)-quiet;
    const black=xx>=0&&yy>=0&&xx<size&&yy<size&&!!matrix.get(yy,xx);
    const p=(y*width+x)*4,v=black?0:255;
    pixels[p]=v;pixels[p+1]=v;pixels[p+2]=v;pixels[p+3]=255;
   }
   expect(jsQR(pixels,width,width)?.data).toBe(frame);
  }
 });
});
