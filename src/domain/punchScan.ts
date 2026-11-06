import references from './punchReferences.json';
export type Point=[number,number];
export const punchReferences=references as Point[][][];
export const beaconNumbers=[[49,57,64,66,67,65],[35,58,47,39,55,68],[34,69,40,56,59,46],[71,41,63,36,60,45],[37,70,32,48,72,44],[62,33,31,38,50,61]];
const distance=(a:Point,b:Point)=>Math.hypot(a[0]-b[0],a[1]-b[1]);
function normalize(points:Point[]){const cx=points.reduce((n,p)=>n+p[0],0)/points.length,cy=points.reduce((n,p)=>n+p[1],0)/points.length;const scale=Math.sqrt(points.reduce((n,p)=>n+(p[0]-cx)**2+(p[1]-cy)**2,0)/points.length)||1;return points.map(p=>[(p[0]-cx)/scale,(p[1]-cy)/scale] as Point);}
/** Translation, size and rotation invariant; never treats missing holes as a fault. */
export function shapeDistance(a:Point[],b:Point[]){if(a.length!==b.length||a.length<2)return Infinity;const aa=normalize(a),bb=normalize(b);let best=Infinity;for(const p of aa)for(const q of bb){const angle=Math.atan2(q[1],q[0])-Math.atan2(p[1],p[0]),c=Math.cos(angle),s=Math.sin(angle);const rotated=aa.map(([x,y])=>[x*c-y*s,x*s+y*c] as Point);const score=Math.max(...rotated.map(p=>Math.min(...bb.map(q=>distance(p,q)))),...bb.map(p=>Math.min(...rotated.map(q=>distance(p,q)))));best=Math.min(best,score);}return best;}
export function classifyPunch(points:Point[],expected:Point[]){const score=shapeDistance(points,expected);return {score,status:score<.16?'match' as const:'review' as const};}
/** Small dark local contrasts, not printed red corrections or long grid lines. */
export function detectHoles(data:Uint8ClampedArray,width:number,height:number):Point[]{
 const gray=new Float32Array(width*height),integral=new Float64Array((width+1)*(height+1));
 for(let y=0;y<height;y++){let sum=0;for(let x=0;x<width;x++){const i=y*width+x,k=i*4;gray[i]=(data[k]+data[k+1]+data[k+2])/3;sum+=gray[i];integral[(y+1)*(width+1)+x+1]=integral[y*(width+1)+x+1]+sum;}}
 const mask=new Uint8Array(width*height),r=7;
 for(let y=10;y<height-10;y++)for(let x=10;x<width-10;x++){const i=y*width+x,k=i*4,x0=Math.max(0,x-r),x1=Math.min(width,x+r+1),y0=Math.max(0,y-r),y1=Math.min(height,y+r+1);const mean=(integral[y1*(width+1)+x1]-integral[y0*(width+1)+x1]-integral[y1*(width+1)+x0]+integral[y0*(width+1)+x0])/((x1-x0)*(y1-y0));if(mean-gray[i]>9&&data[k]-data[k+1]<24&&data[k]-data[k+2]<24)mask[i]=1;}
 const points:Point[]=[];for(let i=0;i<mask.length;i++)if(mask[i]){const stack=[i];mask[i]=0;let n=0,sx=0,sy=0,minx=width,maxx=0,miny=height,maxy=0;while(stack.length){const j=stack.pop()!,x=j%width,y=Math.floor(j/width);n++;sx+=x;sy+=y;minx=Math.min(minx,x);maxx=Math.max(maxx,x);miny=Math.min(miny,y);maxy=Math.max(maxy,y);for(const next of [j-1,j+1,j-width,j+width])if(next>=0&&next<mask.length&&mask[next]){mask[next]=0;stack.push(next);}}if(n>=4&&n<=90&&maxx-minx<15&&maxy-miny<15)points.push([sx/n,sy/n]);}const merged:Point[]=[];for(const p of points){const existing=merged.find(q=>distance(p,q)<5);if(existing){existing[0]=(existing[0]+p[0])/2;existing[1]=(existing[1]+p[1])/2;}else merged.push([...p]);}
 // Remove isolated paper texture only; ambiguous clusters remain for manual review.
 return merged.filter(p=>merged.some(q=>q!==p&&distance(p,q)<48));
}
/** Project the four selected corners onto a flat six-cell strip. */
export function rectify(source:ImageData,corners:Point[],width=900,height=150){
 const targets:Point[]=[[0,0],[width-1,0],[width-1,height-1],[0,height-1]],a:number[][]=[];
 targets.forEach(([x,y],i)=>{const [u,v]=corners[i];a.push([x,y,1,0,0,0,-u*x,-u*y,u],[0,0,0,x,y,1,-v*x,-v*y,v]);});
 for(let i=0;i<8;i++){let pivot=i;for(let j=i+1;j<8;j++)if(Math.abs(a[j][i])>Math.abs(a[pivot][i]))pivot=j;[a[i],a[pivot]]=[a[pivot],a[i]];const d=a[i][i];if(Math.abs(d)<1e-8)throw Error('Repères trop proches : recommencez le cadrage.');for(let k=i;k<9;k++)a[i][k]/=d;for(let j=0;j<8;j++)if(j!==i){const f=a[j][i];for(let k=i;k<9;k++)a[j][k]-=f*a[i][k];}}
 const m=a.map(row=>row[8]),out=new Uint8ClampedArray(width*height*4);for(let y=0;y<height;y++)for(let x=0;x<width;x++){const den=m[6]*x+m[7]*y+1,u=Math.round((m[0]*x+m[1]*y+m[2])/den),v=Math.round((m[3]*x+m[4]*y+m[5])/den),to=(y*width+x)*4;if(u<0||v<0||u>=source.width||v>=source.height){out.fill(255,to,to+4);continue;}const from=(v*source.width+u)*4;out.set(source.data.subarray(from,from+4),to);}return {data:out,width,height};
}
