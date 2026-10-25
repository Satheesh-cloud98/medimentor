import React, { useState } from 'react';
import {
  Languages,
  User,
  RotateCcw,
  Shield,
  Check,
  Save,
  CheckCircle2,
  Info,
  Sparkles,
} from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';
import { useReports } from '../context/ReportsContext';
import { DemoBadge } from '../components/DemoBadge';

export const Settings: React.FC = () => {
  const { language, setLanguage, t, languages } = useLanguage();
  const { profile, updateProfile, resetToDemoData, availableProfiles, switchProfile } = useReports();

  const [apiKeyInput, setApiKeyInput] = useState(() => {
    return typeof window !== 'undefined' ? localStorage.getItem('medimentor_gemini_api_key') || '' : '';
  });
  const [keySaved, setKeySaved] = useState(false);
  const [showKey, setShowKey] = useState(false);

  const handleSaveApiKey = (e: React.FormEvent) => {
    e.preventDefault();
    if (apiKeyInput.trim()) {
      localStorage.setItem('medimentor_gemini_api_key', apiKeyInput.trim());
    } else {
      localStorage.removeItem('medimentor_gemini_api_key');
    }
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 3000);
  };

  const [name, setName] = useState(profile.name);
  const [age, setAge] = useState(String(profile.age));
  const [gender, setGender] = useState(profile.gender);
  const [bloodGroup, setBloodGroup] = useState(profile.bloodGroup);
  const [emergencyContact, setEmergencyContact] = useState(profile.emergencyContact);
  const [allergies, setAllergies] = useState(profile.allergies);
  const [chronicConditions, setChronicConditions] = useState(profile.chronicConditions);

  const handleSwitchProfile = (pId: string) => {
    switchProfile(pId);
    const target = availableProfiles.find((p) => p.id === pId);
    if (target) {
      setName(target.name);
      setAge(String(target.age));
      setGender(target.gender);
      setBloodGroup(target.bloodGroup);
      setEmergencyContact(target.emergencyContact);
      setAllergies(target.allergies);
      setChronicConditions(target.chronicConditions);
    }
  };

  const [savedSuccess, setSavedSuccess] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfile({
      name,
      age: parseInt(age, 10) || 42,
      gender,
      bloodGroup,
      emergencyContact,
      allergies,
      chronicConditions,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetData = () => {
    if (window.confirm('Reset all demo medical records and profile values to default?')) {
      resetToDemoData();
      setName('Arjun K. Sharma');
      setAge('42');
      setGender('Male');
      setBloodGroup('B Positive (B+)');
      setEmergencyContact('+91 98765 43210');
      setAllergies('Penicillin (Mild urticaria)');
      setChronicConditions('Mild Dyslipidemia, Family history of Type 2 Diabetes');
      setResetSuccess(true);
      setTimeout(() => setResetSuccess(false), 3000);
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs">
        <div className="flex items-center gap-2 mb-1.5">
          <span className="text-xs font-bold text-teal-700 uppercase tracking-wider">
            Configuration
          </span>
          <DemoBadge size="sm" />
        </div>
        <h2 className="text-xl sm:text-2xl font-extrabold text-slate-900 tracking-tight">
          {t('settingsTitle')}
        </h2>
        <p className="text-xs sm:text-sm text-slate-500 mt-1">
          {t('settingsSubtitle')}
        </p>
      </div>

      {/* Language Section - All 13 Languages */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Languages className="w-5 h-5 text-teal-600" />
              <span>{t('languageSettingsTitle')} (13 Languages)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              {t('languageSettingsDesc')}
            </p>
          </div>
          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-teal-50 text-teal-800 border border-teal-200 shrink-0">
            Active: {languages.find((l) => l.code === language)?.nativeName}
          </span>
        </div>

        {/* 13 Language Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 pt-2">
          {languages.map((item) => {
            const isSelected = item.code === language;

            return (
              <button
                key={item.code}
                onClick={() => setLanguage(item.code)}
                className={`p-3.5 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isSelected
                    ? 'bg-teal-50/90 border-teal-500 ring-2 ring-teal-500/20 shadow-xs'
                    : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between gap-1">
                  <span className="text-xs text-slate-500 font-medium">{item.name}</span>
                  {isSelected && (
                    <span className="w-4 h-4 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-3" />
                    </span>
                  )}
                </div>
                <span className="text-base font-bold text-slate-900 mt-2 block tracking-tight">
                  {item.nativeName}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Patient Profile / Account Switcher (Multi-User Data Isolation) */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-bold text-teal-700 uppercase tracking-wider flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5 text-teal-600" />
                Multi-User Privacy Isolation
              </span>
            </div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-teal-600" />
              <span>Active Patient Account Switcher</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Medical records and health timelines are strictly partitioned per patient account in local storage. Switching accounts isolates the clinical data so one patient never accesses another's records.
            </p>
          </div>

          <div className="shrink-0">
            <span className="text-xs font-bold px-3 py-1.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200">
              Active: {profile.name}
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
          {availableProfiles.map((p) => {
            const isActive = p.id === profile.id;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => handleSwitchProfile(p.id)}
                className={`p-4 rounded-2xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                  isActive
                    ? 'bg-teal-50/90 border-teal-500 ring-2 ring-teal-500/20 shadow-xs'
                    : 'bg-slate-50/60 border-slate-200/80 hover:bg-slate-100 hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                    {p.id === 'user-arjun' ? 'Default Patient' : p.id === 'user-priya' ? 'Family Member' : 'Isolated User'}
                  </span>
                  {isActive && (
                    <span className="w-4 h-4 rounded-full bg-teal-600 text-white flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 stroke-3" />
                    </span>
                  )}
                </div>
                <div className="mt-2">
                  <p className="text-sm font-extrabold text-slate-900">{p.name}</p>
                  <p className="text-xs text-slate-500">
                    {p.age}y • {p.gender} • {p.bloodGroup}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Patient Demographic Form */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <User className="w-5 h-5 text-teal-600" />
              <span>{t('patientProfileTitle')}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">{t('patientProfileDesc')}</p>
          </div>
          <DemoBadge size="sm" />
        </div>

        {savedSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>Profile details updated successfully!</span>
          </div>
        )}

        <form onSubmit={handleSaveProfile} className="space-y-4 pt-2">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('patientNameLabel')}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-teal-600 bg-slate-50/50"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('patientAgeLabel')}
                </label>
                <input
                  type="number"
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-teal-600 bg-slate-50/50"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {t('patientGenderLabel')}
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-teal-600 bg-slate-50/50"
                >
                  <option value="Male">Male</option>
                  <option value="Female">Female</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('bloodGroupLabel')}
              </label>
              <input
                type="text"
                value={bloodGroup}
                onChange={(e) => setBloodGroup(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-teal-600 bg-slate-50/50"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {t('emergencyContactLabel')}
              </label>
              <input
                type="text"
                value={emergencyContact}
                onChange={(e) => setEmergencyContact(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-teal-600 bg-slate-50/50"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Known Drug Allergies
              </label>
              <input
                type="text"
                value={allergies}
                onChange={(e) => setAllergies(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-teal-600 bg-slate-50/50"
              />
            </div>

            <div className="sm:col-span-2">
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Chronic Health Notes
              </label>
              <input
                type="text"
                value={chronicConditions}
                onChange={(e) => setChronicConditions(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-teal-600 bg-slate-50/50"
              />
            </div>
          </div>

          <div className="pt-2 flex justify-end">
            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-2xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-sm shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{t('save')}</span>
            </button>
          </div>
        </form>
      </div>

      {/* AI Engine & Custom API Key */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-teal-600" />
              <span>AI Service &amp; Custom Gemini API Key (Optional)</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1 leading-relaxed">
              MediMentor AI generates clinical explanations and educational insights using Google Gemini. By default, requests use the server-side credentials. If you wish to use your personal Google AI Studio credentials, save your API key below. It is stored securely in your browser's local sandbox only and sent directly via secure header to the serverless AI endpoint.
            </p>
          </div>
        </div>

        {keySaved && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>API Key configuration saved in browser sandbox!</span>
          </div>
        )}

        <form onSubmit={handleSaveApiKey} className="space-y-3 pt-1">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Google AI Studio API Key (GEMINI_API_KEY)
            </label>
            <div className="flex items-center gap-2">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKeyInput}
                onChange={(e) => setApiKeyInput(e.target.value)}
                placeholder="AIzaSy..."
                className="flex-1 px-3.5 py-2.5 rounded-xl border border-slate-200 text-sm focus:outline-teal-600 bg-slate-50/50 font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="px-3 py-2.5 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                {showKey ? 'Hide' : 'Show'}
              </button>
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Get a free API key at <a href="https://aistudio.google.com/" target="_blank" rel="noreferrer" className="text-teal-600 underline font-semibold">Google AI Studio</a>. Leave empty to use the server key.
            </p>
          </div>

          <div className="flex items-center justify-between pt-1">
            {apiKeyInput ? (
              <button
                type="button"
                onClick={() => {
                  setApiKeyInput('');
                  localStorage.removeItem('medimentor_gemini_api_key');
                  setKeySaved(true);
                  setTimeout(() => setKeySaved(false), 3000);
                }}
                className="text-xs font-bold text-rose-600 hover:text-rose-700 cursor-pointer"
              >
                Clear Custom Key
              </button>
            ) : <span />}

            <button
              type="submit"
              className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-teal-600 hover:bg-teal-700 text-white font-bold text-xs sm:text-sm shadow-xs transition-colors cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>Save Key</span>
            </button>
          </div>
        </form>
      </div>

      {/* Demo Data Management */}
      <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200/90 shadow-2xs space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-teal-600" />
              <span>{t('dataManagementTitle')}</span>
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Reset cached demonstration records, custom edits, and verification statuses.
            </p>
          </div>
        </div>

        {resetSuccess && (
          <div className="p-3 bg-emerald-50 border border-emerald-300 rounded-xl text-emerald-900 text-xs font-bold flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{t('resetSuccessMessage')}</span>
          </div>
        )}

        <div className="pt-2 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <p className="text-xs text-slate-500">
            Returns all 4 laboratory reports and sample clinical values back to factory demo defaults.
          </p>

          <button
            onClick={handleResetData}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-2xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold text-xs sm:text-sm transition-colors cursor-pointer shrink-0"
          >
            <RotateCcw className="w-4 h-4" />
            <span>{t('resetDemoDataBtn')}</span>
          </button>
        </div>
      </div>

      {/* Architecture & Privacy Notice */}
      <div className="bg-slate-100/70 rounded-3xl p-5 border border-slate-200 text-xs text-slate-600 space-y-2">
        <div className="flex items-center gap-2 font-bold text-slate-800">
          <Shield className="w-4 h-4 text-teal-700" />
          <span>Local Clinical Sandbox Architecture</span>
        </div>
        <p className="leading-relaxed">
          MediMentor AI runs securely in your local browser sandbox. Pre-loaded benchmark records are clearly labeled as demo data, while newly uploaded documents undergo real text extraction (PDF.js &amp; Tesseract OCR), automated specialty parsing, and grounded Gemini AI synthesis.
        </p>
        <div className="pt-2 flex items-center gap-4 text-[11px] text-slate-500">
          <span>MediMentor AI v1.0.0</span>
          <span>•</span>
          <span>React 19 + TypeScript + Vite + Tailwind CSS</span>
          <span>•</span>
          <span className="flex items-center gap-1">
            <Info className="w-3.5 h-3.5 text-teal-600" /> 13 Indian Languages
          </span>
        </div>
      </div>
    </div>
  );
};
