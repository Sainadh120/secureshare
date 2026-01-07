import React, { createContext, useContext, useState, useEffect } from "react";

interface AuthContextType {
  isAuthenticated: boolean;
  username: string | null;
  token: string | null;
  login: (token: string, username?: string) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(
    !!localStorage.getItem("token")
  );
  const [username, setUsername] = useState<string | null>(
    localStorage.getItem("username")
  );
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token")
  );

  // Decode username from JWT token if not stored
  useEffect(() => {
    const storedToken = localStorage.getItem("token");
    if (storedToken && !username) {
      try {
        const payload = JSON.parse(atob(storedToken.split('.')[1]));
        if (payload.sub) {
          setUsername(payload.sub);
          localStorage.setItem("username", payload.sub);
        }
      } catch (e) {
        console.error("Failed to decode token:", e);
      }
    }
  }, []);

  const login = (newToken: string, newUsername?: string) => {
    localStorage.setItem("token", newToken);
    setToken(newToken);
    setIsAuthenticated(true);
    
    // Try to extract username from token if not provided
    if (newUsername) {
      localStorage.setItem("username", newUsername);
      setUsername(newUsername);
    } else {
      try {
        const payload = JSON.parse(atob(newToken.split('.')[1]));
        if (payload.sub) {
          localStorage.setItem("username", payload.sub);
          setUsername(payload.sub);
        }
      } catch (e) {
        console.error("Failed to decode token:", e);
      }
    }
  };

  const logout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setToken(null);
    setUsername(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, username, token, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be inside AuthProvider");
  return ctx;
};

export default AuthContext;
