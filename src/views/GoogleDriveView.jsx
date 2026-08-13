import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Topbar } from '../components/layout';
import { getGoogleToken, driveAPI, getFileIcon, isFolder, isGoogleDoc, formatFileSize } from '../services/google';
import { Search, Upload, FolderPlus, Download, ExternalLink, ChevronRight, ArrowLeft, Grid, List, Trash2, RefreshCw, HardDrive, MoreVertical } from 'lucide-react';

export function GoogleDriveView({ account }) {
  const [files, setFiles] = useState([]);
  const [path, setPath] = useState([{ id: 'root', name: 'My Drive' }]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [viewMode, setViewMode] = useState('grid');
  const [uploading, setUploading] = useState(false);
  const [storageQuota, setStorageQuota] = useState(null);
  const [nextPageToken, setNextPageToken] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(null);

  const fileInputRef = useRef(null);
  const searchTimeoutRef = useRef(null);

  const tokenData = getGoogleToken(account?.id);
  const token = tokenData?.accessToken;

  const currentFolderId = path[path.length - 1].id;

  const fetchFiles = useCallback(async (folderId, pageToken = null, query = '') => {
    if (!token) return;
    setLoading(true);
    setError(null);
    try {
      let res;
      if (query.trim()) {
        res = await driveAPI.searchFiles(token, query);
      } else {
        res = await driveAPI.listFiles(token, folderId, pageToken);
      }
      
      if (pageToken) {
        setFiles(prev => [...prev, ...res.files]);
      } else {
        setFiles(res.files);
      }
      setNextPageToken(res.nextPageToken || null);
    } catch (err) {
      console.error(err);
      setError('Failed to load files. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  const fetchQuota = useCallback(async () => {
    if (!token) return;
    try {
      const quota = await driveAPI.getStorageQuota(token);
      setStorageQuota(quota);
    } catch (err) {
      console.error('Failed to fetch storage quota', err);
    }
  }, [token]);

  useEffect(() => {
    if (token) {
      fetchQuota();
    }
  }, [token, fetchQuota]);

  useEffect(() => {
    if (!searchQuery.trim()) {
      fetchFiles(currentFolderId);
    }
  }, [currentFolderId, token, fetchFiles, searchQuery]);

  const handleSearchChange = (e) => {
    const query = e.target.value;
    setSearchQuery(query);
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    searchTimeoutRef.current = setTimeout(() => {
      fetchFiles(currentFolderId, null, query);
    }, 500);
  };

  const handleNavigate = (folder) => {
    setSearchQuery('');
    setPath(prev => [...prev, { id: folder.id, name: folder.name }]);
  };

  const handleBreadcrumbClick = (index) => {
    setSearchQuery('');
    setPath(prev => prev.slice(0, index + 1));
  };

  const handleBack = () => {
    if (path.length > 1) {
      setSearchQuery('');
      setPath(prev => prev.slice(0, -1));
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = async (e) => {
    if (!e.target.files?.length) return;
    await uploadFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const uploadFiles = async (fileList) => {
    if (!token) return;
    setUploading(true);
    try {
      for (const file of fileList) {
        await driveAPI.uploadFile(token, file, currentFolderId);
      }
      fetchFiles(currentFolderId);
      fetchQuota();
    } catch (err) {
      console.error(err);
      alert('Failed to upload files');
    } finally {
      setUploading(false);
    }
  };

  const handleCreateFolder = async () => {
    if (!token) return;
    const name = prompt('Enter folder name:');
    if (!name?.trim()) return;
    try {
      setLoading(true);
      await driveAPI.createFolder(token, name, currentFolderId);
      fetchFiles(currentFolderId);
    } catch (err) {
      console.error(err);
      alert('Failed to create folder');
      setLoading(false);
    }
  };

  const handleDelete = async (fileId) => {
    if (!token) return;
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    try {
      setLoading(true);
      await driveAPI.deleteFile(token, fileId);
      fetchFiles(currentFolderId);
      fetchQuota();
    } catch (err) {
      console.error(err);
      alert('Failed to delete file');
      setLoading(false);
    }
  };

  const handleDownload = async (file) => {
    if (!token) return;
    if (isGoogleDoc(file.mimeType)) {
      window.open(file.webViewLink, '_blank');
      return;
    }
    try {
      const blob = await driveAPI.downloadFile(token, file.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error(err);
      alert('Failed to download file');
    }
  };

  const handleDrag = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      await uploadFiles(Array.from(e.dataTransfer.files));
    }
  };

  const toggleMenu = (e, id) => {
    e.stopPropagation();
    setActiveMenuId(activeMenuId === id ? null : id);
  };

  useEffect(() => {
    const closeMenu = () => setActiveMenuId(null);
    window.addEventListener('click', closeMenu);
    return () => window.removeEventListener('click', closeMenu);
  }, []);

  if (!token) {
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', backgroundColor: 'var(--bg)' }}>
        <Topbar title="Google Drive" />
        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <HardDrive size={48} style={{ color: 'var(--text-3)', margin: '0 auto 16px' }} />
            <h2 className="font-display" style={{ fontSize: '1.25rem', marginBottom: 8, color: 'var(--text)' }}>Not Connected</h2>
            <p style={{ color: 'var(--text-2)' }}>Please connect your Google account in Integrations.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: 'var(--bg)' }}
      onDragEnter={handleDrag}
    >
      <Topbar title="Google Drive" />
      
      {/* Action Bar */}
      <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 16, alignItems: 'center', backgroundColor: 'var(--surface)' }}>
        {path.length > 1 && (
          <button className="btn btn-ghost" onClick={handleBack} style={{ padding: 8 }}>
            <ArrowLeft size={18} />
          </button>
        )}
        
        {/* Breadcrumbs */}
        <div style={{ display: 'flex', alignItems: 'center', flex: 1, overflow: 'hidden', whiteSpace: 'nowrap' }}>
          {path.map((segment, index) => (
            <React.Fragment key={segment.id}>
              {index > 0 && <ChevronRight size={16} style={{ color: 'var(--text-3)', margin: '0 4px' }} />}
              <span 
                onClick={() => handleBreadcrumbClick(index)}
                style={{ 
                  cursor: 'pointer', 
                  color: index === path.length - 1 ? 'var(--text)' : 'var(--text-2)',
                  fontWeight: index === path.length - 1 ? 600 : 400,
                  fontSize: '0.9rem',
                }}
              >
                {segment.name}
              </span>
            </React.Fragment>
          ))}
        </div>

        {/* Search */}
        <div style={{ position: 'relative', width: 240 }}>
          <Search size={16} style={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-3)' }} />
          <input 
            type="text" 
            placeholder="Search files..."
            value={searchQuery}
            onChange={handleSearchChange}
            style={{ 
              width: '100%', padding: '8px 12px 8px 36px', 
              borderRadius: 6, border: '1px solid var(--border)', 
              backgroundColor: 'var(--bg)', color: 'var(--text)',
              fontSize: '0.9rem'
            }}
          />
        </div>

        {/* Actions */}
        <button className="btn btn-secondary" onClick={() => fetchFiles(currentFolderId)} disabled={loading} style={{ padding: 8 }} title="Refresh">
          <RefreshCw size={16} className={loading ? 'spin' : ''} />
        </button>
        <button className="btn btn-secondary" onClick={handleCreateFolder} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <FolderPlus size={16} /> New Folder
        </button>
        <button className="btn btn-primary" onClick={handleUploadClick} disabled={uploading} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <Upload size={16} /> {uploading ? 'Uploading...' : 'Upload'}
        </button>
        
        <div style={{ display: 'flex', border: '1px solid var(--border)', borderRadius: 6, overflow: 'hidden' }}>
          <button 
            className="btn btn-ghost" 
            style={{ padding: 8, borderRadius: 0, backgroundColor: viewMode === 'grid' ? 'var(--surface-3)' : 'transparent' }}
            onClick={() => setViewMode('grid')}
          >
            <Grid size={16} />
          </button>
          <button 
            className="btn btn-ghost" 
            style={{ padding: 8, borderRadius: 0, backgroundColor: viewMode === 'list' ? 'var(--surface-3)' : 'transparent' }}
            onClick={() => setViewMode('list')}
          >
            <List size={16} />
          </button>
        </div>
        
        <input 
          type="file" 
          multiple 
          ref={fileInputRef} 
          style={{ display: 'none' }} 
          onChange={handleFileChange} 
        />
      </div>

      {/* Content Area */}
      <div 
        style={{ flex: 1, overflowY: 'auto', padding: 24, position: 'relative' }}
        onDragOver={handleDrag}
        onDragLeave={handleDrag}
        onDrop={handleDrop}
      >
        {dragActive && (
          <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            backgroundColor: 'rgba(var(--blue-rgb), 0.1)',
            border: '2px dashed var(--blue)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            zIndex: 10,
            borderRadius: 8,
            margin: 24
          }}>
            <div style={{ textAlign: 'center', color: 'var(--blue)' }}>
              <Upload size={48} style={{ margin: '0 auto 16px' }} />
              <h3 className="font-display">Drop files here to upload</h3>
            </div>
          </div>
        )}

        {error && (
          <div style={{ padding: 16, backgroundColor: 'var(--red)', color: 'white', borderRadius: 8, marginBottom: 16 }}>
            {error}
          </div>
        )}

        {loading && files.length === 0 ? (
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%' }}>
            <RefreshCw size={24} className="spin" style={{ color: 'var(--text-3)' }} />
          </div>
        ) : files.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: 'var(--text-3)' }}>
            <FolderPlus size={48} style={{ marginBottom: 16, opacity: 0.5 }} />
            <p>This folder is empty</p>
          </div>
        ) : viewMode === 'grid' ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {files.map(file => {
              const Icon = getFileIcon(file.mimeType);
              const folder = isFolder(file.mimeType);
              return (
                <div 
                  key={file.id} 
                  className="fade-in"
                  style={{ 
                    border: '1px solid var(--border)', borderRadius: 8, padding: 16,
                    backgroundColor: 'var(--surface)', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', gap: 12,
                    position: 'relative'
                  }}
                  onClick={() => folder ? handleNavigate(file) : window.open(file.webViewLink, '_blank')}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div style={{ padding: 12, backgroundColor: 'var(--surface-2)', borderRadius: 8 }}>
                      <Icon size={32} style={{ color: folder ? 'var(--blue)' : 'var(--text)' }} />
                    </div>
                    
                    <div style={{ position: 'relative' }}>
                      <button className="btn btn-ghost" style={{ padding: 4 }} onClick={(e) => toggleMenu(e, file.id)}>
                        <MoreVertical size={16} />
                      </button>
                      {activeMenuId === file.id && (
                        <div style={{
                          position: 'absolute', right: 0, top: '100%', zIndex: 20,
                          backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
                          borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                          minWidth: 120, padding: 4
                        }}>
                          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 12px', fontSize: '0.85rem' }} onClick={(e) => { e.stopPropagation(); window.open(file.webViewLink, '_blank'); }}>
                            <ExternalLink size={14} style={{ marginRight: 8 }} /> Open
                          </button>
                          {!folder && (
                            <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 12px', fontSize: '0.85rem' }} onClick={(e) => { e.stopPropagation(); handleDownload(file); }}>
                              <Download size={14} style={{ marginRight: 8 }} /> Download
                            </button>
                          )}
                          <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 12px', fontSize: '0.85rem', color: 'var(--red)' }} onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}>
                            <Trash2 size={14} style={{ marginRight: 8 }} /> Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div>
                    <div style={{ fontWeight: 500, fontSize: '0.9rem', marginBottom: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', color: 'var(--text)' }}>
                      {file.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-3)', display: 'flex', justifyContent: 'space-between' }}>
                      <span>{new Date(file.modifiedTime).toLocaleDateString()}</span>
                      {!folder && <span>{formatFileSize(file.size)}</span>}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          <div style={{ border: '1px solid var(--border)', borderRadius: 8, overflow: 'hidden', backgroundColor: 'var(--surface)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.9rem' }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)', backgroundColor: 'var(--surface-2)', textAlign: 'left' }}>
                  <th style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-2)' }}>Name</th>
                  <th style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-2)' }}>Last Modified</th>
                  <th style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-2)' }}>Size</th>
                  <th style={{ padding: '12px 16px', fontWeight: 500, color: 'var(--text-2)', width: 60 }}></th>
                </tr>
              </thead>
              <tbody>
                {files.map(file => {
                  const Icon = getFileIcon(file.mimeType);
                  const folder = isFolder(file.mimeType);
                  return (
                    <tr 
                      key={file.id} 
                      style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }}
                      onClick={() => folder ? handleNavigate(file) : window.open(file.webViewLink, '_blank')}
                      className="fade-in"
                    >
                      <td style={{ padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12 }}>
                        <Icon size={18} style={{ color: folder ? 'var(--blue)' : 'var(--text-2)' }} />
                        <span style={{ color: 'var(--text)' }}>{file.name}</span>
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>
                        {new Date(file.modifiedTime).toLocaleString()}
                      </td>
                      <td style={{ padding: '12px 16px', color: 'var(--text-2)' }}>
                        {!folder ? formatFileSize(file.size) : '--'}
                      </td>
                      <td style={{ padding: '12px 16px', position: 'relative' }}>
                        <button className="btn btn-ghost" style={{ padding: 4 }} onClick={(e) => toggleMenu(e, file.id)}>
                          <MoreVertical size={16} />
                        </button>
                        {activeMenuId === file.id && (
                          <div style={{
                            position: 'absolute', right: 16, top: '100%', zIndex: 20,
                            backgroundColor: 'var(--surface)', border: '1px solid var(--border)',
                            borderRadius: 6, boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                            minWidth: 120, padding: 4
                          }}>
                            <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 12px', fontSize: '0.85rem' }} onClick={(e) => { e.stopPropagation(); window.open(file.webViewLink, '_blank'); }}>
                              <ExternalLink size={14} style={{ marginRight: 8 }} /> Open
                            </button>
                            {!folder && (
                              <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 12px', fontSize: '0.85rem' }} onClick={(e) => { e.stopPropagation(); handleDownload(file); }}>
                                <Download size={14} style={{ marginRight: 8 }} /> Download
                              </button>
                            )}
                            <button className="btn btn-ghost" style={{ width: '100%', justifyContent: 'flex-start', padding: '6px 12px', fontSize: '0.85rem', color: 'var(--red)' }} onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }}>
                              <Trash2 size={14} style={{ marginRight: 8 }} /> Delete
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {nextPageToken && (
          <div style={{ textAlign: 'center', marginTop: 24 }}>
            <button className="btn btn-secondary" onClick={() => fetchFiles(currentFolderId, nextPageToken, searchQuery)} disabled={loading}>
              Load More
            </button>
          </div>
        )}
      </div>

      {/* Storage Quota */}
      {storageQuota && (
        <div style={{ padding: '12px 24px', borderTop: '1px solid var(--border)', backgroundColor: 'var(--surface)', display: 'flex', alignItems: 'center', gap: 16, fontSize: '0.8rem', color: 'var(--text-3)' }}>
          <HardDrive size={14} />
          <div style={{ flex: 1, height: 4, backgroundColor: 'var(--surface-3)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{ 
              height: '100%', 
              backgroundColor: 'var(--blue)', 
              width: `${(storageQuota.usage / storageQuota.limit) * 100}%` 
            }} />
          </div>
          <span>{formatFileSize(storageQuota.usage)} / {formatFileSize(storageQuota.limit)} used</span>
        </div>
      )}
    </div>
  );
}
