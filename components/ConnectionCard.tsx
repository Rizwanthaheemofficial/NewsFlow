
import React, { useState } from 'react';
import { 
  CheckCircle2, 
  RefreshCw, 
  Unlink, 
  Globe, 
  Instagram, 
  Twitter, 
  Facebook, 
  Linkedin, 
  Youtube,
  Music, // For TikTok fallback if no specific icon
  Loader2, 
  Key, 
  ChevronDown,
  ShieldCheck,
  AlertCircle,
  Zap,
  Info,
  ShieldAlert,
  PlaySquare
} from 'lucide-react';
import { Platform, AccountConnection } from '../types';
import { verifyManualToken } from '../services/socialAuth';

interface ConnectionCardProps {
  platform: Platform;
  connection: AccountConnection;
  onConnect: () => Promise<void>;
  onDisconnect: () => void;
  onManualConnect: (connection: AccountConnection) => void;
}

const ConnectionCard: React.FC<ConnectionCardProps> = ({ 
  platform, 
  connection, 
  onConnect, 
  onDisconnect,
  onManualConnect
}) => {
  const [isConnecting, setIsConnecting] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [manualToken, setManualToken] = useState('');
  const [clientId, setClientId] = useState('');
  const [clientSecret, setClientSecret] = useState('');
  const [error, setError] = useState<string | null>(null);

  const icons = {
    [Platform.FACEBOOK]: <Facebook size={24} />,
    [Platform.INSTAGRAM]: <Instagram size={24} />,
    [Platform.X]: <Twitter size={24} />,
    [Platform.LINKEDIN]: <Linkedin size={24} />,
    [Platform.YOUTUBE]: <Youtube size={24} />,
    [Platform.TIKTOK]: <Music size={24} />, // Alternative for TikTok
  };

  const colors = {
    [Platform.FACEBOOK]: 'bg-[#1877F2]',
    [Platform.INSTAGRAM]: 'bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]',
    [Platform.X]: 'bg-[#000000]',
    [Platform.LINKEDIN]: 'bg-[#0077B5]',
    [Platform.YOUTUBE]: 'bg-[#FF0000]',
    [Platform.TIKTOK]: 'bg-[#000000] border-2 border-cyan-400 shadow-[0_0_15px_rgba(34,211,238,0.3)]',
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    setError(null);
    try {
      await onConnect();
    } catch (e) {
      setError(e instanceof Error ? e.message : 'An unexpected error occurred during OAuth handshake.');
    } finally {
      setIsConnecting(false);
    }
  };

  const fillDefaultKeys = () => {
    if (platform === Platform.X) {
      setClientId('RElQcy04RnduZUlWQVdadTVKLWs6MTpjaQ');
      setClientSecret('6J16Bv9WxCReKQ3sVhCz4I2irNX-boQ5hv_TAMDteVf8GUm7KV');
    } else {
      setClientId('enterprise-id-demo-99');
      setClientSecret('secret-hash-demo-12345');
    }
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsConnecting(true);
    setError(null);
    try {
      const conn = await verifyManualToken(platform, manualToken, clientId, clientSecret);
      onManualConnect(conn);
      setManualToken('');
      setClientId('');
      setClientSecret('');
      setShowAdvanced(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setIsConnecting(false);
    }
  };

  const needsAppCredentials = true;

  return (
    <div className={`relative overflow-hidden bg-white p-6 lg:p-8 rounded-[2.5rem] border-2 transition-all duration-500 ${connection.isConnected ? 'border-emerald-100 shadow-xl shadow-emerald-50/50' : error ? 'border-red-100 shadow-lg shadow-red-50/30' : 'border-slate-100 hover:border-slate-200 shadow-sm'}`}>
      <div className="flex items-start justify-between mb-8">
        <div className={`w-14 h-14 rounded-[1.25rem] ${colors[platform]} flex items-center justify-center text-white shadow-2xl transition-transform hover:rotate-3 shrink-0`}>
          {icons[platform]}
        </div>
        {connection.isConnected ? (
          <div className="flex flex-col items-end gap-1">
            <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[9px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-2">
              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></div>
              Active
            </div>
          </div>
        ) : (
          <div className="px-3 py-1 bg-slate-50 text-slate-400 rounded-full text-[9px] font-black uppercase tracking-widest border border-slate-100">
            Pending
          </div>
        )}
      </div>

      <div className="space-y-1 mb-6">
        <h3 className="text-xl font-black text-slate-900 tracking-tight">{platform}</h3>
        <p className="text-[11px] text-slate-500 font-bold leading-relaxed line-clamp-2">
          {connection.isConnected 
            ? `Verified node for @${connection.username}` 
            : `Enable automated broadcasting for your ${platform} channel.`}
        </p>
      </div>

      {connection.isConnected ? (
        <div className="space-y-3">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <img src={connection.avatar} className="w-8 h-8 rounded-lg shadow-sm" />
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-black text-slate-900 truncate">@{connection.username}</p>
              <p className="text-[8px] text-slate-400 font-bold uppercase">Token Verified</p>
            </div>
          </div>
          <button onClick={onDisconnect} className="w-full py-3 text-slate-400 font-black text-[9px] uppercase tracking-widest hover:text-red-600 transition-all border border-slate-100 rounded-xl">
            Disconnect
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <button 
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full py-4 bg-slate-950 text-white font-black text-[10px] uppercase tracking-widest rounded-2xl hover:bg-black transition-all flex items-center justify-center gap-2 shadow-lg"
          >
            {isConnecting ? <Loader2 className="animate-spin" size={14} /> : <Zap size={14} />} Connect Hub
          </button>
          <button onClick={() => setShowAdvanced(!showAdvanced)} className="w-full text-[9px] font-black text-slate-400 uppercase text-center py-1">
            {showAdvanced ? 'Simple Mode' : 'Enterprise Credentials'}
          </button>
          
          {showAdvanced && (
             <form onSubmit={handleManualSubmit} className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-200">
                <input 
                   type="text" 
                   placeholder="Client ID..." 
                   className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold outline-none" 
                   value={clientId}
                   onChange={e => setClientId(e.target.value)}
                />
                <input 
                   type="password" 
                   placeholder="Access Token..." 
                   className="w-full p-2.5 bg-white border border-slate-200 rounded-lg text-[10px] font-bold outline-none" 
                   value={manualToken}
                   onChange={e => setManualToken(e.target.value)}
                />
                <button type="submit" className="w-full py-2 bg-brand text-white text-[9px] font-black uppercase rounded-lg">Verify Node</button>
             </form>
          )}
        </div>
      )}
    </div>
  );
};

export default ConnectionCard;
