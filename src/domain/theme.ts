import type {Data} from './types';
/** Les anciennes couleurs par défaut suivent la nouvelle charte ; les couleurs personnalisées restent intactes. */
const legacyColors:Record<string,string>={
 '#ef702c':'#f68710','#568d72':'#ffa74b','#5d87b1':'#eec95f',
 '#a789b6':'#fee4a7','#d48e97':'#ebe5de','#b7a365':'#333333',
 '#f97316':'#f68710','#4587c7':'#eec95f','#5b8d6f':'#ffa74b','#8872b5':'#fee4a7',
};
export const themeColor=(color:string)=>legacyColors[color.toLowerCase()]||color;
export function themeData(data:Data):Data{return {...data,
 courses:data.courses.map(c=>({...c,color:themeColor(c.color)})),
 sequences:data.sequences.map(s=>({...s,...(s.color?{color:themeColor(s.color)}:{})})),
 runs:data.runs.map(r=>({...r,courseSnapshot:{...r.courseSnapshot,color:themeColor(r.courseSnapshot.color)}})),
};}
