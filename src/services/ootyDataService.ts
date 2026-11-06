import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  setDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { signInAnonymously } from 'firebase/auth';
import { OotyExpense, OotySettlement, OotyMember, OOTY_MEMBERS } from '../types/ooty';

const LOCAL_EXPENSES_KEY = 'splitmate_ooty_expenses_v2';
const LOCAL_SETTLEMENTS_KEY = 'splitmate_ooty_settlements_v2';
const LOCAL_MEMBERS_KEY = 'splitmate_ooty_members_v2';

// Initial seed expenses for Ooty trip
const DEFAULT_INITIAL_EXPENSES: OotyExpense[] = [
  {
    id: 'seed-exp-1',
    title: 'Ooty Villa & Heritage Stay Booking',
    amount: 19500,
    category: 'Stay',
    date: new Date().toISOString().split('T')[0],
    paidBy: 'pushkar',
    splitWith: [
      'pushkar', 'jitendra', 'gayatri', 'pundlik', 'surekha',
      'kalpana', 'pradip', 'jyoti', 'rajendra', 'jayashri',
      'disha', 'siddhesh', 'raj',
    ],
    notes: 'Advance booking for 13 people cottage in Ooty',
    createdAt: new Date().toISOString(),
    createdBy: 'pushkar',
  },
  {
    id: 'seed-exp-2',
    title: 'Tempo Traveler Fuel & Tolls',
    amount: 7800,
    category: 'Travel & Fuel',
    date: new Date().toISOString().split('T')[0],
    paidBy: 'jitendra',
    splitWith: [
      'pushkar', 'jitendra', 'gayatri', 'pundlik', 'surekha',
      'kalpana', 'pradip', 'jyoti', 'rajendra', 'jayashri',
      'disha', 'siddhesh', 'raj',
    ],
    notes: 'Coimbatore to Ooty Ghat road fuel & entry permit',
    createdAt: new Date().toISOString(),
    createdBy: 'jitendra',
  },
];

export interface SyncStatus {
  isConnected: boolean;
  isSyncing: boolean;
  error?: string;
}

