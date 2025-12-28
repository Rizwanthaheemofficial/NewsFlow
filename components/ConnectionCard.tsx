
import React, { useState } from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, Unlink, Globe, Instagram, Twitter, Facebook, Linkedin, Loader2 } from 'lucide-react';
import { Platform, AccountConnection } from '../types';

interface ConnectionCardProps {
  platform: Platform;
  connection: AccountConnection;
  onConnect: () => void;
  onDisconnect: () => void;
}

const ConnectionCard: React.FC<ConnectionCardProps> = ({ platform, connection, onConnect, onDisconnect }) => {
  const [isConnecting, setIsConnecting] = useState(false);

  const icons = {
    [Platform.FACEBOOK]: <Facebook size={24} />,
    [Platform.INSTAGRAM]: <Instagram size={24} />,
    [Platform.TWITTER]: <Twitter size={24} />,
    [Platform.LINKEDIN]: <Linkedin size={24} />, // Fix: Added missing LinkedIn icon
  };

  const colors = {
    [Platform.FACEBOOK]: 'bg-blue-600',
    [Platform.INSTAGRAM]: 'bg-gradient-to-tr from-yellow-400 via-red-500 to-purple-600',
    [Platform.TWITTER]: 'bg-slate-900',
    [Platform.LINKEDIN]: 'bg-blue-700', // Fix: Added missing LinkedIn color
  };

  const handleConnect = () => {
    setIsConnecting(true);
    // Simulate OAuth Popup
    setTimeout(() => {
      onConnect();
      setIsConnecting(false);
    }, 2000);
  };

  return (
    <div className={`relative overflow-hidden bg-white p-6 rounded-3xl border-2 transition-all duration-300 ${connection.isConnected ? 'border-indigo-100 shadow-sm' : 'border-slate-100 grayscale-[0.5] opacity-80'}`}>
      <div className="flex items-start justify-between mb-6">
        <div className={`w-14 h-14 rounded-2xl ${colors[platform]} flex items-center justify-center text-white shadow-lg`}>
          {icons[platform]}
        </div>
        {connection.isConnected ? (
          <div className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-extrabold uppercase tracking-widest border border-emerald-100 flex items-center gap-1">
            <CheckCircle2 size={12} /> Active
          </div>
        ) : (
          <div className="px-3 py-1 bg-slate-50 text-slate-400 rounded-full text-[10px] font-extrabold uppercase tracking-widest border border-slate-100 flex items-center gap-1">
            <AlertCircle size={12} /> Disconnected
          </div>
        )}
      </div>

      <div className="space-y-1 mb-8">
        <h3 className="text-xl font-bold text-slate-900">{platform}</h3>
        <p className="text-sm text-slate-500 font-medium">
          {connection.isConnected ? `Connected as @${connection.username}` : `Connect your ${platform} business account`}
        </p>
      </div>

      {connection.isConnected ? (
        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-2xl border border-slate-100">
            <img src={connection.avatar} alt="Profile" className="w-8 h-8 rounded-lg shadow-sm" />
            <div className="flex-1 min-w-0">
              <p className="text-xs font-bold text-slate-700 truncate">{connection.username}</p>
              <p className="text-[10px] text-slate-400 font-medium">Last synced: {connection.lastSync}</p>
            </div>
            <button className="p-2 text-slate-400 hover:text-indigo-600 transition-colors">
              <RefreshCw size={14} />
            </button>
          </div>
          <button 
            onClick={onDisconnect}
            className="w-full py-3 text-red-600 font-bold text-sm hover:bg-red-50 rounded-2xl transition-all flex items-center justify-center gap-2"
          >
            <Unlink size={16} /> Disconnect Account
          </button>
        </div>
      ) : (
        <button 
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full py-4 bg-indigo-600 text-white font-bold rounded-2xl hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 disabled:opacity-70"
        >
          {isConnecting ? (
            <Loader2 className="animate-spin" size={20} />
          ) : (
            <>
              Connect Account
              <Globe size={18} />
            </>
          )}
        </button>
      )}
    </div>
  );
};

export default ConnectionCard;