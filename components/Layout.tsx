
import React from 'react';
import { 
  LayoutGrid, 
  Settings, 
  History, 
  Zap, 
  CheckCircle2, 
  XCircle, 
  Clock,
  ArrowRightLeft
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const Layout: React.FC<LayoutProps> = ({ children, activeTab, setActiveTab }) => {
  const menuItems = [
    { id: 'dashboard', icon: LayoutGrid, label: 'Dashboard' },
    { id: 'history', icon: History, label: 'Publish Logs' },
    { id: 'settings', icon: Settings, label: 'System Config' },
  ];

  return (
    <div className="flex h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <aside className="w-64 bg-indigo-900 text-indigo-100 flex flex-col shadow-xl z-20">
        <div className="p-6 flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-500 rounded-lg flex items-center justify-center">
            <Zap className="text-white fill-current" />
          </div>
          <span className="text-xl font-extrabold tracking-tight">NewsFlow</span>
        </div>

        <nav className="flex-1 mt-6 px-4 space-y-2">
          {menuItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all ${
                activeTab === item.id 
                  ? 'bg-indigo-800 text-white shadow-lg' 
                  : 'hover:bg-indigo-800/50'
              }`}
            >
              <item.icon size={20} />
              <span className="font-medium">{item.label}</span>
            </button>
          ))}
        </nav>

        <div className="p-6">
          <div className="bg-indigo-800/50 rounded-2xl p-4 border border-indigo-700">
            <p className="text-xs uppercase font-bold text-indigo-400 mb-2">Usage Limit</p>
            <div className="w-full bg-indigo-900 rounded-full h-2 mb-2">
              <div className="bg-emerald-400 h-2 rounded-full w-2/5"></div>
            </div>
            <p className="text-sm font-medium">12 / 30 posts today</p>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto flex flex-col">
        {/* Header */}
        <header className="h-20 bg-white border-b border-gray-200 px-8 flex items-center justify-between sticky top-0 z-10">
          <div className="flex items-center gap-2">
             <h2 className="text-xl font-bold text-gray-800 capitalize">{activeTab}</h2>
             <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 text-xs font-bold rounded-full border border-emerald-200 uppercase tracking-widest">Live</span>
          </div>
          
          <div className="flex items-center gap-6">
            <div className="flex flex-col text-right">
              <span className="text-sm font-semibold text-gray-900">Admin User</span>
              <span className="text-xs text-gray-500">Premium Account</span>
            </div>
            <div className="w-10 h-10 rounded-full bg-gray-200 border-2 border-indigo-100 overflow-hidden">
               <img src="https://picsum.photos/40" alt="Avatar" />
            </div>
          </div>
        </header>

        <div className="p-8">
          {children}
        </div>
      </main>
    </div>
  );
};

export default Layout;
