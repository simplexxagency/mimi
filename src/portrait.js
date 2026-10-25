import { Delaunay } from 'd3-delaunay';
import { createMouthRig, drawMouth } from './mouth.js';

const clamp=(n,min,max)=>Math.min(max,Math.max(min,n));
const MAX_WIDTH=600, MAX_HEIGHT=1050;
const detail=new Set([0,1,2,4,5,6,7,8,9,10,11,12,13,14,15,16,17,18,19,20,33,37,39,40,46,52,53,55,61,63,65,66,70,78,80,81,82,84,87,88,91,95,105,107,108,109,127,133,144,145,146,150,152,153,154,155,157,158,159,160,161,163,168,178,181,185,191,197,234,246,249,251,263,267,269,270,276,282,283,285,291,293,295,296,300,308,310,311,312,314,317,318,321,324,334,336,337,338,356,362,373,374,375,380,381,382,384,385,386,387,388,390,397,402,405,409,415,420,454,466]);
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const point=(land,i,w,h)=>({x:land[i].x*w,y:land[i].y*h});
const weighted=(p,focus,rX,rY)=>Math.exp(-2.1*((p.x-focus.x)**2/(rX*rX)+(p.y-focus.y)**2/(rY*rY)));

// Anchor both eyes to remove camera translation, roll and scale. These transformations
// must NEVER be applied to the portrait as a whole, only to relative expressions.
function alignFace(now,reference,aspect){
 const xy=(l,i)=>({x:l[i].x*aspect,y:l[i].y});
 const baseA=xy(reference,33),baseB=xy(reference,263),liveA=xy(now,33),liveB=xy(now,263);
 const baseMid={x:(baseA.x+baseB.x)/2,y:(baseA.y+baseB.y)/2};
 const liveMid={x:(liveA.x+liveB.x)/2,y:(liveA.y+liveB.y)/2};
 const bv={x:baseB.x-baseA.x,y:baseB.y-baseA.y},lv={x:liveB.x-liveA.x,y:liveB.y-liveA.y};
 const bw=Math.hypot(bv.x,bv.y),lw=Math.hypot(lv.x,lv.y);
 if(bw<.02||lw<.02)return null;
 const scale=clamp(bw/lw,.7,1.45);
 const angle=Math.atan2(bv.y,bv.x)-Math.atan2(lv.y,lv.x);
 const cos=Math.cos(angle),sin=Math.sin(angle);
 return {baseWidth:bw, transform(p){
  const x=p.x*aspect-liveMid.x,y=p.y-liveMid.y;
  return {x:baseMid.x+(x*cos-y*sin)*scale,y:baseMid.y+(x*sin+y*cos)*scale};
 }};
}
function triangleWarp(ctx,image,s1,s2,s3,t1,t2,t3){
 const denominator=(s2.x-s1.x)*(s3.y-s1.y)-(s3.x-s1.x)*(s2.y-s1.y);
 if(Math.abs(denominator)<1e-5)return;
 const a=((t2.x-t1.x)*(s3.y-s1.y)-(t3.x-t1.x)*(s2.y-s1.y))/denominator;
 const b=((t2.y-t1.y)*(s3.y-s1.y)-(t3.y-t1.y)*(s2.y-s1.y))/denominator;
 const c=((s2.x-s1.x)*(t3.x-t1.x)-(s3.x-s1.x)*(t2.x-t1.x))/denominator;
 const d=((s2.x-s1.x)*(t3.y-t1.y)-(s3.x-s1.x)*(t2.y-t1.y))/denominator;
 const e=t1.x-a*s1.x-c*s1.y,f=t1.y-b*s1.x-d*s1.y;
 ctx.save();
 ctx.beginPath();ctx.moveTo(t1.x,t1.y);ctx.lineTo(t2.x,t2.y);ctx.lineTo(t3.x,t3.y);ctx.closePath();ctx.clip();
 ctx.transform(a,b,c,d,e,f);
 ctx.drawImage(image,0,0);
 ctx.restore();
}

