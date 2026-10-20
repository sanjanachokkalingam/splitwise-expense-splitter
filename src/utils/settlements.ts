import { Group, ParticipantBalance, SuggestedSettlement } from '../types';

/**
 * Calculates exact balances for all participants in a group.
 * Follows the invariant:
 * Net Balance = (Total Paid in Expenses - Total Assigned Expense Shares) + (Settlements Paid - Settlements Received)
 *
 * Positive balance = Participant should receive money (Creditor).
 * Negative balance = Participant owes money (Debtor).
 * Zero balance = Participant is completely settled up.
 */
export function calculateGroupBalances(group: Group): ParticipantBalance[] {
  const balanceMap = new Map<string, ParticipantBalance>();

  // Initialize for all group participants
  for (const p of group.participants) {
    balanceMap.set(p.id, {
      participantId: p.id,
      participantName: p.name,
      totalPaidMinor: 0,
      totalShareMinor: 0,
      settlementsPaidMinor: 0,
      settlementsReceivedMinor: 0,
      expenseNetBalanceMinor: 0,
      netBalanceMinor: 0,
    });
  }

  // 1. Process all expenses
  for (const expense of group.expenses) {
    // Record payer
    const payer = balanceMap.get(expense.paidByParticipantId);
    if (payer) {
      payer.totalPaidMinor += expense.amountMinor;
    }

    // Record shares
    for (const share of expense.shares) {
      const participant = balanceMap.get(share.participantId);
      if (participant) {
        participant.totalShareMinor += share.amountMinor;
      }
    }
  }

  // 2. Process all completed settlements
  for (const settlement of group.settlements) {
    // Debtor paid settlement -> improves their net balance (+amount)
    const debtor = balanceMap.get(settlement.fromParticipantId);
    if (debtor) {
      debtor.settlementsPaidMinor += settlement.amountMinor;
    }

    // Creditor received settlement -> reduces their net balance (-amount)
    const creditor = balanceMap.get(settlement.toParticipantId);
    if (creditor) {
      creditor.settlementsReceivedMinor += settlement.amountMinor;
    }
  }

  // 3. Compute final net balances
  for (const balance of balanceMap.values()) {
    balance.expenseNetBalanceMinor = balance.totalPaidMinor - balance.totalShareMinor;
    balance.netBalanceMinor =
      balance.expenseNetBalanceMinor +
      balance.settlementsPaidMinor -
      balance.settlementsReceivedMinor;
  }

  return Array.from(balanceMap.values());
}

/**
 * Verifies that the sum of all participant net balances is zero.
 */
export function verifyZeroSum(balances: ParticipantBalance[]): boolean {
  if (balances.length === 0) return true;
  const sum = balances.reduce((acc, b) => acc + b.netBalanceMinor, 0);
  return sum === 0;
}

/**
 * Deterministic debt simplification algorithm.
 * Uses greedy matching on sorted debtors and creditors to find the minimum
 * number of transactions needed to settle all debts.
 */
export function calculateSuggestedSettlements(
  balances: ParticipantBalance[]
): SuggestedSettlement[] {
  // Separate into debtors (netBalance < 0) and creditors (netBalance > 0)
  interface Party {
    id: string;
    name: string;
    amountMinor: number;
  }

  const debtors: Party[] = [];
  const creditors: Party[] = [];

  for (const b of balances) {
    if (b.netBalanceMinor < 0) {
      debtors.push({
        id: b.participantId,
        name: b.participantName,
        amountMinor: -b.netBalanceMinor, // store as positive amount owed
      });
    } else if (b.netBalanceMinor > 0) {
      creditors.push({
        id: b.participantId,
        name: b.participantName,
        amountMinor: b.netBalanceMinor, // store as positive amount to receive
      });
    }
  }

  // Sort deterministically:
  // Descending by amountMinor; if amounts are equal, sort by id alphabetically.
  const sortParties = (a: Party, b: Party) => {
    if (b.amountMinor !== a.amountMinor) {
      return b.amountMinor - a.amountMinor;
    }
    return a.id.localeCompare(b.id);
  };

  debtors.sort(sortParties);
  creditors.sort(sortParties);

  const settlements: SuggestedSettlement[] = [];

  let dIdx = 0;
  let cIdx = 0;

  while (dIdx < debtors.length && cIdx < creditors.length) {
    const debtor = debtors[dIdx];
    const creditor = creditors[cIdx];

    // Amount to settle is the minimum of what debtor owes and creditor is owed
    const settleAmount = Math.min(debtor.amountMinor, creditor.amountMinor);

    if (settleAmount > 0) {
      settlements.push({
        fromParticipantId: debtor.id,
        toParticipantId: creditor.id,
        fromName: debtor.name,
        toName: creditor.name,
        amountMinor: settleAmount,
      });

      debtor.amountMinor -= settleAmount;
      creditor.amountMinor -= settleAmount;
    }

    if (debtor.amountMinor === 0) {
      dIdx++;
    }
    if (creditor.amountMinor === 0) {
      cIdx++;
    }
  }

  return settlements;
}

/**
 * Calculates summary metrics for a group: total spent, per-person share, etc.
 */
export function calculateGroupMetrics(group: Group) {
  const totalSpentMinor = group.expenses.reduce(
    (acc, exp) => acc + exp.amountMinor,
    0
  );

  const participantCount = group.participants.length;
  const perPersonShareMinor =
    participantCount > 0 ? Math.round(totalSpentMinor / participantCount) : 0;

  const totalSettledMinor = group.settlements.reduce(
    (acc, s) => acc + s.amountMinor,
    0
  );

  return {
    totalSpentMinor,
    participantCount,
    perPersonShareMinor,
    totalSettledMinor,
  };
}
