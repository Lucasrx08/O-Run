import {useEffect,useRef,useState} from 'react';
import {ArrowLeft,ArrowRight,Camera,Check,FileUp,Pause,Play,ScanLine} from 'lucide-react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';
import {parseQRFrame,type QRFrame} from '../services/qrTransfer';
import {Dialog} from './ui';

/** All QR operations take place in the installed PWA, without network requests. */
export function QRShowDialog({title,frames,onClose}:{title:string;frames:string[];onClose:()=>void}){
 const [index,setIndex]=useState(0),[src,setSrc]=useState(''),[error,setError]=useState(''),[autoplay,setAutoplay]=useState(frames.length>1);
 useEffect(()=>{if(!autoplay||frames.length<2)return;const id=window.setInterval(()=>setIndex(i=>(i+1)%frames.length),2000);return()=>window.clearInterval(id);},[autoplay,frames.length]);
 useEffect(()=>{let alive=true;setSrc('');QRCode.toDataURL(frames[index],{width:620,margin:3,errorCorrectionLevel:frames[index].length>1000?'L':'M'})
  .then(url=>{if(alive)setSrc(url);}).catch(()=>{if(alive)setError('Impossible de dessiner ce QR code. Utilisez le fichier de secours.');});
  return()=>{alive=false;};},[frames,index]);
 return <Dialog wide title={title} onClose={onClose}><div className="qr-show">
  <p>Présentez cet écran devant la caméra de l’autre appareil. Aucun fichier ni réseau n’est nécessaire.</p>
  {error?<p role="alert" className="form-error">{error}</p>:src?<img src={src} alt={`QR code ${index+1} sur ${frames.length}`} className="qr-image"/>:<p>Préparation du QR code…</p>}
  <div className="qr-pager"><button type="button" className="button" disabled={index===0} onClick={()=>setIndex(i=>i-1)}><ArrowLeft size={17}/>Précédent</button>
   <strong>QR {index+1} / {frames.length}</strong>
   <button type="button" className="button primary" disabled={index===frames.length-1} onClick={()=>setIndex(i=>i+1)}>Suivant<ArrowRight size={17}/></button></div>
  {frames.length>1&&<div className="qr-auto"><button type="button" className="button" aria-pressed={autoplay} onClick={()=>setAutoplay(v=>!v)}>{autoplay?<><Pause size={16}/>Mettre en pause</>:<><Play size={16}/>Faire défiler les QR</>}</button><p className="muted compact">Laissez l’écran devant la caméra : les QR défilent automatiquement toutes les 2 secondes.</p></div>}
 </div></Dialog>;
}

