
import React, { useState, useEffect } from "react";
import { Bean } from "@/api/entities";
import { BrewSession } from "@/api/entities";
import { User } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { 
  Coffee, 
  TrendingUp, 
  Star, 
  Plus, 
  ChevronRight,
  Thermometer,
  Clock,
  Droplet,
  Zap,
  History,
  Book
} from "lucide-react";
import { format } from "date-fns";
import EmptyBeanAlert from "../components/beans/EmptyBeanAlert";
import { insertDefaultRecipes } from "../components/utils/defaultRecipes";

// Helper function to format time and round to nearest second
const formatBrewTime = (seconds) => {
  if (seconds === null || seconds === undefined) return '0s'; // Handle null/undefined explicitly
  const roundedSeconds = Math.round(seconds);
  if (roundedSeconds < 60) return `${roundedSeconds}s`;
  const minutes = Math.floor(roundedSeconds / 60);
  const remainingSecs = roundedSeconds % 60;
  return `${minutes}:${remainingSecs.toString().padStart(2, '0')}`;
};

const V60Logo = () => (
  <svg
    width="40"
    height="40"
    viewBox="0 0 24 24"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className="text-amber-400"
  >
    <path
      d="M4.5 4H19.5L12 20.5L4.5 4Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <path
      d="M8 9H16"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const greetingPhrases = [
  "Another coffee,",
  "Ready to brew something new,",
  "What's in your cup today,",
  "Let's make this one count,",
  "Time for a perfect pour,",
  "Back for another brew,",
  "New bean, same ritual,",
  "Brew your moment,",
  "Coffee log, unlocked,",
  "One drip at a time,"
];

export default function Dashboard() {
  const [recentSessions, setRecentSessions] = useState([]);
  const [beans, setBeans] = useState([]);
  const [stats, setStats] = useState({
    totalSessions: 0,
    avgRating: 0,
    favMethod: '',
    thisWeekSessions: 0
  });
  const [lowBeans, setLowBeans] = useState([]);
  const [greeting, setGreeting] = useState('');
  const [userName, setUserName] = useState('there');

  useEffect(() => {
    loadDashboardData();
    loadUserAndGreeting();
    checkAndLoadDefaultRecipes();
  }, []);

  const loadUserAndGreeting = async () => {
    try {
      const user = await User.me();
      const displayName = user?.full_name || 'there';
      setUserName(displayName);

      // Check if we have a cached greeting for this session
      let cachedGreeting = sessionStorage.getItem('dashboardGreeting');
      if (!cachedGreeting) {
        // Generate a new random greeting and cache it
        const randomPhrase = greetingPhrases[Math.floor(Math.random() * greetingPhrases.length)];
        cachedGreeting = randomPhrase;
        sessionStorage.setItem('dashboardGreeting', cachedGreeting);
      }
      setGreeting(cachedGreeting);
    } catch (error) {
      // User not logged in or error - use default
      setUserName('there');
      let cachedGreeting = sessionStorage.getItem('dashboardGreeting');
      if (!cachedGreeting) {
        const randomPhrase = greetingPhrases[Math.floor(Math.random() * greetingPhrases.length)];
        cachedGreeting = randomPhrase;
        sessionStorage.setItem('dashboardGreeting', cachedGreeting);
      }
      setGreeting(cachedGreeting);
    }
  };

  const loadDashboardData = async () => {
    const [sessions, allBeans] = await Promise.all([
      BrewSession.list('-created_date', 5),
      Bean.list('-created_date', 3)
    ]);

    setRecentSessions(sessions);
    setBeans(allBeans);

    // Check for beans running low (simulate remaining grams)
    const beansWithRemaining = allBeans.map(bean => ({
      ...bean,
      // Simulate remaining grams based on a random reduction from bag_size (default to 250 if not set)
      // Ensure remainingGrams is not negative
      remainingGrams: Math.max(0, (bean.bag_size || 250) - Math.floor(Math.random() * 200)) 
    }));
    
    const lowStockBeans = beansWithRemaining.filter(bean => bean.remainingGrams <= 50);
    setLowBeans(lowStockBeans);

    // Calculate stats
    const allSessions = await BrewSession.list();
    const avgRating = allSessions.length > 0 
      ? allSessions.reduce((sum, s) => sum + (s.rating || 0), 0) / allSessions.length 
      : 0;
    
    const methodCounts = {};
    allSessions.forEach(s => {
      methodCounts[s.method] = (methodCounts[s.method] || 0) + 1;
    });
    
    let favMethod = '';
    if (Object.keys(methodCounts).length > 0) {
      const mostUsedMethod = Object.keys(methodCounts).reduce((a, b) => 
        methodCounts[a] > methodCounts[b] ? a : b);
      favMethod = mostUsedMethod;
    }

    const thisWeek = allSessions.filter(s => 
      new Date(s.created_date) > new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)
    ).length;

    setStats({
      totalSessions: allSessions.length,
      avgRating: avgRating,
      favMethod: favMethod,
      thisWeekSessions: thisWeek
    });
  };

  const checkAndLoadDefaultRecipes = async () => {
    try {
      // Always try to seed recipes on dashboard load.
      // The insertDefaultRecipes function should handle deduplication internally.
      console.log('Attempting to seed default recipes...');
      await insertDefaultRecipes();
      console.log('Default recipes seeding process completed.');
    } catch (error) {
      console.log('Could not seed default recipes:', error.message);
    }
  };

  const handleReorderBean = (bean) => {
    // Placeholder: In a real app, this would open an external link or a reorder modal
    alert(`Reorder ${bean.name} from ${bean.roaster}!\nThis would integrate with your preferred coffee supplier or link to a purchase page.`);
  };

  const getMethodIcon = (method) => {
    const icons = {
      v60: '🍃',
      espresso: '☕',
      chemex: '🧪',
      aeropress: '⚡',
      french_press: '🫖',
      cold_brew: '🧊'
    };
    return icons[method] || '☕';
  };

  const getMethodColor = (method) => {
    return 'bg-secondary text-secondary-foreground border-border';
  };

  const getMethodDisplayName = (method) => {
    const methodNames = {
      v60: 'V60',
      espresso: 'Espresso',
      chemex: 'Chemex',
      aeropress: 'AeroPress',
      french_press: 'French Press',
      cold_brew: 'Cold Brew'
    };
    return methodNames[method] || method?.replace('_', ' ') || '';
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen bg-background">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground break-words tracking-tight">
              New bean, same ritual, {userName}?
            </h1>
            <p className="text-slate-300 leading-relaxed max-w-[48ch] mt-2">
              Track beans, dial in brews, and craft beautiful tasting cards to share.
            </p>
          </div>
          <Link to={createPageUrl("BrewMethods")} className="hidden sm:block">
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
              <Plus className="w-4 h-4 mr-2" />
              New Brew
            </Button>
          </Link>
        </div>

        {/* Mobile New Brew Button */}
        <div className="sm:hidden">
          <Link to={createPageUrl("BrewMethods")}>
            <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90 font-semibold">
              <Plus className="w-4 h-4 mr-2" />
              New Brew
            </Button>
          </Link>
        </div>

        {/* Low Stock Alerts */}
        {lowBeans.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xl font-semibold text-foreground">Bean Alerts</h2>
            {lowBeans.map(bean => (
              <EmptyBeanAlert
                key={bean.id}
                bean={bean}
                remainingGrams={bean.remainingGrams}
                onReorder={handleReorderBean}
              />
            ))}
          </div>
        )}

        {/* Welcome Message for New Users - Refreshed Design */}
        {stats.totalSessions === 0 && (
          <div className="max-w-2xl mx-auto px-4 md:px-6">
            <div className="bg-slate-900/60 backdrop-blur-xl border border-slate-800 rounded-2xl p-6 md:p-8 relative overflow-hidden">
              {/* Top highlight gradient */}
              <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-amber-500/10 to-transparent" />
              
              <div className="text-center space-y-6">
                {/* Logo with animation */}
                <div className="w-16 h-16 md:w-18 md:h-18 bg-slate-800/60 rounded-full flex items-center justify-center mx-auto ring-1 ring-slate-700 animate-pulse">
                  <svg
                    width="40"
                    height="40"
                    viewBox="0 0 24 24"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                    className="text-amber-400 transform translate-y-1"
                    alt="DripBook logo"
                  >
                    <path
                      d="M4.5 4H19.5L12 20.5L4.5 4Z"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    <path
                      d="M8 9H16"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                    {/* Pen mark accent */}
                    <circle cx="16" cy="6" r="1" fill="currentColor" />
                  </svg>
                </div>

                {/* Headline */}
                <h2 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
                  Welcome to DripBook! ☕
                </h2>

                {/* Description */}
                <p className="text-slate-300 leading-relaxed max-w-[48ch] mx-auto text-base">
                  Your coffee brewing journey starts here. Track beans, record brewing methods, and create beautiful tasting cards to share!
                </p>

                {/* Buttons */}
                <div className="flex flex-col sm:flex-row gap-3 justify-center items-center">
                  <Link to={createPageUrl("BeanLibrary")} className="w-full sm:w-auto">
                    <Button 
                      variant="outline" 
                      className="w-full sm:w-auto bg-slate-800 hover:bg-slate-700 text-slate-100 border-slate-700 hover:border-slate-600"
                    >
                      <div className="w-4 h-4 mr-2 rounded-full bg-amber-600" />
                      Add Your First Bean
                    </Button>
                  </Link>
                  
                  {/* Amber divider dot - desktop only */}
                  <div className="hidden sm:block w-1 h-1 bg-amber-500 rounded-full" />
                  
                  <Link to={createPageUrl("BrewMethods")} className="w-full sm:w-auto">
                    <Button className="w-full sm:w-auto bg-amber-500 hover:bg-amber-400 text-black font-semibold">
                      <Coffee className="w-4 h-4 mr-2" />
                      Start Your First Brew
                    </Button>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Stats Cards - Unified amber coffee theme */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Card className="bg-slate-900/40 border-slate-800 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800/60 rounded-md">
                  <Coffee className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.totalSessions}</p>
                  <p className="text-sm text-muted-foreground">Total Brews</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/40 border-slate-800 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800/60 rounded-md">
                  <Star className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.avgRating.toFixed(1)}</p>
                  <p className="text-sm text-muted-foreground">Avg Rating</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/40 border-slate-800 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800/60 rounded-md">
                  <TrendingUp className="w-6 h-6 text-amber-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-foreground">{stats.thisWeekSessions}</p>
                  <p className="text-sm text-muted-foreground">This Week</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="bg-slate-900/40 border-slate-800 backdrop-blur">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-800/60 rounded-md">
                  <Zap className="w-6 h-6 text-amber-400" />
                </div>
                <div className="text-center">
                  <p className="text-lg font-bold text-foreground">
                    {stats.favMethod ? getMethodDisplayName(stats.favMethod) : 'No favorite set'}
                  </p>
                  <p className="text-sm text-muted-foreground">Fav Method</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Recent Sessions - Enhanced glass theme */}
        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur">
          <CardHeader className="border-b border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <History className="w-5 h-5 text-amber-400" />
                Recent Brews
              </CardTitle>
              <Link to={createPageUrl("BrewHistory")}>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-slate-800/60">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-0">
            {recentSessions.length === 0 ? (
              <div className="text-center py-12 px-6">
                <Coffee className="w-16 h-16 text-amber-400/30 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-foreground mb-2">No brews yet</h3>
                <p className="text-muted-foreground mb-4">Start brewing to see your sessions here</p>
                <Link to={createPageUrl("BrewMethods")}>
                  <Button className="bg-amber-500 hover:bg-amber-400 text-black font-semibold">
                    <Plus className="w-4 h-4 mr-2" />
                    Start Your First Brew
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="divide-y divide-slate-800">
                {recentSessions.map((session) => (
                  <Link key={session.id} to={createPageUrl('BrewSessionDetail', { id: session.id })} className="block no-underline">
                    <div className="p-6 hover:bg-slate-800/30 transition-colors">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <Badge variant="secondary" className="border">
                            {getMethodIcon(session.method)} {session.method.replace('_', ' ').toUpperCase()}
                          </Badge>
                          <div className="flex items-center gap-1">
                            {[...Array(5)].map((_, i) => (
                              <Star 
                                key={i} 
                                className={`w-4 h-4 ${
                                  i < (session.rating || 0) ? 'text-yellow-400 fill-current' : 'text-muted-foreground/50'
                                }`} 
                              />
                            ))}
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {format(new Date(session.created_date), 'MMM d, h:mm a')}
                        </p>
                      </div>

                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Droplet className="w-4 h-4 text-muted-foreground" />
                          <span className="text-foreground">{session.coffee_dose}g : {session.water_amount}g</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Thermometer className="w-4 h-4 text-muted-foreground" />
                          <span className="text-foreground">{session.water_temp}°C</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-4 h-4 text-muted-foreground" />
                          <span className="text-foreground">{formatBrewTime(session.brew_time)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <TrendingUp className="w-4 h-4 text-muted-foreground" />
                          <span className="text-foreground">{session.extraction_yield}%</span>
                        </div>
                      </div>

                      {session.flavor_notes && (
                        <p className="text-muted-foreground text-sm mt-3 italic">"{session.flavor_notes}"</p>
                      )}
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Bean Library Preview - Enhanced glass theme */}
        <Card className="bg-slate-900/40 border-slate-800 backdrop-blur">
          <CardHeader className="border-b border-slate-800">
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl font-bold flex items-center gap-2">
                <Book className="w-5 h-5 text-amber-400" />
                Your Beans
              </CardTitle>
              <Link to={createPageUrl("BeanLibrary")}>
                <Button variant="ghost" size="sm" className="text-muted-foreground hover:text-foreground hover:bg-slate-800/60">
                  View All <ChevronRight className="w-4 h-4 ml-1" />
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent className="p-6">
            {beans.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-muted-foreground mb-4">No beans in your collection yet</p>
                <Link to={createPageUrl("BeanLibrary")}>
                  <Button variant="outline" className="bg-slate-800/60 hover:bg-slate-700 border-slate-700 text-slate-100">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Your First Bean
                  </Button>
                </Link>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {beans.map((bean) => (
                  <div key={bean.id} className="bg-slate-800/40 rounded-lg p-4 border border-slate-700 backdrop-blur">
                    <h4 className="font-semibold text-foreground mb-1 truncate">{bean.name}</h4>
                    <p className="text-sm text-muted-foreground mb-2 truncate">{bean.origin} • {bean.roaster}</p>
                    <Badge variant="secondary" className="text-xs bg-amber-500/20 text-amber-300 border-amber-500/30">
                      {bean.roast_level?.replace('_', ' ')}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
