
import React, { useState, useEffect, useCallback } from "react";
import { Bean, BrewSession, BrewRecipe } from "@/api/entities";
import { UploadFile } from "@/api/integrations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import {
  Coffee,
  Camera,
  Save,
  ArrowLeft,
  Thermometer,
  Clock,
  Droplet,
  Star,
  Calculator,
  Upload,
  Loader2,
  CheckCircle,
  ThumbsUp
} from "lucide-react";
import { format } from 'date-fns';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";

import TastingNotesSlider from "../components/brewing/TastingNotesSlider";
import EnhancedBrewTimer from "../components/brewing/EnhancedBrewTimer";
import AutoRatioCalculator from "../components/brewing/AutoRatioCalculator";
import QuickNotesSelector from "../components/brewing/QuickNotesSelector";
import BrewCompletionPopup from "../components/brewing/BrewCompletionPopup";

export default function BrewSessionPage() {
  const navigate = useNavigate();
  const urlParams = new URLSearchParams(window.location.search);
  const recipeId = urlParams.get('recipeId');
  const recipeDataParam = urlParams.get('recipeData');

  const [beans, setBeans] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedQuickTags, setSelectedQuickTags] = useState([]);
  const [tastingScores, setTastingScores] = useState({ acidity: 5, sweetness: 5, body: 5, bitterness: 5 });

  const [brewCompleted, setBrewCompleted] = useState(false);
  const [showCompletionPopup, setShowCompletionPopup] = useState(false);
  
  const [recipe, setRecipe] = useState(null);

  const [formData, setFormData] = useState({
    bean_id: '',
    rating: 5,
    flavor_notes: '',
    brewing_notes: '',
    photo_url: '',
    acidity_score: 5,
    sweetness_score: 5,
    body_score: 5,
    bitterness_score: 5
  });
  
  const loadBeans = useCallback(async () => {
    try {
      const beanList = await Bean.list();
      setBeans(beanList);
    } catch (error) {
      console.error('Error loading beans:', error);
    }
  }, []);

  useEffect(() => {
    loadBeans();
    
    async function loadRecipe() {
      try {
        if (recipeId) {
          // Use list method with filter instead of filter method
          const allRecipes = await BrewRecipe.list();
          const recipeResult = allRecipes.find(r => r.id === recipeId);
          
          if (recipeResult) {
            // Ensure steps is properly parsed and has default structure
            let parsedSteps = [];
            try {
              parsedSteps = JSON.parse(recipeResult.steps || '[]');
            } catch (parseError) {
              console.error('Error parsing recipe steps:', parseError);
              parsedSteps = [];
            }
            
            const parseTimeToSeconds = (timeStr) => {
              if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return 0;
              const [minutes, seconds] = timeStr.split(':').map(Number);
              return (minutes * 60) + (seconds || 0);
            };

            const totalPlannedTime = parsedSteps.length > 0 
              ? parseTimeToSeconds(parsedSteps[parsedSteps.length - 1].time)
              : 0;

            // Set recipe with parsed steps and ensure all required fields exist
            setRecipe({
              ...recipeResult,
              steps: parsedSteps,
              totalTime: totalPlannedTime, // Add total planned time for the popup
              // Ensure required fields have defaults
              coffee_dose: recipeResult.coffee_dose || 17,
              water_amount: recipeResult.water_amount || 255,
              water_temp: recipeResult.water_temp || 94,
              grind_size: recipeResult.grind_size || 'medium_fine',
              method: recipeResult.method || 'v60',
              customize_per_step_temp: recipeResult.customize_per_step_temp || false
            });
          } else {
            console.error('Recipe not found with id:', recipeId);
            // Fallback to a basic recipe structure
            setRecipe({
              name: 'Unknown Recipe',
              method: 'v60',
              coffee_dose: 17,
              water_amount: 255,
              water_temp: 94,
              steps: [],
              totalTime: 0
            });
          }
        } else if (recipeDataParam) {
          try {
            const parsedRecipe = JSON.parse(recipeDataParam);
            // If totalTime is not present in parsedRecipe, calculate it
            const parseTimeToSeconds = (timeStr) => {
              if (!timeStr || typeof timeStr !== 'string' || !timeStr.includes(':')) return 0;
              const [minutes, seconds] = timeStr.split(':').map(Number);
              return (minutes * 60) + (seconds || 0);
            };
            const totalPlannedTime = parsedRecipe.steps && parsedRecipe.steps.length > 0 
              ? parseTimeToSeconds(parsedRecipe.steps[parsedRecipe.steps.length - 1].time)
              : 0;
            setRecipe({...parsedRecipe, totalTime: parsedRecipe.totalTime || totalPlannedTime});
          } catch (parseError) {
            console.error('Error parsing recipe data from URL:', parseError);
          }
        } else {
          console.log('No recipe ID or data provided');
        }
      } catch (error) {
        console.error('Error loading recipe:', error);
        alert('Error loading recipe. Please try again.');
      }
    }
    
    loadRecipe();
  }, [recipeId, recipeDataParam, loadBeans]);

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const result = await UploadFile({ file });
      if (result?.file_url) {
        handleInputChange('photo_url', result.file_url);
      } else {
        alert('Photo upload failed. Please try again.');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      alert('Error uploading photo. Please try again.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleTastingScoresChange = (scores) => {
    setTastingScores(scores);
    Object.entries(scores).forEach(([key, value]) => {
      handleInputChange(`${key}_score`, value);
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const dataToSave = {
        ...formData,
        ...recipe, // Add all recipe data to the session
        rating: parseInt(formData.rating, 10) || null,
        acidity_score: parseInt(tastingScores.acidity, 10) || null,
        sweetness_score: parseInt(tastingScores.sweetness, 10) || null,
        body_score: parseInt(tastingScores.body, 10) || null,
        bitterness_score: parseInt(tastingScores.bitterness, 10) || null,
        steps: JSON.stringify(recipe.steps) // Ensure steps are stored as string
      };
      
      delete dataToSave.id; // Remove recipe id

      await BrewSession.create(dataToSave);

      // Deduct coffee dose from bean's weight_left
      if (formData.bean_id && recipe.coffee_dose) {
        const selectedBean = beans.find(b => b.id === formData.bean_id);
        const coffeeDose = parseFloat(recipe.coffee_dose);

        if (selectedBean && !isNaN(coffeeDose) && coffeeDose > 0) {
          const currentWeight = selectedBean.weight_left !== null && selectedBean.weight_left !== undefined
                                ? selectedBean.weight_left
                                : (selectedBean.bag_size !== null && selectedBean.bag_size !== undefined ? selectedBean.bag_size : 0);
          
          const newWeight = Math.max(0, currentWeight - coffeeDose);
          
          await Bean.update(formData.bean_id, { weight_left: newWeight });
          
          // Show toast notification
          alert(`Bean '${selectedBean.name}' weight updated: ${newWeight}g left.`);
          
          // Show additional alert if bag is empty
          if (newWeight <= 0) {
            if (window.confirm('Bag is empty! Would you like to archive this bean or mark it for restocking?')) {
              // This is where you might implement further actions, e.g.,
              // await Bean.update(formData.bean_id, { status: 'empty/restock' });
              alert('Bean marked for restocking (placeholder action).');
            }
          }
        }
      }

      setShowCompletionPopup(false);
      navigate(createPageUrl('BrewHistory'));
    } catch (error) {
      console.error('Error saving brew session:', error);
      alert('Error saving brew session. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleTimerComplete = (finalTime) => {
    setBrewCompleted(true);
    setShowCompletionPopup(true);
    setRecipe(prev => ({...prev, brew_time: Math.round(finalTime)})); // Round to nearest second
  };

  const handleReviewTaste = () => {
    setShowCompletionPopup(false);
    document.getElementById('review-section')?.scrollIntoView({ behavior: 'smooth' });
  };
  
  if (!recipe) {
    return <div className="p-8 text-center"><Loader2 className="w-8 h-8 animate-spin mx-auto"/></div>
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}><ArrowLeft className="w-4 h-4" /></Button>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{recipe.name}</h1>
            <p className="text-muted-foreground">Using {recipe.method.replace('_', ' ').toUpperCase()} method</p>
            <p className="text-xs text-muted-foreground">
              Session created: {format(new Date(), 'MMM d, yyyy • h:mm a')}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-1">
            <EnhancedBrewTimer
              recipe={recipe}
              onComplete={handleTimerComplete}
            />
          </div>

          <div className="lg:col-span-2 space-y-6">
            <div id="review-section">
              {brewCompleted ? (
                <form onSubmit={handleSubmit} className="space-y-6">
                  <Card className="border-border bg-card">
                    <CardHeader><CardTitle>Record Your Brew</CardTitle></CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-2">
                        <Label htmlFor="bean_id">Coffee Bean</Label>
                        <Select value={formData.bean_id} onValueChange={(value) => handleInputChange('bean_id', value)} required>
                          <SelectTrigger><SelectValue placeholder="Select a bean from your library" /></SelectTrigger>
                          <SelectContent>{beans.map((bean) => <SelectItem key={bean.id} value={bean.id}>{bean.name} - {bean.origin}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>

                       <div className="space-y-2">
                          <Label>Rating</Label>
                          <div className="flex gap-2">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <button key={star} type="button" onClick={() => handleInputChange('rating', star)} className="p-1">
                                <Star className={`w-8 h-8 transition-colors ${star <= formData.rating ? 'text-yellow-400 fill-current' : 'text-muted-foreground/30'}`} />
                              </button>
                            ))}
                          </div>
                       </div>
                       
                       <QuickNotesSelector
                        selectedTags={selectedQuickTags}
                        onTagsChange={setSelectedQuickTags}
                        flavorNotes={formData.flavor_notes}
                        onFlavorNotesChange={(notes) => handleInputChange('flavor_notes', notes)}
                      />

                      <div className="space-y-2">
                        <Label htmlFor="flavor_notes">Flavor Notes</Label>
                        <Textarea id="flavor_notes" value={formData.flavor_notes} onChange={(e) => handleInputChange('flavor_notes', e.target.value)} placeholder="Bright acidity, chocolate notes..." className="h-20" />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="brewing_notes">Brewing Notes</Label>
                        <Textarea id="brewing_notes" value={formData.brewing_notes} onChange={(e) => handleInputChange('brewing_notes', e.target.value)} placeholder="Observations, adjustments..." className="h-20" />
                      </div>
                      
                      <div className="space-y-2">
                        <Label htmlFor="photo">Photo</Label>
                        <Input type="file" id="photo" accept="image/*" onChange={handlePhotoUpload} />
                        {isUploading && <Loader2 className="animate-spin"/>}
                        {formData.photo_url && <img src={formData.photo_url} alt="Brew" className="w-32 h-32 object-cover rounded-lg mt-2" />}
                      </div>

                      <TastingNotesSlider tastingScores={tastingScores} onScoreChange={handleTastingScoresChange} />
                      
                      <Button type="submit" disabled={isSubmitting} className="w-full bg-primary text-primary-foreground hover:bg-primary/90 py-3">
                        <Save className="w-4 h-4 mr-2" />
                        {isSubmitting ? 'Saving...' : 'Save Brew Session'}
                      </Button>
                    </CardContent>
                  </Card>
                </form>
              ) : (
                 <Card className="border-border bg-card">
                   <CardContent className="p-6 text-center text-muted-foreground">
                      <Clock className="w-12 h-12 mx-auto mb-4"/>
                      <p>Complete the brew timer to add your tasting notes and save the session.</p>
                   </CardContent>
                 </Card>
              )}
            </div>
          </div>
        </div>

        <BrewCompletionPopup
          isOpen={showCompletionPopup}
          onClose={() => setShowCompletionPopup(false)}
          onReviewTaste={handleReviewTaste}
          brewData={recipe}
        />
      </div>
    </div>
  );
}
