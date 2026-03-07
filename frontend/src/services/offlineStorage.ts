import AsyncStorage from '@react-native-async-storage/async-storage';
import { Trip, User, VisitedPlace } from '../types';

const KEYS = {
  CURRENT_TRIP: 'offline_current_trip',
  USER_DATA: 'offline_user_data',
  OFFLINE_MODE: 'offline_mode_enabled',
  VISITED_PLACES: 'offline_visited_places',
};

export const offlineStorage = {
  saveTrip: async (trip: Trip) => {
    try {
      await AsyncStorage.setItem(KEYS.CURRENT_TRIP, JSON.stringify(trip));
    } catch (e) {
      console.error('Failed to save trip offline', e);
    }
  },

  getTrip: async (): Promise<Trip | null> => {
    try {
      const data = await AsyncStorage.getItem(KEYS.CURRENT_TRIP);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  saveUser: async (user: User) => {
    try {
      await AsyncStorage.setItem(KEYS.USER_DATA, JSON.stringify(user));
    } catch (e) {
      console.error('Failed to save user offline', e);
    }
  },

  getUser: async (): Promise<User | null> => {
    try {
      const data = await AsyncStorage.getItem(KEYS.USER_DATA);
      return data ? JSON.parse(data) : null;
    } catch (e) {
      return null;
    }
  },

  setOfflineMode: async (enabled: boolean) => {
      await AsyncStorage.setItem(KEYS.OFFLINE_MODE, JSON.stringify(enabled));
  },

  isOfflineMode: async (): Promise<boolean> => {
      const val = await AsyncStorage.getItem(KEYS.OFFLINE_MODE);
      return val ? JSON.parse(val) : false;
  },

  // NEW: Visited Places
  saveVisitedPlaces: async (places: VisitedPlace[]) => {
    try {
      await AsyncStorage.setItem(KEYS.VISITED_PLACES, JSON.stringify(places));
    } catch (e) {
      console.error('Failed to save visited places offline', e);
    }
  },

  getVisitedPlaces: async (): Promise<VisitedPlace[]> => {
    try {
      const data = await AsyncStorage.getItem(KEYS.VISITED_PLACES);
      return data ? JSON.parse(data) : [];
    } catch (e) {
      return [];
    }
  }
};
