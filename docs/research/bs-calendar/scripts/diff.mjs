import fs from 'node:fs';
const all=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const names=Object.keys(all); const short=n=>n.split(' ')[0];
// sanity
for(const n of names) for(const [y,r] of Object.entries(all[n])){ const s=r.reduce((a,b)=>a+b,0); if(r.length!==12||s<364||s>367||r.some(v=>v<29||v>32)) console.log('BAD',n,y,r.join(','),s); }
const lines=[]; const perYear={};
for(let y=1970;y<=2100;y++){ for(let m=0;m<12;m++){ const vals={}; for(const n of names){const r=all[n][y]; if(r) (vals[r[m]]??=[]).push(short(n));} if(Object.keys(vals).length>1){ lines.push(`${y}-${String(m+1).padStart(2,'0')}: `+Object.entries(vals).map(([v,ns])=>`${v}=[${ns.join(', ')}]`).join(' | ')); perYear[y]=(perYear[y]||0)+1; } } }
console.log(lines.join('\n')); console.log('years with disagreement:', Object.keys(perYear).join(','));
// coverage
for(let y=1970;y<=2100;y++){ const c=names.filter(n=>all[n][y]).length; if (y%10===0||y>2085) process.stdout.write(`${y}:${c} `);} console.log();
