import React, { useState } from 'react';
import { ShieldAlert, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

export const MedicalDisclaimer: React.FC = () => {
  const { t } = useLanguage();
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 shadow-xs text-teal-950 transition-all">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="p-2 bg-teal-100 rounded-xl text-teal-700 shrink-0 mt-0.5">
            <ShieldAlert className="w-5 h-5" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-teal-900 flex items-center gap-2">
              {t('medicalDisclaimerTitle')}
            </h4>
            <p className="text-xs text-teal-800/90 mt-1 leading-relaxed">
              {t('medicalDisclaimerText')}
            </p>
          </div>
        </div>
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="text-teal-700 hover:text-teal-900 p-1 rounded-lg hover:bg-teal-100/50 transition-colors shrink-0"
          aria-label="Toggle details"
        >
          {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      </div>

      {isExpanded && (
        <div className="mt-3 pt-3 border-t border-teal-200/80 text-xs text-teal-900/80 space-y-1.5 pl-11">
          <p>
            • All extracted parameters and insights are strictly for personal understanding and informational review.
          </p>
          <p>
            • Do not alter prescription dosages, discontinue treatments, or start new supplements based solely on this tool.
          </p>
          <p>
            • In the event of acute medical discomfort or emergency symptoms, immediately contact local emergency services or visit the nearest emergency room.
          </p>
        </div>
      )}
    </div>
  );
};
