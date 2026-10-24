import type {OfflineConfig} from '../domain/types';
import {download} from './download';
import type {TimesPack} from '../domain/offline';

interface SealedTimes {kind:'orun-times-sealed-v1';sessionId:string;post:'A'|'B';iv:string;ciphertext:string;}
const hexBytes=(hex:string)=>new Uint8Array(hex.match(/.{2}/g)!.map(s=>parseInt(s,16)));
const base64=(bytes:Uint8Array)=>btoa(Array.from(bytes,b=>String.fromCharCode(b)).join(''));
const unbase64=(value:string)=>Uint8Array.from(atob(value),c=>c.charCodeAt(0));
async function keyFor(config:OfflineConfig){
 if(!config.transferKey||!/^[a-f0-9]{64}$/.test(config.transferKey))throw new Error('Clé de séance absente. Importez la préparation depuis le poste C.');
 return crypto.subtle.importKey('raw',hexBytes(config.transferKey) as BufferSource,'AES-GCM',false,['encrypt','decrypt']);
}
export function newTransferKey(){return Array.from(crypto.getRandomValues(new Uint8Array(32)),b=>b.toString(16).padStart(2,'0')).join('');}
export async function sealTimes(pack:TimesPack,config:OfflineConfig):Promise<string>{
 const iv=crypto.getRandomValues(new Uint8Array(12));
 const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv},await keyFor(config),new TextEncoder().encode(JSON.stringify(pack)));
 return JSON.stringify({kind:'orun-times-sealed-v1',sessionId:pack.sessionId,post:pack.post,iv:base64(iv),ciphertext:base64(new Uint8Array(cipher))} satisfies SealedTimes);
}
export async function openTimes(raw:string,config:OfflineConfig):Promise<TimesPack>{
 let p:SealedTimes;
 try{p=JSON.parse(raw);}catch{throw new Error('Fichier de chronos illisible.');}
 if(!p||p.kind!=='orun-times-sealed-v1'||p.sessionId!==config.sessionId||!['A','B'].includes(p.post)||typeof p.iv!=='string'||typeof p.ciphertext!=='string')
  throw new Error('Fichier de chronos différent de la leçon active.');
 try{
  const decoded=await crypto.subtle.decrypt({name:'AES-GCM',iv:unbase64(p.iv) as BufferSource},await keyFor(config),unbase64(p.ciphertext) as BufferSource);
  const pack=JSON.parse(new TextDecoder().decode(decoded)) as TimesPack;
  if(pack.sessionId!==p.sessionId||pack.post!==p.post)throw new Error('Identifiants incohérents.');
  return pack;
 }catch{throw new Error('Impossible de déchiffrer les chronos : fichier endommagé ou autre préparation de séance.');}
}
export async function shareOrDownload(name:string,body:string){
 const file=new File([body],name,{type:'application/json'});
 if(navigator.share&&navigator.canShare?.({files:[file]})){
  try{await navigator.share({files:[file],title:'O’Run — Chronos de la séance'});return 'Partage ouvert : choisissez AirDrop et le poste C.';}
  catch(e){if((e as Error).name==='AbortError')return 'Partage annulé : les chronos sont toujours enregistrés sur cet iPad.';}
 }
 download(name,body,'application/json');
 return 'Fichier téléchargé. Depuis Fichiers, utilisez Partager → AirDrop.';
}
