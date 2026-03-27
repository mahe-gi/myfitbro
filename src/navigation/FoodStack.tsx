import React from 'react';
import { createStackNavigator } from '@react-navigation/stack';
import FoodTrackerScreen from '../screens/FoodTrackerScreen';
import RecipeManagerScreen from '../screens/RecipeManagerScreen';
import type { MealCategory } from '../types/db';

export type FoodStackParamList = {
  FoodTracker: undefined;
  RecipeManager: { pickerMode?: boolean; mealCategory?: MealCategory } | undefined;
};

const Stack = createStackNavigator<FoodStackParamList>();

export default function FoodStack() {
  return (
    <Stack.Navigator>
      <Stack.Screen name="FoodTracker" component={FoodTrackerScreen} options={{ title: 'Food Tracker' }} />
      <Stack.Screen name="RecipeManager" component={RecipeManagerScreen} options={{ title: 'Recipes' }} />
    </Stack.Navigator>
  );
}
