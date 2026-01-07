import { useState, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  decryptFile,
  decryptAESKeyWithRSA,
  importPrivateKey,
  getStoredPrivateKey,
  hasStoredKeys,
  storePrivateKey,
  storePublicKey,
} from "../utils/crypto";

interface SharedFile {
  id: number;
  filename: string;
  shared_by: string;
  shared_at: string;
  has_encrypted_key: boolean;
  size_bytes?: number;
}

interface ThreatAnalysis {
  file_id: number;
  filename: string;
  threat_score: number;
  threat_level: string;
  status: string;
  confidence: number;
  risk_factors: string[];
}

interface ThreatSummary {
  total_scanned: number;
  high_threats: number;
  medium_threats: number;
  low_threats: number;
  safe_files: number;
  overall_risk: string;
}

export default function SharedWithMe() {
  const { token } = useAuth();
  const [files, setFiles] = useState<SharedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [decrypting, setDecrypting] = useState<number | null>(null);
  const [decryptProgress, setDecryptProgress] = useState(0);
  const [progressStep, setProgressStep] = useState("");
  const [hasKeys, setHasKeys] = useState(false);
  
  // ML Threat Detection State
  const [threatData, setThreatData] = useState<ThreatAnalysis[]>([]);
  const [threatSummary, setThreatSummary] = useState<ThreatSummary | null>(null);
  const [scanning, setScanning] = useState(false);

  useEffect(() => {
    // Sync keys from server first, then check local storage
    const syncAndCheckKeys = async () => {
      if (!token) return;
      
      try {
        // Always sync keys from server to ensure we have the right private key
        const res = await fetch("http://127.0.0.1:8000/users/my-keys", {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.ok) {
          const data = await res.json();
          if (data.has_keys && data.public_key && data.private_key) {
            storePublicKey(data.public_key);
            storePrivateKey(data.private_key);
            console.log("Keys synced from server for decryption");
          }
        }
      } catch (err) {
        console.error("Failed to sync keys:", err);
      }
      
      setHasKeys(hasStoredKeys());
    };
    
    syncAndCheckKeys();
    fetchSharedFiles();
  }, [token]);

  // Auto-scan for threats when files are loaded
  useEffect(() => {
    if (files.length > 0 && threatData.length === 0) {
      scanForThreats();
    }
  }, [files]);

  const scanForThreats = async () => {
    if (!token || files.length === 0) return;
    
    setScanning(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/ml/scan-all-shared", {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (res.ok) {
        const data = await res.json();
        setThreatData(data.files);
        setThreatSummary(data.summary);
      }
    } catch (err) {
      console.error("Threat scan failed:", err);
    } finally {
      setScanning(false);
    }
  };

  const getThreatForFile = (fileId: number): ThreatAnalysis | undefined => {
    return threatData.find(t => t.file_id === fileId);
  };

  const fetchSharedFiles = async () => {
    if (!token) return;
    
    setLoading(true);
    try {
      const res = await fetch("http://127.0.0.1:8000/files/shared-with-me", {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.ok) {
        const data = await res.json();
        setFiles(data);
      } else {
        setError("Failed to fetch shared files");
      }
    } catch (err) {
      setError("Network error while fetching files");
    } finally {
      setLoading(false);
    }
  };

  const handleDecryptAndDownload = async (file: SharedFile) => {
    if (!token || !hasKeys) return;

    setDecrypting(file.id);
    setDecryptProgress(0);
    setError("");

    try {
      // Step 1: Download encrypted file with encrypted AES key
      setProgressStep("Downloading encrypted file...");
      setDecryptProgress(20);

      const res = await fetch(`http://127.0.0.1:8000/files/download-e2e/${file.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (!res.ok) {
        throw new Error("Failed to download file");
      }

      const data = await res.json();
      const { encrypted_data, encrypted_aes_key, filename } = data;

      if (!encrypted_aes_key) {
        throw new Error("No encryption key available for this file");
      }

      // Step 2: Get private key from local storage
      setProgressStep("Loading decryption keys...");
      setDecryptProgress(40);

      const privateKeyPem = getStoredPrivateKey();
      if (!privateKeyPem) {
        throw new Error("Private key not found. Please set up encryption keys.");
      }

      const privateKey = await importPrivateKey(privateKeyPem);

      // Step 3: Decrypt the AES key using private RSA key
      setProgressStep("Decrypting file key...");
      setDecryptProgress(60);

      const aesKey = await decryptAESKeyWithRSA(encrypted_aes_key, privateKey);

      // Step 4: Decrypt the file content
      setProgressStep("Decrypting file content...");
      setDecryptProgress(80);

      // Convert base64 to blob
      const encryptedBytes = Uint8Array.from(atob(encrypted_data), c => c.charCodeAt(0));
      const encryptedBlob = new Blob([encryptedBytes]);

      const decryptedBlob = await decryptFile(encryptedBlob, aesKey);

      // Step 5: Download the decrypted file
      setProgressStep("Preparing download...");
      setDecryptProgress(100);

      // Remove .encrypted extension if present
      const cleanFilename = filename.replace(/\.encrypted$/, "");

      const url = URL.createObjectURL(decryptedBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = cleanFilename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      setProgressStep("Download complete!");
    } catch (err: any) {
      setError(err.message || "Decryption failed");
    } finally {
      setTimeout(() => {
        setDecrypting(null);
        setDecryptProgress(0);
        setProgressStep("");
      }, 2000);
    }
  };

  const formatDate = (dateString: string) => {
    // Parse the UTC date and convert to local time
    let date = new Date(dateString);
    
    // If the date doesn't have timezone info, treat it as UTC
    if (!dateString.includes('Z') && !dateString.includes('+')) {
      date = new Date(dateString + 'Z');
    }
    
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      hour12: true
    });
  };

  const formatFileSize = (bytes?: number) => {
    if (!bytes) return "Unknown";
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
    if (["doc", "docx"].includes(ext || "")) {
      return (
        <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
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
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-purple-950 text-white p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-4">
            <div className="p-3 bg-gradient-to-br from-purple-500 to-pink-400 rounded-2xl shadow-lg shadow-purple-500/30">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
            </div>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                Shared With Me
              </h1>
              <p className="text-gray-400 mt-1">Files securely shared with you</p>
            </div>
          </div>
          <button
            onClick={fetchSharedFiles}
            disabled={loading}
            className="p-3 bg-white/5 hover:bg-white/10 rounded-xl transition-colors"
          >
            <svg className={`w-5 h-5 text-gray-400 ${loading ? "animate-spin" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
          </button>
        </div>

        {/* Key Setup Warning */}
        {!hasKeys && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl animate-fadeIn">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div>
                <p className="text-yellow-400 font-medium">Encryption Keys Required</p>
                <p className="text-yellow-400/70 text-sm mt-1">
                  You need to set up encryption keys to decrypt shared files. Go to the Upload page to generate your keys.
                </p>
              </div>
            </div>
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
          </div>
        )}

        {/* Decryption Progress */}
        {decrypting && decryptProgress > 0 && (
          <div className="mb-6 p-4 bg-purple-500/10 border border-purple-500/30 rounded-xl animate-fadeIn">
            <div className="flex items-center justify-between mb-2">
              <span className="text-purple-400">{progressStep}</span>
              <span className="text-purple-400">{decryptProgress}%</span>
            </div>
            <div className="h-2 bg-white/10 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-pink-400 transition-all duration-500"
                style={{ width: `${decryptProgress}%` }}
              />
            </div>
          </div>
        )}

        {/* ML Threat Detection Cards */}
        {threatSummary && (
          <div className="mb-6 grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="p-4 bg-gradient-to-br from-red-500/20 to-red-500/5 border border-red-500/30 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                <span className="text-red-400 text-sm font-medium">High Risk</span>
              </div>
              <p className="text-3xl font-bold text-red-400">{threatSummary.high_threats}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-orange-500/20 to-orange-500/5 border border-orange-500/30 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-orange-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-orange-400 text-sm font-medium">Medium</span>
              </div>
              <p className="text-3xl font-bold text-orange-400">{threatSummary.medium_threats}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 border border-yellow-500/30 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-yellow-400 text-sm font-medium">Low Risk</span>
              </div>
              <p className="text-3xl font-bold text-yellow-400">{threatSummary.low_threats}</p>
            </div>
            <div className="p-4 bg-gradient-to-br from-green-500/20 to-green-500/5 border border-green-500/30 rounded-2xl">
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-green-400 text-sm font-medium">Safe</span>
              </div>
              <p className="text-3xl font-bold text-green-400">{threatSummary.safe_files}</p>
            </div>
            <div className={`p-4 rounded-2xl border ${
              threatSummary.overall_risk === 'HIGH' ? 'bg-gradient-to-br from-red-500/20 to-red-500/5 border-red-500/30' :
              threatSummary.overall_risk === 'MEDIUM' ? 'bg-gradient-to-br from-orange-500/20 to-orange-500/5 border-orange-500/30' :
              threatSummary.overall_risk === 'LOW' ? 'bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 border-yellow-500/30' :
              'bg-gradient-to-br from-green-500/20 to-green-500/5 border-green-500/30'
            }`}>
              <div className="flex items-center gap-2 mb-2">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
                <span className="text-purple-400 text-sm font-medium">ML Scan</span>
              </div>
              <p className={`text-lg font-bold ${
                threatSummary.overall_risk === 'HIGH' ? 'text-red-400' :
                threatSummary.overall_risk === 'MEDIUM' ? 'text-orange-400' :
                threatSummary.overall_risk === 'LOW' ? 'text-yellow-400' : 'text-green-400'
              }`}>
                {threatSummary.overall_risk}
              </p>
              <p className="text-xs text-gray-500">{scanning ? 'Scanning...' : `${threatSummary.total_scanned} files`}</p>
            </div>
          </div>
        )}

        {/* Files Table */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl overflow-hidden">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20">
              <svg className="w-12 h-12 text-purple-400 animate-spin mb-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <p className="text-gray-400">Loading shared files...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20">
              <div className="w-20 h-20 bg-white/5 rounded-3xl flex items-center justify-center mb-6">
                <svg className="w-10 h-10 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
                </svg>
              </div>
              <p className="text-gray-400 text-lg mb-2">No files shared with you yet</p>
              <p className="text-gray-600 text-sm">Files shared with you will appear here</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-white/10">
                    <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">File</th>
                    <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">From</th>
                    <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">Date Shared</th>
                    <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">ML Security</th>
                    <th className="text-left py-4 px-6 text-gray-400 font-medium text-sm">Status</th>
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
                          <div className="w-10 h-10 bg-gradient-to-br from-purple-500/20 to-pink-500/20 rounded-xl flex items-center justify-center text-purple-400">
                            {getFileIcon(file.filename)}
                          </div>
                          <div>
                            <p className="text-white font-medium truncate max-w-xs">
                              {file.filename}
                            </p>
                            {file.size_bytes && (
                              <p className="text-gray-500 text-sm">{formatFileSize(file.size_bytes)}</p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-full flex items-center justify-center text-white text-sm font-medium">
                            {file.shared_by[0].toUpperCase()}
                          </div>
                          <span className="text-gray-300">{file.shared_by}</span>
                        </div>
                      </td>
                      <td className="py-4 px-6 text-gray-400">{formatDate(file.shared_at)}</td>
                      <td className="py-4 px-6">
                        {(() => {
                          const threat = getThreatForFile(file.id);
                          if (!threat) {
                            return (
                              <span className="text-gray-500 text-sm">Scanning...</span>
                            );
                          }
                          const level = threat.threat_level as 'high' | 'medium' | 'low' | 'safe';
                          const colors: Record<string, { bg: string; text: string; border: string }> = {
                            high: { bg: 'bg-red-500/20', text: 'text-red-400', border: 'border-red-500/30' },
                            medium: { bg: 'bg-yellow-500/20', text: 'text-yellow-400', border: 'border-yellow-500/30' },
                            low: { bg: 'bg-blue-500/20', text: 'text-blue-400', border: 'border-blue-500/30' },
                            safe: { bg: 'bg-green-500/20', text: 'text-green-400', border: 'border-green-500/30' }
                          };
                          const color = colors[level] || colors.safe;
                          return (
                            <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold ${color.bg} ${color.text} border ${color.border}`}>
                              {level === 'high' && (
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              )}
                              {level === 'medium' && (
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                                </svg>
                              )}
                              {level === 'low' && (
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                                </svg>
                              )}
                              {level === 'safe' && (
                                <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                </svg>
                              )}
                              {level.toUpperCase()}
                            </span>
                          );
                        })()}
                      </td>
                      <td className="py-4 px-6">
                        <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                          file.has_encrypted_key
                            ? "bg-green-500/20 text-green-400"
                            : "bg-yellow-500/20 text-yellow-400"
                        }`}>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                          </svg>
                          {file.has_encrypted_key ? "Encrypted" : "No Key"}
                        </span>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleDecryptAndDownload(file)}
                            disabled={decrypting === file.id || !hasKeys || !file.has_encrypted_key}
                            className={`px-4 py-2 rounded-xl font-medium text-sm transition-all flex items-center gap-2 ${
                              decrypting === file.id
                                ? "bg-purple-500/20 text-purple-400"
                                : hasKeys && file.has_encrypted_key
                                ? "bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 text-white shadow-lg shadow-purple-500/20"
                                : "bg-white/5 text-gray-500 cursor-not-allowed"
                            }`}
                          >
                            {decrypting === file.id ? (
                              <>
                                <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Decrypting...
                              </>
                            ) : (
                              <>
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 11V7a4 4 0 118 0m-4 8v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2z" />
                                </svg>
                                Decrypt & Download
                              </>
                            )}
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

        {/* Info Panel */}
        <div className="mt-8 backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
            </svg>
            Your Privacy is Protected
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
            <div className="flex items-start gap-3 p-4 bg-white/5 rounded-xl">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">Client-Side Decryption</p>
                <p className="text-gray-400">Files are decrypted in your browser using your private key</p>
              </div>
            </div>
            <div className="flex items-start gap-3 p-4 bg-white/5 rounded-xl">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center flex-shrink-0">
                <svg className="w-4 h-4 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-white font-medium">Zero-Knowledge Server</p>
                <p className="text-gray-400">The server never sees your decrypted files or keys</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
