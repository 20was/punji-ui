import { chromium } from 'playwright';
import { readFileSync, mkdirSync, writeFileSync } from 'node:fs';
import { utilityPages } from '../portal/registry.mjs';
const base=process.env.PORTAL_URL ?? 'http://design.localhost:5184';
const out='test-results/portal';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROME_CHANNEL ? {channel:process.env.CHROME_CHANNEL} : {})});
const errors=[],results=[];
try {
  for(const width of [390,1440]) for(const theme of ['light','dark']) {
    const page=await browser.newPage({viewport:{width,height:1000}});
    page.on('pageerror',error=>errors.push(error.message));
    page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    await page.addInitScript(selected=>{localStorage.setItem('punji-theme',selected);},theme);
    for(const entry of utilityPages) {
      await page.goto(base+entry.path);
      await page.getByRole('heading',{name:entry.title,exact:true}).waitFor();
      await page.evaluate(selected=>document.documentElement.setAttribute('data-theme',selected),theme);
      await page.evaluate(()=>window.scrollTo(0,0));
      await page.screenshot({path:`${out}/${entry.view}-${width}-${theme}.png`,fullPage:true});
      await page.addScriptTag({content:readFileSync('node_modules/axe-core/axe.min.js','utf8')});
      const violations=await page.evaluate(async()=> (await globalThis.axe.run(document.querySelector('article'))).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));
      const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
      results.push({page:entry.path,width,theme,violations,overflow});
    }
    await page.close();
  }
  const page=await browser.newPage({viewport:{width:390,height:1000}});
  await page.goto(base+'/utilities/financial-formatters');
  await page.getByLabel('Digits',{exact:true}).selectOption('deva');await page.getByLabel('Language',{exact:true}).selectOption('ne');
  await page.getByTestId('docs-minor-output').filter({hasText:'१२,३४,५६७.८९'}).waitFor();
  if(!(await page.getByTestId('docs-minor-output').textContent()).includes('१२,३४,५६७.८९'))throw new Error('Devanagari output failed');
  await page.getByTestId('docs-minor-input').fill('not money');
  if(!(await page.getByTestId('docs-minor-output').textContent()).includes('Enter an integer'))throw new Error('Invalid money guard failed');
  await page.getByTestId('docs-market-input').fill('-0.004');
  await page.getByTestId('docs-market-output').filter({hasText:'Change: ०.००%'}).waitFor();
  await page.getByTestId('docs-market-input').fill('1.255');
  await page.getByTestId('docs-market-output').filter({hasText:'Change: +१.२६%'}).waitFor();
  await page.getByTestId('docs-market-input').fill('bad');
  await page.getByTestId('docs-market-output').filter({hasText:'Enter a valid decimal'}).waitFor();
  await page.goto(base+'/utilities/decimal-input');await page.getByTestId('docs-decimal-input').fill('1.001');
  if(!(await page.getByTestId('docs-decimal-output').textContent()).includes('precision'))throw new Error('Precision guard failed');
  await page.getByTestId('docs-decimal-input').fill('-');
  if(!(await page.getByTestId('docs-decimal-output').textContent()).includes('partial'))throw new Error('Partial state failed');
  await page.goto(base+'/utilities/calendar-dates');await page.getByTestId('docs-date-start').fill('2023-02-29');
  if(!(await page.getByTestId('docs-date-output').textContent()).includes('Invalid Gregorian'))throw new Error('Invalid date guard failed');
  await page.goto(base+'/utilities/nepal-calendar');await page.getByTestId('docs-bs-input').fill('2021-07-16');
  if(!(await page.getByTestId('docs-bs-output').textContent()).includes('2078/79'))throw new Error('Fiscal demo failed');
  await page.goto(base+'/utilities/react-hooks');
  const table=page.getByRole('region',{name:'Stable sample rows'}).getByRole('table');
  const before=await table.locator('tbody tr').allTextContents();
  await page.getByTestId('docs-live-update').click();await table.locator('tbody tr').first().getByText('220',{exact:true}).waitFor();const after=await table.locator('tbody tr').allTextContents();
  if(before.join()===after.join())throw new Error('Live values did not update');
  if(!after[0].includes('NABIL'))throw new Error('Live positions changed');
  await page.getByTestId('docs-live-sort').click();
  await table.locator('tbody tr').first().getByText('UPPER',{exact:true}).waitFor();
  if(!(await table.locator('tbody tr').first().textContent()).includes('UPPER'))throw new Error('Explicit sort failed');
  await page.close();
} finally { await browser.close(); }
writeFileSync(`${out}/results.json`,JSON.stringify({errors,results},null,2));
if(errors.length||results.some(r=>r.overflow||r.violations.length))throw new Error(`Portal checks failed: see ${out}/results.json`);
console.log(`portal: ${results.length} page/viewport/theme checks passed; money, parsing, date, fiscal and hook interactions passed`);
