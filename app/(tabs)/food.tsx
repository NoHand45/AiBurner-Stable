import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Dimensions,
} from "react-native";
import { Plus, Search, Clock, Flame, ChevronLeft, ChevronRight, BookOpen, Edit3, Trash2 } from "lucide-react-native";
import { useFitnessData, type Meal, type Recipe, type Ingredient } from "@/hooks/fitness-store";
import { useDatabaseContext } from "@/hooks/database-store";
import { trpc } from "@/lib/trpc";
import Svg, { Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');

export default function FoodScreen() {
  const { 
    selectedDate, 
    setSelectedDate, 
    weekData, 
    weeklyGoal, 
    getCurrentDayStats, 
    navigateWeek,
    addMeal,
    recipes,
    saveRecipe,
    deleteRecipe,
    createMealFromRecipe
  } = useFitnessData();
  
  const { getCalendarEntry, addMealToCalendar, addCustomFood, foods, isLoading } = useDatabaseContext();
  const currentDay = getCurrentDayStats();
  
  // Load calendar meals for selected date
  useEffect(() => {
    const loadCalendarMeals = async () => {
      try {
        console.log('Loading calendar meals for date:', selectedDate);
        const result = await getCalendarEntry(selectedDate);
        console.log('Calendar entry result:', result);
        
        if (result.success && result.entry) {
          console.log('Setting calendar meals:', result.entry.meals);
          setCalendarMeals(result.entry.meals || []);
        } else {
          console.log('No calendar entry found, setting empty meals');
          setCalendarMeals([]);
        }
      } catch (error) {
        console.error('Error loading calendar meals:', error);
        setCalendarMeals([]);
      }
    };
    
    loadCalendarMeals();
  }, [selectedDate, getCalendarEntry]);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showRecipeModal, setShowRecipeModal] = useState(false);
  const [showCreateRecipeModal, setShowCreateRecipeModal] = useState(false);
  const [showFoodDatabaseModal, setShowFoodDatabaseModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState("");
  const [selectedPortion, setSelectedPortion] = useState("");
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [selectedRecipeServings, setSelectedRecipeServings] = useState("1");
  const [activeTab, setActiveTab] = useState<'foods' | 'recipes'>('foods');
  const [foodDatabaseTab, setFoodDatabaseTab] = useState<'foods' | 'recipes'>('foods');
  const [calendarMeals, setCalendarMeals] = useState<any[]>([]);
  const [selectedMealForDetails, setSelectedMealForDetails] = useState<any>(null);
  const [showMealDetailsModal, setShowMealDetailsModal] = useState<boolean>(false);
  
  // OpenFoodFacts search states
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [offSearchQuery, setOffSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedSearchFood, setSelectedSearchFood] = useState<any>(null);
  const [selectedSearchPortion, setSelectedSearchPortion] = useState<any>(null);
  const [customGrams, setCustomGrams] = useState<string>("");
  const [showCustomGramsInput, setShowCustomGramsInput] = useState<boolean>(false);
  const searchTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // Recipe creation states
  const [recipeName, setRecipeName] = useState("");
  const [newRecipeServings, setNewRecipeServings] = useState("1");
  const [recipeInstructions, setRecipeInstructions] = useState("");
  const [recipeIngredients, setRecipeIngredients] = useState<Ingredient[]>([]);
  const [newIngredientName, setNewIngredientName] = useState("");
  const [newIngredientAmount, setNewIngredientAmount] = useState("");
  const [newIngredientUnit, setNewIngredientUnit] = useState("g");

  // Integrate commonFoods into the database
  const commonFoods = [
    { name: "Apfel", calories: 52, portion: "1 mittel (150g)", category: "fruit" as const, nutritionPer100g: { calories: 52, protein: 0.3, carbs: 14, fat: 0.2 } },
    { name: "Banane", calories: 89, portion: "1 mittel (120g)", category: "fruit" as const, nutritionPer100g: { calories: 89, protein: 1.1, carbs: 23, fat: 0.3 } },
    { name: "Haferflocken", calories: 389, portion: "100g", category: "grain" as const, nutritionPer100g: { calories: 389, protein: 16.9, carbs: 58.7, fat: 6.9 } },
    { name: "Hähnchenbrust", calories: 165, portion: "100g", category: "meat" as const, nutritionPer100g: { calories: 165, protein: 31, carbs: 0, fat: 3.6 } },
    { name: "Reis", calories: 130, portion: "100g gekocht", category: "grain" as const, nutritionPer100g: { calories: 130, protein: 2.7, carbs: 28, fat: 0.3 } },
    { name: "Brokkoli", calories: 34, portion: "100g", category: "vegetable" as const, nutritionPer100g: { calories: 34, protein: 2.8, carbs: 7, fat: 0.4 } },
    { name: "Vollkornbrot", calories: 247, portion: "100g", category: "grain" as const, nutritionPer100g: { calories: 247, protein: 10, carbs: 41, fat: 4.2 } },
    { name: "Lachs", calories: 208, portion: "100g", category: "meat" as const, nutritionPer100g: { calories: 208, protein: 25, carbs: 0, fat: 12 } },
  ];

  // Combine common foods with database foods for display
  const allFoods = useMemo(() => {
    const databaseFoodNames = new Set(foods.map(f => f.name.toLowerCase()));
    const uniqueCommonFoods = commonFoods.filter(cf => !databaseFoodNames.has(cf.name.toLowerCase()));
    
    return [
      ...foods,
      ...uniqueCommonFoods.map(cf => ({
        id: `common-${cf.name}`,
        name: cf.name,
        category: cf.category,
        nutritionPer100g: cf.nutritionPer100g,
        commonPortions: [{ name: cf.portion, grams: 100 }],
        aliases: [],
        source: 'common' as const
      }))
    ];
  }, [foods]);

  const filteredFoods = commonFoods.filter(food =>
    food.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddFood = async () => {
    if (!selectedFood) return;
    
    try {
      const food = commonFoods.find(f => f.name === selectedFood);
      if (!food) return;
      
      // For common foods, we'll use a simple approach with default portions
      const portionGrams = 100; // Default to 100g for common foods
      const portionName = food.portion;
      
      // Calculate nutrition (common foods have calories per portion, we need to estimate per 100g)
      const estimatedNutritionPer100g = {
        calories: food.calories,
        protein: food.calories * 0.1, // Rough estimate
        carbs: food.calories * 0.15,  // Rough estimate
        fat: food.calories * 0.05     // Rough estimate
      };
      
      const multiplier = portionGrams / 100;
      const portionNutrition = {
        calories: Math.round(estimatedNutritionPer100g.calories * multiplier),
        protein: Math.round(estimatedNutritionPer100g.protein * multiplier * 10) / 10,
        carbs: Math.round(estimatedNutritionPer100g.carbs * multiplier * 10) / 10,
        fat: Math.round(estimatedNutritionPer100g.fat * multiplier * 10) / 10,
      };
      
      // Add to calendar database
      const result = await addMealToCalendar(selectedDate, {
        name: food.name,
        mealType: 'snack',
        time: new Date().toLocaleTimeString("de-DE", { 
          hour: "2-digit", 
          minute: "2-digit" 
        }),
        foods: [{
          name: food.name,
          portion: {
            name: portionName,
            grams: portionGrams
          },
          nutrition: portionNutrition
        }],
        source: 'manual'
      });
      
      if (result.success) {
        // Refresh calendar meals
        const calendarResult = await getCalendarEntry(selectedDate);
        if (calendarResult.success && calendarResult.entry) {
          setCalendarMeals(calendarResult.entry.meals || []);
        }
        
        // Close modal and reset
        setShowAddModal(false);
        setSelectedFood("");
        setSelectedPortion("");
        setSearchQuery("");
      } else {
        alert('Fehler beim Hinzufügen des Lebensmittels: ' + (result.error || 'Unbekannter Fehler'));
      }
    } catch (error) {
      console.error('Error adding food:', error);
      alert('Fehler beim Hinzufügen des Lebensmittels.');
    }
  };

  const handleAddRecipe = () => {
    if (selectedRecipe) {
      const servings = parseFloat(selectedRecipeServings) || 1;
      const mealData = createMealFromRecipe(selectedRecipe, servings);
      
      addMeal({
        id: Date.now().toString(),
        ...mealData,
        time: new Date().toLocaleTimeString("de-DE", { 
          hour: "2-digit", 
          minute: "2-digit" 
        }),
        mealType: 'snack',
      });
      
      setShowRecipeModal(false);
      setSelectedRecipe(null);
      setSelectedRecipeServings("1");
    }
  };

  const addIngredient = () => {
    if (newIngredientName && newIngredientAmount) {
      const amount = parseFloat(newIngredientAmount);
      if (isNaN(amount)) return;
      
      // Estimate nutritional values based on common foods
      const estimatedNutrition = estimateNutrition(newIngredientName, amount, newIngredientUnit);
      
      const ingredient: Ingredient = {
        id: Date.now().toString(),
        name: newIngredientName,
        amount,
        unit: newIngredientUnit,
        ...estimatedNutrition
      };
      
      setRecipeIngredients([...recipeIngredients, ingredient]);
      setNewIngredientName("");
      setNewIngredientAmount("");
      setNewIngredientUnit("g");
    }
  };

  const removeIngredient = (ingredientId: string) => {
    setRecipeIngredients(recipeIngredients.filter(ing => ing.id !== ingredientId));
  };

  const estimateNutrition = (name: string, amount: number, unit: string) => {
    // Simple nutrition estimation based on common foods
    const nutritionDb: Record<string, { calories: number; protein: number; carbs: number; fat: number }> = {
      'reis': { calories: 1.3, protein: 0.06, carbs: 0.65, fat: 0.01 },
      'nudeln': { calories: 3.5, protein: 0.12, carbs: 0.7, fat: 0.02 },
      'hähnchenbrust': { calories: 1.65, protein: 0.3, carbs: 0, fat: 0.08 },
      'tomate': { calories: 0.18, protein: 0.009, carbs: 0.039, fat: 0.002 },
      'zwiebel': { calories: 0.4, protein: 0.011, carbs: 0.093, fat: 0.001 },
      'kartoffel': { calories: 0.77, protein: 0.02, carbs: 0.17, fat: 0.001 },
      'karotte': { calories: 0.41, protein: 0.009, carbs: 0.1, fat: 0.002 },
      'brokkoli': { calories: 0.34, protein: 0.028, carbs: 0.07, fat: 0.004 },
      'spinat': { calories: 0.23, protein: 0.029, carbs: 0.036, fat: 0.004 },
      'käse': { calories: 4, protein: 0.25, carbs: 0.01, fat: 0.33 },
      'milch': { calories: 0.42, protein: 0.034, carbs: 0.05, fat: 0.01 },
      'ei': { calories: 1.55, protein: 0.13, carbs: 0.011, fat: 0.11 },
      'butter': { calories: 7.17, protein: 0.01, carbs: 0.01, fat: 0.81 },
      'olivenöl': { calories: 8.84, protein: 0, carbs: 0, fat: 1 },
      'mehl': { calories: 3.64, protein: 0.1, carbs: 0.76, fat: 0.01 },
      'zucker': { calories: 3.87, protein: 0, carbs: 1, fat: 0 },
    };
    
    const lowerName = name.toLowerCase();
    let nutrition = nutritionDb[lowerName];
    
    // Try partial matches
    if (!nutrition) {
      for (const [key, value] of Object.entries(nutritionDb)) {
        if (lowerName.includes(key) || key.includes(lowerName)) {
          nutrition = value;
          break;
        }
      }
    }
    
    // Default values if no match found
    if (!nutrition) {
      nutrition = { calories: 2, protein: 0.1, carbs: 0.2, fat: 0.05 };
    }
    
    // Convert to per gram values and multiply by amount
    const multiplier = unit === 'ml' ? 1 : amount; // Assume ml = g for simplicity
    
    return {
      calories: Math.round(nutrition.calories * multiplier),
      protein: Math.round(nutrition.protein * multiplier * 10) / 10,
      carbs: Math.round(nutrition.carbs * multiplier * 10) / 10,
      fat: Math.round(nutrition.fat * multiplier * 10) / 10,
    };
  };

  // OpenFoodFacts search function using trpcClient
  const searchOpenFoodFacts = async (query: string) => {
    console.log('searchOpenFoodFacts called with query:', query);
    
    if (!query.trim()) {
      console.log('Empty query, clearing results');
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    console.log('Starting search...');
    
    try {
      const { trpcClient } = await import('@/lib/trpc');
      console.log('trpcClient loaded, making query...');
      
      const result = await trpcClient.database.food.searchOpenFoodFacts.query({
        query: query.trim(),
        limit: 20
      });
      
      console.log('Search result:', result);
      
      if (result.success) {
        console.log('Search successful, found', result.foods.length, 'foods');
        setSearchResults(result.foods);
      } else {
        console.log('Search failed:', result.error);
        console.error('Search error details:', result.error);
        setSearchResults([]);
        
        // Show error to user
        alert(`Suche fehlgeschlagen: ${result.error}`);
      }
    } catch (error) {
      console.error('Error searching OpenFoodFacts:', error);
      console.error('Error type:', typeof error);
      console.error('Error message:', error instanceof Error ? error.message : String(error));
      console.error('Error stack:', error instanceof Error ? error.stack : 'No stack');
      
      setSearchResults([]);
      
      // Show error to user
      const errorMessage = error instanceof Error ? error.message : 'Unbekannter Fehler';
      alert(`Netzwerkfehler: ${errorMessage}`);
    } finally {
      setIsSearching(false);
      console.log('Search completed');
    }
  };
  
  // Handle search input change with debouncing
  const handleSearchInputChange = (text: string) => {
    setOffSearchQuery(text);
    
    // Clear previous timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Debounce search
    searchTimeoutRef.current = setTimeout(() => {
      searchOpenFoodFacts(text);
    }, 500);
  };
  
  // Add food from OpenFoodFacts search
  const handleAddSearchFood = async () => {
    if (!selectedSearchFood) return;
    
    try {
      let portionGrams: number;
      let portionName: string;
      
      // Use custom grams if specified, otherwise use selected portion
      if (showCustomGramsInput && customGrams) {
        portionGrams = parseFloat(customGrams);
        portionName = `${portionGrams}g`;
        
        if (isNaN(portionGrams) || portionGrams <= 0) {
          alert('Bitte gib eine gültige Grammzahl ein.');
          return;
        }
      } else if (selectedSearchPortion) {
        portionGrams = selectedSearchPortion.grams;
        portionName = selectedSearchPortion.name;
      } else {
        alert('Bitte wähle eine Portion aus oder gib eine Grammzahl ein.');
        return;
      }
      
      const nutritionPer100g = selectedSearchFood.nutritionPer100g;
      
      // Calculate nutrition for selected portion
      const multiplier = portionGrams / 100;
      const portionNutrition = {
        calories: Math.round(nutritionPer100g.calories * multiplier),
        protein: Math.round(nutritionPer100g.protein * multiplier * 10) / 10,
        carbs: Math.round(nutritionPer100g.carbs * multiplier * 10) / 10,
        fat: Math.round(nutritionPer100g.fat * multiplier * 10) / 10,
      };
      
      // First, add the food to the personal database if it's from OpenFoodFacts
      if (selectedSearchFood.id.startsWith('openfoodfacts-')) {
        console.log('Adding OpenFoodFacts food to personal database:', selectedSearchFood.name);
        
        try {
          const addFoodResult = await addCustomFood({
            name: selectedSearchFood.name,
            category: selectedSearchFood.category,
            nutritionPer100g: selectedSearchFood.nutritionPer100g,
            commonPortions: selectedSearchFood.commonPortions,
            aliases: selectedSearchFood.aliases || []
          });
          
          if (addFoodResult.success) {
            console.log('Successfully added food to personal database:', addFoodResult.food?.name);
            // Note: The foods list will be automatically updated when the database context refreshes
          } else {
            console.warn('Failed to add food to personal database:', addFoodResult.error);
          }
        } catch (dbError) {
          console.warn('Error adding food to personal database (continuing with meal addition):', dbError);
        }
      }
      
      // Add to calendar database
      const result = await addMealToCalendar(selectedDate, {
        name: selectedSearchFood.name,
        mealType: 'snack',
        time: new Date().toLocaleTimeString("de-DE", { 
          hour: "2-digit", 
          minute: "2-digit" 
        }),
        foods: [{
          foodId: selectedSearchFood.id,
          name: selectedSearchFood.name,
          portion: {
            name: portionName,
            grams: portionGrams
          },
          nutrition: portionNutrition
        }],
        source: 'manual'
      });
      
      if (result.success) {
        // Refresh calendar meals
        const calendarResult = await getCalendarEntry(selectedDate);
        if (calendarResult.success && calendarResult.entry) {
          setCalendarMeals(calendarResult.entry.meals || []);
        }
        
        // Close modal and reset all states
        setShowSearchModal(false);
        setOffSearchQuery("");
        setSearchResults([]);
        setSelectedSearchFood(null);
        setSelectedSearchPortion(null);
        setCustomGrams("");
        setShowCustomGramsInput(false);
        
        // Clear search timeout
        if (searchTimeoutRef.current) {
          clearTimeout(searchTimeoutRef.current);
          searchTimeoutRef.current = null;
        }
        
        console.log('Food added successfully to meal and personal database');
      } else {
        console.error('Failed to add food:', result.error);
        alert('Fehler beim Hinzufügen des Lebensmittels: ' + (result.error || 'Unbekannter Fehler'));
      }
    } catch (error) {
      console.error('Error adding food from search:', error);
      alert('Fehler beim Hinzufügen des Lebensmittels.');
    }
  };

  // Add food from database to meal
  const handleAddFoodFromDatabase = async (food: any) => {
    try {
      const portionGrams = food.commonPortions && food.commonPortions.length > 0 ? food.commonPortions[0].grams : 100;
      const portionName = food.commonPortions && food.commonPortions.length > 0 ? food.commonPortions[0].name : '100g';
      
      const multiplier = portionGrams / 100;
      const portionNutrition = {
        calories: Math.round(food.nutritionPer100g.calories * multiplier),
        protein: Math.round(food.nutritionPer100g.protein * multiplier * 10) / 10,
        carbs: Math.round(food.nutritionPer100g.carbs * multiplier * 10) / 10,
        fat: Math.round(food.nutritionPer100g.fat * multiplier * 10) / 10,
      };
      
      const result = await addMealToCalendar(selectedDate, {
        name: food.name,
        mealType: 'snack',
        time: new Date().toLocaleTimeString("de-DE", { 
          hour: "2-digit", 
          minute: "2-digit" 
        }),
        foods: [{
          foodId: food.source === 'common' ? undefined : food.id,
          name: food.name,
          portion: {
            name: portionName,
            grams: portionGrams
          },
          nutrition: portionNutrition
        }],
        source: 'manual'
      });
      
      if (result.success) {
        // Refresh calendar meals
        const calendarResult = await getCalendarEntry(selectedDate);
        if (calendarResult.success && calendarResult.entry) {
          setCalendarMeals(calendarResult.entry.meals || []);
        }
        
        // Close modal
        setShowFoodDatabaseModal(false);
        console.log('Food added successfully from database');
      } else {
        console.error('Failed to add food from database:', result.error);
        alert('Fehler beim Hinzufügen des Lebensmittels: ' + (result.error || 'Unbekannter Fehler'));
      }
    } catch (error) {
      console.error('Error adding food from database:', error);
      alert('Fehler beim Hinzufügen des Lebensmittels.');
    }
  };
  
  // Add recipe from database to meal
  const handleAddRecipeFromDatabase = async (recipe: any) => {
    try {
      const servings = 1; // Default to 1 serving
      const portionNutrition = {
        calories: Math.round(recipe.totalCalories / recipe.servings * servings),
        protein: Math.round(recipe.totalProtein / recipe.servings * servings * 10) / 10,
        carbs: Math.round(recipe.totalCarbs / recipe.servings * servings * 10) / 10,
        fat: Math.round(recipe.totalFat / recipe.servings * servings * 10) / 10,
      };
      
      const result = await addMealToCalendar(selectedDate, {
        name: recipe.name,
        mealType: 'snack',
        time: new Date().toLocaleTimeString("de-DE", { 
          hour: "2-digit", 
          minute: "2-digit" 
        }),
        foods: [{
          recipeId: recipe.id,
          name: recipe.name,
          portion: {
            name: `${servings} Portion${servings > 1 ? 'en' : ''}`,
            grams: 0 // Recipes don't have grams
          },
          nutrition: portionNutrition
        }],
        source: 'manual'
      });
      
      if (result.success) {
        // Refresh calendar meals
        const calendarResult = await getCalendarEntry(selectedDate);
        if (calendarResult.success && calendarResult.entry) {
          setCalendarMeals(calendarResult.entry.meals || []);
        }
        
        // Close modal
        setShowFoodDatabaseModal(false);
        console.log('Recipe added successfully from database');
      } else {
        console.error('Failed to add recipe from database:', result.error);
        alert('Fehler beim Hinzufügen des Gerichts: ' + (result.error || 'Unbekannter Fehler'));
      }
    } catch (error) {
      console.error('Error adding recipe from database:', error);
      alert('Fehler beim Hinzufügen des Gerichts.');
    }
  };

  const handleCreateRecipe = () => {
    if (recipeName && recipeIngredients.length > 0) {
      const totalCalories = recipeIngredients.reduce((sum, ing) => sum + ing.calories, 0);
      const totalProtein = recipeIngredients.reduce((sum, ing) => sum + ing.protein, 0);
      const totalCarbs = recipeIngredients.reduce((sum, ing) => sum + ing.carbs, 0);
      const totalFat = recipeIngredients.reduce((sum, ing) => sum + ing.fat, 0);
      
      const recipe: Recipe = {
        id: Date.now().toString(),
        name: recipeName,
        ingredients: recipeIngredients,
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFat,
        servings: parseInt(newRecipeServings) || 1,
        instructions: recipeInstructions,
        createdAt: new Date().toISOString(),
      };
      
      saveRecipe(recipe);
      
      // Reset form
      setRecipeName("");
      setNewRecipeServings("1");
      setRecipeInstructions("");
      setRecipeIngredients([]);
      setShowCreateRecipeModal(false);
    }
  };

  // Calculate total calories from both old and new system
  const oldCalories = currentDay.meals.reduce((sum: number, meal: Meal) => sum + meal.calories, 0);
  const newCalories = calendarMeals.reduce((sum: number, meal: any) => sum + meal.totalNutrition.calories, 0);
  const totalCalories = oldCalories + newCalories;
  
  const handleMealPress = (meal: any) => {
    setSelectedMealForDetails(meal);
    setShowMealDetailsModal(true);
  };

  const navigateDay = (direction: 'prev' | 'next') => {
    const currentDate = new Date(selectedDate);
    const newDate = new Date(currentDate);
    newDate.setDate(currentDate.getDate() + (direction === 'next' ? 1 : -1));
    const newDateString = newDate.toISOString().split('T')[0];
    setSelectedDate(newDateString);
  };

  const WeekCalendar = () => {
    const weekDays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const currentDate = new Date();
    const todayString = currentDate.toISOString().split('T')[0];
    
    const getWeekNumber = (date: Date): number => {
      const d = new Date(date.getTime());
      const dayNum = d.getDay() || 7;
      d.setDate(d.getDate() + 4 - dayNum);
      const yearStart = new Date(d.getFullYear(), 0, 1);
      const firstThursdayDayNum = yearStart.getDay() || 7;
      const firstThursday = new Date(d.getFullYear(), 0, 1 + (4 - firstThursdayDayNum));
      const weekNumber = Math.floor((d.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
      return weekNumber;
    };
    
    const weekStartDate = new Date(weekData.startDate);
    const midWeekDate = new Date(weekStartDate);
    midWeekDate.setDate(weekStartDate.getDate() + 3);
    const weekNumber = getWeekNumber(midWeekDate);
    const year = midWeekDate.getFullYear();
    
    const isCurrentWeek = weekData.days.some(day => day.date === todayString);
    const weekTitle = isCurrentWeek ? "Diese Woche" : "Woche";
    
    const getRatingColor = (rating: string) => {
      switch (rating) {
        case 'excellent': return 'rgba(34, 197, 94, 0.7)';
        case 'good': return 'rgba(234, 179, 8, 0.7)';
        case 'average': return 'rgba(249, 115, 22, 0.7)';
        case 'poor': return 'rgba(239, 68, 68, 0.7)';
        case 'empty': return 'rgba(156, 163, 175, 0.3)';
        default: return 'rgba(156, 163, 175, 0.3)';
      }
    };

    return (
      <View style={styles.weekCalendar}>
        <View style={styles.weekHeader}>
          <TouchableOpacity onPress={() => navigateWeek('prev')} style={styles.weekNavButton}>
            <ChevronLeft color="#6B7280" size={20} />
          </TouchableOpacity>
          <View style={styles.weekTitleContainer}>
            <Text style={styles.weekTitle}>{weekTitle}</Text>
            <Text style={styles.weekSubtitle}>KW {weekNumber} • {year}</Text>
          </View>
          <TouchableOpacity onPress={() => navigateWeek('next')} style={styles.weekNavButton}>
            <ChevronRight color="#6B7280" size={20} />
          </TouchableOpacity>
        </View>
        <View style={styles.weekDays}>
          {weekData.days.map((day, index) => {
            const isSelected = day.date === selectedDate;
            const dayDate = new Date(day.date);
            const isToday = day.date === todayString;
            
            return (
              <View key={day.date} style={styles.weekDayContainer}>
                <Text style={[
                  styles.weekDayLabelOutside,
                  isToday && styles.weekDayLabelTodayOutside
                ]}>
                  {weekDays[dayDate.getDay()]}
                </Text>
                <TouchableOpacity
                  style={[
                    styles.weekDay,
                    { backgroundColor: getRatingColor(day.rating) },
                    isToday && styles.weekDayToday,
                    isSelected && !isToday && styles.weekDaySelected
                  ]}
                  onPress={() => setSelectedDate(day.date)}
                >
                  <Text style={[
                    styles.weekDayNumber,
                    isToday && styles.weekDayNumberToday,
                    isSelected && !isToday && styles.weekDayNumberSelected,
                    day.rating === 'empty' && !isToday && !isSelected && styles.weekDayNumberEmpty
                  ]}>
                    {dayDate.getDate()}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerTop}>
          <Text style={styles.title}>Ernährung</Text>
          <View style={styles.caloriesSummary}>
            <Flame color="#EF4444" size={20} />
            <Text style={styles.caloriesText}>{totalCalories} kcal</Text>
          </View>
        </View>
        <View style={styles.selectedDateDisplay}>
          <Text style={styles.selectedDateText}>
            {new Date(selectedDate).toLocaleDateString("de-DE", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
          </Text>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <WeekCalendar />
        <View style={styles.mealsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Mahlzeiten</Text>
            <View style={styles.headerButtons}>
              <TouchableOpacity 
                style={styles.foodDatabaseButton}
                onPress={() => setShowFoodDatabaseModal(true)}
              >
                <BookOpen color="#10B981" size={20} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.searchButton}
                onPress={() => setShowSearchModal(true)}
              >
                <Search color="#667eea" size={20} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Combine meals from both systems */}
          {(() => {
            const allMeals = [
              ...currentDay.meals.map(meal => ({ ...meal, isFromCalendar: false })),
              ...calendarMeals.map(meal => ({
                id: meal.id,
                name: meal.name,
                calories: meal.totalNutrition.calories,
                protein: meal.totalNutrition.protein,
                carbs: meal.totalNutrition.carbs,
                fat: meal.totalNutrition.fat,
                portion: meal.foods.length > 1 ? `${meal.foods.length} Lebensmittel` : meal.foods[0]?.portion?.name || 'Portion',
                time: meal.time || new Date().toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit" }),
                mealType: meal.mealType,
                isFromCalendar: true,
                originalMeal: meal
              }))
            ];
            
            return allMeals.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>
                  Noch keine Mahlzeiten an diesem Tag geloggt
                </Text>
                <Text style={styles.emptySubtext}>
                  Tippe auf das Buch-Symbol um Lebensmittel hinzuzufügen
                </Text>
              </View>
            ) : (
              allMeals.map((meal: any) => (
                <TouchableOpacity 
                  key={meal.id} 
                  style={styles.mealCard}
                  onPress={() => handleMealPress(meal)}
                >
                  <View style={styles.mealHeader}>
                    <Text style={styles.mealName}>{meal.name}</Text>
                    <Text style={styles.mealCalories}>{meal.calories} kcal</Text>
                  </View>
                  <View style={styles.mealDetails}>
                    <Clock color="#6B7280" size={14} />
                    <Text style={styles.mealTime}>{meal.time}</Text>
                    <Text style={styles.mealPortion}>• {meal.portion}</Text>
                  </View>
                </TouchableOpacity>
              ))
            );
          })()}
        </View>
      </ScrollView>

      {/* Add Food Modal */}
      <Modal
        visible={showAddModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowAddModal(false)}>
              <Text style={styles.cancelButton}>Abbrechen</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Essen hinzufügen</Text>
            <TouchableOpacity onPress={handleAddFood}>
              <Text style={[
                styles.saveButton,
                { opacity: selectedFood ? 1 : 0.5 }
              ]}>
                Hinzufügen
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Search color="#6B7280" size={20} />
            <TextInput
              style={styles.searchInput}
              placeholder="Lebensmittel suchen..."
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>

          <ScrollView style={styles.foodList}>
            {filteredFoods.map((food) => (
              <TouchableOpacity
                key={food.name}
                style={[
                  styles.foodItem,
                  selectedFood === food.name && styles.selectedFoodItem
                ]}
                onPress={() => {
                  setSelectedFood(food.name);
                  setSelectedPortion(food.portion);
                }}
              >
                <View style={styles.foodInfo}>
                  <Text style={styles.foodName}>{food.name}</Text>
                  <Text style={styles.foodPortion}>{food.portion}</Text>
                </View>
                <Text style={styles.foodCalories}>{food.calories} kcal</Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>

      {/* Recipe Selection Modal */}
      <Modal
        visible={showRecipeModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowRecipeModal(false)}>
              <Text style={styles.cancelButton}>Abbrechen</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Rezept hinzufügen</Text>
            <TouchableOpacity onPress={() => setShowCreateRecipeModal(true)}>
              <Text style={styles.saveButton}>Neues Rezept</Text>
            </TouchableOpacity>
          </View>

          {selectedRecipe && (
            <View style={styles.servingsContainer}>
              <Text style={styles.servingsLabel}>Portionen:</Text>
              <TextInput
                style={styles.servingsInput}
                value={selectedRecipeServings}
                onChangeText={setSelectedRecipeServings}
                keyboardType="numeric"
                placeholder="1"
              />
              <TouchableOpacity 
                style={styles.addRecipeButton}
                onPress={handleAddRecipe}
              >
                <Text style={styles.addRecipeButtonText}>Hinzufügen</Text>
              </TouchableOpacity>
            </View>
          )}

          <ScrollView style={styles.recipeList}>
            {recipes.length === 0 ? (
              <View style={styles.emptyRecipes}>
                <Text style={styles.emptyRecipesText}>Noch keine Rezepte erstellt</Text>
                <Text style={styles.emptyRecipesSubtext}>Tippe auf "Neues Rezept" um dein erstes Rezept zu erstellen</Text>
              </View>
            ) : (
              recipes.map((recipe) => (
                <TouchableOpacity
                  key={recipe.id}
                  style={[
                    styles.recipeItem,
                    selectedRecipe?.id === recipe.id && styles.selectedRecipeItem
                  ]}
                  onPress={() => setSelectedRecipe(recipe)}
                >
                  <View style={styles.recipeInfo}>
                    <Text style={styles.recipeName}>{recipe.name}</Text>
                    <Text style={styles.recipeDetails}>
                      {recipe.servings} Portionen • {Math.round(recipe.totalCalories / recipe.servings)} kcal/Portion
                    </Text>
                    <Text style={styles.recipeIngredients}>
                      {recipe.ingredients.slice(0, 3).map(ing => ing.name).join(', ')}
                      {recipe.ingredients.length > 3 && '...'}
                    </Text>
                  </View>
                  <View style={styles.recipeActions}>
                    <TouchableOpacity
                      style={styles.deleteRecipeButton}
                      onPress={() => deleteRecipe(recipe.id)}
                    >
                      <Trash2 color="#EF4444" size={16} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>
      </Modal>

      {/* Create Recipe Modal */}
      <Modal
        visible={showCreateRecipeModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowCreateRecipeModal(false)}>
              <Text style={styles.cancelButton}>Abbrechen</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Neues Rezept</Text>
            <TouchableOpacity onPress={handleCreateRecipe}>
              <Text style={[
                styles.saveButton,
                { opacity: recipeName && recipeIngredients.length > 0 ? 1 : 0.5 }
              ]}>
                Speichern
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.createRecipeContent}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Rezeptname</Text>
              <TextInput
                style={styles.textInput}
                value={recipeName}
                onChangeText={setRecipeName}
                placeholder="z.B. Spaghetti Bolognese"
              />
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Portionen</Text>
                <TextInput
                  style={styles.textInput}
                  value={newRecipeServings}
                  onChangeText={setNewRecipeServings}
                  keyboardType="numeric"
                  placeholder="1"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Zutaten</Text>
              <View style={styles.addIngredientContainer}>
                <TextInput
                  style={[styles.textInput, { flex: 2 }]}
                  value={newIngredientName}
                  onChangeText={setNewIngredientName}
                  placeholder="Zutat"
                />
                <TextInput
                  style={[styles.textInput, { flex: 1, marginLeft: 8 }]}
                  value={newIngredientAmount}
                  onChangeText={setNewIngredientAmount}
                  keyboardType="numeric"
                  placeholder="Menge"
                />
                <TextInput
                  style={[styles.textInput, { flex: 1, marginLeft: 8 }]}
                  value={newIngredientUnit}
                  onChangeText={setNewIngredientUnit}
                  placeholder="Einheit"
                />
                <TouchableOpacity
                  style={styles.addIngredientButton}
                  onPress={addIngredient}
                >
                  <Plus color="#FFFFFF" size={16} />
                </TouchableOpacity>
              </View>
            </View>

            {recipeIngredients.length > 0 && (
              <View style={styles.ingredientsList}>
                {recipeIngredients.map((ingredient) => (
                  <View key={ingredient.id} style={styles.ingredientItem}>
                    <View style={styles.ingredientInfo}>
                      <Text style={styles.ingredientName}>
                        {ingredient.amount} {ingredient.unit} {ingredient.name}
                      </Text>
                      <Text style={styles.ingredientNutrition}>
                        {ingredient.calories} kcal • P: {ingredient.protein}g • K: {ingredient.carbs}g • F: {ingredient.fat}g
                      </Text>
                    </View>
                    <TouchableOpacity
                      style={styles.removeIngredientButton}
                      onPress={() => removeIngredient(ingredient.id)}
                    >
                      <Trash2 color="#EF4444" size={16} />
                    </TouchableOpacity>
                  </View>
                ))}
                
                <View style={styles.recipeTotals}>
                  <Text style={styles.recipeTotalsTitle}>Gesamt ({newRecipeServings} Portionen):</Text>
                  <Text style={styles.recipeTotalsText}>
                    {recipeIngredients.reduce((sum, ing) => sum + ing.calories, 0)} kcal • P: {Math.round(recipeIngredients.reduce((sum, ing) => sum + ing.protein, 0) * 10) / 10}g • K: {Math.round(recipeIngredients.reduce((sum, ing) => sum + ing.carbs, 0) * 10) / 10}g • F: {Math.round(recipeIngredients.reduce((sum, ing) => sum + ing.fat, 0) * 10) / 10}g
                  </Text>
                  <Text style={styles.recipePerServing}>
                    Pro Portion: {Math.round(recipeIngredients.reduce((sum, ing) => sum + ing.calories, 0) / (parseInt(newRecipeServings) || 1))} kcal
                  </Text>
                </View>
              </View>
            )}

            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Zubereitung (optional)</Text>
              <TextInput
                style={[styles.textInput, styles.textArea]}
                value={recipeInstructions}
                onChangeText={setRecipeInstructions}
                placeholder="Beschreibe die Zubereitung..."
                multiline
                numberOfLines={4}
              />
            </View>
          </ScrollView>
        </View>
      </Modal>
      
      {/* Meal Details Modal */}
      <Modal
        visible={showMealDetailsModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowMealDetailsModal(false)}>
              <Text style={styles.cancelButton}>Schließen</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Mahlzeit Details</Text>
            <View style={{ width: 60 }} />
          </View>
          
          {selectedMealForDetails && (
            <ScrollView style={styles.modalContent}>
              <View style={styles.mealDetailsCard}>
                <Text style={styles.mealDetailsName}>{selectedMealForDetails.name}</Text>
                <Text style={styles.mealDetailsTime}>{selectedMealForDetails.time}</Text>
                
                <View style={styles.nutritionGrid}>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>{selectedMealForDetails.calories}</Text>
                    <Text style={styles.nutritionLabel}>Kalorien</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>{Math.round(selectedMealForDetails.protein * 10) / 10}g</Text>
                    <Text style={styles.nutritionLabel}>Eiweiß</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>{Math.round(selectedMealForDetails.carbs * 10) / 10}g</Text>
                    <Text style={styles.nutritionLabel}>Kohlenhydrate</Text>
                  </View>
                  <View style={styles.nutritionItem}>
                    <Text style={styles.nutritionValue}>{Math.round(selectedMealForDetails.fat * 10) / 10}g</Text>
                    <Text style={styles.nutritionLabel}>Fett</Text>
                  </View>
                </View>
                
                {selectedMealForDetails.isFromCalendar && selectedMealForDetails.originalMeal?.foods && (
                  <View style={styles.foodsList}>
                    <Text style={styles.foodsListTitle}>Lebensmittel:</Text>
                    {selectedMealForDetails.originalMeal.foods.map((food: any, index: number) => (
                      <TouchableOpacity 
                        key={food.id || index} 
                        style={styles.foodItem}
                        onPress={() => {
                          // Could add individual food details here
                        }}
                      >
                        <View style={styles.foodInfo}>
                          <Text style={styles.foodName}>{food.name}</Text>
                          <Text style={styles.foodPortion}>{food.portion.name} ({food.portion.grams}g)</Text>
                        </View>
                        <Text style={styles.foodCalories}>{food.nutrition.calories} kcal</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
          )}
        </View>
      </Modal>
      
      {/* Food Database Modal with Tabs */}
      <Modal
        visible={showFoodDatabaseModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => setShowFoodDatabaseModal(false)}>
              <Text style={styles.cancelButton}>Schließen</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Datenbank</Text>
            <View style={{ width: 60 }} />
          </View>
          
          {/* Tab Navigation */}
          <View style={styles.tabNavigation}>
            <TouchableOpacity 
              style={[styles.tabButton, foodDatabaseTab === 'foods' && styles.activeTabButton]}
              onPress={() => setFoodDatabaseTab('foods')}
            >
              <Text style={[styles.tabButtonText, foodDatabaseTab === 'foods' && styles.activeTabButtonText]}>
                Lebensmittel
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[styles.tabButton, foodDatabaseTab === 'recipes' && styles.activeTabButton]}
              onPress={() => setFoodDatabaseTab('recipes')}
            >
              <Text style={[styles.tabButtonText, foodDatabaseTab === 'recipes' && styles.activeTabButtonText]}>
                Gerichte
              </Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.foodDatabaseContainer}>
            {foodDatabaseTab === 'foods' ? (
              // Foods Tab Content
              isLoading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Lade Lebensmittel-Datenbank...</Text>
                </View>
              ) : (
                <ScrollView showsVerticalScrollIndicator={false}>
                  <Text style={styles.foodDatabaseStats}>
                    {allFoods.length} Lebensmittel in der Datenbank
                  </Text>
                  
                  {allFoods.length === 0 ? (
                    <View style={styles.noResultsContainer}>
                      <Text style={styles.noResultsText}>Keine Lebensmittel gefunden</Text>
                      <Text style={styles.noResultsSubtext}>Füge Lebensmittel über den Chat oder die Suche hinzu</Text>
                    </View>
                  ) : (
                    (() => {
                      // Group foods by category
                      const groupedFoods = allFoods.reduce((acc: any, food: any) => {
                        const category = food.category || 'other';
                        if (!acc[category]) {
                          acc[category] = [];
                        }
                        acc[category].push(food);
                        return acc;
                      }, {});
                      
                      const categoryNames: Record<string, string> = {
                        fruit: 'Obst',
                        vegetable: 'Gemüse',
                        meat: 'Fleisch & Fisch',
                        dairy: 'Milchprodukte',
                        grain: 'Getreide & Brot',
                        snack: 'Snacks',
                        beverage: 'Getränke',
                        other: 'Sonstiges'
                      };
                      
                      return Object.entries(groupedFoods).map(([category, categoryFoods]: [string, any]) => (
                        <View key={category} style={styles.categorySection}>
                          <Text style={styles.categoryTitle}>{categoryNames[category] || category}</Text>
                          <Text style={styles.categoryCount}>{categoryFoods.length} Lebensmittel</Text>
                          
                          {categoryFoods.map((food: any) => (
                            <TouchableOpacity 
                              key={food.id} 
                              style={styles.foodDatabaseItem}
                              onPress={() => {
                                // Add food to meal functionality
                                handleAddFoodFromDatabase(food);
                              }}
                            >
                              <View style={styles.foodDatabaseInfo}>
                                <Text style={styles.foodDatabaseName}>{food.name}</Text>
                                <Text style={styles.foodDatabaseNutrition}>
                                  {food.nutritionPer100g.calories} kcal/100g • P: {food.nutritionPer100g.protein}g • K: {food.nutritionPer100g.carbs}g • F: {food.nutritionPer100g.fat}g
                                </Text>
                                {food.commonPortions && food.commonPortions.length > 0 && (
                                  <Text style={styles.foodDatabasePortions}>
                                    Portionen: {food.commonPortions.map((p: any) => p.name).join(', ')}
                                  </Text>
                                )}
                                {food.aliases && food.aliases.length > 0 && (
                                  <Text style={styles.foodDatabaseAliases}>
                                    Auch bekannt als: {food.aliases.join(', ')}
                                  </Text>
                                )}
                              </View>
                              <View style={styles.foodDatabaseBadge}>
                                <Text style={[styles.foodDatabaseBadgeText, { color: food.source === 'common' ? '#667eea' : '#10B981' }]}>
                                  {food.source === 'common' ? 'STD' : 'DB'}
                                </Text>
                              </View>
                            </TouchableOpacity>
                          ))}
                        </View>
                      ));
                    })()
                  )}
                </ScrollView>
              )
            ) : (
              // Recipes Tab Content
              <ScrollView showsVerticalScrollIndicator={false}>
                <Text style={styles.foodDatabaseStats}>
                  {recipes.length} Gerichte in der Datenbank
                </Text>
                
                {recipes.length === 0 ? (
                  <View style={styles.noResultsContainer}>
                    <Text style={styles.noResultsText}>Keine Gerichte gefunden</Text>
                    <Text style={styles.noResultsSubtext}>Erstelle Gerichte über den Chat oder füge Rezepte hinzu</Text>
                  </View>
                ) : (
                  recipes.map((recipe: any) => (
                    <TouchableOpacity 
                      key={recipe.id} 
                      style={styles.foodDatabaseItem}
                      onPress={() => {
                        // Add recipe to meal functionality
                        handleAddRecipeFromDatabase(recipe);
                      }}
                    >
                      <View style={styles.foodDatabaseInfo}>
                        <Text style={styles.foodDatabaseName}>{recipe.name}</Text>
                        <Text style={styles.foodDatabaseNutrition}>
                          {Math.round(recipe.totalCalories / recipe.servings)} kcal/Portion • {recipe.servings} Portionen
                        </Text>
                        {recipe.ingredients && recipe.ingredients.length > 0 && (
                          <Text style={styles.foodDatabasePortions}>
                            Zutaten: {recipe.ingredients.slice(0, 3).map((ing: any) => ing.name).join(', ')}
                            {recipe.ingredients.length > 3 && '...'}
                          </Text>
                        )}
                        {recipe.instructions && (
                          <Text style={styles.foodDatabaseAliases} numberOfLines={2}>
                            {recipe.instructions}
                          </Text>
                        )}
                      </View>
                      <View style={styles.foodDatabaseBadge}>
                        <Text style={[styles.foodDatabaseBadgeText, { color: '#667eea' }]}>RZ</Text>
                      </View>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
      
      {/* OpenFoodFacts Search Modal */}
      <Modal
        visible={showSearchModal}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <TouchableOpacity onPress={() => {
              console.log('Closing search modal manually');
              setShowSearchModal(false);
              setOffSearchQuery("");
              setSearchResults([]);
              setSelectedSearchFood(null);
              setSelectedSearchPortion(null);
              setCustomGrams("");
              setShowCustomGramsInput(false);
              
              // Clear search timeout
              if (searchTimeoutRef.current) {
                clearTimeout(searchTimeoutRef.current);
                searchTimeoutRef.current = null;
              }
            }}>
              <Text style={styles.cancelButton}>Abbrechen</Text>
            </TouchableOpacity>
            <Text style={styles.modalTitle}>Lebensmittel suchen</Text>
            <TouchableOpacity 
              onPress={handleAddSearchFood}
              disabled={!selectedSearchFood || (!selectedSearchPortion && !showCustomGramsInput) || (showCustomGramsInput && (!customGrams || isNaN(parseFloat(customGrams)) || parseFloat(customGrams) <= 0))}
            >
              <Text style={[
                styles.saveButton,
                { opacity: (selectedSearchFood && (selectedSearchPortion || (showCustomGramsInput && customGrams && !isNaN(parseFloat(customGrams)) && parseFloat(customGrams) > 0))) ? 1 : 0.5 }
              ]}>
                Hinzufügen
              </Text>
            </TouchableOpacity>
          </View>

          <View style={styles.searchContainer}>
            <Search color="#6B7280" size={20} />
            <TextInput
              style={styles.searchInput}
              placeholder="Lebensmittel in OpenFoodFacts suchen..."
              value={offSearchQuery}
              onChangeText={handleSearchInputChange}
              autoFocus
            />
          </View>
          
          {isSearching && (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Suche läuft...</Text>
            </View>
          )}
          
          {selectedSearchFood && (
            <View style={styles.portionSelector}>
              <View style={styles.portionSelectorHeader}>
                <Text style={styles.portionSelectorTitle}>Portion wählen:</Text>
                <TouchableOpacity 
                  style={styles.customGramsToggle}
                  onPress={() => {
                    setShowCustomGramsInput(!showCustomGramsInput);
                    if (!showCustomGramsInput) {
                      setSelectedSearchPortion(null);
                    } else {
                      setCustomGrams("");
                    }
                  }}
                >
                  <Text style={styles.customGramsToggleText}>
                    {showCustomGramsInput ? 'Vorgaben' : 'Eigene Menge'}
                  </Text>
                </TouchableOpacity>
              </View>
              
              {showCustomGramsInput ? (
                <View style={styles.customGramsContainer}>
                  <TextInput
                    style={styles.customGramsInput}
                    value={customGrams}
                    onChangeText={setCustomGrams}
                    placeholder="Gramm eingeben..."
                    keyboardType="numeric"
                    autoFocus
                  />
                  <Text style={styles.customGramsUnit}>g</Text>
                  {customGrams && !isNaN(parseFloat(customGrams)) && parseFloat(customGrams) > 0 && (
                    <Text style={styles.customGramsCalories}>
                      {Math.round(selectedSearchFood.nutritionPer100g.calories * parseFloat(customGrams) / 100)} kcal
                    </Text>
                  )}
                </View>
              ) : (
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.portionOptions}>
                  {selectedSearchFood.commonPortions.map((portion: any, index: number) => (
                    <TouchableOpacity
                      key={index}
                      style={[
                        styles.portionOption,
                        selectedSearchPortion?.name === portion.name && styles.selectedPortionOption
                      ]}
                      onPress={() => setSelectedSearchPortion(portion)}
                    >
                      <Text style={[
                        styles.portionOptionText,
                        selectedSearchPortion?.name === portion.name && styles.selectedPortionOptionText
                      ]}>
                        {portion.name}
                      </Text>
                      <Text style={[
                        styles.portionOptionSubtext,
                        selectedSearchPortion?.name === portion.name && styles.selectedPortionOptionSubtext
                      ]}>
                        {Math.round(selectedSearchFood.nutritionPer100g.calories * portion.grams / 100)} kcal
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}
            </View>
          )}

          <ScrollView style={styles.searchResultsList}>
            {/* Debug info - only show in development */}
            {__DEV__ && (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsSubtext}>Debug Info:</Text>
                <Text style={styles.noResultsSubtext}>Query: "{offSearchQuery}"</Text>
                <Text style={styles.noResultsSubtext}>Results: {searchResults.length}</Text>
                <Text style={styles.noResultsSubtext}>Searching: {isSearching ? 'Yes' : 'No'}</Text>
              </View>
            )}
            
            {searchResults.length === 0 && offSearchQuery.length > 0 && !isSearching && (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>Keine Ergebnisse gefunden</Text>
                <Text style={styles.noResultsSubtext}>Versuche einen anderen Suchbegriff</Text>
              </View>
            )}
            
            {offSearchQuery.length === 0 && (
              <View style={styles.noResultsContainer}>
                <Text style={styles.noResultsText}>OpenFoodFacts Suche</Text>
                <Text style={styles.noResultsSubtext}>Gib einen Suchbegriff ein um Lebensmittel zu finden</Text>
                {__DEV__ && (
                  <TouchableOpacity 
                    style={[styles.addButton, { marginTop: 16 }]}
                    onPress={() => {
                      console.log('Testing search with "apfel"...');
                      searchOpenFoodFacts('apfel');
                    }}
                  >
                    <Text style={{ color: 'white', fontSize: 12 }}>Test Suche</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
            
            {searchResults.map((food, index) => (
              <TouchableOpacity
                key={food.id || index}
                style={[
                  styles.searchResultItem,
                  selectedSearchFood?.id === food.id && styles.selectedSearchResultItem
                ]}
                onPress={() => {
                  console.log('Selected food:', food);
                  setSelectedSearchFood(food);
                  setSelectedSearchPortion(null); // Reset portion selection
                  setCustomGrams(""); // Reset custom grams
                  
                  if (!showCustomGramsInput && food.commonPortions && food.commonPortions.length > 0) {
                    setSelectedSearchPortion(food.commonPortions[0]); // Select first portion by default
                  }
                }}
              >
                <View style={styles.searchResultInfo}>
                  <Text style={styles.searchResultName}>{food.name}</Text>
                  <Text style={styles.searchResultCategory}>{food.category}</Text>
                  <Text style={styles.searchResultNutrition}>
                    {food.nutritionPer100g.calories} kcal/100g • P: {food.nutritionPer100g.protein}g • K: {food.nutritionPer100g.carbs}g • F: {food.nutritionPer100g.fat}g
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  headerTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  selectedDateDisplay: {
    alignItems: "center",
    justifyContent: "center",
  },
  selectedDateText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    textAlign: "center",
    flex: 1,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
  },
  caloriesSummary: {
    flexDirection: "row",
    alignItems: "center",
  },
  caloriesText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#EF4444",
    marginLeft: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  mealsSection: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
  },
  addButton: {
    backgroundColor: "#667eea",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  emptyState: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 40,
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
  mealCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  mealHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  mealName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  mealCalories: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#EF4444",
  },
  mealDetails: {
    flexDirection: "row",
    alignItems: "center",
  },
  mealTime: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 4,
  },
  mealPortion: {
    fontSize: 14,
    color: "#6B7280",
    marginLeft: 8,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#FFFFFF",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  cancelButton: {
    fontSize: 16,
    color: "#6B7280",
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  saveButton: {
    fontSize: 16,
    fontWeight: "600",
    color: "#667eea",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    marginLeft: 12,
    color: "#111827",
  },
  foodList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  foodItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
  },
  selectedFoodItem: {
    backgroundColor: "rgba(102, 126, 234, 0.1)",
    borderWidth: 2,
    borderColor: "#667eea",
  },
  foodInfo: {
    flex: 1,
  },
  foodName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  foodPortion: {
    fontSize: 14,
    color: "#6B7280",
  },
  foodCalories: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#EF4444",
  },
  headerButtons: {
    flexDirection: "row",
    gap: 8,
  },
  recipeButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#667eea",
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  searchButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#667eea",
    shadowColor: "#667eea",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  loadingContainer: {
    padding: 20,
    alignItems: "center",
  },
  loadingText: {
    fontSize: 16,
    color: "#6B7280",
  },
  portionSelector: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "rgba(102, 126, 234, 0.05)",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  portionSelectorTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 12,
  },
  portionOptions: {
    flexDirection: "row",
  },
  portionOption: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginRight: 12,
    borderWidth: 2,
    borderColor: "#E5E7EB",
    alignItems: "center",
    minWidth: 100,
  },
  selectedPortionOption: {
    borderColor: "#667eea",
    backgroundColor: "rgba(102, 126, 234, 0.1)",
  },
  portionOptionText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 4,
    textAlign: "center",
  },
  selectedPortionOptionText: {
    color: "#667eea",
  },
  portionOptionSubtext: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  selectedPortionOptionSubtext: {
    color: "#667eea",
  },
  portionSelectorHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  customGramsToggle: {
    backgroundColor: "#667eea",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  customGramsToggleText: {
    color: "#FFFFFF",
    fontSize: 12,
    fontWeight: "600",
  },
  customGramsContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: "#667eea",
  },
  customGramsInput: {
    flex: 1,
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    textAlign: "center",
  },
  customGramsUnit: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    marginLeft: 8,
  },
  customGramsCalories: {
    fontSize: 14,
    fontWeight: "600",
    color: "#667eea",
    marginLeft: 12,
  },
  searchResultsList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  noResultsContainer: {
    padding: 40,
    alignItems: "center",
  },
  noResultsText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
  searchResultItem: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedSearchResultItem: {
    backgroundColor: "rgba(102, 126, 234, 0.1)",
    borderColor: "#667eea",
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  searchResultCategory: {
    fontSize: 14,
    color: "#667eea",
    marginBottom: 4,
    textTransform: "capitalize",
  },
  searchResultNutrition: {
    fontSize: 12,
    color: "#6B7280",
  },
  servingsContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 16,
    backgroundColor: "rgba(102, 126, 234, 0.05)",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  servingsLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginRight: 12,
  },
  servingsInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    width: 60,
    textAlign: "center",
    marginRight: 12,
  },
  addRecipeButton: {
    backgroundColor: "#667eea",
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  addRecipeButtonText: {
    color: "#FFFFFF",
    fontSize: 14,
    fontWeight: "600",
  },
  recipeList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  emptyRecipes: {
    padding: 40,
    alignItems: "center",
  },
  emptyRecipesText: {
    fontSize: 18,
    fontWeight: "600",
    color: "#6B7280",
    textAlign: "center",
    marginBottom: 8,
  },
  emptyRecipesSubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
  recipeItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
  },
  selectedRecipeItem: {
    backgroundColor: "rgba(102, 126, 234, 0.1)",
    borderWidth: 2,
    borderColor: "#667eea",
  },
  recipeInfo: {
    flex: 1,
  },
  recipeName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  recipeDetails: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2,
  },
  recipeIngredients: {
    fontSize: 12,
    color: "#9CA3AF",
  },
  recipeActions: {
    flexDirection: "row",
    gap: 8,
  },
  deleteRecipeButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: "rgba(239, 68, 68, 0.1)",
  },
  createRecipeContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#D1D5DB",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    backgroundColor: "#FFFFFF",
  },
  textArea: {
    height: 100,
    textAlignVertical: "top",
  },
  addIngredientContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  addIngredientButton: {
    backgroundColor: "#667eea",
    borderRadius: 8,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    marginLeft: 8,
  },
  ingredientsList: {
    marginTop: 12,
  },
  ingredientItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 12,
    backgroundColor: "rgba(102, 126, 234, 0.05)",
    borderRadius: 8,
    marginBottom: 8,
  },
  ingredientInfo: {
    flex: 1,
  },
  ingredientName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 2,
  },
  ingredientNutrition: {
    fontSize: 12,
    color: "#6B7280",
  },
  removeIngredientButton: {
    padding: 4,
  },
  recipeTotals: {
    marginTop: 16,
    padding: 16,
    backgroundColor: "rgba(102, 126, 234, 0.1)",
    borderRadius: 12,
  },
  recipeTotalsTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#374151",
    marginBottom: 8,
  },
  recipeTotalsText: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 4,
  },
  recipePerServing: {
    fontSize: 14,
    fontWeight: "600",
    color: "#667eea",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  mealDetailsCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  mealDetailsName: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 8,
  },
  mealDetailsTime: {
    fontSize: 16,
    color: "#6B7280",
    marginBottom: 20,
  },
  nutritionGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "space-between",
    marginBottom: 20,
  },
  nutritionItem: {
    width: "48%",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginBottom: 12,
  },
  nutritionValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  nutritionLabel: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  foodsList: {
    marginTop: 20,
  },
  foodsListTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 12,
  },
  // Week Calendar Styles
  weekCalendar: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 16,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  weekHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  weekNavButton: {
    padding: 8,
    borderRadius: 25,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
  },
  weekTitleContainer: {
    alignItems: "center",
  },
  weekTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  weekSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  weekDays: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 8,
  },
  weekDayContainer: {
    alignItems: "center",
  },
  weekDayLabelOutside: {
    fontSize: 12,
    color: "rgba(107, 114, 128, 0.7)",
    marginBottom: 6,
    fontWeight: "500",
  },
  weekDayLabelTodayOutside: {
    color: "#6366F1",
    fontWeight: "bold",
  },
  weekDay: {
    alignItems: "center",
    justifyContent: "center",
    width: 32,
    height: 32,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: "transparent",
  },
  weekDayToday: {
    borderWidth: 1,
    borderColor: "#6366F1",
  },
  weekDaySelected: {
    borderWidth: 2,
    borderColor: "#6366F1",
  },
  weekDayNumber: {
    fontSize: 14,
    fontWeight: "600",
    color: "#374151",
  },
  weekDayNumberToday: {
    color: "#FFFFFF",
    fontWeight: "bold",
  },
  weekDayNumberSelected: {
    color: "#374151",
    fontWeight: "bold",
  },
  weekDayNumberEmpty: {
    color: "#374151",
    fontWeight: "normal",
  },
  foodDatabaseButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
    borderWidth: 2,
    borderColor: "#10B981",
    shadowColor: "#10B981",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  foodDatabaseContainer: {
    flex: 1,
    padding: 20,
  },
  foodDatabaseStats: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 20,
    textAlign: "center",
  },
  categorySection: {
    marginBottom: 24,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  categoryCount: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 12,
  },
  foodDatabaseItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    backgroundColor: "#F9FAFB",
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  foodDatabaseInfo: {
    flex: 1,
    marginRight: 12,
  },
  foodDatabaseName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  foodDatabaseNutrition: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  foodDatabasePortions: {
    fontSize: 11,
    color: "#9CA3AF",
    marginBottom: 2,
  },
  foodDatabaseAliases: {
    fontSize: 11,
    color: "#9CA3AF",
    fontStyle: "italic",
  },
  foodDatabaseBadge: {
    backgroundColor: "#FFFFFF",
    borderRadius: 8,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  foodDatabaseBadgeText: {
    fontSize: 10,
    fontWeight: "600",
  },
  // Tab Navigation Styles
  tabNavigation: {
    flexDirection: "row",
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    margin: 20,
    padding: 4,
  },
  tabButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: "center",
  },
  activeTabButton: {
    backgroundColor: "#FFFFFF",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  tabButtonText: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
  },
  activeTabButtonText: {
    color: "#111827",
  },
});