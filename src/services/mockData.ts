import {
  Group,
  UserProfile,
  Expense,
  Settlement,
  ActivityLog,
} from '../types';
import { calculateEqualSplit, calculatePercentageSplit, calculateExactSplit } from '../engine/splitCalculator';

export const DEMO_USERS: UserProfile[] = [
  { id: 'u-1', fullName: 'Aarav Sharma', email: 'aarav@splitmate.app', avatarUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop' },
  { id: 'u-2', fullName: 'Diya Patel', email: 'diya@splitmate.app', avatarUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&h=120&fit=crop' },
  { id: 'u-3', fullName: 'Ishaan Verma', email: 'ishaan@splitmate.app', avatarUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=120&h=120&fit=crop' },
  { id: 'u-4', fullName: 'Ananya Iyer', email: 'ananya@splitmate.app', avatarUrl: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=120&h=120&fit=crop' },
  { id: 'u-5', fullName: 'Rohan Gupta', email: 'rohan@splitmate.app', avatarUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&h=120&fit=crop' },
  { id: 'u-6', fullName: 'Kavya Nair', email: 'kavya@splitmate.app', avatarUrl: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?w=120&h=120&fit=crop' },
  { id: 'u-7', fullName: 'Aditya Singh', email: 'aditya@splitmate.app', avatarUrl: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=120&h=120&fit=crop' },
  { id: 'u-8', fullName: 'Meera Rao', email: 'meera@splitmate.app', avatarUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?w=120&h=120&fit=crop' },
  { id: 'u-9', fullName: 'Kabir Mehta', email: 'kabir@splitmate.app', avatarUrl: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=120&h=120&fit=crop' },
  { id: 'u-10', fullName: 'Tanvi Desai', email: 'tanvi@splitmate.app', avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=120&h=120&fit=crop' },
  { id: 'u-11', fullName: 'Vivaan Joshi', email: 'vivaan@splitmate.app', avatarUrl: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=120&h=120&fit=crop' },
  { id: 'u-12', fullName: 'Sanya Kapoor', email: 'sanya@splitmate.app', avatarUrl: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?w=120&h=120&fit=crop' },
  { id: 'u-13', fullName: 'Arjun Nambiar', email: 'arjun@splitmate.app', avatarUrl: 'https://images.unsplash.com/photo-1492562080023-ab3db95bfbce?w=120&h=120&fit=crop' },
];

export const DEMO_CURRENT_USER = DEMO_USERS[0]; // Aarav Sharma by default

const memberIds = DEMO_USERS.map((u) => u.id);

export const DEMO_GROUPS: Group[] = [
  {
    id: 'grp-goa-2026',
    name: 'Goa Summer Trip 2026',
    description: '13-person tropical holiday with private villa, scooters & parties',
    groupType: 'trip',
    currency: 'INR',
    createdBy: 'u-1',
    createdAt: '2026-11-01T08:00:00Z',
    updatedAt: '2026-11-04T18:00:00Z',
    members: DEMO_USERS.map((u, i) => ({
      id: `gm-${u.id}`,
      groupId: 'grp-goa-2026',
      userId: u.id,
      role: i < 2 ? 'admin' : 'member',
      joinedAt: '2026-11-01T08:00:00Z',
      profile: u,
    })),
  },
  {
    id: 'grp-flat-402',
    name: 'Flat 402 Roommates',
    description: 'Monthly groceries, WiFi broadband, cook & maid expenses',
    groupType: 'home',
    currency: 'INR',
    createdBy: 'u-1',
    createdAt: '2026-10-15T10:00:00Z',
    updatedAt: '2026-11-05T09:00:00Z',
    members: DEMO_USERS.slice(0, 4).map((u, i) => ({
      id: `gm-flat-${u.id}`,
      groupId: 'grp-flat-402',
      userId: u.id,
      role: i === 0 ? 'admin' : 'member',
      joinedAt: '2026-10-15T10:00:00Z',
      profile: u,
    })),
  },
];

export const DEMO_EXPENSES: Expense[] = [
  {
    id: 'exp-1',
    groupId: 'grp-goa-2026',
    title: 'Tempo Traveller Rental & Fuel',
    description: '13-seater AC van for airport transfers & 4-day travel',
    amountMinor: 2600000, // ₹26,000.00
    currency: 'INR',
    category: 'Transport',
    expenseDate: '2026-11-01',
    createdBy: 'u-1',
    createdAt: '2026-11-01T08:30:00Z',
    updatedAt: '2026-11-01T08:30:00Z',
    payers: [{ userId: 'u-1', paidAmountMinor: 2600000 }],
    splits: calculateEqualSplit(2600000, memberIds),
  },
  {
    id: 'exp-2',
    groupId: 'grp-goa-2026',
    title: 'Sea-facing Villa Booking',
    description: 'Private 5BHK pool villa in Candolim (3 nights)',
    amountMinor: 5200000, // ₹52,000.00
    currency: 'INR',
    category: 'Accommodation',
    expenseDate: '2026-11-01',
    createdBy: 'u-2',
    createdAt: '2026-11-01T12:00:00Z',
    updatedAt: '2026-11-01T12:00:00Z',
    payers: [{ userId: 'u-2', paidAmountMinor: 5200000 }],
    splits: calculateEqualSplit(5200000, memberIds),
  },
  {
    id: 'exp-3',
    groupId: 'grp-goa-2026',
    title: 'Highway Dhaba Breakfast',
    description: 'Parathas, lassi and hot tea on the way',
    amountMinor: 780000, // ₹7,800.00 (edited from ₹6,500)
    currency: 'INR',
    category: 'Food & Dining',
    expenseDate: '2026-11-02',
    createdBy: 'u-3',
    createdAt: '2026-11-02T09:15:00Z',
    updatedAt: '2026-11-04T16:00:00Z',
    payers: [{ userId: 'u-3', paidAmountMinor: 780000 }],
    splits: calculateEqualSplit(780000, memberIds),
  },
  {
    id: 'exp-4',
    groupId: 'grp-goa-2026',
    title: 'Sunset Beach Club & Cocktails',
    description: 'Appetizers and drinks for attendees',
    amountMinor: 800000, // ₹8,000.00
    currency: 'INR',
    category: 'Food & Dining',
    expenseDate: '2026-11-02',
    createdBy: 'u-4',
    createdAt: '2026-11-02T20:30:00Z',
    updatedAt: '2026-11-02T20:30:00Z',
    payers: [{ userId: 'u-4', paidAmountMinor: 800000 }],
    splits: calculateEqualSplit(800000, memberIds.slice(0, 8)), // 8 members only
  },
  {
    id: 'exp-5',
    groupId: 'grp-goa-2026',
    title: 'Villa Snacks, Ice & Soda Supplies',
    description: 'Paid together at supermarket',
    amountMinor: 500000, // ₹5,000.00
    currency: 'INR',
    category: 'Groceries',
    expenseDate: '2026-11-03',
    createdBy: 'u-5',
    createdAt: '2026-11-03T11:00:00Z',
    updatedAt: '2026-11-03T11:00:00Z',
    payers: [
      { userId: 'u-5', paidAmountMinor: 300000 },
      { userId: 'u-6', paidAmountMinor: 200000 },
    ],
    splits: calculateEqualSplit(500000, memberIds),
  },
  {
    id: 'exp-6',
    groupId: 'grp-goa-2026',
    title: 'Scuba Diving & Jet Skiing',
    description: 'Grand Island water sports package',
    amountMinor: 1000000, // ₹10,000.00
    currency: 'INR',
    category: 'Activities',
    expenseDate: '2026-11-03',
    createdBy: 'u-7',
    createdAt: '2026-11-03T15:00:00Z',
    updatedAt: '2026-11-03T15:00:00Z',
    payers: [{ userId: 'u-7', paidAmountMinor: 1000000 }],
    splits: calculatePercentageSplit(1000000, [
      { userId: 'u-7', percentage: 40 },
      { userId: 'u-8', percentage: 30 },
      { userId: 'u-9', percentage: 20 },
      { userId: 'u-10', percentage: 10 },
    ]),
  },
  {
    id: 'exp-7',
    groupId: 'grp-goa-2026',
    title: 'Flea Market Handicraft Souvenirs',
    description: 'Wooden carvings, cashew boxes and magnets',
    amountMinor: 450000, // ₹4,500.00
    currency: 'INR',
    category: 'Shopping',
    expenseDate: '2026-11-04',
    createdBy: 'u-11',
    createdAt: '2026-11-04T12:00:00Z',
    updatedAt: '2026-11-04T12:00:00Z',
    payers: [{ userId: 'u-11', paidAmountMinor: 450000 }],
    splits: calculateExactSplit(450000, [
      { userId: 'u-11', amountMinor: 200000 },
      { userId: 'u-12', amountMinor: 150000 },
      { userId: 'u-13', amountMinor: 100000 },
    ]),
  },
];

export const DEMO_SETTLEMENTS: Settlement[] = [
  {
    id: 'set-1',
    groupId: 'grp-goa-2026',
    payerId: 'u-13', // Arjun
    receiverId: 'u-1', // Aarav
    amountMinor: 100000, // ₹1,000.00
    status: 'pending',
    note: 'Sent via UPI ref 4920193',
    createdAt: '2026-11-04T14:00:00Z',
  },
  {
    id: 'set-2',
    groupId: 'grp-goa-2026',
    payerId: 'u-13', // Arjun
    receiverId: 'u-2', // Diya
    amountMinor: 200000, // ₹2,000.00
    status: 'confirmed',
    note: 'GPay payment',
    createdAt: '2026-11-04T15:00:00Z',
    confirmedAt: '2026-11-04T15:30:00Z',
    confirmedBy: 'u-2',
  },
];

export const DEMO_ACTIVITY: ActivityLog[] = [
  {
    id: 'act-1',
    groupId: 'grp-goa-2026',
    actorId: 'u-1',
    action: 'created_group',
    entityType: 'group',
    entityId: 'grp-goa-2026',
    metadata: { name: 'Goa Summer Trip 2026' },
    createdAt: '2026-11-01T08:00:00Z',
  },
  {
    id: 'act-2',
    groupId: 'grp-goa-2026',
    actorId: 'u-1',
    action: 'added_expense',
    entityType: 'expense',
    entityId: 'exp-1',
    metadata: { title: 'Tempo Traveller Rental & Fuel', amountMinor: 2600000 },
    createdAt: '2026-11-01T08:30:00Z',
  },
  {
    id: 'act-3',
    groupId: 'grp-goa-2026',
    actorId: 'u-2',
    action: 'added_expense',
    entityType: 'expense',
    entityId: 'exp-2',
    metadata: { title: 'Sea-facing Villa Booking', amountMinor: 5200000 },
    createdAt: '2026-11-01T12:00:00Z',
  },
  {
    id: 'act-4',
    groupId: 'grp-goa-2026',
    actorId: 'u-13',
    action: 'recorded_settlement',
    entityType: 'settlement',
    entityId: 'set-2',
    metadata: { amountMinor: 200000, receiverId: 'u-2' },
    createdAt: '2026-11-04T15:00:00Z',
  },
  {
    id: 'act-5',
    groupId: 'grp-goa-2026',
    actorId: 'u-2',
    action: 'confirmed_settlement',
    entityType: 'settlement',
    entityId: 'set-2',
    metadata: { amountMinor: 200000, payerId: 'u-13' },
    createdAt: '2026-11-04T15:30:00Z',
  },
];
