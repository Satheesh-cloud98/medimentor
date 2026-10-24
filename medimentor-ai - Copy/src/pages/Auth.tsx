import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate, Link } from 'react-router-dom';
import {
  HeartPulse,
  LogIn,
  UserPlus,
  ShieldCheck,
  Lock,
  Mail,
  Eye,
  EyeOff,
  User,
  Building2,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  KeyRound,
} from 'lucide-react';
import { useReports } from '../context/ReportsContext';
import { getAuthToken } from '../services/authService';
import type { PatientProfile } from '../types/report';

export const Auth: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const navigate = useNavigate();
  const { availableProfiles, switchProfile, registerProfile } = useReports();

  // Mode: 'signin' | 'signup'
  const modeParam = searchParams.get('mode');
  const [activeTab, setActiveTab] = useState<'signin' | 'signup'>(
    modeParam === 'signup' || modeParam === 'register' ? 'signup' : 'signin'
  );

  useEffect(() => {
    if (modeParam === 'signup' || modeParam === 'register') {
      setActiveTab('signup');
    } else if (modeParam === 'signin' || modeParam === 'login') {
      setActiveTab('signin');
    }
  }, [modeParam]);

  const handleTabChange = (tab: 'signin' | 'signup') => {
    setActiveTab(tab);
    setSearchParams({ mode: tab });
    setError(null);
    setSuccessMsg(null);
  };

  // Sign In State
  const [signInEmail, setSignInEmail] = useState('arjun.sharma@medimentor.ai');
  const [signInPassword, setSignInPassword] = useState('••••••••••••');
  const [showSignInPassword, setShowSignInPassword] = useState(false);

  // Sign Up State
  const [fullName, setFullName] = useState('');
  const [accountType, setAccountType] = useState<'patient' | 'provider'>('patient');
  const [signUpEmail, setSignUpEmail] = useState('');
  const [signUpPassword, setSignUpPassword] = useState('');
  const [signUpConfirmPassword, setSignUpConfirmPassword] = useState('');
  const [showSignUpPassword, setShowSignUpPassword] = useState(false);
  const [age, setAge] = useState('32');
  const [gender, setGender] = useState('Female');

  // UI status
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Presets for quick-login
  const presets = [
    {
      id: 'user-arjun',
      name: 'Arjun K. Sharma',
      email: 'arjun.sharma@medimentor.ai',
      role: 'Standard Patient (Lab & Rx records)',
    },
    {
      id: 'user-priya',
      name: 'Priya Sharma',
      email: 'priya.sharma@medimentor.ai',
      role: 'Family Member Profile',
    },
    {
      id: 'user-guest',
      name: 'New Patient',
      email: 'guest@medimentor.ai',
      role: 'Fresh Isolated Health Profile',
    },
  ];

  const handleSelectPreset = (preset: typeof presets[0]) => {
    setSignInEmail(preset.email);
    setSignInPassword('DemoSecurePass2026!');
    setError(null);
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!signInEmail.trim()) {
        throw new Error('Please enter your email address.');
      }

      // Find matching profile by email or fallback to Arjun
      const matched = availableProfiles.find(
        (p) => p.email?.toLowerCase() === signInEmail.trim().toLowerCase()
      );

      const targetId = matched ? matched.id : 'user-arjun';
      const targetName = matched ? matched.name : 'Arjun K. Sharma';

      // Obtain JWT token
      await getAuthToken(targetId, targetName);

      // Switch active profile in context & persist auth state
      switchProfile(targetId);
      localStorage.setItem('medimentor_is_authenticated', 'true');

      setSuccessMsg(`Welcome back, ${targetName}! Redirecting to your dashboard...`);
      setTimeout(() => {
        navigate('/dashboard');
      }, 700);
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please verify your credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!fullName.trim()) {
        throw new Error('Please enter your full name or organization name.');
      }
      if (!signUpEmail.trim()) {
        throw new Error('Please enter a valid email address.');
      }
      if (!signUpPassword || signUpPassword.length < 6) {
        throw new Error('Password must be at least 6 characters long.');
      }
      if (signUpPassword !== signUpConfirmPassword) {
        throw new Error('Passwords do not match. Please re-enter your password.');
      }

      if (accountType === 'provider') {
        // Registering as healthcare organization
        localStorage.setItem('medimentor_is_authenticated', 'true');
        setSuccessMsg('Healthcare Provider account registered! Redirecting to Provider Portal...');
        setTimeout(() => {
          navigate('/provider-portal');
        }, 800);
        return;
      }

      // Create new Patient profile
      const newUserId = `user-${Date.now()}`;
      const newProfile: PatientProfile = {
        id: newUserId,
        name: fullName.trim(),
        age: parseInt(age, 10) || 30,
        gender: gender || 'Other',
        bloodGroup: 'Not Specified',
        emergencyContact: 'Not Provided',
        allergies: 'None recorded',
        chronicConditions: 'None recorded',
        email: signUpEmail.trim(),
        accountType: 'patient',
      };

      // Register profile in context
      registerProfile(newProfile);

      // Obtain JWT token
      await getAuthToken(newUserId, newProfile.name);

      localStorage.setItem('medimentor_is_authenticated', 'true');
      setSuccessMsg(`Account created for ${newProfile.name}! Preparing your clinical dashboard...`);
      setTimeout(() => {
        navigate('/dashboard');
      }, 800);
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please check the entered details.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-teal-50/20 to-slate-50 flex flex-col justify-center items-center p-4 sm:p-6 lg:p-8 font-sans">
      {/* Return to Home Link */}
      <div className="w-full max-w-md mb-4 flex items-center justify-between text-xs">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-teal-700 hover:text-teal-900 font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return to Home</span>
        </Link>
        <div className="flex items-center gap-1 text-slate-500">
          <Lock className="w-3.5 h-3.5 text-teal-600" />
          <span>256-bit TLS Encrypted</span>
        </div>
      </div>

      {/* Main Authentication Card */}
      <div className="w-full max-w-md bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/60 overflow-hidden animate-fadeIn">
        {/* Card Header */}
        <div className="p-6 sm:p-8 text-center bg-gradient-to-b from-teal-50/60 to-white border-b border-slate-100">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-2xl bg-teal-600 text-white shadow-md shadow-teal-600/20 mb-3">
            <HeartPulse className="w-6 h-6" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">MediMentor</h1>
          <p className="text-xs font-semibold text-teal-700 mt-0.5">
            &ldquo;Your Health Journey, Clearly Guided.&rdquo;
          </p>

          {/* Tab Selector */}
          <div className="mt-6 grid grid-cols-2 p-1 rounded-xl bg-slate-100/90 border border-slate-200/60 text-xs font-bold">
            <button
              type="button"
              onClick={() => handleTabChange('signin')}
              className={`py-2.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'signin'
                  ? 'bg-white text-teal-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Sign In</span>
            </button>
            <button
              type="button"
              onClick={() => handleTabChange('signup')}
              className={`py-2.5 rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                activeTab === 'signup'
                  ? 'bg-white text-teal-900 shadow-xs'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
          </div>
        </div>

        {/* Card Body */}
        <div className="p-6 sm:p-8 space-y-6">
          {/* Notifications */}
          {error && (
            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
              <div className="leading-relaxed">{error}</div>
            </div>
          )}

          {successMsg && (
            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 mt-0.5" />
              <div className="leading-relaxed font-medium">{successMsg}</div>
            </div>
          )}

          {/* SIGN IN TAB */}
          {activeTab === 'signin' && (
            <form onSubmit={handleSignIn} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={signInEmail}
                    onChange={(e) => setSignInEmail(e.target.value)}
                    placeholder="patient@medimentor.ai"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-xs sm:text-sm text-slate-900 bg-white"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">Password</label>
                  <span className="text-[11px] text-teal-700 hover:underline cursor-pointer">
                    Forgot password?
                  </span>
                </div>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showSignInPassword ? 'text' : 'password'}
                    required
                    value={signInPassword}
                    onChange={(e) => setSignInPassword(e.target.value)}
                    placeholder="Enter your password"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-xs sm:text-sm text-slate-900 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignInPassword(!showSignInPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label="Toggle password visibility"
                  >
                    {showSignInPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm text-white bg-teal-600 hover:bg-teal-700 active:scale-[0.99] shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <span>Authenticating...</span>
                ) : (
                  <>
                    <LogIn className="w-4 h-4" />
                    <span>Sign In</span>
                  </>
                )}
              </button>

              {/* Demo Quick-Login Presets */}
              <div className="pt-4 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">
                    Quick-Login Presets
                  </span>
                  <span className="text-[10px] bg-teal-50 text-teal-700 font-bold px-1.5 py-0.5 rounded border border-teal-200">
                    TEST ACCESS
                  </span>
                </div>
                <div className="space-y-1.5">
                  {presets.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className="w-full text-left p-2 rounded-xl bg-slate-50 hover:bg-teal-50/70 border border-slate-200/80 hover:border-teal-300 transition-all flex items-center justify-between group cursor-pointer"
                    >
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-bold text-slate-800 group-hover:text-teal-900 truncate">
                          {preset.name}
                        </div>
                        <div className="text-[10px] text-slate-500 truncate">{preset.role}</div>
                      </div>
                      <span className="text-[10px] font-semibold text-teal-600 group-hover:underline pl-2 shrink-0">
                        Use Profile
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            </form>
          )}

          {/* CREATE ACCOUNT TAB */}
          {activeTab === 'signup' && (
            <form onSubmit={handleSignUp} className="space-y-4">
              {/* Account Type Selector */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Account Type
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAccountType('patient')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      accountType === 'patient'
                        ? 'border-teal-500 bg-teal-50/70 text-teal-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs">
                      <User className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>Patient</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-normal mt-0.5">
                      Personal health records
                    </p>
                  </button>

                  <button
                    type="button"
                    onClick={() => setAccountType('provider')}
                    className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                      accountType === 'provider'
                        ? 'border-teal-500 bg-teal-50/70 text-teal-900 font-bold'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 text-xs">
                      <Building2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                      <span>Healthcare Org</span>
                    </div>
                    <p className="text-[10px] text-slate-500 font-normal mt-0.5">
                      Hospital / Clinic / Lab
                    </p>
                  </button>
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  {accountType === 'patient' ? 'Full Name' : 'Organization / Facility Name'}
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder={
                      accountType === 'patient' ? 'e.g. Ramesh Patel' : 'e.g. City Diagnostic Center'
                    }
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-xs sm:text-sm text-slate-900 bg-white"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    required
                    value={signUpEmail}
                    onChange={(e) => setSignUpEmail(e.target.value)}
                    placeholder="email@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-xs sm:text-sm text-slate-900 bg-white"
                  />
                </div>
              </div>

              {/* Patient Demographics (if patient) */}
              {accountType === 'patient' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Age</label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={age}
                      onChange={(e) => setAge(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-xs sm:text-sm text-slate-900 bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1.5">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-xs sm:text-sm text-slate-900 bg-white"
                    >
                      <option value="Female">Female</option>
                      <option value="Male">Male</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                </div>
              )}

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">Password</label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showSignUpPassword ? 'text' : 'password'}
                    required
                    value={signUpPassword}
                    onChange={(e) => setSignUpPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="w-full pl-10 pr-10 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-xs sm:text-sm text-slate-900 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => setShowSignUpPassword(!showSignUpPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    aria-label="Toggle password visibility"
                  >
                    {showSignUpPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Confirm Password
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type={showSignUpPassword ? 'text' : 'password'}
                    required
                    value={signUpConfirmPassword}
                    onChange={(e) => setSignUpConfirmPassword(e.target.value)}
                    placeholder="Re-enter your password"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-teal-500/30 focus:border-teal-500 text-xs sm:text-sm text-slate-900 bg-white"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full mt-2 py-3 px-4 rounded-xl font-bold text-sm text-white bg-teal-600 hover:bg-teal-700 active:scale-[0.99] shadow-md shadow-teal-600/20 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
              >
                {loading ? (
                  <span>Registering...</span>
                ) : (
                  <>
                    <UserPlus className="w-4 h-4" />
                    <span>Register Account</span>
                  </>
                )}
              </button>

              <p className="text-[11px] text-slate-500 leading-relaxed text-center">
                By registering, you consent to secure clinical health record processing under
                national ABDM and FHIR privacy guidelines.
              </p>
            </form>
          )}

          {/* Security & HIPAA Notice Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-start gap-2.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
            <p className="leading-relaxed">
              256-bit TLS encrypted • ABDM & HIPAA compliant architecture. Passwords and clinical
              data are cryptographically protected.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
