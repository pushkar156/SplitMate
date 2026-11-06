import {
  collection,
  onSnapshot,
  deleteDoc,
  setDoc,
  doc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { OotyExpense, OotySettlement, OotyMember, OOTY_MEMBERS, OotyChatMessage } from '../types/ooty';

const LOCAL_EXPENSES_KEY = 'splitmate_ooty_expenses_v3';
const LOCAL_SETTLEMENTS_KEY = 'splitmate_ooty_settlements_v3';
const LOCAL_MEMBERS_KEY = 'splitmate_ooty_members_v3';
const LOCAL_MESSAGES_KEY = 'splitmate_ooty_messages_v3';

export interface SyncStatus {
  isConnected: boolean;
  isSyncing: boolean;
  error?: string;
}

type OotyDataListener = (
  expenses: OotyExpense[],
  settlements: OotySettlement[],
  members: OotyMember[],
  status: SyncStatus,
  messages?: OotyChatMessage[]
) => void;

// Active in-memory subscribers (components currently rendered on screen)
const activeListeners = new Set<OotyDataListener>();

// In-memory state cache
let latestExpenses: OotyExpense[] = getStoredLocalExpenses();
let latestSettlements: OotySettlement[] = getStoredLocalSettlements();
let latestMembers: OotyMember[] = getStoredLocalMembers();
let latestMessages: OotyChatMessage[] = getStoredLocalMessages();
let currentSyncStatus: SyncStatus = {
  isConnected: Boolean(db),
  isSyncing: false,
};

function broadcastUpdate() {
  activeListeners.forEach((listener) => {
    try {
      listener(
        [...latestExpenses],
        [...latestSettlements],
        [...latestMembers],
        { ...currentSyncStatus },
        [...latestMessages]
      );
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
  return [];
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

function getStoredLocalMessages(): OotyChatMessage[] {
  try {
    const raw = localStorage.getItem(LOCAL_MESSAGES_KEY);
    if (raw) return JSON.parse(raw);
  } catch (err) {
    console.error('Error loading local messages:', err);
  }
  return [];
}

function saveStoredLocalMessages(messages: OotyChatMessage[]) {
  try {
    localStorage.setItem(LOCAL_MESSAGES_KEY, JSON.stringify(messages));
  } catch (err) {
    console.error('Error saving local messages:', err);
  }
}

// Background auth helper (splitmate156 Firestore rules allow direct read/write)
export async function ensureFirebaseAuth(): Promise<void> {
  return Promise.resolve();
}

/**
 * Ensures all 13 members are seeded directly into Firestore collection `ooty_members`
 */
export async function sync13MembersToFirestore(): Promise<void> {
  if (!db) return;
  try {
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
          currentSyncStatus.error = undefined;
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
            splitDetails: data.splitDetails || undefined,
            notes: data.notes || '',
            createdAt: data.createdAt?.toDate
              ? data.createdAt.toDate().toISOString()
              : data.createdAt || new Date().toISOString(),
            createdBy: data.createdBy || data.paidBy || '',
          });
        });

        list.sort((a, b) => (b.date || '').localeCompare(a.date || '') || (b.createdAt || '').localeCompare(a.createdAt || ''));
        latestExpenses = list;
        saveStoredLocalExpenses(latestExpenses);
        currentSyncStatus.isConnected = true;
        currentSyncStatus.error = undefined;
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
        currentSyncStatus.error = undefined;
        broadcastUpdate();
      },
      (error) => {
        console.warn('Settlements Firestore listener error:', error);
        currentSyncStatus.isConnected = false;
        currentSyncStatus.error = error.message;
        broadcastUpdate();
      }
    );

    // 4. Chat Messages Listener
    const messagesCol = collection(db, 'ooty_messages');
    onSnapshot(
      messagesCol,
      (snapshot) => {
        const list: OotyChatMessage[] = [];
        snapshot.forEach((docSnap) => {
          const data = docSnap.data();
          list.push({
            id: docSnap.id,
            senderId: data.senderId || 'pushkar',
            text: data.text || '',
            createdAt: data.createdAt?.toDate
              ? data.createdAt.toDate().toISOString()
              : data.createdAt || new Date().toISOString(),
          });
        });
        list.sort((a, b) => (a.createdAt || '').localeCompare(b.createdAt || ''));
        latestMessages = list;
        saveStoredLocalMessages(list);
        currentSyncStatus.isConnected = true;
        currentSyncStatus.error = undefined;
        broadcastUpdate();
      },
      (error) => {
        console.warn('Chat messages Firestore listener error:', error);
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
  onUpdate(
    [...latestExpenses],
    [...latestSettlements],
    [...latestMembers],
    { ...currentSyncStatus },
    [...latestMessages]
  );

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
    notes: (expenseData.notes || '').trim(),
    id: localId,
    createdAt: now,
    ...(expenseData.splitDetails ? { splitDetails: expenseData.splitDetails } : {}),
  };

  // 1. INSTANT IN-MEMORY + LOCAL STORAGE UPDATE (0ms latency, zero reload needed!)
  latestExpenses = [newExpense, ...latestExpenses];
  saveStoredLocalExpenses(latestExpenses);
  broadcastUpdate();

  // 2. LIVE SYNC TO CLOUD FIRESTORE
  if (db) {
    try {
      const cleanPayload = {
        title: expenseData.title.trim() || 'Trip Expense',
        amount: Number(expenseData.amount) || 0,
        category: expenseData.category || 'Miscellaneous',
        date: expenseData.date || now.split('T')[0],
        paidBy: expenseData.paidBy || 'pushkar',
        splitWith: Array.isArray(expenseData.splitWith) && expenseData.splitWith.length > 0
          ? expenseData.splitWith
          : [expenseData.paidBy || 'pushkar'],
        notes: (expenseData.notes || '').trim(),
        createdBy: expenseData.createdBy || expenseData.paidBy || 'pushkar',
        ...(expenseData.splitDetails ? { splitDetails: expenseData.splitDetails } : {}),
        clientCreatedAt: now,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'ooty_expenses', localId), cleanPayload);
      currentSyncStatus.isConnected = true;
      currentSyncStatus.error = undefined;
      broadcastUpdate();
      return localId;
    } catch (err: any) {
      console.error('Firestore write error:', err);
      currentSyncStatus.isConnected = false;
      currentSyncStatus.error = err?.message || 'Database write failed';
      broadcastUpdate();
      throw err;
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
      await deleteDoc(doc(db, 'ooty_expenses', expenseId));
      currentSyncStatus.isConnected = true;
      currentSyncStatus.error = undefined;
      broadcastUpdate();
    } catch (err: any) {
      console.error('Firestore delete error:', err);
      currentSyncStatus.isConnected = false;
      currentSyncStatus.error = err?.message;
      broadcastUpdate();
      throw err;
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
    note: (settlementData.note || '').trim() || 'Settlement',
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
      const cleanPayload = {
        fromMemberId: settlementData.fromMemberId,
        toMemberId: settlementData.toMemberId,
        amount: Number(settlementData.amount) || 0,
        date: settlementData.date || now.split('T')[0],
        note: (settlementData.note || '').trim() || 'Settlement',
        clientCreatedAt: now,
        createdAt: serverTimestamp(),
      };

      await setDoc(doc(db, 'ooty_settlements', localId), cleanPayload);
      currentSyncStatus.isConnected = true;
      currentSyncStatus.error = undefined;
      broadcastUpdate();
      return localId;
    } catch (err: any) {
      console.error('Firestore settlement write error:', err);
      currentSyncStatus.isConnected = false;
      currentSyncStatus.error = err?.message;
      broadcastUpdate();
      throw err;
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
      await deleteDoc(doc(db, 'ooty_settlements', settlementId));
      currentSyncStatus.isConnected = true;
      currentSyncStatus.error = undefined;
      broadcastUpdate();
    } catch (err: any) {
      console.error('Firestore settlement delete error:', err);
      currentSyncStatus.isConnected = false;
      currentSyncStatus.error = err?.message;
      broadcastUpdate();
      throw err;
    }
  }
}

