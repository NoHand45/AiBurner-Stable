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

// Calendar Database Types
export interface CalendarEntry {
  id: string;
  date: string; // YYYY-MM-DD format
  meals: MealEntry[];
  water: number; // in liters
  notes?: string;
  mood?: 'excellent' | 'good' | 'average' | 'poor';
  weight?: number; // in kg
  createdAt: string;
  updatedAt: string;
}

export interface MealEntry {
  id: string;
  name: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  time?: string; // HH:MM format
  foods: FoodInMeal[];
  totalNutrition: {
    calories: number;
    protein: number;
    carbs: number;
    fat: number;
  };
  source: 'manual' | 'ai_chat' | 'recipe' | 'quick_add';
  createdAt: string;
}

export interface FoodInMeal {
  id: string;
  foodId?: string; // Reference to food database
  recipeId?: string; // Reference to recipe database
  name: string; // Cached name for display
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
}

// Calendar Database Procedures
export const getCalendarEntryProcedure = publicProcedure
  .input(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) // YYYY-MM-DD format
    })
  )
  .query(async ({ input }) => {
    try {
      const entryJson = await AsyncStorage.getItem(`calendar_${input.date}`);
      
      if (!entryJson) {
        // Return empty entry for this date
        const emptyEntry: CalendarEntry = {
          id: `cal-${input.date}`,
          date: input.date,
          meals: [],
          water: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        return {
          success: true,
          entry: emptyEntry
        };
      }
      
      const entry: CalendarEntry = JSON.parse(entryJson);
      
      return {
        success: true,
        entry
      };
    } catch (error) {
      console.error('Error loading calendar entry:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

export const getCalendarRangeProcedure = publicProcedure
  .input(
    z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    })
  )
  .query(async ({ input }) => {
    try {
      const entries: CalendarEntry[] = [];
      const start = new Date(input.startDate);
      const end = new Date(input.endDate);
      
      // Iterate through each date in range
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        const entryJson = await AsyncStorage.getItem(`calendar_${dateStr}`);
        
        if (entryJson) {
          entries.push(JSON.parse(entryJson));
        } else {
          // Add empty entry
          entries.push({
            id: `cal-${dateStr}`,
            date: dateStr,
            meals: [],
            water: 0,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString()
          });
        }
      }
      
      return {
        success: true,
        entries
      };
    } catch (error) {
      console.error('Error loading calendar range:', error);
      return {
        success: false,
        entries: [],
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

export const addMealToCalendarProcedure = publicProcedure
  .input(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      meal: z.object({
        name: z.string(),
        mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
        time: z.string().optional(),
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
            })
          })
        ),
        source: z.enum(['manual', 'ai_chat', 'recipe', 'quick_add']).optional().default('manual')
      })
    })
  )
  .mutation(async ({ input }) => {
    try {
      // Load existing entry or create new one
      const entryJson = await AsyncStorage.getItem(`calendar_${input.date}`);
      let entry: CalendarEntry;
      
      if (entryJson) {
        entry = JSON.parse(entryJson);
      } else {
        entry = {
          id: `cal-${input.date}`,
          date: input.date,
          meals: [],
          water: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      
      // Calculate total nutrition for the meal
      const totalNutrition = input.meal.foods.reduce(
        (total, food) => ({
          calories: total.calories + food.nutrition.calories,
          protein: total.protein + food.nutrition.protein,
          carbs: total.carbs + food.nutrition.carbs,
          fat: total.fat + food.nutrition.fat
        }),
        { calories: 0, protein: 0, carbs: 0, fat: 0 }
      );
      
      // Round nutrition values
      totalNutrition.calories = Math.round(totalNutrition.calories);
      totalNutrition.protein = Math.round(totalNutrition.protein * 10) / 10;
      totalNutrition.carbs = Math.round(totalNutrition.carbs * 10) / 10;
      totalNutrition.fat = Math.round(totalNutrition.fat * 10) / 10;
      
      // Create meal entry
      const mealEntry: MealEntry = {
        id: `meal-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        name: input.meal.name,
        mealType: input.meal.mealType,
        time: input.meal.time,
        foods: input.meal.foods.map(food => ({
          id: `food-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
          ...food
        })),
        totalNutrition,
        source: input.meal.source,
        createdAt: new Date().toISOString()
      };
      
      // Add meal to entry
      entry.meals.push(mealEntry);
      entry.updatedAt = new Date().toISOString();
      
      // Save entry
      await AsyncStorage.setItem(`calendar_${input.date}`, JSON.stringify(entry));
      
      console.log(`Added meal "${input.meal.name}" to ${input.date}`);
      
      return {
        success: true,
        entry,
        meal: mealEntry
      };
    } catch (error) {
      console.error('Error adding meal to calendar:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

export const updateWaterIntakeProcedure = publicProcedure
  .input(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      amount: z.number() // in liters, can be negative to subtract
    })
  )
  .mutation(async ({ input }) => {
    try {
      // Load existing entry or create new one
      const entryJson = await AsyncStorage.getItem(`calendar_${input.date}`);
      let entry: CalendarEntry;
      
      if (entryJson) {
        entry = JSON.parse(entryJson);
      } else {
        entry = {
          id: `cal-${input.date}`,
          date: input.date,
          meals: [],
          water: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      
      // Update water intake
      entry.water = Math.max(0, entry.water + input.amount);
      entry.water = Math.round(entry.water * 4) / 4; // Round to nearest 0.25L
      entry.updatedAt = new Date().toISOString();
      
      // Save entry
      await AsyncStorage.setItem(`calendar_${input.date}`, JSON.stringify(entry));
      
      return {
        success: true,
        entry
      };
    } catch (error) {
      console.error('Error updating water intake:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

export const deleteMealFromCalendarProcedure = publicProcedure
  .input(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      mealId: z.string()
    })
  )
  .mutation(async ({ input }) => {
    try {
      const entryJson = await AsyncStorage.getItem(`calendar_${input.date}`);
      
      if (!entryJson) {
        return {
          success: false,
          error: 'Kalendereintrag nicht gefunden'
        };
      }
      
      const entry: CalendarEntry = JSON.parse(entryJson);
      
      // Find and remove meal
      const mealIndex = entry.meals.findIndex(meal => meal.id === input.mealId);
      
      if (mealIndex === -1) {
        return {
          success: false,
          error: 'Mahlzeit nicht gefunden'
        };
      }
      
      const deletedMeal = entry.meals[mealIndex];
      entry.meals.splice(mealIndex, 1);
      entry.updatedAt = new Date().toISOString();
      
      // Save entry
      await AsyncStorage.setItem(`calendar_${input.date}`, JSON.stringify(entry));
      
      console.log(`Deleted meal "${deletedMeal.name}" from ${input.date}`);
      
      return {
        success: true,
        entry,
        deletedMeal
      };
    } catch (error) {
      console.error('Error deleting meal from calendar:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

export const updateCalendarNoteProcedure = publicProcedure
  .input(
    z.object({
      date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      notes: z.string().optional(),
      mood: z.enum(['excellent', 'good', 'average', 'poor']).optional(),
      weight: z.number().optional()
    })
  )
  .mutation(async ({ input }) => {
    try {
      // Load existing entry or create new one
      const entryJson = await AsyncStorage.getItem(`calendar_${input.date}`);
      let entry: CalendarEntry;
      
      if (entryJson) {
        entry = JSON.parse(entryJson);
      } else {
        entry = {
          id: `cal-${input.date}`,
          date: input.date,
          meals: [],
          water: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      }
      
      // Update fields
      if (input.notes !== undefined) entry.notes = input.notes;
      if (input.mood !== undefined) entry.mood = input.mood;
      if (input.weight !== undefined) entry.weight = input.weight;
      entry.updatedAt = new Date().toISOString();
      
      // Save entry
      await AsyncStorage.setItem(`calendar_${input.date}`, JSON.stringify(entry));
      
      return {
        success: true,
        entry
      };
    } catch (error) {
      console.error('Error updating calendar note:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });

// Analytics procedures
export const getCalendarStatsProcedure = publicProcedure
  .input(
    z.object({
      startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
      endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/)
    })
  )
  .query(async ({ input }) => {
    try {
      const entries: CalendarEntry[] = [];
      const start = new Date(input.startDate);
      const end = new Date(input.endDate);
      
      // Load all entries in range
      for (let date = new Date(start); date <= end; date.setDate(date.getDate() + 1)) {
        const dateStr = date.toISOString().split('T')[0];
        const entryJson = await AsyncStorage.getItem(`calendar_${dateStr}`);
        
        if (entryJson) {
          entries.push(JSON.parse(entryJson));
        }
      }
      
      // Calculate statistics
      const stats = {
        totalDays: entries.length,
        daysWithMeals: entries.filter(e => e.meals.length > 0).length,
        totalMeals: entries.reduce((sum, e) => sum + e.meals.length, 0),
        averageCaloriesPerDay: 0,
        averageProteinPerDay: 0,
        averageCarbsPerDay: 0,
        averageFatPerDay: 0,
        averageWaterPerDay: 0,
        mealTypeDistribution: {
          breakfast: 0,
          lunch: 0,
          dinner: 0,
          snack: 0
        },
        topFoods: [] as { name: string; count: number }[],
        weightProgress: entries
          .filter(e => e.weight !== undefined)
          .map(e => ({ date: e.date, weight: e.weight! }))
          .sort((a, b) => a.date.localeCompare(b.date))
      };
      
      if (entries.length > 0) {
        // Calculate nutrition averages
        const totalNutrition = entries.reduce(
          (total, entry) => {
            const dayNutrition = entry.meals.reduce(
              (dayTotal, meal) => ({
                calories: dayTotal.calories + meal.totalNutrition.calories,
                protein: dayTotal.protein + meal.totalNutrition.protein,
                carbs: dayTotal.carbs + meal.totalNutrition.carbs,
                fat: dayTotal.fat + meal.totalNutrition.fat
              }),
              { calories: 0, protein: 0, carbs: 0, fat: 0 }
            );
            
            return {
              calories: total.calories + dayNutrition.calories,
              protein: total.protein + dayNutrition.protein,
              carbs: total.carbs + dayNutrition.carbs,
              fat: total.fat + dayNutrition.fat,
              water: total.water + entry.water
            };
          },
          { calories: 0, protein: 0, carbs: 0, fat: 0, water: 0 }
        );
        
        stats.averageCaloriesPerDay = Math.round(totalNutrition.calories / entries.length);
        stats.averageProteinPerDay = Math.round((totalNutrition.protein / entries.length) * 10) / 10;
        stats.averageCarbsPerDay = Math.round((totalNutrition.carbs / entries.length) * 10) / 10;
        stats.averageFatPerDay = Math.round((totalNutrition.fat / entries.length) * 10) / 10;
        stats.averageWaterPerDay = Math.round((totalNutrition.water / entries.length) * 10) / 10;
        
        // Calculate meal type distribution
        entries.forEach(entry => {
          entry.meals.forEach(meal => {
            stats.mealTypeDistribution[meal.mealType]++;
          });
        });
        
        // Calculate top foods
        const foodCounts: Record<string, number> = {};
        entries.forEach(entry => {
          entry.meals.forEach(meal => {
            meal.foods.forEach(food => {
              foodCounts[food.name] = (foodCounts[food.name] || 0) + 1;
            });
          });
        });
        
        stats.topFoods = Object.entries(foodCounts)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([name, count]) => ({ name, count }));
      }
      
      return {
        success: true,
        stats
      };
    } catch (error) {
      console.error('Error calculating calendar stats:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error'
      };
    }
  });