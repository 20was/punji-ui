import { SplitBar } from '@punji/ui/bars';

// Part labels are printed under the bar, so the bar can stay decorative. With neither labels nor `label` it warns in development.
export default function Example() {
  return (
    <div className="ex-stack">
      <SplitBar
        parts={[
          { key: 'u', value: 141, tone: 'gain', label: '141 up' },
          { key: 'f', value: 12, tone: 'neutral', label: '12 unchanged' },
          { key: 'd', value: 96, tone: 'loss', label: '96 down' },
        ]}
      />
      <SplitBar
        label="7 of 10 steps done"
        parts={[
          { key: 'done', value: 7, tone: 'chart' },
          { key: 'todo', value: 3, tone: 'neutral' },
        ]}
      />
    </div>
  );
}
