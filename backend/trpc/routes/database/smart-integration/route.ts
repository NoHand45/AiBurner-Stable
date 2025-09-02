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

// OpenFoodFacts API Integration
interface OpenFoodFactsProduct {
  code: string;
  product: {
    product_name?: string;
    product_name_de?: string;
    brands?: string;
    categories?: string;
    nutriments?: {
      'energy-kcal_100g'?: number;
      'proteins_100g'?: number;
      'carbohydrates_100g'?: number;
      'fat_100g'?: number;
      'fiber_100g'?: number;
      'sugars_100g'?: number;
      'salt_100g'?: number;
    };
    serving_size?: string;
    quantity?: string;
  };
}

// OpenFoodFacts search function
const searchOpenFoodFacts = async (query: string, limit: number = 5): Promise<OpenFoodFactsProduct[]> => {
  try {
    console.log(`Searching OpenFoodFacts for: "${query}"`);
    
    // Clean and prepare search query
    const cleanQuery = query.toLowerCase()
      .replace(/[^a-zA-Z\u00e4\u00f6\u00fc\u00df\u00c4\u00d6\u00dc0-9\s]/g, '') // Remove special characters
      .trim();
    
    if (!cleanQuery) {
      console.log('Empty query after cleaning, skipping OpenFoodFacts search');
      return [];
    }
    
    // Search OpenFoodFacts API
    const searchUrl = `https://world.openfoodfacts.org/cgi/search.pl?search_terms=${encodeURIComponent(cleanQuery)}&search_simple=1&action=process&json=1&page_size=${limit}&fields=code,product_name,product_name_de,brands,categories,nutriments,serving_size,quantity`;
    
    console.log('OpenFoodFacts search URL:', searchUrl);
    
    const response = await fetch(searchUrl, {
      method: 'GET',
      headers: {
        'User-Agent': 'NutritionApp/1.0 (contact@example.com)'
      }
    });
    
    if (!response.ok) {
      console.log(`OpenFoodFacts API error: ${response.status} ${response.statusText}`);
      return [];
    }
    
    const data = await response.json();
    
    if (!data.products || !Array.isArray(data.products)) {
      console.log('No products found in OpenFoodFacts response');
      return [];
    }
    
    // Filter products with valid nutrition data
    const validProducts = data.products.filter((item: any) => {
      const product = item.product || item;
      const nutriments = product.nutriments;
      
      // Must have at least calories
      return nutriments && 
             (nutriments['energy-kcal_100g'] > 0 || nutriments['energy-kcal_100g'] === 0) &&
             (product.product_name || product.product_name_de);
    });
    
    console.log(`Found ${validProducts.length} valid products from OpenFoodFacts`);
    
    return validProducts.slice(0, limit).map((item: any) => ({
      code: item.code || item.product?.code || '',
      product: item.product || item
    }));
    
  } catch (error) {
    console.error('Error searching OpenFoodFacts:', error);
    return [];
  }
};

// Convert OpenFoodFacts product to our food format
const convertOFFProductToFood = (offProduct: OpenFoodFactsProduct): any => {
  const product = offProduct.product;
  const nutriments = product.nutriments || {};
  
  // Get the best available name
  const name = product.product_name_de || product.product_name || 'Unbekanntes Produkt';
  
  // Extract nutrition per 100g
  const nutritionPer100g = {
    calories: Math.round(nutriments['energy-kcal_100g'] || 0),
    protein: Math.round((nutriments['proteins_100g'] || 0) * 10) / 10,
    carbs: Math.round((nutriments['carbohydrates_100g'] || 0) * 10) / 10,
    fat: Math.round((nutriments['fat_100g'] || 0) * 10) / 10
  };
  
  // Try to determine common portions
  const commonPortions = [];
  
  // Add 100g as default
  commonPortions.push({ name: '100g', grams: 100 });
  
  // Try to parse serving size
  if (product.serving_size) {
    const servingMatch = product.serving_size.match(/(\d+)\s*g/);
    if (servingMatch) {
      const grams = parseInt(servingMatch[1]);
      commonPortions.push({ name: `1 Portion (${grams}g)`, grams });
    }
  }
  
  // Try to parse quantity for total package
  if (product.quantity) {
    const quantityMatch = product.quantity.match(/(\d+)\s*g/);
    if (quantityMatch) {
      const grams = parseInt(quantityMatch[1]);
      if (grams > 100 && grams <= 1000) {
        commonPortions.push({ name: `Gesamte Packung (${grams}g)`, grams });
      }
    }
  }
  
  return {
    id: `off-${offProduct.code}`,
    name,
    category: 'openfoodfacts',
    nutritionPer100g,
    commonPortions,
    aliases: [name.toLowerCase()],
    source: 'openfoodfacts',
    brands: product.brands,
    categories: product.categories
  };
};

