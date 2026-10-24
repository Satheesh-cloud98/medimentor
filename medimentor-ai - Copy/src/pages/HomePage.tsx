import React from 'react';
import { Link } from 'react-router-dom';
import {
  HeartPulse,
  LogIn,
  UserPlus,
  ShieldCheck,
  FileText,
  Activity,
  ArrowRight,
  Lock,
  Stethoscope,
  Sparkles,
} from 'lucide-react';
import { useReports } from '../context/ReportsContext';

export const HomePage: React.FC = () => {
  const { profile } = useReports();

  // Check if active user session is present
  const isAuthenticated =
    typeof window !== 'undefined' &&
    localStorage.getItem('medimentor_is_authenticated') === 'true';

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 via-teal-50/20 to-slate-50 text-slate-800 flex flex-col font-sans">
      {/* Top Center Header Bar */}
      <header className="w-full bg-white/90 backdrop-blur-md border-b border-slate-200/80 py-4 px-4 sm:px-6 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto flex flex-col items-center justify-center text-center">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-teal-600 flex items-center justify-center text-white shadow-md shadow-teal-600/20">
              <HeartPulse className="w-5 h-5" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
              MediMentor
            </h1>
          </div>
          <p className="text-xs sm:text-sm font-medium text-teal-700 tracking-wide mt-1">
            &ldquo;Your Health Journey, Clearly Guided.&rdquo;
          </p>
        </div>
      </header>

      {/* Main Content — Center of the Page */}
      <main className="flex-1 flex flex-col justify-center items-center px-4 sm:px-6 py-10 sm:py-16 max-w-5xl mx-auto w-full">
        {/* Main Welcome Hero Card */}
        <section className="w-full bg-white rounded-3xl border border-slate-200/90 shadow-xl shadow-slate-200/50 p-8 sm:p-12 lg:p-16 text-center animate-fadeIn relative overflow-hidden">
          {/* Subtle background glow */}
          <div
            className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-96 bg-teal-100/50 rounded-full blur-3xl pointer-events-none"
            aria-hidden="true"
          />

          <div className="relative z-10 max-w-3xl mx-auto space-y-6 sm:space-y-8">
            {/* Clinical Trust Badge */}
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-teal-50 border border-teal-200 text-teal-800 text-xs font-semibold shadow-2xs">
              <ShieldCheck className="w-4 h-4 text-teal-600" />
              <span>Secure Digital Health & Clinical Intelligence</span>
            </div>

            {/* Main Welcome Heading */}
            <h2 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold text-slate-900 tracking-tight leading-tight">
              Welcome to MediMentor
            </h2>

            {/* Supporting Text */}
            <p className="text-base sm:text-lg lg:text-xl text-slate-600 leading-relaxed font-normal max-w-2xl mx-auto">
              {"Understand your health information, organize your medical records, and prepare for more informed conversations with your healthcare provider."}
            </p>

            {/* Primary Action Buttons */}
            <div className="pt-2 sm:pt-4 flex flex-col sm:flex-row items-center justify-center gap-4 max-w-md mx-auto">
              {/* Button 1: Patient Sign In */}
              <Link
                to="/auth?mode=signin"
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-sm sm:text-base text-white bg-teal-600 hover:bg-teal-700 active:scale-[0.99] shadow-md shadow-teal-600/25 transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
              >
                <LogIn className="w-5 h-5" />
                <span>Patient Sign In</span>
              </Link>

              {/* Button 2: Create Patient Account */}
              <Link
                to="/auth?mode=signup"
                className="w-full sm:w-auto flex-1 inline-flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-sm sm:text-base text-teal-800 bg-white hover:bg-teal-50/70 border-2 border-teal-600 active:scale-[0.99] shadow-2xs transition-all focus:outline-none focus:ring-2 focus:ring-teal-500 focus:ring-offset-2"
              >
                <UserPlus className="w-5 h-5 text-teal-700" />
                <span>Create Patient Account</span>
              </Link>
            </div>

            {/* Returning Session Quick Access Banner (if active) */}
            {isAuthenticated && (
              <div className="pt-4">
                <div className="p-3.5 rounded-2xl bg-teal-50/90 border border-teal-200/80 inline-flex flex-wrap items-center justify-center gap-2.5 text-xs text-teal-900">
                  <Activity className="w-4 h-4 text-teal-700 shrink-0" />
                  <span>
                    Active session detected for <strong>{profile.name}</strong>.
                  </span>
                  <Link
                    to="/dashboard"
                    className="font-bold underline text-teal-800 hover:text-teal-950 inline-flex items-center gap-1"
                  >
                    Continue to Dashboard <ArrowRight className="w-3.5 h-3.5" />
                  </Link>
                </div>
              </div>
            )}

            {/* Feature Highlights Grid */}
            <div className="pt-6 sm:pt-8 grid grid-cols-1 sm:grid-cols-3 gap-4 text-left border-t border-slate-100">
              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-teal-100 text-teal-700 shrink-0 mt-0.5">
                  <FileText className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Organized Records</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Consolidate prescriptions, lab tests, and clinical documents in one place.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700 shrink-0 mt-0.5">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Clear Explanations</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Medical reports translated into everyday, easy-to-understand language.
                  </p>
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-slate-50/80 border border-slate-100 flex items-start gap-3">
                <div className="p-2 rounded-lg bg-indigo-100 text-indigo-700 shrink-0 mt-0.5">
                  <Stethoscope className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-xs font-bold text-slate-900">Doctor-Ready Questions</h3>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Prepare thoughtful, grounded questions for your next clinical consultation.
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Bottom Section: About MediMentor */}
        <section className="w-full mt-10 sm:mt-14 max-w-4xl mx-auto">
          <div className="bg-white rounded-3xl border border-slate-200/90 p-6 sm:p-8 shadow-sm space-y-3.5 text-center sm:text-left">
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <ShieldCheck className="w-5 h-5 text-teal-600" />
              <h3 className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight">
                About MediMentor
              </h3>
            </div>
            <p className="text-sm sm:text-base text-slate-600 leading-relaxed">
              {"MediMentor helps you keep your healthcare journey organized by bringing your medical information into one accessible place. Review available health records, understand medical information in simpler language, keep track of relevant follow-ups, and prepare questions for your healthcare provider. MediMentor supports informed healthcare conversations and does not replace professional medical advice."}
            </p>
            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-xs text-slate-400">
              <span className="flex items-center gap-1.5">
                <Lock className="w-3.5 h-3.5 text-teal-600" /> 256-bit TLS Protected
              </span>
              <span>•</span>
              <span className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-teal-600" /> ABDM / FHIR Interoperable
              </span>
              <span>•</span>
              <span>Patient Data Confidentiality Preserved</span>
            </div>
          </div>
        </section>
      </main>

      {/* Public Footer */}
      <footer className="border-t border-slate-200/80 bg-white/80 py-6 px-4 sm:px-6 text-xs text-slate-500 text-center mt-auto">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-extrabold text-teal-800">MediMentor</span>
            <span>•</span>
            <span className="text-teal-700 italic">"Your Health Journey, Clearly Guided."</span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <Link to="/auth?mode=signin" className="hover:text-teal-700 transition-colors">
              Patient Sign In
            </Link>
            <span>•</span>
            <Link to="/auth?mode=signup" className="hover:text-teal-700 transition-colors">
              Create Account
            </Link>
            <span>•</span>
            <Link to="/provider-portal" className="hover:text-teal-700 transition-colors">
              Healthcare Providers
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
