import React, { useState, useEffect } from 'react';
import { X, Check } from 'lucide-react';

export function ChangePasswordModal({ open, account, onClose, onChangePassword }) {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setError('');
    }
  }, [open]);

  if (!open) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (account?.password && currentPassword !== account.password) {
      setError('Current password is incorrect');
      return;
    }

    if (newPassword.length < 6) {
      setError('New password must be at least 6 characters');
      return;
    }

    if (newPassword !== confirmPassword) {
      setError('New passwords do not match');
      return;
    }

    if (onChangePassword) {
      onChangePassword(newPassword);
    }
    onClose();
  };

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 50,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
        background: 'rgba(0,0,0,.6)',
      }}
      onClick={onClose}
    >
      <div
        className="fade-in"
        style={{
          width: '100%',
          maxWidth: 400,
          borderRadius: 8,
          background: 'var(--bg)',
          border: '1px solid var(--border)',
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <span className="font-display" style={{ fontWeight: 600, fontSize: 15 }}>
            Change Password
          </span>
          <button type="button" className="btn btn-ghost" onClick={onClose}>
            <X style={{ width: 16, height: 16 }} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
            {error && (
              <div
                style={{
                  fontSize: 12,
                  padding: '8px 12px',
                  borderRadius: 6,
                  background: 'rgba(248,113,113,.1)',
                  color: 'var(--red)',
                  border: '1px solid rgba(248,113,113,.2)',
                }}
              >
                {error}
              </div>
            )}

            <div>
              <label className="fl">Current Password</label>
              <input
                type="password"
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                style={{ width: '100%', marginTop: 4, boxSizing: 'border-box' }}
                autoFocus
              />
            </div>

            <div>
              <label className="fl">New Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min 6 chars)"
                style={{ width: '100%', marginTop: 4, boxSizing: 'border-box' }}
              />
            </div>

            <div>
              <label className="fl">Confirm New Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                style={{ width: '100%', marginTop: 4, boxSizing: 'border-box' }}
              />
            </div>
          </div>

          <div
            style={{
              padding: '16px 24px',
              borderTop: '1px solid var(--border)',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 8,
            }}
          >
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Check style={{ width: 14, height: 14 }} /> Change Password
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
