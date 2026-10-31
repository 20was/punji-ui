'use client';

/**
 * StatementUpload: choose or drop a bank or broker statement (CSV, PDF). It only collects `File` objects and checks
 * them: type, size, empty, duplicates and count, with a message for each refusal. It makes no request; hand the
 * files to your own upload code. The browser's file type is a hint, so check the content on your server as well.
 * The "Choose file" button is the keyboard and screen reader route; dragging is an extra for pointer users.
 */
import { useId, useRef, useState, type DragEvent, type ReactNode } from 'react';

import { useControllableState } from '../use-controllable-state/useControllableState.ts';
import { describeAccept, formatFileSize, validateStatementFile, type StatementRejectionReason } from './validate.ts';

export { describeAccept, formatFileSize, matchesAccept, validateStatementFile, type StatementFileInfo, type StatementFileRules, type StatementRejectionReason } from './validate.ts';

export interface StatementRejection {
  /** The file that was refused. */
  file: File;
  /** Why: 'type', 'size', 'empty', 'duplicate' or 'count'. */
  reason: StatementRejectionReason;
  /** The message shown for this file. */
  message: string;
}

export interface StatementUploadLabels {
  prompt: (multiple: boolean) => string;
  choose: (multiple: boolean) => string;
  hint: (accepted: string, maxSize: string) => string;
  selected: string;
  remove: (name: string) => string;
  added: (name: string) => string;
  removed: (name: string) => string;
  type: (name: string, accepted: string) => string;
  size: (name: string, maxSize: string) => string;
  empty: (name: string) => string;
  duplicate: (name: string) => string;
  count: (name: string, max: number) => string;
}

export const statementUploadLabels: StatementUploadLabels = {
  prompt: (multiple) => (multiple ? 'Drag statements here, or' : 'Drag a statement here, or'),
  choose: (multiple) => (multiple ? 'Choose files' : 'Choose file'),
  hint: (accepted, maxSize) => `${accepted}, up to ${maxSize} each`,
  selected: 'Selected files',
  remove: (name) => `Remove ${name}`,
  added: (name) => `${name} added`,
  removed: (name) => `${name} removed`,
  type: (name, accepted) => `${name} is not a supported file. Use ${accepted}.`,
  size: (name, maxSize) => `${name} is larger than ${maxSize}.`,
  empty: (name) => `${name} is empty.`,
  duplicate: (name) => `${name} is already added.`,
  count: (name, max) => `${name} was not added: the limit is ${max} files.`,
};

export interface StatementUploadProps {
  /** The visible label ("Bank statement"). It names the whole control. */
  label: ReactNode;
  /** Text under the drop area. Default: the accepted types and the size limit. */
  hint?: ReactNode;
  /** An error from your own check or upload ("Upload failed. Try again."). Announced as an alert. */
  error?: ReactNode;
  /** Accepted extensions and MIME types, like the HTML accept attribute. Default [".csv", ".pdf"]. */
  accept?: readonly string[];
  /** Largest file in bytes. Default 5 MB (5 * 1024 * 1024). */
  maxSize?: number;
  /** Allow several files. Default false: a new file replaces the old one. */
  multiple?: boolean;
  /** Most files when `multiple`. Default 10. */
  maxFiles?: number;
  /** Controlled files. */
  value?: readonly File[];
  /** Initial files when uncontrolled. */
  defaultValue?: readonly File[];
  /** Called with the full list of accepted files after every add or remove. */
  onChange?: (files: File[]) => void;
  /** Called with the files that were refused on one attempt, each with its reason and message. */
  onReject?: (rejections: StatementRejection[]) => void;
  /** Disable choosing, dropping and removing. */
  disabled?: boolean;
  /** Id prefix; generated when omitted. */
  id?: string;
  /** Becomes data-testid on the control. */
  testId?: string;
  /** Replace any of the words, for another language. */
  labels?: Partial<StatementUploadLabels>;
}

const sameFile = (a: File, b: File) => a.name === b.name && a.size === b.size && a.lastModified === b.lastModified;

