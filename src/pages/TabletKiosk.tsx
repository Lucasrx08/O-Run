import {useEffect,useState} from 'react';
import {KeyRound,LockKeyhole,UnlockKeyhole} from 'lucide-react';
import {useStore} from '../store';
import {RunBoard} from './RunBoard';
import {Dialog,Field} from '../components/ui';
import type {Session} from '../domain/types';

const PIN_KEY='orun-teacher-pin-v1';
const PIN_SALT='orun-teacher-pin-salt-v1';
const validPin=(value:string)=>/^\d{4,6}$/.test(value);
async function pinDigest(pin:string,salt:string){
 const bytes=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${salt}:${pin}`));
 return Array.from(new Uint8Array(bytes),b=>b.toString(16).padStart(2,'0')).join('');
}

/** La tablette élève ne contient aucune navigation ni bouton d'organisation. */
export function TabletKiosk({session,onUnlock}:{session:Session;onUnlock:()=>void}){
 const s=useStore(),[showPin,setShowPin]=useState(()=>!localStorage.getItem(PIN_KEY));
 const [pin,setPin]=useState(''),[confirm,setConfirm]=useState(''),[error,setError]=useState(''),[busy,setBusy]=useState(false);
 const setup=!localStorage.getItem(PIN_KEY);
 const post=s.offline?.post||'A';
 useEffect(()=>{setPin('');setConfirm('');setError('');},[showPin]);
 const submit=async()=>{
  if(busy)return;
  if(!validPin(pin)){setError('Choisissez un code de 4 à 6 chiffres.');return;}
  if(setup&&pin!==confirm){setError('Les deux codes ne correspondent pas.');return;}
  setBusy(true);
  try{
   if(setup){
    const salt=Array.from(crypto.getRandomValues(new Uint8Array(16)),b=>b.toString(16).padStart(2,'0')).join('');
    const digest=await pinDigest(pin,salt);
    localStorage.setItem(PIN_SALT,salt);localStorage.setItem(PIN_KEY,digest);
    setShowPin(false);s.notify('Vue élèves protégée. Le code enseignant est enregistré sur cet appareil.');
   }else if(await pinDigest(pin,localStorage.getItem(PIN_SALT)||'')===localStorage.getItem(PIN_KEY)){
    setShowPin(false);onUnlock();
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
   <form onSubmit={e=>{e.preventDefault();void submit();}} className="kiosk-pin-form">
    <div className="kiosk-pin-lock">{setup?<KeyRound size={29}/>:<UnlockKeyhole size={29}/>}</div>
    <p>{setup?'Définissez votre code enseignant de 4 à 6 chiffres. Les élèves n’auront accès qu’aux chronos.':'Entrez votre code pour retrouver les transferts QR, les réglages et l’organisation.'}</p>
    <Field label="Code enseignant"><input type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{4,6}" maxLength={6} autoFocus value={pin} onChange={e=>setPin(e.target.value)}/></Field>
    {setup&&<Field label="Confirmer le code"><input type="password" inputMode="numeric" autoComplete="off" maxLength={6} value={confirm} onChange={e=>setConfirm(e.target.value)}/></Field>}
    {error&&<p role="alert" className="form-error">{error}</p>}
    <p className="muted compact">Ce code empêche les manipulations accidentelles ; les données restent stockées localement sur l’iPad.</p>
    <div className="dialog-actions"><button type="submit" className="button primary" disabled={busy}>{setup?'Activer la vue élèves':'Déverrouiller'}</button></div>
   </form>
  </Dialog>}
 </div>;
}
