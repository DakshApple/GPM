/**
 * Google Workspace Integration Service
 * Client-side only — uses Google Identity Services (GIS) + REST APIs
 * Each user connects their own Google account via OAuth2 token flow
 */

const CLIENT_ID = '501476442623-0b30ofauqsbft0btnkoecmulpbpfeteo.apps.googleusercontent.com';
const SCOPES = [
  'https://www.googleapis.com/auth/drive',
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/chat.spaces.readonly',
  'https://www.googleapis.com/auth/chat.messages',
  'https://www.googleapis.com/auth/chat.memberships.readonly',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');

// ─── Token Management ────────────────────────────────────────────────
function storageKey(accountId) { return `gpm:google:${accountId}`; }

export function getGoogleToken(accountId) {
  try {
    const raw = localStorage.getItem(storageKey(accountId));
    if (!raw) return null;
    const data = JSON.parse(raw);
    // Check expiry — tokens last ~3600s
    if (data.expiresAt && Date.now() > data.expiresAt) {
      return { ...data, expired: true };
    }
    return data;
  } catch { return null; }
}

function saveToken(accountId, tokenResponse) {
  const data = {
    accessToken: tokenResponse.access_token,
    expiresAt: Date.now() + (tokenResponse.expires_in * 1000) - 60000, // 1min buffer
    scope: tokenResponse.scope,
    tokenType: tokenResponse.token_type,
    connectedAt: Date.now(),
  };
  localStorage.setItem(storageKey(accountId), JSON.stringify(data));
  return data;
}

export function clearGoogleToken(accountId) {
  const token = getGoogleToken(accountId);
  if (token?.accessToken) {
    // Revoke on Google's side
    try { 
      window.google?.accounts?.oauth2?.revoke?.(token.accessToken); 
    } catch { /* ignore */ }
  }
  localStorage.removeItem(storageKey(accountId));
}

export function isGoogleConnected(accountId) {
  const token = getGoogleToken(accountId);
  return token && !token.expired;
}

// ─── OAuth2 Flow ─────────────────────────────────────────────────────
let _tokenClient = null;
let _pendingResolve = null;
let _pendingReject = null;

function getTokenClient() {
  if (_tokenClient) return _tokenClient;
  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services not loaded yet. Please refresh the page.');
  }
  _tokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: CLIENT_ID,
    scope: SCOPES,
    callback: (response) => {
      if (response.error) {
        _pendingReject?.(new Error(response.error_description || response.error));
      } else {
        _pendingResolve?.(response);
      }
    },
    error_callback: (err) => {
      _pendingReject?.(new Error(err.message || 'OAuth popup was closed'));
    },
  });
  return _tokenClient;
}

export function connectGoogle(accountId) {
  return new Promise((resolve, reject) => {
    try {
      const client = getTokenClient();
      _pendingResolve = (response) => {
        const tokenData = saveToken(accountId, response);
        // Fetch the user's Google email
        fetchAPI(tokenData.accessToken, 'https://www.googleapis.com/oauth2/v2/userinfo')
          .then(info => {
            const updated = { ...tokenData, email: info.email, name: info.name, picture: info.picture };
            localStorage.setItem(storageKey(accountId), JSON.stringify(updated));
            resolve(updated);
          })
          .catch(() => resolve(tokenData));
      };
      _pendingReject = reject;
      client.requestAccessToken({ prompt: 'consent' });
    } catch (err) {
      reject(err);
    }
  });
}

export function refreshGoogle(accountId) {
  return new Promise((resolve, reject) => {
    try {
      const client = getTokenClient();
      _pendingResolve = (response) => {
        const tokenData = saveToken(accountId, response);
        // Preserve existing email/name/picture
        const existing = getGoogleToken(accountId);
        if (existing?.email) {
          const updated = { ...tokenData, email: existing.email, name: existing.name, picture: existing.picture };
          localStorage.setItem(storageKey(accountId), JSON.stringify(updated));
          resolve(updated);
        } else {
          resolve(tokenData);
        }
      };
      _pendingReject = reject;
      client.requestAccessToken({ prompt: '' }); // Silent refresh
    } catch (err) {
      reject(err);
    }
  });
}

// ─── API Helper ──────────────────────────────────────────────────────
async function fetchAPI(token, url, options = {}) {
  const res = await fetch(url, {
    ...options,
    headers: {
      'Authorization': `Bearer ${token}`,
      ...options.headers,
    },
  });
  if (res.status === 401) {
    throw new Error('TOKEN_EXPIRED');
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error?.message || `API error: ${res.status}`);
  }
  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    return res.json();
  }
  return res;
}

