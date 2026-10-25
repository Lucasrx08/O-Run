export function fitGrid(width:number,height:number,count:number){
 const gap=8,n=Math.max(1,count);let best={columns:1,rows:n,unit:70,tileHeight:70,tileWidth:100},score=-Infinity;
 // Au-delà de six colonnes, les prénoms deviennent illisibles sur iPad.
 // Une grille pleine (25 élèves = 5 × 5) est favorisée plutôt qu'une rangée trouée.
 for(let columns=1;columns<=Math.min(n,6);columns++){
  const rows=Math.ceil(n/columns),w=(width-gap*(columns-1))/columns,h=(height-gap*(rows-1))/rows;
  const empty=columns*rows-n;
  const candidate=Math.min(w/135,h/95)-Math.abs(Math.log(Math.max(.01,w/h)/1.45))*.025-empty/n*.35;
  if(candidate>score){score=candidate;best={columns,rows,unit:Math.min(w,h*1.1),tileHeight:h,tileWidth:w};}
 }
 return best;
}
