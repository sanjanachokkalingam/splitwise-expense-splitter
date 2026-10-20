import { Group } from '../types';

const STORAGE_KEY = 'splitwise_app_data_v1';
const ACTIVE_GROUP_KEY = 'splitwise_active_group_v1';

export const AVATAR_COLORS = [
  '#10B981', // Emerald
  '#3B82F6', // Blue
  '#F59E0B', // Amber
  '#EC4899', // Pink
  '#8B5CF6', // Purple
  '#06B6D4', // Cyan
  '#F97316', // Orange
  '#14B8A6', // Teal
];

export function getRandomColor(index: number = 0): string {
  return AVATAR_COLORS[index % AVATAR_COLORS.length];
}

export function loadGroups(): Group[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.filter(isValidGroup);
    }
    return [];
  } catch (err) {
    console.error('Failed to load groups from localStorage:', err);
    return [];
  }
}

export function saveGroups(groups: Group[]): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(groups));
  } catch (err) {
    console.error('Failed to save groups to localStorage:', err);
  }
}

export function loadActiveGroupId(): string | null {
  try {
    return localStorage.getItem(ACTIVE_GROUP_KEY);
  } catch {
    return null;
  }
}

export function saveActiveGroupId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(ACTIVE_GROUP_KEY, id);
    } else {
      localStorage.removeItem(ACTIVE_GROUP_KEY);
    }
  } catch (err) {
    console.error('Failed to save active group id:', err);
  }
}

export function clearAllData(): void {
  try {
    localStorage.removeItem(STORAGE_KEY);
    localStorage.removeItem(ACTIVE_GROUP_KEY);
  } catch (err) {
    console.error('Failed to clear data from localStorage:', err);
  }
}

function isValidGroup(item: any): item is Group {
  return (
    typeof item === 'object' &&
    item !== null &&
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    Array.isArray(item.participants) &&
    Array.isArray(item.expenses)
  );
}

