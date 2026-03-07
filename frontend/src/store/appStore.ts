import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from 'axios';
import { CONFIG } from '../config';
import { offlineStorage } from '../services/offlineStorage';
import { api } from '../services/api';

const API_URL = CONFIG.API_URL;

// Re-export all types from the shared types module
export type {
  Language,
  TravelMode,
  TimePreset,
  Interest,
  Pace,
  StopStatus,
  TripStatus,
  StartLocationSource,
  Location,
  GeoLocation,
  UserSettings,
  User,
  POI,
  ExperiencePack,
  Stop,
  Trip,
  Reward,
} from '../types';

import type {
  Language,
  TravelMode,
  TimePreset,
  Interest,
  Pace,
  StopStatus,
  TripStatus,
  StartLocationSource,
  Location,
  GeoLocation,
  UserSettings,
  User,
  POI,
  ExperiencePack,
  Stop,
  Trip,
  Reward,
} from '../types';

// Store-specific types (not in shared types)
export interface StartLocation extends Location {
  label?: string;
  source: StartLocationSource;
}

export interface GeoSearchResult {
  label: string;
  lat: number;
  lng: number;
  source: string;
  short_label?: string;
}

export interface LastStartLocation {
  label?: string;
  lat?: number;
  lng?: number;
}

export interface WeatherSummary {
  temperature_c: number;
  condition: string;
  condition_ga?: string;
  wind_speed_kmh: number;
  precipitation_chance?: number;
  warnings: string[];
}

export interface LivePreview {
  weather: WeatherSummary;
  transit?: {
    available: boolean;
    disruptions: string[];
    nearest_stop?: string;
  };
  events: Array<{
    name: string;
    location: string;
    date: string;
    category: string;
  }>;
  estimated_stops: number;
  estimated_duration_min: number;
  recommended_start_time?: string;
  warnings: string[];
  start_label?: string;
  estimated_stop_details?: Array<{
    name: string;
    category: string;
    estimated_duration_min: number;
    entry_fee: number;
  }>;
}

interface AppState {
  // User state
  user: User | null;
  isLoading: boolean;
  error: string | null;

  // Trip state
  currentTrip: Trip | null;
  currentStops: Stop[];
  livePreview: LivePreview | null;
  currentStartLocation: StartLocation | null;

  // Rewards
  rewards: Reward[];

  // Popular locations cache
  popularLocations: GeoSearchResult[];

  // Actions
  initializeUser: () => Promise<void>;
  updateSettings: (settings: Partial<UserSettings>) => Promise<void>;
  createTripPreview: (startLocation: StartLocation, timePreset: TimePreset) => Promise<LivePreview | null>;
  createTrip: (startLocation: StartLocation, timePreset: TimePreset) => Promise<boolean>;
  loadTrip: (tripId: string) => Promise<void>;
  startTrip: (tripId: string) => Promise<void>;
  checkIn: (stopId: string, location: Location, photoBase64: string) => Promise<{ success: boolean; message: string; points: number }>;
  completeStop: (stopId: string, photoBase64: string) => Promise<{ success: boolean; points_awarded: number; trip_completed: boolean; next_stop_unlocked: boolean }>;
  loadRewards: () => Promise<void>;
  redeemReward: (rewardId: string) => Promise<{ success: boolean; code?: string }>;
  refreshUser: () => Promise<void>;
  setLanguage: (lang: Language) => void;
  clearError: () => void;
  // NEW: Geocoding actions
  searchLocations: (query: string) => Promise<GeoSearchResult[]>;
  reverseGeocode: (lat: number, lng: number) => Promise<GeoSearchResult | null>;
  loadPopularLocations: () => Promise<void>;
  setStartLocation: (location: StartLocation) => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  user: null,
  isLoading: false,
  error: null,
  currentTrip: null,
  currentStops: [],
  livePreview: null,
  currentStartLocation: null,
  rewards: [],
  popularLocations: [],

