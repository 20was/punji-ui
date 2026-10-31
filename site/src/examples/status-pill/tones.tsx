import { StatusPill } from '@punji/ui/status-pill';

// Tones carry meaning with the words, never colour alone. A pill is not pressable (except as a link).
export default function Example() {
  return (
    <div className="ex-stack">
      <div className="ex-row">
        <StatusPill tone="gain">Settled</StatusPill>
        <StatusPill tone="loss">Failed</StatusPill>
        <StatusPill tone="warn">Pending</StatusPill>
        <StatusPill tone="accent">Yours</StatusPill>
        <StatusPill tone="highlight">Bonus</StatusPill>
        <StatusPill tone="info">Catching up</StatusPill>
        <StatusPill>Neutral</StatusPill>
      </div>
      <div className="ex-row">
        <StatusPill tone="gain" dot>
          Open
        </StatusPill>
        <StatusPill tone="accent" size="sm">
          New
        </StatusPill>
        <StatusPill swatch="var(--pu-color-series-4)">Banks</StatusPill>
      </div>
    </div>
  );
}
