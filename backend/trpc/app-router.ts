import { createTRPCRouter } from "./create-context";
import hiRoute from "./routes/example/hi/route";
import { geminiChatProcedure } from "./routes/gemini/chat/route";

// Food Database
import { 
  getFoodsProcedure, 
  searchFoodsProcedure, 
  addCustomFoodProcedure,
  getRecipesProcedure,
  addCustomRecipeProcedure,
  recognizeFoodProcedure,
  searchOpenFoodFactsProcedure,
  enhancedSearchFoodsProcedure
} from './routes/database/food-database/route';

// Calendar Database
import {
  getCalendarEntryProcedure,
  getCalendarRangeProcedure,
  addMealToCalendarProcedure,
  updateWaterIntakeProcedure,
  deleteMealFromCalendarProcedure,
  updateCalendarNoteProcedure,
  getCalendarStatsProcedure
} from './routes/database/calendar-database/route';

// Smart Integration
import {
  processAIFoodActionProcedure,
  executeProcessedActionProcedure,
  processAndExecuteAIActionProcedure
} from './routes/database/smart-integration/route';

export const appRouter = createTRPCRouter({
  example: createTRPCRouter({
    hi: hiRoute,
  }),
  gemini: createTRPCRouter({
    chat: geminiChatProcedure,
  }),
  database: createTRPCRouter({
    food: createTRPCRouter({
      getFoods: getFoodsProcedure,
      searchFoods: searchFoodsProcedure,
      addCustomFood: addCustomFoodProcedure,
      getRecipes: getRecipesProcedure,
      addCustomRecipe: addCustomRecipeProcedure,
      recognizeFood: recognizeFoodProcedure,
      searchOpenFoodFacts: searchOpenFoodFactsProcedure,
      enhancedSearch: enhancedSearchFoodsProcedure,
    }),
    calendar: createTRPCRouter({
      getEntry: getCalendarEntryProcedure,
      getRange: getCalendarRangeProcedure,
      addMeal: addMealToCalendarProcedure,
      updateWater: updateWaterIntakeProcedure,
      deleteMeal: deleteMealFromCalendarProcedure,
      updateNote: updateCalendarNoteProcedure,
      getStats: getCalendarStatsProcedure,
    }),
    integration: createTRPCRouter({
      processAIAction: processAIFoodActionProcedure,
      executeProcessedAction: executeProcessedActionProcedure,
      processAndExecute: processAndExecuteAIActionProcedure,
    }),
  }),
});

export type AppRouter = typeof appRouter;