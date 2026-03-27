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

type NavProp = StackNavigationProp<WorkoutStackParamList, 'ExercisePicker'>;

export default function ExercisePickerScreen() {
  const navigation = useNavigation<NavProp>();
  const exercises = useWorkoutStore((s) => s.exercises);
  const [query, setQuery] = useState('');

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
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  searchBar: {
    margin: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  row: {
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  name: {
    fontSize: 16,
    color: '#111',
    fontWeight: '500',
  },
  muscle: {
    fontSize: 13,
    color: '#888',
    marginTop: 2,
  },
  separator: {
    height: 1,
    backgroundColor: '#eee',
    marginLeft: 16,
  },
});
