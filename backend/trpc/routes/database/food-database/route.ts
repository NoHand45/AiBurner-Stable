import { z } from 'zod';
import { publicProcedure } from '../../../create-context';
// Simple in-memory storage for backend
const storage = new Map<string, string>();

const AsyncStorage = {
  async getItem(key: string): Promise<string | null> {
    return storage.get(key) || null;
  },
  
  async setItem(key: string, value: string): Promise<void> {
    storage.set(key, value);
  },
  
  async removeItem(key: string): Promise<void> {
    storage.delete(key);
  }
};

// Food Database Types
export interface FoodItem {
  id: string;
  name: string;
  category: 'fruit' | 'vegetable' | 'meat' | 'dairy' | 'grain' | 'snack' | 'beverage' | 'other';
  nutritionPer100g: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
    fiber?: number;
    sugar?: number;
    sodium?: number;
  };
  commonPortions: {
    name: string; // e.g., "1 mittelgroßer Apfel", "1 Scheibe", "1 Portion"
    grams: number;
  }[];
  aliases: string[]; // Alternative names
  createdAt: string;
  updatedAt: string;
  isCustom: boolean; // User-created vs. system foods
}

export interface Recipe {
  id: string;
  name: string;
  description?: string;
  ingredients: {
    foodId: string;
    amount: number; // in grams
    name: string; // cached name for display
  }[];
  instructions?: string[];
  servings: number;
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  category: 'breakfast' | 'lunch' | 'dinner' | 'snack' | 'dessert' | 'drink' | 'other';
  prepTime?: number; // minutes
  cookTime?: number; // minutes
  createdAt: string;
  updatedAt: string;
  isCustom: boolean;
}

