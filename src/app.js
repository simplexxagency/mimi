import './style.css';
import { FaceLandmarker, FilesetResolver } from '@mediapipe/tasks-vision';
import { drawScene, drawVector, demoExpression } from './avatar.js';
import { PortraitRig } from './portrait.js';
import { Head3D } from './head3d_ready.js';

const clamp=(v,a,b)=>Math.min(b,Math.max(a,v));
const state={camera:false,starting:false,detectBusy:false,mode:'vector',broadcast:false,mirror:true,
 sensitivity:1.15,smooth:.28,showCamera:false,transparent:false,videoStream:null,
 landmarker:null,live:null,values:null,lastVideoTime:-1,lastFaceTime:0,frames:0,fps:0,measureAt:performance.now(),lastError:'',
 cameras:[],photoFile:null,photoCrop:'auto',trackingCount:0,cameraFrameCount:0,smoothedLandmarks:null,previewOpen:0,tongueHeld:false,tongueValue:0,threeLayout:'auto',viseme:'Auto',visemeStrength:1,baseAvatar:'nova',cartoonFace:false};
const portrait=new PortraitRig();
const app=document.querySelector('#app');
app.innerHTML=[
 '<div class="app-shell">',
 ' <aside><div class="brand"><div class="logo">m</div><div><strong>mimi.</strong><span>Cartoon Camera</span></div></div>',
 ' <div><div class="nav-caption">Workspace</div><div class="nav-item active">✦ &nbsp; Avatar Studio</div><div class="nav-item">◉ &nbsp; Live Camera</div><div class="nav-item">▣ &nbsp; Meet Output</div></div>',
 ' <div class="side-bottom"><span id="pip" class="live-pip"></span><strong id="leftStatus">Offline · Preview</strong><div>Face tracking runs on your device. Camera video is never sent to a remote server.</div></div></aside>',
 ' <main><div class="topbar"><div><div class="eyebrow">LOCAL MOTION CAPTURE / 01</div><h1>Your expressions. Your avatar.</h1><div class="muted">A live cartoon avatar for Google Meet, OBS, and video calls.</div></div><div class="topright"><span class="dot"></span> Private by design · Localhost</div></div>',
 ' <div class="layout"><div class="main-column">',
 '  <div class="panel"><div class="panel-bar"><div><h2>Live Avatar Preview</h2><small>Studio frame · Canvas / 1280×720</small></div><span class="status-pill" id="faceStatus">◉ Demo Mode</span></div>',
 '   <div class="stage-frame" id="stage"><canvas id="avatarCanvas" width="1280" height="720"></canvas><canvas id="threeCanvas" width="1280" height="720" style="display:none"></canvas><div class="overlay-label"><i></i><span id="stageLabel">AVATAR / VECTOR</span></div></div>',
 '   <div class="stage-footer"><div class="metrics"><span><strong id="fps">60</strong> display FPS</span><span><strong id="tracking">Demo</strong> tracking</span><span><strong>100%</strong> local</span></div>',
 '    <div style="display:flex;gap:8px;flex-wrap:wrap;"><button id="shot" class="btn ghost small">📸 Snapshot</button><button id="broadcast" class="btn primary small">▣ Broadcast Mode</button></div></div>',
 '  </div><div class="lower"><div class="info-card"><div class="icon-box">◎</div><div><h3>52 Facial Expressions</h3><p>Eyes, eyebrows, mouth, smiles, and head movements. Powered by Google MediaPipe.</p></div></div>',
 '  <div class="info-card"><div class="icon-box">↗</div><div><h3>Google Meet via OBS</h3><p>In OBS: Window Capture → Start Virtual Camera → select OBS Virtual Camera in Google Meet.</p></div></div></div></div>',
 ' <div class="control-column"><div class="panel"><div class="panel-bar"><h2>Settings</h2><small>LIVE CONTROLS</small></div><div class="control-panel">',
 '  <div class="block"><div class="section-title">01 · Tracking</div><button class="btn primary row" id="start">◉ Start Camera</button><select id="cameraSelect" class="field"><option value="">Default Camera</option></select>',
 '   <div class="hint">Allow camera access in your browser. Demo animation works without a camera.</div><div class="status" id="status">✦ Ready to go. Click Start Camera.</div></div>',
 '  <div class="divider"></div>',
 '  <div class="block"><div class="section-title">02 · Avatar Type</div><div class="segmented"><button id="vectorMode" class="segment selected">Cartoon 2D</button><button id="photoMode" class="segment">My Portrait</button><button id="threeMode" class="segment">3D Head</button></div>',
 '   <div class="photo-controls block" id="photoControls"><label class="upload">⬆ Upload Your Cartoon Portrait<small>JPG / PNG · a single portrait or a 3–5-view collage</small><input type="file" accept="image/*" id="photoInput"/></label>',
 '     <select class="field" id="photoCrop"><option value="auto">Full Image (no cropping)</option><option value="center">Center View (3–5-image collage)</option><option value="left">Left View</option><option value="right">Right View</option></select><div id="threeControls" class="block hidden"><label class="section-title">Ready-Made 3D Avatars</label><select id="baseAvatar" class="field"><option value="nova">Nova · Male Avatar</option><option value="sky">Sky · stylized</option><option value="ember">Ember · hoodie</option><option value="kai">Kai · colorful</option></select><button id="loadSample3D" class="btn primary row" type="button">✦ Load Ready-Made 3D Avatar</button><select id="threeLayout" class="field hidden"><option value="auto">Auto: 5-View Collage</option><option value="5">5 Views</option><option value="3">3 Views</option><option value="1">Single Portrait</option></select><button id="reset3d" class="btn ghost">↺ Reset Head Position</button><div class="section-title">Mouth Shapes and Phonemes</div><select id="visemeSelect" class="field"><option value="Auto">Automatic · Camera Tracking</option><option value="Neutral">Neutral</option><option value="A">A · Wide Open</option><option value="E">E · Smile</option><option value="I">I · Narrow</option><option value="O">O · Rounded Lips</option><option value="U">U · Pursed Lips</option><option value="MBP">M / B / P · Closed Lips</option><option value="FV">F / V · Teeth on Lip</option><option value="TH">TH · Tongue and Teeth</option><option value="Smile">Smile</option><option value="Surprise">Surprise</option></select><div class="hint">Ready-made GLB models with animated teeth and mouth shapes. Source: VTubeMe · CC BY 4.0.</div><div class="hint">Drag the head to rotate it. Your webcam drives the 3D facial rig.</div></div><button class="btn ghost" id="calibrate">⊕ Calibrate Neutral Face</button><div class="section-title">04 · Mouth / Teeth / Tongue</div><div class="control-row"><label for="mouthPreview">Mouth Opening Test (No Camera)</label><output id="mouthPreviewVal">0%</output></div><input id="mouthPreview" type="range" min="0" max="100" step="1" value="0"/><button id="tongueHold" class="btn ghost row" type="button">👅 Show Tongue (Hold T)</button><div class="hint">3D uses real model morph targets, not painted-on lips. T activates the TH tongue shape. Automatic tongue tracking is not supported.</div></div></div>',
 '  <div class="divider"></div>',
 '  <div class="block"><div class="section-title">03 · Motion Controls</div>',
 '   <div class="control-row"><label for="sensitivity">Expression Intensity</label><output id="sensitivityVal">115%</output></div><div class="slider-row"><input id="sensitivity" type="range" min=".5" max="2" step=".05" value="1.15"/><output>✦</output></div>',
 '   <div class="control-row"><label for="smooth">Smoothing</label><output id="smoothVal">28%</output></div><div class="slider-row"><input id="smooth" type="range" min=".05" max=".9" step=".05" value=".28"/><output>≈</output></div>',
 '   <label class="control-row"><span>Transparent Background</span><input id="transparent" type="checkbox"/></label>',
 '   <label class="control-row"><span>Show Original Camera</span><input id="showCamera" type="checkbox"/></label>',
 '   <div id="camBox" class="camera-mini"><video id="cameraVideo" class="preview-video" muted autoplay playsinline></video></div></div>',
 '  <div class="divider"></div><div class="record-hint">🔒 Your face data stays on this device. Once installed, the model runs from local files.</div>',
 ' </div></div></div></div></main></div>',
 '<button class="broadcast-exit" id="broadcastExit">✕ Exit Broadcast (Esc)</button>'
].join('');
const $=id=>document.getElementById(id);
const canvas=$('avatarCanvas'),ctx=canvas.getContext('2d',{alpha:true});
const vid=$('cameraVideo');
const head3d=new Head3D($('threeCanvas'));
const obsQuery=new URLSearchParams(location.search).get('obs');
const isObsController=obsQuery==='1',isObsOutput=obsQuery==='output';
if(isObsOutput)document.title='Mimi Avatar Output';
const bridgeUrl='/__mimi_bridge';
let remotePose=null,remotePoseLive=false,remotePoseAt=0,lastObsSend=0,lastControlCommand=0;
let uploadedPortraitFile=null,loadedPortraitVersion=0,loadedPortraitCrop='',loadingPortrait=false;
let lastBridgeSettings='',lastBridgeError='',engineRenderCount=0;
async function sendBridge(payload){
 const response=await fetch(bridgeUrl,{method:'POST',headers:{'Content-Type':'application/json'},
   body:JSON.stringify(payload),cache:'no-store'});
 if(!response.ok)throw Error('Local bridge HTTP '+response.status);
 return response.json();
}
async function pollEngine(){
 try{
  const r=await fetch(bridgeUrl+'?view=engine',{cache:'no-store'});if(!r.ok)throw Error('IPC '+r.status);
  const {settings:m,command,portrait:remotePortrait}=await r.json();
  if(m){
   if(state.mode!==m.mode)mode(m.mode);
   state.sensitivity=m.sensitivity;state.smooth=m.smooth;
   state.viseme=m.viseme;state.visemeStrength=m.visemeStrength;
   state.previewOpen=m.previewOpen;state.transparent=m.transparent;
   state.tongueValue=m.tongueValue;state.photoCrop=m.photoCrop||'auto';
   if(m.baseAvatar!==state.baseAvatar){state.baseAvatar=m.baseAvatar;if(state.mode==='three')loadReadyAvatar();}
   if(m.cartoonFace!==state.cartoonFace){state.cartoonFace=m.cartoonFace;head3d.setCartoonFace(false);}
  }
  if(!remotePortrait?.version&&loadedPortraitVersion){
    loadedPortraitVersion=0;loadedPortraitCrop='';state.photoFile=null;portrait.image=false;
  }
  if(remotePortrait?.version&&(!loadingPortrait)&&(
      loadedPortraitVersion!==remotePortrait.version||loadedPortraitCrop!==state.photoCrop)){
    loadSharedPortrait(remotePortrait.version,state.photoCrop);
  }
  if(command&&command.sequence>lastControlCommand){
   lastControlCommand=command.sequence;
   if(command.action==='stop')stopCamera();
   else if(command.action==='calibrate'){
     if(state.live?.landmarks&&portrait.image){portrait.calibrate(state.live.landmarks,vid.videoWidth/Math.max(1,vid.videoHeight));note('Portrait calibration complete.');}
     else note('Select a portrait and look into the webcam to calibrate.');
   }
   else if(!state.camera&&!state.starting)startCamera(command.deviceId);
  }
 }catch(e){lastBridgeError=String(e);}
}
async function pollController(){
 try{
  const r=await fetch(bridgeUrl+'?view=controller',{cache:'no-store'});if(!r.ok)throw Error('IPC '+r.status);
  const {telemetry:t}=await r.json();
  if(t){
   remotePose=t.values;remotePoseLive=t.live;remotePoseAt=performance.now();
   const camera=!!t.camera;
   if(state.camera!==camera){state.camera=camera;setCameraUI();}
   state.trackingCount=t.trackingCount||0;
   if(t.error&&t.error!==state.lastError)note('Video Output: '+t.error,true);
  }
 }catch(e){lastBridgeError=String(e);}
}
function controlSettings(){
 return {mode:state.mode,sensitivity:state.sensitivity,smooth:state.smooth,
  previewOpen:state.previewOpen,viseme:state.viseme,visemeStrength:state.visemeStrength,
  tongueValue:state.tongueValue,transparent:state.transparent,
  baseAvatar:state.baseAvatar,cartoonFace:state.cartoonFace,photoCrop:state.photoCrop};
}
function pushSettings(){
 if(!isObsController)return;
 const settings=controlSettings(),serialized=JSON.stringify(settings);
 if(serialized===lastBridgeSettings)return;
 lastBridgeSettings=serialized;
 sendBridge({type:'settings',settings}).catch(e=>{lastBridgeSettings='';lastBridgeError=String(e);});
}
if(isObsController){
 setInterval(()=>{pushSettings();pollController();},180);
 window.addEventListener('input',()=>queueMicrotask(pushSettings),true);
 window.addEventListener('change',()=>queueMicrotask(pushSettings),true);
 window.addEventListener('click',()=>setTimeout(pushSettings,0),true);
}
if(isObsOutput){
 setInterval(pollEngine,120);
}
window.__mimiDiagnostics=()=>({role:isObsController?'controller':isObsOutput?'engine':'standalone',
 camera:state.camera,trackingCount:state.trackingCount,renderCount:engineRenderCount,
 fps:state.fps,mode:state.mode,lastError:state.lastError,bridgeError:lastBridgeError,
 visible:!document.hidden,live:!!state.live});
