import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { OOTY_MEMBERS, OotyMember } from '../../types/ooty';
import { subscribeToOotyData } from '../../services/ootyDataService';
import { Compass, Lock, Eye, EyeOff, CheckCircle2, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();

  const [members, setMembers] = useState<OotyMember[]>(OOTY_MEMBERS);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('pushkar');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Subscribe to live members from database
  useEffect(() => {
    const unsub = subscribeToOotyData((_exp, _set, liveMembers) => {
      if (liveMembers && liveMembers.length > 0) {
        setMembers(liveMembers);
      }
    });
    return () => unsub();
  }, []);

  // If already logged in, redirect immediately
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedMemberId) {
      setErrorMsg('Please select your name from the dropdown.');
      return;
    }

    if (!password) {
      setErrorMsg('Please enter the trip password.');
      return;
    }

    setIsLoading(true);
    const result = await login(selectedMemberId, password);
    setIsLoading(false);

    if (result.success) {
      const member = members.find((m) => m.id === selectedMemberId);
      toast.success(`Welcome to Ooty Trip, ${member?.name}! 🌲⛰️`);
      navigate('/', { replace: true });
    } else {
      setErrorMsg(result.error || 'Login failed.');
      toast.error(result.error || 'Login failed');
    }
  };

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  return (
    <div className="min-h-screen bg-retro-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative background ambient glows */}
      <div className="absolute -top-32 -left-32 w-96 h-96 bg-retro-berry/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 bg-retro-coral/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-retro-plum/30 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md relative z-10">
        {/* Retro Header Card */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-retro-plum border-2 border-retro-coral shadow-retro-lg mb-3">
            <Compass className="w-8 h-8 text-retro-gold animate-pulse" />
          </div>
          <h1 className="text-3xl font-extrabold font-display tracking-tight text-retro-text-primary">
            SplitMate
          </h1>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-retro-plum/60 border border-retro-gold/40 text-retro-gold text-xs font-semibold mt-2 shadow-sm">
            <span>🌲 Ooty Trip 2024</span>
            <span>•</span>
            <span>13 Travelers</span>
          </div>
          <p className="text-retro-text-muted text-sm mt-2">
            Shared expense splitting & settlement dashboard
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-retro-card border-2 border-retro-border rounded-2xl p-6 sm:p-8 shadow-retro-xl backdrop-blur-md">
          <div className="mb-6 border-b border-retro-border pb-4">
            <h2 className="text-lg font-bold text-retro-text-primary flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-retro-coral inline-block" />
              Member Login
            </h2>
            <p className="text-xs text-retro-text-muted mt-0.5">
              Select your name and enter the trip password to enter your dashboard.
            </p>
          </div>

          {errorMsg && (
            <div className="mb-4 p-3 rounded-xl bg-retro-coral/15 border border-retro-coral/40 text-retro-coral text-sm flex items-start gap-2.5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div className="flex-1 text-xs leading-relaxed font-medium">{errorMsg}</div>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* 1. Name Dropdown */}
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-retro-text-muted mb-1.5">
                Select Your Name
              </label>
              <div className="relative">
                <select
                  value={selectedMemberId}
                  onChange={(e) => {
                    setSelectedMemberId(e.target.value);
                    setErrorMsg(null);
                  }}
                  className="w-full bg-retro-surface border-2 border-retro-border rounded-xl px-4 py-3 text-retro-text-primary font-medium focus:outline-none focus:border-retro-coral transition-colors appearance-none cursor-pointer"
                >
                  {members.map((m) => (
                    <option key={m.id} value={m.id} className="bg-retro-surface text-retro-text-primary">
                      {m.name}
                    </option>
                  ))}
                </select>
                <div className="absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none text-retro-gold font-bold">
                  ▼
                </div>
              </div>
            </div>

            {/* Selected User Badge */}
            {selectedMember && (
              <div className="flex items-center gap-3 p-2.5 rounded-xl bg-retro-surface/80 border border-retro-border">
                <div
                  className="w-9 h-9 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm"
                  style={{ backgroundColor: selectedMember.avatarColor }}
                >
                  {selectedMember.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-xs text-retro-text-muted font-medium">Signing in as</div>
                  <div className="text-sm font-bold text-retro-text-primary truncate">
                    {selectedMember.name}
                  </div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-retro-teal" />
              </div>
            )}

            {/* 2. Password */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold uppercase tracking-wider text-retro-text-muted">
                  Trip Password
                </label>
                <span className="text-[11px] text-retro-gold font-mono font-medium">
                  Hint: 1234567890
                </span>
              </div>
              <div className="relative">
                <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-retro-text-muted pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="Enter 1234567890"
                  className="w-full bg-retro-surface border-2 border-retro-border rounded-xl pl-10 pr-11 py-3 text-retro-text-primary font-mono text-sm focus:outline-none focus:border-retro-coral transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-retro-text-muted hover:text-retro-text-primary p-1 rounded-lg"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 py-3.5 px-4 rounded-xl bg-retro-coral hover:bg-retro-coral/90 text-white font-bold text-sm tracking-wide shadow-retro-md hover:shadow-retro-lg transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
              ) : (
                <>
                  <span>Open Ooty Dashboard</span>
                  <span>→</span>
                </>
              )}
            </button>
          </form>

          {/* Device Persistence Note */}
          <div className="mt-5 pt-4 border-t border-retro-border text-center">
            <p className="text-[11px] text-retro-text-muted leading-relaxed">
              🔒 Your device will remain logged in automatically until you click{' '}
              <strong className="text-retro-text-primary">Logout</strong> in the dashboard.
            </p>
          </div>
        </div>

        {/* 13 Members Quick Pills */}
        <div className="mt-5 p-3 rounded-xl bg-retro-card/40 border border-retro-border/60 backdrop-blur-sm text-center">
          <div className="text-[11px] font-semibold text-retro-text-muted uppercase tracking-wider mb-2">
            The 13 Ooty Travelers
          </div>
          <div className="flex flex-wrap gap-1.5 justify-center">
            {members.map((m) => (
              <button
                key={m.id}
                type="button"
                onClick={() => {
                  setSelectedMemberId(m.id);
                  setErrorMsg(null);
                }}
                className={`text-[11px] px-2 py-0.5 rounded-full border transition-all ${
                  selectedMemberId === m.id
                    ? 'bg-retro-coral text-white border-retro-coral font-bold'
                    : 'bg-retro-surface/60 text-retro-text-muted border-retro-border hover:border-retro-gold/50'
                }`}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
