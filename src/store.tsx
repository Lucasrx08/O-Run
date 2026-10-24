import {createContext,useContext,useState,useEffect,useCallback,useRef,type ReactNode} from 'react';
import type {Command,Data,Role,View,OfflineConfig} from './domain/types';
import {uid} from './domain/types';
import * as storage from './services/storage';
import {now} from './services/clock';
interface Store {data:Data;sessionId:string;setSessionId:(id:string)=>void;view:View;go:(v:View)=>void;role:Role;setRole:(v:Role)=>void;mode:string;setMode:(s:string)=>void;command:(c:Command)=>Promise<boolean>;refresh:()=>Promise<void>;notify:(s:string)=>void;notice:string;connection:string;pending:number;room:string|null;setRoom:(id:string|null)=>void;protectedData:boolean;lockNow:()=>void;setSyncRole:(r:Role)=>void;offline?:OfflineConfig;saveOffline:(c:OfflineConfig)=>Promise<boolean>;importOffline:(p:unknown)=>Promise<boolean>;}
const Context=createContext<Store|null>(null);export const useStore=()=>useContext(Context)!;
export function Provider({children}:{children:ReactNode}){
 const [data,setData]=useState<Data|null>(null),[locked,setLocked]=useState(false),[loadError,setLoadError]=useState(''),[password,setPassword]=useState('');
 const [sessionId,setSession]=useState(localStorage.getItem('orun-session')||'session-2'),[view,setView]=useState<View>('home'),[role,setRole]=useState<Role>('teacher'),[mode,setModeState]=useState(localStorage.getItem('orun-mode')||'complet');
 const [notice,setNotice]=useState(''),[connection]=useState('Mode local · aucun serveur'),[pending,setPending]=useState(0),[room,setRoom]=useState<string|null>(null),[protectedData,setProtected]=useState(false),[offline,setOffline]=useState<OfflineConfig|undefined>();
 const bc=useRef<BroadcastChannel|null>(null),timer=useRef<ReturnType<typeof setTimeout>|null>(null);
 const notify=useCallback((s:string)=>{setNotice(s);if(timer.current)clearTimeout(timer.current);timer.current=setTimeout(()=>setNotice(''),6000);},[]);
 const refresh=useCallback(async()=>{try{const w=await storage.loadWorkspace();setData(w.data);setPending(0);setRoom(null);setRole('teacher');setOffline(w.offline);setLocked(false);setLoadError('');setProtected(await storage.isProtected());}catch(e){if(e instanceof storage.LockedError){setLocked(true);setData(null);}else setLoadError(e instanceof Error?e.message:'Stockage indisponible.');}},[]);
 useEffect(()=>{void refresh();bc.current=typeof BroadcastChannel!=='undefined'?new BroadcastChannel('orun'):null; if(bc.current)bc.current.onmessage=()=>void refresh();return()=>bc.current?.close();},[refresh]);
 useEffect(()=>{if(data&&!data.sessions.some(s=>s.id===sessionId)&&data.sessions.length)setSession(data.sessions.at(-1)!.id);},[data,sessionId]);
 const lockNow=useCallback(()=>{storage.lock();setData(null);setLocked(true);},[]);
 useEffect(()=>{if(!protectedData||!data)return;let id:ReturnType<typeof setTimeout>;const bump=()=>{clearTimeout(id);id=setTimeout(lockNow,10*60*1000);};bump();addEventListener('pointerdown',bump);addEventListener('keydown',bump);return()=>{clearTimeout(id);removeEventListener('pointerdown',bump);removeEventListener('keydown',bump);};},[protectedData,Boolean(data),lockNow]);
 const command=async(c:Command)=>{try{const w=await storage.execute(c,role);setData(w.data);setPending(0);bc.current?.postMessage('change');return true;}catch(e){notify(e instanceof Error?e.message:'Enregistrement impossible.');return false;}};
 const saveOffline=async(c:OfflineConfig)=>{try{await storage.setOfflineConfig(c);await refresh();bc.current?.postMessage('change');return true;}catch(e){notify((e as Error).message);return false;}};
 const importOffline=async(p:unknown)=>{try{await storage.importOfflineSession(p);await refresh();bc.current?.postMessage('change');return true;}catch(e){notify((e as Error).message);return false;}};
 const go=(v:View)=>{if(role!=='teacher'&&!['home','departures','arrivals','settings'].includes(v)){notify('Accès réservé à l’enseignant.');return;}if(role==='arrival'&&v==='departures'||role==='departure'&&v==='arrivals'){notify('Ce compte ne possède pas cette fonction.');return;}setView(v);window.scrollTo({top:0});};
 if(locked||loadError)return <main className="gate"><img src="./logo.svg" width="64"/><h1>{locked?'Votre espace est verrouillé':'Stockage indisponible'}</h1><p>{locked?'Saisissez votre phrase secrète pour retrouver la séance.':loadError}</p>{locked&&<form onSubmit={async e=>{e.preventDefault();try{await storage.unlock(password);setPassword('');await refresh();}catch{setLoadError('Phrase secrète incorrecte.');}}}><input autoFocus type="password" aria-label="Phrase secrète" value={password} onChange={e=>setPassword(e.target.value)}/><button className="button primary">Déverrouiller</button>{loadError&&<p role="alert">{loadError}</p>}</form>}<p className="muted">Le chronométrage reprend à partir des instants enregistrés.</p></main>;
 if(!data)return <main className="gate"><img src="./logo.svg" width="64"/><p>Ouverture de votre terrain…</p></main>;
 const setSessionId=(id:string)=>{setSession(id);localStorage.setItem('orun-session',id);};
 return <Context.Provider value={{data,sessionId,setSessionId,view,go,role,setRole,mode,setMode:s=>{setModeState(s);localStorage.setItem('orun-mode',s);},command,refresh,notify,notice,connection,pending,room,setRoom,protectedData,lockNow,setSyncRole:setRole,offline,saveOffline,importOffline}}>{children}</Context.Provider>;
}
export function useNow(){const [time,setTime]=useState(now());useEffect(()=>{const i=setInterval(()=>setTime(now()),200);return()=>clearInterval(i);},[]);return time;}
export function configCommand(data:Data,detail:string):Command{return {kind:'config',id:uid(),at:now(),baseVersion:data.version,students:data.students,sequences:data.sequences,sessions:data.sessions,courses:data.courses,detail};}
