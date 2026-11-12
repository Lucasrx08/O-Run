import type {Course,CorrectionModel} from './types';
export const correctionModels: {id:CorrectionModel;label:string;controls:number;scan:boolean}[]=[
 {id:'cards-3',label:'Cartes 3 balises',controls:3,scan:false},
 {id:'cards-4',label:'Cartes 4 balises',controls:4,scan:false},
 {id:'cards-6',label:'Cartes 6 balises',controls:6,scan:true},
 {id:'legacy-6',label:'Ancien modèle 6 balises',controls:6,scan:true},
];
export function validCorrection(c:Course){if(c.correction===undefined)return true;const m=correctionModels.find(m=>m.id===c.correction?.model);return !!m&&m.controls===c.controls&&Number.isInteger(c.correction.reference)&&c.correction.reference>=1&&c.correction.reference<=6;}
export function referenceForCourse(c:Course){return c.correction?.reference||Math.min(6,Math.max(0,Number(c.name.match(/(?:carte|parcours)\s*([1-6])\b/i)?.[1]||0)));}
export function canScanCourse(c:Course){return c.controls===6&&(!c.correction||correctionModels.some(m=>m.id===c.correction?.model&&m.scan));}
