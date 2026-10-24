import React, { useState } from 'react';
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
} from 'lucide-react';
import { MOCK_PROVIDERS } from '../data/mockJourneyData';
import type { ProviderItem } from '../types/journey';
import { useLanguage } from '../context/LanguageContext';
import { DemoBadge } from '../components/DemoBadge';

export const ProviderPortal: React.FC = () => {
  const { t } = useLanguage();
  const [providers, setProviders] = useState<ProviderItem[]>(MOCK_PROVIDERS);
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'Hospital' | 'Diagnostic Lab' | 'Clinic'>('all');
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [type, setType] = useState<'Hospital' | 'Clinic' | 'Diagnostic Lab'>('Hospital');
  const [specialty, setSpecialty] = useState('');
  const [address, setAddress] = useState('');
  const city = 'Bengaluru, Karnataka';
  const [phone, setPhone] = useState('');
  const email = '';
  const [license, setLicense] = useState('');

  const filteredProviders = providers.filter((p) => {
    const matchesQuery =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.specialty && p.specialty.toLowerCase().includes(searchQuery.toLowerCase()));

    const matchesType = typeFilter === 'all' || p.type === typeFilter;
    return matchesQuery && matchesType;
  });

  const handleRegisterFacility = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newFacility: ProviderItem = {
      id: `prov-${Date.now()}`,
      name: name.trim(),
      type,
      specialty: specialty.trim() || 'General Medicine',
      address: address.trim() || 'Central Healthcare Complex',
      city: city.trim(),
      phone: phone.trim() || '+91 80 5555 4321',
      email: email.trim() || 'contact@facility-demo.health',
      verificationStatus: 'Submitted',
      licenseNumber: license.trim() || `NABH-REG-2026-${Math.floor(1000 + Math.random() * 9000)}`,
      fhirEndpoint: `https://fhir.${name.toLowerCase().replace(/[^a-z0-9]/g, '')}-demo.health/r4`,
      rating: 5.0,
    };

    setProviders([newFacility, ...providers]);
    setShowRegisterModal(false);
    setName('');
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
            Empaneled clinical facilities, diagnostic laboratories, and credential verification registry.
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

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200">
        <div className="relative w-full sm:w-72">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search facility name, city, or specialty..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-teal-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Type:</span>
          {(['all', 'Hospital', 'Diagnostic Lab', 'Clinic'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                typeFilter === t ? 'bg-teal-100 text-teal-800 font-bold' : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {t === 'all' ? `All (${providers.length})` : t}
            </button>
          ))}
        </div>
      </div>

      {/* Provider Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredProviders.map((prov) => (
          <div
            key={prov.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-teal-300 transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2.5">
                  <div className="p-2.5 bg-teal-50 text-teal-700 rounded-xl">
                    <Building2 className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-base">{prov.name}</h3>
                    <p className="text-xs font-medium text-teal-700">{prov.specialty}</p>
                  </div>
                </div>

                <span
                  className={`px-2 py-0.5 rounded text-[11px] font-bold uppercase tracking-wider ${
                    prov.verificationStatus === 'Verified'
                      ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                      : prov.verificationStatus === 'Under Review'
                      ? 'bg-amber-50 text-amber-700 border border-amber-200'
                      : 'bg-slate-100 text-slate-600 border border-slate-200'
                  }`}
                >
                  {prov.verificationStatus}
                </span>
              </div>

              <div className="mt-4 space-y-1.5 text-xs text-slate-600">
                <div className="flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>
                    {prov.address}, {prov.city}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{prov.phone}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                  <span>{prov.email}</span>
                </div>
                <div className="flex items-center gap-2">
                  <FileCheck2 className="w-3.5 h-3.5 text-teal-600 shrink-0" />
                  <span className="font-mono text-slate-700">License: {prov.licenseNumber}</span>
                </div>
              </div>
            </div>

            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-400 font-mono truncate max-w-[200px]">{prov.fhirEndpoint}</span>
              <div className="flex items-center gap-1 font-semibold text-slate-700">
                <Star className="w-3.5 h-3.5 text-amber-500 fill-amber-500" />
                <span>{prov.rating}</span>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Registration Modal */}
      {showRegisterModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-teal-600" />
              Register Healthcare Facility
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Submit your hospital, clinic, or diagnostic laboratory for network credential verification.
            </p>

            <form onSubmit={handleRegisterFacility} className="mt-4 space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Facility Name</label>
                <input
                  type="text"
                  placeholder="e.g. City General Hospital or Medinova Diagnostic"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Facility Category</label>
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

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Address & City</label>
                <input
                  type="text"
                  placeholder="Street Address, City, State"
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
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
                  <label className="block text-xs font-semibold text-slate-700 mb-1">License / NABH Number</label>
                  <input
                    type="text"
                    placeholder="NABH-2026-KA-XXXX"
                    value={license}
                    onChange={(e) => setLicense(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
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
