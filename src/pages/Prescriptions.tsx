import React, { useState } from 'react';
import {
  Pill,
  Clock,
  User,
  CheckCircle2,
  Filter,
  Plus,
  Info,
} from 'lucide-react';
import { MOCK_MEDICATIONS } from '../data/mockJourneyData';
import type { MedicationCourse } from '../types/journey';
import { useLanguage } from '../context/LanguageContext';
import { DemoBadge } from '../components/DemoBadge';

export const Prescriptions: React.FC = () => {
  const { t } = useLanguage();
  const [medications, setMedications] = useState<MedicationCourse[]>(MOCK_MEDICATIONS);
  const [filterStatus, setFilterStatus] = useState<'all' | 'active' | 'completed'>('all');
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  // New medication form state
  const [newMedName, setNewMedName] = useState('');
  const [newDosage, setNewDosage] = useState('');
  const [newFrequency, setNewFrequency] = useState('Once daily');
  const [newDoctor, setNewDoctor] = useState('Dr. Anand Sharma, MD');
  const [newDuration, setNewDuration] = useState('7 days');
  const [newInstructions, setNewInstructions] = useState('Take after meals');

  const filteredMeds = medications.filter((m) => {
    if (filterStatus === 'all') return true;
    return m.status === filterStatus;
  });

  const activeCount = medications.filter((m) => m.status === 'active').length;
  const completedCount = medications.filter((m) => m.status === 'completed').length;

  const handleAddMedication = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMedName.trim() || !newDosage.trim()) return;

    const newMed: MedicationCourse = {
      id: `rx-${Date.now()}`,
      name: newMedName.trim(),
      genericName: `${newMedName.trim()} (Prescribed)`,
      dosage: newDosage.trim(),
      frequency: newFrequency,
      schedule: {
        morning: newFrequency.includes('Morning') || newFrequency.includes('Twice'),
        afternoon: false,
        night: newFrequency.includes('Night') || newFrequency.includes('Twice') || newFrequency.includes('Once'),
      },
      timing: 'As directed by physician',
      duration: newDuration,
      daysCompleted: 1,
      totalDays: parseInt(newDuration, 10) || 7,
      prescribedBy: newDoctor,
      prescribedDate: new Date().toISOString().split('T')[0],
      status: 'active',
      instructions: newInstructions,
      refillDue: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
    };

    setMedications([newMed, ...medications]);
    setShowAddModal(false);
    setNewMedName('');
    setNewDosage('');
  };

  return (
    <div className="space-y-6">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Pill className="w-7 h-7 text-teal-600" />
              {t('navPrescriptions') || 'Prescriptions & Medications'}
            </h1>
            <DemoBadge />
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Active medication schedules, dosage compliance, refill reminders, and clinical instructions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium text-sm transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Add Medication</span>
          </button>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Active Regimens</p>
            <p className="text-2xl font-bold text-teal-700 mt-1">{activeCount}</p>
            <p className="text-xs text-slate-500 mt-0.5">Currently undergoing therapy</p>
          </div>
          <div className="p-3 bg-teal-50 text-teal-600 rounded-lg">
            <Pill className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Courses</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">{completedCount}</p>
            <p className="text-xs text-slate-500 mt-0.5">Archived clinical treatments</p>
          </div>
          <div className="p-3 bg-slate-50 text-slate-600 rounded-lg">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Refills Approaching</p>
            <p className="text-2xl font-bold text-amber-600 mt-1">2</p>
            <p className="text-xs text-slate-500 mt-0.5">Within next 14 calendar days</p>
          </div>
          <div className="p-3 bg-amber-50 text-amber-600 rounded-lg">
            <Clock className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between border-b border-slate-200 pb-2">
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-slate-400" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Filter:</span>
          {(['all', 'active', 'completed'] as const).map((status) => (
            <button
              key={status}
              onClick={() => setFilterStatus(status)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
                filterStatus === status
                  ? 'bg-teal-100 text-teal-800 font-semibold'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              {status === 'all' && `All (${medications.length})`}
              {status === 'active' && `Active (${activeCount})`}
              {status === 'completed' && `Completed (${completedCount})`}
            </button>
          ))}
        </div>
      </div>

      {/* Medications Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {filteredMeds.map((med) => {
          const progressPercent = Math.min(100, Math.round((med.daysCompleted / med.totalDays) * 100));

          return (
            <div
              key={med.id}
              className="bg-white rounded-xl border border-slate-200 hover:border-teal-300 p-5 shadow-sm transition-all hover:shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2.5">
                    <div
                      className={`p-2.5 rounded-lg ${
                        med.status === 'active' ? 'bg-teal-50 text-teal-700' : 'bg-slate-100 text-slate-500'
                      }`}
                    >
                      <Pill className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="font-bold text-slate-900 text-base">{med.name}</h3>
                      <p className="text-xs text-slate-500 italic">{med.genericName}</p>
                    </div>
                  </div>
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${
                      med.status === 'active'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {med.status}
                  </span>
                </div>

                {/* Dosage & Frequency Badges */}
                <div className="mt-4 flex flex-wrap gap-2 text-xs">
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md font-medium">
                    Dosage: <strong className="text-slate-900">{med.dosage}</strong>
                  </span>
                  <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-md font-medium">
                    Freq: <strong className="text-slate-900">{med.frequency}</strong>
                  </span>
                </div>

                {/* Daily Schedule Indicators */}
                <div className="mt-3.5 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                  <span className="text-slate-500 font-medium">Schedule:</span>
                  <div className="flex items-center gap-1.5 font-medium">
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] ${
                        med.schedule.morning ? 'bg-amber-100 text-amber-800 font-bold' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      Morning
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] ${
                        med.schedule.afternoon
                          ? 'bg-amber-100 text-amber-800 font-bold'
                          : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      Noon
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[11px] ${
                        med.schedule.night ? 'bg-indigo-100 text-indigo-800 font-bold' : 'bg-slate-100 text-slate-400'
                      }`}
                    >
                      Night
                    </span>
                  </div>
                </div>

                {/* Instructions */}
                <div className="mt-3 bg-slate-50 p-2.5 rounded-lg border border-slate-100 text-xs text-slate-600 flex items-start gap-2">
                  <Info className="w-4 h-4 text-teal-600 shrink-0 mt-0.5" />
                  <p>{med.instructions}</p>
                </div>

                {/* Course Progress Bar */}
                <div className="mt-4">
                  <div className="flex justify-between text-xs text-slate-500 font-medium mb-1">
                    <span>Course Progress</span>
                    <span>
                      {med.daysCompleted} / {med.totalDays} Days ({progressPercent}%)
                    </span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        med.status === 'completed' ? 'bg-slate-400' : 'bg-teal-600'
                      }`}
                      style={{ width: `${progressPercent}%` }}
                    />
                  </div>
                </div>
              </div>

              {/* Card Footer: Doctor & Action */}
              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                <div className="flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{med.prescribedBy}</span>
                </div>
                {med.refillDue && (
                  <span className="text-teal-700 font-medium">Refill: {med.refillDue}</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Medication Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Pill className="w-5 h-5 text-teal-600" />
              Add Prescription Regimen
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Add medications manually or sync with your latest verified clinical prescriptions.
            </p>

            <form onSubmit={handleAddMedication} className="mt-4 space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Medication Name</label>
                <input
                  type="text"
                  placeholder="e.g. Ciprofloxacin or Pantoprazole"
                  value={newMedName}
                  onChange={(e) => setNewMedName(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Dosage</label>
                  <input
                    type="text"
                    placeholder="e.g. 500 mg or 10 ml"
                    value={newDosage}
                    onChange={(e) => setNewDosage(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Frequency</label>
                  <select
                    value={newFrequency}
                    onChange={(e) => setNewFrequency(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="Once daily with dinner">Once daily (Night)</option>
                    <option value="Twice daily (Every 12 hours)">Twice daily (Morning & Night)</option>
                    <option value="Three times daily">Three times daily</option>
                    <option value="As needed (SOS)">As needed (SOS / PRN)</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Course Duration</label>
                  <input
                    type="text"
                    placeholder="e.g. 7 days or 30 days"
                    value={newDuration}
                    onChange={(e) => setNewDuration(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Prescribing Doctor</label>
                  <input
                    type="text"
                    placeholder="Dr. Anand Sharma, MD"
                    value={newDoctor}
                    onChange={(e) => setNewDoctor(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Special Instructions</label>
                <textarea
                  rows={2}
                  placeholder="e.g. Take 30 mins before breakfast on empty stomach"
                  value={newInstructions}
                  onChange={(e) => setNewInstructions(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  Save Regimen
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
