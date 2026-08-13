import React, { useState } from 'react';
import { Plus, Trash2, Edit3, Shield, User, Check, AlertTriangle } from 'lucide-react';
import { uid } from '../utils/date';
import { secondarySupabase } from '../services/db';

const ALL_FEATURES = [
  { id: 'dashboard', label: 'Dashboard Overview', deps: [] },
  { id: 'calendar', label: 'Calendar View', deps: ['dashboard'] },
  { id: 'timeline', label: 'Timeline View', deps: ['dashboard'] },
  { id: 'projects', label: 'View Projects', deps: [] },
  { id: 'tasks', label: 'Manage Tasks', deps: ['projects'] },
  { id: 'modules', label: 'Manage Modules', deps: ['projects'] },
  { id: 'tickets', label: 'Client Tickets', deps: ['projects'] },
  { id: 'updates', label: 'Project Updates', deps: ['projects'] },
  { id: 'team_view', label: 'View Team', deps: [] },
  { id: 'ai', label: 'AI Suggestions', deps: ['projects', 'tasks'] },
];

const INITIAL_FORM = {
  id: '',
  username: '',
  displayName: '',
  email: '', // Now optional, mapped to notification_email
  password: '',
  role: 'member',
  assignedProjectIds: [],
  featureAccess: []
};

