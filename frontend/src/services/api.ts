import axios from 'axios';
import { CONFIG } from '../config';
import { User, UserSettings, Trip, GeoLocation, LivePreview, Reward, POI, DamageReport, VisitedPlace } from '../types';

const API_URL = CONFIG.API_URL;

const apiClient = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Separate client for long-running LLM operations (trip creation, etc.)
const apiClientLong = axios.create({
  baseURL: `${API_URL}/api`,
  timeout: 120000, // 2 minutes for LLM-powered routes
  headers: {
    'Content-Type': 'application/json',
  },
});
apiClientLong.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error (long):', error.response?.data || error.message);
    throw error;
  }
);

// Add response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error.response?.data || error.message);
    throw error;
  }
);

export const api = {
  // === User APIs ===
  createSession: async (sessionId?: string): Promise<User> => {
    const response = await apiClient.post('/users/session', { device_id: sessionId });
    return response.data;
  },

  getUser: async (userId: string): Promise<User> => {
    const response = await apiClient.get(`/users/${userId}`);
    return response.data;
  },

  updateUserSettings: async (userId: string, settings: Partial<UserSettings>): Promise<User> => {
    const response = await apiClient.patch(`/users/${userId}/settings`, settings);
    return response.data;
  },

  // === Geocoding APIs ===
  searchLocation: async (query: string, country: string = 'IE', limit: number = 5): Promise<GeoLocation[]> => {
    const response = await apiClient.get('/geo/search', {
      params: { q: query, country, limit }
    });
    return response.data;
  },

  reverseGeocode: async (lat: number, lng: number): Promise<GeoLocation> => {
    const response = await apiClient.get('/geo/reverse', {
      params: { lat, lng }
    });
    return response.data;
  },

  // === Live Preview API ===
  getLivePreview: async (
    lat: number,
    lng: number,
    timePreset: string = '60m',
    interests: string[] = [],
    budgetFreeOnly: boolean = false,
    pace: string = 'normal',
    travelMode: string = 'walk',
    wheelchairFriendly: boolean = false,
    safetyFilter: boolean = false
  ): Promise<LivePreview> => {
    const response = await apiClient.get('/preview/live', {
      params: {
        lat,
        lng,
        time_preset: timePreset,
        interests: interests.join(','),
        budget_free_only: budgetFreeOnly,
        pace,
        travel_mode: travelMode,
        wheelchair_friendly: wheelchairFriendly,
        safety_sensitive: safetyFilter
      }
    });
    return response.data;
  },

  // === Trip APIs ===
  createTrip: async (userId: string, tripData: {
    start_lat: number;
    start_lng: number;
    start_label?: string;
    start_source: string;          // 'gps'|'manual' — .toLowerCase() applied before sending
    travel_mode?: string;
    time_preset?: string;
    interests?: string[];
    budget_free_only?: boolean;
    budget_max_entry?: number;
    accessibility_wheelchair?: boolean;
    pace?: string;
    include_visited?: boolean;
  }): Promise<Trip> => {
    const requestBody = {
      start_location: {
        lat: tripData.start_lat,
        lng: tripData.start_lng,
      },
      start_label: tripData.start_label,
      start_source: tripData.start_source.toLowerCase(),
      time_preset: tripData.time_preset || '60m',
      include_visited: tripData.include_visited || false,
      // Trip preferences — send directly so backend uses latest onboarding values
      interests: tripData.interests ?? undefined,
      travel_mode: tripData.travel_mode ?? undefined,
      budget_free_only: tripData.budget_free_only ?? undefined,
      budget_max_entry: tripData.budget_max_entry ?? undefined,
      accessibility_wheelchair: tripData.accessibility_wheelchair ?? undefined,
      pace: tripData.pace ?? undefined,
    };
    const response = await apiClientLong.post('/trips', requestBody, {
      params: { user_id: userId }
    });
    return response.data;
  },

  getTrip: async (tripId: string): Promise<Trip> => {
    const response = await apiClient.get(`/trips/${tripId}`);
    return response.data;
  },

  getUserTrips: async (userId: string): Promise<Trip[]> => {
    const response = await apiClient.get('/trips', {
      params: { user_id: userId }
    });
    return response.data;
  },

  // === Check-in APIs ===
  checkIn: async (tripId: string, stopId: string, userLat: number, userLng: number): Promise<{
    success: boolean;
    experience_pack: any;
    distance_meters: number;
    message: string;
  }> => {
    const response = await apiClient.post(`/trips/${tripId}/stops/${stopId}/checkin`, {
      trip_id: tripId,
      stop_id: stopId,
      user_lat: userLat,
      user_lng: userLng
    });
    return response.data;
  },

  completeStop: async (tripId: string, stopId: string, photoBase64: string): Promise<{
    success: boolean;
    points_awarded: number;
    next_stop_unlocked: boolean;
    trip_completed: boolean;
  }> => {
    const response = await apiClient.post(`/trips/${tripId}/stops/${stopId}/complete`, {
      trip_id: tripId,
      stop_id: stopId,
      photo_base64: photoBase64
    });
    return response.data;
  },

  // === Points APIs ===
  getUserPoints: async (userId: string): Promise<{
    total_points: number;
    history: any[];
  }> => {
    const response = await apiClient.get(`/users/${userId}/points`);
    return response.data;
  },

  // === Rewards APIs ===
  getRewards: async (): Promise<Reward[]> => {
    const response = await apiClient.get('/rewards');
    return response.data;
  },

  claimReward: async (rewardId: string, userId: string): Promise<{
    success: boolean;
    demo_code: string;
    message: string;
  }> => {
    const response = await apiClient.post(`/rewards/${rewardId}/claim`, null, {
      params: { user_id: userId }
    });
    return response.data;
  },

  // === POI APIs ===
  getPOIs: async (
    lat: number,
    lng: number,
    radiusKm: number = 5,
    categories?: string[],
    budgetFreeOnly: boolean = false,
    wheelchair: boolean = false
  ): Promise<POI[]> => {
    const response = await apiClient.get('/pois', {
      params: {
        lat,
        lng,
        radius_km: radiusKm,
        categories: categories?.join(',') || '',
        budget_free_only: budgetFreeOnly,
        wheelchair
      }
    });
    return response.data;
  },

  // === Chat API ===
  chatWithPlace: async (data: {
    place_id?: string;
    place_name?: string;
    lat?: number;
    lon?: number;
    itinerary_context?: any;
    user_message: string;
    chat_history?: any[];
  }): Promise<{ answer: string; sources: string[]; actions: any[] }> => {
    const response = await apiClient.post('/chat/place', data);
    return response.data;
  },

  // === Notifications API ===
  checkNotifications: async (data: { lat: number; lng: number; user_id: string }): Promise<{ triggers: any[] }> => {
    const response = await apiClient.post('/notifications/check', data);
    return response.data;
  },

  transcribeAudio: async (audioBase64: string): Promise<{ text: string; note?: string }> => {
    const response = await apiClient.post('/chat/transcribe', { audio: audioBase64 });
    return response.data;
  },

  // === Damage Reports APIs ===
  submitDamageReport: async (userId: string, data: {
    poi_id?: string;
    poi_name?: string;
    description: string;
    photo_base64?: string;
    severity?: string;
    category?: string;
    lat?: number;
    lng?: number;
  }): Promise<DamageReport> => {
    const response = await apiClient.post('/damage-reports', data, {
      params: { user_id: userId }
    });
    return response.data;
  },

  getMyDamageReports: async (userId: string): Promise<DamageReport[]> => {
    const response = await apiClient.get('/damage-reports/mine', {
      params: { user_id: userId }
    });
    return response.data;
  },

  // === Visited Places APIs ===
  getVisitedPlaces: async (userId: string): Promise<VisitedPlace[]> => {
    const response = await apiClient.get('/visited', {
      params: { user_id: userId }
    });
    return response.data;
  },

  addVisitedPlace: async (userId: string, data: {
    place_id: string;
    name: string;
    lat: number;
    lng: number;
    note?: string;
    photo_base64?: string;
    trip_id?: string;
    stop_id?: string;
  }): Promise<VisitedPlace> => {
    const response = await apiClient.post('/visited', data, {
      params: { user_id: userId }
    });
    return response.data;
  },

  removeVisitedPlace: async (userId: string, placeId: string): Promise<void> => {
    await apiClient.delete(`/visited/${placeId}`, {
      params: { user_id: userId }
    });
  },

  updateVisitedPlace: async (userId: string, placeId: string, data: { note?: string }): Promise<VisitedPlace> => {
    const response = await apiClient.patch(`/visited/${placeId}`, data, {
      params: { user_id: userId }
    });
    return response.data;
  },


  getPopularLocations: async (): Promise<any[]> => {
    try {
      const response = await apiClient.get('/geo/popular');
      return response.data.locations;
    } catch {
      return [];
    }
  },

  getNearbyAmenities: async (lat: number, lng: number): Promise<any[]> => {
    try {
      const response = await apiClient.get('/geo/amenities', {
        params: { lat, lng, radius_m: 1000 }
      });
      return response.data.amenities || [];
    } catch {
      return [];
    }
  },
};
