export function fitGrid(width:number,height:number,count:number){
 const gap=8,n=Math.max(1,count);let best={columns:1,rows:n,unit:70,tileHeight:70,tileWidth:100},score=-Infinity;
 for(let columns=1;columns<=Math.min(n,16);columns++){
  const rows=Math.ceil(n/columns),w=(width-gap*(columns-1))/columns,h=(height-gap*(rows-1))/rows;
  const candidate=Math.min(w/135,h/95)-Math.abs(Math.log(Math.max(.01,w/h)/1.45))*.025;
  if(candidate>score){score=candidate;best={columns,rows,unit:Math.min(w,h*1.1),tileHeight:h,tileWidth:w};}
 }
 return best;
}
