import {createClient,type SupabaseClient} from '@supabase/supabase-js';
import type {Command,Data,Role} from '../domain/types';
import {apply} from '../domain/engine';
import {setServerOffset} from './clock';
import {loadWorkspace,mutate,acceptServer} from './storage';
import {connectionConfig} from './connectionConfig';
const saved=connectionConfig();
const url=saved?.url||import.meta.env.VITE_SUPABASE_URL as string|undefined;
const pub=saved?.publishableKey||import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string|undefined;
export const configured=Boolean(url&&pub);
export const supabase:SupabaseClient|null=configured?createClient(url!,pub!,{auth:{persistSession:false,autoRefreshToken:true,detectSessionInUrl:false}}):null;
export interface RemoteSnapshot {document:Data;role:Role;server_time:number;version:number;}
let syncing=false;
export async function signIn(email:string,password:string){if(!supabase)throw new Error('Supabase n’est pas configuré pour cette version.');const {error}=await supabase.auth.signInWithPassword({email,password});if(error)throw error;}
export async function signOut(){await supabase?.auth.signOut({scope:'local'});}
export async function snapshot(room:string):Promise<RemoteSnapshot>{const {data,error}=await supabase!.rpc('orun_snapshot',{room_id:room});if(error)throw error;return data;}
export async function createRoom(source:Data,sessionId:string){const session=source.sessions.find(s=>s.id===sessionId);if(!session)throw new Error('Séance introuvable');const document:Data={...structuredClone(source),audit:[],applied:[],version:0};const {data,error}=await supabase!.rpc('orun_create_room',{initial_document:document});if(error)throw error;return data as string;}
export async function joinRoom(room:string){const before=Date.now();const snap=await snapshot(room);const after=Date.now();if(after-before>3000)throw new Error('Réseau trop lent pour calibrer les horloges. Réessayez.');setServerOffset(snap.server_time-(before+after)/2);await mutate(w=>{if(w.pending.length)throw new Error('Des opérations attendent encore leur synchronisation.');return {data:snap.document,pending:[],room,role:snap.role};});return snap.role;}
export async function pushPull(onStatus:(s:string)=>void):Promise<Role|undefined>{
 if(!supabase||syncing)return;syncing=true;
 try{let w=await loadWorkspace();if(!w.room)return;
  onStatus(w.pending.length?`${w.pending.length} envoi(s) en attente`:'Vérification…');
  for(const cmd of w.pending){const {error}=await supabase.rpc('orun_apply',{room_id:w.room,command:cmd});if(error)throw new Error(`Synchronisation interrompue : ${error.message}`);await mutate(current=>({...current,pending:current.pending.filter(c=>c.id!==cmd.id)}));}
  const snap=await snapshot(w.room);
  await mutate(current=>{let document=snap.document;for(const cmd of current.pending)document=apply(document,cmd,snap.role);return {...current,data:document,role:snap.role};});
  w=await loadWorkspace();onStatus(w.pending.length?`${w.pending.length} en attente`:'Synchronisé');return snap.role;
 }catch(e){onStatus(e instanceof Error?e.message:'Synchronisation interrompue');throw e;}finally{syncing=false;}
}
export function subscribe(room:string,refresh:()=>void){if(!supabase)return()=>{};const channel=supabase.channel(`orun:${room}`).on('postgres_changes',{event:'UPDATE',schema:'public',table:'orun_notifications',filter:`room_id=eq.${room}`},refresh).subscribe(status=>{if(status==='SUBSCRIBED')refresh();});return()=>{void supabase.removeChannel(channel);};}
export async function grant(room:string,userId:string,role:Role){const {error}=await supabase!.rpc('orun_grant',{room_id:room,member_id:userId,member_role:role});if(error)throw error;}
export async function serverOffset(room:string){const before=Date.now();const snap=await snapshot(room);const after=Date.now();return {offset:snap.server_time-(before+after)/2,uncertainty:(after-before)/2};}
export function rebase(document:Data,pending:Command[],role:Role){return pending.reduce((d,c)=>apply(d,c,role),document);}
export async function restoreServer(exportedIds:string[]){
 if(!supabase)throw new Error('Supabase n’est pas configuré.');
 if(syncing)throw new Error('Un envoi est en cours. Réessayez après sa fin.');
 syncing=true;
 try{const w=await loadWorkspace();if(!w.room)throw new Error('Aucun espace partagé.');const snap=await snapshot(w.room);await acceptServer(w.room,snap.document,snap.role,exportedIds);return snap.role;}finally{syncing=false;}
}
