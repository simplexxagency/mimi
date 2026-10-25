const PI = Math.PI;
const clamp = (v,a,b) => Math.max(a, Math.min(b,v));
const grad = (ctx,x,y,r,x2,y2,r2,stops) => { const g=ctx.createRadialGradient(x,y,r,x2,y2,r2);stops.forEach(s=>g.addColorStop(s[0],s[1]));return g; };
function curve(ctx,pts){ctx.beginPath();ctx.moveTo(pts[0],pts[1]);for(let i=2;i<pts.length;){const n=pts.length-i;if(n>=6){ctx.bezierCurveTo(...pts.slice(i,i+6));i+=6;}else if(n>=2){ctx.lineTo(pts[i],pts[i+1]);i+=2;}else break;}ctx.closePath();}
function path(ctx,coords,fill,stroke,width=1){curve(ctx,coords);if(fill){ctx.fillStyle=fill;ctx.fill();}if(stroke){ctx.lineWidth=width;ctx.strokeStyle=stroke;ctx.stroke();}}
const smooth=(v,a,b)=>clamp((v-a)/(b-a),0,1);

export function drawScene(ctx, W, H, time, opts={}){
 const transparent=opts.transparent||false;
 ctx.setTransform(1,0,0,1,0,0);ctx.clearRect(0,0,W,H);
 if(!transparent){
  const g=ctx.createLinearGradient(0,0,W,H);g.addColorStop(0,'#0c1722');g.addColorStop(.54,'#0b3134');g.addColorStop(1,'#122532');ctx.fillStyle=g;ctx.fillRect(0,0,W,H);
  ctx.save();ctx.globalAlpha=.35;
  ctx.fillStyle=grad(ctx,800,300,2,800,300,560,[[0,'#317c72'],[1,'#317c7200']]);ctx.fillRect(0,0,W,H);
  ctx.fillStyle=grad(ctx,320,520,0,320,520,420,[[0,'#264c8e'],[1,'#264c8e00']]);ctx.fillRect(0,0,W,H);
  for(let i=0;i<20;i++){ const x=(i*231+53)%W,y=(i*97+71)%H;ctx.fillStyle=i%3===0?'#a0dec018':'#b3c8d00d';ctx.beginPath();ctx.arc(x,y,9+(i%5)*15,0,PI*2);ctx.fill();}ctx.restore();
  ctx.save();ctx.strokeStyle='#ffffff09';ctx.lineWidth=1;for(let i=0;i<24;i++){ctx.beginPath();ctx.moveTo(i*60,0);ctx.lineTo(i*60,H);ctx.stroke();}ctx.restore();
  ctx.fillStyle='#c0f5e09c';ctx.font='600 15px sans-serif';ctx.fillText('MIMI / VIRTUAL HUMAN',40,52);
  ctx.font='11px sans-serif';ctx.fillStyle='#c0f5e05a';ctx.fillText('LOCALLY RENDERED • LIVE',40,72);
  ctx.strokeStyle='#5fe0c242';ctx.lineWidth=1;ctx.strokeRect(30,30,W-60,H-60);
 }
}
function hairStrand(ctx,p,width,color){ctx.beginPath();ctx.moveTo(p[0],p[1]);ctx.bezierCurveTo(...p.slice(2));ctx.lineWidth=width;ctx.strokeStyle=color;ctx.lineCap='round';ctx.stroke();}

