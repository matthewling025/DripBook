
import React, { useState, useEffect, useCallback } from "react";
import { Bean, BrewSession } from "@/api/entities";
import { InvokeLLM } from "@/api/integrations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  History,
  Search,
  Filter,
  Download,
  Star,
  Calendar,
  Coffee,
  Thermometer,
  Clock,
  Droplet,
  TrendingUp,
  FileText,
  Loader2,
  RotateCcw
} from "lucide-react";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// Helper function to format time and round to nearest second
const formatBrewTime = (seconds) => {
  if (!seconds && seconds !== 0) return '0s';
  const roundedSeconds = Math.round(seconds);
  if (roundedSeconds < 60) return `${roundedSeconds}s`;
  const minutes = Math.floor(roundedSeconds / 60);
  const remainingSecs = roundedSeconds % 60;
  return `${minutes}:${remainingSecs.toString().padStart(2, '0')}`;
};

export default function BrewHistory() {
  const [sessions, setSessions] = useState([]);
  const [beans, setBeans] = useState([]);
  const [filteredSessions, setFilteredSessions] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [methodFilter, setMethodFilter] = useState('all');
  const [ratingFilter, setRatingFilter] = useState('all');
  const [tagsFilter, setTagsFilter] = useState('all');
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const navigate = useNavigate();

  // Quick note tags for filtering
  const quickNoteTags = [
    "bright", "chocolatey", "floral", "citrusy", "nutty", "sweet", 
    "bold", "smooth", "overextracted", "underextracted", "fruity", 
    "earthy", "clean", "creamy", "sharp", "balanced"
  ];

  const filterSessions = useCallback(() => {
    let filtered = sessions;

    if (searchTerm) {
      filtered = filtered.filter(session => {
        const bean = beans.find(b => b.id === session.bean_id);
        return (
          bean?.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
          bean?.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
          session.flavor_notes?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          session.brewing_notes?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      });
    }

    if (methodFilter !== 'all') {
      filtered = filtered.filter(session => session.method === methodFilter);
    }

    if (ratingFilter !== 'all') {
      filtered = filtered.filter(session => session.rating >= parseInt(ratingFilter));
    }

    if (tagsFilter !== 'all') {
      filtered = filtered.filter(session => 
        session.flavor_notes?.toLowerCase().includes(tagsFilter.toLowerCase())
      );
    }

    setFilteredSessions(filtered);
  }, [sessions, searchTerm, methodFilter, ratingFilter, tagsFilter, beans]);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    filterSessions();
  }, [filterSessions]);

  const loadData = async () => {
    const [sessionList, beanList] = await Promise.all([
      BrewSession.list('-created_date'),
      Bean.list()
    ]);

    setSessions(sessionList);
    setBeans(beanList);
  };

  const getBeanName = (beanId) => {
    const bean = beans.find(b => b.id === beanId);
    return bean ? `${bean.name} - ${bean.origin}` : 'Unknown Bean';
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

  const repeatBrew = async (session) => {
    // Clone the session data for a new brew
    const clonedSession = {
      ...session,
      id: undefined,
      created_date: undefined,
      updated_date: undefined
    };

    // Navigate to brew session page with the cloned data as URL params
    const params = new URLSearchParams();
    Object.entries(clonedSession).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });

    navigate(`${createPageUrl('BrewSession')}?${params.toString()}`);
  };

  const generateTastingCard = async (session) => {
    setIsGeneratingPdf(true);
    setSelectedSession(session);

    try {
      const bean = beans.find(b => b.id === session.bean_id);

      const prompt = `Create a beautiful Instagram-style coffee tasting card in HTML format for the following brew session:

Bean: ${bean?.name || 'Unknown'} from ${bean?.origin || 'Unknown'}
Roaster: ${bean?.roaster || 'Unknown'}
Method: ${session.method.replace('_', ' ').toUpperCase()}
Ratio: ${session.brew_ratio || '1:16'}
Grind: ${session.grind_size?.replace('_', ' ') || 'Medium'}
Water Temp: ${session.water_temp}°C
Brew Time: ${session.brew_time}s
Rating: ${session.rating}/5 stars
TDS: ${session.tds}%
Extraction: ${session.extraction_yield}%
Flavor Notes: ${session.flavor_notes || 'No notes'}
Date: ${format(new Date(session.created_date), 'MMM d, yyyy')}

Create a modern, Instagram-ready tasting card with:
- Dark sophisticated theme with gold accents
- Beautiful typography and layout
- Professional presentation suitable for social media
- All the brewing parameters clearly displayed
- Make it visually appealing and print-ready
- Size: 1080x1350px (Instagram post format)

Return only the HTML code for the tasting card.`;

      const result = await InvokeLLM({ prompt });

      const newWindow = window.open('', '_blank');
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Coffee Tasting Card - DripBook</title>
          <meta charset="utf-8">
          <style>
            body { 
              margin: 0; 
              padding: 20px; 
              font-family: 'Georgia', serif; 
              background: #f5f5f5;
            }
            @media print {
              body { margin: 0; padding: 0; }
            }
          </style>
        </head>
        <body>
          ${result}
          <div style="text-align: center; margin-top: 20px; font-size: 12px; color: #666;">
            <p>Generated by DripBook - Track your coffee journey at dripbook.co</p>
            <button onclick="window.print()" style="background: #D97706; color: white; border: none; padding: 10px 20px; border-radius: 5px; cursor: pointer;">Print Card</button>
          </div>
          <script>
            // Auto-print after a delay
            setTimeout(() => {
              const autoPrint = confirm("Print this tasting card?");
              if (autoPrint) window.print();
            }, 1500);
          </script>
        </body>
        </html>
      `);
      newWindow.document.close();

    } catch (error) {
      console.error('Error generating tasting card:', error);
      alert('Error generating tasting card. Please try again.');
    }

    setIsGeneratingPdf(false);
    setSelectedSession(null);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground mb-2">Brew History</h1>
          <p className="text-muted-foreground">A complete log of your coffee journey.</p>
        </div>

        {/* Filters */}
        <Card className="border-border bg-card mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Filter className="w-5 h-5 text-primary" />
              Filter Sessions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search beans, notes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Select value={methodFilter} onValueChange={setMethodFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Methods" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="v60">V60</SelectItem>
                  <SelectItem value="espresso">Espresso</SelectItem>
                  <SelectItem value="chemex">Chemex</SelectItem>
                  <SelectItem value="aeropress">AeroPress</SelectItem>
                  <SelectItem value="french_press">French Press</SelectItem>
                  <SelectItem value="cold_brew">Cold Brew</SelectItem>
                </SelectContent>
              </Select>

              <Select value={ratingFilter} onValueChange={setRatingFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="All Ratings" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Ratings</SelectItem>
                  <SelectItem value="5">5 Stars Only</SelectItem>
                  <SelectItem value="4">4+ Stars</SelectItem>
                  <SelectItem value="3">3+ Stars</SelectItem>
                </SelectContent>
              </Select>

              <Select value={tagsFilter} onValueChange={setTagsFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Quick Tags" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Tags</SelectItem>
                  {quickNoteTags.map((tag) => (
                    <SelectItem key={tag} value={tag}>
                      {tag.charAt(0).toUpperCase() + tag.slice(1)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <div className="text-sm text-muted-foreground flex items-center">
                <History className="w-4 h-4 mr-2" />
                {filteredSessions.length} sessions
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Sessions List */}
        {filteredSessions.length === 0 ? (
          <div className="text-center py-16">
            <Coffee className="w-20 h-20 text-muted-foreground/30 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-foreground mb-4">
              {sessions.length === 0 ? 'No brewing sessions yet' : 'No sessions match your filters'}
            </h3>
            <p className="text-muted-foreground">
              {sessions.length === 0 ? 'Start brewing to build your history' : 'Try adjusting your search criteria'}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredSessions.map((session) => (
              <Card
                key={session.id}
                className="border-border bg-card hover:bg-secondary/50 transition-all duration-300 cursor-pointer"
                onClick={() => navigate(createPageUrl(`BrewDetail?id=${session.id}`))}
              >
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
                    {/* Main Info */}
                    <div className="flex-1">
                      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 mb-3">
                        <Badge variant="secondary" className="border text-sm px-3 py-1">
                          {getMethodIcon(session.method)} {session.method.replace('_', ' ').toUpperCase()}
                        </Badge>
                        <div className="flex items-center gap-1">
                          {[...Array(5)].map((_, i) => (
                            <Star
                              key={i}
                              className={`w-4 h-4 ${
                                i < (session.rating || 0) ? 'text-yellow-400 fill-current' : 'text-muted-foreground/30'
                              }`}
                            />
                          ))}
                        </div>
                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <Calendar className="w-4 h-4" />
                          {format(new Date(session.created_date), 'MMM d, yyyy • h:mm a')}
                        </div>
                      </div>

                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        {getBeanName(session.bean_id)}
                      </h3>

                      {/* Stats Grid */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
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
                        <p className="text-muted-foreground text-sm italic">"{session.flavor_notes}"</p>
                      )}
                    </div>

                    {/* Photo and Actions */}
                    <div className="flex items-center gap-3 flex-shrink-0">
                      {session.photo_url && (
                        <img
                          src={session.photo_url}
                          alt="Brew photo"
                          className="w-20 h-20 object-cover rounded-lg border border-border"
                        />
                      )}

                      <div className="flex flex-col gap-2">
                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            repeatBrew(session);
                          }}
                          variant="outline"
                          size="sm"
                          className="border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                        >
                          <RotateCcw className="w-4 h-4 mr-2" />
                          Repeat
                        </Button>

                        <Button
                          onClick={(e) => {
                            e.stopPropagation();
                            generateTastingCard(session);
                          }}
                          disabled={isGeneratingPdf && selectedSession?.id === session.id}
                          variant="outline"
                          size="sm"
                          className="border-border hover:bg-secondary"
                        >
                          {isGeneratingPdf && selectedSession?.id === session.id ? (
                            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          ) : (
                            <FileText className="w-4 h-4 mr-2" />
                          )}
                          Export
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
