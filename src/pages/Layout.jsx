

import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Coffee, 
  Home, 
  Book, 
  History, 
  Heart, 
  MessageSquare, 
  Share2, 
  BarChart3,
  Sun,
  Moon,
  Menu,
  X,
  Plus,
  ChevronLeft,
  ChevronRight
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

const navigationItems = [
  {
    title: "Dashboard",
    url: createPageUrl("Dashboard"),
    icon: Home,
  },
  {
    title: "Brew Methods",
    url: createPageUrl("BrewMethods"),
    icon: Coffee,
  },
  {
    title: "Bean Library",
    url: createPageUrl("BeanLibrary"),
    icon: Book,
  },
  {
    title: "Brew History",
    url: createPageUrl("BrewHistory"),
    icon: History,
  },
  {
    title: "Data Insights",
    url: createPageUrl("DataInsights"),
    icon: BarChart3,
  },
];

export default function Layout({ children, currentPageName }) {
  const location = useLocation();
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Load theme preference on mount
  useEffect(() => {
    const savedTheme = localStorage.getItem('dripbook-theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const shouldBeDark = savedTheme === 'dark' || (savedTheme === null && prefersDark);
    
    setIsDarkMode(shouldBeDark);
    updateTheme(shouldBeDark);
  }, []);

  // Load sidebar state from localStorage
  useEffect(() => {
    const savedCollapsed = localStorage.getItem('dripbook-sidebar-collapsed');
    if (savedCollapsed !== null) {
      setIsCollapsed(JSON.parse(savedCollapsed));
    }
  }, []);

  const updateTheme = (dark) => {
    if (dark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const toggleTheme = () => {
    const newDarkMode = !isDarkMode;
    setIsDarkMode(newDarkMode);
    updateTheme(newDarkMode);
    localStorage.setItem('dripbook-theme', newDarkMode ? 'dark' : 'light');
  };

  const toggleSidebar = () => {
    const newCollapsed = !isCollapsed;
    setIsCollapsed(newCollapsed);
    localStorage.setItem('dripbook-sidebar-collapsed', JSON.stringify(newCollapsed));
  };

  const isActive = (path) => {
    return location.pathname === path;
  };

  const showToast = (message) => {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => {
      document.body.removeChild(toast);
    }, 3000);
  };

  const handleShare = async () => {
    const shareData = {
      title: 'DripBook - Coffee Brewing Companion',
      text: 'Track your coffee brewing journey with DripBook! Record beans, brewing methods, and tasting notes.',
      url: window.location.origin
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      const fullText = `${shareData.title} - ${shareData.text} ${shareData.url}`;
      navigator.clipboard.writeText(fullText);
      showToast('Link copied to clipboard!');
    }
  };

  return (
    <TooltipProvider>
      <SidebarProvider>
        <div className="min-h-screen flex w-full bg-background text-foreground">
          <Sidebar className={`bg-card border-r border-border sidebar-transition ${
            isCollapsed ? 'sidebar-collapsed' : 'sidebar-expanded'
          }`}>
            <SidebarHeader className="border-b border-border p-4 bg-card">
              <div className="flex items-center justify-between">
                <div className={`flex items-center gap-3 ${isCollapsed ? 'justify-center' : ''}`}>
                  <img 
                    src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68bda1e4ac023962388b8a1b/136ff1d8c_DripBooklogo.png" 
                    alt="DripBook Logo" 
                    className="h-10 w-10 object-contain rounded-md flex-shrink-0"
                    onError={(e) => {
                      // Fallback to a coffee icon if logo fails to load
                      e.target.style.display = 'none';
                      const fallback = document.createElement('div');
                      fallback.className = 'h-10 w-10 bg-primary rounded-md flex items-center justify-center';
                      fallback.innerHTML = '☕';
                      e.target.parentNode.appendChild(fallback);
                    }}
                  />
                  {!isCollapsed && (
                    <div>
                      <h2 className="font-bold text-lg text-card-foreground">DripBook</h2>
                      <p className="text-xs text-muted-foreground">Coffee Brewing Companion</p>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="h-8 w-8 text-muted-foreground hover:text-card-foreground focus-visible"
                >
                  {isCollapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                </Button>
              </div>
            </SidebarHeader>
            
            <SidebarContent className="p-3 bg-card">
              <SidebarGroup>
                <SidebarGroupContent>
                  <SidebarMenu>
                    {navigationItems.map((item) => {
                      const active = isActive(item.url);
                      return (
                        <SidebarMenuItem key={item.title}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <SidebarMenuButton 
                                asChild 
                                className={`hover:bg-secondary hover:text-secondary-foreground transition-all duration-200 rounded-lg mb-1 focus-visible ${
                                  active ? 'bg-secondary text-secondary-foreground' : 'text-muted-foreground hover:text-card-foreground'
                                }`}
                              >
                                <Link 
                                  to={item.url} 
                                  className={`flex items-center gap-3 px-4 py-2.5 ${isCollapsed ? 'justify-center' : ''}`}
                                  aria-current={active ? 'page' : undefined}
                                >
                                  <item.icon className={`w-5 h-5 flex-shrink-0 ${active ? 'text-primary' : ''}`} />
                                  {!isCollapsed && <span className="font-medium">{item.title}</span>}
                                </Link>
                              </SidebarMenuButton>
                            </TooltipTrigger>
                            {isCollapsed && (
                              <TooltipContent side="right">
                                <p>{item.title}</p>
                              </TooltipContent>
                            )}
                          </Tooltip>
                        </SidebarMenuItem>
                      );
                    })}
                  </SidebarMenu>
                </SidebarGroupContent>
              </SidebarGroup>

              {/* Pro Upgrade Card */}
              {!isCollapsed && (
                <SidebarGroup className="mt-4">
                  <SidebarGroupContent>
                    <div className="mx-3 mb-4">
                      <div className="bg-gradient-to-br from-primary/20 via-primary/15 to-accent/20 border border-primary/30 p-4 rounded-xl text-card-foreground">
                        <div className="flex items-start justify-between mb-2">
                          <h3 className="font-bold text-lg">Upgrade to Pro</h3>
                          <div className="text-primary">⭐</div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-3">
                          Unlock advanced brewing guides, cloud sync, custom tasting cards, and more...
                        </p>
                        <Button 
                          className="w-full bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium focus-visible"
                          onClick={() => window.open('https://buymeacoffee.com/matthewling', '_blank')}
                        >
                          Coming Soon
                        </Button>
                      </div>
                    </div>
                  </SidebarGroupContent>
                </SidebarGroup>
              )}

              {/* Quick Actions */}
              <SidebarGroup>
                <SidebarGroupContent>
                  <div className="space-y-2 px-3">
                    {/* Support Me Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <a 
                          href="https://buymeacoffee.com/matthewling" 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="block"
                        >
                          <Button className={`w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground border-none focus-visible ${
                            isCollapsed ? 'px-2' : 'justify-start'
                          }`}>
                            <Heart className={`w-4 h-4 text-primary flex-shrink-0 ${!isCollapsed ? 'mr-2' : ''}`} />
                            {!isCollapsed && 'Support DripBook'}
                          </Button>
                        </a>
                      </TooltipTrigger>
                      {isCollapsed && (
                        <TooltipContent side="right">
                          <p>Support DripBook</p>
                        </TooltipContent>
                      )}
                    </Tooltip>

                    {/* Feedback Button */}
                    <Dialog>
                      <DialogTrigger asChild>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button className={`w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground border-none focus-visible ${
                              isCollapsed ? 'px-2' : 'justify-start'
                            }`}>
                              <MessageSquare className={`w-4 h-4 text-primary flex-shrink-0 ${!isCollapsed ? 'mr-2' : ''}`} />
                              {!isCollapsed && 'Feedback & Ideas'}
                            </Button>
                          </TooltipTrigger>
                          {isCollapsed && (
                            <TooltipContent side="right">
                              <p>Feedback & Ideas</p>
                            </TooltipContent>
                          )}
                        </Tooltip>
                      </DialogTrigger>
                      <DialogContent className="bg-card border-border">
                        <DialogHeader>
                          <DialogTitle className="text-card-foreground">Share Your Feedback</DialogTitle>
                          <DialogDescription className="text-muted-foreground">
                            Help make DripBook better! Share your ideas and suggestions with us.
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-3">
                          <a
                            href="https://forms.gle/4HBa58dd1kt9TjfG9"
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 focus-visible">
                              💡 Share Ideas & Suggestions
                            </Button>
                          </a>
                          <p className="text-xs text-muted-foreground text-center">
                            Your feedback helps improve DripBook for everyone!
                          </p>
                        </div>
                      </DialogContent>
                    </Dialog>

                    {/* Share Button */}
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button 
                          onClick={handleShare}
                          className={`w-full bg-secondary hover:bg-secondary/80 text-secondary-foreground border-none focus-visible ${
                            isCollapsed ? 'px-2' : 'justify-start'
                          }`}
                        >
                          <Share2 className={`w-4 h-4 text-primary flex-shrink-0 ${!isCollapsed ? 'mr-2' : ''}`} />
                          {!isCollapsed && 'Share DripBook'}
                        </Button>
                      </TooltipTrigger>
                      {isCollapsed && (
                        <TooltipContent side="right">
                          <p>Share DripBook</p>
                        </TooltipContent>
                      )}
                    </Tooltip>
                  </div>
                </SidebarGroupContent>
              </SidebarGroup>
            </SidebarContent>

            <SidebarFooter className="border-t border-border p-4 bg-card">
              <div className="space-y-2">
                <div className="text-center">
                  {!isCollapsed && (
                    <>
                      <p className="text-xs text-muted-foreground font-medium">
                        Made with ☕ for coffee lovers
                      </p>
                      <p className="text-xs text-muted-foreground">
                        v2.0 • dripbook.co
                      </p>
                    </>
                  )}
                  {isCollapsed && (
                    <div className="flex justify-center">
                      <span className="text-lg">☕</span>
                    </div>
                  )}
                </div>
              </div>
            </SidebarFooter>
          </Sidebar>

          <main className="flex-1 flex flex-col">
            <header className="bg-card/80 backdrop-blur-sm border-b border-border px-4 py-3 md:hidden sticky top-0 z-40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <SidebarTrigger className="hover:bg-secondary p-2 rounded-lg transition-colors duration-200 focus-visible" />
                  <div className="flex items-center gap-2">
                    <img 
                      src="https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68bda1e4ac023962388b8a1b/136ff1d8c_DripBooklogo.png" 
                      alt="DripBook Logo" 
                      className="h-8 w-8 object-contain rounded-md"
                      onError={(e) => {
                        e.target.style.display = 'none';
                        const fallback = document.createElement('div');
                        fallback.className = 'h-8 w-8 bg-primary rounded-md flex items-center justify-center text-sm';
                        fallback.innerHTML = '☕';
                        e.target.parentNode.appendChild(fallback);
                      }}
                    />
                    <h1 className="text-lg font-bold text-foreground">DripBook</h1>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Link to={createPageUrl("BrewMethods")}>
                    <Button 
                      size="sm"
                      className="bg-primary text-primary-foreground hover:bg-primary/90 focus-visible"
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Brew
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={toggleTheme}
                    className="text-muted-foreground hover:text-foreground focus-visible"
                  >
                    {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
                  </Button>
                  <Button 
                    onClick={handleShare}
                    variant="ghost" 
                    size="icon"
                    className="text-muted-foreground hover:text-foreground focus-visible"
                  >
                    <Share2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </header>

            {/* Desktop theme toggle */}
            <div className="hidden md:flex justify-end p-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleTheme}
                className="text-muted-foreground hover:text-foreground focus-visible"
              >
                {isDarkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
            </div>

            <div className="flex-1 overflow-auto">
              <div className="max-w-6xl mx-auto px-4">
                {children}
              </div>
            </div>
          </main>
        </div>
      </SidebarProvider>
    </TooltipProvider>
  );
}

