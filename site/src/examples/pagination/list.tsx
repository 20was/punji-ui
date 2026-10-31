import { Pagination } from '@punji/ui/pagination';
import { usePagination } from '@punji/ui/use-pagination';
import { holdings } from '../../sample.ts';
import { Stack } from '@punji/ui/stack';

// The hook owns the arithmetic (one-based page, clamped); Pagination takes its state directly.
export default function Example() {
  const pager = usePagination({ total: holdings.length, defaultPageSize: 5 });
  return (
    <Stack>
      <ul>
        {holdings.slice(pager.startIndex, pager.endIndex).map((h) => (
          <li key={h.symbol}>
            {h.symbol} · {h.name}
          </li>
        ))}
      </ul>
      <Pagination {...pager} onPageChange={pager.setPage} label="Holdings pages" />
    </Stack>
  );
}
