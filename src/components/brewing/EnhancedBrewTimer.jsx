
import React, { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Play, Pause, RotateCcw, Clock, Tag, Coffee as CoffeeIcon, RotateCw, X } from "lucide-react";

// Helper to parse time string "mm:ss" to seconds
const parseTimeToSeconds = (timeString) => {
  if (!timeString || typeof timeString !== 'string') return 0;
  const parts = timeString.split(':');
  if (parts.length !== 2) return 0;
  const [minutes, seconds] = parts.map(Number);
  return (minutes * 60) + (seconds || 0);
};

// Helper to format seconds to "mm:ss" with rounding
const formatTime = (seconds) => {
  const roundedSeconds = Math.round(seconds);
  const minutes = Math.floor(roundedSeconds / 60);
  const secs = roundedSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

// Helper to format countdown display
const formatCountdown = (seconds) => {
  const roundedSeconds = Math.round(Math.max(0, seconds));
  if (roundedSeconds < 60) {
    return `${roundedSeconds}s`;
  }
  const minutes = Math.floor(roundedSeconds / 60);
  const remainingSecs = roundedSeconds % 60;
  return `${minutes}:${remainingSecs.toString().padStart(2, '0')}`;
};

// Get step label based on index and step name
const getStepLabel = (stepIndex, stepName, totalSteps) => {
  if (!stepName) return `Step ${stepIndex + 1}`;
  
  const lowerName = stepName.toLowerCase();
  if (lowerName.includes('bloom')) return 'Bloom';
  if (lowerName.includes('drawdown') || stepIndex === totalSteps - 1) return 'Drawdown';
  
  // Count non-bloom pours
  let pourCount = 0;
  for (let i = 0; i <= stepIndex; i++) {
    if (i === 0 && lowerName.includes('bloom')) continue;
    pourCount++;
  }
  
  if (pourCount === 1) return '1st Pour';
  if (pourCount === 2) return '2nd Pour';
  if (pourCount === 3) return '3rd Pour';
  if (stepIndex === totalSteps - 1) return 'Final Pour';
  
  return `${pourCount}${getOrdinalSuffix(pourCount)} Pour`;
};

const getOrdinalSuffix = (num) => {
  if (num % 100 >= 11 && num % 100 <= 13) return 'th';
  switch (num % 10) {
    case 1: return 'st';
    case 2: return 'nd';
    case 3: return 'rd';
    default: return 'th';
  }
};

export default function EnhancedBrewTimer({ recipe, onComplete }) {
  const [elapsedTime, setElapsedTime] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const [currentWaterLevel, setCurrentWaterLevel] = useState(0);
  const [prepareCountdown, setPrepareCountdown] = useState(null);
  const [hasStarted, setHasStarted] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  
  // Swirl phase state
  const [isInSwirlPhase, setIsInSwirlPhase] = useState(false);
  const [swirlCountdown, setSwirlCountdown] = useState(null);
  const [bloomCompleted, setBloomCompleted] = useState(false);
  
  const [dynamicStatus, setDynamicStatus] = useState({ 
    text: "Ready to Start", 
    countdown: null, 
    phase: 'ready', 
    color: 'gray' 
  });
  const [showCompleteButton, setShowCompleteButton] = useState(false);
  const [contextualMessage, setContextualMessage] = useState({ text: "Press Start to begin your brew", icon: "☕" });
  const [lastAnnouncedCountdown, setLastAnnouncedCountdown] = useState(0);
  const [soundEnabled, setSoundEnabled] = useState(true); // Optional global toggle

  // Sound deduplication flags - reset only on Reset
  const [stepStarted, setStepStarted] = useState([]);
  const [stepEnded, setStepEnded] = useState([]);

  const intervalRef = useRef(null);
  const animationFrameRef = useRef(null);
  const prepareCountdownRef = useRef(null);
  const swirlCountdownRef = useRef(null);
  const statusUpdateRef = useRef(null);
  const previousPhaseRef = useRef(null);
  
  // Audio refs
  const audioCtxRef = useRef(null);
  const masterGainRef = useRef(null);

  // Small sound helper with iOS unlock
  const ensureAudioReady = useCallback(async () => {
    if (!audioCtxRef.current) {
      try {
        // Create new AudioContext
        const ctx = new (window.AudioContext || window.webkitAudioContext)();
        audioCtxRef.current = ctx;
        
        // Create masterGain (~0.6), connect to destination
        const masterGain = ctx.createGain();
        masterGain.gain.value = 0.6;
        masterGain.connect(ctx.destination);
        masterGainRef.current = masterGain;
      } catch (error) {
        console.error("Failed to create AudioContext:", error);
        return;
      }
    }

    const ctx = audioCtxRef.current;
    
    // If state is suspended, await resume()
    if (ctx.state === 'suspended') {
      try {
        await ctx.resume();
      } catch (error) {
        console.error("Failed to resume AudioContext:", error);
      }
    }
    
    // Unlock iOS: play a one-sample silent buffer once
    try {
      const buffer = ctx.createBuffer(1, 1, 22050);
      const source = ctx.createBufferSource();
      source.buffer = buffer;
      source.connect(ctx.destination);
      source.start(0);
    } catch (error) {
      console.error("Failed to play unlock buffer:", error);
    }
  }, []);

  const playWoodClick = useCallback(async () => {
    if (!soundEnabled) return;
    
    try {
      // Ensure ensureAudioReady() ran
      await ensureAudioReady();
      
      if (!audioCtxRef.current || !masterGainRef.current) return;
      
      const ctx = audioCtxRef.current;
      
      // Resume AudioContext before any sound
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      // Create 1 oscillator + gain
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      
      // Route: osc → gain → masterGainRef.current
      osc.connect(gain);
      gain.connect(masterGainRef.current);
      
      // Click envelope: gain 0 → 0.45 in 8ms → exponential to 0.01 by 120ms
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.45, ctx.currentTime + 0.008); // 8ms
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.12); // 120ms
      
      // Frequency sweep: 320Hz → 180Hz over 0.12s
      osc.frequency.setValueAtTime(320, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(180, ctx.currentTime + 0.12);
      
      // Stop at ~0.14s
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.14);
    } catch (error) {
      console.error("Error playing wood click:", error);
      // Silently continue if sound fails
    }
  }, [soundEnabled, ensureAudioReady]);

  const playStartSound = useCallback(async () => {
    if (!soundEnabled) return;
    
    try {
      // Try Base44's built-in sound API first
      if (window.Base44?.sound?.play) {
        try {
          window.Base44.sound.play('ui.confirm');
          return;
        } catch (error) {
          console.log("Base44 sound API failed, using fallback:", error);
        }
      }
      
      // Fallback to WebAudio
      await ensureAudioReady();
      
      if (!audioCtxRef.current || !masterGainRef.current) return;
      
      const ctx = audioCtxRef.current;
      
      // Resume AudioContext before any sound
      if (ctx.state === 'suspended') {
        await ctx.resume();
      }
      
      // Short bright chime: Two sine oscillators (1200Hz & 1800Hz), 0.22s
      const osc1 = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      
      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(masterGainRef.current);
      
      // Frequencies
      osc1.frequency.setValueAtTime(1200, ctx.currentTime);
      osc2.frequency.setValueAtTime(1800, ctx.currentTime);
      
      // Quick attack/decay envelope
      gain.gain.setValueAtTime(0, ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.4, ctx.currentTime + 0.01); // Quick attack
      gain.gain.exponentialRampToValueAtTime(0.05, ctx.currentTime + 0.06); // Decay
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.22); // Tail
      
      osc1.type = 'sine';
      osc2.type = 'sine';
      
      osc1.start(ctx.currentTime);
      osc2.start(ctx.currentTime);
      osc1.stop(ctx.currentTime + 0.22);
      osc2.stop(ctx.currentTime + 0.22);
    } catch (error) {
      console.error("Error playing start sound:", error);
      // Silently continue if sound fails
    }
  }, [soundEnabled, ensureAudioReady]);

  const steps = useMemo(() => recipe.steps || [], [recipe.steps]);
  const totalWaterAmount = useMemo(() => recipe.water_amount || 0, [recipe.water_amount]);
  const finalStepTime = useMemo(() => steps.length > 0 ? parseTimeToSeconds(steps[steps.length - 1].time) : 0, [steps]);
  const isV60Recipe = useMemo(() => recipe.method === 'v60', [recipe.method]);

  // Initialize sound flags when steps change
  useEffect(() => {
    if (steps.length > 0) {
      setStepStarted(new Array(steps.length).fill(false));
      setStepEnded(new Array(steps.length).fill(false));
    }
  }, [steps.length]);

  // Get contextual message based on current state
  const getContextualMessage = useCallback((phase, stepLabel, isPausedParam, isInSwirlParam) => {
    if (!hasStarted) {
      return { text: "Press Start to begin your brew", icon: "☕" };
    }
    if (prepareCountdown !== null) {
      return { text: "Get ready to pour", icon: "🔔" };
    }
    if (isInSwirlParam) {
      return { text: "Gently swirl the dripper in circular motion", icon: "🌀" };
    }
    if (isPausedParam) {
      return { text: "Timer paused - resume when ready", icon: "⏸️" };
    }
    
    switch (phase) {
      case 'pouring':
        // Rule 4: Hint text during active pours
        if (stepLabel && stepLabel.includes('Bloom')) return { text: "Wait for the coffee to bloom", icon: "🌸" };
        return { text: "Pour steadily in a spiral or center", icon: "💧" };
      case 'waiting':
        // Rule 6 (cont.): Hide drain message during intermediate waits
        return { text: "Prepare for the next pour", icon: "⏳" };
      case 'drawdown':
      case 'complete':
        // Rule 6: Only show drain message during actual drawdown (after last pour)
        return { text: "Wait for the water to drain through the grounds", icon: "⏳" };
      default:
        return { text: "Follow the timer guidance above", icon: "⏱️" };
    }
  }, [hasStarted, prepareCountdown]);

  // Calculate step timing with 33% pour policy
  const getStepTiming = useCallback((stepIndex, elapsed) => {
    if (stepIndex < 0 || stepIndex >= steps.length) return null;
    
    const currentStep = steps[stepIndex];
    const nextStep = steps[stepIndex + 1];
    
    const stepStart = parseTimeToSeconds(currentStep.time);
    const stepEnd = nextStep ? parseTimeToSeconds(nextStep.time) : finalStepTime + 30; // Add 30s buffer for final drawdown
    const stepDuration = stepEnd - stepStart;
    
    // Use 33% policy for pour duration
    const pourDuration = stepDuration * 0.33;
    const pourEnd = stepStart + pourDuration;
    
    return { stepStart, stepEnd, pourEnd, stepDuration, pourDuration };
  }, [steps, finalStepTime]);

  // Check if we should trigger swirl phase
  const shouldTriggerSwirl = useCallback((elapsed) => {
    if (!isV60Recipe || bloomCompleted || isInSwirlPhase) return false;
    
    // Find bloom step (usually first step)
    const bloomStepIndex = steps.findIndex(step => 
      step.name && step.name.toLowerCase().includes('bloom')
    );
    
    if (bloomStepIndex === -1) return false; // No bloom step found

    const bloomTiming = getStepTiming(bloomStepIndex, elapsed); 
    if (!bloomTiming) return false;
    
    // Trigger swirl when bloom pour ends and before the next step time/bloom step ends
    // Ensure bloom has fully completed its pour phase
    return elapsed >= bloomTiming.pourEnd && elapsed < bloomTiming.stepEnd;
  }, [isV60Recipe, bloomCompleted, isInSwirlPhase, steps, getStepTiming]);

  // Handle swirl countdown
  useEffect(() => {
    if (swirlCountdown !== null && swirlCountdown > 0) {
      swirlCountdownRef.current = setTimeout(() => {
        setSwirlCountdown(swirlCountdown - 1);
      }, 1000);
    } else if (swirlCountdown === 0) {
      // Swirl complete - do NOT play click sound here per requirement #3
      setIsInSwirlPhase(false);
      setSwirlCountdown(null);
      setBloomCompleted(true);
      
      // Optional haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(50);
      }
    }
    
    return () => {
      if (swirlCountdownRef.current) {
        clearTimeout(swirlCountdownRef.current);
      }
    };
  }, [swirlCountdown]);

  // Sound timing system - triggers at precise step boundaries
  useEffect(() => {
    if (!isRunning || isPaused || prepareCountdown !== null || steps.length === 0) {
      return; // Suppress sounds while paused per requirement #4
    }

    const currentElapsed = elapsedTime;

    // Check each step for sound triggers
    steps.forEach((step, stepIndex) => {
      const timing = getStepTiming(stepIndex, currentElapsed);
      if (!timing) return;

      const { stepStart, pourEnd } = timing;
      // const isBloomStep = step.name && step.name.toLowerCase().includes('bloom'); // Not strictly needed here, logic applies to all steps

      // START chime: trigger when elapsedTime crosses stepStart boundary
      if (currentElapsed >= stepStart && !stepStarted[stepIndex]) {
        // Chime first, then state change (requirement #6)
        playStartSound();
        
        // Mark as started to avoid re-triggers
        setStepStarted(prev => {
          const newStarted = [...prev];
          newStarted[stepIndex] = true;
          return newStarted;
        });
      }

      // END wood click: trigger when elapsedTime crosses pourEnd boundary
      // This applies to all steps including bloom, before any potential swirl phase starts.
      if (currentElapsed >= pourEnd && !stepEnded[stepIndex]) {
          playWoodClick();
          
          // Mark as ended
          setStepEnded(prev => {
            const newEnded = [...prev];
            newEnded[stepIndex] = true;
            return newEnded;
          });
      }
    });
  }, [elapsedTime, isRunning, isPaused, prepareCountdown, steps, stepStarted, stepEnded, getStepTiming, playStartSound, playWoodClick]);

  // Update dynamic status bar
  const updateDynamicStatus = useCallback((elapsed) => {
    if (isPaused && !isInSwirlPhase) {
      const currentStepIndex = steps.findIndex((step, i) => {
        const timing = getStepTiming(i, elapsed);
        return timing && elapsed >= timing.stepStart && elapsed < timing.stepEnd;
      });
      
      if (currentStepIndex >= 0) {
        const stepLabel = getStepLabel(currentStepIndex, steps[currentStepIndex].name, steps.length);
        setDynamicStatus({
          text: `Paused — ${stepLabel}`,
          countdown: null,
          phase: 'paused',
          color: 'gray'
        });
      }
      return;
    }

    if (isInSwirlPhase) {
      setDynamicStatus({
        text: `🌀 Swirl now — ${swirlCountdown}s remaining`,
        countdown: swirlCountdown,
        phase: 'swirling',
        color: 'blue'
      });
      return;
    }

    let currentStepIndex = -1;
    for (let i = steps.length - 1; i >= 0; i--) {
      if (elapsed >= parseTimeToSeconds(steps[i].time)) {
        currentStepIndex = i;
        break;
      }
    }

    if (currentStepIndex === -1) {
      setDynamicStatus({ text: "Starting brew...", countdown: null, phase: 'ready', color: 'gray' });
      return;
    }

    const timing = getStepTiming(currentStepIndex, elapsed);
    if (!timing) return;

    const { stepStart, stepEnd, pourEnd } = timing;
    const isLastStep = currentStepIndex === steps.length - 1;
    const stepLabel = getStepLabel(currentStepIndex, steps[currentStepIndex].name, steps.length);
    const inPourWindow = elapsed <= pourEnd;

    if (inPourWindow) {
      // Active pour window
      const timeLeft = pourEnd - elapsed;
      const text = isLastStep
        ? `Final Pour — pour ends in ${formatCountdown(timeLeft)}` // Rule 1: Final pour
        : `${stepLabel} — pour ends in ${formatCountdown(timeLeft)}`; // Rule 3: Intermediate pour

      setDynamicStatus({ text, countdown: timeLeft, phase: 'pouring', color: 'amber' });
    } else {
      // After pour window has ended
      if (isLastStep) {
        // Rule 2: Actual drawdown phase has begun
        const text = "Drawdown — wait for the final drop";
        const newPhase = elapsed >= stepEnd ? 'complete' : 'drawdown';

        setDynamicStatus({ text, countdown: null, phase: newPhase, color: 'green' });
        if (newPhase === 'complete') {
          setShowCompleteButton(true);
        }
      } else {
        // Rule 3: Intermediate step's waiting period
        const timeToNext = stepEnd - elapsed;
        const nextStepLabel = getStepLabel(currentStepIndex + 1, steps[currentStepIndex + 1].name, steps.length);
        const text = `${stepLabel} finished — ${nextStepLabel} in ${formatCountdown(timeToNext)}`;

        setDynamicStatus({ text, countdown: timeToNext, phase: 'waiting', color: 'gray' });
      }
    }
  }, [steps, getStepTiming, isPaused, isInSwirlPhase, swirlCountdown]);

  // Main logic update loop
  const updateBrewState = useCallback(() => {
    if (!isRunning || prepareCountdown !== null || isInSwirlPhase) return;

    const now = performance.now();
    const elapsed = (now - intervalRef.current.startTime) / 1000;
    setElapsedTime(elapsed);

    // Check if we should trigger swirl phase
    if (shouldTriggerSwirl(elapsed)) {
      setIsInSwirlPhase(true);
      setSwirlCountdown(5); // 5-second swirl
      
      // Optional haptic feedback
      if ('vibrate' in navigator) {
        navigator.vibrate(100);
      }
      
      return; // Pause main timer progression during swirl
    }

    // Update water level based on current step
    let currentStepIndex = -1;
    for (let i = steps.length - 1; i >= 0; i--) {
      if (elapsed >= parseTimeToSeconds(steps[i].time)) {
        currentStepIndex = i;
        break;
      }
    }

    if (currentStepIndex >= 0) {
      const timing = getStepTiming(currentStepIndex, elapsed);
      if (timing) {
        const { stepStart, pourEnd } = timing;
        const startWater = currentStepIndex > 0 ? parseFloat(steps[currentStepIndex - 1].water) : 0;
        const endWater = parseFloat(steps[currentStepIndex].water);

        if (elapsed >= stepStart && elapsed <= pourEnd) {
          // Pouring - animate water level
          const progress = (elapsed - stepStart) / (pourEnd - stepStart);
          setCurrentWaterLevel(startWater + (endWater - startWater) * Math.min(progress, 1));
        } else {
          // Waiting - static water level
          setCurrentWaterLevel(endWater);
        }
      }
    }

    updateDynamicStatus(elapsed);
    
    animationFrameRef.current = requestAnimationFrame(updateBrewState);
  }, [isRunning, steps, prepareCountdown, isInSwirlPhase, shouldTriggerSwirl, getStepTiming, updateDynamicStatus]);

  // Status update timer (every 200ms)
  useEffect(() => {
    if (isRunning && !isPaused && prepareCountdown === null) {
      statusUpdateRef.current = setInterval(() => {
        if (intervalRef.current?.startTime) {
          const elapsed = (performance.now() - intervalRef.current.startTime) / 1000;
          updateDynamicStatus(elapsed);
        } else if (isInSwirlPhase) { // Still update status if in swirl even if main timer is paused
             updateDynamicStatus(elapsedTime); // Use last known elapsed time, as it's not progressing
        }
      }, 200);
      
      return () => {
        if (statusUpdateRef.current) {
          clearInterval(statusUpdateRef.current);
        }
      };
    } else if (isInSwirlPhase) { // Ensure status updates during swirl even if main timer is effectively paused
        statusUpdateRef.current = setInterval(() => {
            updateDynamicStatus(elapsedTime);
        }, 200);
        return () => {
            if (statusUpdateRef.current) {
                clearInterval(statusUpdateRef.current);
            }
        };
    } else {
        if (statusUpdateRef.current) {
            clearInterval(statusUpdateRef.current);
        }
    }
  }, [isRunning, isPaused, prepareCountdown, updateDynamicStatus, isInSwirlPhase, elapsedTime]);

  useEffect(() => {
    if (isRunning && prepareCountdown === null && !isInSwirlPhase) {
      if (!intervalRef.current?.startTime) {
        intervalRef.current = { startTime: performance.now() - (elapsedTime * 1000) };
      }
      animationFrameRef.current = requestAnimationFrame(updateBrewState);
    } else {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isRunning, elapsedTime, updateBrewState, prepareCountdown, isInSwirlPhase]);

  // Handle prepare countdown
  useEffect(() => {
    if (prepareCountdown !== null && prepareCountdown > 0) {
      prepareCountdownRef.current = setTimeout(() => {
        setPrepareCountdown(prepareCountdown - 1);
      }, 1000);
    } else if (prepareCountdown === 0) {
      setPrepareCountdown(null);
      setHasStarted(true);
    }
    
    return () => {
      if (prepareCountdownRef.current) {
        clearTimeout(prepareCountdownRef.current);
      }
    };
  }, [prepareCountdown]);

  // Update contextual message based on dynamic status
  useEffect(() => {
    const newMessage = getContextualMessage(dynamicStatus.phase, dynamicStatus.text, isPaused, isInSwirlPhase);
    setContextualMessage(newMessage);
  }, [dynamicStatus, isPaused, isInSwirlPhase, getContextualMessage]);

  const handleStartPause = async () => {
    // Initialize audio on first user interaction
    await ensureAudioReady();

    if (!hasStarted) {
      // First time starting - show prepare countdown, no start sound here
      // Start sound will be triggered by the step boundary system
      setPrepareCountdown(3);
      setIsRunning(true);
      setDynamicStatus({ text: "Prepare to pour", countdown: 3, phase: 'prepare', color: 'amber' });
    } else {
      // Resume behavior: only play start chime if resume crosses a new stepStart boundary
      setIsRunning(!isRunning);
      setIsPaused(isRunning);
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setElapsedTime(0);
    setCurrentWaterLevel(0);
    setHasStarted(false);
    setPrepareCountdown(null);
    setIsPaused(false);
    setShowCompleteButton(false);
    setDynamicStatus({ text: "Ready to Start", countdown: null, phase: 'ready', color: 'gray' });
    setContextualMessage({ text: "Press Start to begin your brew", icon: "☕" });
    setIsInSwirlPhase(false);
    setSwirlCountdown(null);
    setBloomCompleted(false);
    previousPhaseRef.current = null;
    
    // Reset flags only on Reset (requirement #5)
    setStepStarted(new Array(steps.length).fill(false));
    setStepEnded(new Array(steps.length).fill(false));
    
    intervalRef.current = null;
    
    if (prepareCountdownRef.current) {
      clearTimeout(prepareCountdownRef.current);
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (statusUpdateRef.current) {
      clearInterval(statusUpdateRef.current);
    }
    if (swirlCountdownRef.current) {
      clearTimeout(swirlCountdownRef.current);
    }
  };

  const handleSkipSwirl = () => {
    setIsInSwirlPhase(false);
    setSwirlCountdown(null);
    setBloomCompleted(true); // Mark bloom as complete so it doesn't re-trigger immediately
    
    if (swirlCountdownRef.current) {
      clearTimeout(swirlCountdownRef.current);
    }
  };

  const handleComplete = () => {
    onComplete?.(elapsedTime);
  };

  const waterTankHeight = 250; // px
  const tankWidth = 150; // px
  const fillHeight = (currentWaterLevel / totalWaterAmount) * waterTankHeight;
  const clampedFillHeight = Math.min(Math.max(fillHeight, 0), waterTankHeight);
  const isPouring = dynamicStatus.phase === 'pouring';

  // Calculate positions using single scale
  const getYPosition = (waterMl) => {
    return (waterMl / totalWaterAmount) * waterTankHeight;
  };

  // Live readout position - clamp to prevent going above tank
  const surfaceY = clampedFillHeight;
  const liveReadoutY = Math.max(0, Math.min(surfaceY - 14, waterTankHeight - 20));

  // Get status bar color
  const getStatusColor = () => {
    switch (dynamicStatus.color) {
      case 'amber': return 'bg-amber-500 text-amber-900';
      case 'blue': return 'bg-blue-500 text-blue-900';
      case 'green': return 'bg-green-500 text-green-900';
      default: return 'bg-gray-500 text-gray-900';
    }
  };

  return (
    <Card className="border-border bg-card text-center select-none">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center justify-center gap-2">
          <CoffeeIcon className="w-5 h-5 mr-2" />
          {recipe.name || 'Brewing Timer'}
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-4 pb-6">
        
        {/* Status and Timer Display */}
        <div className="space-y-2">
          {prepareCountdown !== null ? (
            <div className="text-2xl font-bold text-amber-500">
              🔔 Prepare to pour: {prepareCountdown}
            </div>
          ) : (
            <div className="text-6xl font-bold text-foreground font-mono tracking-wider">
              {formatTime(elapsedTime)}
            </div>
          )}
        </div>

        {/* Water Tank Visualization */}
        <div className="relative flex justify-center items-end" style={{ height: `${waterTankHeight + 40}px` }}>
            {/* Left Labels - Further left with smaller font */}
            <div className="absolute" style={{ 
              right: `calc(50% + ${tankWidth/2}px + 44px)`,
              height: `${waterTankHeight}px`,
              bottom: '20px'
            }}>
                {steps.map((step, index) => {
                  const yPos = getYPosition(parseFloat(step.water));
                  return (
                    <div 
                        key={index}
                        className="absolute text-right w-full whitespace-nowrap"
                        style={{ 
                          bottom: `${yPos}px`, 
                          transform: 'translateY(50%)', 
                          marginBottom: '-2px'
                        }}
                    >
                        <span className={`text-xs font-semibold transition-colors ${currentWaterLevel >= parseFloat(step.water) ? 'text-amber-500' : 'text-slate-400'}`} style={{ fontSize: '0.7rem' }}>
                            {step.water}ml
                        </span>
                    </div>
                  );
                })}
            </div>

            {/* Tank Frame */}
            <div 
                className="relative rounded-t-xl border-2 border-b-0 border-gray-700" 
                style={{ width: `${tankWidth}px`, height: `${waterTankHeight}px`, zIndex: 3 }}
            >
              {/* Inner container for water with overflow hidden */}
              <div className="absolute inset-0 rounded-t-lg overflow-hidden" style={{ zIndex: 1 }}>
                {/* Dashed Lines inside */}
                 {steps.map((step, index) => (
                    <div
                        key={`line-${index}`}
                        className="absolute w-full border-t-2 border-dashed border-gray-700/35"
                        style={{ bottom: `${getYPosition(parseFloat(step.water))}px` }}
                    />
                ))}

                {/* Base line at bottom (0ml mark) */}
                <div className="absolute bottom-0 w-full border-t-2 border-solid border-gray-700" style={{ zIndex: 2 }} />

                {/* Water Fill */}
                <div 
                    className="absolute bottom-0 w-full transition-all duration-100 ease-linear pointer-events-none"
                    style={{ 
                      height: `${clampedFillHeight}px`,
                      backgroundColor: '#2E63C6',
                      transform: 'translateY(0)',
                      zIndex: 1
                    }}
                >
                    {/* Water wave crest effect - only shows when pouring */}
                    {isPouring && clampedFillHeight > 0 && (
                      <div className="absolute top-0 left-0 w-full overflow-hidden pointer-events-none">
                        <div className="wave" style={{ zIndex: 2 }}></div>
                        <div className="wave" style={{ zIndex: 2 }}></div>
                      </div>
                    )}
                </div>
              </div>
            </div>

            {/* Right Live Label */}
            <div 
                className="absolute transition-all duration-100 ease-linear"
                style={{ 
                  left: `calc(50% + ${tankWidth/2}px + 12px)`,
                  bottom: `${20 + liveReadoutY}px`,
                  transform: 'translateY(0)' 
                }}
            >
                <span className="text-base font-bold text-white whitespace-nowrap tracking-tight">
                    {Math.round(currentWaterLevel)} ml
                </span>
            </div>
        </div>

        {/* Dynamic Status Bar */}
        <div 
          className={`px-4 py-3 rounded-lg font-bold text-lg transition-colors ${getStatusColor()}`}
          role="status" 
          aria-live="polite"
          aria-atomic="true"
        >
          {dynamicStatus.text}
        </div>

        {/* Swirl Phase Hint Card */}
        {isInSwirlPhase && (
          <div className="bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-200 dark:border-blue-700 rounded-xl p-4 mx-auto max-w-sm relative">
            <Button
              onClick={handleSkipSwirl}
              variant="ghost"
              size="sm"
              className="absolute top-2 right-2 h-6 text-xs text-blue-600 hover:text-blue-800"
            >
              Skip
            </Button>
            
            <div className="flex items-center justify-center mb-3">
              <div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-800/50 flex items-center justify-center">
                <RotateCw className="w-5 h-5 text-blue-600 animate-spin" style={{ animationDuration: '2s' }} />
              </div>
            </div>
            
            <p className="text-sm font-medium text-blue-900 dark:text-blue-100 mb-1">
              Swirl the dripper for 5s to evenly wet the grounds and collapse dry pockets.
            </p>
            <p className="text-xs text-blue-600 dark:text-blue-300 mb-3">
              Gentle circular motion; avoid splashing.
            </p>
            
            {/* Progress bar */}
            <div className="w-full bg-blue-200 dark:bg-blue-800 rounded-full h-2 mb-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-1000 ease-linear"
                style={{ width: `${((5 - (swirlCountdown || 0)) / 5) * 100}%` }}
              />
            </div>
            
            <div className="text-center">
              <span className="text-lg font-bold text-blue-700 dark:text-blue-200">
                {swirlCountdown || 0}s
              </span>
            </div>
          </div>
        )}

        {/* Contextual Brew Message - Refined typography */}
        <div className="px-4 py-2 rounded-lg bg-secondary/30 border border-border/50 mx-auto" style={{ maxWidth: '90%' }}>
            <p className="text-xs text-foreground flex items-center justify-center gap-2 text-center" style={{ fontSize: '0.8rem' }}>
                <span className="text-base flex-shrink-0">{contextualMessage.icon}</span>
                <span className="font-normal">{contextualMessage.text}</span>
            </p>
        </div>

        {/* Controls */}
        <div className="flex justify-center gap-4 pt-4">
          {showCompleteButton ? (
            <>
              <Button 
                onClick={handleReset}
                variant="outline"
                className="px-4 py-3 text-base border-border hover:bg-secondary flex-grow"
              >
                <RotateCcw className="w-4 h-4 mr-2" />
                Reset
              </Button>
              <Button 
                onClick={handleComplete}
                className="px-6 py-3 text-lg bg-card text-card-foreground hover:bg-secondary font-semibold border-2 border-primary flex-grow-[2]"
              >
                Complete Brew
              </Button>
            </>
          ) : (
            <>
              <Button 
                onClick={handleStartPause}
                disabled={prepareCountdown !== null || isInSwirlPhase}
                className={`px-8 py-4 text-lg font-semibold ${
                  isRunning ? 'bg-gray-600 hover:bg-gray-700' : 'bg-green-600 hover:bg-green-700'
                } text-white ${prepareCountdown !== null || isInSwirlPhase ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {!hasStarted ? (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Start
                  </>
                ) : isRunning ? (
                  <>
                    <Pause className="w-5 h-5 mr-2" />
                    Pause
                  </>
                ) : (
                  <>
                    <Play className="w-5 h-5 mr-2" />
                    Resume
                  </>
                )}
              </Button>

              <Button 
                onClick={handleReset}
                variant="outline"
                className={`px-6 py-4 text-lg border-border hover:bg-secondary ${isInSwirlPhase ? 'opacity-50 cursor-not-allowed' : ''}`}
                disabled={isInSwirlPhase}
              >
                <RotateCcw className="w-5 h-5 mr-2" />
                Reset
              </Button>
            </>
          )}
        </div>

        {/* CSS for water wave animation */}
        <style jsx>{`
          .wave {
            position: absolute;
            top: -10px;
            left: -50%;
            width: 200%;
            height: 20px;
            background: linear-gradient(90deg, transparent, #8DB7FF60, transparent);
            border-radius: 50%;
            animation: wave 2s ease-in-out infinite;
          }
          .wave:nth-child(2) {
            animation-delay: 0.5s;
            background: linear-gradient(90deg, transparent, #8DB7FF40, transparent);
          }
          @keyframes wave {
            0%, 100% { transform: translateX(-25%) scaleY(0.8); opacity: 0.6; }
            50% { transform: translateX(25%) scaleY(1.2); opacity: 1; }
          }
        `}</style>
      </CardContent>
    </Card>
  );
}
