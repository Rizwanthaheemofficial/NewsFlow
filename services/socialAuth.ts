
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
 * Simulates an API handshake to verify a manually entered enterprise token or credentials.
 */
export const verifyManualToken = async (
  platform: Platform, 
  token: string, 
  clientId?: string, 
  clientSecret?: string
): Promise<AccountConnection> => {
  // Real-world validation simulation
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  if (platform === Platform.TWITTER) {
    if (!clientId || !clientSecret) {
      throw new Error('Twitter Enterprise requires both Client ID and Client Secret.');
    }
  } else if (!token || token.length < 10) {
    throw new Error('Invalid token format. Enterprise tokens must be at least 10 characters.');
  }

  const mockData: AccountConnection = {
    isConnected: true,
    username: platform === Platform.TWITTER ? 'X_News_Engine' : `${platform}_Admin_Bot`,
    avatar: `https://ui-avatars.com/api/?name=${platform}&background=random`,
    lastSync: new Date().toLocaleString(),
    accessToken: token || `manual_${platform}_${Math.random().toString(36).substr(2, 9)}`,
    clientId,
    clientSecret,
    expiresAt: Date.now() + (365 * 24 * 60 * 60 * 1000) // 1 year for service accounts
  };

  saveConnection(platform, mockData);
  return mockData;
};

/**
 * SOCIAL INTEGRATION ENGINE (OAuth)
 */
export const initiateSocialConnection = async (platform: Platform): Promise<AccountConnection> => {
  const width = 600;
  const height = 750;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  const authUrl = `data:text/html;charset=utf-8,${encodeURIComponent(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Authorize ${platform} | NewsFlow Pro</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;700;900&display=swap" rel="stylesheet">
      <style>body { font-family: 'Inter', sans-serif; }</style>
    </head>
    <body class="bg-[#f8fafc] flex flex-col items-center justify-center min-h-screen p-6">
      <div class="bg-white p-10 rounded-[2.5rem] shadow-[0_20px_50px_rgba(0,0,0,0.1)] max-w-sm w-full text-center border border-slate-100">
        <div class="w-20 h-20 bg-red-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-2xl shadow-red-200">
          <svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <h1 class="text-2xl font-black text-slate-900 mb-3 tracking-tight">Connect ${platform}</h1>
        <p class="text-slate-500 text-sm mb-10 leading-relaxed font-medium">NewsFlow Pro will be able to manage your business posts, analyze engagement, and sync media assets.</p>
        
        <div class="space-y-3">
          <button id="authBtn" onclick="authorize()" class="w-full bg-slate-900 text-white py-4 rounded-2xl font-black text-lg shadow-xl hover:bg-black transition-all active:scale-95 flex items-center justify-center gap-2">
            Confirm & Link
          </button>
          <button onclick="window.close()" class="w-full text-slate-400 py-3 font-bold text-xs uppercase tracking-widest hover:text-slate-600 transition-colors">Cancel</button>
        </div>
        
        <div class="mt-8 pt-8 border-t border-slate-50 flex items-center justify-center gap-2">
          <div class="w-2 h-2 rounded-full bg-emerald-500"></div>
          <span class="text-[10px] font-black text-slate-400 uppercase tracking-widest">SSL Encrypted Gateway</span>
        </div>
      </div>
      <script>
        function authorize() {
          const btn = document.getElementById('authBtn');
          btn.innerHTML = '<svg class="animate-spin h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle><path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg> Authorizing...';
          btn.disabled = true;
          
          setTimeout(() => {
            const mockData = {
              isConnected: true,
              username: 'NewsDesk_' + Math.floor(Math.random() * 9000 + 1000),
              avatar: 'https://i.pravatar.cc/150?u=' + Math.random(),
              lastSync: new Date().toLocaleString(),
              accessToken: 'nf_' + Math.random().toString(36).substr(2, 15),
              expiresAt: Date.now() + (30 * 24 * 60 * 60 * 1000)
            };
            window.opener.postMessage({ type: 'AUTH_SUCCESS', platform: '${platform}', data: mockData }, '*');
            window.close();
          }, 1500);
        }
      </script>
    </body>
    </html>
  `)}`;

  return new Promise((resolve, reject) => {
    const popup = window.open(authUrl, `Connect ${platform}`, `width=${width},height=${height},left=${left},top=${top}`);

    if (!popup) {
      reject(new Error('Popup blocked. Please enable popups to connect social accounts.'));
      return;
    }

    const messageListener = (event: MessageEvent) => {
      if (event.data.type === 'AUTH_SUCCESS' && event.data.platform === platform) {
        window.removeEventListener('message', messageListener);
        saveConnection(platform, event.data.data);
        resolve(event.data.data);
      }
    };

    window.addEventListener('message', messageListener);

    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        window.removeEventListener('message', messageListener);
      }
    }, 1000);
  });
};
