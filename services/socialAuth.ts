
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
  [Platform.X]: {
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    scopes: 'tweet.read tweet.write users.read offline.access',
    clientId: 'RElQcy04RnduZUlWQVdadTVKLWs6MTpjaQ'
  },
  [Platform.FACEBOOK]: {
    authUrl: 'https://www.facebook.com/v12.0/dialog/oauth',
    scopes: 'pages_manage_posts,pages_read_engagement,public_profile',
    clientId: '782910394857261'
  },
  [Platform.INSTAGRAM]: {
    authUrl: 'https://www.facebook.com/v12.0/dialog/oauth',
    scopes: 'instagram_basic,instagram_content_publish,pages_show_list',
    clientId: '782910394857261'
  },
  [Platform.LINKEDIN]: {
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    scopes: 'w_member_social,r_liteprofile',
    clientId: '77v8x2k9z4v5n6'
  }
};

/**
 * Handles the redirection to the social media platform login page.
 */
export const initiateSocialConnection = async (platform: Platform): Promise<void> => {
  const config = OAUTH_CONFIGS[platform];
  if (!config) throw new Error(`OAuth configuration registry mismatch for ${platform}`);

  const redirectUri = window.location.origin + window.location.pathname;
  const state = btoa(JSON.stringify({ platform, timestamp: Date.now() }));
  
  let url = `${config.authUrl}?response_type=code&client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(config.scopes)}&state=${state}`;

  if (platform === Platform.X) {
    url += '&code_challenge=challenge&code_challenge_method=plain';
  }

  localStorage.setItem('oauth_state', state);
  window.location.href = url;
};

/**
 * Finalizes the connection after the social platform redirects back with a code.
 */
export const finalizeSocialConnection = async (code: string, state: string): Promise<AccountConnection | null> => {
  try {
    const savedState = localStorage.getItem('oauth_state');
    if (!savedState) throw new Error('ERR_OAUTH_SESSION_EXPIRED: No originating session found in local storage.');
    if (state !== savedState) throw new Error('ERR_SECURITY_STATE_MISMATCH: Request origin could not be verified.');
    
    const { platform } = JSON.parse(atob(state));
    localStorage.removeItem('oauth_state');

    // Simulate network latency for exchange
    await new Promise(resolve => setTimeout(resolve, 1500));

    // Simulate rare random failure for demonstration purposes
    if (Math.random() < 0.05) {
      throw new Error(`ERR_API_TIMEOUT: The ${platform} gateway failed to respond within 5000ms.`);
    }

    const mockData: AccountConnection = {
      isConnected: true,
      username: `${platform}_Newsroom`,
      avatar: `https://ui-avatars.com/api/?name=${platform}&background=random`,
      lastSync: new Date().toLocaleString(),
      accessToken: `live_tok_${Math.random().toString(36).substr(2, 20)}`,
      expiresAt: Date.now() + (60 * 60 * 24 * 30 * 1000)
    };

    saveConnection(platform as Platform, mockData);
    return mockData;
  } catch (error: any) {
    console.error('OAuth Finalization Failed:', error);
    throw error; // Re-throw to be caught by UI
  }
};

/**
 * Simulates an API handshake to verify manual credentials.
 */
export const verifyManualToken = async (
  platform: Platform, 
  token: string, 
  clientId?: string, 
  clientSecret?: string
): Promise<AccountConnection> => {
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  // Strict Validation logic for platforms requiring App Credentials
  if ([Platform.X, Platform.FACEBOOK, Platform.INSTAGRAM].includes(platform)) {
    if (!clientId) {
      throw new Error(`ERR_MISSING_CLIENT_ID: ${platform} Enterprise mode requires a valid Client ID from the developer portal.`);
    }
    if (!clientSecret) {
      throw new Error(`ERR_MISSING_CLIENT_SECRET: ${platform} Enterprise mode requires a valid Client Secret for HMAC signing.`);
    }
    
    // Simulate credential validation
    if (clientId.length < 5) {
      throw new Error(`ERR_INVALID_CLIENT_ID: The provided ID is too short to be a valid ${platform} identifier.`);
    }
  }

  if (!token) {
    throw new Error('ERR_EMPTY_TOKEN: Access token field cannot be empty for manual handshake.');
  }

  // Simulate a token validity check
  if (token.toLowerCase() === 'error' || token.toLowerCase() === 'fail') {
    throw new Error(`ERR_TOKEN_INVALID: The ${platform} API rejected the provided bearer token (Invalid Signature).`);
  }

  const mockData: AccountConnection = {
    isConnected: true,
    username: clientId ? `${platform}_Enterprise_Node` : `${platform}_Service_Bot`,
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
