import { useState } from 'react';
import { Button } from '@punji/ui';
import { Select, type ControlSize, type SelectOption } from '@punji/package-select';
import { Page, Section, Demo, RefTable } from '@punji/portal-parts';
// oxlint-disable-next-line import/no-unassigned-import -- Local published token distribution.
import '@punji/package-tokens.css';
// oxlint-disable-next-line import/no-unassigned-import -- Real Select component stylesheet.
import '@punji/package-select.css';
// oxlint-disable-next-line import/no-unassigned-import -- Portal example spacing and clipping fixes.
import './select-page.css';
const SECTORS:SelectOption[]=[{value:'all',label:'All sectors'},{value:'banks',label:'Commercial banks'},{value:'development',label:'Development banks'},{value:'finance',label:'Finance'},{value:'hydro',label:'Hydropower'},{value:'insurance',label:'Life insurance'},{value:'mutual',label:'Mutual funds',disabled:true}];
const GROUPS:SelectOption[]=[{value:'npr',label:'NPR · Nepalese rupee',group:'South Asia'},{value:'inr',label:'INR · Indian rupee',group:'South Asia'},{value:'usd',label:'USD · US dollar',group:'International'},{value:'aud',label:'AUD · Australian dollar',group:'International'},{value:'eur',label:'EUR · Euro',group:'International'}];
const MANY:SelectOption[]=Array.from({length:48},(_,index)=>({value:String(index+1),label:`${String(index+1).padStart(2,'0')} · Example broker ${index+1}`}));
export function SelectComponentPage(){
  const count=new URLSearchParams(location.search).get('items');
  const [sector,setSector]=useState(count==='0'?'':count==='48'?'24':'all'),[currency,setCurrency]=useState('npr'),[size,setSize]=useState<ControlSize>('md'),[broker,setBroker]=useState('24');
  const [locale,setLocale]=useState('ne'),[long,setLong]=useState('short'),[account,setAccount]=useState(''),[submitted,setSubmitted]=useState('');
  const options=count==='0'?[]:count==='1'?[SECTORS[0]!]:count==='48'?MANY:SECTORS;
  return <Page path="/components/select" lead="A Punji-styled menu where the browser supports customizable selects. One real select retains keyboard navigation, option groups, validation and form submission. Phones and unsupported browsers keep their platform picker.">
    <Section id="examples" title="Working examples">
      <Demo ground layout="col" title="Market sector · selected, focused and unavailable options" code={"import { Select } from '@punji/ui/select';\n<Select label=\"Sector\" labelPlacement=\"above\"\n  value={sector} onChange={setSector} options={sectors} />"}>
        <div style={{width:240,maxWidth:'100%'}}><Select block label="Sector" labelPlacement="above" value={sector} onChange={setSector} options={options} disabled={!options.length} testId="select-sector"/></div>
        <p>Selected sector: <output data-testid="select-value">{sector||'None'}</output>. {count==='0'?'No options available; the control is disabled.':count==='48'?'48 synthetic options for scrolling checks.':'Mutual funds is unavailable in this example.'}</p>
      </Demo>
      <Demo ground layout="row" title="Sizes · the existing 32, 36 and 44px control scale">
        {(['sm','md','lg'] as const).map(value=><Select key={value} label={`Control ${value}`} labelPlacement="above" size={value} value={size} onChange={setSize} options={[{value:'sm',label:'Small · 32px'},{value:'md',label:'Medium · 36px'},{value:'lg',label:'Large · 44px'}]}/>)}
      </Demo>
      <Demo ground layout="row" title="Grouped options and Nepali labels">
        <Select label="Currency" labelPlacement="above" value={currency} onChange={setCurrency} options={GROUPS} testId="select-currency"/>
        <Select label="भाषा" labelPlacement="above" lang="ne" value={locale} onChange={setLocale} options={[{value:'ne',label:'नेपाली'},{value:'en',label:'English'}]} testId="select-nepali"/>
      </Demo>
      <Demo ground layout="col" title="Long lists and long labels · bounded scrolling and wrapping">
        <Select label="Broker" labelPlacement="above" value={broker} onChange={setBroker} options={MANY} testId="select-many"/>
        <div style={{width:320,maxWidth:'100%'}}><Select block label="Reporting scope" labelPlacement="above" value={long} onChange={setLong} options={[{value:'short',label:'This portfolio'},{value:'long',label:'All investment accounts, including archived holdings and transactions from previous financial years'}]} testId="select-long"/></div>
      </Demo>
      <Demo ground layout="row" title="Disabled, loading, empty and explicit native fallback">
        <Select label="Disabled" labelPlacement="above" value="all" onChange={()=>{}} options={SECTORS} disabled/>
        <Select label="Loading" labelPlacement="above" value="all" onChange={()=>{}} options={SECTORS} loading/>
        <Select label="No accounts" labelPlacement="above" value="" onChange={()=>{}} options={[{value:'',label:'No accounts available',disabled:true}]} disabled/>
        <Select label="Platform picker" labelPlacement="above" value={currency} onChange={setCurrency} options={GROUPS} native testId="select-native"/>
      </Demo>
      <Demo ground layout="col" title="Real form · required validation and submitted values">
        <form className="select-example-form" onSubmit={event=>{event.preventDefault();setSubmitted(String(new FormData(event.currentTarget).get('account')));}}>
          <Select label="Account" labelPlacement="above" name="account" required value={account} onChange={setAccount} options={[{value:'',label:'Choose an account'},{value:'personal',label:'Personal investment account'},{value:'joint',label:'Joint investment account'}]} testId="select-required"/>
          <Button type="submit" variant="secondary">Check selection</Button>
        </form>
        <p>Submitted: <output data-testid="select-submitted">{submitted||'Nothing submitted'}</output></p>
      </Demo>
    </Section>
    <Section id="api" title="API reference"><RefTable label="Select API" head={['Prop','Contract']} rows={[
      ['value / onChange / options','Existing controlled string API. Options keep their value, label, disabled flag and consecutive group name.'],
      ['label / labelPlacement / id','Existing hidden, above and inline labels. An external label can name an explicitly identified select.'],
      ['size / block / bare','Existing sizes and layout. Bare retains its parent field surface.'],
      ['native','Optional escape hatch: keep the platform picker on every device.'],
      ['name / form / required / events','Passed to the real select; no hidden proxy or replacement event target. Loading disables interaction; disabled fields do not submit.'],
    ].map(([prop,contract])=>[<code className="ds-type" key={prop}>{prop}</code>,contract])}/></Section>
    <Section id="contracts" title="Behaviour and compatibility"><p>On supporting desktop browsers, the options menu uses Punji surfaces, typography, selected checkmarks, focus treatment and grouped labels. The browser provides its top layer, keyboard selection, typeahead, dismissal and scroll handling.</p><p>This is progressive enhancement using appearance: base-select. Touch devices, unsupported browsers, native=true and native listbox modes retain their platform behaviour. No new packages, JavaScript menu engine or duplicated form controls.</p><p>Selection follows browser keyboard conventions. Empty required values block form submission. Keep option labels plain text; use a searchable company picker when a long list needs search.</p></Section>
  </Page>;
}
