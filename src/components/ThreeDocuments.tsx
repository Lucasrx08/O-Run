import blank from '../assets/cartes3/cartons.pdf?url';
import key from '../assets/cartes3/corrige.pdf?url';
import punches from '../assets/cartes3/balises.pdf?url';
import photos from '../assets/cartes3/terrain.pdf?url';

export function ThreeDocuments(){
 return <details><summary>Documents · Cartes 3 balises</summary><ul>{[[blank,'Cartons vierges à imprimer'],[key,'Corrigé des 12 cartes'],[punches,'Poinçons des balises 31 à 72'],[photos,'Les 12 cartons poinçonnés sur le terrain']].map(([url,label])=><li key={url}><a href={url} download>{label} (PDF)</a></li>)}</ul></details>;
}
