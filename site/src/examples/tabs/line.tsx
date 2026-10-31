import { useState } from 'react';
import { Tabs } from '@punji/ui/tabs';
import { MoneyDisplay } from '@punji/ui/money-display';

type Tab = 'summary' | 'transactions' | 'documents';

export default function Example() {
  const [tab, setTab] = useState<Tab>('summary');
  return (
    <div className="ex-stack">
      <Tabs<Tab>
        label="Account sections"
        prefix="tabs-line"
        panelId="tabs-line-panel"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'summary', label: 'Summary' },
          { value: 'transactions', label: 'Transactions' },
          { value: 'documents', label: 'Documents' },
        ]}
      />
      <div id="tabs-line-panel" role="tabpanel" aria-labelledby={`tabs-line-${tab}`} tabIndex={0}>
        {tab === 'summary' && (
          <p>
            Balance <MoneyDisplay value={123456789n} currency="NPR" locale="en-IN" />
          </p>
        )}
        {tab === 'transactions' && <p>24 transactions this fiscal year.</p>}
        {tab === 'documents' && <p>No documents yet.</p>}
      </div>
      <Tabs<Tab>
        label="Account sections, full width"
        prefix="tabs-fill"
        panelId="tabs-line-panel"
        fill
        value={tab}
        onChange={setTab}
        options={[
          { value: 'summary', label: 'Summary' },
          { value: 'transactions', label: 'Activity' },
        ]}
      />
    </div>
  );
}
