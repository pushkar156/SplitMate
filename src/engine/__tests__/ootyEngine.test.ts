import { describe, it, expect } from 'vitest';
import {
  OOTY_MEMBERS,
  OOTY_PASSWORD,
  calculateOotyBalances,
  calculateGPayBalancesForUser,
  simplifyOotyDebts,
  OotyExpense,
  OotySettlement,
  getGPayPairwiseDetails,
  roundToTwoDecimals,
  formatCurrency,
} from '../../types/ooty';

describe('Ooty Trip 13 Members & Engine', () => {
  it('contains exactly the 13 specified travelers', () => {
    const expectedNames = [
      'Pushkar',
      'Jitendra',
      'Gayatri',
      'Pundlik',
      'Surekha',
      'Kalpana',
      'Pradip',
      'Jyoti',
      'Rajendra',
      'Jayashri',
      'Disha',
      'Siddhesh',
      'Raj',
    ];

    expect(OOTY_MEMBERS).toHaveLength(13);
    const actualNames = OOTY_MEMBERS.map((m) => m.name);
    expect(actualNames).toEqual(expectedNames);
  });

  it('uses the global trip password 1234567890', () => {
    expect(OOTY_PASSWORD).toBe('1234567890');
  });

  it('correctly calculates balances when an expense is split among all 13 travelers', () => {
    const allMemberIds = OOTY_MEMBERS.map((m) => m.id);

    // Pushkar pays 13,000 for stay, split equally among all 13
    const expenses: OotyExpense[] = [
      {
        id: 'exp-1',
        title: 'Ooty Villa Stay',
        amount: 13000,
        category: 'Stay',
        date: '2026-11-06',
        paidBy: 'pushkar',
        splitWith: allMemberIds,
        createdAt: '2026-11-06T10:00:00Z',
      },
    ];

    const balances = calculateOotyBalances(expenses, []);

    // Pushkar paid 13,000, his share is 1,000 -> net balance = +12,000
    expect(balances['pushkar'].totalPaid).toBe(13000);
    expect(balances['pushkar'].totalShare).toBe(1000);
    expect(balances['pushkar'].netBalance).toBe(12000);

    // Jitendra paid 0, his share is 1,000 -> net balance = -1,000
    expect(balances['jitendra'].totalPaid).toBe(0);
    expect(balances['jitendra'].totalShare).toBe(1000);
    expect(balances['jitendra'].netBalance).toBe(-1000);

    // Sum of all net balances must be zero
    const sumNet = Object.values(balances).reduce((sum, b) => sum + b.netBalance, 0);
    expect(Math.abs(sumNet)).toBeLessThan(0.01);
  });

  it('simplifies debts correctly across multiple expenses and settlements', () => {
    const allMemberIds = OOTY_MEMBERS.map((m) => m.id);

    const expenses: OotyExpense[] = [
      {
        id: 'exp-1',
        title: 'Stay',
        amount: 13000,
        category: 'Stay',
        date: '2026-11-06',
        paidBy: 'pushkar',
        splitWith: allMemberIds,
        createdAt: '2026-11-06T10:00:00Z',
      },
      {
        id: 'exp-2',
        title: 'Dinner',
        amount: 3900,
        category: 'Food & Drinks',
        date: '2026-11-06',
        paidBy: 'jitendra',
        splitWith: allMemberIds,
        createdAt: '2026-11-06T20:00:00Z',
      },
    ];

    // Disha pays Pushkar ₹1000 outside the app
    const settlements: OotySettlement[] = [
      {
        id: 'set-1',
        fromMemberId: 'disha',
        toMemberId: 'pushkar',
        amount: 1000,
        date: '2026-11-06',
        createdAt: '2026-11-06T21:00:00Z',
      },
    ];

    const balances = calculateOotyBalances(expenses, settlements);
    const simplified = simplifyOotyDebts(balances);

    expect(simplified.length).toBeGreaterThan(0);
    // Every simplified debt has from != to and amount > 0
    for (const d of simplified) {
      expect(d.from).not.toBe(d.to);
      expect(d.amount).toBeGreaterThan(0);
    }
  });

  it('computes exact dual balances for the user', () => {
    // Pushkar paid 1,300 split among 13 members (100 each)
    const allIds = OOTY_MEMBERS.map((m) => m.id);
    const expenses: OotyExpense[] = [
      {
        id: 'exp-1',
        title: 'Lunch',
        amount: 1300,
        category: 'Food & Drinks',
        date: '2026-11-06',
        paidBy: 'pushkar',
        splitWith: allIds,
        createdAt: '2026-11-06T12:00:00Z',
      },
    ];

    // From Pushkar's perspective:
    // Owed by you: 0
    // Owed to you: 1,200 (12 members * 100)
    const pushkarGPay = calculateGPayBalancesForUser('pushkar', expenses, []);
    expect(pushkarGPay.owedByYouTotal).toBe(0);
    expect(pushkarGPay.owedToYouTotal).toBe(1200);
    expect(pushkarGPay.owedToYouList.length).toBe(12);
    expect(pushkarGPay.owedByYouList.length).toBe(0);

    // From Jitendra's perspective:
    // Owed by you: 100 (to Pushkar)
    // Owed to you: 0
    const jitendraGPay = calculateGPayBalancesForUser('jitendra', expenses, []);
    expect(jitendraGPay.owedByYouTotal).toBe(100);
    expect(jitendraGPay.owedToYouTotal).toBe(0);
    expect(jitendraGPay.owedByYouList.length).toBe(1);
    expect(jitendraGPay.owedByYouList[0].member.id).toBe('pushkar');
    expect(jitendraGPay.owedByYouList[0].amount).toBe(100);
  });

  it('correctly handles unequal custom splits (splitDetails)', () => {
    // Pushkar paid 1000 for dinner: Pushkar owes 500, Jitendra owes 300, Siddhesh owes 200
    const expenses: OotyExpense[] = [
      {
        id: 'exp-custom',
        title: 'Special Dinner',
        amount: 1000,
        category: 'Food & Drinks',
        date: '2026-11-06',
        paidBy: 'pushkar',
        splitWith: ['pushkar', 'jitendra', 'siddhesh'],
        splitDetails: {
          pushkar: 500,
          jitendra: 300,
          siddhesh: 200,
        },
        createdAt: '2026-11-06T19:00:00Z',
      },
    ];

    const balances = calculateOotyBalances(expenses, []);
    expect(balances['pushkar'].totalPaid).toBe(1000);
    expect(balances['pushkar'].totalShare).toBe(500);
    expect(balances['pushkar'].netBalance).toBe(500);

    expect(balances['jitendra'].totalShare).toBe(300);
    expect(balances['jitendra'].netBalance).toBe(-300);

    expect(balances['siddhesh'].totalShare).toBe(200);
    expect(balances['siddhesh'].netBalance).toBe(-200);

    // GPay perspective for Pushkar
    const pushkarGPay = calculateGPayBalancesForUser('pushkar', expenses, []);
    expect(pushkarGPay.owedToYouTotal).toBe(500); // 300 from Jitendra + 200 from Siddhesh
    const jitOwed = pushkarGPay.owedToYouList.find((item) => item.member.id === 'jitendra');
    expect(jitOwed?.amount).toBe(300);
    const sidOwed = pushkarGPay.owedToYouList.find((item) => item.member.id === 'siddhesh');
    expect(sidOwed?.amount).toBe(200);
  });

  it('correctly provides pairwise expense breakdown (unpaid vs paid/settled)', () => {
    const jitendra = OOTY_MEMBERS.find((m) => m.id === 'jitendra')!;

    // Scenario: 4 expenses between Pushkar and Jitendra
    // 1. Pushkar paid 240 for shwrma (Jitendra owes 120)
    // 2. Jitendra paid 170.80 for split (Pushkar owes 85.40)
    // 3. Jitendra paid 248.20 for split (Pushkar owes 124.10)
    // 4. Pushkar paid 84 for ice cream (Jitendra owes 42)
    // Total Pushkar owes Jitendra: 85.40 + 124.10 = 209.50
    // Total Jitendra owes Pushkar: 120 + 42 = 162
    // Net: Pushkar owes Jitendra 47.50
    const expenses: OotyExpense[] = [
      {
        id: 'exp-1',
        title: 'shwrma',
        amount: 240,
        category: 'Food & Drinks',
        date: '2026-11-02',
        paidBy: 'pushkar',
        splitWith: ['pushkar', 'jitendra'],
        createdAt: '2026-11-02T12:00:00Z',
      },
      {
        id: 'exp-2',
        title: 'Split request',
        amount: 170.8,
        category: 'Food & Drinks',
        date: '2026-11-01',
        paidBy: 'jitendra',
        splitWith: ['pushkar', 'jitendra'],
        createdAt: '2026-11-01T15:00:00Z',
      },
      {
        id: 'exp-3',
        title: 'Split request',
        amount: 248.2,
        category: 'Food & Drinks',
        date: '2026-10-18',
        paidBy: 'jitendra',
        splitWith: ['pushkar', 'jitendra'],
        createdAt: '2026-10-18T18:00:00Z',
      },
      {
        id: 'exp-4',
        title: 'ice cream',
        amount: 84,
        category: 'Food & Drinks',
        date: '2026-10-11',
        paidBy: 'pushkar',
        splitWith: ['pushkar', 'jitendra'],
        createdAt: '2026-10-11T21:00:00Z',
      },
    ];

    // 1. Before Settlement:
    const beforeDetails = getGPayPairwiseDetails('pushkar', jitendra, expenses, []);
    expect(beforeDetails.roundedNet).toBe(-47.5);
    expect(beforeDetails.statusText).toBe('You owe Jitendra');
    expect(beforeDetails.unpaidExpenses).toHaveLength(4);
    expect(beforeDetails.paidExpenses).toHaveLength(0);

    // 2. After Pushkar pays 47.50 to Jitendra (Settle Up):
    const settlement: OotySettlement = {
      id: 'set-1',
      fromMemberId: 'pushkar',
      toMemberId: 'jitendra',
      amount: 47.5,
      date: '2026-11-07',
      createdAt: '2026-11-07T10:00:00Z',
      note: 'Settlement',
    };

    const afterDetails = getGPayPairwiseDetails('pushkar', jitendra, expenses, [settlement]);
    expect(afterDetails.roundedNet).toBe(0);
    expect(afterDetails.statusText).toBe('Settled up with Jitendra');
    expect(afterDetails.unpaidExpenses).toHaveLength(0);
    expect(afterDetails.paidExpenses).toHaveLength(4);
    expect(afterDetails.settlements).toHaveLength(1);
    expect(afterDetails.settlements[0].amount).toBe(47.5);
  });

  describe('Currency & Float Rounding (2 decimal places & recursive rounding up)', () => {
    it('rounds recursive fractions up to 2 decimal places (e.g. .333333 -> .34)', () => {
      expect(roundToTwoDecimals(0.333333)).toBe(0.34);
      expect(roundToTwoDecimals(1 / 3)).toBe(0.34);
      expect(roundToTwoDecimals(100 / 3)).toBe(33.34);
      expect(roundToTwoDecimals(500 / 13)).toBe(38.47);
    });

    it('preserves exact 2 decimal values without unintended rounding', () => {
      expect(roundToTwoDecimals(38.46)).toBe(38.46);
      expect(roundToTwoDecimals(50.0)).toBe(50.0);
      expect(roundToTwoDecimals(0)).toBe(0);
      expect(roundToTwoDecimals(114.2)).toBe(114.2);
    });

    it('formats strictly to 2 decimal places with formatCurrency', () => {
      expect(formatCurrency(0.333333)).toBe('0.34');
      expect(formatCurrency(38.46)).toBe('38.46');
      expect(formatCurrency(500)).toBe('500.00');
      expect(formatCurrency(0)).toBe('0.00');
      expect(formatCurrency(12500.5)).toBe('12,500.50');
    });
  });
});

