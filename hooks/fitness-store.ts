import createContextHook from '@nkzw/create-context-hook';
import { useState, useEffect, useCallback, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

export interface Ingredient {
  id: string;
  name: string;
  amount: number;
  unit: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface Recipe {
  id: string;
  name: string;
  ingredients: Ingredient[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
  servings: number;
  instructions?: string;
  createdAt: string;
}

export interface Meal {
  id: string;
  name: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  portion: string;
  time: string;
  mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
  recipeId?: string; // Optional reference to a recipe
}

export interface Workout {
  id: string;
  name: string;
  duration: number;
  calories: number;
  time: string;
  icon: string;
}

export interface FitnessPlan {
  id: string;
  name: string;
  description: string;
  exercises: string[];
  duration: string;
  frequency: string;
  createdAt: string;
  goals: string[];
  equipment: string[];
}

export interface UserProfile {
  name: string;
  age: number;
  weight: number;
  height: number;
  goal: string;
  bmi: number;
  gender: 'male' | 'female';
  activityLevel: 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extremely_active';
  targetWeight: number;
  basalMetabolicRate: number;
  totalDailyEnergyExpenditure: number;
  birthDate?: string;
  weightHistory?: { date: string; weight: number }[];
  fitnessPlans?: FitnessPlan[];
}

export interface DayStats {
  date: string;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  water: number;
  steps: number;
  workouts: number;
  meals: Meal[];
  rating: 'excellent' | 'good' | 'average' | 'poor' | 'empty';
}

export interface WeeklyGoal {
  dailyCalories: number;
  dailyProtein: number;
  dailyCarbs: number;
  dailyFat: number;
  dailyWater: number;
  dailySteps: number;
}

export interface WeekData {
  startDate: string;
  days: DayStats[];
}

export const [FitnessContext, useFitnessData] = createContextHook(() => {
  const today = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState<string>(today);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [currentWeekStart, setCurrentWeekStart] = useState<string>(() => {
    const todayDate = new Date();
    const monday = new Date(todayDate);
    // Get Monday of current week (Sunday = 0, Monday = 1)
    const dayOfWeek = todayDate.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days, otherwise go to Monday
    monday.setDate(todayDate.getDate() + daysToMonday);
    console.log('Initial week start calculation:', {
      today: todayDate.toISOString().split('T')[0],
      dayOfWeek,
      daysToMonday,
      monday: monday.toISOString().split('T')[0]
    });
    return monday.toISOString().split('T')[0];
  });
  const [isManualWeekNavigation, setIsManualWeekNavigation] = useState<boolean>(false);
  
  // Function to get the week start for any date
  const getWeekStartForDate = useCallback((date: string): string => {
    const targetDate = new Date(date);
    const monday = new Date(targetDate);
    // Get Monday of current week (Sunday = 0, Monday = 1)
    const dayOfWeek = targetDate.getDay();
    const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days, otherwise go to Monday
    monday.setDate(targetDate.getDate() + daysToMonday);
    return monday.toISOString().split('T')[0];
  }, []);
  
  // Function to navigate to the week containing today
  const goToCurrentWeek = useCallback(() => {
    const todayWeekStart = getWeekStartForDate(today);
    setCurrentWeekStart(todayWeekStart);
    setSelectedDate(today);
    setIsManualWeekNavigation(false);
  }, [getWeekStartForDate, today]);
  
  const [weekData, setWeekData] = useState<WeekData>({
    startDate: currentWeekStart,
    days: []
  });
  
  const [todayWorkouts, setTodayWorkouts] = useState<Workout[]>([]);
  const [fitnessPlans, setFitnessPlans] = useState<FitnessPlan[]>([]);
  const [userProfile, setUserProfile] = useState<UserProfile>({
    name: "Max Mustermann",
    age: 28,
    weight: 75,
    height: 180,
    goal: "Gewicht halten",
    bmi: 23.1,
    gender: 'male',
    activityLevel: 'moderately_active',
    targetWeight: 75,
    basalMetabolicRate: 1800,
    totalDailyEnergyExpenditure: 2200,
    birthDate: '1995-01-01',
    weightHistory: [],
    fitnessPlans: [],
  });

  const [weeklyGoal] = useState<WeeklyGoal>({
    dailyCalories: 2000,
    dailyProtein: 150,
    dailyCarbs: 250,
    dailyFat: 67,
    dailyWater: 2.5,
    dailySteps: 10000,
  });

  const getRatingFromCalories = useCallback((calories: number, hasEntries: boolean): 'excellent' | 'good' | 'average' | 'poor' | 'empty' => {
    if (!hasEntries || calories === 0) return 'empty';
    const percentage = (calories / weeklyGoal.dailyCalories) * 100;
    if (percentage <= 105) return 'excellent'; // Up to 5% over target = green
    if (percentage <= 120) return 'good'; // Up to 20% over target = yellow  
    if (percentage <= 130) return 'average'; // Up to 30% over target = orange
    return 'poor'; // Over 40% = red
  }, [weeklyGoal.dailyCalories]);

  const initializeWeek = useCallback((startDate: string): WeekData => {
    const days: DayStats[] = [];
    const start = new Date(startDate);
    
    for (let i = 0; i < 7; i++) {
      const date = new Date(start);
      date.setDate(start.getDate() + i);
      const dateStr = date.toISOString().split('T')[0];
      
      // Only days with entries should have values, others should be empty
      days.push({
        date: dateStr,
        calories: 0,
        protein: 0,
        carbs: 0,
        fat: 0,
        water: 0,
        steps: 0,
        workouts: 0,
        meals: [],
        rating: 'empty'
      });
    }
    
    return { startDate, days };
  }, []);

  const loadWeekData = useCallback(async () => {
    try {
      const weekKey = `week_${currentWeekStart}`;
      const storedWeekData = await AsyncStorage.getItem(weekKey);
      
      if (storedWeekData) {
        setWeekData(JSON.parse(storedWeekData));
      } else {
        const newWeekData = initializeWeek(currentWeekStart);
        setWeekData(newWeekData);
        await AsyncStorage.setItem(weekKey, JSON.stringify(newWeekData));
      }
    } catch (error) {
      console.log('Error loading week data:', error);
    }
  }, [currentWeekStart, initializeWeek]);

  const loadRecipes = useCallback(async () => {
    try {
      const storedRecipes = await AsyncStorage.getItem('recipes');
      if (storedRecipes) {
        setRecipes(JSON.parse(storedRecipes));
      }
    } catch (error) {
      console.log('Error loading recipes:', error);
    }
  }, []);

  useEffect(() => {
    loadWeekData();
    loadRecipes();
  }, [loadWeekData, loadRecipes]);

  const getCurrentDayStats = useCallback((): DayStats => {
    return weekData.days.find(day => day.date === selectedDate) || {
      date: selectedDate,
      calories: 0,
      protein: 0,
      carbs: 0,
      fat: 0,
      water: 0,
      steps: 0,
      workouts: 0,
      meals: [],
      rating: 'empty'
    };
  }, [weekData.days, selectedDate]);

  const updateWater = useCallback(async (amount: number) => {
    try {
      const updatedWeekData = { ...weekData };
      const dayIndex = updatedWeekData.days.findIndex(day => day.date === selectedDate);
      
      if (dayIndex !== -1) {
        const newWater = Math.max(0, updatedWeekData.days[dayIndex].water + amount);
        updatedWeekData.days[dayIndex].water = Math.round(newWater * 4) / 4;
      }
      
      setWeekData(updatedWeekData);
      const weekKey = `week_${currentWeekStart}`;
      await AsyncStorage.setItem(weekKey, JSON.stringify(updatedWeekData));
    } catch (error) {
      console.log('Error updating water:', error);
    }
  }, [weekData, selectedDate, currentWeekStart]);

  const addMeal = useCallback(async (meal: Meal) => {
    try {
      const updatedWeekData = { ...weekData };
      const dayIndex = updatedWeekData.days.findIndex(day => day.date === selectedDate);
      
      if (dayIndex !== -1) {
        updatedWeekData.days[dayIndex].meals.push(meal);
        
        const dayMeals = updatedWeekData.days[dayIndex].meals;
        updatedWeekData.days[dayIndex].calories = dayMeals.reduce((sum, m) => sum + m.calories, 0);
        updatedWeekData.days[dayIndex].protein = dayMeals.reduce((sum, m) => sum + m.protein, 0);
        updatedWeekData.days[dayIndex].carbs = dayMeals.reduce((sum, m) => sum + m.carbs, 0);
        updatedWeekData.days[dayIndex].fat = dayMeals.reduce((sum, m) => sum + m.fat, 0);
        const hasEntries = updatedWeekData.days[dayIndex].meals.length > 0;
        updatedWeekData.days[dayIndex].rating = getRatingFromCalories(updatedWeekData.days[dayIndex].calories, hasEntries);
      }
      
      setWeekData(updatedWeekData);
      const weekKey = `week_${currentWeekStart}`;
      await AsyncStorage.setItem(weekKey, JSON.stringify(updatedWeekData));
    } catch (error) {
      console.log('Error saving meal:', error);
    }
  }, [weekData, selectedDate, currentWeekStart, getRatingFromCalories]);

  const addWorkout = useCallback(async (workout: Workout) => {
    try {
      const updatedWorkouts = [...todayWorkouts, workout];
      setTodayWorkouts(updatedWorkouts);
      await AsyncStorage.setItem('todayWorkouts', JSON.stringify(updatedWorkouts));
    } catch (error) {
      console.log('Error saving workout:', error);
    }
  }, [todayWorkouts]);

  const navigateWeek = useCallback((direction: 'prev' | 'next') => {
    const currentStart = new Date(currentWeekStart);
    const newStart = new Date(currentStart);
    newStart.setDate(currentStart.getDate() + (direction === 'next' ? 7 : -7));
    const newWeekStart = newStart.toISOString().split('T')[0];
    setCurrentWeekStart(newWeekStart);
    setIsManualWeekNavigation(true);
    
    // If navigating to current week, select today
    const todayWeekStart = getWeekStartForDate(today);
    if (newWeekStart === todayWeekStart) {
      setSelectedDate(today);
      setIsManualWeekNavigation(false);
    }
  }, [currentWeekStart, getWeekStartForDate, today]);
  
  // Auto-navigate to current week only on initial load, not during manual navigation
  useEffect(() => {
    const todayWeekStart = getWeekStartForDate(today);
    
    // Only auto-navigate if not manually navigating and not on current week
    if (!isManualWeekNavigation && currentWeekStart !== todayWeekStart) {
      setCurrentWeekStart(todayWeekStart);
      // Only set selectedDate to today if it's not already set to a valid date
      if (!selectedDate || selectedDate === today) {
        setSelectedDate(today);
      }
    }
  }, [currentWeekStart, getWeekStartForDate, today, isManualWeekNavigation, selectedDate]);
  
  // Initialize selectedDate to today only on first load when we're on current week
  useEffect(() => {
    const todayWeekStart = getWeekStartForDate(today);
    // Only set to today if selectedDate is not set or if we just loaded the current week
    if (currentWeekStart === todayWeekStart && !selectedDate && !isManualWeekNavigation) {
      setSelectedDate(today);
    }
  }, [currentWeekStart, getWeekStartForDate, today, isManualWeekNavigation, selectedDate]);

  const getMealsByType = useCallback((mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
    const currentDay = getCurrentDayStats();
    return currentDay.meals.filter(meal => meal.mealType === mealType);
  }, [getCurrentDayStats]);

  const getMealCaloriesByType = useCallback((mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack') => {
    return getMealsByType(mealType).reduce((sum, meal) => sum + meal.calories, 0);
  }, [getMealsByType]);

  const getTodayMeals = useCallback(() => {
    const today = new Date().toISOString().split('T')[0];
    const todayData = weekData.days.find(day => day.date === today);
    return todayData ? todayData.meals : [];
  }, [weekData.days]);

  const updateWaterForDate = useCallback(async (date: string, amount: number) => {
    try {
      const updatedWeekData = { ...weekData };
      const dayIndex = updatedWeekData.days.findIndex(day => day.date === date);
      
      if (dayIndex !== -1) {
        const newWater = Math.max(0, updatedWeekData.days[dayIndex].water + amount);
        updatedWeekData.days[dayIndex].water = Math.round(newWater * 4) / 4;
      }
      
      setWeekData(updatedWeekData);
      const weekKey = `week_${currentWeekStart}`;
      await AsyncStorage.setItem(weekKey, JSON.stringify(updatedWeekData));
    } catch (error) {
      console.log('Error updating water:', error);
    }
  }, [weekData, currentWeekStart]);

  const addMealForDate = useCallback(async (meal: Meal, targetDate: string) => {
    try {
      console.log('Adding meal for date:', targetDate, meal);
      
      // Find which week this date belongs to
      const targetDateObj = new Date(targetDate);
      const targetMonday = new Date(targetDateObj);
      // Get Monday of the week (Sunday = 0, Monday = 1)
      const dayOfWeek = targetDateObj.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days, otherwise go to Monday
      targetMonday.setDate(targetDateObj.getDate() + daysToMonday);
      const targetWeekStart = targetMonday.toISOString().split('T')[0];
      
      console.log('Target week start:', targetWeekStart, 'Current week start:', currentWeekStart);
      
      // Load the correct week data
      const weekKey = `week_${targetWeekStart}`;
      let targetWeekData: WeekData;
      
      if (targetWeekStart === currentWeekStart) {
        // Same week as currently loaded
        targetWeekData = { ...weekData };
      } else {
        // Different week, load it
        const storedWeekData = await AsyncStorage.getItem(weekKey);
        if (storedWeekData) {
          targetWeekData = JSON.parse(storedWeekData);
        } else {
          targetWeekData = initializeWeek(targetWeekStart);
        }
      }
      
      // Find the day and add the meal
      const dayIndex = targetWeekData.days.findIndex(day => day.date === targetDate);
      
      if (dayIndex !== -1) {
        targetWeekData.days[dayIndex].meals.push(meal);
        
        // Recalculate totals
        const dayMeals = targetWeekData.days[dayIndex].meals;
        targetWeekData.days[dayIndex].calories = dayMeals.reduce((sum, m) => sum + m.calories, 0);
        targetWeekData.days[dayIndex].protein = dayMeals.reduce((sum, m) => sum + m.protein, 0);
        targetWeekData.days[dayIndex].carbs = dayMeals.reduce((sum, m) => sum + m.carbs, 0);
        targetWeekData.days[dayIndex].fat = dayMeals.reduce((sum, m) => sum + m.fat, 0);
        const hasEntries = targetWeekData.days[dayIndex].meals.length > 0;
        targetWeekData.days[dayIndex].rating = getRatingFromCalories(targetWeekData.days[dayIndex].calories, hasEntries);
        
        console.log('Updated day data:', targetWeekData.days[dayIndex]);
      }
      
      // Save the week data
      await AsyncStorage.setItem(weekKey, JSON.stringify(targetWeekData));
      
      // Update current week data if it's the same week
      if (targetWeekStart === currentWeekStart) {
        setWeekData(targetWeekData);
      }
      
      console.log('Meal added successfully to', targetDate);
    } catch (error) {
      console.log('Error adding meal for date:', error);
      throw error;
    }
  }, [weekData, currentWeekStart, initializeWeek, getRatingFromCalories]);

  const saveRecipe = useCallback(async (recipe: Recipe) => {
    try {
      const updatedRecipes = [...recipes, recipe];
      setRecipes(updatedRecipes);
      await AsyncStorage.setItem('recipes', JSON.stringify(updatedRecipes));
      console.log('Recipe saved:', recipe.name);
    } catch (error) {
      console.log('Error saving recipe:', error);
      throw error;
    }
  }, [recipes]);

  const updateRecipe = useCallback(async (updatedRecipe: Recipe) => {
    try {
      const updatedRecipes = recipes.map(recipe => 
        recipe.id === updatedRecipe.id ? updatedRecipe : recipe
      );
      setRecipes(updatedRecipes);
      await AsyncStorage.setItem('recipes', JSON.stringify(updatedRecipes));
      console.log('Recipe updated:', updatedRecipe.name);
    } catch (error) {
      console.log('Error updating recipe:', error);
      throw error;
    }
  }, [recipes]);

  const deleteRecipe = useCallback(async (recipeId: string) => {
    try {
      const updatedRecipes = recipes.filter(recipe => recipe.id !== recipeId);
      setRecipes(updatedRecipes);
      await AsyncStorage.setItem('recipes', JSON.stringify(updatedRecipes));
      console.log('Recipe deleted:', recipeId);
    } catch (error) {
      console.log('Error deleting recipe:', error);
      throw error;
    }
  }, [recipes]);

  const getRecipeById = useCallback((recipeId: string): Recipe | undefined => {
    return recipes.find(recipe => recipe.id === recipeId);
  }, [recipes]);

  const createMealFromRecipe = useCallback((recipe: Recipe, servings: number = 1): Omit<Meal, 'id' | 'time' | 'mealType'> => {
    const servingMultiplier = servings / recipe.servings;
    return {
      name: `${recipe.name}${servings !== 1 ? ` (${servings} Portionen)` : ''}`,
      calories: Math.round(recipe.totalCalories * servingMultiplier),
      protein: Math.round(recipe.totalProtein * servingMultiplier),
      carbs: Math.round(recipe.totalCarbs * servingMultiplier),
      fat: Math.round(recipe.totalFat * servingMultiplier),
      portion: `${servings} Portion${servings !== 1 ? 'en' : ''}`,
      recipeId: recipe.id
    };
  }, []);

  const deleteMeal = useCallback(async (mealName: string, targetDate: string) => {
    try {
      console.log('Deleting meal:', mealName, 'from date:', targetDate);
      
      // Find which week this date belongs to
      const targetDateObj = new Date(targetDate);
      const targetMonday = new Date(targetDateObj);
      // Get Monday of the week (Sunday = 0, Monday = 1)
      const dayOfWeek = targetDateObj.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days, otherwise go to Monday
      targetMonday.setDate(targetDateObj.getDate() + daysToMonday);
      const targetWeekStart = targetMonday.toISOString().split('T')[0];
      
      // Load the correct week data
      const weekKey = `week_${targetWeekStart}`;
      let targetWeekData: WeekData;
      
      if (targetWeekStart === currentWeekStart) {
        targetWeekData = { ...weekData };
      } else {
        const storedWeekData = await AsyncStorage.getItem(weekKey);
        if (storedWeekData) {
          targetWeekData = JSON.parse(storedWeekData);
        } else {
          targetWeekData = initializeWeek(targetWeekStart);
        }
      }
      
      // Find the day and remove the meal
      const dayIndex = targetWeekData.days.findIndex(day => day.date === targetDate);
      
      if (dayIndex !== -1) {
        // Find and remove the meal by name (case insensitive)
        const mealIndex = targetWeekData.days[dayIndex].meals.findIndex(
          meal => meal.name.toLowerCase().includes(mealName.toLowerCase())
        );
        
        if (mealIndex !== -1) {
          targetWeekData.days[dayIndex].meals.splice(mealIndex, 1);
          
          // Recalculate totals
          const dayMeals = targetWeekData.days[dayIndex].meals;
          targetWeekData.days[dayIndex].calories = dayMeals.reduce((sum, m) => sum + m.calories, 0);
          targetWeekData.days[dayIndex].protein = dayMeals.reduce((sum, m) => sum + m.protein, 0);
          targetWeekData.days[dayIndex].carbs = dayMeals.reduce((sum, m) => sum + m.carbs, 0);
          targetWeekData.days[dayIndex].fat = dayMeals.reduce((sum, m) => sum + m.fat, 0);
          const hasEntries = targetWeekData.days[dayIndex].meals.length > 0;
          targetWeekData.days[dayIndex].rating = getRatingFromCalories(targetWeekData.days[dayIndex].calories, hasEntries);
          
          console.log('Meal deleted successfully');
        } else {
          throw new Error(`Mahlzeit "${mealName}" nicht gefunden`);
        }
      }
      
      // Save the week data
      await AsyncStorage.setItem(weekKey, JSON.stringify(targetWeekData));
      
      // Update current week data if it's the same week
      if (targetWeekStart === currentWeekStart) {
        setWeekData(targetWeekData);
      }
    } catch (error) {
      console.log('Error deleting meal:', error);
      throw error;
    }
  }, [weekData, currentWeekStart, initializeWeek, getRatingFromCalories]);

  const updateMeal = useCallback(async (mealName: string, newData: Partial<Meal>, targetDate: string) => {
    try {
      console.log('Updating meal:', mealName, 'on date:', targetDate, 'with:', newData);
      
      // Find which week this date belongs to
      const targetDateObj = new Date(targetDate);
      const targetMonday = new Date(targetDateObj);
      // Get Monday of the week (Sunday = 0, Monday = 1)
      const dayOfWeek = targetDateObj.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days, otherwise go to Monday
      targetMonday.setDate(targetDateObj.getDate() + daysToMonday);
      const targetWeekStart = targetMonday.toISOString().split('T')[0];
      
      // Load the correct week data
      const weekKey = `week_${targetWeekStart}`;
      let targetWeekData: WeekData;
      
      if (targetWeekStart === currentWeekStart) {
        targetWeekData = { ...weekData };
      } else {
        const storedWeekData = await AsyncStorage.getItem(weekKey);
        if (storedWeekData) {
          targetWeekData = JSON.parse(storedWeekData);
        } else {
          targetWeekData = initializeWeek(targetWeekStart);
        }
      }
      
      // Find the day and update the meal
      const dayIndex = targetWeekData.days.findIndex(day => day.date === targetDate);
      
      if (dayIndex !== -1) {
        // Find and update the meal by name (case insensitive)
        const mealIndex = targetWeekData.days[dayIndex].meals.findIndex(
          meal => meal.name.toLowerCase().includes(mealName.toLowerCase())
        );
        
        if (mealIndex !== -1) {
          // Update the meal with new data
          targetWeekData.days[dayIndex].meals[mealIndex] = {
            ...targetWeekData.days[dayIndex].meals[mealIndex],
            ...newData
          };
          
          // Recalculate totals
          const dayMeals = targetWeekData.days[dayIndex].meals;
          targetWeekData.days[dayIndex].calories = dayMeals.reduce((sum, m) => sum + m.calories, 0);
          targetWeekData.days[dayIndex].protein = dayMeals.reduce((sum, m) => sum + m.protein, 0);
          targetWeekData.days[dayIndex].carbs = dayMeals.reduce((sum, m) => sum + m.carbs, 0);
          targetWeekData.days[dayIndex].fat = dayMeals.reduce((sum, m) => sum + m.fat, 0);
          const hasEntries = targetWeekData.days[dayIndex].meals.length > 0;
          targetWeekData.days[dayIndex].rating = getRatingFromCalories(targetWeekData.days[dayIndex].calories, hasEntries);
          
          console.log('Meal updated successfully');
        } else {
          throw new Error(`Mahlzeit "${mealName}" nicht gefunden`);
        }
      }
      
      // Save the week data
      await AsyncStorage.setItem(weekKey, JSON.stringify(targetWeekData));
      
      // Update current week data if it's the same week
      if (targetWeekStart === currentWeekStart) {
        setWeekData(targetWeekData);
      }
    } catch (error) {
      console.log('Error updating meal:', error);
      throw error;
    }
  }, [weekData, currentWeekStart, initializeWeek, getRatingFromCalories]);

  const clearDayMeals = useCallback(async (targetDate: string) => {
    try {
      console.log('Clearing all meals from date:', targetDate);
      
      // Find which week this date belongs to
      const targetDateObj = new Date(targetDate);
      const targetMonday = new Date(targetDateObj);
      // Get Monday of the week (Sunday = 0, Monday = 1)
      const dayOfWeek = targetDateObj.getDay();
      const daysToMonday = dayOfWeek === 0 ? -6 : 1 - dayOfWeek; // If Sunday, go back 6 days, otherwise go to Monday
      targetMonday.setDate(targetDateObj.getDate() + daysToMonday);
      const targetWeekStart = targetMonday.toISOString().split('T')[0];
      
      // Load the correct week data
      const weekKey = `week_${targetWeekStart}`;
      let targetWeekData: WeekData;
      
      if (targetWeekStart === currentWeekStart) {
        targetWeekData = { ...weekData };
      } else {
        const storedWeekData = await AsyncStorage.getItem(weekKey);
        if (storedWeekData) {
          targetWeekData = JSON.parse(storedWeekData);
        } else {
          targetWeekData = initializeWeek(targetWeekStart);
        }
      }
      
      // Find the day and clear all meals
      const dayIndex = targetWeekData.days.findIndex(day => day.date === targetDate);
      
      if (dayIndex !== -1) {
        targetWeekData.days[dayIndex].meals = [];
        targetWeekData.days[dayIndex].calories = 0;
        targetWeekData.days[dayIndex].protein = 0;
        targetWeekData.days[dayIndex].carbs = 0;
        targetWeekData.days[dayIndex].fat = 0;
        targetWeekData.days[dayIndex].rating = 'empty';
        
        console.log('All meals cleared successfully');
      }
      
      // Save the week data
      await AsyncStorage.setItem(weekKey, JSON.stringify(targetWeekData));
      
      // Update current week data if it's the same week
      if (targetWeekStart === currentWeekStart) {
        setWeekData(targetWeekData);
      }
    } catch (error) {
      console.log('Error clearing day meals:', error);
      throw error;
    }
  }, [weekData, currentWeekStart, initializeWeek, getRatingFromCalories]);

  const calculateBMR = useCallback((weight: number, height: number, age: number, gender: 'male' | 'female'): number => {
    // Mifflin-St Jeor Equation
    if (gender === 'male') {
      return Math.round(10 * weight + 6.25 * height - 5 * age + 5);
    } else {
      return Math.round(10 * weight + 6.25 * height - 5 * age - 161);
    }
  }, []);

  const calculateTDEE = useCallback((bmr: number, activityLevel: UserProfile['activityLevel']): number => {
    const activityMultipliers = {
      sedentary: 1.2,
      lightly_active: 1.375,
      moderately_active: 1.55,
      very_active: 1.725,
      extremely_active: 1.9
    };
    return Math.round(bmr * activityMultipliers[activityLevel]);
  }, []);

  const updateUserProfile = useCallback(async (updates: Partial<UserProfile>) => {
    try {
      const updatedProfile = { ...userProfile, ...updates };
      
      // Update age from birthDate if birthDate is provided
      if (updates.birthDate) {
        const birthDate = new Date(updates.birthDate);
        const today = new Date();
        const age = today.getFullYear() - birthDate.getFullYear() - 
          (today.getMonth() < birthDate.getMonth() || 
           (today.getMonth() === birthDate.getMonth() && today.getDate() < birthDate.getDate()) ? 1 : 0);
        updatedProfile.age = age;
      }
      
      // Track weight history if weight changed
      if (updates.weight !== undefined && updates.weight !== userProfile.weight) {
        const today = new Date().toISOString().split('T')[0];
        const weightHistory = updatedProfile.weightHistory || [];
        // Remove today's entry if it exists, then add new one
        const filteredHistory = weightHistory.filter(entry => entry.date !== today);
        filteredHistory.push({ date: today, weight: updates.weight });
        // Keep only last 30 entries
        updatedProfile.weightHistory = filteredHistory.slice(-30);
      }
      
      // Update fitness plans if provided
      if (updates.fitnessPlans !== undefined) {
        setFitnessPlans(updates.fitnessPlans);
      }
      
      // Recalculate BMI if weight or height changed
      if (updates.weight !== undefined || updates.height !== undefined) {
        updatedProfile.bmi = Number((updatedProfile.weight / Math.pow(updatedProfile.height / 100, 2)).toFixed(1));
      }
      
      // Recalculate BMR if relevant fields changed
      if (updates.weight !== undefined || updates.height !== undefined || updates.age !== undefined || updates.gender !== undefined || updates.birthDate !== undefined) {
        updatedProfile.basalMetabolicRate = calculateBMR(updatedProfile.weight, updatedProfile.height, updatedProfile.age, updatedProfile.gender);
      }
      
      // Recalculate TDEE if BMR or activity level changed
      if (updates.activityLevel !== undefined || updates.weight !== undefined || updates.height !== undefined || updates.age !== undefined || updates.gender !== undefined || updates.birthDate !== undefined) {
        updatedProfile.totalDailyEnergyExpenditure = calculateTDEE(updatedProfile.basalMetabolicRate, updatedProfile.activityLevel);
      }
      
      setUserProfile(updatedProfile);
      await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));
      console.log('User profile updated:', updatedProfile);
    } catch (error) {
      console.log('Error updating user profile:', error);
      throw error;
    }
  }, [userProfile, calculateBMR, calculateTDEE]);

  const loadUserProfile = useCallback(async () => {
    try {
      const storedProfile = await AsyncStorage.getItem('userProfile');
      if (storedProfile) {
        const profile = JSON.parse(storedProfile);
        // Ensure all new fields exist with defaults
        const completeProfile = {
          name: "Max Mustermann",
          age: 28,
          weight: 75,
          height: 180,
          goal: "Gewicht halten",
          bmi: 23.1,
          gender: 'male' as const,
          activityLevel: 'moderately_active' as const,
          targetWeight: 75,
          basalMetabolicRate: 1800,
          totalDailyEnergyExpenditure: 2200,
          birthDate: '1995-01-01',
          weightHistory: [],
          fitnessPlans: [],
          ...profile
        };
        setUserProfile(completeProfile);
        setFitnessPlans(completeProfile.fitnessPlans || []);
      }
    } catch (error) {
      console.log('Error loading user profile:', error);
    }
  }, []);
  
  const addFitnessPlan = useCallback(async (plan: FitnessPlan) => {
    try {
      const updatedPlans = [...fitnessPlans, plan];
      setFitnessPlans(updatedPlans);
      
      // Also update user profile
      const updatedProfile = { ...userProfile, fitnessPlans: updatedPlans };
      setUserProfile(updatedProfile);
      await AsyncStorage.setItem('userProfile', JSON.stringify(updatedProfile));
      
      console.log('Fitness plan added:', plan.name);
    } catch (error) {
      console.log('Error adding fitness plan:', error);
      throw error;
    }
  }, [fitnessPlans, userProfile]);

  useEffect(() => {
    loadUserProfile();
  }, [loadUserProfile]);

  return useMemo(() => ({
    selectedDate,
    setSelectedDate,
    currentWeekStart,
    weekData,
    todayWorkouts,
    userProfile,
    weeklyGoal,
    recipes,
    fitnessPlans,
    getCurrentDayStats,
    updateWater,
    addMeal,
    addMealForDate,
    addWorkout,
    navigateWeek,
    getMealsByType,
    getMealCaloriesByType,
    getTodayMeals,
    updateWaterForDate,
    getWeekStartForDate,
    goToCurrentWeek,
    saveRecipe,
    updateRecipe,
    deleteRecipe,
    getRecipeById,
    createMealFromRecipe,
    deleteMeal,
    updateMeal,
    clearDayMeals,
    updateUserProfile,
    calculateBMR,
    calculateTDEE,
    addFitnessPlan,
  }), [
    selectedDate,
    currentWeekStart,
    weekData,
    todayWorkouts,
    userProfile,
    weeklyGoal,
    recipes,
    fitnessPlans,
    getCurrentDayStats,
    updateWater,
    addMeal,
    addMealForDate,
    addWorkout,
    navigateWeek,
    getMealsByType,
    getMealCaloriesByType,
    getTodayMeals,
    updateWaterForDate,
    getWeekStartForDate,
    goToCurrentWeek,
    saveRecipe,
    updateRecipe,
    deleteRecipe,
    getRecipeById,
    createMealFromRecipe,
    deleteMeal,
    updateMeal,
    clearDayMeals,
    updateUserProfile,
    calculateBMR,
    calculateTDEE,
    addFitnessPlan,
  ]);
});