
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
  ImageIcon,
  ThumbsUp,
  MessageSquare,
  BarChart3,
  Scale,
  FileText,
  ShieldAlert,
  // Added Info and ArrowRight icons to fix missing import errors
  Info,
  ArrowRight
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
  const [score, setScore] = useState<PerformanceScore | null>(null);
  const [logs, setLogs] = useState<PublishLog[]>([]);
  const [exportedImageUrl, setExportedImageUrl] = useState<string | null>(null);
  const [isCopied, setIsCopied] = useState(false);
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  const [errorFeedback, setErrorFeedback] = useState<string | null>(null);
  const [deploymentEvents, setDeploymentEvents] = useState<DeploymentEvent[]>([]);
  const [isDeploying, setIsDeploying] = useState(false);
  
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
    setExportedImageUrl(null);
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
    setGenerating('AI Signal Syncing...');
    try {
      const brandName = settings.brandWebsite || 'WORLD NEWS';
      const [newCaptions, visualData] = await Promise.all([
        generateSocialCaption(selectedPost.title, selectedPost.excerpt || '', selectedPost.link, settings.aiConfig),
        generateVisualHeadline(selectedPost.title, selectedPost.excerpt || '')
      ]);

      setSelectedPost({ ...selectedPost, visualHeadline: visualData.headline, highlightWords: visualData.highlights });
      setCaptions(newCaptions);
    } finally {
      setGenerating(null);
    }
  };

  const handleBroadcast = async () => {
    if (!selectedPost || !captions) return;
    const platforms = [Platform.FACEBOOK, Platform.INSTAGRAM, Platform.X, Platform.LINKEDIN, Platform.YOUTUBE, Platform.TIKTOK];
    // Cast settings index to AccountConnection to access isConnected property
    const activeCons = platforms.filter(p => (settings[getSettingsKey(p)] as AccountConnection).isConnected);
    
    if (activeCons.length === 0) {
      alert("No hubs active. Enable connections in Settings.");
      setActiveTab('settings');
      return;
    }

    setIsDeploying(true);
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
      // Cast settings index to AccountConnection for compatibility with publishToPlatform function
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
          <div className="bg-slate-900 w-full max-w-4xl h-[600px] rounded-[3rem] border border-slate-800 flex flex-col overflow-hidden">
             <div className="p-8 border-b border-slate-800 flex items-center justify-between">
                <h2 className="text-xs font-black text-slate-400 uppercase tracking-[0.3em]">Broadcast Node Terminal</h2>
                <Activity size={16} className="text-emerald-500 animate-pulse" />
             </div>
             <div className="flex-1 overflow-y-auto p-10 font-mono text-[10px] space-y-3 custom-scrollbar text-slate-400">
                {deploymentEvents.map((ev, i) => (
                  <div key={i} className={`flex gap-4 ${ev.type === 'error' ? 'text-red-400' : ev.type === 'success' ? 'text-emerald-400' : ''}`}>
                    <span className="opacity-40">[{ev.timestamp}]</span>
                    <span>{ev.message}</span>
                  </div>
                ))}
             </div>
             <div className="p-8 bg-black/40 border-t border-slate-800 text-right">
                <button onClick={() => setIsDeploying(false)} className="px-8 py-3 bg-brand text-white rounded-2xl text-[10px] font-black uppercase tracking-widest">Close Node</button>
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
              <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5">
                <div className={`w-12 h-12 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center`}><stat.icon size={20} /></div>
                <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p><p className="text-xl font-black text-slate-900">{stat.value}</p></div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            <div className="lg:col-span-4 h-[700px]">
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-full">
                <div className="p-6 border-b border-slate-50 flex items-center justify-between">
                  <h2 className="font-black text-slate-900 text-xs uppercase tracking-widest">Press Feed</h2>
                  <input type="text" placeholder="Search..." className="pl-4 pr-3 py-2 bg-slate-50 border border-slate-100 rounded-xl text-[10px] outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 opacity-20">
                      <Loader2 className="animate-spin" size={32} />
                      <p className="text-[10px] font-black uppercase">Injesting News...</p>
                    </div>
                  ) : posts.map(post => (
                    <button key={post.id} onClick={() => handlePostSelection(post)} className={`w-full text-left p-3 rounded-[1.5rem] transition-all border-2 flex gap-4 ${selectedPost?.id === post.id ? 'border-brand bg-brand/5' : 'border-transparent hover:bg-slate-50'}`}>
                      <div className="w-16 h-16 rounded-2xl overflow-hidden shrink-0 bg-slate-100">
                        <img src={post.aiImageUrl || post.featuredImageUrl} className="w-full h-full object-cover" />
                      </div>
                      <div className="flex-1 min-w-0 py-1">
                        <h3 className="text-[11px] font-bold leading-tight line-clamp-2 text-slate-900">{post.title}</h3>
                        <p className="text-[9px] text-slate-400 font-bold mt-1 uppercase tracking-tighter">{new Date(post.date).toLocaleDateString()}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="lg:col-span-8">
              {!selectedPost ? (
                <div className="bg-white rounded-[3rem] border-4 border-dashed border-slate-200 h-[700px] flex flex-col items-center justify-center p-12 text-center text-slate-300">
                  <Globe size={64} className="mb-6 opacity-20" /><h2 className="text-2xl font-black uppercase tracking-tighter">Broadcaster Studio</h2><p className="text-xs font-bold">Select a story to initiate global dispatch</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-10">
                  <div className="space-y-6">
                    <div className="bg-white p-5 rounded-[3rem] shadow-2xl border border-slate-100">
                       <CanvasPreview post={selectedPost} template={settings.selectedTemplate} brandWebsite={settings.brandWebsite} logoUrl={settings.logoUrl} branding={settings.branding} onExport={setExportedImageUrl} />
                    </div>
                  </div>

                  <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 space-y-8">
                      <div className="flex items-center justify-between">
                        <div className="flex flex-col">
                          <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">AI Generator</h2>
                          <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Variation Strategy</span>
                        </div>
                        <button onClick={handleGenerateAI} disabled={!!generating} className="px-6 py-3 bg-brand text-white rounded-2xl font-black text-[10px] uppercase flex items-center gap-2 shadow-brand">
                            {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />} Optimize
                        </button>
                      </div>

                      {captions ? (
                        <div className="space-y-6">
                           <textarea className="w-full p-6 bg-slate-50 border border-slate-100 rounded-[2rem] text-xs font-bold leading-relaxed min-h-[200px] outline-none" value={captions[Platform.X]} readOnly />
                           <div className="grid grid-cols-1 gap-4">
                             <button onClick={handleBroadcast} disabled={!!generating || isDeploying} className="py-6 bg-slate-950 text-white rounded-[2rem] font-black text-xs uppercase tracking-widest shadow-xl flex items-center justify-center gap-3">
                                <Share size={18} /> {isDeploying ? 'Deploying...' : 'Deploy Global Dispatch'}
                             </button>
                           </div>
                        </div>
                      ) : (
                        <div className="py-24 text-center opacity-10 space-y-4">
                          <Sparkles size={48} className="mx-auto" />
                          <p className="text-[10px] font-black uppercase tracking-widest">Awaiting AI Sync...</p>
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
        <div className="max-w-6xl mx-auto space-y-12 animate-in fade-in slide-in-from-bottom-8">
           <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-4 space-y-8">
                 <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                    <h2 className="text-lg font-black uppercase tracking-tighter">Brand Node</h2>
                    <div className="space-y-4">
                       <input type="text" className="w-full p-4 bg-slate-50 rounded-2xl text-xs font-bold outline-none border border-slate-100" placeholder="WP Endpoint" value={settings.wordpressUrl} onChange={e => setSettings({...settings, wordpressUrl: e.target.value})} />
                       <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                          <span className="text-[10px] font-black uppercase">Color Scheme</span>
                          <input type="color" className="w-10 h-10 bg-transparent cursor-pointer rounded-lg border-none" value={settings.branding.primaryColor} onChange={e => setSettings({...settings, branding: {...settings.branding, primaryColor: e.target.value}})} />
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
                        // Cast settings index to AccountConnection to satisfy ConnectionCard prop type
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
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Last Updated: October 2024</p>
              </div>
           </div>
           <div className="prose prose-slate max-w-none space-y-8 text-slate-600 font-medium leading-relaxed">
              <section className="space-y-4">
                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                   <div className="w-1.5 h-6 bg-brand rounded-full"></div> 1. Information We Collect
                 </h2>
                 <p>NewsFlow Pro collects information you provide directly, such as when you link social media accounts via OAuth 2.0. This includes access tokens, page identifiers, and channel metadata required to automate content distribution. We also process public data from your configured WordPress feeds.</p>
              </section>
              <section className="space-y-4">
                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                   <div className="w-1.5 h-6 bg-brand rounded-full"></div> 2. Use of Third-Party APIs
                 </h2>
                 <p>Our platform interacts with Meta (Facebook/Instagram), Google (YouTube), TikTok, and LinkedIn APIs. Your data is used exclusively to facilitate content broadcasting at your request. We do not sell or share your access tokens with third-party advertisers.</p>
              </section>
              <section className="space-y-4">
                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                   <div className="w-1.5 h-6 bg-brand rounded-full"></div> 3. AI Data Processing
                 </h2>
                 <p>We utilize the Google Gemini API for content generation. While prompts (news excerpts) are sent to Gemini for processing, your private OAuth credentials are never shared with AI models. Data processing is ephemeral and aimed solely at optimizing your social reach.</p>
              </section>
              <section className="space-y-4 bg-slate-50 p-8 rounded-[2rem] border border-slate-100">
                 <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">GDPR & CCPA Compliance</p>
                 <p>Users have the right to request access, correction, or deletion of their personal information. To exercise these rights, please visit our Data Deletion page or contact support@newsflow.live.</p>
              </section>
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
              <section className="space-y-4">
                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                   <div className="w-1.5 h-6 bg-brand rounded-full"></div> 1. Acceptance of Terms
                 </h2>
                 <p>By accessing NewsFlow Pro, you agree to comply with these terms and all applicable laws regarding social media automation and AI usage.</p>
              </section>
              <section className="space-y-4">
                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                   <div className="w-1.5 h-6 bg-brand rounded-full"></div> 2. Responsible AI Usage
                 </h2>
                 <p>You are solely responsible for all content generated using our AI tools. Content must not violate third-party intellectual property, privacy rights, or platform guidelines regarding misinformation or hate speech.</p>
              </section>
              <section className="space-y-4">
                 <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                   <div className="w-1.5 h-6 bg-brand rounded-full"></div> 3. Subscription & Billing
                 </h2>
                 <p>Services are billed according to your selected plan (Basic, Pro, or Enterprise). Failure to maintain valid payment methods may result in immediate suspension of broadcast nodes.</p>
              </section>
              <div className="flex items-center gap-3 p-6 bg-blue-50 text-blue-700 rounded-2xl border border-blue-100 text-xs font-bold leading-snug">
                 <Info size={18} className="shrink-0" />
                 <span>Usage limits (daily posts and API tokens) are strictly enforced to ensure platform stability for all enterprise nodes.</span>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'data-deletion' && (
        <div className="max-w-4xl mx-auto animate-in fade-in slide-in-from-bottom-8">
           <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-slate-100 mb-8">
              <div className="flex items-center gap-6 mb-12">
                 <div className="w-16 h-16 bg-red-50 text-red-600 rounded-3xl flex items-center justify-center shadow-inner"><Trash2 size={32} /></div>
                 <div>
                   <h1 className="text-3xl font-black text-slate-900 tracking-tight">Data Deletion</h1>
                   <p className="text-xs font-black text-slate-400 uppercase tracking-widest mt-1">Automated Privacy Control</p>
                 </div>
              </div>
              
              <div className="space-y-10">
                 <div className="bg-slate-50 p-8 rounded-[2rem] border border-slate-100 space-y-4">
                    <h3 className="text-sm font-black text-slate-900 uppercase tracking-widest flex items-center gap-2">
                       <ShieldAlert className="text-red-500" size={16} /> Data Portability & Removal
                    </h3>
                    <p className="text-sm text-slate-500 font-medium">In accordance with Meta's Data Deletion Policy and GDPR, we provide tools to fully purge your information from our systems. Deletion is permanent and cannot be undone.</p>
                 </div>

                 <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    <div className="p-8 border-2 border-slate-100 rounded-[2rem] hover:border-brand/20 transition-all space-y-4">
                       <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Step 1: Revoke Access</h4>
                       <p className="text-[11px] text-slate-500 font-bold leading-relaxed">Go to your Integrated Apps settings on Facebook, X, or Google and remove "NewsFlow Pro" as an authorized application. This stops further data ingest.</p>
                       <button onClick={() => setActiveTab('settings')} className="flex items-center gap-2 text-[10px] font-black text-brand uppercase tracking-widest hover:translate-x-1 transition-transform">
                          Go to Integrations <ArrowRight size={14} />
                       </button>
                    </div>
                    <div className="p-8 border-2 border-slate-100 rounded-[2rem] hover:border-red-100 transition-all space-y-4">
                       <h4 className="text-xs font-black uppercase tracking-widest text-slate-900">Step 2: Wipe Local Store</h4>
                       <p className="text-[11px] text-slate-500 font-bold leading-relaxed">Click below to immediately clear all OAuth tokens, settings, and logs stored in your current browser session.</p>
                       <button onClick={() => { localStorage.clear(); window.location.reload(); }} className="px-6 py-3 bg-red-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-lg shadow-red-100 hover:bg-red-700 transition-all">
                          Wipe Session Cache
                       </button>
                    </div>
                 </div>

                 <div className="pt-8 border-t border-slate-100">
                    <h4 className="text-xs font-black uppercase tracking-widest text-slate-900 mb-6 text-center">Contact For Full Server Purge</h4>
                    <div className="max-w-md mx-auto p-8 bg-slate-50 rounded-[2.5rem] border border-slate-100 text-center space-y-4">
                       <Mail className="mx-auto text-slate-400" size={32} />
                       <p className="text-sm font-bold text-slate-900">compliance@newsflow.live</p>
                       <p className="text-[10px] text-slate-500 font-medium">Send a request with your Work Email to trigger a full database wipe of your organization data.</p>
                    </div>
                 </div>
              </div>
           </div>
        </div>
      )}
    </Layout>
  );
};

export default App;
