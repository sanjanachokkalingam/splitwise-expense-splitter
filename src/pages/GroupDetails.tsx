import React, { useState } from 'react';
import {
  ArrowLeft,
  Plus,
  Handshake,
  Edit,
  Trash2,
  PieChart,
  History,
  CheckCircle2,
  ArrowRight,
  RotateCcw,
  Receipt,
  Utensils,
  Car,
  Home,
  ShoppingBag,
  Ticket,
  Zap,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  Expense,
  ExpenseCategory,
  Group,
  Participant,
  Settlement,
  SuggestedSettlement,
} from '../types';
import { formatCurrency } from '../utils/money';
import {
  calculateGroupBalances,
  calculateGroupMetrics,
  calculateSuggestedSettlements,
} from '../utils/settlements';
import { ExpenseModal } from '../components/ExpenseModal';
import { SettleUpModal } from '../components/SettleUpModal';
import { EditGroupModal } from '../components/EditGroupModal';
import { ConfirmDialog } from '../components/ConfirmDialog';

interface GroupDetailsProps {
  group: Group;
  onBackToDashboard: () => void;
  onUpdateGroup: (group: Group) => void;
  onDeleteGroup: (groupId: string) => void;
}

type TabType = 'balances' | 'expenses' | 'settlements' | 'activity';

