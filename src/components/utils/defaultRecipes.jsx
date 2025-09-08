import { BrewRecipe } from "@/api/entities";

const SEED_VERSION = "2.0"; // Increment to trigger re-seeding

// Updated and curated default recipes with proper method slugs
export const DEFAULT_RECIPES = [
  {
    name: 'Standard V60 (Light Roast)',
    method: 'v60',
    coffee_dose: 20,
    water_amount: 300,
    water_temp: 92,
    steps: [
      { name: 'Bloom', time: '00:00', water: '60', temp: 92 },
      { name: 'Pour 2', time: '00:45', water: '150', temp: 92 },
      { name: 'Pour 3', time: '01:30', water: '225', temp: 92 },
      { name: 'Pour 4', time: '02:15', water: '300', temp: 92 },
    ],
    customize_per_step_temp: false,
    remarks: 'A solid V60 recipe for light to medium roasts. Adjust grind size for desired extraction.'
  },
  {
    name: 'Rao 1:2 Classic',
    method: 'espresso',
    coffee_dose: 18,
    water_amount: 36,
    water_temp: 93,
    steps: [
      { name: 'Pre-infuse', time: '00:00', water: '18', temp: 93 },
      { name: 'Ramp to Full', time: '00:03', water: '36', temp: 93 },
    ],
    customize_per_step_temp: false,
    remarks: 'Target: 25-30s total extraction. Use medium-fine grind, aim for 9 bars pressure, and stop at first signs of blonding. Pre-infuse for 3-5s then ramp to full pressure.'
  },
  {
    name: 'Chemex 1:16 Three-Pour',
    method: 'chemex',
    coffee_dose: 25,
    water_amount: 400,
    water_temp: 93,
    steps: [
      { name: 'Bloom', time: '00:00', water: '60', temp: 93 },
      { name: '2nd Pour', time: '00:45', water: '200', temp: 93 },
      { name: '3rd Pour', time: '01:45', water: '320', temp: 93 },
      { name: 'Final Pour', time: '02:30', water: '400', temp: 93 },
    ],
    customize_per_step_temp: false,
    remarks: 'Classic Chemex for a clean cup. Aim for a total brew time of 3:30-4:00.'
  },
  {
    name: 'AeroPress Inverted 60s',
    method: 'aeropress',
    coffee_dose: 15,
    water_amount: 230,
    water_temp: 85,
    steps: [
      { name: 'Fill & Stir', time: '00:00', water: '230', temp: 85 },
      { name: 'Cap & Flip', time: '00:50', water: '230', temp: 85 },
      { name: 'Press (20s)', time: '00:55', water: '230', temp: 85 },
    ],
    customize_per_step_temp: false,
    remarks: 'A quick inverted method. After filling, stir for 10s. Flip at 50s and begin a 20s press.'
  },
  {
    name: 'Hoffmann French Press',
    method: 'french_press',
    coffee_dose: 30,
    water_amount: 500,
    water_temp: 94,
    steps: [
      { name: 'Fill & Stir', time: '00:00', water: '500', temp: 94 },
      { name: 'Break Crust & Skim', time: '04:00', water: '500', temp: 94 },
      { name: 'Wait & Plunge', time: '08:00', water: '500', temp: 94 },
    ],
    customize_per_step_temp: false,
    remarks: 'Cleaner cup with low sludge. After breaking crust, wait until ~8 mins, then gently plunge just the surface and pour.'
  },
  {
    name: 'Cold Brew 1:8 Overnight',
    method: 'cold_brew',
    coffee_dose: 100,
    water_amount: 800,
    water_temp: 20,
    steps: [
      { name: 'Mix & Steep', time: '00:00:00', water: '800', temp: 20 },
      { name: 'Strain', time: '14:00:00', water: '800', temp: 20 },
    ],
    customize_per_step_temp: false,
    remarks: 'For a strong cold brew concentrate. Use a coarse grind and steep for 14-16 hours in the fridge. Dilute with water or milk to taste.'
  },
];

export const checkSeedVersion = () => {
  const currentVersion = localStorage.getItem('dripbook-seed-version');
  return currentVersion === SEED_VERSION;
};

