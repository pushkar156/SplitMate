export interface OotyMember {
  id: string;
  name: string;
  avatarColor: string;
  order?: number;
}

export const OOTY_MEMBERS: OotyMember[] = [
  { id: 'pushkar', name: 'Pushkar', avatarColor: '#FF5B42', order: 1 },
  { id: 'jitendra', name: 'Jitendra', avatarColor: '#802C62', order: 2 },
  { id: 'gayatri', name: 'Gayatri', avatarColor: '#FFD749', order: 3 },
  { id: 'pundlik', name: 'Pundlik', avatarColor: '#421454', order: 4 },
  { id: 'surekha', name: 'Surekha', avatarColor: '#FF5B42', order: 5 },
  { id: 'kalpana', name: 'Kalpana', avatarColor: '#802C62', order: 6 },
  { id: 'pradip', name: 'Pradip', avatarColor: '#FFD749', order: 7 },
  { id: 'jyoti', name: 'Jyoti', avatarColor: '#421454', order: 8 },
  { id: 'rajendra', name: 'Rajendra', avatarColor: '#FF5B42', order: 9 },
  { id: 'jayashri', name: 'Jayashri', avatarColor: '#802C62', order: 10 },
  { id: 'disha', name: 'Disha', avatarColor: '#FFD749', order: 11 },
  { id: 'siddhesh', name: 'Siddhesh', avatarColor: '#421454', order: 12 },
  { id: 'raj', name: 'Raj', avatarColor: '#FF5B42', order: 13 },
];

export const OOTY_PASSWORD = '1234567890';

export type OotyCategory =
  | 'Stay'
  | 'Travel & Fuel'
  | 'Food & Drinks'
  | 'Activities'
  | 'Shopping'
  | 'Snacks'
  | 'Miscellaneous';

export const OOTY_CATEGORIES: OotyCategory[] = [
  'Stay',
  'Travel & Fuel',
  'Food & Drinks',
  'Activities',
  'Shopping',
  'Snacks',
  'Miscellaneous',
];

export interface OotyExpense {
  id: string;
  title: string;
  amount: number; // in INR
  category: OotyCategory;
  date: string;
  paidBy: string; // member id
  splitWith: string[]; // member ids involved
  splitDetails?: Record<string, number>; // memberId -> exact owed amount for custom/unequal splits
  notes?: string;
  createdAt: string;
  createdBy?: string;
}

export interface OotySettlement {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number; // in INR
  date: string;
  note?: string;
  createdAt: string;
}

export interface OotyChatMessage {
  id: string;
  senderId: string;
  text: string;
  createdAt: string;
}

export interface MemberBalanceSummary {
  memberId: string;
  name: string;
  avatarColor: string;
  totalPaid: number;
  totalShare: number;
  settlementsPaid: number;
  settlementsReceived: number;
  netBalance: number; // positive = owed money, negative = owes money
}

export interface SimplifiedDebt {
  from: string; // debtor memberId
  fromName: string;
  to: string; // creditor memberId
  toName: string;
  amount: number;
}

export interface PairwiseBalanceItem {
  member: OotyMember;
  amount: number;
  unpaidExpenseCount: number;
  totalExpenseCount: number;
}

export interface GPayUserBalanceSummary {
  owedByYouTotal: number;
  owedToYouTotal: number;
  owedByYouList: PairwiseBalanceItem[];
  owedToYouList: PairwiseBalanceItem[];
  settledList: PairwiseBalanceItem[];
}

export interface PairwiseExpenseRecord {
  id: string;
  expenseId: string;
  title: string;
  date: string;
  createdAt: string;
  share: number;
  isRequestedByYou: boolean; // true = you requested/paid, other owes you; false = other requested/paid, you owe them
  isPaid: boolean;
  category?: string;
  originalExpense: OotyExpense;
}

export interface PairwiseSettlementRecord {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  amount: number;
  date: string;
  createdAt: string;
  note?: string;
  isPaidByYou: boolean; // true = from you to them; false = from them to you
}

export interface GPayPairwiseDetails {
  member: OotyMember;
  netBalance: number; // positive = other owes you, negative = you owe other
  roundedNet: number;
  statusText: string;
  unpaidExpenses: PairwiseExpenseRecord[];
  paidExpenses: PairwiseExpenseRecord[];
  settlements: PairwiseSettlementRecord[];
}

