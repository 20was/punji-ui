import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
const base=process.env.PORTAL_URL??'http://design.localhost:5184',out='test-results/select';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROME_CHANNEL?{channel:process.env.CHROME_CHANNEL}:{})});
const errors=[],results=[];
async function audit(page,label){
  await page.addScriptTag({content:readFileSync('node_modules/axe-core/axe.min.js','utf8')});
  const result=await page.evaluate(async()=>({overflow:document.documentElement.scrollWidth>innerWidth,violations:(await globalThis.axe.run(document.querySelector('article'))).violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id)}));
  results.push({label,...result});
}
async function open(select){await select.click();await select.evaluate(element=>new Promise(resolve=>requestAnimationFrame(()=>resolve(element.matches(':open'))))).then(value=>{if(!value)throw new Error('Themed select did not open');});}
try{
  for(const width of [390,1440])for(const theme of ['light','dark']){
    const page=await browser.newPage({viewport:{width,height:900}});
    page.on('pageerror',e=>errors.push(e.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    await page.addInitScript(value=>localStorage.setItem('punji-theme',value),theme);
    for(const count of [0,1,48]){
      await page.goto(`${base}/components/select?items=${count}`);const select=page.getByTestId('select-sector');await select.waitFor();
      if(await select.locator('option').count()!==count)throw new Error('Wrong option fixture count');
      if(count){await open(select);if(await select.evaluate(el=>getComputedStyle(el).appearance)!=='base-select')throw new Error('Expected themed desktop select');}
      await page.screenshot({path:`${out}/options-${width}-${theme}-${count}.png`});await audit(page,`${width}-${theme}-${count}`);
      if(count===48){await page.keyboard.press('End');await page.keyboard.press('Enter');if(await select.inputValue()!=='48')throw new Error('Long list keyboard scroll/selection failed');}
      else if(count)await page.keyboard.press('Escape');
    }
    await page.goto(base+'/components/select');
    const formTitle=page.getByText('Real form · required validation and submitted values',{exact:true});await formTitle.scrollIntoViewIfNeeded();await page.screenshot({path:`${out}/form-${width}-${theme}.png`});
    const grouped=page.getByTestId('select-currency');await open(grouped);await page.screenshot({path:`${out}/groups-${width}-${theme}.png`});await page.keyboard.press('Escape');
    const long=page.getByTestId('select-long');await open(long);await page.screenshot({path:`${out}/long-${width}-${theme}.png`});await audit(page,`${width}-${theme}-long`);await page.keyboard.press('Escape');
    await long.selectOption('long');const display=long.locator('selectedcontent');
    if(await display.textContent()!==await long.locator('option:checked').textContent())throw new Error('Displayed value diverged from native selection');
    if(await display.evaluate(el=>el.getBoundingClientRect().right)>await long.evaluate(el=>el.getBoundingClientRect().right-30))throw new Error('Long selected value overlaps chevron');
    await long.locator('..').locator('..').screenshot({path:`${out}/long-selected-${width}-${theme}.png`});
    const native=page.getByTestId('select-native');if(await native.evaluate(el=>getComputedStyle(el).appearance)==='base-select')throw new Error('Explicit native fallback failed');
    await page.close();
  }
  const page=await browser.newPage({viewport:{width:1440,height:900}});await page.goto(base+'/components/select');
  const formTitle=page.locator('.ds-demo:has([data-testid="select-required"])>.ds-demo-t');
  if(await formTitle.locator('span').first().evaluate(el=>el.getBoundingClientRect().left-el.parentElement.parentElement.getBoundingClientRect().left)<3)throw new Error('Ground demo heading is clipped at its rounded edge');
  const submit=page.getByRole('button',{name:'Check selection'});
  if(await submit.evaluate(el=>el.getBoundingClientRect().top-el.parentElement.querySelector('.kit-sel-f').getBoundingClientRect().bottom)<8)throw new Error('Form action is crowded against its field');
  const select=page.getByTestId('select-sector');await select.focus();await page.keyboard.press('Space');await page.keyboard.press('ArrowDown');await page.keyboard.press('Enter');
  if(await select.inputValue()!=='banks')throw new Error('Keyboard selection failed');
  await open(select);await page.keyboard.press('End');await page.keyboard.press('Enter');if(await select.inputValue()!=='insurance')throw new Error('Disabled option was not skipped');
  await open(select);await page.keyboard.press('Home');await page.keyboard.press('Escape');if(await select.inputValue()!=='insurance')throw new Error('Escape unexpectedly committed a new value');
  await open(select);await select.getByRole('option',{name:'Hydropower',exact:true}).click();if(await select.inputValue()!=='hydro')throw new Error('Pointer selection failed');
  await open(select);await page.keyboard.press('d');await page.keyboard.press('Enter');if(await select.inputValue()!=='development')throw new Error('Native typeahead failed');
  await open(select);await page.keyboard.press('Tab');if(await select.evaluate(el=>el.matches(':open')))throw new Error('Tab did not dismiss the picker');
  await open(select);await page.getByRole('heading',{name:'Select',exact:true}).click();if(await select.evaluate(el=>el.matches(':open')))throw new Error('Outside click did not dismiss');
  await page.getByRole('button',{name:'Check selection'}).click();if(await page.getByTestId('select-submitted').textContent()!=='Nothing submitted')throw new Error('Required validation did not block submission');
  await page.getByTestId('select-required').selectOption('joint');await page.getByRole('button',{name:'Check selection'}).click();if(await page.getByTestId('select-submitted').textContent()!=='joint')throw new Error('Native form value failed');
  await page.goto(base+'/components/date-picker');await page.getByTestId('docs-datepicker-trigger').click();const calendar=page.getByRole('dialog'),month=calendar.getByLabel('Month',{exact:true});
  await open(month);await page.keyboard.press('Escape');if(await page.getByRole('dialog').count()!==1)throw new Error('Escape closed both nested picker and calendar');
  if(await month.evaluate(el=>el.matches(':open')))throw new Error('Escape did not dismiss nested picker');await page.keyboard.press('Escape');await calendar.waitFor({state:'hidden'});
  await page.close();
  for(const theme of ['light','dark']){
    const touch=await browser.newPage({viewport:{width:390,height:844},hasTouch:true,isMobile:true});await touch.addInitScript(value=>localStorage.setItem('punji-theme',value),theme);await touch.goto(base+'/components/select');
    if(await touch.getByTestId('select-sector').evaluate(el=>getComputedStyle(el).appearance)==='base-select')throw new Error('Touch should retain platform picker');
    await touch.screenshot({path:`${out}/touch-${theme}.png`});await audit(touch,`touch-${theme}`);await touch.close();
  }
}finally{await browser.close();writeFileSync(`${out}/results.json`,JSON.stringify({errors,results},null,2));}
if(errors.length||results.some(r=>r.overflow||r.violations.length))throw new Error(`Select checks failed: ${out}/results.json`);
console.log(`select: ${results.length} responsive/a11y cases passed; keyboard, disabled options, groups, native forms and touch fallback verified`);
