import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
} from "react-native";
import { Plus, Clock, Flame, Activity, Target, TrendingUp, Scale, Zap } from "lucide-react-native";
import { useFitnessData } from "@/hooks/fitness-store";
import { router } from "expo-router";

export default function FitnessScreen() {
  const { todayWorkouts, addWorkout, userProfile, fitnessPlans } = useFitnessData();
  const [showAddModal, setShowAddModal] = useState(false);
  const [selectedWorkout, setSelectedWorkout] = useState("");
  const [duration, setDuration] = useState("");
  
  const handleCreateFitnessPlan = () => {
    // Navigate to chat with fitness plan parameter
    router.push('/chat?fitnessplan=true');
  };

  const workoutTypes = [
    { name: "Laufen", calories: 300, icon: "🏃‍♂️" },
    { name: "Radfahren", calories: 250, icon: "🚴‍♂️" },
    { name: "Krafttraining", calories: 200, icon: "🏋️‍♂️" },
    { name: "Yoga", calories: 150, icon: "🧘‍♀️" },
    { name: "Schwimmen", calories: 400, icon: "🏊‍♂️" },
    { name: "Walking", calories: 150, icon: "🚶‍♂️" },
    { name: "HIIT", calories: 350, icon: "💪" },
    { name: "Pilates", calories: 180, icon: "🤸‍♀️" },
  ];

  const handleAddWorkout = () => {
    if (selectedWorkout && duration) {
      const workout = workoutTypes.find(w => w.name === selectedWorkout);
      if (workout) {
        const durationNum = parseInt(duration);
        const caloriesBurned = Math.round((workout.calories * durationNum) / 60);
        
        addWorkout({
          id: Date.now().toString(),
          name: workout.name,
          duration: durationNum,
          calories: caloriesBurned,
          time: new Date().toLocaleTimeString("de-DE", { 
            hour: "2-digit", 
            minute: "2-digit" 
          }),
          icon: workout.icon,
        });
        
        setShowAddModal(false);
        setSelectedWorkout("");
        setDuration("");
      }
    }
  };

  const totalCaloriesBurned = todayWorkouts.reduce((sum, workout) => sum + workout.calories, 0);
  const totalDuration = todayWorkouts.reduce((sum, workout) => sum + workout.duration, 0);

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Fitness</Text>
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Flame color="#EF4444" size={16} />
            <Text style={styles.statText}>{totalCaloriesBurned} kcal</Text>
          </View>
          <View style={styles.statItem}>
            <Clock color="#3B82F6" size={16} />
            <Text style={styles.statText}>{totalDuration} min</Text>
          </View>
        </View>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.weightSection}>
          <Text style={styles.sectionTitle}>Gewichtstracker</Text>
          <View style={styles.weightWidget}>
            <View style={styles.weightHeader}>
              <Scale color="#3B82F6" size={24} />
              <View style={styles.weightInfo}>
                <Text style={styles.currentWeight}>{userProfile.weight} kg</Text>
                <Text style={styles.weightLabel}>Aktuelles Gewicht</Text>
              </View>
              <View style={styles.targetInfo}>
                <Text style={styles.targetWeight}>{userProfile.targetWeight} kg</Text>
                <Text style={styles.weightLabel}>Zielgewicht</Text>
              </View>
            </View>
            
            <View style={styles.weightChart}>
              <View style={styles.chartContainer}>
                <TrendingUp color="#10B981" size={20} />
                <Text style={styles.chartText}>Gewichtsverlauf (Liniendiagramm)</Text>
              </View>
              
              {userProfile.weightHistory && userProfile.weightHistory.length > 0 ? (
                <View style={styles.lineChartContainer}>
                  <View style={styles.lineChart}>
                    {/* Simple line chart visualization */}
                    <View style={styles.chartYAxis}>
                      <Text style={styles.axisLabel}>{Math.max(...userProfile.weightHistory.map(e => e.weight))} kg</Text>
                      <Text style={styles.axisLabel}>{Math.min(...userProfile.weightHistory.map(e => e.weight))} kg</Text>
                    </View>
                    <View style={styles.chartArea}>
                      <View style={styles.chartLine} />
                      {userProfile.weightHistory.slice(-7).map((entry, index) => {
                        const maxWeight = Math.max(...userProfile.weightHistory!.map(e => e.weight));
                        const minWeight = Math.min(...userProfile.weightHistory!.map(e => e.weight));
                        const range = maxWeight - minWeight || 1;
                        const position = ((entry.weight - minWeight) / range) * 100;
                        
                        return (
                          <View key={entry.date} style={[
                            styles.chartPoint,
                            { bottom: `${position}%`, left: `${(index / 6) * 100}%` }
                          ]} />
                        );
                      })}
                    </View>
                  </View>
                  <View style={styles.chartXAxis}>
                    {userProfile.weightHistory.slice(-7).map((entry, index) => (
                      <Text key={entry.date} style={styles.axisDateLabel}>
                        {new Date(entry.date).toLocaleDateString('de-DE', { 
                          day: '2-digit', 
                          month: '2-digit' 
                        })}
                      </Text>
                    ))}
                  </View>
                </View>
              ) : (
                <View style={styles.noChartData}>
                  <TrendingUp color="#9CA3AF" size={48} />
                  <Text style={styles.noDataText}>Noch keine Gewichtsdaten für Diagramm vorhanden</Text>
                  <Text style={styles.noDataSubtext}>Tracke dein Gewicht über den Chatbot</Text>
                </View>
              )}
              
              {/* Weight history list */}
              {userProfile.weightHistory && userProfile.weightHistory.length > 0 && (
                <View style={styles.weightHistoryList}>
                  <Text style={styles.historyTitle}>Letzte Einträge:</Text>
                  {userProfile.weightHistory.slice(-5).reverse().map((entry, index) => {
                    const weightHistory = userProfile.weightHistory || [];
                    const previousEntry = weightHistory[weightHistory.length - 2];
                    
                    return (
                      <View key={entry.date} style={styles.weightHistoryItem}>
                        <Text style={styles.historyDate}>
                          {new Date(entry.date).toLocaleDateString('de-DE', { 
                            day: '2-digit', 
                            month: '2-digit' 
                          })}
                        </Text>
                        <Text style={styles.historyWeight}>{entry.weight} kg</Text>
                        {index === 0 && weightHistory.length > 1 && previousEntry && (
                          <Text style={[
                            styles.weightChange,
                            {
                              color: entry.weight < previousEntry.weight 
                                ? '#10B981' : '#EF4444'
                            }
                          ]}>
                            {entry.weight < previousEntry.weight ? '↓' : '↑'}
                            {Math.abs(entry.weight - previousEntry.weight).toFixed(1)} kg
                          </Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              )}
            </View>
          </View>
        </View>
        
        <View style={styles.fitnessPlansSection}>
          <Text style={styles.sectionTitle}>Fitnessplan</Text>
          <View style={styles.fitnessPlansWidget}>
            {fitnessPlans && fitnessPlans.length > 0 ? (
              fitnessPlans.map((plan) => (
                <View key={plan.id} style={styles.fitnessplanCard}>
                  <View style={styles.planHeader}>
                    <Zap color="#F59E0B" size={24} />
                    <View style={styles.planInfo}>
                      <Text style={styles.planName}>{plan.name}</Text>
                      <Text style={styles.planDescription}>{plan.description}</Text>
                    </View>
                  </View>
                  <View style={styles.planDetails}>
                    <View style={styles.planStats}>
                      <View style={styles.planStat}>
                        <Text style={styles.planStatValue}>{plan.duration}</Text>
                        <Text style={styles.planStatLabel}>Dauer</Text>
                      </View>
                      <View style={styles.planStat}>
                        <Text style={styles.planStatValue}>{plan.frequency}</Text>
                        <Text style={styles.planStatLabel}>Häufigkeit</Text>
                      </View>
                    </View>
                    <View style={styles.exercisesList}>
                      <Text style={styles.exercisesTitle}>Übungen:</Text>
                      {plan.exercises.map((exercise, index) => (
                        <Text key={index} style={styles.exerciseItem}>• {exercise}</Text>
                      ))}
                    </View>
                  </View>
                </View>
              ))
            ) : (
              <View style={styles.noFitnessplan}>
                <Zap color="#9CA3AF" size={48} />
                <Text style={styles.noDataText}>Noch kein Fitnessplan vorhanden</Text>
                <Text style={styles.noDataSubtext}>Lass dir vom Chatbot einen Plan erstellen</Text>
              </View>
            )}
            
            <TouchableOpacity 
              style={styles.createPlanButton}
              onPress={handleCreateFitnessPlan}
            >
              <Plus color="#667eea" size={20} />
              <Text style={styles.createPlanButtonText}>Fitnessplan erstellen</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.workoutsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Heutige Workouts</Text>
            <TouchableOpacity 
              style={styles.addButton}
              onPress={() => setShowAddModal(true)}
            >
              <Plus color="#FFFFFF" size={20} />
            </TouchableOpacity>
          </View>

          {todayWorkouts.length === 0 ? (
            <View style={styles.emptyState}>
              <Activity color="#9CA3AF" size={48} />
              <Text style={styles.emptyText}>
                Noch keine Workouts heute
              </Text>
              <Text style={styles.emptySubtext}>
                Starte dein erstes Training!
              </Text>
            </View>
          ) : (
            todayWorkouts.map((workout) => (
              <View key={workout.id} style={styles.workoutCard}>
                <View style={styles.workoutHeader}>
                  <View style={styles.workoutInfo}>
                    <Text style={styles.workoutIcon}>{workout.icon}</Text>
                    <View style={styles.workoutDetails}>
                      <Text style={styles.workoutName}>{workout.name}</Text>
                      <Text style={styles.workoutTime}>{workout.time}</Text>
                    </View>
                  </View>
                  <View style={styles.workoutStats}>
                    <Text style={styles.workoutDuration}>{workout.duration} min</Text>
                    <Text style={styles.workoutCalories}>{workout.calories} kcal</Text>
                  </View>
                </View>
              </View>
            ))
          )}
        </View>

        <View style={styles.quickStartSection}>
          <Text style={styles.sectionTitle}>Schnellstart</Text>
          <View style={styles.quickStartGrid}>
            {workoutTypes.slice(0, 4).map((workout) => (
              <TouchableOpacity
                key={workout.name}
                style={styles.quickStartCard}
                onPress={() => {
                  setSelectedWorkout(workout.name);
                  setShowAddModal(true);
                }}
              >
                <Text style={styles.quickStartIcon}>{workout.icon}</Text>
                <Text style={styles.quickStartName}>{workout.name}</Text>
                <Text style={styles.quickStartCalories}>~{workout.calories} kcal/h</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </ScrollView>

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
            <Text style={styles.modalTitle}>Workout hinzufügen</Text>
            <TouchableOpacity onPress={handleAddWorkout}>
              <Text style={[
                styles.saveButton,
                { opacity: selectedWorkout && duration ? 1 : 0.5 }
              ]}>
                Hinzufügen
              </Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.workoutList}>
            <Text style={styles.listTitle}>Workout auswählen:</Text>
            {workoutTypes.map((workout) => (
              <TouchableOpacity
                key={workout.name}
                style={[
                  styles.workoutOption,
                  selectedWorkout === workout.name && styles.selectedWorkoutOption
                ]}
                onPress={() => setSelectedWorkout(workout.name)}
              >
                <Text style={styles.workoutOptionIcon}>{workout.icon}</Text>
                <View style={styles.workoutOptionInfo}>
                  <Text style={styles.workoutOptionName}>{workout.name}</Text>
                  <Text style={styles.workoutOptionCalories}>~{workout.calories} kcal/Stunde</Text>
                </View>
              </TouchableOpacity>
            ))}

            {selectedWorkout && (
              <View style={styles.durationSection}>
                <Text style={styles.durationLabel}>Dauer (Minuten):</Text>
                <TextInput
                  style={styles.durationInput}
                  placeholder="z.B. 30"
                  value={duration}
                  onChangeText={setDuration}
                  keyboardType="numeric"
                />
              </View>
            )}
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
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 12,
  },
  statsRow: {
    flexDirection: "row",
    gap: 20,
  },
  statItem: {
    flexDirection: "row",
    alignItems: "center",
  },
  statText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
    marginLeft: 6,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  workoutsSection: {
    marginBottom: 32,
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
    backgroundColor: "#10B981",
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: "center",
    alignItems: "center",
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
    marginTop: 16,
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
  workoutCard: {
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
  workoutHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  workoutInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  workoutIcon: {
    fontSize: 32,
    marginRight: 12,
  },
  workoutDetails: {
    flex: 1,
  },
  workoutName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  workoutTime: {
    fontSize: 14,
    color: "#6B7280",
  },
  workoutStats: {
    alignItems: "flex-end",
  },
  workoutDuration: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#3B82F6",
    marginBottom: 2,
  },
  workoutCalories: {
    fontSize: 14,
    fontWeight: "600",
    color: "#EF4444",
  },
  quickStartSection: {
    marginBottom: 20,
  },
  quickStartGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
    marginTop: 16,
  },
  quickStartCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    width: "48%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  quickStartIcon: {
    fontSize: 32,
    marginBottom: 8,
  },
  quickStartName: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  quickStartCalories: {
    fontSize: 12,
    color: "#6B7280",
  },
  weightSection: {
    marginBottom: 32,
  },
  weightWidget: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  weightHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 20,
  },
  weightInfo: {
    flex: 1,
    marginLeft: 12,
  },
  currentWeight: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
  },
  targetInfo: {
    alignItems: "flex-end",
  },
  targetWeight: {
    fontSize: 18,
    fontWeight: "600",
    color: "#10B981",
  },
  weightLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  weightChart: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 16,
  },
  chartContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  chartText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginLeft: 8,
  },
  weightHistoryList: {
    gap: 8,
  },
  weightHistoryItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
  },
  historyDate: {
    fontSize: 14,
    color: "#6B7280",
    flex: 1,
  },
  historyWeight: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    flex: 1,
    textAlign: "center",
  },
  weightChange: {
    fontSize: 14,
    fontWeight: "600",
    flex: 1,
    textAlign: "right",
  },
  noDataText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    fontStyle: "italic",
    paddingVertical: 20,
  },
  noDataSubtext: {
    fontSize: 12,
    color: "#D1D5DB",
    textAlign: "center",
    marginTop: 4,
  },
  lineChartContainer: {
    marginTop: 16,
  },
  lineChart: {
    height: 120,
    flexDirection: "row",
    alignItems: "stretch",
    marginBottom: 8,
  },
  chartYAxis: {
    width: 40,
    justifyContent: "space-between",
    paddingVertical: 8,
  },
  axisLabel: {
    fontSize: 10,
    color: "#6B7280",
    textAlign: "right",
  },
  chartArea: {
    flex: 1,
    position: "relative",
    backgroundColor: "#F9FAFB",
    borderRadius: 8,
    marginLeft: 8,
  },
  chartLine: {
    position: "absolute",
    top: "50%",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "#E5E7EB",
  },
  chartPoint: {
    position: "absolute",
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: "#3B82F6",
    marginLeft: -4,
    marginBottom: -4,
  },
  chartXAxis: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingHorizontal: 48,
  },
  axisDateLabel: {
    fontSize: 10,
    color: "#6B7280",
    textAlign: "center",
  },
  noChartData: {
    alignItems: "center",
    paddingVertical: 40,
  },
  historyTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
    marginTop: 16,
  },
  fitnessPlansSection: {
    marginBottom: 32,
  },
  fitnessPlansWidget: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  fitnessplanCard: {
    marginBottom: 16,
  },
  planHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
  },
  planInfo: {
    flex: 1,
    marginLeft: 12,
  },
  planName: {
    fontSize: 18,
    fontWeight: "bold",
    color: "#111827",
  },
  planDescription: {
    fontSize: 14,
    color: "#6B7280",
    marginTop: 2,
  },
  planDetails: {
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
    paddingTop: 12,
  },
  planStats: {
    flexDirection: "row",
    marginBottom: 12,
    gap: 20,
  },
  planStat: {
    alignItems: "center",
  },
  planStatValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
  },
  planStatLabel: {
    fontSize: 12,
    color: "#6B7280",
    marginTop: 2,
  },
  exercisesList: {
    marginTop: 8,
  },
  exercisesTitle: {
    fontSize: 14,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 6,
  },
  exerciseItem: {
    fontSize: 14,
    color: "#6B7280",
    marginBottom: 2,
  },
  noFitnessplan: {
    alignItems: "center",
    paddingVertical: 40,
  },
  createPlanButton: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(102, 126, 234, 0.1)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
    marginTop: 16,
  },
  createPlanButtonText: {
    fontSize: 14,
    color: "#667eea",
    fontWeight: "600",
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
    color: "#10B981",
  },
  workoutList: {
    flex: 1,
    paddingHorizontal: 20,
  },
  listTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginTop: 20,
    marginBottom: 16,
  },
  workoutOption: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: "#F9FAFB",
  },
  selectedWorkoutOption: {
    backgroundColor: "#ECFDF5",
    borderWidth: 2,
    borderColor: "#10B981",
  },
  workoutOptionIcon: {
    fontSize: 24,
    marginRight: 16,
  },
  workoutOptionInfo: {
    flex: 1,
  },
  workoutOptionName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  workoutOptionCalories: {
    fontSize: 14,
    color: "#6B7280",
  },
  durationSection: {
    marginTop: 24,
    paddingTop: 24,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  durationLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 12,
  },
  durationInput: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    backgroundColor: "#F9FAFB",
  },
});