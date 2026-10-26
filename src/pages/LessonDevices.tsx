import {useState} from 'react';
import {ArrowRight,Check,CheckCircle2,Monitor,ScanLine,Tablet,Users} from 'lucide-react';
import {useStore,configCommand} from '../store';
import {alphabeticalStudents,createSessionPack,planLessonDevices,splitAlphabetical} from '../domain/offline';
import {newTransferKey} from '../services/offlineTransfer';
import {encodePreparationQR} from '../services/qrTransfer';
import {QRShowDialog} from '../components/QRTransfer';
import type {Session} from '../domain/types';

const options=[{mode:1 as const,title:'1 appareil',detail:'Tout sur le même appareil : départs, arrivées, corrections et résultats.',Icon:Monitor},
 {mode:2 as const,title:'2 appareils',detail:'Un iPad A pour tous les chronos. Le poste C pour corriger.',Icon:Tablet},
 {mode:3 as const,title:'3 appareils',detail:'Deux iPads A/B, avec répartition alphabétique. Le poste C pour corriger.',Icon:Users}];

export function LessonDevices({session,onContinue}:{session:Session;onContinue:(mode:1|2|3)=>void}){
 const s=useStore(),students=alphabeticalStudents(s.data,session.id);
 const [chosen,setChosen]=useState<1|2|3>(session.deviceMode||1),[selectedA,setSelectedA]=useState<string[]|null>(null);
 const [busy,setBusy]=useState(false),[error,setError]=useState(''),[qr,setQR]=useState<{title:string;frames:string[]}|null>(null);
 const all=students.map(p=>p.id);
 const currentGroupA=selectedA??(chosen===3&&session.deviceGroupA?.length&&session.deviceGroupA.length<all.length?session.deviceGroupA:undefined);
 const split=chosen===3?splitAlphabetical(s.data,session.id,currentGroupA):{A:all,B:[] as string[]};
 const configured=s.offline?.post==='C'&&s.offline.sessionId===session.id&&session.deviceMode===chosen;
 const configure=async(mode=chosen)=>{
  if(busy)return false;setBusy(true);setError('');
  try{
   const p=planLessonDevices(s.data,session.id,mode,selectedA??undefined,newTransferKey);
   const active=s.offline;
   if(!await s.command(configCommand(p.data,`Organisation de la leçon : ${mode} appareil(s)`)))return false;
   const config={...p.config,importedPosts:active?.post==='C'&&active.sessionId===session.id?active.importedPosts:[]};
   if(!await s.saveOffline(config))return false;
   s.setSessionId(session.id);s.setMode('complet');setSelectedA(null);
   s.notify(`Mode ${mode} appareil${mode>1?'s':''} prêt pour cette leçon.`);
   return true;
  }catch(e){setError((e as Error).message);return false;}
  finally{setBusy(false);}
 };
 const showQR=async(post:'A'|'B')=>{
  try{
   const config=s.offline;
   if(!config||config.post!=='C'||config.sessionId!==session.id||!config.transferKey)throw new Error('Enregistrez le mode de la leçon avant de générer les QR codes.');
   const ids=post==='A'?config.groupA:config.groupB;
   if(!ids?.length)throw new Error('Ce groupe ne contient aucun élève.');
   const pack=createSessionPack(s.data,session.id,post,ids,config.transferKey);
   setQR({title:`Préparation · Tablette ${post}`,frames:encodePreparationQR(pack)});
  }catch(e){setError((e as Error).message);}
 };
 return <div className="lesson-devices">
  <div className="device-intro"><span className="eyebrow">ORGANISATION DE LA LEÇON</span><h2>Combien d’appareils aujourd’hui ?</h2><p>Choisissez votre organisation. O’Run n’affiche ensuite que les fonctions utiles à chaque appareil.</p></div>
  <div className="device-mode-grid">{options.map(o=><button type="button" key={o.mode} className={chosen===o.mode?'device-mode-card active':'device-mode-card'} aria-pressed={chosen===o.mode} onClick={()=>{setChosen(o.mode);setSelectedA(null);setError('');}}>
   <span className="device-mode-icon"><o.Icon size={30}/></span><strong>{o.title}</strong><small>{o.detail}</small><span className="device-mode-check">{chosen===o.mode?<CheckCircle2 size={23}/>:null}</span>
  </button>)}</div>
  {chosen>1&&<div className="device-preview">
   <div className="device-preview-head"><div><strong>{chosen===2?'Un groupe, toute la classe':'Répartition alphabétique'}</strong><span>{students.length} élèves dans la leçon</span></div>
    {chosen===3&&<span>Déplacez un élève en touchant son nom si nécessaire.</span>}</div>
   <div className="device-preview-cols">{(['A','B'] as const).filter(p=>chosen===3||p==='A').map(p=><section className="device-preview-group" key={p}><h3><Tablet size={18}/>Tablette {p}<span>{split[p].length} élève{split[p].length>1?'s':''}</span></h3>
    <div className="device-preview-students">{students.filter(x=>split[p].includes(x.id)).map(person=><button type="button" key={person.id} disabled={chosen===2} onClick={()=>setSelectedA(old=>{const a=old??split.A;return p==='A'?a.filter(id=>id!==person.id):[...a,person.id];})}>{person.firstName} {person.lastName.charAt(0)}.{chosen===3&&<ArrowRight size={13}/>}</button>)}</div>
   </section>)}</div>
  </div>}
  {error&&<p role="alert" className="form-error">{error}</p>}
  <div className="device-actions"><button type="button" className="button primary" disabled={busy} onClick={async()=>{if(chosen>1&&configured&&!selectedA){onContinue(chosen);return;}if(await configure()&&chosen===1)onContinue(chosen);}}><Check size={19}/>{chosen===1?'Ouvrir ma leçon':configured&&!selectedA?'Configurer les cartes':'Enregistrer la répartition'}</button>
   {chosen>1&&!configured&&<span className="muted compact">Enregistrez ce mode avant d’envoyer les préparations.</span>}</div>
  {chosen>1&&configured&&<section className="device-send">
   <div><h3><ScanLine size={21}/>Préparer les iPads par QR code</h3><p>Après avoir réglé les cartes dans la leçon, affichez ces QR codes pour les transférer aux tablettes. Aucun AirDrop nécessaire.</p></div>
   <div className="device-send-buttons"><button className="button primary" onClick={()=>showQR('A')}><ScanLine size={18}/>QR Tablette A</button>
    {chosen===3&&<button className="button primary" onClick={()=>showQR('B')}><ScanLine size={18}/>QR Tablette B</button>}</div>
  </section>}
  {qr&&<QRShowDialog title={qr.title} frames={qr.frames} onClose={()=>setQR(null)}/>}
 </div>;
}
