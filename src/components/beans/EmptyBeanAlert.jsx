
import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, ShoppingCart, Coffee } from "lucide-react";

export default function EmptyBeanAlert({ bean, remainingGrams, onReorder }) {
  if (remainingGrams > 50) return null; // Only show when running low

  const alertLevel = remainingGrams <= 20 ? 'critical' : 'warning';
  
  return (
    <Card className={`border-2 backdrop-blur ${
      alertLevel === 'critical' 
        ? 'border-red-500/50 bg-red-950/20' 
        : 'border-amber-500/50 bg-amber-950/20'
    }`}>
      <CardContent className="p-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="p-2 bg-slate-800/60 rounded-md">
                <Coffee className="w-6 h-6 text-amber-400" />
              </div>
              <AlertTriangle className={`w-4 h-4 absolute -top-1 -right-1 ${
                alertLevel === 'critical' ? 'text-red-400' : 'text-amber-400'
              }`} />
            </div>
            
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Badge className={`text-xs ${
                  alertLevel === 'critical' 
                    ? 'bg-red-500/20 text-red-300 border-red-500/30' 
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                }`}>
                  {alertLevel === 'critical' ? 'Almost Empty' : 'Running Low'}
                </Badge>
                <span className="text-lg font-bold text-amber-400">{remainingGrams}g</span>
              </div>
              
              <h3 className="font-semibold text-foreground">
                {bean?.name || 'Unknown Bean'}
              </h3>
              <p className="text-sm text-muted-foreground">
                {bean?.roaster && `${bean.roaster} • `}{bean?.origin}
              </p>
            </div>
          </div>
          
          <Button 
            onClick={() => onReorder?.(bean)}
            size="sm"
            className="bg-amber-500 hover:bg-amber-400 text-black font-semibold"
          >
            <ShoppingCart className="w-4 h-4 mr-2" />
            Reorder
          </Button>
        </div>
        
        {alertLevel === 'critical' && (
          <div className="mt-3 text-xs text-red-400">
            ⚠️ You have enough for about {Math.floor(remainingGrams / 20)} more brews
          </div>
        )}
      </CardContent>
    </Card>
  );
}
