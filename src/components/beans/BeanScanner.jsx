import React, { useState, useRef } from "react";
import { Bean } from "@/api/entities";
import { UploadFile, ExtractDataFromUploadedFile } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter
} from "@/components/ui/dialog";
import { Camera, ScanLine, Loader2, Save, Coffee, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { createPageUrl } from "@/utils";

// This schema guides the AI in extracting the correct information from the image.
const beanSchemaForExtraction = {
  type: "object",
  properties: {
    roaster: { type: "string", description: "The name of the coffee roaster or company." },
    name: { type: "string", description: "The specific name of the coffee blend or single origin." },
    origin: { type: "string", description: "The country or region the coffee is from (e.g., 'Ethiopia', 'Colombia, Huila')." },
    variety: { type: "string", description: "The coffee plant variety, if mentioned (e.g., 'Gesha', 'Bourbon', 'Heirloom')." },
    process: { type: "string", enum: ["washed", "natural", "honey", "semi_washed", "anaerobic", "other"], description: "The processing method used for the beans." },
    roast_date: { type: "string", format: "date", description: "The date the coffee was roasted." },
    bag_size: { type: "number", description: "The net weight of the coffee bag in grams (g)." },
    tasting_notes: { type: "string", description: "A comma-separated list of flavor notes mentioned on the package (e.g., 'Blueberry, Dark Chocolate, Floral')." },
  },
  required: ["roaster", "name", "origin"]
};

export default function BeanScanner({ onScanComplete }) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [isReviewOpen, setIsReviewOpen] = useState(false);
  const [isSuccessOpen, setIsSuccessOpen] = useState(false);
  const [scannedData, setScannedData] = useState(null);
  const [newlySavedBean, setNewlySavedBean] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const navigate = useNavigate();

  const handleFileSelect = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    if (!window.confirm("To analyze the bean package, the image will be securely uploaded for processing. Do you want to continue?")) {
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // 1. Upload the file
      const { file_url } = await UploadFile({ file });
      
      // 2. Extract data from the uploaded file using the schema
      const extractionResult = await ExtractDataFromUploadedFile({
        file_url,
        json_schema: beanSchemaForExtraction,
      });

      if (extractionResult.status === 'success' && extractionResult.output) {
        // Prepare data for the review form
        const output = Array.isArray(extractionResult.output) ? extractionResult.output[0] : extractionResult.output;
        setScannedData({
          ...output,
          photo_url: file_url, // Add the photo URL to the data
          weight_left: output.bag_size || '' // Pre-fill weight_left
        });
        setIsReviewOpen(true);
      } else {
        throw new Error(extractionResult.details || "Could not extract bean information. Please try another image or enter details manually.");
      }
    } catch (err) {
      console.error("Scanning failed:", err);
      setError(err.message);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleFormChange = (field, value) => {
    setScannedData(prev => ({ ...prev, [field]: value }));
  };

  const handleSaveBean = async () => {
    if (!scannedData) return;
    setIsProcessing(true);
    
    try {
      const beanToCreate = {
        ...scannedData,
        altitude: parseFloat(scannedData.altitude) || null,
        price: parseFloat(scannedData.price) || null,
        bag_size: parseFloat(scannedData.bag_size) || null,
        weight_left: parseFloat(scannedData.weight_left) || parseFloat(scannedData.bag_size) || null,
        cupping_score: parseFloat(scannedData.cupping_score) || null
      };

      const newBean = await Bean.create(beanToCreate);
      setNewlySavedBean(newBean);
      setIsReviewOpen(false);
      setIsSuccessOpen(true);
      onScanComplete(); // Refresh the bean library
    } catch (err) {
      console.error("Failed to save bean:", err);
      setError("Failed to save the bean. Please check the fields and try again.");
    } finally {
      setIsProcessing(false);
    }
  };
  
  const startBrewWithNewBean = () => {
    setIsSuccessOpen(false);
    // Navigate to BrewMethods, but we can't directly pre-select the bean yet.
    // The user will see it at the top of their bean list on the BrewSession page.
    navigate(createPageUrl("BrewMethods"));
  };

  return (
    <>
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileSelect}
        accept="image/*"
        capture="environment"
        className="hidden"
      />
      <Button 
        onClick={() => fileInputRef.current.click()} 
        disabled={isProcessing}
        variant="outline"
        className="border-primary text-primary hover:bg-primary/10 hover:text-primary"
      >
        {isProcessing ? (
          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
        ) : (
          <Camera className="w-4 h-4 mr-2" />
        )}
        {isProcessing ? 'Analyzing...' : 'Scan Package'}
      </Button>

      {/* Review Dialog */}
      <Dialog open={isReviewOpen} onOpenChange={setIsReviewOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review & Save Bean</DialogTitle>
            <DialogDescription>
              Confirm the extracted details from your bean package. Edit any fields as needed.
            </DialogDescription>
          </DialogHeader>

          {scannedData && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Bean Name *</Label>
                  <Input value={scannedData.name || ''} onChange={(e) => handleFormChange('name', e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Roaster *</Label>
                  <Input value={scannedData.roaster || ''} onChange={(e) => handleFormChange('roaster', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Origin *</Label>
                <Input value={scannedData.origin || ''} onChange={(e) => handleFormChange('origin', e.target.value)} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Process</Label>
                  <Select value={scannedData.process || 'washed'} onValueChange={(val) => handleFormChange('process', val)}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="washed">Washed</SelectItem>
                      <SelectItem value="natural">Natural</SelectItem>
                      <SelectItem value="honey">Honey</SelectItem>
                      <SelectItem value="semi_washed">Semi-Washed</SelectItem>
                      <SelectItem value="anaerobic">Anaerobic</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Variety</Label>
                  <Input value={scannedData.variety || ''} onChange={(e) => handleFormChange('variety', e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                  <Label>Tasting Notes</Label>
                  <Textarea value={scannedData.tasting_notes || ''} onChange={(e) => handleFormChange('tasting_notes', e.target.value)} />
              </div>
              <div className="grid grid-cols-3 gap-4">
                  <div className="space-y-2">
                      <Label>Roast Date</Label>
                      <Input type="date" value={scannedData.roast_date || ''} onChange={(e) => handleFormChange('roast_date', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                      <Label>Bag Size (g)</Label>
                      <Input type="number" value={scannedData.bag_size || ''} onChange={(e) => handleFormChange('bag_size', e.target.value)} />
                  </div>
                   <div className="space-y-2">
                      <Label>Weight Left (g)</Label>
                      <Input type="number" value={scannedData.weight_left || ''} onChange={(e) => handleFormChange('weight_left', e.target.value)} />
                  </div>
              </div>
              {scannedData.photo_url && (
                <div className="space-y-2">
                  <Label>Package Photo</Label>
                  <img src={scannedData.photo_url} alt="Scanned bean package" className="w-full h-auto max-h-48 object-contain rounded-md border border-border" />
                </div>
              )}
            </div>
          )}

          {error && <p className="text-sm text-red-500">{error}</p>}
          
          <DialogFooter>
            <Button variant="ghost" onClick={() => setIsReviewOpen(false)}>Cancel</Button>
            <Button onClick={handleSaveBean} disabled={isProcessing}>
              {isProcessing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Save className="w-4 h-4 mr-2" />}
              Save Bean
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Success Dialog */}
      <Dialog open={isSuccessOpen} onOpenChange={setIsSuccessOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Bean Added Successfully!</DialogTitle>
             <DialogDescription>
              "{newlySavedBean?.name}" has been added to your library.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
             <Button className="w-full bg-primary text-primary-foreground hover:bg-primary/90" onClick={startBrewWithNewBean}>
                <Coffee className="w-4 h-4 mr-2"/>
                Create Brew with this Bean
                <ArrowRight className="w-4 h-4 ml-auto"/>
             </Button>
          </div>
           <DialogFooter>
              <Button variant="outline" onClick={() => setIsSuccessOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}