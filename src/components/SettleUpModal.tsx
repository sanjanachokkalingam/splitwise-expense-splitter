import React, { useState, useEffect } from 'react';
import { X, Handshake, Info, CheckCircle } from 'lucide-react';
import { Group, Settlement, SuggestedSettlement } from '../types';
import { CURRENCY_CONFIGS, fromMinorUnits, toMinorUnits } from '../utils/money';

interface SettleUpModalProps {
  isOpen: boolean;
  group: Group;
  suggestedSettlement?: SuggestedSettlement | null;
  onClose: () => void;
  onRecordSettlement: (settlement: Settlement) => void;
}

export const SettleUpModal: React.FC<SettleUpModalProps> = ({
  isOpen,
  group,
  suggestedSettlement,
  onClose,
  onRecordSettlement,
}) => {
  const currencyConfig = CURRENCY_CONFIGS[group.currency] || CURRENCY_CONFIGS.INR;

  const [fromParticipantId, setFromParticipantId] = useState('');
  const [toParticipantId, setToParticipantId] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (suggestedSettlement) {
      setFromParticipantId(suggestedSettlement.fromParticipantId);
      setToParticipantId(suggestedSettlement.toParticipantId);
      setAmountStr((fromMinorUnits(suggestedSettlement.amountMinor)).toString());
    } else {
      // Default: first two participants
      const p1 = group.participants[0]?.id || '';
      const p2 = group.participants[1]?.id || '';
      setFromParticipantId(p1);
      setToParticipantId(p2);
      setAmountStr('');
    }
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setError(null);
  }, [isOpen, suggestedSettlement, group]);

  if (!isOpen) return null;

  const amountMinor = toMinorUnits(amountStr);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!fromParticipantId || !toParticipantId) {
      setError('Please select both the paying and receiving participants.');
      return;
    }

    if (fromParticipantId === toParticipantId) {
      setError('Payer and recipient cannot be the same person.');
      return;
    }

    if (amountMinor <= 0) {
      setError('Settlement amount must be greater than zero.');
      return;
    }

    const newSettlement: Settlement = {
      id: 'set-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      groupId: group.id,
      fromParticipantId,
      toParticipantId,
      amountMinor,
      settledAt: new Date(date).toISOString(),
      notes: notes.trim() || undefined,
    };

    onRecordSettlement(newSettlement);
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settle-up-title"
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
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: 'var(--color-success-bg)',
                color: 'var(--color-success)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Handshake size={20} />
            </div>
            <div>
              <h2 id="settle-up-title" className="modal-title">Record a Settlement</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Mark balance payments made outside the app
              </p>
            </div>
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
            {/* Disclaimer pill */}
            <div
              style={{
                background: 'rgba(197, 244, 119, 0.08)',
                border: '1px solid var(--border-accent)',
                padding: '10px 12px',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                alignItems: 'flex-start',
                gap: '8px',
                fontSize: '0.82rem',
                color: 'var(--text-secondary)',
              }}
            >
              <Info size={16} style={{ color: 'var(--accent-primary)', flexShrink: 0, marginTop: '2px' }} />
              <div>
                <strong>Offline Tracking Notice:</strong> SplitWise tracks balances and simplifies payments. It does not transfer real funds from your bank or wallet.
              </div>
            </div>

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

            {/* Payer and Recipient */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="set-payer" className="form-label">
                  Payer (Paid)
                </label>
                <select
                  id="set-payer"
                  className="form-select"
                  value={fromParticipantId}
                  onChange={(e) => {
                    setFromParticipantId(e.target.value);
                    if (error) setError(null);
                  }}
                  required
                >
                  {group.participants.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.id === toParticipantId}>
                      {p.name} {p.id === group.currentUserId ? '(You)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="set-recipient" className="form-label">
                  Recipient (Received)
                </label>
                <select
                  id="set-recipient"
                  className="form-select"
                  value={toParticipantId}
                  onChange={(e) => {
                    setToParticipantId(e.target.value);
                    if (error) setError(null);
                  }}
                  required
                >
                  {group.participants.map((p) => (
                    <option key={p.id} value={p.id} disabled={p.id === fromParticipantId}>
                      {p.name} {p.id === group.currentUserId ? '(You)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Amount & Date */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="set-amount" className="form-label">
                  Amount Settled ({currencyConfig.symbol})
                </label>
                <div style={{ position: 'relative' }}>
                  <span
                    style={{
                      position: 'absolute',
                      left: '12px',
                      top: '50%',
                      transform: 'translateY(-50%)',
                      color: 'var(--text-muted)',
                      fontWeight: 700,
                      pointerEvents: 'none',
                    }}
                  >
                    {currencyConfig.symbol}
                  </span>
                  <input
                    id="set-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    className="form-input"
                    style={{ paddingLeft: '28px', fontFamily: 'var(--font-mono)' }}
                    placeholder="0.00"
                    value={amountStr}
                    onChange={(e) => {
                      setAmountStr(e.target.value);
                      if (error) setError(null);
                    }}
                    required
                  />
                </div>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="set-date" className="form-label">
                  Settled On
                </label>
                <input
                  id="set-date"
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Note */}
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="set-notes" className="form-label">
                Payment Method / Note
              </label>
              <input
                id="set-notes"
                type="text"
                className="form-input"
                placeholder="e.g. UPI / Google Pay, Cash, Revolut"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-success"
              disabled={amountMinor <= 0}
              style={{
                opacity: amountMinor <= 0 ? 0.6 : 1,
                cursor: amountMinor <= 0 ? 'not-allowed' : 'pointer',
              }}
            >
              <CheckCircle size={16} /> Mark as Settled
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