// ─── Google Drive API ────────────────────────────────────────────────
export const driveAPI = {
  async listFiles(token, folderId = 'root', pageToken = null) {
    let url = `https://www.googleapis.com/drive/v3/files?q='${encodeURIComponent(folderId)}'+in+parents+and+trashed=false&fields=nextPageToken,files(id,name,mimeType,size,modifiedTime,iconLink,thumbnailLink,webViewLink,webContentLink,parents,starred)&orderBy=folder,name&pageSize=50`;
    if (pageToken) url += `&pageToken=${pageToken}`;
    return fetchAPI(token, url);
  },

  async searchFiles(token, query) {
    const q = encodeURIComponent(query.replace(/'/g, "\\'"));
    const url = `https://www.googleapis.com/drive/v3/files?q=name+contains+'${q}'+and+trashed=false&fields=files(id,name,mimeType,size,modifiedTime,iconLink,thumbnailLink,webViewLink,webContentLink,parents,starred)&orderBy=modifiedTime+desc&pageSize=30`;
    return fetchAPI(token, url);
  },

  async getFile(token, fileId) {
    return fetchAPI(token, `https://www.googleapis.com/drive/v3/files/${fileId}?fields=id,name,mimeType,size,modifiedTime,iconLink,thumbnailLink,webViewLink,webContentLink,parents,starred,description`);
  },

  async createFolder(token, name, parentId = 'root') {
    return fetchAPI(token, 'https://www.googleapis.com/drive/v3/files', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name,
        mimeType: 'application/vnd.google-apps.folder',
        parents: [parentId],
      }),
    });
  },

  async uploadFile(token, file, parentId = 'root') {
    // Use multipart upload for files up to 5MB, resumable for larger
    const metadata = {
      name: file.name,
      parents: [parentId],
    };
    const form = new FormData();
    form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
    form.append('file', file);

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,mimeType,size,modifiedTime,iconLink,thumbnailLink,webViewLink,webContentLink,parents', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${token}` },
      body: form,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error?.message || `Upload failed: ${res.status}`);
    }
    return res.json();
  },

  async deleteFile(token, fileId) {
    // Move to trash (soft delete)
    return fetchAPI(token, `https://www.googleapis.com/drive/v3/files/${fileId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ trashed: true }),
    });
  },

  async getStorageQuota(token) {
    const res = await fetchAPI(token, 'https://www.googleapis.com/drive/v3/about?fields=storageQuota,user');
    return res;
  },

  async downloadFile(token, fileId) {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });
    if (!res.ok) throw new Error(`Download failed: ${res.status}`);
    return res.blob();
  },
};

// ─── Gmail API ───────────────────────────────────────────────────────
export const gmailAPI = {
  async getProfile(token) {
    return fetchAPI(token, 'https://www.googleapis.com/gmail/v1/users/me/profile');
  },

  async getLabels(token) {
    const res = await fetchAPI(token, 'https://www.googleapis.com/gmail/v1/users/me/labels');
    return res.labels || [];
  },

  async listMessages(token, labelId = 'INBOX', pageToken = null, maxResults = 20) {
    let url = `https://www.googleapis.com/gmail/v1/users/me/messages?labelIds=${labelId}&maxResults=${maxResults}`;
    if (pageToken) url += `&pageToken=${pageToken}`;
    return fetchAPI(token, url);
  },

  async getMessage(token, messageId) {
    return fetchAPI(token, `https://www.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`);
  },

  async getThread(token, threadId) {
    return fetchAPI(token, `https://www.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`);
  },

  // Parse email headers into readable format
  parseHeaders(message) {
    const headers = message.payload?.headers || [];
    const get = (name) => headers.find(h => h.name.toLowerCase() === name.toLowerCase())?.value || '';
    return {
      from: get('From'),
      to: get('To'),
      subject: get('Subject'),
      date: get('Date'),
      cc: get('Cc'),
      replyTo: get('Reply-To'),
    };
  },

  // Get email body (text or HTML)
  getBody(message) {
    const payload = message.payload;
    if (!payload) return { text: '', html: '' };

    // Simple single-part message
    if (payload.body?.data) {
      const decoded = atob(payload.body.data.replace(/-/g, '+').replace(/_/g, '/'));
      if (payload.mimeType === 'text/html') return { text: '', html: decoded };
      return { text: decoded, html: '' };
    }

    // Multipart message
    let text = '';
    let html = '';
    const extractParts = (parts) => {
      if (!parts) return;
      for (const part of parts) {
        if (part.mimeType === 'text/plain' && part.body?.data) {
          text = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        } else if (part.mimeType === 'text/html' && part.body?.data) {
          html = atob(part.body.data.replace(/-/g, '+').replace(/_/g, '/'));
        } else if (part.parts) {
          extractParts(part.parts);
        }
      }
    };
    extractParts(payload.parts);
    return { text, html };
  },

  // Extract snippet-friendly data from raw message
  formatMessage(message) {
    const h = this.parseHeaders(message);
    const labelIds = message.labelIds || [];
    return {
      id: message.id,
      threadId: message.threadId,
      snippet: message.snippet || '',
      from: h.from,
      to: h.to,
      subject: h.subject,
      date: h.date,
      cc: h.cc,
      isUnread: labelIds.includes('UNREAD'),
      isStarred: labelIds.includes('STARRED'),
      isImportant: labelIds.includes('IMPORTANT'),
      labelIds,
    };
  },
};

