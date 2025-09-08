
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Coffee, X, ChevronRight, Share2, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { InvokeLLM } from "@/api/integrations";

export default function BrewCompletionPopup({ 
  isOpen, 
  onClose, 
  onReviewTaste, 
  brewData 
}) {
  const [isSharing, setIsSharing] = useState(false);

  if (!isOpen) return null;

  const formatBrewTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
  };

  const calculateTimeDelta = (actual, planned) => {
    const delta = actual - planned;
    if (delta > 0) {
      return { symbol: '▲', time: Math.abs(delta), color: 'text-red-400' };
    } else if (delta < 0) {
      return { symbol: '▼', time: Math.abs(delta), color: 'text-green-400' };
    }
    return { symbol: '', time: 0, color: 'text-gray-400' };
  };

  const handleShareResult = async () => {
    setIsSharing(true);
    try {
        const prompt = `
        Create a single, self-contained HTML file for a shareable coffee brew summary card.
        The design should be clean, modern, and dark-themed, consistent with the DripBook app (dark background, amber/gold accents).
        The card size should be suitable for a social media post, like 1080x1080px.

        Here is the brew data to include:
        - Method: ${brewData?.method?.replace('_', ' ').toUpperCase() || 'N/A'}
        - Bean Name: ${brewData?.name || 'Unknown Bean'}
        - Coffee Dose: ${brewData?.coffee_dose || 0}g
        - Water Amount: ${brewData?.water_amount || 0}ml
        - Water Temp: ${brewData?.water_temp || 0}°C
        - Grind Size: ${brewData?.grind_size?.replace('_', ' ') || 'N/A'}
        - Actual Brew Time: ${formatBrewTime(brewData?.brew_time || 0)}
        - Planned Brew Time: ${formatBrewTime(brewData?.totalTime || 0)}

        Layout the information clearly and attractively. Use a premium-looking font from Google Fonts.
        Include a small DripBook logo or wordmark subtly in a corner. The logo URL is: "https://qtrypzzcjebvfcihiynt.supabase.co/storage/v1/object/public/base44-prod/public/68bda1e4ac023962388b8a1b/b03d9527c_DripBooklogo.png".

        Return ONLY the HTML code, including all necessary CSS in a <style> tag.
        `;
        const result = await InvokeLLM({ prompt });
        const newWindow = window.open();
        newWindow.document.write(result);
        newWindow.document.close();
    } catch (error) {
        console.error("Failed to generate brew card:", error);
        alert("Sorry, could not generate the shareable card at this time.");
    } finally {
        setIsSharing(false);
    }
  };

  const plannedTime = brewData?.totalTime || 0;
  const actualTime = brewData?.brew_time || 0;
  const timeDelta = calculateTimeDelta(actualTime, plannedTime);

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-gray-900 rounded-2xl w-full max-w-md mx-4 text-white relative">
        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-4 left-4 p-2 rounded-full bg-red-600/20 text-red-400 hover:bg-red-600/30"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center pt-12 pb-8">
          <h2 className="text-sm text-gray-400 mb-2">{brewData?.method?.replace('_', ' ').toUpperCase() || 'Brew Method'}</h2>
          
          {/* Coffee cup icon */}
          <div className="w-24 h-24 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-6">
            <Coffee className="w-12 h-12 text-gray-300" />
          </div>
          
          <h1 className="text-3xl font-bold mb-2">All done!</h1>
          <p className="text-gray-400 text-sm px-6">
            Hope you enjoy this cup of coffee. Add notes below to improve your skills over time.
          </p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-3 gap-px bg-gray-700 mx-6 mb-6 rounded-lg overflow-hidden">
          <div className="bg-gray-800 p-4 text-center">
            <p className="text-gray-400 text-xs mb-1">Cups</p>
            <p className="text-white text-lg font-medium">1</p>
          </div>
          <div className="bg-gray-800 p-4 text-center">
            <p className="text-gray-400 text-xs mb-1">Coffee</p>
            <p className="text-white text-lg font-medium">{brewData?.coffee_dose || 0}g</p>
          </div>
          <div className="bg-gray-800 p-4 text-center">
            <p className="text-gray-400 text-xs mb-1">Water</p>
            <p className="text-white text-lg font-medium">{brewData?.water_amount || 0}ml</p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-px bg-gray-700 mx-6 mb-8 rounded-lg overflow-hidden">
          <div className="bg-gray-800 p-4 text-center">
            <p className="text-gray-400 text-xs mb-1">Planned Time</p>
            <p className="text-white text-lg font-medium">{formatBrewTime(plannedTime)}</p>
          </div>
          <div className="bg-gray-800 p-4 text-center">
            <p className="text-gray-400 text-xs mb-1">Temperature</p>
            <p className="text-white text-lg font-medium">{brewData?.water_temp || 0}°C</p>
          </div>
          <div className="bg-gray-800 p-4 text-center">
            <p className="text-gray-400 text-xs mb-1">Actual Brew Time</p>
            <p className="text-white text-xl font-bold">{formatBrewTime(actualTime)}</p>
            {timeDelta.time > 0 && (
              <p className={`text-xs ${timeDelta.color}`}>
                {timeDelta.symbol}{formatBrewTime(timeDelta.time)}
              </p>
            )}
          </div>
        </div>

        {/* Action Buttons */}
        <div className="px-6 pb-6 space-y-3">
          <Button
            onClick={onReviewTaste}
            className="w-full bg-amber-500 hover:bg-amber-600 text-gray-900 py-4 rounded-xl flex items-center justify-between font-medium transition-colors"
          >
            <span>Review The Taste</span>
            <ChevronRight className="w-5 h-5" />
          </Button>
          <Button
            onClick={handleShareResult}
            variant="outline"
            className="w-full border-amber-500/30 hover:bg-amber-500/10 text-amber-500 py-4 rounded-xl font-medium"
            disabled={isSharing}
          >
            {isSharing ? (
                <>
                    <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                    Generating...
                </>
            ) : (
                <>
                    <Share2 className="w-5 h-5 mr-2" />
                    Share Result
                </>
            )}
          </Button>
        </div>

        {/* Additional Info */}
        <div className="px-6 pb-8">
          <p className="text-gray-500 text-sm">Additional information about this coffee.</p>
        </div>
      </div>
    </div>
  );
}
