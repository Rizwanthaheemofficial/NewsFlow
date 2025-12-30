
import { TemplateType, ImageSource, AppSettings } from './types';

export const APP_LOGO_BASE64 = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjUwIiB2aWV3Qm94PSIwIDAgMjAwIDUwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iNTAiIHJ4PSI4IiBmaWxsPSIjMTExODI3Ii8+PHBhdGggZD0iTTE1IDI1TDIyIDE4TDIyIDMyTDE1IDI1WiIgZmlsbD0id2hpdGUiLz48dGV4dCB4PSI0MCIgeT0iMzMiIGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0iSW50ZXIsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZvbnQtd2VpZ2h0PSJib2xkIj5ORVdTRkxPVzwvdGV4dD48L3N2Zz4=';

export const TEMPLATE_CONFIGS = {
  [TemplateType.BREAKING_NEWS]: {
    backgroundColor: '#dc2626',
    textColor: '#ffffff',
    accentColor: '#fef08a',
    barColor: '#991b1b',
    defaultLogo: APP_LOGO_BASE64,
    overlayOpacity: 0.8
  },
  [TemplateType.STANDARD]: {
    backgroundColor: '#1e40af',
    textColor: '#ffffff',
    accentColor: '#60a5fa',
    barColor: '#1e3a8a',
    defaultLogo: APP_LOGO_BASE64,
    overlayOpacity: 0.65
  },
  [TemplateType.MINIMALIST]: {
    backgroundColor: '#0f172a',
    textColor: '#ffffff',
    accentColor: '#2dd4bf',
    barColor: '#1e293b',
    defaultLogo: APP_LOGO_BASE64,
    overlayOpacity: 0.2
  },
  [TemplateType.MODERN_NEWS]: {
    backgroundColor: '#ffffff',
    textColor: '#111827',
    accentColor: '#4f46e5',
    barColor: '#4f46e5',
    defaultLogo: APP_LOGO_BASE64,
    overlayOpacity: 1.0
  }
};

const emptyConnection = { isConnected: false };

export const DEFAULT_SETTINGS: AppSettings = {
  wordpressUrl: 'https://techcrunch.com',
  brandWebsite: 'NEWSFLOW.LIVE',
  fbConnection: { ...emptyConnection },
  igConnection: { ...emptyConnection },
  xConnection: { ...emptyConnection },
  liConnection: { ...emptyConnection },
  dailyLimit: 20,
  autoPublish: false,
  autoDetect: true,
  selectedTemplate: TemplateType.MODERN_NEWS,
  imageSource: ImageSource.WORDPRESS,
  logoUrl: '',
  aiConfig: {
    brandVoice: 'Professional & Informative',
    creativity: 0.7,
    includeEmojis: true,
    targetLength: 'short',
    useGrounding: true,
    targetLanguage: 'English'
  },
  branding: {
    primaryColor: '#4f46e5',
    accentColor: '#f59e0b',
    useCustomColors: false
  }
};
