import { Currency, ExpenseShare } from '../types';

export interface CurrencyConfig {
  code: Currency;
  symbol: string;
  name: string;
  locale: string;
  decimals: number;
}

export const CURRENCY_CONFIGS: Record<Currency, CurrencyConfig> = {
  INR: {
    code: 'INR',
    symbol: '₹',
    name: 'Indian Rupee',
    locale: 'en-IN',
    decimals: 2,
  },
  USD: {
    code: 'USD',
    symbol: '$',
    name: 'US Dollar',
    locale: 'en-US',
    decimals: 2,
  },
  EUR: {
    code: 'EUR',
    symbol: '€',
    name: 'Euro',
    locale: 'de-DE',
    decimals: 2,
  },
  GBP: {
    code: 'GBP',
    symbol: '£',
    name: 'British Pound',
    locale: 'en-GB',
    decimals: 2,
  },
};

/**
 * Converts a floating-point or string decimal number to integer minor units (paise/cents).
 * Avoids standard JS floating point errors by using Math.round.
 */
export function toMinorUnits(value: number | string): number {
  if (typeof value === 'string') {
    const cleanStr = value.trim().replace(/,/g, '');
    const parsed = parseFloat(cleanStr);
    if (isNaN(parsed) || !isFinite(parsed)) return 0;
    return Math.round(parsed * 100);
  }
  if (isNaN(value) || !isFinite(value)) return 0;
  return Math.round(value * 100);
}

/**
 * Converts minor units back to standard float (e.g., 1050 paise -> 10.50).
 */
export function fromMinorUnits(minorUnits: number): number {
  if (isNaN(minorUnits) || !isFinite(minorUnits)) return 0;
  return minorUnits / 100;
}

/**
 * Formats a minor unit amount into a clean human-readable currency string.
 * Example: 150050 minor units in INR -> "₹1,500.50"
 */
export function formatCurrency(
  minorUnits: number,
  currency: Currency,
  options?: {
    showSign?: boolean;
    hideSymbol?: boolean;
    compact?: boolean;
  }
): string {
  const config = CURRENCY_CONFIGS[currency] || CURRENCY_CONFIGS.INR;
  const isNegative = minorUnits < 0;
  const absMinor = Math.abs(minorUnits);
  const majorUnits = absMinor / 100;

  let formattedNumber = majorUnits.toLocaleString(config.locale, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });

  const symbol = options?.hideSymbol ? '' : config.symbol;
  const sign = isNegative ? '-' : options?.showSign && minorUnits > 0 ? '+' : '';

  if (symbol && !options?.hideSymbol) {
    // Format nicely with symbol
    return `${sign}${symbol}${formattedNumber}`;
  }
  return `${sign}${formattedNumber}`;
}

/**
 * Calculates equal shares among given participant IDs deterministically.
 * Ensures the sum of individual integer minor shares equals totalMinor exactly.
 */
export function calculateEqualShares(
  totalMinor: number,
  participantIds: string[]
): ExpenseShare[] {
  if (participantIds.length === 0 || totalMinor <= 0) {
    return [];
  }

  const count = participantIds.length;
  const baseShare = Math.floor(totalMinor / count);
  const remainder = totalMinor % count;

  // Remainder is distributed 1 unit to the first `remainder` participants
  return participantIds.map((id, index) => ({
    participantId: id,
    amountMinor: baseShare + (index < remainder ? 1 : 0),
  }));
}

/**
 * Calculates percentage shares deterministically.
 * Ensures that rounding errors in percentages are allocated deterministically to match totalMinor.
 */
export function calculatePercentageShares(
  totalMinor: number,
  percentages: { participantId: string; percentage: number }[]
): { shares: ExpenseShare[]; isValid: boolean; error?: string } {
  if (percentages.length === 0) {
    return { shares: [], isValid: false, error: 'No participants selected' };
  }

  const sumPercentage = percentages.reduce((acc, p) => acc + (p.percentage || 0), 0);
  // Allow slight floating point tolerance (e.g. 99.999 to 100.001)
  if (Math.abs(sumPercentage - 100) > 0.01) {
    return {
      shares: [],
      isValid: false,
      error: `Percentages sum to ${sumPercentage.toFixed(1)}%, must equal 100%`,
    };
  }

  // Calculate base minor units and fractional residues
  const rawCalculations = percentages.map((p) => {
    const rawMinor = (p.percentage * totalMinor) / 100;
    const baseMinor = Math.floor(rawMinor);
    const fraction = rawMinor - baseMinor;
    return {
      participantId: p.participantId,
      percentage: p.percentage,
      baseMinor,
      fraction,
    };
  });

  const sumBase = rawCalculations.reduce((acc, c) => acc + c.baseMinor, 0);
  let remainder = totalMinor - sumBase;

  // Sort descending by highest fraction to allocate remainder fairly
  const indicesByFraction = rawCalculations
    .map((c, i) => ({ index: i, fraction: c.fraction }))
    .sort((a, b) => b.fraction - a.fraction);

  const bonusAllocations = new Array(percentages.length).fill(0);
  for (let i = 0; i < remainder && i < indicesByFraction.length; i++) {
    bonusAllocations[indicesByFraction[i].index] = 1;
  }

  const shares: ExpenseShare[] = rawCalculations.map((c, i) => ({
    participantId: c.participantId,
    amountMinor: c.baseMinor + bonusAllocations[i],
    percentage: c.percentage,
  }));

  return { shares, isValid: true };
}

/**
 * Validates whether the sum of provided shares equals the total amount.
 */
export function validateExactShares(
  totalMinor: number,
  shares: { participantId: string; amountMinor: number }[]
): { isValid: boolean; differenceMinor: number } {
  const sumShares = shares.reduce((acc, s) => acc + (s.amountMinor || 0), 0);
  const differenceMinor = totalMinor - sumShares;
  return {
    isValid: differenceMinor === 0,
    differenceMinor,
  };
}
