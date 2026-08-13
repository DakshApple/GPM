import React, { useState, useEffect, useCallback } from 'react';
import { Topbar } from '../components/layout';
import { getGoogleToken, gmailAPI } from '../services/google';
import { Mail, Inbox, Star, Send, FileText, Tag, RefreshCw, ChevronLeft, ChevronRight, Clock, Paperclip, ArrowLeft } from 'lucide-react';

function formatDate(dateStr) {
  if (!dateStr) return '';
  const date = new Date(dateStr);
  const now = new Date();
  
  const isToday = date.getDate() === now.getDate() && date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  
  const yesterday = new Date(now);
  yesterday.setDate(now.getDate() - 1);
  const isYesterday = date.getDate() === yesterday.getDate() && date.getMonth() === yesterday.getMonth() && date.getFullYear() === yesterday.getFullYear();
  
  if (isToday) {
    return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  } else if (isYesterday) {
    return 'Yesterday';
  } else if (date.getFullYear() === now.getFullYear()) {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  } else {
    return date.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
  }
}

function parseFrom(fromStr) {
  if (!fromStr) return '';
  const match = fromStr.match(/^(.*?)\s*<.*>$/);
  return match ? match[1].replace(/^"|"$/g, '').trim() : fromStr;
}

const LABEL_ICONS = {
  INBOX: Inbox,
  STARRED: Star,
  SENT: Send,
  DRAFT: FileText,
  IMPORTANT: Tag,
};

function EmailBody({ message }) {
  const body = gmailAPI.getBody(message);
  
  if (body.html) {
    return (
      <div style={{ backgroundColor: 'white', padding: 24, borderRadius: 8, border: '1px solid var(--border)', overflowX: 'auto', minHeight: 300 }}>
        <iframe 
          srcDoc={body.html}
          style={{ width: '100%', height: '500px', border: 'none' }}
          sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin"
        />
      </div>
    );
  }
  
  return (
    <div style={{ backgroundColor: 'var(--surface)', padding: 24, borderRadius: 8, border: '1px solid var(--border)', color: 'var(--text)', whiteSpace: 'pre-wrap', fontFamily: 'monospace', overflowX: 'auto' }}>
      {body.text || 'No content'}
    </div>
  );
}