/**
 * Rounds a number to 2 decimal places.
 * If there are fractional or recurring decimals beyond the 2nd decimal place (e.g. 0.333333...),
 * it rounds up (ceiling) to 2 decimal places (e.g. 0.333333 -> 0.34, 38.4615 -> 38.47).
 * Floating-point representation noise (e.g. 38.460000000000005) is cleaned before checking.
 */
export function roundToTwoDecimals(val: number): number {
  if (isNaN(val) || !isFinite(val)) return 0;
  if (val < 0) return -roundToTwoDecimals(-val);
  const clean = Math.round(val * 1000000) / 1000000;
  const scaled = clean * 100;
  const integerPart = Math.floor(scaled);
  const fraction = scaled - integerPart;
  if (fraction > 1e-5) {
    return (integerPart + 1) / 100;
  }
  return integerPart / 100;
}

/**
 * Formats a number to Indian currency format with strictly 2 decimal places (e.g. "38.46", "500.00").
 */
export function formatCurrency(val: number): string {
  const rounded = roundToTwoDecimals(val);
  return rounded.toLocaleString('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

/**
 * Calculates complete pairwise breakdown between the current user and another member:
 * returns exact unpaid expenses, paid expenses, and settlements.
 */
export function getGPayPairwiseDetails(
  currentUserId: string,
  otherMember: OotyMember,
  expenses: OotyExpense[],
  settlements: OotySettlement[] = []
): GPayPairwiseDetails {
  const pairwiseExpenses: PairwiseExpenseRecord[] = [];

  // 1. Gather all direct pairwise expenses
  for (const exp of expenses) {
    if (!exp.amount || exp.amount <= 0 || !exp.splitWith || exp.splitWith.length === 0) continue;
    const splitCount = exp.splitWith.length;
    const defaultShare = roundToTwoDecimals(exp.amount / splitCount);

    const youPaid = exp.paidBy === currentUserId;
    const otherPaid = exp.paidBy === otherMember.id;
    const youIn = exp.splitWith.includes(currentUserId);
    const otherIn = exp.splitWith.includes(otherMember.id);

    if (youPaid && otherIn) {
      // You paid, other owes you their share
      const rawShare = exp.splitDetails?.[otherMember.id] ?? defaultShare;
      const share = roundToTwoDecimals(rawShare);
      pairwiseExpenses.push({
        id: `${exp.id}_${otherMember.id}`,
        expenseId: exp.id,
        title: exp.title,
        date: exp.date,
        createdAt: exp.createdAt || exp.date,
        share,
        isRequestedByYou: true,
        isPaid: false,
        category: exp.category,
        originalExpense: exp,
      });
    } else if (otherPaid && youIn) {
      // Other paid, you owe other your share
      const rawShare = exp.splitDetails?.[currentUserId] ?? defaultShare;
      const share = roundToTwoDecimals(rawShare);
      pairwiseExpenses.push({
        id: `${exp.id}_${currentUserId}`,
        expenseId: exp.id,
        title: exp.title,
        date: exp.date,
        createdAt: exp.createdAt || exp.date,
        share,
        isRequestedByYou: false,
        isPaid: false,
        category: exp.category,
        originalExpense: exp,
      });
    }
  }

  // 2. Gather all direct pairwise settlements
  const pairwiseSettlements: PairwiseSettlementRecord[] = [];
  for (const s of settlements) {
    if (!s.amount || s.amount <= 0) continue;
    const youPaidOther = s.fromMemberId === currentUserId && s.toMemberId === otherMember.id;
    const otherPaidYou = s.fromMemberId === otherMember.id && s.toMemberId === currentUserId;

    if (youPaidOther || otherPaidYou) {
      pairwiseSettlements.push({
        id: s.id,
        fromMemberId: s.fromMemberId,
        toMemberId: s.toMemberId,
        amount: s.amount,
        date: s.date,
        createdAt: s.createdAt || s.date,
        note: s.note,
        isPaidByYou: youPaidOther,
      });
    }
  }

  // 3. Compute Net Balance
  let totalYouOweOther = 0;
  let totalOtherOwesYou = 0;
  for (const item of pairwiseExpenses) {
    if (item.isRequestedByYou) {
      totalOtherOwesYou += item.share;
    } else {
      totalYouOweOther += item.share;
    }
  }

  let settlementsYouPaid = 0;
  let settlementsOtherPaid = 0;
  for (const s of pairwiseSettlements) {
    if (s.isPaidByYou) {
      settlementsYouPaid += s.amount;
    } else {
      settlementsOtherPaid += s.amount;
    }
  }

  const netBalance =
    totalOtherOwesYou - settlementsOtherPaid - (totalYouOweOther - settlementsYouPaid);
  const roundedNet = roundToTwoDecimals(netBalance);

  let statusText = `Settled up with ${otherMember.name}`;
  if (roundedNet < -0.005) {
    statusText = `You owe ${otherMember.name}`;
  } else if (roundedNet > 0.005) {
    statusText = `${otherMember.name} owes you`;
  }

  // 4. Partition expenses into Unpaid vs Paid (chronological for FIFO matching)
  const chronological = [...pairwiseExpenses].sort((a, b) =>
    (a.createdAt || a.date).localeCompare(b.createdAt || b.date)
  );

  const unpaidExpenses: PairwiseExpenseRecord[] = [];
  const paidExpenses: PairwiseExpenseRecord[] = [];

  if (Math.abs(roundedNet) <= 0.005) {
    // Fully settled up: all expenses are paid
    for (const item of chronological) {
      paidExpenses.push({ ...item, isPaid: true });
    }
  } else {
    // Partially or unsettled
    let remainingSettlementCredit = settlementsYouPaid;
    let remainingOtherCredit = settlementsOtherPaid;

    for (const item of chronological) {
      if (!item.isRequestedByYou) {
        // You owe other person for this item
        if (remainingSettlementCredit >= item.share * 0.95) {
          remainingSettlementCredit -= item.share;
          paidExpenses.push({ ...item, isPaid: true });
        } else {
          unpaidExpenses.push({ ...item, isPaid: false });
        }
      } else {
        // Other person owes you for this item
        if (remainingOtherCredit >= item.share * 0.95) {
          remainingOtherCredit -= item.share;
          paidExpenses.push({ ...item, isPaid: true });
        } else {
          unpaidExpenses.push({ ...item, isPaid: false });
        }
      }
    }
  }

  // Sort newest first for UI display
  unpaidExpenses.sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date));
  paidExpenses.sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date));
  pairwiseSettlements.sort((a, b) => (b.createdAt || b.date).localeCompare(a.createdAt || a.date));

  return {
    member: otherMember,
    netBalance,
    roundedNet,
    statusText,
    unpaidExpenses,
    paidExpenses,
    settlements: pairwiseSettlements,
  };
}

