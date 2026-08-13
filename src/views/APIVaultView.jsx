import React, { useState } from 'react';
import { Topbar } from '../components/layout';
import { Key, Shield, Plus, Trash2, Eye, EyeOff, Lock, Server } from 'lucide-react';
import { api } from '../services/db';
import { colorFor, PALETTE } from '../utils/constants';

export function APIVaultView({ account, projects, apiVault, apiVaultAccess }) {
  const isAdmin = account?.role === 'admin';
  const [showKey, setShowKey] = useState({});

  const toggleKey = (id) => setShowKey(prev => ({ ...prev, [id]: !prev[id] }));

  // Scoping logic: already handled by RLS on backend, but we format the view here.
  // Group by project
  const vaultByProject = apiVault.reduce((acc, v) => {
    if (!acc[v.projectId]) acc[v.projectId] = { dev: [], prod: [] };
    if (v.environment === 'development') acc[v.projectId].dev.push(v);
    else acc[v.projectId].prod.push(v);
    return acc;
  }, {});

  return (
    <div style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <Topbar title="API Vault" subtitle="Internal Team Credentials" />
      
      <div style={{ padding: 32, maxWidth: 1000, margin: '0 auto', width: '100%' }}>
        <div style={{ marginBottom: 32, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h2 className="font-display" style={{ fontSize: 24, fontWeight: 600, display: 'flex', alignItems: 'center', gap: 12 }}>
              <Shield size={24} color="var(--blue)" />
              Secure API Vault
            </h2>
            <p style={{ color: 'var(--text-2)', marginTop: 8 }}>
              Project-specific credentials securely isolated by environment.
              {!isAdmin && " Production access is restricted."}
            </p>
          </div>
          {isAdmin && (
            <button className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <Plus size={16} /> Add Credential
            </button>
          )}
        </div>

        {Object.keys(vaultByProject).length === 0 ? (
          <div style={{ textAlign: 'center', padding: 64, color: 'var(--text-3)', background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)' }}>
            <Key size={48} style={{ margin: '0 auto 16px', opacity: 0.5 }} />
            <h3 className="font-display" style={{ fontSize: 18, color: 'var(--text)', marginBottom: 8 }}>Vault is Empty</h3>
            <p>No API credentials have been added or you do not have access to view them.</p>
          </div>
        ) : (
          Object.entries(vaultByProject).map(([projectId, envs]) => {
            const project = projects.find(p => p.id === projectId);
            if (!project) return null;
            const c = colorFor(project.color);

            return (
              <div key={projectId} style={{ marginBottom: 32, background: 'var(--surface)', borderRadius: 12, border: '1px solid var(--border)', overflow: 'hidden' }}>
                <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, background: 'var(--surface-2)' }}>
                  <div style={{ width: 12, height: 12, borderRadius: 4, background: c.bg, border: `2px solid ${c.ring}` }} />
                  <h3 className="font-display" style={{ fontSize: 16, fontWeight: 600 }}>{project.name}</h3>
                  <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{project.client}</span>
                </div>

                <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 24 }}>
                  {/* Development Environment */}
                  <div>
                    <h4 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-2)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Server size={14} /> Development
                    </h4>
                    {envs.dev.length === 0 ? (
                      <div style={{ fontSize: 13, color: 'var(--text-3)', padding: 16, background: 'var(--bg)', borderRadius: 8, border: '1px dashed var(--border)' }}>No development credentials</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {envs.dev.map(v => (
                          <CredentialRow key={v.id} credential={v} showKey={showKey[v.id]} onToggle={() => toggleKey(v.id)} isAdmin={isAdmin} />
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Production Environment */}
                  <div>
                    <h4 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--amber)', marginBottom: 16, display: 'flex', alignItems: 'center', gap: 8 }}>
                      <Lock size={14} /> Production
                    </h4>
                    {envs.prod.length === 0 ? (
                      <div style={{ fontSize: 13, color: 'var(--text-3)', padding: 16, background: 'var(--bg)', borderRadius: 8, border: '1px dashed var(--border)' }}>No production credentials</div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                        {envs.prod.map(v => (
                          <CredentialRow key={v.id} credential={v} showKey={showKey[v.id]} onToggle={() => toggleKey(v.id)} isAdmin={isAdmin} />
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

function CredentialRow({ credential, showKey, onToggle, isAdmin }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, flex: 1 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: 'var(--surface-2)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-2)' }}>
          <Key size={16} />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ fontWeight: 500, fontSize: 14 }}>{credential.serviceName}</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
            <code style={{ fontSize: 12, color: 'var(--text-2)', background: 'var(--surface)', padding: '2px 6px', borderRadius: 4, fontFamily: 'monospace' }}>
              {showKey ? credential.apiKey : '••••••••••••••••••••••••••••'}
            </code>
            <button onClick={onToggle} style={{ background: 'none', border: 'none', color: 'var(--text-3)', cursor: 'pointer', padding: 4, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {showKey ? <EyeOff size={14} /> : <Eye size={14} />}
            </button>
          </div>
        </div>
      </div>
      {isAdmin && (
        <button className="btn btn-ghost" style={{ padding: 8, color: 'var(--red)' }}>
          <Trash2 size={16} />
        </button>
      )}
    </div>
  );
}
