import React, { useEffect, useState } from 'react';
import { Stack } from 'expo-router';
import { AppProvider } from '../src/context/AppContext';
import {
  useFonts,
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Lora_700Bold } from '@expo-google-fonts/lora';
import { PlayfairDisplay_900Black } from '@expo-google-fonts/playfair-display';
import * as SplashScreen from 'expo-splash-screen';
import { View, Animated, StyleSheet } from 'react-native';
import { PremiumSplash } from '../src/components/PremiumSplash';

// Keep splash visible until fonts are ready
SplashScreen.preventAutoHideAsync().catch(() => { });

export default function RootLayout() {
  const [isSplashVisible, setIsSplashVisible] = useState(true);
  const [appReady, setAppReady] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(1)).current;

  const [fontsLoaded, fontError] = useFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Lora_700Bold,
    PlayfairDisplay_900Black,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      setAppReady(true);
      // Wait for font loading to hidden native splash
      SplashScreen.hideAsync().catch(() => { });
    }
  }, [fontsLoaded, fontError]);

  const handleSplashComplete = () => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 800,
      useNativeDriver: false,
    }).start(() => setIsSplashVisible(false));
  };

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <View style={styles.root}>
      {isSplashVisible ? (
        <Animated.View style={[StyleSheet.absoluteFill, { opacity: fadeAnim, zIndex: 999 }]}>
          <PremiumSplash onAnimationComplete={handleSplashComplete} />
        </Animated.View>
      ) : (
        <AppProvider>
          <Stack screenOptions={{ headerShown: false }}>
            <Stack.Screen name="index" />
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </AppProvider>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
});