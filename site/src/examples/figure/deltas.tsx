import { Delta } from '@punji/ui/figures';

// A change is a sign, an arrow, a colour and a spoken word ("up", "down", "unchanged"), never colour alone.
// A move that prints as 0.00 is no move: grey, no arrow.
export default function Example() {
  return (
    <dl className="ex-grid">
      <div>
        <dt>Up, percent</dt>
        <dd>
          <Delta value={2.31} />
        </dd>
      </div>
      <div>
        <dt>Down, percent</dt>
        <dd>
          <Delta value={-1.08} />
        </dd>
      </div>
      <div>
        <dt>Rounds to nothing</dt>
        <dd>
          <Delta value={0.004} />
        </dd>
      </div>
      <div>
        <dt>Rupees, no arrow</dt>
        <dd>
          <Delta value={-12.5} kind="rs" arrow={false} />
        </dd>
      </div>
      <div>
        <dt>Small, other words</dt>
        <dd>
          <Delta value={0.82} size="sm" words={{ up: 'बढेको', down: 'घटेको', flat: 'उस्तै' }} />
        </dd>
      </div>
      <div>
        <dt>Missing</dt>
        <dd>
          <Delta value={undefined} />
        </dd>
      </div>
    </dl>
  );
}
