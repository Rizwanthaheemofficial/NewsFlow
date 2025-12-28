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
  console.log(`[NewsFlow Engine] Dispatching to ${platform}...`);
  console.log(`[Payload] Image: ${imageUrl.substring(0, 30)}...`);
  console.log(`[Payload] Caption: ${caption.substring(0, 50)}...`);
  
  // Real-world API latency simulation (Authentication & Media Uploading)
  await new Promise(resolve => setTimeout(resolve, 3500));
  
  if (!apiKey && platform !== Platform.TWITTER) {
    console.warn(`${platform} API Key missing, simulating success via Enterprise Demo Mode.`);
  }

  // 98% Success rate for production stability simulation
  const success = Math.random() > 0.02; 
  
  if (success) {
    console.log(`[${platform}] Broadcast SUCCESS. Transaction ID: TXN_${Math.random().toString(36).substr(2, 9)}`);
  } else {
    console.error(`[${platform}] Broadcast FAILED. Error: Rate Limit or Media Validation issue.`);
  }

  return success;
};

/**
 * Mock engagement engine
 */
export const fetchMetricsForPost = async (logId: string): Promise<EngagementMetrics> => {
  await new Promise(resolve => setTimeout(resolve, 800));
  
  return {
    likes: Math.floor(Math.random() * 1200) + 50,
    shares: Math.floor(Math.random() * 300) + 10,
    comments: Math.floor(Math.random() * 150) + 5,
    reach: Math.floor(Math.random() * 15000) + 500
  };
};