
import React, { useState, useEffect, useRef } from 'react';
import Layout from './components/Layout';
import CanvasPreview from './components/CanvasPreview';
import Login from './components/Login';
import ConnectionCard from './components/ConnectionCard';
import { 
  WPPost, Platform, AppSettings, PublishLog, SystemStats, TemplateType,
  User, PerformanceScore, ContentVariations, ImageSource, AccountConnection
} from './types';
import { DEFAULT_SETTINGS } from './constants';
import { fetchRecentPosts } from './services/wordpress';
import { 
  generateSocialCaption, 
  generateHashtags, 
  predictPerformance, 
  generateAudioBrief, 
  generateVideoTeaser,
  generatePostImage,
  generateVisualHeadline,
  HashtagSet
} from './services/gemini';
import { initiateSocialConnection, getStoredConnections, clearConnection, finalizeSocialConnection } from './services/socialAuth';
import { publishToPlatform, DeploymentEvent, fetchMetricsForPost } from './services/socialMedia';
import { 
  Globe, 
  Sparkles, 
  Share2, 
  Music, 
  Video, 
  CheckCircle2, 
  AlertCircle,
  RefreshCw,
  Eye,
  Search,
  Loader2,
  ExternalLink,
  Upload,
  Share,
  Zap,
  Copy,
  Check,
  History,
  Volume2,
  TrendingUp,
  Calendar,
  Lock,
  LogOut,
  Mail,
  ShieldCheck,
  CreditCard,
  Key,
  Terminal,
  Activity,
  Palette,
  BrainCircuit,
  Settings2,
  Cpu,
  Trash2,
  Image as ImageIcon,
  ThumbsUp,
  MessageSquare,
  BarChart3
} from 'lucide-react';