export function createDemoGroup(): Group {
  const p1Id = 'demo-p-1';
  const p2Id = 'demo-p-2';
  const p3Id = 'demo-p-3';
  const p4Id = 'demo-p-4';

  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
  const twoDaysAgoStr = new Date(Date.now() - 172800000).toISOString().split('T')[0];

  return {
    id: 'demo-group-goa',
    name: 'Goa Coastal Trip 🏖️',
    description: 'Weekend getaway with friends in North Goa',
    currency: 'INR',
    currentUserId: p1Id,
    participants: [
      { id: p1Id, name: 'Aarav (You)', color: '#10B981' },
      { id: p2Id, name: 'Priya', color: '#3B82F6' },
      { id: p3Id, name: 'Rohan', color: '#F59E0B' },
      { id: p4Id, name: 'Sneha', color: '#EC4899' },
    ],
    expenses: [
      {
        id: 'demo-exp-1',
        groupId: 'demo-group-goa',
        title: 'Beachside Villa Booking',
        amountMinor: 1600000, // ₹16,000.00
        paidByParticipantId: p1Id, // Aarav paid
        date: twoDaysAgoStr,
        category: 'stay',
        splitMethod: 'equal',
        splitParticipants: [p1Id, p2Id, p3Id, p4Id],
        shares: [
          { participantId: p1Id, amountMinor: 400000 },
          { participantId: p2Id, amountMinor: 400000 },
          { participantId: p3Id, amountMinor: 400000 },
          { participantId: p4Id, amountMinor: 400000 },
        ],
        notes: '3-night stay booked via Airbnb',
        createdAt: new Date(Date.now() - 172800000).toISOString(),
        updatedAt: new Date(Date.now() - 172800000).toISOString(),
      },
      {
        id: 'demo-exp-2',
        groupId: 'demo-group-goa',
        title: 'Seafood Feast at Thalassa',
        amountMinor: 480000, // ₹4,800.00
        paidByParticipantId: p2Id, // Priya paid
        date: yesterdayStr,
        category: 'food',
        splitMethod: 'equal',
        splitParticipants: [p1Id, p2Id, p3Id, p4Id],
        shares: [
          { participantId: p1Id, amountMinor: 120000 },
          { participantId: p2Id, amountMinor: 120000 },
          { participantId: p3Id, amountMinor: 120000 },
          { participantId: p4Id, amountMinor: 120000 },
        ],
        notes: 'Sunset dinner table',
        createdAt: new Date(Date.now() - 86400000).toISOString(),
        updatedAt: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: 'demo-exp-3',
        groupId: 'demo-group-goa',
        title: 'Scooters & Fuel',
        amountMinor: 240000, // ₹2,400.00
        paidByParticipantId: p3Id, // Rohan paid
        date: yesterdayStr,
        category: 'travel',
        splitMethod: 'unequal',
        splitParticipants: [p1Id, p3Id, p4Id], // Priya did not ride
        shares: [
          { participantId: p1Id, amountMinor: 80000 },
          { participantId: p3Id, amountMinor: 80000 },
          { participantId: p4Id, amountMinor: 80000 },
        ],
        notes: '2 Activas rented for 2 days',
        createdAt: new Date(Date.now() - 72000000).toISOString(),
        updatedAt: new Date(Date.now() - 72000000).toISOString(),
      },
      {
        id: 'demo-exp-4',
        groupId: 'demo-group-goa',
        title: 'Scuba Diving at Grand Island',
        amountMinor: 750000, // ₹7,500.00
        paidByParticipantId: p4Id, // Sneha paid
        date: todayStr,
        category: 'activities',
        splitMethod: 'percentage',
        splitParticipants: [p1Id, p3Id, p4Id],
        shares: [
          { participantId: p1Id, amountMinor: 250000, percentage: 33.33 },
          { participantId: p3Id, amountMinor: 250000, percentage: 33.33 },
          { participantId: p4Id, amountMinor: 250000, percentage: 33.34 },
        ],
        notes: 'Includes GoPro video recording',
        createdAt: new Date(Date.now() - 36000000).toISOString(),
        updatedAt: new Date(Date.now() - 36000000).toISOString(),
      },
    ],
    settlements: [
      {
        id: 'demo-set-1',
        groupId: 'demo-group-goa',
        fromParticipantId: p2Id, // Priya paid ₹2,000 back to Aarav
        toParticipantId: p1Id,
        amountMinor: 200000,
        settledAt: new Date(Date.now() - 20000000).toISOString(),
        notes: 'UPI payment for villa advance',
      },
    ],
    activities: [
      {
        id: 'act-1',
        groupId: 'demo-group-goa',
        type: 'group_created',
        description: 'Group "Goa Coastal Trip 🏖️" was created',
        timestamp: new Date(Date.now() - 172900000).toISOString(),
      },
      {
        id: 'act-2',
        groupId: 'demo-group-goa',
        type: 'expense_created',
        description: 'Aarav (You) added "Beachside Villa Booking" (₹16,000.00)',
        timestamp: new Date(Date.now() - 172800000).toISOString(),
        amountMinor: 1600000,
      },
      {
        id: 'act-3',
        groupId: 'demo-group-goa',
        type: 'expense_created',
        description: 'Priya added "Seafood Feast at Thalassa" (₹4,800.00)',
        timestamp: new Date(Date.now() - 86400000).toISOString(),
        amountMinor: 480000,
      },
      {
        id: 'act-4',
        groupId: 'demo-group-goa',
        type: 'expense_created',
        description: 'Rohan added "Scooters & Fuel" (₹2,400.00)',
        timestamp: new Date(Date.now() - 72000000).toISOString(),
        amountMinor: 240000,
      },
      {
        id: 'act-5',
        groupId: 'demo-group-goa',
        type: 'expense_created',
        description: 'Sneha added "Scuba Diving at Grand Island" (₹7,500.00)',
        timestamp: new Date(Date.now() - 36000000).toISOString(),
        amountMinor: 750000,
      },
      {
        id: 'act-6',
        groupId: 'demo-group-goa',
        type: 'settlement_recorded',
        description: 'Priya paid Aarav (You) ₹2,000.00 (UPI payment)',
        timestamp: new Date(Date.now() - 20000000).toISOString(),
        amountMinor: 200000,
      },
    ],
    createdAt: new Date(Date.now() - 172900000).toISOString(),
    updatedAt: new Date().toISOString(),
  };
}
