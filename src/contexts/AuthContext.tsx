import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { toast } from "sonner";

export interface AuthUser {
  id: number;
  email: string;
  name: string;
  role: string;
}

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Demo credentials for offline mode
const DEMO_USERS: Record<string, { password: string; user: AuthUser }> = {
  "admin@sumatech.in": {
    password: "admin123",
    user: { id: 1, email: "admin@sumatech.in", name: "Administrator", role: "Admin" },
  },
  "manager@sumatech.in": {
    password: "manager123",
    user: { id: 2, email: "manager@sumatech.in", name: "Manager", role: "Manager" },
  },
  "user@sumatech.in": {
    password: "user123",
    user: { id: 3, email: "user@sumatech.in", name: "User", role: "Employee" },
  },
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Check for saved user in localStorage
    const saved = localStorage.getItem("auth_user");
    if (saved) {
      try {
        setUser(JSON.parse(saved));
      } catch {
        localStorage.removeItem("auth_user");
      }
    }
    setLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    // Try backend first, fallback to demo
    try {
      const BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
      const resp = await fetch(`${BASE_URL}/api/v1/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
        signal: AbortSignal.timeout(3000),
      });
      if (resp.ok) {
        const data = await resp.json();
        localStorage.setItem("auth_token", data.access_token);
        // Fetch profile
        const meResp = await fetch(`${BASE_URL}/api/v1/auth/me`, {
          headers: { Authorization: `Bearer ${data.access_token}` },
        });
        if (meResp.ok) {
          const profile = await meResp.json();
          localStorage.setItem("auth_user", JSON.stringify(profile));
          setUser(profile);
          toast.success(`Welcome back, ${profile.name || profile.role}!`);
          return;
        }
      }
    } catch {
      // Backend not available, use demo mode
    }

    // Demo/offline login
    const demo = DEMO_USERS[email.toLowerCase()];
    if (demo && demo.password === password) {
      localStorage.setItem("auth_user", JSON.stringify(demo.user));
      localStorage.setItem("auth_token", "demo-token");
      setUser(demo.user);
      toast.success(`Welcome, ${demo.user.name}! (Offline Mode)`);
      return;
    }

    throw new Error("Invalid email or password. Try admin@sumatech.in / admin123");
  };

  const logout = async () => {
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setUser(null);
    toast.success("Logged out successfully");
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
