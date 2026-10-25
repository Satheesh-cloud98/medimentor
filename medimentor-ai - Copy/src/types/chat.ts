import type { SupportedLanguage } from './language';

export interface ChatCitation {
  recordId: string;
  recordTitle: string;
  metricOrFinding: string;
  value?: string;
  isDemo: boolean;
  demoNotice?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  modelName?: string;
  isFallback?: boolean;
  isRateLimitFallback?: boolean;
  fallbackReason?: string;
  citations?: ChatCitation[];
  urgentCareWarning?: boolean;
}

export interface ChatThread {
  id: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

export interface UserMemoryItem {
  id: string;
  userId: string;
  key: string;
  value: string;
  createdAt: string;
}

export interface ChatApiMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatApiRequest {
  messages: ChatApiMessage[];
  userProfile?: {
    id: string;
    name: string;
    age: number;
    gender: string;
    bloodGroup?: string;
    allergies?: string;
    chronicConditions?: string;
  };
  recordsSummary?: Array<{
    id: string;
    title: string;
    documentType: string;
    formattedDate: string;
    isDemo: boolean;
    isVerified: boolean;
    summary: string;
    facts: string[];
    metrics?: Array<{
      name: string;
      value: string | number;
      unit: string;
      status: string;
      referenceRange: string;
    }>;
    medications?: Array<{
      name: string;
      dosage?: string;
      frequency?: string;
      instructions?: string;
    }>;
  }>;
  language?: SupportedLanguage;
  memory?: string[];
}

export interface ChatApiResponse {
  configured: boolean;
  reply: string;
  modelName: string;
  isFallback?: boolean;
  isRateLimitFallback?: boolean;
  fallbackReason?: string;
  citations?: ChatCitation[];
  urgentCareWarning?: boolean;
  suggestedFollowUps?: string[];
  languageUsed: string;
  error?: string;
}
