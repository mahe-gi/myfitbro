import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import WorkoutScreen from '../screens/WorkoutScreen';
import ExercisePickerScreen from '../screens/ExercisePickerScreen';
import type { Exercise } from '../types/db';

export type WorkoutStackParamList = {
  Workout: { selectedExercise?: Exercise } | undefined;
  ExercisePicker: undefined;
};

const Stack = createStackNavigator<WorkoutStackParamList>();

export default function WorkoutStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="Workout" component={WorkoutScreen} />
      <Stack.Screen name="ExercisePicker" component={ExercisePickerScreen} options={{ title: 'Pick Exercise' }} />
    </Stack.Navigator>
  );
}
