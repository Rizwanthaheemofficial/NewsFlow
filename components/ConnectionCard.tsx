
import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, Unlink, Globe, Instagram, Twitter, Facebook, Linkedin, Loader2 } from 'lucide-react';
import { Platform, AccountConnection } from '../types';

interface ConnectionCardProps {
  platform: Platform;
  connection: AccountConnection;
  onConnect: () => Promise<void>;
  onDisconnect: () => void;
}

const ConnectionCard: React.FC<ConnectionCardProps> = ({ platform, connection, onConnect, onDisconnect }) => {
  const [isConnecting, setIsConnecting] = useState(false);

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
    } finally {
      setIsConnecting(false);
    }
  };

  return (
    <div className={`relative overflow-hidden bg-white p-6 lg:p-8 rounded-[2.5rem] border-2 transition-all duration-500 ${connection.isConnected ? 'border-emerald-100 shadow-xl shadow-emerald-50/50' : 'border-slate-100 hover:border-slate-200 shadow-sm'}`}>
      <div className="flex items-start justify-between mb-8">
        <div className={`w-16 h-16 rounded-[1.5rem] ${colors[platform]} flex items-center justify-center text-white shadow-2xl transition-transform hover:rotate-3`}>
          {icons[platform]}
        </div>
        {connection.isConnected ? (
          <div className="px-4 py-1.5 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest border border-emerald-100 flex items-center gap-2 animate-in fade-in zoom-in duration-300">
            <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
            Connected
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
        <button 
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full py-5 bg-slate-900 text-white font-black text-xs uppercase tracking-[0.15em] rounded-[1.5rem] hover:bg-black transition-all shadow-xl shadow-slate-200 flex items-center justify-center gap-3 disabled:opacity-70 group"
        >
          {isConnecting ? (
            <Loader2 className="animate-spin" size={18} />
          ) : (
            <>
              Launch Secure OAuth
              <Globe size={16} className="group-hover:rotate-12 transition-transform" />
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default ConnectionCard;
