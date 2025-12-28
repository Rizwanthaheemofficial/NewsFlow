import { Platform, EngagementMetrics } from '../types';

/**
 * PRODUCTION SIMULATION ENGINE
 * This mimics the behavior of the official Social APIs (Meta Graph, X v2, LinkedIn Marketing)
 */
export const publishToPlatform = async (
  platform: Platform, 
  imageUrl: string, 
  caption: string, 
  apiKey: string
): Promise<boolean> => {
  const sessionId = Math.random().toString(36).substring(7).toUpperCase();
  console.log(`[NewsFlow Engine][${sessionId}] Dispatching to ${platform}...`);
  
  // Real-world API latency simulation (Authentication & Media Uploading)
  await new Promise(resolve => setTimeout(resolve, 3500));
  
  if (!apiKey && platform !== Platform.TWITTER) {
    console.warn(`[${sessionId}] Warning: Non-production endpoint detected for ${platform}.`);
  }

  // 98% Success rate for production stability simulation
  const success = Math.random() > 0.02; 
  
  if (success) {
    console.log(`[${platform}][${sessionId}] Broadcast SUCCESS. Finalized via Cloud Gateway.`);
  } else {
    console.error(`[${platform}][${sessionId}] Broadcast FAILED. Internal Server Error (500) during media ingestion.`);
  }

  return success;
};

/**
 * Mock engagement engine - Provides dynamic feedback for UI metrics
 */
export const fetchMetricsForPost = async (logId: string): Promise<EngagementMetrics> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  
  return {
    likes: Math.floor(Math.random() * 2500) + 120,
    shares: Math.floor(Math.random() * 800) + 45,
    comments: Math.floor(Math.random() * 400) + 12,
    reach: Math.floor(Math.random() * 50000) + 1500
  };
};