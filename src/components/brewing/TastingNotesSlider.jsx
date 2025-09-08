import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { 
  Thermometer, 
  Droplet, 
  Coffee, 
  Grape
} from "lucide-react";

const tastingCategories = [
  {
    name: "Acidity",
    icon: Thermometer,
    color: "text-red-500",
    fillColor: "#ef4444", // Corresponds to red-500
    description: "Brightness and tartness"
  },
  {
    name: "Sweetness", 
    icon: Droplet,
    color: "text-orange-500",
    fillColor: "#f97316", // Corresponds to orange-500
    description: "Natural sugars and honey-like notes"
  },
  {
    name: "Body",
    icon: Coffee,
    color: "text-amber-600",
    fillColor: "#d97706", // Corresponds to amber-600
    description: "Mouthfeel and texture"
  },
  {
    name: "Bitterness",
    icon: Grape,
    color: "text-purple-500",
    fillColor: "#a855f7", // Corresponds to purple-500
    description: "Pleasant bitter compounds"
  }
];

export default function TastingNotesSlider({ tastingScores = {}, onScoreChange }) {
  const handleSliderChange = (categoryName, value) => {
    onScoreChange({
      ...tastingScores,
      [categoryName.toLowerCase()]: value
    });
  };

  return (
    <Card className="border-border bg-card">
      <CardHeader>
        <CardTitle className="text-lg font-bold text-foreground">Tasting Notes</CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {tastingCategories.map((category) => {
          const IconComponent = category.icon;
          const score = tastingScores[category.name.toLowerCase()] || 5;
          const fillPercent = ((score - 1) / 9) * 100;
          const sliderStyle = {
            background: `linear-gradient(to right, ${category.fillColor} ${fillPercent}%, hsl(var(--secondary)) ${fillPercent}%)`
          };
          
          return (
            <div key={category.name} className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <IconComponent className={`w-5 h-5 ${category.color}`} />
                  <div>
                    <Label className="text-base font-medium text-foreground">
                      {category.name}
                    </Label>
                    <p className="text-sm text-muted-foreground">
                      {category.description}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-lg font-bold text-foreground">{score}</span>
                  <span className="text-sm text-muted-foreground">/10</span>
                </div>
              </div>
              
              <div className="px-2">
                <input
                  type="range"
                  min="1"
                  max="10"
                  value={score}
                  onChange={(e) => handleSliderChange(category.name, parseInt(e.target.value))}
                  className="w-full h-2 rounded-lg appearance-none cursor-pointer slider"
                  style={sliderStyle}
                />
                <div className="flex justify-between text-xs text-muted-foreground mt-1">
                  <span>1</span>
                  <span>10</span>
                </div>
              </div>
            </div>
          );
        })}
        
        <style jsx>{`
          .slider::-webkit-slider-thumb {
            appearance: none;
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: #D97706;
            cursor: pointer;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
          
          .slider::-moz-range-thumb {
            height: 20px;
            width: 20px;
            border-radius: 50%;
            background: #D97706;
            cursor: pointer;
            border: 2px solid #ffffff;
            box-shadow: 0 2px 4px rgba(0,0,0,0.2);
          }
        `}</style>
      </CardContent>
    </Card>
  );
}