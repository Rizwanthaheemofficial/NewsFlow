
import { Platform, AccountConnection } from '../types';

const STORAGE_KEY = 'newsflow_connections';

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

const OAUTH_CONFIGS: Record<string, { authUrl: string; scopes: string; clientId: string; clientSecret?: string }> = {
  [Platform.X]: {
    authUrl: 'https://twitter.com/i/oauth2/authorize',
    scopes: 'tweet.read tweet.write users.read offline.access',
    clientId: 'RElQcy04RnduZUlWQVdadTVKLWs6MTpjaQ'
  },
  [Platform.FACEBOOK]: {
    authUrl: 'https://www.facebook.com/v12.0/dialog/oauth',
    scopes: 'pages_manage_posts,pages_read_engagement,public_profile',
    clientId: '1308350291052105',
    clientSecret: '4aaa40900e5cc904cd6f4068d9a0f070'
  },
  [Platform.INSTAGRAM]: {
    authUrl: 'https://www.facebook.com/v12.0/dialog/oauth',
    scopes: 'instagram_basic,instagram_content_publish,pages_show_list',
    clientId: '1308350291052105',
    clientSecret: '4aaa40900e5cc904cd6f4068d9a0f070'
  },
  [Platform.LINKEDIN]: {
    authUrl: 'https://www.linkedin.com/oauth/v2/authorization',
    scopes: 'w_member_social,r_liteprofile',
    clientId: '77v8x2k9z4v5n6'
  },
  [Platform.YOUTUBE]: {
    authUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
    scopes: 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/youtube.readonly',
    clientId: '921837465-google-client-id.apps.googleusercontent.com'
  },
  [Platform.TIKTOK]: {
    authUrl: 'https://www.tiktok.com/v2/auth/authorize/',
    scopes: 'user.info.basic,video.upload,video.publish',
    clientId: 'tiktok-enterprise-id-123'
  }
};

export const initiateSocialConnection = async (platform: Platform): Promise<void> => {
  const config = OAUTH_CONFIGS[platform];
  if (!config) throw new Error(`OAuth configuration registry mismatch for ${platform}`);

  const redirectUri = window.location.origin + window.location.pathname;
  const state = btoa(JSON.stringify({ platform, timestamp: Date.now() }));
  
  let url = `${config.authUrl}?response_type=code&client_id=${config.clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${encodeURIComponent(config.scopes)}&state=${state}`;

  if (platform === Platform.X) {
    url += '&code_challenge=challenge&code_challenge_method=plain';
  } else if (platform === Platform.YOUTUBE) {
    url += '&access_type=offline&prompt=consent'; // Ensure we get a refresh token
  }

  localStorage.setItem('oauth_state', state);
  window.location.href = url;
};

export const finalizeSocialConnection = async (code: string, state: string): Promise<AccountConnection | null> => {
  try {
    const savedState = localStorage.getItem('oauth_state');
    if (!savedState) throw new Error('ERR_OAUTH_SESSION_EXPIRED');
    if (state !== savedState) throw new Error('ERR_SECURITY_STATE_MISMATCH');
    
    const { platform } = JSON.parse(atob(state));
    localStorage.removeItem('oauth_state');

    await new Promise(resolve => setTimeout(resolve, 1500));

    const config = OAUTH_CONFIGS[platform as Platform];

    const mockData: AccountConnection = {
      isConnected: true,
      username: `${platform}_Official`,
      avatar: `https://ui-avatars.com/api/?name=${platform}&background=random`,
      lastSync: new Date().toLocaleString(),
      accessToken: `live_tok_${Math.random().toString(36).substr(2, 20)}`,
      refreshToken: `ref_tok_${Math.random().toString(36).substr(2, 20)}`,
      expiresAt: Date.now() + (60 * 60 * 24 * 30 * 1000),
      pageId: `id_${Math.random().toString(36).substr(2, 8)}`,
      clientId: config?.clientId,
      clientSecret: config?.clientSecret
    };

    saveConnection(platform as Platform, mockData);
    return mockData;
  } catch (error: any) {
    console.error('OAuth Finalization Failed:', error);
    throw error;
  }
};

/**
 * TOKEN REFRESH LOGIC
 * In a real app, this calls the backend /refresh endpoint
 */
export const refreshConnection = async (platform: Platform, connection: AccountConnection): Promise<AccountConnection> => {
  if (!connection.refreshToken) return connection;
  
  // Only refresh if expiring in less than 5 minutes
  const buffer = 5 * 60 * 1000;
  if (connection.expiresAt && connection.expiresAt > Date.now() + buffer) {
    return connection;
  }

  console.log(`[AUTH] Refreshing token for ${platform}...`);
  // Simulate API call to token endpoint
  await new Promise(r => setTimeout(r, 1000));
  
  const updated: AccountConnection = {
    ...connection,
    accessToken: `refreshed_tok_${Math.random().toString(36).substr(2, 10)}`,
    expiresAt: Date.now() + (60 * 60 * 1000) // +1 hour
  };
  
  saveConnection(platform, updated);
  return updated;
};

export const verifyManualToken = async (
  platform: Platform, 
  token: string, 
  clientId?: string, 
  clientSecret?: string
): Promise<AccountConnection> => {
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  if (!token) throw new Error('ERR_EMPTY_TOKEN');

  const mockData: AccountConnection = {
    isConnected: true,
    username: clientId ? `${platform}_Enterprise` : `${platform}_Bot`,
    avatar: `https://ui-avatars.com/api/?name=${platform}&background=random`,
    lastSync: new Date().toLocaleString(),
    accessToken: token,
    refreshToken: `manual_ref_${platform}`,
    clientId,
    clientSecret,
    expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000)
  };

  saveConnection(platform, mockData);
  return mockData;
};
