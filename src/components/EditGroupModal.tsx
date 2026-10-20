import React, { useState } from 'react';
import { X, Edit3, AlertCircle } from 'lucide-react';
import { Currency, Group } from '../types';
import { CURRENCY_CONFIGS } from '../utils/money';

interface EditGroupModalProps {
  isOpen: boolean;
  group: Group;
  onClose: () => void;
  onGroupUpdated: (updatedGroup: Group) => void;
}

export const EditGroupModal: React.FC<EditGroupModalProps> = ({
  isOpen,
  group,
  onClose,
  onGroupUpdated,
}) => {
  const [name, setName] = useState(group.name);
  const [description, setDescription] = useState(group.description);
  const [currency, setCurrency] = useState<Currency>(group.currency);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const hasFinancialRecords = group.expenses.length > 0 || group.settlements.length > 0;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Group name cannot be empty.');
      return;
    }

    const updatedGroup: Group = {
      ...group,
      name: trimmedName,
      description: description.trim(),
      currency: hasFinancialRecords ? group.currency : currency,
      updatedAt: new Date().toISOString(),
      activities: [
        ...group.activities,
        {
          id: 'act-' + Date.now(),
          groupId: group.id,
          type: 'group_updated',
          description: `Group details updated (renamed to "${trimmedName}").`,
          timestamp: new Date().toISOString(),
        },
      ],
    };

    onGroupUpdated(updatedGroup);
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="edit-group-title"
      onClick={onClose}
    >
      <div
        className="modal-dialog"
        style={{ maxWidth: '480px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '36px',
                height: '36px',
                borderRadius: '8px',
                backgroundColor: 'var(--accent-subtle)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Edit3 size={18} />
            </div>
            <h2 id="edit-group-title" className="modal-title">Edit Group Details</h2>
          </div>
          <button
            className="btn btn-ghost"
            style={{ padding: '6px' }}
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            {error && (
              <div
                style={{
                  background: 'var(--color-danger-bg)',
                  border: '1px solid rgba(255,123,123,0.3)',
                  color: 'var(--color-danger)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.88rem',
                }}
              >
                {error}
              </div>
            )}

            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="edit-group-name" className="form-label">
                Group Name <span style={{ color: 'var(--accent-primary)' }}>*</span>
              </label>
              <input
                id="edit-group-name"
                type="text"
                className="form-input"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="edit-group-desc" className="form-label">
                Description
              </label>
              <input
                id="edit-group-desc"
                type="text"
                className="form-input"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="edit-group-currency" className="form-label">
                Currency
              </label>
              <select
                id="edit-group-currency"
                className="form-select"
                value={currency}
                disabled={hasFinancialRecords}
                onChange={(e) => setCurrency(e.target.value as Currency)}
              >
                {Object.values(CURRENCY_CONFIGS).map((curr) => (
                  <option key={curr.code} value={curr.code}>
                    {curr.symbol} {curr.name} ({curr.code})
                  </option>
                ))}
              </select>
              {hasFinancialRecords ? (
                <div
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.78rem',
                    color: 'var(--color-warning)',
                    marginTop: '6px',
                  }}
                >
                  <AlertCircle size={14} />
                  <span>Currency is locked because this group already contains recorded expenses.</span>
                </div>
              ) : (
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px' }}>
                  You can change the currency freely before recording expenses.
                </span>
              )}
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
