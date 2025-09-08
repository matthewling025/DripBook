import React from "react";
import { Button } from "@/components/ui/button";
import { Share2, Copy, Instagram, Twitter } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

export default function ShareButton({ 
  title = "Check out my coffee brew on DripBook!", 
  text = "I just logged an amazing coffee brew using DripBook - the perfect brewing companion!",
  url,
  image 
}) {
  const shareUrl = url || window.location.href;
  const shareText = `${title}\n\n${text}\n\n${shareUrl}`;

  const handleNativeShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title,
          text,
          url: shareUrl
        });
      } catch (err) {
        console.log('Error sharing:', err);
      }
    }
  };

  const copyToClipboard = async () => {
    try {
      await navigator.clipboard.writeText(shareText);
      alert('Link copied to clipboard!');
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  const shareToInstagram = () => {
    // Instagram doesn't support direct URL sharing, so we'll copy the text
    copyToClipboard();
    alert('Content copied! You can now paste it in your Instagram story or post.');
  };

  const shareToTwitter = () => {
    const twitterUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(shareText)}`;
    window.open(twitterUrl, '_blank', 'width=600,height=400');
  };

  const shareToReddit = () => {
    const redditUrl = `https://www.reddit.com/submit?url=${encodeURIComponent(shareUrl)}&title=${encodeURIComponent(title)}`;
    window.open(redditUrl, '_blank');
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" className="border-primary text-primary hover:bg-primary/10">
          <Share2 className="w-4 h-4 mr-2" />
          Share
        </Button>
      </DialogTrigger>
      
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Share Your Brew</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-3">
          {navigator.share && (
            <Button onClick={handleNativeShare} className="w-full bg-primary hover:bg-primary/90">
              <Share2 className="w-4 h-4 mr-2" />
              Share via...
            </Button>
          )}
          
          <div className="grid grid-cols-2 gap-3">
            <Button onClick={shareToInstagram} variant="outline" className="border-pink-500 text-pink-600 hover:bg-pink-50">
              <Instagram className="w-4 h-4 mr-2" />
              Instagram
            </Button>
            
            <Button onClick={shareToTwitter} variant="outline" className="border-blue-500 text-blue-600 hover:bg-blue-50">
              <Twitter className="w-4 h-4 mr-2" />
              Twitter
            </Button>
          </div>
          
          <Button onClick={shareToReddit} variant="outline" className="w-full border-orange-500 text-orange-600 hover:bg-orange-50">
            🌐 Share on r/coffee
          </Button>
          
          <Button onClick={copyToClipboard} variant="outline" className="w-full border-border hover:bg-secondary">
            <Copy className="w-4 h-4 mr-2" />
            Copy Link
          </Button>
          
          <p className="text-xs text-muted-foreground text-center mt-4">
            Would you use DripBook to track your brews? 
            <br />
            Share your thoughts and help spread the word! ☕
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}