export function UserManagement({ accounts = [], projects = [], onCreateAccount, onUpdateAccount, onDeleteAccount }) {
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState(INITIAL_FORM);
  const [featureWarnings, setFeatureWarnings] = useState({});
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  const handleEdit = (account) => {
    setFormData({ ...account, password: '' });
    setFeatureWarnings({});
    setIsEditing(true);
  };

  const handleCreateNew = () => {
    setFormData(INITIAL_FORM);
    setFeatureWarnings({});
    setIsEditing(true);
  };

  const handleCancel = () => {
    setIsEditing(false);
    setFormData(INITIAL_FORM);
    setFeatureWarnings({});
  };

  const handleSave = async () => {
    if (!formData.username || !formData.displayName || (!formData.id && formData.password.length < 6)) return;

    setBusy(true); setError("");
    try {
      if (formData.id) {
        onUpdateAccount(formData);
      } else {
        const authEmail = `${formData.username.trim().toLowerCase()}@gpm.local`;

        // Create in Supabase Auth first with synthetic email
        const { data: authData, error: authError } = await secondarySupabase.auth.signUp({
          email: authEmail,
          password: formData.password
        });
        if (authError) throw authError;
        if (!authData.user) throw new Error("Could not create user in auth system.");

        onCreateAccount({ ...formData, id: 'acc-' + uid(), supabaseUid: authData.user.id, notificationEmail: formData.email.trim() });
      }
      setIsEditing(false);
      setFormData(INITIAL_FORM);
    } catch(err) {
      setError(err.message || "An error occurred while saving.");
    }
    setBusy(false);
  };

  const handleToggleFeature = (featureId) => {
    const feature = ALL_FEATURES.find(f => f.id === featureId);
    const isCurrentlyOn = formData.featureAccess.includes(featureId);

    if (!isCurrentlyOn) {
      const missingDeps = feature.deps.filter(depId => !formData.featureAccess.includes(depId));
      if (missingDeps.length > 0) {
        setFeatureWarnings(prev => ({
          ...prev,
          [featureId]: { type: 'missing_dep', missing: missingDeps, target: featureId }
        }));
        return;
      } else {
        setFeatureWarnings(prev => { const n = {...prev}; delete n[featureId]; return n; });
        setFormData(prev => ({ ...prev, featureAccess: [...prev.featureAccess, featureId] }));
      }
    } else {
      const dependents = ALL_FEATURES.filter(f => f.deps.includes(featureId) && formData.featureAccess.includes(f.id));
      if (dependents.length > 0) {
        setFeatureWarnings(prev => ({
          ...prev,
          [featureId]: { type: 'has_dependents', dependents: dependents.map(d => d.id), target: featureId }
        }));
        return;
      } else {
        setFeatureWarnings(prev => { const n = {...prev}; delete n[featureId]; return n; });
        setFormData(prev => ({ ...prev, featureAccess: prev.featureAccess.filter(id => id !== featureId) }));
      }
    }
  };

  const resolveWarning = (featureId, action) => {
    const warning = featureWarnings[featureId];
    if (!warning) return;
    
    if (warning.type === 'missing_dep' && action === 'proceed') {
      const toAdd = [featureId, ...warning.missing];
      setFormData(prev => {
        const newAccess = new Set([...prev.featureAccess, ...toAdd]);
        return { ...prev, featureAccess: Array.from(newAccess) };
      });
    } else if (warning.type === 'has_dependents' && action === 'proceed') {
      const toRemove = [featureId, ...warning.dependents];
      setFormData(prev => ({
        ...prev,
        featureAccess: prev.featureAccess.filter(id => !toRemove.includes(id))
      }));
    }
    
    setFeatureWarnings(prev => { const n = {...prev}; delete n[featureId]; return n; });
  };

  const cancelWarning = (featureId) => {
    setFeatureWarnings(prev => { const n = {...prev}; delete n[featureId]; return n; });
  };

  const toggleProject = (projectId) => {
    setFormData(prev => {
      const isAssigned = prev.assignedProjectIds.includes(projectId);
      if (isAssigned) {
        return { ...prev, assignedProjectIds: prev.assignedProjectIds.filter(id => id !== projectId) };
      } else {
        return { ...prev, assignedProjectIds: [...prev.assignedProjectIds, projectId] };
      }
    });
  };

  return (
    <div style={{ padding: '24px', color: 'var(--text)', display: 'flex', flexDirection: 'column', gap: '24px', height: '100%', overflowY: 'auto' }}>
      
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 className="font-display" style={{ margin: 0, fontSize: '24px' }}>User Management</h1>
          <p style={{ color: 'var(--text-2)', margin: '4px 0 0 0', fontSize: '14px' }}>Manage team member accounts and access permissions.</p>
        </div>
        {!isEditing && (
          <button className="btn btn-primary" onClick={handleCreateNew} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={16} /> Create Member
          </button>
        )}
      </div>

      {isEditing && (
        <div className="fade-in" style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', padding: '24px' }}>
          <h2 className="font-display" style={{ margin: '0 0 24px 0', fontSize: '18px' }}>{formData.id ? 'Edit Member' : 'Create Member'}</h2>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '32px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="fl" style={{ fontSize: '13px', color: 'var(--text-2)' }}>Username *</label>
              <input
                type="text"
                value={formData.username}
                onChange={e => setFormData({ ...formData, username: e.target.value })}
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px', color: 'var(--text)' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="fl" style={{ fontSize: '13px', color: 'var(--text-2)' }}>Display Name *</label>
              <input
                type="text"
                value={formData.displayName}
                onChange={e => setFormData({ ...formData, displayName: e.target.value })}
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px', color: 'var(--text)' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="fl" style={{ fontSize: '13px', color: 'var(--text-2)' }}>Notification Email (Optional)</label>
              <input
                type="email"
                value={formData.email}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px', color: 'var(--text)' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="fl" style={{ fontSize: '13px', color: 'var(--text-2)' }}>Password {formData.id ? '(Leave blank to keep)' : '*'}</label>
              <input
                type="password"
                value={formData.password}
                onChange={e => setFormData({ ...formData, password: e.target.value })}
                placeholder="Min 6 characters"
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px', color: 'var(--text)' }}
              />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              <label className="fl" style={{ fontSize: '13px', color: 'var(--text-2)' }}>Role</label>
              <select
                value={formData.role}
                onChange={e => setFormData({ ...formData, role: e.target.value })}
                style={{ background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '6px', padding: '10px', color: 'var(--text)' }}
              >
                <option value="member">Member</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>

          {formData.role === 'admin' ? (
            <div style={{ gridColumn: '1 / -1', padding: '24px', background: 'rgba(245, 158, 11, 0.05)', border: '1px solid var(--amber)', borderRadius: '8px', color: 'var(--amber)', display: 'flex', alignItems: 'center', gap: '12px' }}>
              <Shield size={24} />
              <div>
                <h3 style={{ margin: 0, fontSize: '15px' }}>Full System Access</h3>
                <p style={{ margin: '4px 0 0 0', fontSize: '13px', opacity: 0.9 }}>Administrators automatically have unrestricted access to all features, settings, and projects.</p>
              </div>
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
              {/* Feature Access */}
              <div>
                <h3 className="font-display" style={{ fontSize: '15px', marginBottom: '16px', color: 'var(--text)' }}>Feature Access</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {ALL_FEATURES.map(feature => {
                    const isChecked = formData.featureAccess.includes(feature.id);
                    const warning = featureWarnings[feature.id];
                    
                    return (
                      <div key={feature.id} style={{ display: 'flex', flexDirection: 'column', gap: '8px', padding: '12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                        <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', margin: 0 }}>
                          <div style={{
                            width: '18px', height: '18px', borderRadius: '4px', border: '1px solid',
                            borderColor: isChecked ? 'var(--blue)' : 'var(--border)',
                            background: isChecked ? 'var(--blue)' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                          }}>
                            {isChecked && <Check size={12} color="#fff" />}
                          </div>
                          <input
                            type="checkbox"
                            style={{ display: 'none' }}
                            checked={isChecked}
                            onChange={() => handleToggleFeature(feature.id)}
                          />
                          <span style={{ fontSize: '14px' }}>{feature.label}</span>
                        </label>
                        
                        {warning && warning.type === 'missing_dep' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--amber)', padding: '12px', borderRadius: '6px', marginTop: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--amber)', fontSize: '13px' }}>
                              <AlertTriangle size={14} />
                              <span>⚠️ '{feature.label}' requires '{warning.missing.map(id => ALL_FEATURES.find(f => f.id === id)?.label).join(', ')}' to be enabled. Enable it too?</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn btn-secondary" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={() => resolveWarning(feature.id, 'proceed')}>Auto-enable</button>
                              <button className="btn btn-ghost" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={() => cancelWarning(feature.id)}>Cancel</button>
                            </div>
                          </div>
                        )}

                        {warning && warning.type === 'has_dependents' && (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'rgba(245, 158, 11, 0.1)', border: '1px solid var(--amber)', padding: '12px', borderRadius: '6px', marginTop: '4px' }}>
                            <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: 'var(--amber)', fontSize: '13px' }}>
                              <AlertTriangle size={14} style={{ marginTop: '2px', flexShrink: 0 }} />
                              <span>⚠️ Disabling '{feature.label}' will also disable: {warning.dependents.map(id => ALL_FEATURES.find(f => f.id === id)?.label).join(', ')}. Proceed?</span>
                            </div>
                            <div style={{ display: 'flex', gap: '8px' }}>
                              <button className="btn btn-secondary" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={() => resolveWarning(feature.id, 'proceed')}>Confirm</button>
                              <button className="btn btn-ghost" style={{ fontSize: '12px', padding: '4px 8px' }} onClick={() => cancelWarning(feature.id)}>Cancel</button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Project Assignment */}
              <div>
                <h3 className="font-display" style={{ fontSize: '15px', marginBottom: '16px', color: 'var(--text)' }}>Project Assignment</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '500px', overflowY: 'auto', paddingRight: '8px' }}>
                  {projects.length === 0 ? (
                    <div style={{ color: 'var(--text-3)', fontSize: '14px', fontStyle: 'italic' }}>No projects available.</div>
                  ) : (
                    projects.map(project => {
                      const isAssigned = formData.assignedProjectIds.includes(project.id);
                      return (
                        <label key={project.id} style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer', padding: '12px', background: 'var(--bg)', borderRadius: '8px', border: '1px solid var(--border)' }}>
                          <div style={{
                            width: '18px', height: '18px', borderRadius: '4px', border: '1px solid',
                            borderColor: isAssigned ? 'var(--blue)' : 'var(--border)',
                            background: isAssigned ? 'var(--blue)' : 'transparent',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0
                          }}>
                            {isAssigned && <Check size={12} color="#fff" />}
                          </div>
                          <input
                            type="checkbox"
                            style={{ display: 'none' }}
                            checked={isAssigned}
                            onChange={() => toggleProject(project.id)}
                          />
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span style={{ fontSize: '14px', fontWeight: '500' }}>{project.name}</span>
                            {project.client && <span style={{ fontSize: '12px', color: 'var(--text-2)' }}>{project.client}</span>}
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          )}

          {error && <div style={{ background: 'rgba(248,113,113,0.1)', color: 'var(--red)', padding: '12px', borderRadius: '6px', fontSize: '13px', marginTop: '24px' }}>{error}</div>}

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '32px', paddingTop: '24px', borderTop: '1px solid var(--border)' }}>
            <button className="btn btn-ghost" onClick={handleCancel} disabled={busy}>Cancel</button>
            <button 
              className="btn btn-primary" 
              onClick={handleSave}
              disabled={busy || !formData.username || !formData.displayName || (!formData.id && formData.password.length < 6)}
            >
              {busy ? "Saving..." : (formData.id ? 'Save Changes' : 'Create Account')}
            </button>
          </div>
        </div>
      )}

      {/* Accounts List */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: '12px', overflow: 'hidden' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border)', background: 'var(--bg)' }}>
              <th style={{ padding: '16px', fontSize: '13px', fontWeight: '500', color: 'var(--text-2)' }}>User</th>
              <th style={{ padding: '16px', fontSize: '13px', fontWeight: '500', color: 'var(--text-2)' }}>Role</th>
              <th style={{ padding: '16px', fontSize: '13px', fontWeight: '500', color: 'var(--text-2)' }}>Email</th>
              <th style={{ padding: '16px', fontSize: '13px', fontWeight: '500', color: 'var(--text-2)' }}>Projects</th>
              <th style={{ padding: '16px', fontSize: '13px', fontWeight: '500', color: 'var(--text-2)' }}>Features</th>
              <th style={{ padding: '16px', fontSize: '13px', fontWeight: '500', color: 'var(--text-2)', textAlign: 'right' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {accounts.length === 0 ? (
              <tr>
                <td colSpan={6} style={{ padding: '32px', textAlign: 'center', color: 'var(--text-3)' }}>
                  No accounts found.
                </td>
              </tr>
            ) : accounts.map(account => (
              <tr key={account.id} style={{ borderBottom: '1px solid var(--border)' }}>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--bg)', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '1px solid var(--border)' }}>
                      <User size={16} color="var(--text-2)" />
                    </div>
                    <div>
                      <div style={{ fontWeight: '500', fontSize: '14px' }}>{account.displayName}</div>
                      <div className="font-mono" style={{ fontSize: '12px', color: 'var(--text-2)' }}>@{account.username}</div>
                    </div>
                  </div>
                </td>
                <td style={{ padding: '16px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: account.role === 'admin' ? 'rgba(245, 158, 11, 0.1)' : 'var(--bg)', border: `1px solid ${account.role === 'admin' ? 'var(--amber)' : 'var(--border)'}`, padding: '4px 8px', borderRadius: '16px', fontSize: '12px', color: account.role === 'admin' ? 'var(--amber)' : 'var(--text-2)', textTransform: 'capitalize' }}>
                    {account.role === 'admin' ? <Shield size={12} /> : <User size={12} />}
                    {account.role}
                  </div>
                </td>
                <td style={{ padding: '16px', fontSize: '14px', color: 'var(--text-2)' }}>
                  {account.email || '-'}
                </td>
                <td style={{ padding: '16px', fontSize: '14px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '2px 8px', fontSize: '12px' }}>
                    {account.assignedProjectIds?.length || 0}
                  </div>
                </td>
                <td style={{ padding: '16px', fontSize: '14px' }}>
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: '12px', padding: '2px 8px', fontSize: '12px' }}>
                    {account.featureAccess?.length || 0} / {ALL_FEATURES.length}
                  </div>
                </td>
                <td style={{ padding: '16px', textAlign: 'right' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'flex-end', gap: '8px' }}>
                    <button className="btn btn-ghost" style={{ padding: '6px' }} onClick={() => handleEdit(account)} title="Edit">
                      <Edit3 size={16} color="var(--text-2)" />
                    </button>
                    <button className="btn btn-ghost" style={{ padding: '6px' }} onClick={() => onDeleteAccount(account.id)} title="Delete">
                      <Trash2 size={16} color="var(--red)" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

    </div>
  );
}
