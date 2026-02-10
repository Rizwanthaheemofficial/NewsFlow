
import React, { useState } from 'react';
import { Zap, Mail, Lock, Chrome, Github, ArrowRight, Loader2, Info } from 'lucide-react';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState<string | null>(null);
  const [email, setEmail] = useState('');

  const handleEmailAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading('email');
    // Simulate standard email/pass authentication
    setTimeout(() => {
      onLogin({
        id: 'usr_' + Math.random().toString(36).substr(2, 9),
        name: email.split('@')[0] || 'Broadcaster',
        email: email || 'alex@newsflow.ai',
        avatar: `https://ui-avatars.com/api/?name=${email}&background=6366f1&color=fff`,
        plan: 'Pro'
      });
      setLoading(null);
    }, 1200);
  };

  const handleSocialAuth = (provider: 'google' | 'github') => {
    setLoading(provider);
    
    // In a real production environment, you would use:
    // const { user } = await authService.signInWithPopup(provider);
    
    // Simulating OAuth Handshake Delay
    setTimeout(() => {
      const mockUsers = {
        google: {
          name: 'Google User',
          email: 'user@gmail.com',
          avatar: 'https://i.pravatar.cc/150?u=google'
        },
        github: {
          name: 'GitHub Developer',
          email: 'dev@github.com',
          avatar: 'https://i.pravatar.cc/150?u=github'
        }
      };

      const selected = mockUsers[provider];

      onLogin({
        id: `usr_${provider}_${Math.random().toString(36).substr(2, 5)}`,
        name: selected.name,
        email: selected.email,
        avatar: selected.avatar,
        plan: 'Enterprise'
      });
      setLoading(null);
    }, 1500);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-100/50 p-10 border border-slate-100 relative overflow-hidden">
          {/* Animated background glow */}
          <div className="absolute -top-24 -right-24 w-48 h-48 bg-indigo-50 rounded-full blur-3xl opacity-50"></div>
          
          <div className="flex flex-col items-center mb-10 relative">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 mb-6 group hover:rotate-6 transition-transform">
              <Zap className="text-white fill-current" size={32} />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome Back</h1>
            <p className="text-slate-500 mt-2 font-medium">Manage your automated news flow</p>
          </div>

          <form className="space-y-5 relative" onSubmit={handleEmailAuth}>
            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 ml-1">Work Email</label>
              <div className="relative">
                <Mail className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="email" 
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="alex@newsflow.ai"
                  disabled={loading !== null}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all font-medium disabled:opacity-50"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-bold text-slate-700 ml-1">Password</label>
              <div className="relative">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                <input 
                  type="password" 
                  required
                  placeholder="••••••••"
                  disabled={loading !== null}
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all font-medium disabled:opacity-50"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" className="text-sm font-bold text-indigo-600 hover:text-indigo-700 transition-colors">Forgot password?</button>
            </div>

            <button 
              disabled={loading !== null}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 group disabled:opacity-70"
            >
              {loading === 'email' ? (
                <Loader2 className="animate-spin" />
              ) : (
                <>
                  Sign In 
                  <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <div className="relative my-8">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-100"></div></div>
            <div className="relative flex justify-center text-xs uppercase"><span className="bg-white px-4 text-slate-400 font-bold tracking-widest">Or continue with</span></div>
          </div>

          <div className="grid grid-cols-2 gap-4 relative">
            <button 
              onClick={() => handleSocialAuth('google')}
              disabled={loading !== null}
              className="flex items-center justify-center gap-3 py-3.5 border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all font-bold text-slate-700 disabled:opacity-50 group"
            >
              {loading === 'google' ? (
                <Loader2 className="animate-spin text-indigo-600" size={20} />
              ) : (
                <>
                  <Chrome size={20} className="text-red-500 group-hover:scale-110 transition-transform" /> 
                  Google
                </>
              )}
            </button>
            <button 
              onClick={() => handleSocialAuth('github')}
              disabled={loading !== null}
              className="flex items-center justify-center gap-3 py-3.5 border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all font-bold text-slate-700 disabled:opacity-50 group"
            >
              {loading === 'github' ? (
                <Loader2 className="animate-spin text-indigo-600" size={20} />
              ) : (
                <>
                  <Github size={20} className="group-hover:scale-110 transition-transform" /> 
                  GitHub
                </>
              )}
            </button>
          </div>

          <p className="text-center text-slate-500 mt-10 text-sm font-medium">
            Don't have an account? <button className="text-indigo-600 font-bold hover:underline decoration-2 underline-offset-4">Start free trial</button>
          </p>
        </div>
        
        <div className="flex items-center justify-center gap-2 mt-8">
          <Info size={14} className="text-slate-400" />
          <p className="text-center text-slate-400 text-[10px] font-black uppercase tracking-widest">
            NewsFlow Secure Auth v2.1.0 • AES-256 Encrypted
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
