import { describe, it, expect } from 'vitest';
import {
  calculateEqualSplit,
  calculateExactSplit,
  calculatePercentageSplit,
  calculateShareSplit,
} from '../splitCalculator';

describe('splitCalculator Unit Tests', () => {
  describe('calculateEqualSplit', () => {
    it('splits evenly when divisible', () => {
      const splits = calculateEqualSplit(10000, ['u1', 'u2', 'u3', 'u4']); // ₹100.00
      expect(splits).toHaveLength(4);
      expect(splits.every((s) => s.shareAmountMinor === 2500)).toBe(true);
      expect(splits.reduce((sum, s) => sum + s.shareAmountMinor, 0)).toBe(10000);
    });

    it('allocates remainder paise deterministically without losing any fraction', () => {
      // 1000 paise split among 3 people: 333 + 333 + 334 = 1000
      const splits = calculateEqualSplit(1000, ['u1', 'u2', 'u3']);
      expect(splits[0].shareAmountMinor).toBe(334);
      expect(splits[1].shareAmountMinor).toBe(333);
      expect(splits[2].shareAmountMinor).toBe(333);
      expect(splits.reduce((sum, s) => sum + s.shareAmountMinor, 0)).toBe(1000);
    });

    it('throws when no participants provided', () => {
      expect(() => calculateEqualSplit(1000, [])).toThrow();
    });

    it('throws when amount is <= 0', () => {
      expect(() => calculateEqualSplit(0, ['u1'])).toThrow();
    });
  });

  describe('calculateExactSplit', () => {
    it('accepts valid exact shares totaling the amount', () => {
      const splits = calculateExactSplit(5000, [
        { userId: 'u1', amountMinor: 2000 },
        { userId: 'u2', amountMinor: 3000 },
      ]);
      expect(splits[0].shareAmountMinor).toBe(2000);
      expect(splits[1].shareAmountMinor).toBe(3000);
    });

    it('throws if shares do not equal total', () => {
      expect(() =>
        calculateExactSplit(5000, [
          { userId: 'u1', amountMinor: 2000 },
          { userId: 'u2', amountMinor: 2500 }, // sum 4500 != 5000
        ])
      ).toThrow();
    });
  });

  describe('calculatePercentageSplit', () => {
    it('splits based on percentages and reconciles remaining fractions', () => {
      const splits = calculatePercentageSplit(10000, [
        { userId: 'u1', percentage: 50 },
        { userId: 'u2', percentage: 30 },
        { userId: 'u3', percentage: 20 },
      ]);
      expect(splits[0].shareAmountMinor).toBe(5000);
      expect(splits[1].shareAmountMinor).toBe(3000);
      expect(splits[2].shareAmountMinor).toBe(2000);
      expect(splits.reduce((sum, s) => sum + s.shareAmountMinor, 0)).toBe(10000);
    });

    it('handles non-round percentages with exact minor reconciliation', () => {
      // 1000 split: 33.33%, 33.33%, 33.34%
      const splits = calculatePercentageSplit(1000, [
        { userId: 'u1', percentage: 33.33 },
        { userId: 'u2', percentage: 33.33 },
        { userId: 'u3', percentage: 33.34 },
      ]);
      expect(splits.reduce((sum, s) => sum + s.shareAmountMinor, 0)).toBe(1000);
    });

    it('throws if percentage sum does not equal 100%', () => {
      expect(() =>
        calculatePercentageSplit(10000, [
          { userId: 'u1', percentage: 50 },
          { userId: 'u2', percentage: 40 },
        ])
      ).toThrow();
    });
  });

  describe('calculateShareSplit', () => {
    it('splits proportionally according to ratio shares', () => {
      // Pushkar: 2 shares, Rahul: 1 share, Aman: 1 share = total 4 shares of ₹100.00 (10000 paise)
      const splits = calculateShareSplit(10000, [
        { userId: 'pushkar', sharesCount: 2 },
        { userId: 'rahul', sharesCount: 1 },
        { userId: 'aman', sharesCount: 1 },
      ]);
      expect(splits[0].shareAmountMinor).toBe(5000);
      expect(splits[1].shareAmountMinor).toBe(2500);
      expect(splits[2].shareAmountMinor).toBe(2500);
      expect(splits.reduce((sum, s) => sum + s.shareAmountMinor, 0)).toBe(10000);
    });

    it('handles odd shares without losing any paise', () => {
      const splits = calculateShareSplit(1000, [
        { userId: 'u1', sharesCount: 3 },
        { userId: 'u2', sharesCount: 4 },
      ]);
      expect(splits.reduce((sum, s) => sum + s.shareAmountMinor, 0)).toBe(1000);
    });
  });
});
