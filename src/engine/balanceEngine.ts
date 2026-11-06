import {
  Expense,
  Settlement,
  MemberBalance,
  SuggestedSettlement,
} from '../types';

/**
 * Calculates net balances for all group members across all non-deleted expenses
 * and confirmed settlements.
 *
 * Balance Formula:
 * Net Balance = (Total Paid - Total Shares) + (Settlements Paid) - (Settlements Received)
 *
 * - Positive (> 0): Member is owed money (creditor)
 * - Negative (< 0): Member owes money (debtor)
 * - Zero (= 0): Member is fully settled
 */
export function calculateGroupBalances(
  memberUserIds: string[],
  expenses: Expense[],
  settlements: Settlement[] = []
): Map<string, MemberBalance> {
  const balances = new Map<string, MemberBalance>();

  // Initialize for all known members
  for (const userId of memberUserIds) {
    balances.set(userId, {
      userId,
      totalPaidMinor: 0,
      totalShareMinor: 0,
      netExpenseBalanceMinor: 0,
      netSettlementReceivedMinor: 0,
      netSettlementPaidMinor: 0,
      netBalanceMinor: 0,
    });
  }

  // 1. Process Expenses
  for (const exp of expenses) {
    // Skip soft-deleted expenses
    if (exp.deletedAt) continue;

    // Process Payers
    for (const payer of exp.payers) {
      let b = balances.get(payer.userId);
      if (!b) {
        b = {
          userId: payer.userId,
          totalPaidMinor: 0,
          totalShareMinor: 0,
          netExpenseBalanceMinor: 0,
          netSettlementReceivedMinor: 0,
          netSettlementPaidMinor: 0,
          netBalanceMinor: 0,
        };
        balances.set(payer.userId, b);
      }
      b.totalPaidMinor += payer.paidAmountMinor;
    }

    // Process Splits
    for (const split of exp.splits) {
      let b = balances.get(split.userId);
      if (!b) {
        b = {
          userId: split.userId,
          totalPaidMinor: 0,
          totalShareMinor: 0,
          netExpenseBalanceMinor: 0,
          netSettlementReceivedMinor: 0,
          netSettlementPaidMinor: 0,
          netBalanceMinor: 0,
        };
        balances.set(split.userId, b);
      }
      b.totalShareMinor += split.shareAmountMinor;
    }
  }

  // 2. Process Settlements (ONLY CONFIRMED settlements affect authoritative balances)
  for (const s of settlements) {
    if (s.status !== 'confirmed') continue;

    // Payer gave money away, so their debt decreases (net balance increases)
    let payerBalance = balances.get(s.payerId);
    if (!payerBalance) {
      payerBalance = {
        userId: s.payerId,
        totalPaidMinor: 0,
        totalShareMinor: 0,
        netExpenseBalanceMinor: 0,
        netSettlementReceivedMinor: 0,
        netSettlementPaidMinor: 0,
        netBalanceMinor: 0,
      };
      balances.set(s.payerId, payerBalance);
    }
    payerBalance.netSettlementPaidMinor += s.amountMinor;

    // Receiver received money, so what they are owed decreases (net balance decreases)
    let receiverBalance = balances.get(s.receiverId);
    if (!receiverBalance) {
      receiverBalance = {
        userId: s.receiverId,
        totalPaidMinor: 0,
        totalShareMinor: 0,
        netExpenseBalanceMinor: 0,
        netSettlementReceivedMinor: 0,
        netSettlementPaidMinor: 0,
        netBalanceMinor: 0,
      };
      balances.set(s.receiverId, receiverBalance);
    }
    receiverBalance.netSettlementReceivedMinor += s.amountMinor;
  }

  // 3. Finalize Net Balances
  for (const b of balances.values()) {
    b.netExpenseBalanceMinor = b.totalPaidMinor - b.totalShareMinor;
    b.netBalanceMinor =
      b.netExpenseBalanceMinor + b.netSettlementPaidMinor - b.netSettlementReceivedMinor;
  }

  return balances;
}

/**
 * Verifies that the net balances across the group sum to zero.
 */
export function verifyBalanceConservation(balances: Map<string, MemberBalance>): boolean {
  let sum = 0;
  for (const b of balances.values()) {
    sum += b.netBalanceMinor;
  }
  return sum === 0;
}

interface BalanceNode {
  userId: string;
  amountMinor: number;
}

/**
 * Smart Settlement Algorithm (Greedy Debt Simplification)
 *
 * Minimizes the number of peer-to-peer transactions required to settle all debts.
 * Reconciles strictly with outstanding balances in integer minor units (paise).
 */
export function simplifyDebts(balances: Map<string, MemberBalance>): SuggestedSettlement[] {
  // Separate creditors and debtors
  const creditors: BalanceNode[] = [];
  const debtors: BalanceNode[] = [];

  for (const b of balances.values()) {
    if (b.netBalanceMinor > 0) {
      creditors.push({ userId: b.userId, amountMinor: b.netBalanceMinor });
    } else if (b.netBalanceMinor < 0) {
      debtors.push({ userId: b.userId, amountMinor: Math.abs(b.netBalanceMinor) });
    }
  }

  // Sort descending by amount to minimize transaction count greedily
  creditors.sort((a, b) => b.amountMinor - a.amountMinor);
  debtors.sort((a, b) => b.amountMinor - a.amountMinor);

  const suggested: SuggestedSettlement[] = [];

  let cIndex = 0;
  let dIndex = 0;

  while (cIndex < creditors.length && dIndex < debtors.length) {
    const creditor = creditors[cIndex];
    const debtor = debtors[dIndex];

    // Transfer amount is min of remaining credit and remaining debt
    const transferAmount = Math.min(creditor.amountMinor, debtor.amountMinor);

    if (transferAmount > 0) {
      suggested.push({
        fromUserId: debtor.userId,
        toUserId: creditor.userId,
        amountMinor: transferAmount,
      });

      creditor.amountMinor -= transferAmount;
      debtor.amountMinor -= transferAmount;
    }

    if (creditor.amountMinor === 0) {
      cIndex++;
    }
    if (debtor.amountMinor === 0) {
      dIndex++;
    }
  }

  return suggested;
}

/**
 * Formats minor currency units into human-readable currency strings.
 * e.g. 100050 minor units in INR -> "₹1,000.50"
 */
export function formatCurrency(
  amountMinor: number,
  currency: string = 'INR',
  showSign: boolean = false
): string {
  const isNegative = amountMinor < 0;
  const absAmount = Math.abs(amountMinor) / 100;

  let symbol = '₹';
  if (currency === 'USD') symbol = '$';
  else if (currency === 'EUR') symbol = '€';
  else if (currency === 'GBP') symbol = '£';
  else if (currency === 'AED') symbol = 'AED ';
  else if (currency === 'CAD') symbol = 'CA$';
  else if (currency === 'AUD') symbol = 'A$';

  const formatted = new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(absAmount);

  if (isNegative) {
    return `-${symbol}${formatted}`;
  }
  if (showSign && amountMinor > 0) {
    return `+${symbol}${formatted}`;
  }
  return `${symbol}${formatted}`;
}
