import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Calculator, ArrowRight, RotateCcw } from "lucide-react";

export default function AutoRatioCalculator({ formData, onUpdate }) {
  const [targetRatio, setTargetRatio] = useState("16");
  const [calculationType, setCalculationType] = useState("water"); // "water" or "coffee"

  const calculateFromRatio = () => {
    const ratio = parseFloat(targetRatio);
    if (!ratio || ratio <= 0) return;

    if (calculationType === "water" && formData.coffee_dose) {
      const coffeeDose = parseFloat(formData.coffee_dose);
      if (coffeeDose > 0) {
        const waterAmount = coffeeDose * ratio;
        onUpdate("water_amount", waterAmount.toFixed(1));
      }
    } else if (calculationType === "coffee" && formData.water_amount) {
      const waterAmount = parseFloat(formData.water_amount);
      if (waterAmount > 0) {
        const coffeeDose = waterAmount / ratio;
        onUpdate("coffee_dose", coffeeDose.toFixed(1));
      }
    }
  };

  const commonRatios = [
    { name: "Strong Espresso", ratio: "2" },
    { name: "Espresso", ratio: "2.5" },
    { name: "Strong Pour-over", ratio: "14" },
    { name: "Standard Pour-over", ratio: "16" },
    { name: "Light Pour-over", ratio: "18" },
    { name: "Cold Brew", ratio: "8" }
  ];

  return (
    <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-secondary/5">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2 text-foreground">
          <Calculator className="w-5 h-5 text-primary" />
          Smart Ratio Calculator
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="target-ratio">Target Ratio (1:X)</Label>
            <Input
              id="target-ratio"
              type="number"
              step="0.1"
              value={targetRatio}
              onChange={(e) => setTargetRatio(e.target.value)}
              placeholder="16"
            />
          </div>
          
          <div className="space-y-2">
            <Label>Calculate</Label>
            <Select value={calculationType} onValueChange={setCalculationType}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="water">Water Amount</SelectItem>
                <SelectItem value="coffee">Coffee Dose</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex gap-2">
          <Button 
            onClick={calculateFromRatio}
            className="flex-1 bg-primary hover:bg-primary/90"
            disabled={!targetRatio || (!formData.coffee_dose && calculationType === "water") || (!formData.water_amount && calculationType === "coffee")}
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            Calculate
          </Button>
          
          <Button
            variant="outline"
            onClick={() => {
              setTargetRatio("16");
              setCalculationType("water");
            }}
            className="border-border hover:bg-secondary"
          >
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        <div className="space-y-2">
          <Label className="text-sm text-muted-foreground">Quick Ratios</Label>
          <div className="flex flex-wrap gap-2">
            {commonRatios.map((preset) => (
              <Button
                key={preset.name}
                variant="outline"
                size="sm"
                onClick={() => setTargetRatio(preset.ratio)}
                className="text-xs border-border hover:bg-secondary"
              >
                1:{preset.ratio}
              </Button>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}