import React, { useState } from 'react';
import { X, Plus, Trash2, Users, Sparkles, Check } from 'lucide-react';
import { Currency, Group, Participant } from '../types';
import { CURRENCY_CONFIGS } from '../utils/money';
import { getRandomColor } from '../utils/storage';

interface CreateGroupModalProps {
  isOpen: boolean;
  onClose: () => void;
  onGroupCreated: (newGroup: Group) => void;
}

export const CreateGroupModal: React.FC<CreateGroupModalProps> = ({
  isOpen,
  onClose,
  onGroupCreated,
}) => {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [currency, setCurrency] = useState<Currency>('INR');
  const [participants, setParticipants] = useState<string[]>(['You', '']);
  const [currentUserIndex, setCurrentUserIndex] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleAddParticipant = () => {
    setParticipants([...participants, '']);
  };

  const handleRemoveParticipant = (index: number) => {
    if (participants.length <= 2) {
      setError('A group must have at least 2 participants.');
      return;
    }
    const updated = participants.filter((_, i) => i !== index);
    setParticipants(updated);
    if (currentUserIndex === index) {
      setCurrentUserIndex(0);
    } else if (currentUserIndex > index) {
      setCurrentUserIndex(currentUserIndex - 1);
    }
  };

  const handleParticipantChange = (index: number, val: string) => {
    const updated = [...participants];
    updated[index] = val;
    setParticipants(updated);
    if (error) setError(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const trimmedName = name.trim();
    if (!trimmedName) {
      setError('Please provide a group name (e.g., "Goa Roadtrip" or "Friday Dinner").');
      return;
    }

    const trimmedParticipants = participants.map((p) => p.trim());
    const emptyCount = trimmedParticipants.filter((p) => !p).length;
    if (emptyCount > 0) {
      setError('Please fill in all participant names or remove extra fields.');
      return;
    }

    if (trimmedParticipants.length < 2) {
      setError('Please add at least 2 participants.');
      return;
    }

    // Check for duplicates (case-insensitive)
    const lowerNames = trimmedParticipants.map((p) => p.toLowerCase());
    const uniqueNames = new Set(lowerNames);
    if (uniqueNames.size !== lowerNames.length) {
      setError('Duplicate participant names detected. Please make each name unique.');
      return;
    }

    // Generate unique IDs
    const groupId = 'group-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
    const participantObjects: Participant[] = trimmedParticipants.map((pName, idx) => ({
      id: 'p-' + Date.now() + '-' + idx + '-' + Math.random().toString(36).substring(2, 6),
      name: pName,
      color: getRandomColor(idx),
    }));

    const currentUserId = participantObjects[currentUserIndex]?.id || participantObjects[0].id;

    const newGroup: Group = {
      id: groupId,
      name: trimmedName,
      description: description.trim(),
      currency,
      participants: participantObjects,
      currentUserId,
      expenses: [],
      settlements: [],
      activities: [
        {
          id: 'act-' + Date.now(),
          groupId,
          type: 'group_created',
          description: `Group "${trimmedName}" was created with ${participantObjects.length} participants.`,
          timestamp: new Date().toISOString(),
        },
      ],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    onGroupCreated(newGroup);
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-group-title"
      onClick={onClose}
    >
      <div
        className="modal-dialog"
        style={{ maxWidth: '540px' }}
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
              <Users size={20} />
            </div>
            <div>
              <h2 id="create-group-title" className="modal-title">Create a New Group</h2>
              <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                Set up a shared expense pot with friends or colleagues
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
                }}
              >
                {error}
              </div>
            )}

            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="group-name" className="form-label">
                Group Name <span style={{ color: 'var(--accent-primary)' }}>*</span>
              </label>
              <input
                id="group-name"
                type="text"
                className="form-input"
                placeholder="e.g. Goa Trip, Flat 402 Utilities, Weekend Trek"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  if (error) setError(null);
                }}
                autoFocus
                required
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="group-desc" className="form-label">
                Description <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(Optional)</span>
              </label>
              <input
                id="group-desc"
                type="text"
                className="form-input"
                placeholder="e.g. Shared expenses for hotels, food, and cabs"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <div className="form-group" style={{ margin: 0 }}>
              <label htmlFor="group-currency" className="form-label">
                Group Currency
              </label>
              <select
                id="group-currency"
                className="form-select"
                value={currency}
                onChange={(e) => setCurrency(e.target.value as Currency)}
              >
                {Object.values(CURRENCY_CONFIGS).map((curr) => (
                  <option key={curr.code} value={curr.code}>
                    {curr.symbol} {curr.name} ({curr.code})
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <label className="form-label" style={{ margin: 0 }}>
                  Participants (min 2) <span style={{ color: 'var(--accent-primary)' }}>*</span>
                </label>
                <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>
                  Click checkmark to select "You"
                </span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {participants.map((participantName, idx) => {
                  const isYou = currentUserIndex === idx;
                  return (
                    <div
                      key={idx}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'var(--bg-main)',
                        padding: '6px 10px',
                        borderRadius: 'var(--radius-md)',
                        border: '1px solid var(--border-glass-bright)',
                      }}
                    >
                      <button
                        type="button"
                        onClick={() => setCurrentUserIndex(idx)}
                        title={isYou ? 'This represents you' : 'Set as you'}
                        style={{
                          width: '28px',
                          height: '28px',
                          borderRadius: '50%',
                          border: isYou ? 'none' : '1px solid var(--border-glass-bright)',
                          backgroundColor: isYou ? 'var(--accent-primary)' : 'transparent',
                          color: isYou ? 'var(--accent-text)' : 'transparent',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer',
                          flexShrink: 0,
                          transition: 'all 0.15s ease',
                        }}
                      >
                        <Check size={16} style={{ strokeWidth: 3, opacity: isYou ? 1 : 0 }} />
                      </button>

                      <input
                        type="text"
                        className="form-input"
                        style={{
                          border: 'none',
                          padding: '6px 4px',
                          background: 'transparent',
                          fontSize: '0.92rem',
                        }}
                        placeholder={`Participant ${idx + 1}`}
                        value={participantName}
                        onChange={(e) => handleParticipantChange(idx, e.target.value)}
                      />

                      {isYou && (
                        <span
                          className="badge badge-success"
                          style={{ fontSize: '0.7rem', padding: '2px 8px', flexShrink: 0 }}
                        >
                          You
                        </span>
                      )}

                      <button
                        type="button"
                        className="btn btn-ghost"
                        style={{
                          padding: '6px',
                          color: participants.length <= 2 ? 'var(--text-muted)' : 'var(--color-danger)',
                          cursor: participants.length <= 2 ? 'not-allowed' : 'pointer',
                        }}
                        onClick={() => handleRemoveParticipant(idx)}
                        disabled={participants.length <= 2}
                        aria-label="Remove participant"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  );
                })}
              </div>

              <button
                type="button"
                className="btn btn-secondary btn-sm"
                style={{ alignSelf: 'flex-start', marginTop: '4px' }}
                onClick={handleAddParticipant}
              >
                <Plus size={16} /> Add Another Participant
              </button>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Sparkles size={16} /> Create Group
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
