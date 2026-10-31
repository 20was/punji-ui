import { Figure } from '@punji/ui/figures';

// Figure prints a number: tabular digits, en-IN grouping (lakh and crore), never truncated.
// Missing values print a dash, never zero.
export default function Example() {
  return (
    <dl className="ex-grid">
      <div>
        <dt>rs</dt>
        <dd>
          <Figure value={1234567.5} kind="rs" />
        </dd>
      </div>
      <div>
        <dt>int</dt>
        <dd>
          <Figure value={12400} kind="int" />
        </dd>
      </div>
      <div>
        <dt>pct</dt>
        <dd>
          <Figure value={4.256} kind="pct" />
        </dd>
      </div>
      <div>
        <dt>num, dp 3</dt>
        <dd>
          <Figure value={0.5} kind="num" dp={3} />
        </dd>
      </div>
      <div>
        <dt>missing</dt>
        <dd>
          <Figure value={null} kind="rs" />
        </dd>
      </div>
    </dl>
  );
}
