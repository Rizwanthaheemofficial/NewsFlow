
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
  EngagementMetrics,
  ImageSource,
  AccountConnection
} from './types';
import { DEFAULT_SETTINGS, PLACEHOLDER_POST } from './constants';
import { fetchRecentPosts, validateWordPressUrl } from './services/wordpress';
import { 
  generateSocialCaption, 
  generateAudioBrief,
  generateVideoTeaser,
  predictPerformance,
  generatePostImage,
  generateHashtags,
  HashtagSet
} from './services/gemini';
import { publishToPlatform, fetchMetricsForPost } from './services/socialMedia';
import { 
  TrendingUp, 
  Globe, 
  RotateCw,
  Sparkles,
  Send,
  DollarSign,
  Facebook,
  Instagram,
  Twitter,
  Linkedin,
  Search,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
  Mic,
  Video as VideoIcon,
  Activity,
  Upload,
  XCircle,
  Check,
  Volume2,
  ShieldCheck,
  Zap,
  BarChart2,
  Smile,
  Briefcase,
  Flame,
  Cpu,
  Palette,
  Languages,
  ArrowUpRight,
  Layout as LayoutIcon,
  Hash,
  Copy,
  Plus,
  ExternalLink,
  Trash2,
  Heart,
  Eye,
  Share2,
  ToggleLeft,
  ToggleRight,
  Paintbrush,
  Link as LinkIcon
} from 'lucide-react';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const saved = localStorage.getItem('newsflow_user');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });

  const [activeTab, setActiveTab] = useState('dashboard');
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const saved = localStorage.getItem('newsflow_settings');
      const base = saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
      return {
        ...DEFAULT_SETTINGS,
        ...base,
        aiConfig: { ...DEFAULT_SETTINGS.aiConfig, ...(base.aiConfig || {}) },
        branding: { ...DEFAULT_SETTINGS.branding, ...(base.branding || {}) }
      };
    } catch { return DEFAULT_SETTINGS; }
  });
  
  const [logs, setLogs] = useState<PublishLog[]>(() => {
    try {
      const saved = localStorage.getItem('newsflow_logs');
      return saved ? JSON.parse(saved) : [];
    } catch { return []; }
  });

  const [discoveryFeed, setDiscoveryFeed] = useState<WPPost[]>([]);
  const [currentPost, setCurrentPost] = useState<WPPost | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [variations, setVariations] = useState<ContentVariations | null>(null);
  const [hashtags, setHashtags] = useState<HashtagSet | null>(null);
  const [selectedPlatform, setSelectedPlatform] = useState<Platform>(Platform.TWITTER);
  const [selectedTone, setSelectedTone] = useState(settings.aiConfig.brandVoice);
  
  const [performanceScore, setPerformanceScore] = useState<PerformanceScore | null>(null);
  const [isPolling, setIsPolling] = useState(false);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [isGeneratingTags, setIsGeneratingTags] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isRefreshingMetrics, setIsRefreshingMetrics] = useState(false);
  const [isGeneratingVideo, setIsGeneratingVideo] = useState(false);
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [copyFeedback, setCopyFeedback] = useState(false);
  
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [generatedAudioBase64, setGeneratedAudioBase64] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState('');
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const playPCM = async (base64: string) => {
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const ctx = audioContextRef.current;
      const binaryString = atob(base64);
      const len = binaryString.length;
      const bytes = new Uint8Array(len);
      for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
      }
      const dataInt16 = new Int16Array(bytes.buffer);
      const numChannels = 1;
      const frameCount = dataInt16.length / numChannels;
      const buffer = ctx.createBuffer(numChannels, frameCount, 24000);
      for (let channel = 0; channel < numChannels; channel++) {
        const channelData = buffer.getChannelData(channel);
        for (let i = 0; i < frameCount; i++) {
          channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
        }
      }
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
    } catch (err) {
      console.error("PCM Playback Error:", err);
    }
  };

  const stats: SystemStats = {
    todayPosts: logs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).length,
    totalPosts: logs.length,
    activePlatforms: [settings.fbConnection, settings.igConnection, settings.xConnection, settings.liConnection].filter(c => c?.isConnected).length,
    tokensUsed: logs.length * 250,
    estimatedSavings: logs.length * 25.00,
    totalEngagement: logs.reduce((acc, log) => acc + (log.metrics?.likes || 0) + (log.metrics?.shares || 0), 0)
  };

  useEffect(() => { if (currentUser) localStorage.setItem('newsflow_user', JSON.stringify(currentUser)); }, [currentUser]);
  useEffect(() => { localStorage.setItem('newsflow_settings', JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem('newsflow_logs', JSON.stringify(logs)); }, [logs]);

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

  useEffect(() => {
    if (currentUser) {
      fetchDiscovery();
      const interval = setInterval(() => { refreshAllMetrics(); }, 60000);
      return () => clearInterval(interval);
    }
  }, [currentUser, fetchDiscovery]);

  const handleCompose = async (post: WPPost) => {
    setCurrentPost(post);
    setGeneratedImageUrl(null);
    setGeneratedAudioBase64(null);
    setGeneratedVideoUrl(null);
    setHashtags(null);
    setIsGeneratingCaption(true);
    setIsGeneratingTags(true);
    
    const [vars, tags] = await Promise.all([
      generateSocialCaption(post.title, post.excerpt || "", post.link, settings.aiConfig, selectedTone),
      generateHashtags(post.title, post.excerpt || "")
    ]);
    
    setVariations(vars);
    setHashtags(tags);
    setIsGeneratingCaption(false);
    setIsGeneratingTags(false);
    
    if (vars) handlePredict(post.title, vars[selectedPlatform]);
  };

  const handlePredict = async (title: string, caption: string) => {
    const score = await predictPerformance(title, caption);
    setPerformanceScore(score);
  };

  const regenerateCaption = async () => {
    if (!currentPost) return;
    setIsGeneratingCaption(true);
    const vars = await generateSocialCaption(currentPost.title, currentPost.excerpt || "", currentPost.link, settings.aiConfig, selectedTone);
    setVariations(vars);
    setIsGeneratingCaption(false);
    handlePredict(currentPost.title, vars[selectedPlatform]);
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
    if (!hasKey) await (window as any).aistudio.openSelectKey();
    setGeneratedVideoUrl(null);
    setIsGeneratingVideo(true);
    const url = await generateVideoTeaser(currentPost.title, setVideoStatus);
    setGeneratedVideoUrl(url);
    setIsGeneratingVideo(false);
    setVideoStatus('');
  };

  const handleAIImageGen = async () => {
    if (!currentPost) return;
    setIsGeneratingImage(true);
    const imageUrl = await generatePostImage(currentPost.title);
    if (imageUrl) setGeneratedImageUrl(imageUrl);
    setIsGeneratingImage(false);
  };

  const appendTag = (tag: string) => {
    if (!variations) return;
    const currentText = variations[selectedPlatform];
    const tagWithHash = `#${tag}`;
    if (currentText.toLowerCase().includes(tagWithHash.toLowerCase())) return;
    const newText = `${currentText.trim()}\n\n${tagWithHash}`;
    setVariations({ ...variations, [selectedPlatform]: newText });
  };

  const copyToClipboard = () => {
    if (!variations) return;
    navigator.clipboard.writeText(variations[selectedPlatform]);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2000);
  };

  const handlePublish = async () => {
    if (!currentPost || !variations) return;
    setIsPublishing(true);
    const success = await publishToPlatform(selectedPlatform, generatedImageUrl || currentPost.featuredImageUrl, variations[selectedPlatform], 'PRODUCTION_KEY');
    if (success) {
      const newLog: PublishLog = {
        id: `log_${Date.now()}`,
        timestamp: new Date().toISOString(),
        postTitle: currentPost.title,
        caption: variations[selectedPlatform],
        platforms: { [selectedPlatform]: 'success' },
        imageUrl: generatedImageUrl || currentPost.featuredImageUrl,
        metrics: { likes: 0, shares: 0, comments: 0, reach: 0 }
      };
      setLogs(prev => [newLog, ...prev]);
      alert(`Success: Posted to ${selectedPlatform}`);
    } else {
      alert(`Error: Could not reach ${selectedPlatform} API node.`);
    }
    setIsPublishing(false);
  };

  const refreshAllMetrics = async () => {
    if (isRefreshingMetrics || logs.length === 0) return;
    setIsRefreshingMetrics(true);
    const updatedLogs = await Promise.all(logs.map(async (log) => {
      const metrics = await fetchMetricsForPost(log.id);
      return { ...log, metrics };
    }));
    setLogs(updatedLogs);
    setIsRefreshingMetrics(false);
  };

  const updatePlatformConnection = (platform: Platform, connection: AccountConnection) => {
    const keyMap: Record<Platform, keyof AppSettings> = {
      [Platform.FACEBOOK]: 'fbConnection',
      [Platform.INSTAGRAM]: 'igConnection',
      [Platform.TWITTER]: 'xConnection',
      [Platform.LINKEDIN]: 'liConnection'
    };
    setSettings(prev => ({ ...prev, [keyMap[platform]]: connection }));
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setSettings(prev => ({ ...prev, logoUrl: reader.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  if (!currentUser) return <Login onLogin={setCurrentUser} />;

  const renderDashboard = () => (
    <div className="grid grid-cols-12 gap-8 animate-in fade-in duration-1000">
      {/* Stats row */}
      <div className="col-span-12 grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Cloud Engagement', value: stats.totalEngagement.toLocaleString(), icon: Activity, color: 'text-violet-500', bg: 'bg-violet-50' },
          { label: 'Weekly Reach', value: '184k', icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'AI Media Assets', value: logs.length * 3, icon: ImageIcon, color: 'text-indigo-500', bg: 'bg-indigo-50' },
          { label: 'Est. Agency ROI', value: `$${stats.estimatedSavings}`, icon: DollarSign, color: 'text-blue-500', bg: 'bg-blue-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white/90 backdrop-blur-xl p-6 rounded-[2rem] border border-white shadow-xl flex items-center gap-5 glass-panel">
            <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center shadow-inner`}>
              <stat.icon size={24} />
            </div>
            <div>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p>
              <p className="text-2xl font-black text-slate-900 leading-none mt-1">{stat.value}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="col-span-12 lg:col-span-8 space-y-8">
        <div className="bg-white/90 backdrop-blur-2xl rounded-[3rem] border border-white shadow-2xl overflow-hidden relative glass-panel">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl shadow-indigo-100 animate-gradient">
                <Sparkles size={24} />
              </div>
              <div>
                <h2 className="text-xl font-black text-slate-900 tracking-tight">Creative Studio</h2>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Post Production Node</p>
              </div>
            </div>
            <button onClick={regenerateCaption} disabled={isGeneratingCaption} className="p-3 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-all shadow-sm group">
              <RotateCw size={18} className={`text-slate-600 ${isGeneratingCaption ? 'animate-spin' : 'group-hover:rotate-180 transition-transform duration-500'}`} />
            </button>
          </div>

          <div className="p-10 relative">
            {(isGeneratingVideo || isGeneratingAudio || isGeneratingImage) && (
              <div className="absolute inset-0 bg-white/95 backdrop-blur-xl flex flex-col items-center justify-center p-12 text-center gap-6 z-30 rounded-[3rem]">
                <div className="relative">
                  <div className="absolute inset-0 bg-indigo-500/20 blur-3xl rounded-full"></div>
                  <Loader2 className="animate-spin text-indigo-600 relative z-10" size={64} />
                </div>
                <div className="space-y-1">
                  <h3 className="text-slate-900 font-black text-xl">
                    {isGeneratingVideo ? 'Rendering Cinema...' : isGeneratingAudio ? 'Synthesizing Voice...' : 'Painting AI Canvas...'}
                  </h3>
                  <p className="text-slate-500 text-sm font-medium italic animate-pulse">{videoStatus || 'Connecting to Gemini Cloud...'}</p>
                </div>
              </div>
            )}

            {currentPost ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  {/* Platform Selector */}
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

                  <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
                    {[
                      { name: 'Professional & Informative', icon: Briefcase },
                      { name: 'Humorous & Witty', icon: Smile },
                      { name: 'Gen-Z Viral', icon: Zap },
                      { name: 'Urgent Clickbait', icon: Flame }
                    ].map(tone => (
                      <button 
                        key={tone.name}
                        onClick={() => { setSelectedTone(tone.name); regenerateCaption(); }}
                        className={`px-4 py-2 rounded-full text-[9px] font-black uppercase whitespace-nowrap flex items-center gap-2 border transition-all ${
                          selectedTone === tone.name ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg' : 'bg-white text-slate-500 border-slate-100 hover:border-indigo-200'
                        }`}
                      >
                        <tone.icon size={12} /> {tone.name.split(' ')[0]}
                      </button>
                    ))}
                  </div>

                  <div className="relative group">
                    <textarea 
                      value={variations?.[selectedPlatform] || ""}
                      onChange={(e) => setVariations(v => v ? {...v, [selectedPlatform]: e.target.value} : null)}
                      className="w-full h-48 p-7 bg-slate-50/50 border-2 border-slate-100 rounded-[2.5rem] focus:border-indigo-400 focus:bg-white outline-none transition-all font-medium text-slate-700 text-sm leading-relaxed custom-scrollbar"
                    />
                    <div className="absolute bottom-4 right-4 flex gap-2">
                       <button onClick={copyToClipboard} className={`p-2 rounded-xl transition-all flex items-center gap-2 ${copyFeedback ? 'bg-emerald-500 text-white' : 'bg-white/80 text-slate-400 hover:text-indigo-600 shadow-lg'}`}>
                          {copyFeedback ? <Check size={14} /> : <Copy size={14} />}
                          <span className="text-[9px] font-black uppercase">{copyFeedback ? 'Copied' : 'Copy'}</span>
                       </button>
                    </div>
                    {isGeneratingCaption && (
                      <div className="absolute inset-0 bg-white/70 backdrop-blur-md rounded-[2.5rem] flex flex-col items-center justify-center gap-4">
                        <Loader2 className="animate-spin text-indigo-600" size={40} />
                        <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Optimizing Copy...</span>
                      </div>
                    )}
                  </div>

                  {/* Hashtag Lab */}
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-[2.5rem] space-y-4 relative overflow-hidden group shadow-inner">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                         <Hash size={16} className="text-indigo-600" />
                         <span className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Hashtag Laboratory</span>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2 min-h-[40px] relative">
                      {isGeneratingTags ? (
                        <div className="flex items-center gap-2 animate-pulse w-full">
                           <div className="w-16 h-6 bg-slate-200 rounded-full"></div>
                           <div className="w-24 h-6 bg-slate-200 rounded-full"></div>
                           <div className="w-14 h-6 bg-slate-200 rounded-full"></div>
                        </div>
                      ) : hashtags ? (
                        <>
                          {hashtags.trending.map(tag => (
                            <button key={tag} onClick={() => appendTag(tag)} className="px-3 py-1.5 bg-indigo-600 text-white text-[9px] font-black rounded-full flex items-center gap-1.5 hover:scale-105 transition-all shadow-md shadow-indigo-100">
                              <Zap size={10} /> #{tag}
                            </button>
                          ))}
                          {hashtags.niche.map(tag => (
                            <button key={tag} onClick={() => appendTag(tag)} className="px-3 py-1.5 bg-white border border-slate-200 text-slate-600 text-[9px] font-black rounded-full flex items-center gap-1.5 hover:border-indigo-300 hover:text-indigo-600 transition-all">
                              <Plus size={10} /> #{tag}
                            </button>
                          ))}
                          {hashtags.broad.map(tag => (
                            <button key={tag} onClick={() => appendTag(tag)} className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-100 text-[9px] font-black rounded-full flex items-center gap-1.5 hover:bg-emerald-100 transition-all">
                              <ArrowUpRight size={10} /> #{tag}
                            </button>
                          ))}
                        </>
                      ) : (
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest italic text-center w-full py-2">Select article to generate tags</p>
                      )}
                    </div>
                  </div>

                  {performanceScore && (
                    <div className="p-5 bg-indigo-50 border border-indigo-100 rounded-[2rem] flex items-center justify-between shadow-inner">
                       <div className="flex items-center gap-4">
                          <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-white font-black text-sm shadow-inner ${
                            performanceScore.score > 80 ? 'bg-emerald-500' : performanceScore.score > 50 ? 'bg-amber-500' : 'bg-rose-500'
                          }`}>
                            {performanceScore.score}%
                          </div>
                          <div>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Impact Confidence</p>
                            <h4 className="text-sm font-black text-slate-900">{performanceScore.label} Engagement</h4>
                          </div>
                       </div>
                       <BarChart2 size={24} className="text-indigo-200" />
                    </div>
                  )}

                  <button 
                    onClick={handlePublish}
                    disabled={isPublishing || !variations}
                    className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black flex items-center justify-center gap-3 hover:bg-indigo-600 transition-all shadow-2xl active:scale-95 disabled:opacity-50"
                  >
                    {isPublishing ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />}
                    Dispatch Production Post
                  </button>
                </div>

                <div className="space-y-6 flex flex-col">
                  {/* Template Picker */}
                  <div className="bg-slate-50 p-4 rounded-[2.5rem] border border-slate-100 space-y-3 shadow-inner">
                     <div className="flex items-center justify-between px-1">
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visual Templates</p>
                        <button 
                          onClick={() => setSettings({...settings, branding: {...settings.branding, useCustomColors: !settings.branding.useCustomColors}})}
                          className={`flex items-center gap-1.5 text-[9px] font-black uppercase transition-all ${settings.branding.useCustomColors ? 'text-indigo-600' : 'text-slate-400'}`}
                        >
                          <Paintbrush size={12} /> Brand Sync
                        </button>
                     </div>
                     <div className="grid grid-cols-4 gap-2">
                        {Object.values(TemplateType).map(t => (
                          <button 
                            key={t}
                            onClick={() => setSettings({...settings, selectedTemplate: t})}
                            className={`p-3 rounded-2xl border-2 transition-all flex flex-col items-center gap-1.5 ${
                              settings.selectedTemplate === t ? 'border-indigo-500 bg-white shadow-md' : 'border-white bg-slate-100 hover:border-slate-200'
                            }`}
                          >
                            <div className={`w-full h-8 rounded-lg shadow-inner ${
                              settings.branding.useCustomColors ? '' : 
                              t === TemplateType.BREAKING_NEWS ? 'bg-red-500' : 
                              t === TemplateType.STANDARD ? 'bg-blue-600' : 
                              t === TemplateType.MINIMALIST ? 'bg-slate-300' : 'bg-indigo-500'
                            }`} style={settings.branding.useCustomColors ? { backgroundColor: settings.branding.primaryColor } : {}}></div>
                            <span className="text-[8px] font-black text-slate-600 uppercase whitespace-nowrap">{t.split(' ')[0]}</span>
                          </button>
                        ))}
                     </div>
                  </div>

                  {generatedVideoUrl ? (
                    <div className="relative aspect-square rounded-[2.5rem] overflow-hidden shadow-2xl border-4 border-white bg-black group">
                       <video src={generatedVideoUrl} controls autoPlay loop className="w-full h-full object-cover" />
                       <button onClick={() => setGeneratedVideoUrl(null)} className="absolute top-4 right-4 p-2 bg-white/20 text-white rounded-full backdrop-blur-md hover:bg-white/40"><XCircle size={20} /></button>
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

                  <div className="grid grid-cols-3 gap-3">
                    <button onClick={handleAudioGen} className="p-3 bg-indigo-50 border border-indigo-100 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-indigo-100 transition-all group">
                      <Mic size={18} className="text-indigo-600 group-hover:scale-110 transition-transform" />
                      <span className="text-[8px] font-black text-indigo-900 uppercase tracking-widest">Voice</span>
                    </button>
                    <button onClick={handleVideoGen} className="p-3 bg-violet-50 border border-violet-100 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-violet-100 transition-all group">
                      <VideoIcon size={18} className="text-violet-600 group-hover:scale-110 transition-transform" />
                      <span className="text-[8px] font-black text-violet-900 uppercase tracking-widest">Video</span>
                    </button>
                    <button onClick={handleAIImageGen} className="p-3 bg-emerald-50 border border-emerald-100 rounded-2xl flex flex-col items-center justify-center gap-2 hover:bg-emerald-100 transition-all group">
                      <ImageIcon size={18} className="text-emerald-600 group-hover:scale-110 transition-transform" />
                      <span className="text-[8px] font-black text-emerald-900 uppercase tracking-widest">AI Art</span>
                    </button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="py-40 flex flex-col items-center text-center space-y-6 text-slate-400 font-bold uppercase tracking-widest">
                <LayoutIcon size={64} className="opacity-20 mb-4" />
                Select an Article to Begin Production
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-4 h-full min-h-[600px] flex flex-col">
         <div className="bg-white/90 backdrop-blur-2xl rounded-[3rem] border border-white shadow-2xl p-8 flex-1 flex flex-col glass-panel">
            <h3 className="font-black text-slate-900 text-lg mb-6 flex items-center gap-2"><Globe size={18} className="text-indigo-600" /> Remote Article Feed</h3>
            <div className="relative mb-6">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && fetchDiscovery(searchQuery)}
                placeholder="Search WordPress..." 
                className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold focus:border-indigo-500 outline-none transition-all shadow-inner"
              />
            </div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
               {discoveryFeed.map(post => (
                 <button 
                  key={post.id}
                  onClick={() => handleCompose(post)}
                  className={`w-full text-left p-4 rounded-[2rem] border-2 transition-all flex gap-4 items-center group ${
                    currentPost?.id === post.id ? 'border-indigo-500 bg-indigo-50/30 shadow-xl' : 'border-slate-50 hover:border-slate-200'
                  }`}
                 >
                   <img src={post.featuredImageUrl} className="w-16 h-16 rounded-xl object-cover shadow-lg border border-white" alt="" />
                   <div className="space-y-0.5 min-w-0">
                      <p className="text-[9px] font-black text-indigo-600 uppercase tracking-widest truncate">{post.author || 'Editorial'}</p>
                      <h4 className="text-xs font-black text-slate-900 leading-tight line-clamp-2">{post.title}</h4>
                   </div>
                 </button>
               ))}
            </div>
         </div>
      </div>
    </div>
  );

  const renderHistory = () => (
    <div className="animate-in fade-in slide-in-from-bottom-5 duration-700">
      <div className="flex justify-between items-center mb-10">
        <div>
          <h2 className="text-4xl font-black text-slate-900 tracking-tight">Audit Trail</h2>
          <p className="text-slate-500 font-medium text-sm mt-1">Review all distributed content and engagement</p>
        </div>
        <button onClick={refreshAllMetrics} className="px-6 py-3 bg-indigo-600 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl flex items-center gap-2 hover:bg-indigo-700 transition-all">
          <RotateCw size={16} className={isRefreshingMetrics ? 'animate-spin' : ''} /> Refresh Sync
        </button>
      </div>
      <div className="grid grid-cols-1 gap-6">
         {logs.length === 0 ? (
            <div className="py-32 text-center bg-white rounded-[3rem] border border-slate-100 glass-panel">
               <p className="text-slate-400 font-black uppercase tracking-widest text-xs">No publication history found.</p>
            </div>
         ) : (
            logs.map(log => (
              <div key={log.id} className="bg-white p-6 rounded-[2.5rem] border border-slate-100 shadow-xl flex items-center gap-8 hover:border-indigo-200 transition-all glass-panel group">
                  <img src={log.imageUrl} className="w-20 h-20 rounded-2xl object-cover shadow-lg border-2 border-white group-hover:scale-105 transition-transform" alt="" />
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-3">
                        <span className="text-[9px] font-black text-indigo-600 uppercase tracking-widest">{new Date(log.timestamp).toLocaleString()}</span>
                        <div className="px-2 py-0.5 bg-emerald-50 text-emerald-600 rounded-full text-[8px] font-black uppercase tracking-widest">Broadcast Live</div>
                    </div>
                    <h4 className="text-md font-black text-slate-900 tracking-tight leading-tight">{log.postTitle}</h4>
                    {log.metrics && (
                      <div className="flex items-center gap-5 pt-1">
                        <div className="flex items-center gap-1.5 text-slate-500 font-black text-[10px]"><Heart size={12} className="text-rose-500" /> {log.metrics.likes.toLocaleString()}</div>
                        <div className="flex items-center gap-1.5 text-slate-500 font-black text-[10px]"><Eye size={12} className="text-slate-400" /> {log.metrics.reach.toLocaleString()}</div>
                        <div className="flex items-center gap-1.5 text-slate-500 font-black text-[10px]"><Share2 size={12} className="text-indigo-400" /> {log.metrics.shares.toLocaleString()}</div>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                     {Object.keys(log.platforms).map(p => (
                       <div key={p} className="w-10 h-10 bg-slate-900 rounded-xl flex items-center justify-center text-white shadow-lg">
                         {p === Platform.TWITTER && <Twitter size={16} />}
                         {p === Platform.INSTAGRAM && <Instagram size={16} />}
                         {p === Platform.FACEBOOK && <Facebook size={16} />}
                         {p === Platform.LINKEDIN && <Linkedin size={16} />}
                       </div>
                     ))}
                  </div>
                  <button onClick={() => setLogs(logs.filter(l => l.id !== log.id))} className="p-3 text-slate-300 hover:text-rose-500 transition-colors">
                    <Trash2 size={18} />
                  </button>
              </div>
            ))
         )}
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="grid grid-cols-12 gap-10 animate-in fade-in slide-in-from-bottom-5 duration-1000">
      <div className="col-span-12 lg:col-span-8 space-y-10">
        <section className="bg-white p-10 rounded-[3rem] shadow-2xl glass-panel space-y-8">
           <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 border-b border-slate-100 pb-6"><Globe className="text-indigo-600" /> Source & Automation</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2">
                 <p className="text-xs font-black text-slate-500 uppercase tracking-widest">WordPress Source URL</p>
                 <input 
                    type="text" 
                    value={settings.wordpressUrl}
                    onChange={(e) => setSettings({...settings, wordpressUrl: e.target.value})}
                    className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-indigo-500 outline-none text-sm font-medium shadow-inner"
                 />
              </div>
              <div className="space-y-2">
                 <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Website Handle (Lower Third)</p>
                 <div className="relative">
                    <LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input 
                        type="text" 
                        value={settings.brandWebsite}
                        onChange={(e) => setSettings({...settings, brandWebsite: e.target.value})}
                        placeholder="e.g. NEWSROOM.LIVE"
                        className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-indigo-500 outline-none text-sm font-medium shadow-inner"
                    />
                 </div>
              </div>
              <div className="space-y-2">
                 <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Daily Limit</p>
                 <div className="flex items-center gap-4 pt-2">
                    <input type="range" min="1" max="100" value={settings.dailyLimit} onChange={(e) => setSettings({...settings, dailyLimit: parseInt(e.target.value)})} className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                    <span className="text-lg font-black text-slate-900">{settings.dailyLimit}</span>
                 </div>
              </div>
           </div>
        </section>

        <section className="bg-white p-10 rounded-[3rem] shadow-2xl glass-panel space-y-8">
           <h3 className="text-xl font-black text-slate-900 flex items-center gap-3 border-b border-slate-100 pb-6"><Cpu className="text-indigo-600" /> AI Lab Configuration</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                 <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Creativity (Temp)</p>
                 <div className="flex items-center gap-4">
                    <input type="range" min="0" max="100" value={settings.aiConfig.creativity * 100} onChange={(e) => setSettings({...settings, aiConfig: {...settings.aiConfig, creativity: parseInt(e.target.value) / 100}})} className="flex-1 h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-indigo-600" />
                    <span className="text-sm font-black text-indigo-600">{(settings.aiConfig.creativity * 100).toFixed(0)}%</span>
                 </div>
              </div>
              <div className="space-y-4">
                 <p className="text-xs font-black text-slate-500 uppercase tracking-widest">Post Language</p>
                 <select value={settings.aiConfig.targetLanguage} onChange={(e) => setSettings({...settings, aiConfig: {...settings.aiConfig, targetLanguage: e.target.value}})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:border-indigo-500 outline-none text-sm font-black uppercase appearance-none shadow-inner">
                    {['English', 'Spanish', 'French', 'German', 'Japanese', 'Hindi'].map(l => <option key={l} value={l}>{l}</option>)}
                 </select>
              </div>
           </div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-2 gap-6">
           <ConnectionCard platform={Platform.FACEBOOK} connection={settings.fbConnection} onConnect={() => updatePlatformConnection(Platform.FACEBOOK, {isConnected: true, username: 'NewsFlow_FB', avatar: 'https://i.pravatar.cc/150?u=fb', lastSync: 'Just now'})} onDisconnect={() => updatePlatformConnection(Platform.FACEBOOK, {isConnected: false})} />
           <ConnectionCard platform={Platform.TWITTER} connection={settings.xConnection} onConnect={() => updatePlatformConnection(Platform.TWITTER, {isConnected: true, username: 'NewsFlow_X', avatar: 'https://i.pravatar.cc/150?u=x', lastSync: 'Just now'})} onDisconnect={() => updatePlatformConnection(Platform.TWITTER, {isConnected: false})} />
           <ConnectionCard platform={Platform.INSTAGRAM} connection={settings.igConnection} onConnect={() => updatePlatformConnection(Platform.INSTAGRAM, {isConnected: true, username: 'NewsFlow_IG', avatar: 'https://i.pravatar.cc/150?u=ig', lastSync: 'Just now'})} onDisconnect={() => updatePlatformConnection(Platform.INSTAGRAM, {isConnected: false})} />
           <ConnectionCard platform={Platform.LINKEDIN} connection={settings.liConnection} onConnect={() => updatePlatformConnection(Platform.LINKEDIN, {isConnected: true, username: 'NewsFlow_LI', avatar: 'https://i.pravatar.cc/150?u=li', lastSync: 'Just now'})} onDisconnect={() => updatePlatformConnection(Platform.LINKEDIN, {isConnected: false})} />
        </section>
      </div>

      <div className="col-span-12 lg:col-span-4 space-y-10">
        <section className="bg-white p-8 rounded-[3rem] shadow-2xl glass-panel space-y-6">
           <h3 className="text-xl font-black text-slate-900 flex items-center gap-3"><Palette className="text-indigo-600" /> Branding Studio</h3>
           
           <div className="space-y-6 pt-4 border-t border-slate-100">
              {/* Logo Upload */}
              <div className="space-y-2">
                <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Brand Mark (Logo)</p>
                <input type="file" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" accept="image/png" />
                <button onClick={() => fileInputRef.current?.click()} className="w-full py-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2 hover:border-indigo-400 transition-all shadow-inner group overflow-hidden">
                  {settings.logoUrl ? <img src={settings.logoUrl} className="h-10 object-contain" /> : <><Upload size={20} className="text-slate-300 group-hover:text-indigo-400" /><span className="text-[9px] font-black text-slate-400 uppercase">Production PNG</span></>}
                </button>
              </div>

              {/* Color Customization */}
              <div className="space-y-4 bg-slate-50 p-6 rounded-[2rem] border border-slate-100">
                <div className="flex items-center justify-between">
                   <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest">Custom Theme</p>
                   <button 
                      onClick={() => setSettings({...settings, branding: {...settings.branding, useCustomColors: !settings.branding.useCustomColors}})}
                      className={`transition-all ${settings.branding.useCustomColors ? 'text-indigo-600' : 'text-slate-300'}`}
                   >
                     {settings.branding.useCustomColors ? <ToggleRight size={32} /> : <ToggleLeft size={32} />}
                   </button>
                </div>

                <div className={`space-y-4 transition-all ${settings.branding.useCustomColors ? 'opacity-100 pointer-events-auto' : 'opacity-40 pointer-events-none'}`}>
                   <div className="flex items-center justify-between gap-4">
                      <div className="flex-1 space-y-1.5">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Primary (Bar)</p>
                        <div className="flex items-center gap-3">
                           <input 
                              type="color" 
                              value={settings.branding.primaryColor} 
                              onChange={(e) => setSettings({...settings, branding: {...settings.branding, primaryColor: e.target.value}})}
                              className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-none"
                           />
                           <input 
                              type="text" 
                              value={settings.branding.primaryColor}
                              onChange={(e) => setSettings({...settings, branding: {...settings.branding, primaryColor: e.target.value}})}
                              className="w-full text-[10px] font-mono font-bold uppercase py-1 bg-white border border-slate-200 rounded px-2"
                           />
                        </div>
                      </div>
                      <div className="flex-1 space-y-1.5">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Accent (Pop)</p>
                        <div className="flex items-center gap-3">
                           <input 
                              type="color" 
                              value={settings.branding.accentColor} 
                              onChange={(e) => setSettings({...settings, branding: {...settings.branding, accentColor: e.target.value}})}
                              className="w-8 h-8 rounded-lg cursor-pointer bg-transparent border-none"
                           />
                           <input 
                              type="text" 
                              value={settings.branding.accentColor}
                              onChange={(e) => setSettings({...settings, branding: {...settings.branding, accentColor: e.target.value}})}
                              className="w-full text-[10px] font-mono font-bold uppercase py-1 bg-white border border-slate-200 rounded px-2"
                           />
                        </div>
                      </div>
                   </div>
                </div>
              </div>
           </div>
        </section>
        
        <div className="bg-slate-900 p-8 rounded-[3rem] shadow-2xl text-center space-y-6 relative overflow-hidden">
           <ShieldCheck size={48} className="text-indigo-500 mx-auto relative z-10" />
           <div className="space-y-1 relative z-10">
              <h4 className="text-white font-black text-lg">PRO NODE ACTIVE</h4>
              <p className="text-slate-500 text-[10px] font-black uppercase">Enterprise Gemini Access</p>
           </div>
           <button className="w-full py-4 bg-white/5 border border-white/10 text-white rounded-2xl text-[10px] font-black hover:bg-white/10 transition-all relative z-10 uppercase tracking-widest">Update Credentials</button>
        </div>
      </div>
    </div>
  );

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'history' && renderHistory()}
      {activeTab === 'settings' && renderSettings()}
      {activeTab === 'calendar' && (
        <div className="space-y-8 animate-in slide-in-from-bottom-5">
          <h2 className="text-4xl font-black text-slate-900">Post Planner</h2>
          <div className="bg-white rounded-[3rem] border border-white shadow-2xl p-10 glass-panel">
             <div className="grid grid-cols-7 gap-px bg-slate-100 rounded-3xl overflow-hidden border border-slate-100">
                {Array.from({length: 31}).map((_, i) => (
                   <div key={i} className="h-40 bg-white p-4 group hover:bg-slate-50 transition-colors cursor-pointer">
                      <span className="text-sm font-black text-slate-300 group-hover:text-indigo-400">{i + 1}</span>
                      {i % 8 === 0 && <div className="mt-2 p-2 bg-indigo-600 rounded-xl shadow-lg"><p className="text-[8px] font-black text-white uppercase truncate">Scheduled</p></div>}
                   </div>
                ))}
             </div>
          </div>
        </div>
      )}
      {activeTab === 'account' && (
        <div className="max-w-2xl mx-auto py-20 text-center animate-in zoom-in-95">
           <div className="relative inline-block mb-10">
              <img src={currentUser?.avatar} className="w-48 h-48 rounded-[4rem] border-[12px] border-white shadow-2xl" alt="" />
              <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-xl border-4 border-white"><CheckCircle2 size={24} /></div>
           </div>
           <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-4">{currentUser?.name}</h2>
           <p className="text-slate-400 font-bold mb-16">{currentUser?.email} • {currentUser?.plan} Plan</p>
           <button onClick={() => setCurrentUser(null)} className="w-full py-5 bg-rose-50 text-rose-600 rounded-[2rem] font-black text-lg hover:bg-rose-100 transition-all border border-rose-100 shadow-xl shadow-rose-100/20 active:scale-95">Decommission Session</button>
        </div>
      )}
    </Layout>
  );
};

export default App;