export const GroupDetails: React.FC<GroupDetailsProps> = ({
  group,
  onBackToDashboard,
  onUpdateGroup,
  onDeleteGroup,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('balances');
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<Expense | null>(null);

  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [activeSuggestedSettlement, setActiveSuggestedSettlement] =
    useState<SuggestedSettlement | null>(null);

  const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);

  // Confirm dialogs
  const [deleteExpenseId, setDeleteExpenseId] = useState<string | null>(null);
  const [undoSettlementId, setUndoSettlementId] = useState<string | null>(null);
  const [isDeleteGroupDialogOpen, setIsDeleteGroupDialogOpen] = useState(false);

  // Expanded expense items for seeing shares
  const [expandedExpenseIds, setExpandedExpenseIds] = useState<Set<string>>(new Set());

  const toggleExpandExpense = (id: string) => {
    const next = new Set(expandedExpenseIds);
    if (next.has(id)) {
      next.delete(id);
    } else {
      next.add(id);
    }
    setExpandedExpenseIds(next);
  };

  // Calculations
  const balances = calculateGroupBalances(group);
  const suggestedSettlements = calculateSuggestedSettlements(balances);
  const metrics = calculateGroupMetrics(group);

  // Participant helper map
  const participantMap = new Map<string, Participant>();
  group.participants.forEach((p) => participantMap.set(p.id, p));

  const getCategoryIcon = (category: ExpenseCategory) => {
    switch (category) {
      case 'food':
        return <Utensils size={16} />;
      case 'travel':
        return <Car size={16} />;
      case 'stay':
        return <Home size={16} />;
      case 'shopping':
        return <ShoppingBag size={16} />;
      case 'activities':
        return <Ticket size={16} />;
      case 'utilities':
        return <Zap size={16} />;
      case 'other':
      default:
        return <Receipt size={16} />;
    }
  };

  // Handlers for Expenses
  const handleSaveExpense = (savedExpense: Expense) => {
    const isEdit = group.expenses.some((e) => e.id === savedExpense.id);
    let updatedExpenses: Expense[];
    let activityDesc = '';

    const payer = participantMap.get(savedExpense.paidByParticipantId)?.name || 'Someone';

    if (isEdit) {
      updatedExpenses = group.expenses.map((e) =>
        e.id === savedExpense.id ? savedExpense : e
      );
      activityDesc = `Expense "${savedExpense.title}" was updated by ${payer} (${formatCurrency(savedExpense.amountMinor, group.currency)}).`;
    } else {
      updatedExpenses = [savedExpense, ...group.expenses];
      activityDesc = `${payer} added "${savedExpense.title}" (${formatCurrency(savedExpense.amountMinor, group.currency)}).`;
    }

    const updatedGroup: Group = {
      ...group,
      expenses: updatedExpenses,
      updatedAt: new Date().toISOString(),
      activities: [
        {
          id: 'act-' + Date.now(),
          groupId: group.id,
          type: isEdit ? 'expense_updated' : 'expense_created',
          description: activityDesc,
          timestamp: new Date().toISOString(),
          amountMinor: savedExpense.amountMinor,
        },
        ...group.activities,
      ],
    };

    onUpdateGroup(updatedGroup);
    setEditingExpense(null);
  };

  const handleDeleteExpenseConfirm = () => {
    if (!deleteExpenseId) return;
    const expToDelete = group.expenses.find((e) => e.id === deleteExpenseId);
    if (!expToDelete) return;

    const updatedExpenses = group.expenses.filter((e) => e.id !== deleteExpenseId);
    const updatedGroup: Group = {
      ...group,
      expenses: updatedExpenses,
      updatedAt: new Date().toISOString(),
      activities: [
        {
          id: 'act-' + Date.now(),
          groupId: group.id,
          type: 'expense_deleted',
          description: `Expense "${expToDelete.title}" (${formatCurrency(expToDelete.amountMinor, group.currency)}) was deleted.`,
          timestamp: new Date().toISOString(),
        },
        ...group.activities,
      ],
    };

    onUpdateGroup(updatedGroup);
    setDeleteExpenseId(null);
  };

  // Handlers for Settlements
  const handleRecordSettlement = (settlement: Settlement) => {
    const fromName = participantMap.get(settlement.fromParticipantId)?.name || 'Someone';
    const toName = participantMap.get(settlement.toParticipantId)?.name || 'Someone';

    const updatedGroup: Group = {
      ...group,
      settlements: [settlement, ...group.settlements],
      updatedAt: new Date().toISOString(),
      activities: [
        {
          id: 'act-' + Date.now(),
          groupId: group.id,
          type: 'settlement_recorded',
          description: `${fromName} paid ${toName} ${formatCurrency(settlement.amountMinor, group.currency)}${settlement.notes ? ` (${settlement.notes})` : ''}.`,
          timestamp: new Date().toISOString(),
          amountMinor: settlement.amountMinor,
        },
        ...group.activities,
      ],
    };

    onUpdateGroup(updatedGroup);
    setActiveSuggestedSettlement(null);
  };

  const handleUndoSettlementConfirm = () => {
    if (!undoSettlementId) return;
    const setToUndo = group.settlements.find((s) => s.id === undoSettlementId);
    if (!setToUndo) return;

    const fromName = participantMap.get(setToUndo.fromParticipantId)?.name || 'Someone';
    const toName = participantMap.get(setToUndo.toParticipantId)?.name || 'Someone';

    const updatedSettlements = group.settlements.filter((s) => s.id !== undoSettlementId);
    const updatedGroup: Group = {
      ...group,
      settlements: updatedSettlements,
      updatedAt: new Date().toISOString(),
      activities: [
        {
          id: 'act-' + Date.now(),
          groupId: group.id,
          type: 'settlement_deleted',
          description: `Settlement of ${formatCurrency(setToUndo.amountMinor, group.currency)} from ${fromName} to ${toName} was undone.`,
          timestamp: new Date().toISOString(),
        },
        ...group.activities,
      ],
    };

    onUpdateGroup(updatedGroup);
    setUndoSettlementId(null);
  };

  return (
    <div className="page-content">
      {/* Top Navigation Row */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: '20px',
        }}
      >
        <button
          type="button"
          className="btn btn-ghost"
          style={{ paddingLeft: '8px' }}
          onClick={onBackToDashboard}
        >
          <ArrowLeft size={18} /> Back to Dashboard
        </button>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <button
            type="button"
            className="btn btn-secondary btn-sm"
            onClick={() => setIsEditGroupModalOpen(true)}
          >
            <Edit size={15} /> Edit Group
          </button>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--color-danger)' }}
            onClick={() => setIsDeleteGroupDialogOpen(true)}
          >
            <Trash2 size={15} /> Delete
          </button>
        </div>
      </div>

      {/* Group Header Hero */}
      <div
        className="glass-card"
        style={{
          marginBottom: '28px',
          background: 'linear-gradient(135deg, var(--bg-surface) 0%, rgba(23, 39, 31, 0.8) 100%)',
        }}
      >
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '16px',
            marginBottom: '20px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: 'var(--radius-md)',
                backgroundColor: 'var(--accent-subtle)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '1.6rem',
                fontWeight: 800,
                border: '1px solid var(--border-accent)',
              }}
            >
              {group.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <h1 style={{ fontSize: '1.8rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                  {group.name}
                </h1>
                <span className="badge badge-neutral">{group.currency}</span>
              </div>
              {group.description && (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.95rem', marginTop: '4px' }}>
                  {group.description}
                </p>
              )}
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <button
              type="button"
              className="btn btn-primary"
              onClick={() => {
                setEditingExpense(null);
                setIsExpenseModalOpen(true);
              }}
            >
              <Plus size={18} /> Add Expense
            </button>
            <button
              type="button"
              className="btn btn-secondary"
              onClick={() => {
                setActiveSuggestedSettlement(null);
                setIsSettleModalOpen(true);
              }}
            >
              <Handshake size={18} /> Settle Up
            </button>
          </div>
        </div>

        {/* Quick Metrics Bar */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
            gap: '14px',
            borderTop: '1px solid var(--border-glass)',
            paddingTop: '20px',
          }}
        >
          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Total Group Spend
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(metrics.totalSpentMinor, group.currency)}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              Across {group.expenses.length} expense{group.expenses.length === 1 ? '' : 's'}
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Equal Share / Person
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
              {formatCurrency(metrics.perPersonShareMinor, group.currency)}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              For {metrics.participantCount} members
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Completed Settlements
            </div>
            <div style={{ fontSize: '1.35rem', fontWeight: 700, fontFamily: 'var(--font-mono)', color: 'var(--color-success)' }}>
              {formatCurrency(metrics.totalSettledMinor, group.currency)}
            </div>
            <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
              {group.settlements.length} payment{group.settlements.length === 1 ? '' : 's'} settled
            </div>
          </div>

          <div>
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Settlement Status
            </div>
            <div style={{ marginTop: '4px' }}>
              {suggestedSettlements.length === 0 ? (
                <span className="badge badge-success" style={{ fontSize: '0.82rem', padding: '6px 12px' }}>
                  <CheckCircle2 size={15} /> All Debts Settled
                </span>
              ) : (
                <span className="badge badge-warning" style={{ fontSize: '0.82rem', padding: '6px 12px' }}>
                  {suggestedSettlements.length} Payment{suggestedSettlements.length === 1 ? '' : 's'} Needed
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Tabs Navigation */}
      <div className="tabs-nav">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'balances' ? 'active' : ''}`}
          onClick={() => setActiveTab('balances')}
        >
          <PieChart size={17} /> Balances & Settlements
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'expenses' ? 'active' : ''}`}
          onClick={() => setActiveTab('expenses')}
        >
          <Receipt size={17} /> Expenses ({group.expenses.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'settlements' ? 'active' : ''}`}
          onClick={() => setActiveTab('settlements')}
        >
          <Handshake size={17} /> Settlement History ({group.settlements.length})
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'activity' ? 'active' : ''}`}
          onClick={() => setActiveTab('activity')}
        >
          <History size={17} /> Activity Log
        </button>
      </div>

      {/* TAB 1: Balances & Settlements */}
      {activeTab === 'balances' && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '28px' }}>
          {/* Suggested Settlements Section */}
          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '14px',
              }}
            >
              <div>
                <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  How to Settle Up (Simplified Debts)
                </h2>
                <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                  Minimum payment transactions calculated deterministically to settle all balances
                </p>
              </div>

              {suggestedSettlements.length > 0 && (
                <button
                  type="button"
                  className="btn btn-success btn-sm"
                  onClick={() => {
                    setActiveSuggestedSettlement(suggestedSettlements[0]);
                    setIsSettleModalOpen(true);
                  }}
                >
                  <Handshake size={15} /> Settle Next
                </button>
              )}
            </div>

            {suggestedSettlements.length === 0 ? (
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-glass)',
                  borderRadius: 'var(--radius-lg)',
                  padding: '32px 24px',
                  textAlign: 'center',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                }}
              >
                <div
                  style={{
                    width: '48px',
                    height: '48px',
                    borderRadius: '50%',
                    backgroundColor: 'var(--color-success-bg)',
                    color: 'var(--color-success)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginBottom: '12px',
                  }}
                >
                  <CheckCircle2 size={24} />
                </div>
                <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                  Everyone is settled up!
                </h3>
                <p style={{ fontSize: '0.88rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                  No outstanding debts in this group. All shares and expenses are perfectly balanced.
                </p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {suggestedSettlements.map((s, idx) => {
                  const fromParticipant = participantMap.get(s.fromParticipantId);
                  const toParticipant = participantMap.get(s.toParticipantId);

                  return (
                    <div
                      key={idx}
                      className="glass-card"
                      style={{
                        padding: '16px 20px',
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '14px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div
                          className="avatar"
                          style={{
                            backgroundColor: fromParticipant?.color || '#F59E0B',
                            width: '32px',
                            height: '32px',
                          }}
                        >
                          {s.fromName.charAt(0).toUpperCase()}
                        </div>

                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                          {s.fromName}
                          {s.fromParticipantId === group.currentUserId ? ' (You)' : ''}
                        </span>

                        <div
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            color: 'var(--text-muted)',
                            padding: '0 4px',
                          }}
                        >
                          <span style={{ fontSize: '0.8rem' }}>pays</span>
                          <ArrowRight size={16} style={{ color: 'var(--accent-primary)' }} />
                        </div>

                        <div
                          className="avatar"
                          style={{
                            backgroundColor: toParticipant?.color || '#3B82F6',
                            width: '32px',
                            height: '32px',
                          }}
                        >
                          {s.toName.charAt(0).toUpperCase()}
                        </div>

                        <span style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                          {s.toName}
                          {s.toParticipantId === group.currentUserId ? ' (You)' : ''}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <span
                          style={{
                            fontFamily: 'var(--font-mono)',
                            fontSize: '1.2rem',
                            fontWeight: 700,
                            color: 'var(--text-primary)',
                          }}
                        >
                          {formatCurrency(s.amountMinor, group.currency)}
                        </span>

                        <button
                          type="button"
                          className="btn btn-secondary btn-sm"
                          onClick={() => {
                            setActiveSuggestedSettlement(s);
                            setIsSettleModalOpen(true);
                          }}
                        >
                          <CheckCircle2 size={15} style={{ color: 'var(--color-success)' }} />
                          Mark as Settled
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Individual Participant Balance Summary */}
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '14px' }}>
              Participant Net Balances
            </h2>

            <div
              style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))',
                gap: '16px',
              }}
            >
              {balances.map((b) => {
                const participant = participantMap.get(b.participantId);
                const isYou = b.participantId === group.currentUserId;
                const isCreditor = b.netBalanceMinor > 0;
                const isDebtor = b.netBalanceMinor < 0;

                return (
                  <div
                    key={b.participantId}
                    className="glass-card"
                    style={{
                      borderLeft: isCreditor
                        ? '4px solid var(--color-success)'
                        : isDebtor
                        ? '4px solid var(--color-danger)'
                        : '4px solid var(--border-glass-bright)',
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '14px',
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div
                          className="avatar"
                          style={{
                            backgroundColor: participant?.color || '#3B82F6',
                            width: '36px',
                            height: '36px',
                          }}
                        >
                          {b.participantName.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight: 700, fontSize: '1rem' }}>
                            {b.participantName}
                          </div>
                          {isYou && (
                            <span
                              className="badge badge-success"
                              style={{ fontSize: '0.68rem', padding: '1px 6px', marginTop: '2px' }}
                            >
                              You
                            </span>
                          )}
                        </div>
                      </div>

                      <span
                        className={`badge ${
                          isCreditor
                            ? 'badge-success'
                            : isDebtor
                            ? 'badge-danger'
                            : 'badge-neutral'
                        }`}
                        style={{ fontFamily: 'var(--font-mono)' }}
                      >
                        {isCreditor
                          ? `+${formatCurrency(b.netBalanceMinor, group.currency)}`
                          : isDebtor
                          ? `-${formatCurrency(Math.abs(b.netBalanceMinor), group.currency)}`
                          : 'Settled'}
                      </span>
                    </div>

                    <div
                      style={{
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px',
                        fontSize: '0.84rem',
                        color: 'var(--text-secondary)',
                        borderTop: '1px solid var(--border-glass)',
                        paddingTop: '12px',
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Total Paid:</span>
                        <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          {formatCurrency(b.totalPaidMinor, group.currency)}
                        </strong>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                        <span>Assigned Share:</span>
                        <strong style={{ color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                          {formatCurrency(b.totalShareMinor, group.currency)}
                        </strong>
                      </div>
                      {b.settlementsPaidMinor > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Settlements Paid Out:</span>
                          <strong style={{ color: 'var(--color-success)', fontFamily: 'var(--font-mono)' }}>
                            +{formatCurrency(b.settlementsPaidMinor, group.currency)}
                          </strong>
                        </div>
                      )}
                      {b.settlementsReceivedMinor > 0 && (
                        <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                          <span>Settlements Received:</span>
                          <strong style={{ color: 'var(--color-danger)', fontFamily: 'var(--font-mono)' }}>
                            -{formatCurrency(b.settlementsReceivedMinor, group.currency)}
                          </strong>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Expenses List */}
      {activeTab === 'expenses' && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Expenses Ledger
              </h2>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                All logged items, payers, categories, and split distributions
              </p>
            </div>

            <button
              type="button"
              className="btn btn-primary btn-sm"
              onClick={() => {
                setEditingExpense(null);
                setIsExpenseModalOpen(true);
              }}
            >
              <Plus size={16} /> Add Expense
            </button>
          </div>

          {group.expenses.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon-box">
                <Receipt size={32} />
              </div>
              <h3 className="empty-state-title">No expenses added yet</h3>
              <p className="empty-state-desc">
                Start adding your bills, hotel stays, food, or travel fares. SplitWise will calculate who owes whom automatically.
              </p>
              <button
                type="button"
                className="btn btn-primary"
                onClick={() => {
                  setEditingExpense(null);
                  setIsExpenseModalOpen(true);
                }}
              >
                <Plus size={16} /> Add First Expense
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {group.expenses.map((exp) => {
                const payer = participantMap.get(exp.paidByParticipantId);
                const isExpanded = expandedExpenseIds.has(exp.id);

                return (
                  <div key={exp.id} className="glass-card" style={{ padding: '16px 20px' }}>
                    <div
                      style={{
                        display: 'flex',
                        flexWrap: 'wrap',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: '12px',
                      }}
                    >
                      {/* Left: Icon, Title, Payer, Date */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div
                          style={{
                            width: '42px',
                            height: '42px',
                            borderRadius: 'var(--radius-md)',
                            backgroundColor: 'var(--bg-surface-elevated)',
                            color: 'var(--accent-primary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--border-glass-bright)',
                          }}
                        >
                          {getCategoryIcon(exp.category)}
                        </div>

                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <h3 style={{ fontSize: '1.05rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                              {exp.title}
                            </h3>
                            <span className="badge badge-neutral" style={{ fontSize: '0.68rem' }}>
                              {exp.splitMethod} split
                            </span>
                          </div>

                          <div
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '10px',
                              fontSize: '0.8rem',
                              color: 'var(--text-secondary)',
                              marginTop: '2px',
                            }}
                          >
                            <span>
                              Paid by <strong>{payer?.name || 'Unknown'}</strong>
                            </span>
                            <span>•</span>
                            <span>{exp.date}</span>
                            <span>•</span>
                            <span>{exp.splitParticipants.length} people</span>
                          </div>
                        </div>
                      </div>

                      {/* Right: Amount & Actions */}
                      <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                        <div style={{ textAlign: 'right' }}>
                          <div
                            style={{
                              fontSize: '1.25rem',
                              fontWeight: 700,
                              fontFamily: 'var(--font-mono)',
                              color: 'var(--text-primary)',
                            }}
                          >
                            {formatCurrency(exp.amountMinor, group.currency)}
                          </div>
                        </div>

                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '6px' }}
                            title="Toggle breakdown"
                            onClick={() => toggleExpandExpense(exp.id)}
                            aria-label="Toggle expense breakdown"
                          >
                            {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                          </button>

                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '6px' }}
                            title="Edit expense"
                            onClick={() => {
                              setEditingExpense(exp);
                              setIsExpenseModalOpen(true);
                            }}
                            aria-label="Edit expense"
                          >
                            <Edit size={16} />
                          </button>

                          <button
                            type="button"
                            className="btn btn-ghost btn-sm"
                            style={{ padding: '6px', color: 'var(--color-danger)' }}
                            title="Delete expense"
                            onClick={() => setDeleteExpenseId(exp.id)}
                            aria-label="Delete expense"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Expandable Breakdown Drawer */}
                    {isExpanded && (
                      <div
                        style={{
                          marginTop: '14px',
                          paddingTop: '14px',
                          borderTop: '1px solid var(--border-glass)',
                          fontSize: '0.85rem',
                        }}
                      >
                        {exp.notes && (
                          <div
                            style={{
                              fontStyle: 'italic',
                              color: 'var(--text-muted)',
                              marginBottom: '10px',
                            }}
                          >
                            Note: "{exp.notes}"
                          </div>
                        )}

                        <div
                          style={{
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            textTransform: 'uppercase',
                            color: 'var(--text-muted)',
                            marginBottom: '6px',
                          }}
                        >
                          Split Shares Breakdown:
                        </div>

                        <div
                          style={{
                            display: 'grid',
                            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                            gap: '8px',
                          }}
                        >
                          {exp.shares.map((share) => {
                            const p = participantMap.get(share.participantId);
                            return (
                              <div
                                key={share.participantId}
                                style={{
                                  background: 'var(--bg-main)',
                                  padding: '8px 10px',
                                  borderRadius: 'var(--radius-sm)',
                                  display: 'flex',
                                  alignItems: 'center',
                                  justifyContent: 'space-between',
                                  border: '1px solid var(--border-glass)',
                                }}
                              >
                                <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                  <div
                                    className="avatar"
                                    style={{
                                      backgroundColor: p?.color || '#3B82F6',
                                      width: '22px',
                                      height: '22px',
                                      fontSize: '0.7rem',
                                    }}
                                  >
                                    {p?.name.charAt(0).toUpperCase()}
                                  </div>
                                  <span style={{ fontWeight: 600 }}>{p?.name}</span>
                                </div>
                                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 600 }}>
                                  {formatCurrency(share.amountMinor, group.currency)}
                                  {share.percentage !== undefined && (
                                    <span style={{ color: 'var(--text-muted)', fontSize: '0.75rem', marginLeft: '4px' }}>
                                      ({share.percentage}%)
                                    </span>
                                  )}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 3: Settlement History */}
      {activeTab === 'settlements' && (
        <div>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              marginBottom: '16px',
            }}
          >
            <div>
              <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                Recorded Settlements
              </h2>
              <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                Completed payments tracked outside the app. You can undo any settlement anytime.
              </p>
            </div>

            <button
              type="button"
              className="btn btn-success btn-sm"
              onClick={() => {
                setActiveSuggestedSettlement(null);
                setIsSettleModalOpen(true);
              }}
            >
              <Handshake size={16} /> Record a Payment
            </button>
          </div>

          {group.settlements.length === 0 ? (
            <div className="empty-state">
              <div className="empty-state-icon-box">
                <Handshake size={32} />
              </div>
              <h3 className="empty-state-title">No settlements recorded yet</h3>
              <p className="empty-state-desc">
                When friends pay each other back via UPI, cash, or bank transfer, click "Settle Up" to record it here.
              </p>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  setActiveSuggestedSettlement(null);
                  setIsSettleModalOpen(true);
                }}
              >
                <Handshake size={16} /> Record a Settlement
              </button>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {group.settlements.map((set) => {
                const fromP = participantMap.get(set.fromParticipantId);
                const toP = participantMap.get(set.toParticipantId);
                const formattedDate = new Date(set.settledAt).toLocaleDateString(undefined, {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric',
                });

                return (
                  <div
                    key={set.id}
                    className="glass-card"
                    style={{
                      padding: '16px 20px',
                      display: 'flex',
                      flexWrap: 'wrap',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div
                        style={{
                          width: '38px',
                          height: '38px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--color-success-bg)',
                          color: 'var(--color-success)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                      >
                        <CheckCircle2 size={20} />
                      </div>

                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: 700 }}>{fromP?.name}</span>
                          <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>paid</span>
                          <span style={{ fontWeight: 700 }}>{toP?.name}</span>
                        </div>
                        <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                          <span>{formattedDate}</span>
                          {set.notes && <span> • {set.notes}</span>}
                        </div>
                      </div>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                      <span
                        style={{
                          fontFamily: 'var(--font-mono)',
                          fontSize: '1.2rem',
                          fontWeight: 700,
                          color: 'var(--color-success)',
                        }}
                      >
                        {formatCurrency(set.amountMinor, group.currency)}
                      </span>

                      <button
                        type="button"
                        className="btn btn-ghost btn-sm"
                        style={{ color: 'var(--text-muted)' }}
                        title="Undo settlement"
                        onClick={() => setUndoSettlementId(set.id)}
                        aria-label="Undo settlement"
                      >
                        <RotateCcw size={15} /> Undo
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Activity Log */}
      {activeTab === 'activity' && (
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '16px' }}>
            Group Activity History
          </h2>

          {group.activities.length === 0 ? (
            <div className="empty-state">
              <p className="empty-state-desc">No activity recorded yet.</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {group.activities.map((act) => {
                const dateStr = new Date(act.timestamp).toLocaleString(undefined, {
                  month: 'short',
                  day: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit',
                });

                return (
                  <div
                    key={act.id}
                    style={{
                      background: 'var(--bg-surface)',
                      border: '1px solid var(--border-glass)',
                      borderRadius: 'var(--radius-md)',
                      padding: '12px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <div
                        style={{
                          width: '8px',
                          height: '8px',
                          borderRadius: '50%',
                          backgroundColor:
                            act.type.includes('settlement')
                              ? 'var(--color-success)'
                              : act.type.includes('deleted')
                              ? 'var(--color-danger)'
                              : 'var(--accent-primary)',
                        }}
                      />
                      <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {act.description}
                      </span>
                    </div>

                    <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                      {dateStr}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals & Dialogs */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        group={group}
        initialExpense={editingExpense}
        onClose={() => {
          setIsExpenseModalOpen(false);
          setEditingExpense(null);
        }}
        onSaveExpense={handleSaveExpense}
      />

      <SettleUpModal
        isOpen={isSettleModalOpen}
        group={group}
        suggestedSettlement={activeSuggestedSettlement}
        onClose={() => {
          setIsSettleModalOpen(false);
          setActiveSuggestedSettlement(null);
        }}
        onRecordSettlement={handleRecordSettlement}
      />

      <EditGroupModal
        isOpen={isEditGroupModalOpen}
        group={group}
        onClose={() => setIsEditGroupModalOpen(false)}
        onGroupUpdated={onUpdateGroup}
      />

      {/* Delete Expense Dialog */}
      <ConfirmDialog
        isOpen={deleteExpenseId !== null}
        title="Delete Expense"
        message="Are you sure you want to delete this expense? All balances and settlements will be recalculated immediately."
        confirmLabel="Delete Expense"
        variant="danger"
        onConfirm={handleDeleteExpenseConfirm}
        onCancel={() => setDeleteExpenseId(null)}
      />

      {/* Undo Settlement Dialog */}
      <ConfirmDialog
        isOpen={undoSettlementId !== null}
        title="Undo Settlement"
        message="Are you sure you want to undo this recorded settlement? The outstanding balance between both participants will be restored."
        confirmLabel="Undo Settlement"
        variant="warning"
        onConfirm={handleUndoSettlementConfirm}
        onCancel={() => setUndoSettlementId(null)}
      />

      {/* Delete Group Dialog */}
      <ConfirmDialog
        isOpen={isDeleteGroupDialogOpen}
        title="Delete Group"
        message={`Are you sure you want to delete "${group.name}"? This will permanently erase all ${group.expenses.length} expenses and ${group.settlements.length} settlement records from this browser.`}
        confirmLabel="Delete Group"
        variant="danger"
        onConfirm={() => {
          setIsDeleteGroupDialogOpen(false);
          onDeleteGroup(group.id);
        }}
        onCancel={() => setIsDeleteGroupDialogOpen(false)}
      />
    </div>
  );
};
