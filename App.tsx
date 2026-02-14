
import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout.tsx';
import CanvasPreview from './components/CanvasPreview.tsx';
import Login from './components/Login.tsx';
import ConnectionCard from './components/ConnectionCard.tsx';
import { 
  WPPost, Platform, AppSettings, PublishLog, SystemStats, TemplateType,
  User, PerformanceScore, ContentVariations, ImageSource, AccountConnection
} from './types.ts';
import { DEFAULT_SETTINGS, APP_LOGO_BASE64 } from './constants.ts';
import { fetchRecentPosts } from './services/wordpress.ts';
import { 
  generateSocialCaption, 
  generateHashtags, 
  generateVisualHeadline,
  HashtagSet
} from './services/gemini.ts';
import { initiateSocialConnection, getStoredConnections, clearConnection, finalizeSocialConnection } from './services/socialAuth.ts';
import { publishToPlatform, DeploymentEvent } from './services/socialMedia.ts';
import { 
  Globe, 
  Sparkles, 
  Share2, 
  CheckCircle2, 
  Search, 
  Loader2, 
  Upload, 
  Share, 
  Zap, 
  Copy, 
  Check, 
  TrendingUp, 
  Mail, 
  ShieldCheck, 
  Activity, 
  Palette, 
  BrainCircuit, 
  Settings2, 
  Trash2, 
  FileText, 
  ShieldAlert, 
  Info, 
  ArrowRight, 
  Hash, 
  ChevronRight, 
  X,
  RotateCcw,
  PlusCircle,
  Layers
} from 'lucide-react';

