
export enum Platform {
  FACEBOOK = 'Facebook',
  INSTAGRAM = 'Instagram',
  TWITTER = 'Twitter',
  LINKEDIN = 'LinkedIn'
}

export enum TemplateType {
  BREAKING_NEWS = 'Breaking News',
  STANDARD = 'Standard News',
  MINIMALIST = 'Minimalist',
  MODERN_NEWS = 'Modern News'
}

export enum ImageSource {
  WORDPRESS = 'WordPress Featured',
  AI_GENERATED = 'AI Generated'
}

export interface User {
  id: string;
  name: string;
  email: string;
  avatar: string;
  plan: 'Basic' | 'Pro' | 'Enterprise';
}

export interface AccountConnection {
  isConnected: boolean;
  username?: string;
  avatar?: string;
  lastSync?: string;
  accessToken?: string;
  clientId?: string;
  clientSecret?: string;
  expiresAt?: number;
}

export interface WPPost {
  id: number;
  title: string;
  excerpt?: string;
  featuredImageUrl: string;
  date: string;
  link: string;
  author?: string;
  aiImageUrl?: string;
  audioUrl?: string;
  videoUrl?: string;
  visualHeadline?: string;
  highlightWords?: string[];
}

export interface PerformanceScore {
  score: number;
  label: string;
  reasoning: string[];
  suggestions: string[];
}

export interface ContentVariations {
  [Platform.FACEBOOK]: string;
  [Platform.INSTAGRAM]: string;
  [Platform.TWITTER]: string;
  [Platform.LINKEDIN]: string;
}

export interface EngagementMetrics {
  likes: number;
  shares: number;
  comments: number;
  reach: number;
}

export interface PublishLog {
  id: string;
  timestamp: string;
  postTitle: string;
  caption: string;
  platforms: {
    [key in Platform]?: 'success' | 'failed' | 'pending';
  };
  imageUrl: string;
  audioUrl?: string;
  videoUrl?: string;
  metrics?: EngagementMetrics;
  error?: string;
}

export interface BrandingConfig {
  primaryColor: string;
  accentColor: string;
  useCustomColors: boolean;
}

export interface AIConfig {
  brandVoice: string;
  creativity: number; // 0 to 1
  includeEmojis: boolean;
  targetLength: 'short' | 'medium' | 'long';
  useGrounding: boolean;
  targetLanguage: string;
}

export interface AppSettings {
  wordpressUrl: string;
  brandWebsite: string;
  fbConnection: AccountConnection;
  igConnection: AccountConnection;
  xConnection: AccountConnection;
  liConnection: AccountConnection;
  dailyLimit: number;
  autoPublish: boolean;
  autoDetect: boolean;
  selectedTemplate: TemplateType;
  imageSource: ImageSource;
  logoUrl?: string;
  aiConfig: AIConfig;
  branding: BrandingConfig;
  dataSavingMode: boolean;
}

export interface SystemStats {
  todayPosts: number;
  totalPosts: number;
  activePlatforms: number;
  tokensUsed: number;
  estimatedSavings: number;
  totalEngagement: number;
}
