// Mimi photo mouth rig. Drawn in local portrait coordinates, after face mesh.
// No segmentation or external textures; geometry is anchored to detected photo landmarks.
const clamp=(v,min,max)=>Math.max(min,Math.min(max,v));
const smoothstep=(a,b,v)=>{const t=clamp((v-a)/(b-a),0,1);return t*t*(3-2*t);};
const xy=(land,i,w,h)=>({x:land[i].x*w,y:land[i].y*h});
const dist=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);

export function createMouthRig(land,w,h){
 if(!land?.[61]||!land?.[291]||!land?.[13]||!land?.[14])return null;
 const left=xy(land,61,w,h),right=xy(land,291,w,h);
 const upper=xy(land,13,w,h),lower=xy(land,14,w,h);
 const width=dist(left,right);
 if(!Number.isFinite(width)||width<8)return null;
 const center={x:(left.x+right.x)/2,y:(upper.y+lower.y)/2};
 return {center,width,left,right,upper,lower,angle:Math.atan2(right.y-left.y,right.x-left.x)};
}

function mouthPath(ctx,half,upper,lower,cornerLift){
 ctx.beginPath();
 ctx.moveTo(-half,cornerLift);
 ctx.bezierCurveTo(-half*.63,upper,-half*.23,upper*.94,0,upper);
 ctx.bezierCurveTo(half*.23,upper*.94,half*.63,upper,half,cornerLift);
 ctx.bezierCurveTo(half*.71,lower,half*.32,lower,0,lower);
 ctx.bezierCurveTo(-half*.32,lower,-half*.71,lower,-half,cornerLift);
 ctx.closePath();
}

function drawUpperTeeth(ctx,half,upper,lower,open){
 const top=upper+half*.045,bottom=Math.min(lower-half*.13,upper+half*(.15+.035*open));
 if(bottom<=top+1)return;
 const x=half*.78;
 const g=ctx.createLinearGradient(0,top,0,bottom);
 g.addColorStop(0,'#fffaf0');g.addColorStop(1,'#d6c2b7');
 ctx.fillStyle=g;
 ctx.beginPath();ctx.moveTo(-x,top);
 ctx.quadraticCurveTo(0,top-half*.05,x,top);
 ctx.lineTo(x*.95,bottom-half*.02);
 ctx.quadraticCurveTo(0,bottom+half*.045,-x*.95,bottom-half*.02);ctx.closePath();ctx.fill();
 // Fine tooth separations, avoid exaggerated individual white squares.
 ctx.lineWidth=Math.max(.45,half*.007);
 ctx.strokeStyle='#8e7f80a6';
 for(const factor of [-.54,-.26,.03,.30,.57]){
  const px=x*factor;ctx.beginPath();ctx.moveTo(px,top+half*.01);
  ctx.lineTo(px*.93,bottom-half*.015);ctx.stroke();
 }
}

function drawLowerTeeth(ctx,half,lower){
 const x=half*.64,y=lower-half*.08;
 ctx.fillStyle='#ddd3c9';
 ctx.beginPath();ctx.moveTo(-x,y);ctx.quadraticCurveTo(0,y-half*.035,x,y);
 ctx.lineTo(x*.84,y+half*.105);ctx.quadraticCurveTo(0,y+half*.14,-x*.84,y+half*.105);
 ctx.closePath();ctx.fill();
}

function drawTongueInside(ctx,half,lower,amount,open){
 const up=clamp(amount,0,1),rise=half*(.08+open*.1);
 const base=lower-half*(.09+up*.10),h=half*(.20+up*.32);
 const gw=half*(.43+up*.18);
 const gradient=ctx.createLinearGradient(0,base-h,0,base);
 gradient.addColorStop(0,'#d57a8c');gradient.addColorStop(1,'#9d435f');
 ctx.fillStyle=gradient;ctx.beginPath();
 ctx.moveTo(-gw,base);ctx.bezierCurveTo(-gw*.8,base-h*.9,-gw*.45,base-h,0,base-h);
 ctx.bezierCurveTo(gw*.45,base-h,gw*.8,base-h*.9,gw,base);
 ctx.closePath();ctx.fill();
 ctx.strokeStyle='#963c57';ctx.lineWidth=Math.max(1,half*.025);ctx.beginPath();
 ctx.moveTo(0,base-h*.87);ctx.quadraticCurveTo(half*.02,base-h*.48,0,base-h*.22);ctx.stroke();
}

