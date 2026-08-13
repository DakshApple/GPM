import React, { useState, useEffect } from 'react';
import { isGoogleConnected, getGoogleToken, connectGoogle, clearGoogleToken, refreshGoogle } from '../services/google';
import { Topbar } from '../components/layout';
import { HardDrive, Mail, MessageSquare, CheckCircle2, XCircle, LogIn, LogOut, RefreshCw } from 'lucide-react';

export function IntegrationsView({ account }) {
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(false);
  const [tokenInfo, setTokenInfo] = useState(null);

  useEffect(() => {
    checkConnection();
  }, [account?.id]);

  const checkConnection = () => {
    if (!account?.id) return;
    const isConn = isGoogleConnected(account.id);
    setConnected(isConn);
    if (isConn) {
      setTokenInfo(getGoogleToken(account.id));
    } else {
      setTokenInfo(null);
    }
  };

  const handleConnect = async () => {
    setLoading(true);
    try {
      await connectGoogle(account.id);
      checkConnection();
    } catch (error) {
      console.error('Failed to connect Google:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDisconnect = () => {
    if (window.confirm('Are you sure you want to disconnect your Google account?')) {
      clearGoogleToken(account.id);
      checkConnection();
    }
  };

  const handleRefresh = async () => {
    setLoading(true);
    try {
      await refreshGoogle(account.id);
      checkConnection();
    } catch (error) {
      console.error('Failed to refresh token:', error);
    } finally {
      setLoading(false);
    }
  };

  if (!account) return null;

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }} className="fade-in">
      <Topbar title="Google Workspace" />
      <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
        
        {/* Header / Hero Area */}
        <div style={{ 
          background: 'linear-gradient(135deg, var(--surface-2) 0%, var(--surface) 100%)',
          borderRadius: 16,
          padding: 40,
          marginBottom: 32,
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center'
        }}>
          <div style={{
            width: 80,
            height: 80,
            borderRadius: 40,
            background: 'var(--surface-3)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            marginBottom: 20
          }}>
            <svg width="40" height="40" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
            </svg>
          </div>
          <h1 className="font-display" style={{ fontSize: 32, margin: '0 0 16px 0', color: 'var(--text)' }}>
            Google Workspace
          </h1>
          
          {connected && tokenInfo ? (
            <div className="scale-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
              {tokenInfo.picture ? (
                <img src={tokenInfo.picture} alt="Profile" style={{ width: 64, height: 64, borderRadius: 32, marginBottom: 16 }} />
              ) : null}
              <h2 style={{ fontSize: 20, margin: '0 0 8px 0', color: 'var(--text)' }}>{tokenInfo.name || account.displayName}</h2>
              <p className="font-mono" style={{ margin: '0 0 24px 0', color: 'var(--text-2)' }}>{tokenInfo.email}</p>
              
              <div style={{ display: 'flex', gap: 12 }}>
                <button 
                  className="btn btn-secondary" 
                  onClick={handleRefresh}
                  disabled={loading}
                >
                  <RefreshCw size={16} />
                  {loading ? 'Refreshing...' : 'Refresh Token'}
                </button>
                <button 
                  className="btn btn-ghost" 
                  onClick={handleDisconnect}
                  style={{ color: 'var(--red)' }}
                >
                  <LogOut size={16} />
                  Disconnect
                </button>
              </div>
            </div>
          ) : (
            <div className="scale-in" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', maxWidth: 480 }}>
              <p style={{ fontSize: 16, color: 'var(--text-2)', lineHeight: 1.6, marginBottom: 32 }}>
                Connect your Google account to unlock seamless integration with Google Drive, Gmail, and Google Chat directly from your workspace.
              </p>
              <button 
                className="btn btn-primary" 
                onClick={handleConnect}
                disabled={loading}
                style={{ fontSize: 16, padding: '12px 24px', height: 'auto' }}
              >
                <LogIn size={20} />
                {loading ? 'Connecting...' : 'Connect Google Account'}
              </button>
            </div>
          )}
        </div>

        {/* Services Grid */}
        <h3 className="font-display" style={{ fontSize: 20, margin: '0 0 24px 0', color: 'var(--text)' }}>
          Available Services
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 24 }}>
          
          {/* Drive Card */}
          <div style={{ 
            background: 'var(--surface-2)', 
            borderRadius: 12, 
            padding: 24, 
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <HardDrive size={24} color="var(--blue)" />
              </div>
              {connected ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--green)', background: 'var(--surface-3)', padding: '4px 10px', borderRadius: 20 }}>
                  <CheckCircle2 size={14} /> Available
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: 'var(--text-3)', background: 'var(--surface-3)', padding: '4px 10px', borderRadius: 20 }}>
                  <XCircle size={14} /> Connect to use
                </span>
              )}
            </div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 16, color: 'var(--text)' }}>Google Drive</h4>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5 }}>
              Access, search, and attach files directly from your Drive.
            </p>
          </div>

          {/* Gmail Card */}
          <div style={{ 
            background: 'var(--surface-2)', 
            borderRadius: 12, 
            padding: 24, 
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Mail size={24} color="var(--red)" />
              </div>
              {connected ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--green)', background: 'var(--surface-3)', padding: '4px 10px', borderRadius: 20 }}>
                  <CheckCircle2 size={14} /> Available
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: 'var(--text-3)', background: 'var(--surface-3)', padding: '4px 10px', borderRadius: 20 }}>
                  <XCircle size={14} /> Connect to use
                </span>
              )}
            </div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 16, color: 'var(--text)' }}>Gmail</h4>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5 }}>
              Read, send, and organize emails without leaving the app.
            </p>
          </div>

          {/* Chat Card */}
          <div style={{ 
            background: 'var(--surface-2)', 
            borderRadius: 12, 
            padding: 24, 
            border: '1px solid var(--border)',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: 'var(--surface-3)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <MessageSquare size={24} color="var(--amber)" />
              </div>
              {connected ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 600, color: 'var(--green)', background: 'var(--surface-3)', padding: '4px 10px', borderRadius: 20 }}>
                  <CheckCircle2 size={14} /> Available
                </span>
              ) : (
                <span style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, fontWeight: 500, color: 'var(--text-3)', background: 'var(--surface-3)', padding: '4px 10px', borderRadius: 20 }}>
                  <XCircle size={14} /> Connect to use
                </span>
              )}
            </div>
            <h4 style={{ margin: '0 0 8px 0', fontSize: 16, color: 'var(--text)' }}>Google Chat</h4>
            <p style={{ margin: 0, fontSize: 14, color: 'var(--text-2)', lineHeight: 1.5 }}>
              Collaborate and message your team directly.
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
