import {
  Group,
  Expense,
  Settlement,
  ActivityLog,
  UserProfile,
  SplitMethod,
  ExpenseCategory,
  CurrencyCode,
  GroupType,
} from '../types';
import { isSupabaseConfigured, supabase } from '../lib/supabase';
import {
  DEMO_USERS,
  DEMO_CURRENT_USER,
  DEMO_GROUPS,
  DEMO_EXPENSES,
  DEMO_SETTLEMENTS,
  DEMO_ACTIVITY,
} from './mockData';

// Local storage keys for persistent demo/offline changes
const STORAGE_KEY_GROUPS = 'splitmate_groups_v1';
const STORAGE_KEY_EXPENSES = 'splitmate_expenses_v1';
const STORAGE_KEY_SETTLEMENTS = 'splitmate_settlements_v1';
const STORAGE_KEY_ACTIVITY = 'splitmate_activity_v1';
const STORAGE_KEY_CURRENT_USER = 'splitmate_current_user_v1';

class DataService {
  private memoryGroups: Group[];
  private memoryExpenses: Expense[];
  private memorySettlements: Settlement[];
  private memoryActivity: ActivityLog[];
  private currentUser: UserProfile;

  constructor() {
    // Initialize from localStorage or fallback to defaults
    try {
      const storedUser = localStorage.getItem(STORAGE_KEY_CURRENT_USER);
      this.currentUser = storedUser ? JSON.parse(storedUser) : DEMO_CURRENT_USER;

      const storedGroups = localStorage.getItem(STORAGE_KEY_GROUPS);
      this.memoryGroups = storedGroups ? JSON.parse(storedGroups) : DEMO_GROUPS;

      const storedExpenses = localStorage.getItem(STORAGE_KEY_EXPENSES);
      this.memoryExpenses = storedExpenses ? JSON.parse(storedExpenses) : DEMO_EXPENSES;

      const storedSettlements = localStorage.getItem(STORAGE_KEY_SETTLEMENTS);
      this.memorySettlements = storedSettlements ? JSON.parse(storedSettlements) : DEMO_SETTLEMENTS;

      const storedActivity = localStorage.getItem(STORAGE_KEY_ACTIVITY);
      this.memoryActivity = storedActivity ? JSON.parse(storedActivity) : DEMO_ACTIVITY;
    } catch {
      this.currentUser = DEMO_CURRENT_USER;
      this.memoryGroups = DEMO_GROUPS;
      this.memoryExpenses = DEMO_EXPENSES;
      this.memorySettlements = DEMO_SETTLEMENTS;
      this.memoryActivity = DEMO_ACTIVITY;
    }
  }

  private persistLocal() {
    try {
      localStorage.setItem(STORAGE_KEY_GROUPS, JSON.stringify(this.memoryGroups));
      localStorage.setItem(STORAGE_KEY_EXPENSES, JSON.stringify(this.memoryExpenses));
      localStorage.setItem(STORAGE_KEY_SETTLEMENTS, JSON.stringify(this.memorySettlements));
      localStorage.setItem(STORAGE_KEY_ACTIVITY, JSON.stringify(this.memoryActivity));
      localStorage.setItem(STORAGE_KEY_CURRENT_USER, JSON.stringify(this.currentUser));
    } catch (e) {
      console.warn('Failed to persist to localStorage', e);
    }
  }

  // --- Auth & Profile ---
  getCurrentUser(): UserProfile {
    return this.currentUser;
  }

  setCurrentUser(user: UserProfile) {
    this.currentUser = user;
    this.persistLocal();
  }

  getAllUsers(): UserProfile[] {
    return DEMO_USERS;
  }

