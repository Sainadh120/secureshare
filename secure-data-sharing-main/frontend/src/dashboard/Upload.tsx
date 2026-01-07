import { useState, useRef, useEffect } from "react";
import { useAuth } from "../auth/AuthContext";
import {
  encryptFile,
  encryptAESKeyWithRSA,
  importPublicKey,
  generateRSAKeyPair,
  exportPublicKey,
  exportPrivateKey,
  storePrivateKey,
  storePublicKey,
  hasStoredKeys,
  getStoredPublicKey,
} from "../utils/crypto";

interface UserSearchResult {
  id: number;
  username: string;
  has_public_key: boolean;
}

export default function Upload() {
  const { token, username } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<"idle" | "success" | "error">("idle");
  const [errorMessage, setErrorMessage] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Sharing state
  const [shareMode, setShareMode] = useState(false);
  const [recipientSearch, setRecipientSearch] = useState("");
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [selectedRecipient, setSelectedRecipient] = useState<UserSearchResult | null>(null);
  const [searching, setSearching] = useState(false);

  // Encryption progress
  const [encryptionProgress, setEncryptionProgress] = useState(0);
  const [progressStep, setProgressStep] = useState("");

  // Key setup
  const [hasKeys, setHasKeys] = useState(false);
  const [settingUpKeys, setSettingUpKeys] = useState(false);

  useEffect(() => {
    setHasKeys(hasStoredKeys());
  }, []);

  // Search for users
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

  // Setup encryption keys
  const setupKeys = async () => {
    if (!token) return;

    setSettingUpKeys(true);
    try {
      const keyPair = await generateRSAKeyPair();
      const publicKeyPem = await exportPublicKey(keyPair.publicKey);
      const privateKeyPem = await exportPrivateKey(keyPair.privateKey);

      // Store locally
      storePublicKey(publicKeyPem);
      storePrivateKey(privateKeyPem);

      // Send public key to server
      const res = await fetch("http://127.0.0.1:8000/users/public-key", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ public_key: publicKeyPem }),
      });

      if (res.ok) {
        setHasKeys(true);
      } else {
        throw new Error("Failed to save public key to server");
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to setup encryption keys");
      setUploadStatus("error");
    } finally {
      setSettingUpKeys(false);
    }
  };

  const handleUpload = async () => {
    if (!file) {
      setErrorMessage("Please select a file first");
      setUploadStatus("error");
      return;
    }

    if (!token) {
      setErrorMessage("You must be logged in to upload files");
      setUploadStatus("error");
      return;
    }

    if (shareMode && !selectedRecipient) {
      setErrorMessage("Please select a recipient to share with");
      setUploadStatus("error");
      return;
    }

    if (shareMode && selectedRecipient && !selectedRecipient.has_public_key) {
      setErrorMessage(`${selectedRecipient.username} hasn't set up encryption yet`);
      setUploadStatus("error");
      return;
    }

    setLoading(true);
    setUploadStatus("idle");
    setErrorMessage("");
    setEncryptionProgress(0);

    try {
      let formData = new FormData();

      if (shareMode && selectedRecipient) {
        // E2E Encryption flow
        setProgressStep("Generating encryption key...");
        setEncryptionProgress(10);

        // Encrypt file with AES
        setProgressStep("Encrypting file...");
        setEncryptionProgress(30);
        const { encryptedBlob, aesKey } = await encryptFile(file);

        // Get recipient's public key
        setProgressStep("Fetching recipient's public key...");
        setEncryptionProgress(50);
        const pubKeyRes = await fetch(
          `http://127.0.0.1:8000/users/public-key/${selectedRecipient.username}`,
          {
            headers: { Authorization: `Bearer ${token}` },
          }
        );

        if (!pubKeyRes.ok) {
          throw new Error("Failed to get recipient's public key");
        }

        const { public_key: recipientPubKeyPem } = await pubKeyRes.json();

        // Encrypt AES key with recipient's RSA public key
        setProgressStep("Encrypting key for recipient...");
        setEncryptionProgress(70);
        const recipientPubKey = await importPublicKey(recipientPubKeyPem);
        const encryptedAesKey = await encryptAESKeyWithRSA(aesKey, recipientPubKey);

        // Upload
        setProgressStep("Uploading encrypted file...");
        setEncryptionProgress(85);

        formData.append("file", encryptedBlob, `${file.name}.encrypted`);
        formData.append("encrypted_aes_key", encryptedAesKey);
        formData.append("recipient_username", selectedRecipient.username);

        const res = await fetch("http://127.0.0.1:8000/files/upload-e2e", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          let errorMsg = "Upload failed";
          if (data.detail) {
            if (typeof data.detail === "string") {
              errorMsg = data.detail;
            } else if (Array.isArray(data.detail)) {
              errorMsg = data.detail.map((e: any) => e.msg || JSON.stringify(e)).join(", ");
            } else if (typeof data.detail === "object") {
              errorMsg = data.detail.msg || data.detail.message || JSON.stringify(data.detail);
            }
          }
          throw new Error(errorMsg);
        }

        setEncryptionProgress(100);
        setProgressStep("Complete!");
        setSuccessMessage(`File encrypted and shared with ${selectedRecipient.username}`);
      } else {
        // Standard upload (server-side encryption)
        setProgressStep("Uploading file...");
        setEncryptionProgress(50);

        formData.append("file", file);

        const res = await fetch("http://127.0.0.1:8000/files/upload", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
          body: formData,
        });

        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          let errorMsg = "Upload failed";
          if (data.detail) {
            if (typeof data.detail === "string") {
              errorMsg = data.detail;
            } else if (Array.isArray(data.detail)) {
              errorMsg = data.detail.map((e: any) => e.msg || JSON.stringify(e)).join(", ");
            } else if (typeof data.detail === "object") {
              errorMsg = data.detail.msg || data.detail.message || JSON.stringify(data.detail);
            }
          }
          throw new Error(errorMsg);
        }

        setEncryptionProgress(100);
        setProgressStep("Complete!");
        setSuccessMessage("File uploaded and encrypted successfully");
      }

      setUploadStatus("success");
      setFile(null);
      setSelectedRecipient(null);
      setRecipientSearch("");
      if (fileInputRef.current) {
        fileInputRef.current.value = "";
      }
    } catch (err: any) {
      setErrorMessage(err.message || "Upload failed. Please try again.");
      setUploadStatus("error");
    } finally {
      setLoading(false);
      setTimeout(() => {
        setEncryptionProgress(0);
        setProgressStep("");
      }, 2000);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setFile(e.dataTransfer.files[0]);
      setUploadStatus("idle");
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return "0 Bytes";
    const k = 1024;
    const sizes = ["Bytes", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <div className="p-3 bg-gradient-to-br from-blue-500 to-cyan-400 rounded-2xl shadow-lg shadow-blue-500/30">
            <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
            </svg>
          </div>
          <div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-cyan-400 bg-clip-text text-transparent">
              Secure File Upload
            </h1>
            <p className="text-gray-400 mt-1">End-to-end encrypted file sharing</p>
          </div>
        </div>

        {/* Key Setup Banner */}
        {!hasKeys && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-xl animate-fadeIn">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 bg-yellow-500/20 rounded-full flex items-center justify-center flex-shrink-0">
                <svg className="w-5 h-5 text-yellow-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div className="flex-1">
                <p className="text-yellow-400 font-medium">Setup Encryption Keys</p>
                <p className="text-yellow-400/70 text-sm mt-1">
                  Generate your encryption keys to enable secure file sharing. Your private key stays on your device.
                </p>
                <button
                  onClick={setupKeys}
                  disabled={settingUpKeys}
                  className="mt-3 px-4 py-2 bg-yellow-500/20 hover:bg-yellow-500/30 text-yellow-400 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                >
                  {settingUpKeys ? (
                    <>
                      <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Generating Keys...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                      Generate Keys
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Main Upload Card */}
        <div className="backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-8 shadow-2xl">
          {/* Success Message */}
          {uploadStatus === "success" && (
            <div className="mb-6 p-4 bg-green-500/10 border border-green-500/30 rounded-xl flex items-center gap-3 animate-fadeIn">
              <div className="w-10 h-10 bg-green-500/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <div>
                <p className="text-green-400 font-medium">Success!</p>
                <p className="text-green-400/70 text-sm">{successMessage}</p>
              </div>
            </div>
          )}

          {/* Error Message */}
          {uploadStatus === "error" && errorMessage && (
            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 animate-shake">
              <div className="w-10 h-10 bg-red-500/20 rounded-full flex items-center justify-center">
                <svg className="w-5 h-5 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <div>
                <p className="text-red-400 font-medium">Upload failed</p>
                <p className="text-red-400/70 text-sm">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Mode Toggle */}
          <div className="flex gap-2 mb-6">
            <button
              onClick={() => setShareMode(false)}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                !shareMode
                  ? "bg-blue-500/20 text-blue-400 border border-blue-500/30"
                  : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
              </svg>
              Upload Only
            </button>
            <button
              onClick={() => setShareMode(true)}
              className={`flex-1 py-3 px-4 rounded-xl font-medium transition-all duration-300 flex items-center justify-center gap-2 ${
                shareMode
                  ? "bg-purple-500/20 text-purple-400 border border-purple-500/30"
                  : "bg-white/5 text-gray-400 border border-white/10 hover:bg-white/10"
              }`}
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              Upload & Share
            </button>
          </div>

          {/* Recipient Search (when sharing) */}
          {shareMode && (
            <div className="mb-6 animate-fadeIn">
              <label className="block text-sm font-medium text-gray-300 mb-2">Share with</label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search by username..."
                  value={recipientSearch}
                  onChange={(e) => {
                    setRecipientSearch(e.target.value);
                    setSelectedRecipient(null);
                  }}
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

              {/* Search Results */}
              {searchResults.length > 0 && !selectedRecipient && (
                <div className="mt-2 bg-white/5 border border-white/10 rounded-xl overflow-hidden">
                  {searchResults.map((user) => (
                    <button
                      key={user.id}
                      onClick={() => {
                        if (user.has_public_key) {
                          setSelectedRecipient(user);
                          setRecipientSearch(user.username);
                          setSearchResults([]);
                        }
                      }}
                      disabled={!user.has_public_key}
                      className={`w-full px-4 py-3 flex items-center gap-3 transition-colors text-left ${
                        user.has_public_key 
                          ? "hover:bg-white/10 cursor-pointer" 
                          : "opacity-60 cursor-not-allowed"
                      }`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                        user.has_public_key 
                          ? "bg-gradient-to-br from-purple-500 to-pink-500" 
                          : "bg-gray-600"
                      }`}>
                        {user.username[0].toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <p className={user.has_public_key ? "text-white font-medium" : "text-gray-400 font-medium"}>
                          {user.username}
                        </p>
                        {!user.has_public_key && (
                          <p className="text-xs text-yellow-400/70">Must login first to setup encryption</p>
                        )}
                      </div>
                      {user.has_public_key ? (
                        <span className="text-xs px-2 py-1 bg-green-500/20 text-green-400 rounded-full flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                          Ready
                        </span>
                      ) : (
                        <span className="text-xs px-2 py-1 bg-red-500/20 text-red-400 rounded-full">
                          Not ready
                        </span>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Selected Recipient */}
              {selectedRecipient && (
                <div className="mt-3 p-3 bg-purple-500/10 border border-purple-500/30 rounded-xl flex items-center gap-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center font-medium">
                    {selectedRecipient.username[0].toUpperCase()}
                  </div>
                  <div className="flex-1">
                    <p className="text-white font-medium">{selectedRecipient.username}</p>
                    <p className="text-purple-400/70 text-sm">Will receive encrypted file</p>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedRecipient(null);
                      setRecipientSearch("");
                    }}
                    className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  >
                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Drag & Drop Zone */}
          <div
            className={`relative border-2 border-dashed rounded-2xl p-12 text-center transition-all duration-300 ${
              dragActive
                ? "border-blue-500 bg-blue-500/10"
                : file
                ? "border-green-500/50 bg-green-500/5"
                : "border-white/20 hover:border-white/40 hover:bg-white/5"
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setUploadStatus("idle");
              }}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />

            {file ? (
              <div className="animate-fadeIn">
                <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-green-500/30">
                  <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <p className="text-lg font-medium text-white mb-1">{file.name}</p>
                <p className="text-gray-400 text-sm">{formatFileSize(file.size)}</p>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                    if (fileInputRef.current) fileInputRef.current.value = "";
                  }}
                  className="mt-4 text-sm text-gray-400 hover:text-red-400 transition-colors"
                >
                  Remove file
                </button>
              </div>
            ) : (
              <div>
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                </div>
                <p className="text-lg text-white mb-2">
                  <span className="text-blue-400">Click to upload</span> or drag and drop
                </p>
                <p className="text-gray-500 text-sm">Any file type supported</p>
              </div>
            )}
          </div>

          {/* Encryption Progress */}
          {loading && encryptionProgress > 0 && (
            <div className="mt-6 animate-fadeIn">
              <div className="flex items-center justify-between mb-2">
                <span className="text-sm text-gray-400">{progressStep}</span>
                <span className="text-sm text-blue-400">{encryptionProgress}%</span>
              </div>
              <div className="h-2 bg-white/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-blue-500 to-cyan-400 transition-all duration-500"
                  style={{ width: `${encryptionProgress}%` }}
                />
              </div>
            </div>
          )}

          {/* Security Features */}
          <div className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl">
              <div className="w-10 h-10 bg-blue-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <div>
                <p className="text-white text-sm font-medium">AES-256 Encrypted</p>
                <p className="text-gray-500 text-xs">Military-grade encryption</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl">
              <div className="w-10 h-10 bg-purple-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <div>
                <p className="text-white text-sm font-medium">RSA Key Exchange</p>
                <p className="text-gray-500 text-xs">Secure key sharing</p>
              </div>
            </div>

            <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl">
              <div className="w-10 h-10 bg-green-500/20 rounded-lg flex items-center justify-center">
                <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <div>
                <p className="text-white text-sm font-medium">Zero-Trust</p>
                <p className="text-gray-500 text-xs">Server can't decrypt</p>
              </div>
            </div>
          </div>

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={loading || !file || (shareMode && !selectedRecipient)}
            className={`w-full mt-6 py-4 font-semibold rounded-xl shadow-lg transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2 ${
              shareMode
                ? "bg-gradient-to-r from-purple-600 to-pink-500 hover:from-purple-500 hover:to-pink-400 shadow-purple-500/30 hover:shadow-purple-500/50"
                : "bg-gradient-to-r from-blue-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 shadow-blue-500/30 hover:shadow-blue-500/50"
            } text-white`}
          >
            {loading ? (
              <>
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                {shareMode ? "Encrypting & Sharing..." : "Encrypting & Uploading..."}
              </>
            ) : (
              <>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  {shareMode ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  )}
                </svg>
                {shareMode ? "Encrypt & Share" : "Encrypt & Upload"}
              </>
            )}
          </button>
        </div>

        {/* Architecture Info */}
        <div className="mt-8 backdrop-blur-xl bg-white/5 border border-white/10 rounded-3xl p-6">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
            <svg className="w-5 h-5 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            How E2E Encryption Works
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="p-4 bg-white/5 rounded-xl">
              <div className="w-8 h-8 bg-blue-500/20 rounded-lg flex items-center justify-center mb-3">
                <span className="text-blue-400 font-bold">1</span>
              </div>
              <p className="text-white font-medium mb-1">Encrypt Locally</p>
              <p className="text-gray-400">File is encrypted with AES-256 in your browser before upload</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl">
              <div className="w-8 h-8 bg-purple-500/20 rounded-lg flex items-center justify-center mb-3">
                <span className="text-purple-400 font-bold">2</span>
              </div>
              <p className="text-white font-medium mb-1">Key Exchange</p>
              <p className="text-gray-400">AES key is encrypted with recipient's RSA public key</p>
            </div>
            <div className="p-4 bg-white/5 rounded-xl">
              <div className="w-8 h-8 bg-green-500/20 rounded-lg flex items-center justify-center mb-3">
                <span className="text-green-400 font-bold">3</span>
              </div>
              <p className="text-white font-medium mb-1">Blind Storage</p>
              <p className="text-gray-400">Server stores encrypted data - cannot decrypt anything</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
