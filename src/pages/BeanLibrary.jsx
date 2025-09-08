
import React, { useState, useEffect } from "react";
import { Bean } from "@/api/entities"; // Corrected based on outline
import { UploadFile } from "@/api/integrations";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Coffee,
  MapPin,
  Calendar,
  Star,
  Upload,
  DollarSign,
  Package,
  X,
  Save,
  Edit,
  Check,
  Trash2,
  Search // Added
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { format } from "date-fns";
import BeanScanner from "../components/beans/BeanScanner"; // Import the new component

export default function BeanLibrary() {
  const [beans, setBeans] = useState([]);
  const [filteredBeans, setFilteredBeans] = useState([]); // New state for filtered beans
  const [searchTerm, setSearchTerm] = useState(''); // New state for search term
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  // New states for individual bean editing
  const [editingBeanId, setEditingBeanId] = useState(null); // ID of the bean currently being edited
  const [editingBeanData, setEditingBeanData] = useState({}); // Stores the draft data for the bean being edited
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    origin: '',
    roaster: '',
    roast_level: 'medium',
    process: 'washed',
    variety: '',
    altitude: '',
    harvest_date: '',
    roast_date: '',
    price: '',
    bag_size: '',
    weight_left: '', // New field for weight tracking
    photo_url: '',
    tasting_notes: '',
    cupping_score: ''
  });

  useEffect(() => {
    loadBeans();
  }, []);

  useEffect(() => {
    // Filter beans based on search term whenever beans or searchTerm changes
    if (searchTerm.trim() === '') {
      setFilteredBeans(beans);
    } else {
      const filtered = beans.filter(bean =>
        bean.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bean.origin.toLowerCase().includes(searchTerm.toLowerCase()) ||
        bean.roaster.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (bean.tasting_notes && bean.tasting_notes.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredBeans(filtered);
    }
  }, [beans, searchTerm]);

  const loadBeans = async () => {
    const beanList = await Bean.list('-created_date');
    // Ensure weight_left is initialized if bag_size exists and weight_left is null/undefined
    // This pre-processes the data once on load for display, individual edit will handle its own
    const processedBeans = beanList.map(bean => ({
      ...bean,
      weight_left: bean.weight_left === undefined || bean.weight_left === null ? bean.bag_size : bean.weight_left
    }));
    setBeans(processedBeans);
  };

  const handleScanComplete = () => {
    loadBeans(); // Refresh the bean list after a new bean is added via scanner
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // New handler for updating bean in individual edit mode
  const handleEditBeanChange = (field, value) => {
    setEditingBeanData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Start editing a specific bean
  const startEditingBean = (bean) => {
    setEditingBeanId(bean.id);
    setEditingBeanData({
      ...bean,
      // Initialize weight_left for editing if it's not set
      weight_left: bean.weight_left === undefined || bean.weight_left === null ? bean.bag_size : bean.weight_left
    });
  };

  // Save changes for the currently editing bean
  const handleSaveBeanEdit = async () => {
    setIsSubmitting(true);
    try {
      const cleanData = {
        ...editingBeanData,
        altitude: parseFloat(editingBeanData.altitude) || null,
        price: parseFloat(editingBeanData.price) || null,
        bag_size: parseFloat(editingBeanData.bag_size) || null,
        weight_left: parseFloat(editingBeanData.weight_left) || parseFloat(editingBeanData.bag_size) || null, // Ensure weight_left is parsed
        cupping_score: parseFloat(editingBeanData.cupping_score) || null
      };

      await Bean.update(editingBeanId, cleanData);
      await loadBeans(); // Reload all beans to reflect changes
      setEditingBeanId(null); // Exit edit mode for this bean
      setEditingBeanData({}); // Clear editing data
      // Optional: Add a toast/notification for success
      // alert('Bean updated successfully!');
    } catch (error) {
      console.error('Error saving bean:', error);
      // Optional: Add a toast/notification for error
      // alert('Error saving bean. Please try again.');
    }
    setIsSubmitting(false);
  };

  // Cancel edit mode for the current bean and discard changes
  const handleCancelBeanEdit = () => {
    setEditingBeanId(null); // Exit edit mode
    setEditingBeanData({}); // Discard changes
  };

  // Delete a specific bean
  const handleDeleteBean = async (beanId) => {
    if (window.confirm('Are you sure you want to delete this bean? This action cannot be undone and will also remove its link from any existing brews.')) {
      setIsSubmitting(true);
      try {
        await Bean.delete(beanId);
        setBeans(prev => prev.filter(bean => bean.id !== beanId));
        if (editingBeanId === beanId) {
          setEditingBeanId(null); // If the deleted bean was being edited, exit edit mode
          setEditingBeanData({});
        }
        // alert('Bean deleted successfully.');
      } catch (error) {
        console.error('Error deleting bean:', error);
        // alert('Error deleting bean. Please try again.');
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const { file_url } = await UploadFile({ file });
      handleInputChange('photo_url', file_url);
    } catch (error) {
      console.error('Error uploading photo:', error);
    }
    setIsUploading(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const beanData = {
        ...formData,
        altitude: parseFloat(formData.altitude) || null,
        price: parseFloat(formData.price) || null,
        bag_size: parseFloat(formData.bag_size) || null,
        weight_left: parseFloat(formData.weight_left) || parseFloat(formData.bag_size) || null, // Default weight_left to bag_size if not specified
        cupping_score: parseFloat(formData.cupping_score) || null
      };

      await Bean.create(beanData);

      setIsDialogOpen(false);
      setFormData({
        name: '',
        origin: '',
        roaster: '',
        roast_level: 'medium',
        process: 'washed',
        variety: '',
        altitude: '',
        harvest_date: '',
        roast_date: '',
        price: '',
        bag_size: '',
        weight_left: '', // Reset new field
        photo_url: '',
        tasting_notes: '',
        cupping_score: ''
      });
      loadBeans();
    } catch (error) {
      console.error('Error saving bean:', error);
    }
    setIsSubmitting(false);
  };

  // Helper to determine weight status for badge
  const getWeightStatus = (bean) => {
    const weightLeft = parseFloat(bean.weight_left);
    const bagSize = parseFloat(bean.bag_size);

    if (isNaN(weightLeft) || weightLeft <= 0) return { status: 'empty', color: 'bg-red-500', text: 'Empty' };
    if (isNaN(bagSize) || bagSize <= 0) return { status: 'unknown', color: 'bg-gray-500', text: 'Unknown' }; // Added unknown for 0 bag_size
    if (weightLeft <= bagSize * 0.2) return { status: 'low', color: 'bg-amber-500', text: 'Low' };
    return { status: 'good', color: 'bg-green-500', text: 'Good' };
  };

  const getRoastLevelColor = (level) => {
    return 'bg-secondary text-secondary-foreground border-border';
  };

  const getProcessColor = (process) => {
    return 'bg-secondary text-secondary-foreground border-border';
  };

  return (
    <div className="p-4 sm:p-6 md:p-8 min-h-screen bg-background">
      <div className="max-w-7xl mx-auto">
        {/* Desktop Header */}
        <div className="hidden md:block mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Bean Library</h1>
              <p className="text-muted-foreground mt-1">Your personal coffee collection.</p>
            </div>

            <div className="flex gap-3">
              <BeanScanner onScanComplete={handleScanComplete} />
              <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                  <Button className="bg-primary text-primary-foreground hover:bg-primary/90">
                    <Plus className="w-4 h-4 mr-2" />
                    Add Manually
                  </Button>
                </DialogTrigger>

                <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
                  <DialogHeader>
                    <DialogTitle>Add New Coffee Bean</DialogTitle>
                  </DialogHeader>

                  <form onSubmit={handleSubmit} className="space-y-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="name">Bean Name *</Label>
                        <Input
                          id="name"
                          value={formData.name}
                          onChange={(e) => handleInputChange('name', e.target.value)}
                          placeholder="Ethiopian Yirgacheffe"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="origin">Origin *</Label>
                        <Input
                          id="origin"
                          value={formData.origin}
                          onChange={(e) => handleInputChange('origin', e.target.value)}
                          placeholder="Ethiopia, Yirgacheffe"
                          required
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="roaster">Roaster *</Label>
                        <Input
                          id="roaster"
                          value={formData.roaster}
                          onChange={(e) => handleInputChange('roaster', e.target.value)}
                          placeholder="Blue Bottle Coffee"
                          required
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="variety">Variety</Label>
                        <Input
                          id="variety"
                          value={formData.variety}
                          onChange={(e) => handleInputChange('variety', e.target.value)}
                          placeholder="Heirloom"
                        />
                      </div>
                    </div>

                    {/* Processing & Roast */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="roast_level">Roast Level</Label>
                        <Select value={formData.roast_level} onValueChange={(value) => handleInputChange('roast_level', value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="light">Light</SelectItem>
                            <SelectItem value="light_medium">Light Medium</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="medium_dark">Medium Dark</SelectItem>
                            <SelectItem value="dark">Dark</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="process">Process</Label>
                        <Select value={formData.process} onValueChange={(value) => handleInputChange('process', value)}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
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
                    </div>

                    {/* Dates and Numbers */}
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="roast_date">Roast Date</Label>
                        <Input
                          id="roast_date"
                          type="date"
                          value={formData.roast_date}
                          onChange={(e) => handleInputChange('roast_date', e.target.value)}
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="harvest_date">Harvest Date</Label>
                        <Input
                          id="harvest_date"
                          type="date"
                          value={formData.harvest_date}
                          onChange={(e) => handleInputChange('harvest_date', e.target.value)}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="altitude">Altitude (m)</Label>
                        <Input
                          id="altitude"
                          type="number"
                          value={formData.altitude}
                          onChange={(e) => handleInputChange('altitude', e.target.value)}
                          placeholder="1800"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="price">Price ($)</Label>
                        <Input
                          id="price"
                          type="number"
                          step="0.01"
                          value={formData.price}
                          onChange={(e) => handleInputChange('price', e.target.value)}
                          placeholder="18.99"
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="bag_size">Bag Size (g)</Label>
                        <Input
                          id="bag_size"
                          type="number"
                          value={formData.bag_size}
                          onChange={(e) => handleInputChange('bag_size', e.target.value)}
                          placeholder="340"
                        />
                      </div>
                    </div>

                    {/* New: Weight Left */}
                    <div className="space-y-2">
                      <Label htmlFor="weight_left">Weight Left (g)</Label>
                      <Input
                        id="weight_left"
                        type="number"
                        value={formData.weight_left}
                        onChange={(e) => handleInputChange('weight_left', e.target.value)}
                        placeholder="e.g. 340 (if full)"
                      />
                    </div>

                    {/* Tasting Notes */}
                    <div className="space-y-2">
                      <Label htmlFor="tasting_notes">Tasting Notes</Label>
                      <Textarea
                        id="tasting_notes"
                        value={formData.tasting_notes}
                        onChange={(e) => handleInputChange('tasting_notes', e.target.value)}
                        placeholder="Bright acidity, floral notes, citrus finish..."
                        className="h-20"
                      />
                    </div>

                    {/* Cupping Score */}
                    <div className="space-y-2">
                      <Label htmlFor="cupping_score">Cupping Score (0-100)</Label>
                      <Input
                        id="cupping_score"
                        type="number"
                        min="0"
                        max="100"
                        value={formData.cupping_score}
                        onChange={(e) => handleInputChange('cupping_score', e.target.value)}
                        placeholder="85"
                      />
                    </div>

                    {/* Photo Upload */}
                    <div className="space-y-2">
                      <Label htmlFor="photo">Photo</Label>
                      <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                        <input
                          type="file"
                          id="photo"
                          accept="image/*"
                          onChange={handlePhotoUpload}
                          className="hidden"
                        />
                        {formData.photo_url ? (
                          <img
                            src={formData.photo_url}
                            alt="Bean photo"
                            className="w-24 h-24 object-cover rounded-lg mx-auto mb-2"
                          />
                        ) : (
                            <Coffee className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
                          )}
                        <label
                          htmlFor="photo"
                          className="cursor-pointer flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
                        >
                          <Upload className="w-4 h-4" />
                          {isUploading ? 'Uploading...' : formData.photo_url ? 'Change Photo' : 'Add Photo'}
                        </label>
                      </div>
                    </div>

                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                    >
                      {isSubmitting ? 'Adding Bean...' : 'Add Bean'}
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          <div className="mb-6">
            <h2 className="text-xl font-semibold text-foreground mb-4">Your Personal Coffee Collection</h2>

            {/* Search Input */}
            <div className="relative max-w-md">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search beans by name, origin, or notes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
          </div>
        </div>

        {/* Mobile Header */}
        <div className="md:hidden mb-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Bean Library</h1>
          <h2 className="text-lg font-medium text-foreground mb-4">Your Personal Coffee Collection</h2>

          {/* Search Input */}
          <div className="relative mb-4">
            <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search beans..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10"
            />
          </div>

          {/* Mobile Action Buttons */}
          <div className="flex flex-wrap gap-2 mb-6">
             <BeanScanner onScanComplete={handleScanComplete} />
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
              <DialogTrigger asChild>
                <Button className="bg-primary text-primary-foreground hover:bg-primary/90 flex-1 min-w-0">
                  <Plus className="w-4 h-4 mr-2" />
                  Add Manually
                </Button>
              </DialogTrigger>

              <DialogContent className="max-w-[95vw] max-h-[80vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Coffee Bean</DialogTitle>
                </DialogHeader>

                <form onSubmit={handleSubmit} className="space-y-4">
                  {/* Basic Info */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Bean Name *</Label>
                      <Input
                        id="name"
                        value={formData.name}
                        onChange={(e) => handleInputChange('name', e.target.value)}
                        placeholder="Ethiopian Yirgacheffe"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="origin">Origin *</Label>
                      <Input
                        id="origin"
                        value={formData.origin}
                        onChange={(e) => handleInputChange('origin', e.target.value)}
                        placeholder="Ethiopia, Yirgacheffe"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="roaster">Roaster *</Label>
                      <Input
                        id="roaster"
                        value={formData.roaster}
                        onChange={(e) => handleInputChange('roaster', e.target.value)}
                        placeholder="Blue Bottle Coffee"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="variety">Variety</Label>
                      <Input
                        id="variety"
                        value={formData.variety}
                        onChange={(e) => handleInputChange('variety', e.target.value)}
                        placeholder="Heirloom"
                      />
                    </div>
                  </div>

                  {/* Processing & Roast */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="roast_level">Roast Level</Label>
                      <Select value={formData.roast_level} onValueChange={(value) => handleInputChange('roast_level', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="light">Light</SelectItem>
                          <SelectItem value="light_medium">Light Medium</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="medium_dark">Medium Dark</SelectItem>
                          <SelectItem value="dark">Dark</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="process">Process</Label>
                      <Select value={formData.process} onValueChange={(value) => handleInputChange('process', value)}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
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
                  </div>

                  {/* Dates and Numbers */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="roast_date">Roast Date</Label>
                      <Input
                        id="roast_date"
                        type="date"
                        value={formData.roast_date}
                        onChange={(e) => handleInputChange('roast_date', e.target.value)}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="harvest_date">Harvest Date</Label>
                      <Input
                        id="harvest_date"
                        type="date"
                        value={formData.harvest_date}
                        onChange={(e) => handleInputChange('harvest_date', e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="altitude">Altitude (m)</Label>
                      <Input
                        id="altitude"
                        type="number"
                        value={formData.altitude}
                        onChange={(e) => handleInputChange('altitude', e.target.value)}
                        placeholder="1800"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="price">Price ($)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => handleInputChange('price', e.target.value)}
                        placeholder="18.99"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="bag_size">Bag Size (g)</Label>
                      <Input
                        id="bag_size"
                        type="number"
                        value={formData.bag_size}
                        onChange={(e) => handleInputChange('bag_size', e.target.value)}
                        placeholder="340"
                      />
                    </div>
                  </div>

                  {/* New: Weight Left */}
                  <div className="space-y-2">
                    <Label htmlFor="weight_left">Weight Left (g)</Label>
                    <Input
                      id="weight_left"
                      type="number"
                      value={formData.weight_left}
                      onChange={(e) => handleInputChange('weight_left', e.target.value)}
                      placeholder="e.g. 340 (if full)"
                    />
                  </div>

                  {/* Tasting Notes */}
                  <div className="space-y-2">
                    <Label htmlFor="tasting_notes">Tasting Notes</Label>
                    <Textarea
                      id="tasting_notes"
                      value={formData.tasting_notes}
                      onChange={(e) => handleInputChange('tasting_notes', e.target.value)}
                      placeholder="Bright acidity, floral notes, citrus finish..."
                      className="h-20"
                    />
                  </div>

                  {/* Cupping Score */}
                  <div className="space-y-2">
                    <Label htmlFor="cupping_score">Cupping Score (0-100)</Label>
                    <Input
                      id="cupping_score"
                      type="number"
                      min="0"
                      max="100"
                      value={formData.cupping_score}
                      onChange={(e) => handleInputChange('cupping_score', e.target.value)}
                      placeholder="85"
                    />
                  </div>

                  {/* Photo Upload */}
                  <div className="space-y-2">
                    <Label htmlFor="photo">Photo</Label>
                    <div className="border-2 border-dashed border-border rounded-lg p-4 text-center">
                      <input
                        type="file"
                        id="photo"
                        accept="image/*"
                        onChange={handlePhotoUpload}
                        className="hidden"
                      />
                      {formData.photo_url ? (
                        <img
                          src={formData.photo_url}
                          alt="Bean photo"
                          className="w-24 h-24 object-cover rounded-lg mx-auto mb-2"
                        />
                      ) : (
                          <Coffee className="w-12 h-12 text-muted-foreground/50 mx-auto mb-2" />
                        )}
                      <label
                        htmlFor="photo"
                        className="cursor-pointer flex items-center justify-center gap-2 text-muted-foreground hover:text-foreground"
                      >
                        <Upload className="w-4 h-4" />
                        {isUploading ? 'Uploading...' : formData.photo_url ? 'Change Photo' : 'Add Photo'}
                      </label>
                    </div>
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    {isSubmitting ? 'Adding Bean...' : 'Add Bean'}
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Beans Grid */}
        {filteredBeans.length === 0 ? (
          <div className="text-center py-16">
            <Coffee className="w-20 h-20 text-muted-foreground/30 mx-auto mb-6" />
            <h3 className="text-2xl font-bold text-foreground mb-4">
              {beans.length === 0 ? 'No beans in your library' : 'No beans match your search'}
            </h3>
            <p className="text-muted-foreground mb-6">
              {beans.length === 0 ? 'Start building your coffee collection' : 'Try adjusting your search terms'}
            </p>
            {beans.length === 0 && (
              <Button
                onClick={() => setIsDialogOpen(true)}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Your First Bean
              </Button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 md:gap-6">
            {filteredBeans.map((bean) => { // Render filteredBeans
              // Determine if this specific bean card is in edit mode
              const isEditing = editingBeanId === bean.id;
              // Use editingBeanData if in edit mode for this bean, otherwise use the original bean data
              const displayBean = isEditing ? editingBeanData : bean;
              const weightStatus = getWeightStatus(displayBean);

              return (
                <Card
                  key={bean.id}
                  className={`border-border bg-card transition-all duration-300 relative ${
                    isEditing ? 'ring-2 ring-primary/20' : 'hover:bg-secondary/50'
                  }`}
                >
                  <CardHeader className="p-0 relative">
                    {displayBean.photo_url ? (
                      <img
                        src={displayBean.photo_url}
                        alt={displayBean.name}
                        className="w-full h-32 sm:h-48 object-cover rounded-t-lg"
                      />
                    ) : (
                        <div className="w-full h-32 sm:h-48 bg-secondary rounded-t-lg flex items-center justify-center">
                          <Coffee className="w-8 sm:w-12 h-8 sm:h-12 text-muted-foreground/50" />
                        </div>
                      )}

                    {/* Weight status badge */}
                    <div className="absolute top-2 right-2">
                      <Badge className={`${weightStatus.color} text-white text-xs`}>
                        {weightStatus.text}
                      </Badge>
                    </div>

                    {/* Edit button (only visible when not editing this specific card) */}
                    {!isEditing && (
                      <div className="absolute top-2 left-2">
                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => startEditingBean(bean)}
                          className="bg-white/90 hover:bg-white text-gray-700 h-7 px-2"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    )}
                  </CardHeader>

                  <CardContent className="p-3 sm:p-6">
                    {isEditing ? (
                      // Edit mode UI for the bean
                      <div className="space-y-3">
                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Name</Label>
                          <Input
                            value={editingBeanData.name || ''}
                            onChange={(e) => handleEditBeanChange('name', e.target.value)}
                            className="text-sm h-8"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Roaster</Label>
                            <Input
                              value={editingBeanData.roaster || ''}
                              onChange={(e) => handleEditBeanChange('roaster', e.target.value)}
                              className="text-sm h-8"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Origin</Label>
                            <Input
                              value={editingBeanData.origin || ''}
                              onChange={(e) => handleEditBeanChange('origin', e.target.value)}
                              className="text-sm h-8"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Variety</Label>
                            <Input
                              value={editingBeanData.variety || ''}
                              onChange={(e) => handleEditBeanChange('variety', e.target.value)}
                              className="text-sm h-8"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Process</Label>
                            <Select
                              value={editingBeanData.process || ''}
                              onValueChange={(value) => handleEditBeanChange('process', value)}
                            >
                              <SelectTrigger className="text-sm h-8">
                                <SelectValue />
                              </SelectTrigger>
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
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Roast Level</Label>
                          <Select
                            value={editingBeanData.roast_level || ''}
                            onValueChange={(value) => handleEditBeanChange('roast_level', value)}
                          >
                            <SelectTrigger className="text-sm h-8">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="light">Light</SelectItem>
                              <SelectItem value="light_medium">Light Medium</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="medium_dark">Medium Dark</SelectItem>
                              <SelectItem value="dark">Dark</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Roast Date</Label>
                          <Input
                            type="date"
                            value={editingBeanData.roast_date || ''}
                            onChange={(e) => handleEditBeanChange('roast_date', e.target.value)}
                            className="text-sm h-8"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-2">
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Bag Size (g)</Label>
                            <Input
                              type="number"
                              value={editingBeanData.bag_size || ''}
                              onChange={(e) => handleEditBeanChange('bag_size', e.target.value)}
                              className="text-sm h-8"
                            />
                          </div>
                          <div className="space-y-2">
                            <Label className="text-xs text-muted-foreground">Weight Left (g)</Label>
                            <Input
                              type="number"
                              value={editingBeanData.weight_left || ''}
                              onChange={(e) => handleEditBeanChange('weight_left', e.target.value)}
                              className="text-sm h-8"
                            />
                          </div>
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Cupping Score</Label>
                          <Input
                            type="number"
                            value={editingBeanData.cupping_score || ''}
                            onChange={(e) => handleEditBeanChange('cupping_score', e.target.value)}
                            className="text-sm h-8"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label className="text-xs text-muted-foreground">Tasting Notes</Label>
                          <Textarea
                            value={editingBeanData.tasting_notes || ''}
                            onChange={(e) => handleEditBeanChange('tasting_notes', e.target.value)}
                            className="text-sm h-16 resize-none"
                            placeholder="Flavor notes..."
                          />
                        </div>

                        {/* Save/Cancel/Delete buttons for individual bean */}
                        <div className="flex gap-2 pt-2">
                          <Button
                            size="sm"
                            onClick={handleSaveBeanEdit}
                            disabled={isSubmitting}
                            className="flex-1 bg-primary hover:bg-primary/90 h-8"
                          >
                            <Save className="w-3 h-3 mr-1" />
                            {isSubmitting ? 'Saving...' : 'Save'}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={handleCancelBeanEdit}
                            className="flex-1 h-8"
                          >
                            <X className="w-3 h-3 mr-1" />
                            Cancel
                          </Button>
                        </div>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDeleteBean(bean.id)}
                          className="w-full h-8"
                          disabled={isSubmitting}
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete Bean
                        </Button>
                      </div>
                    ) : (
                      // Display mode UI for the bean
                      <div className="space-y-2 sm:space-y-3">
                        <div>
                          <h3 className="font-bold text-base sm:text-lg text-foreground truncate">{bean.name}</h3>
                          <p className="text-muted-foreground font-medium text-sm truncate">{bean.roaster}</p>
                        </div>

                        <div className="flex items-center gap-2 text-sm text-muted-foreground">
                          <MapPin className="w-3 h-3 sm:w-4 sm:h-4" />
                          <span className="truncate">{bean.origin}</span>
                        </div>

                        <div className="flex flex-wrap gap-1">
                          <Badge variant="secondary" className={`text-xs ${getRoastLevelColor(bean.roast_level)}`}>
                            {bean.roast_level?.replace('_', ' ')}
                          </Badge>
                          <Badge variant="secondary" className={`text-xs ${getProcessColor(bean.process)}`}>
                            {bean.process}
                          </Badge>
                        </div>

                        {bean.cupping_score && (
                          <div className="flex items-center gap-2">
                            <Star className="w-3 h-3 sm:w-4 sm:h-4 text-primary" />
                            <span className="font-semibold text-foreground text-sm">{bean.cupping_score}/100</span>
                          </div>
                        )}

                        {bean.roast_date && (
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Calendar className="w-3 h-3 sm:w-4 sm:h-4" />
                            <span className="text-xs sm:text-sm">Roasted {format(new Date(bean.roast_date), 'MMM d, yyyy')}</span>
                          </div>
                        )}

                        <div className="text-sm">
                          {bean.price && (
                            <div className="flex items-center gap-1 text-muted-foreground mb-1">
                              <DollarSign className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="text-xs sm:text-sm">${bean.price}</span>
                            </div>
                          )}
                          {(bean.bag_size || (bean.weight_left !== undefined && bean.weight_left !== null)) && (
                            <div className="flex items-center gap-1 text-muted-foreground">
                              <Package className="w-3 h-3 sm:w-4 sm:h-4" />
                              <span className="text-xs sm:text-sm">
                                {bean.bag_size ? `Bag ${bean.bag_size}g` : ''}
                                {bean.bag_size && (bean.weight_left !== undefined && bean.weight_left !== null) ? ' • ' : ''}
                                {(bean.weight_left !== undefined && bean.weight_left !== null) ? `Left ${bean.weight_left}g` : ''}
                              </span>
                            </div>
                          )}
                        </div>

                        {bean.tasting_notes && (
                          <p className="text-xs sm:text-sm text-muted-foreground italic line-clamp-2">
                            "{bean.tasting_notes}"
                          </p>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