  // --- Groups ---
  async getGroups(): Promise<Group[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('groups')
        .select(`
          *,
          members:group_members(
            id,
            group_id,
            user_id,
            role,
            joined_at,
            profile:profiles(*)
          )
        `)
        .is('archived_at', null)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Supabase getGroups error:', error);
      } else if (data) {
        return data as unknown as Group[];
      }
    }

    return [...this.memoryGroups];
  }

  async getGroupById(groupId: string): Promise<Group | null> {
    const groups = await this.getGroups();
    return groups.find((g) => g.id === groupId) || null;
  }

  async createGroup(data: {
    name: string;
    description: string;
    groupType: GroupType;
    currency: CurrencyCode;
  }): Promise<Group> {
    const newGroup: Group = {
      id: `grp-${Date.now()}`,
      name: data.name,
      description: data.description,
      groupType: data.groupType,
      currency: data.currency,
      createdBy: this.currentUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      members: [
        {
          id: `gm-${Date.now()}`,
          groupId: `grp-${Date.now()}`,
          userId: this.currentUser.id,
          role: 'admin',
          joinedAt: new Date().toISOString(),
          profile: this.currentUser,
        },
      ],
    };

    if (isSupabaseConfigured() && supabase) {
      const { data: inserted, error } = await supabase
        .from('groups')
        .insert({
          name: data.name,
          description: data.description,
          group_type: data.groupType,
          currency: data.currency,
          created_by: this.currentUser.id,
        })
        .select()
        .single();

      if (!error && inserted) {
        // add admin membership
        await supabase.from('group_members').insert({
          group_id: inserted.id,
          user_id: this.currentUser.id,
          role: 'admin',
        });
        return inserted as unknown as Group;
      }
    }

    this.memoryGroups.unshift(newGroup);
    this.memoryActivity.unshift({
      id: `act-${Date.now()}`,
      groupId: newGroup.id,
      actorId: this.currentUser.id,
      action: 'created_group',
      entityType: 'group',
      entityId: newGroup.id,
      metadata: { name: newGroup.name },
      createdAt: new Date().toISOString(),
      actorProfile: this.currentUser,
    });
    this.persistLocal();
    return newGroup;
  }

  // --- Expenses ---
  async getExpenses(groupId: string): Promise<Expense[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('expenses')
        .select(`
          *,
          payers:expense_payers(*),
          splits:expense_splits(*)
        `)
        .eq('group_id', groupId)
        .is('deleted_at', null)
        .order('expense_date', { ascending: false });

      if (!error && data) {
        return data as unknown as Expense[];
      }
    }

    return this.memoryExpenses.filter(
      (e) => e.groupId === groupId && !e.deletedAt
    );
  }

  async createExpense(data: {
    groupId: string;
    title: string;
    description?: string;
    amountMinor: number;
    currency: CurrencyCode;
    category: ExpenseCategory;
    expenseDate: string;
    payers: { userId: string; paidAmountMinor: number }[];
    splits: { userId: string; shareAmountMinor: number; splitType: SplitMethod }[];
  }): Promise<Expense> {
    const newExpense: Expense = {
      id: `exp-${Date.now()}`,
      groupId: data.groupId,
      title: data.title,
      description: data.description || '',
      amountMinor: data.amountMinor,
      currency: data.currency,
      category: data.category,
      expenseDate: data.expenseDate,
      createdBy: this.currentUser.id,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      payers: data.payers.map((p, idx) => ({ id: `p-${Date.now()}-${idx}`, ...p })),
      splits: data.splits.map((s, idx) => ({ id: `s-${Date.now()}-${idx}`, ...s })),
    };

    if (isSupabaseConfigured() && supabase) {
      const { data: atomicResult, error } = await supabase.rpc('create_expense_atomic', {
        p_group_id: data.groupId,
        p_title: data.title,
        p_description: data.description || '',
        p_amount_minor: data.amountMinor,
        p_currency: data.currency,
        p_category: data.category,
        p_expense_date: data.expenseDate,
        p_created_by: this.currentUser.id,
        p_receipt_url: null,
        p_payers: data.payers,
        p_splits: data.splits,
      });

      if (!error && atomicResult) {
        newExpense.id = atomicResult;
        return newExpense;
      }
    }

    this.memoryExpenses.unshift(newExpense);
    this.memoryActivity.unshift({
      id: `act-${Date.now()}`,
      groupId: data.groupId,
      actorId: this.currentUser.id,
      action: 'added_expense',
      entityType: 'expense',
      entityId: newExpense.id,
      metadata: { title: newExpense.title, amountMinor: newExpense.amountMinor },
      createdAt: new Date().toISOString(),
      actorProfile: this.currentUser,
    });
    this.persistLocal();
    return newExpense;
  }

  async updateExpense(
    expenseId: string,
    data: {
      title: string;
      description?: string;
      amountMinor: number;
      category: ExpenseCategory;
      expenseDate: string;
      payers: { userId: string; paidAmountMinor: number }[];
      splits: { userId: string; shareAmountMinor: number; splitType: SplitMethod }[];
    }
  ): Promise<Expense> {
    const idx = this.memoryExpenses.findIndex((e) => e.id === expenseId);
    if (idx === -1) {
      throw new Error('Expense not found');
    }

    const updated: Expense = {
      ...this.memoryExpenses[idx],
      title: data.title,
      description: data.description || '',
      amountMinor: data.amountMinor,
      category: data.category,
      expenseDate: data.expenseDate,
      payers: data.payers.map((p, i) => ({ id: `p-${Date.now()}-${i}`, ...p })),
      splits: data.splits.map((s, i) => ({ id: `s-${Date.now()}-${i}`, ...s })),
      updatedAt: new Date().toISOString(),
    };

    this.memoryExpenses[idx] = updated;
    this.memoryActivity.unshift({
      id: `act-${Date.now()}`,
      groupId: updated.groupId,
      actorId: this.currentUser.id,
      action: 'updated_expense',
      entityType: 'expense',
      entityId: updated.id,
      metadata: { title: updated.title, amountMinor: updated.amountMinor },
      createdAt: new Date().toISOString(),
      actorProfile: this.currentUser,
    });
    this.persistLocal();
    return updated;
  }

  async deleteExpense(expenseId: string): Promise<void> {
    const idx = this.memoryExpenses.findIndex((e) => e.id === expenseId);
    if (idx !== -1) {
      const exp = this.memoryExpenses[idx];
      exp.deletedAt = new Date().toISOString();
      this.memoryActivity.unshift({
        id: `act-${Date.now()}`,
        groupId: exp.groupId,
        actorId: this.currentUser.id,
        action: 'deleted_expense',
        entityType: 'expense',
        entityId: exp.id,
        metadata: { title: exp.title },
        createdAt: new Date().toISOString(),
        actorProfile: this.currentUser,
      });
      this.persistLocal();
    }
  }

  // --- Settlements ---
  async getSettlements(groupId: string): Promise<Settlement[]> {
    if (isSupabaseConfigured() && supabase) {
      const { data, error } = await supabase
        .from('settlements')
        .select(`
          *,
          payer_profile:profiles!payer_id(*),
          receiver_profile:profiles!receiver_id(*)
        `)
        .eq('group_id', groupId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        return data as unknown as Settlement[];
      }
    }

    return this.memorySettlements.filter((s) => s.groupId === groupId);
  }

  async recordSettlement(data: {
    groupId: string;
    payerId: string;
    receiverId: string;
    amountMinor: number;
    note?: string;
    paymentReference?: string;
  }): Promise<Settlement> {
    const newSettlement: Settlement = {
      id: `set-${Date.now()}`,
      groupId: data.groupId,
      payerId: data.payerId,
      receiverId: data.receiverId,
      amountMinor: data.amountMinor,
      status: 'pending', // receiver must confirm
      note: data.note || null,
      paymentReference: data.paymentReference || null,
      createdAt: new Date().toISOString(),
    };

    this.memorySettlements.unshift(newSettlement);
    this.memoryActivity.unshift({
      id: `act-${Date.now()}`,
      groupId: data.groupId,
      actorId: data.payerId,
      action: 'recorded_settlement',
      entityType: 'settlement',
      entityId: newSettlement.id,
      metadata: {
        amountMinor: data.amountMinor,
        payerId: data.payerId,
        receiverId: data.receiverId,
      },
      createdAt: new Date().toISOString(),
      actorProfile: DEMO_USERS.find((u) => u.id === data.payerId) || this.currentUser,
    });
    this.persistLocal();
    return newSettlement;
  }

  async confirmSettlement(settlementId: string): Promise<Settlement> {
    const s = this.memorySettlements.find((item) => item.id === settlementId);
    if (!s) {
      throw new Error('Settlement not found');
    }

    s.status = 'confirmed';
    s.confirmedAt = new Date().toISOString();
    s.confirmedBy = this.currentUser.id;

    this.memoryActivity.unshift({
      id: `act-${Date.now()}`,
      groupId: s.groupId,
      actorId: this.currentUser.id,
      action: 'confirmed_settlement',
      entityType: 'settlement',
      entityId: s.id,
      metadata: { amountMinor: s.amountMinor, payerId: s.payerId, receiverId: s.receiverId },
      createdAt: new Date().toISOString(),
      actorProfile: this.currentUser,
    });

    this.persistLocal();
    return s;
  }

  async disputeSettlement(settlementId: string): Promise<Settlement> {
    const s = this.memorySettlements.find((item) => item.id === settlementId);
    if (!s) {
      throw new Error('Settlement not found');
    }

    s.status = 'rejected';
    this.memoryActivity.unshift({
      id: `act-${Date.now()}`,
      groupId: s.groupId,
      actorId: this.currentUser.id,
      action: 'rejected_settlement',
      entityType: 'settlement',
      entityId: s.id,
      metadata: { amountMinor: s.amountMinor },
      createdAt: new Date().toISOString(),
      actorProfile: this.currentUser,
    });

    this.persistLocal();
    return s;
  }

  // --- Activity ---
  async getActivityLogs(groupId: string): Promise<ActivityLog[]> {
    return this.memoryActivity.filter((a) => a.groupId === groupId);
  }

  // --- Invitations & Joining ---
  async joinGroup(groupId: string, user: UserProfile): Promise<Group> {
    const grp = this.memoryGroups.find((g) => g.id === groupId);
    if (!grp) throw new Error('Group not found');

    if (!grp.members) grp.members = [];
    const existing = grp.members.find((m) => m.userId === user.id);
    if (existing) return grp;

    const newMember = {
      id: `gm-${Date.now()}`,
      groupId,
      userId: user.id,
      role: 'member' as const,
      joinedAt: new Date().toISOString(),
      profile: user,
    };
    grp.members.push(newMember);

    this.memoryActivity.unshift({
      id: `act-${Date.now()}`,
      groupId,
      actorId: user.id,
      action: 'member_joined',
      entityType: 'user',
      entityId: user.id,
      createdAt: new Date().toISOString(),
      actorProfile: user,
    });

    this.persistLocal();
    return grp;
  }

  resetDemoData() {
    localStorage.removeItem(STORAGE_KEY_GROUPS);
    localStorage.removeItem(STORAGE_KEY_EXPENSES);
    localStorage.removeItem(STORAGE_KEY_SETTLEMENTS);
    localStorage.removeItem(STORAGE_KEY_ACTIVITY);
    localStorage.removeItem(STORAGE_KEY_CURRENT_USER);
    this.currentUser = DEMO_CURRENT_USER;
    this.memoryGroups = DEMO_GROUPS;
    this.memoryExpenses = DEMO_EXPENSES;
    this.memorySettlements = DEMO_SETTLEMENTS;
    this.memoryActivity = DEMO_ACTIVITY;
    this.persistLocal();
  }
}

export const dataService = new DataService();

