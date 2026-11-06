export type CurrencyCode = 'INR' | 'USD' | 'EUR' | 'GBP' | 'AED' | 'CAD' | 'AUD' | 'SGD';

export interface UserProfile {
  id: string;
  fullName: string;
  avatarUrl?: string | null;
  email?: string;
  createdAt?: string;
  updatedAt?: string;
}

export type GroupType = 'trip' | 'home' | 'couple' | 'event' | 'other';
export type MemberRole = 'admin' | 'member';

export interface GroupMember {
  id: string;
  groupId: string;
  userId: string;
  role: MemberRole;
  joinedAt: string;
  profile: UserProfile;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  groupType: GroupType;
  currency: CurrencyCode;
  createdBy: string;
  archivedAt?: string | null;
  createdAt: string;
  updatedAt: string;
  members?: GroupMember[];
}

export type SplitMethod = 'equal' | 'exact' | 'percentage' | 'shares';

export type ExpenseCategory =
  | 'Food & Dining'
  | 'Transport'
  | 'Accommodation'
  | 'Shopping'
  | 'Activities'
  | 'Groceries'
  | 'Fuel'
  | 'Entertainment'
  | 'Utilities'
  | 'Other';

export interface ExpensePayer {
  id?: string;
  expenseId?: string;
  userId: string;
  paidAmountMinor: number; // in integer minor units (e.g. paise / cents)
}

export interface ExpenseSplit {
  id?: string;
  expenseId?: string;
  userId: string;
  shareAmountMinor: number; // in integer minor units
  splitType: SplitMethod;
}

export interface Expense {
  id: string;
  groupId: string;
  title: string;
  description?: string;
  amountMinor: number; // integer minor units
  currency: CurrencyCode;
  category: ExpenseCategory;
  expenseDate: string; // YYYY-MM-DD
  createdBy: string;
  receiptUrl?: string | null;
  createdAt: string;
  updatedAt: string;
  deletedAt?: string | null;
  payers: ExpensePayer[];
  splits: ExpenseSplit[];
}

export type SettlementStatus = 'recorded' | 'pending' | 'confirmed' | 'rejected';

export interface Settlement {
  id: string;
  groupId: string;
  payerId: string;
  receiverId: string;
  amountMinor: number;
  status: SettlementStatus;
  note?: string | null;
  paymentReference?: string | null;
  createdAt: string;
  confirmedAt?: string | null;
  confirmedBy?: string | null;
  payerProfile?: UserProfile;
  receiverProfile?: UserProfile;
}

export interface ActivityLog {
  id: string;
  groupId: string;
  actorId: string;
  action: string;
  entityType: string;
  entityId: string;
  metadata?: Record<string, unknown>;
  createdAt: string;
  actorProfile?: UserProfile;
}

// Engine balance & settlement models
export interface MemberBalance {
  userId: string;
  totalPaidMinor: number;
  totalShareMinor: number;
  netExpenseBalanceMinor: number; // totalPaidMinor - totalShareMinor
  netSettlementReceivedMinor: number; // confirmed received from others
  netSettlementPaidMinor: number; // confirmed paid to others
  netBalanceMinor: number; // netExpenseBalanceMinor - netSettlementReceivedMinor + netSettlementPaidMinor
}

export interface SuggestedSettlement {
  fromUserId: string;
  toUserId: string;
  amountMinor: number;
}

