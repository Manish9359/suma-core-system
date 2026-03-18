import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Eye, EyeOff, Loader2 } from "lucide-react";
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
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-[hsl(215,30%,14%)] via-[hsl(215,35%,18%)] to-[hsl(174,60%,20%)] p-4">
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 rounded-full bg-accent/10 blur-3xl" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 rounded-full bg-primary/10 blur-3xl" />
      </div>

      <Card className="relative w-full max-w-md border-border/50 bg-card/95 backdrop-blur-sm shadow-2xl">
        <CardHeader className="text-center space-y-4 pb-2">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-accent to-accent/70 flex items-center justify-center shadow-lg shadow-accent/25">
            <Shield className="w-8 h-8 text-accent-foreground" />
          </div>
          <div>
            <CardTitle className="text-2xl font-bold">SumaERP</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">Suma Surveillance Tech Pvt. Ltd.</p>
          </div>
        </CardHeader>

        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@sumatech.in"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="h-11 bg-muted/50"
                autoFocus
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="h-11 bg-muted/50 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full h-11 bg-gradient-to-r from-accent to-accent/80 hover:from-accent/90 hover:to-accent/70 text-accent-foreground font-semibold shadow-lg shadow-accent/20 transition-all"
              disabled={loading}
            >
              {loading ? (
                <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</>
              ) : (
                "Sign In"
              )}
            </Button>
          </form>

          <div className="mt-6 pt-4 border-t text-center">
            <p className="text-xs text-muted-foreground">
              Connect your Python backend at <code className="bg-muted px-1.5 py-0.5 rounded text-[11px]">localhost:8000</code>
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
