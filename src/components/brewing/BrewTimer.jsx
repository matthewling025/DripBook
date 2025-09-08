import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Play, Pause, RotateCcw, Clock } from "lucide-react";

const methodTimings = {
  v60: {
    name: "V60 Pour Over",
    totalTime: 150, // 2:30
    steps: [
      { name: "Bloom", duration: 30, instruction: "Pour 2x coffee weight in water" },
      { name: "First Pour", duration: 45, instruction: "Pour to 60% total water" },
      { name: "Final Pour", duration: 45, instruction: "Pour remaining water" },
      { name: "Drawdown", duration: 30, instruction: "Wait for complete drawdown" }
    ]
  },
  chemex: {
    name: "Chemex",
    totalTime: 240, // 4:00
    steps: [
      { name: "Bloom", duration: 45, instruction: "Pour 3x coffee weight" },
      { name: "First Pour", duration: 60, instruction: "Pour to 50% total water" },
      { name: "Second Pour", duration: 60, instruction: "Pour to 80% total water" },
      { name: "Final Pour", duration: 75, instruction: "Complete brewing" }
    ]
  },
  espresso: {
    name: "Espresso",
    totalTime: 30,
    steps: [
      { name: "Pre-infusion", duration: 5, instruction: "9 bars pressure" },
      { name: "Extraction", duration: 25, instruction: "Maintain 9 bars" }
    ]
  },
  aeropress: {
    name: "AeroPress",
    totalTime: 90,
    steps: [
      { name: "Bloom", duration: 30, instruction: "Add water and stir" },
      { name: "Steep", duration: 45, instruction: "Let it steep" },
      { name: "Press", duration: 15, instruction: "Press slowly" }
    ]
  },
  french_press: {
    name: "French Press",
    totalTime: 240, // 4:00
    steps: [
      { name: "Add Coffee", duration: 30, instruction: "Add ground coffee" },
      { name: "Bloom", duration: 30, instruction: "Add small amount of water" },
      { name: "Full Water", duration: 30, instruction: "Add remaining water" },
      { name: "Steep", duration: 150, instruction: "Wait and steep" }
    ]
  }
};

export default function BrewTimer({ method, onComplete }) {
  const [isActive, setIsActive] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentStep, setCurrentStep] = useState(0);
  
  const timing = methodTimings[method] || methodTimings.v60;
  const totalTime = timing.totalTime;
  const steps = timing.steps;
  
  let elapsedStepTime = 0;
  for (let i = 0; i < currentStep; i++) {
    elapsedStepTime += steps[i].duration;
  }
  const currentStepProgress = Math.min(100, ((currentTime - elapsedStepTime) / steps[currentStep]?.duration) * 100);

  useEffect(() => {
    let interval = null;
    
    if (isActive && currentTime < totalTime) {
      interval = setInterval(() => {
        setCurrentTime(time => {
          const newTime = time + 1;
          
          // Check if we should move to next step
          let stepTime = 0;
          for (let i = 0; i <= currentStep; i++) {
            stepTime += steps[i]?.duration || 0;
          }
          
          if (newTime >= stepTime && currentStep < steps.length - 1) {
            setCurrentStep(current => current + 1);
            
            // Vibrate if supported
            if (navigator.vibrate) {
              navigator.vibrate([200, 100, 200]);
            }
          }
          
          // Complete timer
          if (newTime >= totalTime) {
            setIsActive(false);
            if (onComplete) onComplete(newTime);
            
            // Final vibration
            if (navigator.vibrate) {
              navigator.vibrate([500, 200, 500, 200, 500]);
            }
          }
          
          return newTime;
        });
      }, 1000);
    } else if (!isActive) {
      clearInterval(interval);
    }
    
    return () => clearInterval(interval);
  }, [isActive, currentTime, totalTime, currentStep, steps, onComplete]);

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const resetTimer = () => {
    setCurrentTime(0);
    setCurrentStep(0);
    setIsActive(false);
  };

  const toggleTimer = () => {
    setIsActive(!isActive);
  };

  const progress = (currentTime / totalTime) * 100;
  const isComplete = currentTime >= totalTime;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-secondary/10">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            <Clock className="w-5 h-5 text-primary" />
            {timing.name} Timer
          </CardTitle>
          <Badge variant={isActive ? "default" : "secondary"}>
            {isActive ? "Running" : isComplete ? "Complete" : "Ready"}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Main Timer Display */}
        <div className="text-center">
          <div className="text-4xl font-bold text-foreground font-mono">
            {formatTime(currentTime)}
          </div>
          <div className="text-sm text-muted-foreground">
            / {formatTime(totalTime)}
          </div>
        </div>

        {/* Progress Bar */}
        <Progress value={progress} className="h-3" />

        {/* Current Step */}
        <div className="bg-secondary/50 p-4 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <h4 className="font-semibold text-foreground">
              Step {currentStep + 1}: {steps[currentStep]?.name}
            </h4>
            <Badge variant="outline">
              {formatTime(Math.max(0, (steps[currentStep]?.duration || 0) - (currentTime - elapsedStepTime)))} left
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">
            {steps[currentStep]?.instruction}
          </p>
          <Progress value={currentStepProgress} className="h-2 mt-2" />
        </div>

        {/* Controls */}
        <div className="flex gap-3">
          <Button
            onClick={toggleTimer}
            className={`flex-1 ${isActive ? 'bg-orange-600 hover:bg-orange-700' : 'bg-primary hover:bg-primary/90'}`}
            disabled={isComplete}
          >
            {isActive ? <Pause className="w-4 h-4 mr-2" /> : <Play className="w-4 h-4 mr-2" />}
            {isActive ? 'Pause' : 'Start'}
          </Button>
          
          <Button variant="outline" onClick={resetTimer} className="border-border hover:bg-secondary">
            <RotateCcw className="w-4 h-4" />
          </Button>
        </div>

        {/* All Steps Preview */}
        <div className="space-y-2">
          <h4 className="font-medium text-sm text-muted-foreground">Brewing Steps</h4>
          <div className="grid gap-2">
            {steps.map((step, index) => (
              <div
                key={index}
                className={`flex items-center justify-between p-2 rounded text-sm transition-colors ${
                  index === currentStep
                    ? 'bg-primary/10 border border-primary/20'
                    : index < currentStep
                    ? 'bg-secondary/30 text-muted-foreground'
                    : 'bg-secondary/10'
                }`}
              >
                <span className="font-medium">{step.name}</span>
                <span className="text-xs">{formatTime(step.duration)}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}