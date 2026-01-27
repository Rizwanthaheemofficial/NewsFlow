
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
import { publishToPlatform } from './services/socialMedia';
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
  Key
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
      xConnection: connections[Platform.TWITTER] || base.xConnection,
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
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  // --- EFFECTS ---
  useEffect(() => {
    // HANDLE OAUTH CALLBACK FROM SOCIAL PLATFORMS
    const params = new URLSearchParams(window.location.search);
    const code = params.get('code');
    const state = params.get('state');

    if (code && state) {
      setGenerating('Finalizing Social Link...');
      finalizeSocialConnection(code, state).then(conn => {
        if (conn) {
          const connections = getStoredConnections();
          setSettings(prev => ({
            ...prev,
            fbConnection: connections[Platform.FACEBOOK] || prev.fbConnection,
            igConnection: connections[Platform.INSTAGRAM] || prev.igConnection,
            xConnection: connections[Platform.TWITTER] || prev.xConnection,
            liConnection: connections[Platform.LINKEDIN] || prev.liConnection,
          }));
          setShareFeedback('Account Linked Successfully!');
          setActiveTab('settings');
        }
        setGenerating(null);
        // Clean URL parameters
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
    activePlatforms: [settings.fbConnection, settings.igConnection, settings.xConnection, settings.liConnection].filter(c => c.isConnected).length,
    tokensUsed: 42050 + (logs.length * 1500),
    estimatedSavings: 1250 + (logs.length * 45),
    totalEngagement: 85400 + (logs.length * 320)
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

  const decodeBase64 = (base64: string) => {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
    return bytes;
  };

  const playRawAudio = async (base64: string) => {
    try {
      if (!audioCtxRef.current) audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      const ctx = audioCtxRef.current;
      const bytes = decodeBase64(base64);
      const dataInt16 = new Int16Array(bytes.buffer);
      const buffer = ctx.createBuffer(1, dataInt16.length, 24000);
      const channelData = buffer.getChannelData(0);
      for (let i = 0; i < dataInt16.length; i++) channelData[i] = dataInt16[i] / 32768.0;
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start();
      setShareFeedback("Audio Playing...");
    } catch (e) {
      console.error("Audio playback failed", e);
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
    if (file && file.type === 'image/png') {
      const reader = new FileReader();
      reader.onload = (event) => {
        setSettings(prev => ({ ...prev, logoUrl: event.target?.result as string }));
      };
      reader.readAsDataURL(file);
    }
  };

  const getSettingsKey = (platform: Platform): keyof AppSettings => {
    switch(platform) {
      case Platform.FACEBOOK: return 'fbConnection';
      case Platform.INSTAGRAM: return 'igConnection';
      case Platform.TWITTER: return 'xConnection';
      case Platform.LINKEDIN: return 'liConnection';
      default: throw new Error('Invalid platform');
    }
  };

  const handleConnectAccount = async (platform: Platform) => {
    try {
      await initiateSocialConnection(platform);
      // Window will redirect to login page
    } catch (error) {
      alert(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
      throw error;
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
        [Platform.TWITTER]: `${newCaptions[Platform.TWITTER]}\n\n${hashtagString}`,
        [Platform.LINKEDIN]: `${newCaptions[Platform.LINKEDIN]}\n\n${hashtagString}`,
      };

      setCaptions(enriched);
      setHashtags(newHashtags);
      const newScore = await predictPerformance(selectedPost.title, enriched[Platform.FACEBOOK]);
      setScore(newScore);
    } catch (e) {
      console.error('AI Processing Error:', e);
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateMedia = async (type: 'image' | 'audio' | 'video') => {
    if (!selectedPost) return;
    setGenerating(`Building ${type} engine...`);
    try {
      if (type === 'image') {
        const url = await generatePostImage(selectedPost.title);
        if (url) setSelectedPost({ ...selectedPost, aiImageUrl: url });
      } else if (type === 'audio') {
        const data = await generateAudioBrief(selectedPost.title + ". " + (selectedPost.excerpt || ""));
        if (data) {
          setSelectedPost({ ...selectedPost, audioUrl: data });
          playRawAudio(data);
        }
      } else if (type === 'video') {
        if (!(await (window as any).aistudio.hasSelectedApiKey())) {
          await (window as any).aistudio.openSelectKey();
        }
        const url = await generateVideoTeaser(selectedPost.title, (msg) => setGenerating(msg));
        if (url) setSelectedPost({ ...selectedPost, videoUrl: url });
      }
    } catch (err) {
       console.error(`${type} generation failed`, err);
    } finally {
      setGenerating(null);
    }
  };

  const handleBroadcast = async () => {
    if (!selectedPost || !captions) return;
    
    const activeCons = [Platform.FACEBOOK, Platform.INSTAGRAM, Platform.TWITTER, Platform.LINKEDIN].filter(p => settings[getSettingsKey(p)].isConnected);
    
    if (activeCons.length === 0) {
      alert("No social accounts connected. Link your accounts in Settings first.");
      setActiveTab('settings');
      return;
    }

    const newLog: PublishLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      postTitle: selectedPost.title,
      caption: captions[Platform.FACEBOOK],
      imageUrl: exportedImageUrl || selectedPost.aiImageUrl || selectedPost.featuredImageUrl,
      platforms: {}
    };

    for (const platform of activeCons) {
      const connection = settings[getSettingsKey(platform)];
      
      setGenerating(`${platform}: Handshaking social API...`);
      await new Promise(r => setTimeout(r, 800));

      setGenerating(`${platform}: Uploading media bundle...`);
      await new Promise(r => setTimeout(r, 1000));
      
      setGenerating(`${platform}: Finalizing node sync...`);
      const success = await publishToPlatform(
        platform, 
        newLog.imageUrl, 
        captions[platform], 
        connection.accessToken,
        connection.clientId,
        connection.clientSecret
      );
      
      newLog.platforms[platform] = success ? 'success' : 'failed';
    }

    setLogs([newLog, ...logs]);
    setGenerating(null);
    setShareFeedback("Broadcast Cycle Complete!");
    setTimeout(() => setShareFeedback(null), 3000);
  };

  const handleSharePost = async () => {
    if (!selectedPost) return;
    const captionText = captions ? captions[Platform.FACEBOOK] : `${selectedPost.title}\n\nSource: ${selectedPost.link}`;
    const shareData: any = {
      title: 'News Broadcast: ' + selectedPost.title,
      text: captionText,
      url: selectedPost.link,
    };
    try {
      const nav = window.navigator as any;
      if (nav && nav.share) {
        if (exportedImageUrl) {
          const res = await fetch(exportedImageUrl);
          const blob = await res.blob();
          const file = new File([blob], 'broadcast.png', { type: 'image/png' });
          if (nav.canShare && nav.canShare({ files: [file] })) shareData.files = [file];
        }
        await nav.share(shareData);
        setShareFeedback("Shared!");
      } else {
        await navigator.clipboard.writeText(`${captionText}\n\n${selectedPost.link}`);
        setShareFeedback("Copied!");
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setShareFeedback("Share failed");
    }
    setTimeout(() => setShareFeedback(null), 3000);
  };

  if (!user) return <Login onLogin={setUser} />;

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && (
        <div className="space-y-6 lg:space-y-10 animate-in fade-in duration-700">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 lg:gap-6">
            {[
              { label: "Today's Live", value: stats.todayPosts, icon: Share2, color: "text-red-600", bg: "bg-red-50" },
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
                  <h2 className="font-black text-slate-900 text-xs uppercase tracking-widest flex items-center gap-2"><RefreshCw size={14} className="text-red-600" /> Dispatch Feed</h2>
                  <div className="relative">
                    <Search size={12} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input type="text" placeholder="Filter..." className="pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-[10px] outline-none" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-3 text-slate-300">
                      <Loader2 className="animate-spin" size={24} />
                      <p className="text-[10px] font-black uppercase tracking-widest">Injesting News...</p>
                    </div>
                  ) : posts.map(post => (
                    <button key={post.id} onClick={() => handlePostSelection(post)} className={`w-full text-left p-3 rounded-2xl transition-all border-2 flex gap-4 ${selectedPost?.id === post.id ? 'border-red-600 bg-red-50/30' : 'border-transparent hover:bg-slate-50'}`}>
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
                       <CanvasPreview post={selectedPost} template={settings.selectedTemplate} brandWebsite={settings.brandWebsite} logoUrl={settings.logoUrl} onExport={setExportedImageUrl} />
                       <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-3 opacity-0 group-hover:opacity-100 transition-all bg-white/95 shadow-2xl p-2 rounded-2xl border border-slate-100">
                          <button onClick={handleSharePost} className="px-6 py-3 bg-red-600 text-white rounded-xl hover:bg-red-700 transition-all flex items-center gap-2 font-black text-[10px] uppercase shadow-lg shadow-red-500/30"><Share size={14} /> {shareFeedback || 'Quick Share'}</button>
                       </div>
                    </div>

                    <div className="bg-slate-950 rounded-[2rem] p-6 text-white grid grid-cols-3 gap-3 border border-slate-800">
                        {['image', 'audio', 'video'].map(m => (
                          <button key={m} onClick={() => handleGenerateMedia(m as any)} className="flex flex-col items-center gap-2 p-4 bg-white/5 hover:bg-white/10 rounded-2xl transition-all relative group/btn disabled:opacity-50" disabled={!!generating}>
                             {m === 'image' ? <Eye size={18} /> : m === 'audio' ? <Music size={18} /> : <Video size={18} />}
                             <span className="text-[8px] font-black uppercase tracking-widest">{m} Asset</span>
                             {m === 'audio' && selectedPost.audioUrl && (
                                <div onClick={(e) => { e.stopPropagation(); playRawAudio(selectedPost.audioUrl!); }} className="absolute -top-1 -right-1 w-6 h-6 bg-red-600 rounded-full flex items-center justify-center shadow-lg cursor-pointer hover:scale-110 transition-transform"><Volume2 size={12} /></div>
                             )}
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
                        <div className="flex gap-2">
                           <button onClick={handleSharePost} className="p-2.5 bg-slate-50 text-slate-400 hover:text-red-600 rounded-xl transition-all border border-slate-100"><Share2 size={16} /></button>
                           <button onClick={handleGenerateAI} disabled={!!generating} className="px-5 py-2.5 bg-red-600 text-white rounded-xl font-black text-[10px] uppercase flex items-center gap-2 hover:bg-red-700 disabled:opacity-50 shadow-md">
                            {generating ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />} Optimize
                          </button>
                        </div>
                      </div>

                      {captions ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                           <div className="relative group/caption">
                             <textarea className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold leading-relaxed min-h-[160px] outline-none focus:border-red-500/30 transition-all resize-none" value={captions[Platform.FACEBOOK]} readOnly />
                             <button onClick={() => { navigator.clipboard.writeText(captions[Platform.FACEBOOK]); setIsCopied(true); setTimeout(() => setIsCopied(false), 2000); }} className="absolute top-4 right-4 p-2 bg-white rounded-lg shadow-sm opacity-0 group-hover/caption:opacity-100 transition-opacity border border-slate-100">
                               {isCopied ? <Check size={14} className="text-emerald-500" /> : <Copy size={14} className="text-slate-400" />}
                             </button>
                           </div>

                           <div className="flex flex-wrap gap-1.5">
                             {hashtags?.niche.slice(0, 6).map((h, i) => <span key={i} className="px-3 py-1 bg-red-50 text-red-600 rounded-lg text-[9px] font-black uppercase tracking-wider">#{h.replace(/\s+/g, '')}</span>)}
                           </div>
                           
                           <button onClick={handleBroadcast} disabled={!!generating} className="w-full py-5 bg-gradient-to-r from-red-600 to-red-800 text-white rounded-[1.5rem] font-black text-sm shadow-xl flex items-center justify-center gap-3 active:scale-95 transition-all hover:brightness-110 disabled:opacity-50">
                              <Share size={18} /> {generating ? generating : 'Deploy Live Signal'}
                           </button>
                           {shareFeedback && <p className="text-center text-[10px] font-black text-emerald-600 uppercase tracking-widest animate-bounce">{shareFeedback}</p>}
                        </div>
                      ) : (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-100 gap-4">
                          <div className="w-16 h-16 rounded-full bg-slate-50 flex items-center justify-center"><Sparkles size={32} className="opacity-10" /></div>
                          <p className="text-[10px] font-black uppercase tracking-widest text-slate-300">Awaiting AI Dispatch...</p>
                        </div>
                      )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {activeTab === 'calendar' && (
        <div className="space-y-8 animate-in fade-in duration-500">
           <div className="flex items-center justify-between">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter flex items-center gap-3">
                <Calendar className="text-red-600" /> Content Planner
              </h2>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-7 gap-4">
             {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(day => (
               <div key={day} className="bg-white p-6 rounded-[2rem] border border-slate-100 text-center">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{day}</span>
                  <div className="mt-4 h-32 flex items-center justify-center border-2 border-dashed border-slate-50 rounded-2xl">
                    <Zap size={14} className="text-slate-100" />
                  </div>
               </div>
             ))}
           </div>
           <div className="bg-white p-10 rounded-[3rem] border border-slate-100 text-center py-24">
             <div className="max-w-md mx-auto space-y-4">
                <h3 className="text-lg font-black text-slate-900 uppercase">Automation Queue Empty</h3>
                <p className="text-sm text-slate-500 font-medium">Schedule your news stories here to build a continuous content pulse.</p>
                <button onClick={() => setActiveTab('dashboard')} className="px-8 py-3 bg-slate-900 text-white rounded-2xl font-black text-xs uppercase tracking-widest">Start Crafting</button>
             </div>
           </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-4xl mx-auto space-y-10 animate-in fade-in slide-in-from-bottom-8">
           <div className="bg-white p-6 lg:p-10 rounded-[2rem] lg:rounded-[3rem] border border-slate-100 shadow-sm space-y-8">
              <h2 className="text-xl font-black text-slate-900 uppercase tracking-tighter">Enterprise Gateway</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                <div className="space-y-4">
                   <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">WordPress REST API</label><input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-red-500" value={settings.wordpressUrl} onChange={(e) => setSettings({ ...settings, wordpressUrl: e.target.value })} /></div>
                   <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Brand Handle</label><input type="text" className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-bold text-sm outline-none focus:border-red-500" value={settings.brandWebsite} onChange={(e) => setSettings({ ...settings, brandWebsite: e.target.value })} /></div>
                </div>
                <div className="space-y-4">
                  <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Global Branding Logo</label>
                    <div className="flex items-center gap-4">
                       <button onClick={() => logoInputRef.current?.click()} className="w-20 h-20 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center text-slate-400 hover:border-red-500 hover:text-red-500 transition-all group overflow-hidden">{settings.logoUrl ? <img src={settings.logoUrl} className="w-full h-full object-contain p-2" /> : <Upload size={20} />}<span className="text-[8px] font-black mt-1 uppercase">{settings.logoUrl ? 'Change' : 'Upload'}</span></button>
                    </div>
                    <input type="file" ref={logoInputRef} className="hidden" accept="image/png" onChange={handleLogoUpload} />
                  </div>
                  <div className="space-y-1.5"><label className="text-[10px] font-black text-slate-400 uppercase tracking-widest ml-1">Broadcast Template</label>
                    <select className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl font-black text-xs uppercase" value={settings.selectedTemplate} onChange={(e) => setSettings({ ...settings, selectedTemplate: e.target.value as TemplateType })}>{Object.values(TemplateType).map(t => <option key={t} value={t}>{t}</option>)}</select>
                  </div>
                </div>
              </div>
           </div>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-20">
              {[Platform.FACEBOOK, Platform.INSTAGRAM, Platform.TWITTER, Platform.LINKEDIN].map(p => (
                <ConnectionCard 
                  key={p} 
                  platform={p} 
                  connection={settings[getSettingsKey(p)]} 
                  onConnect={() => handleConnectAccount(p)} 
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
                    <span className="px-4 py-1.5 bg-red-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-lg shadow-red-200">{user.plan} Account</span>
                    <span className="px-4 py-1.5 bg-slate-100 text-slate-600 rounded-xl text-[10px] font-black uppercase tracking-widest">Active Member</span>
                  </div>
                </div>
                <button onClick={() => window.location.reload()} className="p-4 bg-slate-50 text-slate-400 hover:text-red-600 rounded-2xl transition-all border border-slate-100">
                  <LogOut size={24} />
                </button>
              </div>
           </div>

           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <ShieldCheck size={16} className="text-emerald-500" /> Security & Privacy
                </h3>
                <div className="space-y-4">
                   <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                     <div className="flex items-center gap-3">
                        <Lock size={18} className="text-slate-400" />
                        <span className="text-sm font-bold text-slate-700">Two-Factor Auth</span>
                     </div>
                     <div className="w-12 h-6 bg-emerald-500 rounded-full flex items-center px-1"><div className="w-4 h-4 bg-white rounded-full translate-x-6"></div></div>
                   </div>
                   <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl">
                     <div className="flex items-center gap-3">
                        <Mail size={18} className="text-slate-400" />
                        <span className="text-sm font-bold text-slate-700">Email Alerts</span>
                     </div>
                     <div className="w-12 h-6 bg-slate-200 rounded-full flex items-center px-1"><div className="w-4 h-4 bg-white rounded-full"></div></div>
                   </div>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm space-y-6">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                  <CreditCard size={16} className="text-red-600" /> Billing & Usage
                </h3>
                <div className="space-y-4">
                   <div className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-700">Next Invoice</span>
                      <span className="text-xs font-black text-slate-900 uppercase">Oct 12, 2024</span>
                   </div>
                   <button className="w-full py-3 bg-slate-900 text-white rounded-xl font-black text-[10px] uppercase tracking-widest hover:bg-black transition-all">Manage Subscription</button>
                </div>
              </div>
           </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-[2rem] lg:rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden animate-in fade-in slide-in-from-bottom-8">
          <table className="w-full text-left">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Broadcast Timestamp</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Story Title</th>
                <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-widest">Deployment Reach</th>
                <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Gateway</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logs.length === 0 ? (
                <tr><td colSpan={4} className="px-8 py-32 text-center"><History size={48} className="text-slate-100 mx-auto mb-4" /><p className="text-[10px] font-black text-slate-300 uppercase tracking-widest">Audit Logs Empty - Start Broadcasting</p></td></tr>
              ) : logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/30 transition-colors">
                  <td className="px-8 py-6">
                    <p className="text-[10px] font-black text-slate-900 uppercase">{new Date(log.timestamp).toLocaleDateString()}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase">{new Date(log.timestamp).toLocaleTimeString()}</p>
                  </td>
                  <td className="px-8 py-6"><p className="text-xs font-bold text-slate-900 truncate max-w-xs">{log.postTitle}</p></td>
                  <td className="px-8 py-6">
                    <div className="flex gap-1.5">
                      {Object.entries(log.platforms).map(([p, status], i) => (
                        <div key={i} className={`w-6 h-6 rounded-lg flex items-center justify-center text-white ${status === 'success' ? 'bg-emerald-500' : 'bg-red-500'} shadow-sm`} title={p}>
                          {status === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <div className="flex items-center gap-2 justify-end">
                      {log.platforms[Platform.TWITTER] === 'success' && <Key size={14} className="text-emerald-500" title="Signed with Enterprise Keys" />}
                      <button className="p-2.5 text-slate-300 hover:text-red-600 bg-slate-50 rounded-xl transition-all"><ExternalLink size={14} /></button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Layout>
  );
};

export default App;