export const setSeedVersion = () => {
  localStorage.setItem('dripbook-seed-version', SEED_VERSION);
};

export const insertDefaultRecipes = async (forceReseed = false) => {
  try {
    // Check if seeding is needed
    if (!forceReseed && checkSeedVersion()) {
      console.log('Default recipes already seeded for this version. Skipping.');
      return { deleted: 0, inserted: 0, updated: 0 };
    }

    console.log('Starting default recipe seeding...');
    
    // Fetch all recipes with increased limit
    const allRecipes = await BrewRecipe.list('-created_date', 100);
    
    let deletedCount = 0;
    let insertedCount = 0;
    let updatedCount = 0;

    // Group existing recipes by (method, name)
    const existingByKey = new Map();
    const duplicatesToDelete = [];

    for (const recipe of allRecipes) {
      const key = `${recipe.method}::${recipe.name}`;
      
      if (existingByKey.has(key)) {
        // Found duplicate - determine which to keep
        const existing = existingByKey.get(key);
        const existingTime = new Date(existing.created_date || existing.created_at || existing.id);
        const currentTime = new Date(recipe.created_date || recipe.created_at || recipe.id);
        
        if (currentTime > existingTime) {
          // Current recipe is newer, mark existing for deletion
          duplicatesToDelete.push(existing);
          existingByKey.set(key, recipe);
        } else {
          // Existing recipe is newer, mark current for deletion
          duplicatesToDelete.push(recipe);
        }
      } else {
        existingByKey.set(key, recipe);
      }
    }

    // Delete duplicates
    for (const duplicate of duplicatesToDelete) {
      try {
        await BrewRecipe.delete(duplicate.id);
        deletedCount++;
        console.log(`Deleted duplicate: ${duplicate.method}::${duplicate.name}`);
      } catch (error) {
        console.error(`Failed to delete duplicate recipe ${duplicate.id}:`, error);
      }
    }

    // Process default recipes
    for (const defaultRecipe of DEFAULT_RECIPES) {
      const key = `${defaultRecipe.method}::${defaultRecipe.name}`;
      const existing = existingByKey.get(key);

      const recipeData = {
        ...defaultRecipe,
        steps: JSON.stringify(defaultRecipe.steps), // Convert to string
        is_default: true
      };

      try {
        if (existing) {
          // Update existing recipe
          await BrewRecipe.update(existing.id, recipeData);
          updatedCount++;
          console.log(`Updated existing recipe: ${key}`);
        } else {
          // Create new recipe
          await BrewRecipe.create(recipeData);
          insertedCount++;
          console.log(`Created new recipe: ${key}`);
        }
      } catch (error) {
        console.error(`Failed to upsert recipe ${key}:`, error);
        console.error('Recipe data:', recipeData);
        
        // Show user-friendly error
        if (typeof window !== 'undefined') {
          const toast = document.createElement('div');
          toast.className = 'toast';
          toast.textContent = `Failed to load recipe: ${defaultRecipe.name}`;
          document.body.appendChild(toast);
          setTimeout(() => document.body.removeChild(toast), 3000);
        }
      }
    }

    // Mark seeding as complete
    setSeedVersion();
    
    const result = { deleted: deletedCount, inserted: insertedCount, updated: updatedCount };
    console.log('Seeding completed:', result);
    
    return result;
    
  } catch (error) {
    console.error('Error during recipe seeding:', error);
    throw error;
  }
};

export const reseedDefaults = async () => {
  try {
    // Clear version to force re-seed
    localStorage.removeItem('dripbook-seed-version');
    
    // Delete all existing default recipes
    const allRecipes = await BrewRecipe.list('-created_date', 100);
    const defaultRecipes = allRecipes.filter(r => r.is_default);
    
    for (const recipe of defaultRecipes) {
      await BrewRecipe.delete(recipe.id);
    }
    
    // Re-run seeding
    return await insertDefaultRecipes(true);
  } catch (error) {
    console.error('Error re-seeding defaults:', error);
    throw error;
  }
};