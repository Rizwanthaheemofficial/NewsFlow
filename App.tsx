import React, { useState, useEffect, useCallback, useRef } from 'react';
import Layout from './components/Layout';
import CanvasPreview from './components/CanvasPreview';
import { 
  WPPost, 
  Platform, 
  AppSettings, 
  PublishLog, 
  SystemStats, 
  TemplateType,
  ImageSource
} from './types';
import { DEFAULT_SETTINGS, TEMPLATE_CONFIGS, PLACEHOLDER_POST, APP_LOGO_BASE64 } from './constants';
import { fetchLatestPost, testWPConnection } from './services/wordpress';
import { generateSocialCaption, generatePostImage } from './services/gemini';
import { publishToPlatform } from './services/socialMedia';
import { 
  TrendingUp, 
  Activity, 
  Globe, 
  Server, 
  RotateCw,
  Play,
  Settings as SettingsIcon,
  Trash2,
  ArrowRightLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  Image as ImageIcon,
  Link as LinkIcon,
  AlertCircle,
  MessageSquareQuote,
  Layout as LayoutIcon,
  Monitor,
  Newspaper,
  HelpCircle,
  Upload,
  X
} from 'lucide-react';

const App: React.FC = () => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [settings, setSettings] = useState<AppSettings>(() => {
    const saved = localStorage.getItem('newsflow_settings');
    return saved ? JSON.parse(saved) : DEFAULT_SETTINGS;
  });
  
  const [logs, setLogs] = useState<PublishLog[]>(() => {
    const saved = localStorage.getItem('newsflow_logs');
    return saved ? JSON.parse(saved) : [];
  });

  const [currentPost, setCurrentPost] = useState<WPPost | null>(null);
  const [currentCaption, setCurrentCaption] = useState<string>('');
  const [isPolling, setIsPolling] = useState(false);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [isGeneratingCaption, setIsGeneratingCaption] = useState(false);
  const [lastProcessedId, setLastProcessedId] = useState<number | null>(() => {
    const saved = localStorage.getItem('newsflow_last_id');
    return saved ? parseInt(saved) : null;
  });
  const [generatedImageUrl, setGeneratedImageUrl] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<{ testing: boolean; message: string | null; success: boolean | null }>({
    testing: false,
    message: null,
    success: null
  });
  
  const [countdown, setCountdown] = useState(60);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const stats: SystemStats = {
    todayPosts: logs.filter(l => new Date(l.timestamp).toDateString() === new Date().toDateString()).length,
    totalPosts: logs.length,
    activePlatforms: 3,
    uptime: '14 days'
  };

  // Persist settings
  useEffect(() => {
    localStorage.setItem('newsflow_settings', JSON.stringify(settings));
  }, [settings]);

  // Persist logs
  useEffect(() => {
    localStorage.setItem('newsflow_logs', JSON.stringify(logs));
  }, [logs]);

  // Persist last processed ID
  useEffect(() => {
    if (lastProcessedId !== null) {
      localStorage.setItem('newsflow_last_id', lastProcessedId.toString());
    }
  }, [lastProcessedId]);

  const triggerAutomation = useCallback(async (manual = false) => {
    if (isPolling) return;
    setIsPolling(true);
    setCountdown(60);
    
    try {
      const post = await fetchLatestPost(settings.wordpressUrl);
      if (post) {
        const isNew = post.id !== lastProcessedId;
        
        if (isNew || manual) {
          if (settings.imageSource === ImageSource.AI_GENERATED) {
            setIsGeneratingImage(true);
            const aiImg = await generatePostImage(post.title);
            if (aiImg) post.aiImageUrl = aiImg;
            setIsGeneratingImage(false);
          }

          setIsGeneratingCaption(true);
          const aiCaption = await generateSocialCaption(post.title);
          const finalCaption = aiCaption || `${post.title} #news #updates`;
          setCurrentCaption(finalCaption);
          setIsGeneratingCaption(false);
        }

        setCurrentPost(post);
        
        if (isNew && settings.autoPublish) {
          const activeImageUrl = settings.imageSource === ImageSource.AI_GENERATED 
            ? (post.aiImageUrl || post.featuredImageUrl) 
            : post.featuredImageUrl;

          let publishCaption = currentCaption;
          if (!publishCaption) {
             publishCaption = await generateSocialCaption(post.title) || `${post.title} #news`;
          }

          const platforms = [Platform.FACEBOOK, Platform.INSTAGRAM, Platform.TWITTER];
          const results: any = {};
          for (const p of platforms) results[p] = 'pending';

          const newLog: PublishLog = {
            id: Math.random().toString(36).substr(2, 9),
            timestamp: new Date().toISOString(),
            postTitle: post.title,
            caption: publishCaption,
            platforms: results,
            imageUrl: activeImageUrl
          };

          setLogs(prev => [newLog, ...prev]);

          for (const p of platforms) {
            const success = await publishToPlatform(p, generatedImageUrl || activeImageUrl, publishCaption, settings.fbApiKey);
            setLogs(prev => prev.map(l => l.id === newLog.id ? {
              ...l,
              platforms: { ...l.platforms, [p]: success ? 'success' : 'failed' }
            } : l));
          }

          setLastProcessedId(post.id);
        }
      }
    } catch (e) {
      console.error("Automation error:", e);
    } finally {
      setIsPolling(false);
    }
  }, [settings, lastProcessedId, generatedImageUrl, isPolling, currentCaption]);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          triggerAutomation();
          return 60;
        }
        return prev - 1;
      });
    }, 1000);
    
    return () => clearInterval(timer);
  }, [triggerAutomation]);

  const handleTestConnection = async () => {
    setConnectionStatus({ testing: true, message: null, success: null });
    const result = await testWPConnection(settings.wordpressUrl);
    setConnectionStatus({ testing: false, message: result.message, success: result.success });
    setTimeout(() => setConnectionStatus(prev => ({ ...prev, message: null })), 5000);
  };

  const handleRegenerateImage = async () => {
    if (!currentPost) return;
    setIsGeneratingImage(true);
    const aiImg = await generatePostImage(currentPost.title);
    if (aiImg) setCurrentPost({ ...currentPost, aiImageUrl: aiImg });
    setIsGeneratingImage(false);
  };

  const handleRegenerateCaption = async () => {
    if (!currentPost) return;
    setIsGeneratingCaption(true);
    const aiCaption = await generateSocialCaption(currentPost.title);
    setCurrentCaption(aiCaption || `${currentPost.title} #news #update`);
    setIsGeneratingCaption(false);
  };

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        const base64String = reader.result as string;
        setSettings({ ...settings, logoUrl: base64String });
      };
      reader.readAsDataURL(file);
    }
  };

  const clearLogo = () => {
    setSettings({ ...settings, logoUrl: '' });
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
      {activeTab === 'dashboard' && (
        <div className="space-y-8 animate-in fade-in duration-500">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard icon={TrendingUp} label="Posts Today" value={stats.todayPosts} color="bg-blue-500" />
            <StatCard icon={Activity} label="Efficiency" value="98.2%" color="bg-emerald-500" />
            <StatCard icon={Globe} label="Platforms" value={stats.activePlatforms} color="bg-indigo-500" />
            <StatCard icon={Server} label="Uptime" value={stats.uptime} color="bg-amber-500" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            <div className="lg:col-span-2 space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="p-6 border-b border-gray-100 flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Live Generator Preview</h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`w-2 h-2 rounded-full ${isPolling ? 'bg-amber-500 animate-pulse' : 'bg-emerald-500'}`}></span>
                      <p className="text-sm text-gray-500">
                        Scan in {countdown}s • Using {settings.imageSource === ImageSource.AI_GENERATED ? 'AI visuals' : 'Featured image'}
                      </p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => triggerAutomation(true)}
                      disabled={isPolling}
                      className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-all font-semibold disabled:opacity-50"
                    >
                      {isPolling ? <RotateCw className="animate-spin" size={18} /> : <RotateCw size={18} />}
                      Fetch Now
                    </button>
                  </div>
                </div>
                <div className="p-8 flex flex-col items-center gap-8 md:flex-row md:items-start">
                  <div className="w-full md:w-80 shrink-0">
                    {currentPost ? (
                      <div className="relative">
                        <CanvasPreview 
                          post={{
                            ...currentPost,
                            featuredImageUrl: settings.imageSource === ImageSource.AI_GENERATED 
                              ? (currentPost.aiImageUrl || currentPost.featuredImageUrl) 
                              : currentPost.featuredImageUrl
                          }} 
                          template={settings.selectedTemplate} 
                          logoUrl={settings.logoUrl}
                          wordpressUrl={settings.wordpressUrl}
                          onExport={setGeneratedImageUrl}
                        />
                        {(isGeneratingImage) && (
                          <div className="absolute inset-0 bg-black/40 rounded-xl flex flex-col items-center justify-center text-white backdrop-blur-sm">
                             <Sparkles className="animate-spin mb-2" size={32} />
                             <span className="font-bold text-sm">Generating AI Visuals...</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center border-2 border-dashed border-gray-300">
                        <p className="text-gray-400 font-medium">No posts fetched yet</p>
                      </div>
                    )}
                  </div>
                  <div className="flex-1 space-y-6">
                    <div>
                      <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest mb-2">WordPress Metadata</h4>
                      <p className="text-xl font-bold text-gray-900 leading-tight">
                        {currentPost?.title || "Waiting for latest WordPress post..."}
                      </p>
                      <a 
                        href={currentPost?.link} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-sm text-indigo-600 mt-1 flex items-center gap-1 hover:underline"
                      >
                        <LinkIcon size={14} />
                        {currentPost?.link || '---'}
                      </a>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <h4 className="text-xs font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                          <MessageSquareQuote size={14} className="text-indigo-500" />
                          AI Generated Caption
                        </h4>
                        <button 
                          onClick={handleRegenerateCaption}
                          disabled={!currentPost || isGeneratingCaption}
                          className="text-xs font-bold text-indigo-600 hover:text-indigo-800 disabled:opacity-50"
                        >
                          {isGeneratingCaption ? 'Regenerating...' : 'Regenerate'}
                        </button>
                      </div>
                      <div className={`p-4 bg-indigo-50/50 rounded-xl border border-indigo-100 min-h-[80px] relative ${isGeneratingCaption ? 'animate-pulse' : ''}`}>
                         {isGeneratingCaption ? (
                            <div className="space-y-2">
                               <div className="h-3 bg-indigo-100 rounded w-full"></div>
                               <div className="h-3 bg-indigo-100 rounded w-5/6"></div>
                               <div className="h-3 bg-indigo-100 rounded w-4/6"></div>
                            </div>
                         ) : (
                            <p className="text-sm text-gray-700 italic font-medium leading-relaxed">
                              {currentCaption || "Caption will appear here after fetching a post..."}
                            </p>
                         )}
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4 pt-2">
                      <button 
                        onClick={handleRegenerateImage}
                        disabled={isGeneratingImage || !currentPost}
                        className="flex items-center justify-center gap-2 p-3 bg-white border border-gray-200 rounded-xl hover:bg-gray-50 transition-all font-bold text-sm text-gray-700 disabled:opacity-50"
                      >
                        <Sparkles size={16} className="text-amber-500" />
                        New AI Background
                      </button>
                      <div className="p-3 bg-gray-50 rounded-xl border border-gray-100 flex items-center justify-center gap-2">
                        <span className="text-xs font-bold text-gray-400 uppercase">Auto-Tag</span>
                        <span className="text-xs font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-full">#breaking</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-6">
                <h3 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
                  <SettingsIcon size={20} className="text-gray-400" />
                  Automation Status
                </h3>
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 bg-indigo-50 rounded-xl border border-indigo-100">
                    <div>
                      <p className="font-bold text-indigo-900">Auto-Publishing</p>
                      <p className="text-xs text-indigo-600 font-medium truncate w-32 md:w-full">
                        Scanning {settings.wordpressUrl.replace('https://', '').split('/')[0]}
                      </p>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer">
                      <input 
                        type="checkbox" 
                        className="sr-only peer" 
                        checked={settings.autoPublish} 
                        onChange={(e) => setSettings({...settings, autoPublish: e.target.checked})}
                      />
                      <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-indigo-600"></div>
                    </label>
                  </div>

                  <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 space-y-1">
                     <p className="text-xs font-bold text-gray-400 uppercase">Last Processed ID</p>
                     <p className="text-sm font-bold text-gray-700">{lastProcessedId || 'None yet'}</p>
                  </div>

                  <div className="p-4 space-y-3">
                    <p className="text-sm font-bold text-gray-700">Daily Publishing Limit</p>
                    <input 
                      type="range" 
                      min="1" 
                      max="50" 
                      value={settings.dailyLimit}
                      onChange={(e) => setSettings({...settings, dailyLimit: parseInt(e.target.value)})}
                      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                    />
                    <div className="flex justify-between text-xs font-bold text-gray-400">
                      <span>1 Post</span>
                      <span className="text-indigo-600">{settings.dailyLimit} Posts/Day</span>
                      <span>50 Posts</span>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 rounded-2xl shadow-lg p-6 text-white">
                <h3 className="font-bold text-lg mb-2">Smart Automation</h3>
                <p className="text-indigo-100 text-sm mb-4 opacity-90">NewsFlow checks your site every 60 seconds. New posts are automatically captioned by AI and pushed to social feeds.</p>
                <div className="flex items-center gap-2 mb-4 p-2 bg-white/10 rounded-lg">
                  <CheckCircle2 size={16} className="text-emerald-400" />
                  <span className="text-xs font-bold uppercase tracking-wider">Duplicate Prevention Active</span>
                </div>
                <button 
                  onClick={() => setActiveTab('settings')}
                  className="w-full py-3 bg-white text-indigo-900 rounded-xl font-bold hover:bg-indigo-50 transition-colors shadow-lg"
                >
                  Configure Site URL
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === 'history' && (
        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 overflow-hidden animate-in slide-in-from-bottom-5 duration-500">
          <div className="p-6 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h3 className="text-lg font-bold text-gray-900">Publishing Logs</h3>
              <p className="text-sm text-gray-500">History of all automated social media tasks</p>
            </div>
            <button 
              onClick={() => {
                if(confirm("Are you sure you want to clear all history?")) setLogs([]);
              }}
              className="flex items-center gap-2 px-4 py-2 text-red-600 font-bold hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 size={18} />
              Clear All Logs
            </button>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-gray-50 border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Timestamp</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Article & Caption</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Facebook</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Instagram</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">X (Twitter)</th>
                  <th className="px-6 py-4 text-xs font-bold text-gray-400 uppercase">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {logs.length > 0 ? logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50/50 transition-colors">
                    <td className="px-6 py-4">
                      <p className="text-sm font-medium text-gray-900">{new Date(log.timestamp).toLocaleDateString()}</p>
                      <p className="text-xs text-gray-500">{new Date(log.timestamp).toLocaleTimeString()}</p>
                    </td>
                    <td className="px-6 py-4 max-w-sm">
                      <div className="flex gap-3">
                         <div className="w-12 h-12 rounded bg-gray-100 overflow-hidden shrink-0 border border-gray-200">
                            <img src={log.imageUrl} alt="" className="w-full h-full object-cover" />
                         </div>
                         <div className="space-y-1">
                            <p className="text-sm font-bold text-gray-800 truncate">{log.postTitle}</p>
                            <p className="text-xs text-gray-500 line-clamp-2 italic">"{log.caption}"</p>
                         </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={log.platforms[Platform.FACEBOOK]} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={log.platforms[Platform.INSTAGRAM]} />
                    </td>
                    <td className="px-6 py-4">
                      <StatusBadge status={log.platforms[Platform.TWITTER]} />
                    </td>
                    <td className="px-6 py-4">
                      <button className="p-2 text-gray-400 hover:text-indigo-600 transition-colors">
                        <ArrowRightLeft size={18} />
                      </button>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={6} className="px-6 py-12 text-center">
                       <div className="flex flex-col items-center gap-3 text-gray-400">
                          <Clock size={48} className="opacity-20" />
                          <p className="font-medium">No activity history found.</p>
                       </div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {activeTab === 'settings' && (
        <div className="max-w-5xl mx-auto space-y-8 animate-in zoom-in-95 duration-300">
           <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
              <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                 <SettingsIcon size={24} className="text-indigo-600" />
                 WordPress Integration
              </h3>
              <div className="space-y-6">
                <div className="flex flex-col md:flex-row gap-4">
                  <div className="flex-1">
                    <label className="block text-sm font-bold text-gray-700 mb-2">WordPress Site URL</label>
                    <div className="relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                        <LinkIcon size={18} />
                      </div>
                      <input 
                        type="url" 
                        value={settings.wordpressUrl}
                        onChange={(e) => setSettings({...settings, wordpressUrl: e.target.value})}
                        placeholder="https://yourwebsite.com"
                        className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-indigo-50 focus:border-indigo-500 transition-all outline-none" 
                      />
                    </div>
                  </div>
                  <div className="md:pt-9 flex items-center gap-3">
                    <button 
                      onClick={handleTestConnection}
                      disabled={connectionStatus.testing}
                      className="px-6 py-3 bg-white border-2 border-indigo-600 text-indigo-600 font-bold rounded-xl hover:bg-indigo-50 transition-all disabled:opacity-50"
                    >
                      {connectionStatus.testing ? 'Testing...' : 'Test Connection'}
                    </button>
                    {connectionStatus.success !== null && !connectionStatus.testing && (
                      <div className={`flex items-center gap-1.5 font-bold text-sm ${connectionStatus.success ? 'text-emerald-600' : 'text-red-600'}`}>
                        {connectionStatus.success ? <CheckCircle2 size={18} /> : <AlertCircle size={18} />}
                        {connectionStatus.success ? 'Success' : 'Failed'}
                      </div>
                    )}
                  </div>
                </div>
                
                {connectionStatus.message && (
                  <div className={`p-4 rounded-xl text-sm border flex gap-3 ${connectionStatus.success ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : 'bg-red-50 border-red-100 text-red-800'}`}>
                    <div className="mt-0.5">
                      {connectionStatus.success ? <CheckCircle2 size={16} /> : <AlertCircle size={16} />}
                    </div>
                    {connectionStatus.message}
                  </div>
                )}
              </div>

              <div className="mt-12 pt-12 border-t border-gray-100">
                 <h3 className="text-xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                    <LayoutIcon size={24} className="text-indigo-600" />
                    Template Designer & Branding
                 </h3>
                 <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                    <div className="lg:col-span-5 space-y-6">
                      <div>
                        <p className="text-sm font-bold text-gray-400 uppercase tracking-widest mb-4">Design Style</p>
                        <div className="space-y-3">
                          {[TemplateType.BREAKING_NEWS, TemplateType.STANDARD, TemplateType.MINIMALIST, TemplateType.MODERN_NEWS].map((t) => (
                            <button
                              key={t}
                              onClick={() => setSettings({...settings, selectedTemplate: t})}
                              className={`relative w-full group p-4 rounded-2xl border-2 transition-all flex items-center gap-4 text-left ${
                                settings.selectedTemplate === t 
                                  ? 'border-indigo-600 bg-indigo-50/50 shadow-md' 
                                  : 'border-gray-100 hover:border-gray-200 bg-white'
                              }`}
                            >
                              <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-white shrink-0 shadow-sm ${
                                t === TemplateType.BREAKING_NEWS ? 'bg-red-500' : 
                                t === TemplateType.STANDARD ? 'bg-blue-600' : 
                                t === TemplateType.MODERN_NEWS ? 'bg-indigo-600' : 'bg-slate-900'
                              }`}>
                                {t === TemplateType.BREAKING_NEWS && <AlertCircle size={18} />}
                                {t === TemplateType.STANDARD && <LayoutIcon size={18} />}
                                {t === TemplateType.MINIMALIST && <Monitor size={18} />}
                                {t === TemplateType.MODERN_NEWS && <Newspaper size={18} />}
                              </div>
                              <div className="flex-1">
                                <p className="font-bold text-gray-900 text-sm">{t}</p>
                              </div>
                              {settings.selectedTemplate === t && (
                                <div className="text-indigo-600">
                                  <CheckCircle2 size={20} />
                                </div>
                              )}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-4 pt-4 border-t border-gray-100">
                        <label className="block text-sm font-bold text-gray-700">Logo Management</label>
                        
                        <div className="grid grid-cols-1 gap-4">
                          <div className={`relative p-6 border-2 border-dashed rounded-2xl transition-all flex flex-col items-center justify-center gap-3 ${settings.logoUrl?.startsWith('data:') ? 'border-emerald-200 bg-emerald-50/30' : 'border-gray-200 hover:border-indigo-300 hover:bg-indigo-50/20'}`}>
                             {settings.logoUrl ? (
                               <div className="flex flex-col items-center gap-3">
                                 <div className="relative group">
                                    <div className="w-24 h-16 bg-white rounded-lg shadow-sm border border-gray-100 p-2 flex items-center justify-center overflow-hidden">
                                       <img src={settings.logoUrl} alt="Logo Preview" className="max-w-full max-h-full object-contain" />
                                    </div>
                                    <button 
                                      onClick={clearLogo}
                                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1 shadow-lg hover:bg-red-600 transition-colors"
                                    >
                                      <X size={14} />
                                    </button>
                                 </div>
                                 <p className="text-xs font-bold text-emerald-600 flex items-center gap-1">
                                    <CheckCircle2 size={12} />
                                    Custom Logo Active
                                 </p>
                               </div>
                             ) : (
                               <button 
                                onClick={() => fileInputRef.current?.click()}
                                className="flex flex-col items-center gap-2 group"
                               >
                                 <div className="w-12 h-12 bg-gray-100 rounded-full flex items-center justify-center text-gray-400 group-hover:text-indigo-500 group-hover:bg-indigo-50 transition-all">
                                   <Upload size={20} />
                                 </div>
                                 <div className="text-center">
                                   <p className="text-sm font-bold text-gray-700">Upload Logo</p>
                                   <p className="text-xs text-gray-400">PNG, JPG, SVG (Max 2MB)</p>
                                 </div>
                               </button>
                             )}
                             <input 
                                type="file" 
                                ref={fileInputRef} 
                                onChange={handleFileUpload} 
                                accept="image/*" 
                                className="hidden" 
                             />
                          </div>

                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                              <Globe size={16} />
                            </div>
                            <input 
                              type="text" 
                              value={settings.logoUrl?.startsWith('data:') ? '' : settings.logoUrl}
                              onChange={(e) => setSettings({...settings, logoUrl: e.target.value})}
                              placeholder="Or provide a Logo URL..."
                              className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 focus:ring-4 focus:ring-indigo-50 outline-none text-sm" 
                            />
                          </div>
                        </div>

                        <div>
                          <label className="block text-sm font-bold text-gray-700 mb-2">Image Source</label>
                          <div className="grid grid-cols-2 gap-3">
                            <button 
                              onClick={() => setSettings({...settings, imageSource: ImageSource.WORDPRESS})}
                              className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${settings.imageSource === ImageSource.WORDPRESS ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                            >
                              <ImageIcon size={16} />
                              WP Featured
                            </button>
                            <button 
                              onClick={() => setSettings({...settings, imageSource: ImageSource.AI_GENERATED})}
                              className={`flex items-center gap-2 p-3 rounded-xl border text-xs font-bold transition-all ${settings.imageSource === ImageSource.AI_GENERATED ? 'bg-amber-500 border-amber-500 text-white shadow-lg' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}
                            >
                              <Sparkles size={16} />
                              AI Generated
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="lg:col-span-7 bg-gray-50 p-6 rounded-3xl border border-gray-200 flex flex-col items-center">
                       <div className="flex items-center gap-2 self-start mb-4 text-gray-400 font-bold text-xs uppercase tracking-widest">
                         <Monitor size={14} />
                         Live Preview
                       </div>
                       <div className="w-full max-w-sm">
                         <CanvasPreview 
                            post={PLACEHOLDER_POST} 
                            template={settings.selectedTemplate} 
                            logoUrl={settings.logoUrl}
                            wordpressUrl={settings.wordpressUrl}
                         />
                       </div>
                       <div className="mt-4 flex flex-col items-center gap-1">
                          <p className="text-[10px] text-gray-400 text-center px-8 uppercase tracking-tighter leading-tight font-medium">
                            Your social posts will be generated exactly as shown.
                          </p>
                          {settings.logoUrl && !settings.logoUrl.startsWith('data:') && (
                             <p className="text-[9px] text-indigo-400 font-bold italic animate-pulse">
                                Remote URL detected. Auto-bypassing CORS...
                             </p>
                          )}
                          {settings.logoUrl?.startsWith('data:') && (
                             <p className="text-[9px] text-emerald-500 font-bold italic">
                                Local upload active. High reliability.
                             </p>
                          )}
                       </div>
                    </div>
                 </div>
              </div>

              <div className="mt-12 pt-12 border-t border-gray-100">
                 <h4 className="text-lg font-bold text-gray-900 mb-6 flex items-center gap-2">
                   <Server size={20} className="text-indigo-600" />
                   Social Media API Keys
                 </h4>
                 <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">Facebook App Token</label>
                      <input 
                        type="password" 
                        value={settings.fbApiKey}
                        onChange={(e) => setSettings({...settings, fbApiKey: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 outline-none text-sm" 
                        placeholder="••••••••••••"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">Instagram Token</label>
                      <input 
                        type="password" 
                        value={settings.igApiKey}
                        onChange={(e) => setSettings({...settings, igApiKey: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 outline-none text-sm" 
                        placeholder="••••••••••••"
                      />
                    </div>
                    <div className="space-y-2">
                      <label className="text-xs font-bold text-gray-500 uppercase">X Consumer Key</label>
                      <input 
                        type="password" 
                        value={settings.xApiKey}
                        onChange={(e) => setSettings({...settings, xApiKey: e.target.value})}
                        className="w-full px-4 py-2 rounded-lg border border-gray-200 focus:border-indigo-500 outline-none text-sm" 
                        placeholder="••••••••••••"
                      />
                    </div>
                 </div>
              </div>

              <div className="mt-12 flex justify-end gap-4">
                 <button className="px-6 py-3 text-gray-500 font-bold hover:bg-gray-100 rounded-xl transition-colors">Discard</button>
                 <button 
                  onClick={() => alert("Settings saved successfully!")}
                  className="px-8 py-3 bg-indigo-600 text-white font-bold rounded-xl hover:bg-indigo-700 shadow-lg shadow-indigo-100 transition-all"
                 >
                   Save Configuration
                 </button>
              </div>
           </div>
        </div>
      )}
    </Layout>
  );
};

const StatCard: React.FC<{ icon: any, label: string, value: string | number, color: string }> = ({ icon: Icon, label, value, color }) => (
  <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200 flex items-center gap-5">
    <div className={`w-14 h-14 rounded-2xl ${color} flex items-center justify-center text-white shadow-lg`}>
      <Icon size={24} />
    </div>
    <div>
      <p className="text-sm font-bold text-gray-400 uppercase tracking-widest">{label}</p>
      <p className="text-2xl font-extrabold text-gray-900">{value}</p>
    </div>
  </div>
);

const StatusBadge: React.FC<{ status: 'success' | 'failed' | 'pending' | undefined }> = ({ status }) => {
  if (status === 'success') {
    return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 text-emerald-700 text-xs font-bold border border-emerald-200"><CheckCircle2 size={14} /> Success</span>;
  }
  if (status === 'failed') {
    return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200"><XCircle size={14} /> Error</span>;
  }
  return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-gray-100 text-gray-500 text-xs font-bold border border-gray-200"><Clock size={14} /> Processing</span>;
};

export default App;