export class PortraitRig{
 constructor(){
  this.image=false;this.mesh=null;this.neutral=null;this.aspect=4/3;
  this.selected='auto';this.width=540;this.height=920;
  this.sourceCanvas=document.createElement('canvas');
  this.backdrop=null;this.backdropWidth=0;this.backdropHeight=0;
  this.warned=false;
  this.mouth=null;
 }
 async load(file,crop,detectImage){
  if(!file)throw new Error('Select a PNG or JPG image with a cartoon face.');
  const url=URL.createObjectURL(file);
  const original=new Image();
  try{
   await new Promise((resolve,reject)=>{original.onload=resolve;original.onerror=reject;original.src=url;});
  }finally{URL.revokeObjectURL(url);}
  // Regular portrait stays whole. A three-column collage can be cropped explicitly.
  const aspectRatio=original.width/original.height;
  // A five-angle contact sheet uses narrow vertical panels. Honor the user's chosen view
  // without accidentally including the adjacent faces in the crop.
  const panels=aspectRatio>=1.70?5:aspectRatio>1.2?3:1;
  const slice=panels>1&&crop!=='auto';
  const sw=slice?original.width/panels:original.width;
  const panelIndex=crop==='left'?0:crop==='right'?panels-1:Math.floor(panels/2);
  const sx=slice?panelIndex*sw:0;
  const ratio=Math.min(1,MAX_WIDTH/sw,MAX_HEIGHT/original.height);
  this.width=Math.max(1,Math.round(sw*ratio));
  this.height=Math.max(1,Math.round(original.height*ratio));
  this.sourceCanvas.width=this.width;this.sourceCanvas.height=this.height;
  const ctx=this.sourceCanvas.getContext('2d',{willReadFrequently:true});
  ctx.clearRect(0,0,this.width,this.height);
  ctx.drawImage(original,sx,0,sw,original.height,0,0,this.width,this.height);
  this.selected=crop;this.image=true;this.mesh=null;this.mouth=null;this.neutral=null;
  this.backdrop=null;this.warned=false;
  try{
   const result=await detectImage(this.sourceCanvas);
   const land=result?.faceLandmarks?.[0];
   if(!land)return {width:this.width,height:this.height,tracking:false};
   const indices=[];
   for(let i=0;i<land.length;i++)if(i%3===0||detail.has(i))indices.push(i);
   const src=indices.map(i=>({x:land[i].x*this.width,y:land[i].y*this.height,index:i}));
   const edgeSteps=8;
   for(let t=0;t<=edgeSteps;t++){
    const x=(this.width*t)/edgeSteps,y=(this.height*t)/edgeSteps;
    src.push({x,y:0,index:-1},{x,y:this.height,index:-1});
    if(t>0&&t<edgeSteps)src.push({x:0,y,index:-1},{x:this.width,y,index:-1});
   }
   const triangulation=Delaunay.from(src,p=>p.x,p=>p.y);
   const eyeL=point(land,33,this.width,this.height),eyeR=point(land,263,this.width,this.height);
   const eyeDistance=dist(eyeL,eyeR);
   const mouth=point(land,13,this.width,this.height),mouthBottom=point(land,14,this.width,this.height);
   const mouthCenter={x:(mouth.x+mouthBottom.x)/2,y:(mouth.y+mouthBottom.y)/2};
   this.mouth=createMouthRig(land,this.width,this.height);
   const faceLeft=point(land,234,this.width,this.height),faceRight=point(land,454,this.width,this.height);
   const cheekW=Math.max(eyeDistance,dist(faceLeft,faceRight)*.55);
   const eyeFocus1=point(land,159,this.width,this.height),eyeFocus2=point(land,386,this.width,this.height);
   const features=[{p:eyeFocus1,rx:cheekW*.39,ry:cheekW*.31},
                   {p:eyeFocus2,rx:cheekW*.39,ry:cheekW*.31},
                   // Mouth pixels stay fixed; drawMouth handles the opening in a separate layer.
                   {p:point(land,105,this.width,this.height),rx:cheekW*.37,ry:cheekW*.30},
                   {p:point(land,334,this.width,this.height),rx:cheekW*.37,ry:cheekW*.30}];
   const weights=src.map(p=>{
    if(p.index===-1)return 0;
    const eyesAndBrows=clamp(Math.max(...features.map(f=>weighted(p,f.p,f.rx,f.ry))),0,1);
    const dx=(p.x-mouthCenter.x)/Math.max(9,(this.mouth?.width||50)*.78);
    const dy=(p.y-mouthCenter.y)/Math.max(9,(this.mouth?.width||50)*.49);
    const distance=Math.sqrt(dx*dx+dy*dy);
    const protect=clamp((distance-.75)/.58,0,1);
    return eyesAndBrows*protect*protect*(3-2*protect);
   });
   this.mesh={src,triangles:Array.from(triangulation.triangles),eyeDistance,weights,land};
   return {width:this.width,height:this.height,tracking:true};
  }catch(err){
   console.warn('Mimi: portrait face detection failed, image can still display',err);
   return {width:this.width,height:this.height,tracking:false};
  }
 }
 calibrate(landmarks,aspect=4/3){
  if(!landmarks?.length)return;
  this.neutral=landmarks.map(p=>({x:p.x,y:p.y}));
  this.aspect=aspect;
 }
 prepareBackdrop(W,H){
  if(this.backdrop&&this.backdropWidth===W&&this.backdropHeight===H)return;
  const c=document.createElement('canvas');c.width=W;c.height=H;
  const ctx=c.getContext('2d');
  ctx.fillStyle='#10212d';ctx.fillRect(0,0,W,H);
  const scale=Math.max(W/this.width,H/this.height),w=this.width*scale,h=this.height*scale;
  ctx.save();ctx.filter='blur(46px) brightness(0.40) saturate(0.85)';
  ctx.drawImage(this.sourceCanvas,(W-w)/2,(H-h)/2,w,h);ctx.restore();
  const shade=ctx.createLinearGradient(0,0,0,H);
  shade.addColorStop(0,'#071b28a0');shade.addColorStop(.55,'#06151f24');shade.addColorStop(1,'#040c15ad');
  ctx.fillStyle=shade;ctx.fillRect(0,0,W,H);
  this.backdrop=c;this.backdropWidth=W;this.backdropHeight=H;
 }
 getFrame(W,H){
  const outerPadding=26;
  const scale=Math.min((H-outerPadding*2)/this.height,(W*.63)/this.width);
  const w=this.width*scale,h=this.height*scale;
  return {x:(W-w)/2,y:(H-h)/2,w,h,scale};
 }
 draw(ctx,W,H,pose,sensitivity=1,options={}){
  if(!this.image)return false;
  if(!pose?.transparent){this.prepareBackdrop(W,H);ctx.drawImage(this.backdrop,0,0);}
  const box=this.getFrame(W,H);
  // Static frame: no roll/zoom/yaw/translation from the camera, even when user's head moves.
  ctx.save();
  if(!pose?.transparent){
   ctx.shadowColor='#000c';ctx.shadowBlur=34;ctx.shadowOffsetY=12;
   ctx.fillStyle='#0b1820';ctx.beginPath();ctx.roundRect(box.x-5,box.y-5,box.w+10,box.h+10,14);ctx.fill();
   ctx.shadowBlur=0;ctx.shadowOffsetY=0;
  }
  ctx.beginPath();ctx.roundRect(box.x,box.y,box.w,box.h,10);ctx.clip();
  ctx.translate(box.x,box.y);ctx.scale(box.scale,box.scale);
  const live=pose?.landmarks;
  if(!this.mesh||!live||!this.neutral||live.length!==this.neutral.length){
   ctx.drawImage(this.sourceCanvas,0,0);
   drawMouth(ctx,this.mouth,pose,{sensitivity,previewOpen:options.previewOpen||0,tongue:options.tongue||0});
   ctx.restore();return true;
  }
  const {src,triangles,eyeDistance,weights}=this.mesh;
  const aligned=alignFace(live,this.neutral,this.aspect);
  if(!aligned){
   ctx.drawImage(this.sourceCanvas,0,0);
   drawMouth(ctx,this.mouth,pose,{sensitivity,previewOpen:options.previewOpen||0,tongue:options.tongue||0});
   ctx.restore();return true;
  }
  const amplification=(eyeDistance/aligned.baseWidth)*clamp(sensitivity,.5,2)*.74;
  const dest=src.map((p,k)=>{
   const i=p.index,weight=weights[k];
   if(i<0||weight<.035)return {x:p.x,y:p.y};
   const now=aligned.transform(live[i]);
   const ref={x:this.neutral[i].x*this.aspect,y:this.neutral[i].y};
   let dx=(now.x-ref.x)*amplification*weight,dy=(now.y-ref.y)*amplification*weight;
   // Only local expressions can deform pixels. The image framing is always locked.
   return {x:p.x+clamp(dx,-22,22),y:p.y+clamp(dy,-29,29)};
  });
  // Base layer prevents dark anti-aliased seams between mesh triangles.
  // Undeformed regions are kept as original pixels to reduce GPU load.
  ctx.drawImage(this.sourceCanvas,0,0);
  for(let i=0;i<triangles.length;i+=3){
   const a=triangles[i],b=triangles[i+1],c=triangles[i+2];
   const movement=Math.max(dist(src[a],dest[a]),dist(src[b],dest[b]),dist(src[c],dest[c]));
   if(movement<.25)continue;
   triangleWarp(ctx,this.sourceCanvas,src[a],src[b],src[c],dest[a],dest[b],dest[c]);
  }
  drawMouth(ctx,this.mouth,pose,{sensitivity,previewOpen:options.previewOpen||0,tongue:options.tongue||0});
  ctx.restore();
  return true;
 }
}
