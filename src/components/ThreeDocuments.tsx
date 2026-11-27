import blank from '../assets/cartes3/cartons.pdf?url';
import key from '../assets/cartes3/corrige.pdf?url';
import punches from '../assets/cartes3/balises.pdf?url';
import photos from '../assets/cartes3/terrain.pdf?url';

import blank4 from '../assets/cartes4/cartons.pdf?url';
import key4 from '../assets/cartes4/corrige.pdf?url';
import terrain6 from '../assets/cartes6/terrain.pdf?url';
import blank6 from '../assets/cartes6/cartons.pdf?url';
import key6 from '../assets/cartes6/corrige.pdf?url';

export function CardDocuments({model}:{model?:string}){
 const n=model==='cards-3'?3:model==='cards-4'?4:model==='cards-6'?6:0;
 if(!n)return null;
 const docs=n===3?[[blank,'Cartons vierges à imprimer'],[key,'Corrigé des 12 cartes'],[punches,'Poinçons des balises 31 à 72'],[photos,'Les 12 cartons poinçonnés sur le terrain']]:[[n===4?blank4:blank6,'Cartons vierges à imprimer'],[n===4?key4:key6,'Fiche de correction des cartes']];
 if(n===6)docs.push([terrain6,'Les 6 cartons poinçonnés sur le terrain']);
 return <details><summary>Documents · Cartes {n} balises</summary><ul>{docs.map(([url,label])=><li key={url}><a href={url} download>{label} (PDF)</a></li>)}</ul></details>;
}
