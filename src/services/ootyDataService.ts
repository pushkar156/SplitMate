import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  doc,
  query,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { signInAnonymously } from 'firebase/auth';
import { OotyExpense, OotySettlement } from '../types/ooty';

const LOCAL_EXPENSES_KEY = 'splitmate_ooty_expenses_v1';
const LOCAL_SETTLEMENTS_KEY = 'splitmate_ooty_settlements_v1';

// Seed initial demo data if completely empty
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
 * Subscribes to real-time Ooty trip data.
 * Merges Firestore real-time snapshots with local storage fallback.
 */
export function subscribeToOotyData(
  onUpdate: (expenses: OotyExpense[], settlements: OotySettlement[]) => void
): () => void {
  ensureFirebaseAuth();

  let latestExpenses: OotyExpense[] = getStoredLocalExpenses();
  let latestSettlements: OotySettlement[] = getStoredLocalSettlements();

  // Send current cached state immediately
  onUpdate(latestExpenses, latestSettlements);

  if (!db) {
    return () => {};
  }

  let unsubExpenses = () => {};
  let unsubSettlements = () => {};

  try {
    const expensesCol = collection(db, 'ooty_expenses');
    const expensesQuery = query(expensesCol, orderBy('createdAt', 'desc'));

    unsubExpenses = onSnapshot(
      expensesQuery,
      (snapshot) => {
        if (!snapshot.empty) {
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
              createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString(),
              createdBy: data.createdBy || data.paidBy || '',
            });
          });
          latestExpenses = list;
          saveStoredLocalExpenses(list);
          onUpdate(latestExpenses, latestSettlements);
        } else if (snapshot.metadata.fromCache === false && snapshot.size === 0) {
          // If Firestore is completely fresh, seed default expenses so it's not blank
          DEFAULT_INITIAL_EXPENSES.forEach((exp) => {
            addDoc(expensesCol, {
              ...exp,
              createdAt: serverTimestamp(),
            }).catch(() => {});
          });
        }
      },
      (error) => {
        console.warn('Firestore expenses listener fallback to cache:', error);
        onUpdate(latestExpenses, latestSettlements);
      }
    );

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
            createdAt: data.createdAt?.toDate ? data.createdAt.toDate().toISOString() : data.createdAt || new Date().toISOString(),
          });
        });
        latestSettlements = list;
        saveStoredLocalSettlements(list);
        onUpdate(latestExpenses, latestSettlements);
      },
      (error) => {
        console.warn('Firestore settlements listener fallback to cache:', error);
      }
    );
  } catch (err) {
    console.warn('Error attaching Firestore listeners, using local storage:', err);
  }

  return () => {
    unsubExpenses();
    unsubSettlements();
  };
}

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

  // 1. Save locally first for instant offline response
  const localList = getStoredLocalExpenses();
  const updatedList = [newExpense, ...localList];
  saveStoredLocalExpenses(updatedList);

  // 2. Sync with Cloud Firestore
  if (db) {
    try {
      await ensureFirebaseAuth();
      const docRef = await addDoc(collection(db, 'ooty_expenses'), {
        ...expenseData,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (err) {
      console.warn('Could not sync to Firestore, saved to local cache:', err);
    }
  }

  return localId;
}

export async function deleteOotyExpense(expenseId: string): Promise<void> {
  // 1. Remove from local storage
  const localList = getStoredLocalExpenses();
  const updatedList = localList.filter((e) => e.id !== expenseId);
  saveStoredLocalExpenses(updatedList);

  // 2. Remove from Firestore
  if (db) {
    try {
      await ensureFirebaseAuth();
      await deleteDoc(doc(db, 'ooty_expenses', expenseId));
    } catch (err) {
      console.warn('Could not delete from Firestore:', err);
    }
  }
}

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

  // 1. Save locally first
  const localList = getStoredLocalSettlements();
  const updatedList = [newSettlement, ...localList];
  saveStoredLocalSettlements(updatedList);

  // 2. Sync with Cloud Firestore
  if (db) {
    try {
      await ensureFirebaseAuth();
      const docRef = await addDoc(collection(db, 'ooty_settlements'), {
        ...settlementData,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (err) {
      console.warn('Could not sync settlement to Firestore:', err);
    }
  }

  return localId;
}

export async function deleteOotySettlement(settlementId: string): Promise<void> {
  const localList = getStoredLocalSettlements();
  const updatedList = localList.filter((s) => s.id !== settlementId);
  saveStoredLocalSettlements(updatedList);

  if (db) {
    try {
      await ensureFirebaseAuth();
      await deleteDoc(doc(db, 'ooty_settlements', settlementId));
    } catch (err) {
      console.warn('Could not delete settlement from Firestore:', err);
    }
  }
}