const App: React.FC = () => {
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
    };
  });
  const [posts, setPosts] = useState<WPPost[]>([]);
  const [selectedPost, setSelectedPost] = useState<WPPost | null>(null);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [captions, setCaptions] = useState<ContentVariations | null>(null);
  const [hashtags, setHashtags] = useState<HashtagSet | null>(null);
  const [score, setScore] = useState<PerformanceScore | null>(null);
  const [logs, setLogs] = useState<PublishLog[]>([]);
  const [exportedImageUrl, setExportedImageUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [deploymentEvents, setDeploymentEvents] = useState<DeploymentEvent[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  const [globalPulse, setGlobalPulse] = useState<{ id: string, msg: string, platform: Platform }[]>([]);
  const [syncingLogId, setSyncingLogId] = useState<string | null>(null);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const terminalEndRef = useRef<HTMLDivElement>(null);

  // --- THEME ENGINE ---
  useEffect(() => {
    const root = document.documentElement;
    const primary = settings.branding.primaryColor;
    root.style.setProperty('--brand-primary', primary);
    root.style.setProperty('--brand-primary-rgb', hexToRgb(primary));
  }, [settings.branding.primaryColor]);

  const hexToRgb = (hex: string) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `${r}, ${g}, ${b}`;
  };

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
            }));
            setShareFeedback('Account Linked Successfully!');
            setActiveTab('settings');
          }
        })
        .catch(err => {
          console.error("OAuth Connection Error:", err);
          setErrorFeedback(err.message || "OAuth Handshake Failed");
          setActiveTab('settings');
        })
        .finally(() => {
          setGenerating(null);
          window.history.replaceState({}, document.title, window.location.pathname);
          setTimeout(() => {
            setShareFeedback(null);
            setErrorFeedback(null);
          }, 5000);
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
    terminalEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [deploymentEvents]);

  useEffect(() => {
    const platforms = [Platform.FACEBOOK, Platform.INSTAGRAM, Platform.X, Platform.LINKEDIN];
    const newsrooms = ["CNN_Central", "BBC_World", "TechCrunch_Live", "Reuters_API", "Bloomberg_Node"];
    
    const interval = setInterval(() => {
      const room = newsrooms[Math.floor(Math.random() * newsrooms.length)];
      const plat = platforms[Math.floor(Math.random() * platforms.length)];
      const newEvent = {
        id: Math.random().toString(36).substr(2, 9),
        msg: `${room} just broadcasted a story to ${plat}`,
        platform: plat
      };
      setGlobalPulse(prev => [newEvent, ...prev.slice(0, 4)]);
    }, 12000);

    return () => clearInterval(interval);
  }, []);

  const stats: SystemStats = {
    todayPosts: logs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).length,
    totalPosts: logs.length,
    activePlatforms: [settings.fbConnection, settings.igConnection, settings.xConnection, settings.liConnection].filter(c => c.isConnected).length,
    tokensUsed: 42050 + (logs.length * 1500),
    estimatedSavings: 1250 + (logs.length * 45),
    totalEngagement: 85400 + logs.reduce((acc, log) => acc + (log.metrics?.reach || 0), 0)
  };

  // --- HANDLERS ---
  const loadPosts = async () => {
    setLoading(true);
    try {
      const fetched = await fetchRecentPosts(settings.wordpressUrl, 10, searchQuery);
      setPosts(fetched);
    } catch (e) {
      console.error("WP Load Failed", e);
    } finally {
      setLoading(false);
    }
  };

  const handlePostSelection = (post: WPPost) => {
    setSelectedPost(post);
    setCaptions(null);
    setHashtags(null);
    setScore(null);
    setExportedImageUrl(null);
    if (window.innerWidth < 1024) {
      window.scrollTo({ top: 400, behavior: 'smooth' });
    }
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const validTypes = ['image/png', 'image/jpeg', 'image/svg+xml', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        alert("Unsupported file format. Please use PNG, JPG, SVG, or WEBP.");
        return;
      }
      
      const reader = new FileReader();
      reader.onload = (event) => {
        setSettings(prev => ({ ...prev, logoUrl: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setSettings(prev => ({ ...prev, logoUrl: '' }));
    if (logoInputRef.current) logoInputRef.current.value = '';
  };

  const getSettingsKey = (platform: Platform): keyof AppSettings => {
    switch(platform) {
      case Platform.FACEBOOK: return 'fbConnection';
      case Platform.INSTAGRAM: return 'igConnection';
      case Platform.X: return 'xConnection';
      case Platform.LINKEDIN: return 'liConnection';
      default: throw new Error('Invalid platform');
    }
  };

  const handleManualConnectionUpdate = (platform: Platform, connection: AccountConnection) => {
    setSettings(prev => ({
      ...prev,
      [getSettingsKey(platform)]: connection
    }));
  };

  const handleDisconnectAccount = (platform: Platform) => {
    clearConnection(platform);
    setSettings(prev => ({
      ...prev,
      [getSettingsKey(platform)]: { isConnected: false }
    }));
  };

  const handleGenerateAI = async () => {
    if (!selectedPost) return;
    setGenerating('AI Signal Syncing...');
    try {
      const brandName = settings.brandWebsite || 'WORLD NEWS';
      const [newCaptions, newHashtags, visualData] = await Promise.all([
        generateSocialCaption(selectedPost.title, selectedPost.excerpt || '', selectedPost.link, settings.aiConfig),
        generateHashtags(selectedPost.title, selectedPost.excerpt || '', brandName),
        generateVisualHeadline(selectedPost.title, selectedPost.excerpt || '')
      ]);

      setSelectedPost({
        ...selectedPost,
        visualHeadline: visualData.headline,
        highlightWords: visualData.highlights
      });

      const brandClean = brandName.replace(/[^a-zA-Z0-9]/g, '');
      const hashtagString = [
        `#${brandClean}`,
        ...newHashtags.niche.slice(0, 3).map(h => `#${h.replace(/\s+/g, '')}`)
      ].join(' ');

      const enriched: ContentVariations = {
        [Platform.FACEBOOK]: `${newCaptions[Platform.FACEBOOK]}\n\n${hashtagString}`,
        [Platform.INSTAGRAM]: `${newCaptions[Platform.INSTAGRAM]}\n\n${hashtagString}`,
        [Platform.X]: `${newCaptions[Platform.X]}\n\n${hashtagString}`,
        [Platform.LINKEDIN]: `${newCaptions[Platform.LINKEDIN]}\n\n${hashtagString}`,
      };

      setCaptions(enriched);
      setHashtags(newHashtags);
    } catch (e) {
      console.error('AI Processing Error:', e);
    } finally {
      setGenerating(null);
    }
  };

  const handleNativeShare = async () => {
    if (!selectedPost || !captions) {
      setShareFeedback("Generate content first!");
      setTimeout(() => setShareFeedback(null), 3000);
      return;
    }
    
    const shareText = captions[Platform.X];
    const shareUrl = selectedPost.link;

    try {
      let filesToShare: File[] = [];
      if (exportedImageUrl) {
        const response = await fetch(exportedImageUrl);
        const blob = await response.blob();
        const file = new File([blob], 'news-broadcast.png', { type: 'image/png' });
        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          filesToShare = [file];
        }
      }

      if (navigator.share) {
        await navigator.share({
          title: selectedPost.title,
          text: shareText,
          url: shareUrl,
          files: filesToShare.length > 0 ? filesToShare : undefined
        });
        setShareFeedback("Shared!");
      } else {
        throw new Error('Web Share API not available');
      }
    } catch (error) {
      // Fallback to clipboard
      await navigator.clipboard.writeText(`${shareText}\n\n${shareUrl}`);
      setIsCopied(true);
      setShareFeedback("Copied to clipboard");
      setTimeout(() => {
        setIsCopied(false);
        setShareFeedback(null);
      }, 3000);
    }
  };

  const handleBroadcast = async () => {
    if (!selectedPost || !captions) return;
    
    const activeCons = [Platform.FACEBOOK, Platform.INSTAGRAM, Platform.X, Platform.LINKEDIN].filter(p => settings[getSettingsKey(p)].isConnected);
    
    if (activeCons.length === 0) {
      alert("No social accounts connected. Link your accounts in Settings first.");
      setActiveTab('settings');
      return;
    }

    setIsDeploying(true);
    setDeploymentEvents([{ timestamp: new Date().toLocaleTimeString(), message: "Deploying Enterprise News Hub Cluster...", type: 'info' }]);

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
      const connection = settings[getSettingsKey(platform)];
      const success = await publishToPlatform(
        platform, 
        newLog.imageUrl, 
        captions[platform], 
        connection.accessToken,
        connection.clientId,
        connection.clientSecret,
        (event) => setDeploymentEvents(prev => [...prev, { ...event, message: `[${platform}] ${event.message}` }])
      );
      newLog.platforms[platform] = success ? 'success' : 'failed';
    }

    setLogs([newLog, ...logs]);
    setShareFeedback("Broadcast Complete!");
    setTimeout(() => {
      setIsDeploying(false);
      setShareFeedback(null);
    }, 4000);
  };

  const handleSyncMetrics = async (logId: string) => {
    setSyncingLogId(logId);
    try {
      const metrics = await fetchMetricsForPost(logId);
      setLogs(prev => prev.map(log => 
        log.id === logId ? { ...log, metrics } : log
      ));
    } catch (error) {
      console.error("Metrics sync failed", error);
    } finally {
      setSyncingLogId(null);
    }
  };

  if (!user) return <Login onLogin={setUser} />;

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      <style>{`
        :root {
          --brand-primary: ${settings.branding.primaryColor};
        }
        .bg-brand { background-color: var(--brand-primary); }
        .text-brand { color: var(--brand-primary); }
        .border-brand { border-color: var(--brand-primary); }
        .ring-brand { --tw-ring-color: var(--brand-primary); }
        .shadow-brand { box-shadow: 0 10px 15px -3px rgba(var(--brand-primary-rgb), 0.3); }
      `}</style>

      {/* Global Toast for Errors/Success */}
      {(shareFeedback || errorFeedback) && (
        <div className={`fixed bottom-10 right-10 z-[110] px-6 py-4 rounded-2xl shadow-2xl flex items-center gap-3 animate-in fade-in slide-in-from-right-4 duration-300 ${errorFeedback ? 'bg-red-600 text-white' : 'bg-emerald-600 text-white'}`}>
           {errorFeedback ? <AlertCircle size={20} /> : <CheckCircle2 size={20} />}
           <span className="text-xs font-black uppercase tracking-widest">{errorFeedback || shareFeedback}</span>
        </div>
      )}

      {/* Deployment Modal Terminal */}
      {isDeploying && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 lg:p-12 animate-in fade-in zoom-in duration-300">
          <div className="absolute inset-0 bg-slate-950/80 backdrop-blur-xl"></div>
          <div className="bg-slate-900 w-full max-w-4xl h-[600px] rounded-[2.5rem] border border-slate-800 shadow-2xl flex flex-col overflow-hidden relative">
             <div className="p-6 border-b border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="flex gap-1.5">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <div className="w-3 h-3 rounded-full bg-amber-500"></div>
                    <div className="w-3 h-3 rounded-full bg-emerald-500"></div>
                  </div>
                  <h2 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 ml-4">
                    <Terminal size={14} className="text-brand" /> API Broadcast Terminal
                  </h2>
                </div>
                <Activity size={16} className="text-brand animate-pulse" />
             </div>
             <div className="flex-1 overflow-y-auto p-8 font-mono text-[11px] space-y-2 custom-scrollbar text-slate-300">
                {deploymentEvents.map((ev, i) => (
                  <div key={i} className={`flex gap-4 animate-in slide-in-from-left-2 duration-300 ${ev.type === 'error' ? 'text-red-400' : ev.type === 'success' ? 'text-emerald-400' : 'text-slate-300'}`}>
                    <span className="text-slate-600 shrink-0">[{ev.timestamp}]</span>
                    <div className="flex-1">
                      <span className="font-bold">{ev.message}</span>
                      {ev.payload && <div className="mt-1 p-2 bg-slate-950/50 rounded-lg text-slate-500 border border-slate-800 break-all">{ev.payload}</div>}
                    </div>
                  </div>
                ))}
                <div ref={terminalEndRef} />
             </div>
             <div className="p-6 bg-slate-950/50 border-t border-slate-800 flex items-center justify-between">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Signed with NewsFlow Secure Gateway v2.4</p>
                {deploymentEvents.some(e => e.message.includes("LIVE")) && (
                  <button onClick={() => setIsDeploying(false)} className="px-6 py-2 bg-brand text-white rounded-xl text-[10px] font-black uppercase tracking-widest hover:brightness-110 transition-all">Close Console</button>
                )}
             </div>
          </div>
        </div>
      )}

      {activeTab === 'dashboard' && (
        <div className="space-y-6 lg:space-y-10 animate-in fade-in duration-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
            {[
              { label: "Today's Live", value: stats.todayPosts, icon: Share2, color: "text-brand", bg: "bg-brand/10" },
              { label: "Total Reach", value: (stats.totalEngagement / 1000).toFixed(1) + "k", icon: TrendingUp, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Connected Hubs", value: stats.activePlatforms, icon: Globe, color: "text-slate-900", bg: "bg-slate-100" },
              { label: "AI Signal", value: stats.tokensUsed.toLocaleString(), icon: Zap, color: "text-amber-600", bg: "bg-amber-50" }
            ].map((stat, i) => (
              <div key={i} className="bg-white p-5 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 lg:gap-5">
                <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center`}><stat.icon size={18} /></div>
                <div><p className="text-[9px] lg:text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p><p className="text-lg lg:text-xl font-black text-slate-900">{stat.value}</p></div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-10">
            <div className="lg:col-span-4 order-2 lg:order-1">
              <div className="bg-white rounded-[2rem] lg:rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[500px] lg:h-[750px]">
                <div className="p-5 lg:p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/30">
                  <h2 className="font-black text-slate-900 text-xs uppercase tracking-widest flex items-center gap-2"><RefreshCw size={14} className="text-brand" /> Dispatch Feed</h2>
                  <div className="relative">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Filter..." className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-300">
                      <Loader2 className="animate-spin" size={24} />
                      <p className="text-[10px] font-black uppercase widest">Injesting News...</p>
                    </div>
                  ) : posts.map(post => (
                    <button key={post.id} onClick={() => handlePostSelection(post)} className={`w-full text-left p-3 rounded-2xl transition-all border-2 flex gap-4 ${selectedPost?.id === post.id ? 'border-brand bg-brand/5' : 'border-transparent hover:bg-slate-50'}`}>
                      <div className="w-16 h-16 rounded-xl overflow-hidden shrink-0 border border-slate-100 shadow-sm bg-slate-100">
                        <img src={post.aiImageUrl || post.featuredImageUrl} alt="" className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-xs font-bold leading-snug line-clamp-2 text-slate-900">{post.title}</h3>
                        <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase">{new Date(post.date).toLocaleDateString()}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-8 order-1 lg:order-2">
              {!selectedPost ? (
                <div className="bg-white rounded-[3rem] border-4 border-dashed border-slate-200 h-[400px] lg:h-[600px] flex flex-col items-center justify-center p-12 text-center text-slate-300">
                  <Globe size={48} className="mb-6 opacity-30" /><h2 className="text-xl font-black uppercase tracking-tighter">Broadcaster Studio</h2><p className="text-xs font-bold">Select a story to begin production</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-6 lg:gap-8">
                  <div className="space-y-6">
                    <div className="bg-white p-4 rounded-[2.5rem] lg:rounded-[3rem] shadow-2xl border border-slate-100 relative group">
                       <CanvasPreview post={selectedPost} template={settings.selectedTemplate} brandWebsite={settings.brandWebsite} logoUrl={settings.logoUrl} branding={settings.branding} onExport={setExportedImageUrl} />
                       
                       {/* Floating Share Quick Action */}
                       <div className="absolute top-8 right-8 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button 
                            onClick={handleNativeShare} 
                            className="p-3 bg-white/90 backdrop-blur-md rounded-2xl shadow-xl text-slate-900 hover:text-brand transition-all flex items-center gap-2"
                            title="Quick Share"
                          >
                             <Share2 size={20} />
                          </button>
                       </div>
                    </div>

                    <div className="bg-slate-950 rounded-[2rem] p-6 text-white grid grid-cols-3 gap-3 border border-slate-800">
                        {['image', 'audio', 'video'].map(m => (
                          <button key={m} onClick={() => {}} className="flex flex-col items-center gap-2 p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all disabled:opacity-50" disabled={!!generating}>
                             {m === 'image' ? <Eye size={18} /> : m === 'audio' ? <Music size={18} /> : <Video size={18} />}
                             <span className="text-[8px] font-black uppercase tracking-widest">{m} Asset</span>
                          </button>
                        ))}
                    </div>
                  </div>

                  <div className="bg-white rounded-[2rem] lg:rounded-[2.5rem] border border-slate-100 shadow-sm p-6 lg:p-8 space-y-6">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <h2 className="text-lg font-black text-slate-900 uppercase tracking-tighter">AI Content Hub</h2>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Variation Strategy</span>
                        </div>
                        <button onClick={handleGenerateAI} disabled={!!generating} className="px-5 py-2.5 bg-brand text-white rounded-xl font-black text-[10px] uppercase flex items-center gap-2 hover:brightness-110 shadow-brand disabled:opacity-50">
                            {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Optimize
                        </button>
                      </div>

                      {captions ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                           <textarea className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold leading-relaxed min-h-[160px] outline-none focus:border-brand/30 transition-all resize-none" value={captions[Platform.X]} readOnly />
                           
                           {shareFeedback && (
                             <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl text-[10px] font-black uppercase tracking-widest text-center animate-in fade-in slide-in-from-top-2">
                               {shareFeedback}
                             </div>
                           )}

                           <div className="grid grid-cols-2 gap-3">
                             <button onClick={handleNativeShare} className="py-5 bg-slate-100 text-slate-900 rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-3 active:scale-95 transition-all hover:bg-slate-200">
                                <Share2 size={18} /> {isCopied ? 'Copied' : 'Native Share'}
                             </button>
                             <button onClick={handleBroadcast} disabled={!!generating || isDeploying} className="py-5 bg-brand text-white rounded-[1.5rem] font-black text-sm shadow-brand flex items-center justify-center gap-3 active:scale-95 transition-all hover:brightness-110 disabled:opacity-50">
                                <Share size={18} /> {isDeploying ? 'Deploying...' : 'Deploy API'}
                             </button>
                           </div>
                        </div>
                      ) : (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-100 gap-4">
                          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center"><Sparkles size={32} className="opacity-10" /></div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-300 text-center px-4">Awaiting Brand-Voice Dispatch...</p>
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-5xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8 pb-32">
           <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {/* Branding Engine */}
              <div className="bg-white p-8 lg:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-brand/10 text-brand flex items-center justify-center"><Palette size={24} /></div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Brand Theme Engine</h2>
                </div>
                
                <div className="space-y-6">
                  {/* Custom Logo Upload Logic UI */}
                  <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-200 space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex flex-col">
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Global Brand Logo</span>
                        <span className="text-xs font-bold text-slate-900">Custom SVG or PNG</span>
                      </div>
                      {settings.logoUrl && (
                        <button 
                          onClick={handleRemoveLogo}
                          className="p-2 text-slate-400 hover:text-red-600 transition-colors"
                          title="Remove custom logo"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>

                    <div className="flex items-center gap-6">
                      <div className="w-24 h-24 bg-white border-2 border-slate-100 rounded-[1.5rem] shadow-sm flex items-center justify-center overflow-hidden p-3 relative group">
                        {settings.logoUrl ? (
                          <img src={settings.logoUrl} className="max-w-full max-h-full object-contain" alt="Custom Brand Logo" />
                        ) : (
                          <ImageIcon size={32} className="text-slate-200" />
                        )}
                        <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                           <button onClick={() => logoInputRef.current?.click()} className="p-2 bg-white rounded-full text-slate-900 shadow-xl">
                              <Upload size={16} />
                           </button>
                        </div>
                      </div>
                      <div className="flex-1 space-y-2">
                        <p className="text-[10px] font-medium text-slate-500 leading-relaxed">
                          Recommended: Transparent SVG or PNG (Minimum 500px width). This logo will be integrated across all broadcast graphics.
                        </p>
                        <button 
                          onClick={() => logoInputRef.current?.click()}
                          className="px-4 py-2 bg-white border border-slate-200 rounded-xl text-[10px] font-black uppercase tracking-widest hover:border-brand hover:text-brand transition-all flex items-center gap-2"
                        >
                          <Upload size={14} /> {settings.logoUrl ? 'Update Logo' : 'Choose File'}
                        </button>
                        <input 
                          type="file" 
                          ref={logoInputRef} 
                          className="hidden" 
                          accept="image/png, image/jpeg, image/svg+xml, image/webp" 
                          onChange={handleLogoUpload} 
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Brand Color</span>
                      <span className="text-xs font-bold text-slate-900">App and Asset Accents</span>
                    </div>
                    <input 
                      type="color" 
                      className="w-14 h-10 bg-transparent cursor-pointer rounded-lg overflow-hidden border-none"
                      value={settings.branding.primaryColor}
                      onChange={(e) => setSettings({ ...settings, branding: { ...settings.branding, primaryColor: e.target.value }})}
                    />
                  </div>

                  <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Power Highlight Color</span>
                      <span className="text-xs font-bold text-slate-900">Graphic Power-Words</span>
                    </div>
                    <input 
                      type="color" 
                      className="w-14 h-10 bg-transparent cursor-pointer rounded-lg overflow-hidden border-none"
                      value={settings.branding.accentColor}
                      onChange={(e) => setSettings({ ...settings, branding: { ...settings.branding, accentColor: e.target.value }})}
                    />
                  </div>

                  <div className="flex items-center justify-between px-2">
                    <span className="text-xs font-bold text-slate-700">Apply Custom Branding to Content</span>
                    <button 
                      onClick={() => setSettings({...settings, branding: {...settings.branding, useCustomColors: !settings.branding.useCustomColors}})}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.branding.useCustomColors ? 'bg-brand' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.branding.useCustomColors ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                  </div>
                </div>
              </div>

              {/* AI Logic Studio */}
              <div className="bg-white p-8 lg:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center"><BrainCircuit size={24} /></div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">AI Logic Studio</h2>
                </div>

                <div className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Brand Voice Persona</label>
                    <textarea 
                      className="w-full px-5 py-3 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-xs outline-none focus:border-brand h-24 resize-none"
                      placeholder="e.g. Authoritative, Professional Newsroom..."
                      value={settings.aiConfig.brandVoice}
                      onChange={(e) => setSettings({...settings, aiConfig: {...settings.aiConfig, brandVoice: e.target.value}})}
                    />
                  </div>

                  <div className="space-y-2">
                    <div className="flex justify-between items-center px-1">
                       <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Creativity (Temp)</label>
                       <span className="text-[10px] font-black text-slate-900">{settings.aiConfig.creativity}</span>
                    </div>
                    <input 
                      type="range" min="0" max="1" step="0.1" 
                      className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-brand"
                      value={settings.aiConfig.creativity}
                      onChange={(e) => setSettings({...settings, aiConfig: {...settings.aiConfig, creativity: parseFloat(e.target.value)}})}
                    />
                  </div>

                  <div className="flex items-center justify-between px-1">
                    <span className="text-xs font-bold text-slate-700">Use Search Grounding (Live Facts)</span>
                    <button 
                      onClick={() => setSettings({...settings, aiConfig: {...settings.aiConfig, useGrounding: !settings.aiConfig.useGrounding}})}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.aiConfig.useGrounding ? 'bg-emerald-500' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.aiConfig.useGrounding ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                  </div>
                </div>
              </div>

              {/* Automation Node */}
              <div className="bg-white p-8 lg:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center"><Cpu size={24} /></div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Automation Node</h2>
                </div>

                <div className="space-y-6">
                   <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-200">
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Daily Dispatch Limit</span>
                      <span className="text-xs font-bold text-slate-900">Ingestion throttle</span>
                    </div>
                    <input 
                      type="number" 
                      className="w-20 px-4 py-2 bg-white border border-slate-200 rounded-xl text-xs font-black outline-none focus:border-brand"
                      value={settings.dailyLimit}
                      onChange={(e) => setSettings({...settings, dailyLimit: parseInt(e.target.value)})}
                    />
                  </div>

                  <div className="flex items-center justify-between px-1">
                    <div className="flex flex-col">
                       <span className="text-xs font-bold text-slate-700">Autonomous Broadcast Mode</span>
                       <span className="text-[9px] font-bold text-slate-400 uppercase">System will auto-post trending news</span>
                    </div>
                    <button 
                      onClick={() => setSettings({...settings, autoPublish: !settings.autoPublish})}
                      className={`w-12 h-6 rounded-full transition-colors relative ${settings.autoPublish ? 'bg-brand' : 'bg-slate-200'}`}
                    >
                      <div className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform ${settings.autoPublish ? 'translate-x-6' : 'translate-x-0'}`}></div>
                    </button>
                  </div>
                </div>
              </div>

              {/* API Integration Gateway */}
              <div className="bg-white p-8 lg:p-10 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-8">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-2xl bg-slate-50 text-slate-600 flex items-center justify-center"><Settings2 size={24} /></div>
                  <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Gateway Config</h2>
                </div>

                <div className="space-y-4">
                   <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WordPress Cluster Endpoint</label>
                     <input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-brand" value={settings.wordpressUrl} onChange={(e) => setSettings({ ...settings, wordpressUrl: e.target.value })} />
                   </div>
                   <div className="space-y-1.5">
                     <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Brand Dispatch ID</label>
                     <input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-brand" value={settings.brandWebsite} onChange={(e) => setSettings({ ...settings, brandWebsite: e.target.value })} />
                   </div>
                </div>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {[Platform.FACEBOOK, Platform.INSTAGRAM, Platform.X, Platform.LINKEDIN].map(p => (
                <ConnectionCard 
                  key={p} 
                  platform={p} 
                  connection={settings[getSettingsKey(p)]} 
                  onConnect={() => initiateSocialConnection(p)} 
                  onDisconnect={() => handleDisconnectAccount(p)} 
                  onManualConnect={(conn) => handleManualConnectionUpdate(p, conn)}
                />
              ))}
           </div>
        </div>
      )}

      {activeTab === 'account' && (
        <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in duration-500">
           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 shadow-sm relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-slate-50 rounded-full -mr-32 -mt-32 blur-3xl"></div>
              <div className="flex flex-col md:flex-row items-center gap-10 relative">
                <img src={user.avatar} className="w-32 h-32 rounded-[2.5rem] border-4 border-white shadow-2xl" alt="" />
                <div className="flex-1 text-center md:text-left">
                  <h2 className="text-3xl font-black text-slate-900 tracking-tight">{user.name}</h2>
                  <p className="text-slate-500 font-bold mb-4">{user.email}</p>
                  <div className="flex flex-wrap justify-center md:justify-start gap-3">
                    <span className="px-4 py-1.5 bg-brand text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-brand">{user.plan} Account</span>
                    <span className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest">Active Node</span>
                  </div>
                </div>
                <button onClick={() => window.location.reload()} className="p-4 bg-slate-50 text-slate-400 hover:text-brand rounded-2xl transition-all border border-slate-100">
                  <LogOut size={24} />
                </button>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="space-y-6 lg:space-y-10 animate-in fade-in slide-in-from-bottom-8">
          <div className="flex items-center justify-between px-4">
            <div className="flex flex-col">
              <h2 className="text-2xl font-black text-slate-900 uppercase tracking-tighter">Broadcast History</h2>
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Compliance and Performance Audit</span>
            </div>
            <div className="flex items-center gap-3">
              <div className="px-4 py-2 bg-white rounded-xl border border-slate-100 shadow-sm flex items-center gap-2">
                 <BarChart3 size={16} className="text-brand" />
                 <span className="text-xs font-black text-slate-900 uppercase tracking-tight">Real-time Metrics Active</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-[2rem] lg:rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
            <div className="overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[1000px]">
                <thead className="bg-slate-50/50 border-b border-slate-100">
                  <tr>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Story & Nodes</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Engagement</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Est. Reach</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest text-center">Status</th>
                    <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="px-8 py-32 text-center text-slate-300">
                        <History size={64} className="opacity-10 mx-auto mb-6" />
                        <p className="text-sm font-black uppercase tracking-widest">No Broadcast Data Captured</p>
                        <button onClick={() => setActiveTab('dashboard')} className="mt-4 text-brand font-bold text-xs hover:underline uppercase tracking-tight">Go to Studio</button>
                      </td>
                    </tr>
                  ) : logs.map(log => (
                    <tr key={log.id} className="hover:bg-slate-50/30 transition-all group">
                      <td className="px-8 py-6">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-xl overflow-hidden border border-slate-100 shrink-0 shadow-sm">
                            <img src={log.imageUrl} className="w-full h-full object-cover" alt="" />
                          </div>
                          <div className="min-w-0">
                            <p className="text-xs font-black text-slate-900 truncate max-w-[240px] mb-1">{log.postTitle}</p>
                            <div className="flex items-center gap-3">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-tighter">{new Date(log.timestamp).toLocaleString()}</span>
                              <div className="flex -space-x-1.5">
                                {Object.keys(log.platforms).map(p => (
                                  <div key={p} className="w-4 h-4 rounded-full bg-slate-100 border border-white flex items-center justify-center ring-2 ring-white">
                                    <div className={`w-1.5 h-1.5 rounded-full ${log.platforms[p as Platform] === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`}></div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6">
                        <div className="flex items-center justify-center gap-8">
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <ThumbsUp size={12} className="text-indigo-500" />
                              <span className="text-xs font-black">{log.metrics?.likes?.toLocaleString() || 0}</span>
                            </div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Likes</span>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <MessageSquare size={12} className="text-emerald-500" />
                              <span className="text-xs font-black">{log.metrics?.comments?.toLocaleString() || 0}</span>
                            </div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Replies</span>
                          </div>
                          <div className="flex flex-col items-center gap-1">
                            <div className="flex items-center gap-1.5 text-slate-600">
                              <Share2 size={12} className="text-brand" />
                              <span className="text-xs font-black">{log.metrics?.shares?.toLocaleString() || 0}</span>
                            </div>
                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest">Shares</span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="inline-flex flex-col items-center gap-1.5">
                          <span className="text-sm font-black text-slate-900">{(log.metrics?.reach || 0).toLocaleString()}</span>
                          <div className="w-16 h-1 bg-slate-100 rounded-full overflow-hidden">
                            <div className="h-full bg-brand rounded-full" style={{ width: `${Math.min(100, ((log.metrics?.reach || 0) / 10000) * 100)}%` }}></div>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-6 text-center">
                        <div className="inline-flex items-center px-3 py-1 bg-emerald-50 text-emerald-600 rounded-lg border border-emerald-100 text-[9px] font-black uppercase tracking-widest">
                          Active
                        </div>
                      </td>
                      <td className="px-8 py-6 text-right">
                        <div className="flex items-center justify-end gap-2">
                           <button 
                             onClick={() => handleSyncMetrics(log.id)}
                             disabled={syncingLogId === log.id}
                             className="p-2.5 text-slate-400 hover:text-brand bg-slate-50 hover:bg-brand/5 rounded-xl transition-all disabled:opacity-50"
                             title="Sync Metrics"
                           >
                             {syncingLogId === log.id ? <Loader2 size={14} className="animate-spin" /> : <RefreshCw size={14} />}
                           </button>
                           <button className="p-2.5 text-slate-400 hover:text-slate-900 bg-slate-50 hover:bg-slate-100 rounded-xl transition-all">
                             <ExternalLink size={14} />
                           </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
             <div className="bg-slate-950 p-6 rounded-[2rem] border border-slate-800 flex items-center justify-between">
                <div>
                   <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-1">Network Integrity</p>
                   <p className="text-xl font-black text-white">99.98%</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                   <ShieldCheck size={20} />
                </div>
             </div>
             <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Average Response</p>
                   <p className="text-xl font-black text-slate-900">42ms</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-brand/10 text-brand flex items-center justify-center">
                   <Zap size={20} />
                </div>
             </div>
             <div className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center justify-between">
                <div>
                   <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Data Throughput</p>
                   <p className="text-xl font-black text-slate-900">1.2 GB/d</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center">
                   <BarChart3 size={20} />
                </div>
             </div>
          </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
