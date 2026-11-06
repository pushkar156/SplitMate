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

    // Debit the participants
    const sharePerPerson = exp.amount / splitCount;
    for (const participantId of exp.splitWith) {
      if (summaries[participantId]) {
        summaries[participantId].totalShare += sharePerPerson;
      }
    }
  }

  // 2. Process Settlements
  for (const set of settlements) {
    if (!set.amount || set.amount <= 0) continue;
    if (summaries[set.fromMemberId]) {
      summaries[set.fromMemberId].settlementsPaid += set.amount;
    }
    if (summaries[set.toMemberId]) {
      summaries[set.toMemberId].settlementsReceived += set.amount;
    }
  }

  // 3. Compute Net Balance
  // Net Balance = (Total Paid - Total Share) + Settlements Paid - Settlements Received
  for (const m of members) {
    const s = summaries[m.id];
    s.netBalance =
      Math.round(
        ((s.totalPaid - s.totalShare) + s.settlementsPaid - s.settlementsReceived) * 100
      ) / 100;
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
    const bal = Math.round(s.netBalance * 100) / 100;
    if (bal < -0.5) {
      debtors.push({ id: s.memberId, name: s.name, balance: -bal }); // positive amount owed
    } else if (bal > 0.5) {
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
    const roundedAmount = Math.round(settleAmount);

    if (roundedAmount > 0) {
      simplified.push({
        from: debtor.id,
        fromName: debtor.name,
        to: creditor.id,
        toName: creditor.name,
        amount: roundedAmount,
      });
    }

    debtor.balance -= settleAmount;
    creditor.balance -= settleAmount;

    if (debtor.balance < 0.5) dIdx++;
    if (creditor.balance < 0.5) cIdx++;
  }

  return simplified;
}