function drawExtendedTongue(ctx,half,lower,t){
 // Explicit shortcut only: MediaPipe Face Landmarker does not detect tongue extension.
 const reach=half*.58*smoothstep(.08,.95,t);
 if(reach<1)return;
 const w=half*(.37+t*.1),tip=lower+reach;
 ctx.fillStyle='#b85b73';ctx.strokeStyle='#7e2e48';ctx.lineWidth=Math.max(1.3,half*.034);
 ctx.beginPath();ctx.moveTo(-w,lower-half*.08);
 ctx.bezierCurveTo(-w*.91,lower+reach*.47,-w*.81,tip,0,tip);
 ctx.bezierCurveTo(w*.81,tip,w*.91,lower+reach*.47,w,lower-half*.08);
 ctx.closePath();ctx.fill();ctx.stroke();
 ctx.strokeStyle='#edacb7a8';ctx.lineWidth=Math.max(.8,half*.023);
 ctx.beginPath();ctx.moveTo(0,tip-half*.07);ctx.lineTo(0,lower+reach*.3);ctx.stroke();
}

/** @param {CanvasRenderingContext2D} ctx already scaled to the portrait pixels */
export function drawMouth(ctx,mouth,pose={},settings={}){
 if(!mouth)return;
 const sensitivity=clamp(settings.sensitivity??1,.5,2);
 const requested=clamp(settings.previewOpen??0,0,1);
 const jaw=clamp((pose.jaw??0)*sensitivity,0,1);
 const open=Math.max(requested,smoothstep(.055,.67,jaw));
 const tongue=clamp(settings.tongue??0,0,1);
 // When closed, leave original photographed lips completely intact.
 if(open<.065 && tongue<.12)return;

 const smile=clamp(pose.smile??0,0,1),pucker=clamp(pose.pucker??0,0,1);
 const half=mouth.width*.5*clamp(1+smile*.11-pucker*.29,.68,1.13);
 const height=half*(.10+open*.91);
 const upper=-half*(.075+.09*open),lower=upper+height;
 const cornerLift=-half*.075*smile;
 const cx=mouth.center.x,cy=mouth.center.y+half*.025;
 ctx.save();ctx.translate(cx,cy);ctx.rotate(mouth.angle);
 // Feather the aperture's edges. This mimics a drawn lip opening rather than a polygon hole.
 const cavity=ctx.createLinearGradient(0,upper,0,lower);
 cavity.addColorStop(0,'#321a24');cavity.addColorStop(.5,'#271019');cavity.addColorStop(1,'#632b40');
 mouthPath(ctx,half,upper,lower,cornerLift);
 ctx.fillStyle=cavity;ctx.fill();
 ctx.save();mouthPath(ctx,half,upper,lower,cornerLift);ctx.clip();
 if(open>.12)drawUpperTeeth(ctx,half,upper,lower,open);
 if(open>.57)drawLowerTeeth(ctx,half,lower);
 if(open>.24)drawTongueInside(ctx,half,lower,tongue,open);
 ctx.restore();
 // Keep lip strokes thin enough to match a painted illustration.
 ctx.strokeStyle='#74414e';ctx.lineWidth=Math.max(.8,half*.045);ctx.lineCap='round';
 ctx.beginPath();ctx.moveTo(-half,cornerLift);
 ctx.bezierCurveTo(-half*.66,upper-half*.035,-half*.24,upper-half*.018,0,upper-half*.026);
 ctx.bezierCurveTo(half*.24,upper-half*.018,half*.66,upper-half*.035,half,cornerLift);ctx.stroke();
 ctx.strokeStyle='#be7978a8';ctx.lineWidth=Math.max(.75,half*.034);
 ctx.beginPath();ctx.moveTo(-half*.89,cornerLift+half*.02);
 ctx.bezierCurveTo(-half*.63,lower+half*.035,half*.63,lower+half*.035,half*.89,cornerLift+half*.02);ctx.stroke();
 if(tongue>.12 && open>.16)drawExtendedTongue(ctx,half,lower,tongue);
 ctx.restore();
}