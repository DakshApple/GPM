import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Topbar } from '../components/layout';
import { getGoogleToken, chatAPI } from '../services/google';
import { MessageSquare, Send, Users, Hash, RefreshCw, Search, Smile, Plus, ChevronLeft, User } from 'lucide-react';

export function GoogleChatView({ account }) {
  const [token, setToken] = useState(null);
  const [googleUser, setGoogleUser] = useState(null);
  const [spaces, setSpaces] = useState([]);
  const [filteredSpaces, setFilteredSpaces] = useState([]);
  const [selectedSpace, setSelectedSpace] = useState(null);
  const [messages, setMessages] = useState([]);
  const [members, setMembers] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showMembers, setShowMembers] = useState(false);
  const [error, setError] = useState(null);
  const [debugLog, setDebugLog] = useState('');
  const [userCache, setUserCache] = useState({});

  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    const loadToken = () => {
      const tokenData = getGoogleToken(account.id);
      if (tokenData?.accessToken) {
        setToken(tokenData.accessToken);
        setGoogleUser(tokenData);
      } else {
        setLoading(false);
        setError("Connect Google in Integrations to view chat.");
      }
    };
    loadToken();
  }, [account.id]);

  useEffect(() => {
    if (!token) return;

    const loadSpaces = async () => {
      setLoading(true);
      setError(null);
      try {
        const response = await chatAPI.listSpaces(token);
        if (response && Array.isArray(response)) {
          setSpaces(response);
          setFilteredSpaces(response);
        } else if (response && response.spaces) {
          setSpaces(response.spaces);
          setFilteredSpaces(response.spaces);
        } else {
          setSpaces([]);
          setFilteredSpaces([]);
        }
      } catch (err) {
        console.error("Failed to load spaces", err);
        setError("Failed to load spaces. Chat API might not be available for this account.");
      } finally {
        setLoading(false);
      }
    };

    loadSpaces();
  }, [token]);

  const loadMessages = useCallback(async (spaceName, showLoading = true) => {
    if (!token || !spaceName) return;
    
    if (showLoading) setLoadingMessages(true);
    try {
      const response = await chatAPI.listMessages(token, spaceName);
      if (response && response.messages) {
        setMessages(response.messages);
      } else {
        setMessages([]);
      }
    } catch (err) {
      console.error("Failed to load messages", err);
      if (showLoading) {
         setMessages([]);
      }
    } finally {
      if (showLoading) setLoadingMessages(false);
    }
  }, [token]);

  const loadMembers = useCallback(async (spaceName) => {
    if (!token || !spaceName) return;
    try {
      const response = await chatAPI.getMembers(token, spaceName);
      if (response && Array.isArray(response)) {
        setMembers(response);
        setDebugLog(prev => prev + `\nLoaded ${response.length} members for ${spaceName}`);
      } else if (response && response.memberships) {
        setMembers(response.memberships);
        setDebugLog(prev => prev + `\nLoaded ${response.memberships.length} members for ${spaceName}`);
      } else {
        setMembers([]);
        setDebugLog(prev => prev + `\nNo members array in response for ${spaceName}`);
      }
    } catch (err) {
      console.error("Failed to load members", err);
      setDebugLog(prev => prev + `\nError loading members: ${err.message}`);
      setMembers([]);
    }
  }, [token]);

  useEffect(() => {
    if (selectedSpace) {
      loadMessages(selectedSpace.name);
      loadMembers(selectedSpace.name);
    } else {
      setMessages([]);
      setMembers([]);
    }
  }, [selectedSpace, loadMessages, loadMembers]);

  // Fetch missing user display names in the background
  useEffect(() => {
    if (!token) return;
    const fetchMissing = async () => {
      const missingIds = new Set();
      
      // Check members
      members.forEach(m => {
        if (m.member?.name && !m.member?.displayName && !userCache[m.member.name]) {
          missingIds.add(m.member.name);
        }
      });
      
      // Check messages
      messages.forEach(msg => {
        if (msg.sender?.name && !msg.sender?.displayName && !userCache[msg.sender.name]) {
          const match = members.find(m => m.member?.name === msg.sender.name);
          if (!match?.member?.displayName) {
             missingIds.add(msg.sender.name);
          }
        }
      });
      
      if (missingIds.size > 0) {
        for (const id of missingIds) {
          try {
            // Optimistically set to prevent refetching
            setUserCache(prev => ({ ...prev, [id]: { name: id } }));
            
            let resolvedName = null;
            
            // Fallback to People API
            if (!resolvedName) {
              try {
                 const accountId = id.replace('users/', '');
                 // Note: this requires userinfo.profile or contacts.readonly scope, which we may or may not have.
                 // We wrap it in a try-catch so it fails gracefully.
                 const url = `https://people.googleapis.com/v1/people/${accountId}?personFields=names`;
                 const fetchRes = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
                 if (fetchRes.ok) {
                   const data = await fetchRes.json();
                   if (data.names && data.names.length > 0) {
                     resolvedName = data.names[0].displayName;
                   }
                 }
              } catch (err) {
                 console.warn('People API fallback failed for', id, err);
                 setDebugLog(prev => prev + `\nPeople API failed: ${err.message}`);
              }
            }

            if (resolvedName) {
              setUserCache(prev => ({ ...prev, [id]: { name: id, displayName: resolvedName } }));
            }
          } catch (e) {
            console.error('Failed to fetch user', id, e);
          }
        }
      }
    };
    
    fetchMissing();
  }, [members, messages, token, userCache]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    let interval;
    if (selectedSpace && token) {
      interval = setInterval(() => {
        loadMessages(selectedSpace.name, false);
      }, 10000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [selectedSpace, token, loadMessages]);

  useEffect(() => {
    if (!searchQuery) {
      setFilteredSpaces(spaces);
      return;
    }
    const query = searchQuery.toLowerCase();
    const filtered = spaces.filter(space => 
      (space.displayName || '').toLowerCase().includes(query)
    );
    setFilteredSpaces(filtered);
  }, [searchQuery, spaces]);

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !selectedSpace || !token) return;
    
    const text = newMessage;
    setNewMessage('');
    
    // Optimistic UI could be added here
    try {
      await chatAPI.sendMessage(token, selectedSpace.name, text);
      await loadMessages(selectedSpace.name, false);
    } catch (err) {
      console.error("Failed to send message", err);
      alert("Failed to send message: " + err.message);
      // Restore the message text if failed
      setNewMessage(text);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const getSpaceIcon = (type) => {
    switch (type) {
      case 'SPACE': return <Hash size={18} />;
      case 'DIRECT_MESSAGE': return <User size={18} />;
      case 'GROUP_CHAT': return <Users size={18} />;
      default: return <MessageSquare size={18} />;
    }
  };

  const formatTime = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    const now = new Date();
    
    const isToday = date.getDate() === now.getDate() && 
                    date.getMonth() === now.getMonth() && 
                    date.getFullYear() === now.getFullYear();
    
    const yesterday = new Date(now);
    yesterday.setDate(now.getDate() - 1);
    const isYesterday = date.getDate() === yesterday.getDate() && 
                        date.getMonth() === yesterday.getMonth() && 
                        date.getFullYear() === yesterday.getFullYear();
                        
    const timeOptions = { hour: 'numeric', minute: '2-digit' };
    const timeStr = date.toLocaleTimeString([], timeOptions);
    
    if (isToday) return timeStr;
    if (isYesterday) return `Yesterday ${timeStr}`;
    
    return `${date.toLocaleDateString([], { month: 'short', day: 'numeric' })}, ${timeStr}`;
  };

  const getAvatarColor = (name) => {
    if (!name) return 'var(--blue)';
    const colors = ['var(--blue)', 'var(--green)', 'var(--amber)', 'var(--red)', '#8b5cf6', '#ec4899'];
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    return colors[Math.abs(hash) % colors.length];
  };

  const getSenderName = (sender) => {
    if (sender?.displayName) return sender.displayName;
    if (sender?.name) {
      if (userCache[sender.name]?.displayName) return userCache[sender.name].displayName;
      
      const memberMatch = members.find(m => m.member?.name === sender.name);
      if (memberMatch?.member?.displayName) return memberMatch.member.displayName;
    }
    return sender?.name || 'Unknown User';
  };

  const isCurrentUser = (sender) => {
    if (!sender) return false;
    if (sender.type === 'BOT') return false;
    
    // Resolve the name (either from sender object or members list)
    const resolvedName = getSenderName(sender);
    
    // Match against the connected Google user's name
    if (googleUser?.name && resolvedName === googleUser.name) return true;
    return false;
  };

  if (!token) {
    return (
      <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
        <Topbar title="Google Chat" icon={<MessageSquare size={18} />} />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16 }}>
          <MessageSquare size={48} style={{ color: 'var(--text-3)' }} />
          <div style={{ color: 'var(--text-2)' }} className="font-display">
            {error || "Loading..."}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden" }}>
      <Topbar title="Google Chat" icon={<MessageSquare size={18} />} />
      
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        {/* Left Sidebar */}
        <div style={{ width: 260, borderRight: '1px solid var(--border)', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--surface)' }}>
          <div style={{ padding: 16, borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'flex', alignItems: 'center', backgroundColor: 'var(--surface-2)', padding: '8px 12px', borderRadius: 8, gap: 8 }}>
              <Search size={16} style={{ color: 'var(--text-3)' }} />
              <input
                type="text"
                placeholder="Find a space..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ border: 'none', background: 'transparent', outline: 'none', color: 'var(--text)', width: '100%' }}
              />
            </div>
          </div>
          
          <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
            {loading && !spaces.length ? (
              <div style={{ padding: 16, textAlign: 'center', color: 'var(--text-3)' }}>Loading spaces...</div>
            ) : error ? (
              <div style={{ padding: 16, color: 'var(--red)', fontSize: 14 }}>{error}</div>
            ) : filteredSpaces.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 12 }}>
                <MessageSquare size={32} opacity={0.5} />
                <div>No spaces found</div>
              </div>
            ) : (
              filteredSpaces.map(space => (
                <div
                  key={space.name}
                  onClick={() => setSelectedSpace(space)}
                  style={{
                    padding: '10px 12px',
                    borderRadius: 8,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    marginBottom: 4,
                    backgroundColor: selectedSpace?.name === space.name ? 'var(--surface-3)' : 'transparent',
                    color: selectedSpace?.name === space.name ? 'var(--text)' : 'var(--text-2)',
                    transition: 'background-color 0.15s ease'
                  }}
                  onMouseOver={(e) => {
                    if (selectedSpace?.name !== space.name) {
                      e.currentTarget.style.backgroundColor = 'var(--surface-2)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (selectedSpace?.name !== space.name) {
                      e.currentTarget.style.backgroundColor = 'transparent';
                    }
                  }}
                >
                  <div style={{ color: 'var(--text-3)' }}>
                    {getSpaceIcon(space.spaceType)}
                  </div>
                  <div style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: selectedSpace?.name === space.name ? 500 : 400 }}>
                    {space.displayName || (space.spaceType === 'DIRECT_MESSAGE' ? 'Direct Message' : 'Group Chat')}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Center Panel */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--bg)' }}>
          {selectedSpace ? (
            <>
              {/* Header */}
              <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'var(--surface)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ color: 'var(--text-3)' }}>
                     {getSpaceIcon(selectedSpace.spaceType)}
                  </div>
                  <div>
                    <h3 className="font-display" style={{ margin: 0, fontSize: 16 }}>
                      {selectedSpace.displayName || (selectedSpace.spaceType === 'DIRECT_MESSAGE' ? 'Direct Message' : 'Group Chat')}
                    </h3>
                    <div style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span>{members.length} member{members.length !== 1 ? 's' : ''}</span>
                      {debugLog && <span style={{ color: 'var(--red)', fontSize: 10, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={debugLog}>(Hover for debug logs)</span>}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <button 
                    className="btn btn-ghost" 
                    onClick={() => loadMessages(selectedSpace.name)}
                    style={{ padding: 8 }}
                    title="Refresh messages"
                  >
                    <RefreshCw size={16} />
                  </button>
                  <button 
                    className="btn btn-ghost" 
                    onClick={() => setShowMembers(!showMembers)}
                    style={{ padding: 8, backgroundColor: showMembers ? 'var(--surface-3)' : 'transparent' }}
                    title="Toggle members"
                  >
                    <Users size={16} />
                  </button>
                </div>
              </div>

              {/* Messages Area */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 24, display: 'flex', flexDirection: 'column', gap: 16 }}>
                {loadingMessages && messages.length === 0 ? (
                  <div style={{ margin: 'auto', color: 'var(--text-3)' }}>Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div style={{ margin: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, color: 'var(--text-3)' }}>
                    <MessageSquare size={48} opacity={0.2} />
                    <div>No messages yet. Start the conversation!</div>
                  </div>
                ) : (
                  [...messages].reverse().map((msg, index, arr) => {
                    const senderName = getSenderName(msg.sender);
                    const isSelf = isCurrentUser(msg.sender);
                    const prevMsg = index > 0 ? arr[index - 1] : null;
                    const isSameSenderAsPrev = prevMsg && getSenderName(prevMsg.sender) === senderName;
                    
                    return (
                      <div key={msg.name || index} style={{ display: 'flex', flexDirection: 'column', alignItems: isSelf ? 'flex-end' : 'flex-start', marginTop: isSameSenderAsPrev ? -8 : 0 }}>
                        {!isSameSenderAsPrev && (
                           <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4, flexDirection: isSelf ? 'row-reverse' : 'row' }}>
                              <div style={{ 
                                width: 24, height: 24, borderRadius: '50%', 
                                backgroundColor: getAvatarColor(senderName), 
                                color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                                fontSize: 12, fontWeight: 'bold' 
                              }}>
                                {senderName.charAt(0).toUpperCase()}
                              </div>
                              <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-2)' }}>{isSelf ? 'You' : senderName}</span>
                              <span style={{ fontSize: 11, color: 'var(--text-3)' }}>{formatTime(msg.createTime)}</span>
                           </div>
                        )}
                        <div style={{ 
                          padding: '10px 14px', 
                          borderRadius: 12, 
                          backgroundColor: isSelf ? 'rgba(59, 130, 246, 0.1)' : 'var(--surface-2)',
                          color: isSelf ? 'var(--blue)' : 'var(--text)',
                          maxWidth: '75%',
                          borderTopLeftRadius: !isSelf && !isSameSenderAsPrev ? 4 : 12,
                          borderTopRightRadius: isSelf && !isSameSenderAsPrev ? 4 : 12,
                          marginLeft: !isSelf ? 32 : 0,
                          marginRight: isSelf ? 0 : 0,
                          lineHeight: 1.5,
                          wordBreak: 'break-word'
                        }}>
                          {msg.text}
                        </div>
                      </div>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input Area */}
              <div style={{ padding: 24, borderTop: '1px solid var(--border)', backgroundColor: 'var(--surface)' }}>
                <div style={{ 
                  display: 'flex', alignItems: 'flex-end', 
                  backgroundColor: 'var(--surface-2)', 
                  borderRadius: 24, padding: '8px 16px', gap: 12,
                  border: '1px solid var(--border)'
                }}>
                  <button className="btn btn-ghost" style={{ padding: 4, color: 'var(--text-3)' }}><Plus size={20} /></button>
                  <textarea
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Message..."
                    style={{ 
                      flex: 1, 
                      border: 'none', 
                      background: 'transparent', 
                      outline: 'none', 
                      color: 'var(--text)',
                      resize: 'none',
                      maxHeight: 150,
                      minHeight: 24,
                      padding: '8px 0',
                      lineHeight: 1.5
                    }}
                    rows={1}
                    onInput={(e) => {
                      e.target.style.height = 'auto';
                      e.target.style.height = Math.min(e.target.scrollHeight, 150) + 'px';
                    }}
                  />
                  <button className="btn btn-ghost" style={{ padding: 4, color: 'var(--text-3)' }}><Smile size={20} /></button>
                  <button 
                    className="btn btn-primary" 
                    onClick={handleSendMessage}
                    disabled={!newMessage.trim()}
                    style={{ 
                      padding: 8, 
                      borderRadius: '50%', 
                      opacity: !newMessage.trim() ? 0.5 : 1 
                    }}
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 16, color: 'var(--text-3)' }}>
              <MessageSquare size={64} opacity={0.2} />
              <div className="font-display" style={{ fontSize: 18 }}>Select a space to start chatting</div>
            </div>
          )}
        </div>

        {/* Right Sidebar (Members) */}
        {selectedSpace && showMembers && (
          <div className="fade-in" style={{ width: 200, borderLeft: '1px solid var(--border)', display: 'flex', flexDirection: 'column', backgroundColor: 'var(--surface)' }}>
            <div style={{ padding: '16px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <h3 className="font-display" style={{ margin: 0, fontSize: 14 }}>Members</h3>
              <div style={{ fontSize: 12, color: 'var(--text-3)', backgroundColor: 'var(--surface-3)', padding: '2px 8px', borderRadius: 12 }}>
                {members.length}
              </div>
            </div>
            <div style={{ flex: 1, overflowY: 'auto', padding: 12 }}>
              {members.length === 0 ? (
                <div style={{ textAlign: 'center', color: 'var(--text-3)', fontSize: 13, marginTop: 16 }}>No members found</div>
              ) : (
                members.map((member, idx) => {
                  const memberName = getSenderName(member.member);
                  return (
                    <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '8px', borderRadius: 8, marginBottom: 4 }}>
                      <div style={{ 
                        width: 28, height: 28, borderRadius: '50%', 
                        backgroundColor: getAvatarColor(memberName), 
                        color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center', 
                        fontSize: 12, fontWeight: 'bold' 
                      }}>
                        {memberName.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {memberName}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
