import { Link } from "react-router-dom";
import { 
  Shield, 
  Lock, 
  Brain, 
  Key, 
  Server, 
  Eye, 
  EyeOff,
  FileCheck, 
  ArrowLeft,
  ArrowRight,
  CheckCircle,
  Zap,
  Activity,
  Database,
  Cpu,
  Globe,
  AlertTriangle,
  Target,
  Layers
} from "lucide-react";

const SecurityPage = () => {
  const encryptionSteps = [
    {
      icon: FileCheck,
      title: "File Selection",
      description: "User selects file for secure upload",
      color: "blue"
    },
    {
      icon: Key,
      title: "AES Key Generation",
      description: "256-bit random key generated in browser",
      color: "emerald"
    },
    {
      icon: Lock,
      title: "File Encryption",
      description: "AES-256-GCM encrypts file data",
      color: "teal"
    },
    {
      icon: Shield,
      title: "Key Wrapping",
      description: "RSA-2048 encrypts the AES key",
      color: "purple"
    },
    {
      icon: Server,
      title: "Secure Storage",
      description: "Only encrypted data stored on server",
      color: "cyan"
    }
  ];

  const mlDefenseFeatures = [
    {
      title: "FGSM Attack Detection",
      description: "Fast Gradient Sign Method perturbations are detected and neutralized before they can affect model predictions.",
      icon: AlertTriangle
    },
    {
      title: "Adversarial Training",
      description: "Models are trained with adversarial examples to build inherent robustness against gradient-based attacks.",
      icon: Target
    },
    {
      title: "Input Validation",
      description: "All inputs are validated and sanitized to prevent injection of malicious perturbations.",
      icon: Shield
    },
    {
      title: "Model Hardening",
      description: "Neural network weights are optimized to minimize sensitivity to small input changes.",
      icon: Layers
    }
  ];

  const securityComparison = [
    { feature: "End-to-End Encryption", us: true, others: false },
    { feature: "Zero-Knowledge Architecture", us: true, others: false },
    { feature: "Client-Side Key Generation", us: true, others: false },
    { feature: "ML Attack Protection", us: true, others: false },
    { feature: "User Key Ownership", us: true, others: false },
    { feature: "No Server-Side Decryption", us: true, others: false },
  ];

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 right-0 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 left-0 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div 
          className="absolute inset-0 opacity-[0.02]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-black/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-3 group">
            <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:shadow-emerald-500/40 transition-all">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <span className="text-xl font-bold block">SecureShare</span>
              <span className="text-xs text-emerald-400">Security Overview</span>
            </div>
          </Link>

          <div className="flex items-center gap-6">
            <Link to="/" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2">
              <ArrowLeft className="w-4 h-4" />
              Back to Home
            </Link>
            <Link
              to="/signup"
              className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl font-medium transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40"
            >
              Get Started
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="pt-32 pb-20 relative px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-8 animate-fadeIn">
            <Lock className="w-4 h-4 text-emerald-400" />
            <span className="text-emerald-400 text-sm font-medium">Zero-Trust Security Architecture</span>
          </div>
          
          <h1 className="text-5xl md:text-6xl font-bold mb-6 animate-fadeInUp">
            How We Protect
            <br />
            <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
              Your Data
            </span>
          </h1>
          
          <p className="text-xl text-gray-400 max-w-2xl mx-auto animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
            Deep dive into the security architecture that keeps your files safe. 
            Military-grade encryption combined with ML-powered defense.
          </p>
        </div>
      </section>

      {/* Hybrid Encryption Section */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-6">
              <Lock className="w-4 h-4 text-blue-400" />
              <span className="text-blue-400 text-sm font-medium">Hybrid Encryption</span>
            </div>
            <h2 className="text-4xl font-bold mb-4">
              AES-256 + RSA-2048
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              The same encryption standards used by governments and financial institutions
            </p>
          </div>

          {/* Encryption Flow */}
          <div className="relative">
            {/* Connection Line */}
            <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-gradient-to-r from-blue-500 via-emerald-500 to-purple-500 hidden lg:block" style={{ transform: 'translateY(-50%)' }} />
            
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
              {encryptionSteps.map((step, idx) => (
                <div key={idx} className="relative group">
                  <div className={`p-6 bg-gradient-to-br from-${step.color}-500/10 to-transparent border border-${step.color}-500/20 rounded-2xl hover:border-${step.color}-500/40 transition-all hover:scale-105`}>
                    <div className={`w-14 h-14 bg-${step.color}-500/20 rounded-xl flex items-center justify-center mb-4 group-hover:scale-110 transition-transform`}>
                      <step.icon className={`w-7 h-7 text-${step.color}-400`} />
                    </div>
                    <div className={`absolute -top-3 -right-3 w-8 h-8 bg-${step.color}-500 rounded-lg flex items-center justify-center text-sm font-bold shadow-lg`}>
                      {idx + 1}
                    </div>
                    <h3 className="font-bold mb-2">{step.title}</h3>
                    <p className="text-sm text-gray-500">{step.description}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Technical Details */}
          <div className="grid md:grid-cols-2 gap-8 mt-16">
            <div className="p-8 bg-gradient-to-br from-emerald-500/10 to-transparent border border-emerald-500/20 rounded-2xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-emerald-500/20 rounded-xl flex items-center justify-center">
                  <Lock className="w-7 h-7 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">AES-256-GCM</h3>
                  <p className="text-emerald-400 text-sm">Symmetric Encryption</p>
                </div>
              </div>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-400">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  256-bit encryption key (2^256 possible combinations)
                </li>
                <li className="flex items-center gap-3 text-gray-400">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  Galois/Counter Mode for authenticated encryption
                </li>
                <li className="flex items-center gap-3 text-gray-400">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  Random IV generated for each encryption
                </li>
                <li className="flex items-center gap-3 text-gray-400">
                  <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0" />
                  Integrity verification via authentication tag
                </li>
              </ul>
            </div>

            <div className="p-8 bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 rounded-2xl">
              <div className="flex items-center gap-4 mb-6">
                <div className="w-14 h-14 bg-purple-500/20 rounded-xl flex items-center justify-center">
                  <Key className="w-7 h-7 text-purple-400" />
                </div>
                <div>
                  <h3 className="text-xl font-bold">RSA-2048-OAEP</h3>
                  <p className="text-purple-400 text-sm">Asymmetric Encryption</p>
                </div>
              </div>
              <ul className="space-y-3">
                <li className="flex items-center gap-3 text-gray-400">
                  <CheckCircle className="w-5 h-5 text-purple-400 flex-shrink-0" />
                  2048-bit key pairs for maximum security
                </li>
                <li className="flex items-center gap-3 text-gray-400">
                  <CheckCircle className="w-5 h-5 text-purple-400 flex-shrink-0" />
                  OAEP padding prevents known attacks
                </li>
                <li className="flex items-center gap-3 text-gray-400">
                  <CheckCircle className="w-5 h-5 text-purple-400 flex-shrink-0" />
                  Private key never leaves your device
                </li>
                <li className="flex items-center gap-3 text-gray-400">
                  <CheckCircle className="w-5 h-5 text-purple-400 flex-shrink-0" />
                  Public key shared for secure key exchange
                </li>
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* ML Defense Section */}
      <section className="py-20 px-6 bg-gradient-to-b from-black via-purple-950/10 to-black">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-6">
              <Brain className="w-4 h-4 text-purple-400" />
              <span className="text-purple-400 text-sm font-medium">ML Security</span>
            </div>
            <h2 className="text-4xl font-bold mb-4">
              FGSM Defense Engine
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Protecting against adversarial machine learning attacks
            </p>
          </div>

          {/* What is FGSM */}
          <div className="p-8 bg-gradient-to-br from-purple-900/30 to-pink-900/30 border border-purple-500/20 rounded-2xl mb-12">
            <div className="grid md:grid-cols-2 gap-8 items-center">
              <div>
                <h3 className="text-2xl font-bold mb-4">What is FGSM?</h3>
                <p className="text-gray-400 mb-4">
                  <strong className="text-white">Fast Gradient Sign Method (FGSM)</strong> is an adversarial attack technique that adds carefully crafted perturbations to input data to fool machine learning models.
                </p>
                <p className="text-gray-400 mb-4">
                  These perturbations are often invisible to humans but can cause models to make incorrect predictions with high confidence.
                </p>
                <div className="flex items-center gap-2 text-purple-400">
                  <Activity className="w-5 h-5" />
                  <span className="font-medium">Our defense: Adversarial Training</span>
                </div>
              </div>
              <div className="p-6 bg-black/40 rounded-xl border border-white/10">
                <div className="font-mono text-sm">
                  <div className="text-gray-500 mb-2"># FGSM Attack Formula</div>
                  <div className="text-emerald-400">x_adv = x + ε × sign(∇<sub>x</sub>J(θ, x, y))</div>
                  <div className="mt-4 text-gray-500 text-xs">
                    <p>x_adv = adversarial example</p>
                    <p>ε = perturbation magnitude</p>
                    <p>∇ = gradient of loss function</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Defense Features */}
          <div className="grid md:grid-cols-2 gap-6">
            {mlDefenseFeatures.map((feature, idx) => (
              <div key={idx} className="p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-purple-500/30 transition-all group">
                <div className="flex items-start gap-4">
                  <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0 group-hover:scale-110 transition-transform">
                    <feature.icon className="w-6 h-6 text-purple-400" />
                  </div>
                  <div>
                    <h3 className="font-bold text-lg mb-2">{feature.title}</h3>
                    <p className="text-gray-500 text-sm">{feature.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Zero-Knowledge Section */}
      <section className="py-20 px-6 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-500/10 border border-cyan-500/20 rounded-full mb-6">
                <EyeOff className="w-4 h-4 text-cyan-400" />
                <span className="text-cyan-400 text-sm font-medium">Zero-Knowledge</span>
              </div>
              <h2 className="text-4xl font-bold mb-6">
                We Can't See
                <br />
                <span className="text-cyan-400">Your Data</span>
              </h2>
              <p className="text-gray-400 text-lg mb-8">
                Our zero-knowledge architecture means your files are encrypted before they ever reach our servers. 
                We store only encrypted blobs that are meaningless without your private key.
              </p>

              <div className="space-y-4">
                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-cyan-400" />
                  <span>Encryption happens in your browser</span>
                </div>
                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-cyan-400" />
                  <span>Private keys never leave your device</span>
                </div>
                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-cyan-400" />
                  <span>Server stores only encrypted data</span>
                </div>
                <div className="flex items-center gap-3 p-4 bg-white/5 rounded-xl">
                  <CheckCircle className="w-6 h-6 text-cyan-400" />
                  <span>No backdoors, no master keys</span>
                </div>
              </div>
            </div>

            {/* Visual */}
            <div className="relative p-8 bg-gradient-to-br from-cyan-900/30 to-blue-900/30 border border-cyan-500/20 rounded-3xl">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl">
                  <div className="flex items-center gap-3">
                    <Eye className="w-5 h-5 text-gray-400" />
                    <span className="text-gray-400">What you see</span>
                  </div>
                  <span className="font-mono text-sm text-white">confidential.pdf</span>
                </div>
                
                <div className="flex justify-center">
                  <div className="w-px h-8 bg-gradient-to-b from-cyan-500 to-cyan-500/0" />
                </div>

                <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-cyan-500/30">
                  <div className="flex items-center gap-3">
                    <Lock className="w-5 h-5 text-cyan-400" />
                    <span className="text-cyan-400">Encrypted</span>
                  </div>
                  <span className="font-mono text-xs text-gray-600">a7F9x2K...</span>
                </div>

                <div className="flex justify-center">
                  <div className="w-px h-8 bg-gradient-to-b from-cyan-500/0 to-red-500" />
                </div>

                <div className="flex items-center justify-between p-4 bg-black/40 rounded-xl border border-red-500/30">
                  <div className="flex items-center gap-3">
                    <EyeOff className="w-5 h-5 text-red-400" />
                    <span className="text-red-400">What we see</span>
                  </div>
                  <span className="font-mono text-xs text-gray-600">????????????</span>
                </div>
              </div>

              <div className="absolute -bottom-4 -right-4 px-4 py-2 bg-cyan-500 rounded-xl shadow-lg shadow-cyan-500/30">
                <span className="font-bold text-sm">Zero Access</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Comparison Table */}
      <section className="py-20 px-6 bg-gradient-to-b from-black via-emerald-950/10 to-black">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-4xl font-bold mb-4">Security Comparison</h2>
            <p className="text-gray-400">How we stack up against traditional cloud storage</p>
          </div>

          <div className="overflow-hidden rounded-2xl border border-white/10">
            <table className="w-full">
              <thead>
                <tr className="bg-white/5">
                  <th className="text-left p-4 font-semibold">Feature</th>
                  <th className="text-center p-4 font-semibold text-emerald-400">SecureShare</th>
                  <th className="text-center p-4 font-semibold text-gray-500">Others</th>
                </tr>
              </thead>
              <tbody>
                {securityComparison.map((row, idx) => (
                  <tr key={idx} className="border-t border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 text-gray-300">{row.feature}</td>
                    <td className="p-4 text-center">
                      {row.us ? (
                        <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto" />
                      ) : (
                        <span className="text-red-400">✕</span>
                      )}
                    </td>
                    <td className="p-4 text-center">
                      {row.others ? (
                        <CheckCircle className="w-6 h-6 text-emerald-400 mx-auto" />
                      ) : (
                        <span className="text-red-400">✕</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-20 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="p-12 bg-gradient-to-br from-emerald-900/40 to-teal-900/40 border border-emerald-500/20 rounded-3xl">
            <Shield className="w-16 h-16 text-emerald-400 mx-auto mb-6" />
            <h2 className="text-4xl font-bold mb-4">Ready for Real Security?</h2>
            <p className="text-gray-400 mb-8 max-w-xl mx-auto">
              Experience true data protection with military-grade encryption and ML-powered defense.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/signup"
                className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl font-semibold text-lg transition-all shadow-xl shadow-emerald-500/25 hover:scale-105"
              >
                Start Free
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/signin"
                className="px-8 py-4 text-gray-300 hover:text-white font-semibold transition-colors"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-8 px-6">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-emerald-400" />
            <span className="font-bold">SecureShare</span>
          </div>
          <p className="text-gray-600 text-sm">© 2025 SecureShare. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
};

export default SecurityPage;
