import { describe, it, expect } from 'vitest';
import {
  calculateGroupBalances,
  verifyBalanceConservation,
  simplifyDebts,
} from '../balanceEngine';
import {
  calculateEqualSplit,
  calculateExactSplit,
  calculatePercentageSplit,
} from '../splitCalculator';
import { Expense, Settlement } from '../../types';

describe('balanceEngine Unit Tests', () => {
  it('correctly calculates basic 4-person equal split from example', () => {
    const members = ['Pushkar', 'Rahul', 'Aman', 'Rohan'];
    // Pushkar pays ₹1,000 (100,000 paise) for dinner, split equally among all 4
    const expense: Expense = {
      id: 'exp-1',
      groupId: 'grp-1',
      title: 'Dinner',
      amountMinor: 100000,
      currency: 'INR',
      category: 'Food & Dining',
      expenseDate: '2026-11-01',
      createdBy: 'Pushkar',
      createdAt: '2026-11-01T12:00:00Z',
      updatedAt: '2026-11-01T12:00:00Z',
      payers: [{ userId: 'Pushkar', paidAmountMinor: 100000 }],
      splits: calculateEqualSplit(100000, members),
    };

    const balances = calculateGroupBalances(members, [expense]);

    expect(verifyBalanceConservation(balances)).toBe(true);
    expect(balances.get('Pushkar')?.netBalanceMinor).toBe(75000); // +₹750
    expect(balances.get('Rahul')?.netBalanceMinor).toBe(-25000); // -₹250
    expect(balances.get('Aman')?.netBalanceMinor).toBe(-25000); // -₹250
    expect(balances.get('Rohan')?.netBalanceMinor).toBe(-25000); // -₹250

    const suggestions = simplifyDebts(balances);
    expect(suggestions).toHaveLength(3);
    const totalSuggestedToPushkar = suggestions
      .filter((s) => s.toUserId === 'Pushkar')
      .reduce((sum, s) => sum + s.amountMinor, 0);
    expect(totalSuggestedToPushkar).toBe(75000);
  });

  describe('Comprehensive 13-Person Trip Scenario', () => {
    const members = [
      'Aarav', 'Diya', 'Ishaan', 'Ananya', 'Rohan',
      'Kavya', 'Aditya', 'Meera', 'Kabir', 'Tanvi',
      'Vivaan', 'Sanya', 'Arjun'
    ];

    it('executes full 10-step lifecycle and maintains strict mathematical consistency', () => {
      const expenses: Expense[] = [];
      const settlements: Settlement[] = [];

      // 1. One member (Aarav) paying for transport: ₹26,000 split equally among all 13 (₹2,000 each)
      const exp1Amount = 2600000;
      expenses.push({
        id: 'exp-1-transport',
        groupId: 'grp-trip',
        title: 'Tempo Traveller Transport',
        amountMinor: exp1Amount,
        currency: 'INR',
        category: 'Transport',
        expenseDate: '2026-11-01',
        createdBy: 'Aarav',
        createdAt: '2026-11-01T08:00:00Z',
        updatedAt: '2026-11-01T08:00:00Z',
        payers: [{ userId: 'Aarav', paidAmountMinor: exp1Amount }],
        splits: calculateEqualSplit(exp1Amount, members),
      });

      // 2. Another member (Diya) paying for accommodation: ₹52,000 split equally among all 13 (₹4,000 each)
      const exp2Amount = 5200000;
      expenses.push({
        id: 'exp-2-resort',
        groupId: 'grp-trip',
        title: 'Resort Stay 2 Nights',
        amountMinor: exp2Amount,
        currency: 'INR',
        category: 'Accommodation',
        expenseDate: '2026-11-01',
        createdBy: 'Diya',
        createdAt: '2026-11-01T12:00:00Z',
        updatedAt: '2026-11-01T12:00:00Z',
        payers: [{ userId: 'Diya', paidAmountMinor: exp2Amount }],
        splits: calculateEqualSplit(exp2Amount, members),
      });

      // 3. A meal split among all 13: Ishaan pays ₹6,500
      const exp3Amount = 650000;
      expenses.push({
        id: 'exp-3-breakfast',
        groupId: 'grp-trip',
        title: 'Highway Dhaba Breakfast',
        amountMinor: exp3Amount,
        currency: 'INR',
        category: 'Food & Dining',
        expenseDate: '2026-11-02',
        createdBy: 'Ishaan',
        createdAt: '2026-11-02T09:00:00Z',
        updatedAt: '2026-11-02T09:00:00Z',
        payers: [{ userId: 'Ishaan', paidAmountMinor: exp3Amount }],
        splits: calculateEqualSplit(exp3Amount, members),
      });

      // 4. A dinner split among only 8 members: Ananya pays ₹8,000 split among 8 members
      const dinnerSubset = members.slice(0, 8);
      const exp4Amount = 800000;
      expenses.push({
        id: 'exp-4-cafe',
        groupId: 'grp-trip',
        title: 'Specialty Cafe Dinner',
        amountMinor: exp4Amount,
        currency: 'INR',
        category: 'Food & Dining',
        expenseDate: '2026-11-02',
        createdBy: 'Ananya',
        createdAt: '2026-11-02T20:00:00Z',
        updatedAt: '2026-11-02T20:00:00Z',
        payers: [{ userId: 'Ananya', paidAmountMinor: exp4Amount }],
        splits: calculateEqualSplit(exp4Amount, dinnerSubset),
      });

      // 5. An expense paid by two members: Rohan (₹3,000) and Kavya (₹2,000) pay ₹5,000 for groceries
      const exp5Amount = 500000;
      expenses.push({
        id: 'exp-5-groceries',
        groupId: 'grp-trip',
        title: 'Villa Snacks & Beverages',
        amountMinor: exp5Amount,
        currency: 'INR',
        category: 'Groceries',
        expenseDate: '2026-11-03',
        createdBy: 'Rohan',
        createdAt: '2026-11-03T11:00:00Z',
        updatedAt: '2026-11-03T11:00:00Z',
        payers: [
          { userId: 'Rohan', paidAmountMinor: 300000 },
          { userId: 'Kavya', paidAmountMinor: 200000 },
        ],
        splits: calculateEqualSplit(exp5Amount, members),
      });

      // 6. A custom percentage split: Aditya pays ₹10,000 for water sports, split among 4 people
      const exp6Amount = 1000000;
      const exp6Splits = calculatePercentageSplit(exp6Amount, [
        { userId: 'Aditya', percentage: 40 },
        { userId: 'Meera', percentage: 30 },
        { userId: 'Kabir', percentage: 20 },
        { userId: 'Tanvi', percentage: 10 },
      ]);
      expenses.push({
        id: 'exp-6-watersports',
        groupId: 'grp-trip',
        title: 'Scuba & Jet Skiing',
        amountMinor: exp6Amount,
        currency: 'INR',
        category: 'Activities',
        expenseDate: '2026-11-03',
        createdBy: 'Aditya',
        createdAt: '2026-11-03T15:00:00Z',
        updatedAt: '2026-11-03T15:00:00Z',
        payers: [{ userId: 'Aditya', paidAmountMinor: exp6Amount }],
        splits: exp6Splits,
      });

      // 7. An exact amount split: Vivaan pays ₹4,500 for souvenir gifts
      const exp7Amount = 450000;
      const exp7Splits = calculateExactSplit(exp7Amount, [
        { userId: 'Vivaan', amountMinor: 200000 },
        { userId: 'Sanya', amountMinor: 150000 },
        { userId: 'Arjun', amountMinor: 100000 },
      ]);
      expenses.push({
        id: 'exp-7-souvenirs',
        groupId: 'grp-trip',
        title: 'Handicraft Gifts',
        amountMinor: exp7Amount,
        currency: 'INR',
        category: 'Shopping',
        expenseDate: '2026-11-04',
        createdBy: 'Vivaan',
        createdAt: '2026-11-04T12:00:00Z',
        updatedAt: '2026-11-04T12:00:00Z',
        payers: [{ userId: 'Vivaan', paidAmountMinor: exp7Amount }],
        splits: exp7Splits,
      });

      // Verify intermediate balances sum to zero before settlements
      let b1 = calculateGroupBalances(members, expenses, settlements);
      expect(verifyBalanceConservation(b1)).toBe(true);

      // Verify each expense: sum of payers == amount, sum of splits == amount
      for (const exp of expenses) {
        const sumPayers = exp.payers.reduce((sum, p) => sum + p.paidAmountMinor, 0);
        const sumSplits = exp.splits.reduce((sum, s) => sum + s.shareAmountMinor, 0);
        expect(sumPayers).toBe(exp.amountMinor);
        expect(sumSplits).toBe(exp.amountMinor);
      }

      // 8. A pending settlement: Arjun sends Aarav ₹1,000 (pending confirmation)
      settlements.push({
        id: 'set-1-pending',
        groupId: 'grp-trip',
        payerId: 'Arjun',
        receiverId: 'Aarav',
        amountMinor: 100000,
        status: 'pending',
        note: 'UPI ref 12345',
        createdAt: '2026-11-04T14:00:00Z',
      });

      // Verify pending settlement does NOT affect authoritative balances!
      const bPending = calculateGroupBalances(members, expenses, settlements);
      expect(bPending.get('Arjun')?.netBalanceMinor).toBe(b1.get('Arjun')?.netBalanceMinor);
      expect(bPending.get('Aarav')?.netBalanceMinor).toBe(b1.get('Aarav')?.netBalanceMinor);

      // 9. A confirmed settlement: Arjun sends Diya ₹2,000 (confirmed)
      settlements.push({
        id: 'set-2-confirmed',
        groupId: 'grp-trip',
        payerId: 'Arjun',
        receiverId: 'Diya',
        amountMinor: 200000,
        status: 'confirmed',
        note: 'UPI payment',
        createdAt: '2026-11-04T15:00:00Z',
        confirmedAt: '2026-11-04T15:30:00Z',
        confirmedBy: 'Diya',
      });

      const bConfirmed = calculateGroupBalances(members, expenses, settlements);
      expect(verifyBalanceConservation(bConfirmed)).toBe(true);
      // Arjun's net balance increased by 200000 (less negative)
      expect(bConfirmed.get('Arjun')?.netBalanceMinor).toBe(
        (b1.get('Arjun')?.netBalanceMinor ?? 0) + 200000
      );
      // Diya's net balance decreased by 200000 (less positive)
      expect(bConfirmed.get('Diya')?.netBalanceMinor).toBe(
        (b1.get('Diya')?.netBalanceMinor ?? 0) - 200000
      );

      // 10. An edited expense: Edit Highway Dhaba Breakfast from ₹6,500 to ₹7,800
      const newExp3Amount = 780000;
      expenses[2] = {
        ...expenses[2],
        amountMinor: newExp3Amount,
        payers: [{ userId: 'Ishaan', paidAmountMinor: newExp3Amount }],
        splits: calculateEqualSplit(newExp3Amount, members),
        updatedAt: '2026-11-04T16:00:00Z',
      };

      const finalBalances = calculateGroupBalances(members, expenses, settlements);

      // Final Verifications
      // a. Balances conserve to zero
      expect(verifyBalanceConservation(finalBalances)).toBe(true);

      // b. Check debt simplification algorithm
      const suggestedSettlements = simplifyDebts(finalBalances);

      // Verify that no self-transfers exist
      for (const s of suggestedSettlements) {
        expect(s.fromUserId).not.toBe(s.toUserId);
        expect(s.amountMinor).toBeGreaterThan(0);
      }

      // Verify total debts suggested equals total positive balances
      const totalCredited = Array.from(finalBalances.values())
        .filter((b) => b.netBalanceMinor > 0)
        .reduce((sum, b) => sum + b.netBalanceMinor, 0);

      const totalDebted = Array.from(finalBalances.values())
        .filter((b) => b.netBalanceMinor < 0)
        .reduce((sum, b) => sum + Math.abs(b.netBalanceMinor), 0);

      const totalSuggested = suggestedSettlements.reduce((sum, s) => sum + s.amountMinor, 0);

      expect(totalCredited).toBe(totalDebted);
      expect(totalSuggested).toBe(totalCredited);

      // Verify number of simplified transactions is strictly less than or equal to (members - 1)
      expect(suggestedSettlements.length).toBeLessThanOrEqual(members.length - 1);
    });
  });
});

