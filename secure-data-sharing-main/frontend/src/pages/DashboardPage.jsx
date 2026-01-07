import React, { useState, useEffect, useCallback } from 'react';
// 1. Import the Download icon
import { Upload, FileText, Share2, Trash2, X, AlertCircle, Download } from 'lucide-react';

const API_URL = 'http://127.0.0.1:8000';

const apiService = {
  authFetch: async (url, options = {}, isDownload = false) => {
    const token = localStorage.getItem('authToken');
    const headers = { ...options.headers, 'Authorization': `Bearer ${token}` };
    if (!(options.body instanceof FormData)) {
      headers['Content-Type'] = 'application/json';
    }
    const response = await fetch(`${API_URL}${url}`, { ...options, headers });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ detail: 'An unknown server error occurred.' }));
      throw new Error(errorData.detail || 'Request failed');
    }

    // For file downloads, we need the whole response to get the blob
    if (isDownload) return response;

    // For other requests, handle JSON or no content
    if (response.status === 204) return null;
    return response.json();
  },
  getMe: () => apiService.authFetch('/users/me'),
  getMyFiles: () => apiService.authFetch('/files/list'),
  getSharedFiles: () => apiService.authFetch('/files/shared-with-me'),
  uploadFile: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiService.authFetch('/files/upload', { method: 'POST', body: formData });
  },
  deleteFile: (fileId) => apiService.authFetch(`/files/delete/${fileId}`, { method: 'DELETE' }),
  shareFile: (fileId, recipientUsername) => apiService.authFetch(`/files/share/${fileId}?recipient_username=${recipientUsername}`, { method: 'POST' }),
  
  // 2. Add the downloadFile function
  downloadFile: (fileId) => apiService.authFetch(`/files/download/${fileId}`, {}, true),
};

