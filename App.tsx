
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Layout from './components/Layout';
import CanvasPreview from './components/CanvasPreview';
import Login from './components/Login';
import ConnectionCard from './components/ConnectionCard';
import { 
  WPPost, Platform, AppSettings, PublishLog, SystemStats, TemplateType,
  User, PerformanceScore, ContentVariations, BrandingConfig, ImageSource, AccountConnection
} from './types';
import { DEFAULT_SETTINGS } from './constants';
import { fetchRecentPosts } from './services/wordpress';
import { 
  generateSocialCaption, generateAudioBrief, generateVideoTeaser,
  predictPerformance, generatePostImage, generateHashtags, HashtagSet
} from './services/gemini';
import { publishToPlatform, fetchMetricsForPost } from './services/socialMedia';
import { 
  TrendingUp, Globe, RotateCw, Sparkles, Send, DollarSign, Facebook, Instagram, Twitter, Linkedin, Search, 
  Loader2, Image as ImageIcon, CheckCircle2, Mic, Video as VideoIcon, Activity, Upload, XCircle, Check, 
  ShieldCheck, Zap, BarChart2, Smile, Briefcase, Flame, Cpu, Palette, ArrowUpRight, Layout as LayoutIcon, 
  Hash, Copy, Plus, Trash2, Heart, Eye, Share2, ToggleLeft, ToggleRight, Paintbrush, Link as LinkIcon,
  History
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
    return { ...DEFAULT_SETTINGS, ...base };
  });
  
  const [logs, setLogs] = useState<PublishLog[]>(() => {
    const saved = localStorage.getItem('newsflow_logs');
    return saved ? JSON.parse(saved) : [];
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
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);
  const [videoStatus, setVideoStatus] = useState('');
  
  // Fix: Track mandatory API key selection status for Veo compliance
  const [hasApiKey, setHasApiKey] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fix: Check for selected API key on mount to satisfy Veo requirements
  useEffect(() => {
    const checkApiKey = async () => {
      const aistudio = (window as any).aistudio;
      if (aistudio) {
        const selected = await aistudio.hasSelectedApiKey();
        setHasApiKey(selected);
      } else {
        // Assume key is present or managed externally if not in AI Studio environment
        setHasApiKey(true);
      }
    };
    checkApiKey();
  }, []);

  useEffect(() => { if (currentUser) localStorage.setItem('newsflow_user', JSON.stringify(currentUser)); }, [currentUser]);
  useEffect(() => { localStorage.setItem('newsflow_settings', JSON.stringify(settings)); }, [settings]);
  useEffect(() => { localStorage.setItem('newsflow_logs', JSON.stringify(logs)); }, [logs]);

  const fetchDiscovery = useCallback(async (query?: string) => {
    if (isPolling) return;
    setIsPolling(true);
    const posts = await fetchRecentPosts(settings.wordpressUrl, 10, query);
    setDiscoveryFeed(posts);
    if (posts.length > 0 && !currentPost && !query) handleCompose(posts[0]);
    setIsPolling(false);
  }, [settings.wordpressUrl, currentPost, isPolling]);

  useEffect(() => { if (currentUser) fetchDiscovery(); }, [currentUser, fetchDiscovery]);

  const handleCompose = async (post: WPPost) => {
    setCurrentPost(post);
    setGeneratedImageUrl(null);
    setGeneratedVideoUrl(null);
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
    if (vars) setPerformanceScore(await predictPerformance(post.title, vars[selectedPlatform]));
  };

  const handlePublish = async () => {
    if (!currentPost || !variations) return;
    setIsPublishing(true);
    const success = await publishToPlatform(selectedPlatform, generatedImageUrl || currentPost.featuredImageUrl, variations[selectedPlatform], 'PRO_KEY');
    if (success) {
      setLogs(prev => [{ id: `log_${Date.now()}`, timestamp: new Date().toISOString(), postTitle: currentPost.title, caption: variations[selectedPlatform], platforms: { [selectedPlatform]: 'success' }, imageUrl: generatedImageUrl || currentPost.featuredImageUrl, metrics: { likes: 0, shares: 0, comments: 0, reach: 0 } }, ...prev]);
      alert(`Published to ${selectedPlatform}`);
    }
    setIsPublishing(false);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => setSettings(prev => ({ ...prev, logoUrl: reader.result as string }));
      reader.readAsDataURL(file);
    }
  };

  if (!currentUser) return <Login onLogin={setCurrentUser} />;

  // Fix: Mandatory API Key Selection screen before accessing the main app features
  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center p-8">
        <div className="bg-white p-12 rounded-[3.5rem] text-center max-w-lg shadow-2xl border border-slate-100">
          <div className="w-20 h-20 bg-indigo-600 rounded-3xl flex items-center justify-center mx-auto mb-8 shadow-xl shadow-indigo-200">
            <ShieldCheck size={40} className="text-white" />
          </div>
          <h2 className="text-3xl font-black text-slate-900 mb-4 tracking-tight">System Infrastructure</h2>
          <p className="text-slate-500 mb-10 font-medium leading-relaxed">
            To activate high-quality video generation (Veo) and premium AI assets, you must select a paid API key from your Google Cloud project.
          </p>
          <div className="mb-10 p-5 bg-indigo-50 rounded-2xl text-left border border-indigo-100">
            <p className="text-xs text-indigo-900 font-bold flex items-center gap-2">
              <Sparkles size={14} /> Requires billing enabled: 
              <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="underline ml-1">View Billing Docs</a>
            </p>
          </div>
          <button 
            onClick={async () => {
              const aistudio = (window as any).aistudio;
              if (aistudio) {
                await aistudio.openSelectKey();
                setHasApiKey(true); // Assume success per guidelines to avoid race condition
              }
            }}
            className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-2xl shadow-indigo-100 flex items-center justify-center gap-3"
          >
            Connect Paid API Key <ArrowUpRight size={20} />
          </button>
        </div>
      </div>
    );
  }

  const renderDashboard = () => (
    <div className="grid grid-cols-12 gap-8">
      <div className="col-span-12 grid grid-cols-1 md:grid-cols-4 gap-6">
        {[
          { label: 'Active Node Reach', value: '284k', icon: Activity, color: 'text-violet-500', bg: 'bg-violet-50' },
          { label: 'Cloud Distribution', value: logs.length.toString(), icon: Zap, color: 'text-indigo-500', bg: 'bg-indigo-50' },
          { label: 'AI Asset Pipeline', value: (logs.length * 3).toString(), icon: ImageIcon, color: 'text-emerald-500', bg: 'bg-emerald-50' },
          { label: 'Enterprise ROI', value: `$${(logs.length * 45).toLocaleString()}`, icon: DollarSign, color: 'text-blue-500', bg: 'bg-blue-50' },
        ].map((stat, i) => (
          <div key={i} className="bg-white/90 p-6 rounded-[2rem] border border-white shadow-xl flex items-center gap-5 glass-panel">
            <div className={`w-14 h-14 ${stat.bg} ${stat.color} rounded-2xl flex items-center justify-center shadow-inner`}><stat.icon size={24} /></div>
            <div><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{stat.label}</p><p className="text-2xl font-black text-slate-900 leading-none mt-1">{stat.value}</p></div>
          </div>
        ))}
      </div>

      <div className="col-span-12 lg:col-span-8 space-y-8">
        <div className="bg-white/90 rounded-[3rem] border border-white shadow-2xl overflow-hidden relative glass-panel">
          <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/20">
            <div className="flex items-center gap-4"><div className="w-12 h-12 bg-indigo-600 rounded-[1.25rem] flex items-center justify-center text-white shadow-xl animate-gradient"><Sparkles size={24} /></div><div><h2 className="text-xl font-black text-slate-900 tracking-tight">Creative Studio</h2><p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Production Hub</p></div></div>
          </div>
          <div className="p-10 relative">
            {(isGeneratingVideo || isGeneratingImage) && <div className="absolute inset-0 bg-white/95 backdrop-blur-xl flex flex-col items-center justify-center p-12 text-center gap-6 z-30 rounded-[3rem]"><Loader2 className="animate-spin text-indigo-600" size={64} /><h3 className="text-slate-900 font-black text-xl">{videoStatus || 'Connecting to Gemini Cloud...'}</h3></div>}
            {currentPost ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
                <div className="space-y-6">
                  <div className="flex bg-slate-100 p-1.5 rounded-2xl gap-1">
                    {[Platform.TWITTER, Platform.INSTAGRAM, Platform.FACEBOOK, Platform.LINKEDIN].map(p => (
                      <button key={p} onClick={() => setSelectedPlatform(p)} className={`flex-1 py-3 rounded-xl text-xs font-black transition-all flex items-center justify-center gap-2 ${selectedPlatform === p ? 'bg-white text-slate-900 shadow-lg' : 'text-slate-400'}`}>
                        {p === Platform.TWITTER && <Twitter size={14} />}{p === Platform.INSTAGRAM && <Instagram size={14} />}{p === Platform.FACEBOOK && <Facebook size={14} />}{p === Platform.LINKEDIN && <Linkedin size={14} />}
                      </button>
                    ))}
                  </div>
                  <textarea value={variations?.[selectedPlatform] || ""} onChange={(e) => setVariations(v => v ? {...v, [selectedPlatform]: e.target.value} : null)} className="w-full h-48 p-7 bg-slate-50 border-2 border-slate-100 rounded-[2.5rem] focus:border-indigo-400 outline-none text-sm leading-relaxed" />
                  <div className="p-6 bg-slate-50 border border-slate-200 rounded-[2.5rem] space-y-4">
                    <p className="text-[10px] font-black text-slate-900 uppercase tracking-widest flex items-center gap-2"><Hash size={16} /> Trending Tags</p>
                    <div className="flex flex-wrap gap-2">
                      {hashtags?.trending.map(t => <button key={t} className="px-3 py-1.5 bg-indigo-600 text-white text-[9px] font-black rounded-full">#{t}</button>)}
                    </div>
                  </div>
                  <button onClick={handlePublish} disabled={isPublishing || !variations} className="w-full bg-slate-900 text-white py-5 rounded-[2rem] font-black flex items-center justify-center gap-3 hover:bg-indigo-600 transition-all shadow-2xl active:scale-95 disabled:opacity-50">
                    {isPublishing ? <Loader2 className="animate-spin" size={20} /> : <Send size={20} />} Dispatch Post
                  </button>
                </div>
                <div className="space-y-6 flex flex-col">
                  <div className="bg-slate-50 p-4 rounded-[2.5rem] border border-slate-100 space-y-3">
                     <div className="flex items-center justify-between px-1"><p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Visual Style</p><button onClick={() => setSettings({...settings, branding: {...settings.branding, useCustomColors: !settings.branding.useCustomColors}})} className={`text-[9px] font-black flex items-center gap-1.5 ${settings.branding.useCustomColors ? 'text-indigo-600' : 'text-slate-400'}`}><Paintbrush size={12} /> Brand Sync</button></div>
                     <div className="grid grid-cols-4 gap-2">
                        {Object.values(TemplateType).map(t => <button key={t} onClick={() => setSettings({...settings, selectedTemplate: t})} className={`p-3 rounded-2xl border-2 transition-all ${settings.selectedTemplate === t ? 'border-indigo-500 bg-white' : 'border-slate-100 bg-slate-50'}`}><div className="w-full h-8 rounded-lg" style={{backgroundColor: settings.branding.useCustomColors ? settings.branding.primaryColor : '#4f46e5'}}></div></button>)}
                     </div>
                  </div>
                  {generatedVideoUrl ? <video src={generatedVideoUrl} controls autoPlay loop className="w-full aspect-square object-cover rounded-[2.5rem]" /> : <CanvasPreview post={{...currentPost, featuredImageUrl: generatedImageUrl || currentPost.featuredImageUrl}} template={settings.selectedTemplate} logoUrl={settings.logoUrl} branding={settings.branding} brandWebsite={settings.brandWebsite} />}
                  <div className="grid grid-cols-3 gap-3">
                    <button onClick={() => generateAudioBrief(currentPost.title).then(b => b && alert('Audio Ready'))} className="p-3 bg-indigo-50 rounded-2xl flex flex-col items-center gap-2"><Mic size={18} className="text-indigo-600" /><span className="text-[8px] font-black uppercase">Voice</span></button>
                    <button onClick={async () => { setVideoStatus('Rendering Cinematic Teaser...'); const v = await generateVideoTeaser(currentPost.title); setGeneratedVideoUrl(v); setVideoStatus(''); }} className="p-3 bg-violet-50 rounded-2xl flex flex-col items-center gap-2"><VideoIcon size={18} className="text-violet-600" /><span className="text-[8px] font-black uppercase">Video</span></button>
                    <button onClick={async () => { setIsGeneratingImage(true); const i = await generatePostImage(currentPost.title); setGeneratedImageUrl(i); setIsGeneratingImage(false); }} className="p-3 bg-emerald-50 rounded-2xl flex flex-col items-center gap-2"><ImageIcon size={18} className="text-emerald-600" /><span className="text-[8px] font-black uppercase">AI Art</span></button>
                  </div>
                </div>
              </div>
            ) : <div className="py-40 flex flex-col items-center text-slate-400 font-bold uppercase tracking-widest"><LayoutIcon size={64} className="opacity-20 mb-4" /> Select an Article</div>}
          </div>
        </div>
      </div>

      <div className="col-span-12 lg:col-span-4 flex flex-col space-y-6">
         <div className="bg-white/90 rounded-[3rem] border border-white shadow-2xl p-8 flex-1 flex flex-col glass-panel">
            <h3 className="font-black text-slate-900 text-lg mb-6 flex items-center gap-2"><Globe size={18} className="text-indigo-600" /> Article Feed</h3>
            <div className="relative mb-6"><Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchDiscovery(searchQuery)} placeholder="Search WordPress..." className="w-full pl-11 pr-4 py-3 bg-slate-50 border border-slate-100 rounded-2xl text-xs font-bold outline-none" /></div>
            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
               {discoveryFeed.map(post => <button key={post.id} onClick={() => handleCompose(post)} className={`w-full text-left p-4 rounded-[2rem] border-2 flex gap-4 items-center ${currentPost?.id === post.id ? 'border-indigo-500 bg-indigo-50/30' : 'border-slate-50'}`}><img src={post.featuredImageUrl} className="w-14 h-14 rounded-xl object-cover" /><div className="min-w-0"><h4 className="text-xs font-black text-slate-900 leading-tight line-clamp-2">{post.title}</h4></div></button>)}
            </div>
         </div>
      </div>
    </div>
  );

  const renderSettings = () => (
    <div className="grid grid-cols-12 gap-10">
      <div className="col-span-12 lg:col-span-8 space-y-10">
        <section className="bg-white p-10 rounded-[3rem] shadow-2xl glass-panel space-y-8">
           <h3 className="text-xl font-black text-slate-900 border-b border-slate-100 pb-6 flex items-center gap-3"><Globe className="text-indigo-600" /> Infrastructure</h3>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-2"><p className="text-xs font-black text-slate-500 uppercase tracking-widest">Source URL</p><input type="text" value={settings.wordpressUrl} onChange={(e) => setSettings({...settings, wordpressUrl: e.target.value})} className="w-full px-6 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm" /></div>
              <div className="space-y-2"><p className="text-xs font-black text-slate-500 uppercase tracking-widest">Handle (Lower Third)</p><div className="relative"><LinkIcon className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={16} /><input type="text" value={settings.brandWebsite} onChange={(e) => setSettings({...settings, brandWebsite: e.target.value})} className="w-full pl-11 pr-4 py-4 bg-slate-50 border border-slate-200 rounded-2xl text-sm" /></div></div>
           </div>
        </section>
        <section className="bg-white p-8 rounded-[3rem] shadow-2xl glass-panel space-y-6">
           <h3 className="text-xl font-black text-slate-900 flex items-center gap-3"><Palette className="text-indigo-600" /> Brand Identity</h3>
           <div className="space-y-6 pt-4 border-t border-slate-100">
              <div className="space-y-2"><p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Brand Mark (Transparent PNG)</p><input type="file" ref={fileInputRef} onChange={handleLogoUpload} className="hidden" accept="image/png" /><button onClick={() => fileInputRef.current?.click()} className="w-full py-6 bg-slate-50 border-2 border-dashed border-slate-200 rounded-2xl flex flex-col items-center justify-center gap-2">{settings.logoUrl ? <img src={settings.logoUrl} className="h-10 object-contain" /> : <><Upload size={20} className="text-slate-300" /><span className="text-[9px] font-black text-slate-400 uppercase">Upload PNG</span></>}</button></div>
              <div className="flex-1 space-y-1.5"><p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Primary Accent</p><div className="flex items-center gap-3"><input type="color" value={settings.branding.primaryColor} onChange={(e) => setSettings({...settings, branding: {...settings.branding, primaryColor: e.target.value}})} className="w-10 h-10 rounded-lg cursor-pointer bg-transparent border-none" /><span className="text-xs font-mono font-bold uppercase">{settings.branding.primaryColor}</span></div></div>
           </div>
        </section>
      </div>
    </div>
  );

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && renderDashboard()}
      {activeTab === 'settings' && renderSettings()}
      {/* Fix: History icon is now imported explicitly to resolve naming conflict with global History interface */}
      {activeTab === 'history' && <div className="animate-in fade-in py-20 text-center"><History size={64} className="mx-auto text-slate-200 mb-6" /><h2 className="text-xl font-black text-slate-400 uppercase">Audit Logs Coming Soon</h2></div>}
    </Layout>
  );
};

export default App;
