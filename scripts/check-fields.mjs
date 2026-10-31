import { chromium } from 'playwright';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const base=process.env.PORTAL_URL??'http://design.localhost:5184',out='test-results/fields';mkdirSync(out,{recursive:true});
const browser=await chromium.launch({headless:true,...(process.env.CHROME_CHANNEL?{channel:process.env.CHROME_CHANNEL}:{})});
const errors=[],results=[];
try{
  for(const width of[390,1440])for(const theme of['light','dark']){
    const page=await browser.newPage({viewport:{width,height:900},hasTouch:width===390,isMobile:width===390});
    page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    await page.addInitScript(value=>localStorage.setItem('punji-theme',value),theme);await page.goto(`${base}/components/field`);
    const input=page.getByTestId('ds-f-sym');await input.scrollIntoViewIfNeeded();await input.fill('na');
    const popup=page.getByRole('listbox');await popup.waitFor();
    const geometry=await page.evaluate(()=>{
      const inputEl=document.querySelector('[data-testid="ds-f-sym"]'),popupEl=document.querySelector('[role="listbox"]'),priceEl=document.querySelector('[data-testid="ds-f-qty"]');
      const i=inputEl.getBoundingClientRect(),p=popupEl.getBoundingClientRect(),v=priceEl.getBoundingClientRect();
      return {anchorGap:Math.abs(p.top-i.bottom-4),popupLeftGap:Math.abs(p.left-i.left),horizontalOverlap:Math.max(0,Math.min(p.right,v.right)-Math.max(p.left,v.left)),verticalOverlap:Math.max(0,Math.min(p.bottom,v.bottom)-Math.max(p.top,v.top)),pageOverflow:document.documentElement.scrollWidth>innerWidth};
    });
    if(geometry.anchorGap>2||geometry.popupLeftGap>2||geometry.horizontalOverlap>0&&geometry.verticalOverlap>0||geometry.pageOverflow)throw new Error(`Symbol menu layout failed ${width}/${theme}: ${JSON.stringify(geometry)}`);
    await page.screenshot({path:`${out}/symbol-${width}-${theme}.png`});
    if(width===390){const box=await popup.getByRole('option').first().boundingBox();if(!box)throw new Error('Touch suggestion is not visible');await page.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);if(await input.inputValue()!=='NABIL')throw new Error('Touch selection did not commit the symbol');await input.fill('na');}
    const axe=await page.addScriptTag({content:readFileSync('node_modules/axe-core/axe.min.js','utf8')}).then(()=>page.evaluate(async()=>globalThis.axe.run(document.querySelector('[data-testid="ds-f-sym"]').closest('.kit-field'))));
    const violations=axe.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id);results.push({width,theme,geometry,violations});
    await page.keyboard.press('Escape');if(await input.getAttribute('aria-expanded')!=='false'||await page.getByRole('listbox').count())throw new Error('Escape did not close suggestions');
    await input.fill('na');await page.getByRole('listbox').getByRole('option').first().click();if(await input.inputValue()!=='NABIL')throw new Error('Pointer selection did not commit the highlighted symbol');
    await input.fill('n');await page.keyboard.press('ArrowDown');const active=input.getAttribute('aria-activedescendant');if(!await page.locator(`#${await active}`).count())throw new Error('Active descendant does not identify an option');await page.keyboard.press('Enter');if(await input.inputValue()!=='NICA')throw new Error('Keyboard selection did not commit the active symbol');
    await input.fill('n');await page.keyboard.press('Tab');if(await page.getByRole('listbox').count())throw new Error('Blur did not close suggestions');
    await page.close();

    const searchPage=await browser.newPage({viewport:{width,height:900},hasTouch:width===390,isMobile:width===390});
    searchPage.on('pageerror',error=>errors.push(error.message));searchPage.on('console',message=>{if(message.type()==='error')errors.push(message.text());});
    await searchPage.addInitScript(value=>localStorage.setItem('punji-theme',value),theme);await searchPage.goto(`${base}/components/company-search`);
    const picker=searchPage.getByTestId('ds-cs-pick');await picker.scrollIntoViewIfNeeded();
    if(await picker.getAttribute('aria-expanded')!=='false'||await picker.getAttribute('aria-controls'))throw new Error('Closed CompanySearch points at a missing popup');
    if(width===390){const box=await picker.boundingBox();if(!box)throw new Error('Mobile company picker is not visible');await searchPage.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);}
    else await picker.click();
    const search=width===390?searchPage.getByTestId('ds-cs-pick-sheet-input'):picker;
    await search.fill('int');
    const dialog=searchPage.getByRole('dialog');
    const searchRoot=searchPage.locator('.kit-cs-w:has([data-testid="ds-cs-pick"])');
    const searchList=width===390?dialog.getByRole('listbox'):searchRoot.getByRole('listbox');await searchList.waitFor();
    if(await search.getAttribute('aria-expanded')!=='true'||await search.getAttribute('aria-controls')!==await searchList.getAttribute('id'))throw new Error('CompanySearch controls does not identify its open listbox');
    if(width===390&&await dialog.count()!==1)throw new Error('Mobile company picker did not open its sheet');
    const searchAxe=await searchPage.addScriptTag({content:readFileSync('node_modules/axe-core/axe.min.js','utf8')}).then(()=>searchPage.evaluate(async(isMobile)=>globalThis.axe.run(isMobile?document.querySelector('[role="dialog"]'):document.querySelector('.kit-cs-w:has([data-testid="ds-cs-pick"])'),{runOnly:{type:'tag',values:['wcag2a','wcag2aa','wcag21a','wcag21aa','wcag22aa']}}),width===390));
    const searchViolations=searchAxe.violations.filter(v=>['serious','critical'].includes(v.impact)).map(v=>v.id);
    await searchPage.screenshot({path:`${out}/company-search-${width}-${theme}.png`});
    await searchPage.keyboard.press('Escape');if(width===390)await dialog.waitFor({state:'hidden'});
    if(await picker.getAttribute('aria-expanded')!=='false'||await picker.getAttribute('aria-controls'))throw new Error('CompanySearch kept a popup relationship after dismissal');
    const finder=searchPage.getByTestId('ds-cs');await finder.fill('nab');await searchPage.getByTestId('ds-cs-option-NABIL').click();
    if(await finder.getAttribute('aria-expanded')!=='false'||await finder.getAttribute('aria-controls')||await searchPage.locator('.kit-cs-w:has([data-testid="ds-cs"])').getByRole('listbox').count())throw new Error('CompanySearch finder stayed open after choosing a company');
    if(!(await searchPage.getByText('Opened NABIL.').count()))throw new Error('CompanySearch finder did not commit the chosen company');
    if(width===390){const box=await picker.boundingBox();if(!box)throw new Error('Mobile company picker disappeared after Escape');await searchPage.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);}
    else await picker.click();
    const activeSearch=width===390?searchPage.getByTestId('ds-cs-pick-sheet-input'):picker;
    await activeSearch.fill('int');await searchList.waitFor();
    if(width===390){const box=await searchList.getByRole('option').first().boundingBox();if(!box)throw new Error('Touch company suggestion is not visible');await searchPage.touchscreen.tap(box.x+box.width/2,box.y+box.height/2);await dialog.waitFor({state:'hidden'});}
    else await searchList.getByRole('option').first().click();
    if(!(await searchPage.getByTestId('ds-cs-pick-value').innerText()).startsWith('BWA'))throw new Error('CompanySearch did not commit the selected symbol');
    results.push({width,theme,component:'CompanySearch',violations:searchViolations});await searchPage.close();
  }
}finally{await browser.close();writeFileSync(`${out}/results.json`,JSON.stringify({errors,results},null,2));}
if(errors.length||results.some(r=>r.violations.length))throw new Error(`Field browser checks failed: ${out}/results.json`);
console.log(`fields: ${results.length} responsive/accessibility cases passed; anchored SymbolField popup, non-overlap, CompanySearch list references, keyboard and touch selection, and dismissal verified`);
