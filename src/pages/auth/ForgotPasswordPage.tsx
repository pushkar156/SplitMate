import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../../components/ui/Card';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';

export const ForgotPasswordPage: React.FC = () => {
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      toast.error('Please enter your email');
      return;
    }
    setSubmitted(true);
    toast.success('Password reset link sent to your email');
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="w-full max-w-md space-y-6">
        <Card className="border-border/80 shadow-elevated">
          {submitted ? (
            <div className="p-8 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-positive-bg text-positive">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h2 className="text-lg font-bold text-foreground">Check your inbox</h2>
              <p className="text-xs text-foreground-muted">
                We've sent a password reset link to <strong className="text-foreground">{email}</strong>.
              </p>
              <Link to="/login" className="inline-block mt-4">
                <Button variant="outline" size="sm">
                  Back to sign in
                </Button>
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit}>
              <CardHeader>
                <CardTitle>Reset your password</CardTitle>
                <CardDescription>
                  Enter your registered email address to receive password reset instructions
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

                <Button type="submit" className="w-full">
                  Send reset link
                </Button>
              </CardContent>
              <CardFooter>
                <Link
                  to="/login"
                  className="inline-flex items-center text-xs text-foreground-muted hover:text-foreground"
                >
                  <ArrowLeft className="mr-1 h-3.5 w-3.5" />
                  Back to sign in
                </Link>
              </CardFooter>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
};