function note(message,error=false){const el=$('status');el.className='status'+(error?' error':'');el.textContent=(error?'⚠ ':'✦ ')+message;state.lastError=error?message:'';}
function setCameraUI(){ $('start').textContent=state.starting?'⌛ Starting...':state.camera?'⏹ Stop Camera':'◉ Start Camera';$('start').disabled=state.starting;
 $('pip').classList.toggle('on',state.camera);$('leftStatus').textContent=state.camera?'Camera · Connected':'Offline · Preview';}
function blend(result){const out={};(result?.faceBlendshapes?.[0]?.categories||[]).forEach(item=>out[item.categoryName]=item.score);return out;}
function interpolate(prev,next,factor){if(!prev)return next;const out={};for(let k in next)out[k]=prev[k]+(next[k]-prev[k])*factor;return out;}
function faceState(result){
 const pts=result?.faceLandmarks?.[0];if(!pts)return null;
 const b=blend(result),s=n=>b[n]||0;
 const eyeL=pts[33],eyeR=pts[263],nose=pts[1];
 const avgX=(eyeL.x+eyeR.x)/2,avgY=(eyeL.y+eyeR.y)/2;
 const width=Math.abs(eyeR.x-eyeL.x)||.2;
 return {landmarks:pts,shapes:b,blinkL:s('eyeBlinkLeft'),blinkR:s('eyeBlinkRight'),
 jaw:s('jawOpen'),smile:(s('mouthSmileLeft')+s('mouthSmileRight'))/2,
 brow:(s('browInnerUp')+s('browOuterUpLeft')+s('browOuterUpRight'))/3,pucker:s('mouthPucker'),
 yaw:clamp(((nose.x-avgX)/width)*1.7,-1,1),pitch:clamp(((nose.y-avgY)/width-.36)*.9,-1,1),
 roll:clamp(Math.atan2(eyeR.y-eyeL.y,eyeR.x-eyeL.x),-.35,.35)};
}
async function loadModel(){
 if(state.landmarker)return state.landmarker;
 const fileset=await FilesetResolver.forVisionTasks('/wasm');
 const opts={baseOptions:{modelAssetPath:'/model/face_landmarker.task',delegate:'GPU'},runningMode:'VIDEO',numFaces:1,outputFaceBlendshapes:true};
 try{state.landmarker=await FaceLandmarker.createFromOptions(fileset,opts);}
 catch(error){console.warn('GPU path unavailable, switching to CPU',error);opts.baseOptions.delegate='CPU';state.landmarker=await FaceLandmarker.createFromOptions(fileset,opts);}
 return state.landmarker;
}
async function refreshDevices(){
 if(!navigator.mediaDevices?.enumerateDevices)return;
 const devices=await navigator.mediaDevices.enumerateDevices();
 const choices=devices.filter(d=>d.kind==='videoinput');state.cameras=choices;
 $('cameraSelect').innerHTML='<option value="">Default Camera</option>';
 choices.forEach((d,i)=>{const opt=document.createElement('option');opt.value=d.deviceId;opt.textContent=d.label||'Camera '+(i+1);$('cameraSelect').appendChild(opt);});
}
async function startCamera(selectedId=''){
 if(isObsController){
  note('Background camera tracking runs in the independent Mimi output.');
  sendBridge({type:'camera',action:'start',deviceId:selectedId||$('cameraSelect').value}).catch(e=>note(String(e),true));
  return;
 }
 if(state.starting)return;state.starting=true;setCameraUI();
 try{
  if(!navigator.mediaDevices?.getUserMedia)throw Error('Webcam unavailable: localhost or HTTPS is required.');
  note('Connecting camera and face tracking model…');
  const deviceId=selectedId||$('cameraSelect').value;
  const stream=await navigator.mediaDevices.getUserMedia({audio:false,video:{width:{ideal:640},height:{ideal:480},frameRate:{ideal:30},...(deviceId?{deviceId:{exact:deviceId}}:{})}});
  state.videoStream=stream;vid.srcObject=stream;await vid.play();await loadModel();
  state.camera=true;state.lastVideoTime=-1;state.values=null;state.smoothedLandmarks=null;state.trackingCount=0;
  await refreshDevices();note('Camera connected. Look into the webcam and test your expressions.');
 }catch(error){
  console.error(error);state.videoStream?.getTracks().forEach(t=>t.stop());state.videoStream=null;
  note('Unable to start: '+String(error?.message||error),true);
 }finally{state.starting=false;setCameraUI();}
}
function stopCamera(){
 if(isObsController){
  sendBridge({type:'camera',action:'stop'}).catch(e=>note(String(e),true));
  return;
 }
 state.videoStream?.getTracks().forEach(t=>t.stop());state.videoStream=null;vid.srcObject=null;state.camera=false;state.live=null;state.values=null;state.smoothedLandmarks=null;note('Camera stopped. Demo animation is active.');setCameraUI();}
