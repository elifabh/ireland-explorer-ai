import React from 'react';
import { View, StyleSheet, Platform } from 'react-native';
import { Tabs } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useApp } from '../../src/context/AppContext';
import { Colors } from '../../src/theme';
import * as Haptics from 'expo-haptics';

export default function TabsLayout() {
  const { t } = useApp();

  return (
    <Tabs
      screenListeners={{
        tabPress: () => {
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { });
        },
      }}
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: Colors.emeraldBright,
        tabBarInactiveTintColor: '#94A3B8',
        tabBarStyle: {
          backgroundColor: '#0F172A', // Deep Navy
          borderTopWidth: 0,
          paddingBottom: Platform.OS === 'ios' ? 28 : 12,
          paddingTop: 12,
          height: Platform.OS === 'ios' ? 88 : 74,
          elevation: 0,
          borderTopLeftRadius: 24,
          borderTopRightRadius: 24,
          position: 'absolute',
          bottom: 0,
          left: 0,
          right: 0,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -10 },
          shadowOpacity: 0.2,
          shadowRadius: 15,
        },
        tabBarLabelStyle: {
          fontSize: 10,
          fontWeight: '700',
          marginTop: 2,
          letterSpacing: 0.5,
          textTransform: 'uppercase',
        },
        tabBarIconStyle: {
          marginTop: 0,
        },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: t('home'),
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : styles.inactiveIconWrap}>
              <Ionicons name={focused ? 'home' : 'home-outline'} size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="route"
        options={{
          title: t('route') || 'Route',
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : styles.inactiveIconWrap}>
              <Ionicons name={focused ? 'navigate' : 'navigate-outline'} size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="trips"
        options={{
          title: t('trips'),
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : styles.inactiveIconWrap}>
              <Ionicons name={focused ? 'map' : 'map-outline'} size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="rewards"
        options={{
          title: t('rewards'),
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : styles.inactiveIconWrap}>
              <Ionicons name={focused ? 'gift' : 'gift-outline'} size={20} color={color} />
            </View>
          ),
        }}
      />
      <Tabs.Screen
        name="settings"
        options={{
          title: t('settings'),
          tabBarIcon: ({ color, focused }) => (
            <View style={focused ? styles.activeIconWrap : styles.inactiveIconWrap}>
              <Ionicons name={focused ? 'settings' : 'settings-outline'} size={20} color={color} />
            </View>
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({
  activeIconWrap: {
    backgroundColor: `${Colors.emeraldBright}15`,
    borderRadius: 12,
    width: 42,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: `${Colors.emeraldBright}30`,
  },
  inactiveIconWrap: {
    width: 42,
    height: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
