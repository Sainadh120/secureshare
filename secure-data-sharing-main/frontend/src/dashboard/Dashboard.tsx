import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import { 
  Shield, 
  Lock, 
  Upload, 
  FileText, 
  Users, 
  Activity,
  Zap,
  CheckCircle,
  ArrowRight,
  Brain
} from "lucide-react";
import {
  generateRSAKeyPair,
  exportPublicKey,
  exportPrivateKey,
  storePrivateKey,
  storePublicKey,
  hasStoredKeys,
  getStoredPublicKey,
} from "../utils/crypto";

export default function Dashboard() {
  const { username, token } = useAuth();
  const [stats, setStats] = useState({
    totalFiles: 0,
    sharedWithMe: 0,
    activeShares: 0
  });

  // Auto-sync encryption keys on login - prefer server keys over local
  useEffect(() => {
    const syncKeysFromServer = async () => {
      if (!token) return;
      
      try {
        // First, try to get keys from server
        const res = await fetch("http://127.0.0.1:8000/users/my-keys", {
          headers: { Authorization: `Bearer ${token}` },
        });
        
        if (res.ok) {
          const data = await res.json();
          
          // If server has keys, use them (they are the authoritative source)
          if (data.has_keys && data.public_key && data.private_key) {
            storePublicKey(data.public_key);
            storePrivateKey(data.private_key);
            console.log("Encryption keys synced from server");
            return;
          }
        }
        
        // If no server keys, check if we have local keys to upload
        if (hasStoredKeys()) {
          const localPubKey = getStoredPublicKey();
          if (localPubKey) {
            // Sync local keys to server
            await fetch("http://127.0.0.1:8000/users/public-key", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({ public_key: localPubKey }),
            });
            console.log("Local keys synced to server");
          }
          return;
        }
        
        // No keys anywhere - generate new ones
        const keyPair = await generateRSAKeyPair();
        const publicKeyPem = await exportPublicKey(keyPair.publicKey);
        const privateKeyPem = await exportPrivateKey(keyPair.privateKey);

        // Store locally
        storePublicKey(publicKeyPem);
        storePrivateKey(privateKeyPem);

        // Send to server (both keys for backup)
        await fetch("http://127.0.0.1:8000/users/sync-keys", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ 
            public_key: publicKeyPem,
            private_key: privateKeyPem 
          }),
        });
        
        console.log("New encryption keys generated and synced");
      } catch (err) {
        console.error("Failed to sync encryption keys:", err);
      }
    };
    
    syncKeysFromServer();
  }, [token]);

  useEffect(() => {
    // Fetch user stats
    const fetchStats = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      
      try {
        const [myFilesRes, sharedRes] = await Promise.all([
          fetch("http://127.0.0.1:8000/files/list", {
            headers: { Authorization: `Bearer ${token}` }
          }),
          fetch("http://127.0.0.1:8000/files/shared-with-me", {
            headers: { Authorization: `Bearer ${token}` }
          })
        ]);
        
        if (myFilesRes.ok && sharedRes.ok) {
          const myFiles = await myFilesRes.json();
          const shared = await sharedRes.json();
          console.log("My Files:", myFiles);
          console.log("Shared:", shared);
          setStats({
            totalFiles: Array.isArray(myFiles) ? myFiles.length : 0,
            sharedWithMe: Array.isArray(shared) ? shared.length : 0,
            activeShares: Array.isArray(myFiles) ? myFiles.filter((f: any) => f.shared_with?.length > 0).length : 0
          });
        } else {
          console.error("API Error - myFiles:", myFilesRes.status, "shared:", sharedRes.status);
        }
      } catch (err) {
        console.error("Failed to fetch stats", err);
      }
    };
    fetchStats();
  }, []);

  const securityFeatures = [
    {
      icon: Lock,
      title: "Hybrid Encryption",
      description: "AES-256-GCM + RSA-2048",
      status: "ACTIVE",
      statusColor: "text-emerald-400",
      bgColor: "from-emerald-500/20 to-emerald-500/5"
    },
    {
      icon: Brain,
      title: "ML Defense",
      description: "FGSM Attack Protection",
      status: "HARDENED",
      statusColor: "text-purple-400",
      bgColor: "from-purple-500/20 to-purple-500/5"
    },
    {
      icon: Shield,
      title: "Zero-Knowledge",
      description: "Only You Hold The Keys",
      status: "ENABLED",
      statusColor: "text-cyan-400",
      bgColor: "from-cyan-500/20 to-cyan-500/5"
    }
  ];

  const quickActions = [
    { icon: Upload, label: "Upload & Share", path: "/upload", color: "from-emerald-600 to-teal-600" },
    { icon: FileText, label: "My Files", path: "/my-files", color: "from-blue-600 to-cyan-600" },
    { icon: Users, label: "Shared With Me", path: "/shared-with-me", color: "from-purple-600 to-pink-600" },
    { icon: Activity, label: "ML Defense", path: "/ml-defense", color: "from-orange-600 to-red-600" }
  ];

  return (
    <div className="text-white">
      {/* Welcome Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">
          Welcome back, <span className="text-emerald-400">{username || "User"}</span>
        </h1>
        <p className="text-gray-500">Your secure data dashboard</p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center">
              <FileText className="w-6 h-6 text-emerald-400" />
            </div>
            <span className="text-3xl font-bold">{stats.totalFiles}</span>
          </div>
          <p className="text-gray-400">Encrypted Files</p>
        </div>

        <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center">
              <Users className="w-6 h-6 text-purple-400" />
            </div>
            <span className="text-3xl font-bold">{stats.sharedWithMe}</span>
          </div>
          <p className="text-gray-400">Files Shared With You</p>
        </div>

        <div className="bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-2xl p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center">
              <Zap className="w-6 h-6 text-cyan-400" />
            </div>
            <span className="text-3xl font-bold">{stats.activeShares}</span>
          </div>
          <p className="text-gray-400">Active Shares</p>
        </div>
      </div>

      {/* Security Status */}
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4 flex items-center gap-2">
          <Shield className="w-5 h-5 text-emerald-400" />
          Security Status
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {securityFeatures.map((feature, idx) => (
            <div
              key={idx}
              className={`bg-gradient-to-br ${feature.bgColor} border border-white/10 rounded-2xl p-6 hover:border-white/20 transition-all`}
            >
              <div className="flex items-start justify-between mb-4">
                <feature.icon className="w-8 h-8 text-white/80" />
                <div className="flex items-center gap-1.5">
                  <CheckCircle className={`w-4 h-4 ${feature.statusColor}`} />
                  <span className={`text-sm font-semibold ${feature.statusColor}`}>
                    {feature.status}
                  </span>
                </div>
              </div>
              <h3 className="font-semibold text-lg mb-1">{feature.title}</h3>
              <p className="text-gray-400 text-sm">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Quick Actions */}
      <div>
        <h2 className="text-xl font-semibold mb-4">Quick Actions</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {quickActions.map((action, idx) => (
            <Link
              key={idx}
              to={action.path}
              className={`bg-gradient-to-br ${action.color} rounded-2xl p-5 hover:scale-[1.02] transition-transform group`}
            >
              <action.icon className="w-8 h-8 mb-3" />
              <div className="flex items-center justify-between">
                <span className="font-semibold">{action.label}</span>
                <ArrowRight className="w-5 h-5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
            </Link>
          ))}
        </div>
      </div>

      {/* Encryption Info */}
      <div className="mt-8 p-6 bg-gradient-to-br from-emerald-900/20 to-transparent border border-emerald-500/20 rounded-2xl">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
            <Lock className="w-6 h-6 text-emerald-400" />
          </div>
          <div>
            <h3 className="font-semibold text-lg mb-2">End-to-End Encrypted</h3>
            <p className="text-gray-400 text-sm">
              All your files are encrypted with AES-256-GCM before leaving your device. 
              RSA-2048 is used for secure key exchange. Only you and your intended recipients 
              can decrypt your files. Not even our servers can access your data.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
