// Persistent timestamps use epoch time: they survive reloads and device sleep.
// A monotonic reference detects unexpected wall-clock changes while awake.
let epoch=Date.now(),mono=performance.now(),offset=Number(localStorage.getItem('orun-clock-offset')||0);
export const now=()=>Date.now()+offset;
export const drift=()=>Math.abs(Date.now()-(epoch+performance.now()-mono));
export function setServerOffset(value:number){offset=value;localStorage.setItem('orun-clock-offset',String(value));epoch=Date.now();mono=performance.now();}
if(typeof document!=='undefined')document.addEventListener('visibilitychange',()=>{if(!document.hidden){epoch=Date.now();mono=performance.now();}});
