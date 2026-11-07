import fs from 'node:fs';
const all=JSON.parse(fs.readFileSync(process.argv[2],'utf8')); const names=Object.keys(all);
const lo=+process.argv[3], hi=+process.argv[4]; const skip=(process.argv[5]||'').split(',').filter(Boolean);
for(let y=lo;y<=hi;y++){ const groups={}; for(const n of names){ if(skip.some(s=>n.includes(s))) continue; const r=all[n][y]; if(!r) continue; const k=r.join(',')+' ='+r.reduce((a,b)=>a+b,0); (groups[k]??=[]).push(n.replace(/ \(.*\)/,m=>m.includes('PyPI')?(m.includes('amit')?'[py]':'[py-nepali]'):'')); }
 if(Object.keys(groups).length>1) { console.log(y); for(const [k,v] of Object.entries(groups)) console.log('   ',k,'<-',v.join(', ')); } }
