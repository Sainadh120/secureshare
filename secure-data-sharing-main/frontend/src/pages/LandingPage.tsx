import { Link } from "react-router-dom";
import { 
  Shield, 
  Lock, 
  Brain, 
  Key, 
  Upload, 
  Users, 
  FileCheck, 
  ArrowRight,
  CheckCircle,
  Zap,
  Server,
  EyeOff,
  ChevronDown,
  Star,
  Award,
  Fingerprint,
  Globe,
  Activity,
  Database,
  Cpu
} from "lucide-react";

const LandingPage = () => {
  const features = [
    {
      icon: Brain,
      title: "ML-Powered Defense",
      description: "FGSM adversarial training protects against machine learning attacks. Our models are hardened against gradient-based perturbations.",
      gradient: "from-purple-500 to-pink-500",
      shadowColor: "shadow-purple-500/25",
      stats: "99.2% Attack Prevention"
    },
    {
      icon: Lock,
      title: "Hybrid Encryption",
      description: "AES-256-GCM for lightning-fast file encryption combined with RSA-2048 for secure key exchange. Military-grade protection.",
      gradient: "from-emerald-500 to-teal-500",
      shadowColor: "shadow-emerald-500/25",
      stats: "256-bit AES + 2048-bit RSA"
    },
    {
      icon: Key,
      title: "User Sovereignty",
      description: "Your private keys never leave your device. Zero-knowledge architecture means even we can't access your data.",
      gradient: "from-blue-500 to-cyan-500",
      shadowColor: "shadow-blue-500/25",
      stats: "100% Zero-Knowledge"
    },
  ];

  const stats = [
    { value: "256-bit", label: "AES Encryption", icon: Lock },
    { value: "2048-bit", label: "RSA Keys", icon: Key },
    { value: "100%", label: "Zero-Knowledge", icon: EyeOff },
    { value: "FGSM", label: "ML Hardened", icon: Brain },
  ];

  const howItWorks = [
    {
      step: "01",
      title: "Generate Your Keys",
      description: "Create your RSA key pair locally. Your private key is stored only on your device - never uploaded to any server.",
      icon: Fingerprint,
      color: "emerald"
    },
    {
      step: "02",
      title: "Upload & Encrypt",
      description: "Files are encrypted with AES-256-GCM before leaving your browser. Only encrypted data touches our servers.",
      icon: Upload,
      color: "blue"
    },
    {
      step: "03",
      title: "Share Securely",
      description: "Share files by encrypting the AES key with recipient's public RSA key. Only they can decrypt it.",
      icon: Users,
      color: "purple"
    },
    {
      step: "04",
      title: "Recipient Decrypts",
      description: "Recipients use their private key to decrypt the AES key, then decrypt the file. True E2E encryption.",
      icon: FileCheck,
      color: "pink"
    },
  ];

  const securityFeatures = [
    { text: "End-to-end encryption (E2E)", icon: Lock },
    { text: "Zero-knowledge architecture", icon: EyeOff },
    { text: "Client-side key generation", icon: Key },
    { text: "No plaintext data on servers", icon: Server },
    { text: "FGSM adversarial training", icon: Brain },
    { text: "Secure key exchange protocol", icon: Shield }
  ];

  const techStack = [
    { name: "AES-256-GCM", desc: "Symmetric Encryption" },
    { name: "RSA-2048-OAEP", desc: "Asymmetric Encryption" },
    { name: "FGSM Defense", desc: "ML Security" },
    { name: "Web Crypto API", desc: "Browser Native" },
  ];

  return (
    <div className="min-h-screen bg-black text-white overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-emerald-500/10 rounded-full blur-[120px] animate-pulse" />
        <div className="absolute bottom-0 right-1/4 w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[100px] animate-pulse" style={{ animationDelay: '1s' }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[400px] h-[400px] bg-blue-500/10 rounded-full blur-[80px] animate-pulse" style={{ animationDelay: '2s' }} />
        
        {/* Grid Pattern */}
        <div 
          className="absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`,
            backgroundSize: '60px 60px'
          }}
        />
      </div>

      {/* Navigation */}
      <nav className="relative z-50 border-b border-white/5 bg-black/50 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <Link to="/" className="flex items-center gap-3 group">
              <div className="w-11 h-11 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center shadow-lg shadow-emerald-500/25 group-hover:shadow-emerald-500/40 transition-all group-hover:scale-105">
                <Shield className="w-6 h-6 text-white" />
              </div>
              <div>
                <span className="text-xl font-bold block">SecureShare</span>
                <span className="text-xs text-emerald-400">Zero-Trust Platform</span>
              </div>
            </Link>
            
            <div className="hidden md:flex items-center gap-8">
              <Link to="/security" className="text-gray-400 hover:text-white transition-colors flex items-center gap-2">
                <Shield className="w-4 h-4" />
                Security
              </Link>
              <a href="#features" className="text-gray-400 hover:text-white transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-gray-400 hover:text-white transition-colors">
                How It Works
              </a>
            </div>

            <div className="flex items-center gap-4">
              <Link
                to="/signin"
                className="px-5 py-2.5 text-gray-300 hover:text-white transition-colors font-medium"
              >
                Sign In
              </Link>
              <Link
                to="/signup"
                className="px-5 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl font-medium transition-all shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-105"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative pt-20 pb-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto">
            {/* Badge */}
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-8 animate-fadeIn">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-emerald-400 text-sm font-medium">Enterprise-Grade Security Platform</span>
            </div>

            {/* Main Headline */}
            <h1 className="text-5xl md:text-7xl font-bold mb-6 leading-tight animate-fadeInUp">
              Secure File Sharing
              <br />
              <span className="bg-gradient-to-r from-emerald-400 via-teal-400 to-cyan-400 bg-clip-text text-transparent">
                Zero-Trust Architecture
              </span>
            </h1>

            <p className="text-xl text-gray-400 mb-10 max-w-2xl mx-auto animate-fadeInUp" style={{ animationDelay: '0.2s' }}>
              Military-grade encryption meets ML-powered defense. Your files are encrypted before they leave your device. 
              <span className="text-white font-medium"> Not even we can access your data.</span>
            </p>

            {/* CTA Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16 animate-fadeInUp" style={{ animationDelay: '0.3s' }}>
              <Link
                to="/signup"
                className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl font-semibold text-lg transition-all shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-105"
              >
                Start Secure Sharing
                <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </Link>
              <Link
                to="/security"
                className="flex items-center gap-2 px-8 py-4 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 rounded-xl font-semibold text-lg transition-all"
              >
                <Shield className="w-5 h-5" />
                View Security Details
              </Link>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto animate-fadeInUp" style={{ animationDelay: '0.4s' }}>
              {stats.map((stat, idx) => (
                <div key={idx} className="group text-center p-5 bg-white/5 rounded-2xl border border-white/5 hover:border-emerald-500/30 transition-all hover:scale-105 hover:bg-white/10">
                  <stat.icon className="w-6 h-6 text-emerald-400 mx-auto mb-3 group-hover:scale-110 transition-transform" />
                  <div className="text-2xl font-bold text-white mb-1">{stat.value}</div>
                  <div className="text-xs text-gray-500 uppercase tracking-wide">{stat.label}</div>
                </div>
              ))}
            </div>

            {/* Tech Stack Pills */}
            <div className="flex flex-wrap justify-center gap-3 mt-12 animate-fadeInUp" style={{ animationDelay: '0.5s' }}>
              {techStack.map((tech, idx) => (
                <div key={idx} className="px-4 py-2 bg-white/5 border border-white/10 rounded-full flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-emerald-400" />
                  <span className="text-sm font-medium">{tech.name}</span>
                  <span className="text-xs text-gray-500">• {tech.desc}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <a href="#features" className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce cursor-pointer">
          <ChevronDown className="w-6 h-6 text-gray-600" />
        </a>
      </section>

      {/* Features Section */}
      <section id="features" className="relative py-32 px-6 bg-gradient-to-b from-black via-emerald-950/10 to-black">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-purple-500/10 border border-purple-500/20 rounded-full mb-6">
              <Star className="w-4 h-4 text-purple-400" />
              <span className="text-purple-400 text-sm font-medium">Core Features</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              Built for <span className="text-emerald-400">Maximum Security</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Three pillars of protection working together to keep your data absolutely safe
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {features.map((feature, idx) => (
              <div
                key={idx}
                className={`group relative p-8 bg-gradient-to-br from-white/5 to-white/0 border border-white/10 rounded-3xl hover:border-white/20 transition-all duration-500 hover:scale-[1.02] hover:${feature.shadowColor}`}
              >
                {/* Glow Effect */}
                <div className={`absolute inset-0 bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-10 rounded-3xl transition-opacity duration-500`} />
                
                <div className="relative z-10">
                  <div className={`w-16 h-16 bg-gradient-to-br ${feature.gradient} rounded-2xl flex items-center justify-center mb-6 shadow-lg ${feature.shadowColor} group-hover:scale-110 transition-transform`}>
                    <feature.icon className="w-8 h-8 text-white" />
                  </div>
                  
                  {/* Stats Badge */}
                  <div className="inline-flex items-center gap-1 px-3 py-1 bg-white/10 rounded-full text-xs font-medium text-gray-300 mb-4">
                    <Activity className="w-3 h-3" />
                    {feature.stats}
                  </div>
                  
                  <h3 className="text-2xl font-bold mb-3">{feature.title}</h3>
                  <p className="text-gray-400 leading-relaxed">{feature.description}</p>
                  
                  {/* Learn More Link */}
                  <Link to="/security" className="inline-flex items-center gap-2 mt-6 text-emerald-400 hover:text-emerald-300 transition-colors text-sm font-medium">
                    Learn more <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section id="how-it-works" className="relative py-32 px-6">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-blue-500/10 border border-blue-500/20 rounded-full mb-6">
              <Zap className="w-4 h-4 text-blue-400" />
              <span className="text-blue-400 text-sm font-medium">Simple Process</span>
            </div>
            <h2 className="text-4xl md:text-5xl font-bold mb-4">
              How It <span className="text-blue-400">Works</span>
            </h2>
            <p className="text-gray-400 text-lg max-w-2xl mx-auto">
              Four simple steps to complete end-to-end encrypted file sharing
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {howItWorks.map((step, idx) => (
              <div
                key={idx}
                className="group relative p-6 bg-white/5 border border-white/10 rounded-2xl hover:border-white/20 transition-all hover:scale-[1.02]"
              >
                {/* Step Number */}
                <div className={`absolute -top-4 -right-4 w-12 h-12 bg-${step.color}-500 rounded-xl flex items-center justify-center shadow-lg shadow-${step.color}-500/30`}>
                  <span className="text-white font-bold">{step.step}</span>
                </div>
                
                <div className={`w-14 h-14 bg-${step.color}-500/20 rounded-xl flex items-center justify-center mb-4`}>
                  <step.icon className={`w-7 h-7 text-${step.color}-400`} />
                </div>
                <h3 className="text-lg font-bold mb-2">{step.title}</h3>
                <p className="text-gray-500 text-sm leading-relaxed">{step.description}</p>
                
                {/* Connector Line (not on last item) */}
                {idx < 3 && (
                  <div className="hidden lg:block absolute top-1/2 -right-3 w-6 h-0.5 bg-gradient-to-r from-white/20 to-transparent" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Checklist */}
      <section className="relative py-32 px-6 bg-gradient-to-b from-black via-purple-950/10 to-black">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div>
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-emerald-500/10 border border-emerald-500/20 rounded-full mb-6">
                <Award className="w-4 h-4 text-emerald-400" />
                <span className="text-emerald-400 text-sm font-medium">Security First</span>
              </div>
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Enterprise-Grade
                <br />
                <span className="text-emerald-400">Security Features</span>
              </h2>
              <p className="text-gray-400 text-lg mb-8">
                Every aspect of SecureShare is designed with security as the primary concern. 
                We use the same encryption standards trusted by governments and financial institutions.
              </p>

              <div className="grid gap-3">
                {securityFeatures.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-4 bg-white/5 rounded-xl hover:bg-white/10 transition-all group">
                    <div className="w-10 h-10 bg-emerald-500/20 rounded-lg flex items-center justify-center group-hover:scale-110 transition-transform">
                      <feature.icon className="w-5 h-5 text-emerald-400" />
                    </div>
                    <span className="text-gray-300 font-medium">{feature.text}</span>
                    <CheckCircle className="w-5 h-5 text-emerald-400 ml-auto" />
                  </div>
                ))}
              </div>
            </div>

            <div className="relative">
              {/* Visual Illustration */}
              <div className="relative p-8 bg-gradient-to-br from-emerald-900/30 to-purple-900/30 border border-white/10 rounded-3xl">
                <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/5 to-purple-500/5 rounded-3xl" />
                
                <div className="relative z-10 space-y-4">
                  {/* Title */}
                  <div className="text-center mb-6">
                    <h3 className="text-lg font-bold text-emerald-400">Encryption Flow</h3>
                    <p className="text-xs text-gray-500">How your data stays protected</p>
                  </div>
                  
                  {/* Encryption Flow Visualization */}
                  <div className="flex items-center gap-4 p-4 bg-black/40 rounded-xl border border-white/5">
                    <div className="w-12 h-12 bg-blue-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <FileCheck className="w-6 h-6 text-blue-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-white">Your File</div>
                      <div className="font-mono text-xs text-gray-600 truncate">confidential_doc.pdf</div>
                    </div>
                  </div>

                  <div className="flex justify-center py-2">
                    <div className="flex flex-col items-center">
                      <div className="w-px h-6 bg-gradient-to-b from-blue-500 to-emerald-500" />
                      <div className="px-3 py-1 bg-emerald-500/20 rounded-full text-xs text-emerald-400 font-medium">
                        AES-256-GCM
                      </div>
                      <div className="w-px h-6 bg-gradient-to-b from-emerald-500 to-emerald-500" />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-black/40 rounded-xl border border-emerald-500/30">
                    <div className="w-12 h-12 bg-emerald-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Lock className="w-6 h-6 text-emerald-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-emerald-400">Encrypted</div>
                      <div className="font-mono text-xs text-gray-600 truncate">xK9#mL2$vN8@pQ7...</div>
                    </div>
                  </div>

                  <div className="flex justify-center py-2">
                    <div className="flex flex-col items-center">
                      <div className="w-px h-6 bg-gradient-to-b from-emerald-500 to-purple-500" />
                      <div className="px-3 py-1 bg-purple-500/20 rounded-full text-xs text-purple-400 font-medium">
                        RSA-2048
                      </div>
                      <div className="w-px h-6 bg-gradient-to-b from-purple-500 to-purple-500" />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-black/40 rounded-xl border border-purple-500/30">
                    <div className="w-12 h-12 bg-purple-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Key className="w-6 h-6 text-purple-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-purple-400">Key Wrapped</div>
                      <div className="font-mono text-xs text-gray-600 truncate">Recipient's Public Key</div>
                    </div>
                  </div>

                  <div className="flex justify-center py-2">
                    <div className="flex flex-col items-center">
                      <div className="w-px h-6 bg-gradient-to-b from-purple-500 to-cyan-500" />
                      <div className="px-3 py-1 bg-cyan-500/20 rounded-full text-xs text-cyan-400 font-medium">
                        Zero-Knowledge
                      </div>
                      <div className="w-px h-6 bg-gradient-to-b from-cyan-500 to-cyan-500" />
                    </div>
                  </div>

                  <div className="flex items-center gap-4 p-4 bg-black/40 rounded-xl border border-cyan-500/30">
                    <div className="w-12 h-12 bg-cyan-500/20 rounded-xl flex items-center justify-center flex-shrink-0">
                      <Database className="w-6 h-6 text-cyan-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium text-cyan-400">Secure Storage</div>
                      <div className="font-mono text-xs text-gray-600 truncate">We can't read it either</div>
                    </div>
                  </div>
                </div>
              </div>
              
              {/* Floating Badge */}
              <div className="absolute -bottom-4 -right-4 px-4 py-2 bg-emerald-500 rounded-xl shadow-lg shadow-emerald-500/30 flex items-center gap-2">
                <Shield className="w-5 h-5 text-white" />
                <span className="text-white font-bold text-sm">Protected</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="relative p-12 md:p-16 bg-gradient-to-br from-emerald-900/40 via-teal-900/40 to-cyan-900/40 border border-emerald-500/20 rounded-3xl overflow-hidden">
            {/* Background Effects */}
            <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-transparent to-teal-500/10" />
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[300px] h-[300px] bg-emerald-500/20 rounded-full blur-[100px]" />
            
            <div className="relative z-10">
              <div className="w-20 h-20 bg-gradient-to-br from-emerald-500 to-teal-500 rounded-2xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-emerald-500/30">
                <Shield className="w-10 h-10 text-white" />
              </div>
              
              <h2 className="text-4xl md:text-5xl font-bold mb-6">
                Ready for <span className="text-emerald-400">Secure</span> Sharing?
              </h2>
              <p className="text-gray-400 text-lg mb-10 max-w-2xl mx-auto">
                Join thousands who trust SecureShare for their most sensitive files. 
                Start with military-grade encryption in minutes. No credit card required.
              </p>

              <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
                <Link
                  to="/signup"
                  className="group flex items-center gap-2 px-8 py-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 rounded-xl font-semibold text-lg transition-all shadow-xl shadow-emerald-500/25 hover:shadow-emerald-500/40 hover:scale-105"
                >
                  Create Free Account
                  <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </Link>
                <Link
                  to="/signin"
                  className="px-8 py-4 text-gray-300 hover:text-white font-semibold text-lg transition-colors"
                >
                  Already have an account?
                </Link>
              </div>
              
              {/* Trust Badges */}
              <div className="flex flex-wrap justify-center gap-6 mt-12 pt-8 border-t border-white/10">
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Lock className="w-4 h-4" />
                  <span>AES-256 Encrypted</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <EyeOff className="w-4 h-4" />
                  <span>Zero-Knowledge</span>
                </div>
                <div className="flex items-center gap-2 text-gray-500 text-sm">
                  <Globe className="w-4 h-4" />
                  <span>GDPR Compliant</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6 bg-black">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-xl flex items-center justify-center">
                <Shield className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-bold block">SecureShare</span>
                <span className="text-xs text-gray-600">Zero-Trust File Sharing</span>
              </div>
            </div>
            
            <div className="flex items-center gap-6 text-sm text-gray-500">
              <span className="flex items-center gap-1"><Lock className="w-3 h-3" /> AES-256</span>
              <span className="flex items-center gap-1"><Key className="w-3 h-3" /> RSA-2048</span>
              <span className="flex items-center gap-1"><EyeOff className="w-3 h-3" /> Zero-Knowledge</span>
              <span className="flex items-center gap-1"><Brain className="w-3 h-3" /> FGSM Defense</span>
            </div>

            <p className="text-gray-600 text-sm">
              © 2025 SecureShare. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
