import type { SupportedLanguage } from '../types/language';
import type { Translations } from './types';
import { en } from './en';
import { ta } from './ta';
import { hi } from './hi';
import { te } from './te';
import { kn } from './kn';
import { ml } from './ml';
import { bn } from './bn';
import { mr } from './mr';
import { gu } from './gu';
import { pa } from './pa';
import { ur } from './ur';
import { or } from './or';
import { as } from './as';

export * from './types';

export const translationsMap: Record<SupportedLanguage, Translations> = {
  en,
  ta,
  hi,
  te,
  kn,
  ml,
  bn,
  mr,
  gu,
  pa,
  ur,
  or,
  as,
};

export function getTranslation(lang: SupportedLanguage, key: keyof Translations): string {
  const dict = translationsMap[lang] || translationsMap.en;
  return dict[key] || translationsMap.en[key] || String(key);
}
