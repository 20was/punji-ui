'use client';
/**
 * FxRateDisplay (design.punji.app/components/fx-rate): an exchange rate as a sentence a person can check, "1 USD =
 * NPR 133.40", with when it was quoted and who quoted it. One rate, its inverse, or a buy and sell pair. The rate
 * is an exact decimal string and is only ever formatted, never turned into a number. Screen readers hear the
 * rate with currency names ("1 US Dollar equals 133.40 Nepalese Rupee"). The pure helpers (`convertMoney`,
 * `invertRate`, `parseFxRate`, `formatFxRate`) are exported from the same module.
 *
 * @stability beta
 * @remarks Display only. A rate shown here is not a quote you may trade at: lock, validate and apply the rate on the server.
 */
import { useLocaleMessages } from '../locale/context.tsx';
import { formatAge, toTime } from '../internal/relativeTime.ts';
import { formatFxRate, invertFxRate, type FxRate, type FxRateKind } from './fx.ts';

export * from './fx.ts';

/** FxRateDisplay's words. Each key can also be set for every instance under `fxRate` in the locale messages. */
export interface FxRateLabels {
  /** The timestamp line. Default "As of {time}". */
  asOf?: (time: string) => string;
  /** The source. Default "Source: {source}". */
  source?: (source: string) => string;
  /** Prefix of the buy row. Default "Buy". */
  buy?: string;
  /** Prefix of the sell row. Default "Sell". */
  sell?: string;
  /** Spoken kind for a mid rate. Default "mid-market". */
  mid?: string;
  /** What a screen reader hears; base and quote are currency names. Default "1 US Dollar equals 133.40 Nepalese Rupee, buy rate". */
  spoken?: (parts: { base: string; quote: string; rate: string; kind?: FxRateKind; kindLabel?: string }) => string;
}

interface Common {
  /** Show the rate the other way round, "1 NPR = USD 0.0075", computed exactly. Default false. */
  inverse?: boolean;
  /** Fraction digits of the inverse (default 6). */
  inversePlaces?: number;
  /** BCP 47 tag for digits, separators and the time. Default: the locale provider's, else 'en'. */
  locale?: string;
  /** IANA zone for the timestamp ('Asia/Kathmandu'). Set it for server rendering so both sides print the same time. */
  timeZone?: string;
  /** The current time (Date or ms). When given, a relative age "2 min. ago" is added; the component does not tick, re-render to update. */
  now?: Date | number;
  /** Hide the timestamp. Default false. */
  hideTime?: boolean;
  /** Hide the source. Default false. */
  hideSource?: boolean;
  /** Your words; they win over the locale provider's `fxRate`. */
  labels?: FxRateLabels;
  /** Sets `data-testid` on the root; rows get `<id>-buy` and `<id>-sell`. */
  testId?: string;
  /** Layout only. */
  className?: string;
}

/** One rate, or a buy and sell pair (`buy` and `sell` instead of `rate`). */
export type FxRateDisplayProps = Common & (SingleRate | PairRate);

interface SingleRate {
  /** The rate to show. */
  rate: FxRate;
  buy?: undefined;
  sell?: undefined;
}

interface PairRate {
  rate?: undefined;
  /** The rate the provider buys the base currency at (what you receive when you sell it). */
  buy: FxRate;
  /** The rate the provider sells the base currency at (what you pay to buy it). */
  sell: FxRate;
}

function currencyName(code: string, locale: string): string {
  try {
    return new Intl.DisplayNames(locale, { type: 'currency' }).of(code.toUpperCase()) ?? code;
  } catch {
    return code;
  }
}

/** @stability beta */
export function FxRateDisplay(props: FxRateDisplayProps) {
  const { inverse = false, inversePlaces = 6, timeZone, now, hideTime, hideSource, testId, className } = props;
  const { locale: contextLocale, messages } = useLocaleMessages();
  const locale = props.locale ?? contextLocale;
  const words = { ...messages.fxRate, ...props.labels };
  const { asOf = (t: string) => `As of ${t}`, source = (s: string) => `Source: ${s}`, buy = 'Buy', sell = 'Sell', mid = 'mid-market' } = words;
  const spoken = words.spoken ?? (({ base, quote, rate, kindLabel }) => `1 ${base} equals ${rate} ${quote}${kindLabel ? `, ${kindLabel}` : ''}`);
  const stamp = new Intl.DateTimeFormat(locale, { dateStyle: 'medium', timeStyle: 'short', ...(timeZone ? { timeZone } : {}) });

  const oriented = (rate: FxRate) => (inverse ? invertFxRate(rate, inversePlaces) : rate);
  const one = (rate: FxRate, label: string | undefined, id: string | undefined, spokenKind: string | undefined, showMeta: boolean) => {
    const r = oriented(rate);
    const text = `1 ${r.base.toUpperCase()} = ${r.quote.toUpperCase()} ${formatFxRate(r.rate, locale)}`;
    const heard = spoken({ base: currencyName(r.base, locale), quote: currencyName(r.quote, locale), rate: formatFxRate(r.rate, locale), kind: r.kind, ...(spokenKind ? { kindLabel: spokenKind } : {}) });
    return (
      <p className="pu-fx-line" key={id ?? 'rate'} data-testid={id}>
        {label && <span className="pu-fx-kind" aria-hidden="true">{label}</span>}
        <span className="pu-fx-text" aria-hidden="true">{text}</span>
        <span className="kit-sr">{heard}</span>
        {showMeta && meta(rate)}
      </p>
    );
  };
  const meta = (rate: FxRate) => {
    const time = toTime(rate.asOf);
    const showTime = !hideTime && Number.isFinite(time);
    const showSource = !hideSource && !!rate.source;
    if (!showTime && !showSource) return null;
    const age = showTime && now !== undefined ? formatAge(+now - time, locale) : '';
    return (
      <span className="pu-fx-meta">
        {showTime && (
          <time dateTime={new Date(time).toISOString()}>
            {asOf(stamp.format(time))}{age && ` (${age})`}
          </time>
        )}
        {showTime && showSource && <span aria-hidden="true"> · </span>}
        {showSource && <span>{source(rate.source!)}</span>}
      </span>
    );
  };

  const kindWord = (kind?: FxRateKind) => (kind === 'buy' ? buy : kind === 'sell' ? sell : kind === 'mid' ? mid : undefined);
  const classes = `pu-fx-rate${className ? ` ${className}` : ''}`;
  if (props.rate) {
    return <div className={classes} data-testid={testId}>{one(props.rate, undefined, undefined, kindWord(props.rate.kind), true)}</div>;
  }
  const { buy: buyRate, sell: sellRate } = props;
  const shared = toTime(buyRate.asOf) === toTime(sellRate.asOf) && buyRate.source === sellRate.source;
  return (
    <div className={`${classes} pair`} data-testid={testId}>
      {one({ ...buyRate, kind: 'buy' }, buy, testId ? `${testId}-buy` : undefined, buy, !shared)}
      {one({ ...sellRate, kind: 'sell' }, sell, testId ? `${testId}-sell` : undefined, sell, !shared)}
      {shared && <p className="pu-fx-line">{meta(buyRate)}</p>}
    </div>
  );
}
