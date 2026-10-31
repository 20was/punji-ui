import type { ReactNode } from 'react';
import { Button, CodeBlock, Cluster, Field, Stack, StatusPill } from '@punji/ui';

// Layout primitives: Stack and Cluster at every gap and alignment, and CodeBlock with and without a label and Copy button.
const Block = ({ title, children }: { title: string; children: ReactNode }) => <section aria-label={title} style={{ display: 'grid', gap: 8 }}><h2 className="vr-h">{title}</h2>{children}</section>;
const Box = ({ children }: { children: ReactNode }) => <span style={{ padding: '4px 10px', border: '1px solid var(--pu-color-border-strong)', borderRadius: 'var(--pu-radius-control)' }}>{children}</span>;

function StackFixture() {
  return <Stack gap={4} testId="vr-stack">
    <Block title="Gaps 1, 2, 3, 4, 16">
      <Cluster gap={4} align="start">
        {([1, 2, 3, 4, 16] as const).map((gap) => <Stack key={gap} gap={gap} testId={`vr-stack-${gap}`}><Box>gap {gap}</Box><Box>two</Box><Box>three</Box></Stack>)}
      </Cluster>
    </Block>
    <Block title="Align start, center, end, stretch">
      <Cluster gap={4} align="start">
        {(['start', 'center', 'end', 'stretch'] as const).map((align) => <Stack key={align} align={align} gap={2} testId={`vr-stack-${align}`} style={{ width: 120 }}><Box>{align}</Box><Box>a longer child</Box></Stack>)}
      </Cluster>
    </Block>
    <Block title="Form column and a list">
      <Stack gap={3}>
        <Field label="Symbol" value="NABIL" onChange={() => undefined} />
        <p>Orders placed after 3:00 PM are queued for the next session.</p>
        <Stack as="ul" gap={1} aria-label="Steps"><li>Review</li><li>Confirm</li></Stack>
      </Stack>
    </Block>
  </Stack>;
}

function ClusterFixture() {
  return <Stack gap={4} testId="vr-cluster">
    <Block title="Wraps when full"><Cluster gap={2} testId="vr-cluster-wrap">{Array.from({ length: 14 }, (_, i) => <StatusPill key={i}>Sector {i + 1}</StatusPill>)}</Cluster></Block>
    <Block title="Justify between"><Cluster justify="between" testId="vr-cluster-between"><StatusPill>Open</StatusPill><Cluster gap={2}><Button variant="secondary">Edit</Button><Button variant="danger">Cancel order</Button></Cluster></Cluster></Block>
    <Block title="Justify center and end">
      <Cluster justify="center" gap={2}><Box>center</Box><Box>center</Box></Cluster>
      <Cluster justify="end" gap={2}><Box>end</Box><Box>end</Box></Cluster>
    </Block>
    <Block title="Align baseline, start and end">
      <Cluster align="baseline" gap={4}><span style={{ fontSize: 28 }}>NPR 1,240</span><span>per share</span></Cluster>
      <Cluster align="start" gap={4}><Box>start</Box><span style={{ fontSize: 28 }}>tall</span></Cluster>
      <Cluster align="end" gap={4}><Box>end</Box><span style={{ fontSize: 28 }}>tall</span></Cluster>
    </Block>
  </Stack>;
}

const csv = 'Date,Symbol,Quantity,Amount\n2082-07-01,NABIL,100,124000.00\n2082-07-03,NTC,50,61500.00\n2082-07-09,HDL,10,"=HYPERLINK(""https://example.invalid"")"';

function CodeBlockFixture() {
  return <Stack gap={4} testId="vr-code">
    <CodeBlock label="transactions.csv" copy testId="vr-code-copy">{csv}</CodeBlock>
    <CodeBlock aria-label="Order as JSON" testId="vr-code-json">{JSON.stringify({ id: 'ORD-4021', symbol: 'NABIL', side: 'sell', quantity: 100, limit: '1240.00' }, null, 2)}</CodeBlock>
    <CodeBlock label="One very long line" testId="vr-code-long">{'0123456789abcdef'.repeat(12)}</CodeBlock>
  </Stack>;
}

export const layoutRegistry: Record<string, () => ReactNode> = {
  stack: StackFixture,
  cluster: ClusterFixture,
  'code-block': CodeBlockFixture,
};
