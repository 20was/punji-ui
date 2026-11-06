/** The style hook for a direction tone. `gain` and `loss` are the convention; the stylesheets keep the older `up` and `down` names, so both spellings render alike. */
export const directionClass = <T extends string | undefined>(tone: T): T | 'up' | 'down' => (tone === 'gain' ? 'up' : tone === 'loss' ? 'down' : tone);
