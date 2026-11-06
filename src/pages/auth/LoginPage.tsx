import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useTheme } from '../../context/ThemeContext';
import { OOTY_MEMBERS, OotyMember } from '../../types/ooty';
import { subscribeToOotyData, SyncStatus } from '../../services/ootyDataService';
import { Lock, Eye, EyeOff, CheckCircle2, AlertCircle, Sun, Moon } from 'lucide-react';
import { toast } from 'sonner';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { login, user } = useAuth();
  const { isDark, toggleTheme } = useTheme();

  const [members, setMembers] = useState<OotyMember[]>(OOTY_MEMBERS);
  const [selectedMemberId, setSelectedMemberId] = useState<string>('jitendra');
  const [password, setPassword] = useState<string>('');
  const [showPassword, setShowPassword] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>({ isConnected: true, isSyncing: false });

  // Subscribe to live members from Firestore
  useEffect(() => {
    const unsub = subscribeToOotyData((_exp, _set, liveMembers, status) => {
      if (liveMembers && liveMembers.length > 0) {
        setMembers(liveMembers);
      }
      setSyncStatus(status);
    });
    return () => unsub();
  }, []);

  // If already logged in on this device, redirect straight to dashboard
  useEffect(() => {
    if (user) {
      navigate('/', { replace: true });
    }
  }, [user, navigate]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!selectedMemberId) {
      setErrorMsg('Please select your name.');
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
      setErrorMsg(result.error || 'Incorrect password.');
      toast.error(result.error || 'Incorrect password');
    }
  };

  // When logging in, Pushkar is moved to the very last of the list
  const loginMembers = React.useMemo(() => {
    const withoutPushkar = members.filter((m) => m.id !== 'pushkar');
    const pushkarMember = members.find((m) => m.id === 'pushkar');
    return pushkarMember ? [...withoutPushkar, pushkarMember] : withoutPushkar;
  }, [members]);

  const selectedMember = members.find((m) => m.id === selectedMemberId);

  return (
    <div
      className={`min-h-screen flex flex-col justify-between p-4 sm:p-6 transition-colors duration-200 select-none ${
        isDark ? 'bg-[#000000] text-[#e3e3e3]' : 'bg-[#f8f9fa] text-[#202124]'
      }`}
    >
      {/* Top Bar: Theme Toggle */}
      <div className="flex justify-end max-w-md mx-auto w-full">
        <button
          onClick={toggleTheme}
          className={`p-2.5 rounded-full border transition-colors ${
            isDark
              ? 'bg-[#1e1f20] border-[#333538] text-[#c4c7c5] hover:text-white'
              : 'bg-[#ffffff] border-[#dadce0] text-[#5f6368] hover:text-[#202124] shadow-sm'
          }`}
          title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
        >
          {isDark ? <Sun className="w-5 h-5 text-[#fbbc04]" /> : <Moon className="w-5 h-5 text-[#1a73e8]" />}
        </button>
      </div>

      {/* Main Content Box */}
      <div className="w-full max-w-md mx-auto my-auto py-6">
        {/* Brand & Group Header */}
        <div className="flex flex-col items-center text-center mb-6">
          {/* SplitMate Brand Logo Banner */}
          <div className="flex items-center gap-2.5 mb-4">
            <img src="/logo.svg" alt="SplitMate Logo" className="w-9 h-9 rounded-2xl shadow-sm" />
            <span className="text-xl font-bold tracking-tight font-sans">SplitMate</span>
          </div>

          {/* 4-avatar cluster with mini logo indicator */}
          <div className="relative mb-3">
            <div
              className={`w-16 h-16 rounded-full border grid grid-cols-2 gap-0.5 p-1 overflow-hidden shadow-md ${
                isDark ? 'bg-[#1e1f20] border-[#333538]' : 'bg-[#ffffff] border-[#dadce0]'
              }`}
            >
              {loginMembers.slice(0, 4).map((m) => (
                <div
                  key={m.id}
                  className="rounded-full flex items-center justify-center text-xs font-bold text-white leading-none shadow-sm"
                  style={{ backgroundColor: m.avatarColor }}
                >
                  {m.name.charAt(0)}
                </div>
              ))}
            </div>
            <img
              src="/logo.svg"
              alt="Logo Badge"
              className={`w-5 h-5 rounded-full absolute -bottom-1 -right-1 border-2 shadow-sm ${
                isDark ? 'border-[#000000]' : 'border-[#ffffff]'
              }`}
            />
          </div>

          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-medium tracking-tight font-sans">
              Ooty Trip
            </h1>
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                syncStatus.isConnected ? 'bg-[#34a853] animate-pulse' : 'bg-[#fbbc04]'
              }`}
              title={syncStatus.isConnected ? 'Live Database Sync Active' : 'Connecting to database...'}
            />
          </div>

          <p className={`text-xs mt-1 font-normal ${isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}`}>
            13 Members • Select your profile to enter
          </p>
        </div>

        {/* Login Card */}
        <div
          className={`rounded-3xl p-6 sm:p-7 border shadow-sm backdrop-blur-md transition-colors ${
            isDark
              ? 'bg-[#1e1f20] border-[#2a2b2e]'
              : 'bg-[#ffffff] border-[#dadce0]'
          }`}
        >
          {errorMsg && (
            <div className="mb-4 p-3 rounded-2xl bg-[#ea4335]/15 border border-[#ea4335]/30 text-[#ea4335] text-xs flex items-center gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span className="font-medium">{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            {/* 1. Member Selector Dropdown */}
            <div>
              <label className={`block text-xs font-medium mb-1.5 ${isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}`}>
                Who is using this device?
              </label>
              <div className="relative">
                <select
                  value={selectedMemberId}
                  onChange={(e) => {
                    setSelectedMemberId(e.target.value);
                    setErrorMsg(null);
                  }}
                  className={`w-full rounded-2xl px-4 py-3 text-sm font-medium border focus:outline-none appearance-none cursor-pointer transition-colors ${
                    isDark
                      ? 'bg-[#282a2d] border-[#333538] text-white focus:border-[#a8c7fa]'
                      : 'bg-[#f1f3f4] border-[#dadce0] text-[#202124] focus:border-[#1a73e8]'
                  }`}
                >
                  {loginMembers.map((m) => (
                    <option
                      key={m.id}
                      value={m.id}
                      className={isDark ? 'bg-[#1e1f20] text-white' : 'bg-[#ffffff] text-[#202124]'}
                    >
                      {m.name}
                    </option>
                  ))}
                </select>
                <div className={`absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-xs ${isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}`}>
                  ▼
                </div>
              </div>
            </div>

            {/* Selected User Preview Bubble */}
            {selectedMember && (
              <div
                className={`flex items-center gap-3 p-3 rounded-2xl border ${
                  isDark ? 'bg-[#282a2d]/70 border-[#333538]' : 'bg-[#f8f9fa] border-[#e8eaed]'
                }`}
              >
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shadow-sm shrink-0"
                  style={{ backgroundColor: selectedMember.avatarColor }}
                >
                  {selectedMember.name.charAt(0)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className={`text-[11px] ${isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}`}>Signing in as</div>
                  <div className="text-sm font-medium text-current truncate">
                    {selectedMember.name}
                  </div>
                </div>
                <CheckCircle2 className="w-5 h-5 text-[#34a853] shrink-0" />
              </div>
            )}

            {/* 2. Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className={`text-xs font-medium ${isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}`}>
                  Trip Password
                </label>
                <span className={`text-[11px] font-mono ${isDark ? 'text-[#a8c7fa]' : 'text-[#1a73e8]'}`}>
                  Hint: 1234567890
                </span>
              </div>
              <div className="relative">
                <div className={`absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none ${isDark ? 'text-[#8e918f]' : 'text-[#5f6368]'}`}>
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
                  className={`w-full rounded-2xl pl-10 pr-11 py-3 text-sm font-mono border focus:outline-none transition-colors ${
                    isDark
                      ? 'bg-[#282a2d] border-[#333538] text-white focus:border-[#a8c7fa]'
                      : 'bg-[#f1f3f4] border-[#dadce0] text-[#202124] focus:border-[#1a73e8]'
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className={`absolute right-3 top-1/2 -translate-y-1/2 p-1 rounded-lg ${
                    isDark ? 'text-[#8e918f] hover:text-white' : 'text-[#5f6368] hover:text-[#202124]'
                  }`}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Submit Pill Button (Primary Blue) */}
            <button
              type="submit"
              disabled={isLoading}
              className={`w-full mt-2 py-3 px-5 rounded-full font-medium text-sm transition-all transform active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 shadow-sm ${
                isDark
                  ? 'bg-[#a8c7fa] hover:bg-[#b8d4ff] text-[#041e49]'
                  : 'bg-[#0b57d0] hover:bg-[#1a73e8] text-white'
              }`}
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-current border-t-transparent rounded-full animate-spin" />
              ) : (
                `Enter as ${selectedMember?.name || 'Member'}`
              )}
            </button>
          </form>
        </div>
      </div>

      {/* Footer */}
      <div className={`text-center py-2 text-xs ${isDark ? 'text-[#5e6368]' : 'text-[#8e918f]'}`}>
        SplitMate • Ooty Trip 2026 • Stays logged in on this device
      </div>
    </div>
  );
};
