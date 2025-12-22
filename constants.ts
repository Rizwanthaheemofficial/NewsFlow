
import { TemplateType, ImageSource, WPPost } from './types';

export const DEFAULT_SETTINGS = {
  wordpressUrl: 'https://techcrunch.com',
  fbApiKey: '',
  igApiKey: '',
  xApiKey: '',
  dailyLimit: 5,
  autoPublish: true,
  selectedTemplate: TemplateType.BREAKING_NEWS,
  imageSource: ImageSource.WORDPRESS,
  logoUrl: 'https://worldnewstoday.live/wp-content/uploads/2025/11/cropped-New-Project-2-e1759672821673.png'
};

export const TEMPLATE_CONFIGS = {
  [TemplateType.BREAKING_NEWS]: {
    bgColor: '#ef4444',
    textColor: '#ffffff',
    accentColor: '#ffffff'
  },
  [TemplateType.STANDARD]: {
    bgColor: '#1d4ed8',
    textColor: '#ffffff',
    accentColor: '#fbbf24'
  },
  [TemplateType.MINIMALIST]: {
    bgColor: '#0f172a', // Deep dark background
    textColor: '#ffffff',
    accentColor: '#14b8a6' // Professional Teal
  },
  [TemplateType.MODERN_NEWS]: {
    bgColor: '#ffffff',
    textColor: '#000000',
    accentColor: '#b91c1c', // Darker Red for text highlights
    barColor: '#1d4ed8'     // Bright Blue for bottom bar
  }
};

export const PLACEHOLDER_POST: WPPost = {
  id: 0,
  title: 'Afghan Regime Now a Direct Threat to Pakistan and Regional Security: DG ISPR',
  featuredImageUrl: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?auto=format&fit=crop&q=80&w=1080&h=1080',
  date: new Date().toISOString(),
  link: '#'
};
