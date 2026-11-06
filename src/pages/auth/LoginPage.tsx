import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Receipt, ArrowRight, ShieldCheck, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { signInWithEmail, isLiveSupabase } = useAuth();
  const [email, setEmail] = useState('aarav@splitmate.app');
  const [password, setPassword] = useState('password123');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error('Please enter email and password');
      return;
    }

    setIsLoading(true);
    const { error } = await signInWithEmail(email, password);
    setIsLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Welcome back to SplitMate!');
      navigate('/dashboard');
    }
  };

  const handleOAuthLogin = () => {
    if (!isLiveSupabase) {
      toast.info('Google OAuth requires configuring Supabase Auth credentials in .env');
    } else {
      toast.info('Redirecting to Google OAuth provider...');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-to-tr from-primary to-secondary items-center justify-center shadow-elevated mb-2">
            <Receipt className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Welcome back</h1>
          <p className="text-xs text-foreground-muted">
            Sign in to track group expenses and settle debts seamlessly
          </p>
        </div>

        <Card className="border-border/80 shadow-elevated">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Sign in to SplitMate</CardTitle>
              <CardDescription>
                Enter your credentials or use the demo credentials below
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Email address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-medium text-foreground-muted">Password</label>
                  <Link
                    to="/forgot-password"
                    className="text-xs text-primary hover:underline"
                  >
                    Forgot password?
                  </Link>
                </div>
                <Input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" isLoading={isLoading}>
                <span>Sign in</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>

              <div className="relative my-4">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-border" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-foreground-muted">Or continue with</span>
                </div>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={handleOAuthLogin}
              >
                <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                Google Account
              </Button>
            </CardContent>

            <CardFooter className="flex flex-col space-y-3 pt-2">
              <div className="flex items-center space-x-2 text-xs text-foreground-muted justify-center">
                <ShieldCheck className="h-4 w-4 text-secondary" />
                <span>End-to-end mathematical settlement reconciliation</span>
              </div>

              <div className="text-center text-xs text-foreground-muted">
                Don't have an account?{' '}
                <Link to="/signup" className="text-primary font-medium hover:underline">
                  Create account
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>

        {/* Quick Demo Credentials pill */}
        <div className="p-3 bg-card-elevated/60 border border-border rounded-xl text-center">
          <p className="text-xs text-foreground-muted flex items-center justify-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span>Pre-filled with <strong>Aarav Sharma</strong> (Goa trip group admin).</span>
          </p>
        </div>
      </div>
    </div>
  );
};
