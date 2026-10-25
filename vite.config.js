import { defineConfig } from 'vite';
import { readFileSync, writeFileSync, mkdirSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { homedir } from 'node:os';

// Localhost-only IPC for the independently running OBS capture window.
// Avoids BroadcastChannel profile isolation and keeps the controller disposable/minimizable.
const bridge={
  settings:{mode:'vector',sensitivity:1.15,smooth:.28,previewOpen:0,
    viseme:'Auto',visemeStrength:1,tongueValue:0,transparent:false,baseAvatar:'nova',cartoonFace:false,photoCrop:'auto'},
  command:{sequence:0,action:'start',deviceId:''},
  portrait:{version:0,mime:'',bytes:null},
  telemetry:{camera:false,trackingCount:0,renderCount:0,at:0,values:null,live:false,error:''}
};
function mimiIpc(){
  return {name:'mimi-local-obs-bridge',
    configureServer(server){install(server.middlewares);},
    configurePreviewServer(server){install(server.middlewares);}};
}
// Persist the last selected portrait LOCALLY so Vite restarting does not lose Meet's image.
const portraitDir=join(homedir(),'AppData','Local','Mimi','portrait-cache');
const portraitPath=join(portraitDir,'last-image.bin');
const portraitMeta=join(portraitDir,'last-image.json');
try{
 const meta=JSON.parse(readFileSync(portraitMeta,'utf8'));
 const bytes=readFileSync(portraitPath);
 if(bytes.length<=20*1024*1024&&/^image\/(png|jpeg|webp)$/.test(meta.mime)){
  bridge.portrait={version:Number(meta.version)||1,mime:meta.mime,bytes};
 }
}catch{}
function install(middlewares){
  middlewares.use('/__mimi_portrait',(req,res)=>{
    if(req.headers.origin&&req.headers.origin!=='http://127.0.0.1:5173'){
      res.writeHead(403).end('Forbidden');return;
    }
    res.setHeader('Cache-Control','no-store');
    if(req.method==='GET'){
      if(!bridge.portrait.bytes){res.writeHead(404).end('No portrait uploaded');return;}
      res.setHeader('Content-Type',bridge.portrait.mime);
      res.setHeader('X-Mimi-Portrait-Version',String(bridge.portrait.version));
      res.end(bridge.portrait.bytes);return;
    }
    if(req.method==='DELETE'){
      bridge.portrait={version:0,mime:'',bytes:null};
      for(const filename of [portraitPath,portraitMeta])try{rmSync(filename,{force:true});}catch{}
      res.setHeader('Content-Type','application/json');res.end(JSON.stringify({ok:true}));return;
    }
    if(req.method!=='POST'){res.writeHead(405).end('Method not allowed');return;}
    const mime=(req.headers['content-type']||'').split(';')[0].trim().toLowerCase();
    if(!['image/jpeg','image/png','image/webp'].includes(mime)){
      res.writeHead(415).end('Only JPEG, PNG or WebP portraits supported');return;
    }
    const max=20*1024*1024, chunks=[];let size=0,oversized=false;
    req.on('data',part=>{
      size+=part.length;
      if(size>max){oversized=true;return;}
      chunks.push(part);
    });
    req.on('end',()=>{
      if(oversized||size===0){res.writeHead(413).end('Portrait too large (20 MB max)');return;}
      const bytes=Buffer.concat(chunks);
      const valid=mime==='image/png'
        ?bytes.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))
        :mime==='image/jpeg'?bytes[0]===255&&bytes[1]===216&&bytes[2]===255
        :bytes.toString('ascii',0,4)==='RIFF'&&bytes.toString('ascii',8,12)==='WEBP';
      if(!valid){res.writeHead(415).end('Invalid image content');return;}
      const version=bridge.portrait.version+1;
      bridge.portrait={version,mime,bytes};
      try{
        mkdirSync(portraitDir,{recursive:true});
        writeFileSync(portraitPath,bytes,{mode:0o600});
        writeFileSync(portraitMeta,JSON.stringify({version,mime}),{mode:0o600});
      }catch(err){console.warn('Mimi: portrait remains in memory; cannot save cache:',err.message);}
      res.setHeader('Content-Type','application/json; charset=utf-8');
      res.end(JSON.stringify({ok:true,version,size}));
    });
  });
  middlewares.use('/__mimi_bridge',(req,res,next)=>{
    const origin=req.headers.origin;
    // Only applications served by this localhost Vite instance may update the bridge.
    if(origin&&origin!=='http://127.0.0.1:5173')return res.writeHead(403).end('Forbidden');
    const u=new URL(req.url||'/', 'http://127.0.0.1');
    res.setHeader('Cache-Control','no-store');
    res.setHeader('Content-Type','application/json; charset=utf-8');
    if(req.method==='GET'){
      const view=u.searchParams.get('view');
      return res.end(JSON.stringify(view==='engine'
        ?{settings:bridge.settings,command:bridge.command,portrait:{version:bridge.portrait.version,mime:bridge.portrait.mime}}
        :view==='controller'?{telemetry:bridge.telemetry}:{error:'invalid view'}));
    }
    if(req.method!=='POST')return res.writeHead(405).end(JSON.stringify({error:'Method not allowed'}));
    let content='';req.on('data',part=>{content+=part;if(content.length>32000)req.destroy();});
    req.on('end',()=>{
      try{
        const m=JSON.parse(content);
        if(m.type==='settings'&&m.settings&&typeof m.settings==='object'){
          const safe={};for(const k of Object.keys(bridge.settings))if(Object.hasOwn(m.settings,k))safe[k]=m.settings[k];
          Object.assign(bridge.settings,safe);
        }else if(m.type==='camera'&&['start','stop','calibrate'].includes(m.action)){
          bridge.command={sequence:bridge.command.sequence+1,action:m.action,deviceId:String(m.deviceId||'')};
        }else if(m.type==='telemetry'){
          const t=m.telemetry||{};bridge.telemetry={
            camera:!!t.camera,trackingCount:Number(t.trackingCount)||0,
            cameraFrameCount:Number(t.cameraFrameCount)||0,videoTime:Number(t.videoTime)||0,
            videoReadyState:Number(t.videoReadyState)||0,streamTrackState:String(t.streamTrackState||''),
            renderCount:Number(t.renderCount)||0,at:Date.now(),
            values:t.values||null,live:!!t.live,error:String(t.error||'').slice(0,200)
          };
        }else return res.writeHead(400).end(JSON.stringify({error:'Bad type'}));
        res.end(JSON.stringify({ok:true}));
      }catch(e){res.writeHead(400).end(JSON.stringify({error:'Malformed body'}));}
    });
  });
}
export default defineConfig({
  plugins:[mimiIpc()],
  server:{host:'127.0.0.1',port:5173,strictPort:true,
    watch:{ignored:['**/.chrome-test/**','**/.git/**','**/preview*.png','**/obs-profile/**','**/runtime/**','**/archive/**','**/quality_checks/**']}}
});