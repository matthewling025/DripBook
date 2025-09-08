import React, { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Link, useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";
import { BrewRecipe } from "@/api/entities";
import { Plus, Coffee, ArrowRight, Edit, Trash2, Check, GripVertical, Save, X, AlertCircle } from "lucide-react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Badge } from "@/components/ui/badge";
import { insertDefaultRecipes } from "../components/utils/defaultRecipes";

const staticMethods = [
  { id: 'v60', name: 'Hario V60', emoji: '🍃' },
  { id: 'espresso', name: 'Espresso', emoji: '☕' },
  { id: 'chemex', name: 'Chemex', emoji: '🧪' },
  { id: 'aeropress', name: 'AeroPress', emoji: '⚡' },
  { id: 'french_press', name: 'French Press', emoji: '🫖' },
  { id: 'cold_brew', name: 'Cold Brew', emoji: '🧊' }
];

export default function BrewMethods() {
  const navigate = useNavigate();
  const [savedRecipes, setSavedRecipes] = useState([]);
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingRecipeId, setEditingRecipeId] = useState(null);
  const [editingData, setEditingData] = useState({});
  const [validationErrors, setValidationErrors] = useState({});
  const [isSeeding, setIsSeeding] = useState(false);
  const urlParams = new URLSearchParams(window.location.search);
  const selectedMethod = urlParams.get('method');

  // Load recipes with seeding
  const loadRecipes = useCallback(async () => {
    try {
      if (selectedMethod) {
        setIsSeeding(true);
        
        // Run seeding first to ensure default recipes are in the database
        await insertDefaultRecipes();
        
        // Fetch all recipes (user-created and default)
        // A high limit like 100 should be sufficient for current use case.
        const allRecipes = await BrewRecipe.list('-created_date', 100); 
        
        // Filter by the selected method
        const methodRecipes = allRecipes.filter(recipe => recipe.method === selectedMethod);
        
        setSavedRecipes(methodRecipes);
      }
    } catch (error) {
      console.error('Error loading recipes:', error);
    } finally {
      setIsSeeding(false);
    }
  }, [selectedMethod]);

  useEffect(() => {
    loadRecipes();
  }, [loadRecipes]);

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(savedRecipes);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    setSavedRecipes(items);
  };

  const handleDeleteRecipe = async (recipeId) => {
    if (window.confirm('Are you sure you want to delete this recipe?')) {
      try {
        await BrewRecipe.delete(recipeId);
        setSavedRecipes(prev => prev.filter(recipe => recipe.id !== recipeId));
      } catch (error) {
        console.error('Error deleting recipe:', error);
      }
    }
  };

  const startEditingRecipe = (recipe) => {
    // Handle both JSON array and string formats for steps
    let parsedSteps = [];
    try {
      if (Array.isArray(recipe.steps)) {
        parsedSteps = recipe.steps;
      } else if (typeof recipe.steps === 'string') {
        parsedSteps = JSON.parse(recipe.steps || '[]');
      }
    } catch (parseError) {
      console.error('Error parsing recipe steps:', parseError);
      parsedSteps = [];
    }

    // Ensure each step has a 'temp' property, defaulting to the recipe's water_temp
    const defaultStepTemp = recipe.water_temp || 94; // Default if recipe.water_temp is missing too

    const stepsWithTemp = parsedSteps.map(step => ({
      ...step,
      temp: step.temp !== undefined ? step.temp : defaultStepTemp // Use existing temp or default
    }));

    setEditingRecipeId(recipe.id);
    setEditingData({
      ...recipe,
      steps: stepsWithTemp,
      numberOfPours: stepsWithTemp.length.toString(),
      customize_per_step_temp: recipe.customize_per_step_temp || false, // Ensure boolean, default false
      remarks: recipe.remarks || '' // Ensure string, default empty
    });
    setValidationErrors({});
  };

  const handleEditChange = (field, value) => {
    setEditingData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear validation error when user starts fixing it
    if (validationErrors[field]) {
      setValidationErrors(prev => ({
        ...prev,
        [field]: null
      }));
    }
  };

  const handleStepChange = (stepIndex, field, value) => {
    setEditingData(prev => ({
      ...prev,
      steps: prev.steps.map((step, index) => 
        index === stepIndex ? { ...step, [field]: value } : step
      )
    }));
  };

  const handleNumberOfPoursChange = (value) => {
    const numPours = parseInt(value);
    const currentSteps = editingData.steps || [];
    
    let newSteps = [...currentSteps];
    
    if (numPours > currentSteps.length) {
      // Add new steps
      for (let i = currentSteps.length; i < numPours; i++) {
        newSteps.push({
          name: `Pour ${i + 1}`,
          time: `${String(Math.floor(i * 30 / 60)).padStart(2, '0')}:${String((i * 30) % 60).padStart(2, '0')}`,
          water: '0',
          temp: editingData.water_temp || 94 // Default to base temp
        });
      }
    } else if (numPours < currentSteps.length) {
      // Remove excess steps
      newSteps = newSteps.slice(0, numPours);
    }
    
    setEditingData(prev => ({
      ...prev,
      numberOfPours: value,
      steps: newSteps
    }));
  };

  const handleCustomizeTempToggle = (enabled) => {
    setEditingData(prev => {
      const updatedSteps = prev.steps.map(step => ({
        ...step,
        temp: enabled ? (step.temp || prev.water_temp || 94) : (prev.water_temp || 94)
      }));
      
      return {
        ...prev,
        customize_per_step_temp: enabled,
        steps: updatedSteps
      };
    });
  };

  const validateRecipe = () => {
    const errors = {};
    
    if (!editingData.name?.trim()) {
      errors.name = 'Recipe name is required';
    }
    
    if (!editingData.coffee_dose || parseFloat(editingData.coffee_dose) <= 0) {
      errors.coffee_dose = 'Valid coffee dose is required';
    }
    
    if (!editingData.water_amount || parseFloat(editingData.water_amount) <= 0) {
      errors.water_amount = 'Valid water amount is required';
    }
    
    if (!editingData.water_temp || parseFloat(editingData.water_temp) < 70 || parseFloat(editingData.water_temp) > 100) {
      errors.water_temp = 'Water temperature must be between 70-100°C';
    }
    
    // Validate steps
    if (editingData.steps && editingData.steps.length > 0) {
      const lastStep = editingData.steps[editingData.steps.length - 1];
      const finalWater = parseFloat(lastStep.water);
      const totalWater = parseFloat(editingData.water_amount);
      
      if (isNaN(finalWater) || Math.abs(finalWater - totalWater) > 1) {
        errors.steps = `Final cumulative water (${finalWater || 0}ml) must equal total water (${totalWater}ml)`;
      }
      
      // Validate step temperatures
      for (let i = 0; i < editingData.steps.length; i++) {
        const stepTemp = parseFloat(editingData.steps[i].temp);
        if (isNaN(stepTemp) || stepTemp < 70 || stepTemp > 100) {
          errors.steps = `Step ${i + 1} temperature must be between 70-100°C`;
          break;
        }
      }
    }
    
    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveEdit = async () => {
    if (!validateRecipe()) {
      return;
    }
    
    try {
      const updateData = {
        ...editingData,
        steps: JSON.stringify(editingData.steps), // Ensure steps are stringified for DB storage
        coffee_dose: parseFloat(editingData.coffee_dose),
        water_amount: parseFloat(editingData.water_amount),
        water_temp: parseFloat(editingData.water_temp),
        customize_per_step_temp: editingData.customize_per_step_temp || false,
        remarks: editingData.remarks || ''
      };
      
      delete updateData.numberOfPours;
      
      await BrewRecipe.update(editingRecipeId, updateData);
      
      // Force refresh after update to ensure the list is consistent
      await loadRecipes();
      
      setEditingRecipeId(null);
      setEditingData({});
      setValidationErrors({});
      
      alert('Recipe updated successfully!');
    } catch (error) {
      console.error('Error updating recipe:', error);
      alert('Error updating recipe. Please try again.');
    }
  };

  const handleCancelEdit = () => {
    setEditingRecipeId(null);
    setEditingData({});
    setValidationErrors({});
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const parseTimeToSeconds = (timeStr) => {
    const [minutes, seconds] = timeStr.split(':').map(Number);
    return (minutes * 60) + seconds;
  };

  if (!selectedMethod) {
    return (
      <div className="p-4 sm:p-6 md:p-8 min-h-screen bg-background">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <h1 className="text-3xl font-bold text-foreground mb-2">Choose Your Base Method</h1>
            <p className="text-muted-foreground text-lg">Select a method to see saved recipes or create a new one.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {staticMethods.map((method) => (
              <Link to={createPageUrl(`BrewMethods?method=${method.id}`)} key={method.id}>
                <Card className="border-border bg-card hover:bg-secondary/50 transition-all duration-300 group text-center p-6">
                  <div className="text-5xl mb-4">{method.emoji}</div>
                  <CardTitle className="text-xl font-bold text-foreground">{method.name}</CardTitle>
                </Card>
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen bg-background">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div className="text-center flex-1">
            <h1 className="text-3xl font-bold text-foreground mb-2">
              {selectedMethod.replace('_', ' ').toUpperCase()} Recipes
            </h1>
            <p className="text-muted-foreground text-lg">Select a saved recipe or create a new one.</p>
            {isSeeding && (
              <p className="text-xs text-primary mt-2">Loading default recipes...</p>
            )}
          </div>
          
          {savedRecipes.length > 0 && (
            <Button
              onClick={() => {
                if (isEditMode) {
                  setIsEditMode(false);
                  setEditingRecipeId(null);
                  setEditingData({});
                  setValidationErrors({});
                } else {
                  setIsEditMode(true);
                }
              }}
              variant="outline"
              className="border-border hover:bg-secondary"
            >
              {isEditMode ? (
                <>
                  <Check className="w-4 h-4 mr-2" />
                  Done
                </>
              ) : (
                <>
                  ✏️ Edit
                </>
              )}
            </Button>
          )}
        </div>

        <DragDropContext onDragEnd={handleDragEnd}>
          <Droppable droppableId="recipes" isDropDisabled={!isEditMode}>
            {(provided) => (
              <div 
                {...provided.droppableProps} 
                ref={provided.innerRef}
                className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
              >
                {/* Create New Recipe Card */}
                <Card 
                  className="border-dashed border-primary bg-primary/10 hover:bg-primary/20 transition-all duration-300 group flex flex-col items-center justify-center text-center p-6 cursor-pointer"
                  onClick={() => !isEditMode && navigate(createPageUrl(`RecipeCreator?method=${selectedMethod}`))}
                >
                  <div className="w-16 h-16 rounded-full bg-primary/20 flex items-center justify-center mb-4">
                    <Plus className="w-8 h-8 text-primary"/>
                  </div>
                  <CardTitle className="text-xl font-bold text-primary">Create New Recipe</CardTitle>
                </Card>

                {/* Recipe Cards */}
                {savedRecipes.map((recipe, index) => (
                  <Draggable 
                    key={recipe.id} 
                    draggableId={recipe.id} 
                    index={index}
                    isDragDisabled={!isEditMode}
                  >
                    {(provided, snapshot) => (
                      <Card 
                        ref={provided.innerRef}
                        {...provided.draggableProps}
                        className={`border-border bg-card transition-all duration-300 ${
                          snapshot.isDragging ? 'shadow-lg scale-105' : ''
                        } ${editingRecipeId === recipe.id ? 'ring-2 ring-primary/50' : 'hover:bg-secondary/50'}`}
                      >
                        {editingRecipeId === recipe.id ? (
                          // Edit Mode Form
                          <div className="p-6 space-y-4">
                            <div className="flex items-center gap-2 mb-4">
                              {isEditMode && (
                                <div {...provided.dragHandleProps}>
                                  <GripVertical className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                                </div>
                              )}
                              <h3 className="text-lg font-bold text-foreground">Edit Recipe</h3>
                            </div>

                            {/* Recipe Name */}
                            <div className="space-y-2">
                              <Label htmlFor="name">Recipe Name</Label>
                              <Input
                                id="name"
                                value={editingData.name || ''}
                                onChange={(e) => handleEditChange('name', e.target.value)}
                                className={validationErrors.name ? 'border-red-500' : ''}
                              />
                              {validationErrors.name && (
                                <p className="text-red-500 text-sm flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  {validationErrors.name}
                                </p>
                              )}
                            </div>

                            {/* Basic Parameters */}
                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <Label htmlFor="coffee_dose">Coffee Dose (g)</Label>
                                <Input
                                  id="coffee_dose"
                                  type="number"
                                  value={editingData.coffee_dose || ''}
                                  onChange={(e) => handleEditChange('coffee_dose', e.target.value)}
                                  className={validationErrors.coffee_dose ? 'border-red-500' : ''}
                                />
                                {validationErrors.coffee_dose && (
                                  <p className="text-red-500 text-xs">{validationErrors.coffee_dose}</p>
                                )}
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="water_amount">Total Water (ml)</Label>
                                <Input
                                  id="water_amount"
                                  type="number"
                                  value={editingData.water_amount || ''}
                                  onChange={(e) => handleEditChange('water_amount', e.target.value)}
                                  className={validationErrors.water_amount ? 'border-red-500' : ''}
                                />
                                {validationErrors.water_amount && (
                                  <p className="text-red-500 text-xs">{validationErrors.water_amount}</p>
                                )}
                              </div>
                            </div>

                            <div className="grid grid-cols-2 gap-3">
                              <div className="space-y-2">
                                <div className="flex items-center justify-between">
                                  <Label htmlFor="water_temp">Base Water Temp (°C)</Label>
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      id="customize_temp"
                                      checked={editingData.customize_per_step_temp || false}
                                      onChange={(e) => handleCustomizeTempToggle(e.target.checked)}
                                      className="w-4 h-4"
                                    />
                                    <Label htmlFor="customize_temp" className="text-xs">Customize per step</Label>
                                  </div>
                                </div>
                                <Input
                                  id="water_temp"
                                  type="number"
                                  value={editingData.water_temp || ''}
                                  onChange={(e) => {
                                    handleEditChange('water_temp', e.target.value);
                                    // If not customizing per step, update all step temps
                                    if (!editingData.customize_per_step_temp) {
                                      const newTemp = parseFloat(e.target.value) || 94;
                                      setEditingData(prev => ({
                                        ...prev,
                                        water_temp: newTemp,
                                        steps: prev.steps?.map(step => ({ ...step, temp: newTemp })) || []
                                      }));
                                    }
                                  }}
                                  className={validationErrors.water_temp ? 'border-red-500' : ''}
                                />
                                {validationErrors.water_temp && (
                                  <p className="text-red-500 text-xs">{validationErrors.water_temp}</p>
                                )}
                              </div>
                              
                              <div className="space-y-2">
                                <Label htmlFor="numberOfPours">Number of Pours</Label>
                                <Select
                                  value={editingData.numberOfPours || '3'}
                                  onValueChange={handleNumberOfPoursChange}
                                >
                                  <SelectTrigger>
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent>
                                    {[1, 2, 3, 4, 5, 6, 7, 8].map(num => (
                                      <SelectItem key={num} value={num.toString()}>{num}</SelectItem>
                                    ))}
                                  </SelectContent>
                                </Select>
                              </div>
                            </div>

                            {/* Steps Table */}
                            <div className="space-y-2">
                              <Label>Brewing Steps</Label>
                              <div className="border border-border rounded-lg overflow-hidden">
                                <div className="bg-secondary p-2 grid grid-cols-4 gap-2 text-sm font-medium text-muted-foreground">
                                  <span>Step</span>
                                  <span>Start Time</span>
                                  <span>Water (ml)</span>
                                  <span>Temp (°C)</span>
                                </div>
                                {(editingData.steps || []).map((step, index) => {
                                  const prevWater = index > 0 ? parseFloat(editingData.steps[index - 1].water) : 0;
                                  const currentWater = parseFloat(step.water) || 0;
                                  const deltaWater = currentWater - prevWater;
                                  const stepTemp = parseFloat(step.temp);
                                  const tempValid = !isNaN(stepTemp) && stepTemp >= 70 && stepTemp <= 100;
                                  
                                  return (
                                    <div key={index} className="p-2 border-t border-border grid grid-cols-4 gap-2 text-sm">
                                      <div className="flex flex-col">
                                        <span className="font-medium">{step.name}</span>
                                        {deltaWater > 0 && (
                                          <span className="text-xs text-muted-foreground">+{deltaWater}ml</span>
                                        )}
                                      </div>
                                      <Input
                                        value={step.time}
                                        onChange={(e) => handleStepChange(index, 'time', e.target.value)}
                                        placeholder="mm:ss"
                                        className="text-xs h-8"
                                      />
                                      <Input
                                        type="number"
                                        value={step.water}
                                        onChange={(e) => handleStepChange(index, 'water', e.target.value)}
                                        placeholder="ml"
                                        className="text-xs h-8"
                                      />
                                      <Input
                                        type="number"
                                        value={step.temp || editingData.water_temp || ''}
                                        onChange={(e) => handleStepChange(index, 'temp', e.target.value)}
                                        placeholder="°C"
                                        disabled={!editingData.customize_per_step_temp}
                                        className={`text-xs h-8 ${
                                          !tempValid && editingData.customize_per_step_temp ? 'border-red-500' : ''
                                        } ${
                                          !editingData.customize_per_step_temp ? 'bg-muted' : ''
                                        }`}
                                        min="70"
                                        max="100"
                                      />
                                    </div>
                                  );
                                })}
                              </div>
                              {validationErrors.steps && (
                                <p className="text-red-500 text-sm flex items-center gap-1">
                                  <AlertCircle className="w-3 h-3" />
                                  {validationErrors.steps}
                                </p>
                              )}
                            </div>

                            {/* Remarks Section */}
                            <div className="space-y-2">
                              <Label htmlFor="remarks">Remarks & Observations</Label>
                              <Textarea
                                id="remarks"
                                value={editingData.remarks || ''}
                                onChange={(e) => handleEditChange('remarks', e.target.value)}
                                placeholder="Additional notes, adjustments, observations..."
                                className="h-20 resize-none"
                              />
                            </div>

                            {/* Action Buttons */}
                            <div className="flex gap-2 pt-4">
                              <Button
                                onClick={handleSaveEdit}
                                disabled={Object.keys(validationErrors).length > 0}
                                className="flex-1 bg-primary hover:bg-primary/90"
                              >
                                <Save className="w-4 h-4 mr-2" />
                                Save Changes
                              </Button>
                              <Button
                                variant="outline"
                                onClick={handleCancelEdit}
                                className="flex-1 border-border hover:bg-secondary"
                              >
                                <X className="w-4 h-4 mr-2" />
                                Cancel
                              </Button>
                            </div>
                            
                            <Button
                              variant="destructive"
                              onClick={() => handleDeleteRecipe(recipe.id)}
                              className="w-full"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Recipe
                            </Button>
                          </div>
                        ) : (
                          // Display Mode
                          <div className="flex flex-col p-6">
                            <CardHeader className="p-0 mb-4 flex-row items-center justify-between">
                              <div className="flex items-center gap-2 flex-1">
                                {isEditMode && (
                                  <div {...provided.dragHandleProps}>
                                    <GripVertical className="w-4 h-4 text-muted-foreground hover:text-foreground" />
                                  </div>
                                )}
                                
                                <div className="flex-1">
                                  <CardTitle className="text-xl font-bold text-foreground flex items-center gap-2">
                                    {recipe.name}
                                    {recipe.is_default && (
                                      <Badge variant="secondary" className="text-xs bg-amber-100 text-amber-800 border-amber-200">
                                        🌟 Preloaded
                                      </Badge>
                                    )}
                                  </CardTitle>
                                </div>
                              </div>
                              
                              {isEditMode && (
                                <div className="flex gap-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      startEditingRecipe(recipe);
                                    }}
                                    className="border-border hover:bg-secondary"
                                  >
                                    <Edit className="w-4 h-4 mr-1" />
                                    Edit
                                  </Button>
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteRecipe(recipe.id);
                                    }}
                                    className="text-red-500 hover:text-red-700 hover:bg-red-100"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </Button>
                                </div>
                              )}
                            </CardHeader>
                            
                            <CardContent className="p-0 flex-grow space-y-2 text-sm text-muted-foreground">
                              <p>Dose: {recipe.coffee_dose}g</p>
                              <p>Water: {recipe.water_amount}ml</p>
                              <p>Temp: {recipe.water_temp}°C</p>
                              {recipe.steps && (
                                <p>Steps: {
                                  Array.isArray(recipe.steps) 
                                    ? recipe.steps.length 
                                    : (typeof recipe.steps === 'string' ? JSON.parse(recipe.steps).length : 0)
                                }</p>
                              )}
                            </CardContent>
                            
                            {!isEditMode && (
                              <div className="p-0 pt-4 mt-auto">
                                <Button 
                                  className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                                  onClick={() => navigate(`${createPageUrl('BrewSession')}?recipeId=${recipe.id}`)}
                                >
                                  Start Brewing
                                  <ArrowRight className="w-4 h-4 ml-2" />
                                </Button>
                              </div>
                            )}
                          </div>
                        )}
                      </Card>
                    )}
                  </Draggable>
                ))}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
        
        <div className="text-center mt-8">
          <Button variant="link" onClick={() => navigate(createPageUrl('BrewMethods'))}>
            &larr; Back to all methods
          </Button>
        </div>
      </div>
    </div>
  );
}