// ─── Google Chat API ─────────────────────────────────────────────────
export const chatAPI = {
  async listSpaces(token) {
    const res = await fetchAPI(token, 'https://chat.googleapis.com/v1/spaces?filter=spaceType%20%3D%20%22SPACE%22%20OR%20spaceType%20%3D%20%22GROUP_CHAT%22%20OR%20spaceType%20%3D%20%22DIRECT_MESSAGE%22');
    return res.spaces || [];
  },

  async listMessages(token, spaceName, pageSize = 25, pageToken = null) {
    let url = `https://chat.googleapis.com/v1/${spaceName}/messages?pageSize=${pageSize}&orderBy=createTime%20desc`;
    if (pageToken) url += `&pageToken=${pageToken}`;
    return fetchAPI(token, url);
  },

  async sendMessage(token, spaceName, text) {
    return fetchAPI(token, `https://chat.googleapis.com/v1/${spaceName}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    });
  },

  async getMembers(token, spaceName) {
    const res = await fetchAPI(token, `https://chat.googleapis.com/v1/${spaceName}/members`);
    return res.memberships || [];
  },

  async getSpace(token, spaceName) {
    return fetchAPI(token, `https://chat.googleapis.com/v1/${spaceName}`);
  },

  async getUser(token, userName) {
    return fetchAPI(token, `https://chat.googleapis.com/v1/${userName}`);
  },
};

// ─── Utility: File type helpers ──────────────────────────────────────
export const FILE_ICONS = {
  'application/vnd.google-apps.folder': '📁',
  'application/vnd.google-apps.document': '📄',
  'application/vnd.google-apps.spreadsheet': '📊',
  'application/vnd.google-apps.presentation': '📽️',
  'application/vnd.google-apps.form': '📋',
  'application/pdf': '📕',
  'image/png': '🖼️',
  'image/jpeg': '🖼️',
  'image/gif': '🖼️',
  'image/svg+xml': '🖼️',
  'video/mp4': '🎬',
  'video/quicktime': '🎬',
  'audio/mpeg': '🎵',
  'audio/mp3': '🎵',
  'application/zip': '📦',
  'application/x-zip-compressed': '📦',
  'text/plain': '📝',
  'text/csv': '📊',
  'text/html': '🌐',
  'application/json': '{ }',
  'application/javascript': '⚡',
};

export function getFileIcon(mimeType) {
  return FILE_ICONS[mimeType] || '📎';
}

export function isFolder(mimeType) {
  return mimeType === 'application/vnd.google-apps.folder';
}

export function isGoogleDoc(mimeType) {
  return mimeType?.startsWith('application/vnd.google-apps.');
}

export function formatFileSize(bytes) {
  if (!bytes || bytes === '0') return '—';
  const n = parseInt(bytes, 10);
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / (1024 * 1024)).toFixed(1)} MB`;
  return `${(n / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export function formatStorageQuota(quota) {
  const used = parseInt(quota?.usage || '0', 10);
  const total = parseInt(quota?.limit || '0', 10);
  return {
    used: formatFileSize(used),
    total: total ? formatFileSize(total) : 'Unlimited',
    percentage: total ? Math.round((used / total) * 100) : 0,
    usedBytes: used,
    totalBytes: total,
  };
}
