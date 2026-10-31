/**
 * ShowMore (design.punji.app/components/show-more): the last line of a long
 * list inside its card, "Show all 24" / "Show fewer". A full-width quiet
 * button; it takes the colour of the card it sits on (so it works on an
 * inverse card too) and says whether the list is open (aria-expanded).
 */

export function ShowMore({ expanded, onToggle, more, less, controls, testId }: { expanded: boolean; onToggle: () => void; more: string; less: string; controls?: string; testId?: string }) {
  return (
    <button type="button" className="kit-more" aria-expanded={expanded} aria-controls={controls} onClick={onToggle} data-testid={testId}>
      {expanded ? less : more}
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
  );
}
