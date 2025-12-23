import { TemplateType, ImageSource, WPPost, AppSettings } from './types';

// Professional NewsFlow Logo - Valid Small SVG-based Base64 for stability
export const APP_LOGO_BASE64 = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjAwIiBoZWlnaHQ9IjUwIiB2aWV3Qm94PSIwIDAgMjAwIDUwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPjxyZWN0IHdpZHRoPSIyMDAiIGhlaWdodD0iNTAiIHJ4PSI4IiBmaWxsPSIjNDM0RUVGIi8+PHBhdGggZD0iTTE1IDI1TDIyIDE4TDI5IDI1TDIyIDMyTDE1IDI1WiIgZmlsbD0id2hpdGUiLz48dGV4dCB4PSI0MCIgeT0iMzMiIGZpbGw9IndoaXRlIiBmb250LWZhbWlseT0iSW50ZXIsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjQiIGZvbnQtd2VpZ2h0PSJib2xkIj5ORVdTRkxPVzwvdGV4dD48L3N2Zz4=';

export const TEMPLATE_CONFIGS = {
  [TemplateType.BREAKING_NEWS]: {
    backgroundColor: '#dc2626',
    textColor: '#ffffff',
    accentColor: '#fef08a',
    barColor: '#991b1b'
  },
  [TemplateType.STANDARD]: {
    backgroundColor: '#1e40af',
    textColor: '#ffffff',
    accentColor: '#60a5fa',
    barColor: '#1e3a8a'
  },
  [TemplateType.MINIMALIST]: {
    backgroundColor: '#f8fafc',
    textColor: '#0f172a',
    accentColor: '#6366f1',
    barColor: '#e2e8f0'
  },
  [TemplateType.MODERN_NEWS]: {
    backgroundColor: '#ffffff',
    textColor: '#111827',
    accentColor: '#4f46e5',
    barColor: '#4f46e5'
  }
};

export const DEFAULT_SETTINGS: AppSettings = {
  wordpressUrl: 'https://techcrunch.com',
  fbApiKey: '',
  igApiKey: '',
  xApiKey: '',
  dailyLimit: 20,
  autoPublish: false,
  selectedTemplate: TemplateType.MODERN_NEWS,
  imageSource: ImageSource.WORDPRESS,
  logoUrl: ''
};

export const PLACEHOLDER_POST: WPPost = {
  id: 0,
  title: "Global Tech Summit 2025: AI Innovations Redefining the Digital Frontier",
  featuredImageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&q=80&w=1080&h=1080",
  date: new Date().toISOString(),
  link: "https://example.com/news/tech-summit"
};
