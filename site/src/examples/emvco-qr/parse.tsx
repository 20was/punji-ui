import { useState } from 'react';
import { parseMerchantQr } from '@punji/ui/emvco-qr';
import { TextAreaField } from '@punji/ui/fields';
import { DataRow, DataRows } from '@punji/ui/rows';
import { Stack } from '@punji/ui/stack';

// The worked example from the EMVCo specification: a merchant in Beijing, with its Chinese name in template 64.
const SAMPLE = '00020101021229300012D156000000000510A93FO3230Q31280012D15600000001030812345678520441115802CN5914BEST TRANSPORT6007BEIJING64200002ZH0104最佳运输0202北京540523.7253031565502016233030412340603***0708A60086670902ME91320016A0112233449988770708123456786304A13A';

export default function Example() {
  const [text, setText] = useState(SAMPLE);
  const result = parseMerchantQr(text);
  return (
    <Stack className="ex-narrow">
      <TextAreaField label="Scanned text" value={text} onChange={setText} rows={5} error={result.ok ? undefined : result.message} />
      {result.ok && (
        <DataRows label="What the code says">
          <DataRow label="Merchant" value={result.value.merchantName ?? '—'} />
          <DataRow label="City" value={result.value.merchantCity ?? '—'} />
          <DataRow label="Also known as" value={result.value.alternateLanguage?.merchantName ?? '—'} />
          <DataRow label="Amount" value={result.value.amountText ? `${result.value.amountText} (currency ${result.value.currencyNumeric})` : 'The payer enters it'} />
          <DataRow label="Code type" value={result.value.pointOfInitiation === 'dynamic' ? 'Dynamic (one payment)' : 'Static (reusable)'} />
          <DataRow label="Tip" value={result.value.tip?.type === 'prompt' ? 'The payer is asked for a tip' : 'None'} />
        </DataRows>
      )}
    </Stack>
  );
}
