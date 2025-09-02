import React, { useState, useEffect } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  Modal,
} from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import { 
  ChevronLeft,
  ChevronRight,
  Droplets,
  Coffee,
  Utensils,
  Moon,
  Cookie,
  Plus,
  Minus,
  MessageCircle,
  ChevronDown,
  ChevronUp
} from "lucide-react-native";
import { useFitnessData, type Meal } from "@/hooks/fitness-store";
import { useDatabaseContext } from "@/hooks/database-store";
import { router } from "expo-router";
import Svg, { Circle } from 'react-native-svg';

const { width } = Dimensions.get('window');

export default function HomeScreen() {
  const { 
    selectedDate, 
    setSelectedDate, 
    weekData, 
    weeklyGoal, 
    getCurrentDayStats, 
    navigateWeek,
    getMealCaloriesByType,
    getMealsByType,
    updateWater
  } = useFitnessData();
  
  const { getCalendarEntry, updateWaterIntake } = useDatabaseContext();
  
  const [expandedMeals, setExpandedMeals] = useState<Record<string, boolean>>({});
  const [calendarMeals, setCalendarMeals] = useState<any[]>([]);
  const [selectedMealForDetails, setSelectedMealForDetails] = useState<any>(null);
  const [showMealDetailsModal, setShowMealDetailsModal] = useState<boolean>(false);

  const currentDay = getCurrentDayStats();
  const isToday = selectedDate === new Date().toISOString().split('T')[0];
  
  // Local rating calculation function
  const getRatingFromCalories = (calories: number, hasEntries: boolean): 'excellent' | 'good' | 'average' | 'poor' | 'empty' => {
    if (!hasEntries || calories === 0) return 'empty';
    const percentage = (calories / weeklyGoal.dailyCalories) * 100;
    if (percentage <= 105) return 'excellent';
    if (percentage <= 120) return 'good';
    if (percentage <= 130) return 'average';
    return 'poor';
  };
  
  // Load calendar meals for selected date and update week data
  useEffect(() => {
    const loadCalendarMeals = async () => {
      try {
        const result = await getCalendarEntry(selectedDate);
        if (result.success && result.entry) {
          setCalendarMeals(result.entry.meals || []);
          
          // Update the current day stats with calendar data
          const calendarCalories = result.entry.meals.reduce((sum: number, meal: any) => sum + meal.totalNutrition.calories, 0);
          const calendarProtein = result.entry.meals.reduce((sum: number, meal: any) => sum + meal.totalNutrition.protein, 0);
          const calendarCarbs = result.entry.meals.reduce((sum: number, meal: any) => sum + meal.totalNutrition.carbs, 0);
          const calendarFat = result.entry.meals.reduce((sum: number, meal: any) => sum + meal.totalNutrition.fat, 0);
          
          // Update the week data with combined values
          const updatedWeekData = { ...weekData };
          const dayIndex = updatedWeekData.days.findIndex(day => day.date === selectedDate);
          
          if (dayIndex !== -1) {
            const oldDay = updatedWeekData.days[dayIndex];
            const totalCalories = oldDay.calories + calendarCalories;
            const totalProtein = oldDay.protein + calendarProtein;
            const totalCarbs = oldDay.carbs + calendarCarbs;
            const totalFat = oldDay.fat + calendarFat;
            
            // Calculate rating based on total calories
            const hasEntries = oldDay.meals.length > 0 || result.entry.meals.length > 0;
            const rating = hasEntries ? getRatingFromCalories(totalCalories, hasEntries) : 'empty';
            
            updatedWeekData.days[dayIndex] = {
              ...oldDay,
              calories: totalCalories,
              protein: totalProtein,
              carbs: totalCarbs,
              fat: totalFat,
              water: Math.max(oldDay.water, result.entry.water || 0),
              rating
            };
            
            // Update the week data in the fitness store
            // Note: This is a temporary solution to sync the data
            // In a production app, you'd want a more robust state management solution
          }
        } else {
          setCalendarMeals([]);
        }
      } catch (error) {
        console.error('Error loading calendar meals:', error);
        setCalendarMeals([]);
      }
    };
    
    loadCalendarMeals();
  }, [selectedDate, getCalendarEntry, weekData]);
  
  const getProgressTitle = () => {
    const today = new Date().toISOString().split('T')[0];
    const selectedDateObj = new Date(selectedDate);
    const todayObj = new Date(today);
    
    if (selectedDate === today) {
      return "Heutiger Fortschritt";
    }
    
    const diffTime = todayObj.getTime() - selectedDateObj.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) {
      return "Gestriger Fortschritt";
    } else if (diffDays === 2) {
      return "Vorgestriger Fortschritt";
    } else if (diffDays > 2) {
      return "Fortschritt vom";
    } else if (diffDays === -1) {
      return "Morgiger Fortschritt";
    } else {
      return "Fortschritt vom";
    }
  };

  const ProgressRing = ({ 
    progress, 
    size, 
    strokeWidth, 
    color, 
    backgroundColor = "#F3F4F6",
    children 
  }: {
    progress: number;
    size: number;
    strokeWidth: number;
    color: string;
    backgroundColor?: string;
    children?: React.ReactNode;
  }) => {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const strokeDasharray = `${circumference} ${circumference}`;
    const strokeDashoffset = circumference - (progress / 100) * circumference;

    return (
      <View style={{ width: size, height: size, position: 'relative' }}>
        <Svg width={size} height={size} style={{ position: 'absolute' }}>
          <Circle
            stroke={backgroundColor}
            fill="transparent"
            strokeWidth={strokeWidth}
            r={radius}
            cx={size / 2}
            cy={size / 2}
          />
          <Circle
            stroke={color}
            fill="transparent"
            strokeWidth={strokeWidth}
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            strokeLinecap="round"
            r={radius}
            cx={size / 2}
            cy={size / 2}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        </Svg>
        <View style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          justifyContent: 'center',
          alignItems: 'center'
        }}>
          {children}
        </View>
      </View>
    );
  };

  const CalorieProgressRing = () => {
    // Calculate total calories from both systems
    const oldCalories = currentDay.calories;
    const newCalories = calendarMeals.reduce((sum: number, meal: any) => sum + meal.totalNutrition.calories, 0);
    const totalCalories = oldCalories + newCalories;
    
    const progress = (totalCalories / weeklyGoal.dailyCalories) * 100;
    
    return (
      <ProgressRing progress={progress} size={140} strokeWidth={10} color="#8B5CF6" backgroundColor="#F3F4F6">
        <View style={{ alignItems: 'center' }}>
          <Text style={styles.ringMainValue}>{totalCalories}</Text>
          <Text style={styles.ringUnit}>Gesamt</Text>
        </View>
      </ProgressRing>
    );
  };

  const MacroRing = ({ 
    label, 
    current, 
    goal, 
    unit, 
    color,
    macroType 
  }: {
    label: string;
    current: number;
    goal: number;
    unit: string;
    color: string;
    macroType: 'protein' | 'carbs' | 'fat';
  }) => {
    // Add calendar nutrition to current values
    const calendarNutrition = calendarMeals.reduce((sum: number, meal: any) => {
      switch (macroType) {
        case 'protein': return sum + meal.totalNutrition.protein;
        case 'carbs': return sum + meal.totalNutrition.carbs;
        case 'fat': return sum + meal.totalNutrition.fat;
        default: return sum;
      }
    }, 0);
    
    const totalCurrent = current + calendarNutrition;
    const progress = (totalCurrent / goal) * 100;
    
    return (
      <View style={styles.macroContainer}>
        <ProgressRing progress={progress} size={80} strokeWidth={6} color={color}>
          <View style={{ alignItems: 'center' }}>
            <Text style={styles.macroValue}>{Math.round(totalCurrent)}</Text>
            <Text style={styles.macroUnit}>{unit}</Text>
          </View>
        </ProgressRing>
        <Text style={styles.macroLabel}>{label}</Text>
        <Text style={styles.macroGoal}>Ziel: {goal}{unit}</Text>
      </View>
    );
  };

  const WeekCalendar = () => {
    const weekDays = ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'];
    const currentDate = new Date();
    const todayString = currentDate.toISOString().split('T')[0];
    
    // Calculate the correct week number (KW) according to ISO 8601
    const getWeekNumber = (date: Date): number => {
      // Create a copy of the date to avoid modifying the original
      const d = new Date(date.getTime());
      
      // Set to nearest Thursday: current date + 4 - current day number
      // Make Sunday's day number 7
      const dayNum = d.getDay() || 7;
      d.setDate(d.getDate() + 4 - dayNum);
      
      // Get first day of year
      const yearStart = new Date(d.getFullYear(), 0, 1);
      
      // Get the first Thursday of the year
      const firstThursdayDayNum = yearStart.getDay() || 7;
      const firstThursday = new Date(d.getFullYear(), 0, 1 + (4 - firstThursdayDayNum));
      
      // Calculate full weeks from first Thursday
      const weekNumber = Math.floor((d.getTime() - firstThursday.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
      
      // Debug logging
      console.log('Week calculation for date:', date.toISOString().split('T')[0]);
      console.log('Day of week:', dayNum, 'Adjusted date (Thursday):', d.toISOString().split('T')[0]);
      console.log('First Thursday of year:', firstThursday.toISOString().split('T')[0]);
      console.log('Calculated week number:', weekNumber);
      
      return weekNumber;
    };
    
    // Get the week start date from weekData and calculate week number for displayed week
    const weekStartDate = new Date(weekData.startDate);
    // Use the middle of the displayed week (Wednesday) for accurate week number calculation
    const midWeekDate = new Date(weekStartDate);
    midWeekDate.setDate(weekStartDate.getDate() + 3); // Wednesday of the displayed week
    const weekNumber = getWeekNumber(midWeekDate);
    const year = midWeekDate.getFullYear();
    
    // Check if we're viewing the current week
    const isCurrentWeek = weekData.days.some(day => day.date === todayString);
    
    // Update week title based on whether we're viewing current week or not
    const weekTitle = isCurrentWeek ? "Diese Woche" : "Woche";
    
    const getRatingColor = (rating: string) => {
      switch (rating) {
        case 'excellent': return 'rgba(34, 197, 94, 0.7)'; // Green - up to 5% over
        case 'good': return 'rgba(234, 179, 8, 0.7)'; // Yellow - up to 20% over
        case 'average': return 'rgba(249, 115, 22, 0.7)'; // Orange - up to 30% over
        case 'poor': return 'rgba(239, 68, 68, 0.7)'; // Red - over 40%
        case 'empty': return 'rgba(156, 163, 175, 0.3)'; // Transparent gray
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

  const WaterTracker = () => {
    const progress = (currentDay.water / weeklyGoal.dailyWater) * 100;
    const remaining = Math.max(0, weeklyGoal.dailyWater - currentDay.water);
    
    const addWater = async () => {
      try {
        await updateWater(0.25); // Add 250ml
        await updateWaterIntake(selectedDate, 0.25); // Also update in calendar database
      } catch (error) {
        console.log('Error adding water:', error);
      }
    };
    
    const removeWater = async () => {
      try {
        await updateWater(-0.25); // Remove 250ml
        await updateWaterIntake(selectedDate, -0.25); // Also update in calendar database
      } catch (error) {
        console.log('Error removing water:', error);
      }
    };
    
    return (
      <View style={styles.waterTracker}>
        <View style={styles.waterHeader}>
          <View style={styles.waterInfo}>
            <Droplets color="#06B6D4" size={20} />
            <Text style={styles.waterTitle}>Wasser Tracker</Text>
          </View>
        </View>
        <View style={styles.waterDisplay}>
          <View style={styles.waterProgressRow}>
            <ProgressRing progress={progress} size={60} strokeWidth={5} color="#06B6D4" backgroundColor="#F3F4F6">
              <View style={{ alignItems: 'center' }}>
                <Text style={styles.waterCurrentValue}>{currentDay.water.toFixed(1)}L</Text>
              </View>
            </ProgressRing>
            <View style={styles.waterInfo2}>
              <Text style={styles.waterGoalText}>Ziel: {weeklyGoal.dailyWater.toFixed(1)}L</Text>
              <Text style={styles.waterRemainingText}>Noch {remaining.toFixed(1)}L</Text>
            </View>
            <View style={styles.waterControls}>
              <TouchableOpacity 
                style={[styles.waterButton, currentDay.water <= 0 && styles.waterButtonDisabled]}
                onPress={removeWater}
                disabled={currentDay.water <= 0}
              >
                <Minus color="#FFFFFF" size={16} />
              </TouchableOpacity>
              <TouchableOpacity 
                style={styles.waterButton}
                onPress={addWater}
              >
                <Plus color="#FFFFFF" size={16} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const toggleMealExpansion = (mealType: string) => {
    setExpandedMeals(prev => ({
      ...prev,
      [mealType]: !prev[mealType]
    }));
  };

  const MealCard = ({ 
    title, 
    icon: Icon, 
    mealType, 
    color 
  }: {
    title: string;
    icon: any;
    mealType: 'breakfast' | 'lunch' | 'dinner' | 'snack';
    color: string;
  }) => {
    // Get meals from both old and new system
    const oldMeals = getMealsByType(mealType);
    const newMeals = calendarMeals.filter(meal => meal.mealType === mealType);
    
    // Combine meals from both systems
    const allMeals = [...oldMeals, ...newMeals.map(meal => ({
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
    }))];
    
    const calories = allMeals.reduce((sum, meal) => sum + meal.calories, 0);
    const isExpanded = expandedMeals[mealType] || false;
    const showExpandButton = allMeals.length > 3;
    const visibleMeals = isExpanded ? allMeals : allMeals.slice(0, 3);
    
    const handleMealPress = (meal: any) => {
      setSelectedMealForDetails(meal);
      setShowMealDetailsModal(true);
    };
    
    return (
      <View style={styles.mealCard}>
        <View style={styles.mealHeader}>
          <View style={styles.mealTitleRow}>
            <View style={[styles.mealColorBar, { backgroundColor: color }]} />
            <Text style={styles.mealTitle}>{title}</Text>
            <Text style={styles.mealCalories}>{calories} kcal</Text>
          </View>
        </View>
        
        {allMeals.length > 0 ? (
          <View style={styles.mealItemsList}>
            {visibleMeals.map((meal: any, index: number) => (
              <TouchableOpacity 
                key={meal.id} 
                style={styles.mealItem}
                onPress={() => handleMealPress(meal)}
              >
                <View style={styles.mealItemContent}>
                  <Text style={styles.mealItemName}>{meal.name}</Text>
                  <Text style={styles.mealItemPortion}>{meal.portion}</Text>
                </View>
                <Text style={styles.mealItemCalories}>{meal.calories} kcal</Text>
              </TouchableOpacity>
            ))}
            {showExpandButton && (
              <TouchableOpacity 
                style={styles.expandButton}
                onPress={() => toggleMealExpansion(mealType)}
              >
                {isExpanded ? (
                  <ChevronUp color="#6366F1" size={16} />
                ) : (
                  <ChevronDown color="#6366F1" size={16} />
                )}
                <Text style={styles.expandButtonText}>
                  {isExpanded 
                    ? 'Weniger anzeigen' 
                    : `+${allMeals.length - 3} weitere anzeigen`
                  }
                </Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          <TouchableOpacity 
            style={styles.addFoodButton}
            onPress={() => router.push('/chat')}
          >
            <Plus color="#2563EB" size={16} />
            <Text style={styles.addFoodText}>Lebensmittel hinzufügen</Text>
          </TouchableOpacity>
        )}
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={["#6366F1", "#8B5CF6"]}
        style={styles.header}
      >
        <Text style={styles.greeting}>{getProgressTitle()}</Text>
        <Text style={styles.date}>
          {new Date(selectedDate).toLocaleDateString("de-DE", {
            weekday: "long",
            day: "numeric",
            month: "long",
          })}
        </Text>
      </LinearGradient>

      <ScrollView style={styles.scrollContent} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <View style={styles.progressSection}>
            <View style={styles.mainProgressRow}>
              <View style={styles.calorieSection}>
                <CalorieProgressRing />
              </View>
              <View style={styles.remainingSection}>
                <Text style={styles.remainingValue}>{Math.max(0, weeklyGoal.dailyCalories - (currentDay.calories + calendarMeals.reduce((sum: number, meal: any) => sum + meal.totalNutrition.calories, 0)))}</Text>
                <Text style={styles.remainingLabel}>verbleibend</Text>
              </View>
            </View>
            
            <View style={styles.macroSection}>
              <MacroRing
                label="Eiweiß"
                current={currentDay.protein}
                goal={weeklyGoal.dailyProtein}
                unit="g"
                color="#10B981"
                macroType="protein"
              />
              <MacroRing
                label="Kohlenhydrate"
                current={currentDay.carbs}
                goal={weeklyGoal.dailyCarbs}
                unit="g"
                color="#F59E0B"
                macroType="carbs"
              />
              <MacroRing
                label="Fett"
                current={currentDay.fat}
                goal={weeklyGoal.dailyFat}
                unit="g"
                color="#EF4444"
                macroType="fat"
              />
            </View>
          </View>

          <WeekCalendar />

          <WaterTracker />

          <View style={styles.mealsSection}>
            <Text style={styles.sectionTitle}>Mahlzeiten</Text>
            <MealCard
              title="Frühstück"
              icon={Coffee}
              mealType="breakfast"
              color="#EF4444"
            />
            <MealCard
              title="Mittagessen"
              icon={Utensils}
              mealType="lunch"
              color="#06B6D4"
            />
            <MealCard
              title="Abendessen"
              icon={Moon}
              mealType="dinner"
              color="#06B6D4"
            />
            <MealCard
              title="Snacks"
              icon={Cookie}
              mealType="snack"
              color="#F59E0B"
            />
          </View>
        </View>
      </ScrollView>
      
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
                      <View key={food.id || index} style={styles.foodItem}>
                        <View style={styles.foodInfo}>
                          <Text style={styles.foodName}>{food.name}</Text>
                          <Text style={styles.foodPortion}>{food.portion.name} ({food.portion.grams}g)</Text>
                        </View>
                        <Text style={styles.foodCalories}>{food.nutrition.calories} kcal</Text>
                      </View>
                    ))}
                  </View>
                )}
              </View>
            </ScrollView>
          )}
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
    paddingBottom: 30,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
    position: 'absolute' as const,
    top: 0,
    left: 0,
    right: 0,
    zIndex: 1000,
  },
  scrollContent: {
    flex: 1,
    marginTop: 140,
  },
  greeting: {
    fontSize: 28,
    fontWeight: "bold" as const,
    color: "#FFFFFF",
    marginBottom: 4,
  },
  date: {
    fontSize: 16,
    color: "#FFFFFF",
    opacity: 0.9,
  },
  content: {
    padding: 20,
    paddingTop: 0,
  },
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
  weekTitle: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "#111827",
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
    fontWeight: "500" as const,
  },
  weekDayLabelTodayOutside: {
    color: "#6366F1",
    fontWeight: "bold" as const,
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
  weekDayContent: {
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
    flex: 1,
  },
  weekDayIcon: {
    fontSize: 12,
    color: "rgba(99, 102, 241, 0.9)",
    fontWeight: "bold" as const,
    marginTop: 2,
  },
  weekDayNumberEmpty: {
    color: "#374151",
    fontWeight: "normal" as const,
  },

  weekDayLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginBottom: 4,
  },
  weekDayLabelSelected: {
    color: "#111827",
    fontWeight: "600" as const,
  },
  weekDayNumber: {
    fontSize: 14,
    fontWeight: "600" as const,
    color: "#374151",
  },

  progressSection: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  calorieSection: {
    alignItems: "center",
  },
  ringMainValue: {
    fontSize: 32,
    fontWeight: "bold" as const,
    color: "#111827",
  },
  ringUnit: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: -4,
  },
  ringRemaining: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 4,
  },
  macroSection: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  macroContainer: {
    alignItems: "center",
  },
  macroValue: {
    fontSize: 16,
    fontWeight: "bold" as const,
    color: "#111827",
  },
  macroUnit: {
    fontSize: 10,
    color: "#6B7280",
  },
  macroLabel: {
    fontSize: 12,
    fontWeight: "600" as const,
    color: "#111827",
    marginTop: 8,
    textAlign: "center" as const,
  },
  macroGoal: {
    fontSize: 10,
    color: "#6B7280",
    marginTop: 2,
    textAlign: "center" as const,
  },
  waterTracker: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  waterHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  waterInfo: {
    flexDirection: "row",
    alignItems: "center",
  },
  waterTitle: {
    fontSize: 16,
    fontWeight: "bold" as const,
    color: "#111827",
    marginLeft: 8,
  },
  waterAmount: {
    fontSize: 16,
    fontWeight: "600" as const,
    color: "rgba(99, 102, 241, 0.9)",
  },
  waterDisplay: {
    alignItems: "center",
  },
  waterNote: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 12,
    textAlign: "center" as const,
    fontStyle: "italic" as const,
  },
  waterGlasses: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 4,
  },
  waterGlass: {
    width: 12,
    height: 16,
    backgroundColor: "#E5E7EB",
    borderRadius: 2,
  },
  waterGlassFilled: {
    backgroundColor: "rgba(99, 102, 241, 0.7)",
  },
  waterControls: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
  },
  waterButton: {
    backgroundColor: "#06B6D4",
    borderRadius: 20,
    width: 36,
    height: 36,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#06B6D4",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  waterButtonDisabled: {
    backgroundColor: "#9CA3AF",
    shadowOpacity: 0,
    elevation: 0,
  },

  mealsSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 24,
    fontWeight: "bold" as const,
    color: "#111827",
    marginBottom: 20,
  },
  mealCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  mealTitle: {
    fontSize: 20,
    fontWeight: "bold" as const,
    color: "#111827",
    flex: 1,
    marginLeft: 12,
  },
  mealContent: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 12,
  },
  mealInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  mealCaloriesContainer: {
    flex: 1,
    alignItems: "flex-end",
  },
  mealCalories: {
    fontSize: 16,
    fontWeight: "bold" as const,
    color: "rgba(99, 102, 241, 0.9)",
  },
  mealSubtitle: {
    fontSize: 12,
    color: "#6B7280",
  },
  // New styles for updated design
  mainProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  },
  remainingSection: {
    alignItems: "center",
  },
  remainingValue: {
    fontSize: 32,
    fontWeight: "bold" as const,
    color: "#6366F1",
  },
  remainingLabel: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 4,
  },
  weekTitleContainer: {
    alignItems: "center",
  },
  weekSubtitle: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  weekDayToday: {
    borderWidth: 3,
    borderColor: "#6366F1",
  },
  weekDaySelected: {
    borderWidth: 2,
    borderColor: "#6366F1",
  },
  weekDayLabelToday: {
    color: "#6366F1",
    fontWeight: "bold" as const,
  },
  weekDayNumberToday: {
    color: "#374151",
    fontWeight: "bold" as const,
  },
  weekDayNumberSelected: {
    color: "#374151",
    fontWeight: "bold" as const,
  },
  waterProgressRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  waterCurrentValue: {
    fontSize: 12,
    fontWeight: "bold" as const,
    color: "#111827",
  },
  waterInfo2: {
    flex: 1,
    paddingHorizontal: 12,
  },
  waterGoalText: {
    fontSize: 13,
    color: "#111827",
    fontWeight: "600" as const,
  },
  waterRemainingText: {
    fontSize: 11,
    color: "#06B6D4",
    marginTop: 2,
  },
  mealColorBar: {
    width: 4,
    height: 24,
    borderRadius: 2,
  },
  addFoodButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "transparent",
    paddingHorizontal: 0,
    paddingVertical: 8,
    alignSelf: "flex-start",
  },
  addFoodText: {
    fontSize: 16,
    color: "#2563EB",
    marginLeft: 8,
    fontWeight: "500" as const,
  },
  mealHeader: {
    marginBottom: 16,
  },
  mealTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  mealItemsList: {
    marginTop: 12,
  },
  mealItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginBottom: 6,
  },
  mealItemContent: {
    flex: 1,
  },
  mealItemName: {
    fontSize: 14,
    color: "#374151",
    fontWeight: "600",
  },
  mealItemPortion: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  mealItemCalories: {
    fontSize: 14,
    fontWeight: "600",
    color: "#6B7280",
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
  foodItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginBottom: 8,
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
  mealItemsMore: {
    fontSize: 12,
    color: "#9CA3AF",
    fontStyle: "italic",
    textAlign: "center",
    marginTop: 4,
  },
  expandButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    backgroundColor: "rgba(99, 102, 241, 0.1)",
    borderRadius: 8,
  },
  expandButtonText: {
    fontSize: 14,
    color: "#6366F1",
    marginLeft: 4,
    fontWeight: "500" as const,
  },
});