// Smart Integration Types
export interface AIFoodAction {
  type: 'add_meal';
  foods: {
    name: string;
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  }[];
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  targetDate: string;
}

export interface ProcessedFoodAction {
  type: 'add_meal';
  foods: {
    foodId?: string;
    recipeId?: string;
    name: string;
    portion: {
      name: string;
      grams: number;
    };
    nutrition: {
      calories: number;
      protein: number;
      carbs: number;
      fat: number;
    };
    confidence: number;
    source: 'database_match' | 'ai_estimation' | 'recipe_match';
  }[];
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  targetDate: string;
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
}

// Smart food processing procedure
export const processAIFoodActionProcedure = publicProcedure
  .input(
    z.object({
      action: z.object({
        type: z.literal('add_meal'),
        foods: z.array(
          z.object({
            name: z.string(),
            calories: z.number(),
            protein: z.number(),
            carbs: z.number(),
            fat: z.number()
          })
        ),
        mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
        targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
      })
    })
  )
  .mutation(async ({ input }) => {
    try {
      console.log('Processing AI food action:', input.action);
      
      // Load food database for matching
      const customFoodsJson = await AsyncStorage.getItem('custom_foods');
      const customFoods = customFoodsJson ? JSON.parse(customFoodsJson) : [];
      
      // Load system foods (we'll need to import these)
      const SYSTEM_FOODS = [
        {
          id: 'apple-001',
          name: 'Apfel',
          category: 'fruit',
          nutritionPer100g: { calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
          commonPortions: [{ name: '1 mittelgroßer Apfel', grams: 180 }],
          aliases: ['apple', 'äpfel']
        },
        {
          id: 'banana-001',
          name: 'Banane',
          category: 'fruit',
          nutritionPer100g: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
          commonPortions: [{ name: '1 mittelgroße Banane', grams: 120 }],
          aliases: ['banana', 'bananen']
        },
        {
          id: 'bread-white-001',
          name: 'Weißbrot',
          category: 'grain',
          nutritionPer100g: { calories: 265, protein: 9, carbs: 49, fat: 3.2 },
          commonPortions: [{ name: '1 Scheibe', grams: 25 }],
          aliases: ['brot', 'weissbrot', 'brötchen']
        },
        {
          id: 'chicken-breast-001',
          name: 'Hähnchenbrust',
          category: 'meat',
          nutritionPer100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
          commonPortions: [{ name: '1 mittelgroße Hähnchenbrust', grams: 180 }],
          aliases: ['chicken', 'hähnchen', 'huhn']
        },
        {
          id: 'rice-cooked-001',
          name: 'Reis (gekocht)',
          category: 'grain',
          nutritionPer100g: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
          commonPortions: [{ name: '1 Portion', grams: 150 }],
          aliases: ['rice', 'basmati']
        },
        {
          id: 'pasta-cooked-001',
          name: 'Nudeln (gekocht)',
          category: 'grain',
          nutritionPer100g: { calories: 131, protein: 5, carbs: 25, fat: 1.1 },
          commonPortions: [{ name: '1 Portion', grams: 150 }],
          aliases: ['pasta', 'spaghetti', 'nudeln']
        },
        {
          id: 'egg-001',
          name: 'Ei',
          category: 'other',
          nutritionPer100g: { calories: 155, protein: 13, carbs: 1.1, fat: 11 },
          commonPortions: [{ name: '1 mittelgroßes Ei', grams: 55 }],
          aliases: ['egg', 'eier']
        }
      ];
      
      const allFoods = [...SYSTEM_FOODS, ...customFoods];
      
      // Process each food item
      const processedFoods = [];
      
      for (const aiFood of input.action.foods) {
        console.log('Processing food:', aiFood.name);
        
        // Try to match with local database first
        let bestMatch = null;
        let bestScore = 0;
        
        const query = aiFood.name.toLowerCase();
        
        for (const dbFood of allFoods) {
          let score = 0;
          
          // Exact name match
          if (dbFood.name.toLowerCase() === query) {
            score = 100;
          }
          // Name contains query or query contains name
          else if (dbFood.name.toLowerCase().includes(query) || query.includes(dbFood.name.toLowerCase())) {
            score = 80;
          }
          // Alias match
          else if (dbFood.aliases && dbFood.aliases.some((alias: string) => 
            alias.toLowerCase() === query || 
            alias.toLowerCase().includes(query) || 
            query.includes(alias.toLowerCase())
          )) {
            score = 90;
          }
          
          if (score > bestScore) {
            bestScore = score;
            bestMatch = dbFood;
          }
        }
        
        // If no good local match, try OpenFoodFacts
        if (!bestMatch || bestScore < 70) {
          console.log(`No good local match for "${aiFood.name}" (score: ${bestScore}), trying OpenFoodFacts...`);
          
          try {
            const offProducts = await searchOpenFoodFacts(aiFood.name, 3);
            
            for (const offProduct of offProducts) {
              const offFood = convertOFFProductToFood(offProduct);
              
              // Score OpenFoodFacts results
              let offScore = 0;
              const offName = offFood.name.toLowerCase();
              
              // Exact name match
              if (offName === query) {
                offScore = 95; // Slightly lower than local exact matches
              }
              // Name contains query or query contains name
              else if (offName.includes(query) || query.includes(offName)) {
                offScore = 75;
              }
              // Partial match
              else if (query.split(' ').some((word: string) => word.length > 2 && offName.includes(word))) {
                offScore = 60;
              }
              
              if (offScore > bestScore) {
                bestScore = offScore;
                bestMatch = offFood;
                console.log(`Found better OpenFoodFacts match: "${offFood.name}" (score: ${offScore})`);
              }
            }
          } catch (error) {
            console.error('Error searching OpenFoodFacts:', error);
          }
        }
        
        let processedFood;
        
        if (bestMatch && bestScore >= 70) {
          // Good database match found
          console.log(`Found database match for "${aiFood.name}": ${bestMatch.name} (score: ${bestScore})`);
          
          // Calculate portion size based on AI nutrition vs database nutrition
          const dbNutritionPer100g = bestMatch.nutritionPer100g;
          
          // Use calories as primary indicator for portion size
          let estimatedGrams = 100;
          if (dbNutritionPer100g.calories > 0) {
            estimatedGrams = Math.round((aiFood.calories / dbNutritionPer100g.calories) * 100);
          }
          
          // Find closest common portion or use calculated grams
          let portionName = `${estimatedGrams}g`;
          let portionGrams = estimatedGrams;
          
          if (bestMatch.commonPortions && bestMatch.commonPortions.length > 0) {
            // Find closest common portion
            let closestPortion = bestMatch.commonPortions[0];
            let smallestDiff = Math.abs(estimatedGrams - closestPortion.grams);
            
            for (const portion of bestMatch.commonPortions) {
              const diff = Math.abs(estimatedGrams - portion.grams);
              if (diff < smallestDiff) {
                smallestDiff = diff;
                closestPortion = portion;
              }
            }
            
            // Use common portion if it's reasonably close (within 30%)
            if (smallestDiff / closestPortion.grams <= 0.3) {
              portionName = closestPortion.name;
              portionGrams = closestPortion.grams;
            }
          }
          
          // Calculate actual nutrition based on portion
          const multiplier = portionGrams / 100;
          const calculatedNutrition = {
            calories: Math.round(dbNutritionPer100g.calories * multiplier),
            protein: Math.round(dbNutritionPer100g.protein * multiplier * 10) / 10,
            carbs: Math.round(dbNutritionPer100g.carbs * multiplier * 10) / 10,
            fat: Math.round(dbNutritionPer100g.fat * multiplier * 10) / 10
          };
          
          processedFood = {
            foodId: bestMatch.id,
            recipeId: undefined,
            name: bestMatch.name,
            portion: {
              name: portionName,
              grams: portionGrams
            },
            nutrition: calculatedNutrition,
            confidence: bestScore,
            source: 'database_match' as const
          };
        } else {
          // No good database match, use AI estimation
          console.log(`No database match for "${aiFood.name}", using AI estimation`);
          
          // Estimate portion size based on typical food densities
          let estimatedGrams = 100;
          
          // Simple heuristics for common foods
          const name = aiFood.name.toLowerCase();
          if (name.includes('apfel') || name.includes('apple')) {
            estimatedGrams = Math.round((aiFood.calories / 52) * 100); // Apple: ~52 kcal/100g
          } else if (name.includes('banane') || name.includes('banana')) {
            estimatedGrams = Math.round((aiFood.calories / 89) * 100); // Banana: ~89 kcal/100g
          } else if (name.includes('brot') || name.includes('bread')) {
            estimatedGrams = Math.round((aiFood.calories / 265) * 100); // Bread: ~265 kcal/100g
          } else {
            // Generic estimation: assume ~200 kcal/100g for mixed foods
            estimatedGrams = Math.round((aiFood.calories / 200) * 100);
          }
          
          // Ensure reasonable bounds
          estimatedGrams = Math.max(10, Math.min(1000, estimatedGrams));
          
          processedFood = {
            foodId: undefined,
            recipeId: undefined,
            name: aiFood.name,
            portion: {
              name: `${estimatedGrams}g (geschätzt)`,
              grams: estimatedGrams
            },
            nutrition: {
              calories: aiFood.calories,
              protein: aiFood.protein,
              carbs: aiFood.carbs,
              fat: aiFood.fat
            },
            confidence: 50, // Lower confidence for AI estimations
            source: 'ai_estimation' as const
          };
        }
        
        processedFoods.push(processedFood);
      }
      
      // Calculate total nutrition
      const totalNutrition = processedFoods.reduce(
        (total, food) => ({
          calories: total.calories + food.nutrition.calories,
          protein: total.protein + food.nutrition.protein,
          carbs: total.carbs + food.nutrition.carbs,
          fat: total.fat + food.nutrition.fat
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );
      
      // Round totals
      totalNutrition.calories = Math.round(totalNutrition.calories);
      totalNutrition.protein = Math.round(totalNutrition.protein * 10) / 10;
      totalNutrition.carbs = Math.round(totalNutrition.carbs * 10) / 10;
      totalNutrition.fat = Math.round(totalNutrition.fat * 10) / 10;
      
      const processedAction: ProcessedFoodAction = {
        type: 'add_meal',
        foods: processedFoods,
        mealType: input.action.mealType,
        targetDate: input.action.targetDate,
        totalNutrition
      };
      
      console.log('Processed action:', processedAction);
      
      return {
        success: true,
        processedAction,
        summary: {
          totalFoods: processedFoods.length,
          databaseMatches: processedFoods.filter(f => f.source === 'database_match').length,
          aiEstimations: processedFoods.filter(f => f.source === 'ai_estimation').length,
          averageConfidence: Math.round(processedFoods.reduce((sum, f) => sum + f.confidence, 0) / processedFoods.length)
        }
      };
    } catch (error) {
      console.error('Error processing AI food action:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

// Execute processed action (add to calendar)
export const executeProcessedActionProcedure = publicProcedure
  .input(
    z.object({
      processedAction: z.object({
        type: z.literal('add_meal'),
        foods: z.array(
          z.object({
            foodId: z.string().optional(),
            recipeId: z.string().optional(),
            name: z.string(),
            portion: z.object({
              name: z.string(),
              grams: z.number()
            }),
            nutrition: z.object({
              calories: z.number(),
              protein: z.number(),
              carbs: z.number(),
              fat: z.number()
            }),
            confidence: z.number(),
            source: z.enum(['database_match', 'ai_estimation', 'recipe_match'])
          })
        ),
        mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
        targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        totalNutrition: z.object({
          calories: z.number(),
          protein: z.number(),
          carbs: z.number(),
          fat: z.number()
        })
      })
    })
  )
  .mutation(async ({ input }) => {
    try {
      console.log('Executing processed action:', input.processedAction);
      
      // Generate meal name
      const foodNames = input.processedAction.foods.map(f => f.name);
      let mealName = '';
      
      if (foodNames.length === 1) {
        mealName = foodNames[0];
      } else if (foodNames.length === 2) {
        mealName = `${foodNames[0]} und ${foodNames[1]}`;
      } else if (foodNames.length <= 4) {
        mealName = `${foodNames.slice(0, -1).join(', ')} und ${foodNames[foodNames.length - 1]}`;
      } else {
        mealName = `${foodNames.slice(0, 3).join(', ')} und ${foodNames.length - 3} weitere`;
      }
      
      // Prepare meal data for calendar
      const mealData = {
        name: mealName,
        mealType: input.processedAction.mealType,
        time: new Date().toTimeString().slice(0, 5), // Current time HH:MM
        foods: input.processedAction.foods.map(food => ({
          foodId: food.foodId,
          recipeId: food.recipeId,
          name: food.name,
          portion: food.portion,
          nutrition: food.nutrition
        })),
        source: 'ai_chat' as const
      };
      
      // Add to calendar using the calendar database procedure
      // We need to simulate the procedure call since we can't directly call it
      const entryJson = await AsyncStorage.getItem(`calendar_${input.processedAction.targetDate}`);
      let entry;
      
      if (entryJson) {
        entry = JSON.parse(entryJson);
      } else {
        entry = {
          id: `cal-${input.processedAction.targetDate}`,
          date: input.processedAction.targetDate,
          meals: [],
          water: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      
      // Create meal entry
      const mealEntry = {
        id: `meal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: mealData.name,
        mealType: mealData.mealType,
        time: mealData.time,
        foods: mealData.foods.map(food => ({
          id: `food-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          ...food
        })),
        totalNutrition: input.processedAction.totalNutrition,
        source: mealData.source,
        createdAt: new Date().toISOString()
      };
      
      // Add meal to entry
      entry.meals.push(mealEntry);
      entry.updatedAt = new Date().toISOString();
      
      // Save entry
      await AsyncStorage.setItem(`calendar_${input.processedAction.targetDate}`, JSON.stringify(entry));
      
      console.log(`Successfully added meal "${mealData.name}" to ${input.processedAction.targetDate}`);
      
      return {
        success: true,
        entry,
        meal: mealEntry,
        message: `Erfolgreich hinzugefügt: ${mealData.name} (${input.processedAction.totalNutrition.calories} kcal) am ${input.processedAction.targetDate}`
      };
    } catch (error) {
      console.error('Error executing processed action:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

// Combined procedure: process and execute in one call
export const processAndExecuteAIActionProcedure = publicProcedure
  .input(
    z.object({
      action: z.object({
        type: z.literal('add_meal'),
        foods: z.array(
          z.object({
            name: z.string(),
            calories: z.number(),
            protein: z.number(),
            carbs: z.number(),
            fat: z.number()
          })
        ),
        mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
        targetDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
      })
    })
  )
  .mutation(async ({ input }) => {
    try {
      console.log('Processing and executing AI action:', input.action);
      
      // Load food database for matching
      const customFoodsJson = await AsyncStorage.getItem('custom_foods');
      const customFoods = customFoodsJson ? JSON.parse(customFoodsJson) : [];
      
      // Load system foods
      const SYSTEM_FOODS = [
        {
          id: 'apple-001',
          name: 'Apfel',
          category: 'fruit',
          nutritionPer100g: { calories: 52, protein: 0.3, carbs: 14, fat: 0.2 },
          commonPortions: [{ name: '1 mittelgroßer Apfel', grams: 180 }],
          aliases: ['apple', 'äpfel']
        },
        {
          id: 'banana-001',
          name: 'Banane',
          category: 'fruit',
          nutritionPer100g: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 },
          commonPortions: [{ name: '1 mittelgroße Banane', grams: 120 }],
          aliases: ['banana', 'bananen']
        },
        {
          id: 'bread-white-001',
          name: 'Weißbrot',
          category: 'grain',
          nutritionPer100g: { calories: 265, protein: 9, carbs: 49, fat: 3.2 },
          commonPortions: [{ name: '1 Scheibe', grams: 25 }],
          aliases: ['brot', 'weissbrot', 'brötchen']
        },
        {
          id: 'chicken-breast-001',
          name: 'Hähnchenbrust',
          category: 'meat',
          nutritionPer100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6 },
          commonPortions: [{ name: '1 mittelgroße Hähnchenbrust', grams: 180 }],
          aliases: ['chicken', 'hähnchen', 'huhn']
        },
        {
          id: 'rice-cooked-001',
          name: 'Reis (gekocht)',
          category: 'grain',
          nutritionPer100g: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 },
          commonPortions: [{ name: '1 Portion', grams: 150 }],
          aliases: ['rice', 'basmati']
        },
        {
          id: 'pasta-cooked-001',
          name: 'Nudeln (gekocht)',
          category: 'grain',
          nutritionPer100g: { calories: 131, protein: 5, carbs: 25, fat: 1.1 },
          commonPortions: [{ name: '1 Portion', grams: 150 }],
          aliases: ['pasta', 'spaghetti', 'nudeln']
        },
        {
          id: 'egg-001',
          name: 'Ei',
          category: 'other',
          nutritionPer100g: { calories: 155, protein: 13, carbs: 1.1, fat: 11 },
          commonPortions: [{ name: '1 mittelgroßes Ei', grams: 55 }],
          aliases: ['egg', 'eier']
        }
      ];
      
      const allFoods = [...SYSTEM_FOODS, ...customFoods];
      
      // Process each food item
      const processedFoods = [];
      
      for (const aiFood of input.action.foods) {
        console.log('Processing food:', aiFood.name);
        
        // Try to match with local database first
        let bestMatch = null;
        let bestScore = 0;
        
        const query = aiFood.name.toLowerCase();
        
        for (const dbFood of allFoods) {
          let score = 0;
          
          // Exact name match
          if (dbFood.name.toLowerCase() === query) {
            score = 100;
          }
          // Name contains query or query contains name
          else if (dbFood.name.toLowerCase().includes(query) || query.includes(dbFood.name.toLowerCase())) {
            score = 80;
          }
          // Alias match
          else if (dbFood.aliases && dbFood.aliases.some((alias: string) => 
            alias.toLowerCase() === query || 
            alias.toLowerCase().includes(query) || 
            query.includes(alias.toLowerCase())
          )) {
            score = 90;
          }
          
          if (score > bestScore) {
            bestScore = score;
            bestMatch = dbFood;
          }
        }
        
        // If no good local match, try OpenFoodFacts
        if (!bestMatch || bestScore < 70) {
          console.log(`No good local match for "${aiFood.name}" (score: ${bestScore}), trying OpenFoodFacts...`);
          
          try {
            const offProducts = await searchOpenFoodFacts(aiFood.name, 3);
            
            for (const offProduct of offProducts) {
              const offFood = convertOFFProductToFood(offProduct);
              
              // Score OpenFoodFacts results
              let offScore = 0;
              const offName = offFood.name.toLowerCase();
              
              // Exact name match
              if (offName === query) {
                offScore = 95; // Slightly lower than local exact matches
              }
              // Name contains query or query contains name
              else if (offName.includes(query) || query.includes(offName)) {
                offScore = 75;
              }
              // Partial match
              else if (query.split(' ').some((word: string) => word.length > 2 && offName.includes(word))) {
                offScore = 60;
              }
              
              if (offScore > bestScore) {
                bestScore = offScore;
                bestMatch = offFood;
                console.log(`Found better OpenFoodFacts match: "${offFood.name}" (score: ${offScore})`);
              }
            }
          } catch (error) {
            console.error('Error searching OpenFoodFacts:', error);
          }
        }
        
        let processedFood;
        
        if (bestMatch && bestScore >= 70) {
          // Good database match found
          console.log(`Found database match for "${aiFood.name}": ${bestMatch.name} (score: ${bestScore})`);
          
          // Calculate portion size based on AI nutrition vs database nutrition
          const dbNutritionPer100g = bestMatch.nutritionPer100g;
          
          // Use calories as primary indicator for portion size
          let estimatedGrams = 100;
          if (dbNutritionPer100g.calories > 0) {
            estimatedGrams = Math.round((aiFood.calories / dbNutritionPer100g.calories) * 100);
          }
          
          // Find closest common portion or use calculated grams
          let portionName = `${estimatedGrams}g`;
          let portionGrams = estimatedGrams;
          
          if (bestMatch.commonPortions && bestMatch.commonPortions.length > 0) {
            // Find closest common portion
            let closestPortion = bestMatch.commonPortions[0];
            let smallestDiff = Math.abs(estimatedGrams - closestPortion.grams);
            
            for (const portion of bestMatch.commonPortions) {
              const diff = Math.abs(estimatedGrams - portion.grams);
              if (diff < smallestDiff) {
                smallestDiff = diff;
                closestPortion = portion;
              }
            }
            
            // Use common portion if it's reasonably close (within 30%)
            if (smallestDiff / closestPortion.grams <= 0.3) {
              portionName = closestPortion.name;
              portionGrams = closestPortion.grams;
            }
          }
          
          // Calculate actual nutrition based on portion
          const multiplier = portionGrams / 100;
          const calculatedNutrition = {
            calories: Math.round(dbNutritionPer100g.calories * multiplier),
            protein: Math.round(dbNutritionPer100g.protein * multiplier * 10) / 10,
            carbs: Math.round(dbNutritionPer100g.carbs * multiplier * 10) / 10,
            fat: Math.round(dbNutritionPer100g.fat * multiplier * 10) / 10
          };
          
          processedFood = {
            foodId: bestMatch.id,
            recipeId: undefined,
            name: bestMatch.name,
            portion: {
              name: portionName,
              grams: portionGrams
            },
            nutrition: calculatedNutrition,
            confidence: bestScore,
            source: 'database_match' as const
          };
        } else {
          // No good database match, use AI estimation
          console.log(`No database match for "${aiFood.name}", using AI estimation`);
          
          // Estimate portion size based on typical food densities
          let estimatedGrams = 100;
          
          // Simple heuristics for common foods
          const name = aiFood.name.toLowerCase();
          if (name.includes('apfel') || name.includes('apple')) {
            estimatedGrams = Math.round((aiFood.calories / 52) * 100); // Apple: ~52 kcal/100g
          } else if (name.includes('banane') || name.includes('banana')) {
            estimatedGrams = Math.round((aiFood.calories / 89) * 100); // Banana: ~89 kcal/100g
          } else if (name.includes('brot') || name.includes('bread')) {
            estimatedGrams = Math.round((aiFood.calories / 265) * 100); // Bread: ~265 kcal/100g
          } else {
            // Generic estimation: assume ~200 kcal/100g for mixed foods
            estimatedGrams = Math.round((aiFood.calories / 200) * 100);
          }
          
          // Ensure reasonable bounds
          estimatedGrams = Math.max(10, Math.min(1000, estimatedGrams));
          
          processedFood = {
            foodId: undefined,
            recipeId: undefined,
            name: aiFood.name,
            portion: {
              name: `${estimatedGrams}g (geschätzt)`,
              grams: estimatedGrams
            },
            nutrition: {
              calories: aiFood.calories,
              protein: aiFood.protein,
              carbs: aiFood.carbs,
              fat: aiFood.fat
            },
            confidence: 50, // Lower confidence for AI estimations
            source: 'ai_estimation' as const
          };
        }
        
        processedFoods.push(processedFood);
      }
      
      // Calculate total nutrition
      const totalNutrition = processedFoods.reduce(
        (total, food) => ({
          calories: total.calories + food.nutrition.calories,
          protein: total.protein + food.nutrition.protein,
          carbs: total.carbs + food.nutrition.carbs,
          fat: total.fat + food.nutrition.fat
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );
      
      // Round totals
      totalNutrition.calories = Math.round(totalNutrition.calories);
      totalNutrition.protein = Math.round(totalNutrition.protein * 10) / 10;
      totalNutrition.carbs = Math.round(totalNutrition.carbs * 10) / 10;
      totalNutrition.fat = Math.round(totalNutrition.fat * 10) / 10;
      
      // Generate meal name
      const foodNames = processedFoods.map(f => f.name);
      let mealName = '';
      
      if (foodNames.length === 1) {
        mealName = foodNames[0];
      } else if (foodNames.length === 2) {
        mealName = `${foodNames[0]} und ${foodNames[1]}`;
      } else if (foodNames.length <= 4) {
        mealName = `${foodNames.slice(0, -1).join(', ')} und ${foodNames[foodNames.length - 1]}`;
      } else {
        mealName = `${foodNames.slice(0, 3).join(', ')} und ${foodNames.length - 3} weitere`;
      }
      
      // Add to calendar
      const entryJson = await AsyncStorage.getItem(`calendar_${input.action.targetDate}`);
      let entry;
      
      if (entryJson) {
        entry = JSON.parse(entryJson);
      } else {
        entry = {
          id: `cal-${input.action.targetDate}`,
          date: input.action.targetDate,
          meals: [],
          water: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      
      // Create meal entry
      const mealEntry = {
        id: `meal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: mealName,
        mealType: input.action.mealType,
        time: new Date().toTimeString().slice(0, 5), // Current time HH:MM
        foods: processedFoods.map(food => ({
          id: `food-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          foodId: food.foodId || undefined,
          recipeId: food.source === 'database_match' ? (food as any).recipeId : undefined,
          name: food.name,
          portion: food.portion,
          nutrition: food.nutrition
        })),
        totalNutrition,
        source: 'ai_chat' as const,
        createdAt: new Date().toISOString()
      };
      
      // Add meal to entry
      entry.meals.push(mealEntry);
      entry.updatedAt = new Date().toISOString();
      
      // Save entry
      await AsyncStorage.setItem(`calendar_${input.action.targetDate}`, JSON.stringify(entry));
      
      console.log(`Successfully added meal "${mealName}" to ${input.action.targetDate}`);
      
      return {
        success: true,
        processingSummary: {
          totalFoods: processedFoods.length,
          databaseMatches: processedFoods.filter(f => f.source === 'database_match').length,
          aiEstimations: processedFoods.filter(f => f.source === 'ai_estimation').length,
          averageConfidence: Math.round(processedFoods.reduce((sum, f) => sum + f.confidence, 0) / processedFoods.length)
        },
        entry,
        meal: mealEntry,
        message: `Erfolgreich hinzugefügt: ${mealName} (${totalNutrition.calories} kcal) am ${input.action.targetDate}`
      };
    } catch (error) {
      console.error('Error in combined process and execute:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });