import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { StackNavigationProp } from '@react-navigation/stack';
import type { WorkoutStackParamList } from '../navigation/WorkoutStack';
import { useWorkoutStore } from '../stores/workoutStore';
import type { Exercise } from '../types/db';
import { colors, spacing, radius, font } from '../theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type NavProp = StackNavigationProp<WorkoutStackParamList, 'ExercisePicker'>;

export default function ExercisePickerScreen() {
  const navigation = useNavigation<NavProp>();
  const exercises = useWorkoutStore((s) => s.exercises);
  const [query, setQuery] = useState('');
  const insets = useSafeAreaInsets();

  const filtered = query.trim()
    ? exercises.filter((e) =>
        e.name.toLowerCase().includes(query.toLowerCase()),
      )
    : exercises;

  const handleSelect = (exercise: Exercise) => {
    navigation.navigate('Workout', { selectedExercise: exercise });
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.searchBar}
        placeholder="Search exercises…"
        placeholderTextColor={colors.textTertiary}
        value={query}
        onChangeText={setQuery}
        autoFocus
        clearButtonMode="while-editing"
      />
      <FlatList
        data={filtered}
        keyExtractor={(item) => String(item.id)}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.row} onPress={() => handleSelect(item)}>
            <Text style={styles.name}>{item.name}</Text>
            <Text style={styles.muscle}>{item.muscle}</Text>
          </TouchableOpacity>
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={{ paddingBottom: insets.bottom + spacing.md }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
  },
  searchBar: {
    margin: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    fontSize: font.md,
    backgroundColor: colors.surface,
    color: colors.text,
  },
  row: {
    paddingHorizontal: spacing.md,
    paddingVertical: 14,
  },
  name: {
    fontSize: font.md,
    color: colors.text,
    fontWeight: '500',
  },
  muscle: {
    fontSize: font.sm,
    color: colors.textSecondary,
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: colors.borderLight,
    marginLeft: spacing.md,
  },
});
