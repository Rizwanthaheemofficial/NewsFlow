
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
import { publishToPlatform } from './services/socialMedia';
import { initiateSocialConnection } from './services/socialAuth';
import { 
  Globe, 
  Sparkles, 
  Share2, 
  BarChart3, 
  Music, 
  Video, 
  CheckCircle2, 
  AlertCircle,
  Clock,
  ArrowRight,
  RefreshCw,
  Eye,
  Palette,
  TrendingUp,
  Search,
  Loader2,
  ExternalLink,
  Upload,
  X,
  Download,
  Share,
  WifiOff,
  Zap,
  Copy,
  Check
} from 'lucide-react';

/**
 * Main Application Component
 * Orchestrates the dashboard, AI generation, and social publishing.
 */
const App: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
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
  
  const logoInputRef = useRef<HTMLInputElement>(null);

  // System Stats Calculation
  const stats: SystemStats = {
    todayPosts: logs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).length,
    totalPosts: logs.length,
    activePlatforms: [settings.fbConnection, settings.igConnection, settings.xConnection, settings.liConnection].filter(c => c.isConnected).length,
    tokensUsed: 42050 + (logs.length * 1500),
    estimatedSavings: 1250 + (logs.length * 45),
    totalEngagement: 85400 + (logs.length * 320)
  };

  useEffect(() => {
    if (user) {
      loadPosts();
    }
  }, [user, settings.wordpressUrl]);

  const loadPosts = async () => {
    setLoading(true);
    const fetched = await fetchRecentPosts(settings.wordpressUrl, 8, searchQuery);
    setPosts(fetched);
    setLoading(false);
  };

  const handlePostSelection = (post: WPPost) => {
    setSelectedPost(post);
    setCaptions(null);
    setHashtags(null);
    setScore(null);
    setExportedImageUrl(null);
  };

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'image/png') {
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64 = event.target?.result as string;
        setSettings({ ...settings, logoUrl: base64 });
      };
      reader.readAsDataURL(file);
    } else if (file) {
      alert("Please upload a PNG file for the logo.");
    }
  };

  const handleGenerateAI = async () => {
    if (!selectedPost) return;
    setGenerating('Processing Catchy AI Content...');
    try {
      const brandName = settings.brandWebsite || 'NewsFlow';
      const [newCaptions, newHashtags, visualData] = await Promise.all([
        generateSocialCaption(selectedPost.title, selectedPost.excerpt || '', selectedPost.link, settings.aiConfig),
        generateHashtags(selectedPost.title, selectedPost.excerpt || '', brandName),
        generateVisualHeadline(selectedPost.title, selectedPost.excerpt || '')
      ]);

      // Update the selected post with visual headline data
      setSelectedPost({
        ...selectedPost,
        visualHeadline: visualData.headline,
        highlightWords: visualData.highlights
      });

      const brandClean = brandName.replace(/[^a-zA-Z0-9]/g, '');
      const brandTag = `#${brandClean.charAt(0).toUpperCase() + brandClean.slice(1).toLowerCase()}`;
      
      const hashtagPool = [
        brandTag,
        ...newHashtags.niche.slice(0, 3).map(h => h.startsWith('#') ? h : `#${h.replace(/\s+/g, '')}`),
        ...newHashtags.broad.slice(0, 2).map(h => h.startsWith('#') ? h : `#${h.replace(/\s+/g, '')}`),
        ...newHashtags.trending.slice(0, 2).map(h => h.startsWith('#') ? h : `#${h.replace(/\s+/g, '')}`)
      ];
      const hashtagString = Array.from(new Set(hashtagPool.filter(h => h.length > 1))).join(' ');

      const enrichedCaptions: ContentVariations = {
        [Platform.FACEBOOK]: `${newCaptions[Platform.FACEBOOK]}\n\n${hashtagString}`,
        [Platform.INSTAGRAM]: `${newCaptions[Platform.INSTAGRAM]}\n\n${hashtagString}`,
        [Platform.TWITTER]: `${newCaptions[Platform.TWITTER]}\n\n${hashtagString}`,
        [Platform.LINKEDIN]: `${newCaptions[Platform.LINKEDIN]}\n\n${hashtagString}`,
      };

      setCaptions(enrichedCaptions);
      setHashtags(newHashtags);
      
      const newScore = await predictPerformance(selectedPost.title, enrichedCaptions[Platform.FACEBOOK]);
      setScore(newScore);
    } catch (e) {
      console.error('AI Generation Error:', e);
    } finally {
      setGenerating(null);
    }
  };

  const handleGenerateMedia = async (type: 'image' | 'audio' | 'video') => {
    if (!selectedPost) return;

    // Data Saving confirmation for heavy assets
    if (settings.dataSavingMode && (type === 'video' || type === 'audio')) {
      if (!confirm(`Data Saving Mode is active. Generating ${type} consumes significant bandwidth. Continue?`)) return;
    }

    setGenerating(`Generating ${type}...`);
    try {
      if (type === 'image') {
        const url = await generatePostImage(selectedPost.title);
        if (url) setSelectedPost({ ...selectedPost, aiImageUrl: url });
      } else if (type === 'audio') {
        const data = await generateAudioBrief(selectedPost.title + ". " + selectedPost.excerpt);
        if (data) setSelectedPost({ ...selectedPost, audioUrl: `data:audio/pcm;base64,${data}` });
      } else if (type === 'video') {
        if (!(await (window as any).aistudio.hasSelectedApiKey())) {
          await (window as any).aistudio.openSelectKey();
        }
        const url = await generateVideoTeaser(selectedPost.title, (msg) => setGenerating(msg));
        if (url) setSelectedPost({ ...selectedPost, videoUrl: url });
      }
    } catch (e) {
      console.error(`${type} Generation Error:`, e);
    } finally {
      setGenerating(null);
    }
  };

  const handleDownloadImage = () => {
    if (!exportedImageUrl) return;
    const link = document.createElement('a');
    link.download = `worldnews-broadcast-${Date.now()}.png`;
    link.href = exportedImageUrl;
    link.click();
  };

  const handleCopyCaption = async () => {
    if (!captions) return;
    const textToCopy = `${captions[Platform.FACEBOOK]}\n\nSource: ${selectedPost?.link}`;
    await navigator.clipboard.writeText(textToCopy);
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 2000);
  };

  const handleSharePost = async () => {
    if (!selectedPost) {
      alert("Please select a post first.");
      return;
    }

    const captionText = captions ? captions[Platform.FACEBOOK] : `${selectedPost.title}\n\nRead more at: ${selectedPost.link}`;
    
    // Preparation of share data
    const shareData: any = {
      title: 'World News Today Live - Broadcast',
      text: captionText,
      url: selectedPost.link,
    };

    try {
      // Check for Native Web Share API
      if (navigator.share) {
        // Prepare image file if canvas export is available
        if (exportedImageUrl) {
          const res = await fetch(exportedImageUrl);
          const blob = await res.blob();
          const file = new File([blob], 'broadcast.png', { type: 'image/png' });
          
          // Check if file sharing is specifically supported
          if (navigator.canShare && navigator.canShare({ files: [file] })) {
            shareData.files = [file];
          }
        }
        
        await navigator.share(shareData);
      } else {
        // Fallback: Clipboard
        await handleCopyCaption();
        alert("Native sharing not supported on this browser. Headline, link and hashtags have been copied to your clipboard!");
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error("Sharing failed:", err);
        // Secondary Fallback
        await handleCopyCaption();
        alert("Sharing failed. Content has been copied to your clipboard instead.");
      }
    }
  };

  const handlePublish = async () => {
    if (!selectedPost || !captions) return;
    setGenerating('Broadcasting to connected platforms...');
    
    const platforms: Platform[] = [Platform.FACEBOOK, Platform.INSTAGRAM, Platform.TWITTER, Platform.LINKEDIN];
    const publishResults: Record<string, 'success' | 'failed' | 'pending'> = {};
    
    for (const p of platforms) {
      const connection = p === Platform.FACEBOOK ? settings.fbConnection :
                         p === Platform.INSTAGRAM ? settings.igConnection :
                         p === Platform.TWITTER ? settings.xConnection : settings.liConnection;
      
      if (connection.isConnected) {
        const success = await publishToPlatform(p, selectedPost.aiImageUrl || selectedPost.featuredImageUrl, captions[p], connection.accessToken);
        publishResults[p] = success ? 'success' : 'failed';
      }
    }

    const newLog: PublishLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      postTitle: selectedPost.title,
      caption: captions[Platform.FACEBOOK],
      platforms: publishResults as any,
      imageUrl: selectedPost.aiImageUrl || selectedPost.featuredImageUrl,
      audioUrl: selectedPost.audioUrl,
      videoUrl: selectedPost.videoUrl
    };

    setLogs([newLog, ...logs]);
    setGenerating(null);
    alert('Publishing sequence completed.');
  };

  const connectPlatform = async (platform: Platform) => {
    try {
      const connection = await initiateSocialConnection(platform);
      const key = platform === Platform.FACEBOOK ? 'fbConnection' :
                  platform === Platform.INSTAGRAM ? 'igConnection' :
                  platform === Platform.TWITTER ? 'xConnection' : 'liConnection';
      setSettings({ ...settings, [key]: connection });
    } catch (e: any) {
      alert(e.message);
    }
  };

  if (!user) return <Login onLogin={setUser} />;

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && (
        <div className="space-y-10">
          {/* Header Stats */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { label: "Today's Broadcasts", value: stats.todayPosts, icon: Share2, color: "text-indigo-600", bg: "bg-indigo-50" },
              { label: "Active Channels", value: stats.activePlatforms, icon: Globe, color: "text-emerald-600", bg: "bg-emerald-50" },
              { label: "Est. Savings", value: `$${stats.estimatedSavings}`, icon: Sparkles, color: "text-amber-600", bg: "bg-amber-50" },
              { label: "Engagement Hub", value: (stats.totalEngagement / 1000).toFixed(1) + "k", icon: TrendingUp, color: "text-violet-600", bg: "bg-violet-50" }
            ].map((stat, i) => (
              <div key={i} className="bg-white p-6 rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-5">
                <div className={`w-14 h-14 rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center`}>
                  <stat.icon size={24} />
                </div>
                <div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">{stat.label}</p>
                  <p className="text-2xl font-black text-slate-900">{stat.value}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
            {/* Left Column: Feed */}
            <div className="lg:col-span-4 space-y-6">
              <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm overflow-hidden flex flex-col h-[800px]">
                <div className="p-6 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                  <h2 className="font-black text-slate-900 flex items-center gap-2">
                    <RefreshCw size={18} className="text-indigo-600" /> WP News Feed
                  </h2>
                  <div className="relative">
                     <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                     <input 
                       type="text" 
                       placeholder="Search posts..." 
                       className="pl-9 pr-3 py-2 bg-white border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-50 outline-none"
                       value={searchQuery}
                       onChange={(e) => setSearchQuery(e.target.value)}
                       onKeyDown={(e) => e.key === 'Enter' && loadPosts()}
                     />
                  </div>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-3 custom-scrollbar">
                  {loading ? (
                    <div className="flex flex-col items-center justify-center h-full gap-4 text-slate-400">
                      <Loader2 className="animate-spin" size={32} />
                      <p className="text-xs font-bold uppercase tracking-widest">Fetching Content...</p>
                    </div>
                  ) : posts.length === 0 ? (
                    <div className="text-center py-20 text-slate-400">
                      <Globe size={40} className="mx-auto mb-4 opacity-20" />
                      <p className="text-xs font-bold uppercase tracking-widest">No stories found</p>
                    </div>
                  ) : posts.map(post => {
                    const displayImage = (selectedPost?.id === post.id && selectedPost.aiImageUrl) 
                      ? selectedPost.aiImageUrl 
                      : post.featuredImageUrl;

                    return (
                      <button 
                        key={post.id}
                        onClick={() => handlePostSelection(post)}
                        className={`w-full text-left p-4 rounded-2xl transition-all border-2 flex gap-4 group ${selectedPost?.id === post.id ? 'border-indigo-600 bg-indigo-50/30' : 'border-transparent hover:bg-slate-50'}`}
                      >
                        <div className="w-20 h-20 rounded-xl overflow-hidden shrink-0 border border-slate-100 shadow-sm">
                          <img src={displayImage} alt="" className="w-full h-full object-cover group-hover:scale-110 transition-transform" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className={`text-sm font-bold leading-snug line-clamp-2 ${selectedPost?.id === post.id ? 'text-indigo-900' : 'text-slate-900'}`}>{post.title}</h3>
                          <div className="flex items-center gap-2 mt-2">
                             <Clock size={12} className="text-slate-400" />
                             <span className="text-[10px] font-bold text-slate-400 uppercase tracking-tighter">{new Date(post.date).toLocaleDateString()}</span>
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right Column: Studio */}
            <div className="lg:col-span-8 space-y-8">
              {!selectedPost ? (
                <div className="bg-white rounded-[3rem] border-4 border-dashed border-slate-200 h-[600px] flex flex-col items-center justify-center p-12 text-center">
                  <div className="w-24 h-24 bg-slate-50 rounded-[2rem] flex items-center justify-center mb-6 text-slate-300">
                    <Eye size={48} />
                  </div>
                  <h2 className="text-2xl font-black text-slate-900 mb-2">Ready to broadcast?</h2>
                  <p className="text-slate-500 max-w-xs font-medium">Select a story from your WordPress feed to start generating social assets.</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                  {/* Canvas & Media Controls */}
                  <div className="space-y-6">
                    <div className="bg-white p-4 rounded-[3rem] shadow-xl border border-slate-100 relative group">
                       <CanvasPreview 
                         post={selectedPost} 
                         template={settings.selectedTemplate}
                         wordpressUrl={settings.wordpressUrl}
                         brandWebsite={settings.brandWebsite}
                         branding={settings.branding}
                         logoUrl={settings.logoUrl}
                         onExport={setExportedImageUrl}
                         lowDataMode={settings.dataSavingMode}
                       />
                       
                       <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex gap-3 opacity-0 group-hover:opacity-100 transition-all duration-300 bg-white/90 backdrop-blur p-2 rounded-2xl border border-slate-200 shadow-2xl translate-y-2 group-hover:translate-y-0">
                          <button 
                            onClick={handleDownloadImage}
                            className="p-3 bg-slate-900 text-white rounded-xl hover:bg-slate-800 transition-colors flex items-center gap-2 font-bold text-xs"
                          >
                            <Download size={16} /> Save PNG
                          </button>
                          <button 
                            onClick={handleSharePost}
                            className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition-colors flex items-center gap-2 font-bold text-xs"
                          >
                            <Share size={16} /> Quick Share
                          </button>
                       </div>
                    </div>
                    
                    <div className="bg-slate-900 rounded-[2.5rem] p-6 text-white space-y-4 shadow-2xl">
                      <h3 className="text-sm font-black uppercase tracking-[0.2em] text-indigo-400 flex items-center gap-2">
                        <Palette size={16} /> Asset Generator
                      </h3>
                      <div className="grid grid-cols-3 gap-3">
                        <button onClick={() => handleGenerateMedia('image')} className="flex flex-col items-center gap-2 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all group">
                           <Eye size={20} className="group-hover:text-indigo-400" />
                           <span className="text-[10px] font-bold uppercase tracking-widest">AI Image</span>
                        </button>
                        <button onClick={() => handleGenerateMedia('audio')} className="flex flex-col items-center gap-2 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all group">
                           <Music size={20} className="group-hover:text-indigo-400" />
                           <span className="text-[10px] font-bold uppercase tracking-widest">Audio</span>
                        </button>
                        <button onClick={() => handleGenerateMedia('video')} className="flex flex-col items-center gap-2 p-4 bg-white/5 hover:bg-white/10 rounded-2xl border border-white/10 transition-all group">
                           <Video size={20} className="group-hover:text-indigo-400" />
                           <span className="text-[10px] font-bold uppercase tracking-widest">Teaser</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* AI Content & Publishing */}
                  <div className="space-y-6">
                    <div className="bg-white rounded-[2.5rem] border border-slate-100 shadow-sm p-8 space-y-6">
                      <div className="flex items-center justify-between">
                        <h2 className="text-xl font-black text-slate-900">AI Social Core</h2>
                        <button 
                          onClick={handleGenerateAI}
                          disabled={!!generating}
                          className="px-6 py-2.5 bg-indigo-600 text-white rounded-xl font-bold text-xs flex items-center gap-2 hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                        >
                          {generating ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
                          Magic Draft
                        </button>
                      </div>

                      {captions ? (
                        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                           <div className="space-y-2">
                              <div className="flex items-center justify-between">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Primary Caption</label>
                                <button 
                                  onClick={handleCopyCaption}
                                  className={`flex items-center gap-1.5 text-[10px] font-black uppercase tracking-tighter transition-all ${isCopied ? 'text-emerald-500' : 'text-indigo-600 hover:text-indigo-700'}`}
                                >
                                  {isCopied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy Text</>}
                                </button>
                              </div>
                              <textarea 
                                className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm font-medium leading-relaxed min-h-[120px] outline-none focus:border-indigo-500"
                                value={captions[Platform.FACEBOOK]} 
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setCaptions({
                                    [Platform.FACEBOOK]: val,
                                    [Platform.INSTAGRAM]: val,
                                    [Platform.TWITTER]: val,
                                    [Platform.LINKEDIN]: val
                                  });
                                }}
                              />
                              <p className="text-[9px] text-slate-400 font-bold uppercase tracking-tight">AI auto-appended brand and trending hashtags</p>
                           </div>

                           {hashtags && (
                             <div className="space-y-2">
                                <label className="text-[10px] font-black text-slate-400 uppercase tracking-widest">AI Hashtag Matrix</label>
                                <div className="flex flex-wrap gap-1.5">
                                  <span className="px-3 py-1 bg-indigo-600 text-white rounded-lg text-[10px] font-black">
                                    #{ (settings.brandWebsite || 'NewsFlow').replace(/[^a-zA-Z0-9]/g, '').toUpperCase()}
                                  </span>
                                  {hashtags.niche.concat(hashtags.trending).slice(0, 8).map((h, i) => (
                                    <span key={i} className="px-3 py-1 bg-indigo-50 text-indigo-600 rounded-lg text-[10px] font-bold">#{h}</span>
                                  ))}
                                </div>
                             </div>
                           )}

                           {score && (
                             <div className="p-5 bg-slate-900 rounded-3xl text-white">
                               <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-500 flex items-center justify-center font-black">
                                      {score.score}
                                    </div>
                                    <div>
                                      <p className="text-[10px] font-bold text-indigo-400 uppercase tracking-widest">Engagement Index</p>
                                      <p className="text-xs font-black">{score.label}</p>
                                    </div>
                                  </div>
                                  <button 
                                    onClick={handleSharePost}
                                    className="p-2.5 bg-white/10 hover:bg-white/20 rounded-xl transition-all"
                                    title="External Share"
                                  >
                                    <Share size={18} />
                                  </button>
                               </div>
                               <p className="text-[10px] text-white/60 leading-relaxed italic">"{score.reasoning[0]}"</p>
                             </div>
                           )}
                        </div>
                      ) : (
                        <div className="py-20 flex flex-col items-center justify-center text-slate-300 gap-4">
                           <Sparkles size={40} className="opacity-20" />
                           <p className="text-xs font-bold uppercase tracking-widest">Ready for AI Draft</p>
                        </div>
                      )}
                    </div>

                    <div className="flex flex-col gap-4">
                      <button 
                        onClick={handlePublish}
                        disabled={!captions || !!generating}
                        className="w-full py-6 bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-[2rem] font-black text-xl shadow-2xl shadow-indigo-100 flex items-center justify-center gap-4 hover:scale-[1.02] transition-all disabled:opacity-50 disabled:scale-100"
                      >
                        {generating ? (
                          <>
                            <Loader2 className="animate-spin" />
                            <span className="text-base uppercase tracking-widest">{generating}</span>
                          </>
                        ) : (
                          <>
                            Broadcast Live
                            <ArrowRight size={24} />
                          </>
                        )}
                      </button>
                      
                      {captions && (
                         <button 
                          onClick={handleSharePost}
                          className="w-full py-4 bg-white border-2 border-slate-100 text-slate-900 rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-2 hover:bg-slate-50 transition-all active:scale-95"
                        >
                          <Share2 size={18} className="text-indigo-600" />
                          Share Externally
                        </button>
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
        <div className="max-w-5xl mx-auto space-y-10 pb-40">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-8">
              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                  <Globe className="text-indigo-600" /> CMS Integration
                </h3>
                <div className="space-y-4">
                   <div className="space-y-1.5">
                     <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">WordPress URL</label>
                     <input 
                       type="text" 
                       className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 outline-none font-bold"
                       value={settings.wordpressUrl}
                       onChange={(e) => setSettings({ ...settings, wordpressUrl: e.target.value })}
                     />
                   </div>
                   <div className="space-y-1.5">
                     <label className="text-xs font-black text-slate-500 uppercase tracking-widest ml-1">Brand Name / URL</label>
                     <input 
                       type="text" 
                       className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl focus:ring-4 focus:ring-indigo-50 outline-none font-bold"
                       value={settings.brandWebsite}
                       onChange={(e) => setSettings({ ...settings, brandWebsite: e.target.value })}
                     />
                   </div>
                   <button onClick={loadPosts} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-800 transition-all">
                     <RefreshCw size={18} /> Refresh Feed
                   </button>
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm">
                <h3 className="text-xl font-black text-slate-900 mb-6 flex items-center gap-3">
                  <Palette className="text-indigo-600" /> Branding & Optimization
                </h3>
                <div className="space-y-6">
                  {/* Data Saving Option */}
                  <div className={`p-5 rounded-2xl border-2 transition-all ${settings.dataSavingMode ? 'bg-amber-50 border-amber-200' : 'bg-slate-50 border-slate-100'}`}>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                         <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${settings.dataSavingMode ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'}`}>
                           {settings.dataSavingMode ? <WifiOff size={20} /> : <Zap size={20} />}
                         </div>
                         <div>
                           <p className="text-xs font-black text-slate-900 uppercase tracking-widest">Data Saving Mode</p>
                           <p className="text-[10px] font-bold text-slate-400">Reduce quality to save bandwidth</p>
                         </div>
                      </div>
                      <button 
                        onClick={() => setSettings({ ...settings, dataSavingMode: !settings.dataSavingMode })}
                        className={`w-12 h-6 rounded-full relative transition-all ${settings.dataSavingMode ? 'bg-amber-500' : 'bg-slate-300'}`}
                      >
                         <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${settings.dataSavingMode ? 'right-1' : 'left-1'}`} />
                      </button>
                    </div>
                  </div>

                  {/* Custom Logo Upload Section */}
                  <div className="space-y-2">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Brand Mark (PNG only)</label>
                    <div className="flex items-center gap-4">
                      {settings.logoUrl ? (
                        <div className="relative group">
                          <img src={settings.logoUrl} alt="Custom Logo" className="w-20 h-20 object-contain rounded-xl bg-slate-50 border border-slate-200 p-2" />
                          <button 
                            onClick={() => setSettings({ ...settings, logoUrl: '' })}
                            className="absolute -top-2 -right-2 w-6 h-6 bg-rose-500 text-white rounded-full flex items-center justify-center shadow-lg hover:bg-rose-600 transition-colors"
                          >
                            <X size={12} />
                          </button>
                        </div>
                      ) : (
                        <button 
                          onClick={() => logoInputRef.current?.click()}
                          className="w-20 h-20 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center text-slate-400 hover:border-indigo-400 hover:text-indigo-400 transition-all bg-slate-50"
                        >
                          <Upload size={20} />
                          <span className="text-[8px] font-black mt-1">UPLOAD</span>
                        </button>
                      )}
                      <div className="flex-1">
                        <p className="text-xs font-bold text-slate-900">Custom Workspace Logo</p>
                        <p className="text-[10px] text-slate-400 leading-tight">Recommended: Transparent PNG, 512x512px. This will replace the default NewsFlow branding on all generated canvases.</p>
                      </div>
                    </div>
                    <input 
                      type="file" 
                      ref={logoInputRef} 
                      className="hidden" 
                      accept="image/png" 
                      onChange={handleLogoUpload} 
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                     <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Primary Color</label>
                        <input 
                          type="color" 
                          className="w-full h-14 p-1 rounded-xl cursor-pointer bg-slate-50 border border-slate-200"
                          value={settings.branding.primaryColor}
                          onChange={(e) => setSettings({ ...settings, branding: { ...settings.branding, primaryColor: e.target.value, useCustomColors: true } })}
                        />
                     </div>
                     <div className="space-y-1.5">
                        <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Accent Color</label>
                        <input 
                          type="color" 
                          className="w-full h-14 p-1 rounded-xl cursor-pointer bg-slate-50 border border-slate-200"
                          value={settings.branding.accentColor}
                          onChange={(e) => setSettings({ ...settings, branding: { ...settings.branding, accentColor: e.target.value, useCustomColors: true } })}
                        />
                     </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-xs font-black text-slate-500 uppercase tracking-widest">Creative Template</label>
                    <select 
                      className="w-full px-5 py-4 bg-slate-50 border border-slate-200 rounded-2xl outline-none font-bold appearance-none shadow-sm"
                      value={settings.selectedTemplate}
                      onChange={(e) => setSettings({ ...settings, selectedTemplate: e.target.value as TemplateType })}
                    >
                      {Object.values(TemplateType).map(t => <option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest flex items-center gap-2 mb-2">
                <Share2 size={16} /> Social Connections
              </h3>
              <div className="grid grid-cols-1 gap-4">
                <ConnectionCard 
                  platform={Platform.FACEBOOK} 
                  connection={settings.fbConnection} 
                  onConnect={() => connectPlatform(Platform.FACEBOOK)}
                  onDisconnect={() => setSettings({ ...settings, fbConnection: { isConnected: false } })}
                />
                <ConnectionCard 
                  platform={Platform.INSTAGRAM} 
                  connection={settings.igConnection} 
                  onConnect={() => connectPlatform(Platform.INSTAGRAM)}
                  onDisconnect={() => setSettings({ ...settings, igConnection: { isConnected: false } })}
                />
                <ConnectionCard 
                  platform={Platform.TWITTER} 
                  connection={settings.xConnection} 
                  onConnect={() => connectPlatform(Platform.TWITTER)}
                  onDisconnect={() => setSettings({ ...settings, xConnection: { isConnected: false } })}
                />
                <ConnectionCard 
                  platform={Platform.LINKEDIN} 
                  connection={settings.liConnection} 
                  onConnect={() => connectPlatform(Platform.LINKEDIN)}
                  onDisconnect={() => setSettings({ ...settings, liConnection: { isConnected: false } })}
                />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-[3rem] border border-slate-100 shadow-sm overflow-hidden">
          <table className="w-full">
            <thead className="bg-slate-50 border-b border-slate-100">
              <tr>
                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Date</th>
                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Story</th>
                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Status</th>
                <th className="px-8 py-6 text-left text-[10px] font-black text-slate-400 uppercase tracking-widest">Media</th>
                <th className="px-8 py-6 text-right text-[10px] font-black text-slate-400 uppercase tracking-widest">Links</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-8 py-32 text-center">
                    <div className="flex flex-col items-center gap-4 text-slate-300">
                       <Clock size={48} />
                       <p className="text-sm font-bold uppercase tracking-widest">No broadcast history</p>
                    </div>
                  </td>
                </tr>
              ) : logs.map(log => (
                <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="px-8 py-6">
                    <p className="text-xs font-black text-slate-900">{new Date(log.timestamp).toLocaleDateString()}</p>
                    <p className="text-[10px] text-slate-400 font-bold">{new Date(log.timestamp).toLocaleTimeString()}</p>
                  </td>
                  <td className="px-8 py-6 max-w-xs">
                    <p className="text-sm font-bold text-slate-900 truncate">{log.postTitle}</p>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex gap-1.5">
                      {Object.entries(log.platforms).map(([p, status]) => (
                        <div key={p} className={`w-6 h-6 rounded-lg flex items-center justify-center text-white ${status === 'success' ? 'bg-emerald-500' : 'bg-red-500'}`} title={p}>
                           {status === 'success' ? <CheckCircle2 size={12} /> : <AlertCircle size={12} />}
                        </div>
                      ))}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex gap-2">
                       {log.imageUrl && <Eye size={14} className="text-slate-400" title="Image Generated" />}
                       {log.audioUrl && <Music size={14} className="text-slate-400" title="Audio Brief" />}
                       {log.videoUrl && <Video size={14} className="text-slate-400" title="Video Teaser" />}
                    </div>
                  </td>
                  <td className="px-8 py-6 text-right">
                    <button className="p-2 text-indigo-600 hover:bg-indigo-50 rounded-lg">
                      <ExternalLink size={16} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {activeTab === 'account' && (
        <div className="max-w-2xl mx-auto py-20 text-center animate-in zoom-in-95">
           <div className="relative inline-block mb-10">
              <img src={user?.avatar} className="w-48 h-48 rounded-[4rem] border-[12px] border-white shadow-2xl" alt="" />
              <div className="absolute -bottom-2 -right-2 w-12 h-12 bg-emerald-500 rounded-2xl flex items-center justify-center text-white shadow-xl border-4 border-white"><CheckCircle2 size={24} /></div>
           </div>
           <h2 className="text-5xl font-black text-slate-900 tracking-tighter mb-4">{user?.name}</h2>
           <p className="text-slate-400 font-bold mb-16">{user?.email} • {user?.plan} Plan</p>
           <button onClick={() => setUser(null)} className="w-full py-5 bg-rose-50 text-rose-600 rounded-[2rem] font-black text-lg hover:bg-rose-100 transition-all border border-rose-100 shadow-xl active:scale-95">Sign Out</button>
        </div>
      )}
    </Layout>
  );
};

export default App;
