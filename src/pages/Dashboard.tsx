import React from 'react';
import {
  Plus,
  Users,
  CreditCard,
  Layers,
  ArrowUpRight,
  ArrowDownRight,
  CheckCircle2,
  Sparkles,
  Compass,
  Trash2,
} from 'lucide-react';
import { Group } from '../types';
import { formatCurrency } from '../utils/money';
import { calculateGroupBalances } from '../utils/settlements';

interface DashboardProps {
  groups: Group[];
  onSelectGroup: (groupId: string) => void;
  onCreateGroupClick: () => void;
  onLoadDemoClick: () => void;
  onRemoveDemoClick: () => void;
  hasDemoGroup: boolean;
}

export const Dashboard: React.FC<DashboardProps> = ({
  groups,
  onSelectGroup,
  onCreateGroupClick,
  onLoadDemoClick,
  onRemoveDemoClick,
  hasDemoGroup,
}) => {
  // Compute global aggregated statistics
  const totalGroups = groups.length;

  const totalExpensesMinor = groups.reduce((acc, g) => {
    return acc + g.expenses.reduce((eAcc, exp) => eAcc + exp.amountMinor, 0);
  }, 0);

  // Set of all unique participants across groups
  const uniqueParticipantsCount = groups.reduce((acc, g) => acc + g.participants.length, 0);

  // User net balance across all groups where user is assigned
  let totalUserReceivableMinor = 0;
  let totalUserPayableMinor = 0;

  groups.forEach((g) => {
    if (g.currentUserId) {
      const balances = calculateGroupBalances(g);
      const userBal = balances.find((b) => b.participantId === g.currentUserId);
      if (userBal) {
        if (userBal.netBalanceMinor > 0) {
          totalUserReceivableMinor += userBal.netBalanceMinor;
        } else if (userBal.netBalanceMinor < 0) {
          totalUserPayableMinor += Math.abs(userBal.netBalanceMinor);
        }
      }
    }
  });

  const netUserBalanceMinor = totalUserReceivableMinor - totalUserPayableMinor;

  return (
    <div className="page-content">
      {/* Optional Demo Banner */}
      {hasDemoGroup && (
        <div className="tracking-banner" style={{ justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Sparkles size={16} style={{ color: 'var(--accent-primary)' }} />
            <span>
              <strong>Sample Trip Active:</strong> You are exploring with sample data. You can delete or edit it anytime.
            </span>
          </div>
          <button
            type="button"
            className="btn btn-ghost btn-sm"
            style={{ color: 'var(--color-danger)', padding: '2px 8px' }}
            onClick={onRemoveDemoClick}
          >
            <Trash2 size={14} /> Remove Demo
          </button>
        </div>
      )}

      {/* Hero Welcome Header */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '20px',
          marginBottom: '32px',
        }}
      >
        <div>
          <h1
            style={{
              fontSize: '2.2rem',
              fontWeight: 800,
              letterSpacing: '-0.03em',
              color: 'var(--text-primary)',
              lineHeight: 1.2,
            }}
          >
            Let's settle up.
          </h1>
          <p
            style={{
              color: 'var(--text-secondary)',
              fontSize: '1.05rem',
              marginTop: '6px',
              maxWidth: '560px',
            }}
          >
            Fair, simple group expense splitting for road trips, flatmates, dining, and adventures.
          </p>
        </div>

        <button
          type="button"
          className="btn btn-primary btn-lg"
          onClick={onCreateGroupClick}
        >
          <Plus size={20} /> Create a Group
        </button>
      </div>

      {/* Metrics Row */}
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <CreditCard size={24} />
          </div>
          <div>
            <div className="stat-label">Total Shared Spend</div>
            <div className="stat-value">
              {/* Default display INR if mixed, or format with INR symbol */}
              {formatCurrency(totalExpensesMinor, groups[0]?.currency || 'INR')}
            </div>
            <div className="stat-subtext">Across {totalGroups} expense group{totalGroups === 1 ? '' : 's'}</div>
          </div>
        </div>

        <div className="stat-card">
          <div
            className="stat-icon-wrapper"
            style={{
              backgroundColor:
                netUserBalanceMinor > 0
                  ? 'var(--color-success-bg)'
                  : netUserBalanceMinor < 0
                  ? 'var(--color-danger-bg)'
                  : 'var(--bg-surface-elevated)',
              color:
                netUserBalanceMinor > 0
                  ? 'var(--color-success)'
                  : netUserBalanceMinor < 0
                  ? 'var(--color-danger)'
                  : 'var(--text-secondary)',
            }}
          >
            {netUserBalanceMinor > 0 ? (
              <ArrowUpRight size={24} />
            ) : netUserBalanceMinor < 0 ? (
              <ArrowDownRight size={24} />
            ) : (
              <CheckCircle2 size={24} />
            )}
          </div>
          <div>
            <div className="stat-label">Your Net Balance</div>
            <div
              className="stat-value"
              style={{
                color:
                  netUserBalanceMinor > 0
                    ? 'var(--color-success)'
                    : netUserBalanceMinor < 0
                    ? 'var(--color-danger)'
                    : 'var(--text-primary)',
              }}
            >
              {netUserBalanceMinor > 0
                ? `+${formatCurrency(netUserBalanceMinor, groups[0]?.currency || 'INR')}`
                : netUserBalanceMinor < 0
                ? `-${formatCurrency(Math.abs(netUserBalanceMinor), groups[0]?.currency || 'INR')}`
                : 'All Settled'}
            </div>
            <div className="stat-subtext">
              {netUserBalanceMinor > 0
                ? 'People owe you money'
                : netUserBalanceMinor < 0
                ? 'You owe money in active groups'
                : 'Zero outstanding debts'}
            </div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <Layers size={24} />
          </div>
          <div>
            <div className="stat-label">Active Groups</div>
            <div className="stat-value">{totalGroups}</div>
            <div className="stat-subtext">Managed on this device</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon-wrapper">
            <Users size={24} />
          </div>
          <div>
            <div className="stat-label">Total Participants</div>
            <div className="stat-value">{uniqueParticipantsCount}</div>
            <div className="stat-subtext">Friends & splitmates</div>
          </div>
        </div>
      </div>

      {/* Main Groups Section */}
      <div style={{ marginTop: '16px' }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '18px',
          }}
        >
          <h2 style={{ fontSize: '1.3rem', fontWeight: 700, color: 'var(--text-primary)' }}>
            Your Groups
          </h2>
          {groups.length > 0 && (
            <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
              Showing {groups.length} group{groups.length === 1 ? '' : 's'}
            </span>
          )}
        </div>

        {groups.length === 0 ? (
          /* Empty State */
          <div className="empty-state">
            <div className="empty-state-icon-box">
              <Compass size={36} />
            </div>
            <h3 className="empty-state-title">No expense groups yet</h3>
            <p className="empty-state-desc">
              Whether you are planning a trip, sharing rent with flatmates, or splitting dinner, create a group to start logging expenses with exact settlement math.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <button
                type="button"
                className="btn btn-primary"
                onClick={onCreateGroupClick}
              >
                <Plus size={18} /> Create a Group
              </button>
              <button
                type="button"
                className="btn btn-secondary"
                onClick={onLoadDemoClick}
              >
                <Sparkles size={18} /> Load Sample Trip (Goa)
              </button>
            </div>
          </div>
        ) : (
          /* Grid of Group Cards */
          <div
            style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
              gap: '20px',
            }}
          >
            {groups.map((group) => {
              const balances = calculateGroupBalances(group);
              const totalSpentMinor = group.expenses.reduce(
                (acc, exp) => acc + exp.amountMinor,
                0
              );
              const userBalance = group.currentUserId
                ? balances.find((b) => b.participantId === group.currentUserId)
                : null;

              return (
                <div
                  key={group.id}
                  className="glass-card glass-card-interactive"
                  style={{
                    cursor: 'pointer',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                  }}
                  onClick={() => onSelectGroup(group.id)}
                >
                  <div>
                    {/* Top row: Avatar & Currency */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        justifyContent: 'space-between',
                        marginBottom: '14px',
                      }}
                    >
                      <div
                        style={{
                          width: '42px',
                          height: '42px',
                          borderRadius: 'var(--radius-md)',
                          backgroundColor: 'var(--accent-subtle)',
                          color: 'var(--accent-primary)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontSize: '1.2rem',
                          fontWeight: 700,
                          boxShadow: 'var(--shadow-sm)',
                        }}
                      >
                        {group.name.charAt(0).toUpperCase()}
                      </div>

                      <span className="badge badge-neutral">
                        {group.currency}
                      </span>
                    </div>

                    <h3
                      style={{
                        fontSize: '1.2rem',
                        fontWeight: 700,
                        color: 'var(--text-primary)',
                        marginBottom: '6px',
                      }}
                    >
                      {group.name}
                    </h3>

                    {group.description ? (
                      <p
                        style={{
                          fontSize: '0.88rem',
                          color: 'var(--text-secondary)',
                          marginBottom: '16px',
                          lineHeight: 1.4,
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                        }}
                      >
                        {group.description}
                      </p>
                    ) : (
                      <div style={{ height: '12px' }} />
                    )}

                    {/* Member Avatars */}
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px',
                        marginBottom: '18px',
                      }}
                    >
                      <div style={{ display: 'flex', marginLeft: '6px' }}>
                        {group.participants.slice(0, 4).map((p, idx) => (
                          <div
                            key={p.id}
                            className="avatar"
                            style={{
                              backgroundColor: p.color,
                              marginLeft: idx === 0 ? 0 : '-8px',
                              border: '2px solid var(--bg-surface)',
                              width: '28px',
                              height: '28px',
                              fontSize: '0.75rem',
                            }}
                            title={p.name}
                          >
                            {p.name.charAt(0).toUpperCase()}
                          </div>
                        ))}
                      </div>
                      <span
                        style={{
                          fontSize: '0.78rem',
                          color: 'var(--text-muted)',
                          marginLeft: '4px',
                        }}
                      >
                        {group.participants.length} member{group.participants.length === 1 ? '' : 's'}
                      </span>
                    </div>
                  </div>

                  {/* Bottom Stats & Balance */}
                  <div
                    style={{
                      borderTop: '1px solid var(--border-glass)',
                      paddingTop: '14px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                    }}
                  >
                    <div>
                      <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                        Total Spend
                      </div>
                      <div style={{ fontSize: '1.05rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}>
                        {formatCurrency(totalSpentMinor, group.currency)}
                      </div>
                    </div>

                    {userBalance && (
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>
                          Your Balance
                        </div>
                        <div
                          style={{
                            fontSize: '0.95rem',
                            fontWeight: 700,
                            fontFamily: 'var(--font-mono)',
                            color:
                              userBalance.netBalanceMinor > 0
                                ? 'var(--color-success)'
                                : userBalance.netBalanceMinor < 0
                                ? 'var(--color-danger)'
                                : 'var(--text-muted)',
                          }}
                        >
                          {userBalance.netBalanceMinor > 0
                            ? `+${formatCurrency(userBalance.netBalanceMinor, group.currency)}`
                            : userBalance.netBalanceMinor < 0
                            ? `-${formatCurrency(Math.abs(userBalance.netBalanceMinor), group.currency)}`
                            : 'Settled'}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
