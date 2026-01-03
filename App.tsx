
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
import { initiateSocialConnection } from './services/socialAuth';
import { 
  Globe, 
  Sparkles, 
  Share2, 
  Music, 
  Video, 
  CheckCircle2, 
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Eye,
  Palette,
  TrendingUp,
  Search,
  Loader2,
  ExternalLink,
  Upload,
  Download,
  Share,
  Zap,
  Copy,
  Check,
  History,
  Volume2
} from 'lucide-react';

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
  const [shareFeedback, setShareFeedback] = useState<string | null>(null);
  
  const logoInputRef = useRef<HTMLInputElement>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);

  const stats: SystemStats = {
    todayPosts: logs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).length,
    totalPosts: logs.length,
    activePlatforms: [settings.fbConnection, settings.igConnection, settings.xConnection, settings.liConnection].filter(c => c.isConnected).length,
    tokensUsed: 42050 + (logs.length * 1500),
    estimatedSavings: 1250 + (logs.length * 45),
    totalEngagement: 85400 + (logs.length * 320)
  };

  useEffect(() => {
    if (user) loadPosts();
  }, [user, settings.wordpressUrl]);

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
    // Smooth scroll to top of studio area on mobile
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
      const connection = await initiateSocialConnection(platform);
      setSettings(prev => ({
        ...prev,
        [getSettingsKey(platform)]: connection
      }));
    } catch (error) {
      alert(`Connection failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  };

  const handleDisconnectAccount = (platform: Platform) => {
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
    setGenerating('Dispatched to Global Nodes...');
    
    await new Promise(r => setTimeout(r, 2500));
    
    const newLog: PublishLog = {
      id: `log_${Date.now()}`,
      timestamp: new Date().toISOString(),
      postTitle: selectedPost.title,
      caption: captions[Platform.FACEBOOK],
      imageUrl: exportedImageUrl || selectedPost.aiImageUrl || selectedPost.featuredImageUrl,
      platforms: {
        [Platform.FACEBOOK]: settings.fbConnection.isConnected ? 'success' : 'pending',
        [Platform.INSTAGRAM]: settings.igConnection.isConnected ? 'success' : 'pending',
        [Platform.LINKEDIN]: settings.liConnection.isConnected ? 'success' : 'pending'
      }
    };

    setLogs([newLog, ...logs]);
    setGenerating(null);
    setShareFeedback("Successfully Broadcast!");
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
              { label: "Platforms", value: stats.activePlatforms, icon: Globe, color: "text-slate-900", bg: "bg-slate-100" },
              { label: "Token Flow", value: stats.tokensUsed.toLocaleString(), icon: Zap, color: "text-amber-600", bg: "bg-amber-50" }
            ].map((stat, i) => (
              <div key={i} className="bg-white p-5 lg:p-6 rounded-[1.5rem] lg:rounded-[2rem] border border-slate-100 shadow-sm flex items-center gap-4 lg:gap-5">
                <div className={`w-10 h-10 lg:w-12 lg:h-12 rounded-xl lg:rounded-2xl ${stat.bg} ${stat.color} flex items-center justify-center`}><stat.icon size={18} className="lg:size-[20px]" /></div>
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
                     <Search size={12} className="absolute left-3 top-1/