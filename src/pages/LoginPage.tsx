import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({ title: "Error", description: "Please fill in all fields", variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      await login(email, password);
    } catch (err: any) {
      toast({
        title: "Login Failed",
        description: err.message || "Invalid credentials",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(220,25%,10%)] via-[hsl(220,30%,16%)] to-[hsl(200,40%,14%)] p-4 relative overflow-hidden">
      {/* Ambient glow */}
      <div className="absolute top-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-[hsl(212,100%,48%,0.08)] blur-[120px]" />
      <div className="absolute bottom-[-20%] left-[-10%] w-[400px] h-[400px] rounded-full bg-[hsl(174,60%,40%,0.06)] blur-[100px]" />

      <Card className="relative w-full max-w-[420px] border-0 bg-[hsl(220,20%,97%)] shadow-2xl shadow-black/30 rounded-2xl">
        <CardHeader className="text-center pt-10 pb-2">
          {/* Logo */}
          <div className="mx-auto w-[72px] h-[72px] rounded-2xl bg-gradient-to-br from-[hsl(212,100%,48%)] to-[hsl(212,90%,38%)] flex items-center justify-center shadow-lg shadow-[hsl(212,100%,48%,0.3)] mb-5">
            <span className="text-white text-3xl font-black tracking-tighter">S</span>
          </div>
          <h1 className="text-2xl font-extrabold text-[hsl(222,47%,11%)] tracking-tight">SumaERP</h1>
          <p className="text-sm text-[hsl(215,16%,47%)] mt-1">Business Management System</p>
        </CardHeader>

        <CardContent className="px-8 pb-10 pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-xs font-semibold text-[hsl(215,16%,47%)] uppercase tracking-wider">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 bg-card border-border focus:border-primary focus:ring-2 focus:ring-primary/15 rounded-xl text-sm"
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password" className="text-xs font-semibold text-[hsl(215,16%,47%)] uppercase tracking-wider">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-white border-[hsl(214,32%,91%)] focus:border-[hsl(212,100%,48%)] focus:ring-2 focus:ring-[hsl(212,100%,48%,0.15)] rounded-xl text-sm pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[hsl(215,16%,57%)] hover:text-[hsl(222,47%,11%)] transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-12 rounded-xl bg-gradient-to-r from-[hsl(212,100%,48%)] to-[hsl(212,90%,42%)] hover:from-[hsl(212,100%,44%)] hover:to-[hsl(212,90%,38%)] text-white font-bold text-sm shadow-lg shadow-[hsl(212,100%,48%,0.25)] transition-all active:scale-[0.98]"
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <p className="text-center text-[10px] text-[hsl(215,16%,60%)] mt-6">
            Suma Surveillance Tech Pvt. Ltd. &copy; {new Date().getFullYear()}
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
