import references from './punchReferences.json';
export type Point=[number,number];
export const punchReferences=references as Point[][][];
export const beaconNumbers=[[49,57,64,66,67,65],[35,58,47,39,55,68],[34,69,40,56,59,46],[71,41,63,36,60,45],[37,70,32,48,72,44],[62,33,31,38,50,61]];
const distance=(a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function normalize(points:Point[]){const cx=points.reduce((n,p)=>n+p[0],0)/points.length,cy=points.reduce((n,p)=>n+p[1],0)/points.length;const scale=Math.sqrt(points.reduce((n,p)=>n+(p[0]-cx)**2+(p[1]-cy)**2,0)/points.length)||1;return points.map(p=>[(p[0]-cx)/scale,(p[1]-cy)/scale] as Point);}
/** Translation, size and rotation invariant; never treats missing holes as a fault. */
export function shapeDistance(a:Point[],b:Point[]){if(a.length!==b.length||a.length<2)return Infinity;const aa=normalize(a),bb=normalize(b);let best=Infinity;for(const p of aa)for(const q of bb){const angle=Math.atan2(q[1],q[0])-Math.atan2(p[1],p[0]),c=Math.cos(angle),s=Math.sin(angle);const rotated=aa.map(([x,y])=>[x*c-y*s,x*s+y*c] as Point);const score=Math.max(...rotated.map(p=>Math.min(...bb.map(q=>distance(p,q)))),...bb.map(p=>Math.min(...rotated.map(q=>distance(p,q)))));best=Math.min(best,score);}return best;}
export function classifyPunch(points:Point[],expected:Point[]){const score=shapeDistance(points,expected);return {score,status:score<.16?'match' as const:'review' as const};}
/** Local dark contrasts; reject red ink by red/green separation, not warm paper tint. */
export function detectHoles(data:Uint8ClampedArray,width:number,height:number,contrast=9):Point[]{
 const gray=new Float32Array(width*height),integral=new Float64Array((width+1)*(height+1));
 for(let y=0;y<height;y++){let sum=0;for(let x=0;x<width;x++){const i=y*width+x,k=i*4;gray[i]=(data[k]+data[k+1]+data[k+2])/3;sum+=gray[i];integral[(y+1)*(width+1)+x+1]=integral[y*(width+1)+x+1]+sum;}}
 const mask=new Uint8Array(width*height),r=7;
 for(let y=10;y<height-10;y++)for(let x=10;x<width-10;x++){const i=y*width+x,k=i*4,x0=Math.max(0,x-r),x1=Math.min(width,x+r+1),y0=Math.max(0,y-r),y1=Math.min(height,y+r+1);const mean=(integral[y1*(width+1)+x1]-integral[y0*(width+1)+x1]-integral[y1*(width+1)+x0]+integral[y0*(width+1)+x0])/((x1-x0)*(y1-y0));if(mean-gray[i]>contrast&&!(data[k]-data[k+1]>35&&data[k]-data[k+2]>45))mask[i]=1;}
 const points:Point[]=[];for(let i=0;i<mask.length;i++)if(mask[i]){const stack=[i];mask[i]=0;let n=0,sx=0,sy=0,minx=width,maxx=0,miny=height,maxy=0;while(stack.length){const j=stack.pop()!,x=j%width,y=Math.floor(j/width);n++;sx+=x;sy+=y;minx=Math.min(minx,x);maxx=Math.max(maxx,x);miny=Math.min(miny,y);maxy=Math.max(maxy,y);for(const next of [j-1,j+1,j-width,j+width])if(next>=0&&next<mask.length&&mask[next]){mask[next]=0;stack.push(next);}}if(n>=4&&n<=90&&maxx-minx<15&&maxy-miny<15)points.push([sx/n,sy/n]);}const merged:Point[]=[];for(const p of points){const existing=merged.find(q=>distance(p,q)<5);if(existing){existing[0]=(existing[0]+p[0])/2;existing[1]=(existing[1]+p[1])/2;}else merged.push([...p]);}
 // Remove isolated paper texture only; ambiguous clusters remain for manual review.
 return merged.filter(p=>merged.some(q=>q!==p&&distance(p,q)<48));
}
/** Flatten broad illumination changes while keeping the small punch contrasts. */
export function normalizeIllumination(data:Uint8ClampedArray,width:number,height:number,radius=22){
 const integral=new Float64Array((width+1)*(height+1)),out=new Uint8ClampedArray(data.length);
 for(let y=0;y<height;y++){let sum=0;for(let x=0;x<width;x++){const k=(y*width+x)*4;sum+=(data[k]+data[k+1]+data[k+2])/3;integral[(y+1)*(width+1)+x+1]=integral[y*(width+1)+x+1]+sum;}}
 for(let y=0;y<height;y++)for(let x=0;x<width;x++){const x0=Math.max(0,x-radius),x1=Math.min(width,x+radius+1),y0=Math.max(0,y-radius),y1=Math.min(height,y+radius+1),mean=(integral[y1*(width+1)+x1]-integral[y0*(width+1)+x1]-integral[y1*(width+1)+x0]+integral[y0*(width+1)+x0])/((x1-x0)*(y1-y0)),gain=Math.min(4,210/Math.max(25,mean)),k=(y*width+x)*4;for(let c=0;c<3;c++)out[k+c]=Math.min(255,data[k+c]*gain);out[k+3]=255;}return out;
}
/** Relative sharpness for choosing a frame, not a reliability percentage. */
export function punchSharpness(data:Uint8ClampedArray,width:number,height:number){let total=0,n=0;const gray=(i:number)=>(data[i*4]+data[i*4+1]+data[i*4+2])/3;for(let y=4;y<height-4;y++)for(let x=4;x<width-4;x++){const i=y*width+x;total+=Math.abs(4*gray(i)-gray(i-1)-gray(i+1)-gray(i-width)-gray(i+width));n++;}return total/Math.max(1,n);}
/** Require the whole motif to agree at two contrast levels, never discard a hole to force a match. */
function analyzeContrast(data:Uint8ClampedArray,width:number,height:number,expected:Point[]){
 const candidates=[7,8,9,10,12].map(contrast=>{const points=detectHoles(data,width,height,contrast);return {points,...classifyPunch(points,expected)};});
 const matches=candidates.filter(c=>c.status==='match').sort((a,b)=>a.score-b.score);
 const consistent=matches.filter(a=>matches.some(b=>a!==b&&a.points.every(p=>b.points.some(q=>distance(p,q)<4))));
 const chosen=consistent[0]||matches[0]||candidates[2];
 return {points:chosen.points,status:consistent.length>=2?'match' as const:'review' as const};
}
export function analyzePunch(data:Uint8ClampedArray,width:number,height:number,expected:Point[]){
 const ordinary=analyzeContrast(data,width,height,expected);if(ordinary.status==='match')return ordinary;
 const normalized=analyzeContrast(normalizeIllumination(data,width,height),width,height,expected);
 return normalized.status==='match'?normalized:ordinary;
}
/** Project the four selected corners onto a flat six-cell strip. */
export function rectify(source:{data:Uint8ClampedArray;width:number;height:number;colorSpace?:string},corners:Point[],width=900,height=150){
 const targets:Point[]=[[0,0],[width-1,0],[width-1,height-1],[0,height-1]],a:number[][]=[];
 targets.forEach(([x,y],i)=>{const [u,v]=corners[i];a.push([x,y,1,0,0,0,-u*x,-u*y,u],[0,0,0,x,y,1,-v*x,-v*y,v]);});
 for(let i=0;i<8;i++){let pivot=i;for(let j=i+1;j<8;j++)if(Math.abs(a[j][i])>Math.abs(a[pivot][i]))pivot=j;[a[i],a[pivot]]=[a[pivot],a[i]];const d=a[i][i];if(Math.abs(d)<1e-8)throw Error('Repères trop proches : recommencez le cadrage.');for(let k=i;k<9;k++)a[i][k]/=d;for(let j=0;j<8;j++)if(j!==i){const f=a[j][i];for(let k=i;k<9;k++)a[j][k]-=f*a[i][k];}}
 const m=a.map(row=>row[8]),out=new Uint8ClampedArray(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const den=m[6]*x+m[7]*y+1,u=Math.round((m[0]*x+m[1]*y+m[2])/den),v=Math.round((m[3]*x+m[4]*y+m[5])/den),to=(y*width+x)*4;if(u<0||v<0||u>=source.width||v>=source.height){out.fill(255,to,to+4);continue;}const from=(v*source.width+u)*4;out.set(source.data.subarray(from,from+4),to);}return {data:out,width,height};
}
/** Locate the connected printed 6-column grid; reject incomplete or ambiguous frames. */
function findPrintedGrid(data:Uint8ClampedArray,width:number,height:number):Point[]|null{
 const mask=new Uint8Array(width*height);for(let i=0;i<mask.length;i++){const k=i*4;if(Math.max(data[k],data[k+1],data[k+2])<105)mask[i]=1;}
 let best:Point[]|null=null,bestScore=0;
 for(let start=0;start<mask.length;start++)if(mask[start]){
  const stack=[start];mask[start]=0;let n=0,minx=width,maxx=0,miny=height,maxy=0;let tl:Point=[0,0],tr:Point=[0,0],br:Point=[0,0],bl:Point=[0,0],minSum=Infinity,maxSum=-Infinity,minDiff=Infinity,maxDiff=-Infinity;
  while(stack.length){const i=stack.pop()!,x=i%width,y=Math.floor(i/width);n++;minx=Math.min(minx,x);maxx=Math.max(maxx,x);miny=Math.min(miny,y);maxy=Math.max(maxy,y);if(x+y<minSum){minSum=x+y;tl=[x,y];}if(x+y>maxSum){maxSum=x+y;br=[x,y];}if(x-y>maxDiff){maxDiff=x-y;tr=[x,y];}if(x-y<minDiff){minDiff=x-y;bl=[x,y];}for(const j of [i-1,i+1,i-width,i+width])if(j>=0&&j<mask.length&&mask[j]){mask[j]=0;stack.push(j);}}
  const w=maxx-minx,h=maxy-miny;if(w<width*.25||h<30||w/h<2.3||w/h>7||n/(w*h)<.025||n/(w*h)>.35)continue;
  // Seven vertical strokes must cross the lower (punch) part, not just a photo frame.
  const corners=[tl,tr,br,bl],flat=rectify({data,width,height,colorSpace:'srgb'},corners,600,150),columns:number[]=[];
  for(let x=0;x<600;x++){let hits=0;for(let y=60;y<140;y++){const k=(y*600+x)*4;if(Math.max(flat.data[k],flat.data[k+1],flat.data[k+2])<110)hits++;}if(hits>53)columns.push(x);}
  const groups:number[][]=[];for(const x of columns){if(!groups.length||x-groups[groups.length-1].at(-1)!>8)groups.push([x]);else groups.at(-1)!.push(x);}const centers=groups.map(g=>g.reduce((a,b)=>a+b,0)/g.length);
  if(centers.length!==7||centers.some((x,i)=>i>0&&Math.abs(x-centers[i-1]-100)>24))continue;
  // Find the horizontal divider under the numbers within the upper half.
  let divider=0,peak=0;for(let y=24;y<83;y++){let hits=0;for(let x=10;x<590;x++){const k=(y*600+x)*4;if(Math.max(flat.data[k],flat.data[k+1],flat.data[k+2])<110)hits++;}if(hits>peak){peak=hits;divider=y;}}
  if(peak<430)continue;
  const t=(divider+4)/149,lerp=(a:Point,b:Point):Point=>[a[0]+(b[0]-a[0])*t,a[1]+(b[1]-a[1])*t];
  const score=w*h;if(score>bestScore){bestScore=score;best=[lerp(tl,bl),lerp(tr,br),br,bl];}
 }
 return best;
}

export function findPunchGrid(data:Uint8ClampedArray,width:number,height:number):Point[]|null{return findPrintedGrid(data,width,height)||findPrintedGrid(normalizeIllumination(data,width,height,30),width,height);}