/**
 * Calculates exact pairwise balances for the current user
 * ("Owed by you", "X people owe you", and "Settled" view)
 */
export function calculateGPayBalancesForUser(
  currentUserId: string,
  expenses: OotyExpense[],
  settlements: OotySettlement[] = [],
  members: OotyMember[] = OOTY_MEMBERS
): GPayUserBalanceSummary {
  const otherMembers = members.filter((m) => m.id !== currentUserId);

  let owedByYouTotal = 0;
  let owedToYouTotal = 0;
  const owedByYouList: PairwiseBalanceItem[] = [];
  const owedToYouList: PairwiseBalanceItem[] = [];
  const settledList: PairwiseBalanceItem[] = [];

  for (const m of otherMembers) {
    const details = getGPayPairwiseDetails(currentUserId, m, expenses, settlements);

    const item: PairwiseBalanceItem = {
      member: m,
      amount: Math.abs(details.roundedNet),
      unpaidExpenseCount: details.unpaidExpenses.length,
      totalExpenseCount: details.unpaidExpenses.length + details.paidExpenses.length,
    };

    if (details.roundedNet < -0.005) {
      owedByYouTotal += Math.abs(details.roundedNet);
      owedByYouList.push(item);
    } else if (details.roundedNet > 0.005) {
      owedToYouTotal += details.roundedNet;
      owedToYouList.push(item);
    } else {
      settledList.push({ ...item, amount: 0, unpaidExpenseCount: 0 });
    }
  }

  return {
    owedByYouTotal: roundToTwoDecimals(owedByYouTotal),
    owedToYouTotal: roundToTwoDecimals(owedToYouTotal),
    owedByYouList,
    owedToYouList,
    settledList,
  };
}


