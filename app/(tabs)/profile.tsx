import React, { useState } from "react";
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
} from "react-native";
import { 
  User, 
  Target, 
  Award, 
  TrendingUp, 
  Settings,
  Calendar,
  Scale,
  Ruler,
  Edit3,
  RefreshCw,
  Activity,
  Zap,
  X
} from "lucide-react-native";
import { useFitnessData } from "@/hooks/fitness-store";
import type { UserProfile } from "@/hooks/fitness-store";
import { router } from "expo-router";

// Helper functions for German date formatting
const formatDateForInput = (isoDate: string): string => {
  if (!isoDate) return '';
  const date = new Date(isoDate);
  const day = date.getDate().toString().padStart(2, '0');
  const month = (date.getMonth() + 1).toString().padStart(2, '0');
  const year = date.getFullYear();
  return `${day}.${month}.${year}`;
};

const parseGermanDate = (germanDate: string): string => {
  if (!germanDate) return '';
  
  // Remove any extra spaces and handle different separators
  const cleaned = germanDate.trim().replace(/[\s\/\-]/g, '.');
  
  // Match DD.MM.YYYY or DD.MM.YY patterns
  const match = cleaned.match(/^(\d{1,2})\.(\d{1,2})\.(\d{2,4})$/);
  
  if (!match) return '';
  
  let [, day, month, year] = match;
  
  // Convert 2-digit year to 4-digit
  if (year.length === 2) {
    const currentYear = new Date().getFullYear();
    const currentCentury = Math.floor(currentYear / 100) * 100;
    const yearNum = parseInt(year);
    
    // If year is greater than current year's last 2 digits, assume previous century
    if (yearNum > currentYear % 100) {
      year = (currentCentury - 100 + yearNum).toString();
    } else {
      year = (currentCentury + yearNum).toString();
    }
  }
  
  // Validate ranges
  const dayNum = parseInt(day);
  const monthNum = parseInt(month);
  const yearNum = parseInt(year);
  
  if (dayNum < 1 || dayNum > 31 || monthNum < 1 || monthNum > 12 || yearNum < 1900 || yearNum > 2100) {
    return '';
  }
  
  // Create ISO date string
  const paddedDay = dayNum.toString().padStart(2, '0');
  const paddedMonth = monthNum.toString().padStart(2, '0');
  
  return `${yearNum}-${paddedMonth}-${paddedDay}`;
};