// Pre-populated food database
const SYSTEM_FOODS: FoodItem[] = [
  {
    id: 'apple-001',
    name: 'Apfel',
    category: 'fruit',
    nutritionPer100g: {
      calories: 52,
      protein: 0.3,
      carbs: 14,
      fat: 0.2,
      fiber: 2.4,
      sugar: 10.4
    },
    commonPortions: [
      { name: '1 kleiner Apfel', grams: 120 },
      { name: '1 mittelgroßer Apfel', grams: 180 },
      { name: '1 großer Apfel', grams: 240 }
    ],
    aliases: ['apple', 'äpfel'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isCustom: false
  },
  {
    id: 'banana-001',
    name: 'Banane',
    category: 'fruit',
    nutritionPer100g: {
      calories: 89,
      protein: 1.1,
      carbs: 23,
      fat: 0.3,
      fiber: 2.6,
      sugar: 12.2
    },
    commonPortions: [
      { name: '1 kleine Banane', grams: 90 },
      { name: '1 mittelgroße Banane', grams: 120 },
      { name: '1 große Banane', grams: 150 }
    ],
    aliases: ['banana', 'bananen'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isCustom: false
  },
  {
    id: 'bread-white-001',
    name: 'Weißbrot',
    category: 'grain',
    nutritionPer100g: {
      calories: 265,
      protein: 9,
      carbs: 49,
      fat: 3.2,
      fiber: 2.7
    },
    commonPortions: [
      { name: '1 Scheibe', grams: 25 },
      { name: '1 dicke Scheibe', grams: 35 },
      { name: '1 Brötchen', grams: 60 }
    ],
    aliases: ['brot', 'weissbrot', 'white bread', 'brötchen'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isCustom: false
  },
  {
    id: 'chicken-breast-001',
    name: 'Hähnchenbrust',
    category: 'meat',
    nutritionPer100g: {
      calories: 165,
      protein: 31,
      carbs: 0,
      fat: 3.6
    },
    commonPortions: [
      { name: '1 kleine Hähnchenbrust', grams: 120 },
      { name: '1 mittelgroße Hähnchenbrust', grams: 180 },
      { name: '1 große Hähnchenbrust', grams: 250 }
    ],
    aliases: ['chicken', 'hähnchen', 'huhn', 'hühnerbrust'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isCustom: false
  },
  {
    id: 'rice-cooked-001',
    name: 'Reis (gekocht)',
    category: 'grain',
    nutritionPer100g: {
      calories: 130,
      protein: 2.7,
      carbs: 28,
      fat: 0.3,
      fiber: 0.4
    },
    commonPortions: [
      { name: '1 kleine Portion', grams: 100 },
      { name: '1 Portion', grams: 150 },
      { name: '1 große Portion', grams: 200 }
    ],
    aliases: ['rice', 'basmati', 'jasmin reis'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isCustom: false
  },
  {
    id: 'pasta-cooked-001',
    name: 'Nudeln (gekocht)',
    category: 'grain',
    nutritionPer100g: {
      calories: 131,
      protein: 5,
      carbs: 25,
      fat: 1.1,
      fiber: 1.8
    },
    commonPortions: [
      { name: '1 kleine Portion', grams: 100 },
      { name: '1 Portion', grams: 150 },
      { name: '1 große Portion', grams: 200 }
    ],
    aliases: ['pasta', 'spaghetti', 'penne', 'fusilli'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isCustom: false
  },
  {
    id: 'egg-001',
    name: 'Ei',
    category: 'other',
    nutritionPer100g: {
      calories: 155,
      protein: 13,
      carbs: 1.1,
      fat: 11,
      sodium: 124
    },
    commonPortions: [
      { name: '1 kleines Ei', grams: 45 },
      { name: '1 mittelgroßes Ei', grams: 55 },
      { name: '1 großes Ei', grams: 65 }
    ],
    aliases: ['egg', 'eier'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isCustom: false
  },
  {
    id: 'milk-001',
    name: 'Milch (3,5% Fett)',
    category: 'dairy',
    nutritionPer100g: {
      calories: 64,
      protein: 3.4,
      carbs: 4.8,
      fat: 3.6,
      sugar: 4.8
    },
    commonPortions: [
      { name: '1 Glas (200ml)', grams: 200 },
      { name: '1 Tasse (250ml)', grams: 250 },
      { name: '1 Liter', grams: 1000 }
    ],
    aliases: ['milk', 'vollmilch'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isCustom: false
  },
  {
    id: 'cheese-gouda-001',
    name: 'Gouda Käse',
    category: 'dairy',
    nutritionPer100g: {
      calories: 356,
      protein: 25,
      carbs: 2.2,
      fat: 27,
      sodium: 819
    },
    commonPortions: [
      { name: '1 dünne Scheibe', grams: 15 },
      { name: '1 Scheibe', grams: 25 },
      { name: '1 dicke Scheibe', grams: 35 }
    ],
    aliases: ['käse', 'cheese', 'gouda'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isCustom: false
  },
  {
    id: 'potato-001',
    name: 'Kartoffel (gekocht)',
    category: 'vegetable',
    nutritionPer100g: {
      calories: 77,
      protein: 2,
      carbs: 17,
      fat: 0.1,
      fiber: 2.2
    },
    commonPortions: [
      { name: '1 kleine Kartoffel', grams: 80 },
      { name: '1 mittelgroße Kartoffel', grams: 120 },
      { name: '1 große Kartoffel', grams: 180 }
    ],
    aliases: ['potato', 'kartoffeln', 'erdapfel'],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isCustom: false
  }
];

// System recipes
const SYSTEM_RECIPES: Recipe[] = [
  {
    id: 'scrambled-eggs-001',
    name: 'Rührei (2 Eier)',
    description: 'Klassisches Rührei mit Butter',
    ingredients: [
      { foodId: 'egg-001', amount: 110, name: 'Ei' }, // 2 eggs
    ],
    instructions: ['Eier aufschlagen', 'In der Pfanne verrühren', 'Bei mittlerer Hitze braten'],
    servings: 1,
    totalNutrition: {
      calories: 170,
      protein: 14.3,
      carbs: 1.2,
      fat: 12.1
    },
    category: 'breakfast',
    prepTime: 2,
    cookTime: 5,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    isCustom: false
  }
];

// Food Database Procedures
export const getFoodsProcedure = publicProcedure
  .query(async () => {
    try {
      // Load custom foods from storage
      const customFoodsJson = await AsyncStorage.getItem('custom_foods');
      const customFoods: FoodItem[] = customFoodsJson ? JSON.parse(customFoodsJson) : [];
      
      // Combine system and custom foods
      const allFoods = [...SYSTEM_FOODS, ...customFoods];
      
      return {
        success: true,
        foods: allFoods
      };
    } catch (error) {
      console.error('Error loading foods:', error);
      return {
        success: false,
        foods: SYSTEM_FOODS, // Fallback to system foods
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

export const searchFoodsProcedure = publicProcedure
  .input(
    z.object({
      query: z.string().min(1),
      limit: z.number().optional().default(10)
    })
  )
  .query(async ({ input }) => {
    try {
      // Load all foods
      const customFoodsJson = await AsyncStorage.getItem('custom_foods');
      const customFoods: FoodItem[] = customFoodsJson ? JSON.parse(customFoodsJson) : [];
      const allFoods = [...SYSTEM_FOODS, ...customFoods];
      
      const query = input.query.toLowerCase();
      
      // Search in name and aliases
      const matchingFoods = allFoods.filter(food => 
        food.name.toLowerCase().includes(query) ||
        food.aliases.some(alias => alias.toLowerCase().includes(query))
      );
      
      // Sort by relevance (exact matches first, then partial matches)
      const sortedFoods = matchingFoods.sort((a, b) => {
        const aExact = a.name.toLowerCase() === query || a.aliases.some(alias => alias.toLowerCase() === query);
        const bExact = b.name.toLowerCase() === query || b.aliases.some(alias => alias.toLowerCase() === query);
        
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        // Then by name length (shorter names first for partial matches)
        return a.name.length - b.name.length;
      });
      
      return {
        success: true,
        foods: sortedFoods.slice(0, input.limit)
      };
    } catch (error) {
      console.error('Error searching foods:', error);
      return {
        success: false,
        foods: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

export const addCustomFoodProcedure = publicProcedure
  .input(
    z.object({
      name: z.string().min(1),
      category: z.enum(['fruit', 'vegetable', 'meat', 'dairy', 'grain', 'snack', 'beverage', 'other']),
      nutritionPer100g: z.object({
        calories: z.number().min(0),
        protein: z.number().min(0),
        carbs: z.number().min(0),
        fat: z.number().min(0),
        fiber: z.number().optional(),
        sugar: z.number().optional(),
        sodium: z.number().optional()
      }),
      commonPortions: z.array(
        z.object({
          name: z.string(),
          grams: z.number().min(1)
        })
      ),
      aliases: z.array(z.string()).optional().default([])
    })
  )
  .mutation(async ({ input }) => {
    try {
      // Load existing custom foods
      const customFoodsJson = await AsyncStorage.getItem('custom_foods');
      const customFoods: FoodItem[] = customFoodsJson ? JSON.parse(customFoodsJson) : [];
      
      // Create new food item
      const newFood: FoodItem = {
        id: `custom-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: input.name,
        category: input.category,
        nutritionPer100g: input.nutritionPer100g,
        commonPortions: input.commonPortions,
        aliases: input.aliases,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isCustom: true
      };
      
      // Add to custom foods
      customFoods.push(newFood);
      
      // Save back to storage
      await AsyncStorage.setItem('custom_foods', JSON.stringify(customFoods));
      
      return {
        success: true,
        food: newFood
      };
    } catch (error) {
      console.error('Error adding custom food:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

export const getRecipesProcedure = publicProcedure
  .query(async () => {
    try {
      // Load custom recipes from storage
      const customRecipesJson = await AsyncStorage.getItem('custom_recipes');
      const customRecipes: Recipe[] = customRecipesJson ? JSON.parse(customRecipesJson) : [];
      
      // Combine system and custom recipes
      const allRecipes = [...SYSTEM_RECIPES, ...customRecipes];
      
      return {
        success: true,
        recipes: allRecipes
      };
    } catch (error) {
      console.error('Error loading recipes:', error);
      return {
        success: false,
        recipes: SYSTEM_RECIPES, // Fallback to system recipes
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

export const addCustomRecipeProcedure = publicProcedure
  .input(
    z.object({
      name: z.string().min(1),
      description: z.string().optional(),
      ingredients: z.array(
        z.object({
          foodId: z.string(),
          amount: z.number().min(0), // in grams
          name: z.string() // cached name
        })
      ),
      instructions: z.array(z.string()).optional(),
      servings: z.number().min(1),
      category: z.enum(['breakfast', 'lunch', 'dinner', 'snack', 'dessert', 'drink', 'other']),
      prepTime: z.number().optional(),
      cookTime: z.number().optional()
    })
  )
  .mutation(async ({ input }) => {
    try {
      // Load all foods to calculate nutrition
      const customFoodsJson = await AsyncStorage.getItem('custom_foods');
      const customFoods: FoodItem[] = customFoodsJson ? JSON.parse(customFoodsJson) : [];
      const allFoods = [...SYSTEM_FOODS, ...customFoods];
      
      // Calculate total nutrition
      let totalNutrition = {
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0
      };
      
      for (const ingredient of input.ingredients) {
        const food = allFoods.find(f => f.id === ingredient.foodId);
        if (food) {
          const multiplier = ingredient.amount / 100; // Convert to per 100g
          totalNutrition.calories += food.nutritionPer100g.calories * multiplier;
          totalNutrition.protein += food.nutritionPer100g.protein * multiplier;
          totalNutrition.carbs += food.nutritionPer100g.carbs * multiplier;
          totalNutrition.fat += food.nutritionPer100g.fat * multiplier;
        }
      }
      
      // Round nutrition values
      totalNutrition.calories = Math.round(totalNutrition.calories);
      totalNutrition.protein = Math.round(totalNutrition.protein * 10) / 10;
      totalNutrition.carbs = Math.round(totalNutrition.carbs * 10) / 10;
      totalNutrition.fat = Math.round(totalNutrition.fat * 10) / 10;
      
      // Load existing custom recipes
      const customRecipesJson = await AsyncStorage.getItem('custom_recipes');
      const customRecipes: Recipe[] = customRecipesJson ? JSON.parse(customRecipesJson) : [];
      
      // Create new recipe
      const newRecipe: Recipe = {
        id: `recipe-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: input.name,
        description: input.description,
        ingredients: input.ingredients,
        instructions: input.instructions,
        servings: input.servings,
        totalNutrition,
        category: input.category,
        prepTime: input.prepTime,
        cookTime: input.cookTime,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        isCustom: true
      };
      
      // Add to custom recipes
      customRecipes.push(newRecipe);
      
      // Save back to storage
      await AsyncStorage.setItem('custom_recipes', JSON.stringify(customRecipes));
      
      return {
        success: true,
        recipe: newRecipe
      };
    } catch (error) {
      console.error('Error adding custom recipe:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

// OpenFoodFacts API integration using the official package
let openFoodFacts: any = null;

// Lazy load the OpenFoodFacts package
const getOpenFoodFacts = async () => {
  if (!openFoodFacts) {
    try {
      const { default: OpenFoodFacts } = await import('@openfoodfacts/openfoodfacts-nodejs');
      openFoodFacts = OpenFoodFacts;
      console.log('OpenFoodFacts package loaded successfully');
    } catch (error) {
      console.error('Failed to load OpenFoodFacts package:', error);
      throw new Error('OpenFoodFacts package not available');
    }
  }
  return openFoodFacts;
};

// Fallback search using direct HTTP requests
const fallbackOpenFoodFactsSearch = async (query: string, limit: number) => {
  console.log('Using fallback OpenFoodFacts search...');
  
  const searchUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(query)}&search_simple=1&action=process&json=1&page_size=${limit}&fields=code,product_name,product_name_de,brands,categories,nutriments,serving_size,image_url`;
  
  console.log('Fallback request URL:', searchUrl);
  
  const response = await fetch(searchUrl, {
    headers: {
      'User-Agent': 'FitnessApp/1.0 (contact@example.com)'
    }
  });
  
  if (!response.ok) {
    throw new Error(`OpenFoodFacts API error: ${response.status} ${response.statusText}`);
  }
  
  const data = await response.json();
  
  if (!data.products || !Array.isArray(data.products)) {
    return { products: [] };
  }
  
  return { products: data.products };
};

// Search OpenFoodFacts database
export const searchOpenFoodFactsProcedure = publicProcedure
  .input(
    z.object({
      query: z.string().min(1),
      limit: z.number().optional().default(10),
      language: z.string().optional().default('de') // German by default
    })
  )
  .query(async ({ input }) => {
    try {
      console.log('=== OpenFoodFacts Search Started ===');
      console.log('Query:', input.query);
      console.log('Limit:', input.limit);
      
      let searchResult;
      
      try {
        const off = await getOpenFoodFacts();
        
        // Search using the official OpenFoodFacts package
        searchResult = await off.search({
          search_terms: input.query,
          page_size: input.limit,
          fields: 'code,product_name,product_name_de,brands,categories,nutriments,serving_size,image_url'
        });
      } catch (packageError) {
        console.warn('OpenFoodFacts package failed, trying fallback:', packageError);
        
        // Try fallback HTTP request
        try {
          searchResult = await fallbackOpenFoodFactsSearch(input.query, input.limit);
        } catch (fallbackError) {
          console.error('Fallback search also failed:', fallbackError);
          const errorMessage = fallbackError instanceof Error ? fallbackError.message : 'Unknown fallback error';
          throw new Error(`Both OpenFoodFacts package and fallback failed: ${errorMessage}`);
        }
      }
      
      console.log('OpenFoodFacts search result:', {
        count: searchResult?.products?.length || 0,
        page: searchResult?.page,
        page_size: searchResult?.page_size
      });
      
      if (!searchResult || !searchResult.products || !Array.isArray(searchResult.products)) {
        console.log('No products found in search result');
        return {
          success: true,
          foods: []
        };
      }
      
      console.log('Processing', searchResult.products.length, 'products...');
      
      // Convert OpenFoodFacts products to our FoodItem format
      const foods: FoodItem[] = searchResult.products
        .filter((product: any, index: number) => {
          const hasNutriments = product.nutriments && typeof product.nutriments === 'object';
          const hasName = product.product_name || product.product_name_de;
          
          console.log(`Product ${index + 1}:`, {
            code: product.code,
            hasNutriments,
            hasName,
            productName: product.product_name,
            productNameDe: product.product_name_de,
            nutrimentKeys: hasNutriments ? Object.keys(product.nutriments) : []
          });
          
          const isValid = hasNutriments && hasName;
          console.log(`Product ${index + 1} is valid:`, isValid);
          return isValid;
        })
        .map((product: any, index: number) => {
          console.log(`Processing valid product ${index + 1}...`);
          
          const nutriments = product.nutriments || {};
          
          // Use German name if available, otherwise fallback to English
          const name = product.product_name_de || product.product_name || 'Unbekanntes Produkt';
          
          // Determine category based on OpenFoodFacts categories
          let category: FoodItem['category'] = 'other';
          if (product.categories) {
            const cats = product.categories.toLowerCase();
            if (cats.includes('fruit') || cats.includes('obst')) category = 'fruit';
            else if (cats.includes('vegetable') || cats.includes('gemüse')) category = 'vegetable';
            else if (cats.includes('meat') || cats.includes('fleisch')) category = 'meat';
            else if (cats.includes('dairy') || cats.includes('milch')) category = 'dairy';
            else if (cats.includes('grain') || cats.includes('getreide') || cats.includes('bread') || cats.includes('brot')) category = 'grain';
            else if (cats.includes('snack') || cats.includes('sweet') || cats.includes('süß')) category = 'snack';
            else if (cats.includes('beverage') || cats.includes('getränk')) category = 'beverage';
          }
          
          // Extract nutrition per 100g - try different field names and handle energy conversion
          let calories = 0;
          if (nutriments['energy-kcal_100g']) {
            calories = parseFloat(nutriments['energy-kcal_100g']) || 0;
          } else if (nutriments['energy-kcal']) {
            calories = parseFloat(nutriments['energy-kcal']) || 0;
          } else if (nutriments['energy_100g']) {
            // Convert kJ to kcal if needed
            const energy = parseFloat(nutriments['energy_100g']) || 0;
            calories = energy > 1000 ? energy / 4.184 : energy; // Assume kJ if > 1000
          } else if (nutriments['energy']) {
            const energy = parseFloat(nutriments['energy']) || 0;
            calories = energy > 1000 ? energy / 4.184 : energy;
          }
          
          const nutritionPer100g = {
            calories: Math.round(calories),
            protein: parseFloat(nutriments['proteins_100g'] || nutriments['proteins'] || '0') || 0,
            carbs: parseFloat(nutriments['carbohydrates_100g'] || nutriments['carbohydrates'] || '0') || 0,
            fat: parseFloat(nutriments['fat_100g'] || nutriments['fat'] || '0') || 0,
            fiber: parseFloat(nutriments['fiber_100g'] || nutriments['fiber'] || '0') || undefined,
            sugar: parseFloat(nutriments['sugars_100g'] || nutriments['sugars'] || '0') || undefined,
            sodium: parseFloat(nutriments['sodium_100g'] || nutriments['sodium'] || (nutriments['salt_100g'] ? (parseFloat(nutriments['salt_100g']) * 0.4).toString() : '0')) || undefined
          };
          
          // Generate common portions based on serving size or defaults
          const commonPortions = [];
          
          // Add serving size if available
          if (product.serving_size) {
            const servingMatch = product.serving_size.match(/(\d+(?:\.\d+)?)\s*g/);
            if (servingMatch) {
              const grams = parseFloat(servingMatch[1]);
              commonPortions.push({ name: '1 Portion', grams });
            }
          }
          
          // Add standard portions
          commonPortions.push(
            { name: '100g', grams: 100 },
            { name: '1 kleine Portion', grams: 50 },
            { name: '1 große Portion', grams: 150 }
          );
          
          // Generate aliases
          const aliases = [];
          if (product.brands) {
            aliases.push(...product.brands.split(',').map((brand: string) => brand.trim().toLowerCase()));
          }
          if (product.product_name && product.product_name !== name) {
            aliases.push(product.product_name.toLowerCase());
          }
          
          const foodItem: FoodItem = {
            id: `openfoodfacts-${product.code}`,
            name,
            category,
            nutritionPer100g,
            commonPortions,
            aliases,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            isCustom: false
          };
          
          console.log(`Created food item ${index + 1}:`, {
            id: foodItem.id,
            name: foodItem.name,
            category: foodItem.category,
            calories: foodItem.nutritionPer100g.calories
          });
          
          return foodItem;
        });
      
      console.log('=== Search Results ===');
      console.log('Total valid foods found:', foods.length);
      console.log('Food names:', foods.map(f => f.name));
      console.log('=== End Search ===');
      
      return {
        success: true,
        foods
      };
    } catch (error) {
      console.error('=== OpenFoodFacts Search Error ===');
      console.error('Error details:', error);
      console.error('Error message:', error instanceof Error ? error.message : 'Unknown error');
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
      
      return {
        success: false,
        foods: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

// Enhanced search that combines local database with OpenFoodFacts
export const enhancedSearchFoodsProcedure = publicProcedure
  .input(
    z.object({
      query: z.string().min(1),
      limit: z.number().optional().default(10),
      includeOpenFoodFacts: z.boolean().optional().default(true)
    })
  )
  .query(async ({ input }) => {
    try {
      // First search local database
      const customFoodsJson = await AsyncStorage.getItem('custom_foods');
      const customFoods: FoodItem[] = customFoodsJson ? JSON.parse(customFoodsJson) : [];
      const allLocalFoods = [...SYSTEM_FOODS, ...customFoods];
      
      const query = input.query.toLowerCase();
      
      // Search in local foods
      const localMatches = allLocalFoods.filter(food => 
        food.name.toLowerCase().includes(query) ||
        food.aliases.some(alias => alias.toLowerCase().includes(query))
      );
      
      // Sort local matches by relevance
      const sortedLocalFoods = localMatches.sort((a, b) => {
        const aExact = a.name.toLowerCase() === query || a.aliases.some(alias => alias.toLowerCase() === query);
        const bExact = b.name.toLowerCase() === query || b.aliases.some(alias => alias.toLowerCase() === query);
        
        if (aExact && !bExact) return -1;
        if (!aExact && bExact) return 1;
        
        return a.name.length - b.name.length;
      });
      
      let allFoods = [...sortedLocalFoods];
      
      // If we have fewer results than requested and OpenFoodFacts is enabled, search there too
      if (input.includeOpenFoodFacts && allFoods.length < input.limit) {
        try {
          const remainingLimit = input.limit - allFoods.length;
          let searchResult;
          
          try {
            const off = await getOpenFoodFacts();
            
            searchResult = await off.search({
              search_terms: input.query,
              page_size: remainingLimit,
              fields: 'code,product_name,product_name_de,brands,categories,nutriments,serving_size,image_url'
            });
          } catch (packageError) {
            console.warn('OpenFoodFacts package failed in enhanced search, trying fallback:', packageError);
            searchResult = await fallbackOpenFoodFactsSearch(input.query, remainingLimit);
          }
          
          if (searchResult && searchResult.products && Array.isArray(searchResult.products)) {
            const openFoodFactsResults = searchResult.products
              .filter((product: any) => product.nutriments && (product.product_name || product.product_name_de))
              .map((product: any) => {
                const nutriments = product.nutriments || {};
                
                const name = product.product_name_de || product.product_name || 'Unbekanntes Produkt';
                
                let category: FoodItem['category'] = 'other';
                if (product.categories) {
                  const cats = product.categories.toLowerCase();
                  if (cats.includes('fruit') || cats.includes('obst')) category = 'fruit';
                  else if (cats.includes('vegetable') || cats.includes('gemüse')) category = 'vegetable';
                  else if (cats.includes('meat') || cats.includes('fleisch')) category = 'meat';
                  else if (cats.includes('dairy') || cats.includes('milch')) category = 'dairy';
                  else if (cats.includes('grain') || cats.includes('getreide') || cats.includes('bread') || cats.includes('brot')) category = 'grain';
                  else if (cats.includes('snack') || cats.includes('sweet') || cats.includes('süß')) category = 'snack';
                  else if (cats.includes('beverage') || cats.includes('getränk')) category = 'beverage';
                }
                
                let calories = 0;
                if (nutriments['energy-kcal_100g']) {
                  calories = parseFloat(nutriments['energy-kcal_100g']) || 0;
                } else if (nutriments['energy-kcal']) {
                  calories = parseFloat(nutriments['energy-kcal']) || 0;
                } else if (nutriments['energy_100g']) {
                  const energy = parseFloat(nutriments['energy_100g']) || 0;
                  calories = energy > 1000 ? energy / 4.184 : energy;
                } else if (nutriments['energy']) {
                  const energy = parseFloat(nutriments['energy']) || 0;
                  calories = energy > 1000 ? energy / 4.184 : energy;
                }
                
                const nutritionPer100g = {
                  calories: Math.round(calories),
                  protein: parseFloat(nutriments['proteins_100g'] || nutriments['proteins'] || '0') || 0,
                  carbs: parseFloat(nutriments['carbohydrates_100g'] || nutriments['carbohydrates'] || '0') || 0,
                  fat: parseFloat(nutriments['fat_100g'] || nutriments['fat'] || '0') || 0,
                  fiber: parseFloat(nutriments['fiber_100g'] || nutriments['fiber'] || '0') || undefined,
                  sugar: parseFloat(nutriments['sugars_100g'] || nutriments['sugars'] || '0') || undefined,
                  sodium: parseFloat(nutriments['sodium_100g'] || nutriments['sodium'] || (nutriments['salt_100g'] ? (parseFloat(nutriments['salt_100g']) * 0.4).toString() : '0')) || undefined
                };
                
                const commonPortions = [];
                
                if (product.serving_size) {
                  const servingMatch = product.serving_size.match(/(\d+(?:\.\d+)?)\s*g/);
                  if (servingMatch) {
                    const grams = parseFloat(servingMatch[1]);
                    commonPortions.push({ name: '1 Portion', grams });
                  }
                }
                
                commonPortions.push(
                  { name: '100g', grams: 100 },
                  { name: '1 kleine Portion', grams: 50 },
                  { name: '1 große Portion', grams: 150 }
                );
                
                const aliases = [];
                if (product.brands) {
                  aliases.push(...product.brands.split(',').map((brand: string) => brand.trim().toLowerCase()));
                }
                if (product.product_name && product.product_name !== name) {
                  aliases.push(product.product_name.toLowerCase());
                }
                
                const foodItem: FoodItem = {
                  id: `openfoodfacts-${product.code}`,
                  name,
                  category,
                  nutritionPer100g,
                  commonPortions,
                  aliases,
                  createdAt: new Date().toISOString(),
                  updatedAt: new Date().toISOString(),
                  isCustom: false
                };
                
                return foodItem;
              });
            
            // Filter out duplicates (foods that might already exist in local database)
            const uniqueOpenFoodFactsResults = openFoodFactsResults.filter((offFood: FoodItem) => 
              !allFoods.some(localFood => 
                localFood.name.toLowerCase() === offFood.name.toLowerCase()
              )
            );
            
            allFoods = [...allFoods, ...uniqueOpenFoodFactsResults];
          }
        } catch (offError) {
          console.warn('OpenFoodFacts search failed, using local results only:', offError);
        }
      }
      
      return {
        success: true,
        foods: allFoods.slice(0, input.limit),
        sources: {
          local: sortedLocalFoods.length,
          openFoodFacts: Math.max(0, allFoods.length - sortedLocalFoods.length)
        }
      };
    } catch (error) {
      console.error('Error in enhanced search:', error);
      return {
        success: false,
        foods: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

// Smart food recognition procedure
export const recognizeFoodProcedure = publicProcedure
  .input(
    z.object({
      foodName: z.string().min(1),
      portion: z.string().optional(),
      context: z.string().optional() // Additional context like "zum Frühstück"
    })
  )
  .query(async ({ input }) => {
    try {
      // Load all foods
      const customFoodsJson = await AsyncStorage.getItem('custom_foods');
      const customFoods: FoodItem[] = customFoodsJson ? JSON.parse(customFoodsJson) : [];
      const allFoods = [...SYSTEM_FOODS, ...customFoods];
      
      const query = input.foodName.toLowerCase();
      
      // Find best matching food
      let bestMatch: FoodItem | null = null;
      let bestScore = 0;
      
      for (const food of allFoods) {
        let score = 0;
        
        // Exact name match
        if (food.name.toLowerCase() === query) {
          score = 100;
        }
        // Name contains query
        else if (food.name.toLowerCase().includes(query)) {
          score = 80;
        }
        // Alias exact match
        else if (food.aliases.some(alias => alias.toLowerCase() === query)) {
          score = 90;
        }
        // Alias contains query
        else if (food.aliases.some(alias => alias.toLowerCase().includes(query))) {
          score = 70;
        }
        // Query contains food name (for compound foods)
        else if (query.includes(food.name.toLowerCase())) {
          score = 60;
        }
        
        if (score > bestScore) {
          bestScore = score;
          bestMatch = food;
        }
      }
      
      if (!bestMatch) {
        return {
          success: false,
          error: 'Lebensmittel nicht gefunden'
        };
      }
      
      // Determine portion size
      let portionGrams = 100; // Default
      let portionName = '100g';
      
      if (input.portion) {
        const portionLower = input.portion.toLowerCase();
        
        // Try to find matching common portion
        const matchingPortion = bestMatch.commonPortions.find(p => 
          portionLower.includes(p.name.toLowerCase()) ||
          p.name.toLowerCase().includes(portionLower)
        );
        
        if (matchingPortion) {
          portionGrams = matchingPortion.grams;
          portionName = matchingPortion.name;
        } else {
          // Try to extract number from portion string
          const numberMatch = portionLower.match(/(\d+(?:\.\d+)?)/);
          if (numberMatch) {
            const number = parseFloat(numberMatch[1]);
            
            // Check for units
            if (portionLower.includes('g') || portionLower.includes('gram')) {
              portionGrams = number;
              portionName = `${number}g`;
            } else if (portionLower.includes('stück') || portionLower.includes('stk')) {
              // Use first common portion as base
              if (bestMatch.commonPortions.length > 0) {
                portionGrams = bestMatch.commonPortions[0].grams * number;
                portionName = `${number} ${bestMatch.commonPortions[0].name}`;
              }
            }
          }
        }
      } else {
        // No portion specified, use most common portion
        if (bestMatch.commonPortions.length > 0) {
          const commonPortion = bestMatch.commonPortions[1] || bestMatch.commonPortions[0]; // Prefer medium size
          portionGrams = commonPortion.grams;
          portionName = commonPortion.name;
        }
      }
      
      // Calculate nutrition for this portion
      const multiplier = portionGrams / 100;
      const nutrition = {
        calories: Math.round(bestMatch.nutritionPer100g.calories * multiplier),
        protein: Math.round(bestMatch.nutritionPer100g.protein * multiplier * 10) / 10,
        carbs: Math.round(bestMatch.nutritionPer100g.carbs * multiplier * 10) / 10,
        fat: Math.round(bestMatch.nutritionPer100g.fat * multiplier * 10) / 10
      };
      
      return {
        success: true,
        food: bestMatch,
        portion: {
          name: portionName,
          grams: portionGrams
        },
        nutrition,
        confidence: bestScore
      };
    } catch (error) {
      console.error('Error recognizing food:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });