import { ExpenseSplit } from '../types';

/**
 * Calculates equal splits for an expense.
 * Distributes remainder paise deterministically to the first `remainder` participants.
 */
export function calculateEqualSplit(totalMinor: number, participantIds: string[]): ExpenseSplit[] {
  if (participantIds.length === 0) {
    throw new Error('At least one participant is required for an equal split');
  }
  if (totalMinor <= 0) {
    throw new Error('Expense amount must be greater than zero');
  }

  const count = participantIds.length;
  const baseShare = Math.floor(totalMinor / count);
  const remainder = totalMinor % count;

  return participantIds.map((userId, index) => ({
    userId,
    // Distribute remainder 1 paise each to first 'remainder' members
    shareAmountMinor: baseShare + (index < remainder ? 1 : 0),
    splitType: 'equal',
  }));
}

/**
 * Validates and formats exact amount splits.
 * Verifies that the sum of all individual shares equals the total amount.
 */
export function calculateExactSplit(
  totalMinor: number,
  shares: { userId: string; amountMinor: number }[]
): ExpenseSplit[] {
  if (shares.length === 0) {
    throw new Error('At least one participant share is required');
  }
  if (totalMinor <= 0) {
    throw new Error('Expense amount must be greater than zero');
  }

  let runningTotal = 0;
  for (const s of shares) {
    if (s.amountMinor < 0) {
      throw new Error(`Participant share cannot be negative for user: ${s.userId}`);
    }
    runningTotal += s.amountMinor;
  }

  if (runningTotal !== totalMinor) {
    throw new Error(
      `Sum of exact shares (${runningTotal}) does not match total expense amount (${totalMinor})`
    );
  }

  return shares.map((s) => ({
    userId: s.userId,
    shareAmountMinor: s.amountMinor,
    splitType: 'exact',
  }));
}

/**
 * Calculates percentage-based splits.
 * Checks that percentages sum to 100% (within tolerance of 0.01%).
 * Any rounding discrepancies in paise are assigned to the participant with the largest percentage.
 */
export function calculatePercentageSplit(
  totalMinor: number,
  percentages: { userId: string; percentage: number }[]
): ExpenseSplit[] {
  if (percentages.length === 0) {
    throw new Error('At least one participant percentage is required');
  }
  if (totalMinor <= 0) {
    throw new Error('Expense amount must be greater than zero');
  }

  const sumPercentage = percentages.reduce((acc, curr) => acc + curr.percentage, 0);
  if (Math.abs(sumPercentage - 100) > 0.01) {
    throw new Error(`Percentages must sum to 100%. Current sum: ${sumPercentage.toFixed(2)}%`);
  }

  // Calculate base minor units for each
  const rawShares = percentages.map((p) => ({
    userId: p.userId,
    amountMinor: Math.floor((totalMinor * p.percentage) / 100),
    rawFraction: (totalMinor * p.percentage) / 100 - Math.floor((totalMinor * p.percentage) / 100),
    percentage: p.percentage,
  }));

  const allocatedTotal = rawShares.reduce((acc, curr) => acc + curr.amountMinor, 0);
  let remainderPaise = totalMinor - allocatedTotal;

  // Sort by highest fractional remainder to allocate leftover paise fairly
  const indexed = rawShares.map((item, idx) => ({ ...item, originalIndex: idx }));
  indexed.sort((a, b) => b.rawFraction - a.rawFraction);

  let i = 0;
  while (remainderPaise > 0 && i < indexed.length) {
    indexed[i].amountMinor += 1;
    remainderPaise -= 1;
    i++;
  }

  // Restore original ordering
  indexed.sort((a, b) => a.originalIndex - b.originalIndex);

  return indexed.map((item) => ({
    userId: item.userId,
    shareAmountMinor: item.amountMinor,
    splitType: 'percentage',
  }));
}

/**
 * Calculates share-based / ratio splits (e.g. 2 shares, 1 share, 1 share).
 * Allocates remainder paise deterministically.
 */
export function calculateShareSplit(
  totalMinor: number,
  shares: { userId: string; sharesCount: number }[]
): ExpenseSplit[] {
  if (shares.length === 0) {
    throw new Error('At least one participant share is required');
  }
  if (totalMinor <= 0) {
    throw new Error('Expense amount must be greater than zero');
  }

  const totalSharesCount = shares.reduce((acc, curr) => {
    if (curr.sharesCount <= 0) {
      throw new Error(`Share count must be positive for user: ${curr.userId}`);
    }
    return acc + curr.sharesCount;
  }, 0);

  const rawShares = shares.map((s) => {
    const rawVal = (totalMinor * s.sharesCount) / totalSharesCount;
    return {
      userId: s.userId,
      amountMinor: Math.floor(rawVal),
      rawFraction: rawVal - Math.floor(rawVal),
      sharesCount: s.sharesCount,
    };
  });

  const allocatedTotal = rawShares.reduce((acc, curr) => acc + curr.amountMinor, 0);
  let remainderPaise = totalMinor - allocatedTotal;

  // Allocate remainder paise to largest fractions first
  const indexed = rawShares.map((item, idx) => ({ ...item, originalIndex: idx }));
  indexed.sort((a, b) => b.rawFraction - a.rawFraction);

  let i = 0;
  while (remainderPaise > 0 && i < indexed.length) {
    indexed[i].amountMinor += 1;
    remainderPaise -= 1;
    i++;
  }

  indexed.sort((a, b) => a.originalIndex - b.originalIndex);

  return indexed.map((item) => ({
    userId: item.userId,
    shareAmountMinor: item.amountMinor,
    splitType: 'shares',
  }));
}