function enterBroadcast(on){state.broadcast=on;document.body.classList.toggle('broadcast',on);$('broadcast').textContent=on?'✕ Exit Broadcast':'▣ Broadcast Mode';}
$('start').addEventListener('click',()=>state.camera?stopCamera():startCamera());
$('cameraSelect').addEventListener('change',async()=>{if(state.camera){stopCamera();await startCamera();}});
$('sensitivity').addEventListener('input',e=>{state.sensitivity=+e.target.value;$('sensitivityVal').textContent=Math.round(state.sensitivity*100)+'%';});
$('smooth').addEventListener('input',e=>{state.smooth=+e.target.value;$('smoothVal').textContent=Math.round(state.smooth*100)+'%';});
$('showCamera').addEventListener('change',e=>{state.showCamera=e.target.checked;$('camBox').style.display=state.showCamera?'block':'none';});
$('transparent').addEventListener('change',e=>state.transparent=e.target.checked);
function mode(type){
 const changed=state.mode!==type;
 state.mode=type;head3d.active=type==='three';
 $('vectorMode').classList.toggle('selected',type==='vector');
 $('photoMode').classList.toggle('selected',type==='photo');
 $('threeMode').classList.toggle('selected',type==='three');
 $('photoControls').classList.toggle('visible',type!=='vector');
 $('threeControls').classList.toggle('hidden',type!=='three');
 $('photoCrop').classList.toggle('hidden',type==='three');
 $('threeCanvas').style.display=type==='three'?'block':'none';
 $('threeCanvas').style.pointerEvents=type==='three'?'auto':'none';
 $('stageLabel').textContent=type==='vector'?'AVATAR / VECTOR':type==='photo'?'PORTRAIT / FRAME LOCKED':'VOLUMETRIC HEAD / THREE.JS';
 if(changed&&type==='three'&&!head3d.ready)loadReadyAvatar();
 else if(changed&&state.photoFile&&type==='photo')uploadPortrait();
}
$('vectorMode').addEventListener('click',()=>mode('vector'));
$('photoMode').addEventListener('click',()=>mode('photo'));
$('threeMode').addEventListener('click',()=>mode('three'));
$('threeLayout').addEventListener('change',e=>{state.threeLayout=e.target.value;});
$('visemeSelect').addEventListener('change',e=>{state.viseme=e.target.value;});
$('reset3d').addEventListener('click',()=>head3d.reset());
$('loadSample3D').addEventListener('click',()=>loadReadyAvatar());
$('baseAvatar').addEventListener('change',e=>{state.baseAvatar=e.target.value;loadReadyAvatar();});
async function loadReadyAvatar(){
 if(state.sampleLoading)return;
 state.sampleLoading=true;
 try{note('Loading a 3D model with animated lips and eyelids…');
 const r=await head3d.loadReady(state.baseAvatar);head3d.setCartoonFace(false);note(state.baseAvatar+' loaded: '+head3d.debug.morphTargets+' morph targets, real teeth, and ARKit expressions. '+(state.baseAvatar==='nova'?'':'')+'Test the mouth shapes below and your webcam.');}
 catch(error){console.error(error);note('Unable to load the 3D model: '+(error.message||error),true);}finally{state.sampleLoading=false;}
}
async function detectPortrait(source){
 if(!state.landmarker)await loadModel();
 state.detectBusy=true;let switched=false;
 try{await state.landmarker.setOptions({runningMode:'IMAGE'});switched=true;return state.landmarker.detect(source);}
 finally{if(switched)await state.landmarker.setOptions({runningMode:'VIDEO'});state.detectBusy=false;}
}
// A portrait is local-only. The background OBS engine downloads its own copy, so
// minimizing the controller can never hide the uploaded file from Google Meet.
async function uploadSharedPortrait(file){
 let upload=file;
 if(file.size>7*1024*1024){
  const url=URL.createObjectURL(file),img=new Image();
  try{
   await new Promise((ok,bad)=>{img.onload=ok;img.onerror=bad;img.src=url;});
   const scale=Math.min(1,1800/Math.max(img.naturalWidth,img.naturalHeight));
   const c=document.createElement('canvas');
   c.width=Math.round(img.naturalWidth*scale);c.height=Math.round(img.naturalHeight*scale);
   c.getContext('2d').drawImage(img,0,0,c.width,c.height);
   const blob=await new Promise(resolve=>c.toBlob(resolve,'image/webp',.91));
   if(blob)upload=blob;
  }finally{URL.revokeObjectURL(url);}
 }
 const r=await fetch('/__mimi_portrait',{method:'POST',headers:{'Content-Type':upload.type},body:upload});
 if(!r.ok)throw Error('Unable to send portrait to OBS: '+await r.text());
 const receipt=await r.json();
 uploadedPortraitFile=file;
 pushSettings();
 return receipt;
}
async function loadSharedPortrait(version,crop){
 if(!isObsOutput||loadingPortrait)return;
 loadingPortrait=true;
 try{
  const response=await fetch('/__mimi_portrait?version='+version,{cache:'no-store'});
  if(!response.ok)throw Error('Portrait image not received from Mimi controls: HTTP '+response.status);
  const blob=await response.blob();
  const file=new File([blob],'mimi-portrait.'+(blob.type==='image/png'?'png':blob.type==='image/webp'?'webp':'jpg'),{type:blob.type});
  const loaded=await portrait.load(file,crop,detectPortrait);
  state.photoFile=file;loadedPortraitVersion=version;loadedPortraitCrop=crop;
  if(state.live?.landmarks)portrait.calibrate(state.live.landmarks,vid.videoWidth/Math.max(1,vid.videoHeight));
  note(loaded.tracking?'Portrait received: facial animation is active.':'Portrait received, but no face was detected. Showing a static image.');
 }catch(error){console.error('Mimi output portrait load',error);note(String(error?.message||error),true);}
 finally{loadingPortrait=false;}
}
async function uploadPortrait(){
 const file=state.photoFile;if(!file)return;
 try{
  note('Uploading your portrait to Mimi and OBS…');
  if(isObsController&&uploadedPortraitFile!==file)await uploadSharedPortrait(file);
  if(state.mode==='three')return;
  const loaded=await portrait.load(file,state.photoCrop,detectPortrait);
  if(state.live?.landmarks)portrait.calibrate(state.live.landmarks,vid.videoWidth/Math.max(1,vid.videoHeight));
  note(loaded.tracking
   ?'Portrait loaded in Mimi and OBS. Click Calibrate for more natural expressions.'
   :'Portrait sent to OBS. No face was detected, so the image may remain static.');
 }catch(error){console.error(error);note(String(error?.message||error),true);}
}
$('photoInput').addEventListener('change',e=>{
 const file=e.target.files?.[0];if(!file)return;
 if(state.mode!=='photo')mode('photo');
 state.photoFile=file;uploadPortrait();
});
$('photoCrop').addEventListener('change',e=>{
 state.photoCrop=e.target.value;pushSettings();
 if(state.photoFile)uploadPortrait();
});
$('mouthPreview').addEventListener('input',e=>{state.previewOpen=Number(e.target.value)/100;$('mouthPreviewVal').textContent=e.target.value+'%';});
const setTongue=on=>{state.tongueHeld=on;$('tongueHold').textContent=on?'👅 Tongue Out (T)':'👅 Show Tongue (Hold T)';};
$('tongueHold').addEventListener('pointerdown',e=>{e.preventDefault();setTongue(true);$('tongueHold').setPointerCapture(e.pointerId);});
$('tongueHold').addEventListener('pointerup',()=>setTongue(false));
$('tongueHold').addEventListener('pointercancel',()=>setTongue(false));
$('tongueHold').addEventListener('lostpointercapture',()=>setTongue(false));
window.addEventListener('blur',()=>setTongue(false));
window.addEventListener('keydown',e=>{if(e.code==='KeyT'&&!e.repeat && !['TEXTAREA','SELECT'].includes(document.activeElement?.tagName) && !(document.activeElement?.tagName==='INPUT' && ['text','search','email','number','password'].includes(document.activeElement.type))){setTongue(true);}});
window.addEventListener('keyup',e=>{if(e.code==='KeyT')setTongue(false);});
$('calibrate').addEventListener('click',()=>{
 if(isObsController){sendBridge({type:'camera',action:'calibrate'}).then(()=>note('Calibration sent to the background avatar.')).catch(e=>note(String(e),true));return;}
 if(state.live?.landmarks){portrait.calibrate(state.live.landmarks,vid.videoWidth/Math.max(1,vid.videoHeight));note('Calibration complete. Neutral expression updated; portrait framing stays fixed.');}else note('Start the camera and face it directly before calibrating.',true);
});
$('broadcast').addEventListener('click',()=>enterBroadcast(!state.broadcast));
$('broadcastExit').addEventListener('click',()=>enterBroadcast(false));
window.addEventListener('keydown',e=>{
 if(e.key==='Escape'&&state.broadcast)enterBroadcast(false);
 // During OBS capture switch avatars without leaving fullscreen or touching OBS/Meet.
 if(!state.broadcast||e.repeat||e.altKey||e.ctrlKey||e.metaKey||e.target?.closest?.('input,select,textarea'))return;
 if(e.code==='Digit1'||e.code==='Numpad1')mode('vector');
 if(e.code==='Digit2'||e.code==='Numpad2')mode('three');
});
$('shot').addEventListener('click',()=>{(state.mode==='three'&&head3d.ready?$('threeCanvas'):canvas).toBlob(blob=>{if(!blob)return;const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='mimi-avatar-'+Date.now()+'.png';a.click();setTimeout(()=>URL.revokeObjectURL(url),4000);},'image/png');});
refreshDevices().catch(()=>{});
// OBS capture defaults to the cartoon 2D avatar; press 1/2 inside this window to switch.
if(isObsController){
 document.body.classList.add('obs-control-mode');
 mode('vector');
 enterBroadcast(true);
 // Restore the last locally saved portrait for the controller's preview after a restart.
 fetch('/__mimi_portrait',{cache:'no-store'}).then(async response=>{
   if(!response.ok)return;
   const blob=await response.blob();
   const file=new File([blob],'last-mimi-portrait',{type:blob.type});
   state.photoFile=file;uploadedPortraitFile=file;
   if(state.mode==='photo')await uploadPortrait();
 }).catch(error=>console.warn('Mimi: previous portrait unavailable',error));
 // Webcam and tracking live in the independent output window, never in this minimizable controller.
 pushSettings();
 pollController();
}else if(isObsOutput){
 mode('vector');
 enterBroadcast(true);
 pollEngine();
 startCamera().catch(error=>console.warn('Mimi background engine startup',error));
}

