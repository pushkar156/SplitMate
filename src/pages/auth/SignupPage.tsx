import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { Receipt, ArrowRight } from 'lucide-react';
import { toast } from 'sonner';

export const SignupPage: React.FC = () => {
  const navigate = useNavigate();
  const { signUpWithEmail } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!fullName || !email || !password) {
      toast.error('Please fill in all fields');
      return;
    }
    if (password.length < 6) {
      toast.error('Password must be at least 6 characters');
      return;
    }

    setIsLoading(true);
    const { error } = await signUpWithEmail(email, password, fullName);
    setIsLoading(false);

    if (error) {
      toast.error(error.message);
    } else {
      toast.success('Account created! Welcome to SplitMate.');
      navigate('/dashboard');
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-6">
        <div className="text-center space-y-2">
          <div className="inline-flex h-12 w-12 rounded-2xl bg-gradient-to-tr from-primary to-secondary items-center justify-center shadow-elevated mb-2">
            <Receipt className="h-6 w-6 text-white" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-foreground">Create your account</h1>
          <p className="text-xs text-foreground-muted">
            Start organizing shared trip and house expenses in seconds
          </p>
        </div>

        <Card className="border-border/80 shadow-elevated">
          <form onSubmit={handleSubmit}>
            <CardHeader>
              <CardTitle>Register for SplitMate</CardTitle>
              <CardDescription>
                One group. Every expense. No confusion.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Input
                label="Full Name"
                placeholder="Pushkar Kumar"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
              />

              <Input
                label="Email address"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />

              <Input
                label="Password"
                type="password"
                placeholder="At least 6 characters"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />

              <Button type="submit" className="w-full" isLoading={isLoading}>
                <span>Create account</span>
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>

            <CardFooter className="flex flex-col space-y-3 pt-2">
              <div className="text-center text-xs text-foreground-muted">
                Already have an account?{' '}
                <Link to="/login" className="text-primary font-medium hover:underline">
                  Sign in
                </Link>
              </div>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
};
