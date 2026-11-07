import fs from 'node:fs';
const D=process.argv[2]; const all=JSON.parse(fs.readFileSync(`${D}/all.json`,'utf8'));
const s=fs.readFileSync(`${D}/pynepali.py`,'utf8'); const t={}; let y=2000;
for (const m of s.matchAll(/\(\s*\(([\d,\s]+)\),\s*\d+,?\s*\)/g)) { const a=m[1].split(',').map(x=>x.trim()).filter(Boolean).map(Number); if(a.length===12) t[y++]=a; }
all['nepali (PyPI py-nepali, opensource-nepal)']=t; console.log(2000, y-1);
// remotemerge 1.2.7
const rm = await import(process.argv[3]); const DC=rm.default; const toUTC=r=>Date.UTC(r.year,r.month-1,r.date); const t2={};
for(let yy=1975;yy<=2099;yy++){const row=[];for(let mm=1;mm<=12;mm++){ let d=33; for(;d>=28;d--){try{new DC(`${yy}-${mm}-${d}`).toAd();break;}catch{}} row.push(d);} t2[yy]=row;}
all['remotemerge@1.2.7']=t2;
fs.writeFileSync(`${D}/all.json`, JSON.stringify(all));
