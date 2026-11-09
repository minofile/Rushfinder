import fs from 'node:fs';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const folder=path.join(root,'motion-studio-web');
const html=fs.readFileSync(path.join(folder,'index.html'),'utf8');
if(!html.includes('id="root"') || !html.includes('/motion-studio-web/assets/')){
 console.error('FAILED: production Remotion Player was not built (placeholder still present).');
 process.exit(1);
}
const assets=fs.readdirSync(path.join(folder,'assets'));
const js=assets.filter(a=>a.endsWith('.js'));
const css=assets.filter(a=>a.endsWith('.css'));
if(!js.length||!css.length){
 console.error('FAILED: missing compiled Remotion JS/CSS assets.');
 process.exit(1);
}
for(const url of html.matchAll(/(?:src|href)="(\/motion-studio-web\/assets\/[^"]+)"/g)){
 const file=path.join(root,url[1].slice(1));
 if(!fs.existsSync(file))throw new Error('Missing asset: '+file);
}
console.log('PASS: built Remotion Player:',js.length,'JS,',css.length,'CSS files.');
