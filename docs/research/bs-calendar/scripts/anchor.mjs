import fs from 'node:fs'; import DC from 'node_modules/@remotemerge/nepali-date-converter/ndc.js';
const first={}; for (const f of fs.readdirSync('web/hp')) { const d=JSON.parse(fs.readFileSync('web/hp/'+f,'utf8')); for (const [k,v] of Object.entries(d)) if (v.first) first[k]=v.first; }
let ok=0,bad=[]; for (const [k,ad] of Object.entries(first)) { const [y,m]=k.split('-').map(Number); if (y<1975||y>2099) continue; const r=new DC(`${y}-${m}-1`).toAd(); if (r.year===ad[0]&&r.month===ad[1]&&r.date===ad[2]) ok++; else bad.push(`${k}: HP ${ad.join('-')} RM ${r.year}-${r.month}-${r.date}`); }
console.log('match',ok,'mismatch',bad.length); console.log(bad.filter(b=>+b.slice(0,4)<=2084).join('\n'));
console.log('first mismatch year', bad.map(b=>b.slice(0,4)).sort()[0]);
