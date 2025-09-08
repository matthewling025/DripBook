import React from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { X } from "lucide-react";

const quickNoteTags = [
  { emoji: "☀️", label: "Bright", value: "bright" },
  { emoji: "🍫", label: "Chocolatey", value: "chocolatey" },
  { emoji: "🌹", label: "Floral", value: "floral" },
  { emoji: "🍊", label: "Citrusy", value: "citrusy" },
  { emoji: "🥜", label: "Nutty", value: "nutty" },
  { emoji: "🍯", label: "Sweet", value: "sweet" },
  { emoji: "🔥", label: "Bold", value: "bold" },
  { emoji: "🧈", label: "Smooth", value: "smooth" },
  { emoji: "💣", label: "Overextracted", value: "overextracted" },
  { emoji: "😶‍🌫️", label: "Underextracted", value: "underextracted" },
  { emoji: "🍷", label: "Fruity", value: "fruity" },
  { emoji: "🌿", label: "Earthy", value: "earthy" },
  { emoji: "🧊", label: "Clean", value: "clean" },
  { emoji: "🥛", label: "Creamy", value: "creamy" },
  { emoji: "⚡", label: "Sharp", value: "sharp" },
  { emoji: "🫧", label: "Balanced", value: "balanced" }
];

export default function QuickNotesSelector({ selectedTags = [], onTagsChange, flavorNotes, onFlavorNotesChange }) {
  const toggleTag = (tagValue) => {
    const newTags = selectedTags.includes(tagValue)
      ? selectedTags.filter(tag => tag !== tagValue)
      : [...selectedTags, tagValue];
    
    onTagsChange(newTags);
    
    // Get the labels for the new set of selected tags
    const newTagLabels = newTags.map(val => {
      const tag = quickNoteTags.find(t => t.value === val);
      return tag ? `${tag.emoji} ${tag.label}` : '';
    }).filter(Boolean);

    // Extract custom notes by removing all possible tag labels from the current flavor notes
    let customNotes = flavorNotes;
    quickNoteTags.forEach(tag => {
      const fullTagLabel = `${tag.emoji} ${tag.label}`;
      // Use a regular expression to remove the tag label, handling surrounding whitespace
      customNotes = customNotes.replace(new RegExp(`\\s*${fullTagLabel}\\s*`, 'g'), ' ').trim();
    });
    
    // Combine the new tags with the cleaned custom notes
    const combinedNotes = [...newTagLabels, customNotes].filter(Boolean).join(' ');
    onFlavorNotesChange(combinedNotes);
  };

  return (
    <div className="space-y-4">
      <div>
        <Label className="text-base font-medium">Quick Flavor Tags</Label>
        <p className="text-sm text-muted-foreground mb-3">Select tags to quickly describe your brew</p>
        
        <div className="flex flex-wrap gap-2 mb-4">
          {quickNoteTags.map((tag) => (
            <Button
              key={tag.value}
              variant={selectedTags.includes(tag.value) ? "default" : "outline"}
              size="sm"
              onClick={() => toggleTag(tag.value)}
              className={`text-sm transition-all duration-200 ${
                selectedTags.includes(tag.value) 
                  ? 'bg-primary text-primary-foreground scale-105' 
                  : 'border-border hover:bg-secondary hover:scale-105'
              }`}
            >
              {tag.emoji} {tag.label}
            </Button>
          ))}
        </div>
        
        {selectedTags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-3">
            <Label className="text-sm text-muted-foreground">Selected:</Label>
            {selectedTags.map((tagValue) => {
              const tag = quickNoteTags.find(t => t.value === tagValue);
              return tag ? (
                <Badge key={tagValue} variant="secondary" className="bg-primary/10 text-primary">
                  {tag.emoji} {tag.label}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleTag(tagValue)}
                    className="ml-1 h-4 w-4 p-0 hover:bg-primary/20"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              ) : null;
            })}
          </div>
        )}
      </div>
    </div>
  );
}