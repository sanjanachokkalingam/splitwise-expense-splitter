import React from 'react';
import {
  PieChart,
  Plus,
  Compass,
  Trash2,
  Sparkles,
  ChevronRight,
  ShieldCheck,
  X,
} from 'lucide-react';
import { Group } from '../types';
import { formatCurrency } from '../utils/money';

interface SidebarProps {
  groups: Group[];
  activeGroupId: string | null;
  isOpenMobile: boolean;
  onSelectDashboard: () => void;
  onSelectGroup: (groupId: string) => void;
  onCreateGroupClick: () => void;
  onLoadDemoClick: () => void;
  onClearAllClick: () => void;
  onCloseMobile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  groups,
  activeGroupId,
  isOpenMobile,
  onSelectDashboard,
  onSelectGroup,
  onCreateGroupClick,
  onLoadDemoClick,
  onClearAllClick,
  onCloseMobile,
}) => {
  return (
    <>
      {isOpenMobile && (
        <div
          className="sidebar-backdrop"
          onClick={onCloseMobile}
          aria-hidden="true"
        />
      )}

      <aside className={`sidebar ${isOpenMobile ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div
            className="brand-badge"
            onClick={() => {
              onSelectDashboard();
              onCloseMobile();
            }}
          >
            <div className="brand-icon-box">
              <Compass size={22} />
            </div>
            <div>
              <div className="brand-title">SplitWise</div>
              <div className="brand-subtitle">Expense Splitter</div>
            </div>
          </div>

          {isOpenMobile && (
            <button
              className="btn btn-ghost"
              style={{ padding: '6px' }}
              onClick={onCloseMobile}
              aria-label="Close navigation"
            >
              <X size={20} />
            </button>
          )}
        </div>

        <div className="sidebar-content">
          <div>
            <button
              className={`nav-link ${activeGroupId === null ? 'active' : ''}`}
              onClick={() => {
                onSelectDashboard();
                onCloseMobile();
              }}
            >
              <PieChart size={18} />
              <span>Dashboard Overview</span>
            </button>
          </div>

          <div>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingRight: '6px',
              }}
            >
              <div className="nav-section-label">Your Expense Groups</div>
              <button
                type="button"
                className="btn btn-ghost"
                style={{ padding: '4px', color: 'var(--accent-primary)' }}
                onClick={() => {
                  onCreateGroupClick();
                  onCloseMobile();
                }}
                title="Create a new group"
                aria-label="Create a new group"
              >
                <Plus size={16} />
              </button>
            </div>

            {groups.length === 0 ? (
              <div
                style={{
                  padding: '16px 12px',
                  background: 'var(--bg-main)',
                  borderRadius: 'var(--radius-md)',
                  border: '1px dashed var(--border-glass)',
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: '0.82rem', color: 'var(--text-muted)', marginBottom: '10px' }}>
                  No active groups yet.
                </p>
                <button
                  type="button"
                  className="btn btn-secondary btn-sm"
                  style={{ width: '100%', fontSize: '0.8rem' }}
                  onClick={() => {
                    onLoadDemoClick();
                    onCloseMobile();
                  }}
                >
                  <Sparkles size={14} /> Try Sample Trip
                </button>
              </div>
            ) : (
              <div className="sidebar-group-list">
                {groups.map((g) => {
                  const isActive = activeGroupId === g.id;
                  const totalSpent = g.expenses.reduce(
                    (acc, exp) => acc + exp.amountMinor,
                    0
                  );

                  return (
                    <button
                      key={g.id}
                      className={`sidebar-group-item ${isActive ? 'active' : ''}`}
                      onClick={() => {
                        onSelectGroup(g.id);
                        onCloseMobile();
                      }}
                    >
                      <div
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '10px',
                          overflow: 'hidden',
                        }}
                      >
                        <div
                          style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: 'var(--radius-sm)',
                            backgroundColor: isActive
                              ? 'var(--accent-subtle)'
                              : 'var(--bg-surface-elevated)',
                            color: isActive
                              ? 'var(--accent-primary)'
                              : 'var(--text-secondary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '0.8rem',
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          {g.name.charAt(0).toUpperCase()}
                        </div>
                        <div style={{ textAlign: 'left', overflow: 'hidden' }}>
                          <div
                            style={{
                              fontSize: '0.88rem',
                              fontWeight: 600,
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {g.name}
                          </div>
                          <div
                            style={{
                              fontSize: '0.72rem',
                              color: 'var(--text-muted)',
                            }}
                          >
                            {g.participants.length} members • {formatCurrency(totalSpent, g.currency)}
                          </div>
                        </div>
                      </div>
                      <ChevronRight
                        size={14}
                        style={{
                          opacity: isActive ? 1 : 0.4,
                          flexShrink: 0,
                        }}
                      />
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="sidebar-footer">
          <button
            type="button"
            className="btn btn-primary"
            style={{ width: '100%' }}
            onClick={() => {
              onCreateGroupClick();
              onCloseMobile();
            }}
          >
            <Plus size={18} /> Create a Group
          </button>

          {groups.length > 0 && (
            <button
              type="button"
              className="btn btn-ghost btn-sm"
              style={{
                width: '100%',
                color: 'var(--color-danger)',
                fontSize: '0.78rem',
                justifyContent: 'center',
                opacity: 0.8,
              }}
              onClick={() => {
                onClearAllClick();
                onCloseMobile();
              }}
            >
              <Trash2 size={14} /> Clear All Local Data
            </button>
          )}

          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '6px',
              fontSize: '0.72rem',
              color: 'var(--text-muted)',
              marginTop: '4px',
            }}
          >
            <ShieldCheck size={14} style={{ color: 'var(--color-success)' }} />
            <span>100% Client-Side • LocalStorage</span>
          </div>
        </div>
      </aside>
    </>
  );
};
