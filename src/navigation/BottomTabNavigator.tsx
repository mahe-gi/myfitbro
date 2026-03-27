import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import DashboardScreen from '../screens/DashboardScreen';
import WeightTrackerScreen from '../screens/WeightTrackerScreen';
import WorkoutStack from './WorkoutStack';
import FoodStack from './FoodStack';
import { colors } from '../theme';

export type BottomTabParamList = {
  Dashboard: undefined;
  WorkoutStack: undefined;
  Weight: undefined;
  FoodStack: undefined;
};

const Tab = createBottomTabNavigator<BottomTabParamList>();

type IoniconsName = React.ComponentProps<typeof Ionicons>['name'];

function tabIcon(focused: boolean, active: IoniconsName, inactive: IoniconsName) {
  return (
    <Ionicons
      name={focused ? active : inactive}
      size={24}
      color={focused ? colors.tabActive : colors.tabInactive}
    />
  );
}

export default function BottomTabNavigator() {
  const insets = useSafeAreaInsets();
  const tabBarHeight = 60 + insets.bottom;

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarActiveTintColor: colors.tabActive,
        tabBarInactiveTintColor: colors.tabInactive,
        tabBarStyle: {
          backgroundColor: colors.surface,
          borderTopColor: colors.border,
          borderTopWidth: 1,
          paddingBottom: insets.bottom || 4,
          height: tabBarHeight,
        },
        tabBarLabelStyle: {
          fontSize: 11,
          fontWeight: '600',
          marginBottom: 2,
        },
        headerStyle: { backgroundColor: colors.surface },
        headerTitleStyle: { color: colors.text, fontWeight: '700', fontSize: 17 },
        headerShadowVisible: false,
      }}
    >
      <Tab.Screen
        name="Dashboard"
        component={DashboardScreen}
        options={{
          title: 'MyFitBro',
          tabBarLabel: 'Home',
          tabBarIcon: ({ focused }) => tabIcon(focused, 'home', 'home-outline'),
        }}
      />
      <Tab.Screen
        name="WorkoutStack"
        component={WorkoutStack}
        options={{
          title: 'Workout',
          tabBarLabel: 'Workout',
          headerShown: false,
          tabBarIcon: ({ focused }) => tabIcon(focused, 'barbell', 'barbell-outline'),
        }}
      />
      <Tab.Screen
        name="Weight"
        component={WeightTrackerScreen}
        options={{
          title: 'Weight',
          tabBarLabel: 'Weight',
          tabBarIcon: ({ focused }) => tabIcon(focused, 'scale', 'scale-outline'),
        }}
      />
      <Tab.Screen
        name="FoodStack"
        component={FoodStack}
        options={{
          title: 'Nutrition',
          tabBarLabel: 'Nutrition',
          headerShown: false,
          tabBarIcon: ({ focused }) => tabIcon(focused, 'nutrition', 'nutrition-outline'),
        }}
      />
    </Tab.Navigator>
  );
}