export function GmailView({ account }) {
  const [token, setToken] = useState(null);
  const [labels, setLabels] = useState([]);
  const [activeLabel, setActiveLabel] = useState('INBOX');
  const [messages, setMessages] = useState([]);
  const [selectedMessage, setSelectedMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState(false);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const tokenData = getGoogleToken(account?.id);
    setToken(tokenData?.accessToken || null);
  }, [account]);

  const loadLabels = useCallback(async (t) => {
    try {
      const labelsArr = await gmailAPI.getLabels(t);
      if (Array.isArray(labelsArr)) {
        setLabels(labelsArr);
      }
    } catch (e) {
      console.error('Failed to load labels:', e);
    }
  }, []);

  const loadMessages = useCallback(async (t, labelId, pageToken = null, append = false) => {
    setLoading(true);
    setError(null);
    try {
      const res = await gmailAPI.listMessages(t, labelId, pageToken);
      if (res && res.messages) {
        const msgList = res.messages.slice(0, 20); // Process first 20 in the page
        const detailsPromises = msgList.map(m => gmailAPI.getMessage(t, m.id));
        const fullMessages = await Promise.all(detailsPromises);
        
        const formatted = fullMessages.map(m => ({
          ...gmailAPI.formatMessage(m),
          _raw: m // Keep the original message for getBody
        }));
        setMessages(prev => append ? [...prev, ...formatted] : formatted);
        setNextPageToken(res.nextPageToken || null);
      } else {
        setMessages(prev => append ? prev : []);
        setNextPageToken(null);
      }
    } catch (e) {
      console.error('Failed to load messages:', e);
      setError('Failed to load messages. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (token) {
      loadLabels(token);
      loadMessages(token, activeLabel);
    }
  }, [token, activeLabel, loadLabels, loadMessages]);

  const handleLabelClick = (labelId) => {
    if (labelId !== activeLabel) {
      setActiveLabel(labelId);
      setSelectedMessage(null);
    }
  };

  const handleMessageClick = (msg) => {
    setSelectedMessage(msg);
  };

  const handleLoadMore = () => {
    if (token && nextPageToken) {
      loadMessages(token, activeLabel, nextPageToken, true);
    }
  };

  if (!token) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <Topbar title="Gmail" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <Mail size={48} style={{ color: 'var(--text-3)', marginBottom: 16, marginInline: 'auto' }} />
            <h2 className="font-display" style={{ color: 'var(--text)', marginBottom: 8 }}>Not Connected</h2>
            <p style={{ color: 'var(--text-2)' }}>Connect Google in Integrations to view your inbox.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
      <Topbar title="Gmail" />
      
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Sidebar */}
        <div style={{ width: 200, borderRight: '1px solid var(--border)', overflowY: 'auto', padding: 12, display: 'flex', flexDirection: 'column', gap: 4 }}>
          {labels.filter(l => ['INBOX', 'STARRED', 'SENT', 'DRAFT', 'IMPORTANT'].includes(l.id) || l.type === 'user').map(label => {
            const Icon = LABEL_ICONS[label.id] || Mail;
            const isActive = activeLabel === label.id;
            return (
              <div
                key={label.id}
                onClick={() => handleLabelClick(label.id)}
                style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '8px 12px', borderRadius: 6, cursor: 'pointer',
                  backgroundColor: isActive ? 'var(--surface-2)' : 'transparent',
                  color: isActive ? 'var(--text)' : 'var(--text-2)',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'var(--surface)'; }}
                onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.backgroundColor = 'transparent'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <Icon size={16} />
                  <span style={{ fontSize: 14, fontWeight: isActive ? 500 : 400 }}>{label.name}</span>
                </div>
                {label.messagesUnread > 0 && (
                  <span style={{ fontSize: 12, fontWeight: 600, backgroundColor: 'var(--surface-3)', padding: '2px 6px', borderRadius: 10, color: 'var(--text)' }}>
                    {label.messagesUnread}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        {/* Center/Right Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--bg)' }}>
          {error ? (
            <div style={{ padding: 24, textAlign: 'center' }}>
              <p style={{ color: 'var(--red)', marginBottom: 12 }}>{error}</p>
              <button className="btn btn-primary" onClick={() => loadMessages(token, activeLabel)}>Retry</button>
            </div>
          ) : selectedMessage ? (
            // Detail View
            <div className="fade-in" style={{ flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 16 }}>
                <button className="btn btn-ghost" style={{ padding: 8 }} onClick={() => setSelectedMessage(null)}>
                  <ArrowLeft size={20} />
                </button>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h2 className="font-display" style={{ margin: 0, fontSize: 20, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {selectedMessage.subject || '(No Subject)'}
                  </h2>
                </div>
              </div>
              <div style={{ padding: 24, flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 16 }}>{parseFrom(selectedMessage.from)}</div>
                    <div style={{ color: 'var(--text-3)', fontSize: 13, marginTop: 2 }}>{selectedMessage.from}</div>
                    <div style={{ color: 'var(--text-2)', fontSize: 13, marginTop: 4 }}>To: {selectedMessage.to || 'me'}</div>
                    {selectedMessage.cc && <div style={{ color: 'var(--text-3)', fontSize: 12, marginTop: 2 }}>Cc: {selectedMessage.cc}</div>}
                  </div>
                  <div style={{ color: 'var(--text-2)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
                    <Clock size={14} />
                    {formatDate(selectedMessage.date)}
                  </div>
                </div>
                <EmailBody message={selectedMessage._raw} />
              </div>
            </div>
          ) : (
            // List View
            <div className="fade-in" style={{ flex: 1, overflowY: 'auto' }}>
              {loading && messages.length === 0 ? (
                <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 12 }}>
                  {[1, 2, 3, 4, 5].map(i => (
                    <div key={i} style={{ height: 48, backgroundColor: 'var(--surface)', borderRadius: 6, opacity: 0.5, animation: 'pulse 1.5s infinite' }} />
                  ))}
                </div>
              ) : messages.length === 0 ? (
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 48, color: 'var(--text-3)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <Inbox size={48} style={{ marginInline: 'auto', marginBottom: 16, opacity: 0.5 }} />
                    <p>No emails in this label</p>
                  </div>
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  {messages.map((msg, i) => (
                    <div
                      key={msg.id || i}
                      onClick={() => handleMessageClick(msg)}
                      style={{
                        display: 'flex', alignItems: 'center', padding: '12px 24px',
                        borderBottom: '1px solid var(--border)', cursor: 'pointer',
                        backgroundColor: msg.isUnread ? 'var(--surface)' : 'var(--bg)',
                        gap: 16, transition: 'background-color 0.2s'
                      }}
                      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--surface-2)'}
                      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = msg.isUnread ? 'var(--surface)' : 'var(--bg)'}
                    >
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 200, flexShrink: 0 }}>
                        <div style={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: msg.isUnread ? 'var(--blue)' : 'transparent', flexShrink: 0 }} />
                        <Star size={18} style={{ color: msg.isStarred ? 'var(--amber)' : 'var(--border-strong)', fill: msg.isStarred ? 'var(--amber)' : 'none' }} />
                        <span style={{ fontWeight: msg.isUnread ? 600 : 400, color: 'var(--text)', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {parseFrom(msg.from)}
                        </span>
                      </div>
                      <div style={{ flex: 1, display: 'flex', alignItems: 'center', minWidth: 0, overflow: 'hidden' }}>
                        <span style={{ fontWeight: msg.isUnread ? 600 : 400, color: 'var(--text)', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                          {msg.subject || '(No Subject)'}
                          <span style={{ fontWeight: 400, color: 'var(--text-3)', marginLeft: 8 }}>
                            - {msg.snippet}
                          </span>
                        </span>
                      </div>
                      <div style={{ color: msg.isUnread ? 'var(--text)' : 'var(--text-3)', fontSize: 12, fontWeight: msg.isUnread ? 600 : 400, whiteSpace: 'nowrap', flexShrink: 0, width: 80, textAlign: 'right' }}>
                        {formatDate(msg.date)}
                      </div>
                    </div>
                  ))}
                  
                  {nextPageToken && (
                    <div style={{ padding: 24, textAlign: 'center' }}>
                      <button 
                        className="btn btn-secondary" 
                        onClick={handleLoadMore}
                        disabled={loading}
                      >
                        {loading ? 'Loading...' : 'Load more'}
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
