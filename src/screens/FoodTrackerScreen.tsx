import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Pressable,
  FlatList,
  StyleSheet,
} from 'react-native';
import { StackScreenProps } from '@react-navigation/stack';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFoodStore } from '../stores/foodStore';
import EmptyState from '../components/EmptyState';
import type { MealCategory, FoodLog, Recipe } from '../types/db';
import type { FoodStackParamList } from '../navigation/FoodStack';
import { colors, spacing, radius, font } from '../theme';

type Props = StackScreenProps<FoodStackParamList, 'FoodTracker'>;

const MEAL_CATEGORIES: MealCategory[] = ['Pre Workout', 'Post Workout', 'Lunch', 'Dinner'];

function MealCategoryTabs({
  selected,
  onSelect,
}: {
  selected: MealCategory;
  onSelect: (cat: MealCategory) => void;
}) {
  return (
    <View style={styles.tabsRow}>
      {MEAL_CATEGORIES.map((cat) => (
        <Pressable
          key={cat}
          style={[styles.tab, selected === cat && styles.tabActive]}
          onPress={() => onSelect(cat)}
        >
          <Text style={[styles.tabText, selected === cat && styles.tabTextActive]} numberOfLines={1}>
            {cat}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

function MacroSummaryBar({
  calories,
  protein,
  carbs,
  fat,
}: {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
}) {
  return (
    <View style={styles.macroBar}>
      <View style={styles.macroItem}>
        <Text style={styles.macroValue}>{calories}</Text>
        <Text style={styles.macroLabel}>kcal</Text>
      </View>
      <View style={styles.macroItem}>
        <Text style={styles.macroValue}>{protein.toFixed(1)}g</Text>
        <Text style={styles.macroLabel}>Protein</Text>
      </View>
      <View style={styles.macroItem}>
        <Text style={styles.macroValue}>{carbs.toFixed(1)}g</Text>
        <Text style={styles.macroLabel}>Carbs</Text>
      </View>
      <View style={styles.macroItem}>
        <Text style={styles.macroValue}>{fat.toFixed(1)}g</Text>
        <Text style={styles.macroLabel}>Fat</Text>
      </View>
    </View>
  );
}

export default function FoodTrackerScreen({ navigation }: Props) {
  const foodStore = useFoodStore();
  const [selectedCategory, setSelectedCategory] = useState<MealCategory>('Lunch');
  const insets = useSafeAreaInsets();

  const today = new Date().toISOString().split('T')[0];

  useEffect(() => {
    foodStore.loadFoodLogForDate(today);
    foodStore.loadRecipes();
  }, []);

  const filteredLog = foodStore.foodLog.filter(
    (entry) => entry.meal_category === selectedCategory
  );

  const handleDelete = (id: number) => {
    foodStore.deleteFoodLog(id, today);
  };

  const handleAddMeal = () => {
    navigation.navigate('RecipeManager', { pickerMode: true, mealCategory: selectedCategory });
  };

  const renderLogRow = ({ item }: { item: FoodLog & Recipe }) => (
    <View style={styles.logRow}>
      <View style={styles.logInfo}>
        <Text style={styles.logName}>{item.name}</Text>
        <Text style={styles.logMacros}>
          {item.calories} kcal · P: {item.protein}g · C: {item.carbs}g · F: {item.fat}g
        </Text>
      </View>
      <Pressable style={styles.deleteButton} onPress={() => handleDelete(item.id)}>
        <Text style={styles.deleteButtonText}>✕</Text>
      </Pressable>
    </View>
  );

  const hasEntriesToday = foodStore.foodLog.length > 0;

  return (
    <View style={styles.container}>
      <MacroSummaryBar
        calories={foodStore.dailyMacros.calories}
        protein={foodStore.dailyMacros.protein}
        carbs={foodStore.dailyMacros.carbs}
        fat={foodStore.dailyMacros.fat}
      />

      <MealCategoryTabs selected={selectedCategory} onSelect={setSelectedCategory} />

      {!hasEntriesToday ? (
        <EmptyState
          message="No meals logged today. Add your first meal to get started."
          onPress={handleAddMeal}
          buttonLabel="Add Meal"
        />
      ) : filteredLog.length === 0 ? (
        <View style={styles.emptyCategoryContainer}>
          <Text style={styles.emptyCategoryText}>No entries for {selectedCategory} today.</Text>
        </View>
      ) : (
        <FlatList
          data={filteredLog}
          keyExtractor={(item) => String(item.id)}
          renderItem={renderLogRow}
          contentContainerStyle={styles.listContent}
        />
      )}

      <Pressable style={[styles.addButton, { bottom: insets.bottom + 16 }]} onPress={handleAddMeal}>
        <Text style={styles.addButtonText}>+ Add Meal</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  macroBar: {
    flexDirection: 'row',
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: spacing.sm,
    justifyContent: 'space-around',
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  macroItem: {
    alignItems: 'center',
  },
  macroValue: {
    fontSize: font.md,
    fontWeight: '700',
    color: colors.primary,
  },
  macroLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
  tabsRow: {
    flexDirection: 'row',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: colors.surface,
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceAlt,
    alignItems: 'center',
  },
  tabActive: {
    backgroundColor: colors.primary,
  },
  tabText: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: '500',
  },
  tabTextActive: {
    color: colors.text,
    fontWeight: '700',
  },
  listContent: {
    padding: spacing.md,
    paddingBottom: 90,
  },
  logRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  logInfo: {
    flex: 1,
  },
  logName: {
    fontSize: font.md,
    fontWeight: '600',
    color: colors.text,
  },
  logMacros: {
    fontSize: font.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  deleteButton: {
    padding: spacing.sm,
  },
  deleteButtonText: {
    color: colors.danger,
    fontSize: font.md,
    fontWeight: '700',
  },
  emptyCategoryContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  emptyCategoryText: {
    fontSize: font.md,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  addButton: {
    position: 'absolute',
    bottom: 16,
    left: 24,
    right: 24,
    backgroundColor: colors.primary,
    paddingVertical: 14,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  addButtonText: {
    color: colors.text,
    fontSize: font.md,
    fontWeight: '700',
  },
});
