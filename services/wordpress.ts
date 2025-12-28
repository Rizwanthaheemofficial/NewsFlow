
import { WPPost } from '../types';

const fetchWithRetry = async (url: string): Promise<Response> => {
  try {
    const response = await fetch(url);
    if (response.ok) return response;
    throw new Error(`Direct fetch failed with status ${response.status}`);
  } catch (error) {
    const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    const proxiedResponse = await fetch(proxyUrl);
    if (proxiedResponse.ok) return proxiedResponse;
    throw new Error('All connection attempts failed including proxy.');
  }
};

const decodeHTMLEntities = (text: string) => {
  const textArea = document.createElement('textarea');
  textArea.innerHTML = text;
  const decoded = textArea.value;
  return decoded.replace(/<\/?[^>]+(>|$)/g, ""); // Strip any remaining tags
};

export const validateWordPressUrl = async (baseUrl: string): Promise<{ success: boolean; name?: string; description?: string; error?: string }> => {
  try {
    const url = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    const endpoint = `${url}/wp-json/`;
    const response = await fetchWithRetry(endpoint);
    const data = await response.json();
    
    if (data.name) {
      return { success: true, name: data.name, description: data.description };
    }
    return { success: false, error: 'Not a valid WordPress REST API endpoint' };
  } catch (error) {
    return { success: false, error: 'Connection failed' };
  }
};

export const fetchRecentPosts = async (
  baseUrl: string, 
  count: number = 8, 
  search?: string
): Promise<WPPost[]> => {
  try {
    const url = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
    let endpoint = `${url}/wp-json/wp/v2/posts?_embed&per_page=${count}&status=publish`;
    if (search) {
      endpoint += `&search=${encodeURIComponent(search)}`;
    }
    
    const response = await fetchWithRetry(endpoint);
    const posts = await response.json();
    
    if (!Array.isArray(posts)) return [];

    return posts.map((post: any) => {
      const featuredMedia = post._embedded?.['wp:featuredmedia']?.[0];
      const author = post._embedded?.['author']?.[0]?.name;
      
      return {
        id: post.id,
        title: decodeHTMLEntities(post.title.rendered),
        excerpt: decodeHTMLEntities(post.excerpt.rendered).substring(0, 160) + '...',
        featuredImageUrl: featuredMedia?.source_url || `https://picsum.photos/seed/${post.id}/1080/1080`,
        date: post.date,
        link: post.link,
        author: author || 'News Desk'
      };
    });
  } catch (error) {
    console.error('WP Multi-Fetch Error:', error);
    return [];
  }
};