  initializeUser: async () => {
    set({ isLoading: true, error: null });
    try {
      // Try to load offline data first
      const offlineUser = await offlineStorage.getUser();
      if (offlineUser) {
        set({ user: offlineUser });
      }

      const storedUserId = await AsyncStorage.getItem('userId');

      if (storedUserId) {
        try {
          const response = await axios.get(`${API_URL}/api/users/${storedUserId}`);
          set({ user: response.data, isLoading: false });
          offlineStorage.saveUser(response.data);
        } catch (netError) {
          console.log("Network failed, using offline user if available");
          if (offlineUser) {
            set({ user: offlineUser, isLoading: false });
          } else {
            throw netError;
          }
        }
      } else {
        const deviceId = `mobile-${Date.now()}`;
        const response = await axios.post(`${API_URL}/api/users/session`, {
          device_id: deviceId   // backend UserCreate expects device_id, not session_id
        });
        await AsyncStorage.setItem('userId', response.data.id);
        set({ user: response.data, isLoading: false });
        offlineStorage.saveUser(response.data);
      }
    } catch (error: any) {
      console.error('Error initializing user:', error);
      set({ error: 'Failed to initialize user', isLoading: false });
    }
  },

  updateSettings: async (settings) => {
    const { user } = get();
    if (!user) return;

    try {
      const response = await axios.patch(`${API_URL}/api/users/${user.id}/settings`, settings);
      set({ user: response.data });
    } catch (error: any) {
      set({ error: 'Failed to update settings' });
    }
  },

  createTripPreview: async (startLocation, timePreset) => {
    const { user } = get();
    if (!user) return null;

    set({ isLoading: true, error: null, currentStartLocation: startLocation });
    try {
      const previewData = await api.getLivePreview(
        startLocation.lat,
        startLocation.lng,
        timePreset,
        user.settings.interests, // interests string[] is handled by api.ts
        user.settings.budget_free_only,
        user.settings.pace,
        user.settings.travel_mode,
        user.settings.wheelchair_friendly,
        user.settings.safety_sensitive
      );
      set({ livePreview: previewData, isLoading: false });
      return previewData;
    } catch (error: any) {
      set({ error: 'Failed to create preview', isLoading: false });
      return null;
    }
  },

  createTrip: async (startLocation, timePreset) => {
    const { user } = get();
    if (!user) return false;

    set({ isLoading: true, error: null });
    try {
      const trip = await api.createTrip(user.id, {
        start_lat: startLocation.lat,
        start_lng: startLocation.lng,
        start_label: startLocation.label,
        start_source: startLocation.source as any,
        time_preset: timePreset,
        // Cast Interest[] to string[] for the api — backend accepts both
        interests: user.settings.interests?.map((i: any) => String(i)) ?? [],
        travel_mode: user.settings.travel_mode,
        budget_free_only: user.settings.budget_free_only,
        budget_max_entry: (user.settings as any).budget_max_entry ?? 0,
        accessibility_wheelchair: user.settings.wheelchair_friendly,
        pace: user.settings.pace,
      });

      set({
        currentTrip: trip,
        currentStops: trip.stops,
        isLoading: false
      });
      offlineStorage.saveTrip(trip);
      return true;
    } catch (error: any) {
      set({ error: error.response?.data?.detail || 'Failed to create trip', isLoading: false });
      return false;
    }
  },

  loadTrip: async (tripId) => {
    set({ isLoading: true, error: null });
    try {
      const trip = await api.getTrip(tripId);
      set({
        currentTrip: trip,
        currentStops: trip.stops,
        isLoading: false
      });
      offlineStorage.saveTrip(trip);
    } catch (error: any) {
      console.log("Network load failed, trying offline");
      const offlineTrip = await offlineStorage.getTrip();
      if (offlineTrip && offlineTrip.id === tripId) {
        set({
          currentTrip: offlineTrip,
          currentStops: offlineTrip.stops || [],
          isLoading: false
        });
      } else {
        set({ error: 'Failed to load trip', isLoading: false });
      }
    }
  },