/**
 * Sends a chat message or note in the group chat, synced live to Firestore.
 */
export async function sendOotyChatMessage(
  senderId: string,
  text: string
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return '';

  const localId = 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
  const now = new Date().toISOString();

  const newMsg: OotyChatMessage = {
    id: localId,
    senderId,
    text: trimmed,
    createdAt: now,
  };

  latestMessages = [...latestMessages, newMsg];
  saveStoredLocalMessages(latestMessages);
  broadcastUpdate();

  if (db) {
    try {
      await setDoc(doc(db, 'ooty_messages', localId), {
        senderId,
        text: trimmed,
        clientCreatedAt: now,
        createdAt: serverTimestamp(),
      });
      currentSyncStatus.isConnected = true;
      currentSyncStatus.error = undefined;
      broadcastUpdate();
      return localId;
    } catch (err: any) {
      console.error('Firestore chat message error:', err);
      broadcastUpdate();
    }
  }

  return localId;
}

/**
 * Deletes a chat message from Firestore.
 */
export async function deleteOotyChatMessage(messageId: string): Promise<void> {
  latestMessages = latestMessages.filter((m) => m.id !== messageId);
  saveStoredLocalMessages(latestMessages);
  broadcastUpdate();

  if (db) {
    try {
      await deleteDoc(doc(db, 'ooty_messages', messageId));
      broadcastUpdate();
    } catch (err) {
      console.error('Firestore delete message error:', err);
    }
  }
}
