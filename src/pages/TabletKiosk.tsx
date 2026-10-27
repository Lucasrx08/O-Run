import {useEffect,useState} from 'react';
import {Delete,KeyRound,LockKeyhole,UnlockKeyhole} from 'lucide-react';
import {useStore} from '../store';
import {RunBoard} from './RunBoard';
import {Dialog} from '../components/ui';
import type {Session} from '../domain/types';

const PIN_KEY='orun-teacher-pin-v1';
const PIN_SALT='orun-teacher-pin-salt-v1';
const validPin=(value:string)=>/^\d{4}$/.test(value);
async function pinDigest(pin:string,salt:string){
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${salt}:${pin}`));
 return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}

/** La tablette élève ne contient aucune navigation ni bouton d'organisation. */
export function TabletKiosk({session,onUnlock}:{session:Session;onUnlock:()=>void}){
 const s=useStore(),[showPin,setShowPin]=useState(()=>!localStorage.getItem(PIN_KEY));
 const [pin,setPin]=useState(''),[confirm,setConfirm]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const [phase,setPhase]=useState<'pin'|'confirm'>('pin');
 const [migrate,setMigrate]=useState(false);
 const setup=migrate||!localStorage.getItem(PIN_KEY);
 const legacy=!setup&&localStorage.getItem('orun-teacher-pin-format')!=='4';
 const post=s.offline?.post||'A';
 useEffect(()=>{setPin('');setConfirm('');setError('');setPhase('pin');},[showPin]);
 const code=setup&&phase==='confirm'?confirm:pin;
 const writeCode=(next:string)=>{if(setup&&phase==='confirm')setConfirm(next);else setPin(next);setError('');};
 const pressDigit=(digit:string)=>{if(!busy&&code.length<(legacy?6:4))writeCode(code+digit);};
 const advance=()=>{if(setup&&phase==='pin'){if(!(legacy?/^\d{4,6}$/.test(pin):validPin(pin))){setError('Choisissez un code de 4 chiffres.');return;}setPhase('confirm');return;}void submit();};
 const submit=async()=>{
  if(busy)return;
  if(!(legacy?/^\d{4,6}$/.test(pin):validPin(pin))){setError('Choisissez un code de 4 chiffres.');return;}
  if(setup&&pin!==confirm){setError('Les deux codes ne correspondent pas.');return;}
  setBusy(true);
  try{
   if(setup){
    const salt=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
    const digest=await pinDigest(pin,salt);
    localStorage.setItem('orun-teacher-pin-format','4');setMigrate(false);localStorage.setItem(PIN_SALT,salt);localStorage.setItem(PIN_KEY,digest);
    setShowPin(false);s.notify('Vue élèves protégée. Le code enseignant est enregistré sur cet appareil.');
   }else if(await pinDigest(pin,localStorage.getItem(PIN_SALT)||'')===localStorage.getItem(PIN_KEY)){
    if(pin.length>4){setMigrate(true);setPhase('pin');setError('Ancien code vérifié. Choisissez maintenant un code de 4 chiffres.');}else{localStorage.setItem('orun-teacher-pin-format','4');setShowPin(false);onUnlock();}
   }else setError('Code enseignant incorrect. Les chronos restent enregistrés.');
  }finally{setBusy(false);setPin('');setConfirm('');}
 };
 return <div className="tablet-kiosk">
  <div className="kiosk-bar"><div className="kiosk-identity"><img src="./logo.svg" alt=""/><strong>O’Run</strong><span>Tablette {post==='AB'?'A + B':post}</span></div>
   <span className="kiosk-subtitle">{s.offline?.studentIds.length||0} élèves · Touchez votre prénom pour choisir une carte</span>
   <button className="kiosk-teacher" type="button" aria-label="Accès enseignant protégé" onClick={()=>setShowPin(true)}><LockKeyhole size={19}/><span>Enseignant</span></button>
  </div>
  <RunBoard session={session} className={session.className||''} kiosk/>
  {s.notice&&<div className="toast" role="status">{s.notice}</div>}
  {showPin&&<Dialog title={setup?'Protéger la tablette':'Accès enseignant'} onClose={()=>{if(!setup)setShowPin(false);}}>
   <form onSubmit={e=>{e.preventDefault();advance();}} className="kiosk-pin-form" onKeyDown={e=>{if(e.target instanceof HTMLButtonElement)return;if(/^\d$/.test(e.key)){e.preventDefault();pressDigit(e.key);}else if(e.key==='Backspace'){e.preventDefault();writeCode(code.slice(0,-1));}}} tabIndex={0}>
    <div className="kiosk-pin-lock">{setup?<KeyRound size={29}/>:<UnlockKeyhole size={29}/>}</div>
    <p>{legacy?'Saisissez votre ancien code. Un code de plus de 4 chiffres sera remplacé après vérification.':setup?'Définissez votre code enseignant de 4 chiffres. Les élèves n’auront accès qu’aux chronos.':'Entrez votre code pour retrouver les transferts QR, les réglages et l’organisation.'}</p>
    <p className="kiosk-code-label">{setup?(phase==='pin'?'Choisir le code enseignant':'Confirmer le code enseignant'):'Code enseignant'}</p>
    <div className="kiosk-code-dots" aria-label={`${code.length} chiffres saisis sur ${legacy?6:4}`} role="status">{Array.from({length:legacy?6:4},(_,i)=><span key={i} className={i<code.length?'filled':''}/>)}</div>
    <div className="kiosk-keypad" role="group" aria-label="Pavé numérique du code enseignant">
     {['1','2','3','4','5','6','7','8','9','C','0','delete'].map(d=><button key={d} type="button" aria-label={d==='delete'?'Effacer le dernier chiffre':d==='C'?'Effacer le code':`Chiffre ${d}`} onClick={()=>d==='delete'?writeCode(code.slice(0,-1)):d==='C'?writeCode(''):pressDigit(d)}>{d==='delete'?<Delete size={25}/>:d}</button>)}
    </div>
    {error&&<p role="alert" className="form-error">{error}</p>}
    <p className="muted compact">Ce code empêche les manipulations accidentelles ; les données restent stockées localement sur l’iPad.</p>
    <div className="dialog-actions">{setup&&phase==='confirm'&&<button type="button" className="button" onClick={()=>{setPhase('pin');setConfirm('');setError('');}}>Retour</button>}<button type="submit" className="button primary" disabled={busy||code.length<4}>{setup?(phase==='pin'?'Suivant':'Activer la vue élèves'):'Déverrouiller'}</button></div>
   </form>
  </Dialog>}
 </div>;
}
