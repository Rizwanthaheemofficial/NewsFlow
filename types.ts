
export enum Platform {
  FACEBOOK = 'Facebook',
  INSTAGRAM = 'Instagram',
  TWITTER = 'Twitter'
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

export interface WPPost {
  id: number;
  title: string;
  featuredImageUrl: string;
  date: string;
  link: string;
  aiImageUrl?: string; // Cache for generated image
}

export interface PublishLog {
  id: string;
  timestamp: string;
  postTitle: string;
  caption: string;
  platforms: {
    [key in Platform]: 'success' | 'failed' | 'pending';
  };
  imageUrl: string;
  error?: string;
}

export interface AppSettings {
  wordpressUrl: string;
  fbApiKey: string;
  igApiKey: string;
  xApiKey: string;
  dailyLimit: number;
  autoPublish: boolean;
  selectedTemplate: TemplateType;
  imageSource: ImageSource;
  logoUrl?: string;
}

export interface SystemStats {
  todayPosts: number;
  totalPosts: number;
  activePlatforms: number;
  uptime: string;
}
