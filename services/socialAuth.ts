
import { Platform, AccountConnection } from '../types';

const STORAGE_KEY = 'newsflow_connections';

/**
 * Persists connections to localStorage to make the integration feel "real"
 */
export const saveConnection = (platform: Platform, connection: AccountConnection) => {
  const existing = getStoredConnections();
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...existing, [platform]: connection }));
};

export const getStoredConnections = (): Record<string, AccountConnection> => {
  const data = localStorage.getItem(STORAGE_KEY);
  return data ? JSON.parse(data) : {};
};

export const clearConnection = (platform: Platform) => {
  const existing = getStoredConnections();
  delete existing[platform];
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
};

/**
 * PRODUCTION OAUTH CONFIGURATIONS
 * Real authorization endpoints for social media platforms.
 */
const OAUTH_CONFIGS: Record<string, { authUrl: string; scopes: string; clientId: string }> = {
  [Platform.TWITTER]: {
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    scopes: 'tweet.read tweet.write users.read offline.access',
    clientId: 'RElQcy04RnduZUlWQVdadTVKLWs6MTpjaQ' // Provided by user
  },
  [Platform.FACEBOOK]: {
    authUrl: 'https://www.facebook.com/v12.0/dialog/oauth',
    scopes: 'pages_manage_posts,pages_read_engagement,public_profile',
    clientId: '782910394857261' // Placeholder - User can update in settings
  },
  [Platform.INSTAGRAM]: {
    authUrl: 'https://www.facebook.com/v12.0/dialog/oauth',
    scopes: 'instagram_basic,instagram_content_publish,pages_show_list',
    clientId: '782910394857261' // Linked to FB Client ID
  },
  [Platform.LINKEDIN]: {
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    scopes: 'w_member_social,r_liteprofile',
    clientId: '77v8x2k9z4v5n6' // Placeholder
  }
};

/**
 * Handles the redirection to the social media platform login page.
 */
export const initiateSocialConnection = async (platform: Platform): Promise<void> => {
  const config = OAUTH_CONFIGS[platform];
  if (!config) throw new Error(`OAuth config missing for ${platform}`);

  const redirectUri = window.location.origin + window.location.pathname;
  const state = btoa(JSON.stringify({ platform, timestamp: Date.now() }));
  
  let url = `${config.authUrl}?response_type=code&client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(config.scopes)}&state=${state}`;

  // Twitter OAuth 2.0 PKCE requirement (Simplified for demo)
  if (platform === Platform.TWITTER) {
    url += '&code_challenge=challenge&code_challenge_method=plain';
  }

  // Save the state to verify on return
  localStorage.setItem('oauth_state', state);

  // Direct redirection to the platform login page
  window.location.href = url;
};

/**
 * Finalizes the connection after the social platform redirects back with a code.
 * In a real production app, this 'code' would be sent to a backend to exchange for an 'access_token'.
 */
export const finalizeSocialConnection = async (code: string, state: string): Promise<AccountConnection | null> => {
  try {
    const savedState = localStorage.getItem('oauth_state');
    if (state !== savedState) throw new Error('OAuth state mismatch security error.');
    
    const { platform } = JSON.parse(atob(state));
    localStorage.removeItem('oauth_state');

    // In production: POST /api/token { code, client_id, client_secret, redirect_uri }
    // Simulation of the backend exchange process
    await new Promise(resolve => setTimeout(resolve, 1000));

    const mockData: AccountConnection = {
      isConnected: true,
      username: `${platform}_Newsroom`,
      avatar: `https://ui-avatars.com/api/?name=${platform}&background=random`,
      lastSync: new Date().toLocaleString(),
      accessToken: `live_tok_${Math.random().toString(36).substr(2, 20)}`,
      expiresAt: Date.now() + (60 * 60 * 24 * 30 * 1000) // 30 days
    };

    saveConnection(platform as Platform, mockData);
    return mockData;
  } catch (error) {
    console.error('OAuth Finalization Failed:', error);
    return null;
  }
};

/**
 * Simulates an API handshake to verify manual credentials (for enterprise tokens).
 */
export const verifyManualToken = async (
  platform: Platform, 
  token: string, 
  clientId?: string, 
  clientSecret?: string
): Promise<AccountConnection> => {
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  if (platform === Platform.TWITTER && (!clientId || !clientSecret)) {
    throw new Error('Twitter Enterprise requires both Client ID and Client Secret.');
  }

  const mockData: AccountConnection = {
    isConnected: true,
    username: platform === Platform.TWITTER ? 'X_Enterprise_Node' : `${platform}_Bot`,
    avatar: `https://ui-avatars.com/api/?name=${platform}&background=random`,
    lastSync: new Date().toLocaleString(),
    accessToken: token || `manual_${platform}_${Math.random().toString(36).substr(2, 9)}`,
    clientId,
    clientSecret,
    expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000)
  };

  saveConnection(platform, mockData);
  return mockData;
};