/**
 * Calculates net balances for all 13 members across all expenses and settlements
 */
export function calculateOotyBalances(
  expenses: OotyExpense[],
  settlements: OotySettlement[] = [],
  members: OotyMember[] = OOTY_MEMBERS
): Record<string, MemberBalanceSummary> {
  const summaries: Record<string, MemberBalanceSummary> = {};

  for (const m of members) {
    summaries[m.id] = {
      memberId: m.id,
      name: m.name,
      avatarColor: m.avatarColor,
      totalPaid: 0,
      totalShare: 0,
      settlementsPaid: 0,
      settlementsReceived: 0,
      netBalance: 0,
    };
  }

  // 1. Process Expenses
  for (const exp of expenses) {
    if (!exp.amount || exp.amount <= 0) continue;
    const splitCount = exp.splitWith.length;
    if (splitCount === 0) continue;

    // Credit the payer
    if (summaries[exp.paidBy]) {
      summaries[exp.paidBy].totalPaid += exp.amount;
    }

    // Debit the participants (supports unequal/custom splits)
    const defaultShare = roundToTwoDecimals(exp.amount / splitCount);
    for (const participantId of exp.splitWith) {
      if (summaries[participantId]) {
        const participantShare = roundToTwoDecimals(exp.splitDetails?.[participantId] ?? defaultShare);
        summaries[participantId].totalShare += participantShare;
      }
    }
  }

  // 2. Process Settlements
  for (const set of settlements) {
    if (!set.amount || set.amount <= 0) continue;
    if (summaries[set.fromMemberId]) {
      summaries[set.fromMemberId].settlementsPaid += roundToTwoDecimals(set.amount);
    }
    if (summaries[set.toMemberId]) {
      summaries[set.toMemberId].settlementsReceived += roundToTwoDecimals(set.amount);
    }
  }

  // 3. Compute Net Balance
  // Net Balance = (Total Paid - Total Share) + Settlements Paid - Settlements Received
  for (const m of members) {
    const s = summaries[m.id];
    s.totalPaid = roundToTwoDecimals(s.totalPaid);
    s.totalShare = roundToTwoDecimals(s.totalShare);
    s.settlementsPaid = roundToTwoDecimals(s.settlementsPaid);
    s.settlementsReceived = roundToTwoDecimals(s.settlementsReceived);
    s.netBalance = roundToTwoDecimals(
      (s.totalPaid - s.totalShare) + s.settlementsPaid - s.settlementsReceived
    );
  }

  return summaries;
}

/**
 * Greedy minimum cash flow debt simplification algorithm
 */
export function simplifyOotyDebts(
  balances: Record<string, MemberBalanceSummary>
): SimplifiedDebt[] {
  interface DebtNode {
    id: string;
    name: string;
    balance: number;
  }

  const debtors: DebtNode[] = [];
  const creditors: DebtNode[] = [];

  for (const s of Object.values(balances)) {
    // Round to avoid floating point issues
    const bal = roundToTwoDecimals(s.netBalance);
    if (bal < -0.005) {
      debtors.push({ id: s.memberId, name: s.name, balance: -bal }); // positive amount owed
    } else if (bal > 0.005) {
      creditors.push({ id: s.memberId, name: s.name, balance: bal });
    }
  }

  debtors.sort((a, b) => b.balance - a.balance);
  creditors.sort((a, b) => b.balance - a.balance);

  const simplified: SimplifiedDebt[] = [];
  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    const settleAmount = Math.min(debtor.balance, creditor.balance);
    const roundedAmount = roundToTwoDecimals(settleAmount);

    if (roundedAmount > 0.005) {
      simplified.push({
        from: debtor.id,
        fromName: debtor.name,
        to: creditor.id,
        toName: creditor.name,
        amount: roundedAmount,
      });
    }

    debtor.balance = roundToTwoDecimals(debtor.balance - settleAmount);
    creditor.balance = roundToTwoDecimals(creditor.balance - settleAmount);

    if (debtor.balance < 0.005) dIdx++;
    if (creditor.balance < 0.005) cIdx++;
  }

  return simplified;
}
