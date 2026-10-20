export type Currency = 'INR' | 'USD' | 'EUR' | 'GBP';

export type ExpenseCategory =
  | 'food'
  | 'travel'
  | 'stay'
  | 'shopping'
  | 'activities'
  | 'utilities'
  | 'other';

export type SplitMethod = 'equal' | 'unequal' | 'percentage' | 'exact';

export interface Participant {
  id: string;
  name: string;
  color: string;
}

export interface ExpenseShare {
  participantId: string;
  amountMinor: number; // In minor units (paise/cents)
  percentage?: number; // Optional for percentage method records
}

export interface Expense {
  id: string;
  groupId: string;
  title: string;
  amountMinor: number; // Total amount in minor units
  paidByParticipantId: string;
  date: string; // ISO date format YYYY-MM-DD
  category: ExpenseCategory;
  splitMethod: SplitMethod;
  splitParticipants: string[]; // List of participant IDs involved
  shares: ExpenseShare[]; // Exact share per involved participant
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Settlement {
  id: string;
  groupId: string;
  fromParticipantId: string; // Debtor
  toParticipantId: string; // Creditor
  amountMinor: number;
  settledAt: string;
  notes?: string;
}

export type ActivityEventType =
  | 'group_created'
  | 'group_updated'
  | 'expense_created'
  | 'expense_updated'
  | 'expense_deleted'
  | 'settlement_recorded'
  | 'settlement_deleted';

export interface ActivityEvent {
  id: string;
  groupId: string;
  type: ActivityEventType;
  description: string;
  timestamp: string;
  participantId?: string;
  amountMinor?: number;
}

export interface Group {
  id: string;
  name: string;
  description: string;
  currency: Currency;
  participants: Participant[];
  currentUserId?: string; // Participant that represents the user
  expenses: Expense[];
  settlements: Settlement[];
  activities: ActivityEvent[];
  createdAt: string;
  updatedAt: string;
}

export interface ParticipantBalance {
  participantId: string;
  participantName: string;
  totalPaidMinor: number;
  totalShareMinor: number;
  settlementsPaidMinor: number;
  settlementsReceivedMinor: number;
  expenseNetBalanceMinor: number;
  netBalanceMinor: number; // Net balance including completed settlements
}

export interface SuggestedSettlement {
  fromParticipantId: string;
  toParticipantId: string;
  fromName: string;
  toName: string;
  amountMinor: number;
}