  startTrip: async (tripId) => {
    // Backend creates trips as IN_PROGRESS already.
    // If we need a start signal, we can add it, but for now just update local state.
    const { currentTrip } = get();
    if (currentTrip) {
      // Ensure status is up to date locally
      const updatedTrip = { ...currentTrip, status: 'in_progress' as TripStatus };
      set({ currentTrip: updatedTrip });
      offlineStorage.saveTrip(updatedTrip);
    }
  },
  checkIn: async (stopId, location, photoBase64) => {
    const { currentTrip, user } = get();
    if (!currentTrip || !user) return { success: false, message: 'No active trip', points: 0 };

    try {
      const response = await api.checkIn(
        currentTrip.id,
        stopId,
        location.lat,
        location.lng
      );

      // Refresh trip data to get updated stop status
      const trip = await api.getTrip(currentTrip.id);
      set({
        currentTrip: trip,
        currentStops: trip.stops
      });

      // Refresh user points
      const updatedUser = await api.getUser(user.id);
      set({ user: updatedUser });

      return {
        success: response.success,
        message: response.message,
        points: (response as any).points_awarded || 0
      };
    } catch (error: any) {
      return {
        success: false,
        message: error.response?.data?.detail || 'Check-in failed',
        points: 0
      };
    }
  },

  completeStop: async (stopId, photoBase64) => {
    const { currentTrip, user } = get();
    if (!currentTrip || !user) return { success: false, points_awarded: 0, trip_completed: false, next_stop_unlocked: false };

    try {
      const response = await api.completeStop(currentTrip.id, stopId, photoBase64);

      // Refresh trip data
      const trip = await api.getTrip(currentTrip.id);
      set({
        currentTrip: trip,
        currentStops: trip.stops
      });

      // Refresh user points
      const updatedUser = await api.getUser(user.id);
      set({ user: updatedUser });

      return {
        success: Boolean(response.success),
        points_awarded: response.points_awarded,
        trip_completed: Boolean(response.trip_completed),
        next_stop_unlocked: Boolean((response as any).next_stop_unlocked),
      };
    } catch (error: any) {
      console.error('Complete stop failed:', error);
      return { success: false, points_awarded: 0, trip_completed: false, next_stop_unlocked: false };
    }
  },

  loadRewards: async () => {
    try {
      const rewards = await api.getRewards();
      set({ rewards });
    } catch (error: any) {
      console.error('Failed to load rewards:', error);
    }
  },

  redeemReward: async (rewardId) => {
    const { user } = get();
    if (!user) return { success: false };

    try {
      const response = await api.claimReward(rewardId, user.id);

      // Refresh user points
      const updatedUser = await api.getUser(user.id);
      set({ user: updatedUser });

      return { success: true, code: response.demo_code || 'CODE123' };
    } catch (error: any) {
      return { success: false };
    }
  },

  refreshUser: async () => {
    const { user } = get();
    if (!user) return;

    try {
      const updatedUser = await api.getUser(user.id);
      set({ user: updatedUser });
    } catch (error: any) {
      console.error('Failed to refresh user:', error);
    }
  },

  setLanguage: (lang) => {
    const { user, updateSettings } = get();
    if (user) {
      updateSettings({ language: lang });
    }
  },

  clearError: () => set({ error: null }),

  searchLocations: async (query) => {
    if (!query || query.length < 2) return [];
    try {
      return await api.searchLocation(query);
    } catch (error: any) {
      console.error('Location search failed:', error);
      return [];
    }
  },

  reverseGeocode: async (lat, lng) => {
    try {
      return await api.reverseGeocode(lat, lng);
    } catch (error: any) {
      console.error('Reverse geocode failed:', error);
      return null;
    }
  },

  loadPopularLocations: async () => {
    try {
      const locations = await api.getPopularLocations();
      set({ popularLocations: locations });
    } catch (error: any) {
      console.error('Failed to load popular locations:', error);
    }
  },

  setStartLocation: (location) => {
    set({ currentStartLocation: location });
  }
}));
