import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';
import type { MedicalMetric, MetricStatus } from '../types/report';
import { useLanguage } from '../context/LanguageContext';

interface MetricCardProps {
  metric: MedicalMetric;
  onVerifyToggle?: () => void;
  showVerificationControl?: boolean;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  metric,
  onVerifyToggle,
  showVerificationControl = false,
}) => {
  const { t } = useLanguage();

  const getStatusConfig = (status: MetricStatus) => {
    switch (status) {
      case 'normal':
        return {
          label: t('normalStatus'),
          badgeClass: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: CheckCircle2,
          borderAccent: 'border-l-emerald-500',
        };
      case 'high':
        return {
          label: t('highStatus'),
          badgeClass: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: AlertTriangle,
          borderAccent: 'border-l-rose-500',
        };
      case 'low':
        return {
          label: t('lowStatus'),
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: AlertCircle,
          borderAccent: 'border-l-amber-500',
        };
      case 'attention':
      default:
        return {
          label: t('attentionStatus'),
          badgeClass: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: HelpCircle,
          borderAccent: 'border-l-amber-500',
        };
    }
  };

  const statusConfig = getStatusConfig(metric.status);
  const StatusIcon = statusConfig.icon;

  return (
    <div
      className={`bg-white rounded-2xl border border-slate-200/90 p-4 shadow-2xs hover:shadow-sm transition-all border-l-4 ${statusConfig.borderAccent}`}
    >
      <div className="flex items-start justify-between gap-2">
        <div>
          <h4 className="text-sm font-semibold text-slate-900 tracking-tight">
            {metric.name}
          </h4>
          <p className="text-xs text-slate-500 mt-0.5">
            {t('thNormalRange')}: <span className="font-medium text-slate-700">{metric.referenceRange}</span> {metric.unit}
          </p>
        </div>

        <span
          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold border ${statusConfig.badgeClass}`}
        >
          <StatusIcon className="w-3.5 h-3.5" />
          <span>{statusConfig.label}</span>
        </span>
      </div>

      <div className="mt-3.5 flex items-baseline justify-between">
        <div className="flex items-baseline gap-1.5">
          <span className="text-2xl font-extrabold text-slate-900 tracking-tight">
            {metric.value}
          </span>
          <span className="text-xs font-semibold text-slate-500">{metric.unit}</span>
        </div>

        {showVerificationControl ? (
          <button
            onClick={onVerifyToggle}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-semibold border transition-all cursor-pointer ${
              metric.verified
                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                : 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>{metric.verified ? t('paramVerified') : t('paramNeedsReview')}</span>
          </button>
        ) : (
          metric.verified && (
            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{t('verifiedBadge')}</span>
            </span>
          )
        )}
      </div>

      {metric.notes && (
        <p className="mt-2.5 pt-2 border-t border-slate-100 text-xs text-slate-600 italic">
          {metric.notes}
        </p>
      )}
    </div>
  );
};
