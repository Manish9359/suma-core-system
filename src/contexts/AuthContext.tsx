import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { authApi, AuthUser } from "@/lib/api";
import { useToast } from "@/hooks/use-toast";

interface AuthContextType {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    console.log("[AuthContext] Token on mount:", token ? "Exists" : "Missing");
    if (token) {
      authApi.me()
        .then((u) => {
          console.log("[AuthContext] Me success:", u.name || u.email);
          setUser(u);
        })
        .catch((err) => {
          console.error("[AuthContext] Me failed, logging out:", err);
          localStorage.removeItem("auth_token");
          localStorage.removeItem("auth_user");
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (username: string, password: string) => {
    const result = await authApi.login(username, password);
    localStorage.setItem("auth_token", result.access_token);
    
    // Fetch profile
    const profile = await authApi.me();
    localStorage.setItem("auth_user", JSON.stringify(profile));
    setUser(profile);
    
    toast({ title: "Welcome back!", description: `Logged in as ${profile.role}` });
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch {
      // ignore
    }
    localStorage.removeItem("auth_token");
    localStorage.removeItem("auth_user");
    setUser(null);
    toast({ title: "Logged out", description: "You have been logged out successfully" });
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
