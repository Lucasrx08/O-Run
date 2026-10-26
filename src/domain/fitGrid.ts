export function fitGrid(width:number,height:number,count:number){
 const gap=8,n=Math.max(1,count);let best={columns:1,rows:n,unit:70,tileHeight:70,tileWidth:100},score=-Infinity;
 // Sur grand écran, 8 à 10 colonnes évitent les cinq rangées très aplaties.
 // L'iPad conserve au maximum six colonnes pour permettre une grande zone tactile.
 const maximum=width>=1450?10:6;
 for(let columns=width>=1450&&n>=24?8:1;columns<=Math.min(n,maximum);columns++){
  const rows=Math.ceil(n/columns),w=(width-gap*(columns-1))/columns,h=(height-gap*(rows-1))/rows;
  const empty=columns*rows-n;
  const candidate=Math.min(w/165,h/95)-Math.abs(Math.log(Math.max(.01,w/h)/1.45))*.55-empty/n*.2;
  if(candidate>score){score=candidate;best={columns,rows,unit:Math.min(w,h*1.1),tileHeight:h,tileWidth:w};}
 }
 return best;
}
