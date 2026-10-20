import { describe, it, expect } from 'vitest';
import { Group, Participant } from '../types';
import {
  calculateEqualShares,
  calculatePercentageShares,
  toMinorUnits,
  fromMinorUnits,
} from './money';
import {
  calculateGroupBalances,
  calculateSuggestedSettlements,
  verifyZeroSum,
} from './settlements';

describe('Financial Settlements and Balance Calculations', () => {
  const p1: Participant = { id: 'p1', name: 'Aarav', color: '#10B981' };
  const p2: Participant = { id: 'p2', name: 'Priya', color: '#3B82F6' };
  const p3: Participant = { id: 'p3', name: 'Rohan', color: '#F59E0B' };
  const p4: Participant = { id: 'p4', name: 'Ananya', color: '#EC4899' };

  it('handles fractional currency units in equal splits deterministically', () => {
    // 10000 paise (₹100) split between 3 participants
    const shares = calculateEqualShares(10000, ['p1', 'p2', 'p3']);
    expect(shares).toHaveLength(3);

    const totalCalculated = shares.reduce((acc, s) => acc + s.amountMinor, 0);
    expect(totalCalculated).toBe(10000);

    // 10000 / 3 = 3333 with remainder 1
    expect(shares[0].amountMinor).toBe(3334);
    expect(shares[1].amountMinor).toBe(3333);
    expect(shares[2].amountMinor).toBe(3333);
  });

  it('handles unequal splits and keeps balances in zero-sum', () => {
    // Total 5000 paise (₹50)
    // Aarav paid ₹50.
    // Shares: Aarav 1000, Priya 2500, Rohan 1500
    const group: Group = {
      id: 'g1',
      name: 'Dinner',
      description: '',
      currency: 'INR',
      participants: [p1, p2, p3],
      expenses: [
        {
          id: 'e1',
          groupId: 'g1',
          title: 'Dinner Bill',
          amountMinor: 5000,
          paidByParticipantId: 'p1',
          date: '2026-10-20',
          category: 'food',
          splitMethod: 'unequal',
          splitParticipants: ['p1', 'p2', 'p3'],
          shares: [
            { participantId: 'p1', amountMinor: 1000 },
            { participantId: 'p2', amountMinor: 2500 },
            { participantId: 'p3', amountMinor: 1500 },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      settlements: [],
      activities: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const balances = calculateGroupBalances(group);
    expect(verifyZeroSum(balances)).toBe(true);

    const aarav = balances.find((b) => b.participantId === 'p1')!;
    const priya = balances.find((b) => b.participantId === 'p2')!;
    const rohan = balances.find((b) => b.participantId === 'p3')!;

    // Aarav paid 5000, owes 1000 -> net +4000
    expect(aarav.netBalanceMinor).toBe(4000);
    // Priya paid 0, owes 2500 -> net -2500
    expect(priya.netBalanceMinor).toBe(-2500);
    // Rohan paid 0, owes 1500 -> net -1500
    expect(rohan.netBalanceMinor).toBe(-1500);

    const settlements = calculateSuggestedSettlements(balances);
    expect(settlements).toHaveLength(2);

    // Priya owes 2500 to Aarav, Rohan owes 1500 to Aarav
    expect(settlements).toContainEqual({
      fromParticipantId: 'p2',
      toParticipantId: 'p1',
      fromName: 'Priya',
      toName: 'Aarav',
      amountMinor: 2500,
    });
    expect(settlements).toContainEqual({
      fromParticipantId: 'p3',
      toParticipantId: 'p1',
      fromName: 'Rohan',
      toName: 'Aarav',
      amountMinor: 1500,
    });
  });

  it('handles percentage split accurately with rounding allocation', () => {
    // ₹100 split 33.3%, 33.3%, 33.4% = 100%
    const result = calculatePercentageShares(10000, [
      { participantId: 'p1', percentage: 33.3 },
      { participantId: 'p2', percentage: 33.3 },
      { participantId: 'p3', percentage: 33.4 },
    ]);

    expect(result.isValid).toBe(true);
    const sum = result.shares.reduce((acc, s) => acc + s.amountMinor, 0);
    expect(sum).toBe(10000);
  });

  it('correctly handles a participant who paid nothing across all expenses', () => {
    const group: Group = {
      id: 'g2',
      name: 'Movie Night',
      description: '',
      currency: 'INR',
      participants: [p1, p2, p3],
      expenses: [
        {
          id: 'e1',
          groupId: 'g2',
          title: 'Movie Tickets',
          amountMinor: 6000,
          paidByParticipantId: 'p1',
          date: '2026-10-20',
          category: 'activities',
          splitMethod: 'equal',
          splitParticipants: ['p1', 'p2', 'p3'],
          shares: [
            { participantId: 'p1', amountMinor: 2000 },
            { participantId: 'p2', amountMinor: 2000 },
            { participantId: 'p3', amountMinor: 2000 },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      settlements: [],
      activities: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const balances = calculateGroupBalances(group);
    expect(verifyZeroSum(balances)).toBe(true);

    const rohan = balances.find((b) => b.participantId === 'p3')!;
    expect(rohan.totalPaidMinor).toBe(0);
    expect(rohan.totalShareMinor).toBe(2000);
    expect(rohan.netBalanceMinor).toBe(-2000);
  });

  it('simplifies debts with multiple creditors and debtors efficiently and deterministically', () => {
    // 4 participants:
    // Aarav paid 12000, share was 3000 -> net +9000
    // Priya paid 0, share was 4000 -> net -4000
    // Rohan paid 0, share was 3000 -> net -3000
    // Ananya paid 0, share was 2000 -> net -2000
    // Total debts = 9000, Total credits = 9000
    const group: Group = {
      id: 'g3',
      name: 'Weekend Getaway',
      description: '',
      currency: 'INR',
      participants: [p1, p2, p3, p4],
      expenses: [
        {
          id: 'e1',
          groupId: 'g3',
          title: 'Resort Stay',
          amountMinor: 12000,
          paidByParticipantId: 'p1',
          date: '2026-10-20',
          category: 'stay',
          splitMethod: 'unequal',
          splitParticipants: ['p1', 'p2', 'p3', 'p4'],
          shares: [
            { participantId: 'p1', amountMinor: 3000 },
            { participantId: 'p2', amountMinor: 4000 },
            { participantId: 'p3', amountMinor: 3000 },
            { participantId: 'p4', amountMinor: 2000 },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      settlements: [],
      activities: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const balances = calculateGroupBalances(group);
    expect(verifyZeroSum(balances)).toBe(true);

    const settlements = calculateSuggestedSettlements(balances);
    // All 3 debtors owe Aarav
    expect(settlements).toHaveLength(3);

    // Never suggests paying oneself
    settlements.forEach((s) => {
      expect(s.fromParticipantId).not.toBe(s.toParticipantId);
      expect(s.amountMinor).toBeGreaterThan(0);
    });

    // Check deterministic order: Priya (4000), then Rohan (3000), then Ananya (2000)
    expect(settlements[0].fromParticipantId).toBe('p2');
    expect(settlements[0].amountMinor).toBe(4000);
    expect(settlements[1].fromParticipantId).toBe('p3');
    expect(settlements[1].amountMinor).toBe(3000);
    expect(settlements[2].fromParticipantId).toBe('p4');
    expect(settlements[2].amountMinor).toBe(2000);
  });

  it('updates balances when a settlement is recorded and handles fully settled groups', () => {
    // Aarav paid ₹2000, split with Priya (₹1000 each)
    const baseGroup: Group = {
      id: 'g4',
      name: 'Cab Ride',
      description: '',
      currency: 'INR',
      participants: [p1, p2],
      expenses: [
        {
          id: 'e1',
          groupId: 'g4',
          title: 'Cab',
          amountMinor: 2000,
          paidByParticipantId: 'p1',
          date: '2026-10-20',
          category: 'travel',
          splitMethod: 'equal',
          splitParticipants: ['p1', 'p2'],
          shares: [
            { participantId: 'p1', amountMinor: 1000 },
            { participantId: 'p2', amountMinor: 1000 },
          ],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      settlements: [],
      activities: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    let balances = calculateGroupBalances(baseGroup);
    expect(balances.find((b) => b.participantId === 'p2')?.netBalanceMinor).toBe(-1000);

    // Priya settles ₹1000 to Aarav
    const settledGroup: Group = {
      ...baseGroup,
      settlements: [
        {
          id: 's1',
          groupId: 'g4',
          fromParticipantId: 'p2',
          toParticipantId: 'p1',
          amountMinor: 1000,
          settledAt: '2026-10-20T12:00:00Z',
        },
      ],
    };

    balances = calculateGroupBalances(settledGroup);
    expect(verifyZeroSum(balances)).toBe(true);

    const p1Bal = balances.find((b) => b.participantId === 'p1')!;
    const p2Bal = balances.find((b) => b.participantId === 'p2')!;

    expect(p1Bal.netBalanceMinor).toBe(0);
    expect(p2Bal.netBalanceMinor).toBe(0);

    const suggested = calculateSuggestedSettlements(balances);
    expect(suggested).toHaveLength(0); // Fully settled!
  });

  it('correctly converts decimal currency values to integer minor units avoiding float rounding traps', () => {
    expect(toMinorUnits(19.99)).toBe(1999);
    expect(toMinorUnits('1,250.50')).toBe(125050);
    expect(toMinorUnits(0)).toBe(0);
    expect(toMinorUnits('0.05')).toBe(5);
    expect(fromMinorUnits(1999)).toBe(19.99);
    expect(fromMinorUnits(125050)).toBe(1250.5);
  });
});
