import React, { useState, useEffect, useCallback, useRef } from 'react';
import Layout from './components/Layout';
import CanvasPreview from './components/CanvasPreview';
import Login from './components/Login';
import ConnectionCard from './components/ConnectionCard';
import { 
  WPPost, 
  Platform, 
  AppSettings, 
  PublishLog, 
  SystemStats, 
  TemplateType,
  User,
  PerformanceScore,
  ContentVariations,
  BrandingConfig,
  EngagementMetrics
} from './types';
import { DEFAULT_SETTINGS, PLACEHOLDER_POST } from './constants';
import { fetchRecentPosts, validateWordPressUrl } from './services/wordpress';
import { 
  generateSocialCaption, 
  generateAudioBrief,
  generateVideoTeaser
} from './services/gemini';
import { publishToPlatform, fetchMetricsForPost } from './services/socialMedia';
import { 
  TrendingUp, 
  Globe, 
  RotateCw,
  Clock,
  Sparkles,
  Layout as LayoutIcon,
  LogOut,
  Send,
  DollarSign,
  Mail,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Search,
  Loader2,
  Info,
  Image as ImageIcon,
  Zap,
  BarChart3,
  Lightbulb,
  CheckCircle2,
  Mic,
  Video as VideoIcon,
  Languages,
  Calendar as CalendarIcon,
  Play,
  Pause,
  ArrowRight,
  ShieldCheck,
  Key,
  ChevronRight,
  Palette,
  Droplet,
  Layers,
  ChevronLeft,
  Link as LinkIcon,
  Heart,
  MessageCircle,
  Share2,
  Eye,
  Activity,
  Upload,
  XCircle,
  FileImage,
  ExternalLink,
  Smartphone,
  Maximize2,
  Type as TypeIcon,
  Check,
  AlertTriangle,
  Volume2
} from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    const saved = localStorage.getItem('newsflow_user');
    return saved ? JSON.parse(saved) : null;
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('newsflow_settings');
    const base = saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
    if (!base.aiConfig.targetLanguage) base.aiConfig.targetLanguage = 'English';
    if (!base.branding) base.branding = DEFAULT_SETTINGS.branding;
    if (!base.brandWebsite) base.brandWebsite = DEFAULT_SETTINGS.brandWebsite;
    return base;
  });
  
  const [logs, setLogs] = useState<PublishLog[]>(() => {
    const saved = localStorage.getItem('newsflow_logs');
    return saved ? JSON.parse(saved) : [];
  });

  const [discoveryFeed, setDiscoveryFeed] = useState<WPPost[]>([]);
  const [currentPost, setCurrentPost] = useState<WPPost | null>(null);
  const [targetLink, setTargetLink] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [variations, setVariations] = useState<ContentVariations | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(Platform.TWITTER);
  const [previewScenario, setPreviewScenario] = useState<'normal' | 'long'>('normal');
  const [previewPlatform, setPreviewPlatform] = useState<'raw' | 'instagram' | 'twitter'>('raw');
  
  const [isPolling, setIsPolling] = useState(false);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRefreshingMetrics, setIsRefreshingMetrics] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [wpStatus, setWpStatus] = useState<{ loading: boolean; success?: boolean; name?: string; error?: string }>({ loading: false });
  
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatedAudioBase64, setGeneratedAudioBase64] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Helper: Decode PCM Base64 to AudioBuffer
  const playPCM = async (base64: string) => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    }
    const ctx = audioContextRef.current;
    
    // Manual Base64 decoding
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    
    const dataInt16 = new Int16Array(bytes.buffer);
    const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
    const channelData = buffer.getChannelData(0);
    for (let i = 0; i < dataInt16.length; i++) {
      channelData[i] = dataInt16[i] / 32768.0;
    }
    
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.connect(ctx.destination);
    source.start();
  };

  const stats: SystemStats = {
    todayPosts: logs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).length,
    totalPosts: logs.length,
    activePlatforms: [settings.fbConnection, settings.igConnection, settings.xConnection, settings.liConnection].filter(c => c?.isConnected).length,
    tokensUsed: logs.length * 250,
    estimatedSavings: logs.length * 25.00,
    totalEngagement: logs.reduce((acc, log) => acc + (log.metrics?.likes || 0) + (log.metrics?.shares || 0), 0)
  };

  useEffect(() => {
    if (currentUser) localStorage.setItem('newsflow_user', JSON.stringify(currentUser));
  }, [currentUser]);

  useEffect(() => {
    localStorage.setItem('newsflow_settings', JSON.stringify(settings));
  }, [settings]);

  useEffect(() => {
    localStorage.setItem('newsflow_logs', JSON.stringify(logs));
  }, [logs]);

  // Video URL cleanup
  useEffect(() => {
    return () => {
      if (generatedVideoUrl) URL.revokeObjectURL(generatedVideoUrl);
    };
  }, [generatedVideoUrl]);

  const fetchDiscovery = useCallback(async (query?: string) => {
    if (isPolling) return;
    setIsPolling(true);
    const posts = await fetchRecentPosts(settings.wordpressUrl, 10, query);
    setDiscoveryFeed(posts);
    if (posts.length > 0 && !currentPost && !query) {
       handleCompose(posts[0]);
    }
    setIsPolling(false);
  }, [settings.wordpressUrl, currentPost, isPolling]);

  const handleWpValidation = async () => {
    setWpStatus({ loading: true });
    const result = await validateWordPressUrl(settings.wordpressUrl);
    setWpStatus({ 
      loading: false, 
      success: result.success, 
      name: result.name, 
      error: result.error 
    });
  };

  const refreshAllMetrics = async () => {
    if (isRefreshingMetrics || logs.length === 0) return;
    setIsRefreshingMetrics(true);
    const updatedLogs = await Promise.all(logs.map(async (log) => {
      if (!log.metrics) {
        const metrics = await fetchMetricsForPost(log.id);
        return { ...log, metrics };
      }
      return log;
    }));
    setLogs(updatedLogs);
    setIsRefreshingMetrics(false);
  };

  useEffect(() => {
    if (currentUser) {
      fetchDiscovery();
      const interval = setInterval(() => {
        refreshAllMetrics();
      }, 30000);
      return () => clearInterval(interval);
    }
  }, [currentUser, fetchDiscovery]);

  const handleCompose = async (post: WPPost) => {
    setCurrentPost(post);
    setTargetLink(post.link);
    setGeneratedImageUrl(null);
    setGeneratedAudioBase64(null);
    setGeneratedVideoUrl(null);
    setIsGeneratingCaption(true);
    const vars = await generateSocialCaption(post.title, post.excerpt || "", post.link, settings.aiConfig);
    setVariations(vars);
    setIsGeneratingCaption(false);
  };

  const regenerateCaptions = async () => {
    if (!currentPost) return;
    setIsGeneratingCaption(true);
    const vars = await generateSocialCaption(currentPost.title, currentPost.excerpt || "", targetLink, settings.aiConfig);
    setVariations(vars);
    setIsGeneratingCaption(false);
  };

  const handleAudioGen = async () => {
    if (!currentPost) return;
    setIsGeneratingAudio(true);
    const base64 = await generateAudioBrief(currentPost.title);
    if (base64) {
      setGeneratedAudioBase64(base64);
      playPCM(base64);
    }
    setIsGeneratingAudio(false);
  };

  const handleVideoGen = async () => {
    if (!currentPost) return;
    const hasKey = await (window as any).aistudio.hasSelectedApiKey();
    if (!hasKey) {
      await (window as any).aistudio.openSelectKey();
    }
    setGeneratedVideoUrl(null);
    setIsGeneratingVideo(true);
    const url = await generateVideoTeaser(currentPost.title, setVideoStatus);
    setGeneratedVideoUrl(url);
    setIsGeneratingVideo(false);
    setVideoStatus('');
  };

  const handlePublish = async () => {
    if (!currentPost || !variations) return;
    setIsPublishing(true);
    const success = await publishToPlatform(selectedPlatform, generatedImageUrl || currentPost.featuredImageUrl, variations[selectedPlatform], 'key');
    if (success) {
      const newLog: PublishLog = {
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString(),
        postTitle: currentPost.title,
        caption: variations[selectedPlatform],
        platforms: { [selectedPlatform]: 'success' },
        imageUrl: generatedImageUrl || currentPost.featuredImageUrl,
        audioUrl: generatedAudioBase64 || undefined,
        videoUrl: generatedVideoUrl || undefined,
        metrics: { likes: 0, shares: 0, comments: 0, reach: 0 }
      };
      setLogs([newLog, ...logs]);
      alert("Asset Published to Production API Successfully!");
    }
    setIsPublishing(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.type !== 'image/png') {
        alert("Please upload a PNG logo.");
        return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings({ ...settings, logoUrl: reader.result as string });
      };
      reader.readAsDataURL(file);
    }
  };

  const updateTemplate = (type: TemplateType) => {
    setSettings({
      ...settings,
      selectedTemplate: type
    });
  };

  if (!currentUser) return <Login onLogin={setCurrentUser} />;

  const renderDashboard = () => (
    <div className="grid grid-cols-12 gap-8 animate-in fade-in duration-700">
      <div className="col-span-12 grid grid-cols-4 gap-6">
        {[
          { label: 'Total Engagement', value: stats.totalEngagement.toLocaleString(), icon: Activity, color: 'text-violet-500', bg: 'bg-violet-50' },
          { label: 'Weekly Reach', value: '184k', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Media Assets', value: logs.length * 3, icon: ImageIcon, color: 'text-indigo-500', bg: 'bg-indigo-50' },
          { label: 'Agency ROI', value: `$${stats.estimatedSavings}`, icon: DollarSign, color: 'text-blue-500', bg: 'bg-blue-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white/80 backdrop-blur-xl p-6 rounded-[2rem] border border-white shadow-xl shadow-slate-200/50 flex items-center gap-5">
            <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="col-span-8 space-y-8">
        <div className="bg-white/90 backdrop-blur-2xl rounded-[3rem] border border-white shadow-2xl shadow-slate-200/60 overflow-hidden relative">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/40">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                <Sparkles size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900">Creative Hub</h2>
                <p className="text-xs font-bold text-slate-400">Contextual Social Composer</p>
              </div>
            </div>
            
            <div className="flex items-center gap-4">
               <button onClick={() => (window as any).aistudio.openSelectKey()} className="p-2 bg-slate-900 text-white rounded-xl shadow-lg hover:bg-slate-800 transition-all">
                  <Key size={18} />
               </button>
            </div>
          </div>

          <div className="p-10 relative">
            {(isGeneratingVideo || isGeneratingAudio) && (
              <div className="absolute inset-0 bg-white/90 backdrop-blur-xl flex flex-col items-center justify-center p-12 text-center gap-6 z-20 rounded-[3rem]">
                <Loader2 className="animate-spin text-indigo-600" size={48} />
                <div className="space-y-2">
                  <h3 className="text-slate-900 font-black text-xl">{isGeneratingVideo ? 'Creating Cinematic Teaser' : 'Synthesizing Voice Brief'}</h3>
                  <p className="text-slate-500 text-sm font-medium animate-pulse">{videoStatus || 'Orchestrating AI modalities...'}</p>
                </div>
              </div>
            )}

            {currentPost ? (
              <div className="grid grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                    {[Platform.TWITTER, Platform.INSTAGRAM, Platform.FACEBOOK, Platform.LINKEDIN].map(p => (
                      <button 
                        key={p}
                        onClick={() => setSelectedPlatform(p)}
                        className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${
                          selectedPlatform === p ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400 hover:text-slate-500'
                        }`}
                      >
                        {p === Platform.TWITTER && <Twitter size={14} />}
                        {p === Platform.INSTAGRAM && <Instagram size={14} />}
                        {p === Platform.FACEBOOK && <Facebook size={14} />}
                        {p === Platform.LINKEDIN && <Linkedin size={14} />}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-3">
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Call-to-Action Link</p>
                    <div className="flex gap-2">
                      <div className="relative flex-1">
                        <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input 
                          type="text"
                          value={targetLink}
                          onChange={(e) => setTargetLink(e.target.value)}
                          className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none text-xs font-medium"
                        />
                      </div>
                      <button 
                        onClick={regenerateCaptions}
                        disabled={isGeneratingCaption}
                        className="px-4 py-3 bg-indigo-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all active:scale-95"
                      >
                        {isGeneratingCaption ? <Loader2 className="animate-spin" size={16} /> : 'Sync'}
                      </button>
                    </div>
                  </div>

                  <div className="relative group">
                    <textarea 
                      value={variations?.[selectedPlatform] || ""}
                      onChange={(e) => setVariations(v => v ? {...v, [selectedPlatform]: e.target.value} : null)}
                      className="w-full h-48 p-7 bg-slate-50/50 border-2 border-slate-100 rounded-[2.5rem] focus:border-indigo-400 focus:bg-white outline-none transition-all font-medium text-slate-700 leading-relaxed resize-none shadow-inner text-sm"
                      placeholder="Generating optimized content..."
                    />
                    {isGeneratingCaption && (
                      <div className="absolute inset-0 bg-white/70 backdrop-blur-md rounded-[2.5rem] flex flex-col items-center justify-center gap-4 text-center p-6">
                        <Loader2 className="animate-spin text-indigo-600" size={40} />
                        <span className="text-xs font-black text-slate-400 tracking-widest uppercase">Contextualizing post...</span>
                      </div>
                    )}
                  </div>

                  <button 
                    onClick={handlePublish}
                    disabled={isPublishing || !variations}
                    className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black flex items-center justify-center gap-3 hover:bg-slate-800 transition-all shadow-2xl shadow-slate-300 group active:scale-95"
                  >
                    {isPublishing ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                    Dispatch Production Post
                    <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
                  </button>
                </div>

                <div className="space-y-6">
                  {generatedVideoUrl ? (
                    <div className="relative aspect-square rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white bg-black group">
                       <video src={generatedVideoUrl} controls autoPlay loop className="w-full h-full object-cover" />
                       <div className="absolute top-4 left-4 px-3 py-1.5 bg-violet-600 text-white rounded-full text-[10px] font-black uppercase">Veo Cinematic</div>
                       <button onClick={() => setGeneratedVideoUrl(null)} className="absolute top-4 right-4 p-2 bg-white/20 hover:bg-white/40 text-white rounded-full backdrop-blur-md opacity-0 group-hover:opacity-100 transition-opacity">
                         <XCircle size={20} />
                       </button>
                    </div>
                  ) : (
                    <CanvasPreview 
                      post={{...currentPost, featuredImageUrl: generatedImageUrl || currentPost.featuredImageUrl}} 
                      template={settings.selectedTemplate}
                      logoUrl={settings.logoUrl}
                      branding={settings.branding}
                      wordpressUrl={settings.wordpressUrl}
                      brandWebsite={settings.brandWebsite}
                    />
                  )}

                  <div className="grid grid-cols-2 gap-4">
                    <button onClick={handleAudioGen} className="p-4 bg-indigo-50 border border-indigo-100 rounded-2xl flex items-center gap-3 hover:bg-indigo-100 transition-all group">
                      <Mic size={18} className="text-indigo-600 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-black text-indigo-900 uppercase tracking-widest">Voice Brief</span>
                    </button>
                    <button onClick={handleVideoGen} className="p-4 bg-violet-50 border border-violet-100 rounded-2xl flex items-center gap-3 hover:bg-violet-100 transition-all group">
                      <VideoIcon size={18} className="text-violet-600 group-hover:scale-110 transition-transform" />
                      <span className="text-xs font-black text-violet-900 uppercase tracking-widest">Video Teaser</span>
                    </button>
                  </div>
                  
                  {generatedAudioBase64 && (
                    <div className="p-4 bg-indigo-600/5 border border-indigo-600/10 rounded-2xl flex items-center justify-between animate-in slide-in-from-top-2">
                       <div className="flex items-center gap-3">
                          <Volume2 size={16} className="text-indigo-600" />
                          <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">Audio Brief Generated</span>
                       </div>
                       <button onClick={() => playPCM(generatedAudioBase64)} className="text-[10px] font-black text-indigo-600 uppercase hover:underline">Replay</button>
                    </div>
                  )}
                </div>
              </div>
            ) : (
              <div className="py-32 flex flex-col items-center text-center space-y-6">
                <div className="w-24 h-24 bg-slate-50 rounded-[3rem] flex items-center justify-center text-slate-200 shadow-inner">
                  <Search size={44} />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-900">Select an Article</h3>
                  <p className="text-slate-500 max-w-xs mt-2 font-medium">Pick a story from the feed to begin your branded campaign.</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="col-span-4 space-y-8">
        <div className="bg-white/90 backdrop-blur-2xl rounded-[3rem] border border-white shadow-2xl p-8 h-[900px] flex flex-col glass-panel">
           <div className="flex flex-col gap-6 mb-8">
              <div className="flex items-center justify-between">
                <h3 className="font-black text-slate-900 text-lg tracking-tight">WordPress Feed</h3>
                <div className="flex items-center gap-2 px-3 py-1.5 bg-slate-50 rounded-full border border-slate-100 text-[10px] font-black text-slate-500">
                  <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse-soft"></div> LIVE
                </div>
              </div>

              <div className="relative group">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 group-focus-within:text-indigo-500 transition-colors" size={16} />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchDiscovery(searchQuery)}
                  placeholder="Search articles..." 
                  className="w-full pl-11 pr-10 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:border-indigo-500 focus:bg-white outline-none transition-all shadow-inner"
                />
              </div>
           </div>

           <div className="space-y-4 overflow-y-auto flex-1 pr-2 custom-scrollbar">
             {discoveryFeed.length === 0 && !isPolling ? (
               <div className="text-center py-20">
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">No articles found</p>
               </div>
             ) : (
               discoveryFeed.map(post => (
                 <button 
                  key={post.id}
                  onClick={() => handleCompose(post)}
                  className={`w-full text-left p-5 rounded-[2.25rem] border-2 transition-all flex gap-5 items-center group relative overflow-hidden ${
                    currentPost?.id === post.id ? 'border-indigo-500 bg-indigo-50/50 shadow-xl shadow-indigo-100' : 'border-slate-50 hover:border-slate-200 hover:bg-slate-50/50'
                  }`}
                 >
                   <div className="w-20 h-20 rounded-2xl overflow-hidden shrink-0 shadow-lg border border-white">
                     <img src={post.featuredImageUrl} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
                   </div>
                   <div className="space-y-1">
                      <p className="text-[10px] font-black text-indigo-600 uppercase tracking-widest line-clamp-1">{post.author}</p>
                      <h4 className="text-sm font-black text-slate-900 leading-snug line-clamp-2 tracking-tight">{post.title}</h4>
                   </div>
                 </button>
               ))
             )}
           </div>
        </div>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
      <div className="flex justify-between items-center mb-10">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight">Audit Logs</h2>
        <button onClick={refreshAllMetrics} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-indigo-100 flex items-center gap-2 hover:bg-indigo-700 transition-all">
          <RotateCw size={16} className={isRefreshingMetrics ? 'animate-spin' : ''} /> Refresh Metrics
        </button>
      </div>
      <div className="grid grid-cols-1 gap-6">
         {logs.length === 0 ? (
            <div className="py-20 text-center bg-white rounded-[3rem] border border-slate-100 shadow-sm">
               <p className="text-slate-400 font-bold uppercase tracking-widest">No Activity Yet</p>
            </div>
         ) : (
            logs.map(log => (
              <div key={log.id} className="bg-white p-8 rounded-[3rem] border border-slate-100 shadow-xl flex items-center gap-10 hover:border-indigo-200 transition-all group">
                  <div className="w-24 h-24 rounded-2xl overflow-hidden shadow-lg border-2 border-slate-50 shrink-0 group-hover:scale-105 transition-transform">
                    <img src={log.imageUrl} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="flex-1 space-y-3">
                    <div className="flex items-center gap-4">
                        <span className="text-[10px] font-black text-indigo-600 uppercase tracking-widest">{new Date(log.timestamp).toLocaleDateString()}</span>
                        <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <h4 className="text-lg font-black text-slate-900 tracking-tight leading-tight">{log.postTitle}</h4>
                    
                    {log.metrics && (
                      <div className="flex items-center gap-6 pt-2">
                        <div className="flex items-center gap-1.5 text-slate-500 font-black text-[11px] uppercase tracking-tighter">
                          <Heart size={14} className="text-rose-500" /> {log.metrics.likes.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 font-black text-[11px] uppercase tracking-tighter">
                          <MessageCircle size={14} className="text-indigo-500" /> {log.metrics.comments.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 font-black text-[11px] uppercase tracking-tighter">
                          <Share2 size={14} className="text-emerald-500" /> {log.metrics.shares.toLocaleString()}
                        </div>
                        <div className="flex items-center gap-1.5 text-slate-500 font-black text-[11px] uppercase tracking-tighter">
                          <Eye size={14} className="text-slate-400" /> {log.metrics.reach.toLocaleString()}
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    {Object.keys(log.platforms).map(p => (
                      <div key={p} className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center text-white shadow-xl shadow-indigo-100">
                        {p === Platform.TWITTER && <Twitter size={18} />}
                        {p === Platform.INSTAGRAM && <Instagram size={18} />}
                        {p === Platform.FACEBOOK && <Facebook size={18} />}
                        {p === Platform.LINKEDIN && <Linkedin size={18} />}
                      </div>
                    ))}
                  </div>
              </div>
            ))
         )}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="grid grid-cols-12 gap-8 animate-in fade-in duration-700">
      <div className="col-span-12">
        <h2 className="text-4xl font-black text-slate-900 tracking-tight mb-8">Studio Configuration</h2>
      </div>
      
      <div className="col-span-7 space-y-8">
        <div className="bg-white p-10 rounded-[3rem] border border-white shadow-2xl space-y-8">
           <div className="flex items-center justify-between">
              <h3 className="font-black text-xl flex items-center gap-3"><Globe className="text-indigo-600" /> WordPress Source</h3>
              {wpStatus.success && <span className="px-3 py-1 bg-emerald-50 text-emerald-600 rounded-full text-[10px] font-black uppercase tracking-widest flex items-center gap-1"><Check size={12} /> Live</span>}
           </div>
           
           <div className="space-y-6">
              <div className="space-y-2">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Site URL (REST API enabled)</p>
                <div className="flex gap-3">
                   <div className="relative flex-1">
                      <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                      <input 
                          type="text" 
                          value={settings.wordpressUrl}
                          onChange={(e) => setSettings({...settings, wordpressUrl: e.target.value})}
                          placeholder="https://techcrunch.com"
                          className={`w-full pl-12 pr-4 py-4 bg-slate-50 border rounded-2xl focus:bg-white outline-none transition-all font-medium text-sm ${wpStatus.error ? 'border-red-200' : 'border-slate-200 focus:border-indigo-500'}`}
                      />
                   </div>
                   <button 
                      onClick={handleWpValidation}
                      disabled={wpStatus.loading}
                      className="px-6 bg-slate-900 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-slate-800 transition-all flex items-center justify-center gap-2"
                   >
                      {wpStatus.loading ? <Loader2 size={16} className="animate-spin" /> : 'Validate'}
                   </button>
                </div>
              </div>
           </div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] border border-white shadow-2xl space-y-8">
           <h3 className="font-black text-xl flex items-center gap-3"><FileImage className="text-indigo-600" /> Brand Assets</h3>
           
           <div className="grid grid-cols-2 gap-6">
              <div className="space-y-4">
                <p className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Logo Upload (PNG)</p>
                <input 
                  type="file" 
                  ref={fileInputRef}
                  onChange={handleLogoUpload}
                  accept="image/png"
                  className="hidden"
                />
                <button 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full aspect-video bg-slate-50 border-2 border-dashed border-slate-200 rounded-[2rem] flex flex-col items-center justify-center gap-3 hover:border-indigo-400 hover:bg-indigo-50/30 transition-all group overflow-hidden relative"
                >
                  {settings.logoUrl && settings.logoUrl.startsWith('data:') ? (
                    <img src={settings.logoUrl} alt="Custom Logo" className="max-w-[80%] max-h-[80%] object-contain" />
                  ) : (
                    <>
                      <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-slate-400 shadow-sm group-hover:scale-110 transition-transform">
                        <Upload size={24} />
                      </div>
                      <span className="text-xs font-black text-slate-400 uppercase tracking-widest">Click to Upload</span>
                    </>
                  )}
                </button>
              </div>

              <div className="space-y-6">
                <div className="space-y-2">
                  <p className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Brand Display Website</p>
                  <div className="relative">
                    <Globe className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        value={settings.brandWebsite}
                        onChange={(e) => setSettings({...settings, brandWebsite: e.target.value.toUpperCase()})}
                        placeholder="NEWSFLOW.LIVE"
                        className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-200 rounded-xl focus:border-indigo-500 outline-none transition-all font-black text-xs uppercase"
                    />
                  </div>
                </div>
              </div>
           </div>
        </div>

        <div className="bg-white p-10 rounded-[3rem] border border-white shadow-2xl space-y-8">
           <h3 className="font-black text-xl flex items-center gap-3"><Layers className="text-indigo-600" /> Layout Templates</h3>
           <div className="grid grid-cols-2 gap-6">
             {Object.values(TemplateType).map((type) => {
               const isSelected = settings.selectedTemplate === type;
               return (
                 <button
                   key={type}
                   onClick={() => updateTemplate(type)}
                   className={`p-6 rounded-[2.5rem] border-2 transition-all text-left flex flex-col gap-4 group relative overflow-hidden ${
                     isSelected 
                       ? 'border-indigo-500 bg-indigo-50/50 shadow-xl shadow-indigo-100' 
                       : 'border-slate-50 hover:border-slate-200 bg-slate-50/30'
                   }`}
                 >
                   <div className={`aspect-video w-full rounded-xl border-2 overflow-hidden relative ${isSelected ? 'border-indigo-200 bg-white' : 'border-slate-100 bg-slate-100/50'}`}>
                      {type === TemplateType.MODERN_NEWS && <div className="absolute inset-4 border border-indigo-100 rounded bg-indigo-50/20"></div>}
                      {type === TemplateType.STANDARD && <div className="absolute bottom-4 left-4 right-4 h-12 bg-white/80 rounded border border-white"></div>}
                      {type === TemplateType.MINIMALIST && <div className="absolute left-0 top-0 bottom-0 w-2 bg-indigo-500"></div>}
                      {type === TemplateType.BREAKING_NEWS && <div className="absolute inset-0 bg-red-500/10"></div>}
                   </div>
                   <div className="flex items-center justify-between w-full">
                      <div className="space-y-1">
                        <p className="font-black text-slate-900 tracking-tight">{type}</p>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Layout Style</p>
                      </div>
                      {isSelected && <CheckCircle2 size={24} className="text-indigo-600" />}
                   </div>
                 </button>
               );
             })}
           </div>
        </div>
      </div>

      <div className="col-span-5">
        <div className="sticky top-32 space-y-6">
          <div className="bg-slate-900 p-8 rounded-[4rem] border border-slate-800 shadow-2xl relative overflow-hidden group">
             <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 to-transparent"></div>
             <div className="relative z-10 space-y-6">
                <div className="flex items-center justify-between">
                   <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                         <Play size={18} fill="currentColor" />
                      </div>
                      <h4 className="text-white font-black text-lg tracking-tight">Studio Preview</h4>
                   </div>
                </div>
                
                <div className="scale-100 transition-transform duration-700">
                  <CanvasPreview 
                    post={previewScenario === 'normal' ? PLACEHOLDER_POST : {
                      ...PLACEHOLDER_POST, 
                      title: "EXCLUSIVE REPORT: GLOBAL MARKETS FACE UNPRECEDENTED VOLATILITY AS NEW TECHNOLOGY REWRITES THE RULES"
                    }}
                    template={settings.selectedTemplate}
                    branding={settings.branding}
                    logoUrl={settings.logoUrl}
                    wordpressUrl={settings.wordpressUrl}
                    brandWebsite={settings.brandWebsite}
                  />
                </div>
             </div>
          </div>

          <button onClick={() => alert("Global configuration saved successfully.")} className="w-full p-8 bg-indigo-600 rounded-[2.5rem] text-white flex items-center justify-between group hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-200">
             <div className="text-left"><h4 className="font-black text-lg tracking-tight">Save Global Config</h4><p className="text-indigo-200 text-xs font-bold">Lock in these presets</p></div>
             <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center text-indigo-600 shadow-xl group-hover:translate-x-1 transition-transform"><Check size={24} /></div>
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'calendar' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-5 duration-700">
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Planner</h2>
          <div className="bg-white rounded-[3rem] border border-white shadow-2xl p-10">
            <div className="grid grid-cols-7 gap-6">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (<div key={day} className="text-center text-[10px] font-black text-slate-400 uppercase tracking-widest pb-4">{day}</div>))}
                {Array.from({length: 31}).map((_, i) => (<div key={i} className="h-32 rounded-[2rem] border border-slate-100 bg-slate-50/50 p-4 relative group"><span className="text-sm font-black text-slate-400">{i + 1}</span></div>))}
            </div>
          </div>
        </div>
      )}
      {activeTab === 'history' && renderHistory()}
      {activeTab === 'settings' && renderSettings()}
      {activeTab === 'account' && (
        <div className="max-w-3xl mx-auto py-20 text-center animate-in fade-in duration-1000">
           <img src={currentUser?.avatar} className="w-48 h-48 rounded-[4rem] border-[12px] border-white shadow-2xl mx-auto mb-10" alt="" />
           <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-4">{currentUser?.name}</h2>
           <p className="text-xl text-slate-400 font-bold mb-16">{currentUser?.email}</p>
           <button onClick={() => setCurrentUser(null)} className="px-12 py-5 bg-red-50 text-red-500 rounded-[2.5rem] font-black text-lg hover:bg-red-100 transition-all">Terminate Session</button>
        </div>
      )}
    </Layout>
  );
};

export default App;