function getStoredLocalExpenses(): OotyExpense[] {
  try {
    const raw = localStorage.getItem(LOCAL_EXPENSES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading local expenses:', err);
  }
  return DEFAULT_INITIAL_EXPENSES;
}

function saveStoredLocalExpenses(expenses: OotyExpense[]) {
  try {
    localStorage.setItem(LOCAL_EXPENSES_KEY, JSON.stringify(expenses));
  } catch (err) {
    console.error('Error saving local expenses:', err);
  }
}

function getStoredLocalSettlements(): OotySettlement[] {
  try {
    const raw = localStorage.getItem(LOCAL_SETTLEMENTS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading local settlements:', err);
  }
  return [];
}

function saveStoredLocalSettlements(settlements: OotySettlement[]) {
  try {
    localStorage.setItem(LOCAL_SETTLEMENTS_KEY, JSON.stringify(settlements));
  } catch (err) {
    console.error('Error saving local settlements:', err);
  }
}

function getStoredLocalMembers(): OotyMember[] {
  try {
    const raw = localStorage.getItem(LOCAL_MEMBERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading local members:', err);
  }
  return OOTY_MEMBERS;
}

function saveStoredLocalMembers(members: OotyMember[]) {
  try {
    localStorage.setItem(LOCAL_MEMBERS_KEY, JSON.stringify(members));
  } catch (err) {
    console.error('Error saving local members:', err);
  }
}

// Background anonymous auth so Firestore security rules pass if enabled
export async function ensureFirebaseAuth() {
  if (auth && !auth.currentUser) {
    try {
      await signInAnonymously(auth);
    } catch {
      // Ignored if anonymous auth is not toggled on
    }
  }
}

/**
 * Ensures all 13 members are seeded directly into Firestore collection `ooty_members`
 */
export async function sync13MembersToFirestore(): Promise<void> {
  if (!db) return;
  try {
    await ensureFirebaseAuth();
    for (let i = 0; i < OOTY_MEMBERS.length; i++) {
      const m = OOTY_MEMBERS[i];
      const memberRef = doc(db, 'ooty_members', m.id);
      await setDoc(
        memberRef,
        {
          id: m.id,
          name: m.name,
          avatarColor: m.avatarColor,
          order: m.order ?? i + 1,
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    }
  } catch (err) {
    console.warn('Syncing 13 members to Firestore skipped or pending:', err);
  }
}

/**
 * Subscribes to real-time Ooty trip data:
 * 1. Expenses (`ooty_expenses`)
 * 2. Settlements (`ooty_settlements`)
 * 3. Members (`ooty_members`)
 */
export function subscribeToOotyData(
  onUpdate: (
    expenses: OotyExpense[],
    settlements: OotySettlement[],
    members: OotyMember[],
    status: SyncStatus
  ) => void
): () => void {
  ensureFirebaseAuth();

  let latestExpenses: OotyExpense[] = getStoredLocalExpenses();
  let latestSettlements: OotySettlement[] = getStoredLocalSettlements();
  let latestMembers: OotyMember[] = getStoredLocalMembers();
  let syncStatus: SyncStatus = {
    isConnected: Boolean(db),
    isSyncing: Boolean(db),
  };

  const notify = () => {
    onUpdate(latestExpenses, latestSettlements, latestMembers, syncStatus);
  };

  // Immediate notify from local cache
  notify();

  if (!db) {
    syncStatus = { isConnected: false, isSyncing: false, error: 'Firebase not configured' };
    notify();
    return () => {};
  }

  // Seed members into Firestore on startup
  sync13MembersToFirestore();

  let unsubExpenses = () => {};
  let unsubSettlements = () => {};
  let unsubMembers = () => {};

  try {
    // 1. Members Listener (Live from database)
    const membersCol = collection(db, 'ooty_members');
    const membersQuery = query(membersCol, orderBy('order', 'asc'));

    unsubMembers = onSnapshot(
      membersQuery,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: OotyMember[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({
              id: docSnap.id,
              name: data.name || docSnap.id,
              avatarColor: data.avatarColor || '#FF5B42',
              order: data.order,
            });
          });
          latestMembers = list;
          saveStoredLocalMembers(list);
          syncStatus.isConnected = true;
          syncStatus.isSyncing = false;
          notify();
        } else {
          // If Firestore collection is empty, push the 13 members
          sync13MembersToFirestore();
        }
      },
      (error) => {
        console.warn('Members Firestore error:', error);
        syncStatus.isConnected = false;
        syncStatus.error = error.message;
        notify();
      }
    );

    // 2. Expenses Listener (Live from database)
    const expensesCol = collection(db, 'ooty_expenses');
    const expensesQuery = query(expensesCol, orderBy('createdAt', 'desc'));

    unsubExpenses = onSnapshot(
      expensesQuery,
      (snapshot) => {
        const list: OotyExpense[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            title: data.title || 'Untitled Expense',
            amount: Number(data.amount) || 0,
            category: data.category || 'Miscellaneous',
            date: data.date || new Date().toISOString().split('T')[0],
            paidBy: data.paidBy || 'pushkar',
            splitWith: Array.isArray(data.splitWith) ? data.splitWith : [],
            notes: data.notes || '',
            createdAt: data.createdAt?.toDate
              ? data.createdAt.toDate().toISOString()
              : data.createdAt || new Date().toISOString(),
            createdBy: data.createdBy || data.paidBy || '',
          });
        });

        if (list.length > 0) {
          latestExpenses = list;
          saveStoredLocalExpenses(list);
        } else if (snapshot.metadata.fromCache === false && snapshot.size === 0) {
          // Fresh database seed
          DEFAULT_INITIAL_EXPENSES.forEach((exp) => {
            addDoc(expensesCol, {
              ...exp,
              createdAt: serverTimestamp(),
            }).catch(() => {});
          });
        }
        syncStatus.isConnected = true;
        syncStatus.isSyncing = false;
        notify();
      },
      (error) => {
        console.warn('Expenses Firestore error:', error);
        syncStatus.isConnected = false;
        syncStatus.error = error.message;
        notify();
      }
    );

    // 3. Settlements Listener (Live from database)
    const settlementsCol = collection(db, 'ooty_settlements');
    const settlementsQuery = query(settlementsCol, orderBy('createdAt', 'desc'));

    unsubSettlements = onSnapshot(
      settlementsQuery,
      (snapshot) => {
        const list: OotySettlement[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            fromMemberId: data.fromMemberId,
            toMemberId: data.toMemberId,
            amount: Number(data.amount) || 0,
            date: data.date || new Date().toISOString().split('T')[0],
            note: data.note || '',
            createdAt: data.createdAt?.toDate
              ? data.createdAt.toDate().toISOString()
              : data.createdAt || new Date().toISOString(),
          });
        });
        latestSettlements = list;
        saveStoredLocalSettlements(list);
        syncStatus.isConnected = true;
        syncStatus.isSyncing = false;
        notify();
      },
      (error) => {
        console.warn('Settlements Firestore error:', error);
        syncStatus.isConnected = false;
        syncStatus.error = error.message;
        notify();
      }
    );
  } catch (err: any) {
    console.warn('Error attaching Firestore listeners, fallback to local cache:', err);
    syncStatus = { isConnected: false, isSyncing: false, error: err?.message };
    notify();
  }

  return () => {
    unsubExpenses();
    unsubSettlements();
    unsubMembers();
  };
}

