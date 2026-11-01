'use client';

/**
 * DocumentUpload: the documents step of a KYC form. One slot per document you ask for (citizenship front and back, a
 * passport-size photo, a signature), each with its own label, accepted types, size limit and, on a phone, the camera
 * to open (`capture`). A chosen image shows a preview; any file shows its name, size and a remove button. Type and size
 * are checked as files are chosen (the browser's type is only a hint: your server must inspect the content). It holds
 * files in memory and uploads nothing: send them yourself.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react';

import { buttonClass } from '../button/Button.tsx';
import { describeAccept, formatFileSize, validateStatementFile } from '../statement-upload/validate.ts';

export interface DocumentSlot {
  /** Stable unique id; the key in `value`. */
  id: string;
  /** What to upload ("Citizenship certificate, front"). */
  label: string;
  /** One line of guidance ("All four corners visible, no glare"). */
  hint?: string;
  /** Accepted extensions and MIME types. Default ['image/jpeg', 'image/png', '.pdf']. */
  accept?: readonly string[];
  /** Largest file in bytes. Default 5 MB. */
  maxSize?: number;
  /** On a phone, open the camera: 'environment' (rear, for documents) or 'user' (front, for a selfie). */
  capture?: 'user' | 'environment';
  /** Whether the slot must be filled. Shown as "(required)" or "(optional)". Default true. */
  required?: boolean;
}

export interface DocumentUploadLabels {
  /** The button that opens the picker. */
  choose: string;
  /** The button when a file is already chosen. */
  replace: string;
  /** The remove button's name, with the slot label. */
  remove: (slot: string) => string;
  required: string;
  optional: string;
  /** Rejection messages. */
  type: (accepted: string) => string;
  size: (limit: string) => string;
  empty: string;
  /** Announcements. */
  added: (slot: string, file: string) => string;
  removed: (slot: string) => string;
  /** The preview image's alternative text. */
  preview: (slot: string) => string;
  /** Default hint line: types and limit. */
  rules: (accepted: string, limit: string) => string;
}

export const DEFAULT_DOCUMENT_UPLOAD_LABELS: DocumentUploadLabels = {
  choose: 'Choose file', replace: 'Replace', remove: (slot) => `Remove ${slot}`, required: '(required)', optional: '(optional)',
  type: (accepted) => `This file type is not accepted. Use ${accepted}.`, size: (limit) => `This file is too large. The limit is ${limit}.`, empty: 'This file is empty.',
  added: (slot, file) => `${file} added for ${slot}.`, removed: (slot) => `${slot} removed.`, preview: (slot) => `Preview of ${slot}`,
  rules: (accepted, limit) => `${accepted}, up to ${limit}`,
};

export interface DocumentUploadProps {
  /** The documents to collect, in order. */
  slots: readonly DocumentSlot[];
  /** The chosen file per slot id (controlled); a missing or null entry is empty. */
  value: Readonly<Record<string, File | null | undefined>>;
  /** Called with the whole map after a file is added or removed. */
  onChange: (value: Record<string, File | null>) => void;
  /** Errors per slot id from your own checks or the server ("The photo is blurred"). */
  errors?: Readonly<Record<string, ReactNode>>;
  /** The group's heading. */
  title?: ReactNode;
  /** The heading level. Default 3. */
  headingLevel?: 2 | 3 | 4;
  /** Disable every slot (while uploading). */
  disabled?: boolean;
  /** Replace any words, for translation. */
  labels?: Partial<DocumentUploadLabels>;
  /** Extra class on the outer element. */
  className?: string;
  /** Sets `data-testid` on the outer element; each slot input gets `-<slot id>-input`. */
  testId?: string;
}

const DEFAULT_ACCEPT = ['image/jpeg', 'image/png', '.pdf'] as const;

/** An object URL for an image file, revoked when the file changes or the slot unmounts. */
function usePreview(file: File | null | undefined): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    // Object URLs are an external resource: create one per file and revoke it when the file changes.
    // oxlint-disable-next-line react/set-state-in-effect
    if (!file || !file.type.startsWith('image/') || typeof URL.createObjectURL !== 'function') { setUrl(null); return; }
    const next = URL.createObjectURL(file);
    setUrl(next);
    return () => URL.revokeObjectURL(next);
  }, [file]);
  return url;
}

