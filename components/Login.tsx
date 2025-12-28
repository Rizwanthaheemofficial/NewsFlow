
import React, { useState } from 'react';
import { Zap, Mail, Lock, Chrome, Github, ArrowRight, Loader2, Info } from 'lucide-react';
import { User } from '../types';

interface LoginProps {
  onLogin: (user: User) => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    // Simulate API call
    setTimeout(() => {
      onLogin({
        id: 'usr_8x2k9z4v',
        name: 'Alex Rivera',
        email: email || 'alex@newsflow.ai',
        avatar: 'https://i.pravatar.cc/150?u=alex',
        plan: 'Pro'
      });
      setLoading(false);
    }, 1200);
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-[2.5rem] shadow-2xl shadow-indigo-100/50 p-10 border border-slate-100">
          <div className="flex flex-col items-center mb-10">
            <div className="w-16 h-16 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-lg shadow-indigo-200 mb-6">
              <Zap className="text-white fill-current" size={32} />
            </div>
            <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Welcome Back</h1>
            <p className="text-slate-500 mt-2 font-medium">Log in to manage your automated news flow</p>
          </div>

          <div className="mb-8 p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex gap-3">
            <Info className="text-indigo-600 shrink-0" size={20} />
            <p className="text-xs text-indigo-800 font-medium leading-relaxed">
              <strong>Demo Mode:</strong> You can use any email and password to access the dashboard during this preview session.
            </p>
          </div>

          <form className="space-y-5" onSubmit={handleAuth}>
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
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all font-medium"
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
                  className="w-full pl-12 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 outline-none transition-all font-medium"
                />
              </div>
            </div>

            <div className="flex justify-end">
              <button type="button" className="text-sm font-bold text-indigo-600 hover:text-indigo-700">Forgot password?</button>
            </div>

            <button 
              disabled={loading}
              className="w-full bg-indigo-600 text-white py-4 rounded-2xl font-bold text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-2 group disabled:opacity-70"
            >
              {loading ? (
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

          <div className="grid grid-cols-2 gap-4">
            <button className="flex items-center justify-center gap-3 py-3 border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all font-bold text-slate-700">
              <Chrome size={20} /> Google
            </button>
            <button className="flex items-center justify-center gap-3 py-3 border border-slate-200 rounded-2xl hover:bg-slate-50 transition-all font-bold text-slate-700">
              <Github size={20} /> GitHub
            </button>
          </div>

          <p className="text-center text-slate-500 mt-10 text-sm font-medium">
            Don't have an account? <button className="text-indigo-600 font-bold hover:underline">Start free trial</button>
          </p>
        </div>
        
        <p className="text-center text-slate-400 mt-8 text-xs font-bold uppercase tracking-widest">
          NewsFlow Secure Auth v2.1.0
        </p>
      </div>
    </div>
  );
};

export default Login;
