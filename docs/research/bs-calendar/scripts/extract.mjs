import fs from 'node:fs'; import vm from 'node:vm';
const P = process.argv[2]; const D = process.argv[3];
const R = p => fs.readFileSync(`${P}/${p}`, 'utf8');
const out = {};
// remotemerge 1.2.5 (from conversions)
out['remotemerge@1.2.5'] = JSON.parse(fs.readFileSync(`${D}/remotemerge.json`,'utf8')); delete out['remotemerge@1.2.5'].anchor;
// bikram-sambat
{ const s=R('bikram-sambat-1.8.1/package/src/index.js'); const arr=JSON.parse(s.match(/ENCODED_MONTH_LENGTHS = (\[[\s\S]*?\])/)[1]); const t={}; arr.forEach((v,i)=>{t[1970+i]=Array.from({length:12},(_,m)=>29+((v>>>(m<<1))&3));}); out['bikram-sambat@1.8.1']=t; }
// subeshb1 nepali-date-converter
{ const s=R('nepali-date-converter-3.4.2/package/dist/lib/date-config.js'); const obj=vm.runInNewContext('('+s.match(/dateConfigMap = (\{[\s\S]*\});/)[1]+')'); const t={}; for(const [y,m] of Object.entries(obj)) t[y]=Object.values(m); out['nepali-date-converter@3.4.2 (subeshb1)']=t; }
// ad-bs-converter
{ const s=R('ad-bs-converter-0.5.0/package/src/converter.js'); const t={}; for(const m of s.matchAll(/'(\d{4})':\s*\[([^\]]*)\]/g)){t[m[1]]=m[2].split(',').map(Number).slice(0,12);} out['ad-bs-converter@0.5.0']=t; }
// nepali-date
{ const s=R('nepali-date-0.1.4/package/cjs/config.js'); const arr=JSON.parse(s.match(/NEPALI_DATE_MAP = (\[\[[\s\S]*?\]\])/)[1]); const t={}; for(const r of arr) t[r[0]]=r.slice(1,13); out['nepali-date@0.1.4']=t; }
// nepali-date-library
{ const s=R('nepali-date-library-1.1.16/package/dist/index.mjs'); const t={}; for(const m of s.matchAll(/\{year:(\d{4}),days:\[([^\]]*)\]/g)) t[m[1]]=m[2].split(',').map(Number); out['nepali-date-library@1.1.16']=t; }
// node nepali-datetime: N array starting at H=2000
{ const s=R('nepali-datetime-2.0.0/package/dist/shared/nepali-datetime.CRHMYMLW.mjs'); const start=Number(s.match(/const H=([0-9e]+)/)[1]); const src=s.match(/N=(\[\[\[[\s\S]*?\],\d+\]\])[;,]/)[1]; const arr=JSON.parse(src); const t={}; arr.forEach((r,i)=>t[start+i]=r[0]); out['nepali-datetime@2.0.0 (npm, opensource-nepal)']=t; }
// sbmdkl
{ const s=R('sbmdkl-nepali-date-converter-2.0.5/package/src/config.ts'); const t={}; for(const m of s.matchAll(/BS\[(\d{4})\]\s*=\s*\[\d{4},([^\]]*)\]/g)) t[m[1]]=m[2].split(',').map(Number).slice(0,12); out['@sbmdkl/nepali-date-converter@2.0.5']=t; }
// remotemerge 1.2.7 via its own module? parse not needed: use ESM import of local tarball (pure code)
// nepali-date-picker via vm
{ const s=R('nepali-date-picker-2.0.2/package/dist/nepaliDatePicker.min.js');
  const upper=s.match(/bsMonthUpperDays:(\[\[[^]*?\]\]),extracted/)[1]; const ext=s.match(/extractedBsMonthData:(\[\[[^]*?\]\]),minBsYear/)[1];
  const fn=s.match(/getBsMonthDays:function\(bsYear,bsMonth\)\{validationFunctions[^;]*?;(for\([\s\S]*?return null)\}/)[1];
  const code=`var calendarData={bsMonthUpperDays:${upper},extractedBsMonthData:${ext},minBsYear:1970}; function g(bsYear,bsMonth){${fn}} var t={}; for(var y=1970;y<=2100;y++){t[y]=[];for(var m=1;m<=12;m++)t[y].push(g(y,m));} t`;
  out['nepali-date-picker@2.0.2 (leapfrog)']=vm.runInNewContext(code,{},{timeout:2000}); }
// python nepali-datetime CSV
{ const t={}; for(const l of fs.readFileSync(`${D}/ndt.csv`,'utf8').trim().split('\n').slice(1)){const a=l.split(',').map(Number); t[a[0]]=a.slice(1);} out['nepali-datetime (PyPI, amitgaru2)']=t; }
fs.writeFileSync(`${D}/all.json`, JSON.stringify(out));
for (const [k,t] of Object.entries(out)){ const ys=Object.keys(t).map(Number); console.log(k, Math.min(...ys), Math.max(...ys)); }
