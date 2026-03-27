import { useEffect, useState } from 'react';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { initDatabase } from './src/db/init';
import RootNavigator from './src/navigation/RootNavigator';
import { colors } from './src/theme';

export default function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    initDatabase().then(() => setIsReady(true));
  }, []);

  if (!isReady) {
    return (
      <SafeAreaProvider>
        <View style={styles.container}>
          <ActivityIndicator size="large" color={colors.primary} />
          <StatusBar style="dark" backgroundColor={colors.bg} />
        </View>
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <RootNavigator />
        <StatusBar style="dark" backgroundColor={colors.bg} />
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.bg,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
