import fs from 'node:fs';
const a=JSON.parse(fs.readFileSync(process.argv[2],'utf8'));
const OFF={2080:[31,32,31,32,31,30,30,30,29,29,30,30],2081:[31,32,31,32,31,30,30,30,29,30,29,31],2082:[31,31,32,31,31,31,30,29,30,29,30,30],2083:[31,31,32,31,31,31,30,29,30,29,30,null]};
const WEB=['hamropatro.com (web, scraped)','nepalicalendar.rat32.com (web, scraped)'];
const LIBS=Object.keys(a).filter(k=>!WEB.includes(k)&&!k.includes('picker')&&k!=='remotemerge@1.2.7');
const rows=[];
for(let y=1975;y<=2099;y++){
  const votes={}; for(const k of Object.keys(a)) { if(k.includes('picker')||k==='remotemerge@1.2.7') continue; const r=a[k][y]; if(r){const s=r.join(','); (votes[s]??=[]).push(k);} }
  const ranked=Object.entries(votes).sort((x,z)=>z[1].length-x[1].length); const mode=ranked[0][0].split(',').map(Number);
  const webAgree=WEB.filter(w=>a[w][y]&&a[w][y].join(',')===mode.join(',')).length, webHave=WEB.filter(w=>a[w][y]).length;
  let status, months=mode, note='';
  if(OFF[y]){ months=OFF[y].map((v,i)=>v??mode[i]); status = y===2083?'official (Baisakh–Falgun); Chaitra cross-checked':'official'; if(months.join(',')!==mode.join(',')) note='official differs from mode!'; }
  else if(y>=2084) status='projected';
  else if(ranked.length>1 && (webHave===0 || webAgree<webHave || ranked[1][1].length>=2)) status='disputed';
  else if(webHave>=1 && webAgree===webHave) status = webHave>=2?'cross-checked (2 web + libraries)':'cross-checked (1 web + libraries)';
  else status='library-consensus only';
  const rm=a['remotemerge@1.2.5'][y]; const rmDiff=rm.join(',')!==months.join(',');
  rows.push({year:y,months,total:months.reduce((p,c)=>p+c,0),status,remotemergeDiffers:rmDiff,alternatives:ranked.length>1?ranked.map(([s,ks])=>`${s} <- ${ks.length} src`).join(' | '):'',note});
}
fs.writeFileSync(process.argv[3],JSON.stringify(rows,null,0));
const c={}; rows.forEach(r=>c[r.status]=(c[r.status]||[]).concat(r.year)); for(const [k,v] of Object.entries(c)) console.log(k, v.length, v.join(','));
console.log('remotemerge differs from proposed:', rows.filter(r=>r.remotemergeDiffers).map(r=>r.year).join(','));
