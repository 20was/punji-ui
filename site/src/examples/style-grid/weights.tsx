import { StyleGrid } from '@punji/ui/style-grid';

export default function Example() {
  return (
    <StyleGrid
      label="Portfolio by size and style"
      selected={{ size: 'large', style: 'blend' }}
      cells={[
        { size: 'large', style: 'value', weight: '14.5' },
        { size: 'large', style: 'blend', weight: '31.2' },
        { size: 'large', style: 'growth', weight: '22.1' },
        { size: 'mid', style: 'value', weight: '6.4' },
        { size: 'mid', style: 'blend', weight: '9.3' },
        { size: 'mid', style: 'growth', weight: '7.5' },
        { size: 'small', style: 'value', weight: '3.1' },
        { size: 'small', style: 'blend', weight: '2.9' },
        { size: 'small', style: 'growth', weight: '3' },
      ]}
    />
  );
}
