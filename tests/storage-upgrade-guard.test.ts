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
  await expect(storage.loadWorkspace()).rejects.toThrow(/ne créera pas d’espace vide/);
 });
});
