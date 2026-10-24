import {useState} from 'react';
import {ArrowUpRight,Check,Download,KeyRound,Lock,Monitor,Shield,Tablet,Timer,Flag,LayoutDashboard} from 'lucide-react';
import {useStore} from '../store';
import type {View} from '../domain/types';
import {Dialog,Field} from '../components/ui';
import {OfflineSession} from './OfflineSession';
import * as storage from '../services/storage';
import {download} from '../services/download';

export function SettingsPage(){
 const s=useStore();
 const [section,setSection]=useState<'postes'|'appareils'>('postes');
 const [protect,setProtect]=useState(false),[password,setPassword]=useState(''),[confirmPassword,setConfirmPassword]=useState(''),[busy,setBusy]=useState(false);
 const roles=[{id:'complet',name:'Mode complet',desc:'Un seul appareil pour tout gérer',icon:Monitor,view:'home' as View},
  {id:'control',name:'Correction',desc:'Saisie des fautes et résultats',icon:LayoutDashboard,view:'control' as View},
  {id:'departures',name:'Départs',desc:'Gérer le lancement des courses',icon:Timer,view:'departures' as View},
  {id:'arrivals',name:'Arrivées',desc:'Arrêter les chronos',icon:Flag,view:'arrivals' as View}];
 return <div className="page-enter settings-simplified"><div className="page-heading"><div><p className="overline">LE CAMP DE BASE</p><h1>Réglages<span>.</span></h1><p className="page-intro">Deux espaces, juste ce qu'il faut pour le terrain.</p></div></div>
 <div className="settings-entry-grid">
  <button className={section==='postes'?'settings-entry active':'settings-entry'} onClick={()=>setSection('postes')} aria-pressed={section==='postes'}><Monitor size={29}/><span><strong>Mon poste</strong><small>Choisir mon interface</small></span><ArrowUpRight size={20}/></button>
  <button className={section==='appareils'?'settings-entry active':'settings-entry'} onClick={()=>setSection('appareils')} aria-pressed={section==='appareils'}><Tablet size={29}/><span><strong>Appareils</strong><small>Préparer A, B et C hors ligne</small></span><ArrowUpRight size={20}/></button>
 </div>
 {section==='appareils'?<OfflineSession/>:<div className="panel settings-panel settings-local-panel">
  <div className="panel-head"><h2><Monitor size={21}/>Mon poste</h2><span className="status">Hors ligne</span></div>
  <p className="muted">Choisissez l'interface pour un appareil unique. Pour répartir une classe sur deux iPads avec correction sur un troisième, utilisez « Appareils ».</p>
  <div className="role-grid">{roles.map(x=><button className={s.mode===x.id?'role-card selected':'role-card'} key={x.id} onClick={()=>s.setMode(x.id)}><x.icon size={26}/><b>{x.name}</b><small>{x.desc}</small>{s.mode===x.id&&<Check size={17} className="role-check"/>}</button>)}</div>
  <div className="settings-use"><button className="button primary" onClick={()=>s.go(roles.find(x=>x.id===s.mode)?.view||'home')}>Utiliser ce poste <ArrowUpRight size={18}/></button></div>
  <details className="advanced-settings settings-local-security"><summary><Shield size={17}/>Sécurité des données locales</summary><p className="muted compact">L'application fonctionne sans serveur. Pour protéger les noms et résultats en cas de perte de l'appareil, activez le chiffrement local et un code de verrouillage de l'iPad ou du Mac.</p>
   <div className="button-row"><button className="button" onClick={()=>setProtect(true)}><KeyRound size={18}/>{s.protectedData?'Changer la phrase secrète':'Chiffrer cet appareil'}</button>{s.protectedData&&<button className="button" onClick={s.lockNow}><Lock size={17}/>Verrouiller</button>}</div>
   <button className="button" onClick={()=>{download(`ORun_sauvegarde_${new Date().toISOString().slice(0,10)}.json`,JSON.stringify(s.data),'application/json');s.notify('Sauvegarde locale téléchargée, à conserver dans un emplacement protégé.');}}><Download size={17}/>Exporter une copie de sécurité</button>
  </details>
 </div>}
 {protect&&<Dialog title="Chiffrer les données locales" onClose={()=>setProtect(false)}><form onSubmit={async e=>{e.preventDefault();if(busy)return;setBusy(true);try{if(password!==confirmPassword)throw new Error('Les deux phrases secrètes sont différentes.');await storage.protect(password);setProtect(false);setPassword('');setConfirmPassword('');await s.refresh();s.notify('Protection locale activée');}catch(e){s.notify((e as Error).message);}finally{setBusy(false);}}}><Field label="Phrase secrète (12 caractères minimum)"><input required type="password" minLength={12} value={password} onChange={e=>setPassword(e.target.value)}/></Field><Field label="Confirmer"><input required type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)}/></Field><p className="muted compact">Conservez cette phrase en lieu sûr. Sans elle, les données chiffrées ne sont pas récupérables.</p><button className="button primary" disabled={busy}>Activer le chiffrement</button></form></Dialog>}
 </div>;
}