function Slot({ slot, file, error, disabled, words, onPick, onRemove, testId, headingLevel }: {
  slot: DocumentSlot; file: File | null | undefined; error?: ReactNode; disabled?: boolean; words: DocumentUploadLabels;
  onPick: (file: File) => string | null; onRemove: () => void; testId?: string; headingLevel: number;
}) {
  const id = useId();
  const input = useRef<HTMLInputElement>(null);
  const chooseButton = useRef<HTMLButtonElement>(null);
  const [problem, setProblem] = useState<string | null>(null);
  const preview = usePreview(file);
  const accept = slot.accept ?? DEFAULT_ACCEPT;
  const required = slot.required ?? true;
  const shown = error ?? problem;
  const Heading = `h${Math.min(headingLevel + 1, 6)}` as 'h3';
  return (
    <li className="pu-docs-slot" data-filled={file ? 'true' : undefined} data-invalid={shown ? 'true' : undefined}>
      <div className="pu-docs-head">
        <Heading className="pu-docs-label" id={`${id}-label`}>{slot.label} <span className="pu-docs-req">{required ? words.required : words.optional}</span></Heading>
        <span className="pu-docs-hint" id={`${id}-hint`}>{slot.hint ? `${slot.hint}. ` : ''}{words.rules(describeAccept(accept), formatFileSize(slot.maxSize ?? 5 * 1024 * 1024))}</span>
      </div>
      <div className="pu-docs-body">
        <div className="pu-docs-thumb" aria-hidden={preview ? undefined : 'true'}>
          {preview ? <img src={preview} alt={words.preview(slot.label)} /> : (
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" focusable="false"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5" /></svg>
          )}
        </div>
        <div className="pu-docs-file">
          {file && <><span className="pu-docs-name">{file.name}</span><span className="pu-docs-size">{formatFileSize(file.size)}</span></>}
          <div className="pu-docs-actions">
            <button type="button" ref={chooseButton} className={buttonClass({ variant: 'secondary', size: 'sm' })} disabled={disabled} aria-describedby={`${id}-label ${id}-hint${shown ? ` ${id}-err` : ''}`} onClick={() => input.current?.click()}>
              {file ? words.replace : words.choose}
            </button>
            {file && (
              <button type="button" className={buttonClass({ variant: 'ghost', size: 'sm' })} disabled={disabled} onClick={() => { setProblem(null); onRemove(); chooseButton.current?.focus(); }}>{words.remove(slot.label)}</button>
            )}
          </div>
          <input
            ref={input}
            type="file"
            hidden
            accept={accept.join(',')}
            capture={slot.capture}
            disabled={disabled}
            aria-labelledby={`${id}-label`}
            data-testid={testId ? `${testId}-${slot.id}-input` : undefined}
            onChange={(event) => {
              const picked = event.target.files?.[0];
              event.target.value = '';
              if (picked) setProblem(onPick(picked));
            }}
          />
        </div>
      </div>
      {shown && <p className="pu-docs-error" id={`${id}-err`} role="alert">{shown}</p>}
    </li>
  );
}

export function DocumentUpload({ slots, value, onChange, errors, title, headingLevel = 3, disabled, labels, className, testId }: DocumentUploadProps) {
  const words = { ...DEFAULT_DOCUMENT_UPLOAD_LABELS, ...labels };
  const uid = useId();
  const [status, setStatus] = useState('');
  const Heading = `h${headingLevel}` as 'h3';
  const current = (): Record<string, File | null> => Object.fromEntries(slots.map((s) => [s.id, value[s.id] ?? null]));
  return (
    <section className={`pu-docs${className ? ` ${className}` : ''}`} aria-labelledby={title ? `${uid}-title` : undefined} data-testid={testId}>
      {title && <Heading className="pu-docs-title" id={`${uid}-title`}>{title}</Heading>}
      <ul className="pu-docs-list">
        {slots.map((slot) => (
          <Slot key={slot.id} slot={slot} file={value[slot.id]} error={errors?.[slot.id]} disabled={disabled} words={words} testId={testId} headingLevel={title ? headingLevel : headingLevel - 1}
            onPick={(file) => {
              const accept = slot.accept ?? DEFAULT_ACCEPT;
              const reason = validateStatementFile(file, { accept, maxSize: slot.maxSize ?? 5 * 1024 * 1024 });
              if (reason === 'type') return words.type(describeAccept(accept));
              if (reason === 'size') return words.size(formatFileSize(slot.maxSize ?? 5 * 1024 * 1024));
              if (reason === 'empty') return words.empty;
              onChange({ ...current(), [slot.id]: file });
              setStatus(words.added(slot.label, file.name));
              return null;
            }}
            onRemove={() => { onChange({ ...current(), [slot.id]: null }); setStatus(words.removed(slot.label)); }} />
        ))}
      </ul>
      <span className="kit-sr" role="status">{status}</span>
    </section>
  );
}