let lastSeen=0,lastRenderAt=0;
function frame(t){requestAnimationFrame(frame);renderFrame(t);}
function renderFrame(t){
 if(t-lastRenderAt<30)return; // Cap webcam inference/rendering around 30 FPS, even on 144 Hz screens.
 lastRenderAt=t;
 engineRenderCount++;
 if(state.camera&&state.landmarker&&!state.detectBusy&&vid.readyState>=2){
  if(vid.currentTime!==state.lastVideoTime){
   state.lastVideoTime=vid.currentTime;state.cameraFrameCount++;
   try{
    const result=state.landmarker.detectForVideo(vid,t);
    const next=faceState(result);
    if(next){
     // Smooth camera landmarks as well as expression values, to remove pixel jitter.
     if(!state.smoothedLandmarks||state.smoothedLandmarks.length!==next.landmarks.length){
      state.smoothedLandmarks=next.landmarks.map(p=>({x:p.x,y:p.y,z:p.z}));
     }else{
      const alpha=clamp(state.smooth,.15,.85);
      state.smoothedLandmarks.forEach((p,i)=>{
       const n=next.landmarks[i];p.x+=(n.x-p.x)*alpha;p.y+=(n.y-p.y)*alpha;p.z+=(n.z-p.z)*alpha;
      });
     }
     state.live={...next,landmarks:state.smoothedLandmarks};state.values=interpolate(state.values,{
      blinkL:next.blinkL,blinkR:next.blinkR,jaw:next.jaw,smile:next.smile,brow:next.brow,
      pucker:next.pucker,yaw:next.yaw,pitch:next.pitch,roll:next.roll,
      ...Object.fromEntries(Object.entries(next.shapes||{}).map(([k,v])=>['arkit_'+k,v]))
     },state.smooth);
     lastSeen=t;state.trackingCount++;
     if(state.mode==='photo'&&!portrait.neutral&&portrait.image)portrait.calibrate(state.live.landmarks,vid.videoWidth/Math.max(1,vid.videoHeight));
    }else if(t-lastSeen>1500)state.live=null;
   }catch(error){console.error('Frame tracking error',error);state.detectBusy=true;note('Face tracking error: '+String(error?.message||error),true);}
  }
 }
 const remoteActive=isObsController&&remotePose&&t-remotePoseAt<2000;
 const live=remoteActive?remotePoseLive:state.camera&&state.live&&(t-lastSeen<1300);
 const d=remoteActive?remotePose:live?state.values:demoExpression(t);
 if(isObsOutput&&t-lastObsSend>160){
  sendBridge({type:'telemetry',telemetry:{
   camera:state.camera,trackingCount:state.trackingCount,cameraFrameCount:state.cameraFrameCount,
   videoTime:vid.currentTime,videoReadyState:vid.readyState,streamTrackState:state.videoStream?.getVideoTracks()[0]?.readyState||'none',
   renderCount:engineRenderCount,values:live?state.values:null,live:!!live,error:state.lastError
  }}).catch(e=>{lastBridgeError=String(e)});
  lastObsSend=t;
 }
 const tongueTarget=state.tongueHeld?1:0;
 state.tongueValue+=(tongueTarget-state.tongueValue)*.22;
 drawScene(ctx,1280,720,t,{transparent:state.transparent});
 if(state.mode==='three'){
  head3d.update(d,{live,sensitivity:state.sensitivity,previewOpen:state.previewOpen,tongue:state.tongueValue,viseme:state.viseme,visemeStrength:state.visemeStrength});
  head3d.render();
  if(!head3d.ready){
   ctx.fillStyle='#deeee9';ctx.font='600 26px sans-serif';ctx.textAlign='center';
   ctx.fillText('Loading your animated 3D avatar…',640,360);
   ctx.textAlign='start';
  }
 }else if(state.mode==='photo'&&portrait.image){
  portrait.draw(ctx,1280,720,(live&&state.live?.landmarks)?{...state.values,landmarks:state.live.landmarks,transparent:state.transparent}:{...d,transparent:state.transparent},state.sensitivity,{previewOpen:state.previewOpen,tongue:state.tongueValue});
 }else if(state.mode==='vector'){
  const amplified={...d};['jaw','smile','brow','pucker'].forEach(k=>amplified[k]=clamp((d[k]||0)*state.sensitivity,0,1));
  drawVector(ctx,1280,720,amplified,{tracking:live,previewOpen:state.previewOpen,viseme:state.viseme,visemeStrength:state.visemeStrength},t);
 }
 if(!state.transparent){
  ctx.fillStyle='#89b6aa';ctx.font='12px sans-serif';ctx.fillText('MIMI  /  '+(live?'FACE TRACKING ACTIVE':'STANDBY'),40,675);
  if(state.mode==='photo'&&!portrait.image){ctx.fillStyle='#f1f2ea';ctx.font='600 18px sans-serif';ctx.fillText('Upload your cartoon portrait →',795,620);}
 }
 state.frames++;
 if(t-state.measureAt>750){
  const fps=Math.round(state.frames*1000/(t-state.measureAt));state.fps=fps;state.frames=0;state.measureAt=t;
  $('fps').textContent=String(fps);$('tracking').textContent=live?'Face detected':state.camera?'Searching…':'Demo';
  $('faceStatus').textContent=live?'● Face Tracking':state.camera?'◌ Searching for face':'◉ Demo Mode';
 }
}
requestAnimationFrame(frame);
if(isObsOutput){
 // requestAnimationFrame is suspended in occluded/minimized Chromium windows.
 // Fallback timer + dedicated Chrome background flags keep tracking/rendering active.
 setInterval(()=>{if(performance.now()-lastRenderAt>70)renderFrame(performance.now());},40);
}
