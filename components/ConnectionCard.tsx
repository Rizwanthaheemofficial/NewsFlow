
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
  Loader2, 
  Key, 
  ChevronDown,
  ShieldCheck,
  AlertCircle,
  Zap
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
  const [manualError, setManualError] = useState<string | null>(null);

  const icons = {
    [Platform.FACEBOOK]: <Facebook size={24} />,
    [Platform.INSTAGRAM]: <Instagram size={24} />,
    [Platform.TWITTER]: <Twitter size={24} />,
    [Platform.LINKEDIN]: <Linkedin size={24} />,
  };

  const colors = {
    [Platform.FACEBOOK]: 'bg-[#1877F2]',
    [Platform.INSTAGRAM]: 'bg-gradient-to-tr from-[#f09433] via-[#dc2743] to-[#bc1888]',
    [Platform.TWITTER]: 'bg-[#000000]',
    [Platform.LINKEDIN]: 'bg-[#0077B5]',
  };

  const handleConnect = async () => {
    setIsConnecting(true);
    try {
      await onConnect();
    } catch (e) {
      console.error(e);
    } finally {
      setIsConnecting(false);
    }
  };

  const fillDefaultXKeys = () => {
    setClientId('RElQcy04RnduZUlWQVdadTVKLWs6MTpjaQ');
    setClientSecret('6J16Bv9WxCReKQ3sVhCz4I2irNX-boQ5hv_TAMDteVf8GUm7KV');
  };

  const handleManualSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    setIsConnecting(true);
    setManualError(null);
    try {
      const conn = await verifyManualToken(
        platform, 
        manualToken, 
        platform === Platform.TWITTER ? clientId : undefined, 
        platform === Platform.TWITTER ? clientSecret : undefined
      );
      onManualConnect(conn);
      setManualToken('');
      setClientId('');
      setClientSecret('');
      setShowAdvanced(false);
    } catch (err) {
      setManualError(err instanceof Error ? err.message : 'Validation failed');
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className={`relative overflow-hidden bg-white p-6 lg:p-8 rounded-[2.5rem] border-2 transition-all duration-500 ${connection.isConnected ? 'border-emerald-100 shadow-xl shadow-emerald-50/50' : 'border-slate-100 hover:border-slate-200 shadow-sm'}`}>
      <div className="flex items-start justify-between mb-8">
        <div className={`w-16 h-16 rounded-[1.5rem] ${colors[platform]} flex items-center justify-center text-white shadow-2xl transition-transform hover:rotate-3 shrink-0`}>
          {icons[platform]}
        </div>
        {connection.isConnected ? (
          <div className="flex flex-col items-end gap-1">
            <div className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-2 animate-in fade-in zoom-in duration-300">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
              Connected
            </div>
            {connection.clientId && (
              <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Enterprise API</span>
            )}
          </div>
        ) : (
          <div className="px-4 py-1.5 bg-slate-50 text-slate-400 rounded-full text-[10px] font-black uppercase tracking-widest border border-slate-100 flex items-center gap-2">
            Offline
          </div>
        )}
      </div>

      <div className="space-y-2 mb-8">
        <h3 className="text-2xl font-black text-slate-900 tracking-tight">{platform}</h3>
        <p className="text-sm text-slate-500 font-medium leading-relaxed">
          {connection.isConnected 
            ? `Successfully linked to @${connection.username}. API nodes are active.` 
            : `Authorize NewsFlow to automate broadcasts directly to your ${platform} audience.`}
        </p>
      </div>

      {connection.isConnected ? (
        <div className="space-y-4 animate-in slide-in-from-bottom-2">
          <div className="flex items-center gap-4 p-4 bg-slate-50 rounded-[1.5rem] border border-slate-100">
            <div className="relative">
              <img src={connection.avatar} alt="Profile" className="w-10 h-10 rounded-xl shadow-md border-2 border-white" />
              <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-emerald-500 rounded-full border-2 border-white flex items-center justify-center">
                <CheckCircle2 size={8} className="text-white" />
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-black text-slate-900 truncate">{connection.username}</p>
              <p className="text-[10px] text-slate-400 font-bold uppercase tracking-tighter">Sync: {connection.lastSync}</p>
            </div>
            <button className="p-2.5 text-slate-300 hover:text-red-600 hover:bg-white rounded-xl transition-all">
              <RefreshCw size={14} />
            </button>
          </div>
          <button 
            onClick={onDisconnect}
            className="w-full py-4 text-slate-400 font-black text-[10px] uppercase tracking-widest hover:text-red-600 hover:bg-red-50 rounded-2xl transition-all flex items-center justify-center gap-2 border border-transparent hover:border-red-100"
          >
            <Unlink size={14} /> Revoke Access
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          <button 
            onClick={handleConnect}
            disabled={isConnecting}
            className="w-full py-5 bg-slate-900 text-white font-black text-xs uppercase tracking-[0.15em] rounded-[1.5rem] hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 disabled:opacity-70 group"
          >
            {isConnecting && !showAdvanced ? (
              <Loader2 className="animate-spin" size={18} />
            ) : (
              <>
                Launch Secure OAuth
                <Globe size={16} className="group-hover:rotate-12 transition-transform" />
              </>
            )}
          </button>

          <div className="relative">
            <button 
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="w-full flex items-center justify-center gap-2 text-[10px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 py-2 transition-colors"
            >
              {showAdvanced ? 'Hide Advanced Setup' : platform === Platform.TWITTER ? 'Use Enterprise X Credentials' : 'Use Enterprise API Token'}
              <ChevronDown size={12} className={`transition-transform duration-300 ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>
            
            {showAdvanced && (
              <form onSubmit={handleManualSubmit} className="mt-4 p-5 bg-slate-50 rounded-[1.5rem] border border-slate-200 space-y-4 animate-in slide-in-from-top-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Key size={14} className="text-red-600" />
                    <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">
                      {platform === Platform.TWITTER ? 'X Developer Portal Keys' : 'Service Account Token'}
                    </span>
                  </div>
                  {platform === Platform.TWITTER && (
                    <button 
                      type="button" 
                      onClick={fillDefaultXKeys}
                      className="text-[8px] font-black text-red-600 bg-red-50 px-2 py-1 rounded-md uppercase hover:bg-red-100 transition-colors flex items-center gap-1"
                    >
                      <Zap size={8} /> Load Provided Keys
                    </button>
                  )}
                </div>
                
                <div className="space-y-3">
                  {platform === Platform.TWITTER ? (
                    <>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Client ID / App Key</label>
                        <input 
                          type="text" 
                          placeholder="RElQcy...MTpjaQ"
                          className={`w-full px-4 py-3 bg-white border ${manualError ? 'border-red-500' : 'border-slate-200'} rounded-xl text-xs font-bold outline-none focus:border-red-500 transition-all`}
                          value={clientId}
                          onChange={(e) => setClientId(e.target.value)}
                        />
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Client Secret / App Secret</label>
                        <input 
                          type="password" 
                          placeholder="6J16Bv...GUm7KV"
                          className={`w-full px-4 py-3 bg-white border ${manualError ? 'border-red-500' : 'border-slate-200'} rounded-xl text-xs font-bold outline-none focus:border-red-500 transition-all`}
                          value={clientSecret}
                          onChange={(e) => setClientSecret(e.target.value)}
                        />
                      </div>
                    </>
                  ) : (
                    <div className="space-y-1">
                      <label className="text-[8px] font-black text-slate-400 uppercase ml-1">Access Token</label>
                      <input 
                        type="password" 
                        placeholder="Enter permanent API token..."
                        className={`w-full px-4 py-3 bg-white border ${manualError ? 'border-red-500' : 'border-slate-200'} rounded-xl text-xs font-bold outline-none focus:border-red-500 transition-all`}
                        value={manualToken}
                        onChange={(e) => setManualToken(e.target.value)}
                      />
                    </div>
                  )}

                  {manualError && (
                    <div className="flex items-center gap-1.5 text-red-600">
                      <AlertCircle size={10} />
                      <p className="text-[9px] font-bold uppercase">{manualError}</p>
                    </div>
                  )}
                </div>

                <button 
                  type="submit"
                  disabled={isConnecting}
                  className="w-full py-3 bg-white border border-slate-200 text-slate-900 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-slate-950 hover:text-white hover:border-slate-950 transition-all flex items-center justify-center gap-2 shadow-sm"
                >
                  {isConnecting ? <Loader2 size={12} className="animate-spin" /> : <ShieldCheck size={14} />}
                  Handshake & Activate
                </button>
                <p className="text-[8px] text-slate-400 leading-tight text-center">Credentials are encrypted at rest. Persistent newsroom deployment mode.</p>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionCard;
