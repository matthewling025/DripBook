
import React, { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BrewRecipe } from "@/api/entities";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import AutoRatioCalculator from "../components/brewing/AutoRatioCalculator";
import { ArrowLeft, Save, Play, Plus, Trash2, AlertCircle } from "lucide-react";

export default function RecipeCreator() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const method = urlParams.get('method') || 'v60';

  const [formData, setFormData] = useState({
    name: `${method.toUpperCase()} Custom Recipe`,
    method: method,
    coffee_dose: '20',
    water_amount: '320',
    water_temp: '93',
    grind_size: 'medium',
    notes: ''
  });

  const [steps, setSteps] = useState([
    { name: "Bloom", time: "00:10", water: "50" },
    { name: "2nd Pour", time: "00:45", water: "150" },
    { name: "Final Pour", time: "01:30", water: "320" }
  ]);
  const [numPours, setNumPours] = useState(3);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [validationError, setValidationError] = useState('');

  const handleFormChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleStepChange = (index, field, value) => {
    const newSteps = [...steps];
    newSteps[index][field] = value;
    setSteps(newSteps);
  };
  
  const handleNumPoursChange = (value) => {
    const count = parseInt(value, 10);
    setNumPours(count);
    const newSteps = [];
    for (let i = 0; i < count; i++) {
        let name = `${i + 1}th Pour`;
        if (i === 0) name = "Bloom";
        if (i === 1) name = "2nd Pour";
        if (i === 2) name = "3rd Pour";
        if (i === count - 1) name = "Final Pour";

        newSteps.push({
            name: name,
            time: steps[i]?.time || "00:00",
            water: steps[i]?.water || "0"
        });
    }
    setSteps(newSteps);
  };

  useEffect(() => {
    let errors = [];
    
    if (!formData.name.trim()) {
      errors.push("Recipe name is required.");
    }

    if (steps.length > 0) {
      // Check final water matches total water
      const finalWater = parseFloat(steps[steps.length - 1].water);
      const totalWater = parseFloat(formData.water_amount);
      if (!isNaN(finalWater) && !isNaN(totalWater) && finalWater !== totalWater) {
        errors.push(`Final pour water (${finalWater}ml) must match total water amount (${totalWater}ml).`);
      }
      
      // Helper to parse mm:ss to seconds
      const parseTime = (timeStr) => {
        const [minutes, seconds] = timeStr.split(':').map(Number);
        return minutes * 60 + seconds;
      };

      // Check time ordering and water amounts are increasing
      for (let i = 1; i < steps.length; i++) {
        const prevTime = steps[i-1].time;
        const currentTime = steps[i].time;
        
        if (parseTime(currentTime) <= parseTime(prevTime)) {
          errors.push(`${steps[i].name} start time must be greater than ${steps[i-1].name} start time.`);
        }

        const prevWater = parseFloat(steps[i-1].water);
        const currentWater = parseFloat(steps[i].water);
        
        if (!isNaN(prevWater) && !isNaN(currentWater) && currentWater <= prevWater) {
          errors.push(`${steps[i].name} water amount (${currentWater}ml) must be greater than ${steps[i-1].name} water amount (${prevWater}ml).`);
        }
      }
    }
    
    setValidationError(errors.join(' '));
  }, [steps, formData.water_amount, formData.name]);

  const handleSave = async () => {
    if (validationError) {
      alert("Please fix validation errors before saving.");
      return;
    }
    setIsSubmitting(true);
    try {
      await BrewRecipe.create({
        ...formData,
        coffee_dose: parseFloat(formData.coffee_dose),
        water_amount: parseFloat(formData.water_amount),
        water_temp: parseFloat(formData.water_temp),
        steps: JSON.stringify(steps)
      });
      alert("Recipe saved successfully!");
      navigate(createPageUrl(`BrewMethods?method=${method}`));
    } catch (error) {
      console.error("Error saving recipe:", error);
      alert("Failed to save recipe.");
    } finally {
      setIsSubmitting(false);
    }
  };
  
  const handleStartBrewing = () => {
    if (validationError) {
      alert("Please fix validation errors before starting.");
      return;
    }
    const recipeData = {
      ...formData,
      steps: steps
    };
    const params = new URLSearchParams({
      recipeData: JSON.stringify(recipeData)
    });
    navigate(`${createPageUrl('BrewSession')}?${params.toString()}`);
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen bg-background">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="outline" size="icon" onClick={() => navigate(createPageUrl(`BrewMethods?method=${method}`))}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Create New {method.replace('_', ' ').toUpperCase()} Recipe</h1>
            <p className="text-muted-foreground">Define your perfect brew step-by-step.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1 space-y-6">
             <Card className="border-border bg-card">
              <CardHeader><CardTitle>Recipe Name</CardTitle></CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="name" className="sr-only">Recipe Name</Label>
                  <Input 
                    id="name" 
                    value={formData.name} 
                    onChange={e => handleFormChange('name', e.target.value)} 
                    placeholder="e.g., Morning V60 Ritual"
                    required
                  />
                  {!formData.name.trim() && <p className="text-xs text-red-500">Recipe name cannot be empty.</p>}
                </div>
              </CardContent>
             </Card>
             <AutoRatioCalculator formData={formData} onUpdate={handleFormChange} />
          </div>
          <div className="lg:col-span-2">
            <Card className="border-border bg-card">
              <CardHeader><CardTitle>Brew Details</CardTitle></CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="coffee_dose">Coffee Dose (g)</Label>
                    <Input id="coffee_dose" type="number" value={formData.coffee_dose} onChange={e => handleFormChange('coffee_dose', e.target.value)} />
                  </div>
                   <div className="space-y-2">
                    <Label htmlFor="water_amount">Total Water (ml)</Label>
                    <Input id="water_amount" type="number" value={formData.water_amount} onChange={e => handleFormChange('water_amount', e.target.value)} />
                  </div>
                </div>
                 <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="water_temp">Water Temp (°C)</Label>
                    <Input id="water_temp" type="number" value={formData.water_temp} onChange={e => handleFormChange('water_temp', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                     <Label htmlFor="num_pours">Number of Pours</Label>
                     <Select value={String(numPours)} onValueChange={handleNumPoursChange}>
                        <SelectTrigger><SelectValue/></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="1">1</SelectItem>
                            <SelectItem value="2">2</SelectItem>
                            <SelectItem value="3">3</SelectItem>
                            <SelectItem value="4">4</SelectItem>
                            <SelectItem value="5">5</SelectItem>
                        </SelectContent>
                     </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="border-border bg-card">
          <CardHeader><CardTitle>Brewing Steps</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="grid grid-cols-4 gap-4 font-semibold text-muted-foreground px-2">
                  <div>Step Name</div>
                  <div>Start Time (mm:ss)</div>
                  <div>Target Water (ml)</div>
                  <div>Pour Amount (ml)</div>
              </div>
              {steps.map((step, index) => {
                  const prevWater = index > 0 ? parseFloat(steps[index-1].water) : 0;
                  const currentWater = parseFloat(step.water);
                  const delta = !isNaN(currentWater) && !isNaN(prevWater) ? currentWater - prevWater : 0;
                  return (
                      <div key={index} className="grid grid-cols-4 gap-4 items-center">
                          <Input value={step.name} onChange={e => handleStepChange(index, 'name', e.target.value)} />
                          <Input value={step.time} onChange={e => handleStepChange(index, 'time', e.target.value)} placeholder="00:00" />
                          <Input type="number" value={step.water} onChange={e => handleStepChange(index, 'water', e.target.value)} placeholder="ml" />
                          <div className="text-center text-muted-foreground font-mono bg-secondary rounded-md py-2">
                            {delta.toFixed(0)}ml
                          </div>
                      </div>
                  );
              })}
            </div>
             {validationError && (
                <div className="mt-4 flex items-center gap-2 text-red-500 bg-red-950 p-3 rounded-lg">
                    <AlertCircle className="w-5 h-5"/>
                    <p>{validationError}</p>
                </div>
            )}
          </CardContent>
        </Card>
        
        <div className="flex justify-end gap-4">
            <Button variant="outline" size="lg" onClick={handleSave} disabled={isSubmitting || !!validationError}>
                <Save className="w-4 h-4 mr-2"/> {isSubmitting ? "Saving..." : "Save Recipe"}
            </Button>
            <Button size="lg" onClick={handleStartBrewing} disabled={!!validationError} className="bg-primary text-primary-foreground hover:bg-primary/90">
                <Play className="w-4 h-4 mr-2"/> Start Brewing
            </Button>
        </div>
      </div>
    </div>
  );
}
