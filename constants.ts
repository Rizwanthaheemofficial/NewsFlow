
import { TemplateType, ImageSource, AppSettings } from './types';

/**
 * World News Today Live Brand Logo (SVG Base64)
 * Encoded SVG containing the Globe and "WORLD NEWS TODAY .LIVE" typography
 */
export const APP_LOGO_BASE64 = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjgwIiBoZWlnaHQ9IjExMCIgdmlld0JveD0iMCAwIDI4MCAxMTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+Cjx0ZXh0IHg9IjAiIHk9IjMwIiBmaWxsPSIjMWExYTFhIiBmb250LWZhbWlseT0iSW50ZXIsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjgiIGZvbnQtd2VpZ2h0PSI5MDAiIHN0eWxlPSJ0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7IGxldHRlci1zcGFjaW5nOi0wLjA1ZW07Ij5XT1JMRDwvdGV4dD4KPHRleHQgeD0iMCIgeT0iNTUiIGZpbGw9IiMxYTFhMWEiIGZvbnQtZmFtaWx5PSJJbnRlciwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyOCIgZm9udC13ZWlnaHQ9IjkwMCIgc3R5bGU9InRleHQtdHJhbnNmb3JtOnVwcGVyY2FzZTsgbGV0dGVyLXNwYWNpbmc6LTAuMDVlbTsiPk5FV1M8L3RleHQ+Cjx0ZXh0IHg9IjAiIHk9IjgwIiBmaWxsPSIjMWExYTFhIiBmb250LWZhbWlseT0iSW50ZXIsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMjgiIGZvbnQtd2VpZ2h0PSI5MDAiIHN0eWxlPSJ0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7IGxldHRlci1zcGFjaW5nOi0wLjA1ZW07Ij5UT0RBWTwvdGV4dD4KPHRleHQgeD0iNDUiIHk9Ijk1IiBmaWxsPSIjMWExYTFhIiBmb250LWZhbWlseT0iSW50ZXIsIHNhbnMtc2VyaWYiIGZvbnQtc2l6ZT0iMTQiIGZvbnQtd2VpZ2h0PSI5MDAiIHN0eWxlPSJ0ZXh0LXRyYW5zZm9ybTp1cHBlcmNhc2U7IGxldHRlci1zcGFjaW5nOjAuMmVtOyI+LkxJVkU8L3RleHQ+Cgo8ZyB0cmFuc2Zvcm09InRyYW5zbGF0ZSgxNjAgMTApIj4KICA8Y2lyY2xlIGN4PSI0NSIgY3k9IjQ1IiByPSI0NSIgZmlsbD0iI2NjMDAwMCIvPgogIDxwYXRoIGQ9Ik00NSA1IEMgNjUgNSwgODUgMjUsIDg1IDQ1IEMgODUgNjUsIDY1IDg1LCA0NSA4NSBDIDI1IDg1LCA1IDY1LCA1IDQ1IEMgNSAyNSwgMjUgNSwgNDUgNSBaIiBmaWxsPSJub25lIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjEiLz4KICA8cGF0aCBkPSJNMCA0NSBMMTkwIDQ1IiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjAuNSIgc3Ryb2tlLW9wYWNpdHk9IjAuNSIvPgogIDxwYXRoIGQ9Ik00NSAwdjkwIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjAuNSIgc3Ryb2tlLW9wYWNpdHk9IjAuNSIvPgogIDxlbGxpcHNlIGN4PSI0NSIgY3k9IjQ1IiByeD0iMjAiIHJ5PSI0NSIgc3Ryb2tlPSJ3aGl0ZSIgc3Ryb2tlLXdpZHRoPSIxIiBmaWxsPSJub25lIi8+CiAgPGVsbGlwc2UgY3g9IjQ1IiBjeT0iNDUiIHJ4PSIzNSIgcnk9IjIwIiBzdHJva2U9IndoaXRlIiBzdHJva2Utd2lkdGg9IjAuNSIgc3Ryb2tlLW9wYWNpdHk9IjAuNSIgZmlsbD0ibm9uZSIvPgo8L2c+Cjwvc3ZnPg==';

export const TEMPLATE_CONFIGS: Record<TemplateType, any> = {
  [TemplateType.BREAKING_NEWS]: {
    backgroundColor: '#dc2626',
    textColor: '#ffffff',
    accentColor: '#fef08a',
    barColor: '#991b1b',
    defaultLogo: APP_LOGO_BASE64,
    overlayOpacity: 0.8,
    logoFilter: 'none'
  },
  [TemplateType.STANDARD]: {
    backgroundColor: '#1e40af',
    textColor: '#ffffff',
    accentColor: '#60a5fa',
    barColor: '#1e3a8a',
    defaultLogo: APP_LOGO_BASE64,
    overlayOpacity: 0.65,
    logoFilter: 'none'
  },
  [TemplateType.MINIMALIST]: {
    backgroundColor: '#0f172a',
    textColor: '#ffffff',
    accentColor: '#2dd4bf',
    barColor: '#1e293b',
    defaultLogo: APP_LOGO_BASE64,
    overlayOpacity: 0.2,
    logoFilter: 'brightness(0) invert(1)' // Mechanism: Forces any logo to pure white for dark theme
  },
  [TemplateType.MODERN_NEWS]: {
    backgroundColor: '#ffffff',
    textColor: '#111827',
    accentColor: '#cc0000',
    barColor: '#111827',
    defaultLogo: APP_LOGO_BASE64,
    overlayOpacity: 1.0,
    logoFilter: 'none'
  }
};

const emptyConnection = { isConnected: false };

export const DEFAULT_SETTINGS: AppSettings = {
  wordpressUrl: 'https://worldnewstoday.live/',
  brandWebsite: 'WORLDNEWSTODAY.LIVE',
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
    brandVoice: 'Professional, Authoritative, Real-time News Desk',
    creativity: 0.7,
    includeEmojis: true,
    targetLength: 'short',
    useGrounding: true,
    targetLanguage: 'English'
  },
  branding: {
    primaryColor: '#cc0000',
    accentColor: '#1a1a1a',
    useCustomColors: false
  },
  dataSavingMode: false
};
