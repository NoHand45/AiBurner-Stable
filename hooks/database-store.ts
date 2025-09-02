import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import { trpcClient } from '@/lib/trpc';

// Database Context Hook
export const [DatabaseContext, useDatabaseContext] = createContextHook(() => {
  const [isInitialized, setIsInitialized] = useState<boolean>(false);
  const [foods, setFoods] = useState<any[]>([]);
  const [recipes, setRecipes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  // Initialize databases
  useEffect(() => {
    const initializeDatabases = async () => {
      try {
        console.log('Initializing databases...');
        setIsLoading(true);
        
        // Add a small delay to ensure backend is ready
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Load initial data with retry logic
        let retries = 2; // Reduced retries for faster fallback
        let foodsResult, recipesResult;
        
        while (retries > 0) {
          try {
            [foodsResult, recipesResult] = await Promise.all([
              trpcClient.database.food.getFoods.query(),
              trpcClient.database.food.getRecipes.query()
            ]);
            break;
          } catch (error) {
            console.warn(`Database initialization attempt failed, ${retries - 1} retries left:`, error);
            retries--;
            if (retries > 0) {
              await new Promise(resolve => setTimeout(resolve, 500)); // Shorter delay
            } else {
              console.warn('Backend server not available, using offline mode');
              // Set empty arrays as fallback
              foodsResult = { success: true, foods: [] };
              recipesResult = { success: true, recipes: [] };
            }
          }
        }
        
        if (foodsResult && foodsResult.success) {
          setFoods(foodsResult.foods);
        }
        
        if (recipesResult && recipesResult.success) {
          setRecipes(recipesResult.recipes);
        }
        
        setIsInitialized(true);
        setIsLoading(false);
        console.log('Databases initialized successfully (offline mode if backend unavailable)');
      } catch (error) {
        console.error('Error initializing databases:', error);
        // Fallback to offline mode
        setFoods([]);
        setRecipes([]);
        setIsInitialized(true);
        setIsLoading(false);
      }
    };
    
    initializeDatabases();
  }, []);
  
  // Search foods function
  const searchFoods = useCallback(async (query: string, limit?: number) => {
    try {
      const result = await trpcClient.database.food.searchFoods.query({ query, limit });
      return result;
    } catch (error) {
      console.error('Error searching foods:', error);
      return { success: false, foods: [], error: 'Search failed' };
    }
  }, []);
  
  // Add custom food function
  const addCustomFood = useCallback(async (foodData: {
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
      name: string;
      grams: number;
    }[];
    aliases?: string[];
  }) => {
    try {
      const result = await trpcClient.database.food.addCustomFood.mutate(foodData);
      if (result.success) {
        // Reload foods
        const updatedFoods = await trpcClient.database.food.getFoods.query();
        if (updatedFoods.success) {
          setFoods(updatedFoods.foods);
        }
      }
      return result;
    } catch (error) {
      console.error('Error adding custom food:', error);
      return { success: false, error: 'Failed to add food' };
    }
  }, []);
  
  // Get calendar entry function
  const getCalendarEntry = useCallback(async (date: string) => {
    try {
      console.log('Getting calendar entry for date:', date);
      const result = await trpcClient.database.calendar.getEntry.query({ date });
      console.log('Calendar entry result:', result);
      return result;
    } catch (error) {
      console.error('Error getting calendar entry:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      return { 
        success: false, 
        error: `Failed to get calendar entry: ${errorMessage}`,
        entry: {
          id: `cal-${date}`,
          date: date,
          meals: [],
          water: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };
    }
  }, []);
  
  // Get calendar range function
  const getCalendarRange = useCallback(async (startDate: string, endDate: string) => {
    try {
      const result = await trpcClient.database.calendar.getRange.query({ startDate, endDate });
      return result;
    } catch (error) {
      console.error('Error getting calendar range:', error);
      return { success: false, entries: [], error: 'Failed to get calendar range' };
    }
  }, []);
  
  // Add meal to calendar function
  const addMealToCalendar = useCallback(async (date: string, mealData: {
    name: string;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    time?: string;
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
    }[];
    source?: 'manual' | 'ai_chat' | 'recipe' | 'quick_add';
  }) => {
    try {
      console.log('Adding meal to calendar:', { date, mealData });
      const result = await trpcClient.database.calendar.addMeal.mutate({
        date,
        meal: mealData
      });
      console.log('Add meal result:', result);
      return result;
    } catch (error) {
      console.error('Error adding meal to calendar:', error);
      console.error('Error details:', error instanceof Error ? error.message : String(error));
      return { success: false, error: `Failed to add meal to calendar: ${error instanceof Error ? error.message : 'Unknown error'}` };
    }
  }, []);
  
  // Update water intake function
  const updateWaterIntake = useCallback(async (date: string, amount: number) => {
    try {
      const result = await trpcClient.database.calendar.updateWater.mutate({ date, amount });
      return result;
    } catch (error) {
      console.error('Error updating water intake:', error);
      return { success: false, error: 'Failed to update water intake' };
    }
  }, []);
  
  // Get calendar statistics function
  const getCalendarStats = useCallback(async (startDate: string, endDate: string) => {
    try {
      const result = await trpcClient.database.calendar.getStats.query({ startDate, endDate });
      return result;
    } catch (error) {
      console.error('Error getting calendar stats:', error);
      return { success: false, error: 'Failed to get calendar stats' };
    }
  }, []);
  
  // Refresh data function
  const refreshData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [foodsResult, recipesResult] = await Promise.all([
        trpcClient.database.food.getFoods.query(),
        trpcClient.database.food.getRecipes.query()
      ]);
      
      if (foodsResult.success) {
        setFoods(foodsResult.foods);
      }
      
      if (recipesResult.success) {
        setRecipes(recipesResult.recipes);
      }
      
      setIsLoading(false);
    } catch (error) {
      console.error('Error refreshing data:', error);
      setIsLoading(false);
    }
  }, []);
  
  return useMemo(() => ({
    isInitialized,
    isLoading,
    
    // Food Database
    foods,
    recipes,
    searchFoods,
    addCustomFood,
    
    // Calendar Database
    getCalendarEntry,
    getCalendarRange,
    addMealToCalendar,
    updateWaterIntake,
    getCalendarStats,
    
    // Utility functions
    refreshData
  }), [
    isInitialized,
    isLoading,
    foods,
    recipes,
    searchFoods,
    addCustomFood,
    getCalendarEntry,
    getCalendarRange,
    addMealToCalendar,
    updateWaterIntake,
    getCalendarStats,
    refreshData
  ]);
});