export function QRScanDialog({title,kind,onPayload,onClose}:{title:string;kind:'P'|'T';onPayload:(payload:string)=>Promise<void>;onClose:()=>void}){
 const video=useRef<HTMLVideoElement>(null),canvas=useRef<HTMLCanvasElement>(null);
 const [cameraError,setCameraError]=useState(''),[notice,setNotice]=useState('Présentez le QR code devant la caméra.'),[manual,setManual]=useState('');
 const [received,setReceived]=useState(0),[total,setTotal]=useState(1),[busy,setBusy]=useState(false);
 const parts=useRef(new Map<number,string>()),processing=useRef(false),previous=useRef(''),processRef=useRef<(s:string)=>void>(()=>{});
 const accept=async(raw:string)=>{
  if(processing.current)return;
  let part:QRFrame;
  try{part=parseQRFrame(raw);}catch(e){setNotice((e as Error).message);return;}
  if(part.kind!==kind){setNotice(kind==='P'?'Scannez un QR de préparation A ou B.':'Scannez le QR des chronos A ou B.');return;}
  if(total!==1&&part.total!==total){parts.current.clear();setReceived(0);}
  setTotal(part.total);
  if(!parts.current.has(part.index)){parts.current.set(part.index,part.part);setReceived(parts.current.size);}
  if(parts.current.size<part.total){setNotice(`QR ${part.index}/${part.total} reçu · poursuivez avec les autres.`);return;}
  const payload=Array.from({length:part.total},(_,i)=>parts.current.get(i+1)).join('');
  if(!payload||payload.includes('undefined')){setNotice('Une partie du transfert est manquante.');return;}
  processing.current=true;setBusy(true);
  try{await onPayload(payload);onClose();}
  catch(e){setNotice((e as Error).message);parts.current.clear();setReceived(0);setTotal(1);processing.current=false;setBusy(false);}
 };
 processRef.current=s=>{void accept(s);};
 useEffect(()=>{
  let closed=false,stream:MediaStream|undefined,frame=0,raf=0,detecting=false;
  let detector:{detect:(input:HTMLVideoElement)=>Promise<Array<{rawValue?:string}>>}|null=null;
  try{const Native=(window as unknown as {BarcodeDetector?:new(options:{formats:string[]})=>typeof detector}).BarcodeDetector;if(Native)detector=new Native({formats:['qr_code']});}catch{/* Use the offline JS decoder. */}
  const loop=()=>{
   if(closed)return;
   const v=video.current,c=canvas.current;
   if(v&&c&&v.readyState>=2&&v.videoWidth&&++frame%5===0&&!processing.current){
    if(detector&&frame%10===0){
     if(!detecting){detecting=true;const native=detector;
      void native.detect(v).then(codes=>{if(closed)return;const value=codes[0]?.rawValue;if(value&&value!==previous.current){previous.current=value;processRef.current(value);}if(!value)previous.current='';})
       .catch(()=>{detector=null;}).finally(()=>{detecting=false;});
     }
    }else{
     const w=Math.min(960,v.videoWidth),h=Math.round(w*v.videoHeight/v.videoWidth);
     if(c.width!==w)c.width=w;if(c.height!==h)c.height=h;
     const ctx=c.getContext('2d',{willReadFrequently:true});
     if(ctx){ctx.drawImage(v,0,0,w,h);const image=ctx.getImageData(0,0,w,h);
      const code=jsQR(image.data,w,h,{inversionAttempts:'dontInvert'});
      if(code&&code.data!==previous.current){previous.current=code.data;processRef.current(code.data);}
      if(!code)previous.current='';
     }
    }
   }
   raf=requestAnimationFrame(loop);
  };
  const init=async()=>{
   try{
    if(!navigator.mediaDevices?.getUserMedia)throw new Error('Caméra indisponible sur ce navigateur.');
    stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{facingMode:{ideal:'environment'},width:{ideal:1280}}});
    if(closed){stream.getTracks().forEach(t=>t.stop());return;}
    if(video.current){video.current.srcObject=stream;await video.current.play();}raf=requestAnimationFrame(loop);
   }catch(e){if(!closed)setCameraError('Impossible d’ouvrir la caméra. Autorisez son accès dans Safari, ou utilisez le fichier de secours. '+(e as Error).message);}
  };
  void init();
  return()=>{closed=true;cancelAnimationFrame(raf);stream?.getTracks().forEach(t=>t.stop());};
 },[]);
 return <Dialog wide title={title} onClose={onClose}><div className="qr-scanner">
  <div className="qr-camera"><video ref={video} muted playsInline autoPlay aria-label="Caméra de lecture des QR codes"/><div className="qr-target"><ScanLine size={50}/></div></div>
  <canvas ref={canvas} hidden/>
  {cameraError?<p className="form-error" role="alert">{cameraError}</p>:<p className="qr-camera-label"><Camera size={17}/> Lecture locale par caméra</p>}
  <p className="qr-scan-status" role="status">{busy?<><Check size={16}/>Vérification des données…</>:notice}{total>1&&` · ${received}/${total}`}</p>
  <details className="qr-manual"><summary><FileUp size={16}/>Dépannage : coller le contenu du QR code</summary>
   <textarea rows={3} aria-label="Contenu QR à coller" value={manual} onChange={e=>setManual(e.target.value)} placeholder="ORUN1|…"/>
   <button type="button" className="button" disabled={!manual.trim()||busy} onClick={()=>{void accept(manual.trim());setManual('');}}>Lire ce code</button>
  </details>
 </div></Dialog>;
}
