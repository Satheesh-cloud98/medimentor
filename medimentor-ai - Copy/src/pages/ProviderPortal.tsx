import React, { useState } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Building2,
  Search,
  Filter,
  MapPin,
  Phone,
  Mail,
  Plus,
  Star,
  FileCheck2,
  CheckCircle2,
  Clock,
  Check,
  X,
  Layers,
} from 'lucide-react';
import { MOCK_PROVIDERS } from '../data/mockJourneyData';
import type { ProviderItem } from '../types/journey';
import { useLanguage } from '../context/LanguageContext';
import { DemoBadge } from '../components/DemoBadge';

export const ProviderPortal: React.FC = () => {
  const { t } = useLanguage();
  const location = useLocation();

  const [activeTab, setActiveTab] = useState<'directory' | 'queue'>(
    location.pathname.includes('verification') ? 'queue' : 'directory'
  );

  const [providers, setProviders] = useState<ProviderItem[]>(MOCK_PROVIDERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Hospital' | 'Diagnostic Lab' | 'Clinic'>('all');
  const [showRegisterModal, setShowRegisterModal] = useState(location.pathname.includes('register'));

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<'Hospital' | 'Clinic' | 'Diagnostic Lab'>('Hospital');
  const [specialty, setSpecialty] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('Bengaluru, Karnataka');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [license, setLicense] = useState('');

  const filteredProviders = providers.filter((p) => {
    const matchesQuery =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.specialty && p.specialty.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = typeFilter === 'all' || p.type === typeFilter;
    return matchesQuery && matchesType;
  });

  const queueProviders = providers.filter(
    (p) => p.verificationStatus === 'Submitted' || p.verificationStatus === 'Under Review'
  );

  const handleRegisterFacility = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newFacility: ProviderItem = {
      id: `prov-${Date.now()}`,
      name: name.trim(),
      type,
      specialty: specialty.trim() || 'General Clinical Medicine',
      address: address.trim() || 'Central Healthcare Complex',
      city: city.trim() || 'Bengaluru, Karnataka',
      phone: phone.trim() || '+91 80 5555 4321',
      email: email.trim() || 'admin@facility-demo.health',
      verificationStatus: 'Submitted',
      licenseNumber: license.trim() || `NABH-REG-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      fhirEndpoint: `https://fhir.${name.toLowerCase().replace(/[^a-z0-9]/g, '')}-demo.health/r4`,
      rating: 5.0,
    };

    setProviders([newFacility, ...providers]);
    setShowRegisterModal(false);
    setName('');
    setAddress('');
    setPhone('');
    setEmail('');
    setLicense('');
    setActiveTab('queue');
  };

  const handleApproveProvider = (id: string) => {
    setProviders(
      providers.map((p) => (p.id === id ? { ...p, verificationStatus: 'Verified' as const } : p))
    );
  };

  const handleRejectProvider = (id: string) => {
    setProviders(
      providers.map((p) => (p.id === id ? { ...p, verificationStatus: 'Rejected' as const } : p))
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Building2 className="w-7 h-7 text-teal-600" />
              {t('navProviderPortal') || 'Provider Network Directory & Verification'}
            </h1>
            <DemoBadge />
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Empaneled clinical facilities, diagnostic laboratories, FHIR endpoints, and credential verification registry.
          </p>
        </div>

        <button
          onClick={() => setShowRegisterModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-semibold transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Register New Facility</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-6 text-sm font-semibold">
        <button
          onClick={() => setActiveTab('directory')}
          className={`pb-3 transition-colors relative flex items-center gap-2 ${
            activeTab === 'directory' ? 'text-teal-700 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Building2 className="w-4 h-4" />
          <span>Empaneled Directory</span>
          <span className="text-xs px-2 py-0.2 rounded-full bg-slate-100 text-slate-600">{providers.length}</span>
        </button>

        <button
          onClick={() => setActiveTab('queue')}
          className={`pb-3 transition-colors relative flex items-center gap-2 ${
            activeTab === 'queue' ? 'text-teal-700 border-b-2 border-teal-600' : 'text-slate-500 hover:text-slate-800'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>Verification Review Queue</span>
          {queueProviders.length > 0 && (
            <span className="text-xs px-2 py-0.2 rounded-full bg-amber-100 text-amber-800 font-bold">
              {queueProviders.length} Pending
            </span>
          )}
        </button>
      </div>

      {/* Directory Tab */}
      {activeTab === 'directory' && (
        <div className="space-y-4">
          {/* Search & Filter Bar */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
            <div className="relative w-full sm:w-72">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search facility name, city, specialty..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 bg-slate-50/50"
              />
            </div>

            <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
              <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0 mr-1" />
              {(['all', 'Hospital', 'Diagnostic Lab', 'Clinic'] as const).map((filter) => (
                <button
                  key={filter}
                  onClick={() => setTypeFilter(filter)}
                  className={`px-3 py-1 rounded-lg text-xs font-medium whitespace-nowrap transition-colors ${
                    typeFilter === filter
                      ? 'bg-teal-600 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  {filter === 'all' ? 'All Types' : filter}
                </button>
              ))}
            </div>
          </div>

          {/* Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredProviders.map((prov) => (
              <div
                key={prov.id}
                className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-teal-300 transition-all space-y-3"
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{prov.name}</h3>
                    <p className="text-xs text-teal-700 font-medium mt-0.5">{prov.specialty}</p>
                  </div>
                  <span
                    className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider shrink-0 ${
                      prov.verificationStatus === 'Verified'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : prov.verificationStatus === 'Rejected'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-amber-50 text-amber-800 border border-amber-200'
                    }`}
                  >
                    {prov.verificationStatus}
                  </span>
                </div>

                <div className="space-y-1.5 text-xs text-slate-600 pt-1">
                  <p className="flex items-center gap-1.5">
                    <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{prov.address}, {prov.city}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{prov.phone}</span>
                  </p>
                  <p className="flex items-center gap-1.5">
                    <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                    <span>{prov.email}</span>
                  </p>
                </div>

                <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="font-mono text-[11px] text-slate-400">NABH: {prov.licenseNumber}</span>
                  <div className="flex items-center gap-1 text-amber-500 font-bold">
                    <Star className="w-3.5 h-3.5 fill-current" />
                    <span>{(prov.rating ?? 5.0).toFixed(1)}</span>
                  </div>
                </div>

                <div className="bg-slate-50 p-2 rounded text-[11px] text-slate-500 font-mono truncate">
                  FHIR: {prov.fhirEndpoint}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Queue Tab */}
      {activeTab === 'queue' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-start gap-3">
            <Layers className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900">
              <p className="font-bold">Credential Verification & Empanelment Queue</p>
              <p className="mt-0.5 leading-relaxed text-amber-800">
                Inspect facilities that have submitted clinical registrations, NABH / ROHINI accreditations, and FHIR endpoints for network onboarding.
              </p>
            </div>
          </div>

          {queueProviders.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 p-8 text-center text-sm text-slate-500">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
              <p className="font-semibold text-slate-800">Review Queue is Clear</p>
              <p className="text-xs mt-1">All submitted clinical facilities have been reviewed and processed.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {queueProviders.map((prov) => (
                <div
                  key={prov.id}
                  className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2">
                      <h3 className="font-bold text-slate-900 text-base">{prov.name}</h3>
                      <span className="px-2 py-0.5 bg-amber-100 text-amber-800 text-[10px] font-bold rounded uppercase">
                        {prov.verificationStatus}
                      </span>
                    </div>
                    <p className="text-xs text-slate-600">
                      <strong>Facility Type:</strong> {prov.type} • <strong>Specialty:</strong> {prov.specialty}
                    </p>
                    <p className="text-xs text-slate-500">
                      <strong>License:</strong> {prov.licenseNumber} • <strong>Location:</strong> {prov.address}, {prov.city}
                    </p>
                    <p className="text-xs text-slate-400 font-mono">Endpoint: {prov.fhirEndpoint}</p>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 border-t md:border-t-0 pt-3 md:pt-0">
                    <button
                      onClick={() => handleApproveProvider(prov.id)}
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-semibold shadow-sm transition-all"
                    >
                      <Check className="w-4 h-4" />
                      <span>Approve Credentials</span>
                    </button>
                    <button
                      onClick={() => handleRejectProvider(prov.id)}
                      className="flex items-center gap-1.5 px-3 py-2 border border-slate-300 text-slate-600 hover:bg-rose-50 hover:text-rose-600 hover:border-rose-300 rounded-lg text-xs font-semibold transition-all"
                    >
                      <X className="w-4 h-4" />
                      <span>Reject</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Register Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <FileCheck2 className="w-5 h-5 text-teal-600" />
              Register Healthcare Facility
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Onboard a clinical hospital, laboratory, or diagnostic center into the MediMentor ABDM registry.
            </p>

            <form onSubmit={handleRegisterFacility} className="mt-4 space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Facility Name</label>
                <input
                  type="text"
                  placeholder="e.g. Apollo Diagnostics & Specialty Care"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Facility Type</label>
                  <select
                    value={type}
                    onChange={(e) => setType(e.target.value as any)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Hospital">Hospital</option>
                    <option value="Diagnostic Lab">Diagnostic Lab</option>
                    <option value="Clinic">Clinic</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Primary Specialty</label>
                  <input
                    type="text"
                    placeholder="e.g. Cardiology, Pathology"
                    value={specialty}
                    onChange={(e) => setSpecialty(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Address</label>
                  <input
                    type="text"
                    placeholder="Street Address"
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">City & State</label>
                  <input
                    type="text"
                    placeholder="Bengaluru, Karnataka"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Official Contact Phone</label>
                  <input
                    type="text"
                    placeholder="+91 80 5555 1234"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Official Email</label>
                  <input
                    type="email"
                    placeholder="contact@facility.org"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">License / NABH Number</label>
                <input
                  type="text"
                  placeholder="NABH-2026-KA-XXXX"
                  value={license}
                  onChange={(e) => setLicense(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowRegisterModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  Submit for Verification
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
