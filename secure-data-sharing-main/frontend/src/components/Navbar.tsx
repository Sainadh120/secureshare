import { Link, useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck, LogOut, Menu, X } from "lucide-react";
import { useAuth } from "../auth/AuthContext";
import { useState } from "react";

const Navbar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { isAuthenticated, logout } = useAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate("/signin");
  };

  const navLinks = [
    { path: "/", label: "Dashboard", color: "green" },
    { path: "/upload", label: "Upload", color: "blue" },
    { path: "/my-files", label: "My Files", color: "cyan" },
    { path: "/shared-with-me", label: "Shared With Me", color: "purple" },
    { path: "/ml-defense", label: "ML Defense", color: "yellow" },
  ];

  const getHoverColor = (color: string) => {
    const colors: Record<string, string> = {
      green: "hover:text-green-400",
      purple: "hover:text-purple-400",
      blue: "hover:text-blue-400",
      yellow: "hover:text-yellow-400",
      cyan: "hover:text-cyan-400",
    };
    return colors[color] || "hover:text-white";
  };

  const getActiveColor = (color: string) => {
    const colors: Record<string, string> = {
      green: "text-green-400",
      purple: "text-purple-400",
      blue: "text-blue-400",
      yellow: "text-yellow-400",
      cyan: "text-cyan-400",
    };
    return colors[color] || "text-white";
  };

  return (
    <nav className="sticky top-0 z-50 backdrop-blur-xl bg-gray-900/80 border-b border-white/5 text-white px-6 py-4">
      <div className="max-w-7xl mx-auto flex justify-between items-center">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2 text-xl font-bold group">
          <div className="p-2 bg-gradient-to-br from-green-500 to-emerald-600 rounded-lg group-hover:shadow-lg group-hover:shadow-green-500/30 transition-all duration-300">
            <ShieldCheck className="w-5 h-5 text-white" />
          </div>
          <span className="bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
            SecureShare
          </span>
        </Link>

        {/* Desktop Links */}
        <div className="hidden md:flex gap-1 text-sm font-medium items-center">
          {isAuthenticated && navLinks.map((link) => (
            <Link
              key={link.path}
              to={link.path}
              className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                isActive(link.path)
                  ? `${getActiveColor(link.color)} bg-white/5`
                  : `text-gray-400 ${getHoverColor(link.color)} hover:bg-white/5`
              }`}
            >
              {link.label}
            </Link>
          ))}

          <div className="ml-4 h-6 w-px bg-gray-700" />

          {isAuthenticated ? (
            <button
              onClick={handleLogout}
              className="flex items-center gap-2 px-4 py-2 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all duration-300"
            >
              <LogOut className="w-4 h-4" />
              Logout
            </button>
          ) : (
            <>
              <Link
                to="/signin"
                className={`px-4 py-2 rounded-lg transition-all duration-300 ${
                  isActive("/signin")
                    ? "text-white bg-white/5"
                    : "text-gray-400 hover:text-white hover:bg-white/5"
                }`}
              >
                Login
              </Link>

              <Link
                to="/signup"
                className="ml-2 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 px-5 py-2 rounded-lg text-white font-medium shadow-lg shadow-purple-500/20 hover:shadow-purple-500/40 transition-all duration-300"
              >
                Sign Up
              </Link>
            </>
          )}
        </div>

        {/* Mobile Menu Button */}
        <button
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          className="md:hidden p-2 hover:bg-white/10 rounded-lg transition-colors"
        >
          {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
        </button>
      </div>

      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="md:hidden absolute top-full left-0 right-0 bg-gray-900/95 backdrop-blur-xl border-b border-white/5 animate-fadeIn">
          <div className="p-4 space-y-2">
            {isAuthenticated && navLinks.map((link) => (
              <Link
                key={link.path}
                to={link.path}
                onClick={() => setMobileMenuOpen(false)}
                className={`block px-4 py-3 rounded-lg transition-all duration-300 ${
                  isActive(link.path)
                    ? `${getActiveColor(link.color)} bg-white/5`
                    : `text-gray-400 ${getHoverColor(link.color)}`
                }`}
              >
                {link.label}
              </Link>
            ))}

            <div className="my-4 border-t border-white/10" />

            {isAuthenticated ? (
              <button
                onClick={() => {
                  handleLogout();
                  setMobileMenuOpen(false);
                }}
                className="w-full flex items-center gap-2 px-4 py-3 text-gray-400 hover:text-red-400 rounded-lg transition-all"
              >
                <LogOut className="w-4 h-4" />
                Logout
              </button>
            ) : (
              <>
                <Link
                  to="/signin"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 text-gray-400 hover:text-white rounded-lg transition-all"
                >
                  Login
                </Link>
                <Link
                  to="/signup"
                  onClick={() => setMobileMenuOpen(false)}
                  className="block px-4 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-center text-white font-medium rounded-lg"
                >
                  Sign Up
                </Link>
              </>
            )}
          </div>
        </div>
      )}
    </nav>
  );
};

export default Navbar;
