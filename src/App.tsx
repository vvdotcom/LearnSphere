import React, { useState } from 'react';
import { ArrowLeft, Sparkles, Twitter, Github, Mail, Users, TestTube, Menu, X, Brain, Map, LogOut, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useLanguage } from './contexts/LanguageContext';
import LanguageSelector from './components/LanguageSelector';
import CogniRead from './components/CogniRead';
import LearningRoad from './components/LearningRoad';
import ExamSimulator from './components/ExamSimulator';

function App() {
  const { t } = useLanguage();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [currentView, setCurrentView] = useState<'learnsphere' | 'cogniread' | 'learningroad' | 'examsimulator'>('learnsphere');
  const [sidebarOpen, setSidebarOpen] = useState(false);



  
  const handleAutoFill = () => {
    setEmail('test@learnsphere.com');
    setPassword('testpassword123');
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    
    
    setIsLoggingIn(true);
    
    // Simulate login process
    await new Promise(resolve => setTimeout(resolve, 1500));
    
    // For demo purposes, accept any email/password combination
    setIsLoggedIn(true);
    setCurrentView('cogniread'); // Go to CogniRead after login
    setIsLoggingIn(false);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setCurrentView('learnsphere');
    setEmail('');
    setPassword('');
    setSidebarOpen(false);
  };

  const navigationItems = [
    {
      id: 'cogniread',
      label: t('nav.cogniread'),
      icon: Brain,
      description: t('cogniread.subtitle')
    },
    {
      id: 'learningroad',
      label: t('nav.learningroad'),
      icon: Map,
      description: t('learningroad.description')
    },
    {
      id: 'examsimulator',
      label: 'Exam Simulator',
      icon: FileText,
      description: 'Generate progressive difficulty exam series'
    }
  ];

  // Sidebar Component
  const Sidebar = () => (
    <>
      {/* Overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 backdrop-blur-sm z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}
      
      {/* Sidebar */}
      <div className={`fixed left-0 top-0 h-full w-80 bg-[#0d0d0d] border-r border-[#feedd1]/20 z-50 transform transition-transform duration-300 ease-in-out flex flex-col ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0`}>
        {/* Header */}
        <div className="p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-[#ffffff] to-[#fde6c4] rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-[#0d0d0d]" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-[#ffffff]">{t('nav.learnsphere')}</h2>
                <p className="text-sm text-stone-400">{t('learnsphere.subtitle')}</p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(false)}
              className="lg:hidden text-stone-400 hover:text-[#ffffff] hover:bg-[#ffffff]/10"
            >
              <X className="w-5 h-5" />
            </Button>
          </div>
        </div>

        {/* Language Selector */}
        <div className="px-6 mb-4">
          <LanguageSelector />
        </div>

        {/* Navigation */}
        <div className="flex-1 px-6">
          <nav className="space-y-2">
            {navigationItems.map((item) => (
              <button
                key={item.id}
                onClick={() => {
                  setCurrentView(item.id as any);
                  setSidebarOpen(false);
                }}
                className={`w-full flex items-center gap-3 p-4 rounded-xl transition-all duration-200 text-left ${
                  currentView === item.id
                    ? 'bg-[#ffffff]/20 text-[#ffffff] border border-[#ffffff]/30'
                    : 'text-stone-300 hover:bg-[#ffffff]/10 hover:text-[#ffffff] border border-transparent'
                }`}
              >
                <item.icon className="w-5 h-5 flex-shrink-0" />
                <div>
                  <div className="font-medium">{item.label}</div>
                  <div className="text-sm opacity-80">{item.description}</div>
                </div>
              </button>
            ))}
          </nav>
        </div>

        {/* User Profile Section - Moved to Bottom */}
        <div className="p-6">
          

          {/* Logout Button */}
          <Button
            onClick={handleLogout}
            variant="outline"
            className="w-full border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 hover:border-red-400"
          >
            <LogOut className="w-4 h-4 mr-2" />
            {t('nav.signout')}
          </Button>
        </div>
      </div>
    </>
  );

  // Show CogniRead if logged in and selected
  if (isLoggedIn && currentView === 'cogniread') {
    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1 lg:ml-80">
          <div className="lg:hidden fixed top-4 left-4 z-30">
            <Button
              onClick={() => setSidebarOpen(true)}
              variant="outline"
              size="icon"
              className="bg-[#ffffff]/90 backdrop-blur-sm text-[#0d0d0d] border-[#ffffff] hover:bg-[#ffffff]"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
          <CogniRead />
        </div>
      </div>
    );
  }

  // Show Learning Road if selected
  if (isLoggedIn && currentView === 'learningroad') {
    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1 lg:ml-80">
          <div className="lg:hidden fixed top-4 left-4 z-30">
            <Button
              onClick={() => setSidebarOpen(true)}
              variant="outline"
              size="icon"
              className="bg-[#ffffff]/90 backdrop-blur-sm text-[#0d0d0d] border-[#ffffff] hover:bg-[#ffffff]"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
          <LearningRoad />
        </div>
      </div>
    );
  }

  // Show Exam Simulator if selected
  if (isLoggedIn && currentView === 'examsimulator') {
    return (
      <div className="flex">
        <Sidebar />
        <div className="flex-1 lg:ml-80">
          <div className="lg:hidden fixed top-4 left-4 z-30">
            <Button
              onClick={() => setSidebarOpen(true)}
              variant="outline"
              size="icon"
              className="bg-[#ffffff]/90 backdrop-blur-sm text-[#0d0d0d] border-[#ffffff] hover:bg-[#ffffff]"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
          <ExamSimulator />
        </div>
      </div>
    );
  }

  // Show main learnsphere page (with or without login)
  return (
    <div className="min-h-screen flex">
      {/* Sidebar for logged in users */}
      {isLoggedIn && <Sidebar />}
      
      {/* Left Section - Main Content */}
      <div className={`flex-1 bg-[#ffffff] flex flex-col ${isLoggedIn ? 'lg:ml-80' : ''}`}>
        {/* Mobile menu button for logged in users */}
        {isLoggedIn && (
          <div className="lg:hidden fixed top-4 left-4 z-30">
            <Button
              onClick={() => setSidebarOpen(true)}
              variant="outline"
              size="icon"
              className="bg-white/90 backdrop-blur-sm text-[#0d0d0d] border-stone-300 hover:bg-white shadow-lg"
            >
              <Menu className="w-5 h-5" />
            </Button>
          </div>
        )}

        {/* Header */}
        <header className="p-8">
          <div className="flex items-center justify-between">
            <h1 className="text-4xl font-light text-stone-800 tracking-wide">{t('learnsphere.title')}</h1>
            {!isLoggedIn && (
              <div className="flex items-center gap-3">
                <LanguageSelector />
              </div>
            )}
          </div>
        </header>

        {/* Main Content */}
        <div className="flex-1 flex flex-col items-center justify-center px-8 max-w-3xl mx-auto">
          {/* Hero Image */}
          <div className="w-full max-w-2xl mb-8">
            <div className="relative">
              <img
                src="https://i.imgur.com/57uVCPY.gif"
                alt="AI Technology and Learning"
                className="w-full h-96 object-cover rounded-2xl shadow-lg"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent rounded-2xl"></div>
            </div>
          </div>

          {/* Description */}
          <div className="text-center max-w-lg">
           <p className="text-stone-700 text-lg leading-relaxed mb-2">{t('learnsphere.description')}</p>
           <p className="text-stone-600 text-base">{t('learnsphere.perfect')}</p>
          </div>
        </div>

        {/* Footer */}
        <footer className="p-8 text-center">
         
        </footer>
      </div>

      {/* Right Section - Sign In (only show when not logged in) */}
      {!isLoggedIn && (
        <div className="w-80 lg:w-96 bg-[#0d0d0d] text-white flex flex-col">
          {/* Header */}
          <div className="p-8">
 
            <h2 className="text-2xl font-light text-[#ffffff] tracking-wide">{t('auth.signin').toUpperCase()}</h2>
          </div>

          <div className="flex-1 px-8">
            <form onSubmit={handleLogin} className="space-y-6">
              
            

              {/* Language Selector */}
              <div className="space-y-2">
                <Label htmlFor="language" className="text-sm text-stone-400">Language</Label>
                <LanguageSelector />
              </div>

              {/* Sign In Button */}
              <Button
                type="submit"
                disabled={isLoggingIn}
                className="w-full bg-[#ffffff] text-[#0d0d0d] py-3 px-6 rounded-md font-medium hover:bg-[#fde6c4] transition-colors mt-8 shadow-md hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoggingIn ? (
                  <>
                    <div className="w-4 h-4 border-2 border-[#0d0d0d] border-t-transparent rounded-full animate-spin mr-2"></div>
                    {t('auth.signing.in')}
                  </>
                ) : (
                  t('auth.signin')
                )}
              </Button>

             
            </form>
          </div>

          {/* Bottom Navigation */}
          <div className="p-8">
           

            {/* Bottom Links */}
           
          </div>
        </div>
      )}
    </div>
  );
}

export default App;