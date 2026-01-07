import { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  encryptAESKeyWithRSA,
  importPublicKey,
} from "../utils/crypto";

interface SharedUser {
  username: string;
  shared_at?: string;
}

interface FileRecord {
  id: number;
  filename: string;
  size_bytes: number;
  upload_date: string;
  shared_with: SharedUser[];
}

interface UserSearchResult {
  id: number;
  username: string;
  has_public_key: boolean;
}

export default function MyFiles() {
  const { token } = useAuth();
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  // Share modal state
  const [shareModalFile, setShareModalFile] = useState<FileRecord | null>(null);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [sharing, setSharing] = useState(false);

  // Revoke modal state
  const [revokeModalFile, setRevokeModalFile] = useState<FileRecord | null>(null);
  const [revoking, setRevoking] = useState<string | null>(null);

  // Delete confirmation
  const [deleteConfirmFile, setDeleteConfirmFile] = useState<FileRecord | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    fetchFiles();
  }, []);

  // Search for users when sharing
  useEffect(() => {
    const searchUsers = async () => {
      if (recipientSearch.length < 2 || !token) {
        setSearchResults([]);
        return;
      }

      setSearching(true);
      try {
        const res = await fetch(
          `http://127.0.0.1:8000/users/search?query=${encodeURIComponent(recipientSearch)}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error("Search failed:", err);
      } finally {
        setSearching(false);
      }
    };

    const debounce = setTimeout(searchUsers, 300);
    return () => clearTimeout(debounce);
  }, [recipientSearch, token]);

  const fetchFiles = async () => {
    if (!token) return;

    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/files/list", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      } else {
        setError("Failed to fetch files");
      }
    } catch (err) {
      setError("Network error while fetching files");
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async (file: FileRecord, recipient: UserSearchResult) => {
    if (!token || !recipient.has_public_key) return;

    setSharing(true);
    setError("");

    try {
      // For E2E sharing, we need to get the AES key and re-encrypt for the new recipient
      // This requires the original uploader to have stored the AES key
      // For simplicity, we'll use the server-side share endpoint

      const res = await fetch(`http://127.0.0.1:8000/files/share/${file.id}?recipient_username=${encodeURIComponent(recipient.username)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (res.ok) {
        setSuccessMessage(`File shared with ${recipient.username}`);
        setShareModalFile(null);
        setRecipientSearch("");
        setSearchResults([]);
        fetchFiles();
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to share file");
      }
    } catch (err: any) {
      setError(err.message || "Failed to share file");
    } finally {
      setSharing(false);
    }
  };

  const handleRevoke = async (fileId: number, username: string) => {
    if (!token) return;

    setRevoking(username);
    setError("");

    try {
      const res = await fetch(
        `http://127.0.0.1:8000/files/revoke/${fileId}/${username}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      if (res.ok) {
        setSuccessMessage(`Access revoked for ${username}`);
        fetchFiles();
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to revoke access");
      }
    } catch (err: any) {
      setError(err.message || "Failed to revoke access");
    } finally {
      setRevoking(null);
    }
  };

  const handleDelete = async (file: FileRecord) => {
    if (!token) return;

    setDeleting(true);
    setError("");

    try {
      const res = await fetch(`http://127.0.0.1:8000/files/delete/${file.id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        setSuccessMessage("File deleted successfully");
        setDeleteConfirmFile(null);
        fetchFiles();
      } else {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.detail || "Failed to delete file");
      }
    } catch (err: any) {
      setError(err.message || "Failed to delete file");
    } finally {
      setDeleting(false);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatFileSize = (bytes: number) => {
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const getFileIcon = (filename: string) => {
    const ext = filename.split(".").pop()?.toLowerCase();
    if (["jpg", "jpeg", "png", "gif", "webp"].includes(ext || "")) {
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      );
    }
    if (["pdf"].includes(ext || "")) {
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
        </svg>
      );
    }
    return (
      <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl shadow-lg shadow-blue-500/30">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
                My Files
              </h1>
              <p className="text-gray-400 mt-1">Manage your encrypted files and sharing</p>
            </div>
          </div>
          <div className="flex gap-3">
            <button
              onClick={fetchFiles}
              disabled={loading}
              className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
            >
              <svg className={`w-5 h-5 text-gray-400 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
            <a
              href="/upload"
              className="px-4 py-2 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-xl font-medium flex items-center gap-2 transition-all"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Upload
            </a>
          </div>
        </div>

        {/* Success Message */}
        {successMessage && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3 animate-fadeIn">
            <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <p className="text-green-400">{successMessage}</p>
            <button
              onClick={() => setSuccessMessage("")}
              className="ml-auto text-green-400/50 hover:text-green-400"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 animate-shake">
            <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
              <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <p className="text-red-400">{error}</p>
            <button
              onClick={() => setError("")}
              className="ml-auto text-red-400/50 hover:text-red-400"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        {/* Files Table */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <svg className="w-12 h-12 text-blue-400 animate-spin mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-400">Loading your files...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 19a2 2 0 01-2-2V7a2 2 0 012-2h4l2 2h4a2 2 0 012 2v1M5 19h14a2 2 0 002-2v-5a2 2 0 00-2-2H9a2 2 0 00-2 2v5a2 2 0 01-2 2z" />
                </svg>
              </div>
              <p className="text-gray-400 text-lg mb-2">No files yet</p>
              <p className="text-gray-600 text-sm mb-6">Upload your first file to get started</p>
              <a
                href="/upload"
                className="px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 rounded-xl font-medium flex items-center gap-2 transition-all"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                </svg>
                Upload File
              </a>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">File</th>
                    <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">Size</th>
                    <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">Uploaded</th>
                    <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">Shared With</th>
                    <th className="text-right py-4 px-6 text-gray-400 font-medium text-sm">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {files.map((file) => (
                    <tr
                      key={file.id}
                      className="border-b border-white/5 hover:bg-white/5 transition-colors"
                    >
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500/20 to-cyan-500/20 rounded-xl flex items-center justify-center text-blue-400">
                            {getFileIcon(file.filename)}
                          </div>
                          <p className="text-white font-medium truncate max-w-xs">
                            {file.filename}
                          </p>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-400">
                        {formatFileSize(file.size_bytes)}
                      </td>
                      <td className="py-4 px-6 text-gray-400">
                        {formatDate(file.upload_date)}
                      </td>
                      <td className="py-4 px-6">
                        {file.shared_with.length === 0 ? (
                          <span className="text-gray-500 text-sm">Not shared</span>
                        ) : (
                          <div className="flex items-center gap-1">
                            {file.shared_with.slice(0, 3).map((user, idx) => (
                              <div
                                key={idx}
                                className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white text-xs font-medium border-2 border-slate-900 -ml-2 first:ml-0"
                                title={user.username}
                              >
                                {user.username[0].toUpperCase()}
                              </div>
                            ))}
                            {file.shared_with.length > 3 && (
                              <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-gray-400 text-xs -ml-2">
                                +{file.shared_with.length - 3}
                              </div>
                            )}
                            <button
                              onClick={() => setRevokeModalFile(file)}
                              className="ml-2 text-gray-500 hover:text-white transition-colors"
                              title="Manage sharing"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => setShareModalFile(file)}
                            className="p-2 bg-purple-500/20 hover:bg-purple-500/30 text-purple-400 rounded-lg transition-colors"
                            title="Share"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => setDeleteConfirmFile(file)}
                            className="p-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg transition-colors"
                            title="Delete"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Share Modal */}
        {shareModalFile && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
            <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Share File</h3>
                <button
                  onClick={() => {
                    setShareModalFile(null);
                    setRecipientSearch("");
                    setSearchResults([]);
                  }}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl mb-6">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
                  {getFileIcon(shareModalFile.filename)}
                </div>
                <p className="text-white font-medium truncate">{shareModalFile.filename}</p>
              </div>

              <div className="relative mb-4">
                <input
                  type="text"
                  placeholder="Search by username..."
                  value={recipientSearch}
                  onChange={(e) => setRecipientSearch(e.target.value)}
                  className="w-full px-4 py-3 bg-white/5 border border-white/10 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50"
                />
                {searching && (
                  <div className="absolute right-4 top-1/2 -translate-y-1/2">
                    <svg className="w-5 h-5 text-gray-400 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  </div>
                )}
              </div>

              {searchResults.length > 0 && (
                <div className="bg-white/5 border border-white/10 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => handleShare(shareModalFile, user)}
                      disabled={sharing || !user.has_public_key}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-white/10 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="w-8 h-8 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-sm font-medium">
                        {user.username[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">{user.username}</p>
                      </div>
                      {user.has_public_key ? (
                        <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full">
                          Can receive
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 bg-yellow-500/20 text-yellow-400 rounded-full">
                          No keys
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {sharing && (
                <div className="mt-4 flex items-center justify-center gap-2 text-purple-400">
                  <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Sharing file...
                </div>
              )}
            </div>
          </div>
        )}

        {/* Revoke Access Modal */}
        {revokeModalFile && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
            <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-md mx-4">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Manage Access</h3>
                <button
                  onClick={() => setRevokeModalFile(null)}
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                >
                  <svg className="w-5 h-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl mb-6">
                <div className="w-10 h-10 bg-blue-500/20 rounded-xl flex items-center justify-center text-blue-400">
                  {getFileIcon(revokeModalFile.filename)}
                </div>
                <p className="text-white font-medium truncate">{revokeModalFile.filename}</p>
              </div>

              <p className="text-gray-400 text-sm mb-4">Currently shared with:</p>

              {revokeModalFile.shared_with.length === 0 ? (
                <p className="text-gray-500 text-center py-4">Not shared with anyone</p>
              ) : (
                <div className="space-y-2">
                  {revokeModalFile.shared_with.map((user, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 bg-white/5 rounded-xl"
                    >
                      <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-medium">
                        {user.username[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className="text-white font-medium">{user.username}</p>
                        {user.shared_at && (
                          <p className="text-gray-500 text-xs">
                            Shared {formatDate(user.shared_at)}
                          </p>
                        )}
                      </div>
                      <button
                        onClick={() => handleRevoke(revokeModalFile.id, user.username)}
                        disabled={revoking === user.username}
                        className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/30 text-red-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-1"
                      >
                        {revoking === user.username ? (
                          <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          "Revoke"
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {deleteConfirmFile && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 animate-fadeIn">
            <div className="bg-slate-900 border border-white/10 rounded-3xl p-6 w-full max-w-md mx-4">
              <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-6">
                <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>

              <h3 className="text-xl font-semibold text-white text-center mb-2">Delete File?</h3>
              <p className="text-gray-400 text-center mb-6">
                Are you sure you want to delete <span className="text-white font-medium">{deleteConfirmFile.filename}</span>? This action cannot be undone.
              </p>

              <div className="flex gap-3">
                <button
                  onClick={() => setDeleteConfirmFile(null)}
                  className="flex-1 py-3 bg-white/5 hover:bg-white/10 text-white rounded-xl font-medium transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleDelete(deleteConfirmFile)}
                  disabled={deleting}
                  className="flex-1 py-3 bg-red-500 hover:bg-red-600 text-white rounded-xl font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {deleting ? (
                    <>
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Deleting...
                    </>
                  ) : (
                    "Delete"
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
