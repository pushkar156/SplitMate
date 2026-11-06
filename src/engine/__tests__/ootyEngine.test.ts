import { describe, it, expect } from 'vitest';
import {
  OOTY_MEMBERS,
  OOTY_PASSWORD,
  calculateOotyBalances,
  simplifyOotyDebts,
  OotyExpense,
  OotySettlement,
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
        date: '2024-11-06',
        paidBy: 'pushkar',
        splitWith: allMemberIds,
        createdAt: '2024-11-06T10:00:00Z',
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
        date: '2024-11-06',
        paidBy: 'pushkar',
        splitWith: allMemberIds,
        createdAt: '2024-11-06T10:00:00Z',
      },
      {
        id: 'exp-2',
        title: 'Dinner',
        amount: 3900,
        category: 'Food & Drinks',
        date: '2024-11-06',
        paidBy: 'jitendra',
        splitWith: allMemberIds,
        createdAt: '2024-11-06T20:00:00Z',
      },
    ];

    // Disha pays Pushkar ₹1000 outside the app
    const settlements: OotySettlement[] = [
      {
        id: 'set-1',
        fromMemberId: 'disha',
        toMemberId: 'pushkar',
        amount: 1000,
        date: '2024-11-06',
        createdAt: '2024-11-06T21:00:00Z',
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
});
