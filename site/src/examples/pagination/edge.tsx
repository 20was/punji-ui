import { useState } from 'react';
import { Pagination } from '@punji/ui/pagination';
import { paginate } from '@punji/ui/use-pagination';
import { Stack } from '@punji/ui/stack';
import { CodeBlock } from '@punji/ui/code-block';

// More than maxNumbers pages: only the range shows. An empty list reads "0 of 0". A page out of range is clamped.
export default function Example() {
  const [page, setPage] = useState(3);
  return (
    <Stack>
      <Pagination page={page} total={240} pageSize={10} onPageChange={setPage} label="Many pages" maxNumbers={4} />
      <Pagination page={1} total={0} pageSize={10} onPageChange={() => {}} label="Empty list" />
      <Pagination page={99} total={12} pageSize={5} onPageChange={() => {}} label="Out of range page" />
      <Pagination
        page={2}
        total={12}
        pageSize={5}
        onPageChange={() => {}}
        label="पृष्ठहरू"
        previousLabel="अघिल्लो"
        nextLabel="अर्को"
        pageLabel={(n) => `पृष्ठ ${n}`}
        rangeLabel={(range, total) => `${total} मध्ये ${range}`}
      />
      <CodeBlock>{JSON.stringify(paginate(240, page, 10))}</CodeBlock>
    </Stack>
  );
}
