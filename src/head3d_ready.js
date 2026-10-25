import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';

const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
const smooth=(a,b,t)=>{const x=clamp((t-a)/(b-a),0,1);return x*x*(3-2*x);};
const facialNames=[
 'jawOpen','jawLeft','jawRight','jawForward','mouthClose','mouthFunnel','mouthPucker',
 'mouthSmileLeft','mouthSmileRight','mouthFrownLeft','mouthFrownRight','mouthDimpleLeft','mouthDimpleRight',
 'mouthStretchLeft','mouthStretchRight','mouthRollLower','mouthRollUpper','mouthShrugLower','mouthShrugUpper',
 'mouthPressLeft','mouthPressRight','mouthLowerDownLeft','mouthLowerDownRight','mouthUpperUpLeft','mouthUpperUpRight',
 'cheekPuff','cheekSquintLeft','cheekSquintRight','eyeBlinkLeft','eyeBlinkRight',
 'eyeSquintLeft','eyeSquintRight','eyeWideLeft','eyeWideRight','browInnerUp','browDownLeft',
 'browDownRight','browOuterUpLeft','browOuterUpRight','noseSneerLeft','noseSneerRight',
 'aa','ih','ou','oh','E','PP','FF','TH','CH','DD','RR','SS','sil'
];
function preset(name,amount=1){
 const a=clamp(amount,0,1);
 const p={
  Neutral:{},
  A:{jawOpen:.52,aa:.64,mouthLowerDownLeft:.18,mouthLowerDownRight:.18},
  E:{jawOpen:.19,ih:.7,E:.78,mouthStretchLeft:.47,mouthStretchRight:.47},
  I:{jawOpen:.18,ih:.98,mouthSmileLeft:.30,mouthSmileRight:.30},
  O:{jawOpen:.18,oh:.62,mouthFunnel:.66,mouthPucker:.64},
  U:{jawOpen:.09,ou:.83,mouthPucker:.92,mouthFunnel:.25},
  MBP:{PP:.70,mouthPressLeft:.20,mouthPressRight:.20},
  FV:{jawOpen:.12,FF:.90},
  TH:{jawOpen:.34,TH:.98},
  Smile:{mouthSmileLeft:.90,mouthSmileRight:.90,cheekSquintLeft:.36,cheekSquintRight:.36},
  Surprise:{jawOpen:.60,aa:.5,eyeWideLeft:.6,eyeWideRight:.6,browInnerUp:.65},
  Tongue:{TH:1,jawOpen:.42},
 };
 return Object.fromEntries(Object.entries(p[name]||{}).map(([k,v])=>[k,v*a]));
}
// Original Nova's hairstyle remains intact: no unstable overlays or projected selfies.
// Nova scalp is texture-based and has no rigged long-hair mesh.
// Keep it clean instead of adding floating procedural ribbons.
export class Head3D{
 constructor(canvas){
  this.canvas=canvas;this.ready=false;this.active=false;this.manualYaw=0;this.manualPitch=0;
  this.poseYaw=0;this.posePitch=0;this.poseRoll=0;this.presets=['Neutral','A','E','I','O','U','MBP','FV','TH','Smile','Surprise','Tongue'];
  this.currentValues={};this.faceMeshes=[];this.bones={};this.debug={};
  try{
   this.renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance',preserveDrawingBuffer:true});
   this.renderer.setPixelRatio(Math.min(1.25,window.devicePixelRatio||1));
   this.renderer.setSize(1280,720,false);
   this.renderer.outputColorSpace=THREE.SRGBColorSpace;
   this.renderer.toneMapping=THREE.ACESFilmicToneMapping;
   this.renderer.toneMappingExposure=1.15;
   this.renderer.localClippingEnabled=false;
   this.scene=new THREE.Scene();
   this.camera=new THREE.PerspectiveCamera(33,1280/720,.03,100);
   this.scene.add(new THREE.HemisphereLight(0xe6f9ff,0x393a4f,2.0));
   const key=new THREE.DirectionalLight(0xffdcc6,2.1);key.position.set(-2,3,4);this.scene.add(key);
   const rim=new THREE.DirectionalLight(0x72b8ff,1.3);rim.position.set(3,2,-4);this.scene.add(rim);
  }catch(e){this.error=e;console.error('Mimi 3D viewer init',e);return;}
  canvas.addEventListener('pointerdown',e=>{if(!this.active)return;this.dragging=true;this.startX=e.clientX;this.startY=e.clientY;this.baseYaw=this.manualYaw;this.basePitch=this.manualPitch;canvas.setPointerCapture(e.pointerId);});
  canvas.addEventListener('pointermove',e=>{if(!this.dragging)return;this.manualYaw=clamp(this.baseYaw+(e.clientX-this.startX)*.008,-1.35,1.35);this.manualPitch=clamp(this.basePitch+(e.clientY-this.startY)*.006,-.4,.4);});
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,()=>{this.dragging=false});
 }
 reset(){this.manualYaw=0;this.manualPitch=0;}
 async load(file,detectImage,layout='auto'){return this.loadReady();}
 async loadReady(name='sky'){
  if(this.error)throw this.error;
  this.ready=false;
  const normalized=['kai','sky','nova','ember'].includes(name)?name:'sky';
  const gltf=await new GLTFLoader().loadAsync('/avatars/'+normalized+'.glb');
  if(this.model){this.scene.remove(this.model);this.model.traverse(o=>{if(o.geometry?.dispose)o.geometry.dispose();});}
  this.model=gltf.scene;this.scene.add(this.model);
  // A presentable relaxed pose instead of the GLB's export T-pose.
  this.model.updateMatrixWorld(true);
  // Rotate each upper arm's WORLD elbow direction from horizontal to relaxed down.
  for(const side of ['Left','Right']){
   const arm=this.model.getObjectByName(side+'Arm'),elbow=this.model.getObjectByName(side+'ForeArm');
   if(!arm||!elbow)continue;
   const a=new THREE.Vector3(),e=new THREE.Vector3();
   arm.getWorldPosition(a);elbow.getWorldPosition(e);
   const now=e.sub(a).normalize();
   const target=new THREE.Vector3(Math.sign(now.x)*.18,-1,.07).normalize();
   const delta=new THREE.Quaternion().setFromUnitVectors(now,target);
   const world=new THREE.Quaternion(),parent=new THREE.Quaternion();
   arm.getWorldQuaternion(world);arm.parent.getWorldQuaternion(parent);
   arm.quaternion.copy(parent.invert().multiply(delta).multiply(world));
   this.model.updateMatrixWorld(true);
  }
  // Darker hair/outfit to better suit the requested male cartoon direction.
  this.model.traverse(obj=>{
   if(!obj.isMesh&&!obj.isSkinnedMesh)return;
   const name=([obj.name||'',...(Array.isArray(obj.material)?obj.material:[obj.material]).map(m=>m?.name||'')].join(' ')).toLowerCase();
   if(name.includes('haircut') || name.includes('outfit')){
    const original=Array.isArray(obj.material)?obj.material:[obj.material];
    const replacements=original.map(material=>{
     const mat=material.clone();
     if(name.includes('haircut'))mat.color.multiply(new THREE.Color('#292526'));
     else mat.color.multiply(new THREE.Color('#323846'));
     return mat;
    });
    obj.material=Array.isArray(obj.material)?replacements:replacements[0];
   }
  });
  this.faceMeshes=[];
  let nTargets=0;
  this.model.traverse(o=>{
   if(o.isMesh||o.isSkinnedMesh){
    if(o.morphTargetDictionary&&o.morphTargetInfluences){
     this.faceMeshes.push(o);nTargets+=Object.keys(o.morphTargetDictionary).length;
    }
    o.frustumCulled=false;
    if(o.material){
     for(const m of (Array.isArray(o.material)?o.material:[o.material]))m.side=THREE.FrontSide;
    }
   }
  });
  this.headBone=this.model.getObjectByName('Head');
  this.neckBone=this.model.getObjectByName('Neck2')||this.model.getObjectByName('Neck');
  this.headQuaternion=this.headBone?.quaternion.clone();
  this.model.updateMatrixWorld(true);
  const headMesh=this.model.getObjectByName('AvatarHead');
  this.currentAvatar=normalized;
  this.headMesh=headMesh||null;
  this.originalHeadMap=headMesh?.material?.map||null;
  // The public build uses original, embedded VTubeMe model materials only.
  // Private portrait atlases and eye textures are never bundled.
  this.personalizedTexture=null;
  this.eyeMaterials=[];
  const fullBounds=new THREE.Box3().setFromObject(this.model);
  const headBounds=headMesh?new THREE.Box3().setFromObject(headMesh):fullBounds;
  this.hasScar=false;
  this.customHair=null; // Intentionally avoid disconnected fake hair geometry.
  const center=headBounds.getCenter(new THREE.Vector3());
  const size=headBounds.getSize(new THREE.Vector3());
  // Aim a little lower to raise the rendered avatar without shifting the UI/canvas.
  const viewTarget=center.clone();viewTarget.y+=Math.max(.008,size.y*.075);
  const portraitHeight=Math.max(.58,size.y*2.10);
  const fov=THREE.MathUtils.degToRad(this.camera.fov);
  const cameraDistance=portraitHeight/(2*Math.tan(fov/2))*.53;
  this.camera.position.set(viewTarget.x,viewTarget.y,cameraDistance+center.z);
  this.camera.lookAt(viewTarget);
  this.cameraTarget=viewTarget;
  this.normalScale=1;
  this.ready=true;
  this.debug={source:'VTubeMe '+normalized+' licensed CC BY 4.0',morphTargets:nTargets,morphMeshes:this.faceMeshes.length,headBone:!!this.headBone,facialNames:[...new Set(this.faceMeshes.flatMap(m=>Object.keys(m.morphTargetDictionary)))],headSize:size.toArray(),cameraDistance,hasScar:this.hasScar};
  return {views:1,vertices:nTargets,preview:true};
 }
 setCartoonFace(enabled){
  this.cartoonEnabled=!!enabled;
  if(this.headMesh&&this.personalizedTexture){
   this.headMesh.material.map=enabled?this.personalizedTexture:this.originalHeadMap;
   this.headMesh.material.needsUpdate=true;
  }
  for(const eye of this.eyeMaterials||[]){
   eye.mesh.material.map=enabled?eye.custom:eye.original;
   eye.mesh.material.needsUpdate=true;
  }
 }
 applyMorphs(next){
  for(const m of this.faceMeshes){
   const dict=m.morphTargetDictionary,inf=m.morphTargetInfluences;
   for(const name of Object.keys(dict)){
    const target=clamp(next[name]||0,0,1),index=dict[name];
    inf[index]+=(target-inf[index])*.22;
   }
  }
 }
 update(pose={},opts={}){
  if(!this.ready)return;
  const live=!!opts.live;
  const cameraYaw=live?clamp((pose.yaw||0)*.62,-.58,.58):0;
  const cameraPitch=live?clamp((pose.pitch||0)*-.38,-.35,.35):0;
  const cameraRoll=live?clamp((pose.roll||0)*-.65,-.30,.30):0;
  this.poseYaw+=(cameraYaw-this.poseYaw)*.17;
  this.posePitch+=(cameraPitch-this.posePitch)*.17;
  this.poseRoll+=(cameraRoll-this.poseRoll)*.17;
  if(this.headBone&&this.headQuaternion){
   const delta=new THREE.Quaternion().setFromEuler(new THREE.Euler(this.manualPitch+this.posePitch,this.manualYaw+this.poseYaw,this.poseRoll,'YXZ'));
   this.headBone.quaternion.copy(this.headQuaternion).multiply(delta);
  }else{
   this.model.rotation.set(this.manualPitch+this.posePitch,this.manualYaw+this.poseYaw,this.poseRoll,'YXZ');
  }
  const jaw=clamp(Math.max((pose.jaw||0)*(opts.sensitivity||1),opts.previewOpen||0),0,1);
  const openness=smooth(.045,.68,jaw);
  const next={};
  // ARKit blendshapes from live face tracking, rather than a textured elliptical hole.
  if(live){
   for(const name of facialNames){
    const value=pose['arkit_'+name];
    if(typeof value==='number')next[name]=clamp(value,0,1);
   }
  }
  next.jawOpen=openness;
  next.aa=openness*.50;
  next.eyeBlinkLeft=clamp(pose.blinkL||0,0,1);
  next.eyeBlinkRight=clamp(pose.blinkR||0,0,1);
  next.browInnerUp=clamp(pose.brow||0,0,1);
  next.browOuterUpLeft=next.browInnerUp*.62;
  next.browOuterUpRight=next.browInnerUp*.62;
  next.mouthSmileLeft=clamp(pose.smile||0,0,1);
  next.mouthSmileRight=clamp(pose.smile||0,0,1);
  next.mouthPucker=clamp(pose.pucker||0,0,1);
  next.mouthFunnel=next.mouthPucker*.6;
  const emotion=opts.viseme||'Auto';
  if(emotion!=='Auto'){
   const manual=preset(emotion,opts.visemeStrength??1);
   // Manual visemes take priority in demo mode; the live eyes/head still animate.
   for(const name of ['jawOpen','aa','ih','ou','oh','E','PP','FF','TH','CH','DD','RR','SS','sil',
    'mouthClose','mouthPucker','mouthFunnel','mouthStretchLeft','mouthStretchRight',
    'mouthLowerDownLeft','mouthLowerDownRight','mouthPressLeft','mouthPressRight'])next[name]=manual[name]||0;
   if(emotion==='Smile'){next.mouthSmileLeft=manual.mouthSmileLeft;next.mouthSmileRight=manual.mouthSmileRight;}
  }
  if(opts.tongue>.12){ // fallback: the real model has TH viseme, not a dedicated tongue bone.
   next.TH=Math.max(next.TH||0,opts.tongue);
   next.jawOpen=Math.max(next.jawOpen||0,opts.tongue*.32);
  }
  this.applyMorphs(next);
 }
 render(){if(this.renderer&&this.ready)this.renderer.render(this.scene,this.camera);}
 dispose(){this.renderer?.dispose();}
}
