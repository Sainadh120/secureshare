import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/AuthContext";
import {
  LayoutDashboard,
  Brain,
  Upload,
  FolderOpen,
  Users,
  LogOut,
  Shield,
  Lock,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { useState } from "react";

const Sidebar = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, username } = useAuth();
  const [collapsed, setCollapsed] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/signin");
  };

  const isActive = (path: string) => location.pathname === path;

  const navItems = [
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/ml-defense", label: "ML Defense", icon: Brain },
    { path: "/upload", label: "Upload & Share", icon: Upload },
    { path: "/my-files", label: "My Files", icon: FolderOpen },
    { path: "/shared-with-me", label: "Shared With Me", icon: Users },
  ];

  return (
    <aside
      className={`fixed left-0 top-0 h-screen bg-black/95 border-r border-emerald-500/20 flex flex-col transition-all duration-300 z-50 ${
        collapsed ? "w-20" : "w-64"
      }`}
    >
      {/* Logo */}
      <div className="p-6 border-b border-emerald-500/20">
        <Link to="/dashboard" className="flex items-center gap-3">
          <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-emerald-700 rounded-lg flex items-center justify-center shadow-lg shadow-emerald-500/30">
            <Shield className="w-6 h-6 text-white" />
          </div>
          {!collapsed && (
            <div className="animate-fadeIn">
              <h1 className="text-lg font-bold text-white">SecureShare</h1>
              <p className="text-xs text-emerald-400">Zero-Trust Platform</p>
            </div>
          )}
        </Link>
      </div>

      {/* User Info */}
      {!collapsed && username && (
        <div className="px-6 py-4 border-b border-emerald-500/20 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-emerald-600 to-teal-600 rounded-full flex items-center justify-center">
              <span className="text-white font-semibold">
                {username[0].toUpperCase()}
              </span>
            </div>
            <div>
              <p className="text-white font-medium text-sm">{username}</p>
              <div className="flex items-center gap-1 text-xs text-emerald-400">
                <Lock className="w-3 h-3" />
                <span>Keys Active</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Navigation */}
      <nav className="flex-1 py-6 px-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-200 group ${
                isActive(item.path)
                  ? "bg-emerald-500/20 text-emerald-400 border-l-2 border-emerald-400"
                  : "text-gray-400 hover:bg-white/5 hover:text-white"
              }`}
            >
              <Icon
                className={`w-5 h-5 flex-shrink-0 ${
                  isActive(item.path)
                    ? "text-emerald-400"
                    : "text-gray-500 group-hover:text-emerald-400"
                }`}
              />
              {!collapsed && (
                <span className="font-medium text-sm">{item.label}</span>
              )}
            </Link>
          );
        })}
      </nav>

      {/* Bottom Section */}
      <div className="p-4 border-t border-emerald-500/20 space-y-2">
        {/* Collapse Toggle */}
        <button
          onClick={() => setCollapsed(!collapsed)}
          className="w-full flex items-center justify-center gap-2 px-4 py-2 text-gray-400 hover:text-white hover:bg-white/5 rounded-lg transition-colors"
        >
          {collapsed ? (
            <ChevronRight className="w-5 h-5" />
          ) : (
            <>
              <ChevronLeft className="w-5 h-5" />
              <span className="text-sm">Collapse</span>
            </>
          )}
        </button>

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full flex items-center gap-3 px-4 py-3 text-gray-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
        >
          <LogOut className="w-5 h-5 flex-shrink-0" />
          {!collapsed && <span className="font-medium text-sm">Logout</span>}
        </button>
      </div>
    </aside>
  );
};

export default Sidebar;
