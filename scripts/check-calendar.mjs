import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const base=process.env.PORTAL_URL??'http://design.localhost:5184';
const out='test-results/calendar';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROME_CHANNEL?{channel:process.env.CHROME_CHANNEL}:{})});
const errors=[],results=[];
async function settle(page) {
  await page.evaluate(async()=>{await Promise.all(document.getAnimations().filter(animation=>animation.effect?.getTiming().iterations!==Infinity).map(animation=>animation.finished.catch(()=>{})));});
}
async function triggerInside(page,testId) {
  const root=page.getByTestId(testId);
  const valid=await root.evaluate(element=>{
    const input=element.querySelector('input').getBoundingClientRect(),action=element.querySelector('button').getBoundingClientRect();
    return action.top>=input.top+1&&action.bottom<=input.bottom-1&&action.left>=input.left+1&&action.right<=input.right-1;
  });
  if(!valid)throw new Error('Calendar action extends outside the input border');
}
async function anchored(page, panel, testId) {
  const input=await page.getByTestId(`${testId}-input`).boundingBox(), popup=await panel.boundingBox();
  if(!input||!popup)throw new Error('Missing picker geometry');
  const gapBelow=popup.y-(input.y+input.height), gapAbove=input.y-(popup.y+popup.height);
  if(Math.min(Math.abs(gapBelow-6),Math.abs(gapAbove-6))>1)throw new Error(`Picker is detached from input: below=${gapBelow}, above=${gapAbove}`);
}
async function audit(page,label) {
  await page.addScriptTag({content:readFileSync('node_modules/axe-core/axe.min.js','utf8')});
  const violations=await page.evaluate(async()=> (await globalThis.axe.run(document.querySelector('[role="dialog"]')??document.querySelector('article'))).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>({id:v.id,nodes:v.nodes.map(n=>n.target)})));
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth);
  results.push({label,violations,overflow});
}
try {
  for(const width of [390,1440])for(const theme of ['light','dark']) {
    const page=await browser.newPage({viewport:{width,height:width===390?844:900}});
    page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    await page.addInitScript(selected=>localStorage.setItem('punji-theme',selected),theme);
    for(const fixture of ['empty','single','many']) {
      await page.goto(`${base}/components/calendar?selection=${fixture}`);
      const component=page.getByTestId('docs-calendar-multiple');await component.getByRole('grid').waitFor();
      const expected=fixture==='empty'?'0':fixture==='single'?'1':'48';
      if(await page.getByTestId('docs-calendar-count').textContent()!==expected)throw new Error('Calendar fixture count differs');
      await settle(page);await component.screenshot({path:`${out}/calendar-${width}-${theme}-${fixture}.png`});
      await audit(page,`calendar-${width}-${theme}-${fixture}`);
    }
    await page.goto(base+'/components/date-picker');await page.getByRole('heading',{name:'Date picker and ranges',exact:true}).waitFor();
    await page.evaluate(()=>window.scrollTo(0,0));await settle(page);await page.screenshot({path:`${out}/picker-page-${width}-${theme}.png`,fullPage:true});
    await triggerInside(page,'docs-datepicker');
    await page.getByTestId('docs-datepicker-trigger').hover();await triggerInside(page,'docs-datepicker');await settle(page);
    await page.getByTestId('docs-datepicker').screenshot({path:`${out}/field-hover-${width}-${theme}.png`});
    await page.getByTestId('docs-datepicker-input').focus();await page.keyboard.press('Tab');await triggerInside(page,'docs-datepicker');await settle(page);
    await page.getByTestId('docs-datepicker').screenshot({path:`${out}/field-focus-${width}-${theme}.png`});
    await page.getByTestId('docs-datepicker-trigger').click();const dialog=page.getByRole('dialog',{name:'Transaction date'});await dialog.waitFor();await anchored(page,dialog,'docs-datepicker');await triggerInside(page,'docs-datepicker');
    if(!(await dialog.locator('[data-date="2026-10-29"]').evaluate(el=>el===document.activeElement)))throw new Error('Selected date did not receive focus');
    await settle(page);await page.screenshot({path:`${out}/picker-ad-${width}-${theme}.png`});await audit(page,`picker-ad-${width}-${theme}`);
    await dialog.getByRole('button',{name:'BS',exact:true}).click();
    if(await page.getByTestId('docs-datepicker-value').textContent()!=='2026-10-29')throw new Error('Calendar switch changed the stored day');
    await settle(page);await page.screenshot({path:`${out}/picker-bs-${width}-${theme}.png`});await audit(page,`picker-bs-${width}-${theme}`);
    await page.keyboard.press('Escape');await dialog.waitFor({state:'hidden'});
    if(!(await page.getByTestId('docs-datepicker-trigger').evaluate(el=>el===document.activeElement)))throw new Error('Escape did not restore focus');
    await page.getByTestId('docs-daterange-trigger').click();const rangePanel=page.getByRole('dialog',{name:'Report period'});await rangePanel.getByRole('button',{name:'AD',exact:true}).click();await anchored(page,rangePanel,'docs-daterange');await triggerInside(page,'docs-daterange');
    await rangePanel.locator('[data-date="2026-10-05"]').click();await rangePanel.locator('[data-date="2026-10-12"]').click();
    await settle(page);await page.screenshot({path:`${out}/picker-range-${width}-${theme}.png`});await audit(page,`picker-range-${width}-${theme}`);
    await page.keyboard.press('Escape');await rangePanel.waitFor({state:'hidden'});
    await page.getByTestId('docs-appointment-trigger').click();const appointment=page.getByRole('dialog',{name:'Available appointment'});await appointment.waitFor();await settle(page);
    await anchored(page,appointment,'docs-appointment');await triggerInside(page,'docs-appointment');
    await page.screenshot({path:`${out}/picker-appointment-${width}-${theme}.png`});await audit(page,`picker-appointment-${width}-${theme}`);
    await page.keyboard.press('Escape');await appointment.waitFor({state:'hidden'});
    await page.close();
  }
  const page=await browser.newPage({viewport:{width:390,height:844}});
  await page.goto(base+'/components/calendar');const single=page.getByTestId('docs-calendar-single');
  const date=single.locator('[data-date="2026-10-29"]');await date.focus();await page.keyboard.press('ArrowRight');
  await single.locator('[data-date="2026-10-30"]').filter({visible:true}).waitFor();
  await page.waitForFunction(()=>document.activeElement?.getAttribute('data-date')==='2026-10-30');
  await page.keyboard.press('PageDown');await single.getByRole('heading',{name:'November 2026'}).waitFor();
  await single.getByLabel('Year',{exact:true}).fill('2024');await single.getByLabel('Year',{exact:true}).press('Enter');await single.getByRole('heading',{name:'November 2024'}).waitFor();
  const range=page.getByTestId('docs-calendar-range');await range.locator('[data-date="2026-10-10"]').click();await range.locator('[data-date="2026-10-20"]').click();
  await range.getByRole('status').filter({hasText:'unavailable'}).waitFor();
  await range.locator('[data-date="2026-10-12"]').click();
  await page.goto(base+'/components/date-picker');const input=page.getByTestId('docs-datepicker-input');
  await input.fill('2023-02-29');await input.press('Tab');
  if(await input.evaluate(el=>el.checkValidity()))throw new Error('Invalid Gregorian date passed native validation');
  await page.getByTestId('docs-datepicker-trigger').click();let dialog=page.getByRole('dialog');
  await dialog.locator('[data-date="2026-10-20"]').click();await dialog.waitFor({state:'hidden'});
  await page.getByTestId('docs-datepicker-value').filter({hasText:'2026-10-20'}).waitFor();
  if(await page.locator('input[name="transactionDate"]').inputValue()!=='2026-10-20')throw new Error('Form storage is not Gregorian ISO');
  await page.getByTestId('docs-datepicker-trigger').click();dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'BS',exact:true}).click();await page.keyboard.press('Escape');
  await input.fill('२०८१-०१-०१');await input.press('Tab');await page.getByTestId('docs-datepicker-value').filter({hasText:'2024-04-13'}).waitFor();
  await page.getByTestId('docs-daterange-trigger').click();dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'AD',exact:true}).click();
  await dialog.locator('[data-date="2026-10-05"]').click();await dialog.locator('[data-date="2026-10-12"]').click();await dialog.getByRole('button',{name:'Cancel',exact:true}).click();
  if(!(await page.getByTestId('docs-daterange-value').textContent()).includes('2026-10-29'))throw new Error('Cancel committed a range draft');
  await page.getByTestId('docs-daterange-trigger').click();dialog=page.getByRole('dialog');await dialog.locator('[data-date="2026-10-05"]').click();await dialog.locator('[data-date="2026-10-12"]').click();await dialog.getByRole('button',{name:'Apply dates'}).click();
  if(await page.locator('input[name="period.end"]').inputValue()!=='2026-10-12')throw new Error('Range apply failed');
  await page.getByTestId('docs-daterange-trigger').click();dialog=page.getByRole('dialog');await dialog.getByRole('button',{name:'Clear',exact:true}).click();await dialog.getByRole('button',{name:'Apply dates'}).click();
  if(await page.locator('input[name="period.start"]').inputValue()!=='')throw new Error('Range clear did not commit');
  await page.getByTestId('docs-datepicker-trigger').click();dialog=page.getByRole('dialog');
  await dialog.getByRole('button',{name:'Clear',exact:true}).focus();await page.keyboard.press('Tab');await dialog.waitFor({state:'hidden'});
  if(!(await page.getByTestId('ds-copy').first().evaluate(el=>el===document.activeElement)))throw new Error('Tab did not continue to the next document control');
  await page.getByTestId('docs-datepicker-trigger').click();dialog=page.getByRole('dialog');
  await dialog.getByRole('button',{name:'Previous month'}).focus();await page.keyboard.press('Shift+Tab');await dialog.waitFor({state:'hidden'});
  if(!(await page.getByTestId('docs-datepicker-trigger').evaluate(el=>el===document.activeElement)))throw new Error('Shift+Tab did not return to trigger');
  await page.getByTestId('docs-datepicker-trigger').click();dialog=page.getByRole('dialog');
  await page.getByRole('heading',{name:'Date picker and ranges',exact:true}).click();await dialog.waitFor({state:'hidden'});
  await page.getByLabel('Language',{exact:true}).selectOption('ne');await page.getByLabel('Digits',{exact:true}).selectOption('deva');await page.getByTestId('docs-datepicker-trigger').click();dialog=page.getByRole('dialog');
  await dialog.getByRole('button',{name:'वि.सं.',exact:true}).click();
  if(!/[०-९]/.test(await dialog.locator('[data-calendar-focus="true"]').textContent()))throw new Error('Nepali day digits failed');
  if(await dialog.getAttribute('aria-modal')==='true')throw new Error('Date picker must not be modal');
  const bodyOverflow=await page.evaluate(()=>document.documentElement.style.overflow);
  if(bodyOverflow==='hidden')throw new Error('Date picker locked page scrolling');
  await settle(page);await page.screenshot({path:`${out}/picker-nepali-phone.png`});await audit(page,'picker-nepali-phone');await page.keyboard.press('Escape');
  await page.setViewportSize({width:390,height:560});
  await page.goto(base+'/components/date-picker');await page.getByTestId('docs-datepicker-trigger').click();dialog=page.getByRole('dialog');
  await page.waitForFunction(()=>{const rect=document.querySelector('[role="dialog"]')?.getBoundingClientRect();return !!rect&&rect.top>=11&&rect.bottom<=innerHeight-11;});
  const selectedBox=await dialog.locator('[data-calendar-focus="true"]').boundingBox(), shortPanel=await dialog.boundingBox();
  if(!selectedBox||!shortPanel||selectedBox.y<shortPanel.y||selectedBox.y+selectedBox.height>shortPanel.y+shortPanel.height)throw new Error('Focused date is clipped in the short viewport');
  await settle(page);await page.screenshot({path:`${out}/picker-short-phone.png`});await audit(page,'picker-short-phone');await page.keyboard.press('Escape');
  await page.goto(base+'/get-started/roadmap');await page.getByRole('link',{name:'Open Date picker and DateRangePicker examples'}).waitFor();await page.close();
} finally {await browser.close();}
writeFileSync(`${out}/results.json`,JSON.stringify({errors,results},null,2));
if(errors.length||results.some(result=>result.overflow||result.violations.length))throw new Error(`Calendar browser checks failed: see ${out}/results.json`);
console.log(`calendar: ${results.length} layout/a11y cases passed; keyboard, BS input, popover focus, validation, range apply/cancel/clear and roadmap verified`);