// --- Main Dashboard Component ---
export default function DashboardPage({ onLogout }) {
  const [user, setUser] = useState(null);
  const [myFiles, setMyFiles] = useState([]);
  const [sharedFiles, setSharedFiles] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [fileToShare, setFileToShare] = useState(null);
  
  const fetchData = useCallback(async () => {
    // Resetting state on fetch to prevent stale data
    setIsLoading(true);
    setError('');
    try {
      const [userData, myFilesData, sharedFilesData] = await Promise.all([
        apiService.getMe(),
        apiService.getMyFiles(),
        apiService.getSharedFiles(),
      ]);
      setUser(userData);
      setMyFiles(myFilesData || []);
      setSharedFiles(sharedFilesData || []);
    } catch (err) {
      setError('Session expired or failed to load data. Please log in again.');
      setTimeout(onLogout, 3000);
    } finally {
      setIsLoading(false);
    }
  }, [onLogout]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);
  
  useEffect(() => {
    if (error || success) {
      const timer = setTimeout(() => { setError(''); setSuccess(''); }, 5000);
      return () => clearTimeout(timer);
    }
  }, [error, success]);

  if (isLoading) {
    return (
        <div className="min-h-screen bg-gray-900 flex items-center justify-center">
            <div className="flex items-center space-x-3 text-white">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-400"></div>
                <span className="font-semibold text-lg">Loading Secure Hub...</span>
            </div>
        </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-200 font-sans">
        <Header username={user?.username} onLogout={onLogout} />
        <main className="max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
            <GlobalAlert error={error} success={success} setError={setError} />
            <div className="space-y-10">
                <MyFilesSection files={myFiles} onUpdate={fetchData} setSuccess={setSuccess} setError={setError} setFileToShare={setFileToShare} setIsModalOpen={setIsModalOpen} />
                <SharedFilesSection files={sharedFiles} setSuccess={setSuccess} setError={setError} />
            </div>
        </main>
        {isModalOpen && <ShareModal file={fileToShare} onClose={() => setIsModalOpen(false)} setSuccess={setSuccess} setError={setError} />}
    </div>
  );
}

// --- UI Sub-components ---
const Header = ({ username, onLogout }) => (
    <header className="bg-gray-800 bg-opacity-50 backdrop-blur-md sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:p-8">
            <div className="flex justify-between items-center py-4 border-b border-gray-700">
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"></path></svg>
                    Secure Data Hub
                </h1>
                <div className="flex items-center gap-4">
                    <span className="text-gray-300">Welcome, <span className="font-semibold text-white">{username}</span></span>
                    <button onClick={onLogout} className="px-4 py-2 text-sm font-medium rounded-md bg-gray-700 hover:bg-gray-600 transition-colors">Logout</button>
                </div>
            </div>
        </div>
    </header>
);

const GlobalAlert = ({ error, success, setError }) => {
    if (!error && !success) return null;
    const isError = !!error;
    const message = error || success;
    
    return (
        <div className={`fixed top-24 right-8 z-50 flex items-center p-4 mb-4 text-white rounded-lg shadow-lg ${isError ? 'bg-red-500' : 'bg-green-500'}`}>
            {isError ? <AlertCircle className="w-5 h-5 mr-3" /> : <Upload className="w-5 h-5 mr-3" />}
            <div>{message}</div>
            <button onClick={() => setError('')} className="ml-4 text-white hover:text-gray-200">&times;</button>
        </div>
    );
};

const MyFilesSection = ({ files, onUpdate, setSuccess, setError, setFileToShare, setIsModalOpen }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const [isUploading, setIsUploading] = useState(false);

    const handleUpload = async () => {
        if (!selectedFile) return setError('Please select a file to upload.');
        setIsUploading(true);
        setError('');
        try {
            await apiService.uploadFile(selectedFile);
            setSuccess(`File '${selectedFile.name}' was securely uploaded.`);
            setSelectedFile(null);
            if(document.getElementById('file-upload-input')) {
                document.getElementById('file-upload-input').value = '';
            }
            onUpdate();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <section>
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-3xl font-bold">My Files</h2>
                <div className="flex items-center gap-3">
                    <input type="file" id="file-upload-input" onChange={(e) => setSelectedFile(e.target.files[0])} className="hidden" />
                    <label htmlFor="file-upload-input" className="cursor-pointer px-4 py-2 text-sm font-medium rounded-md bg-gray-700 hover:bg-gray-600">Choose File</label>
                    <button onClick={handleUpload} disabled={!selectedFile || isUploading} className="flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-gray-500 disabled:cursor-not-allowed">
                        {isUploading ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div> : <Upload size={16} />}
                        Upload
                    </button>
                </div>
            </div>
            <FileGrid files={files} setSuccess={setSuccess} setError={setError} onShare={(file) => { setFileToShare(file); setIsModalOpen(true); }} onDelete={async (fileId) => {
                const fileToDelete = files.find(f => f.id === fileId);
                if (window.confirm(`Are you sure you want to delete "${fileToDelete?.filename}"?`)) {
                    try { await apiService.deleteFile(fileId); setSuccess('File deleted.'); onUpdate(); }
                    catch (err) { setError(err.message); }
                }
            }} />
        </section>
    );
};

const SharedFilesSection = ({ files, setSuccess, setError }) => (
    <section>
        <h2 className="text-3xl font-bold mb-4">Files Shared With Me</h2>
        <FileGrid files={files} isSharedView={true} setSuccess={setSuccess} setError={setError} />
    </section>
);

const FileGrid = ({ files, isSharedView = false, onShare, onDelete, setSuccess, setError }) => {
    if (files.length === 0) {
        return <div className="text-center py-10 px-6 bg-gray-800 rounded-lg"><p className="text-gray-400">No files found.</p></div>
    }
    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {files.map(file => <FileCard key={file.id} file={file} isSharedView={isSharedView} onShare={onShare} onDelete={onDelete} setSuccess={setSuccess} setError={setError} />)}
        </div>
    );
};

// 3. Update the FileCard to add the download button and logic
const FileCard = ({ file, isSharedView, onShare, onDelete, setSuccess, setError }) => {
    const handleDownload = async () => {
        try {
          setSuccess('Starting download...');
          const response = await apiService.downloadFile(file.id);
          const blob = await response.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = file.filename;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
          setSuccess('Download complete.');
        } catch (err) {
          setError(`Download failed: ${err.message}`);
        }
    };
    
    return (
        <div className="bg-gray-800 rounded-lg p-4 flex flex-col justify-between shadow-lg hover:shadow-blue-500/20 hover:-translate-y-1 transition-all duration-300">
            <div>
                <div className="flex items-center gap-3 mb-3">
                    <FileText className="w-6 h-6 text-blue-400" />
                    <p className="font-semibold truncate text-white" title={file.filename}>{file.filename}</p>
                </div>
                <p className="text-xs text-gray-400">Size: {(file.size_bytes / 1024).toFixed(2)} KB</p>
                <p className="text-xs text-gray-400">Uploaded: {new Date(file.upload_date).toLocaleDateString()}</p>
                {isSharedView && <p className="text-xs text-gray-400 mt-1">From: <span className="font-medium text-gray-300">{file.shared_by}</span></p>}
            </div>
            
            <div className="flex items-center justify-end gap-2 mt-4">
                <button onClick={handleDownload} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full" title="Download">
                    <Download size={16} />
                </button>
                {!isSharedView && (
                    <>
                        <button onClick={() => onShare(file)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full" title="Share"><Share2 size={16} /></button>
                        <button onClick={() => onDelete(file.id)} className="p-2 text-gray-400 hover:text-white hover:bg-gray-700 rounded-full" title="Delete"><Trash2 size={16} /></button>
                    </>
                )}
            </div>
        </div>
    );
};

const ShareModal = ({ file, onClose, setSuccess, setError }) => {
    const [recipient, setRecipient] = useState('');
    const [isSharing, setIsSharing] = useState(false);

    const handleShare = async (e) => {
        e.preventDefault();
        if (!recipient) return setError("Please enter a recipient's username.");
        setIsSharing(true);
        setError('');
        try {
            const result = await apiService.shareFile(file.id, recipient);
            setSuccess(result.message);
            onClose();
        } catch (err) {
            setError(err.message);
        } finally {
            setIsSharing(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-50 p-4">
            <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md border border-gray-700 shadow-2xl">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-xl font-bold text-white">Share File</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-white"><X size={20} /></button>
                </div>
                <p className="text-gray-300 mb-4">Share "<span className="font-semibold">{file.filename}</span>" with another user.</p>
                <form onSubmit={handleShare} className="space-y-4">
                    <input type="text" placeholder="Enter recipient's username" value={recipient} onChange={e => setRecipient(e.target.value)} className="w-full px-4 py-2 bg-gray-700 border border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <div className="flex justify-end gap-3">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-sm font-medium rounded-md bg-gray-600 hover:bg-gray-500">Cancel</button>
                        <button type="submit" disabled={isSharing} className="px-4 py-2 text-sm font-medium rounded-md bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400">
                            {isSharing ? 'Sharing...' : 'Share File'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};
