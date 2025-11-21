
import React from 'react';
import { LayoutDashboard, Users, History, Menu, X, Trophy, Database, Smartphone, RefreshCw } from 'lucide-react';
import { ViewState, PersistenceMode } from '../types';

interface LayoutProps {
  currentView: ViewState;
  setCurrentView: (view: ViewState) => void;
  storageMode: PersistenceMode;
  onToggleStorageMode: () => void;
  children: React.ReactNode;
}

const Layout: React.FC<LayoutProps> = ({ currentView, setCurrentView, storageMode, onToggleStorageMode, children }) => {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = React.useState(false);

  const NavItem = ({ view, icon: Icon, label }: { view: ViewState; icon: any; label: string }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        setIsMobileMenuOpen(false);
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
        currentView === view
          ? 'bg-emerald-600 text-white shadow-md shadow-emerald-200'
          : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  return (
    <div className="min-h-screen bg-slate-50/50 flex">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex flex-col w-64 bg-white border-r border-slate-100 fixed h-full z-20">
        <div className="p-6 border-b border-slate-50">
          <h1 className="text-2xl font-bold bg-gradient-to-r from-emerald-600 to-emerald-400 bg-clip-text text-transparent">
            CricGenie
          </h1>
          <p className="text-xs text-slate-400 mt-1">AI Manager Edition</p>
        </div>
        
        <nav className="p-4 space-y-2 flex-1">
          <NavItem view="DASHBOARD" icon={LayoutDashboard} label="Dashboard" />
          <NavItem view="TOURNAMENTS" icon={Trophy} label="Tournaments" />
          <NavItem view="TEAMS" icon={Users} label="Team Manager" />
          <NavItem view="HISTORY" icon={History} label="History" />
        </nav>

        <div className="p-4 border-t border-slate-50 space-y-4">
            {/* Storage Toggle */}
            <div className="bg-slate-50 rounded-xl p-3">
                <div className="text-xs font-bold text-slate-400 uppercase mb-2 flex items-center gap-1">
                    Storage Mode
                </div>
                <button 
                    onClick={onToggleStorageMode}
                    className={`w-full flex items-center justify-between p-2 rounded-lg border text-xs font-medium transition-all ${
                        storageMode === 'BACKEND' 
                        ? 'bg-indigo-50 text-indigo-700 border-indigo-200' 
                        : 'bg-white text-slate-600 border-slate-200'
                    }`}
                >
                    <span className="flex items-center gap-2">
                        {storageMode === 'BACKEND' ? <Database className="w-3 h-3" /> : <Smartphone className="w-3 h-3" />}
                        {storageMode === 'BACKEND' ? 'Cloud DB' : 'Local Device'}
                    </span>
                    <RefreshCw className="w-3 h-3 opacity-50" />
                </button>
            </div>

            <div className="bg-slate-900 rounded-xl p-4 text-center">
                <p className="text-slate-400 text-xs mb-2">Powered by</p>
                <p className="text-white font-bold">Gemini AI</p>
            </div>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 left-0 right-0 bg-white border-b border-slate-100 z-30 px-4 py-3 flex justify-between items-center shadow-sm">
         <div className="font-bold text-emerald-600 text-lg">CricGenie</div>
         <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)} className="text-slate-600">
            {isMobileMenuOpen ? <X /> : <Menu />}
         </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
          <div className="fixed inset-0 z-20 bg-white pt-20 px-6 space-y-4 md:hidden">
             <NavItem view="DASHBOARD" icon={LayoutDashboard} label="Dashboard" />
             <NavItem view="TOURNAMENTS" icon={Trophy} label="Tournaments" />
             <NavItem view="TEAMS" icon={Users} label="Team Manager" />
             <NavItem view="HISTORY" icon={History} label="History" />
             <div className="pt-4 border-t">
                <button onClick={onToggleStorageMode} className="flex items-center gap-2 text-slate-600 text-sm font-medium">
                     {storageMode === 'BACKEND' ? <Database className="w-4 h-4" /> : <Smartphone className="w-4 h-4" />}
                     Switch to {storageMode === 'BACKEND' ? 'Local' : 'Cloud'} Storage
                </button>
             </div>
          </div>
      )}

      {/* Main Content */}
      <main className="flex-1 md:ml-64 pt-16 md:pt-0 overflow-x-hidden">
        {children}
      </main>
    </div>
  );
};

export default Layout;