/**
 * Adds an expense live to Firestore and synchronizes with local storage.
 */
export async function addOotyExpense(
  expenseData: Omit<OotyExpense, 'id' | 'createdAt'>
): Promise<string> {
  const localId = 'exp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  const newExpense: OotyExpense = {
    ...expenseData,
    id: localId,
    createdAt: now,
  };

  // 1. Optimistic update in local cache
  const localList = getStoredLocalExpenses();
  const updatedList = [newExpense, ...localList];
  saveStoredLocalExpenses(updatedList);

  // 2. Write directly to Cloud Firestore
  if (db) {
    await ensureFirebaseAuth();
    const docRef = await addDoc(collection(db, 'ooty_expenses'), {
      ...expenseData,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  }

  return localId;
}

/**
 * Deletes an expense live from Cloud Firestore and synchronizes with local storage.
 */
export async function deleteOotyExpense(expenseId: string): Promise<void> {
  // 1. Remove from local cache
  const localList = getStoredLocalExpenses();
  const updatedList = localList.filter((e) => e.id !== expenseId);
  saveStoredLocalExpenses(updatedList);

  // 2. Delete live from Cloud Firestore
  if (db) {
    await ensureFirebaseAuth();
    await deleteDoc(doc(db, 'ooty_expenses', expenseId));
  }
}

/**
 * Adds a settlement payment live to Cloud Firestore.
 */
export async function addOotySettlement(
  settlementData: Omit<OotySettlement, 'id' | 'createdAt'>
): Promise<string> {
  const localId = 'set_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  const newSettlement: OotySettlement = {
    ...settlementData,
    id: localId,
    createdAt: now,
  };

  // 1. Local update
  const localList = getStoredLocalSettlements();
  const updatedList = [newSettlement, ...localList];
  saveStoredLocalSettlements(updatedList);

  // 2. Cloud Firestore write
  if (db) {
    await ensureFirebaseAuth();
    const docRef = await addDoc(collection(db, 'ooty_settlements'), {
      ...settlementData,
      createdAt: serverTimestamp(),
    });
    return docRef.id;
  }

  return localId;
}

/**
 * Deletes a settlement live from Cloud Firestore.
 */
export async function deleteOotySettlement(settlementId: string): Promise<void> {
  const localList = getStoredLocalSettlements();
  const updatedList = localList.filter((s) => s.id !== settlementId);
  saveStoredLocalSettlements(updatedList);

  if (db) {
    await ensureFirebaseAuth();
    await deleteDoc(doc(db, 'ooty_settlements', settlementId));
  }
}
