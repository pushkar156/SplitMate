import {
  collection,
  onSnapshot,
  addDoc,
  deleteDoc,
  setDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db, auth } from '../lib/firebase';
import { signInAnonymously } from 'firebase/auth';
import { OotyExpense, OotySettlement, OotyMember, OOTY_MEMBERS } from '../types/ooty';

const LOCAL_EXPENSES_KEY = 'splitmate_ooty_expenses_v3';
const LOCAL_SETTLEMENTS_KEY = 'splitmate_ooty_settlements_v3';
const LOCAL_MEMBERS_KEY = 'splitmate_ooty_members_v3';

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

type OotyDataListener = (
  expenses: OotyExpense[],
  settlements: OotySettlement[],
  members: OotyMember[],
  status: SyncStatus
) => void;

// Active in-memory subscribers (components currently rendered on screen)
const activeListeners = new Set<OotyDataListener>();

// In-memory state cache
let latestExpenses: OotyExpense[] = getStoredLocalExpenses();
let latestSettlements: OotySettlement[] = getStoredLocalSettlements();
let latestMembers: OotyMember[] = getStoredLocalMembers();
let currentSyncStatus: SyncStatus = {
  isConnected: Boolean(db),
  isSyncing: false,
};

function broadcastUpdate() {
  activeListeners.forEach((listener) => {
    try {
      listener([...latestExpenses], [...latestSettlements], [...latestMembers], { ...currentSyncStatus });
    } catch (err) {
      console.error('Error in Ooty data listener:', err);
    }
  });
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
      // Ignored if anonymous auth is not toggled on in console
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
    console.warn('Syncing 13 members to Firestore skipped:', err);
  }
}

// Global flag so Firestore listener attaches once
let isFirestoreInitialized = false;

function initFirestoreListeners() {
  if (isFirestoreInitialized || !db) return;
  isFirestoreInitialized = true;

  ensureFirebaseAuth();
  sync13MembersToFirestore();

  try {
    // 1. Members Listener
    const membersCol = collection(db, 'ooty_members');
    onSnapshot(
      membersCol,
      (snapshot) => {
        if (!snapshot.empty) {
          const list: OotyMember[] = [];
          snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            list.push({
              id: docSnap.id,
              name: data.name || docSnap.id,
              avatarColor: data.avatarColor || '#FF5B42',
              order: data.order ?? 99,
            });
          });
          list.sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
          latestMembers = list;
          saveStoredLocalMembers(list);
          currentSyncStatus.isConnected = true;
          broadcastUpdate();
        } else {
          sync13MembersToFirestore();
        }
      },
      (error) => {
        console.warn('Members Firestore listener error:', error);
        currentSyncStatus.isConnected = false;
        currentSyncStatus.error = error.message;
        broadcastUpdate();
      }
    );

    // 2. Expenses Listener
    const expensesCol = collection(db, 'ooty_expenses');
    onSnapshot(
      expensesCol,
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
          list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
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
        currentSyncStatus.isConnected = true;
        broadcastUpdate();
      },
      (error) => {
        console.warn('Expenses Firestore listener error:', error);
        currentSyncStatus.isConnected = false;
        currentSyncStatus.error = error.message;
        broadcastUpdate();
      }
    );

    // 3. Settlements Listener
    const settlementsCol = collection(db, 'ooty_settlements');
    onSnapshot(
      settlementsCol,
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
        list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
        latestSettlements = list;
        saveStoredLocalSettlements(list);
        currentSyncStatus.isConnected = true;
        broadcastUpdate();
      },
      (error) => {
        console.warn('Settlements Firestore listener error:', error);
        currentSyncStatus.isConnected = false;
        currentSyncStatus.error = error.message;
        broadcastUpdate();
      }
    );
  } catch (err: any) {
    console.warn('Error attaching Firestore listeners:', err);
    currentSyncStatus.isConnected = false;
    currentSyncStatus.error = err?.message;
    broadcastUpdate();
  }
}

/**
 * Subscribes to real-time Ooty trip data.
 * Fires instantly on changes without requiring any page reload.
 */
export function subscribeToOotyData(onUpdate: OotyDataListener): () => void {
  activeListeners.add(onUpdate);

  // Send initial in-memory state immediately
  onUpdate([...latestExpenses], [...latestSettlements], [...latestMembers], { ...currentSyncStatus });

  // Initialize Firestore once
  initFirestoreListeners();

  return () => {
    activeListeners.delete(onUpdate);
  };
}

/**
 * Adds an expense live to Firestore and synchronizes with local storage instantly.
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

  // 1. INSTANT IN-MEMORY + LOCAL STORAGE UPDATE (0ms latency, zero reload needed!)
  latestExpenses = [newExpense, ...latestExpenses];
  saveStoredLocalExpenses(latestExpenses);
  broadcastUpdate();

  // 2. LIVE SYNC TO CLOUD FIRESTORE
  if (db) {
    try {
      await ensureFirebaseAuth();
      const docRef = await addDoc(collection(db, 'ooty_expenses'), {
        ...expenseData,
        clientCreatedAt: now,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (err) {
      console.warn('Firestore write warning:', err);
    }
  }

  return localId;
}

/**
 * Deletes an expense live from Cloud Firestore and synchronizes instantly.
 */
export async function deleteOotyExpense(expenseId: string): Promise<void> {
  // 1. INSTANT IN-MEMORY + LOCAL STORAGE UPDATE (0ms latency, zero reload needed!)
  latestExpenses = latestExpenses.filter((e) => e.id !== expenseId);
  saveStoredLocalExpenses(latestExpenses);
  broadcastUpdate();

  // 2. LIVE DELETE FROM CLOUD FIRESTORE
  if (db) {
    try {
      await ensureFirebaseAuth();
      await deleteDoc(doc(db, 'ooty_expenses', expenseId));
    } catch (err) {
      console.warn('Firestore delete warning:', err);
    }
  }
}

/**
 * Adds a settlement payment live to Cloud Firestore and synchronizes instantly.
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

  // 1. INSTANT LOCAL UPDATE
  latestSettlements = [newSettlement, ...latestSettlements];
  saveStoredLocalSettlements(latestSettlements);
  broadcastUpdate();

  // 2. CLOUD FIRESTORE WRITE
  if (db) {
    try {
      await ensureFirebaseAuth();
      const docRef = await addDoc(collection(db, 'ooty_settlements'), {
        ...settlementData,
        clientCreatedAt: now,
        createdAt: serverTimestamp(),
      });
      return docRef.id;
    } catch (err) {
      console.warn('Firestore settlement write warning:', err);
    }
  }

  return localId;
}

/**
 * Deletes a settlement live from Cloud Firestore and synchronizes instantly.
 */
export async function deleteOotySettlement(settlementId: string): Promise<void> {
  // 1. INSTANT LOCAL UPDATE
  latestSettlements = latestSettlements.filter((s) => s.id !== settlementId);
  saveStoredLocalSettlements(latestSettlements);
  broadcastUpdate();

  // 2. CLOUD FIRESTORE DELETE
  if (db) {
    try {
      await ensureFirebaseAuth();
      await deleteDoc(doc(db, 'ooty_settlements', settlementId));
    } catch (err) {
      console.warn('Firestore settlement delete warning:', err);
    }
  }
}
