import React from 'react';
import { AlertCircle } from 'lucide-react';
import { useLanguage } from '../context/LanguageContext';

interface DemoBadgeProps {
  size?: 'sm' | 'md' | 'lg';
  className?: string;
  showIcon?: boolean;
}

export const DemoBadge: React.FC<DemoBadgeProps> = ({
  size = 'md',
  className = '',
  showIcon = true,
}) => {
  const { t } = useLanguage();

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 font-semibold gap-1',
    md: 'text-xs px-2.5 py-1 font-bold gap-1.5',
    lg: 'text-sm px-3.5 py-1.5 font-bold gap-2',
  };

  return (
    <span
      className={`inline-flex items-center rounded-full bg-amber-100 text-amber-800 border border-amber-300 shadow-xs tracking-wide uppercase select-none ${sizeClasses[size]} ${className}`}
      title={t('demoNotice')}
    >
      {showIcon && <AlertCircle className={size === 'sm' ? 'w-3 h-3' : 'w-3.5 h-3.5 text-amber-700'} />}
      <span>{t('demoDataBadge')}</span>
    </span>
  );
};
