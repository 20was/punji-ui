import { useState } from 'react';
import { Pagination } from '@punji/ui/pagination';
import { PriceChange } from '@punji/ui/price-change';
import { RangeSlider } from '@punji/ui/range-slider';
import { DataRow, DataRows } from '@punji/ui/rows';
import { Switch } from '@punji/ui/switch';

/** dir="rtl" on a section: layout, chevrons, the switch and the slider mirror; amounts keep left-to-right digits. */
export default function Example() {
  const [page, setPage] = useState(2);
  const [on, setOn] = useState(true);
  const [range, setRange] = useState<[number, number]>([200, 700]);
  return (
    <div dir="rtl" lang="ar" style={{ display: 'grid', gap: 16 }}>
      <DataRows label="الملخص">
        <DataRow label="القيمة السوقية" value="Rs 12,48,350.00" />
        <DataRow label="التغير اليومي" value={<PriceChange current={48750n} previous={48140n} currency="NPR" locale="en-IN" />} />
      </DataRows>
      <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <Switch checked={on} onChange={setOn} label="تنبيهات الأسعار" /> تنبيهات الأسعار
      </span>
      <RangeSlider min={0} max={1000} step={10} lo={range[0]} hi={range[1]} onChange={(lo, hi) => setRange([lo, hi])} labelLo="الحد الأدنى" labelHi="الحد الأقصى" valueText={(v) => `NPR ${v}`} testId="rtl-range" />
      <Pagination page={page} total={40} pageSize={10} onPageChange={setPage} label="الصفحات" previousLabel="الصفحة السابقة" nextLabel="الصفحة التالية" />
    </div>
  );
}
