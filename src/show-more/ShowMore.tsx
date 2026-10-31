/**
 * ShowMore (design.punji.app/components/show-more): the last line of a long
 * list inside its card, "Show all 24" / "Show fewer". A full-width quiet
 * button; it takes the colour of the card it sits on (so it works on an
 * inverse card too) and says whether the list is open (aria-expanded).
 */

export interface ShowMoreProps {
  /** The list is showing everything now (aria-expanded). You own this state. */
  expanded: boolean;
  /** Called when the button is pressed: flip `expanded`. */
  onToggle: () => void;
  /** The words while collapsed, with the count ("Show all 24"). */
  more: string;
  /** The words while expanded ("Show fewer"). */
  less: string;
  /** The id of the list it reveals (aria-controls). */
  controls?: string;
  /** Becomes data-testid on the button. */
  testId?: string;
}

export function ShowMore({ expanded, onToggle, more, less, controls, testId }: ShowMoreProps) {
  return (
    <button type="button" className="kit-more" aria-expanded={expanded} aria-controls={controls} onClick={onToggle} data-testid={testId}>
      {expanded ? less : more}
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <path d="M6 9l6 6 6-6" />
      </svg>
    </button>
  );
}