export function StatementUpload({
  label, hint, error, accept = ['.csv', '.pdf'], maxSize = 5 * 1024 * 1024, multiple = false, maxFiles = 10,
  value, defaultValue, onChange, onReject, disabled = false, id: idProp, testId, labels,
}: StatementUploadProps) {
  if (!Number.isInteger(maxSize) || maxSize <= 0) throw new RangeError('StatementUpload maxSize must be a positive whole number of bytes');
  const auto = useId();
  const id = idProp ?? auto;
  const words = { ...statementUploadLabels, ...labels };
  const input = useRef<HTMLInputElement>(null);
  const choose = useRef<HTMLButtonElement>(null);
  const [files, setFiles] = useControllableState<readonly File[]>({ value, defaultValue: defaultValue ?? [], onChange: onChange as ((files: readonly File[]) => void) | undefined, name: 'StatementUpload value' });
  const [rejections, setRejections] = useState<StatementRejection[]>([]);
  const [dragging, setDragging] = useState(false);
  const [status, setStatus] = useState('');
  const accepted = describeAccept(accept);
  const limit = formatFileSize(maxSize);

  const take = (incoming: FileList | readonly File[] | null) => {
    if (disabled || !incoming || incoming.length === 0) return;
    const rules = { accept, maxSize };
    const list = multiple ? [...files] : [];
    const refused: StatementRejection[] = [];
    const reject = (file: File, reason: StatementRejectionReason, message: string) => refused.push({ file, reason, message });
    const added: string[] = [];
    for (const file of Array.from(incoming)) {
      const problem = validateStatementFile(file, rules);
      if (problem === 'type') reject(file, problem, words.type(file.name, accepted));
      else if (problem === 'empty') reject(file, problem, words.empty(file.name));
      else if (problem === 'size') reject(file, problem, words.size(file.name, limit));
      else if (list.some((existing) => sameFile(existing, file))) reject(file, 'duplicate', words.duplicate(file.name));
      else if (multiple && list.length >= maxFiles) reject(file, 'count', words.count(file.name, maxFiles));
      else { list.push(file); added.push(file.name); if (!multiple) break; }
    }
    setRejections(refused);
    if (refused.length > 0) onReject?.(refused);
    if (added.length > 0) {
      setFiles(list);
      setStatus(added.map((name) => words.added(name)).join('. '));
    }
  };
  const removeAt = (index: number) => {
    if (disabled) return;
    const gone = files[index];
    setFiles(files.filter((_, at) => at !== index));
    setRejections([]);
    if (gone) setStatus(words.removed(gone.name));
    choose.current?.focus();
  };
  const onDrag = (event: DragEvent<HTMLDivElement>) => {
    if (disabled) return;
    event.preventDefault();
    setDragging(event.type !== 'dragleave' || (event.relatedTarget instanceof Node && event.currentTarget.contains(event.relatedTarget)));
  };

  const hintId = `${id}-hint`;
  const problemId = `${id}-problems`;
  return (
    <div className="pu-upload" role="group" aria-labelledby={`${id}-label`} aria-describedby={error || rejections.length > 0 ? `${hintId} ${problemId}` : hintId} data-testid={testId} data-invalid={error || rejections.length > 0 ? 'true' : undefined}>
      <span className="pu-upload-label" id={`${id}-label`}>{label}</span>
      <div
        className="pu-upload-zone"
        data-dragging={dragging ? 'true' : undefined}
        data-disabled={disabled ? 'true' : undefined}
        onDragEnter={onDrag}
        onDragOver={onDrag}
        onDragLeave={onDrag}
        onDrop={(event) => {
          if (disabled) return;
          event.preventDefault();
          setDragging(false);
          take(event.dataTransfer.files);
        }}
      >
        <span className="pu-upload-prompt">{words.prompt(multiple)}</span>
        <button type="button" className="pu-upload-choose" ref={choose} disabled={disabled} onClick={() => input.current?.click()}>{words.choose(multiple)}</button>
        <input
          ref={input}
          type="file"
          hidden
          multiple={multiple}
          accept={accept.join(',')}
          disabled={disabled}
          data-testid={testId ? `${testId}-input` : undefined}
          onChange={(event) => {
            take(event.target.files);
            // So that choosing the same file again after removing it still fires a change.
            event.target.value = '';
          }}
        />
      </div>
      <span className="pu-upload-hint" id={hintId}>{hint ?? words.hint(accepted, limit)}</span>
      <div id={problemId}>
        {error && <span className="pu-upload-error" role="alert">{error}</span>}
        {rejections.length > 0 && (
          <ul className="pu-upload-error" role="alert">
            {rejections.map((r, index) => <li key={`${r.file.name}-${index}`}>{r.message}</li>)}
          </ul>
        )}
      </div>
      {files.length > 0 && (
        <ul className="pu-upload-files" aria-label={words.selected}>
          {files.map((file, index) => (
            <li key={`${file.name}-${file.size}-${file.lastModified}-${index}`} className="pu-upload-file">
              <span className="pu-upload-name">{file.name}</span>
              <span className="pu-upload-size">{formatFileSize(file.size)}</span>
              <button type="button" className="pu-upload-remove" disabled={disabled} aria-label={words.remove(file.name)} onClick={() => removeAt(index)}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6L6 18" /></svg>
              </button>
            </li>
          ))}
        </ul>
      )}
      <span className="kit-sr" role="status">{status}</span>
    </div>
  );
}
