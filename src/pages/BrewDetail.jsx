
import React, { useState, useEffect, useCallback } from "react";
import { BrewSession, Bean } from "@/api/entities";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import {
  ArrowLeft,
  Coffee,
  Star,
  Thermometer,
  Clock,
  Droplet,
  TrendingUp,
  FlaskConical,
  Ruler,
  Trash2,
  Edit,
  MapPin,
  Calendar
} from "lucide-react";

export default function BrewDetail() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const sessionId = urlParams.get('id');

  const [session, setSession] = useState(null);
  const [bean, setBean] = useState(null);

  const loadSession = useCallback(async () => {
    if (!sessionId) return;
    const sessionData = await BrewSession.filter({ id: sessionId });
    if (sessionData.length > 0) {
      const currentSession = sessionData[0];
      setSession(currentSession);
      if (currentSession.bean_id) {
        const beanData = await Bean.filter({ id: currentSession.bean_id });
        if (beanData.length > 0) {
          setBean(beanData[0]);
        }
      }
    }
  }, [sessionId]);

  useEffect(() => {
    loadSession();
  }, [loadSession]);

  const handleDelete = async () => {
    if (window.confirm("Are you sure you want to delete this brew session?")) {
      try {
        await BrewSession.delete(sessionId);
        navigate(createPageUrl('BrewHistory'));
      } catch (error) {
        console.error("Error deleting session:", error);
      }
    }
  };

  if (!session) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <Coffee className="w-12 h-12 animate-pulse text-muted-foreground" />
      </div>
    );
  }

  const getMethodIcon = (method) => {
    const icons = { v60: '🍃', espresso: '☕', chemex: '🧪', aeropress: '⚡', french_press: '🫖', cold_brew: '🧊' };
    return icons[method] || '☕';
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen bg-background">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(createPageUrl('BrewHistory'))}
            className="border-border hover:bg-secondary"
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Brew Details</h1>
            <p className="text-muted-foreground">{format(new Date(session.created_date), 'MMM d, yyyy • h:mm a')}</p>
          </div>
        </div>

        <Card className="border-border bg-card">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-2xl font-bold text-foreground mb-2">{bean?.name || 'Unknown Bean'}</CardTitle>
                <div className="flex items-center gap-2 text-muted-foreground">
                  <MapPin className="w-4 h-4" />
                  <span>{bean?.origin || 'Unknown Origin'} by {bean?.roaster || 'Unknown Roaster'}</span>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="text-lg">{getMethodIcon(session.method)} {session.method.replace('_', ' ').toUpperCase()}</Badge>
                <div className="flex items-center gap-1">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-5 h-5 ${i < session.rating ? 'text-primary fill-current' : 'text-muted-foreground/30'}`} />
                  ))}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {session.photo_url && (
              <img src={session.photo_url} alt="Brew" className="w-full h-64 object-cover rounded-lg border-border" />
            )}

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-secondary p-3 rounded-lg border-border">
                <Droplet className="w-6 h-6 mx-auto text-primary mb-1" />
                <p className="font-bold text-lg">{session.coffee_dose}g</p>
                <p className="text-sm text-muted-foreground">Dose</p>
              </div>
              <div className="bg-secondary p-3 rounded-lg border-border">
                <Droplet className="w-6 h-6 mx-auto text-primary mb-1" />
                <p className="font-bold text-lg">{session.water_amount}g</p>
                <p className="text-sm text-muted-foreground">Water</p>
              </div>
              <div className="bg-secondary p-3 rounded-lg border-border">
                <Thermometer className="w-6 h-6 mx-auto text-primary mb-1" />
                <p className="font-bold text-lg">{session.water_temp}°C</p>
                <p className="text-sm text-muted-foreground">Temp</p>
              </div>
              <div className="bg-secondary p-3 rounded-lg border-border">
                <Clock className="w-6 h-6 mx-auto text-primary mb-1" />
                <p className="font-bold text-lg">{session.brew_time}s</p>
                <p className="text-sm text-muted-foreground">Time</p>
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div className="bg-muted/50 p-3 rounded-lg">
                <Ruler className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                <p className="font-bold text-lg">{session.brew_ratio}</p>
                <p className="text-sm text-muted-foreground">Ratio</p>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <Droplet className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                <p className="font-bold text-lg">{session.yield}g</p>
                <p className="text-sm text-muted-foreground">Yield</p>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <FlaskConical className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                <p className="font-bold text-lg">{session.tds}%</p>
                <p className="text-sm text-muted-foreground">TDS</p>
              </div>
              <div className="bg-muted/50 p-3 rounded-lg">
                <TrendingUp className="w-6 h-6 mx-auto text-muted-foreground mb-1" />
                <p className="font-bold text-lg">{session.extraction_yield}%</p>
                <p className="text-sm text-muted-foreground">Extraction</p>
              </div>
            </div>

            {session.flavor_notes && (
              <div>
                <h4 className="font-semibold mb-2">Flavor Notes</h4>
                <p className="text-muted-foreground italic bg-secondary p-3 rounded-lg border-border">"{session.flavor_notes}"</p>
              </div>
            )}
            
            {session.brewing_notes && (
              <div>
                <h4 className="font-semibold mb-2">Brewing Notes</h4>
                <p className="text-foreground bg-secondary/50 p-3 rounded-lg">{session.brewing_notes}</p>
              </div>
            )}
          </CardContent>
          <CardFooter className="flex justify-end gap-3 p-6 border-t border-border">
            <Button variant="destructive" onClick={handleDelete}>
              <Trash2 className="w-4 h-4 mr-2" />
              Delete
            </Button>
            <Button className="bg-primary text-primary-foreground hover:bg-primary/90" onClick={() => navigate(createPageUrl(`BrewSession?id=${sessionId}`))}>
              <Edit className="w-4 h-4 mr-2" />
              Edit
            </Button>
          </CardFooter>
        </Card>
      </div>
    </div>
  );
}
