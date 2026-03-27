import React, { useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import type { BottomTabParamList } from '../navigation/BottomTabNavigator';
import type { RootStackParamList } from '../navigation/RootNavigator';
import { useWeightStore } from '../stores/weightStore';
import { useFoodStore } from '../stores/foodStore';
import { useWorkoutStore } from '../stores/workoutStore';
import { useSettingsStore } from '../stores/settingsStore';
import { colors, spacing, radius, font } from '../theme';
import GlossCard from '../components/GlossCard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type DashboardNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<BottomTabParamList, 'Dashboard'>,
  StackNavigationProp<RootStackParamList>
>;

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function DashCard({
  icon,
  iconColor,
  iconBg,
  title,
  value,
  sub,
  onPress,
}: {
  icon: IoniconsName;
  iconColor: string;
  iconBg: string;
  title: string;
  value: string;
  sub?: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity style={styles.card} onPress={onPress} activeOpacity={0.75} accessibilityRole="button">
      <GlossCard style={styles.cardInner}>
        <View style={[styles.iconWrap, { backgroundColor: iconBg }]}>
          <Ionicons name={icon} size={22} color={iconColor} />
        </View>
        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>{title}</Text>
          <Text style={styles.cardValue}>{value}</Text>
          {sub ? <Text style={styles.cardSub}>{sub}</Text> : null}
        </View>
        <Ionicons name="chevron-forward" size={18} color={colors.textTertiary} />
      </GlossCard>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const navigation = useNavigation<DashboardNavProp>();
  const weightStore = useWeightStore();
  const foodStore = useFoodStore();
  const workoutStore = useWorkoutStore();
  const { weightUnit } = useSettingsStore();
  const insets = useSafeAreaInsets();
  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    weightStore.loadHistory();
    foodStore.loadFoodLogForDate(today);
    workoutStore.startOrGetSession(today);
    workoutStore.loadExercises();
  }, [today]);

  useEffect(() => {
    navigation.setOptions({
      headerRight: () => (
        <TouchableOpacity
          onPress={() => navigation.navigate('Settings')}
          style={styles.headerBtn}
          accessibilityRole="button"
          accessibilityLabel="Settings"
        >
          <Ionicons name="settings-outline" size={22} color={colors.primary} />
        </TouchableOpacity>
      ),
    });
  }, [navigation]);

  const todayWeight = weightStore.history.find((e) => e.date === today)?.value;
  const { calories, protein, carbs, fat } = foodStore.dailyMacros;
  const exerciseNames = Array.from(
    new Set(workoutStore.sets.map((s) => workoutStore.exercises.find((e) => e.id === s.exercise_id)?.name ?? '')),
  ).filter(Boolean);

  const dateLabel = new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' });

  return (
    <ScrollView style={styles.screen} contentContainerStyle={[styles.container, { paddingBottom: insets.bottom + spacing.md }]}>
      <Text style={styles.dateLabel}>{dateLabel}</Text>

      <DashCard
        icon="scale-outline"
        iconColor={colors.primary}
        iconBg={colors.primaryLight}
        title="Today's Weight"
        value={todayWeight != null ? `${todayWeight} ${weightUnit}` : 'No entry yet'}
        onPress={() => navigation.navigate('Weight')}
      />

      <DashCard
        icon="flame-outline"
        iconColor={colors.warning}
        iconBg={colors.warningLight}
        title="Calories"
        value={calories > 0 ? `${calories} kcal` : 'No meals logged'}
        sub={calories > 0 ? `P ${protein.toFixed(0)}g · C ${carbs.toFixed(0)}g · F ${fat.toFixed(0)}g` : undefined}
        onPress={() => navigation.navigate('FoodStack')}
      />

      <DashCard
        icon="barbell-outline"
        iconColor={colors.success}
        iconBg={colors.successLight}
        title="Workout"
        value={exerciseNames.length > 0 ? `${exerciseNames.length} exercise${exerciseNames.length > 1 ? 's' : ''}` : 'No workout logged'}
        sub={exerciseNames.length > 0 ? exerciseNames.slice(0, 3).join(', ') : undefined}
        onPress={() => navigation.navigate('WorkoutStack')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.bg },
  container: { padding: spacing.md, paddingTop: spacing.sm },
  dateLabel: {
    fontSize: font.sm,
    color: colors.textSecondary,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: spacing.md,
  },
  card: {
    marginBottom: spacing.sm,
  },
  cardInner: {
    padding: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
  },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: radius.sm,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardBody: { flex: 1 },
  cardTitle: { fontSize: font.sm, color: colors.textSecondary, marginBottom: 2 },
  cardValue: { fontSize: font.lg, fontWeight: '700', color: colors.text },
  cardSub: { fontSize: font.sm, color: colors.textTertiary, marginTop: 2 },
  headerBtn: { marginRight: spacing.md },
});
