/** Choisit les colonnes à partir du rectangle réellement disponible. */
export function fitGrid(width:number,height:number,count:number){
 const gap=8,n=Math.max(1,count),maximum=width>=900?10:width>=700?6:2;
 let best={columns:1,rows:n,unit:70,tileHeight:70,tileWidth:100},score=-Infinity;
 for(let columns=width>=1450&&n>=24?8:1;columns<=Math.min(n,maximum);columns++){
  const rows=Math.ceil(n/columns),w=(width-gap*(columns-1))/columns,h=(height-gap*(rows-1))/rows;
  const empty=columns*rows-n;
  // Le prénom et le chrono priment sur les proportions décoratives.
  const candidate=Math.min(w/125,h/110)-Math.abs(Math.log(Math.max(.01,w/h)/1.7))*.24-empty/n*.12-Math.max(0,105-h)*.06-Math.max(0,90-w)*.04;
  if(candidate>score){score=candidate;best={columns,rows,unit:Math.max(20,Math.min(w,h*1.25)),tileHeight:h,tileWidth:w};}
 }
 return best;
}

/** Préserve de grandes tuiles sur téléphone, même avec le clavier ouvert. */
export function mobileGridPageSize(viewportHeight:number,gridTop:number){
 const rows=Math.max(1,Math.min(3,Math.floor((viewportHeight-gridTop-62)/132)));
 return rows*2;
}
