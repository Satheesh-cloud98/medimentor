import React, { useState } from 'react';
import {
  Calendar,
  Clock,
  Video,
  MapPin,
  Plus,
  CheckCircle2,
  Filter,
} from 'lucide-react';
import { MOCK_APPOINTMENTS } from '../data/mockJourneyData';
import type { AppointmentItem } from '../types/journey';
import { useLanguage } from '../context/LanguageContext';
import { DemoBadge } from '../components/DemoBadge';

export const Appointments: React.FC = () => {
  const { t } = useLanguage();
  const [appointments, setAppointments] = useState<AppointmentItem[]>(MOCK_APPOINTMENTS);
  const [filterType, setFilterType] = useState<'all' | 'upcoming' | 'past'>('all');
  const [showBookingModal, setShowBookingModal] = useState<boolean>(false);

  // Form State
  const [docName, setDocName] = useState('Dr. Anand Sharma, MD');
  const [specialty, setSpecialty] = useState('Cardiology & Internal Medicine');
  const [clinic, setClinic] = useState('Apex Clinical Care, Bengaluru');
  const [aptDate, setAptDate] = useState('2026-11-05');
  const [aptTime, setAptTime] = useState('11:00 AM');
  const [consultType, setConsultType] = useState<'in-person' | 'video'>('video');
  const [reason, setReason] = useState('Follow-up review of recent laboratory results');

  const today = new Date().toISOString().split('T')[0];

  const filteredAppointments = appointments.filter((apt) => {
    if (filterType === 'upcoming') return apt.date >= today && apt.status !== 'cancelled';
    if (filterType === 'past') return apt.date < today || apt.status === 'completed';
    return true;
  });

  const handleBookAppointment = (e: React.FormEvent) => {
    e.preventDefault();
    const newApt: AppointmentItem = {
      id: `apt-${Date.now()}`,
      doctorName: docName,
      specialty,
      hospitalOrClinic: clinic,
      date: aptDate,
      time: aptTime,
      type: consultType,
      status: 'confirmed',
      reason,
      locationOrLink:
        consultType === 'video'
          ? `https://telehealth.medimentor.org/room/apt-${Date.now()}`
          : 'Consultation Room 3, OPD Wing',
    };

    setAppointments([newApt, ...appointments]);
    setShowBookingModal(false);
  };

  const cancelAppointment = (id: string) => {
    setAppointments(
      appointments.map((a) => (a.id === id ? { ...a, status: 'cancelled' as const } : a))
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Calendar className="w-7 h-7 text-teal-600" />
              {t('navAppointments') || 'Clinical Consultations & Appointments'}
            </h1>
            <DemoBadge />
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Schedule, monitor, and coordinate in-person clinical visits and secure video telehealth sessions.
          </p>
        </div>

        <button
          onClick={() => setShowBookingModal(true)}
          className="flex items-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-medium text-sm transition-all shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>Book Consultation</span>
        </button>
      </div>

      {/* Quick Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Upcoming Visits</p>
            <p className="text-2xl font-bold text-teal-700 mt-1">
              {appointments.filter((a) => a.date >= today && a.status === 'confirmed').length}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Confirmed appointments</p>
          </div>
          <div className="p-3 bg-teal-50 text-teal-600 rounded-lg">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Telehealth Sessions</p>
            <p className="text-2xl font-bold text-indigo-700 mt-1">
              {appointments.filter((a) => a.type === 'video').length}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Remote video consultations</p>
          </div>
          <div className="p-3 bg-indigo-50 text-indigo-600 rounded-lg">
            <Video className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex items-center justify-between">
          <div>
            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Completed Reviews</p>
            <p className="text-2xl font-bold text-slate-800 mt-1">
              {appointments.filter((a) => a.status === 'completed').length}
            </p>
            <p className="text-xs text-slate-500 mt-0.5">Past medical check-ins</p>
          </div>
          <div className="p-3 bg-slate-50 text-slate-600 rounded-lg">
            <Calendar className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-2">
        <Filter className="w-4 h-4 text-slate-400" />
        <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">View:</span>
        {(['all', 'upcoming', 'past'] as const).map((type) => (
          <button
            key={type}
            onClick={() => setFilterType(type)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors ${
              filterType === type ? 'bg-teal-100 text-teal-800 font-semibold' : 'text-slate-600 hover:bg-slate-100'
            }`}
          >
            {type === 'all' && `All Consultations (${appointments.length})`}
            {type === 'upcoming' && 'Upcoming Sessions'}
            {type === 'past' && 'Past History'}
          </button>
        ))}
      </div>

      {/* Appointment Cards */}
      <div className="space-y-4">
        {filteredAppointments.map((apt) => (
          <div
            key={apt.id}
            className="bg-white rounded-xl border border-slate-200 p-5 shadow-sm hover:border-teal-300 transition-all flex flex-col md:flex-row md:items-center justify-between gap-4"
          >
            <div className="flex items-start gap-4">
              <div
                className={`p-3 rounded-xl shrink-0 ${
                  apt.type === 'video' ? 'bg-indigo-50 text-indigo-600' : 'bg-teal-50 text-teal-700'
                }`}
              >
                {apt.type === 'video' ? <Video className="w-6 h-6" /> : <MapPin className="w-6 h-6" />}
              </div>

              <div>
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-bold text-slate-900 text-base">{apt.doctorName}</h3>
                  <span
                    className={`px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wider ${
                      apt.status === 'confirmed'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                        : apt.status === 'requested'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : apt.status === 'cancelled'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {apt.status}
                  </span>
                  <span className="px-2 py-0.5 rounded text-xs font-medium bg-slate-100 text-slate-700">
                    {apt.type === 'video' ? 'Video Telehealth' : 'In-Person Consultation'}
                  </span>
                </div>

                <p className="text-xs font-medium text-teal-700 mt-0.5">{apt.specialty}</p>
                <p className="text-xs text-slate-500 mt-0.5">{apt.hospitalOrClinic}</p>

                <p className="text-xs text-slate-700 mt-2 bg-slate-50 p-2 rounded border border-slate-100 inline-block">
                  <strong>Reason:</strong> {apt.reason}
                </p>
              </div>
            </div>

            {/* Date/Time & Actions */}
            <div className="flex flex-col md:items-end justify-between gap-3 border-t md:border-t-0 pt-3 md:pt-0">
              <div className="text-left md:text-right">
                <div className="flex items-center md:justify-end gap-1.5 text-sm font-bold text-slate-800">
                  <Calendar className="w-4 h-4 text-teal-600" />
                  <span>{apt.date}</span>
                </div>
                <div className="flex items-center md:justify-end gap-1.5 text-xs text-slate-500 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-slate-400" />
                  <span>{apt.time}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                {apt.status === 'confirmed' && apt.type === 'video' && apt.locationOrLink && (
                  <a
                    href={apt.locationOrLink}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    <Video className="w-3.5 h-3.5" />
                    <span>Join Room</span>
                  </a>
                )}

                {apt.status === 'confirmed' && (
                  <button
                    onClick={() => cancelAppointment(apt.id)}
                    className="px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors font-medium"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Booking Modal */}
      {showBookingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200">
            <h2 className="text-xl font-bold text-slate-900 flex items-center gap-2">
              <Calendar className="w-5 h-5 text-teal-600" />
              Book Clinical Consultation
            </h2>
            <p className="text-xs text-slate-500 mt-1">
              Select doctor, specialty, consultation mode, and your preferred appointment date.
            </p>

            <form onSubmit={handleBookAppointment} className="mt-4 space-y-3.5 text-sm">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Doctor & Facility</label>
                <select
                  value={docName}
                  onChange={(e) => {
                    setDocName(e.target.value);
                    if (e.target.value.includes('Anand')) {
                      setSpecialty('Cardiology & Internal Medicine');
                      setClinic('Apex Clinical Care, Bengaluru');
                    } else if (e.target.value.includes('Meera')) {
                      setSpecialty('Endocrinology & Diabetology');
                      setClinic('Sunshine Multi-Specialty Hospital');
                    } else {
                      setSpecialty('General Medicine');
                      setClinic('Greenleaf Family Clinic');
                    }
                  }}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                >
                  <option value="Dr. Anand Sharma, MD">Dr. Anand Sharma, MD (Cardiology / Apex Care)</option>
                  <option value="Dr. Meera Nambiar, MD">Dr. Meera Nambiar, MD (Endocrinology / Sunshine)</option>
                  <option value="Dr. Radha Nair, MBBS">Dr. Radha Nair, MBBS (General / Greenleaf Clinic)</option>
                  <option value="Dr. Vikram Seth, MS">Dr. Vikram Seth, MS (Orthopedics / Metro Heart)</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Date</label>
                  <input
                    type="date"
                    value={aptDate}
                    onChange={(e) => setAptDate(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Time Slot</label>
                  <select
                    value={aptTime}
                    onChange={(e) => setAptTime(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  >
                    <option value="09:30 AM">09:30 AM</option>
                    <option value="11:00 AM">11:00 AM</option>
                    <option value="02:30 PM">02:30 PM</option>
                    <option value="04:00 PM">04:00 PM</option>
                    <option value="05:30 PM">05:30 PM</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Consultation Mode</label>
                <div className="grid grid-cols-2 gap-3">
                  <button
                    type="button"
                    onClick={() => setConsultType('video')}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 ${
                      consultType === 'video'
                        ? 'border-indigo-600 bg-indigo-50 text-indigo-700 font-bold'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <Video className="w-4 h-4" />
                    <span>Video Telehealth</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setConsultType('in-person')}
                    className={`py-2 px-3 rounded-lg border text-xs font-medium flex items-center justify-center gap-2 ${
                      consultType === 'in-person'
                        ? 'border-teal-600 bg-teal-50 text-teal-700 font-bold'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    <MapPin className="w-4 h-4" />
                    <span>In-Person Clinic Visit</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Reason for Consultation</label>
                <textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Describe current symptoms or reports you would like reviewed"
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-teal-500"
                  required
                />
              </div>

              <div className="pt-3 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setShowBookingModal(false)}
                  className="px-4 py-2 border border-slate-300 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-sm font-medium transition-colors shadow-sm"
                >
                  Confirm Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
