import { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { AppShell, FinancialSummary, FinancialTable, PriceChart, OrderBook, PageHeader, Button, Select, formatNPR, formatPercent, formatNepalNumber, gregorianToBS, formatBSDate, nepalFiscalYear, type FinancialColumn } from '@punji/ui';
// oxlint-disable-next-line import/no-unassigned-import -- CSS distribution is a public API.
import '@punji/ui/styles.css';
// oxlint-disable-next-line import/no-unassigned-import -- Example layout.
import './style.css';

type RecordRow = { id: string; name: string; amount: number | null; change: number; status: string };
const workflows = ['Portfolio', 'Invoices', 'Watchlist'];
const query = new URLSearchParams(location.search);
function App() {
  const [workflow, setWorkflow] = useState(query.get('workflow') ?? 'Portfolio');
  const [count, setCount] = useState(query.get('count') ?? '8');
  const [theme, setTheme] = useState(query.get('theme') ?? 'light');
  const [language, setLanguage] = useState<'en'|'ne'>('en');
  const [state, setState] = useState<'ready'|'loading'|'error'>('ready');
  const [filter, setFilter] = useState('');
  const [direction, setDirection] = useState<'asc'|'desc'>('asc');
  const [pageIndex, setPageIndex] = useState(0);
  const money = (value: number | null) => formatNPR(value, {language});
  const bs = gregorianToBS({year:2024,month:4,day:13});
  const rows: RecordRow[] = Array.from({length:Number(count)},(_,i)=>({id:String(i),name: workflow === 'Invoices' ? `Invoice DEMO-${String(i+1).padStart(3,'0')}` : workflow === 'Expenses' ? ['Office rent','Software','Travel'][i%3]! : ['NABIL','NICA','UPPER','Sample unpriced holding'][i%4]!,amount:workflow!=='Invoices'&&i%4===3?null:52500+i*1375,change:i%3===0?-2.43:1.27,status:workflow==='Invoices' ? (i%2?'Paid':'Due') : 'Illustrative'}));
  const visible = rows.filter(row=>row.name.toLowerCase().includes(filter.toLowerCase())).toSorted((a,b)=>direction==='asc'?a.name.localeCompare(b.name):b.name.localeCompare(a.name));
  const pageSize = 5;
  const pageRows = visible.slice(pageIndex * pageSize, (pageIndex + 1) * pageSize);
  const columns: FinancialColumn<RecordRow>[] = [
    {key:'name',label:workflow==='Invoices'?'Invoice':'Record',rowHeader:true,sortable:true,render:r=>r.name},
    {key:'amount',label:'Amount (NPR)',num:true,render:r=>money(r.amount)},
    {key:'change',label:workflow==='Invoices'?'Status':'Change',num:true,render:r=>workflow==='Invoices'?r.status:formatPercent(r.change)},
  ];
  return <div data-theme={theme}><AppShell brand={<strong>Punji UI / Finance</strong>} navigationLabel="Workflows" navigation={workflows.map(name=><a key={name} href={`#${name.toLowerCase()}`} aria-current={workflow===name?'page':undefined} onClick={event=>{event.preventDefault();setWorkflow(name);setFilter('');setPageIndex(0);}}>{name}</a>)} actions={<>
    <Select label="Theme" value={theme} onChange={setTheme} options={[{value:'light',label:'Light'},{value:'dark',label:'Dark'}]}/>
    <Select label="Number language" value={language} onChange={setLanguage} options={[{value:'en',label:'English figures'},{value:'ne',label:'नेपाली अंक ढाँचा'}]}/>
  </>} footer="Synthetic demonstration data · No accounts, network requests or trading services">
    <PageHeader compact eyebrow="Financial workflows" title={workflow} meta={`${formatBSDate(bs,{language})} · FY ${nepalFiscalYear(bs).label} · Sample data`} />
    <FinancialSummary label="Financial summary" metrics={[{id:'value',label:workflow==='Invoices'?'Invoiced total':workflow==='Watchlist'?'Tracked value':'Portfolio value',value:money(rows.reduce((sum,r)=>sum+(r.amount??0),0)),note:'Known values only'},{id:'count',label:'Records',value:formatNepalNumber(rows.length,{fractionDigits:0})},{id:'cash',label:workflow==='Invoices'?'Outstanding':'Available cash',value:workflow==='Invoices'?money(rows.filter(r=>r.status==='Due').reduce((sum,r)=>sum+(r.amount??0),0)):money(12500),note:'NPR · Illustrative'},{id:'return',label:workflow==='Invoices'?'Paid invoices':'Period return',value:workflow==='Invoices'?String(rows.filter(r=>r.status==='Paid').length):formatPercent(-2.43),note:workflow==='Invoices'?'Settled invoices':'Before fees and tax'}]}/>
    {workflow !== 'Invoices' && <PriceChart label="Account value · illustrative weekly observations" points={[{label:'Week 1',value:100000},{label:'Week 2',value:112000},{label:'Week 3',value:null},{label:'Week 4',value:108000},{label:'Week 5',value:121000}]} formatValue={money}/>}
    <section aria-label="Record controls" className="demo-controls">
      <Select label="Record count" labelPlacement="above" value={count} onChange={value=>{setCount(value);setPageIndex(0);}} options={['0','1','8','48'].map(value=>({value,label:`${value} ${value === '1' ? 'record' : 'records'}`}))}/>
      <Select label="Data state" labelPlacement="above" value={state} onChange={setState} options={[{value:'ready',label:'Ready'},{value:'loading',label:'Loading preview'},{value:'error',label:'Error preview'}]}/>
    </section>
    <FinancialTable caption={`${workflow} · NPR`} rows={pageRows} columns={columns} rowKey={r=>r.id} state={state} emptyTitle="No matching records" emptyBody="Choose a sample dataset or clear the search to explore this workflow." emptyAction={<Button onClick={()=>{setCount('8');setFilter('');setPageIndex(0);}}>Load sample records</Button>} errorTitle="Unable to load records" errorAction={<Button onClick={()=>setState('ready')}>Retry</Button>} sort={{key:'name',dir:direction}} onSort={()=>setDirection(direction==='asc'?'desc':'asc')} search={{label:'Search records',value:filter,onChange:setFilter,placeholder:'Search by symbol or name',testId:'financial-table-search'}} pagination={{pageIndex,pageSize,rowCount:visible.length,onPageChange:setPageIndex,testIdPrefix:'financial-table-page'}}/>
    {workflow==='Watchlist' && <OrderBook caption="NABIL · illustrative order book" bids={[{price:540,quantity:100},{price:539,quantity:300}]} asks={[{price:541,quantity:200}]} labels={{bidQuantity:'Buy quantity',bid:'Bid',ask:'Ask',askQuantity:'Sell quantity'}} formatPrice={money} formatQuantity={v=>formatNepalNumber(v,{fractionDigits:0})}/>}
  </AppShell></div>;
}
createRoot(document.getElementById('root')!).render(<App/>);
