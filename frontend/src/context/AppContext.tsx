import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { User, UserSettings, Trip, GeoLocation, Language } from '../types';
import { translations } from '../i18n/translations';
import { api } from '../services/api';

interface AppContextType {
  // User
  user: User | null;
  setUser: (user: User | null) => void;
  isLoading: boolean;

  // Language
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;

  // Location
  startLocation: GeoLocation | null;
  setStartLocation: (loc: GeoLocation | null) => void;

  // Current Trip
  currentTrip: Trip | null;
  setCurrentTrip: (trip: Trip | null) => void;

  // Actions
  initializeUser: () => Promise<void>;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [language, setLanguageState] = useState<Language>('en');
  const [startLocation, setStartLocation] = useState<GeoLocation | null>(null);
  const [currentTrip, setCurrentTrip] = useState<Trip | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Translation function
  const t = React.useCallback((key: string): string => {
    const trans = translations[language] as Record<string, string>;
    return trans[key] || key;
  }, [language]);

  // Set language and persist
  const setLanguage = React.useCallback(async (lang: Language) => {
    setLanguageState(lang);
    await AsyncStorage.setItem('language', lang);
    if (user) {
      await updateSettings({ language: lang });
    }
  }, [user]);

  // Initialize user (create guest session)
  const initializeUser = React.useCallback(async () => {
    try {
      setIsLoading(true);
      const storedUserId = await AsyncStorage.getItem('user_id');

      if (storedUserId) {
        try {
          const existingUser = await api.getUser(storedUserId);
          setUser(existingUser);
          setLanguageState(existingUser.settings.language as Language || 'en');

          const lsl = existingUser.settings.last_start_location;
          const restoreLat = lsl?.lat ?? (existingUser.settings as any).last_start_lat;
          const restoreLng = lsl?.lng ?? (existingUser.settings as any).last_start_lng;
          const restoreLabel = lsl?.label ?? (existingUser.settings as any).last_start_label ?? '';
          if (restoreLat && restoreLng) {
            setStartLocation({ lat: restoreLat, lng: restoreLng, label: restoreLabel, source: 'saved' });
          }
          return;
        } catch (e) { /* fallback to new session */ }
      }

      const sessionId = `guest_${Date.now()}`;
      const newUser = await api.createSession(sessionId);
      await AsyncStorage.setItem('session_id', sessionId);
      await AsyncStorage.setItem('user_id', newUser.id);
      setUser(newUser);

      const storedLang = await AsyncStorage.getItem('language');
      if (storedLang === 'en' || storedLang === 'ga') {
        setLanguageState(storedLang as Language);
      }
    } catch (error) {
      console.error('Failed to initialize user:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Update user settings
  const updateSettings = React.useCallback(async (settings: Partial<UserSettings>) => {
    if (!user) return;
    try {
      const updatedUser = await api.updateUserSettings(user.id, settings);
      setUser(updatedUser);
    } catch (error) {
      console.error('Failed to update settings:', error);
    }
  }, [user]);

  // Refresh user data
  const refreshUser = React.useCallback(async () => {
    if (!user) return;
    try {
      const refreshedUser = await api.getUser(user.id);
      setUser(refreshedUser);
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  }, [user]);

  // Initialize on mount
  useEffect(() => {
    initializeUser();
  }, [initializeUser]);

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        isLoading,
        language,
        setLanguage,
        t,
        startLocation,
        setStartLocation,
        currentTrip,
        setCurrentTrip,
        initializeUser,
        updateSettings,
        refreshUser,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

// Eski hali hata fırlatıyor, biz zorla boş bir obje döndüreceğiz
export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