export default function App() {
  // --- STATE ---
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('newsflow_settings');
    const base = saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    const connections = getStoredConnections();
    return {
      ...base,
      fbConnection: connections[Platform.FACEBOOK] || base.fbConnection,
      igConnection: connections[Platform.INSTAGRAM] || base.igConnection,
      xConnection: connections[Platform.X] || base.xConnection,
      liConnection: connections[Platform.LINKEDIN] || base.liConnection,
      ytConnection: connections[Platform.YOUTUBE] || base.ytConnection,
      ttConnection: connections[Platform.TIKTOK] || base.ttConnection,
    };
  });
  const [posts, setPosts] = useState<WPPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<WPPost | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [captions, setCaptions] = useState<ContentVariations | null>(null);
  const [hashtags, setHashtags] = useState<HashtagSet | null>(null);
  const [logs, setLogs] = useState<PublishLog[]>([]);
  const [exportedImageUrl, setExportedImageUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState<string | null>(null);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [deploymentEvents, setDeploymentEvents] = useState<DeploymentEvent[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [currentVariation, setCurrentVariation] = useState<number>(0);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // --- THEME ENGINE ---
  useEffect(() => {
    const root = document.documentElement;
    const primary = settings.branding.primaryColor;
    root.style.setProperty('--brand-primary', primary);
  }, [settings.branding.primaryColor]);

  // --- EFFECTS ---
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (code && state) {
      setGenerating('Finalizing Social Link...');
      finalizeSocialConnection(code, state)
        .then(conn => {
          if (conn) {
            const connections = getStoredConnections();
            setSettings(prev => ({
              ...prev,
              fbConnection: connections[Platform.FACEBOOK] || prev.fbConnection,
              igConnection: connections[Platform.INSTAGRAM] || prev.igConnection,
              xConnection: connections[Platform.X] || prev.xConnection,
              liConnection: connections[Platform.LINKEDIN] || prev.liConnection,
              ytConnection: connections[Platform.YOUTUBE] || prev.ytConnection,
              ttConnection: connections[Platform.TIKTOK] || prev.ttConnection,
            }));
            setShareFeedback('Account Linked Successfully!');
            setActiveTab('settings');
          }
        })
        .finally(() => {
          setGenerating(null);
          window.history.replaceState({}, document.title, window.location.pathname);
        });
    }
  }, []);

  useEffect(() => {
    if (user) loadPosts();
  }, [user, settings.wordpressUrl]);

  useEffect(() => {
    localStorage.setItem('newsflow_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    if (terminalEndRef.current) {
      terminalEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [deploymentEvents]);

  const stats: SystemStats = {
    todayPosts: logs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).length,
    totalPosts: logs.length,
    activePlatforms: [settings.fbConnection, settings.igConnection, settings.xConnection, settings.liConnection, settings.ytConnection, settings.ttConnection].filter(c => c.isConnected).length,
    tokensUsed: 42050 + (logs.length * 1500),
    estimatedSavings: 1250 + (logs.length * 45),
    totalEngagement: 85400 + logs.reduce((acc, log) => acc + (log.metrics?.reach || 0), 0)
  };

  const loadPosts = async () => {
    setLoading(true);
    try {
      const fetched = await fetchRecentPosts(settings.wordpressUrl, 10, searchQuery);
      setPosts(fetched);
    } finally {
      setLoading(false);
    }
  };

  const handlePostSelection = (post: WPPost) => {
    setSelectedPost(post);
    setCaptions(null);
    setHashtags(null);
    setExportedImageUrl(null);
    setCurrentVariation(0);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 2 * 1024 * 1024) {
        alert("File too large. Max 2MB.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, logoUrl: reader.result as string }));
        setShareFeedback('Brand Logo Synchronized');
      };
      reader.readAsDataURL(file);
    }
  };

  const handleClearLogo = () => {
    setSettings(prev => ({ ...prev, logoUrl: '' }));
    setShareFeedback('Logo reset to default');
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setIsCopied(id);
    setTimeout(() => setIsCopied(null), 2000);
  };

  const getSettingsKey = (platform: Platform): keyof AppSettings => {
    switch(platform) {
      case Platform.FACEBOOK: return 'fbConnection';
      case Platform.INSTAGRAM: return 'igConnection';
      case Platform.X: return 'xConnection';
      case Platform.LINKEDIN: return 'liConnection';
      case Platform.YOUTUBE: return 'ytConnection';
      case Platform.TIKTOK: return 'ttConnection';
      default: throw new Error('Invalid platform');
    }
  };

  const handleManualConnectionUpdate = (platform: Platform, connection: AccountConnection) => {
    setSettings(prev => ({ ...prev, [getSettingsKey(platform)]: connection }));
  };

  const handleDisconnectAccount = (platform: Platform) => {
    clearConnection(platform);
    setSettings(prev => ({ ...prev, [getSettingsKey(platform)]: { isConnected: false } }));
  };

  const handleGenerateAI = async () => {
    if (!selectedPost) return;
    setGenerating('AI Neural Signal Syncing...');
    try {
      const brandName = settings.brandWebsite || 'WORLD NEWS';
      const [newCaptions, visualData, newHashtags] = await Promise.all([
        generateSocialCaption(selectedPost.title, selectedPost.excerpt || '', selectedPost.link, settings.aiConfig),
        generateVisualHeadline(selectedPost.title, selectedPost.excerpt || ''),
        generateHashtags(selectedPost.title, selectedPost.excerpt || '', brandName)
      ]);

      setSelectedPost({ ...selectedPost, visualHeadline: visualData.headline, highlightWords: visualData.highlights });
      setCaptions(newCaptions);
      setHashtags(newHashtags);
      setCurrentVariation(prev => prev + 1);
    } finally {
      setGenerating(null);
    }
  };

  const handleBroadcast = async () => {
    if (!selectedPost || !captions) return;
    const platforms = [Platform.FACEBOOK, Platform.INSTAGRAM, Platform.X, Platform.LINKEDIN, Platform.YOUTUBE, Platform.TIKTOK];
    const activeCons = platforms.filter(p => (settings[getSettingsKey(p)] as AccountConnection).isConnected);
    
    if (activeCons.length === 0) {
      alert("No active hubs. Enable connections in Settings.");
      setActiveTab('settings');
      return;
    }

    setIsDeploying(true);
    setDeploymentEvents([]);
    
    const newLog: PublishLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      postTitle: selectedPost.title,
      caption: captions[Platform.X] || captions[Platform.FACEBOOK],
      imageUrl: exportedImageUrl || selectedPost.aiImageUrl || selectedPost.featuredImageUrl,
      platforms: {},
      metrics: { likes: 0, shares: 0, comments: 0, reach: 0 }
    };

    for (const platform of activeCons) {
      const connection = settings[getSettingsKey(platform)] as AccountConnection;
      const success = await publishToPlatform(
        platform, 
        connection,
        { caption: captions[platform] || captions[Platform.X], mediaUrl: newLog.imageUrl, title: selectedPost.title },
        (event) => setDeploymentEvents(prev => [...prev, { ...event, message: `[${platform}] ${event.message}` }])
      );
      newLog.platforms[platform] = success ? 'success' : 'failed';
    }

    setLogs([newLog, ...logs]);
    setIsDeploying(false);
  };

  if (!user) return <Login onLogin={setUser} />;

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <style>{`
        :root { --brand-primary: ${settings.branding.primaryColor}; }
        .bg-brand { background-color: var(--brand-primary); }
        .text-brand { color: var(--brand-primary); }
        .shadow-brand { box-shadow: 0 10px 15px -3px rgba(0,0,0,0.1); }
      `}</style>

      {isDeploying && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6">
          <div className="absolute inset-0 bg-slate-950/90 backdrop-blur-xl"></div>
          <div className="bg-slate-900 w-full max-w-4xl h-[600px] rounded-[3rem] border border-slate-800 flex flex-col overflow-hidden shadow-2xl">
             <div className="p-8 border-b border-slate-800 flex items-center justify-between bg-slate-900/50">
                <div className="flex items-center gap-3">
                   <div className="w-3 h-3 rounded-full bg-red-500"></div>
                   <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                   <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                   <h2 className="ml-4 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em]">Broadcast Node Terminal</h2>
                </div>
                <Activity size={16} className="text-emerald-500 animate-pulse" />
             </div>
             <div className="flex-1 overflow-y-auto p-10 font-mono text-[10px] space-y-3 custom-scrollbar text-slate-400">
                {deploymentEvents.map((ev, i) => (
                  <div key={i} className={`flex gap-4 p-2 rounded-lg ${ev.type === 'error' ? 'bg-red-500/10 text-red-400' : ev.type === 'success' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-slate-800/30'}`}>
                    <span className="opacity-40">[{ev.timestamp}]</span>
                    <span className="font-bold">{ev.message}</span>
                  </div>
                ))}
                <div ref={terminalEndRef} />
             </div>
             <div className="p-8 bg-black/40 border-t border-slate-800 text-right">
                <button onClick={() => setIsDeploying(false)} className="px-8 py-3 bg-brand text-white rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl">Close Node</button>
             </div>
          </div>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <div className="space-y-10 animate-in fade-in duration-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
            {[
              { label: "Today's Dispatch", value: stats.todayPosts, icon: Share2, color: "text-brand", bg: "bg-brand/10" },
              { label: "Channel Reach", value: (stats.totalEngagement / 1000).toFixed(1) + "k", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Active Hubs", value: stats.activePlatforms, icon: Globe, color: "text-slate-900", bg: "bg-slate-100" },
              { label: "AI Usage", value: stats.tokensUsed.toLocaleString(), icon: Zap, color: "text-amber-600", bg: "bg-amber-50" }
            ].map((stat, i) => (
              <div key={i} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-sm flex items-center gap-5 group hover:scale-[1.02] transition-all">
                <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center group-hover:rotate-6 transition-transform`}><stat.icon size={24} /></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p><p className="text-2xl font-black text-slate-900">{stat.value}</p></div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4 h-[850px]">
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
                <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                  <h2 className="font-black text-slate-900 text-xs uppercase tracking-widest flex items-center gap-3">
                    <Globe size={16} className="text-brand" /> Press Feed
                  </h2>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-300" size={14} />
                    <input type="text" placeholder="Filter news..." className="pl-9 pr-3 py-2 bg-white border border-slate-100 rounded-xl text-[10px] font-bold outline-none focus:border-brand transition-all w-32" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar bg-slate-50/20">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 opacity-30">
                      <div className="w-12 h-12 border-4 border-slate-200 border-t-brand rounded-full animate-spin"></div>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em]">Injesting Signal...</p>
                    </div>
                  ) : posts.map(post => (
                    <button key={post.id} onClick={() => handlePostSelection(post)} className={`w-full text-left p-4 rounded-[1.75rem] transition-all border-2 flex gap-4 group ${selectedPost?.id === post.id ? 'border-brand bg-white shadow-xl shadow-brand/5' : 'border-transparent hover:bg-white hover:shadow-lg hover:shadow-slate-100'}`}>
                      <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 bg-slate-100 border border-slate-100 group-hover:scale-95 transition-transform">
                        <img src={post.aiImageUrl || post.featuredImageUrl} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0 py-1 flex flex-col justify-between">
                        <h3 className={`text-xs font-black leading-tight line-clamp-2 ${selectedPost?.id === post.id ? 'text-brand' : 'text-slate-900'}`}>{post.title}</h3>
                        <div className="flex items-center justify-between mt-2">
                           <span className="text-[9px] text-slate-400 font-black uppercase tracking-tighter">{new Date(post.date).toLocaleDateString()}</span>
                           <ChevronRight size={14} className={`transition-all ${selectedPost?.id === post.id ? 'text-brand translate-x-1' : 'text-slate-200'}`} />
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-8">
              {!selectedPost ? (
                <div className="bg-white rounded-[3.5rem] border-4 border-dashed border-slate-100 h-full min-h-[600px] flex flex-col items-center justify-center p-12 text-center text-slate-300">
                  <div className="w-32 h-32 bg-slate-50 rounded-full flex items-center justify-center mb-8 border border-slate-100 shadow-inner">
                    <BrainCircuit size={48} className="opacity-20 animate-pulse" />
                  </div>
                  <h2 className="text-3xl font-black uppercase tracking-tighter text-slate-400">Creative Hub Locked</h2>
                  <p className="text-xs font-bold max-w-xs mt-4">Select a broadcast signal from the press feed to initiate global content optimization.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-8">
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                    <div className="space-y-6">
                      <div className="bg-white p-6 rounded-[3.5rem] shadow-2xl border border-slate-100 relative group">
                         <div className="absolute top-10 left-10 z-10 opacity-0 group-hover:opacity-100 transition-opacity">
                            <div className="px-4 py-2 bg-slate-900/80 backdrop-blur-md text-white rounded-full text-[9px] font-black uppercase flex items-center gap-2">
                               <Palette size={12} className="text-brand" /> Live Render
                            </div>
                         </div>
                         <CanvasPreview 
                           post={selectedPost} 
                           template={settings.selectedTemplate} 
                           brandWebsite={settings.brandWebsite} 
                           logoUrl={settings.logoUrl} 
                           branding={settings.branding} 
                           onExport={setExportedImageUrl} 
                         />
                      </div>
                      
                      <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm relative overflow-hidden">
                         <div className="absolute top-0 right-0 w-32 h-32 bg-brand/5 rounded-full -mr-16 -mt-16 blur-3xl"></div>
                         <div className="flex items-center justify-between mb-6 relative z-10">
                            <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                               <Layers size={14} className="text-brand" /> Identity Node
                            </h3>
                            <div className="flex gap-2">
                                {settings.logoUrl && (
                                   <button 
                                      onClick={handleClearLogo}
                                      className="p-2.5 bg-red-50 text-red-600 rounded-xl hover:bg-red-100 transition-all shadow-sm"
                                      title="Reset Logo"
                                   >
                                      <RotateCcw size={14} />
                                   </button>
                                )}
                                <button 
                                  onClick={() => logoInputRef.current?.click()}
                                  className="px-5 py-2.5 bg-brand text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:opacity-90 transition-all flex items-center gap-2 shadow-lg shadow-brand/10"
                                >
                                  <Upload size={12} /> Sync Logo
                                </button>
                            </div>
                            <input type="file" ref={logoInputRef} className="hidden" accept="image/*" onChange={handleLogoUpload} />
                         </div>
                         <div className="flex items-center gap-6 p-6 bg-slate-50/50 rounded-3xl border border-dashed border-slate-200 group relative z-10">
                            <div className="w-20 h-20 bg-white rounded-2xl shadow-md flex items-center justify-center p-3 border border-slate-100 group-hover:scale-105 transition-transform duration-300">
                               <img src={settings.logoUrl || APP_LOGO_BASE64} className="max-w-full max-h-full object-contain" alt="Brand Logo" />
                            </div>
                            <div>
                               <p className="text-xs font-black text-slate-900 uppercase">Active Branding</p>
                               <p className="text-[9px] text-slate-400 font-bold uppercase mt-1">
                                  {settings.logoUrl ? 'Custom Asset Verified' : 'System Default Active'}
                               </p>
                               <p className="text-[8px] text-brand font-black uppercase mt-2 tracking-widest">Auto-Scale • PNG/SVG</p>
                            </div>
                         </div>
                      </div>
                    </div>

                    <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm p-8 flex flex-col space-y-8">
                        <div className="flex items-center justify-between">
                          <div className="flex flex-col">
                            <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                              AI Neural Optimizer
                            </h2>
                            <div className="flex items-center gap-2 mt-1">
                               <div className="w-1.5 h-1.5 rounded-full bg-emerald-500"></div>
                               <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Multi-Channel Adaptation</span>
                            </div>
                          </div>
                          <button onClick={handleGenerateAI} disabled={!!generating} className="px-8 py-4 bg-brand text-white rounded-2xl font-black text-[11px] uppercase flex items-center gap-3 shadow-xl shadow-brand/20 hover:scale-[1.05] active:scale-95 transition-all">
                              {generating ? <Loader2 size={16} className="animate-spin" /> : <PlusCircle size={16} />} 
                              {captions ? `Variation #${currentVariation}` : 'Sync Neural Core'}
                          </button>
                        </div>

                        {captions ? (
                          <div className="space-y-8 animate-in slide-in-from-bottom-4 duration-500">
                             <div className="space-y-4">
                                <div className="flex items-center justify-between px-2">
                                   <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                      <Zap size={14} className="text-brand" /> Optimized Content
                                   </label>
                                   <button onClick={() => copyToClipboard(captions[Platform.X], 'caption')} className="p-2 text-slate-300 hover:text-brand transition-colors">
                                      {isCopied === 'caption' ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} />}
                                   </button>
                                </div>
                                <div className="relative group">
                                  <textarea 
                                    className="w-full p-8 bg-slate-50 border border-slate-100 rounded-[2.5rem] text-sm font-bold leading-relaxed min-h-[200px] outline-none focus:ring-4 focus:ring-brand/5 focus:bg-white transition-all shadow-inner resize-none" 
                                    value={captions[Platform.X]} 
                                    onChange={(e) => setCaptions({ ...captions, [Platform.X]: e.target.value })}
                                  />
                                  <div className="absolute bottom-6 right-6 opacity-0 group-hover:opacity-100 transition-opacity">
                                     <span className="text-[9px] font-black text-slate-300 uppercase tracking-widest">Editable Node</span>
                                  </div>
                                </div>
                             </div>

                             {hashtags && (
                               <div className="space-y-6 bg-slate-50 p-6 rounded-[2.5rem] border border-slate-100 relative overflow-hidden">
                                  <div className="absolute top-0 right-0 w-24 h-24 bg-brand/5 rounded-full -mr-12 -mt-12 blur-2xl"></div>
                                  <div className="flex items-center justify-between mb-4 relative z-10">
                                     <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] flex items-center gap-2">
                                        <Hash size={14} className="text-brand" /> Hashtag Strategy
                                     </h4>
                                     <button onClick={() => copyToClipboard([...hashtags.niche, ...hashtags.broad, ...hashtags.trending].join(' '), 'all-tags')} className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[9px] font-black uppercase hover:border-brand transition-all shadow-sm">
                                        {isCopied === 'all-tags' ? 'Copied' : 'Copy Hub'}
                                     </button>
                                  </div>
                                  
                                  <div className="space-y-4 relative z-10">
                                     {[
                                       { label: 'Niche Dispatch', tags: hashtags.niche, color: 'text-brand', bg: 'bg-brand/5' },
                                       { label: 'Broad Reach', tags: hashtags.broad, color: 'text-slate-600', bg: 'bg-slate-200/50' },
                                       { label: 'Trending Nodes', tags: hashtags.trending, color: 'text-slate-900', bg: 'bg-slate-900/5' }
                                     ].map((group, idx) => (
                                       <div key={idx} className="space-y-2">
                                          <div className="flex items-center justify-between">
                                             <span className={`text-[9px] font-black uppercase tracking-tighter ${group.color}`}>{group.label}</span>
                                          </div>
                                          <div className="flex flex-wrap gap-1.5">
                                             {group.tags.map((tag, tIdx) => (
                                               <span key={tIdx} className={`${group.bg} ${group.color} px-2.5 py-1 rounded-lg text-[10px] font-bold border border-white/50 hover:scale-105 transition-transform cursor-default`}>
                                                  #{tag}
                                               </span>
                                             ))}
                                          </div>
                                       </div>
                                     ))}
                                  </div>
                               </div>
                             )}

                             <div className="grid grid-cols-1 gap-4 pt-4">
                               <button onClick={handleBroadcast} disabled={!!generating || isDeploying} className="py-8 bg-slate-950 text-white rounded-[2.5rem] font-black text-sm uppercase tracking-[0.3em] shadow-2xl hover:bg-black hover:shadow-brand/20 active:scale-[0.98] transition-all flex items-center justify-center gap-4 group">
                                  <Share size={24} className="group-hover:rotate-12 transition-transform" /> 
                                  {isDeploying ? 'Deploying Signal...' : 'Initiate Global Dispatch'}
                               </button>
                             </div>
                          </div>
                        ) : (
                          <div className="flex-1 flex flex-col items-center justify-center py-32 text-center space-y-6 opacity-20 group">
                            <div className="relative">
                               <div className="absolute inset-0 bg-brand/20 blur-3xl rounded-full scale-150 group-hover:scale-110 transition-transform duration-1000"></div>
                               <BrainCircuit size={80} className="mx-auto relative z-10 group-hover:scale-110 transition-transform duration-700" />
                            </div>
                            <div className="space-y-2 relative z-10">
                               <p className="text-sm font-black uppercase tracking-[0.3em]">Neural Core Idle</p>
                               <p className="text-[10px] font-bold max-w-[240px] mx-auto leading-relaxed">Select a news post and click "Sync Neural Core" to adaptation the press story for global distribution.</p>
                            </div>
                          </div>
                        )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8">
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-4 space-y-8">
                 <div className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
                    <h2 className="text-xl font-black uppercase tracking-tighter flex items-center gap-3">
                       <Settings2 className="text-brand" /> System Core
                    </h2>
                    <div className="space-y-6">
                       <div className="space-y-2">
                          <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WordPress REST Node</label>
                          <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold outline-none border border-slate-100 focus:border-brand transition-all" placeholder="https://newsroom.live/" value={settings.wordpressUrl} onChange={e => setSettings({...settings, wordpressUrl: e.target.value})} />
                       </div>
                       <div className="flex items-center justify-between p-6 bg-slate-50 rounded-[2rem] border border-slate-100 group">
                          <div className="flex items-center gap-4">
                             <div className="w-10 h-10 rounded-xl bg-white flex items-center justify-center shadow-sm border border-slate-100 group-hover:rotate-12 transition-transform">
                                <Palette size={20} className="text-brand" />
                             </div>
                             <span className="text-xs font-black uppercase tracking-widest">Brand Accents</span>
                          </div>
                          <input type="color" className="w-12 h-12 bg-transparent cursor-pointer rounded-xl border-none p-0" value={settings.branding.primaryColor} onChange={e => setSettings({...settings, branding: {...settings.branding, primaryColor: e.target.value}})} />
                       </div>
                    </div>
                 </div>
              </div>

              <div className="lg:col-span-8">
                 <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {[Platform.FACEBOOK, Platform.INSTAGRAM, Platform.X, Platform.LINKEDIN, Platform.YOUTUBE, Platform.TIKTOK].map(p => (
                      <ConnectionCard 
                        key={p} 
                        platform={p} 
                        connection={settings[getSettingsKey(p)] as AccountConnection} 
                        onConnect={() => initiateSocialConnection(p)} 
                        onDisconnect={() => handleDisconnectAccount(p)} 
                        onManualConnect={(conn) => handleManualConnectionUpdate(p, conn)}
                      />
                    ))}
                 </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'privacy' && (
        <div className="max-w-4xl mx-auto bg-white p-12 rounded-[3rem] shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-8">
           <div className="flex items-center gap-6 mb-12">
              <div className="w-16 h-16 bg-emerald-50 text-emerald-600 rounded-3xl flex items-center justify-center shadow-inner"><ShieldCheck size={32} /></div>
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Privacy Policy</h1>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Enterprise Standard v3.0</p>
              </div>
           </div>
           <div className="prose prose-slate max-w-none space-y-8 text-slate-600 font-medium leading-relaxed">
              <p>At NewsFlow Pro, we take your privacy seriously. This policy describes how we collect, use, and protect your information when using our WordPress-to-Social-Media automation tools.</p>
              <h3 className="text-slate-900 font-black uppercase tracking-tight">1. Data Ingestion</h3>
              <p>We only ingest content from WordPress feeds that you explicitly configure. This includes post titles, excerpts, and featured images. No other data from your WordPress installation is accessed.</p>
              <h3 className="text-slate-900 font-black uppercase tracking-tight">2. Social Authentication</h3>
              <p>Your social media accounts are linked via OAuth. We never store your passwords. Access tokens are stored securely in your browser's local storage and used only to facilitate content publication at your command.</p>
           </div>
        </div>
      )}

      {activeTab === 'terms' && (
        <div className="max-w-4xl mx-auto bg-white p-12 rounded-[3rem] shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-8">
           <div className="flex items-center gap-6 mb-12">
              <div className="w-16 h-16 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center shadow-inner"><FileText size={32} /></div>
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Terms of Service</h1>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Version 2.4 Enterprise</p>
              </div>
           </div>
           <div className="prose prose-slate max-w-none space-y-8 text-slate-600 font-medium leading-relaxed">
              <p>By using NewsFlow Pro, you agree to the following terms and conditions regarding automated content distribution.</p>
              <h3 className="text-slate-900 font-black uppercase tracking-tight">1. Content Ownership</h3>
              <p>You retain full ownership of all content processed through the platform. NewsFlow Pro acts solely as a processing node for your branding and distribution strategy.</p>
              <h3 className="text-slate-900 font-black uppercase tracking-tight">2. AI Usage</h3>
              <p>The AI neural core uses advanced LLM technology (Gemini 3). While we strive for accuracy, you are responsible for reviewing all generated captions and hashtags before global dispatch.</p>
           </div>
        </div>
      )}

      {activeTab === 'data-deletion' && (
        <div className="max-w-4xl mx-auto bg-white p-12 rounded-[3rem] shadow-sm border border-slate-100 animate-in fade-in slide-in-from-bottom-8">
           <div className="flex items-center gap-6 mb-12">
              <div className="w-16 h-16 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center shadow-inner"><ShieldAlert size={32} /></div>
              <div>
                <h1 className="text-3xl font-black text-slate-900 tracking-tight">Data Deletion</h1>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Right to be Forgotten</p>
              </div>
           </div>
           <div className="space-y-8">
              <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
                <p className="text-sm font-bold text-slate-900 mb-4">You have full control over your data. To wipe all session data and revoke local access tokens:</p>
                <button 
                  onClick={() => { localStorage.clear(); window.location.reload(); }}
                  className="px-8 py-4 bg-red-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-lg shadow-red-100 hover:bg-red-700 transition-all"
                >
                  Purge All Local Data
                </button>
              </div>
              <p className="text-xs text-slate-400 font-medium">Note: Purging local data will require you to re-link all social hubs and brand configurations. This action is permanent.</p>
           </div>
        </div>
      )}
      
      {shareFeedback && (
        <div className="fixed bottom-10 right-10 z-[110] animate-in fade-in slide-in-from-right-10 duration-500">
           <div className="bg-slate-900 text-white px-8 py-4 rounded-2xl shadow-2xl border border-slate-800 flex items-center gap-4">
              <CheckCircle2 className="text-emerald-500" size={20} />
              <p className="text-xs font-black uppercase tracking-widest">{shareFeedback}</p>
              <button onClick={() => setShareFeedback(null)} className="ml-4 opacity-50 hover:opacity-100"><X size={14} /></button>
           </div>
        </div>
      )}
    </Layout>
  );
}
