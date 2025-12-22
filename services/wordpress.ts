
import { WPPost } from '../types';

/**
 * Validates the WordPress REST API connection for a given URL
 */
export const testWPConnection = async (baseUrl: string): Promise<{ success: boolean; message: string }> => {
  try {
    const url = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const response = await fetch(`${url}/wp-json/wp/v2/posts?per_page=1`, { method: 'HEAD' });
    
    if (response.ok) {
      return { success: true, message: 'Connection successful! WordPress REST API detected.' };
    } else {
      return { success: false, message: `Server returned status ${response.status}. Ensure REST API is enabled.` };
    }
  } catch (error) {
    return { success: false, message: 'Failed to reach server. Check the URL and CORS settings.' };
  }
};

/**
 * Fetches the most recent published post from WordPress
 */
export const fetchLatestPost = async (baseUrl: string): Promise<WPPost | null> => {
  try {
    const url = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    // We request _embed to get the featured image in a single request
    const response = await fetch(`${url}/wp-json/wp/v2/posts?_embed&per_page=1&status=publish`);
    
    if (!response.ok) throw new Error('Failed to fetch WordPress posts');
    
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
        .replace(/&quot;/g, '"'),
      featuredImageUrl: featuredMedia?.source_url || 'https://picsum.photos/1080/1080',
      date: post.date,
      link: post.link
    };
  } catch (error) {
    console.error('WP Fetch Error:', error);
    return null;
  }
};
