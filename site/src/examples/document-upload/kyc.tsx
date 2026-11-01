import { useState } from 'react';
import { DocumentUpload } from '@punji/ui/document-upload';
import { kycDocumentSlots } from '../../sample.ts';

// On a phone, the citizenship slots open the rear camera and the photo slot the front one. Nothing is uploaded here.
export default function Example() {
  const [files, setFiles] = useState<Record<string, File | null>>({});
  return <DocumentUpload title="Upload your documents" slots={kycDocumentSlots} value={files} onChange={setFiles} />;
}
