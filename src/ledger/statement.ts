/**
 * Pure helpers for statement-shaped reports (income statement, balance sheet,
 * cash flow): a typed tree of sections, lines and subtotals with one exact
 * bigint per period. `rollUp` adds a tree up; `findRollUpMismatches` compares
 * the subtotals a caller supplied against that roll-up. Nothing sums silently:
 * the statement component prints exactly the values it is given.
 */
export type StatementValues = Readonly<Record<string, bigint | null | undefined>>;
/** How a row feeds its parent's subtotal: added (default) or subtracted (costs under a profit). */
export type StatementEffect = 'add' | 'subtract';

export interface StatementLine {
  kind: 'line';
  id: string;
  label: string;
  /** Minor units per period key. Missing or null prints a dash and counts as zero in a roll-up. */
  values: StatementValues;
  effect?: StatementEffect;
}

export interface StatementSubtotal {
  label: string;
  /** What the caller says the total is. Leave it out and call `rollUp` to have it added up. */
  values?: StatementValues;
  /** A final result such as "Net profit": drawn heavier. */
  grand?: boolean;
}

export interface StatementSection {
  kind: 'section';
  id: string;
  label: string;
  rows: readonly StatementRow[];
  subtotal?: StatementSubtotal;
  effect?: StatementEffect;
}

export type StatementRow = StatementLine | StatementSection;

export interface RollUpMismatch { id: string; period: string; provided: bigint | null; computed: bigint }

const valueOf = (values: StatementValues | undefined, period: string): bigint | null => {
  const value = values?.[period];
  if (value !== undefined && value !== null && typeof value !== 'bigint') throw new TypeError('Statement values are bigint minor units');
  return value ?? null;
};

function sectionSum(section: StatementSection, period: string): bigint {
  let total = 0n;
  for (const row of section.rows) {
    const amount = valueOf(row.kind === 'line' ? row.values : row.subtotal?.values, period) ?? 0n;
    total += row.effect === 'subtract' ? -amount : amount;
  }
  return total;
}

/** The periods named anywhere in the rows' values, in first-seen order. */
export function statementPeriods(rows: readonly StatementRow[]): string[] {
  const found = new Set<string>();
  const visit = (row: StatementRow) => {
    if (row.kind === 'line') Object.keys(row.values).forEach(key => found.add(key));
    else { Object.keys(row.subtotal?.values ?? {}).forEach(key => found.add(key)); row.rows.forEach(visit); }
  };
  rows.forEach(visit);
  return [...found];
}

/**
 * A copy of the tree where every section with a `subtotal` has its values
 * replaced by the exact sum of its children, nested sections first. A nested
 * section without a `subtotal` contributes nothing to its parent (give it one
 * if it should count). `periods` defaults to every period in the tree.
 */
export function rollUp(rows: readonly StatementRow[], periods: readonly string[] = statementPeriods(rows)): StatementRow[] {
  const roll = (row: StatementRow): StatementRow => {
    if (row.kind === 'line') return row;
    const section: StatementSection = { ...row, rows: row.rows.map(roll) };
    if (row.subtotal) {
      const values: Record<string, bigint> = {};
      for (const period of periods) values[period] = sectionSum(section, period);
      section.subtotal = { ...row.subtotal, values };
    }
    return section;
  };
  return rows.map(roll);
}

/** Every provided subtotal value that differs from the roll-up of its children (a missing value counts as a difference). Empty when all agree. */
export function findRollUpMismatches(rows: readonly StatementRow[], periods: readonly string[] = statementPeriods(rows)): RollUpMismatch[] {
  const rolled = rollUp(rows, periods);
  const out: RollUpMismatch[] = [];
  const visit = (given: StatementRow, computed: StatementRow) => {
    if (given.kind !== 'section' || computed.kind !== 'section') return;
    given.rows.forEach((row, index) => visit(row, computed.rows[index]!));
    if (!given.subtotal) return;
    for (const period of periods) {
      const provided = valueOf(given.subtotal.values, period);
      const expected = valueOf(computed.subtotal?.values, period) ?? 0n;
      if (provided !== expected) out.push({ id: given.id, period, provided, computed: expected });
    }
  };
  rows.forEach((row, index) => visit(row, rolled[index]!));
  return out;
}
