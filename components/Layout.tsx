
import React, { useState } from 'react';
import { 
  LayoutGrid, 
  Settings, 
  History, 
  Zap, 
  ShieldCheck,
  UserCircle,
  Calendar as CalendarIcon,
  Search,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';
import { APP_LOGO_BASE64 } from '../constants';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const menuItems = [
    { id: 'dashboard', icon: LayoutGrid, label: 'Creative Studio' },
    { id: 'calendar', icon: CalendarIcon, label: 'Planner' },
    { id: 'history', icon: History, label: 'Audit Logs' },
    { id: 'settings', icon: Settings, label: 'Integrations' },
    { id: 'account', icon: UserCircle, label: 'My Cloud' },
  ];

  const handleTabChange = (id: string) => {
    setActiveTab(id);
    setIsSidebarOpen(false);
  };

  return (
    <div className="flex h-screen bg-[#f7f9fc] overflow-hidden relative">
      {/* Sidebar Overlay for Mobile */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={`
        fixed inset-y-0 left-0 w-72 bg-slate-950 text-slate-100 flex flex-col shadow-2xl z-50 transition-transform duration-300 transform
        ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        lg:relative lg:translate-x-0 lg:w-80
      `}>
        <div className="absolute top-0 right-0 w-32 h-32 bg-red-600/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        
        <div className="p-8 lg:p-10 flex flex-col items-start gap-4 relative">
          <div className="flex items-center justify-between w-full lg:mb-4">
            <div className="p-3 bg-white rounded-2xl shadow-xl">
              <img src={APP_LOGO_BASE64} alt="World News Today Live" className="h-10 lg:h-12 w-auto object-contain" />
            </div>
            <button 
              onClick={() => setIsSidebarOpen(false)}
              className="lg:hidden p-2 text-slate-400 hover:text-white"
            >
              <X size={24} />
            </button>
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] lg:text-xs text-red-500 font-black uppercase tracking-[0.3em]">Broadcast Pro</span>
          </div>
        </div>

        <div className="px-6 mb-4">
           <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-hover:text-slate-400 transition-colors" size={16} />
              <input type="text" placeholder="Global search..." className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-2xl text-xs font-bold focus:border-red-500 outline-none transition-all" />
           </div>
        </div>

        <nav className="flex-1 mt-6 px-6 space-y-2 relative overflow-y-auto custom-scrollbar">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleTabChange(item.id)}
              className={`w-full flex items-center justify-between px-5 py-4 rounded-[1.5rem] transition-all group ${
                activeTab === item.id 
                  ? 'bg-red-600 text-white shadow-2xl shadow-red-900/50 scale-[1.02]' 
                  : 'text-slate-500 hover:text-white hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-4">
                <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'text-slate-600 group-hover:text-red-400 transition-colors'} />
                <span className="font-black text-sm tracking-tight">{item.label}</span>
              </div>
              {activeTab === item.id && <ChevronRight size={14} className="opacity-50" />}
            </button>
          ))}
        </nav>

        <div className="p-8 relative mt-auto">
          <div className="bg-gradient-to-br from-red-950/40 to-slate-950 rounded-[2.5rem] p-6 border border-red-500/20">
            <div className="flex items-center gap-3 mb-4">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
               <p className="text-[10px] uppercase font-black text-red-200 tracking-[0.2em]">Live Engine</p>
            </div>
            <div className="w-full bg-white/5 rounded-full h-1.5 mb-3 overflow-hidden">
              <div className="bg-red-500 h-full rounded-full w-[98%]"></div>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-[9px] font-black text-slate-400 uppercase">Secure Node</p>
              <ShieldCheck size={14} className="text-emerald-500" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col relative w-full">
        <header className="sticky top-0 z-20 h-20 lg:h-24 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-6 lg:px-10">
           <div className="flex items-center gap-4">
             <button 
               onClick={() => setIsSidebarOpen(true)}
               className="lg:hidden p-2 text-slate-900 hover:bg-slate-50 rounded-xl transition-colors"
             >
               <Menu size={24} />
             </button>
             <h1 className="text-xs lg:text-sm font-black text-slate-400 uppercase tracking-widest truncate">
               {activeTab.replace('-', ' ')}
             </h1>
           </div>
           <div className="flex items-center gap-4 lg:gap-6">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-sm font-black text-slate-900">Broadcaster</span>
                <span className="text-[10px] font-bold text-red-600">Pro Hub</span>
              </div>
              <img src="https://i.pravatar.cc/150?u=newsroom" className="w-10 h-10 lg:w-12 lg:h-12 rounded-[1.25rem] border-2 border-red-100 shadow-lg" alt="" />
           </div>
        </header>

        <div className="p-4 lg:p-10 pb-32 max-w-[1600px] mx-auto w-full">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
