
import { Platform, AccountConnection } from '../types';

/**
 * SOCIAL INTEGRATION ENGINE
 * Handles the logic for opening OAuth windows and receiving callbacks.
 */
export const initiateSocialConnection = async (platform: Platform): Promise<AccountConnection> => {
  const width = 600;
  const height = 700;
  const left = window.screenX + (window.outerWidth - width) / 2;
  const top = window.screenY + (window.outerHeight - height) / 2;

  // For a real app, this would be: `https://api.platform.com/oauth/authorize?client_id=...`
  // Here we use a data URI to simulate a real "Authorize" screen.
  const authUrl = `data:text/html;charset=utf-8,${encodeURIComponent(`
    <!DOCTYPE html>
    <html>
    <head>
      <title>Authorize ${platform}</title>
      <script src="https://cdn.tailwindcss.com"></script>
    </head>
    <body class="bg-slate-50 font-sans p-8 flex flex-col items-center justify-center min-h-screen">
      <div class="bg-white p-8 rounded-[2rem] shadow-2xl max-w-sm w-full text-center border border-slate-100">
        <div class="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl">
          <svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <h1 class="text-2xl font-black text-slate-900 mb-2">Allow NewsFlow?</h1>
        <p class="text-slate-500 text-sm mb-8 leading-relaxed">NewsFlow is requesting permission to post media and access metrics on your <strong>${platform}</strong> account.</p>
        <div class="space-y-3">
          <button onclick="authorize()" class="w-full bg-indigo-600 text-white py-4 rounded-2xl font-black text-lg shadow-xl shadow-indigo-100 active:scale-95 transition-all">Allow Access</button>
          <button onclick="window.close()" class="w-full text-slate-400 py-3 font-bold text-sm">Cancel</button>
        </div>
      </div>
      <script>
        function authorize() {
          const mockData = {
            isConnected: true,
            username: 'NewsFlow_${platform.substring(0, 3)}',
            avatar: 'https://i.pravatar.cc/150?u=${platform}',
            lastSync: 'Just now',
            accessToken: 'token_' + Math.random().toString(36).substr(2),
            expiresAt: Date.now() + 3600000
          };
          window.opener.postMessage({ type: 'AUTH_SUCCESS', platform: '${platform}', data: mockData }, '*');
          window.close();
        }
      </script>
    </body>
    </html>
  `)}`;

  return new Promise((resolve, reject) => {
    const popup = window.open(authUrl, `Connect ${platform}`, `width=${width},height=${height},left=${left},top=${top}`);

    if (!popup) {
      reject(new Error('Popup blocked. Please enable popups for this site.'));
      return;
    }

    const messageListener = (event: MessageEvent) => {
      if (event.data.type === 'AUTH_SUCCESS' && event.data.platform === platform) {
        window.removeEventListener('message', messageListener);
        resolve(event.data.data);
      }
    };

    window.addEventListener('message', messageListener);

    // Watch for popup closed without message
    const timer = setInterval(() => {
      if (popup.closed) {
        clearInterval(timer);
        window.removeEventListener('message', messageListener);
      }
    }, 1000);
  });
};
