import { Accordion } from '@punji/ui/accordion';

// Single: one section open at a time, and the open one can be closed again (collapsible, the default).
export default function Example() {
  return (
    <div style={{ width: 'min(100%, 480px)' }}>
      <Accordion
        defaultValue={['fees']}
        items={[
          { id: 'fees', header: 'Fees', children: <p>No monthly fee. NPR 25 per outgoing interbank transfer.</p> },
          { id: 'limits', header: 'Limits', children: <p>NPR 500,000 a day to saved payees; NPR 50,000 to new payees.</p> },
          { id: 'closing', header: 'Closing the account', children: <p>Visit a branch with your citizenship certificate. Any balance is paid to a linked account.</p> },
        ]}
      />
    </div>
  );
}