export function drawVector(ctx, W,H, data={},settings={},time=0){
 const blinkL=clamp(data.blinkL??.03,0,1),blinkR=clamp(data.blinkR??.03,0,1);
 let jaw=clamp(Math.max(data.jaw??.08,settings.previewOpen??0),0,1), smile=clamp(data.smile??.04,0,1);
 const browUp=clamp(data.brow??.03,0,1);let pucker=clamp(data.pucker??0,0,1);
 const viseme=settings.viseme||'Auto', strength=clamp(settings.visemeStrength??1,0,1);
 const mouthPresets={A:[.72,0],E:[.24,0],I:[.18,0],O:[.42,.75],U:[.24,.95],MBP:[0,.12],FV:[.08,.2],TH:[.38,.12]};
 if(mouthPresets[viseme]){jaw=jaw*(1-strength)+mouthPresets[viseme][0]*strength;
   pucker=pucker*(1-strength)+mouthPresets[viseme][1]*strength;}
 if(viseme==='Smile')smile=Math.max(smile,strength);

 const yaw=clamp(data.yaw??0,-1,1),pitch=clamp(data.pitch??0,-1,1),roll=clamp(data.roll??0,-.3,.3);
 const tracking=settings.tracking??false;
 if(!tracking){const t=time/1000;data={...data};}
 // Shift the avatar up slightly so its shoulders clear the stage footer.
 ctx.save();ctx.translate(W/2+yaw*40,H/2+2+pitch*26);ctx.rotate(roll*.75);ctx.scale(.94,.94);
 // Diffuse environmental shadow.
 ctx.save();ctx.filter='blur(55px)';ctx.fillStyle='#040e1590';ctx.beginPath();ctx.ellipse(0,255,260,140,0,0,PI*2);ctx.fill();ctx.restore();
 // Shoulder armor / blazer
 path(ctx,[-265,340,-258,230,-174,202,-104,180,-83,176,-53,176,0,196,55,178,84,176,108,183,161,197,250,227,259,340,-265,340], '#0f202a','#31545c',3);
 path(ctx,[-230,340,-220,241,-167,214,-124,197,-110,221,-76,250,-60,340,-230,340],'#233d48');
 path(ctx,[230,340,220,241,169,214,125,197,111,222,77,250,61,340,230,340],'#233d48');
 path(ctx,[-112,192,-60,226,-46,268,0,311,46,268,59,225,110,192,0,212,-112,192],'#d1b3a0');
 path(ctx,[-67,186,-58,166,-51,136,-53,118,0,139,53,118,50,142,66,177,67,194,0,220,-67,186],'#b47659','#95563c',2);
 path(ctx,[-119,195,-78,204,-59,225,-35,269,-45,330,-86,291,-119,195],'#142b35','#335760',2);
 path(ctx,[119,195,78,204,59,225,35,269,45,330,86,291,119,195],'#142b35','#335760',2);
 // Use a generic proportional cartoon face.
 ctx.save();ctx.scale(.93,1.065);
 // hair volume behind head
 path(ctx,[-165,-97,-199,-191,-161,-265,-93,-278,-33,-302,107,-292,173,-250,187,-170,208,-86,204,33,181,91,151,101,165,16,141,-141,45,-199,-94,-155,-165,-97], '#151b22','#302821',3);
 // ears
 ctx.fillStyle='#b87558';ctx.strokeStyle='#804f40';ctx.lineWidth=2.5;
 for(let s of [-1,1]){ctx.save();ctx.translate(s*161,10);ctx.scale(s,1);ctx.beginPath();ctx.ellipse(0,8,25,46,-.12,0,PI*2);ctx.fill();ctx.stroke();ctx.strokeStyle='#7d4439';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(8,-21);ctx.bezierCurveTo(-13,-35,-13,1,-3,16);ctx.bezierCurveTo(14,2,19,22,4,40);ctx.stroke();ctx.restore();}
 // jaw and forehead
 const face=ctx.createLinearGradient(-175,-120,170,230);face.addColorStop(0,'#ffcd96');face.addColorStop(.45,'#e8a67c');face.addColorStop(1,'#a9684f');
 path(ctx,[-157,-125,-161,-204,-105,-235,-24,-224,35,-235,124,-208,155,-150,180,-104,174,36,149,113,128,158,83,205,0,222,-83,205,-128,158,-150,114,-177,49,-180,-64,-157,-125],face,'#8c5647',3);
 ctx.fillStyle=grad(ctx,-63,-69,10,-63,-69,175,[[0,'#ffe0ae80'],[1,'#ffe0ae00']]);ctx.beginPath();ctx.ellipse(-55,-40,122,175,0,0,PI*2);ctx.fill();
 ctx.fillStyle='#743f3152';ctx.beginPath();ctx.ellipse(106,57,46,86,-.27,0,PI*2);ctx.fill();
 ctx.strokeStyle='#8b4d3d64';ctx.lineWidth=2.2;
 ctx.beginPath();ctx.moveTo(-127,34);ctx.bezierCurveTo(-118,67,-96,85,-75,89);ctx.moveTo(128,33);ctx.bezierCurveTo(119,67,96,85,75,89);ctx.stroke();
 // Hairline and large swept-back crown. More stylized than photo.
 path(ctx,[-158,-105,-181,-144,-181,-211,-123,-253,-63,-275,23,-273,96,-256,145,-237,171,-206,179,-150,158,-173,127,-192,105,-194,64,-195,35,-174,5,-184,-18,-173,-64,-169,-90,-152,-112,-125,-143,-113,-158,-105], '#1b1d22','#2b2424',3);
 const strands=[
 [-161,-165,-164,-240,-108,-273,-29,-267],[-150,-189,-119,-254,-54,-279,47,-257],
 [-127,-214,-55,-279,64,-273,127,-222],[-76,-236,0,-278,118,-252,167,-187],
 [-16,-244,92,-270,165,-232,178,-167],[-136,-175,-96,-234,-35,-254,59,-243],
 [-116,-143,-54,-199,34,-222,126,-207]
 ];strands.forEach((p,i)=>hairStrand(ctx,p,i%3===0?7:3.5,i%3===0?'#584339':'#392b2a'));
 hairStrand(ctx,[-158,-139,-181,-92,-183,-20,-170,13],9,'#201c22');
 hairStrand(ctx,[157,-155,181,-86,190,-25,168,51],11,'#1d1d24');
 // Brow arches and eyes
 function eye(s,blink){
  ctx.save();ctx.translate(s*82,-38);
  ctx.fillStyle='#ac70555c';ctx.beginPath();ctx.ellipse(0,0,51,37,0,0,PI*2);ctx.fill();
  const open=clamp(1-blink,.045,1);
  ctx.beginPath();ctx.moveTo(-42,2);ctx.bezierCurveTo(-20,-16*open,18,-20*open,42,0);
  ctx.bezierCurveTo(19,17*open,-19,18*open,-42,2);ctx.fillStyle='#f8e4cb';ctx.fill();
  ctx.lineWidth=3;ctx.strokeStyle='#57392f';ctx.stroke();
  if(open>.16){ctx.save();ctx.beginPath();ctx.moveTo(-42,2);ctx.bezierCurveTo(-20,-16*open,18,-20*open,42,0);ctx.bezierCurveTo(19,17*open,-19,18*open,-42,2);ctx.clip();ctx.beginPath();ctx.arc(yaw*8,0,17,0,PI*2);ctx.fillStyle='#594037';ctx.fill();ctx.beginPath();ctx.arc(yaw*8,0,9,0,PI*2);ctx.fillStyle='#191c21';ctx.fill();ctx.fillStyle='#fff9d7';ctx.beginPath();ctx.arc(yaw*8-5,-6,4.5,0,PI*2);ctx.fill();ctx.restore();}
  ctx.lineWidth=4;ctx.strokeStyle='#432928';ctx.beginPath();ctx.moveTo(-44,-2);ctx.quadraticCurveTo(0,-16*open,43,-2);ctx.stroke();
  ctx.restore();
  // strong brow
  ctx.lineCap='round';ctx.strokeStyle='#30282b';ctx.lineWidth=10;
  ctx.beginPath();ctx.moveTo(s*40,-98-browUp*20);ctx.quadraticCurveTo(s*86,-118-browUp*18,s*126,-94-browUp*8);ctx.stroke();
  ctx.strokeStyle='#4a302d';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(s*43,-102-browUp*20);ctx.quadraticCurveTo(s*82,-124-browUp*17,s*126,-99-browUp*8);ctx.stroke();
 }
 eye(-1,blinkL);eye(1,blinkR);
 // Nose
 ctx.fillStyle='#af6752a1';ctx.beginPath();ctx.moveTo(-10,-62);ctx.bezierCurveTo(-3,-24,-19,30,-15,47);ctx.quadraticCurveTo(0,63,20,47);ctx.bezierCurveTo(14,37,12,-25,10,-54);ctx.closePath();ctx.fill();
 ctx.strokeStyle='#985e4c';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(-26,47);ctx.quadraticCurveTo(-7,68,25,47);ctx.stroke();
 ctx.fillStyle='#7b4939';ctx.beginPath();ctx.ellipse(-19,47,11,4,.2,0,PI*2);ctx.ellipse(19,47,10,4,-.2,0,PI*2);ctx.fill();
 // lips dynamically changing
 const open=clamp(jaw,0,1);ctx.fillStyle='#673f3b';
 const mouthY=114+open*3, mouthH=4+open*48;
 const mouthW=49-19*pucker+11*smile;
 ctx.beginPath();ctx.moveTo(-mouthW,mouthY);ctx.bezierCurveTo(-mouthW*.45,mouthY-10-smile*7,mouthW*.45,mouthY-10-smile*7,mouthW,mouthY);
 ctx.bezierCurveTo(mouthW*.57,mouthY+mouthH,-mouthW*.57,mouthY+mouthH,-mouthW,mouthY);ctx.fill();
 if(open>.23){ctx.save();ctx.clip();ctx.fillStyle='#ebe0d3';ctx.fillRect(-36,mouthY-3,72,10+open*3);ctx.fillStyle='#9b4c52';ctx.beginPath();ctx.ellipse(0,mouthY+mouthH-8,24,10,0,0,PI*2);ctx.fill();ctx.restore();}
 ctx.lineWidth=4;ctx.strokeStyle='#985a50';ctx.beginPath();ctx.moveTo(-mouthW-4,mouthY);ctx.quadraticCurveTo(0,mouthY-13-smile*7,mouthW+4,mouthY);ctx.stroke();
 ctx.strokeStyle='#cf8768';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(-37,mouthY+mouthH+5);ctx.quadraticCurveTo(0,mouthY+mouthH+15,37,mouthY+mouthH+5);ctx.stroke();
 ctx.restore(); // facial proportional transform
 // jacket centre zipper & seam
 ctx.strokeStyle='#42616b';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(0,308);ctx.lineTo(0,347);ctx.moveTo(-140,209);ctx.lineTo(-220,319);ctx.moveTo(140,209);ctx.lineTo(220,319);ctx.stroke();
 ctx.restore();
}
export function demoExpression(time){
 const t=time/1000,blink=(Math.sin(t*.73)> .996)?1:0;
 return {blinkL:blink,blinkR:blink,jaw:.08+Math.max(0,Math.sin(t*1.4))*.04,smile:.07,brow:.05,yaw:Math.sin(t*.37)*.18,pitch:Math.sin(t*.46)*.09,roll:Math.sin(t*.4)*.025};
}
