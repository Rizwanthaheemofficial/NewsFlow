
import React from 'react';
import { 
  LayoutGrid, 
  Settings, 
  History, 
  Zap, 
  ShieldCheck,
  UserCircle,
  Calendar as CalendarIcon,
  Search,
  ChevronRight
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutGrid, label: 'Creative Studio' },
    { id: 'calendar', icon: CalendarIcon, label: 'Planner' },
    { id: 'history', icon: History, label: 'Audit Logs' },
    { id: 'settings', icon: Settings, label: 'Integrations' },
    { id: 'account', icon: UserCircle, label: 'My Cloud' },
  ];

  return (
    <div className="flex h-screen bg-[#f7f9fc] overflow-hidden">
      {/* Sidebar */}
      <aside className="w-80 bg-slate-950 text-slate-100 flex flex-col shadow-2xl z-30 relative">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/10 rounded-full -mr-16 -mt-16 blur-3xl"></div>
        
        <div className="p-10 flex items-center gap-4 relative">
          <div className="w-12 h-12 bg-gradient-to-br from-indigo-500 to-violet-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-900/50">
            <Zap className="text-white fill-current" size={24} />
          </div>
          <div className="flex flex-col">
            <span className="text-2xl font-black tracking-tighter leading-none">NewsFlow</span>
            <span className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] mt-1">SaaS Pro v3</span>
          </div>
        </div>

        <div className="px-6 mb-4">
           <div className="relative group">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-600 group-hover:text-slate-400 transition-colors" size={16} />
              <input type="text" placeholder="Search commands..." className="w-full pl-11 pr-4 py-3 bg-slate-900/50 border border-slate-800 rounded-2xl text-xs font-bold focus:border-indigo-500 outline-none transition-all" />
           </div>
        </div>

        <nav className="flex-1 mt-6 px-6 space-y-2 relative">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-5 py-4 rounded-[1.5rem] transition-all group ${
                activeTab === item.id 
                  ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-900/50 scale-[1.02]' 
                  : 'text-slate-500 hover:text-white hover:bg-slate-900'
              }`}
            >
              <div className="flex items-center gap-4">
                <item.icon size={20} className={activeTab === item.id ? 'text-white' : 'text-slate-600 group-hover:text-indigo-400 transition-colors'} />
                <span className="font-black text-sm tracking-tight">{item.label}</span>
              </div>
              {activeTab === item.id && <ChevronRight size={14} className="opacity-50" />}
            </button>
          ))}
        </nav>

        <div className="p-8 relative">
          <div className="bg-gradient-to-br from-indigo-950 to-slate-950 rounded-[2.5rem] p-7 border border-indigo-500/20">
            <div className="flex items-center gap-3 mb-4">
               <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
               <p className="text-[10px] uppercase font-black text-indigo-200 tracking-[0.2em]">Live Node Status</p>
            </div>
            <div className="w-full bg-white/5 rounded-full h-1.5 mb-3 overflow-hidden">
              <div className="bg-indigo-500 h-full rounded-full w-[94%]"></div>
            </div>
            <div className="flex justify-between items-center">
              <p className="text-[10px] font-black text-slate-400">94% Capacity</p>
              <ShieldCheck size={14} className="text-emerald-500" />
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col relative">
        {/* Modern Top Header */}
        <header className="sticky top-0 z-20 h-24 bg-white/80 backdrop-blur-xl border-b border-slate-100 flex items-center justify-between px-10">
           <div>
             <h1 className="text-sm font-black text-slate-400 uppercase tracking-widest">
               {activeTab.replace('-', ' ')}
             </h1>
           </div>
           <div className="flex items-center gap-6">
              <div className="flex flex-col text-right">
                <span className="text-sm font-black text-slate-900">Alex Rivera</span>
                <span className="text-[10px] font-bold text-indigo-600">Pro Plan Member</span>
              </div>
              <img src="https://i.pravatar.cc/150?u=alex" className="w-12 h-12 rounded-[1.25rem] border-2 border-indigo-100 shadow-lg" alt="" />
           </div>
        </header>

        <div className="p-10 pb-32">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
