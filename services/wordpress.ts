
import { WPPost } from '../types';

/**
 * Helper to wrap fetch with a CORS proxy fallback
 */
const fetchWithRetry = async (url: string): Promise<Response> => {
  try {
    // Attempt 1: Direct fetch
    const response = await fetch(url);
    if (response.ok) return response;
    throw new Error(`Direct fetch failed with status ${response.status}`);
  } catch (error) {
    console.warn(`Direct access to ${url} failed (likely CORS). Rerouting through proxy...`);
    
    // Attempt 2: Use a transparent CORS proxy
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    const proxiedResponse = await fetch(proxyUrl);
    
    if (proxiedResponse.ok) return proxiedResponse;
    throw new Error('All connection attempts failed including proxy.');
  }
};

/**
 * Validates the WordPress REST API connection for a given URL
 */
export const testWPConnection = async (baseUrl: string): Promise<{ success: boolean; message: string }> => {
  try {
    const url = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const endpoint = `${url}/wp-json/wp/v2/posts?per_page=1`;
    
    const response = await fetchWithRetry(endpoint);
    
    if (response.ok) {
      return { success: true, message: 'Connection successful! WordPress REST API detected via ' + (response.url.includes('corsproxy') ? 'Proxy' : 'Direct link') + '.' };
    } else {
      return { success: false, message: `Server returned status ${response.status}. Ensure REST API is enabled.` };
    }
  } catch (error) {
    return { success: false, message: 'Failed to reach server. Check the URL and ensure the site is public.' };
  }
};

/**
 * Fetches the most recent published post from WordPress
 */
export const fetchLatestPost = async (baseUrl: string): Promise<WPPost | null> => {
  try {
    const url = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    // We request _embed to get the featured image in a single request
    const endpoint = `${url}/wp-json/wp/v2/posts?_embed&per_page=1&status=publish`;
    
    const response = await fetchWithRetry(endpoint);
    const posts = await response.json();
    
    if (!posts || posts.length === 0) return null;

    const post = posts[0];
    const featuredMedia = post._embedded?.['wp:featuredmedia']?.[0];
    
    return {
      id: post.id,
      title: post.title.rendered
        .replace(/&#8217;/g, "'")
        .replace(/&#8211;/g, "–")
        .replace(/&amp;/g, "&")
        .replace(/&quot;/g, '"')
        .replace(/<\/?[^>]+(>|$)/g, ""), // Strip any HTML tags from title
      featuredImageUrl: featuredMedia?.source_url || 'https://picsum.photos/1080/1080',
      date: post.date,
      link: post.link
    };
  } catch (error) {
    console.error('WP Fetch Error:', error);
    return null;
  }
};
