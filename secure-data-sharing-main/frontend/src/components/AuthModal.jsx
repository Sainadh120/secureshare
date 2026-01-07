import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// API functions
const API_URL = 'http://127.0.0.1:8000';
const loginUser = async (email, password) => {
  const formData = new FormData();
  formData.append('username', email);
  formData.append('password', password);
  const response = await fetch(`${API_URL}/auth/token`, { method: 'POST', body: formData });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Login failed.' }));
    throw new Error(errorData.detail);
  }
  return response.json();
};
const registerUser = async (name, email, password) => {
  const response = await fetch(`${API_URL}/users/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ full_name: name, username: email, password: password }),
  });
  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ detail: 'Registration failed.' }));
    throw new Error(errorData.detail);
  }
  return response.json();
};

export default function AuthModal({ open, onClose, onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);
    try {
      if (isLogin) {
        const data = await loginUser(email, password);
        onLoginSuccess(data.access_token);
      } else {
        await registerUser(name, email, password);
        const data = await loginUser(email, password);
        onLoginSuccess(data.access_token);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleTabChange = (loginState) => {
    setIsLogin(loginState);
    setError('');
  };

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.3, ease: "easeInOut" }}
            className="bg-gray-800 text-white rounded-2xl shadow-2xl w-full max-w-md p-8 relative border border-gray-700"
          >
            <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white transition-colors">✕</button>

            <div className="flex border-b border-gray-700 mb-6">
              <button onClick={() => handleTabChange(true)} className={`flex-1 py-3 font-semibold transition-colors ${isLogin ? "text-cyan-400 border-b-2 border-cyan-400" : "text-gray-500 hover:text-white"}`}>
                Sign In
              </button>
              <button onClick={() => handleTabChange(false)} className={`flex-1 py-3 font-semibold transition-colors ${!isLogin ? "text-cyan-400 border-b-2 border-cyan-400" : "text-gray-500 hover:text-white"}`}>
                Sign Up
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-5">
              {!isLogin && (
                <input
                  type="text"
                  placeholder="Full Name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
                />
              )}
              <input
                type="email"
                placeholder="Email Address"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
              />
              <input
                type="password"
                placeholder="Password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-4 py-3 rounded-lg bg-gray-700 text-white border border-gray-600 focus:outline-none focus:ring-2 focus:ring-cyan-500 transition"
              />
              
              {error && <p className="text-red-500 text-sm text-center">{error}</p>}

              <button
                type="submit"
                disabled={isLoading}
                className="w-full py-3 text-white bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg font-semibold shadow-lg hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoading ? 'Processing...' : (isLogin ? 'Sign In' : 'Create Account')}
              </button>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

