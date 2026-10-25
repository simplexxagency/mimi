import {readFileSync,writeFileSync,mkdirSync,existsSync} from 'node:fs';
import {dirname,resolve} from 'node:path';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
const root=resolve(import.meta.dirname,'..');
const manifest=JSON.parse(readFileSync(resolve(root,'asset-manifest.json'),'utf8'));
for(const asset of manifest.assets){
 const target=resolve(root,asset.path);
 if(existsSync(target)){
  const current=readFileSync(target);
  if(current.length===asset.size&&createHash('sha256').update(current).digest('hex')===asset.sha256)continue;
 }
 const data=gunzipSync(Buffer.concat(asset.parts.map(p=>readFileSync(resolve(root,p)))));
 if(data.length!==asset.size||createHash('sha256').update(data).digest('hex')!==asset.sha256)throw Error('Asset checksum mismatch: '+asset.path);
 mkdirSync(dirname(target),{recursive:true});writeFileSync(target,data);
 console.log('Restored '+asset.path+' ('+data.length+' bytes)');
}
