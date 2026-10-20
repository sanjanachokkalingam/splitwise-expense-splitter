import React, { useState, useEffect } from 'react';
import {
  X,
  Utensils,
  Car,
  Home,
  ShoppingBag,
  Ticket,
  Zap,
  Receipt,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';
import {
  Expense,
  ExpenseCategory,
  ExpenseShare,
  Group,
  SplitMethod,
} from '../types';
import {
  CURRENCY_CONFIGS,
  calculateEqualShares,
  calculatePercentageShares,
  formatCurrency,
  toMinorUnits,
  fromMinorUnits,
} from '../utils/money';

interface ExpenseModalProps {
  isOpen: boolean;
  group: Group;
  initialExpense?: Expense | null;
  onClose: () => void;
  onSaveExpense: (expense: Expense) => void;
}

const CATEGORIES: { id: ExpenseCategory; label: string; icon: React.ReactNode }[] = [
  { id: 'food', label: 'Food & Dining', icon: <Utensils size={16} /> },
  { id: 'travel', label: 'Travel & Transport', icon: <Car size={16} /> },
  { id: 'stay', label: 'Stay & Accommodation', icon: <Home size={16} /> },
  { id: 'shopping', label: 'Shopping', icon: <ShoppingBag size={16} /> },
  { id: 'activities', label: 'Activities & Fun', icon: <Ticket size={16} /> },
  { id: 'utilities', label: 'Utilities & Bills', icon: <Zap size={16} /> },
  { id: 'other', label: 'General / Other', icon: <Receipt size={16} /> },
];

export const ExpenseModal: React.FC<ExpenseModalProps> = ({
  isOpen,
  group,
  initialExpense,
  onClose,
  onSaveExpense,
}) => {
  const currencyConfig = CURRENCY_CONFIGS[group.currency] || CURRENCY_CONFIGS.INR;

  const [title, setTitle] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [payerId, setPayerId] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [category, setCategory] = useState<ExpenseCategory>('food');
  const [splitMethod, setSplitMethod] = useState<SplitMethod>('equal');
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Custom inputs for Unequal / Exact / Percentage
  // Storing input strings per participantId
  const [customShares, setCustomShares] = useState<Record<string, string>>({});
  const [customPercentages, setCustomPercentages] = useState<Record<string, string>>({});

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    if (initialExpense) {
      setTitle(initialExpense.title);
      setAmountStr((fromMinorUnits(initialExpense.amountMinor)).toString());
      setPayerId(initialExpense.paidByParticipantId);
      setDate(initialExpense.date);
      setCategory(initialExpense.category);
      setSplitMethod(initialExpense.splitMethod);
      setSelectedParticipants(initialExpense.splitParticipants);
      setNotes(initialExpense.notes || '');

      // Load existing custom shares
      const sharesMap: Record<string, string> = {};
      const pctMap: Record<string, string> = {};
      initialExpense.shares.forEach((s) => {
        sharesMap[s.participantId] = (fromMinorUnits(s.amountMinor)).toString();
        if (s.percentage !== undefined) {
          pctMap[s.participantId] = s.percentage.toString();
        }
      });
      setCustomShares(sharesMap);
      setCustomPercentages(pctMap);
    } else {
      // New Expense Defaults
      setTitle('');
      setAmountStr('');
      // Default payer is current user or first participant
      const defaultPayer =
        group.participants.find((p) => p.id === group.currentUserId)?.id ||
        group.participants[0]?.id ||
        '';
      setPayerId(defaultPayer);
      setDate(new Date().toISOString().split('T')[0]);
      setCategory('food');
      setSplitMethod('equal');
      // All group participants selected by default
      const allIds = group.participants.map((p) => p.id);
      setSelectedParticipants(allIds);
      setNotes('');
      setCustomShares({});
      setCustomPercentages({});
    }
    setError(null);
  }, [isOpen, initialExpense, group]);

  if (!isOpen) return null;

  const totalMinor = toMinorUnits(amountStr);

  const toggleParticipant = (pId: string) => {
    if (selectedParticipants.includes(pId)) {
      if (selectedParticipants.length <= 1) {
        setError('At least one participant must be included in the split.');
        return;
      }
      setSelectedParticipants(selectedParticipants.filter((id) => id !== pId));
    } else {
      setSelectedParticipants([...selectedParticipants, pId]);
    }
    if (error) setError(null);
  };

  const handleSelectAll = () => {
    setSelectedParticipants(group.participants.map((p) => p.id));
  };

  // Live split calculation & validation
  let computedShares: ExpenseShare[] = [];
  let isSplitValid = false;
  let splitValidationMessage = '';
  let differenceMinor = 0;

  if (totalMinor > 0 && selectedParticipants.length > 0) {
    if (splitMethod === 'equal') {
      computedShares = calculateEqualShares(totalMinor, selectedParticipants);
      isSplitValid = true;
      const sharePerPerson = formatCurrency(
        Math.floor(totalMinor / selectedParticipants.length),
        group.currency
      );
      splitValidationMessage = `Each person owes ${sharePerPerson} (rounding distributed to exact minor unit)`;
    } else if (splitMethod === 'unequal' || splitMethod === 'exact') {
      let currentSumMinor = 0;
      computedShares = selectedParticipants.map((pId) => {
        const val = toMinorUnits(customShares[pId] || '0');
        currentSumMinor += val;
        return {
          participantId: pId,
          amountMinor: val,
        };
      });

      differenceMinor = totalMinor - currentSumMinor;
      if (differenceMinor === 0) {
        isSplitValid = true;
        splitValidationMessage = 'Shares add up exactly to the total amount!';
      } else if (differenceMinor > 0) {
        isSplitValid = false;
        splitValidationMessage = `${formatCurrency(differenceMinor, group.currency)} left to allocate`;
      } else {
        isSplitValid = false;
        splitValidationMessage = `Over-allocated by ${formatCurrency(Math.abs(differenceMinor), group.currency)}`;
      }
    } else if (splitMethod === 'percentage') {
      let sumPct = 0;
      const pctInputs = selectedParticipants.map((pId) => {
        const pct = parseFloat(customPercentages[pId] || '0') || 0;
        sumPct += pct;
        return {
          participantId: pId,
          percentage: pct,
        };
      });

      const pctDiff = 100 - sumPct;
      if (Math.abs(pctDiff) < 0.01) {
        const result = calculatePercentageShares(totalMinor, pctInputs);
        if (result.isValid) {
          computedShares = result.shares;
          isSplitValid = true;
          splitValidationMessage = 'Percentages sum to 100% exactly!';
        } else {
          isSplitValid = false;
          splitValidationMessage = result.error || 'Invalid percentage distribution';
        }
      } else if (pctDiff > 0) {
        isSplitValid = false;
        splitValidationMessage = `${pctDiff.toFixed(1)}% remaining to reach 100%`;
      } else {
        isSplitValid = false;
        splitValidationMessage = `Percentages exceed 100% by ${Math.abs(pctDiff).toFixed(1)}%`;
      }
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setError('Please provide an expense title (e.g. "Dinner", "Cab").');
      return;
    }

    if (totalMinor <= 0) {
      setError('Expense amount must be greater than zero.');
      return;
    }

    if (!payerId) {
      setError('Please select who paid for this expense.');
      return;
    }

    if (selectedParticipants.length === 0) {
      setError('Please select at least one participant to split this expense with.');
      return;
    }

    if (!isSplitValid || computedShares.length === 0) {
      setError(splitValidationMessage || 'Please adjust the split amounts so they equal the total amount.');
      return;
    }

    // Verify invariant: sum of shares === totalMinor
    const sumShares = computedShares.reduce((acc, s) => acc + s.amountMinor, 0);
    if (sumShares !== totalMinor) {
      setError(`Calculated shares (${sumShares}) do not match total amount (${totalMinor}).`);
      return;
    }

    const nowIso = new Date().toISOString();
    const expenseToSave: Expense = {
      id: initialExpense ? initialExpense.id : 'exp-' + Date.now() + '-' + Math.random().toString(36).substring(2, 6),
      groupId: group.id,
      title: cleanTitle,
      amountMinor: totalMinor,
      paidByParticipantId: payerId,
      date,
      category,
      splitMethod,
      splitParticipants: selectedParticipants,
      shares: computedShares,
      notes: notes.trim(),
      createdAt: initialExpense ? initialExpense.createdAt : nowIso,
      updatedAt: nowIso,
    };

    onSaveExpense(expenseToSave);
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="expense-modal-title"
      onClick={onClose}
    >
      <div
        className="modal-dialog"
        style={{ maxWidth: '640px' }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div
              style={{
                width: '38px',
                height: '38px',
                borderRadius: '8px',
                backgroundColor: 'var(--accent-subtle)',
                color: 'var(--accent-primary)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Receipt size={20} />
            </div>
            <div>
              <h2 id="expense-modal-title" className="modal-title">
                {initialExpense ? 'Edit Expense' : 'Add an Expense'}
              </h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                {group.name} • {currencyConfig.symbol} {currencyConfig.code}
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

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'hidden' }}>
          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {error && (
              <div
                style={{
                  background: 'var(--color-danger-bg)',
                  border: '1px solid rgba(255,123,123,0.3)',
                  color: 'var(--color-danger)',
                  padding: '10px 14px',
                  borderRadius: 'var(--radius-md)',
                  fontSize: '0.88rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}
              >
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{error}</span>
              </div>
            )}

            {/* Title & Amount Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="exp-title" className="form-label">
                  Expense Title <span style={{ color: 'var(--accent-primary)' }}>*</span>
                </label>
                <input
                  id="exp-title"
                  type="text"
                  className="form-input"
                  placeholder="e.g. Dinner, Grocery, Uber"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                    if (error) setError(null);
                  }}
                  autoFocus
                  required
                />
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="exp-amount" className="form-label">
                  Amount ({currencyConfig.symbol}) <span style={{ color: 'var(--accent-primary)' }}>*</span>
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
                    id="exp-amount"
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
            </div>

            {/* Payer & Date Grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="exp-payer" className="form-label">
                  Paid By <span style={{ color: 'var(--accent-primary)' }}>*</span>
                </label>
                <select
                  id="exp-payer"
                  className="form-select"
                  value={payerId}
                  onChange={(e) => setPayerId(e.target.value)}
                >
                  {group.participants.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.id === group.currentUserId ? '(You)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group" style={{ margin: 0 }}>
                <label htmlFor="exp-date" className="form-label">
                  Expense Date
                </label>
                <input
                  id="exp-date"
                  type="date"
                  className="form-input"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Category Selector */}
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Category</label>
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))',
                  gap: '8px',
                }}
              >
                {CATEGORIES.map((cat) => {
                  const isSelected = category === cat.id;
                  return (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategory(cat.id)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-md)',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        cursor: 'pointer',
                        border: isSelected
                          ? '1px solid var(--accent-primary)'
                          : '1px solid var(--border-glass-bright)',
                        backgroundColor: isSelected
                          ? 'var(--accent-subtle)'
                          : 'var(--bg-main)',
                        color: isSelected ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {cat.icon}
                      <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {cat.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Split Method Tabs */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="form-label" style={{ margin: 0 }}>
                Split Method
              </label>
              <div
                style={{
                  display: 'flex',
                  background: 'var(--bg-main)',
                  borderRadius: 'var(--radius-md)',
                  padding: '4px',
                  border: '1px solid var(--border-glass-bright)',
                  gap: '4px',
                }}
              >
                {(
                  [
                    { id: 'equal', label: 'Equal Split' },
                    { id: 'unequal', label: 'Unequal Shares' },
                    { id: 'percentage', label: 'Percentage' },
                    { id: 'exact', label: 'Exact Amounts' },
                  ] as { id: SplitMethod; label: string }[]
                ).map((m) => {
                  const isActive = splitMethod === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => setSplitMethod(m.id)}
                      style={{
                        flex: 1,
                        padding: '8px 10px',
                        borderRadius: 'var(--radius-sm)',
                        fontSize: '0.82rem',
                        fontWeight: 600,
                        border: 'none',
                        cursor: 'pointer',
                        backgroundColor: isActive ? 'var(--bg-surface-elevated)' : 'transparent',
                        color: isActive ? 'var(--accent-primary)' : 'var(--text-secondary)',
                        boxShadow: isActive ? 'var(--shadow-sm)' : 'none',
                        transition: 'all 0.15s ease',
                      }}
                    >
                      {m.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Participants Included & Split Shares */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span className="form-label" style={{ margin: 0 }}>
                  Included In Split ({selectedParticipants.length} of {group.participants.length})
                </span>
                <button
                  type="button"
                  className="btn btn-ghost btn-sm"
                  style={{ padding: '2px 8px', fontSize: '0.78rem' }}
                  onClick={handleSelectAll}
                >
                  Select All
                </button>
              </div>

              <div
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '8px',
                  maxHeight: '220px',
                  overflowY: 'auto',
                  paddingRight: '4px',
                }}
              >
                {group.participants.map((p) => {
                  const isIncluded = selectedParticipants.includes(p.id);
                  const isPayer = p.id === payerId;

                  return (
                    <div
                      key={p.id}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '8px 12px',
                        borderRadius: 'var(--radius-md)',
                        background: isIncluded ? 'var(--bg-main)' : 'rgba(0,0,0,0.2)',
                        border: isIncluded
                          ? '1px solid var(--border-glass-bright)'
                          : '1px solid transparent',
                        opacity: isIncluded ? 1 : 0.6,
                        transition: 'all 0.15s ease',
                      }}
                    >
                      <div
                        style={{ display: 'flex', alignItems: 'center', gap: '10px', cursor: 'pointer' }}
                        onClick={() => toggleParticipant(p.id)}
                      >
                        <input
                          type="checkbox"
                          checked={isIncluded}
                          onChange={() => toggleParticipant(p.id)}
                          style={{
                            accentColor: 'var(--accent-primary)',
                            width: '16px',
                            height: '16px',
                            cursor: 'pointer',
                          }}
                        />
                        <div
                          className="avatar"
                          style={{
                            backgroundColor: p.color,
                            width: '26px',
                            height: '26px',
                            fontSize: '0.75rem',
                          }}
                        >
                          {p.name.charAt(0).toUpperCase()}
                        </div>
                        <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>
                          {p.name}
                        </span>
                        {isPayer && (
                          <span
                            className="badge badge-neutral"
                            style={{ fontSize: '0.65rem', padding: '1px 6px' }}
                          >
                            Payer
                          </span>
                        )}
                      </div>

                      {/* Split Inputs per participant */}
                      {isIncluded && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {splitMethod === 'equal' && (
                            <span
                              style={{
                                fontFamily: 'var(--font-mono)',
                                fontSize: '0.85rem',
                                color: 'var(--text-secondary)',
                              }}
                            >
                              {totalMinor > 0 && selectedParticipants.length > 0
                                ? formatCurrency(
                                    computedShares.find((s) => s.participantId === p.id)?.amountMinor || 0,
                                    group.currency
                                  )
                                : '—'}
                            </span>
                          )}

                          {(splitMethod === 'unequal' || splitMethod === 'exact') && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
                                {currencyConfig.symbol}
                              </span>
                              <input
                                type="number"
                                step="0.01"
                                min="0"
                                placeholder="0.00"
                                className="form-input"
                                style={{
                                  width: '90px',
                                  padding: '4px 8px',
                                  fontSize: '0.88rem',
                                  fontFamily: 'var(--font-mono)',
                                }}
                                value={customShares[p.id] || ''}
                                onChange={(e) => {
                                  setCustomShares({
                                    ...customShares,
                                    [p.id]: e.target.value,
                                  });
                                  if (error) setError(null);
                                }}
                              />
                            </div>
                          )}

                          {splitMethod === 'percentage' && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                              <input
                                type="number"
                                step="0.1"
                                min="0"
                                max="100"
                                placeholder="0"
                                className="form-input"
                                style={{
                                  width: '75px',
                                  padding: '4px 8px',
                                  fontSize: '0.88rem',
                                  fontFamily: 'var(--font-mono)',
                                }}
                                value={customPercentages[p.id] || ''}
                                onChange={(e) => {
                                  setCustomPercentages({
                                    ...customPercentages,
                                    [p.id]: e.target.value,
                                  });
                                  if (error) setError(null);
                                }}
                              />
                              <span style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>%</span>
                              <span
                                style={{
                                  fontSize: '0.78rem',
                                  color: 'var(--text-muted)',
                                  width: '65px',
                                  textAlign: 'right',
                                  fontFamily: 'var(--font-mono)',
                                }}
                              >
                                {totalMinor > 0 && customPercentages[p.id]
                                  ? formatCurrency(
                                      Math.round(
                                        (parseFloat(customPercentages[p.id] || '0') * totalMinor) / 100
                                      ),
                                      group.currency
                                    )
                                  : ''}
                              </span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Live validation difference pill */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 12px',
                  borderRadius: 'var(--radius-md)',
                  backgroundColor: isSplitValid
                    ? 'var(--color-success-bg)'
                    : totalMinor > 0
                    ? 'var(--color-warning-bg)'
                    : 'var(--bg-main)',
                  border: isSplitValid
                    ? '1px solid rgba(131,217,160,0.3)'
                    : totalMinor > 0
                    ? '1px solid rgba(245,197,107,0.3)'
                    : '1px solid var(--border-glass)',
                  fontSize: '0.82rem',
                  color: isSplitValid
                    ? 'var(--color-success)'
                    : totalMinor > 0
                    ? 'var(--color-warning)'
                    : 'var(--text-muted)',
                }}
              >
                {isSplitValid ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                <span>{splitValidationMessage || 'Enter expense amount to calculate splits'}</span>
              </div>
            </div>

            {/* Optional Notes */}
            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="exp-notes" className="form-label">
                Notes <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
              </label>
              <input
                id="exp-notes"
                type="text"
                className="form-input"
                placeholder="e.g. Paid via credit card, split restaurant service charge"
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
              className="btn btn-primary"
              disabled={!isSplitValid || totalMinor <= 0}
              style={{
                opacity: !isSplitValid || totalMinor <= 0 ? 0.6 : 1,
                cursor: !isSplitValid || totalMinor <= 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {initialExpense ? 'Update Expense' : 'Save Expense'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