export default function ProfileScreen() {
  const { userProfile, weeklyGoal, getCurrentDayStats, updateUserProfile } = useFitnessData();
  const todayStats = getCurrentDayStats();
  const [isEditModalVisible, setIsEditModalVisible] = useState<boolean>(false);
  const [editedProfile, setEditedProfile] = useState<UserProfile>({...userProfile});
  const [isUpdating, setIsUpdating] = useState<boolean>(false);

  const achievements = [
    { id: 1, title: "Erste Woche", description: "7 Tage aktiv", earned: true },
    { id: 2, title: "Kalorienziel", description: "Tagesziel erreicht", earned: true },
    { id: 3, title: "Schritt-Champion", description: "10.000 Schritte", earned: false },
    { id: 4, title: "Wasser-Meister", description: "2L täglich", earned: true },
  ];

  const stats = [
    { label: "Alter", value: `${userProfile.age} Jahre`, icon: Calendar, color: "#F59E0B" },
    { label: "Geschlecht", value: userProfile.gender === 'male' ? 'Männlich' : 'Weiblich', icon: User, color: "#EF4444" },
    { label: "Aktuelles Gewicht", value: `${userProfile.weight} kg`, icon: Scale, color: "#3B82F6" },
    { label: "Zielgewicht", value: `${userProfile.targetWeight} kg`, icon: Target, color: "#10B981" },
    { label: "Größe", value: `${userProfile.height} cm`, icon: Ruler, color: "#8B5CF6" },
    { label: "BMI", value: userProfile.bmi.toFixed(1), icon: Activity, color: "#06B6D4" },
  ];

  const metabolicStats = [
    { label: "Grundumsatz", value: `${userProfile.basalMetabolicRate} kcal`, icon: Zap, color: "#EF4444" },
    { label: "Gesamtumsatz", value: `${userProfile.totalDailyEnergyExpenditure} kcal`, icon: Activity, color: "#8B5CF6" },
    { label: "Kalorienziel", value: `${userProfile.totalDailyEnergyExpenditure} kcal`, icon: Target, color: "#10B981" },
  ];

  const activityLevelLabels = {
    sedentary: 'Sitzend (wenig/keine Bewegung)',
    lightly_active: 'Leicht aktiv (1-3 Tage/Woche)',
    moderately_active: 'Mäßig aktiv (3-5 Tage/Woche)',
    very_active: 'Sehr aktiv (6-7 Tage/Woche)',
    extremely_active: 'Extrem aktiv (2x täglich)'
  };

  const handleSaveProfile = async () => {
    try {
      setIsUpdating(true);
      await updateUserProfile(editedProfile);
      setIsEditModalVisible(false);
      Alert.alert('Erfolg', 'Profil wurde erfolgreich aktualisiert!');
    } catch (error) {
      Alert.alert('Fehler', 'Profil konnte nicht aktualisiert werden.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdateFromChat = async () => {
    try {
      setIsUpdating(true);
      // Navigate to chat tab with profile update parameter
      router.push('/chat?profileUpdate=true');
    } catch (error) {
      Alert.alert('Fehler', 'Navigation zum Chat fehlgeschlagen.');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <View style={styles.profileSection}>
          <View style={styles.avatarContainer}>
            <User color="#FFFFFF" size={40} />
          </View>
          <View style={styles.profileInfo}>
            <Text style={styles.name}>{userProfile.name}</Text>
            <Text style={styles.goal}>Kalorienziel: {userProfile.totalDailyEnergyExpenditure} kcal</Text>
          </View>
          <View style={styles.headerButtons}>
            <TouchableOpacity 
              style={styles.editButton}
              onPress={() => {
                setEditedProfile(userProfile);
                setIsEditModalVisible(true);
              }}
            >
              <Edit3 color="#667eea" size={20} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.settingsButton}>
              <Settings color="#6B7280" size={24} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.content}>
        <View style={styles.statsSection}>
          <Text style={styles.sectionTitle}>Persönliche Daten</Text>
          <View style={styles.personalDataGrid}>
            {stats.map((stat, index) => (
              <View key={index} style={styles.personalDataCard}>
                <stat.icon color={stat.color} size={20} />
                <Text style={styles.personalDataValue}>{stat.value}</Text>
                <Text style={styles.personalDataLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
          
          <View style={styles.activityLevelCard}>
            <Activity color="#8B5CF6" size={20} />
            <Text style={styles.personalDataValue}>
              {activityLevelLabels[userProfile.activityLevel]}
            </Text>
            <Text style={styles.personalDataLabel}>Aktivitätslevel</Text>
          </View>
          
          <TouchableOpacity 
            style={styles.updateButton}
            onPress={handleUpdateFromChat}
            disabled={isUpdating}
          >
            <RefreshCw color="#667eea" size={20} />
            <Text style={styles.updateButtonText}>Angaben aktualisieren</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.metabolicSection}>
          <Text style={styles.sectionTitle}>Grundumsatzberechnung</Text>
          <View style={styles.metabolicGrid}>
            {metabolicStats.map((stat, index) => (
              <View key={index} style={styles.metabolicCard}>
                <stat.icon color={stat.color} size={20} />
                <Text style={styles.metabolicValue}>{stat.value}</Text>
                <Text style={styles.metabolicLabel}>{stat.label}</Text>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.goalsSection}>
          <Text style={styles.sectionTitle}>Tagesziele</Text>
          <View style={styles.goalsList}>
            <View style={styles.goalItem}>
              <View style={styles.goalInfo}>
                <Text style={styles.goalName}>Kalorien</Text>
                <Text style={styles.goalProgress}>
                  {todayStats.calories} / {weeklyGoal.dailyCalories} kcal
                </Text>
              </View>
              <View style={styles.goalBar}>
                <View 
                  style={[
                    styles.goalBarFill, 
                    { 
                      width: `${Math.min((todayStats.calories / weeklyGoal.dailyCalories) * 100, 100)}%`,
                      backgroundColor: "#EF4444"
                    }
                  ]} 
                />
              </View>
            </View>

            <View style={styles.goalItem}>
              <View style={styles.goalInfo}>
                <Text style={styles.goalName}>Schritte</Text>
                <Text style={styles.goalProgress}>
                  {todayStats.steps.toLocaleString()} / {weeklyGoal.dailySteps.toLocaleString()}
                </Text>
              </View>
              <View style={styles.goalBar}>
                <View 
                  style={[
                    styles.goalBarFill, 
                    { 
                      width: `${Math.min((todayStats.steps / weeklyGoal.dailySteps) * 100, 100)}%`,
                      backgroundColor: "#3B82F6"
                    }
                  ]} 
                />
              </View>
            </View>

            <View style={styles.goalItem}>
              <View style={styles.goalInfo}>
                <Text style={styles.goalName}>Wasser</Text>
                <Text style={styles.goalProgress}>
                  {todayStats.water}L / {weeklyGoal.dailyWater}L
                </Text>
              </View>
              <View style={styles.goalBar}>
                <View 
                  style={[
                    styles.goalBarFill, 
                    { 
                      width: `${Math.min((todayStats.water / weeklyGoal.dailyWater) * 100, 100)}%`,
                      backgroundColor: "#06B6D4"
                    }
                  ]} 
                />
              </View>
            </View>
          </View>
        </View>

        <View style={styles.achievementsSection}>
          <View style={styles.achievementsHeader}>
            <Award color="#F59E0B" size={24} />
            <Text style={styles.sectionTitle}>Erfolge</Text>
          </View>
          <View style={styles.achievementsList}>
            {achievements.map((achievement) => (
              <View 
                key={achievement.id} 
                style={[
                  styles.achievementItem,
                  !achievement.earned && styles.achievementLocked
                ]}
              >
                <View style={[
                  styles.achievementBadge,
                  { backgroundColor: achievement.earned ? "#10B981" : "#E5E7EB" }
                ]}>
                  <Award 
                    color={achievement.earned ? "#FFFFFF" : "#9CA3AF"} 
                    size={20} 
                  />
                </View>
                <View style={styles.achievementInfo}>
                  <Text style={[
                    styles.achievementTitle,
                    !achievement.earned && styles.achievementTitleLocked
                  ]}>
                    {achievement.title}
                  </Text>
                  <Text style={[
                    styles.achievementDescription,
                    !achievement.earned && styles.achievementDescriptionLocked
                  ]}>
                    {achievement.description}
                  </Text>
                </View>
              </View>
            ))}
          </View>
        </View>

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <TrendingUp color="#10B981" size={24} />
            <Text style={styles.sectionTitle}>Wochenfortschritt</Text>
          </View>
          <View style={styles.progressCard}>
            <Text style={styles.progressText}>
              Diese Woche hast du 5 von 7 Tagen deine Ziele erreicht! 
              Weiter so! 🎉
            </Text>
            <View style={styles.progressStats}>
              <View style={styles.progressStat}>
                <Text style={styles.progressStatValue}>85%</Text>
                <Text style={styles.progressStatLabel}>Zielerreichung</Text>
              </View>
              <View style={styles.progressStat}>
                <Text style={styles.progressStatValue}>12</Text>
                <Text style={styles.progressStatLabel}>Workouts</Text>
              </View>
              <View style={styles.progressStat}>
                <Text style={styles.progressStatValue}>2.1kg</Text>
                <Text style={styles.progressStatLabel}>Fortschritt</Text>
              </View>
            </View>
          </View>
        </View>
      </View>

      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Profil bearbeiten</Text>
            <TouchableOpacity 
              onPress={() => setIsEditModalVisible(false)}
              style={styles.closeButton}
            >
              <X color="#6B7280" size={24} />
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Name</Text>
              <TextInput
                style={styles.textInput}
                value={editedProfile.name}
                onChangeText={(text) => setEditedProfile({...editedProfile, name: text})}
                placeholder="Ihr Name"
              />
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.inputLabel}>Geburtstag</Text>
                <TextInput
                  style={styles.textInput}
                  value={editedProfile.birthDate ? formatDateForInput(editedProfile.birthDate) : ''}
                  onChangeText={(text) => {
                    const isoDate = parseGermanDate(text);
                    setEditedProfile({...editedProfile, birthDate: isoDate});
                  }}
                  placeholder="TT.MM.JJJJ"
                />
              </View>
              
              <View style={styles.inputGroupHalf}>
                <Text style={styles.inputLabel}>Geschlecht</Text>
                <View style={styles.genderButtons}>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      editedProfile.gender === 'male' && styles.genderButtonActive
                    ]}
                    onPress={() => setEditedProfile({...editedProfile, gender: 'male'})}
                  >
                    <Text style={[
                      styles.genderButtonText,
                      editedProfile.gender === 'male' && styles.genderButtonTextActive
                    ]}>M</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.genderButton,
                      editedProfile.gender === 'female' && styles.genderButtonActive
                    ]}
                    onPress={() => setEditedProfile({...editedProfile, gender: 'female'})}
                  >
                    <Text style={[
                      styles.genderButtonText,
                      editedProfile.gender === 'female' && styles.genderButtonTextActive
                    ]}>W</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.inputLabel}>Gewicht (kg)</Text>
                <TextInput
                  style={styles.textInput}
                  value={editedProfile.weight.toString()}
                  onChangeText={(text) => setEditedProfile({...editedProfile, weight: parseFloat(text) || 0})}
                  placeholder="75"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.inputGroupHalf}>
                <Text style={styles.inputLabel}>Größe (cm)</Text>
                <TextInput
                  style={styles.textInput}
                  value={editedProfile.height.toString()}
                  onChangeText={(text) => setEditedProfile({...editedProfile, height: parseFloat(text) || 0})}
                  placeholder="180"
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.inputRow}>
              <View style={styles.inputGroupHalf}>
                <Text style={styles.inputLabel}>Zielgewicht (kg)</Text>
                <TextInput
                  style={styles.textInput}
                  value={editedProfile.targetWeight.toString()}
                  onChangeText={(text) => setEditedProfile({...editedProfile, targetWeight: parseFloat(text) || 0})}
                  placeholder="75"
                  keyboardType="numeric"
                />
              </View>
              
              <View style={styles.inputGroupHalf}>
                <Text style={styles.inputLabel}>Aktivitätslevel</Text>
                <View style={styles.activityLevelPreview}>
                  <Text style={styles.activityLevelText}>
                    {activityLevelLabels[editedProfile.activityLevel]}
                  </Text>
                </View>
              </View>
            </View>



            <View style={styles.inputGroup}>
              <Text style={styles.inputLabel}>Aktivitätslevel</Text>
              <View style={styles.activityButtons}>
                {Object.entries(activityLevelLabels).map(([key, label]) => (
                  <TouchableOpacity
                    key={key}
                    style={[
                      styles.activityButton,
                      editedProfile.activityLevel === key && styles.activityButtonActive
                    ]}
                    onPress={() => setEditedProfile({...editedProfile, activityLevel: key as UserProfile['activityLevel']})}
                  >
                    <Text style={[
                      styles.activityButtonText,
                      editedProfile.activityLevel === key && styles.activityButtonTextActive
                    ]}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>
          
          <View style={styles.modalFooter}>
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSaveProfile}
              disabled={isUpdating}
            >
              {isUpdating ? (
                <RefreshCw color="#FFFFFF" size={20} />
              ) : (
                <Text style={styles.saveButtonText}>Speichern</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  header: {
    backgroundColor: "#FFFFFF",
    paddingTop: 60,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  profileSection: {
    flexDirection: "row",
    alignItems: "center",
  },
  avatarContainer: {
    width: 60,
    height: 60,
    borderRadius: 35,
    backgroundColor: "#10B981",
    justifyContent: "center",
    alignItems: "center",
  },
  profileInfo: {
    flex: 1,
    marginLeft: 16,
  },
  name: {
    fontSize: 24,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 4,
  },
  goal: {
    fontSize: 16,
    color: "#6B7280",
  },
  headerButtons: {
    flexDirection: "row",
    gap: 8,
  },
  editButton: {
    padding: 8,
    borderRadius: 25,
    backgroundColor: "rgba(102, 126, 234, 0.1)",
  },
  settingsButton: {
    padding: 8,
    borderRadius: 25,
    backgroundColor: "rgba(107, 114, 128, 0.1)",
  },
  metabolicSection: {
    marginBottom: 32,
  },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 16,
  },
  updateButton: {
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
  activityLevelDisplay: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  updateButtonText: {
    fontSize: 14,
    color: "#667eea",
    fontWeight: "600",
  },
  activityLevelSection: {
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  activityLevelTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  activityLevelValue: {
    fontSize: 14,
    color: "#6B7280",
    lineHeight: 20,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingTop: 60,
    paddingBottom: 20,
    backgroundColor: "#FFFFFF",
    borderBottomWidth: 1,
    borderBottomColor: "#F3F4F6",
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
  },
  closeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: "rgba(107, 114, 128, 0.1)",
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputRow: {
    flexDirection: "row",
    gap: 12,
    marginBottom: 20,
  },
  inputGroupHalf: {
    flex: 1,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 8,
  },
  activityLevelPreview: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    minHeight: 48,
    justifyContent: "center",
  },
  activityLevelText: {
    fontSize: 14,
    color: "#111827",
  },
  textInput: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: "#111827",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  genderButtons: {
    flexDirection: "row",
    gap: 8,
  },
  genderButton: {
    flex: 1,
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: "center",
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  genderButtonActive: {
    backgroundColor: "#667eea",
    borderColor: "#667eea",
  },
  genderButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#6B7280",
  },
  genderButtonTextActive: {
    color: "#FFFFFF",
  },
  activityButtons: {
    gap: 8,
  },
  activityButton: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
  },
  activityButtonActive: {
    backgroundColor: "#667eea",
    borderColor: "#667eea",
  },
  activityButtonText: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  activityButtonTextActive: {
    color: "#FFFFFF",
    fontWeight: "600",
  },
  modalFooter: {
    padding: 20,
    backgroundColor: "#FFFFFF",
    borderTopWidth: 1,
    borderTopColor: "#F3F4F6",
  },
  saveButton: {
    backgroundColor: "#667eea",
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: "600",
    color: "#FFFFFF",
  },
  content: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginBottom: 16,
  },
  statsSection: {
    marginBottom: 32,
  },
  personalDataGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  personalDataCard: {
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
  personalDataValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 8,
    marginBottom: 4,
    textAlign: "center",
  },
  personalDataLabel: {
    fontSize: 14,
    color: "#6B7280",
    textAlign: "center",
  },
  activityLevelCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 12,
    padding: 16,
    alignItems: "center",
    marginTop: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  metabolicGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  metabolicCard: {
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
  metabolicValue: {
    fontSize: 16,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 8,
    marginBottom: 4,
    textAlign: "center",
  },
  metabolicLabel: {
    fontSize: 12,
    color: "#6B7280",
    textAlign: "center",
  },
  statsGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 12,
  },
  statCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 25,
    padding: 16,
    alignItems: "center",
    width: "31%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  statValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#111827",
    marginTop: 8,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 14,
    color: "#6B7280",
  },
  goalsSection: {
    marginBottom: 32,
  },
  goalsList: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  goalItem: {
    marginBottom: 20,
  },
  goalInfo: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  goalName: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  goalProgress: {
    fontSize: 14,
    color: "#6B7280",
  },
  goalBar: {
    height: 8,
    backgroundColor: "#F3F4F6",
    borderRadius: 10,
    overflow: "hidden",
  },
  goalBarFill: {
    height: "100%",
    borderRadius: 10,
  },
  achievementsSection: {
    marginBottom: 32,
  },
  achievementsHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  achievementsList: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  achievementItem: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  achievementLocked: {
    opacity: 0.6,
  },
  achievementBadge: {
    width: 40,
    height: 40,
    borderRadius: 25,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 16,
  },
  achievementInfo: {
    flex: 1,
  },
  achievementTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
    marginBottom: 4,
  },
  achievementTitleLocked: {
    color: "#9CA3AF",
  },
  achievementDescription: {
    fontSize: 14,
    color: "#6B7280",
  },
  achievementDescriptionLocked: {
    color: "#D1D5DB",
  },
  progressSection: {
    marginBottom: 20,
  },
  progressHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 16,
  },
  progressCard: {
    backgroundColor: "#FFFFFF",
    borderRadius: 16,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  progressText: {
    fontSize: 16,
    color: "#6B7280",
    lineHeight: 24,
    marginBottom: 20,
  },
  progressStats: {
    flexDirection: "row",
    justifyContent: "space-around",
  },
  progressStat: {
    alignItems: "center",
  },
  progressStatValue: {
    fontSize: 20,
    fontWeight: "bold",
    color: "#10B981",
    marginBottom: 4,
  },
  progressStatLabel: {
    fontSize: 12,
    color: "#6B7280",
  },
});