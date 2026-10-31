import { HeadlineFigure, FigureChip } from '@punji/ui/summary-figure';

// The sign is in the chip's text: the tint never carries direction alone.
export default function Example() {
  return (
    <HeadlineFigure label="Worth now" currency="Rs" value="12,48,000" line="Across 14 holdings, after the 14 Nov close.">
      <FigureChip tone="up">+Rs 8,240 (+0.7%) today</FigureChip>
      <FigureChip tone="down">-Rs 21,400 (-1.7%) this week</FigureChip>
      <FigureChip tone="flat">Unchanged this month</FigureChip>
    </HeadlineFigure>
  );
}
