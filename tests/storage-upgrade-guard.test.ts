import {beforeEach,describe,expect,it,vi} from 'vitest';
import {IDBFactory} from 'fake-indexeddb';

function localStorageMock(){
 const values=new Map<string,string>();
 return {
  getItem:(key:string)=>values.get(key)??null,
  setItem:(key:string,value:string)=>{values.set(key,String(value));},
  removeItem:(key:string)=>{values.delete(key);},
  clear:()=>values.clear(),
  key:(index:number)=>[...values.keys()][index]??null,
  get length(){return values.size;}
 };
}
beforeEach(()=>{
 vi.resetModules();
 Object.defineProperty(globalThis,'indexedDB',{value:new IDBFactory(),configurable:true});
 Object.defineProperty(globalThis,'localStorage',{value:localStorageMock(),configurable:true});
});
describe('Conservation de l’espace O’Run lors d’une mise à jour',()=>{
 it('conserve la même base après un rechargement normal',async()=>{
  const storage=await import('../src/services/storage');
  const first=await storage.loadWorkspace();
  const second=await storage.loadWorkspace();
  expect(second.data).toEqual(first.data);
  expect(localStorage.getItem('orun:has-workspace-v1')).toBe('1');
 });
 it('refuse une nouvelle base vide si le stockage précédemment utilisé a disparu',async()=>{
  const storage=await import('../src/services/storage');
  await storage.loadWorkspace();
  const request=indexedDB.open('orun-v1',1);
  const db=await new Promise<IDBDatabase>((resolve,reject)=>{
   request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);
  });
  await new Promise<void>((resolve,reject)=>{
   const tx=db.transaction('workspace','readwrite');
   tx.objectStore('workspace').clear();
   tx.oncomplete=()=>resolve();
   tx.onerror=()=>reject(tx.error);
  });
  db.close();
  localStorage.removeItem('orun:workspace-mirror-v1');
  await expect(storage.loadWorkspace()).rejects.toThrow(/Aucun espace vide/);
 });
});

async function clearWorkspace(){const request=indexedDB.open('orun-v1',1);const db=await new Promise<IDBDatabase>((resolve,reject)=>{request.onsuccess=()=>resolve(request.result);request.onerror=()=>reject(request.error);});await new Promise<void>((resolve,reject)=>{const tx=db.transaction('workspace','readwrite');tx.objectStore('workspace').clear();tx.oncomplete=()=>resolve();tx.onerror=()=>reject(tx.error);});db.close();}
it('retrouve la dernière classe depuis la copie indépendante après disparition de la base',async()=>{const s=await import('../src/services/storage'),{createClass}=await import('../src/domain/classroom');await s.loadWorkspace();await s.mutate(w=>({...w,data:createClass(w.data,'Classe intacte')}));await clearWorkspace();expect((await s.loadWorkspace()).data.sequences.some(q=>q.classes.includes('Classe intacte'))).toBe(true);});
it('la copie supplémentaire respecte le chiffrement et permet le déverrouillage après perte de la base',async()=>{const s=await import('../src/services/storage'),{createClass}=await import('../src/domain/classroom');await s.loadWorkspace();await s.mutate(w=>({...w,data:createClass(w.data,'Classe confidentielle')}));await s.protect('phrase suffisamment longue');expect(localStorage.getItem('orun:workspace-mirror-v1')).not.toContain('Classe confidentielle');await clearWorkspace();s.lock();await expect(s.loadWorkspace()).rejects.toThrow(/verrouillé/);await expect(s.unlock('mauvaise')).rejects.toThrow();const w=await s.unlock('phrase suffisamment longue');expect(w.data.sequences.some(q=>q.classes.includes('Classe confidentielle'))).toBe(true);});
it('propose une restauration explicite sans jamais écraser un espace existant',async()=>{const s=await import('../src/services/storage'),{createClass}=await import('../src/domain/classroom');await s.loadWorkspace();await s.mutate(w=>({...w,data:createClass(w.data,'Classe restaurée')}));const backup=await s.exportWorkspaceBackup();await expect(s.restoreMissingWorkspace(backup)).rejects.toThrow(/existent encore/);await clearWorkspace();localStorage.removeItem('orun:workspace-mirror-v1');await expect(s.loadWorkspace()).rejects.toThrow(/Aucun espace vide/);await s.restoreMissingWorkspace(backup);expect((await s.loadWorkspace()).data.sequences.some(q=>q.classes.includes('Classe restaurée'))).toBe(true);});
it('un quota de copie supplémentaire ne supprime pas les classes de la base principale',async()=>{const s=await import('../src/services/storage'),{createClass}=await import('../src/domain/classroom');await s.loadWorkspace();const original=localStorage.setItem;localStorage.setItem=(key,value)=>{if(key==='orun:workspace-mirror-v1')throw new Error('Quota');original(key,value);};await s.mutate(w=>({...w,data:createClass(w.data,'Toujours présente')}));expect(s.storageCopyAvailable()).toBe(false);expect((await s.loadWorkspace()).data.sequences.some(q=>q.classes.includes('Toujours présente'))).toBe(true);});
