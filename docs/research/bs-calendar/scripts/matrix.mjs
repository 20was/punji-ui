import fs from 'node:fs';
const all=JSON.parse(fs.readFileSync(process.argv[2],'utf8')); const names=Object.keys(all);
const lo=+process.argv[3], hi=+process.argv[4];
names.forEach((a,i)=>{ const row=names.map(b=>{let d=0,n=0; for(let y=lo;y<=hi;y++) if(all[a][y]&&all[b][y]) {n++; for(let m=0;m<12;m++) if(all[a][y][m]!==all[b][y][m]) d++;} return n?d:'-';}); console.log(String(i).padStart(2), row.map(x=>String(x).padStart(4)).join(''), a); });
