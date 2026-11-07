import DC from 'node_modules/@remotemerge/nepali-date-converter/ndc.js';
const out = {};
const toUTC = r => Date.UTC(r.year, r.month-1, r.date);
for (let y=1975;y<=2099;y++){ const row=[]; for(let m=1;m<=12;m++){
  const a = toUTC(new DC(`${y}-${m}-1`).toAd());
  let b; if (m===12 && y===2099) { // probe
    let d=32; for(;d>=28;d--){ try{ new DC(`${y}-12-${d}`).toAd(); break;}catch{} } row.push(d); continue; }
  b = toUTC(new DC(m===12?`${y+1}-1-1`:`${y}-${m+1}-1`).toAd());
  row.push((b-a)/864e5);
 } out[y]=row; }
out.anchor = new DC('2000-1-1').toAd();
console.log(JSON.stringify(out));
